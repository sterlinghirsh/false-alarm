// Bundle the server into one file for the realtime host, which never runs npm install.
//   node scripts/bundle-server.mjs [--out DIR]     (default .tmp/server)
// Writes DIR/main.cjs (socket.io and the game logic inlined; Node built-ins external).
// The optional native helpers ws can use (bufferutil, utf-8-validate) stay out: ws
// falls back to plain JS without them.
import { build } from "esbuild";
import { mkdirSync } from "node:fs";
import { join } from "node:path";

const i = process.argv.indexOf("--out");
const out = i > 0 ? process.argv[i + 1] : ".tmp/server";
mkdirSync(out, { recursive: true });

await build({
  entryPoints: ["src/server/server.js"],
  outfile: join(out, "main.cjs"),
  bundle: true,
  platform: "node",
  target: "node24",
  format: "cjs",
  external: ["bufferutil", "utf-8-validate"],
  legalComments: "none",
  sourcemap: "linked",
  logLevel: "warning",
});
console.log(`bundled ${join(out, "main.cjs")}`);
