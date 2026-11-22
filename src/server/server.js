const express = require("express");
const http = require("http");
const PlayerManager = require("./PlayerManager");
const GameManager = require("./GameManager");
const { attach: attachHandlers } = require("./socketHandlers");

const playerManager = new PlayerManager();
const gameManager = new GameManager();

const app = express();
// if (process.env.NODE_ENV === "production") {
// This seems to be important for wait-on to work.
app.use(express.static("build"));
// }
const server = http.createServer(app);
const io = require("socket.io")(server);

attachHandlers(io, gameManager, playerManager);

// Last resort: log and keep serving rather than exit on a stray error.
process.on("uncaughtException", (err) => console.error("uncaughtException:", err));
process.on("unhandledRejection", (err) => console.error("unhandledRejection:", err));

// Drop idle games and players so memory does not grow without bound.
const sweep = setInterval(() => {
  const now = Date.now();
  gameManager.sweep(now);
  playerManager.sweep(now, gameManager.activePlayerIds());
}, 60 * 1000);
sweep.unref();

const port = process.env.PORT || 5000;

// Bind to all interfaces for better compatibility with proxies and containers
const host = "0.0.0.0";

//io.listen(port);
server.listen(port, host);
console.log(
  `listening on port ${port}, host ${host} (NODE_ENV: ${process.env.NODE_ENV || "development"})`,
);
