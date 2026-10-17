const fs = require('fs');
const path = require('path');
const chokidar = require('chokidar');

const MAX_WATCHERS_PER_ACCOUNT = 100;
const WATCHER_INACTIVITY_MS = 15000;
const RENAME_DEBOUNCE_MS = 300;
const activeWatcherCounts = new Map();

function getUserRoot(username) {
  const safeUsername = String(username || '').trim();
  if (!safeUsername) throw new Error('Missing username');
  return path.resolve(__dirname, './zmcdfiles', safeUsername, 'root');
}

function normalizeRelativePath(rawPath) {
  if (!rawPath) return '';
  return String(rawPath)
    .replace(/\\/g, '/')
    .replace(/^\/+/, '')
    .split('/')
    .filter((part) => part && part !== '.' && part !== '..')
    .join('/');
}

function isValidToken(username, token) {
  if (!token) return false;
  const authFile = path.join(__dirname, './zmcdfiles', username, `${username}.txt`);

  try {
    const auth = JSON.parse(fs.readFileSync(authFile, 'utf8'));
    const tokens = Array.isArray(auth.authTokens) ? auth.authTokens : [];
    return tokens.some(
      (entry) => entry && entry.token === token && Number(entry.expires) > Date.now()
    );
  } catch {
    return false;
  }
}

function toRelativePath(rootDir, absolutePath) {
  const relative = path.relative(rootDir, absolutePath).split(path.sep).join('/');
  return relative === '' ? '/' : '/' + relative;
}

