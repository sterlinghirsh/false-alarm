const { EventEmitter } = require("events");
const { attach } = require("../socketHandlers");
const GameManager = require("../GameManager");
const PlayerManager = require("../PlayerManager");

function setup() {
  const io = new EventEmitter();
  const gameManager = new GameManager();
  const playerManager = new PlayerManager();
  attach(io, gameManager, playerManager);
  const connect = () => {
    const handlers = {};
    const emitted = [];
    const client = {
      id: Math.random().toString(36).slice(2),
      on: (n, f) => (handlers[n] = f),
      emit: (n, v) => emitted.push([n, v]),
    };
    io.emit("connection", client);
    return { client, handlers, emitted, errors: () => emitted.filter(([n]) => n === "serverError") };
  };
  return { gameManager, playerManager, connect };
}

describe("socket handlers never throw on bad input (regression: remote crash)", () => {
  let ctx;
  beforeEach(() => { ctx = setup(); jest.spyOn(console, "error").mockImplementation(() => {}); });
  afterEach(() => jest.restoreAllMocks());

  test("ready for an unknown game returns an error", () => {
    const c = ctx.connect();
    expect(() => c.handlers.ready({ gameid: "nope" })).not.toThrow();
    expect(c.errors()).toHaveLength(1);
  });

  test.each([undefined, null, 5, "x", [], {}, { gameid: 7 }, { gameid: "bad id!" }])(
    "ready with payload %p returns an error", (payload) => {
      const c = ctx.connect();
      expect(() => c.handlers.ready(payload)).not.toThrow();
      expect(c.errors()).toHaveLength(1);
    });

  test.each([undefined, null, {}, { gameid: "abcd", playerid: 5 }, { gameid: "abcd", playerid: "a b" }])(
    "subscribeToGame with payload %p returns an error", (payload) => {
      const c = ctx.connect();
      expect(() => c.handlers.subscribeToGame(payload)).not.toThrow();
      expect(c.errors()).toHaveLength(1);
    });

  test("clickPhrase with unknown game, unknown player or bad phrase returns an error", () => {
    const c = ctx.connect();
    c.handlers.subscribeToGame({ gameid: "abcd" });
    for (const p of [
      undefined,
      { gameid: "nope", playerid: "x", phrase: "a" },
      { gameid: "abcd", playerid: "unknown", phrase: "a" },
      { gameid: "abcd", playerid: "unknown", phrase: 3 },
    ]) {
      const before = c.errors().length;
      expect(() => c.handlers.clickPhrase(p)).not.toThrow();
      expect(c.errors().length).toBe(before + 1);
    }
  });

  test("clicking when a player has no phrases left does not throw", () => {
    const c = ctx.connect();
    c.handlers.subscribeToGame({ gameid: "abcd" });
    const game = ctx.gameManager.getById("abcd");
    const pid = Object.keys(game.players)[0];
    game.players[pid].phrases = [];
    expect(() => c.handlers.clickPhrase({ gameid: "abcd", playerid: pid, phrase: "zzz" })).not.toThrow();
  });

  test("an unexpected throw inside a handler is caught and reported", () => {
    const c = ctx.connect();
    ctx.gameManager.createGame = () => { throw new Error("boom"); };
    expect(() => c.handlers.createGame()).not.toThrow();
    expect(c.errors()).toHaveLength(1);
  });
});

describe("cleanup (regression: memory grew forever)", () => {
  test("empty idle games are deleted, active ones kept", () => {
    const gm = new GameManager();
    gm.createGame("idle1");
    const busy = gm.createGame("busy1");
    busy.addPlayer({ id: "p1" });
    const later = Date.now() + 10 * 60 * 1000;
    busy.lastActivity = later;
    gm.sweep(later);
    expect(gm.getById("idle1")).toBeUndefined();
    expect(gm.getById("busy1")).toBeDefined();
  });

  test("games idle for hours are deleted even with players", () => {
    const gm = new GameManager();
    const g = gm.createGame("stale");
    g.addPlayer({ id: "p1" });
    gm.sweep(Date.now() + 7 * 60 * 60 * 1000);
    expect(gm.getById("stale")).toBeUndefined();
  });

  test("players unseen and in no game are forgotten; disconnect drops the client", () => {
    const pm = new PlayerManager();
    const client = { id: "c1", emit() {}, on() {} };
    const p = pm.addPlayer(client);
    p.removeClient(client);
    expect(p.clients).toHaveLength(0);
    pm.sweep(Date.now() + 60 * 60 * 1000, new Set([p.id]));
    expect(pm.playersByPlayerid[p.id]).toBeDefined();
    pm.sweep(Date.now() + 60 * 60 * 1000, new Set());
    expect(pm.playersByPlayerid[p.id]).toBeUndefined();
    expect(pm.playersByClientid.c1).toBeUndefined();
  });
});
