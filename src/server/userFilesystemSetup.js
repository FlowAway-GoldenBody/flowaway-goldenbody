const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const USER_TEMPLATE_PATH = path.join(__dirname, 'USER', 'root');
const START_MENU_SOURCE_PATH = path.join(USER_TEMPLATE_PATH, 'systemfiles', 'userprofile', 'startMenu-config.json');
const PROFILE_SOURCE_PATH = path.join(USER_TEMPLATE_PATH, 'systemfiles', 'userprofile', 'profile.json');

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

async function pathExists(filePath) {
  try {
    await fs.promises.access(filePath);
    return true;
  } catch {
    return false;
  }
}

function defaultStartMenuConfig() {
  return {
    version: '1.0',
    pinnedApps: ['Browser', 'File Explorer', 'Settings', 'Text Editor'],
    recents: [],
    maxRecents: 5,
  };
}

async function ensureStartMenuConfig(userPaths) {
  await fs.promises.mkdir(userPaths.userProfileDir, { recursive: true });

  try {
    if (!(await pathExists(userPaths.startMenuPath))) {
      if (await pathExists(START_MENU_SOURCE_PATH)) {
        try { await fs.promises.copyFile(START_MENU_SOURCE_PATH, userPaths.startMenuPath); } catch (e) {}
      } else {
        try { await fs.promises.writeFile(userPaths.startMenuPath, JSON.stringify(defaultStartMenuConfig(), null, 2)); } catch (e) {}
      }
    }
  } catch (e) {}

  try {
    const profileDest = path.join(userPaths.userProfileDir, 'profile.json');
    if (!(await pathExists(profileDest)) && (await pathExists(PROFILE_SOURCE_PATH))) {
      try { await fs.promises.copyFile(PROFILE_SOURCE_PATH, profileDest); } catch (e) {}
    }
  } catch (e) {}
}

async function ensureAppIntegrityKey(userPaths) {
  await fs.promises.mkdir(userPaths.userProfileDir, { recursive: true });
  const keyPath = path.join(userPaths.userProfileDir, 'jsApiKey.txt');

  try {
    const existing = await fs.promises.readFile(keyPath, 'utf8');
    return String(existing).trim();
  } catch (e) {
    const randomKey = crypto.randomBytes(16).toString('hex');
    await fs.promises.writeFile(keyPath, randomKey);
    return randomKey;
  }
}

async function syncAppKeysToUserKey(userPaths, userKey) {
  const resolvedKey = String(userKey || '').trim();
  if (!resolvedKey) return;

  const appsDir = path.join(userPaths.systemfilesDir, 'runtime', 'apps');
  if (!(await pathExists(appsDir))) return;

  const appFolders = await fs.promises.readdir(appsDir, { withFileTypes: true });
  for (const folder of appFolders) {
    if (!folder.isDirectory() || folder.name.startsWith('.')) continue;
    const appFolderPath = path.join(appsDir, folder.name);

    try {
      const items = await fs.promises.readdir(appFolderPath, { withFileTypes: true });
      for (const item of items) {
        if (!item.isFile()) continue;
        if (item.name.toLowerCase() === 'jskey.txt') {
          try {
            await fs.promises.unlink(path.join(appFolderPath, item.name));
          } catch (e) {}
        }
      }
    } catch (e) {}

    const appKeyPath = path.join(appFolderPath, 'jsKey.txt');
    try {
      await fs.promises.writeFile(appKeyPath, resolvedKey);
    } catch (e) {}
  }
}

async function copyTemplateToUser(userPaths) {
  try {
    const templateSystemFilesPath = path.join(USER_TEMPLATE_PATH, 'systemfiles');
    if (!(await pathExists(templateSystemFilesPath))) return;

    const userSystemfilesPath = userPaths.systemfilesDir;
    const userAppsPath = path.join(userSystemfilesPath, 'runtime', 'apps');

    const copyFileSafe = async (src, dst) => {
      try {
        await fs.promises.mkdir(path.dirname(dst), { recursive: true });
        await fs.promises.copyFile(src, dst);
      } catch (e) {}
    };

    const copyDirSkipKeys = async (srcDir, dstDir) => {
      if (!(await pathExists(srcDir))) return;
      await fs.promises.mkdir(dstDir, { recursive: true });
      const items = await fs.promises.readdir(srcDir, { withFileTypes: true });
      for (const item of items) {
        if (item.name === 'userprofile') continue;
        const src = path.join(srcDir, item.name);
        const dst = path.join(dstDir, item.name);
        try {
          if (item.isDirectory()) {
            await copyDirSkipKeys(src, dst);
          } else {
            if (item.name.toLowerCase() === 'jskey.txt') continue;
            if (!(await pathExists(dst))) await copyFileSafe(src, dst);
          }
        } catch (e) {}
      }
    };

    await copyDirSkipKeys(templateSystemFilesPath, userSystemfilesPath);

    const templateAppsPath = path.join(templateSystemFilesPath, 'runtime', 'apps');
    if (await pathExists(templateAppsPath)) {
      const appEntries = await fs.promises.readdir(templateAppsPath, { withFileTypes: true });
      for (const appEntry of appEntries) {
        if (!appEntry.isDirectory() || appEntry.name.startsWith('.')) continue;
        const srcApp = path.join(templateAppsPath, appEntry.name);
        const dstApp = path.join(userAppsPath, appEntry.name);
        try {
          await copyDirSkipKeys(srcApp, dstApp);
        } catch (e) {}
      }
    }
  } catch (e) {
    console.error('copyTemplateToUser error:', e && e.message ? e.message : String(e));
  }
}

async function setupUserFilesystem(userPaths) {
  await ensureStartMenuConfig(userPaths);
  const userKey = await ensureAppIntegrityKey(userPaths);
  await copyTemplateToUser(userPaths);
  await syncAppKeysToUserKey(userPaths, userKey);
  return userKey;
}

module.exports = {
  defaultSystemPathPermissions,
  setupUserFilesystem,
};
