const http = require('http');
const generateId = require('../util/generateId');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const RammerheadSessionFileCache = require('../classes/RammerheadSessionFileCache.js');
const RammerheadLogging = require('../classes/RammerheadLogging');
const RammerheadSession = require('../classes/RammerheadSession');
const { cleanupUserWatcher } = require('./appSocket.js');

const logger = new RammerheadLogging({ logLevel: 'debug' });
const store = new RammerheadSessionFileCache({ logger });
let directoryPath = path.resolve(__dirname, './zmcdfiles');
directoryPath += '/';
console.log(directoryPath);
let sessionPath = path.resolve(__dirname, '../../sessions');
sessionPath += '/';
console.log(sessionPath);
const projectroot = path.resolve(__dirname, '../../');
const fsp = require('fs/promises');

const PROFILE_SCHEMA_VERSION = 1;
const START_MENU_SOURCE_PATH = path.join(__dirname, 'app-config', 'startMenu-config.json');

function normalizeMaxSpaceGb(value) {
  const n = Number(value);
  if (!Number.isFinite(n) || n <= 0) return 5;
  return Math.max(1, Math.min(1024, n));
}

function readJsonSafe(filePath, fallback) {
  try {
    return JSON.parse(fs.readFileSync(filePath, 'utf8'));
  } catch {
    return fallback;
  }
}

function writeJsonPretty(filePath, value) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, JSON.stringify(value, null, 2));
}

function getUserPaths(username) {
  const safeUsername = String(username || '').trim();
  const userDir = path.join(directoryPath, safeUsername);
  const userRoot = path.join(userDir, 'root');
  const authFile = path.join(userDir, `${safeUsername}.txt`);
  const systemfilesDir = path.join(userRoot, 'systemfiles');
  const userProfileDir = path.join(systemfilesDir, 'userprofile');
  return {
    username: safeUsername,
    userDir,
    userRoot,
    authFile,
    systemfilesDir,
    userProfileDir,
    profilePath: path.join(userProfileDir, 'profile.json'),
    startMenuPath: path.join(userProfileDir, 'startMenu-config.json'),
  };
}

function sanitizeAuthRecord(raw, username, passwordHint = '') {
  const base = raw && typeof raw === 'object' ? raw : {};
  const authTokens = Array.isArray(base.authTokens)
    ? base.authTokens.filter((tokenRow) => tokenRow && tokenRow.token && tokenRow.expires)
    : [];
  const password = typeof base.password === 'string' ? base.password : String(passwordHint || '');
  return {
    username: String(base.username || username || '').trim(),
    password,
    authTokens,
    maxSpace: normalizeMaxSpaceGb(base.maxSpace),
  };
}

function normalizeDragThreshold(value) {
  const n = Number(value);
  if (!Number.isFinite(n)) return 15;
  return Math.max(2, Math.min(128, Math.round(n)));
}

function normalizeTaskbarRevealEdgePx(value) {
  const n = Number(value);
  if (!Number.isFinite(n)) return 6;
  return Math.max(1, Math.min(64, Math.round(n)));
}

function normalizeTaskbarRevealHoldDelayMs(value) {
  const n = Number(value);
  if (!Number.isFinite(n)) return 450;
  return Math.max(0, Math.min(5000, Math.round(n)));
}

function defaultProfile() {
  return {
    schemaVersion: PROFILE_SCHEMA_VERSION,
    taskbuttons: ['🌐', '🗂', '⚙', '📝', '>_'],
    brightness: 100,
    volume: 40,
    dark: false,
    autohidetaskbar: false,
    taskbarRevealEdgePx: 6,
    taskbarRevealHoldDelayMs: 450,
    DRAG_THRESHOLD: 15,
  };
}

