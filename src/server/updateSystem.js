const fs = require("fs");
const fsp = require("fs/promises");
const path = require("path");

const USER_TEMPLATE_PATH = path.join(__dirname, 'USER', 'root');

function defaultStartMenuConfig() {
  return {
    pinnedApps: ["Browser","File Explorer","Settings","Text Editor"],
    recents: [],
    maxRecents: 5,
  };
}

function defaultProfile() {
  return {
    taskbuttons: ["Browser","File Explorer","Settings","Text Editor"],
    brightness: 100,
    volume: 40,
    dark: false,
    autohidetaskbar: false,
    autoupdate: true,
    DRAG_THRESHOLD: 15
  };
}

async function readJsonSafe(filePath, fallback) {
  try {
    return JSON.parse(await fsp.readFile(filePath, 'utf8'));
  } catch {
    return fallback;
  }
}

async function writeJsonPretty(filePath, value) {
  await fsp.mkdir(path.dirname(filePath), { recursive: true });
  await fsp.writeFile(filePath, JSON.stringify(value, null, 2));
}

async function readTextFile(filePath) {
  try {
    return await fsp.readFile(filePath, 'utf8');
  } catch {
    return null;
  }
}

async function pathExists(filePath) {
  try {
    await fsp.access(filePath);
    return true;
  } catch {
    return false;
  }
}

async function getUserMasterJsKey(userSystemfilesPath) {
  const jsApiKeyPath = path.join(userSystemfilesPath, 'userprofile', 'jsApiKey.txt');
  const key = await readTextFile(jsApiKeyPath);
  return key ? String(key).trim() : '';
}

async function appRequestsAdminPerm(appDirPath) {
  const entry = await readJsonSafe(path.join(appDirPath, 'entry.json'), {});
  return Boolean(entry && entry.requestAdminPerm);
}

async function syncAppJsKey(appDirPath, masterKey) {
  const jsKeyPath = path.join(appDirPath, 'jsKey.txt');
  if (masterKey) {
    await fsp.writeFile(jsKeyPath, masterKey, 'utf8');
  } else if (await pathExists(jsKeyPath)) {
    await fsp.rm(jsKeyPath, { force: true });
  }
}

async function copyDirRecursiveExcludeJsKey(srcDir, dstDir) {
  if (!srcDir || !(await pathExists(srcDir))) return;
  await fsp.mkdir(dstDir, { recursive: true });
  const entries = await fsp.readdir(srcDir, { withFileTypes: true });
  for (const entry of entries) {
    if (entry.name.toLowerCase() === 'jskey.txt') continue;
    const srcPath = path.join(srcDir, entry.name);
    const dstPath = path.join(dstDir, entry.name);
    if (entry.isDirectory()) {
      await copyDirRecursiveExcludeJsKey(srcPath, dstPath);
    } else if (entry.isFile()) {
      const ext = path.extname(entry.name).toLowerCase();
      if (ext !== '.js') continue;
      await fsp.mkdir(path.dirname(dstPath), { recursive: true });
      await fsp.copyFile(srcPath, dstPath);
    }
  }
}

async function fileContentsDiffer(srcPath, dstPath) {
  try {
    const [srcStat, dstStat] = await Promise.all([
      fsp.stat(srcPath),
      fsp.stat(dstPath),
    ]);

    if (srcStat.size !== dstStat.size) return true;

    const [srcBuf, dstBuf] = await Promise.all([
      fsp.readFile(srcPath),
      fsp.readFile(dstPath),
    ]);

    return !srcBuf.equals(dstBuf);
  } catch (e) {
    return true;
  }
}

async function syncTemplateTree(srcDir, dstDir, { skipNames = new Set(), skipJsKey = true } = {}) {
  if (!srcDir || !(await pathExists(srcDir))) return;

  await fsp.mkdir(dstDir, { recursive: true });
  const entries = await fsp.readdir(srcDir, { withFileTypes: true });

  for (const entry of entries) {
    if (skipNames.has(entry.name)) continue;
    if (skipJsKey && entry.name.toLowerCase() === 'jskey.txt') continue;

    const srcPath = path.join(srcDir, entry.name);
    const dstPath = path.join(dstDir, entry.name);

    if (entry.isDirectory()) {
      await syncTemplateTree(srcPath, dstPath, { skipNames, skipJsKey });
    } else if (entry.isFile()) {
      if (!(await pathExists(dstPath)) || (await fileContentsDiffer(srcPath, dstPath))) {
        await fsp.mkdir(path.dirname(dstPath), { recursive: true });
        await fsp.copyFile(srcPath, dstPath);
      }
    }
  }
}

