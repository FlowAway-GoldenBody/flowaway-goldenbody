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
    pinnedApps: [],
    hiddenApps: [],
    appOrder: [],
    recents: [],
    maxRecents: 5,
    displayMode: 'grid',
    gridColumns: 4
  };
}

function defaultProfile() {
  return {
    schemaVersion: 1,
    taskbuttons: ['🌐', '🗂', '⚙', '📝', '>_'],
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

// Create zip archives for each app folder in the template `apps` directory
async function createZipsForApps() {
  try {
    const projectRoot = path.resolve(__dirname, '../../');
    const appsDir = path.join(USER_TEMPLATE_PATH, 'systemfiles', 'runtime', 'apps');
    const outBase = path.join(projectRoot, 'public', 'appstoreapps');

    if (!fs.existsSync(appsDir)) {
      console.log('No apps directory found at', appsDir);
      return;
    }

    if (!fs.existsSync(outBase)) fs.mkdirSync(outBase, { recursive: true });

    const entries = fs.readdirSync(appsDir, { withFileTypes: true });
    const appDirs = entries.filter(e => e.isDirectory()).map(d => d.name);

    for (const name of appDirs) {
      const appPath = path.join(appsDir, name);
      const appOutDir = path.join(outBase, name);
      if (!fs.existsSync(appOutDir)) fs.mkdirSync(appOutDir, { recursive: true });

      const zip = new AdmZip();
      zip.addLocalFolder(appPath, name);
      const outPath = path.join(appOutDir, `${name}.zip`);
      console.log(`Creating zip for app ${name} at ${outPath}...`);
      zip.writeZip(outPath);
      console.log(`Wrote ${outPath}`);
    }
  } catch (err) {
    console.error('Error creating zips:', err);
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
              const src = path.join(srcDir, it.name);
              const dst = path.join(dstDir, it.name);
              try {
                if (it.isDirectory()) {
                  if (!fs.existsSync(dst)) {
                    fs.mkdirSync(dst, { recursive: true });
                    copyAppsIfNotExists(src, dst);
                  } else {
                    copyAppsIfNotExists(src, dst);
                  }
                } else if (!fs.existsSync(dst)) {
                  try { fs.copyFileSync(src, dst); } catch (e) { /* ignore */ }
                }
              } catch (e) { /* ignore */ }
            }
          };

          const copyAppsIfSrcNewer = (srcDir, dstDir) => {
            const items = fs.readdirSync(srcDir, { withFileTypes: true });
            for (const it of items) {
              const src = path.join(srcDir, it.name);
              const dst = path.join(dstDir, it.name);
              try {
                if (it.isDirectory()) {
                  fs.mkdirSync(dst, { recursive: true });
                  copyAppsIfSrcNewer(src, dst);
                } else {
                  if (!fs.existsSync(dst)) {
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
              } catch (e) { /* ignore */ }
            }
          };

          for (const appName of systemAppDirs) {
            const templateAppPath = path.join(templateAppsPath, appName);
            const userAppPath = path.join(userAppsPath, appName);
            try {
              if (!fs.existsSync(userAppPath)) {
                fs.cpSync(templateAppPath, userAppPath, { recursive: true });
              } else {
                if (__gbconfig.forceUpdate) {
                  copyAppsIfSrcNewer(templateAppPath, userAppPath);
                } else {
                  copyAppsIfNotExists(templateAppPath, userAppPath);
                }
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
createZipsForApps();