function normalizeProfile(raw) {
  const defaults = defaultProfile();
  const profile = raw && typeof raw === 'object' ? raw : {};
  const taskbuttons = Array.isArray(profile.taskbuttons) && profile.taskbuttons.length
    ? profile.taskbuttons
    : defaults.taskbuttons;

  return {
    schemaVersion: PROFILE_SCHEMA_VERSION,
    taskbuttons,
    brightness: Number.isFinite(Number(profile.brightness)) ? Number(profile.brightness) : defaults.brightness,
    volume: Number.isFinite(Number(profile.volume)) ? Number(profile.volume) : defaults.volume,
    dark: !!profile.dark,
    autohidetaskbar: !!profile.autohidetaskbar,
    taskbarRevealEdgePx: normalizeTaskbarRevealEdgePx(profile.taskbarRevealEdgePx),
    taskbarRevealHoldDelayMs: normalizeTaskbarRevealHoldDelayMs(profile.taskbarRevealHoldDelayMs),
    enableURLSync: typeof profile.enableURLSync === 'boolean' ? profile.enableURLSync : defaults.enableURLSync,
    lazyloading: typeof profile.lazyloading === 'boolean' ? profile.lazyloading : defaults.lazyloading,
    autoupdate: typeof profile.autoupdate === 'boolean' ? profile.autoupdate : defaults.autoupdate,
    siteSettings: Array.isArray(profile.siteSettings) ? profile.siteSettings : defaults.siteSettings,
    DRAG_THRESHOLD: normalizeDragThreshold(profile.DRAG_THRESHOLD),
  };
}

function defaultStartMenuConfig() {
  return {
    version: '1.0',
    pinnedApps: [],
    hiddenApps: [],
    appOrder: [],
    recents: [],
    maxRecents: 5,
    displayMode: 'grid',
    gridColumns: 4,
  };
}

function ensureStartMenuConfig(userPaths) {
  fs.mkdirSync(userPaths.userProfileDir, { recursive: true });
  if (fs.existsSync(userPaths.startMenuPath)) return;

  if (fs.existsSync(START_MENU_SOURCE_PATH)) {
    fs.copyFileSync(START_MENU_SOURCE_PATH, userPaths.startMenuPath);
    return;
  }

  writeJsonPretty(userPaths.startMenuPath, defaultStartMenuConfig());
}

function ensureRuntimeFiles(userPaths) {
  fs.mkdirSync(userPaths.userRoot, { recursive: true });
  fs.mkdirSync(userPaths.systemfilesDir, { recursive: true });

  const runtimeFiles = [
    { sourceFile: 'flowaway.js', destinationPath: 'flowaway.js' },
    { sourceFile: 'runtimeCore.js', destinationPath: 'runtime/runtimeCore.js' },
    { sourceFile: 'coreVariables.js', destinationPath: 'runtime/helper/coreVariables.js' },
    { sourceFile: 'fsFunctions.js', destinationPath: 'runtime/helper/fsFunctions.js' },
    { sourceFile: 'cleanupfunctions.js', destinationPath: 'runtime/helper/cleanupfunctions.js' },
    { sourceFile: 'miscFunctions.js', destinationPath: 'runtime/helper/miscFunctions.js' },
    { sourceFile: 'appHelperFunctions.js', destinationPath: 'runtime/appHelperFunctions.js' },
    { sourceFile: 'runtimeAppRuntime.js', destinationPath: 'runtime/runtimeAppRuntime.js' },
    { sourceFile: 'runtimeWindowSystem.js', destinationPath: 'runtime/runtimeWindowSystem.js' },
    { sourceFile: 'runtimeShell.js', destinationPath: 'runtime/runtimeShell.js' },
    { sourceFile: 'goldenbody.js', destinationPath: 'goldenbody.js' },
    { sourceFile: 'processes.js', destinationPath: 'processes.js' },
    { sourceFile: 'appLoader.js', destinationPath: 'appLoader.js' },
    { sourceFile: 'appPolling.js', destinationPath: 'appPolling.js' },
  ];

  for (const fileSpec of runtimeFiles) {
    const src = path.join(projectroot, 'src', 'server', 'systemfiles', fileSpec.sourceFile);
    const dest = path.join(userPaths.systemfilesDir, fileSpec.destinationPath);
    if (!fs.existsSync(dest) && fs.existsSync(src)) {
      fs.mkdirSync(path.dirname(dest), { recursive: true });
      fs.copyFileSync(src, dest);
    }
  }

  const appsPath = path.join(userPaths.systemfilesDir, 'runtime', 'apps');
  if (!fs.existsSync(appsPath)) {
    fs.cpSync(path.join(__dirname, 'apps'), appsPath, { recursive: true });
  }

  ensureStartMenuConfig(userPaths);
}

