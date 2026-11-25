const { EventEmitter } = require("events");
const Game = require("../Game");
const { validateList, LIMITS } = require("../customLists");
const { attach } = require("../socketHandlers");
const GameManager = require("../GameManager");
const PlayerManager = require("../PlayerManager");

const fakePlayer = (id) => {
  const sent = [];
  return {
    id, sent, phrases: [], buttons: [],
    reset() { this.phrases = []; this.buttons = []; },
    addPhrase(p) { this.phrases.push(p); },
    addButton(p) { this.buttons.push(p); },
    emit: (n, v) => sent.push([n, v]),
    emitStartGame() {}, emitScore() {}, emitPlayerCount() {}, emitGameOver() {},
  };
};
const lastSettings = (p) => [...p.sent].reverse().find(([n]) => n === "gameSettings")[1];

describe("validateList", () => {
  test("trims, drops blank lines and repeats (case-insensitive), collapses spaces", () => {
    expect(validateList("  Sterling's   list ", ["  Hi there ", "", "hi THERE", "  ", "Bye​", "Bye"])).toEqual({
      name: "Sterling's list",
      phrases: ["Hi there", "Bye"],
    });
  });

  test.each([
    [undefined, ["a"], /name/i],
    ["   ", ["a"], /needs a name/],
    ["x".repeat(LIMITS.nameLength + 1), ["a"], /at most 24/],
    ["ok", "not an array", /Invalid phrases/],
    ["ok", [5], /Invalid phrases/],
    ["ok", ["", "  "], /at least one phrase/],
    ["ok", ["y".repeat(LIMITS.phraseLength + 1)], /at most 40 characters/],
    ["ok", Array.from({ length: 101 }, (_, i) => `p${i}`), /at most 100 phrases/],
    ["ok", Array.from({ length: 301 }, () => ""), /Invalid phrases/],
  ])("rejects name %p phrases %p", (name, phrases, msg) => {
    expect(validateList(name, phrases).error).toMatch(msg);
  });

  test("exactly at the limits is fine", () => {
    const r = validateList("n".repeat(24), Array.from({ length: 100 }, (_, i) => `${i}`.padEnd(40, "x")));
    expect(r.error).toBeUndefined();
    expect(r.phrases).toHaveLength(100);
  });
});

describe("custom lists in a game", () => {
  beforeEach(() => jest.useFakeTimers());

  test("a list is ticked, counted, and shown to everyone without its owner", () => {
    const g = new Game("abcd");
    const [a, b] = ["a", "b"].map(fakePlayer);
    g.addPlayer(a);
    g.addPlayer(b);
    const { key } = g.addCustomList("a", { name: "Mine", phrases: ["one", "two", "three"] }, "l1");
    expect(key).toBe("list1");
    const sa = lastSettings(a);
    const sb = lastSettings(b);
    expect(sa.enabledCategories).toContain(key);
    expect(sa.categoryCounts[key]).toBe(3);
    expect(sa.selectedWordCount).toBe(109);
    expect(sa.customLists).toEqual([{ key, name: "Mine", count: 3, mine: true, clientId: "l1" }]);
    expect(sb.customLists).toEqual([{ key, name: "Mine", count: 3, mine: false }]);
    expect(JSON.stringify(sb)).not.toContain('"a"');
    g.destroy();
  });

  test("at most 5 lists per game", () => {
    const g = new Game("abcd");
    g.addPlayer(fakePlayer("a"));
    for (let i = 0; i < 5; i++) expect(g.addCustomList("a", { name: `L${i}`, phrases: [`p${i}`] }).key).toBeTruthy();
    expect(g.addCustomList("a", { name: "L6", phrases: ["x"] }).error).toMatch(/at most 5/);
    g.destroy();
  });

  test("only the owner can edit or remove; others can tick and untick", () => {
    const g = new Game("abcd");
    ["a", "b"].map(fakePlayer).forEach((p) => g.addPlayer(p));
    const { key } = g.addCustomList("a", { name: "Mine", phrases: ["one"] });
    expect(g.updateCustomList("b", key, { name: "Hacked", phrases: ["x"] }).error).toMatch(/Only the phone/);
    expect(g.removeCustomList("b", key).error).toMatch(/Only the phone/);
    expect(g.updateEnabledCategories(["Fire"])).toBe(true);
    expect(g.updateEnabledCategories(["Fire", key])).toBe(true);
    expect(g.updateCustomList("a", key, { name: "Renamed", phrases: ["one", "two"] }).key).toBe(key);
    expect(g.customLists.get(key).name).toBe("Renamed");
    expect(g.removeCustomList("a", key).key).toBe(key);
    expect(g.enabledCategories.has(key)).toBe(false);
    expect(g.updateCustomList("a", key, { name: "x", phrases: ["y"] }).error).toMatch(/Unknown list/);
    g.destroy();
  });

  test("removing the only ticked list falls back to the defaults", () => {
    const g = new Game("abcd");
    g.addPlayer(fakePlayer("a"));
    const { key } = g.addCustomList("a", { name: "Mine", phrases: ["one"] });
    g.updateEnabledCategories([key]);
    g.removeCustomList("a", key);
    expect([...g.enabledCategories]).toEqual(Game.defaultEnabledCategories);
    g.destroy();
  });

  test("a round deals the custom phrases, each text once, and changes after the start are ignored", () => {
    const g = new Game("abcd");
    const ps = ["a", "b", "c"].map(fakePlayer);
    ps.forEach((p) => g.addPlayer(p));
    // "Fire!" may already be a built-in phrase: the pool keeps one copy.
    const mine = Array.from({ length: 12 }, (_, i) => `Custom ${i}`);
    const { key } = g.addCustomList("a", { name: "Mine", phrases: mine });
    g.updateEnabledCategories([key]);
    expect(g.getSelectedWordCount()).toBe(12);
    g.generateRound();
    const dealt = ps.flatMap((p) => p.phrases).map((p) => p.Phrase).sort();
    expect(dealt).toEqual([...mine].sort());
    expect(ps.flatMap((p) => p.buttons)).toHaveLength(12);
    expect(g.addCustomList("a", { name: "Late", phrases: ["x"] }).ignored).toBe(true);
    expect(g.removeCustomList("a", key).ignored).toBe(true);
    expect(g.customLists.size).toBe(1);
    g.destroy();
  });

  test("a custom phrase that repeats a built-in one is dealt once", () => {
    const g = new Game("abcd");
    ["a", "b"].map(fakePlayer).forEach((p) => g.addPlayer(p));
    const builtIn = g.phrasePool()[0].Phrase;
    g.addCustomList("a", { name: "Dup", phrases: [builtIn.toUpperCase(), "Brand new"] });
    expect(g.getSelectedWordCount()).toBe(106 + 1);
    g.destroy();
  });
});

