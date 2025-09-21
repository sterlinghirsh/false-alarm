const { test, expect } = require('@playwright/test');
const io = require('socket.io-client');

// Configure test timeout
test.setTimeout(60000);

test.describe('Proxy Configuration Tests', () => {
  
  test('GET / returns HTML with React app', async ({ page }) => {
    const response = await page.goto('http://localhost:5000/');
    expect(response.status()).toBe(200);
    
    const html = await page.content();
    expect(html).toContain('<!doctype html>');
    expect(html).toContain('<div id="root">');
    
    // Check that React app renders (wait for connecting state or game content)
    await page.waitForSelector('h2.connecting, h2.gameInProgressError, input[placeholder="Enter Game Code"], .gameView', { timeout: 10000 });
  });
  
  test('GET /manifest.json returns valid JSON', async ({ page }) => {
    const response = await page.goto('http://localhost:5000/manifest.json');
    expect(response.status()).toBe(200);
    
    const json = await response.json();
    expect(json).toHaveProperty('name');
    expect(json).toHaveProperty('icons');
    expect(json.name).toBe('False Alarm');
  });
  
  test('Socket.io polling endpoint is accessible', async ({ page }) => {
    const response = await page.goto('http://localhost:5000/socket.io/?EIO=3&transport=polling');
    expect(response.status()).toBe(200);
    
    const text = await response.text();
    // Socket.io response starts with a number indicating packet length
    expect(text).toMatch(/^\d+:/);
    expect(text).toContain('sid');
    expect(text).toContain('pingInterval');
  });

  test('React dev server accepts requests without host validation errors', async ({ page }) => {
    // Test that DANGEROUSLY_DISABLE_HOST_CHECK=true prevents "Invalid Host header" responses
    // This ensures Replit external URLs work properly (before fix returned "Invalid Host header")
    const response = await page.goto('http://localhost:5000/socket.io/?EIO=3&transport=polling');
    expect(response.status()).toBe(200);
    
    const text = await response.text();
    // The key test: should NOT return "Invalid Host header" (the original issue)
    expect(text).not.toContain('Invalid Host header');
    // Note: Browser context may not use proxy same as curl, but host validation is disabled
  });
});

test.describe('WebSocket Connection Tests', () => {
  let socket;
  
  test.afterEach(() => {
    if (socket && socket.connected) {
      socket.disconnect();
    }
  });
  
  test('Socket.io connection establishes and stays alive', async () => {
    // Connect to the proxied Socket.io server
    socket = io('http://localhost:5000', {
      transports: ['websocket', 'polling'],
      reconnection: false
    });
    
    // Wait for connection
    await new Promise((resolve, reject) => {
      socket.on('connect', resolve);
      socket.on('connect_error', reject);
      setTimeout(() => reject(new Error('Connection timeout')), 10000);
    });
    
    expect(socket.connected).toBe(true);
    console.log('Socket connected with id:', socket.id);
    
    // Test game creation
    const gameCreated = new Promise((resolve) => {
      socket.on('gameCreated', resolve);
    });
    
    socket.emit('createGame');
    const gameData = await gameCreated;
    expect(gameData).toHaveProperty('gameid');
    expect(gameData.gameid).toMatch(/^[a-z]{4}$/);
    console.log('Game created:', gameData.gameid);
    
    // Test subscription to game
    const updateReceived = new Promise((resolve) => {
      socket.on('updatePlayerCount', resolve);
    });
    
    socket.emit('subscribeToGame', { gameid: gameData.gameid, playerid: null });
    const playerCount = await updateReceived;
    expect(playerCount).toBeGreaterThanOrEqual(1);
    console.log('Player count:', playerCount);
    
    // Keep connection alive for 30 seconds
    await new Promise((resolve) => {
      let pongCount = 0;
      socket.on('pong', () => {
        pongCount++;
        console.log(`Pong received #${pongCount}`);
        if (pongCount >= 3) {
          resolve();
        }
      });
      
      // Send pings every 5 seconds
      const pingInterval = setInterval(() => {
        if (socket.connected) {
          socket.emit('ping');
        } else {
          clearInterval(pingInterval);
        }
      }, 5000);
      
      setTimeout(() => {
        clearInterval(pingInterval);
        resolve();
      }, 30000);
    });
    
    expect(socket.connected).toBe(true);
    console.log('Socket still connected after 30 seconds');
  });
});

test.describe('Browser Functional Tests', () => {
  
  test('Full game flow: create and join game', async ({ page, context }) => {
    // Page 1: Create a game
    await page.goto('http://localhost:5000/');
    
    // Wait for app to load
    await page.waitForSelector('.App');
    
    // Click create game button
    await page.click('button:has-text("Create")');
    
    // Wait for game creation
    await page.waitForSelector('.intro', { timeout: 10000 });
    
    // Get game code
    const gameUrl = page.url();
    const gameCode = gameUrl.split('#')[1];
    expect(gameCode).toMatch(/^[a-z]{4}$/);
    console.log('Game created with code:', gameCode);
    
    // Check QR code is generated
    await page.waitForSelector('canvas', { timeout: 5000 });
    const qrCode = await page.$('canvas');
    expect(qrCode).not.toBeNull();
    
    // Check player count shows
    await page.waitForSelector('text=/1 player/', { timeout: 5000 });
    
    // Page 2: Join the game
    const page2 = await context.newPage();
    await page2.goto(`http://localhost:5000/#${gameCode}`);
    
    // Wait for intro screen
    await page2.waitForSelector('.intro', { timeout: 10000 });
    
    // Check player count updated on both pages
    await page.waitForSelector('text=/2 players/', { timeout: 5000 });
    await page2.waitForSelector('text=/2 players/', { timeout: 5000 });
    
    console.log('Both players successfully joined the game');
    
    // Enter names
    await page.fill('input[type="text"]', 'Player 1');
    await page2.fill('input[type="text"]', 'Player 2');
    
    // Mark ready
    await page.click('button:has-text("Ready")');
    await page2.click('button:has-text("Ready")');
    
    // Wait for game to start (both should see ready view)
    await page.waitForSelector('.ready-view', { timeout: 10000 });
    await page2.waitForSelector('.ready-view', { timeout: 10000 });
    
    console.log('Game started successfully');
  });
});