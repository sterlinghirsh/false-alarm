// Three players over socket.io 4 with a custom list: player 0 adds it, the
// others see it, player 1 plays only it, and the round deals only its phrases.
// The others can't edit it, and changes after the start are ignored.
//   node scripts/round-lists.mjs [http://host:port] [--origin https://…]
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

const mine = Array.from({ length: 15 }, (_, i) => `Pass the gravy ${i + 1}`);
// A paste with blank lines and a repeat: the server keeps 15.
players[0].socket.emit("addList", { gameid, clientId: "lround", name: "Sterling's list", phrases: ["", ...mine, mine[0].toUpperCase(), "  "] });
await until(() => players.every((p) => p.settings.customLists?.length === 1), "the list reaches all 3");
const list = players[1].settings.customLists[0];
if (list.name !== "Sterling's list" || list.count !== 15 || list.mine || "clientId" in list) fail(`others see ${JSON.stringify(list)}`);
if (!players[0].settings.customLists[0].mine) fail("the owner should see mine: true");
console.log("list:", list.name, `(${list.count})`, "seen by all 3; ticked:", players[0].settings.enabledCategories.includes(list.key));

players[1].socket.emit("removeList", { gameid, key: list.key });
await until(() => players[1].errors.length === 1, "player 1's remove refused");
console.log("player 1 remove:", players[1].errors[0]);

players[1].socket.emit("updateCategories", { gameid, categories: [list.key] });
await until(() => players.every((p) => p.settings.enabledCategories.length === 1 && p.settings.selectedWordCount === 15), "only the list ticked");
players[2].socket.emit("ready", { gameid });
await until(() => players.every((p) => p.started && p.phrase), "start");
const dealt = new Set([...players.map((p) => p.phrase.Phrase), ...players.flatMap((p) => p.buttons.map((b) => b.Phrase))]);
if ([...dealt].some((t) => !mine.includes(t))) fail(`a non-list phrase was dealt: ${[...dealt]}`);
const buttons = players.reduce((n, p) => n + p.buttons.length, 0);
// 15 phrases over 3 players is 5 each; a phone shows 4 buttons at a time.
if (buttons !== 12) fail(`4 buttons each expected, got ${buttons}`);
console.log("dealt: only list phrases;", dealt.size, "shown, 4 buttons each");

players[0].socket.emit("removeList", { gameid, key: list.key });
await new Promise((r) => setTimeout(r, 200));
if (players[0].errors.length) fail(`after the start: ${players[0].errors}`);
console.log("remove after the start ignored");
const all = players.flatMap((p) => p.errors).filter((e) => !e.startsWith("Only the phone"));
if (all.length) fail(`errors: ${all}`);
console.log("PASS");
for (const p of players) p.socket.close();
local?.server.close();
process.exit(0);