describe("custom list socket events", () => {
  let gm, connect;
  beforeEach(() => {
    jest.useFakeTimers();
    jest.spyOn(console, "error").mockImplementation(() => {});
    const io = new EventEmitter();
    gm = new GameManager();
    attach(io, gm, new PlayerManager());
    connect = () => {
      const handlers = {};
      const emitted = [];
      const client = { id: Math.random().toString(36).slice(2), on: (n, f) => (handlers[n] = f), emit: (n, v) => emitted.push([n, v]) };
      io.emit("connection", client);
      return { handlers, emitted, errors: () => emitted.filter(([n]) => n === "serverError").map(([, v]) => v.message) };
    };
  });
  afterEach(() => jest.restoreAllMocks());

  const join = (c, gameid) => c.handlers.subscribeToGame({ gameid });
  const settings = (c) => [...c.emitted].reverse().find(([n]) => n === "gameSettings")[1];

  test("add, share, guard ownership, reject bad input", () => {
    const a = connect();
    const b = connect();
    join(a, "abcd");
    join(b, "abcd");
    a.handlers.addList({ gameid: "abcd", clientId: "l1", name: "Mine", phrases: ["one", "two"] });
    expect(a.errors()).toEqual([]);
    const key = settings(b).customLists[0].key;
    expect(settings(b).customLists[0]).toEqual({ key, name: "Mine", count: 2, mine: false });
    expect(settings(a).customLists[0].mine).toBe(true);

    b.handlers.removeList({ gameid: "abcd", key });
    expect(b.errors()).toEqual(["Only the phone that added a list can change it."]);
    b.handlers.updateCategories({ gameid: "abcd", categories: ["Fire", key] });
    expect(b.errors()).toHaveLength(1);
    expect(settings(a).enabledCategories).toEqual(["Fire", key]);

    for (const bad of [null, { gameid: "abcd" }, { gameid: "abcd", name: "x", phrases: "y" }, { gameid: "abcd", clientId: "bad id!", name: "x", phrases: ["y"] }]) {
      expect(() => a.handlers.addList(bad)).not.toThrow();
    }
    expect(a.errors()).toHaveLength(4);
    a.handlers.updateList({ gameid: "abcd", key: "../x", name: "x", phrases: ["y"] });
    expect(a.errors()).toHaveLength(5);
  });

  test("a socket that hasn't joined the game can't add to it", () => {
    const a = connect();
    const b = connect();
    join(a, "abcd");
    b.handlers.addList({ gameid: "abcd", name: "x", phrases: ["y"] });
    expect(b.errors()).toEqual(["Join the game first."]);
  });
});
