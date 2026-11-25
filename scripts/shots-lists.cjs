// Screenshots of custom lists at phone widths: the sheet, and the panel with "Your lists".
// Build first (REACT_APP_SOCKET_URL=http://127.0.0.1:7989 npm run build), then
//   node scripts/shots-lists.cjs <outdir> <label>
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
const devices = { iphone: { width: 390, height: 844 }, android: { width: 412, height: 915 } };
const gravy = ["Pass the gravy", "Who ate the pie?", "Is the turkey done?", "Where's the cat?", "Pumpkin or pecan?", "Grandma's on the phone", "Turn off the game", "More stuffing please"];
for (const [name, vp] of Object.entries(devices)) {
  const phone = async (url, saved) => {
    const ctx = await browser.newContext({ viewport: vp, deviceScaleFactor: 2, hasTouch: true, isMobile: true });
    if (saved) await ctx.addInitScript((l) => localStorage.getItem("falseAlarm.lists") || localStorage.setItem("falseAlarm.lists", JSON.stringify(l)), saved);
    const p = await ctx.newPage();
    await p.goto(url);
    return { ctx, p };
  };
  const host = await phone(base, [{ id: "lsaved", name: "Office party", phrases: ["Reply all", "You're on mute", "Cake in the kitchen"] }]);
  await host.p.locator(".gameid").waitFor();
  const id = await host.p.locator(".gameid").textContent();
  const other = await phone(`${base}#${id}`);
  const third = await phone(`${base}#${id}`);
  await host.p.getByText(/Players:\s*3/).waitFor();
  // Another player's list, shared into the game.
  await other.p.evaluate(() => 0);
  await other.p.locator(".gameSettingsHeader").click();
  await other.p.getByRole("button", { name: "Add a list" }).click();
  await other.p.getByLabel("Name").fill("Mia's road trip");
  await other.p.getByLabel("Phrases, one per line").fill(["Are we there yet?", "I need a snack", "Bathroom break", "Turn it up", "Who farted?", "Look, a cow!"].join("\n"));
  await other.p.getByRole("button", { name: "Add", exact: true }).click();
  await host.p.locator(".gameSettingsHeader").click();
  await host.p.getByRole("button", { name: "Add a list" }).click();
  await host.p.getByLabel("Name").fill("Sterling's list");
  await host.p.getByLabel("Phrases, one per line").fill(gravy.join("\n") + "\n\nPass the gravy\n");
  await host.p.waitForTimeout(400);
  await host.p.screenshot({ path: `${outDir}/${label}-${name}-sheet.png` });
  await host.p.getByRole("button", { name: "Add", exact: true }).click();
  await host.p.waitForTimeout(400);
  await host.p.locator(".yourLists").scrollIntoViewIfNeeded();
  await host.p.screenshot({ path: `${outDir}/${label}-${name}-panel.png` });
  await host.p.screenshot({ path: `${outDir}/${label}-${name}-panel-full.png`, fullPage: true });
  await host.p.evaluate(() => window.scrollTo(0, 0));
  await host.p.locator(".gameSettingsHeader").click();
  await host.p.waitForTimeout(300);
  await host.p.screenshot({ path: `${outDir}/${label}-${name}-closed.png` });
  await third.p.locator(".gameSettingsHeader").click();
  await third.p.locator(".yourLists").scrollIntoViewIfNeeded();
  await third.p.waitForTimeout(300);
  await third.p.screenshot({ path: `${outDir}/${label}-${name}-others.png` });
  // Few phrases each: only the road trip list ticked.
  const boxes = third.p.locator(".categoryGroup").first().locator("input:checked");
  while ((await boxes.count()) > 0) await boxes.first().uncheck();
  await third.p.locator(".yourLists .categoryLabel", { hasText: "Sterling" }).locator("input").uncheck();
  await third.p.waitForTimeout(300);
  await third.p.locator(".gameSettings").scrollIntoViewIfNeeded();
  await third.p.screenshot({ path: `${outDir}/${label}-${name}-few.png` });
  for (const x of [host, other, third]) await x.ctx.close();
}
if (!cdp) await browser.close();
pages.close();
process.exit(0);
})();
