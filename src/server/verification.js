const WebSocket = require('ws');
const fs = require('fs');
const fsp = require('fs/promises');
const path = require('path');
const RammerheadLogging = require('../classes/RammerheadLogging');

const logger = new RammerheadLogging({ logLevel: process.env.DEVELOPMENT ? 'debug' : 'info' });

let directoryPath = path.resolve(__dirname, './zmcdfiles');
if (!directoryPath.endsWith(path.sep)) directoryPath += path.sep;

const VERIFY_PORT = Number(process.env.VERIFY_PORT || process.env.VS_PORT || 3000);
const VERIFY_HOST = process.env.VERIFY_HOST || process.env.VS_HOST || '0.0.0.0';

// Track connections by username
const users = new Map(); // username => Set of ws
const sockets = new Map(); // ws => username

function safeSend(ws, msg) {
  try {
    if (ws.readyState === WebSocket.OPEN) ws.send(JSON.stringify(msg));
  } catch (e) {
    logger.error('ws send error', e);
  }
}

async function validateCredentials(username, password) {
  try {
    const userFile = path.join(directoryPath, username, `${username}.txt`);
    if (!fs.existsSync(userFile)) return { ok: false, error: 'user_not_found' };
    const txt = await fsp.readFile(userFile, 'utf8');
    const obj = JSON.parse(txt);
    if (obj.password === password) return { ok: true, data: obj };
    return { ok: false, error: 'invalid_password' };
  } catch (e) {
    logger.error('validateCredentials error', e);
    return { ok: false, error: 'server_error' };
  }
}

function registerSocketForUser(ws, username) {
  sockets.set(ws, username);
  let set = users.get(username);
  if (!set) {
    set = new Set();
    users.set(username, set);
  }
  set.add(ws);
  // mark user online in their user file
  setUserOnlineFlag(username, true).catch(() => {});
}

function unregisterSocket(ws) {
  const username = sockets.get(ws);
  sockets.delete(ws);
  if (!username) return;
  const set = users.get(username);
  if (!set) return;
  set.delete(ws);
  if (set.size === 0) {
    users.delete(username);
    // no more sockets for this user — mark offline
    setUserOnlineFlag(username, false).catch(() => {});
  }
}

// Helpers to mark user online/offline in their user file
async function setUserOnlineFlag(username, online) {
  try {
    const userFile = path.join(directoryPath, username, `${username}.txt`);
    if (!fs.existsSync(userFile)) return false;
    const txt = await fsp.readFile(userFile, 'utf8');
    const obj = JSON.parse(txt);
    obj.online = !!online;
    await fsp.writeFile(userFile, JSON.stringify(obj));
    return true;
  } catch (e) {
    logger.warn && logger.warn('setUserOnlineFlag error', e);
    return false;
  }
}

async function start() {
  const wss = new WebSocket.Server({ port: VERIFY_PORT, host: VERIFY_HOST });
  wss.on('listening', () => logger.info(`Verification WS listening on ${VERIFY_HOST}:${VERIFY_PORT}`));

  wss.on('connection', (ws, req) => {
    logger.traffic && logger.traffic(`verification connection from ${req.socket.remoteAddress}`);
    // heartbeat support
    ws.isAlive = true;
    ws.on('pong', () => { ws.isAlive = true; });

    ws.on('message', async (raw) => {
      let msg = null;
      try { msg = JSON.parse(String(raw)); } catch (e) { return; }

      if (msg.addPerson) {
        const username = String(msg.username || '');
        const password = String(msg.password || '');
        const res = await validateCredentials(username, password);
        if (res.ok) {
          registerSocketForUser(ws, username);
          safeSend(ws, { ok: true, id: res.data.id });
        } else {
          safeSend(ws, { ok: false, error: res.error });
        }
        return;
      }

      // other message types can be implemented later
    });

    ws.on('close', () => {
      unregisterSocket(ws);
    });

    ws.on('error', (err) => {
      logger.warn && logger.warn('verification ws error', err);
      unregisterSocket(ws);
    });
  });

  // heartbeat ping interval to detect dead connections
  const interval = setInterval(() => {
    for (const ws of wss.clients) {
      try {
        if (ws.isAlive === false) {
          ws.terminate();
        } else {
          ws.isAlive = false;
          ws.ping(() => {});
        }
      } catch (e) {
        // ignore
      }
    }
  }, 30000);

  wss.on('close', () => clearInterval(interval));

  return wss;
}

/**
 * Notify connected clients.
 * If username provided, only notifies sockets belonging to that user.
 * If username is null/undefined, broadcasts to all connected sockets.
 */
function notify(username, message) {
  const payload = { notify: String(message) };
  if (username) {
    const set = users.get(username);
    if (!set) return 0;
    for (const ws of set) safeSend(ws, payload);
    return set.size;
  }
  // broadcast
  let count = 0;
  for (const set of users.values()) {
    for (const ws of set) {
      safeSend(ws, payload);
      count++;
    }
  }
  return count;
}

// start immediately
start().catch((e) => logger.error('verification server failed to start', e));

module.exports = { notify, _internal: { users, sockets } };
