// Browser check: tests/game.spec.js builds nothing itself. Build the page first:
//   REACT_APP_SOCKET_URL=http://127.0.0.1:7989 npm run build
// then `npx playwright test`. It serves build/ at /false-alarm/ and the game server on
// 7989 in-process. Under the hardware broker (HORNET_QA_BROWSER_PORT set) it attaches to
// the slot's warm headless Chrome; otherwise it launches Playwright's own Chromium
// (`npx playwright install chromium` once).
module.exports = {
  testDir: "./tests",
  timeout: 60000,
  workers: 1,
  reporter: "list",
};