function ensureUserProfile(userPaths, rawUserRecord = null) {
  fs.mkdirSync(userPaths.userProfileDir, { recursive: true });

  let profile;
  if (fs.existsSync(userPaths.profilePath)) {
    profile = normalizeProfile(readJsonSafe(userPaths.profilePath, {}));
  } else {
    profile = defaultProfile();
  }

  writeJsonPretty(userPaths.profilePath, profile);
  ensureStartMenuConfig(userPaths);
  return profile;
}

function readAuthRecord(userPaths) {
  const raw = readJsonSafe(userPaths.authFile, null);
  if (!raw || typeof raw !== 'object') return null;
  return {
    raw,
    auth: sanitizeAuthRecord(raw, userPaths.username),
  };
}

function writeAuthRecord(userPaths, authRecord) {
  const sanitized = sanitizeAuthRecord(authRecord, userPaths.username);
  writeJsonPretty(userPaths.authFile, sanitized);
  return sanitized;
}

function pruneExpiredTokens(authRecord) {
  authRecord.authTokens = Array.isArray(authRecord.authTokens) ? authRecord.authTokens : [];
  const now = Date.now();
  authRecord.authTokens = authRecord.authTokens.filter((tokenRow) => tokenRow && tokenRow.expires && tokenRow.expires > now);
}

function tokenFromHeader(authHeader) {
  if (typeof authHeader === 'string' && authHeader.startsWith('Bearer ')) {
    return authHeader.slice(7).trim();
  }
  return '';
}

function isAuthorized(authRecord, data, authHeader) {
  pruneExpiredTokens(authRecord);
  const now = Date.now();
  const headerToken = tokenFromHeader(authHeader);
  const bodyToken = typeof data.sessionToken === 'string' ? data.sessionToken.trim() : '';
  const tokenValid = (headerToken && authRecord.authTokens.some((row) => row.token === headerToken && row.expires > now))
    || (bodyToken && authRecord.authTokens.some((row) => row.token === bodyToken && row.expires > now));
  const passwordValid = typeof data.password === 'string' && data.password === authRecord.password;
  const oldPasswordValid = typeof data.oldPassword === 'string' && data.oldPassword === authRecord.password;
  return tokenValid || passwordValid || oldPasswordValid;
}

function issueToken(authRecord) {
  pruneExpiredTokens(authRecord);
  const token = crypto.randomBytes(24).toString('hex');
  const expires = Date.now() + 1000 * 60 * 60;
  authRecord.authTokens.push({ token, expires });
  return token;
}

async function deleteFile(filePath) {
  try {
    await fsp.unlink(filePath);
    console.log(`Successfully deleted ${filePath}`);
  } catch (error) {
    if (error.code === 'ENOENT') {
      console.log(`File not found: ${filePath}`);
    } else {
      console.error('Error deleting file:', error.message);
    }
  }
}

function buildLoginResponse(authRecord, profile, token) {
  return {
    username: authRecord.username,
    authTokens: authRecord.authTokens,
    authToken: token,
    ...profile,
    maxSpace: normalizeMaxSpaceGb(authRecord.maxSpace),
  };
}

