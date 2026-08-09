const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { defaultSystemPathPermissions, setupUserFilesystem } = require('./userFilesystemSetup');

let directoryPath = path.resolve(__dirname, './zmcdfiles');
directoryPath += '/';

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
    startMenuPath: path.join(userProfileDir, 'startMenu-config.json'),
  };
}

function mergePathPermissionsWithDefaults(existingEntries) {
  const defaults = defaultSystemPathPermissions();
  const merged = defaults.map((row) => ({
    path: row.path,
    perm: {
      read: row.perm && row.perm.read !== false,
      write: row.perm && row.perm.write !== false,
    },
  }));
  const byPath = new Map(merged.map((row) => [row.path, row]));

  for (const row of Array.isArray(existingEntries) ? existingEntries : []) {
    if (!row || typeof row !== 'object' || typeof row.path !== 'string') continue;
    const existing = byPath.get(row.path);
    if (!existing) {
      const nextRow = {
        path: row.path,
        perm: {
          read: row.perm && row.perm.read !== false,
          write: row.perm && row.perm.write !== false,
        },
      };
      byPath.set(row.path, nextRow);
      merged.push(nextRow);
      continue;
    }

    if (typeof row.perm?.read === 'boolean') existing.perm.read = row.perm.read;
    if (typeof row.perm?.write === 'boolean') existing.perm.write = row.perm.write;
  }

  return merged;
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
    maxSpace: 5,
    pathPermissions: mergePathPermissionsWithDefaults(Array.isArray(base.pathPermissions) ? base.pathPermissions : []),
  };
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

function buildLoginResponse(authRecord, token) {
  return {
    username: authRecord.username,
    authTokens: authRecord.authTokens,
    authToken: token,
    pathPermissions: Array.isArray(authRecord.pathPermissions) ? authRecord.pathPermissions : [],
    maxSpace: authRecord.maxSpace,
  };
}

function sendJson(res, statusCode, body) {
  res.writeHead(statusCode, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify(body));
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
    return sendJson(res, 405, { error: 'Send a POST request with JSON' });
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
      const password = typeof data.password === 'string' ? data.password : '';
      if (!/^[a-zA-Z0-9_-]+$/.test(data.username)) {
        return sendJson(res, 400, { error: 'Invalid username format' });
      }
      if (!fs.existsSync(directoryPath)) fs.mkdirSync(directoryPath, { recursive: true });

      const userPaths = getUserPaths(data.username);

      if (data.needNewAcc) {
        if (!/^[a-zA-Z0-9_-]+$/.test(data.username) || data.username.length < 3 || password.length < 3) {
          return sendJson(res, 403, { error: "Username or password don't meet server requirements" });
        }
        if (fs.existsSync(userPaths.userDir)) {
          responseContent = { error: 'user already exists' };
        } else {
          fs.mkdirSync(userPaths.userDir, { recursive: true });
          const authRecord = sanitizeAuthRecord(null, userPaths.username, password);
          const token = issueToken(authRecord);
          writeAuthRecord(userPaths, authRecord);
          try {
            setupUserFilesystem(userPaths);
          } catch (e) {
            console.error('setupUserFilesystem failed', e && e.message ? e.message : String(e));
          }
          responseContent = buildLoginResponse(authRecord, token);
        }
      } else {
        const authResult = readAuthRecord(userPaths);
        if (!authResult) {
          responseContent = { error: 'invalid username or password' };
        } else {
          const authRecord = authResult.auth;
          if (authRecord.username !== data.username || !isAuthorized(authRecord, data, authHeader)) {
            responseContent = { error: 'invalid username or password' };
          } else {
            const token = issueToken(authRecord);
            writeAuthRecord(userPaths, authRecord);
            responseContent = buildLoginResponse(authRecord, token);
          }
        }
      }

      if (data.refillSession) {
        const authResult = readAuthRecord(userPaths);
        if (!authResult) {
          return sendJson(res, 404, { error: 'User file not found' });
        }

        const authRecord = authResult.auth;
        if (!isAuthorized(authRecord, data, authHeader)) {
          return sendJson(res, 401, { error: 'unauthorized' });
        }

        const newToken = issueToken(authRecord);
        writeAuthRecord(userPaths, authRecord);
        return res.end(JSON.stringify({ success: true, authToken: newToken }));
      }

      if (data.updatePathPermission || data.setPathPermissions) {
        const authResult = readAuthRecord(userPaths);
        if (!authResult) {
          return sendJson(res, 404, { error: 'User file not found' });
        }

        const authRecord = authResult.auth;
        if (!isAuthorized(authRecord, data, authHeader)) {
          return sendJson(res, 401, { error: 'authorization required to change path permissions' });
        }

        let nextPermissions = Array.isArray(authRecord.pathPermissions)
          ? authRecord.pathPermissions.slice()
          : [];

        if (Array.isArray(data.setPathPermissions)) {
          nextPermissions = mergePathPermissionsWithDefaults(data.setPathPermissions);
        }

        if (data.updatePathPermission) {
          const userfile = fs.readFileSync(userPaths.authFile, 'utf8');
          const parsedUserfile = JSON.parse(userfile);
          if (password !== parsedUserfile.password) {
            return sendJson(res, 403, { error: 'incorrect password' });
          }

          const normalizedRow = {
            path: data.updatePathPermission.path,
            perm: {
              read: data.updatePathPermission.perm && data.updatePathPermission.perm.read !== false,
              write: data.updatePathPermission.perm && data.updatePathPermission.perm.write !== false,
            },
          };

          let replaced = false;
          nextPermissions = nextPermissions.map((row) => {
            if (row.path !== normalizedRow.path) return row;
            replaced = true;
            return normalizedRow;
          });
          if (!replaced) nextPermissions.push(normalizedRow);
        }

        authRecord.pathPermissions = mergePathPermissionsWithDefaults(nextPermissions);
        writeAuthRecord(userPaths, authRecord);
        return res.end(JSON.stringify({
          success: true,
          pathPermissions: authRecord.pathPermissions,
        }));
      }

      if (data.updatePassword) {
        const authResult = readAuthRecord(userPaths);
        if (!authResult) {
          return sendJson(res, 404, { error: 'User file not found' });
        }

        const authRecord = authResult.auth;
        if (typeof data.oldPassword !== 'string' || data.oldPassword !== authRecord.password) {
          return sendJson(res, 400, { error: 'old password is wrong' });
        }

        authRecord.password = String(data.newPassword || '');
        authRecord.authTokens = [];
        const newToken = issueToken(authRecord);
        writeAuthRecord(userPaths, authRecord);
        return res.end(JSON.stringify({ success: true, authToken: newToken }));
      } else if (data.deleteAcc) {
        const authResult = readAuthRecord(userPaths);
        if (!authResult) {
          return sendJson(res, 404, { error: 'User file not found' });
        }

        const authRecord = authResult.auth;
        if (typeof data.oldPassword !== 'string' || data.oldPassword !== authRecord.password) {
          return sendJson(res, 400, { error: 'wrong password' });
        }

        const targetDir = userPaths.userDir;
        try {
          if (fs.existsSync(targetDir)) {
            fs.rmSync(targetDir, { recursive: true, force: true });
          }
          return res.end(JSON.stringify({ success: true }));
        } catch (e) {
          return sendJson(res, 500, { error: 'failed to remove account directory', details: String(e) });
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

module.exports = { handleZMCd };