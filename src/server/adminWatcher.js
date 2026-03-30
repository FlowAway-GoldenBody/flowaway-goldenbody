const AdmZip = require("adm-zip");
const fs = require("fs");
const path = require("path");
// Production defaults: do not force overwrite user files. Set `forceUpdate` to true
// only when intentionally performing a global forced sync (e.g., maintenance/testing).
let __gbconfig = {autoupdate: true, forceUpdate: false};
// Create zip archives for each app folder in the project `apps` directory
async function createZipsForApps() {
  try {
    const projectRoot = path.resolve(__dirname, '../../');
    const appsDir = path.join(__dirname, 'apps');
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
    const projectRoot = path.resolve(__dirname, '../../');
    const directoryPath = path.resolve(__dirname, './zmcdfiles');
    const systemAppsPath = path.join(__dirname, 'apps');
    const systemRootFiles = ['flowaway.js', 'goldenbody.js'];
    const systemAppstoreappsFiles = ['startMenu-config.json'];
    if (!fs.existsSync(systemAppsPath)) {
      console.log('System apps directory not found:', systemAppsPath);
      return;
    }

    const systemEntries = fs.readdirSync(systemAppsPath, { withFileTypes: true });
    const systemAppDirs = systemEntries
      .filter(e => e.isDirectory() && !e.name.startsWith('.'))
      .map(d => d.name);
    const sampleAppName = 'sample app';

    // Get list of user directories
    const entries = fs.readdirSync(directoryPath, { withFileTypes: true });
    const userDirs = entries.filter(e => e.isDirectory() && !e.name.startsWith('.')).map(d => d.name);

    for (const username of userDirs) {
      try {
        // Read user data
        const userFile = path.join(directoryPath, username, `${username}.txt`);
        if (!fs.existsSync(userFile)) {
          console.log(`User file not found: ${userFile}`);
          continue;
        }

        const userData = JSON.parse(fs.readFileSync(userFile, 'utf8'));
        const userRootPath = path.join(directoryPath, username, 'root');
        const userBootPath = path.join(userRootPath, '.boot');
        const userGbenvPath = path.join(userBootPath, 'gbenv.js');
        const userAppsPath = path.join(userRootPath, 'apps');
        const userStartMenuPath = path.join(userRootPath, 'startmenuAppConfig');

        fs.mkdirSync(userRootPath, { recursive: true });
        fs.mkdirSync(userBootPath, { recursive: true });
        if (!fs.existsSync(userGbenvPath)) {
          fs.writeFileSync(userGbenvPath, 'window.__gbenv_shortcut = {};\n');
        }

        fs.mkdirSync(userAppsPath, { recursive: true });
        fs.mkdirSync(userStartMenuPath, { recursive: true });
        
        // Ensure user has startMenu-config.json from server app-config
        const sourceStartMenuConfigPath = path.join(__dirname, 'app-config', 'startMenu-config.json');
        const userStartMenuConfigPath = path.join(userStartMenuPath, 'startMenu-config.json');
        try {
          if (fs.existsSync(sourceStartMenuConfigPath)) {
            if (!fs.existsSync(userStartMenuConfigPath)) {
              fs.copyFileSync(sourceStartMenuConfigPath, userStartMenuConfigPath);
            }
          } else {
            // Fallback: create default if source doesn't exist
            if (!fs.existsSync(userStartMenuConfigPath)) {
              const defaultConfig = {
                version: '1.0',
                pinnedApps: [],
                hiddenApps: [],
                appOrder: [],
                recents: [],
                maxRecents: 5,
                displayMode: 'grid',
                gridColumns: 4
              };
              fs.writeFileSync(userStartMenuConfigPath, JSON.stringify(defaultConfig, null, 2));
            }
          }
        } catch (e) {
          console.error(`Failed to ensure startMenu-config.json for user ${username}:`, e);
        }
        
        if (systemAppDirs.includes(sampleAppName)) {
          const srcSampleApp = path.join(systemAppsPath, sampleAppName);
          const dstSampleApp = path.join(userAppsPath, sampleAppName);
          if (!fs.existsSync(dstSampleApp)) {
            fs.cpSync(srcSampleApp, dstSampleApp, { recursive: true });
          }
        }

        // Check if user has autoupdate systemapps enabled
        // userData.autoupdate = __gbconfig.autoupdate; //override for testing, will be removed in production
        if (userData.autoupdate) {
          // Keep key root-level system scripts in sync.
          for (const fileName of systemRootFiles) {
            const srcFilePath = path.join(projectRoot, 'src', 'server', 'systemfiles', fileName);
            const dstFilePath = path.join(userRootPath, fileName);
            try {
              if (!fs.existsSync(srcFilePath)) continue;
              if (__gbconfig.forceUpdate || !fs.existsSync(dstFilePath)) {
                fs.copyFileSync(srcFilePath, dstFilePath);
              } else {
                try {
                  const srcStat = fs.statSync(srcFilePath);
                  const dstStat = fs.statSync(dstFilePath);
                  if (srcStat.mtimeMs > dstStat.mtimeMs) {
                    fs.copyFileSync(srcFilePath, dstFilePath);
                  }
                } catch (e) {
                  // ignore stat/copy errors per-file
                }
              }
            } catch (e) {
              console.error(`Failed to update root file '${fileName}' for user ${username}:`, e);
            }
          }
          
          // Sync startMenu-config.json from server app-config when autoupdate is enabled
          try {
            const sourceStartMenuConfigPath = path.join(__dirname, 'app-config', 'startMenu-config.json');
            const userStartMenuConfigPath = path.join(userStartMenuPath, 'startMenu-config.json');
            if (fs.existsSync(sourceStartMenuConfigPath)) {
              if (__gbconfig.forceUpdate || !fs.existsSync(userStartMenuConfigPath)) {
                fs.copyFileSync(sourceStartMenuConfigPath, userStartMenuConfigPath);
              }
            } else {
              // If source doesn't exist, ensure user has default version
              if (!fs.existsSync(userStartMenuConfigPath)) {
                const defaultConfig = {
                  version: '1.0',
                  pinnedApps: [],
                  hiddenApps: [],
                  appOrder: [],
                  recents: [],
                  maxRecents: 5,
                  displayMode: 'grid',
                  gridColumns: 4
                };
                fs.writeFileSync(userStartMenuConfigPath, JSON.stringify(defaultConfig, null, 2));
              }
            }
          } catch (e) {
            console.error(`Failed to sync startMenu-config.json for user ${username}:`, e);
          }

          // Only replace known system app folders; preserve user-created non-system apps.
          fs.mkdirSync(userAppsPath, { recursive: true });
          // General behavior: copy system app files but do NOT overwrite existing user files.
          // If the user does not have the app folder, copy the whole app. If they do,
          // only copy missing files and folders (do not replace existing files).
          // Copy helpers
          const copySkipExisting = (srcDir, dstDir) => {
            const items = fs.readdirSync(srcDir, { withFileTypes: true });
            for (const it of items) {
              const srcItem = path.join(srcDir, it.name);
              const dstItem = path.join(dstDir, it.name);
              try {
                if (it.isDirectory()) {
                  if (!fs.existsSync(dstItem)) fs.mkdirSync(dstItem, { recursive: true });
                  copySkipExisting(srcItem, dstItem);
                } else {
                  if (!fs.existsSync(dstItem)) {
                    try { fs.copyFileSync(srcItem, dstItem); } catch (e) { /* ignore */ }
                  }
                }
              } catch (e) {
                // ignore per-item errors
              }
            }
          };

          const copyOverwrite = (srcDir, dstDir) => {
            const items = fs.readdirSync(srcDir, { withFileTypes: true });
            for (const it of items) {
              const srcItem = path.join(srcDir, it.name);
              const dstItem = path.join(dstDir, it.name);
              try {
                if (it.isDirectory()) {
                  if (!fs.existsSync(dstItem)) fs.mkdirSync(dstItem, { recursive: true });
                  copyOverwrite(srcItem, dstItem);
                } else {
                  try { fs.copyFileSync(srcItem, dstItem); } catch (e) { /* ignore */ }
                }
              } catch (e) {
                // ignore per-item errors
              }
            }
          };

          // Copy and overwrite only when source file is newer than destination.
          const copyIfSrcNewer = (srcDir, dstDir) => {
            const items = fs.readdirSync(srcDir, { withFileTypes: true });
            for (const it of items) {
              const srcItem = path.join(srcDir, it.name);
              const dstItem = path.join(dstDir, it.name);
              try {
                if (it.isDirectory()) {
                  if (!fs.existsSync(dstItem)) fs.mkdirSync(dstItem, { recursive: true });
                  copyIfSrcNewer(srcItem, dstItem);
                } else {
                  if (!fs.existsSync(dstItem)) {
                    try { fs.copyFileSync(srcItem, dstItem); } catch (e) { /* ignore */ }
                  } else {
                    try {
                      const srcStat = fs.statSync(srcItem);
                      const dstStat = fs.statSync(dstItem);
                      if (srcStat.mtimeMs > dstStat.mtimeMs) {
                        try { fs.copyFileSync(srcItem, dstItem); } catch (e) { /* ignore */ }
                      }
                    } catch (e) {
                      // ignore stat or copy errors per-item
                    }
                  }
                }
              } catch (e) {
                // ignore per-item errors
              }
            }
          };

          for (const appName of systemAppDirs) {
            const srcAppPath = path.join(systemAppsPath, appName);
            const dstAppPath = path.join(userAppsPath, appName);
            try {
              if (!fs.existsSync(dstAppPath)) {
                fs.cpSync(srcAppPath, dstAppPath, { recursive: true });
              } else {
                if (__gbconfig.forceUpdate) {
                  copyOverwrite(srcAppPath, dstAppPath);
                } else {
                  // For users with autoupdate enabled, overwrite only when source is newer.
                  copyIfSrcNewer(srcAppPath, dstAppPath);
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
