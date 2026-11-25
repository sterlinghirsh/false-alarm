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

  test("every phrase has a non-empty Type array; 126 phrases incl. Chamberlain", () => {
    expect(phrases).toHaveLength(126);
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
    expect(s.enabledCategories.sort()).toEqual([...Game.allCategories].sort());
    expect(s.selectedWordCount).toBe(126);
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
    expect(g.enabledCategories.size).toBe(Game.allCategories.length);
    g.addPlayer(fakePlayer("a"));
    g.generateRound();
    expect(g.updateEnabledCategories(["Chamberlain"])).toBe(false);
    expect(g.enabledCategories.size).toBe(Game.allCategories.length);
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
    expect(a.emitted.some(([n]) => n === "gameSettings")).toBe(true);
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
    expect(gm.getById("abcd").enabledCategories.size).toBe(Game.allCategories.length);
  });

  test("after the start a change is ignored", () => {
    jest.useFakeTimers();
    const a = connect();
    a.handlers.subscribeToGame({ gameid: "abcd" });
    a.handlers.ready({ gameid: "abcd" });
    a.handlers.updateCategories({ gameid: "abcd", categories: ["Calming"] });
    const g = gm.getById("abcd");
    expect(g.enabledCategories.size).toBe(Game.allCategories.length);
    expect(a.errors()).toHaveLength(0);
    g.destroy();
  });
});