async function syncTemplateAppTree(srcDir, dstDir) {
  if (!srcDir || !(await pathExists(srcDir))) return;

  await fsp.mkdir(dstDir, { recursive: true });
  const entries = await fsp.readdir(srcDir, { withFileTypes: true });

  for (const entry of entries) {
    if (entry.name.toLowerCase() === 'jskey.txt') continue;

    const srcPath = path.join(srcDir, entry.name);
    const dstPath = path.join(dstDir, entry.name);

    if (entry.isDirectory()) {
      if (!(await pathExists(dstPath))) {
        await fsp.mkdir(dstPath, { recursive: true });
      }
      await syncTemplateAppTree(srcPath, dstPath);
      continue;
    }

    if (!entry.isFile()) continue;

    const ext = path.extname(entry.name).toLowerCase();
    if (ext !== '.js') continue;

    if (!(await pathExists(dstPath)) || (await fileContentsDiffer(srcPath, dstPath))) {
      await fsp.mkdir(path.dirname(dstPath), { recursive: true });
      await fsp.copyFile(srcPath, dstPath);
    }
  }
}

async function updateUserSystemApps(username) {
  if (!username || typeof username !== 'string') {
    return { ok: false, updated: false, reason: 'missing_username' };
  }

  const directoryPath = path.resolve(__dirname, './zmcdfiles');
  const templateSystemFilesPath = path.join(USER_TEMPLATE_PATH, 'systemfiles');
  const templateAppsPath = path.join(templateSystemFilesPath, 'runtime', 'apps');

  if (!(await pathExists(templateSystemFilesPath))) {
    return { ok: false, updated: false, reason: 'missing_template_systemfiles', username };
  }

  const userRootPath = path.join(directoryPath, username, 'root');
  const userSystemfilesPath = path.join(userRootPath, 'systemfiles');
  const userAppsPath = path.join(userSystemfilesPath, 'runtime', 'apps');
  const userProfilePath = path.join(userSystemfilesPath, 'userprofile');
  const userProfileJsonPath = path.join(userProfilePath, 'profile.json');
  const userStartMenuConfigPath = path.join(userProfilePath, 'startMenu-config.json');
  const userMasterKey = await getUserMasterJsKey(userSystemfilesPath);

  if (!(await pathExists(userRootPath))) {
    return { ok: false, updated: false, reason: 'missing_user_root', username };
  }

  await fsp.mkdir(userSystemfilesPath, { recursive: true });
  await fsp.mkdir(userProfilePath, { recursive: true });
  await fsp.mkdir(userAppsPath, { recursive: true });

  if (!(await pathExists(userProfileJsonPath))) {
    await writeJsonPretty(userProfileJsonPath, defaultProfile());
  }

  const sourceStartMenuConfigPath = path.join(templateSystemFilesPath, 'userprofile', 'startMenu-config.json');
  try {
    if (await pathExists(sourceStartMenuConfigPath)) {
      if (!(await pathExists(userStartMenuConfigPath))) {
        await fsp.copyFile(sourceStartMenuConfigPath, userStartMenuConfigPath);
      }
    } else if (!(await pathExists(userStartMenuConfigPath))) {
      await writeJsonPretty(userStartMenuConfigPath, defaultStartMenuConfig());
    }
  } catch (e) {
    console.error(`Failed to ensure startMenu-config.json for user ${username}:`, e);
  }

  const profileData = await readJsonSafe(userProfileJsonPath, {});
  const autoupdateEnabled = typeof profileData.autoupdate === 'boolean'
    ? profileData.autoupdate
    : defaultProfile().autoupdate;

  if (!autoupdateEnabled) {
    return { ok: true, updated: false, reason: 'autoupdate_disabled', username };
  }

  const systemEntries = await fsp.readdir(templateAppsPath, { withFileTypes: true });
  const systemAppDirs = systemEntries
    .filter(e => e.isDirectory() && !e.name.startsWith('.'))
    .map(d => d.name);

  await syncTemplateTree(templateSystemFilesPath, userSystemfilesPath, {
    skipNames: new Set(['apps', 'userprofile'])
  });

  for (const appName of systemAppDirs) {
    const templateAppPath = path.join(templateAppsPath, appName);
    const userAppPath = path.join(userAppsPath, appName);
    try {
      if (!(await pathExists(userAppPath))) {
        await copyDirRecursiveExcludeJsKey(templateAppPath, userAppPath);
      } else {
        await syncTemplateAppTree(templateAppPath, userAppPath);
      }

      if (await appRequestsAdminPerm(userAppPath)) {
        await syncAppJsKey(userAppPath, userMasterKey);
      }
    } catch (e) {
      console.error(`Failed to update app '${appName}' for user ${username}:`, e);
    }
  }

  console.log(`Updated system apps for user: ${username}`);
  return { ok: true, updated: true, username };
}

async function updateAllSystemApps() {
  try {
    const directoryPath = path.resolve(__dirname, './zmcdfiles');
    if (!(await pathExists(directoryPath))) return;

    const entries = await fsp.readdir(directoryPath, { withFileTypes: true });
    const userDirs = entries.filter(e => e.isDirectory() && !e.name.startsWith('.')).map(d => d.name);

    for (const username of userDirs) {
      try {
        await updateUserSystemApps(username);
      } catch (err) {
        console.error(`Error updating apps for user ${username}:`, err);
      }
    }
  } catch (err) {
    console.error('Error in updateAllSystemApps:', err);
  }
}

if (require.main === module) {
  updateAllSystemApps();
}

module.exports = {
  updateUserSystemApps,
  updateAllSystemApps,
};
