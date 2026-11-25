/**
 * @jest-environment node
 */
const http = require("http");
const { io } = require("socket.io-client");

// Jest 27's node environment has no global fetch; a small stand-in.
const fetch = (u, { headers = {} } = {}) =>
  new Promise((resolve, reject) => {
    http.get(u, { headers }, (res) => {
      let body = "";
      res.on("data", (c) => (body += c));
      res.on("end", () =>
        resolve({
          status: res.statusCode,
          text: async () => body,
          headers: { get: (k) => res.headers[k.toLowerCase()] ?? null },
        }),
      );
    }).on("error", reject);
  });
const { createServer, originAllowed, parseOrigins } = require("../server");

let srv;
let url;

beforeAll(async () => {
  srv = createServer({
    BUILD_ID: "abc123",
    ALLOWED_ORIGINS: "https://sterlinghirsh.com, https://false-alarm.rt.sterlinghirsh.com/",
  });
  await new Promise((r) => srv.server.listen(0, "127.0.0.1", r));
  url = `http://127.0.0.1:${srv.server.address().port}`;
});

afterAll(() => srv.close());

const connect = (headers, query) =>
  new Promise((resolve) => {
    const s = io(url, {
      transports: ["websocket"],
      forceNew: true,
      reconnection: false,
      extraHeaders: headers,
      query,
    });
    // Listen for the close from the start: the server closes a probe one tick
    // after accepting it, which can land in the same read as the connect.
    s.closed = new Promise((r) => s.on("disconnect", r));
    s.on("connect", () => resolve({ s, ok: true }));
    s.on("connect_error", (err) => resolve({ s, ok: false, err }));
  });

test("parses and checks origins", () => {
  const allowed = parseOrigins(" https://a.com/ ,https://b.com,");
  expect(allowed).toEqual(["https://a.com", "https://b.com"]);
  expect(originAllowed(undefined, allowed)).toBe(true);
  expect(originAllowed("https://b.com", allowed)).toBe(true);
  expect(originAllowed("https://evil.com", allowed)).toBe(false);
  expect(originAllowed("https://evil.com", [])).toBe(true);
});

test("GET /health answers ok <build> without caching", async () => {
  const res = await fetch(`${url}/health`, { headers: { Origin: "https://sterlinghirsh.com" } });
  expect(res.status).toBe(200);
  expect(await res.text()).toBe("ok abc123\n");
  expect(res.headers.get("cache-control")).toBe("no-store");
  expect(res.headers.get("access-control-allow-origin")).toBe("https://sterlinghirsh.com");
});

test("other paths are 404, and the server serves no page", async () => {
  expect((await fetch(`${url}/`)).status).toBe(404);
  expect((await fetch(`${url}/socket.io/socket.io.js`)).status).not.toBe(200);
});

test("the page's origin may connect; another site's may not", async () => {
  const good = await connect({ Origin: "https://sterlinghirsh.com" });
  expect(good.ok).toBe(true);
  good.s.close();
  const bad = await connect({ Origin: "https://evil.example" });
  expect(bad.ok).toBe(false);
  bad.s.close();
});

test("a ?probe=1 connection is accepted and closed by the server", async () => {
  const { s, ok } = await connect({}, { probe: "1" });
  expect(ok).toBe(true);
  expect(await s.closed).toBe("io server disconnect");
});

test("an unknown game gets serverError, and the server keeps going", async () => {
  const { s } = await connect({});
  s.emit("ready", { gameid: "nope" });
  const err = await new Promise((r) => s.on("serverError", r));
  expect(err.message).toBe("Game not found.");
  s.emit("createGame");
  expect(await new Promise((r) => s.on("gameCreated", r))).toMatch(/^[a-z]{4}$/);
  s.close();
});

// kitten's game-deploy.sh ws_status: a bare upgrade to /socket.io/*?probe=1.
const rawUpgrade = (origin) =>
  new Promise((resolve) => {
    const req = http.request(`${url}/socket.io/*?probe=1`, {
      headers: {
        Connection: "Upgrade",
        Upgrade: "websocket",
        "Sec-WebSocket-Version": "13",
        "Sec-WebSocket-Key": "Z2FtZS1kZXBsb3kgcHJvYmU=",
        ...(origin ? { Origin: origin } : {}),
      },
    });
    req.on("upgrade", (res, socket) => {
      socket.destroy();
      resolve(res.statusCode);
    });
    req.on("response", (res) => resolve(res.statusCode));
    req.on("error", () => resolve("error"));
    req.end();
  });

test("the deploy's bare probe upgrade: 101 for the page, 403 for another site", async () => {
  expect(await rawUpgrade("https://sterlinghirsh.com")).toBe(101);
  expect(await rawUpgrade("https://origin-check.invalid")).toBe(403);
});
