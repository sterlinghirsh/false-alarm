// A scripted three-player round over socket.io 4, against a running server or one
// this starts from src/server/server.js:
//   node scripts/round.mjs [http://host:port] [--origin https://sterlinghirsh.com]
// Checks: three players join one game, the round starts, everyone hears and taps
// the others' phrases (correct score), wrong taps count, the game ends with stats,
// a bad message gets serverError (the server lives on), and ?probe=1 is closed.
import { io } from "socket.io-client";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const args = process.argv.slice(2);
const oi = args.indexOf("--origin");
const origin = oi >= 0 ? args.splice(oi, 2)[1] : undefined;
let url = args[0];
let local;
if (!url) {
  const { createServer } = require("../src/server/server.js");
  local = createServer({ BUILD_ID: "round", ALLOWED_ORIGINS: "" });
  await new Promise((r) => local.server.listen(0, "127.0.0.1", r));
  url = `http://127.0.0.1:${local.server.address().port}`;
}

const t0 = Date.now();
const log = (...a) => console.log(`${((Date.now() - t0) / 1000).toFixed(2)}s`, ...a);
const fail = (msg) => {
  console.error("FAIL:", msg);
  process.exit(1);
};
const guard = setTimeout(() => fail("timed out"), 60_000);
const opts = { path: "/socket.io/", transports: ["websocket"], forceNew: true, extraHeaders: origin ? { Origin: origin } : undefined };
const once = (s, ev) => new Promise((r) => s.once(ev, r));
const until = (pred, what, ms = 10_000) =>
  new Promise((resolve, reject) => {
    const end = Date.now() + ms;
    const tick = () => (pred() ? resolve() : Date.now() > end ? reject(new Error(`waiting for ${what}`)) : setTimeout(tick, 10));
    tick();
  });

const health = await fetch(`${url}/health`);
const body = await health.text();
if (!health.ok || !body.startsWith("ok ") || health.headers.get("cache-control") !== "no-store") fail(`health: ${health.status} ${body}`);
log("health:", body.trim());

const players = [0, 1, 2].map((n) => {
  const p = { n, socket: io(url, opts), phrase: null, buttons: [], started: false, over: null, score: null, errors: [] };
  p.socket.on("updatePhrase", (ph) => (p.phrase = ph));
  p.socket.on("updateButtons", (b) => (p.buttons = b));
  p.socket.on("setPlayerid", (id) => (p.id = id));
  p.socket.on("startGame", () => (p.started = true));
  p.socket.on("updatePlayerCount", (c) => (p.count = c));
  p.socket.on("updateScore", (s) => (p.score = s));
  p.socket.on("gameOver", (stats) => (p.over = stats));
  p.socket.on("serverError", (e) => p.errors.push(e.message));
  p.socket.on("connect_error", (e) => fail(`player ${n} refused: ${e.message}`));
  return p;
});
await Promise.all(players.map((p) => once(p.socket, "connect")));
log("3 connected");

players[0].socket.emit("createGame");
const gameid = await once(players[0].socket, "gameCreated");
for (const p of players) p.socket.emit("subscribeToGame", { gameid });
await until(() => players.every((p) => p.id && p.count === 3), "3 players in the game");
log("game", gameid, "players", players.map((p) => p.id).join(" "));

players[1].socket.emit("ready", { gameid });
await until(() => players.every((p) => p.started && p.phrase && p.buttons.length), "start");
log("started");

// Everyone taps a button that is another player's current phrase.
let correct = 0;
while (correct < 6) {
  const live = new Set(players.map((p) => p.phrase?.Phrase));
  const tapper = players.find((p) => p.buttons.some((b) => live.has(b.Phrase) && b.Phrase !== p.phrase.Phrase));
  if (!tapper) {
    await new Promise((r) => setTimeout(r, 20));
    continue;
  }
  const b = tapper.buttons.find((b) => live.has(b.Phrase) && b.Phrase !== tapper.phrase.Phrase);
  tapper.socket.emit("clickPhrase", { gameid, playerid: tapper.id, phrase: b.Phrase });
  const want = ++correct;
  await until(() => players.every((p) => p.score?.numCorrect === want), `score ${want}`);
}
log("6 correct taps scored");

// A bad message is refused, not fatal.
players[2].socket.emit("ready", { gameid: "nosuchgame" });
await until(() => players[2].errors.includes("Game not found."), "serverError");
log("bad message -> serverError:", players[2].errors[0]);

// Wrong taps cost double and shorten the clock; the game ends.
for (let i = 0; i < 20; i++) players[i % 3].socket.emit("clickPhrase", { gameid, playerid: players[i % 3].id, phrase: "not a phrase" });
await until(() => players.every((p) => p.score?.numIncorrect === 20), "20 wrong taps");
await until(() => players.every((p) => p.over), "game over", 15_000);
log("game over; stats:", JSON.stringify(players[0].over));

// The deploy's socket check: accepted, then closed by the server.
const probe = io(url + "?probe=1", { ...opts, query: { probe: "1" }, reconnection: false });
await once(probe, "connect");
const reason = await once(probe, "disconnect");
if (reason !== "io server disconnect") fail(`probe closed with ${reason}`);
log("probe accepted and closed");

for (const p of players) p.socket.close();
clearTimeout(guard);
if (local) await local.close();
log("PASS");
process.exit(0);
