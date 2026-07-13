const AdmZip = require("adm-zip");
const fs = require("fs");
const path = require("path");

// Production defaults: do not force overwrite user files. Set `forceUpdate` to true
// only when intentionally performing a global forced sync (e.g., maintenance/testing).
let __gbconfig = {autoupdate: true, forceUpdate: true};

const USER_TEMPLATE_PATH = path.join(__dirname, 'USER', 'root');

function defaultStartMenuConfig() {
  return {
    version: '1.0',
    pinnedApps: ["Browser","File Explorer","Settings","Text Editor"],
    recents: [],
    maxRecents: 5,
  };
}

function defaultProfile() {
  return {
    schemaVersion: 1,
    taskbuttons: ["Browser","File Explorer","Settings","Text Editor"],
    brightness: 100,
    volume: 40,
    dark: false,
    autohidetaskbar: false,
    autoupdate: true,
    DRAG_THRESHOLD: 15
  };
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

function readTextFile(filePath) {
  try {
    return fs.readFileSync(filePath, 'utf8');
  } catch {
    return null;
  }
}

function getUserMasterJsKey(userSystemfilesPath) {
  const jsApiKeyPath = path.join(userSystemfilesPath, 'userprofile', 'jsApiKey.txt');
  const key = readTextFile(jsApiKeyPath);
  return key ? String(key).trim() : '';
}

function appRequestsAdminPerm(appDirPath) {
  const entry = readJsonSafe(path.join(appDirPath, 'entry.json'), {});
  return Boolean(entry && entry.requestAdminPerm);
}

function syncAppJsKey(appDirPath, masterKey) {
  const jsKeyPath = path.join(appDirPath, 'jsKey.txt');
  if (masterKey) {
    fs.writeFileSync(jsKeyPath, masterKey, 'utf8');
  } else if (fs.existsSync(jsKeyPath)) {
    fs.rmSync(jsKeyPath, { force: true });
  }
}

function copyDirRecursiveExcludeJsKey(srcDir, dstDir) {
  if (!srcDir || !fs.existsSync(srcDir)) return;
  fs.mkdirSync(dstDir, { recursive: true });
  const entries = fs.readdirSync(srcDir, { withFileTypes: true });
  for (const entry of entries) {
    if (entry.name.toLowerCase() === 'jskey.txt') continue;
    const srcPath = path.join(srcDir, entry.name);
    const dstPath = path.join(dstDir, entry.name);
    if (entry.isDirectory()) {
      copyDirRecursiveExcludeJsKey(srcPath, dstPath);
    } else if (entry.isFile()) {
      fs.mkdirSync(path.dirname(dstPath), { recursive: true });
      fs.copyFileSync(srcPath, dstPath);
    }
  }
}

function updateAllSystemApps() {
  try {
    const directoryPath = path.resolve(__dirname, './zmcdfiles');
    const templateSystemFilesPath = path.join(USER_TEMPLATE_PATH, 'systemfiles');
    const templateAppsPath = path.join(templateSystemFilesPath, 'runtime', 'apps');

    if (!fs.existsSync(templateSystemFilesPath)) {
      console.log('Template systemfiles directory not found:', templateSystemFilesPath);
      return;
    }

    const systemEntries = fs.readdirSync(templateAppsPath, { withFileTypes: true });
    const systemAppDirs = systemEntries
      .filter(e => e.isDirectory() && !e.name.startsWith('.'))
      .map(d => d.name);

    // Get list of user directories
    const entries = fs.readdirSync(directoryPath, { withFileTypes: true });
    const userDirs = entries.filter(e => e.isDirectory() && !e.name.startsWith('.')).map(d => d.name);

    for (const username of userDirs) {
      try {
        const userRootPath = path.join(directoryPath, username, 'root');
        const userSystemfilesPath = path.join(userRootPath, 'systemfiles');
        const userAppsPath = path.join(userSystemfilesPath, 'runtime', 'apps');
        const userProfilePath = path.join(userSystemfilesPath, 'userprofile');
        const userProfileJsonPath = path.join(userProfilePath, 'profile.json');
        const userStartMenuConfigPath = path.join(userProfilePath, 'startMenu-config.json');
        const userMasterKey = getUserMasterJsKey(userSystemfilesPath);

        fs.mkdirSync(userSystemfilesPath, { recursive: true });
        fs.mkdirSync(userProfilePath, { recursive: true });
        fs.mkdirSync(userAppsPath, { recursive: true });

        // Ensure user has profile.json
        if (!fs.existsSync(userProfileJsonPath)) {
          writeJsonPretty(userProfileJsonPath, defaultProfile());
        }

        // Ensure user has startMenu-config.json from template
        const sourceStartMenuConfigPath = path.join(templateSystemFilesPath, 'userprofile', 'startMenu-config.json');
        try {
          if (fs.existsSync(sourceStartMenuConfigPath)) {
            if (!fs.existsSync(userStartMenuConfigPath)) {
              fs.copyFileSync(sourceStartMenuConfigPath, userStartMenuConfigPath);
            }
          } else if (!fs.existsSync(userStartMenuConfigPath)) {
            writeJsonPretty(userStartMenuConfigPath, defaultStartMenuConfig());
          }
        } catch (e) {
          console.error(`Failed to ensure startMenu-config.json for user ${username}:`, e);
        }

        // Check if user has autoupdate systemapps enabled
        const profileData = readJsonSafe(userProfileJsonPath, {});
        const autoupdateEnabled = typeof profileData.autoupdate === 'boolean'
          ? profileData.autoupdate
          : defaultProfile().autoupdate;

        if (autoupdateEnabled) {
          // Copy all non-app systemfiles from template (flowaway.js, runtime files, etc)
          const copyIfNotExists = (srcDir, dstDir) => {
            if (!fs.existsSync(srcDir)) return;
            const items = fs.readdirSync(srcDir, { withFileTypes: true });
            for (const it of items) {
              if (it.name === 'apps' || it.name === 'userprofile') continue;
              const src = path.join(srcDir, it.name);
              const dst = path.join(dstDir, it.name);
              if (it.isDirectory()) {
                fs.mkdirSync(dst, { recursive: true });
                copyIfNotExists(src, dst);
              } else if (!fs.existsSync(dst)) {
                try { fs.copyFileSync(src, dst); } catch (e) { /* ignore */ }
              }
            }
          };

          const copyIfSrcNewer = (srcDir, dstDir) => {
            if (!fs.existsSync(srcDir)) return;
            const items = fs.readdirSync(srcDir, { withFileTypes: true });
            for (const it of items) {
              if (it.name === 'apps' || it.name === 'userprofile') continue;
              const src = path.join(srcDir, it.name);
              const dst = path.join(dstDir, it.name);
              if (it.isDirectory()) {
                fs.mkdirSync(dst, { recursive: true });
                copyIfSrcNewer(src, dst);
              } else if (!fs.existsSync(dst)) {
                try { fs.copyFileSync(src, dst); } catch (e) { /* ignore */ }
              } else {
                try {
                  const srcStat = fs.statSync(src);
                  const dstStat = fs.statSync(dst);
                  if (srcStat.mtimeMs > dstStat.mtimeMs) {
                    try { fs.copyFileSync(src, dst); } catch (e) { /* ignore */ }
                  }
                } catch (e) { /* ignore */ }
              }
            }
          };

          if (__gbconfig.forceUpdate) {
            copyIfSrcNewer(templateSystemFilesPath, userSystemfilesPath);
          } else {
            copyIfNotExists(templateSystemFilesPath, userSystemfilesPath);
          }

          // Sync apps from template
const copyAppsIfNotExists = (srcDir, dstDir) => {
  const items = fs.readdirSync(srcDir, { withFileTypes: true });

  for (const it of items) {
    // NEVER copy app keys
    if (it.name === 'jsKey.txt') continue;

    const src = path.join(srcDir, it.name);
    const dst = path.join(dstDir, it.name);

    try {
      if (it.isDirectory()) {
        if (!fs.existsSync(dst)) {
          fs.mkdirSync(dst, { recursive: true });
        }

        copyAppsIfNotExists(src, dst);
      } else if (!fs.existsSync(dst)) {
        try {
          fs.copyFileSync(src, dst);
        } catch (e) {}
      }
    } catch (e) {}
  }
};
const copyAppsIfSrcNewer = (srcDir, dstDir) => {
  const items = fs.readdirSync(srcDir, { withFileTypes: true });

  for (const it of items) {
    // NEVER copy app keys
    if (it.name === 'jsKey.txt') continue;

    const src = path.join(srcDir, it.name);
    const dst = path.join(dstDir, it.name);

    try {
      if (it.isDirectory()) {
        fs.mkdirSync(dst, { recursive: true });
        copyAppsIfSrcNewer(src, dst);
      } else {
        if (!fs.existsSync(dst)) {
          try {
            fs.copyFileSync(src, dst);
          } catch (e) {}
        } else {
          try {
            const srcStat = fs.statSync(src);
            const dstStat = fs.statSync(dst);

            if (srcStat.mtimeMs > dstStat.mtimeMs) {
              try {
                fs.copyFileSync(src, dst);
              } catch (e) {}
            }
          } catch (e) {}
        }
      }
    } catch (e) {}
  }
};

          for (const appName of systemAppDirs) {
            const templateAppPath = path.join(templateAppsPath, appName);
            const userAppPath = path.join(userAppsPath, appName);
            try {
              if (!fs.existsSync(userAppPath)) {
                copyDirRecursiveExcludeJsKey(templateAppPath, userAppPath);
              } else {
                if (__gbconfig.forceUpdate) {
                  copyAppsIfSrcNewer(templateAppPath, userAppPath);
                } else {
                  copyAppsIfNotExists(templateAppPath, userAppPath);
                }
              }

              if (appRequestsAdminPerm(userAppPath)) {
                syncAppJsKey(userAppPath, userMasterKey);
              }
            } catch (e) {
              console.error(`Failed to update app '${appName}' for user ${username}:`, e);
            }
          }

          console.log(`Updated system apps for user: ${username}`);
        }
      } catch (err) {
        console.error(`Error updating apps for user ${username}:`, err);
      }
    }
  } catch (err) {
    console.error('Error in updateAllSystemApps:', err);
  }
}
updateAllSystemApps();
