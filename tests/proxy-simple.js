const http = require('http');
const io = require('socket.io-client');

// Colors for output
const GREEN = '\x1b[32m';
const RED = '\x1b[31m';
const YELLOW = '\x1b[33m';
const RESET = '\x1b[0m';

function log(status, message) {
  const symbol = status === 'pass' ? '✓' : status === 'fail' ? '✗' : '⚠';
  const color = status === 'pass' ? GREEN : status === 'fail' ? RED : YELLOW;
  console.log(`${color}${symbol} ${message}${RESET}`);
}

function httpGet(url) {
  return new Promise((resolve, reject) => {
    http.get(url, (res) => {
      let data = '';
      res.on('data', (chunk) => data += chunk);
      res.on('end', () => resolve({ status: res.statusCode, data }));
    }).on('error', reject);
  });
}

async function testHTTPProxy() {
  console.log('\n=== Testing HTTP Proxy ===\n');
  
  // Test 1: Root path
  try {
    const res = await httpGet('http://localhost:5000/');
    if (res.status === 200 && res.data.includes('<!DOCTYPE html>') && res.data.includes('<title>False Alarm</title>')) {
      log('pass', 'GET / returns React HTML');
    } else {
      log('fail', `GET / returned unexpected content (status: ${res.status})`);
    }
  } catch (err) {
    log('fail', `GET / failed: ${err.message}`);
  }
  
  // Test 2: manifest.json
  try {
    const res = await httpGet('http://localhost:5000/manifest.json');
    const json = JSON.parse(res.data);
    if (res.status === 200 && json.short_name === 'False Alarm') {
      log('pass', 'GET /manifest.json returns valid JSON');
    } else {
      log('fail', `GET /manifest.json returned unexpected content`);
    }
  } catch (err) {
    log('fail', `GET /manifest.json failed: ${err.message}`);
  }
  
  // Test 3: Socket.io polling endpoint
  try {
    const res = await httpGet('http://localhost:5000/socket.io/?EIO=3&transport=polling');
    // Socket.io v2 responses start with packet length, then JSON
    if (res.status === 200 && res.data.match(/^\d+:/) && res.data.includes('"sid"')) {
      log('pass', 'Socket.io polling endpoint accessible via proxy');
    } else {
      log('fail', `Socket.io polling returned unexpected content: ${res.data.substring(0, 100)}`);
    }
  } catch (err) {
    log('fail', `Socket.io polling failed: ${err.message}`);
  }
}

async function testWebSocketProxy() {
  console.log('\n=== Testing WebSocket Proxy ===\n');
  
  return new Promise((resolve) => {
    let socket;
    let connectionTimeout;
    let testPassed = false;
    
    try {
      socket = io('http://localhost:5000', {
        transports: ['websocket', 'polling'],
        reconnection: false,
        timeout: 5000
      });
      
      connectionTimeout = setTimeout(() => {
        if (!testPassed) {
          log('fail', 'Socket.io connection timeout (5s)');
          if (socket) socket.disconnect();
          resolve();
        }
      }, 5000);
      
      socket.on('connect', () => {
        clearTimeout(connectionTimeout);
        log('pass', `Socket.io connected (transport: ${socket.io.engine.transport.name}, id: ${socket.id})`);
        
        // Test game creation
        socket.emit('createGame');
        
        socket.on('gameCreated', (data) => {
          if (data && data.gameid && data.gameid.match(/^[a-z]{4}$/)) {
            log('pass', `Game created successfully: ${data.gameid}`);
            
            // Test game subscription
            socket.emit('subscribeToGame', { gameid: data.gameid, playerid: null });
            
            socket.on('updatePlayerCount', (count) => {
              if (count >= 1) {
                log('pass', `Player count received: ${count}`);
                testPassed = true;
                
                // Keep alive test
                let pongCount = 0;
                socket.on('pong', () => {
                  pongCount++;
                  if (pongCount === 1) {
                    log('pass', 'Socket connection stable (ping/pong working)');
                  }
                });
                
                // Send a few pings
                const pingInterval = setInterval(() => {
                  if (pongCount < 3 && socket.connected) {
                    socket.emit('ping');
                  } else {
                    clearInterval(pingInterval);
                    log('pass', `WebSocket connection remained stable (${pongCount} pongs received)`);
                    socket.disconnect();
                    resolve();
                  }
                }, 1000);
              }
            });
          } else {
            log('fail', 'Invalid game creation response');
            socket.disconnect();
            resolve();
          }
        });
      });
      
      socket.on('connect_error', (err) => {
        clearTimeout(connectionTimeout);
        log('fail', `Socket.io connection error: ${err.message}`);
        resolve();
      });
      
    } catch (err) {
      clearTimeout(connectionTimeout);
      log('fail', `WebSocket test error: ${err.message}`);
      if (socket) socket.disconnect();
      resolve();
    }
  });
}

async function testDirectBackend() {
  console.log('\n=== Testing Direct Backend Access ===\n');
  
  // Test if backend is running on port 3001
  try {
    const res = await httpGet('http://localhost:3001/socket.io/?EIO=3&transport=polling');
    if (res.status === 200 && res.data.includes('sid')) {
      log('pass', 'Backend running on port 3001');
    } else {
      log('fail', 'Backend not responding correctly on port 3001');
    }
  } catch (err) {
    log('fail', `Cannot reach backend on port 3001: ${err.message}`);
  }
}

async function runTests() {
  console.log('========================================');
  console.log('     Proxy Configuration Test Suite     ');
  console.log('========================================');
  
  await testDirectBackend();
  await testHTTPProxy();
  await testWebSocketProxy();
  
  console.log('\n========================================');
  console.log('           Tests Complete               ');
  console.log('========================================\n');
}

// Run tests
runTests().catch(console.error);