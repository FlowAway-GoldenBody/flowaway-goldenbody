const fs = require('fs');
const fsp = require('fs/promises');
const path = require('path');

const DEFAULT_QUOTA_BYTES = Number(process.env.STORAGE_QUOTA_BYTES) || 1 * 1024 * 1024 * 1024;
const userUsageCache = new Map();

function getUsernameFromUserRoot(userRoot) {
  if (!userRoot) return '';
  const userDir = path.dirname(userRoot);
  return path.basename(userDir);
}

async function getDirectorySizeBytes(dirPath) {
  if (!dirPath || !fs.existsSync(dirPath)) return 0;

  let total = 0;
  const entries = await fsp.readdir(dirPath, { withFileTypes: true });
  for (const entry of entries) {
    const fullPath = path.join(dirPath, entry.name);
    try {
      const stat = await fsp.stat(fullPath);
      if (stat.isDirectory()) {
        total += await getDirectorySizeBytes(fullPath);
      } else {
        total += stat.size;
      }
    } catch (e) {
      // ignore files that disappear mid-scan
    }
  }
  return total;
}

async function getUserQuotaBytes(userRoot) {
  try {
    const username = getUsernameFromUserRoot(userRoot);
    const authPath = path.join(path.dirname(userRoot), `${username}.txt`);
    const authTxt = await fsp.readFile(authPath, 'utf8');
    const authObj = JSON.parse(authTxt);
    const maxSpaceGb = Number(authObj && authObj.maxSpace);
    if (Number.isFinite(maxSpaceGb) && maxSpaceGb > 0) {
      return maxSpaceGb * 1024 * 1024 * 1024;
    }
  } catch (e) {
    // fall back to default quota
  }
  return DEFAULT_QUOTA_BYTES;
}

async function getUserUsage(username, userRoot) {
  const cached = userUsageCache.get(username);
  if (cached && cached.userRoot === userRoot) {
    return cached.bytes;
  }
  return refreshUserUsage(username, userRoot);
}

async function refreshUserUsage(username, userRoot) {
  const bytes = await getDirectorySizeBytes(userRoot);
  userUsageCache.set(username, { userRoot, bytes });
  return bytes;
}

function adjustUserUsage(username, delta, userRoot = '') {
  const cached = userUsageCache.get(username) || { userRoot, bytes: 0 };
  if (!cached.userRoot && userRoot) {
    cached.userRoot = userRoot;
  }
  cached.bytes = Math.max(0, cached.bytes + delta);
  userUsageCache.set(username, cached);
  return cached.bytes;
}

function invalidateUserUsage(username) {
  userUsageCache.delete(username);
}

function setUserUsage(username, bytes, userRoot = '') {
  userUsageCache.set(username, { userRoot, bytes: Math.max(0, Number(bytes) || 0) });
}

module.exports = {
  DEFAULT_QUOTA_BYTES,
  getUserQuotaBytes,
  getUserUsage,
  refreshUserUsage,
  adjustUserUsage,
  invalidateUserUsage,
  setUserUsage,
  getUsernameFromUserRoot,
};