function handleZMCd(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    res.writeHead(204);
    res.end();
    return;
  }

  if (req.method !== 'POST') {
    res.writeHead(405);
    res.end(JSON.stringify({ error: 'Send a POST request with JSON' }));
    return;
  }

  let body = '';
  req.on('data', (chunk) => {
    body += chunk;
  });

  req.on('end', () => {
    let responseContent = null;
    try {
      const data = JSON.parse(body);
      const authHeader = (req.headers && (req.headers.authorization || req.headers.Authorization)) || '';

      if (!fs.existsSync(directoryPath)) fs.mkdirSync(directoryPath, { recursive: true });
      const userPaths = getUserPaths(data.username);

      if (data.needID) {
        const authResult = readAuthRecord(userPaths);
        if (!authResult) {
          responseContent = { error: 'invalid user' };
        } else {
          const sessionId = generateId();
          const session = new RammerheadSession({ sessionId, store });
          store.add(sessionId, session);
          const sfiles = fs.readdirSync(sessionPath).filter((f) => !f.startsWith('.'));
          for (const sfileName of sfiles) {
            if (sfileName === `${sessionId}.rhfsession`) {
              deleteFile(path.join(sessionPath, `${sessionId}.rhfsession`));
            }
          }
          responseContent = { id: sessionId };
        }

        res.end(JSON.stringify(responseContent));
        return;
      }

      if (data.needNewAcc) {
        if (fs.existsSync(userPaths.userDir)) {
          responseContent = 'error: user already exists';
        } else {
          fs.mkdirSync(userPaths.userDir, { recursive: true });
          ensureRuntimeFiles(userPaths);
          const authRecord = sanitizeAuthRecord(null, userPaths.username, data.password);
          const token = issueToken(authRecord);
          writeAuthRecord(userPaths, authRecord);
          const profile = ensureUserProfile(userPaths, null);
          responseContent = buildLoginResponse(authRecord, profile, token);
        }
      } else {
        const authResult = readAuthRecord(userPaths);
        if (!authResult) {
          responseContent = 'error: invalid username or password';
        } else {
          ensureRuntimeFiles(userPaths);
          const authRecord = authResult.auth;
          if (authRecord.username !== data.username || !isAuthorized(authRecord, data, authHeader)) {
            responseContent = 'error: invalid username or password';
          } else {
            const token = issueToken(authRecord);
            writeAuthRecord(userPaths, authRecord);
            const profile = ensureUserProfile(userPaths, authResult.raw);
            responseContent = buildLoginResponse(authRecord, profile, token);
          }
        }
      }

      if (data.refillSession) {
        const authResult = readAuthRecord(userPaths);
        if (!authResult) {
          res.writeHead(404);
          return res.end(JSON.stringify({ error: 'User file not found' }));
        }

        const authRecord = authResult.auth;
        if (!isAuthorized(authRecord, data, authHeader)) {
          res.writeHead(401);
          return res.end(JSON.stringify({ error: 'unauthorized' }));
        }

        const newToken = issueToken(authRecord);
        writeAuthRecord(userPaths, authRecord);
        return res.end(JSON.stringify({ success: true, authToken: newToken }));
      }

      if (data.updatePassword) {
        const authResult = readAuthRecord(userPaths);
        if (!authResult) {
          res.writeHead(404);
          return res.end(JSON.stringify({ error: 'User file not found' }));
        }

        const authRecord = authResult.auth;
        if (!isAuthorized(authRecord, data, authHeader)) {
          return res.end(JSON.stringify({ error: 'old password is wrong' }));
        }

        authRecord.password = String(data.newPassword || '');
        authRecord.authTokens = [];
        const newToken = issueToken(authRecord);
        writeAuthRecord(userPaths, authRecord);
        return res.end(JSON.stringify({ success: true, authToken: newToken }));
      } else if (data.deleteAcc) {
        const authResult = readAuthRecord(userPaths);
        if (!authResult) {
          res.writeHead(404);
          return res.end(JSON.stringify({ error: 'User file not found' }));
        }

        const authRecord = authResult.auth;
        if (!isAuthorized(authRecord, data, authHeader)) {
          return res.end(JSON.stringify({ error: 'wrong password' }));
        }

        try {
          cleanupUserWatcher(data.username, true);
          console.log(`[DELETE] Cleaned up watchers for user: ${data.username}`);
        } catch (e) {
          console.error('[DELETE] Error cleaning up watchers:', e.message);
        }

        const targetDir = userPaths.userDir;
        try {
          if (fs.existsSync(targetDir)) {
            fs.rmSync(targetDir, { recursive: true, force: true });
          }
          return res.end(JSON.stringify({ success: true }));
        } catch (e) {
          return res.end(JSON.stringify({ error: 'failed to remove account directory', details: String(e) }));
        }
      }
    } catch (err) {
      console.error(err);
      responseContent = { error: 'Invalid JSON or server error' };
    }

    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify(responseContent));
  });
}

function startServer(port = 8082, host = '0.0.0.0') {
  const server = http.createServer(handleZMCd);
  server.listen(port, host, () => {
    console.log(`zmcd server listening on port ${port}`);
  });
  return server;
}

module.exports = { handleZMCd, startServer };
