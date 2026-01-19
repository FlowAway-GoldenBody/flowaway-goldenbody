const http = require('http');
const WebSocket = require('ws');

const PROXY_PORT = 80;
const TARGET_HOST = 'shellshock.io';

const server = http.createServer();
const wss = new WebSocket.Server({ noServer: true });

// Handle HTTP Upgrade requests
server.on('upgrade', (req, socket, head) => {
  if (req.headers.upgrade !== 'websocket') {
    socket.destroy();
    return;
  }

  // Only proxy matchmaker endpoints
  if (req.url.startsWith('/matchmaker/') || req.url.startsWith('/services/')) {
    wss.handleUpgrade(req, socket, head, ws => {
      wss.emit('connection', ws, req);
    });
    return;
  }

  // Everything else (including /game/ and regional servers) goes direct
  // The browser will handle these directly
  socket.destroy(); // Node does not touch these
});

// Proxy matchmaker WS
wss.on('connection', (clientWs, req) => {
  const targetUrl = `wss://${TARGET_HOST}${req.url}`;
  console.log('[Proxy] WS →', targetUrl);

  const pending = [];
  let closed = false;

  const serverWs = new WebSocket(targetUrl, {
    headers: {
      Origin: 'https://shellshock.io',
      'User-Agent': req.headers['user-agent'],
      Cookie: req.headers['cookie'] || '',
    },
    protocol: req.headers['sec-websocket-protocol'],
  });

  const closeBoth = () => {
    if (closed) return;
    closed = true;
    clientWs.close();
    serverWs.close();
  };

  clientWs.on('message', (data, isBinary) => {
    console.log('[C → S]', data.length);
    if (serverWs.readyState === WebSocket.OPEN) {
      serverWs.send(data, { binary: isBinary });
    } else {
      pending.push([data, isBinary]);
    }
  });

  serverWs.on('open', () => {
    console.log('[Proxy] Upstream matchmaker open');
    pending.forEach(([d, b]) => serverWs.send(d, { binary: b }));
    pending.length = 0;
  });

  serverWs.on('message', (data, isBinary) => {
    console.log('[S → C]', data.length);
    if (clientWs.readyState === WebSocket.OPEN) {
      clientWs.send(data, { binary: isBinary });
    }
  });

  clientWs.on('close', closeBoth);
  serverWs.on('close', closeBoth);
  clientWs.on('error', closeBoth);
  serverWs.on('error', closeBoth);
});

server.listen(PROXY_PORT, () => {
  console.log(`[Proxy] Matchmaker WS proxy running on ws://localhost:${PROXY_PORT}`);
});
