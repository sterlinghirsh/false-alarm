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
      pathFilter: ["!/ws", "!/sockjs-node"],
    }),
  );
};
