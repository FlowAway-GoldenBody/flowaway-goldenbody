const WebSocket = require('ws');
const fs = require('fs');
const path = require('path');

const APP_POLLING_PORT = Number(process.env.APP_POLLING_PORT || 3001);
const APP_POLLING_HOST = process.env.VERIFY_HOST || process.env.VS_HOST || '0.0.0.0';

const userRootBase = path.resolve(__dirname, './zmcdfiles');

// Track connected clients per user
const userClients = new Map(); // username -> Set<ws>
const userWatchers = new Map(); // username -> { watcher, interval, lastApps, debounceTimer }
const APP_CHANGE_DEBOUNCE = 1000; // 1 second debounce

function getUserAppsPath(username) {
  return path.join(userRootBase, username, 'root', 'apps');
}

function notifyUserChanges(username) {
  const clients = userClients.get(username);
  if (!clients || clients.size === 0) return;

  const state = userWatchers.get(username);
  if (!state) return;

  clearTimeout(state.debounceTimer);
  state.debounceTimer = setTimeout(() => {
    const message = JSON.stringify({ appChanges: true, timestamp: Date.now() });
    for (const client of clients) {
      if (client.readyState === WebSocket.OPEN) {
        client.send(message);
      }
    }
    console.log(`[APP POLLING] Broadcasted app changes to ${clients.size} clients (user=${username})`);
  }, APP_CHANGE_DEBOUNCE);
}

function ensureUserWatcher(username) {
  if (userWatchers.has(username)) return;

  const appsPath = getUserAppsPath(username);
  const state = {
    watcher: null,
    interval: null,
    lastApps: new Set(),
    debounceTimer: null,
  };

  if (!fs.existsSync(appsPath)) {
    console.log(`[APP POLLING] Apps directory does not exist yet for user ${username}: ${appsPath}`);
    userWatchers.set(username, state);
    return;
  }

  try {
    state.watcher = fs.watch(appsPath, { recursive: true }, (eventType, filename) => {
      if (!filename || filename.startsWith('.') || filename.includes('node_modules')) return;
      console.log(`[APP POLLING] Detected change in ${username}/apps: ${filename}`);
      notifyUserChanges(username);
    });

    state.interval = setInterval(() => {
      try {
        const entries = fs.readdirSync(appsPath, { withFileTypes: true });
        const current = new Set(
          entries.filter(e => e.isDirectory() && !e.name.startsWith('.')).map(e => e.name)
        );

        const deleted = [...state.lastApps].filter(n => !current.has(n));
        const added = [...current].filter(n => !state.lastApps.has(n));
        if (deleted.length || added.length) {
          console.log(`[APP POLLING] User ${username} apps changed. Added: ${added.join(', ') || 'none'} | Deleted: ${deleted.join(', ') || 'none'}`);
          notifyUserChanges(username);
        }
        state.lastApps = current;
      } catch (e) {
        console.error(`[APP POLLING] Polling error for ${username}: ${e.message}`);
      }
    }, 2000);

    console.log(`[APP POLLING] Watching apps directory for user ${username}: ${appsPath}`);
  } catch (e) {
    console.log(`[APP POLLING] Warning: Could not watch apps directory for ${username}: ${e.message}`);
  }

  userWatchers.set(username, state);
}

function cleanupUserWatcher(username) {
  const clients = userClients.get(username);
  if (clients && clients.size > 0) return;

  const state = userWatchers.get(username);
  if (!state) return;

  if (state.watcher) {
    try { state.watcher.close(); } catch (e) {}
  }
  if (state.interval) {
    clearInterval(state.interval);
  }
  if (state.debounceTimer) {
    clearTimeout(state.debounceTimer);
  }

  userWatchers.delete(username);
  userClients.delete(username);
  console.log(`[APP POLLING] Stopped watching apps for user ${username}`);
}

function startAppPollingServer() {
  const wss = new WebSocket.Server({ port: APP_POLLING_PORT, host: APP_POLLING_HOST }, () => {
    console.log(`App Polling WebSocket server started on ws://${APP_POLLING_HOST}:${APP_POLLING_PORT}`);
  });

  wss.on('connection', (ws) => {
    console.log('[APP POLLING] New client connected');

    ws.on('message', (data) => {
      try {
        const msg = JSON.parse(data);
        if (msg.subscribeToAppChanges && msg.username) {
          const username = String(msg.username).trim();
          if (!username) return;

          ws.__username = username;
          let set = userClients.get(username);
          if (!set) {
            set = new Set();
            userClients.set(username, set);
          }
          set.add(ws);
          ensureUserWatcher(username);
          ws.send(JSON.stringify({ subscribed: true }));
        }
      } catch (e) {
        console.log(`[APP POLLING] Error parsing client message: ${e.message}`);
      }
    });

    ws.on('close', () => {
      const username = ws.__username;
      if (username) {
        const set = userClients.get(username);
        if (set) set.delete(ws);
        cleanupUserWatcher(username);
      }
      console.log('[APP POLLING] Client disconnected');
    });

    ws.on('error', (err) => {
      console.log(`[APP POLLING] WebSocket error: ${err.message}`);
    });
  });

  return wss;
}

// Auto-start when required
startAppPollingServer();

module.exports = { startAppPollingServer };