function handleWatchConnection(ws, req) {
  const url = new URL(req.url, 'http://localhost');
  const username = String(url.searchParams.get('username') || '').trim();
  const token = url.searchParams.get('token') || '';
  const requestedPath = normalizeRelativePath(url.searchParams.get('path') || '');
  const recursive = url.searchParams.get('recursive') === 'true';

  if (!username) return ws.close(1008, 'missing username');
  if (!isValidToken(username, token)) return ws.close(1009, 'invalid token');

  const currentCount = activeWatcherCounts.get(username) || 0;
  if (currentCount >= MAX_WATCHERS_PER_ACCOUNT) {
    return ws.close(1010, 'watch limit exceeded');
  }
  activeWatcherCounts.set(username, currentCount + 1);

  const userRoot = getUserRoot(username);
  const allowedRoot = path.resolve(userRoot);
  const targetPath = requestedPath
    ? path.resolve(userRoot, requestedPath)
    : allowedRoot;

  const releaseSlot = () => {
    const count = activeWatcherCounts.get(username) || 0;
    if (count <= 1) activeWatcherCounts.delete(username);
    else activeWatcherCounts.set(username, count - 1);
  };

  if (targetPath !== allowedRoot && !targetPath.startsWith(allowedRoot + path.sep)) {
    releaseSlot();
    return ws.close(1011, 'invalid path');
  }

  if (requestedPath && !fs.existsSync(targetPath)) {
    releaseSlot();
    return ws.close(1012, 'requested path does not exist');
  }

  const watchPath = fs.existsSync(targetPath)
    ? targetPath
    : fs.existsSync(path.dirname(targetPath))
      ? path.dirname(targetPath)
      : allowedRoot;

  const shouldEmit = (absolutePath) => {
    if (!requestedPath) return true;
    const relative = path.relative(targetPath, absolutePath);
    return relative === '' || (!relative.startsWith('..') && !path.isAbsolute(relative));
  };

  const watcher = chokidar.watch(watchPath, {
    persistent: true,
    ignoreInitial: true,
    awaitWriteFinish: { stabilityThreshold: 200, pollInterval: 50 },
    depth: recursive ? undefined : 0,
  });

  const pendingUnlinks = new Map();
  const knownFiles = new Map();
  let timer = null;
  let cleanedUp = false;

  const cleanup = () => {
    if (cleanedUp) return;
    cleanedUp = true;

    if (timer) clearTimeout(timer);
    for (const pending of pendingUnlinks.values()) {
      clearTimeout(pending.timer);
    }
    pendingUnlinks.clear();

    releaseSlot();
    watcher.close().catch(() => {});
  };

  const armInactivityTimer = () => {
    if (timer) clearTimeout(timer);
    timer = setTimeout(() => {
      try {
        ws.close(1013, 'inactive for 15 seconds');
      } catch {
        cleanup();
      }
    }, WATCHER_INACTIVITY_MS);
  };

  ws.on('message', armInactivityTimer);
  ws.on('close', cleanup);
  ws.on('error', cleanup);
  armInactivityTimer();

  const sendEvent = (eventName, absolutePath, extra = {}) => {
    if (!shouldEmit(absolutePath) || cleanedUp) return;

    const payload = {
      type: 'watch',
      event: eventName,
      path: toRelativePath(allowedRoot, absolutePath),
      username,
      recursive,
      ...extra,
    };

    try {
      if (ws.readyState === 1) ws.send(JSON.stringify(payload));
    } catch {
      cleanup();
    }
  };

  const identity = (stats) => {
    if (!stats || !stats.ino) return null;
    return `${stats.dev}:${stats.ino}`;
  };

  const flushUnlink = (absolutePath) => {
    const pending = pendingUnlinks.get(absolutePath);
    if (!pending) return;

    clearTimeout(pending.timer);
    pendingUnlinks.delete(absolutePath);
    sendEvent(pending.event, absolutePath);
  };

  const handleAdd = (eventName, filePath, stats) => {
    const absolutePath = path.resolve(filePath);
    const fileId = identity(stats);

    if (fileId) {
      for (const [oldPath, pending] of pendingUnlinks) {
        if (oldPath === absolutePath || pending.identity !== fileId) continue;

        clearTimeout(pending.timer);
        pendingUnlinks.delete(oldPath);
        knownFiles.delete(oldPath);
        knownFiles.set(absolutePath, stats);

        sendEvent('rename', absolutePath, {
          oldPath: toRelativePath(allowedRoot, oldPath),
          newPath: toRelativePath(allowedRoot, absolutePath),
        });
        return;
      }
    }

    knownFiles.set(absolutePath, stats);

    // A re-add at the same path means it wasn't a rename.
    if (pendingUnlinks.has(absolutePath)) {
      flushUnlink(absolutePath);
    }

    sendEvent(eventName, absolutePath);
  };

  const handleUnlink = (eventName, filePath) => {
    const absolutePath = path.resolve(filePath);
    const stats = knownFiles.get(absolutePath);

    knownFiles.delete(absolutePath);

    const existing = pendingUnlinks.get(absolutePath);
    if (existing) clearTimeout(existing.timer);

    const pending = {
      event: eventName,
      identity: identity(stats),
      timer: setTimeout(() => flushUnlink(absolutePath), RENAME_DEBOUNCE_MS),
    };

    pendingUnlinks.set(absolutePath, pending);
  };

  watcher.on('add', (filePath, stats) => handleAdd('add', filePath, stats));
  watcher.on('addDir', (filePath, stats) => handleAdd('addDir', filePath, stats));

  watcher.on('change', (filePath, stats) => {
    if (stats) knownFiles.set(path.resolve(filePath), stats);
    sendEvent('change', filePath);
  });

  watcher.on('unlink', (filePath) => handleUnlink('unlink', filePath));
  watcher.on('unlinkDir', (filePath) => handleUnlink('unlinkDir', filePath));

  watcher.on('error', (error) => {
    try {
      if (ws.readyState === 1) {
        ws.send(JSON.stringify({
          type: 'watch',
          event: 'error',
          error: String(error),
        }));
      }
    } catch {
      cleanup();
    }
  });

  watcher.on('ready', () => {
    // Seed file identities so renames of existing files can be matched.
    for (const filePath of watcher.getWatched ? Object.keys(watcher.getWatched()) : []) {
      const dir = path.resolve(filePath);
      for (const name of watcher.getWatched()[filePath] || []) {
        const absolutePath = path.join(dir, name);
        try {
          knownFiles.set(absolutePath, fs.statSync(absolutePath));
        } catch {
          // The file may have disappeared during the scan.
        }
      }
    }

    if (requestedPath || !recursive) {
      if (fs.existsSync(targetPath)) sendEvent('ready', targetPath);
    }
  });
}

module.exports = {
  handleWatchConnection,
  getUserRoot,
  normalizeRelativePath,
  activeWatcherCounts,
  MAX_WATCHERS_PER_ACCOUNT,
  WATCHER_INACTIVITY_MS,
};
