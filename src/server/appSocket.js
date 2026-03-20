const WebSocket = require('ws');
const fs = require('fs');
const path = require('path');

const APP_POLLING_PORT = Number(process.env.APP_POLLING_PORT || 3001);
const APP_POLLING_HOST = process.env.VERIFY_HOST || process.env.VS_HOST || '0.0.0.0';
const APP_POLL_INTERVAL_MS = Number(process.env.APP_POLL_INTERVAL_MS || 2500);
const APP_CHANGE_DEBOUNCE_MS = Number(process.env.APP_CHANGE_DEBOUNCE_MS || 400);

const userRootBase = path.resolve(__dirname, './zmcdfiles');

// Track connected clients per user
const userClients = new Map(); // username -> Set<ws>
const userWatchers = new Map(); // username -> { watcher, interval, lastApps, debounceTimer, pendingAppFolders }

function getCurrentAppFolders(appsPath) {
  const entries = fs.readdirSync(appsPath, { withFileTypes: true });
  return new Set(entries.filter(e => e.isDirectory() && !e.name.startsWith('.')).map(e => e.name));
}

function getChangedAppFolder(filename) {
  if (!filename) return null;
  const normalized = String(filename).replace(/\\/g, '/').replace(/^\/+/, '').trim();
  if (!normalized || normalized.startsWith('.') || normalized.includes('node_modules')) return null;

  const firstSegment = normalized.split('/').filter(Boolean)[0] || '';
  if (!firstSegment || firstSegment.startsWith('.')) return null;
  return firstSegment;
}

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
    const changedApps = [...state.pendingAppFolders];
    if (changedApps.length === 0) {
      return;
    }
    const message = JSON.stringify({
      appChanges: true,
      changedApps,
      fullResync: false,
      timestamp: Date.now(),
    });

    for (const client of clients) {
      if (client.readyState === WebSocket.OPEN) {
        client.send(message);
      }
    }

    state.pendingAppFolders.clear();
    console.log(`[APP POLLING] Broadcasted app changes to ${clients.size} clients (user=${username}, changedApps=${changedApps.length})`);
  }, APP_CHANGE_DEBOUNCE_MS);
}

function queueUserChanges(username, { changedApp } = {}) {
  const state = userWatchers.get(username);
  if (!state) return;

  if (changedApp) {
    state.pendingAppFolders.add(changedApp);
  }

  notifyUserChanges(username);
}

function ensureUserWatcher(username) {
  if (userWatchers.has(username)) return;

  const appsPath = getUserAppsPath(username);
  const state = {
    watcher: null,
    interval: null,
    lastApps: new Set(),
    debounceTimer: null,
    pendingAppFolders: new Set(),
  };

  const attachWatcherIfPossible = () => {
    if (state.watcher || !fs.existsSync(appsPath)) return;

    try {
      state.lastApps = getCurrentAppFolders(appsPath);
    } catch (e) {
      state.lastApps = new Set();
    }

    try {
      state.watcher = fs.watch(appsPath, { recursive: true }, (eventType, filename) => {
        const changedApp = getChangedAppFolder(filename);
        console.log(`[APP POLLING] Detected change in ${username}/apps: ${filename || '(unknown)'}`);
        if (changedApp) {
          try {
            state.lastApps = fs.existsSync(appsPath) ? getCurrentAppFolders(appsPath) : new Set();
          } catch (e) {
            state.lastApps = new Set();
          }
          queueUserChanges(username, { changedApp });
          return;
        }

        try {
          const current = fs.existsSync(appsPath) ? getCurrentAppFolders(appsPath) : new Set();
          const deleted = [...state.lastApps].filter(n => !current.has(n));
          const added = [...current].filter(n => !state.lastApps.has(n));

          if (deleted.length || added.length) {
            for (const appName of added) state.pendingAppFolders.add(appName);
            for (const appName of deleted) state.pendingAppFolders.add(appName);
          } else {
            for (const appName of current) state.pendingAppFolders.add(appName);
          }

          state.lastApps = current;
          notifyUserChanges(username);
        } catch (e) {
          console.error(`[APP POLLING] Fallback watch handling error for ${username}: ${e.message}`);
        }
      });

      console.log(`[APP POLLING] Watching apps directory for user ${username}: ${appsPath}`);
    } catch (e) {
      console.log(`[APP POLLING] Warning: Could not watch apps directory for ${username}: ${e.message}`);
    }
  };

  try {
    if (!fs.existsSync(appsPath)) {
      console.log(`[APP POLLING] Apps directory does not exist yet for user ${username}: ${appsPath}`);
    }

    attachWatcherIfPossible();

    state.interval = setInterval(() => {
      try {
        if (!fs.existsSync(appsPath)) {
          if (state.watcher) {
            try { state.watcher.close(); } catch (e) {}
            state.watcher = null;
          }
          if (state.lastApps.size) {
            const deleted = [...state.lastApps];
            console.log(`[APP POLLING] User ${username} apps changed. Added: none | Deleted: ${deleted.join(', ')}`);
            for (const appName of deleted) {
              state.pendingAppFolders.add(appName);
            }
            notifyUserChanges(username);
            state.lastApps = new Set();
          }
          return;
        }

        attachWatcherIfPossible();
        const current = getCurrentAppFolders(appsPath);

        const deleted = [...state.lastApps].filter(n => !current.has(n));
        const added = [...current].filter(n => !state.lastApps.has(n));
        if (deleted.length || added.length) {
          console.log(`[APP POLLING] User ${username} apps changed. Added: ${added.join(', ') || 'none'} | Deleted: ${deleted.join(', ') || 'none'}`);
          for (const appName of added) {
            state.pendingAppFolders.add(appName);
          }
          for (const appName of deleted) {
            state.pendingAppFolders.add(appName);
          }
          notifyUserChanges(username);
        }
        state.lastApps = current;
      } catch (e) {
        console.error(`[APP POLLING] Polling error for ${username}: ${e.message}`);
      }
    }, APP_POLL_INTERVAL_MS);

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

// Expose connection handler so the proxy can attach websocket connections
function handleConnection(ws) {
  // Reuse the same logic as inside `wss.on('connection')`
  console.log('[APP POLLING] New client connected (proxied)');

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
}

module.exports = { startAppPollingServer, handleConnection };