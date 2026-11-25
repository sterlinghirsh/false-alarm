// Screenshots of the lobby categories panel at phone widths: closed, open, locked.
// Build first (REACT_APP_SOCKET_URL=http://127.0.0.1:7989 npm run build), then
//   node scripts/shots-categories.cjs <outdir> <label>
// Under the broker (HORNET_QA_BROWSER_PORT) it attaches to the slot's warm Chrome.
const http = require("node:http");
const fs = require("node:fs");
const path = require("node:path");
const { chromium } = require("@playwright/test");
const { createServer } = require("../src/server/server");

(async () => {
const [outDir, label = "shot"] = process.argv.slice(2);
const BUILD = path.resolve("build");
const TYPES = { ".html": "text/html", ".js": "text/javascript", ".css": "text/css", ".json": "application/json" };
const game = createServer({ BUILD_ID: "shots", ALLOWED_ORIGINS: "" });
await new Promise((r) => game.server.listen(7989, "127.0.0.1", r));
const pages = http.createServer((req, res) => {
  const p = decodeURIComponent(req.url.split("?")[0]);
  let f = path.join(BUILD, p.replace(/^\/false-alarm\//, "") || "index.html");
  if (!f.startsWith(BUILD) || !fs.existsSync(f) || fs.statSync(f).isDirectory()) f = path.join(BUILD, "index.html");
  res.writeHead(200, { "Content-Type": TYPES[path.extname(f)] || "application/octet-stream" });
  fs.createReadStream(f).pipe(res);
});
await new Promise((r) => pages.listen(0, "127.0.0.1", r));
const base = `http://localhost:${pages.address().port}/false-alarm/`;
const cdp = process.env.HORNET_QA_BROWSER_PORT;
const browser = cdp ? await chromium.connectOverCDP(`http://127.0.0.1:${cdp}`) : await chromium.launch();
const devices = { iphone: { width: 390, height: 844, deviceScaleFactor: 2 }, android: { width: 412, height: 915, deviceScaleFactor: 2 } };
const open = process.env.OPEN_SELECTOR || ".gameSettingsHeader";
for (const [name, vp] of Object.entries(devices)) {
  const ctx = await browser.newContext({ viewport: { width: vp.width, height: vp.height }, deviceScaleFactor: vp.deviceScaleFactor, hasTouch: true, isMobile: true });
  const host = await ctx.newPage();
  await host.goto(base);
  await host.locator(".gameid").waitFor();
  const id = await host.locator(".gameid").textContent();
  const p2 = await ctx.newPage();
  await p2.goto(`${base}#${id}`);
  await host.getByText(/Players:\s*2/).waitFor();
  await host.waitForTimeout(300);
  await host.screenshot({ path: `${outDir}/${label}-${name}-closed.png` });
  await host.locator(open).click();
  await host.waitForTimeout(400);
  await host.screenshot({ path: `${outDir}/${label}-${name}-open.png` });
  await host.screenshot({ path: `${outDir}/${label}-${name}-open-full.png`, fullPage: true });
  await host.locator(".startGameButton").click();
  await host.locator(".sayThisPhrase").waitFor();
  await host.waitForTimeout(300);
  await p2.screenshot({ path: `${outDir}/${label}-${name}-locked.png` });
  await ctx.close();
}
if (!cdp) await browser.close();
pages.close();
game.io?.close?.();
process.exit(0);
})();
