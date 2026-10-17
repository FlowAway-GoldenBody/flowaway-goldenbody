const fs = require('fs');
const path = require('path');
const chokidar = require('chokidar');

function getUserRoot(username) {
  const safeUsername = String(username || '').trim();
  if (!safeUsername) throw new Error('Missing username');
  return path.resolve(__dirname, './zmcdfiles', safeUsername, 'root');
}

function normalizeRelativePath(rawPath) {
  if (!rawPath) return '';
  const clean = String(rawPath).replace(/\\/g, '/').replace(/^\/+/, '');
  const parts = clean.split('/').filter(Boolean).filter((part) => part !== '.' && part !== '..');
  return parts.join('/');
}

function isValidToken(username, token) {
  if (!token) return false;
  const authFile = path.join(__dirname, './zmcdfiles', username, `${username}.txt`);
  try {
    const auth = JSON.parse(fs.readFileSync(authFile, 'utf8'));
    const tokens = Array.isArray(auth.authTokens) ? auth.authTokens : [];
    const now = Date.now();
    return tokens.some((entry) => entry && entry.token === token && Number(entry.expires) > now);
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

  if (!username) {
    ws.close(1008, 'missing username');
    return;
  }

  if (!isValidToken(username, token)) {
    ws.close(1008, 'invalid token');
    return;
  }

  const userRoot = getUserRoot(username);
  const allowedRoot = path.resolve(userRoot);
  const targetPath = requestedPath ? path.resolve(userRoot, requestedPath) : allowedRoot;

  if (targetPath !== allowedRoot && !targetPath.startsWith(allowedRoot + path.sep)) {
    ws.close(1008, 'invalid path');
    return;
  }

  const watchPath = fs.existsSync(targetPath)
    ? targetPath
    : (fs.existsSync(path.dirname(targetPath)) ? path.dirname(targetPath) : allowedRoot);

  const shouldEmit = (absolutePath) => {
    if (!requestedPath) return true;
    const relative = path.relative(targetPath, absolutePath);
    return relative === '' || (!relative.startsWith('..') && !path.isAbsolute(relative));
  };

  const options = {
    persistent: true,
    ignoreInitial: true,
    awaitWriteFinish: { stabilityThreshold: 200, pollInterval: 50 },
    depth: recursive ? undefined : 0,
  };

  const watcher = chokidar.watch(watchPath, options);

  ws.on('message', () => {});
  ws.on('close', () => watcher.close().catch(() => {}));
  ws.on('error', () => watcher.close().catch(() => {}));

  const sendEvent = (eventName, absolutePath) => {
    if (!shouldEmit(absolutePath)) return;
    const relativePath = toRelativePath(allowedRoot, absolutePath);
    const payload = {
      type: 'watch',
      event: eventName,
      path: relativePath === '.' ? '' : relativePath,
      username,
      recursive,
    };

    try {
      ws.send(JSON.stringify(payload));
    } catch {
      watcher.close().catch(() => {});
    }
  };

  watcher.on('add', (filePath) => sendEvent('add', filePath));
  watcher.on('change', (filePath) => sendEvent('change', filePath));
  watcher.on('unlink', (filePath) => sendEvent('unlink', filePath));
  watcher.on('addDir', (filePath) => sendEvent('addDir', filePath));
  watcher.on('unlinkDir', (filePath) => sendEvent('unlinkDir', filePath));
  watcher.on('error', (error) => {
    try {
      ws.send(JSON.stringify({ type: 'watch', event: 'error', error: String(error) }));
    } catch {
      watcher.close().catch(() => {});
    }
  });

  watcher.on('ready', () => {
    if (requestedPath || !recursive) {
      const initialPath = targetPath;
      if (fs.existsSync(initialPath)) {
        sendEvent('ready', initialPath);
      }
    }
  });
}

module.exports = { handleWatchConnection, getUserRoot, normalizeRelativePath };
