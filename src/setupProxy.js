const {
  createProxyMiddleware,
  fixRequestBody,
} = require("http-proxy-middleware");

module.exports = function (app) {
  app.use(
    "/socket.io", // Your API endpoint prefix
    createProxyMiddleware({
      target: "http://localhost:3001/socket.io", // Your backend server URL
      changeOrigin: true,
      ws: true, // Enable WebSocket proxying
      onProxyReq: fixRequestBody,
      // Only proxy WebSocket upgrades that are actually for Socket.io
      // Seems like the /socket.io prefix is already removed.
      pathFilter: (pathname, _req) => {
        return pathname == "/";
      },
    }),
  );
};
