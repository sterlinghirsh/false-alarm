const {
  createProxyMiddleware,
  fixRequestBody,
} = require("http-proxy-middleware");
console.log("BBBBBBBBBB");

module.exports = function (app) {
  app.use(
    "/socket.io", // Your API endpoint prefix
    createProxyMiddleware({
      target: "http://localhost:3001/socket.io", // Your backend server URL
      changeOrigin: true,
      ws: true, // Enable WebSocket proxying
      onProxyReq: (proxyReq, req) => {
        console.log(
          "Sending Request:",
          req.method,
          req.url,
          "=> TO TARGET =>",
          proxyReq.method,
          proxyReq.protocol,
          proxyReq.host,
          proxyReq.path,
        );
        fixRequestBody(proxyReq, req);
        // Optionally, log headers or body if needed:
        // console.log('Request Headers:', JSON.stringify(proxyReq.getHeaders()));
      },
      onProxyRes: (proxyRes, req, res) => {
        console.log(
          "Received Response from Target:",
          proxyRes.statusCode,
          req.url,
        );
        // Optionally, log headers or body if needed:
        // console.log('Response Headers:', JSON.stringify(proxyRes.headers));
      },
      onError: (err, req, res) => {
        console.error("Proxy Error:", err, req.url);
      },
    }),
  );
};
