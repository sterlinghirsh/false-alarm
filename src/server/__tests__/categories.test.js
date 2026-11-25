const { EventEmitter } = require("events");
const phrases = require("../../phrases.json");
const Game = require("../Game");
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

describe("phrase categories", () => {
  afterEach(() => jest.useRealTimers());

  test("every phrase has a non-empty Type array; 154 phrases in 9 categories", () => {
    expect(phrases).toHaveLength(154);
    expect(Game.allCategories).toHaveLength(9);
    expect(new Set(phrases.map((p) => p.Phrase)).size).toBe(154);
    for (const p of phrases) {
      expect(Array.isArray(p.Type)).toBe(true);
      expect(p.Type.length).toBeGreaterThan(0);
    }
    expect(Game.allCategories).toContain("Chamberlain");
  });

  test("counts match the data and the default selects everything", () => {
    const g = new Game("abcd");
    const s = g.getSettingsPayload();
    for (const c of Game.allCategories) {
      expect(s.categoryCounts[c]).toBe(phrases.filter((p) => p.Type.includes(c)).length);
    }
    const off = ["Chamberlain", "General 2", "Thanksgiving"];
    for (const c of off) expect(s.enabledCategories).not.toContain(c);
    expect(s.enabledCategories).toHaveLength(6);
    expect(s.enabledCategories.sort()).toEqual(Game.allCategories.filter((c) => !off.includes(c)).sort());
    expect(s.categoryCounts.Thanksgiving).toBe(11);
    expect(s.categoryCounts["General 2"]).toBe(17);
    // Counted once each, though 3 phrases sit in two categories.
    expect(s.selectedWordCount).toBe(106);
    expect(s.categoryCounts.Chamberlain).toBe(20);
  });

  test("a new game never deals Chamberlain until it's ticked", () => {
    jest.useFakeTimers();
    const g = new Game("abcd");
    const ps = ["a", "b", "c"].map(fakePlayer);
    ps.forEach((p) => g.addPlayer(p));
    g.generateRound();
    let dealt = ps.flatMap((p) => p.phrases);
    expect(dealt).toHaveLength(106);
    expect(dealt.some((p) => p.Type.includes("Chamberlain"))).toBe(false);
    g.destroy();

    const h = new Game("efgh");
    const qs = ["a", "b", "c"].map(fakePlayer);
    qs.forEach((p) => h.addPlayer(p));
    expect(h.updateEnabledCategories([...h.enabledCategories, "Chamberlain"])).toBe(true);
    expect(h.getSelectedWordCount()).toBe(126);
    h.generateRound();
    dealt = qs.flatMap((p) => p.phrases);
    expect(dealt).toHaveLength(126);
    expect(dealt.filter((p) => p.Type.includes("Chamberlain"))).toHaveLength(20);
    h.destroy();
  });

  test("Thanksgiving and General 2 start off and are dealt only once ticked", () => {
    jest.useFakeTimers();
    const deal = (cats) => {
      const g = new Game("abcd");
      const ps = ["a", "b", "c"].map(fakePlayer);
      ps.forEach((p) => g.addPlayer(p));
      if (cats) expect(g.updateEnabledCategories(cats)).toBe(true);
      g.generateRound();
      g.destroy();
      return ps.flatMap((p) => p.phrases);
    };
    const def = deal();
    expect(def.some((p) => p.Type.includes("Thanksgiving") || p.Type.includes("General 2"))).toBe(false);
    const withThanks = deal([...Game.defaultEnabledCategories, "Thanksgiving"]);
    expect(withThanks).toHaveLength(117);
    expect(withThanks.filter((p) => p.Type.includes("Thanksgiving"))).toHaveLength(11);
    expect(withThanks.some((p) => p.Type.includes("General 2"))).toBe(false);
    const onlyG2 = deal(["General 2"]);
    expect(onlyG2).toHaveLength(17);
    expect(onlyG2.map((p) => p.Phrase)).toContain("I'm locked out of my room!");
    const all = deal(Game.allCategories);
    expect(all).toHaveLength(154);
  });

  test("only enabled categories are dealt", () => {
    jest.useFakeTimers();
    const g = new Game("abcd");
    const ps = ["a", "b", "c"].map(fakePlayer);
    ps.forEach((p) => g.addPlayer(p));
    const keep = Game.allCategories.filter((c) => c !== "Chamberlain");
    expect(g.updateEnabledCategories(keep)).toBe(true);
    ps.forEach((p) => expect(p.sent.at(-1)[0]).toBe("gameSettings"));
    g.generateRound();
    const dealt = ps.flatMap((p) => p.phrases);
    expect(dealt.length).toBe(g.getSelectedWordCount());
    for (const p of dealt) expect(p.Type.some((t) => keep.includes(t))).toBe(true);
    expect(dealt.some((p) => p.Type.length === 1 && p.Type[0] === "Chamberlain")).toBe(false);
    g.destroy();
  });

  test("the last category can't be removed, and nothing changes after the start", () => {
    jest.useFakeTimers();
    const g = new Game("abcd");
    expect(g.updateEnabledCategories([])).toBe(false);
    expect(g.updateEnabledCategories(["NotACategory"])).toBe(false);
    expect([...g.enabledCategories]).toEqual(Game.defaultEnabledCategories);
    g.addPlayer(fakePlayer("a"));
    g.generateRound();
    expect(g.updateEnabledCategories(["Chamberlain"])).toBe(false);
    expect([...g.enabledCategories]).toEqual(Game.defaultEnabledCategories);
    g.destroy();
  });
});

