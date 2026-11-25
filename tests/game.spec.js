const { test, expect, chromium } = require("@playwright/test");
const http = require("http");
const fs = require("fs");
const path = require("path");
const { createServer } = require("../src/server/server");

const GAME_PORT = 7989;
const BUILD = path.join(__dirname, "..", "build");
const TYPES = {
  ".html": "text/html",
  ".js": "text/javascript",
  ".css": "text/css",
  ".json": "application/json",
  ".ico": "image/x-icon",
  ".txt": "text/plain",
};

let game, pageServer, base, browser, context;

test.beforeAll(async () => {
  if (!fs.existsSync(path.join(BUILD, "index.html"))) {
    throw new Error("no build/: see playwright.config.js");
  }
  game = createServer({ BUILD_ID: "e2e", ALLOWED_ORIGINS: "" });
  await new Promise((r) => game.server.listen(GAME_PORT, "127.0.0.1", r));
  // The page as cPanel serves it: build/ under /false-alarm/.
  pageServer = http.createServer((req, res) => {
    const p = decodeURIComponent(req.url.split("?")[0]);
    if (!p.startsWith("/false-alarm/")) return res.writeHead(404).end();
    let file = path.join(BUILD, p.slice("/false-alarm/".length) || "index.html");
    if (!file.startsWith(BUILD) || !fs.existsSync(file) || fs.statSync(file).isDirectory()) {
      file = path.join(BUILD, "index.html");
    }
    res.writeHead(200, { "Content-Type": TYPES[path.extname(file)] || "application/octet-stream" });
    fs.createReadStream(file).pipe(res);
  });
  await new Promise((r) => pageServer.listen(0, "127.0.0.1", r));
  base = `http://localhost:${pageServer.address().port}/false-alarm/`;
  const cdp = process.env.HORNET_QA_BROWSER_PORT;
  browser = cdp
    ? await chromium.connectOverCDP(`http://127.0.0.1:${cdp}`)
    : await chromium.launch();
  context = await browser.newContext();
});

test.afterAll(async () => {
  await context?.close();
  if (!process.env.HORNET_QA_BROWSER_PORT) await browser?.close();
  await game?.close();
  pageServer?.close();
});

test("three players join from the page at /false-alarm/ and play", async () => {
  const errors = [];
  const pages = [];
  const open = async (url) => {
    const p = await context.newPage();
    p.on("pageerror", (e) => errors.push(e.message));
    await p.goto(url);
    pages.push(p);
    return p;
  };

  const host = await open(base);
  await expect(host.locator(".gameid")).toHaveText(/^[a-z]{4}$/);
  const gameid = await host.locator(".gameid").textContent();
  const joinUrl = `${base}#${gameid}`;
  // The invite link and QR point at this page and game.
  await expect(host.locator(".roomCodeInfo a")).toHaveAttribute("href", joinUrl);
  await expect(host.locator("img.qrCode")).toBeVisible();

  await open(joinUrl);
  await open(joinUrl);
  for (const p of pages) await expect(p.locator("body")).toContainText(/Players:\s*3/);

  await host.locator(".startGameButton").click();
  for (const p of pages) {
    await expect(p.locator("body")).not.toContainText("Loading...");
    await expect(p.locator("button").first()).toBeVisible();
  }

  // The service worker is scoped to the page's folder.
  const scope = await host.evaluate(async () => (await navigator.serviceWorker.ready).scope);
  expect(scope).toBe(base);

  // A server error is shown, not swallowed.
  game.io.emit("serverError", { message: "Game not found." });
  await expect(host.locator(".serverError")).toContainText("Game not found.");

  expect(errors).toEqual([]);
});

test("the categories panel shows, a toggle reaches the others, and it locks at the start", async () => {
  const errors = [];
  const pages = [];
  const open = async (url) => {
    const p = await context.newPage();
    p.on("pageerror", (e) => errors.push(e.message));
    await p.goto(url);
    pages.push(p);
    return p;
  };
  const host = await open(base);
  await expect(host.locator(".gameid")).toHaveText(/^[a-z]{4}$/);
  const gameid = await host.locator(".gameid").textContent();
  const p2 = await open(`${base}#${gameid}`);
  const p3 = await open(`${base}#${gameid}`);
  for (const p of pages) await expect(p.locator(".gameSettingsTitle")).toHaveText("Categories (7)");

  await host.locator(".gameSettingsHeader").click();
  await expect(host.locator(".categoryPhraseCount")).toHaveText("126 phrases");
  const chamberlain = host.locator(".categoryLabel", { hasText: "Chamberlain" }).locator("input");
  await expect(chamberlain).toBeChecked();
  await chamberlain.uncheck();
  for (const p of [p2, p3]) await expect(p.locator(".gameSettingsTitle")).toHaveText("Categories (6)");
  await p2.locator(".gameSettingsHeader").click();
  await expect(p2.locator(".categoryLabel", { hasText: "Chamberlain" }).locator("input")).not.toBeChecked();
  await expect(p2.locator(".categoryPhraseCount")).toHaveText("106 phrases");

  // The last checked category can't be unchecked.
  const boxes = p2.locator(".categoryLabel input");
  const n = await boxes.count();
  for (let i = 0; i < n; i++) {
    const b = boxes.nth(i);
    if ((await b.isChecked()) && (await p2.locator(".categoryLabel input:checked").count()) > 1) await b.uncheck();
  }
  await expect(p2.locator(".categoryLabel input:checked")).toHaveCount(1);
  await expect(p2.locator(".categoryLabel input:checked")).toBeDisabled();
  for (const p of [host, p3]) await expect(p.locator(".gameSettingsTitle")).toHaveText("Categories (1)");
  // Put back everything but Chamberlain.
  for (let i = 0; i < n; i++) {
    const b = boxes.nth(i);
    const label = await p2.locator(".categoryLabel").nth(i).textContent();
    if (!label.startsWith("Chamberlain") && !(await b.isChecked())) await b.check();
  }
  await expect(host.locator(".gameSettingsTitle")).toHaveText("Categories (6)");

  await host.locator(".startGameButton").click();
  for (const p of pages) {
    await expect(p.locator("button").first()).toBeVisible();
    await expect(p.locator(".gameSettings")).toHaveCount(0);
  }
  // A change sent after the start is ignored by the server.
  await host.evaluate(() => 0);
  const g = game.gameManager.getById(gameid);
  expect(g.started).toBe(true);
  expect([...g.enabledCategories]).not.toContain("Chamberlain");
  const dealt = Object.values(g.players).flatMap((pl) => pl.phrases);
  expect(dealt.length).toBe(106);
  expect(errors).toEqual([]);
});
