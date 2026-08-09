const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const USER_TEMPLATE_PATH = path.join(__dirname, 'USER', 'root');
const START_MENU_SOURCE_PATH = path.join(USER_TEMPLATE_PATH, 'systemfiles', 'userprofile', 'startMenu-config.json');

function defaultSystemPathPermissions() {
  return [
    {
      path: '/systemfiles',
      perm: { read: true, write: false },
    },
    {
      path: '/systemfiles/runtime/apps',
      perm: { read: true, write: true },
    },
    {
      path: '/systemfiles/userprofile',
      perm: { read: true, write: true },
    },
    {
      path: '/systemfiles/background',
      perm: { read: true, write: true },
    },
  ];
}

function defaultStartMenuConfig() {
  return {
    version: '1.0',
    pinnedApps: ['Browser', 'File Explorer', 'Settings', 'Text Editor'],
    recents: [],
    maxRecents: 5,
  };
}

function ensureStartMenuConfig(userPaths) {
  fs.mkdirSync(userPaths.userProfileDir, { recursive: true });
  if (fs.existsSync(userPaths.startMenuPath)) return;

  if (fs.existsSync(START_MENU_SOURCE_PATH)) {
    fs.copyFileSync(START_MENU_SOURCE_PATH, userPaths.startMenuPath);
    return;
  }

  fs.writeFileSync(userPaths.startMenuPath, JSON.stringify(defaultStartMenuConfig(), null, 2));
}

function ensureAppIntegrityKey(userPaths) {
  fs.mkdirSync(userPaths.userProfileDir, { recursive: true });
  const keyPath = path.join(userPaths.userProfileDir, 'jsApiKey.txt');
  if (fs.existsSync(keyPath)) {
    return String(fs.readFileSync(keyPath, 'utf8')).trim();
  }

  const randomKey = crypto.randomBytes(16).toString('hex');
  fs.writeFileSync(keyPath, randomKey);
  return randomKey;
}

function syncAppKeysToUserKey(userPaths, userKey) {
  const resolvedKey = String(userKey || '').trim();
  if (!resolvedKey) return;

  const appsDir = path.join(userPaths.systemfilesDir, 'runtime', 'apps');
  if (!fs.existsSync(appsDir)) return;

  const appFolders = fs.readdirSync(appsDir, { withFileTypes: true });
  for (const folder of appFolders) {
    if (!folder.isDirectory() || folder.name.startsWith('.')) continue;
    const appFolderPath = path.join(appsDir, folder.name);

    try {
      const items = fs.readdirSync(appFolderPath, { withFileTypes: true });
      for (const item of items) {
        if (!item.isFile()) continue;
        if (item.name.toLowerCase() === 'jskey.txt') {
          try {
            fs.unlinkSync(path.join(appFolderPath, item.name));
          } catch (e) {}
        }
      }
    } catch (e) {}

    const appKeyPath = path.join(appFolderPath, 'jsKey.txt');
    try {
      fs.writeFileSync(appKeyPath, resolvedKey);
    } catch (e) {}
  }
}

function copyTemplateToUser(userPaths) {
  try {
    const templateSystemFilesPath = path.join(USER_TEMPLATE_PATH, 'systemfiles');
    if (!fs.existsSync(templateSystemFilesPath)) return;

    const userSystemfilesPath = userPaths.systemfilesDir;
    const userAppsPath = path.join(userSystemfilesPath, 'runtime', 'apps');

    const copyFileSafe = (src, dst) => {
      try {
        fs.mkdirSync(path.dirname(dst), { recursive: true });
        fs.copyFileSync(src, dst);
      } catch (e) {}
    };

    const copyDirSkipKeys = (srcDir, dstDir) => {
      if (!fs.existsSync(srcDir)) return;
      fs.mkdirSync(dstDir, { recursive: true });
      const items = fs.readdirSync(srcDir, { withFileTypes: true });
      for (const item of items) {
        if (item.name === 'userprofile') continue;
        const src = path.join(srcDir, item.name);
        const dst = path.join(dstDir, item.name);
        try {
          if (item.isDirectory()) {
            copyDirSkipKeys(src, dst);
          } else {
            if (item.name.toLowerCase() === 'jskey.txt') continue;
            if (!fs.existsSync(dst)) copyFileSafe(src, dst);
          }
        } catch (e) {}
      }
    };

    copyDirSkipKeys(templateSystemFilesPath, userSystemfilesPath);

    const templateAppsPath = path.join(templateSystemFilesPath, 'runtime', 'apps');
    if (fs.existsSync(templateAppsPath)) {
      const appEntries = fs.readdirSync(templateAppsPath, { withFileTypes: true });
      for (const appEntry of appEntries) {
        if (!appEntry.isDirectory() || appEntry.name.startsWith('.')) continue;
        const srcApp = path.join(templateAppsPath, appEntry.name);
        const dstApp = path.join(userAppsPath, appEntry.name);
        try {
          copyDirSkipKeys(srcApp, dstApp);
        } catch (e) {}
      }
    }
  } catch (e) {
    console.error('copyTemplateToUser error:', e && e.message ? e.message : String(e));
  }
}

function setupUserFilesystem(userPaths) {
  ensureStartMenuConfig(userPaths);
  const userKey = ensureAppIntegrityKey(userPaths);
  copyTemplateToUser(userPaths);
  syncAppKeysToUserKey(userPaths, userKey);
  return userKey;
}

module.exports = {
  defaultSystemPathPermissions,
  setupUserFilesystem,
};