describe("updateCategories handler", () => {
  let gm, connect;
  beforeEach(() => {
    jest.spyOn(console, "error").mockImplementation(() => {});
    jest.spyOn(console, "log").mockImplementation(() => {});
    const io = new EventEmitter();
    gm = new GameManager();
    attach(io, gm, new PlayerManager());
    connect = () => {
      const handlers = {}, emitted = [];
      io.emit("connection", { id: Math.random().toString(36).slice(2), on: (n, f) => (handlers[n] = f), emit: (n, v) => emitted.push([n, v]) });
      return { handlers, emitted, errors: () => emitted.filter(([n]) => n === "serverError") };
    };
  });
  afterEach(() => { jest.restoreAllMocks(); jest.useRealTimers(); });

  test("subscribe sends gameSettings; a change reaches every player", () => {
    const a = connect(), b = connect();
    a.handlers.subscribeToGame({ gameid: "abcd" });
    b.handlers.subscribeToGame({ gameid: "abcd" });
    const first = a.emitted.find(([n]) => n === "gameSettings")[1];
    expect(first.enabledCategories).not.toContain("Chamberlain");
    expect(first.allCategories).toContain("Chamberlain");
    a.handlers.updateCategories({ gameid: "abcd", categories: ["Calming"] });
    const last = b.emitted.filter(([n]) => n === "gameSettings").at(-1)[1];
    expect(last.enabledCategories).toEqual(["Calming"]);
    expect(a.errors()).toHaveLength(0);
  });

  test.each([
    undefined, null, "x", {}, { gameid: "nope", categories: ["Calming"] },
    { gameid: "abcd" }, { gameid: "abcd", categories: [] }, { gameid: "abcd", categories: "Calming" },
    { gameid: "abcd", categories: ["Nope"] }, { gameid: "abcd", categories: [5] },
    { gameid: "abcd", categories: Array(500).fill("Calming") },
  ])("bad payload %p gets serverError and changes nothing", (payload) => {
    const a = connect();
    a.handlers.subscribeToGame({ gameid: "abcd" });
    expect(() => a.handlers.updateCategories(payload)).not.toThrow();
    expect(a.errors()).toHaveLength(1);
    expect([...gm.getById("abcd").enabledCategories]).toEqual(Game.defaultEnabledCategories);
  });

  test("after the start a change is ignored", () => {
    jest.useFakeTimers();
    const a = connect();
    a.handlers.subscribeToGame({ gameid: "abcd" });
    a.handlers.ready({ gameid: "abcd" });
    a.handlers.updateCategories({ gameid: "abcd", categories: Game.allCategories });
    const g = gm.getById("abcd");
    expect([...g.enabledCategories]).toEqual(Game.defaultEnabledCategories);
    expect(a.errors()).toHaveLength(0);
    g.destroy();
  });
});
