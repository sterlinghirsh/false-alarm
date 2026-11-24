// The False Alarm realtime server: socket.io 4 on plain node:http.
// The page is static (sterlinghirsh.com/false-alarm/), so this serves only
// GET /health and socket.io's path. Settings from the environment, as kitten's
// deploy unit sets them:
//   PORT, HOST          where to listen (default 5000 on 0.0.0.0 for local dev)
//   ALLOWED_ORIGINS     comma-separated page origins allowed to open a socket;
//                       empty allows any (local dev). No Origin (curl) passes.
//   BUILD_ID            reported by /health as "ok <BUILD_ID>"
const http = require("http");
const crypto = require("crypto");
const { Server } = require("socket.io");
const PlayerManager = require("./PlayerManager");
const GameManager = require("./GameManager");
const { attach: attachHandlers } = require("./socketHandlers");

const SOCKET_PATH = "/socket.io/";

function parseOrigins(value) {
  return (value || "")
    .split(",")
    .map((s) => s.trim().replace(/\/+$/, ""))
    .filter(Boolean);
}

// True when a request's Origin header may open a socket.
function originAllowed(origin, allowed) {
  if (!origin) return true;
  if (allowed.length === 0) return true;
  return allowed.includes(origin);
}

function createServer(env = process.env) {
  const allowed = parseOrigins(env.ALLOWED_ORIGINS);
  const buildId = env.BUILD_ID || "dev";

  const server = http.createServer((req, res) => {
    const path = (req.url || "/").split("?")[0];
    if (path === "/health" && (req.method === "GET" || req.method === "HEAD")) {
      const headers = {
        "Content-Type": "text/plain; charset=utf-8",
        "Cache-Control": "no-store",
      };
      const origin = req.headers.origin;
      if (origin && originAllowed(origin, allowed)) {
        headers["Access-Control-Allow-Origin"] = origin;
        headers["Vary"] = "Origin";
      }
      res.writeHead(200, headers);
      res.end(req.method === "HEAD" ? undefined : `ok ${buildId}\n`);
      return;
    }
    // socket.io answers its own path before this listener runs.
    res.writeHead(404, { "Content-Type": "text/plain", "Cache-Control": "no-store" });
    res.end("not found\n");
  });

  const io = new Server(server, {
    path: SOCKET_PATH,
    serveClient: false,
    maxHttpBufferSize: 16 * 1024,
    cors: { origin: (origin, cb) => cb(null, originAllowed(origin, allowed)) },
    allowRequest: (req, cb) => cb(null, originAllowed(req.headers.origin, allowed)),
  });

  // The deploy's check (kitten game-deploy.sh ws_status) sends a bare WebSocket
  // upgrade to <WS_PATHS>?probe=1 with no engine.io parameters: answer 101 to an
  // allowed origin and close at once, 403 otherwise. Everything else goes to
  // engine.io's own upgrade handler.
  const engineUpgrade = server.listeners("upgrade");
  server.removeAllListeners("upgrade");
  server.on("upgrade", (req, socket, head) => {
    const [path, query = ""] = (req.url || "").split("?");
    const params = new URLSearchParams(query);
    if (path.startsWith(SOCKET_PATH) && params.get("probe") === "1" && !params.has("EIO")) {
      const key = req.headers["sec-websocket-key"];
      if (!originAllowed(req.headers.origin, allowed) || !key) {
        socket.end("HTTP/1.1 403 Forbidden\r\nConnection: close\r\nContent-Length: 0\r\n\r\n");
        return;
      }
      const accept = crypto
        .createHash("sha1")
        .update(key + "258EAFA5-E914-47DA-95CA-C5AB0DC85B11")
        .digest("base64");
      socket.write(
        "HTTP/1.1 101 Switching Protocols\r\nUpgrade: websocket\r\nConnection: Upgrade\r\n" +
          `Sec-WebSocket-Accept: ${accept}\r\n\r\n`,
      );
      socket.end(Buffer.from([0x88, 0x02, 0x03, 0xe8])); // close frame, 1000
      return;
    }
    for (const l of engineUpgrade) l.call(server, req, socket, head);
  });

  // A socket.io client connecting with ?probe=1 is accepted, then closed.
  io.use((socket, next) => {
    if (socket.handshake.query?.probe === "1") {
      setTimeout(() => socket.disconnect(true), 0);
    }
    next();
  });

  const playerManager = new PlayerManager();
  const gameManager = new GameManager();
  attachHandlers(io, gameManager, playerManager);

  // Drop idle games and players so memory does not grow without bound.
  const sweep = setInterval(() => {
    const now = Date.now();
    gameManager.sweep(now);
    playerManager.sweep(now, gameManager.activePlayerIds());
  }, 60 * 1000);
  sweep.unref();

  const close = () =>
    new Promise((resolve) => {
      clearInterval(sweep);
      io.close(() => resolve());
    });

  return { server, io, gameManager, playerManager, close, allowed, buildId };
}

module.exports = { createServer, originAllowed, parseOrigins, SOCKET_PATH };

if (require.main === module) {
  // Last resort: log and keep serving rather than exit on a stray error.
  process.on("uncaughtException", (err) => console.error("uncaughtException:", err));
  process.on("unhandledRejection", (err) => console.error("unhandledRejection:", err));

  const port = Number(process.env.PORT) || 5000;
  const host = process.env.HOST || "0.0.0.0";
  const { server, io, allowed, buildId } = createServer();
  // A port that can't be bound is fatal: exit so systemd sees it (the catch-all
  // handlers above would otherwise leave a process that serves nothing).
  server.on("error", (err) => {
    console.error("server error:", err);
    process.exit(1);
  });
  server.listen(port, host, () => {
    console.log(
      `false-alarm ${buildId} listening on ${host}:${port}; origins: ${allowed.join(", ") || "any"}`,
    );
  });
  const stop = () => {
    io.close();
    setTimeout(() => process.exit(0), 3000).unref();
  };
  process.on("SIGTERM", stop);
  process.on("SIGINT", stop);
}
