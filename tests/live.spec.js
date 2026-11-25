// The deployed game, read-only apart from playing one round:
//   LIVE_URL=https://sterlinghirsh.com/false-alarm/ npx playwright test tests/live.spec.js
// Under the broker (HORNET_QA_BROWSER_PORT) it attaches to the slot's warm Chrome.
const { test, expect, chromium } = require("@playwright/test");

const LIVE_URL = process.env.LIVE_URL;
test.skip(!LIVE_URL, "set LIVE_URL to check a deployed page");

let browser, context;
test.beforeAll(async () => {
  const cdp = process.env.HORNET_QA_BROWSER_PORT;
  browser = cdp ? await chromium.connectOverCDP(`http://127.0.0.1:${cdp}`) : await chromium.launch();
  context = await browser.newContext();
});
test.afterAll(async () => {
  await context?.close();
  if (!process.env.HORNET_QA_BROWSER_PORT) await browser?.close();
});

test("three players on the live page: join, play, score", async () => {
  const errors = [];
  const pages = [];
  const open = async (url) => {
    const p = await context.newPage();
    p.on("pageerror", (e) => errors.push(e.message));
    await p.goto(url);
    pages.push(p);
    return p;
  };

  const host = await open(LIVE_URL);
  await expect(host.locator(".gameid")).toHaveText(/^[a-z]{4}$/, { timeout: 15000 });
  const gameid = await host.locator(".gameid").textContent();
  const joinUrl = `${LIVE_URL}#${gameid}`;
  await expect(host.locator(".roomCodeInfo a")).toHaveAttribute("href", joinUrl);
  await expect(host.locator("img.qrCode")).toBeVisible();

  await open(joinUrl);
  await open(joinUrl);
  for (const p of pages) await expect(p.locator("body")).toContainText(/Players:\s*3/);

  await host.locator(".startGameButton").click();
  for (const p of pages) await expect(p.locator(".sayThisPhrase")).not.toHaveText("Loading...");

  // Someone taps a button that is another player's phrase; everyone sees the score.
  let tapped = false;
  for (let tries = 0; tries < 50 && !tapped; tries++) {
    const said = await Promise.all(pages.map((p) => p.locator(".sayThisPhrase").textContent()));
    for (const [i, p] of pages.entries()) {
      const labels = await p.locator("li button").allTextContents();
      const hit = labels.find((l) => said.some((s, j) => j !== i && s === l));
      if (hit) {
        await p.locator("li button", { hasText: hit }).first().click();
        tapped = true;
        break;
      }
    }
    if (!tapped) await host.waitForTimeout(100);
  }
  expect(tapped).toBe(true);
  for (const p of pages) await expect(p.locator("body")).toContainText(/Score:\s*1/);

  const scope = await host.evaluate(async () => (await navigator.serviceWorker.ready).scope);
  expect(scope).toBe(LIVE_URL);

  // A real bad request (an invalid game code) comes back as serverError and is shown.
  const bad = await open(`${LIVE_URL}#bad-code`);
  await expect(bad.locator(".serverError")).toContainText("Invalid message.");

  expect(errors).toEqual([]);
});

test("live categories: 9 listed, 3 off by default, a tick reaches everyone, locked at the start", async () => {
  const phrases = require("../src/phrases.json");
  const OFF = ["Chamberlain", "Thanksgiving", "General 2"];
  const offPhrases = new Set(phrases.filter((p) => p.Type.some((t) => OFF.includes(t))).map((p) => p.Phrase));
  const errors = [];
  const pages = [];
  const open = async (url) => {
    const p = await context.newPage();
    p.on("pageerror", (e) => errors.push(e.message));
    await p.goto(url);
    pages.push(p);
    return p;
  };
  const host = await open(LIVE_URL);
  await expect(host.locator(".gameid")).toHaveText(/^[a-z]{4}$/, { timeout: 15000 });
  const gameid = await host.locator(".gameid").textContent();
  const p2 = await open(`${LIVE_URL}#${gameid}`);
  const p3 = await open(`${LIVE_URL}#${gameid}`);
  for (const p of pages) await expect(p.locator(".gameSettingsTitle")).toHaveText("Categories (6)");

  await host.locator(".gameSettingsHeader").click();
  await expect(host.locator(".categoryLabel")).toHaveCount(9);
  await expect(host.locator(".categoryPhraseCount")).toHaveText("106 phrases");
  const box = (p, c) => p.locator(".categoryLabel", { hasText: c }).locator("input");
  for (const c of OFF) await expect(box(host, c)).not.toBeChecked();

  // A tick reaches the other players.
  await box(host, "Thanksgiving").check();
  for (const p of [p2, p3]) await expect(p.locator(".gameSettingsTitle")).toHaveText("Categories (7)");
  await p2.locator(".gameSettingsHeader").click();
  await expect(box(p2, "Thanksgiving")).toBeChecked();
  await expect(p2.locator(".categoryPhraseCount")).toHaveText("117 phrases");
  // And back off, so this round runs at the defaults.
  await box(p2, "Thanksgiving").uncheck();
  for (const p of [host, p3]) await expect(p.locator(".gameSettingsTitle")).toHaveText("Categories (6)");

  await host.locator(".startGameButton").click();
  for (const p of pages) {
    await expect(p.locator("button").first()).toBeVisible();
    await expect(p.locator(".gameSettings")).toHaveCount(0);
  }
  const shown = [];
  for (const p of pages) {
    shown.push(...(await p.locator(".sayThisPhrase").allTextContents()));
    shown.push(...(await p.locator("button").allTextContents()));
  }
  expect(shown.filter((s) => offPhrases.has(s.trim()))).toEqual([]);
  expect(errors).toEqual([]);
});
