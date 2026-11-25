// Three players over socket.io 4: one turns categories off before the start, the
// others hear it, and the round deals only phrases from the enabled categories.
//   node scripts/round-categories.mjs [http://host:port] [--origin https://…]
import { io } from "socket.io-client";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const phrases = require("../src/phrases.json");
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
const fail = (m) => { console.error("FAIL:", m); process.exit(1); };
setTimeout(() => fail("timed out"), 30_000).unref();
const opts = { path: "/socket.io/", transports: ["websocket"], forceNew: true, extraHeaders: origin ? { Origin: origin } : undefined };
const once = (s, ev) => new Promise((r) => s.once(ev, r));
const until = (pred, what, ms = 10_000) => new Promise((res, rej) => {
  const end = Date.now() + ms;
  const t = () => (pred() ? res() : Date.now() > end ? rej(new Error(what)) : setTimeout(t, 10));
  t();
}).catch((e) => fail(`waiting for ${e.message}`));

const players = [0, 1, 2].map((n) => {
  const p = { n, socket: io(url, opts), settings: null, phrase: null, buttons: [], started: false, errors: [] };
  p.socket.on("gameSettings", (s) => (p.settings = s));
  p.socket.on("updatePhrase", (ph) => (p.phrase = ph));
  p.socket.on("updateButtons", (b) => (p.buttons = b));
  p.socket.on("setPlayerid", (id) => (p.id = id));
  p.socket.on("updatePlayerCount", (c) => (p.count = c));
  p.socket.on("startGame", () => (p.started = true));
  p.socket.on("serverError", (e) => p.errors.push(e.message));
  return p;
});
await Promise.all(players.map((p) => once(p.socket, "connect")));
players[0].socket.emit("createGame");
const gameid = await once(players[0].socket, "gameCreated");
for (const p of players) p.socket.emit("subscribeToGame", { gameid });
await until(() => players.every((p) => p.count === 3 && p.settings), "3 players with settings");
const all = players[0].settings.allCategories;
const def = players[0].settings.enabledCategories;
if (def.includes("Chamberlain") || def.length !== all.length - 1) fail(`default should be all but Chamberlain: ${def}`);
console.log("categories:", all.join(", "), "| phrases:", players[0].settings.selectedWordCount);

// Player 2 picks Chamberlain plus one other: Chamberlain is dealt only when ticked.
const keep = ["Chamberlain", "Calming"];
players[2].socket.emit("updateCategories", { gameid, categories: keep });
await until(() => players.every((p) => p.settings.enabledCategories.length === keep.length), "toggle reaches all 3");
const expected = phrases.filter((p) => p.Type.some((t) => keep.includes(t)));
if (players[0].settings.selectedWordCount !== expected.length) fail("selectedWordCount mismatch");
console.log("enabled:", keep.join(", "), "->", expected.length, "phrases, seen by all 3 players");

// A bad payload gets serverError.
players[1].socket.emit("updateCategories", { gameid, categories: ["Nope"] });
await until(() => players[1].errors.length === 1, "serverError for a bad category");

players[1].socket.emit("ready", { gameid });
await until(() => players.every((p) => p.started && p.phrase), "start");
await until(() => players.every((p) => p.buttons.length > 0), "buttons");
// Each player sees up to 4 buttons; tap correct ones so more phrases come through.
const seen = new Set();
for (let i = 0; i < 10; i++) {
  for (const p of players) { seen.add(p.phrase.Phrase); p.buttons.forEach((b) => seen.add(b.Phrase)); }
  const actives = new Set(players.map((p) => p.phrase.Phrase));
  const tapper = players.find((p) => p.buttons.some((b) => actives.has(b.Phrase)));
  if (!tapper) break;
  const b = tapper.buttons.find((b) => actives.has(b.Phrase)).Phrase;
  const before = players.map((p) => p.phrase.Phrase).join();
  tapper.socket.emit("clickPhrase", { gameid, playerid: tapper.id, phrase: b });
  // A player whose phrases run out keeps the last one shown, so stop there.
  const end = Date.now() + 1000;
  while (players.map((p) => p.phrase.Phrase).join() === before && Date.now() < end) await new Promise((r) => setTimeout(r, 10));
  if (players.map((p) => p.phrase.Phrase).join() === before) break;
}
const dealt = [...seen];
const allowed = new Set(expected.map((p) => p.Phrase));
const bad = dealt.filter((d) => !allowed.has(d));
if (bad.length) fail(`dealt outside enabled categories: ${bad.join(" | ")}`);
for (const p of players) if (!allowed.has(p.phrase.Phrase)) fail("current phrase outside enabled categories");
console.log("saw", dealt.length, "distinct phrases and buttons, all from enabled categories");

// After the start a change is ignored.
players[0].socket.emit("updateCategories", { gameid, categories: all });
await new Promise((r) => setTimeout(r, 300));
if (players.some((p) => p.settings.enabledCategories.length !== keep.length)) fail("change after start was applied");
console.log("change after the start ignored");

// A second game left at the defaults deals no Chamberlain phrase.
const fresh = [0, 1, 2].map(() => {
  const p = { socket: io(url, opts), phrase: null, buttons: [], started: false };
  p.socket.on("setPlayerid", (id) => (p.id = id));
  p.socket.on("updatePhrase", (ph) => (p.phrase = ph));
  p.socket.on("updateButtons", (b) => (p.buttons = b));
  p.socket.on("updatePlayerCount", (c) => (p.count = c));
  p.socket.on("startGame", () => (p.started = true));
  return p;
});
await Promise.all(fresh.map((p) => once(p.socket, "connect")));
fresh[0].socket.emit("createGame");
const g2 = await once(fresh[0].socket, "gameCreated");
for (const p of fresh) p.socket.emit("subscribeToGame", { gameid: g2 });
await until(() => fresh.every((p) => p.count === 3), "3 players in game 2");
fresh[0].socket.emit("ready", { gameid: g2 });
await until(() => fresh.every((p) => p.started && p.phrase && p.buttons.length), "game 2 start");
const chamberlain = new Set(phrases.filter((p) => p.Type.includes("Chamberlain")).map((p) => p.Phrase));
const shown = fresh.flatMap((p) => [p.phrase.Phrase, ...p.buttons.map((b) => b.Phrase)]);
if (shown.some((s) => chamberlain.has(s))) fail("default game dealt a Chamberlain phrase");
console.log("default game: no Chamberlain in", shown.length, "phrases and buttons shown");
for (const p of fresh) p.socket.close();

console.log("PASS");
for (const p of players) p.socket.close();
if (local) { local.io.close(); local.server.close(); }
process.exit(0);
