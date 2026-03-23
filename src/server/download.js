const http = require('http');
const https = require('https');
const fs = require('fs');
const fsp = require('fs/promises');
const path = require('path');

let directoryPath = path.resolve(__dirname, './zmcdfiles');
if (!fs.existsSync(directoryPath)) fs.mkdirSync(directoryPath, { recursive: true });

// Authenticate user against <directoryPath>/<username>/<username>.txt
async function authenticateUser(username, providedPassword, authHeader) {
  try {
    if (!username) return false;
    const userDir = path.join(directoryPath, username);
    const userFile = path.join(userDir, `${username}.txt`);
    try {
      const txt = await fsp.readFile(userFile, 'utf8');
      const obj = JSON.parse(txt);
      if (obj && typeof obj.password === 'string' && obj.password.length) {
        if (providedPassword === obj.password) return true;
        if (typeof authHeader === 'string' && authHeader.startsWith('Bearer ')) {
          const token = authHeader.slice(7).trim();
          if (Array.isArray(obj.authTokens)) {
            const now = Date.now();
            obj.authTokens = obj.authTokens.filter(t => t && t.expires && t.expires > now);
            return obj.authTokens.some(t => t.token === token && t.expires > now);
          }
        }
        return false;
      }
      return true; // no password set → allow
    } catch (e) {
      return false; // missing/unreadable user file → deny (prevents recreating deleted accounts)
    }
  } catch (e) {
    return false;
  }
}

// Keep a naming strategy similar to fetchfiles to avoid collisions
async function getUniquePath(destPath) {
  const dir = path.dirname(destPath);
  const ext = path.extname(destPath);
  let base = path.basename(destPath, ext);

  const leadMatch = base.match(/^\((\d+)\)\s*(.*)$/);
  if (leadMatch) base = leadMatch[2] || '';
  const compareName = base + ext;

  let entries = [];
  try { entries = await fsp.readdir(dir); } catch (e) { return path.join(dir, compareName); }

  let found = false;
  let maxNum = -Infinity;
  for (const name of entries) {
    if (name === compareName) { found = true; maxNum = Math.max(maxNum, 0); continue; }
    const m = name.match(/^\((\d+)\)\s*(.*)$/);
    if (m && m[2] === compareName) {
      found = true;
      const n = parseInt(m[1], 10);
      if (!Number.isNaN(n)) maxNum = Math.max(maxNum, n);
    }
  }

  if (!found) return path.join(dir, compareName);
  const newName = `(${maxNum + 1}) ${base}${ext}`;
  return path.join(dir, newName);
}

function respondJSON(res, code, obj) {
  res.writeHead(code, { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' });
  res.end(JSON.stringify(obj));
}

async function handleDownload(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    res.writeHead(204);
    return res.end();
  }

  if (req.method !== 'POST') {
    return respondJSON(res, 405, { error: 'Use POST' });
  }

  let body = '';
  req.on('data', c => body += c);
  req.on('end', async () => {
    let payload;
    try { payload = JSON.parse(body); } catch (e) { return respondJSON(res, 400, { error: 'Invalid JSON' }); }

    const username = payload.username;
    const password = payload.password;
    const data = payload.data || {};

    if (!username) return respondJSON(res, 400, { error: 'missing username' });
    if (!data.href) return respondJSON(res, 400, { error: 'missing data.href' });

    const authHeader = req.headers && (req.headers.authorization || req.headers.Authorization) || '';
    if (!(await authenticateUser(username, password, authHeader))) {
      console.log('download auth failed for', username);
      return respondJSON(res, 401, { error: 'unauthorized' });
    }

    try {
      const userRoot = path.join(directoryPath, username, 'root');
      await fsp.mkdir(userRoot, { recursive: true });
      const downloadsDir = path.join(userRoot, 'downloads');
      await fsp.mkdir(downloadsDir, { recursive: true });

      // determine filename
      let filename = data.filename || '';
      try {
        if (!filename) {
          const u = new URL(data.href);
          filename = path.basename(u.pathname) || 'download';
        }
      } catch (e) {
        filename = filename || 'download';
      }

      let destCandidate = path.join(downloadsDir, filename);
      destCandidate = await getUniquePath(destCandidate);

      // fetch remote resource and stream to file with redirect handling
      const tmpPath = destCandidate + '.part';

      let responded = false;
      function safeRespond(code, obj) {
        if (responded) return;
        responded = true;
        respondJSON(res, code, obj);
      }

      async function finalizeTemp(tmp, dest) {
        try {
          await fsp.rename(tmp, dest);
        } catch (e) {
          try { await fsp.copyFile(tmp, dest); await fsp.unlink(tmp); } catch (e2) {}
        }
      }

      const MAX_REDIRECTS = 5;

      function fetchToFile(urlStr, redirectsLeft = MAX_REDIRECTS) {
        try {
          const u = new URL(urlStr);
          const client = u.protocol === 'https:' ? https : http;

          const req = client.get(u.href, (resp) => {
            // handle redirects
            if (resp.statusCode >= 300 && resp.statusCode < 400 && resp.headers.location) {
              if (redirectsLeft <= 0) {
                fs.unlink(tmpPath, () => {});
                return safeRespond(502, { error: 'Too many redirects' });
              }
              // follow relative or absolute location
              const next = new URL(resp.headers.location, u).toString();
              resp.resume();
              return fetchToFile(next, redirectsLeft - 1);
            }

            if (resp.statusCode < 200 || resp.statusCode >= 300) {
              resp.resume();
              fs.unlink(tmpPath, () => {});
              return safeRespond(502, { error: 'Bad response from remote', statusCode: resp.statusCode });
            }

            const fileStream = fs.createWriteStream(tmpPath);

            resp.pipe(fileStream);

            resp.on('error', (err) => {
              fileStream.destroy();
              fs.unlink(tmpPath, () => {});
              console.error('response stream error', err);
              return safeRespond(500, { error: 'response stream error', message: String(err) });
            });

            fileStream.on('error', (err) => {
              fileStream.destroy();
              resp.resume();
              fs.unlink(tmpPath, () => {});
              console.error('file write error', err);
              return safeRespond(500, { error: 'file write error', message: String(err) });
            });

            fileStream.on('finish', async () => {
              try {
                await finalizeTemp(tmpPath, destCandidate);
                const relPath = path.relative(userRoot, destCandidate).replace(/\\/g, '/');
                return safeRespond(200, { success: true, path: relPath });
              } catch (e) {
                console.error('finalize error', e);
                return safeRespond(500, { error: 'finalize error', message: String(e) });
              }
            });
          });

          req.on('error', (err) => {
            fs.unlink(tmpPath, () => {});
            console.error('request error', err);
            return safeRespond(500, { error: 'request error', message: String(err) });
          });

          // timeout to avoid hanging
          req.setTimeout(30000, () => {
            req.abort();
          });
        } catch (e) {
          fs.unlink(tmpPath, () => {});
          console.error('fetchToFile error', e);
          return safeRespond(500, { error: 'fetchToFile error', message: String(e) });
        }
      }

      // start
      fetchToFile(data.href);

    } catch (err) {
      console.error('download handler error', err);
      return respondJSON(res, 500, { error: err.message });
    }
  });
}

function startServer(port = 8084, host = '0.0.0.0') {
  const server = http.createServer((req, res) => handleDownload(req, res));
  server.listen(port, host, () => {
    console.log(`download server listening on port ${port}`);
  });
  return server;
}

module.exports = { handleDownload, startServer };
