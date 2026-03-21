const { test, expect } = require("@playwright/test");
const io = require("socket.io-client");

test.setTimeout(30000);

test.describe.configure({ mode: "serial" });

function attachConsoleSpy(page, label) {
  const logs = [];
  page.on("pageerror", (exception) => {
    console.error(`${label}: Page error:`, exception);
    throw exception;
  });
  page.on("console", (message) => {
    logs.push(`${label}: ${message.text()}`);
  });
  page.on("requestfailed", (request) => {
    logs.push(`${label}: Request failed: ${request.url()}`);
  });
  return {
    dump() {
      if (logs.length > 0) {
        console.log(logs.join("\n"));
      }
    },
  };
}

test.describe("1. Proxy Configuration Tests", () => {
  test("GET / returns HTML with React app", async ({ page }) => {
    const response = await page.goto("http://localhost:5000/");
    expect(response.status()).toBe(200);

    const html = await page.content();
    expect(html).toContain("<!DOCTYPE html>");
    expect(html).toContain('<div id="root">');

    await page.waitForSelector("#root > *");
  });

  test("GET /manifest.json returns valid JSON", async ({ page }) => {
    const response = await page.goto("http://localhost:5000/manifest.json");
    expect(response.status()).toBe(200);

    const json = await response.json();
    expect(json).toHaveProperty("short_name");
    expect(json).toHaveProperty("icons");
    expect(json.short_name).toBe("False Alarm");
  });

  test("React dev server accepts requests without host validation errors", async ({
    page,
  }) => {
    const response = await page.goto(
      "http://localhost:5000/socket.io/?EIO=3&transport=polling",
    );
    expect(response.status()).toBe(200);

    const text = await response.text();
    expect(text).not.toContain("Invalid Host header");
  });
});

test.describe("2. WebSocket Connection Tests", () => {
  async function testSocketConnection(url) {
    const socket = io(url, {
      transports: ["websocket", "polling"],
    });

    try {
      await new Promise((resolve, reject) => {
        socket.on("connect", resolve);
        socket.on("connect_error", reject);
        setTimeout(() => reject(new Error("Connection timeout")), 5000);
      });
    } catch (error) {
      console.error("CONNECTION ERROR: ", error);
    }

    expect(socket.connected).toBe(true);

    const gameCreated = new Promise((resolve) => {
      socket.on("gameCreated", resolve);
    });

    socket.emit("createGame");
    const gameData = await gameCreated;
    expect(typeof gameData).toBe("string");
    expect(gameData).toMatch(/^[a-z]{4}$/);

    const updateReceived = new Promise((resolve) => {
      socket.on("updatePlayerCount", resolve);
    });

    socket.emit("subscribeToGame", { gameid: gameData, playerid: null });
    const playerCount = await updateReceived;
    expect(playerCount).toBeGreaterThanOrEqual(1);

    await new Promise((resolve) => {
      setTimeout(resolve, 1000);
    });

    expect(socket.connected).toBe(true);
    socket.disconnect();
  }

  test("Socket.io direct backend connection establishes and stays alive", async () => {
    await testSocketConnection("http://localhost:3001");
  });

  test("Socket.io proxied connection establishes and stays alive", async () => {
    await testSocketConnection("http://localhost:5000/");
  });

  test("2-Player Multiplayer Flow: Complete game simulation with Socket.io", async () => {
    const player1Socket = io("http://localhost:5000", {
      transports: ["polling"],
      reconnection: false,
    });
    const player2Socket = io("http://localhost:5000", {
      transports: ["polling"],
      reconnection: false,
    });

    try {
      await Promise.all([
        new Promise((resolve, reject) => {
          player1Socket.on("connect", resolve);
          player1Socket.on("connect_error", reject);
          setTimeout(
            () => reject(new Error("Player 1 connection timeout")),
            5000,
          );
        }),
        new Promise((resolve, reject) => {
          player2Socket.on("connect", resolve);
          player2Socket.on("connect_error", reject);
          setTimeout(
            () => reject(new Error("Player 2 connection timeout")),
            5000,
          );
        }),
      ]);

      const gameCreated = new Promise((resolve) => {
        player1Socket.on("gameCreated", resolve);
      });

      player1Socket.emit("createGame");
      const gameCode = await gameCreated;
      expect(typeof gameCode).toBe("string");
      expect(gameCode).toMatch(/^[a-z]{4}$/);

      const player1Updates = [];
      const player2Updates = [];

      player1Socket.on("updatePlayerCount", (count) => {
        player1Updates.push(count);
      });

      player2Socket.on("updatePlayerCount", (count) => {
        player2Updates.push(count);
      });

      player1Socket.emit("subscribeToGame", {
        gameid: gameCode,
        playerid: null,
      });
      await new Promise((resolve) => setTimeout(resolve, 500));

      player2Socket.emit("subscribeToGame", {
        gameid: gameCode,
        playerid: null,
      });
      await new Promise((resolve) => setTimeout(resolve, 1000));

      expect(player1Updates.length).toBeGreaterThan(0);
      expect(player2Updates.length).toBeGreaterThan(0);
      expect(player1Updates[player1Updates.length - 1]).toBe(2);
      expect(player2Updates[player2Updates.length - 1]).toBe(2);

      const player1GameStart = new Promise((resolve) => {
        player1Socket.on("startGame", resolve);
      });
      const player2GameStart = new Promise((resolve) => {
        player2Socket.on("startGame", resolve);
      });

      player1Socket.emit("ready", { gameid: gameCode });
      player2Socket.emit("ready", { gameid: gameCode });

      await Promise.race([
        Promise.all([player1GameStart, player2GameStart]),
        new Promise((_, reject) =>
          setTimeout(() => reject(new Error("Game start timeout")), 10000),
        ),
      ]);
    } finally {
      if (player1Socket.connected) player1Socket.disconnect();
      if (player2Socket.connected) player2Socket.disconnect();
    }
  });
});

