const AdmZip = require("adm-zip");
const fs = require("fs");
const path = require("path");
let __gbconfig = {autoupdate: true}; //override config in users for testing, will be removed in production
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
    const directoryPath = path.resolve(__dirname, './zmcdfiles');
    const systemAppsPath = path.join(__dirname, 'apps');
    if (!fs.existsSync(systemAppsPath)) {
      console.log('System apps directory not found:', systemAppsPath);
      return;
    }

    const systemEntries = fs.readdirSync(systemAppsPath, { withFileTypes: true });
    const systemAppDirs = systemEntries
      .filter(e => e.isDirectory() && !e.name.startsWith('.'))
      .map(d => d.name);
    
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
        // Check if user has autoupdate systemapps enabled
        userData.autoupdate = __gbconfig.autoupdate; //override for testing, will be removed in production
        if (userData.autoupdate) {
          const userAppsPath = path.join(directoryPath, username, 'root', 'apps');

          // Only replace known system app folders; preserve user-created non-system apps.
          fs.mkdirSync(userAppsPath, { recursive: true });
          for (const appName of systemAppDirs) {
            const srcAppPath = path.join(systemAppsPath, appName);
            const dstAppPath = path.join(userAppsPath, appName);
            fs.rmSync(dstAppPath, { recursive: true, force: true });
            fs.cpSync(srcAppPath, dstAppPath, { recursive: true });
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
