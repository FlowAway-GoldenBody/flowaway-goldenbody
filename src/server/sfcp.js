const http = require("http");
const https = require("https");
const net = require("net");
const tls = require("tls");

const PORT = 8085; // Change to 8080 if you don’t want to run as root

// Default upstream server
const DEFAULT_PROTOCOL = "https";
const DEFAULT_HOST = "shellshock.io";

// Filter headers to avoid confusing the upstream
function filterHeaders(headers, host) {
  const filtered = { ...headers };
  delete filtered.host;
  delete filtered.origin;
  delete filtered.referer;
  delete filtered.connection;
  filtered.host = host;
  return filtered;
}

// ===== HTTP Proxy =====
const server = http.createServer((req, res) => {
  let protocol = DEFAULT_PROTOCOL;
  let host = DEFAULT_HOST;
  let path = req.url;

  const match = req.url.match(/^\/(https?)\/([^\/]+)(\/.*)?$/);
  if (match) {
    protocol = match[1];
    host = match[2];
    path = match[3] || "/";
  } else if (req.headers.host && req.headers.host.endsWith(".localhost")) {
    host = DEFAULT_HOST; // Forward all *.localhost to shellshock.io
  }

  const client = protocol === "https" ? https : http;

  const proxyReq = client.request(
    { hostname: host, path, method: req.method, headers: filterHeaders(req.headers, host) },
    proxyRes => {
      res.writeHead(proxyRes.statusCode, proxyRes.headers);
      proxyRes.pipe(res);
    }
  );

  proxyReq.on("error", err => {
    res.writeHead(500);
    res.end(err.message);
  });

  req.pipe(proxyReq);

  console.log(`[HTTP] ${req.method} ${req.url} -> ${host}${path}`);
});





// ===== Start server =====
server.listen(PORT, () => {
  console.log(`Proxy running at http://localhost:${PORT}`);
  console.log(`HTTP example: http://localhost:${PORT}/https/shellshock.io/`);
  console.log(`WS example: ws://localhost:${PORT}/https/shellshock.io/matchmaker/`);
  console.log(`Short URL example: ws://localhost:${PORT}/matchmaker/`);
});