test.describe("3. Browser Functional Tests", () => {
  test("Full game flow: create and join game", async ({ page }) => {
    page.setDefaultTimeout(5000);
    const spy = attachConsoleSpy(page, "Page");

    try {
      await page.goto("http://localhost:5000/", { waitUntil: "load" });
      await page.waitForFunction(() => window.location.hash !== "");

      await page.waitForSelector(".readyView", { timeout: 10000 });
      const initialGameid = await page.textContent(".gameid");

      const joinGameButton = await page.waitForSelector(".joinButton");

      await page.fill(".joinGameCodeInput", "abcd");
      await joinGameButton.click();

      await page.waitForFunction(() => window.location.hash === "#abcd", {
        timeout: 1000,
      });

      await page.click(".startGameButton");

      await page.waitForSelector(".gameView", { timeout: 1000 });

      await page.goto("http://localhost:5000/#test", { waitUntil: "load" });
      await page.reload();
      await page.waitForSelector(".readyView");

      const gameid = await page.textContent(".gameid");
      expect(gameid).toBe("test");
    } catch (error) {
      spy.dump();
      throw error;
    }
  });

  test("2-Player Game: Basic connectivity and interface verification", async ({
    browser,
  }) => {
    const context1 = await browser.newContext();
    const context2 = await browser.newContext();
    const player1Page = await context1.newPage();
    const player2Page = await context2.newPage();
    player1Page.setDefaultTimeout(5000);
    player2Page.setDefaultTimeout(5000);

    const spy1 = attachConsoleSpy(player1Page, "P1");
    const spy2 = attachConsoleSpy(player2Page, "P2");

    try {
      await player1Page.goto("http://localhost:5000/");
      await player1Page.waitForSelector(".readyView");
      const gameCode = player1Page.url().split("#")[1];

      await player2Page.goto(`http://localhost:5000/#${gameCode}`, {
        waitUntil: "load",
      });
      await player2Page.waitForFunction(
        (gameCode) => window.location.hash === `#${gameCode}`,
        gameCode,
      );

      await player2Page.waitForSelector(".readyView");

      const player1App = await player1Page.$(".App");
      const player2App = await player2Page.$(".App");

      expect(player1App).not.toBeNull();
      expect(player2App).not.toBeNull();

      const player1Content = await player1Page.textContent("body");
      const player2Content = await player2Page.textContent("body");

      expect(player1Content.length).toBeGreaterThan(0);
      expect(player2Content.length).toBeGreaterThan(0);

      player1Page.click(".startGameButton");

      await player1Page.waitForSelector(".gameView");
    } catch (error) {
      spy1.dump();
      spy2.dump();
      throw error;
    } finally {
      await context1.close();
      await context2.close();
    }
  });

  test("2-Player Multiplayer: Complete End-to-End Browser Flow", async ({
    browser,
  }) => {
    test.setTimeout(15000);
    const context1 = await browser.newContext();
    const context2 = await browser.newContext();
    const player1Page = await context1.newPage();
    const player2Page = await context2.newPage();

    player1Page.setDefaultTimeout(5000);
    player2Page.setDefaultTimeout(5000);

    const spy1 = attachConsoleSpy(player1Page, "P1");
    const spy2 = attachConsoleSpy(player2Page, "P2");

    try {
      await player1Page.goto("http://localhost:5000/");
      await player1Page.waitForSelector(".readyView");

      const gameCode = player1Page.url().split("#")[1];

      expect(gameCode).toBeTruthy();
      expect(gameCode).toMatch(/^[a-z]{4}$/);

      await player2Page.goto(`http://localhost:5000/#${gameCode}`);
      await player2Page.waitForSelector(".readyView");

      await expect(player2Page.locator(".gameid")).toHaveText(gameCode, {
        timeout: 10000,
      });

      await player1Page.waitForFunction(
        () => /Players:\s*2/.test(document.body.textContent),
        { timeout: 10000 },
      );
      await player2Page.waitForFunction(
        () => /Players:\s*2/.test(document.body.textContent),
        { timeout: 10000 },
      );

      const startButton1 = player1Page.getByRole("button", {
        name: "Start Game!",
      });

      await startButton1.click();

      await Promise.all([
        player1Page.waitForSelector(".gameView"),
        player2Page.waitForSelector(".gameView"),
      ]);

      const player1InGame = await player1Page.$(".gameView");
      const player2InGame = await player2Page.$(".gameView");

      expect(player1InGame).toBeTruthy();
      expect(player2InGame).toBeTruthy();
    } catch (error) {
      spy1.dump();
      spy2.dump();
      throw error;
    } finally {
      try {
        await context1.close();
      } catch (error) {}
      try {
        await context2.close();
      } catch (error) {}
    }
  });
});
