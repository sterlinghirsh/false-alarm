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
  for (const p of pages) await expect(p.locator(".categoryCount")).toHaveText("6 of 9");

  await host.locator(".gameSettingsHeader").click();
  await expect(host.locator(".categoryLabel")).toHaveCount(9);
  await expect(host.locator(".categoryPhraseCount")).toHaveText("106 phrases");
  const box = (p, c) => p.locator(".categoryLabel", { hasText: c }).locator("input");
  for (const c of OFF) await expect(box(host, c)).not.toBeChecked();

  // A tick reaches the other players.
  await box(host, "Thanksgiving").check();
  for (const p of [p2, p3]) await expect(p.locator(".categoryCount")).toHaveText("7 of 9");
  await p2.locator(".gameSettingsHeader").click();
  await expect(box(p2, "Thanksgiving")).toBeChecked();
  await expect(p2.locator(".categoryPhraseCount")).toHaveText("117 phrases");
  // And back off, so this round runs at the defaults.
  await box(p2, "Thanksgiving").uncheck();
  for (const p of [host, p3]) await expect(p.locator(".categoryCount")).toHaveText("6 of 9");

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

test("live custom lists: made on one phone, shown on the others, dealt, saved, copied", async () => {
  const errors = [];
  // Each player is its own phone: its own context, so its own localStorage.
  const phones = [];
  const open = async (url) => {
    const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2 });
    await ctx.grantPermissions(["clipboard-read", "clipboard-write"], { origin: new URL(LIVE_URL).origin });
    const p = await ctx.newPage();
    p.on("pageerror", (e) => errors.push(e.message));
    await p.goto(url);
    phones.push({ ctx, p });
    return p;
  };
  const host = await open(LIVE_URL);
  await expect(host.locator(".gameid")).toHaveText(/^[a-z]{4}$/, { timeout: 15000 });
  const gameid = await host.locator(".gameid").textContent();
  const p2 = await open(`${LIVE_URL}#${gameid}`);
  const p3 = await open(`${LIVE_URL}#${gameid}`);
  for (const { p } of phones) await expect(p.locator("body")).toContainText(/Players:\s*3/);

  const mine = Array.from({ length: 24 }, (_, i) => `Live check ${i + 1}`);
  await host.locator(".gameSettingsHeader").click();
  await host.getByRole("button", { name: "Add a list" }).click();
  const sheet = host.getByRole("dialog");
  await sheet.getByLabel("Name").fill("Live check list");
  await sheet.getByLabel("Phrases, one per line").fill(["", ...mine, "", mine[0]].join("\n"));
  await expect(sheet.locator(".listStatus")).toHaveText("24 phrases · saved on this phone");
  await sheet.getByRole("button", { name: "Copy list" }).click();
  await expect(sheet.getByRole("button", { name: "Copied" })).toBeVisible();
  expect(await host.evaluate(() => navigator.clipboard.readText())).toBe(mine.join("\n"));
  await sheet.getByRole("button", { name: "Add", exact: true }).click();
  await expect(host.getByRole("dialog")).toHaveCount(0);
  if (process.env.SHOT) {
    await host.locator(".yourLists").scrollIntoViewIfNeeded();
    await host.screenshot({ path: process.env.SHOT });
  }

  // It shows under "Custom lists" on the other two, ticked; only its phone can edit it.
  const row = (p) => p.locator(".yourLists .categoryLabel", { hasText: "Live check list" });
  for (const p of [p2, p3]) {
    await expect(p.locator(".categoryCount")).toHaveText("7 of 10");
    await p.locator(".gameSettingsHeader").click();
    await expect(p.locator(".yourLists legend")).toHaveText("Custom lists");
    await expect(row(p)).toContainText("24");
    await expect(row(p).locator("input")).toBeChecked();
    await expect(p.getByRole("button", { name: "Edit Live check list" })).toHaveCount(0);
  }

  // Player 2 plays only the list.
  const builtIn = p2.locator(".categoryGroup").first().locator("input:checked");
  while ((await builtIn.count()) > 0) await builtIn.first().uncheck();
  for (const { p } of phones) await expect(p.locator(".categoryPhraseCount")).toHaveText("24 phrases");

  // The saved list survives a reload on its phone.
  await host.reload();
  await expect(host.locator(".categoryCount")).toHaveText("1 of 10", { timeout: 15000 });
  await host.locator(".gameSettingsHeader").click();
  await expect(host.getByRole("button", { name: "Edit Live check list" })).toBeVisible();
  expect(await host.evaluate(() => JSON.parse(localStorage.getItem("falseAlarm.lists")).map((l) => l.phrases.length))).toEqual([24]);

  await p3.locator(".startGameButton").click();
  for (const { p } of phones) {
    await expect(p.locator(".sayThisPhrase")).toHaveText(/^Live check \d+$/);
    for (const t of await p.locator("li button").allTextContents()) expect(mine).toContain(t);
  }
  expect(errors).toEqual([]);
  for (const { ctx } of phones) await ctx.close();
});
