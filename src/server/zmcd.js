const http = require('http');
const generateId = require('../util/generateId');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const RammerheadSessionFileCache = require('../classes/RammerheadSessionFileCache.js');
const RammerheadLogging = require('../classes/RammerheadLogging');
const RammerheadSession = require('../classes/RammerheadSession');
const { cleanupUserWatcher } = require('./appSocket.js');

const logger = new RammerheadLogging({ logLevel: 'debug' });
const store = new RammerheadSessionFileCache({ logger });
let directoryPath = path.resolve(__dirname, './zmcdfiles');
directoryPath += '/';
console.log(directoryPath)
let sessionPath = path.resolve(__dirname, '../../sessions');
sessionPath += '/'
console.log(sessionPath)
const projectroot = path.resolve(__dirname, '../../');
const fsp = require('fs/promises');

function getFolderNamesSync(dirPath) {
  try {
    // Read directory entries as fs.Dirent objects synchronously
    const entries = fs.readdirSync(dirPath, { withFileTypes: true });

    // Filter for directories and map to their names
    const folderNames = entries
      .filter(entry => entry.isDirectory())
      .map(entry => entry.name);

    return folderNames;
  } catch (err) {
    console.error(`Error reading directory: ${err}`);
    return [];
  }
}

// Usage example:

async function deleteFile(filePath) {
  try {
    await fsp.unlink(filePath);
    console.log(`Successfully deleted ${filePath}`);
  } catch (error) {
    if (error.code === 'ENOENT') {
      console.log(`File not found: ${filePath}`);
    } else {
      console.error('Error deleting file:', error.message);
    }
  }
}

function handleZMCd(req, res) {
  // Allow CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    // Preflight request
    res.writeHead(204);
    res.end();
    return;
  }

  if (req.method === 'POST') {
    let body = '';

    req.on('data', chunk => {
      body += chunk;
    });

    req.on('end', () => {
      let responseContent = null; // will store final response to send
      try {
        const data = JSON.parse(body);
        const authHeader = (req.headers && (req.headers.authorization || req.headers.Authorization)) || '';
        // console.log('Data from client:', data);
        let filecontents;
        let originalId;
        if(data.needID) {
          const foldernames = getFolderNamesSync(directoryPath + data.username);
            const content = JSON.parse(fs.readFileSync(directoryPath + data.username + '/' + data.username + '.txt', 'utf8'));
            // console.log(content.username);
            // console.log(data.username);

              // responseContent = content; // return existing user
              filecontents = content;
              originalId = filecontents.id;
              const sessionId = generateId();
              const session = new RammerheadSession({ sessionId, store });
              store.add(sessionId, session);
              filecontents.id = sessionId;
              responseContent = {id: sessionId};
              filecontents.siteSettings = [];
            // console.log(newContent);
            const sfiles = fs.readdirSync(sessionPath).filter(f => !f.startsWith('.'));
            for(const sfileName of sfiles) {
              if(sfileName == originalId + '.rhfsession') {
                // console.log(sfileName)
                deleteFile(sessionPath + originalId + '.rhfsession');
              }
            }
            fs.writeFileSync(directoryPath + filecontents.username + '/' + filecontents.username + '.txt', JSON.stringify(filecontents));

res.end(JSON.stringify(responseContent));
return; // VERY IMPORTANT
        }
        if (!fs.existsSync(directoryPath)) fs.mkdirSync(directoryPath, { recursive: true });

        if (data.needNewAcc) {
          // Check if username already exists
          let folders = getFolderNamesSync(directoryPath);
          let usernameExists = false;

          for (const foldername of folders) {
            if (foldername === data.username) {
              usernameExists = true;
              // responseContent = content; // return existing user
              responseContent = 'error: user already exists';
              break;
            }
          }

          if (!usernameExists) {
            // Create new session
            const sessionId = generateId();
            const session = new RammerheadSession({ sessionId, store });
            store.add(sessionId, session);

            const newContent = {
              username: data.username,
              password: data.password,
              id: sessionId,
              // authTokens holds short-lived bearer tokens: { token, expires }
              authTokens: [],
              needNewAcc: false,
              taskbuttons: ["🌐", "🗂", "⚙", "📝", "🖥️"],
              brightness: 100,
              volume: 40,
              dark: false,
              enableURLSync: true,
              lazyloading: true,
              autoupdate: true,
              siteSettings: [],
              maxSpace: 5, // in GB
            };
            fs.mkdirSync(directoryPath + data.username, { recursive: true });
            let userDirectoryPath = directoryPath + data.username + '/';
            fs.writeFileSync(userDirectoryPath + data.username + '.txt', JSON.stringify(newContent));
            fs.mkdirSync(userDirectoryPath + 'root', { recursive: true });
fs.mkdirSync(userDirectoryPath + 'root', { recursive: true });
fs.cpSync(projectroot + '/src/server/systemfiles/flowaway.js', userDirectoryPath + 'root/systemfiles/flowaway.js');
  fs.cpSync(projectroot + '/src/server/systemfiles/goldenbody.js', userDirectoryPath + 'root/systemfiles/goldenbody.js');
// Don't create 'apps' — let cpSync do it
fs.cpSync(
  path.join(__dirname, 'apps'),
  path.join(userDirectoryPath, 'root', 'apps'),
  { recursive: true }
);
                        const bootDir = path.join(userDirectoryPath, 'root', '.boot');
                        fs.mkdirSync(bootDir, { recursive: true });
                        const gbenvPath = path.join(bootDir, 'gbenv.js');
                        if (!fs.existsSync(gbenvPath)) {
                          fs.writeFileSync(gbenvPath, 'window.__gbenv_shortcut = {};\n');
                        }
                        
                        // Create startmenuAppConfig directory and startMenu-config.json for new user
                        const userStartMenuPath = path.join(userDirectoryPath, 'root', 'startmenuAppConfig');
                        fs.mkdirSync(userStartMenuPath, { recursive: true });
                        const userStartMenuConfigPath = path.join(userStartMenuPath, 'startMenu-config.json');
                        const sourceStartMenuConfigPath = path.join(__dirname, 'app-config', 'startMenu-config.json');
                        if (!fs.existsSync(userStartMenuConfigPath)) {
                          if (fs.existsSync(sourceStartMenuConfigPath)) {
                            fs.copyFileSync(sourceStartMenuConfigPath, userStartMenuConfigPath);
                          } else {
                            const defaultStartMenuConfig = {
                              version: '1.0',
                              pinnedApps: [],
                              hiddenApps: [],
                              appOrder: [],
                              recents: [],
                              maxRecents: 5,
                              displayMode: 'grid',
                              gridColumns: 4
                            };
                            fs.writeFileSync(userStartMenuConfigPath, JSON.stringify(defaultStartMenuConfig, null, 2));
                          }
                        }
            // Issue a token for the newly created account and do not return plaintext password
            const token = crypto.randomBytes(24).toString('hex');
            const expires = Date.now() + 1000 * 60 * 60; // 1 hour
            newContent.authTokens = [{ token, expires }];
            // persist the authTokens to disk immediately so the token is valid for subsequent requests
            fs.writeFileSync(userDirectoryPath + data.username + '.txt', JSON.stringify(newContent, null, 2));
            const safeNew = Object.assign({}, newContent);
            delete safeNew.password;
            responseContent = Object.assign({}, safeNew, { authToken: token });
          }
        } else {
          // Check credentials
          const foldernames = getFolderNamesSync(directoryPath);
          for (const foldername of foldernames) {
            let content;
            try {
              content = JSON.parse(fs.readFileSync(directoryPath + data.username + '/' + data.username + '.txt', 'utf8'));
              try {
                fs.readFileSync(directoryPath + data.username + '/' + 'root' + '/' + 'systemfiles/flowaway.js', 'utf8');
              } catch (e) {
                fs.cpSync(projectroot + '/src/server/systemfiles/flowaway.js', directoryPath + data.username + '/' + 'root' + '/' + 'systemfiles/flowaway.js');
              }
                try {
                  fs.readFileSync(directoryPath + data.username + '/' + 'root' + '/' + 'systemfiles/goldenbody.js', 'utf8');
                } catch (e) {
                  fs.cpSync(projectroot + '/src/server/systemfiles/goldenbody.js', directoryPath + data.username + '/' + 'root' + '/' + 'systemfiles/goldenbody.js');
                }
              
              // Ensure startMenu-config.json exists for existing users
              try {
                const userAppsPath = path.join(directoryPath, data.username, 'root', 'startmenuAppConfig');
                fs.mkdirSync(userAppsPath, { recursive: true });
                const startMenuConfigPath = path.join(userAppsPath, 'startMenu-config.json');
                const sourceStartMenuConfigPath = path.join(__dirname, 'app-config', 'startMenu-config.json');
                if (!fs.existsSync(startMenuConfigPath)) {
                  if (fs.existsSync(sourceStartMenuConfigPath)) {
                    fs.copyFileSync(sourceStartMenuConfigPath, startMenuConfigPath);
                  } else {
                    const defaultStartMenuConfig = {
                      version: '1.0',
                      pinnedApps: [],
                      hiddenApps: [],
                      appOrder: [],
                      recents: [],
                      maxRecents: 5,
                      displayMode: 'grid',
                      gridColumns: 4
                    };
                    fs.writeFileSync(startMenuConfigPath, JSON.stringify(defaultStartMenuConfig, null, 2));
                  }
                }
              } catch (e) {
                console.warn('Failed to ensure startMenu-config.json for user', data.username, e);
              }
              
              console.log(content);
            } catch (e) {
              console.error('Error reading user file:', e.message);
              responseContent = 'error: invalid username or password'; // + ', original error: ' + e;
              break;
            }
            // Helper: clean expired tokens
            if (!Array.isArray(content.authTokens)) content.authTokens = [];
            const now = Date.now();
            content.authTokens = content.authTokens.filter(t => t && t.expires && t.expires > now);
            // Verify by either password or Bearer token
            let tokenFromHeader = null;
            if (typeof authHeader === 'string' && authHeader.startsWith('Bearer ')) tokenFromHeader = authHeader.slice(7).trim();
            const tokenValid = tokenFromHeader && content.authTokens.some(t => t.token === tokenFromHeader && t.expires > now);
            if (content.username === data.username && (content.password === data.password || tokenValid)) {
              if(!content.taskbuttons) {
                  content.taskbuttons = ["🌐", "🗂", "⚙", "📝", "🖥️"];
                  fs.writeFileSync(directoryPath + data.username + '/' + data.username + '.txt', JSON.stringify(content));
              }
              // Issue a short-lived token for the session
              const token = crypto.randomBytes(24).toString('hex');
              const expires = Date.now() + 1000 * 60 * 60; // 1 hour
              content.authTokens = content.authTokens || [];
              content.authTokens.push({ token, expires });
              fs.writeFileSync(directoryPath + data.username + '/' + data.username + '.txt', JSON.stringify(content, null, 2));
              // Do not include password in response
              const safeContent = Object.assign({}, content);
              delete safeContent.password;
              responseContent = Object.assign({}, safeContent, { authToken: token });
              if(content.online) {responseContent = 'error: it looks like another tab is online, if you believe thats a mistake, ask alawgeo in hydrosphere!'; break;}
              break;
            }
            else {
              responseContent = 'error: invalid username or password'; // + ', original error: ' + e;
              break;
            }
          }

        }
        if (data.refillSession) {
          const userFile = directoryPath + data.username + '/' + data.username + '.txt';
          let userData;
          try {
            userData = JSON.parse(fs.readFileSync(userFile, 'utf8'));
          } catch {
            res.writeHead(404);
            return res.end(JSON.stringify({ error: 'User file not found' }));
          }

          if (!Array.isArray(userData.authTokens)) userData.authTokens = [];
          const now = Date.now();
          userData.authTokens = userData.authTokens.filter(t => t && t.expires && t.expires > now);

          let tokenFromHeader = null;
          if (typeof authHeader === 'string' && authHeader.startsWith('Bearer ')) tokenFromHeader = authHeader.slice(7).trim();
          const tokenFromBody = typeof data.sessionToken === 'string' ? data.sessionToken.trim() : '';
          const tokenValid =
            (tokenFromHeader && userData.authTokens.some(t => t.token === tokenFromHeader && t.expires > now)) ||
            (tokenFromBody && userData.authTokens.some(t => t.token === tokenFromBody && t.expires > now));
          const passwordValid = typeof data.password === 'string' && data.password === userData.password;

          if (!(passwordValid || tokenValid)) {
            res.writeHead(401);
            return res.end(JSON.stringify({ error: 'unauthorized' }));
          }

          const newToken = crypto.randomBytes(24).toString('hex');
          const expires = Date.now() + 1000 * 60 * 60; // 1 hour
          userData.authTokens.push({ token: newToken, expires });
          fs.writeFileSync(userFile, JSON.stringify(userData, null, 2));

          return res.end(JSON.stringify({ success: true, authToken: newToken }));
        }
        if(data.edittaskbuttons) {
          // Require auth: either password in body or valid bearer token
          let content = JSON.parse(fs.readFileSync(directoryPath + data.username + '/' + data.username + '.txt'));
          if (!Array.isArray(content.authTokens)) content.authTokens = [];
          const now = Date.now();
          content.authTokens = content.authTokens.filter(t => t && t.expires && t.expires > now);
          let tokenFromHeader = null;
          if (typeof authHeader === 'string' && authHeader.startsWith('Bearer ')) tokenFromHeader = authHeader.slice(7).trim();
          const tokenValid = tokenFromHeader && content.authTokens.some(t => t.token === tokenFromHeader && t.expires > now);
          if (!(data.password === content.password || tokenValid)) {
            return res.end(JSON.stringify({ error: 'unauthorized' }));
          }
          content.taskbuttons = data.data;
          fs.writeFileSync(directoryPath + data.username + '/' + data.username + '.txt', JSON.stringify(content));
        }
        else if (data.updatePassword) {
          const userFile = directoryPath + data.username + '/' + data.username + '.txt'

          let userData;
          try {
            userData = JSON.parse(fs.readFileSync(userFile, "utf8"));
          } catch {
            res.writeHead(404);
            return res.end(JSON.stringify({ error: "User file not found" }));
          }
          // Allow password change if oldPassword matches OR a valid bearer token present
          if (!Array.isArray(userData.authTokens)) userData.authTokens = [];
          const now = Date.now();
          userData.authTokens = userData.authTokens.filter(t => t && t.expires && t.expires > now);
          let tokenFromHeader = null;
          if (typeof authHeader === 'string' && authHeader.startsWith('Bearer ')) tokenFromHeader = authHeader.slice(7).trim();
          const tokenValid = tokenFromHeader && userData.authTokens.some(t => t.token === tokenFromHeader && t.expires > now);
          if (!(data.oldPassword === userData.password || tokenValid)) {
            return res.end(JSON.stringify({ error: "old password is wrong" }));
          }

          userData.password = data.newPassword;
          // invalidate existing tokens
          userData.authTokens = [];
          // issue new token
          const newToken = crypto.randomBytes(24).toString('hex');
          const expires = Date.now() + 1000 * 60 * 60; // 1 hour
          userData.authTokens.push({ token: newToken, expires });

          fs.writeFileSync(userFile, JSON.stringify(userData, null, 2));
          return res.end(JSON.stringify({ success: true, authToken: newToken }));
        }
        else if(data.deleteAcc) {
          const userFile = directoryPath + data.username + '/' + data.username + '.txt';
          let userData;
          try {
            userData = JSON.parse(fs.readFileSync(userFile, "utf8"));
          } catch {
            res.writeHead(404);
            return res.end(JSON.stringify({ error: "User file not found" }));
          }
          // Check auth: password or bearer token
          if (!Array.isArray(userData.authTokens)) userData.authTokens = [];
          const now = Date.now();
          userData.authTokens = userData.authTokens.filter(t => t && t.expires && t.expires > now);
          let tokenFromHeaderDelete = null;
          if (typeof authHeader === 'string' && authHeader.startsWith('Bearer ')) tokenFromHeaderDelete = authHeader.slice(7).trim();
          const tokenValidDelete = tokenFromHeaderDelete && userData.authTokens.some(t => t.token === tokenFromHeaderDelete && t.expires > now);
          if(!(data.password === userData.password || tokenValidDelete)) {
            return res.end(JSON.stringify({ error: "wrong password" }));
          }
          try {
            fs.unlinkSync(sessionPath + userData.id + '.rhfsession');
          } catch (e) {
            console.log('Session file delete error:', e.message);
          }
          // Clean up any file watchers and WebSocket connections before deletion
          try {
            cleanupUserWatcher(data.username, true);
            console.log(`[DELETE] Cleaned up watchers for user: ${data.username}`);
          } catch (e) {
            console.error('[DELETE] Error cleaning up watchers:', e.message);
          }
          const targetDir = directoryPath + data.username;
          try {
            if (fs.existsSync(targetDir)) {
              console.log(`[DELETE] Target directory exists: ${targetDir}`);
              console.log(`[DELETE] Directory contents before deletion:`, fs.readdirSync(targetDir));
              fs.rmSync(targetDir, { recursive: true, force: true });
              console.log(`[DELETE] rmSync completed for: ${targetDir}`);
            } else {
              console.log(`[DELETE] Directory not found: ${targetDir}`);
            }
            // verify removal with slight delay
            setTimeout(() => {
              if (fs.existsSync(targetDir)) {
                console.error(`[DELETE] VERIFICATION FAILED - Directory still exists: ${targetDir}`);
              } else {
                console.log(`[DELETE] VERIFICATION SUCCESS - Directory removed: ${targetDir}`);
              }
            }, 100);
            
            // Double check immediately
            if (fs.existsSync(targetDir)) {
              console.error('Failed to remove user directory:', targetDir);
              console.log('Directory still contains:', fs.readdirSync(targetDir));
              return res.end(JSON.stringify({ error: 'failed to remove account directory' }));
            }
            console.log(`Directory deleted: ${targetDir}`);
            return res.end(JSON.stringify({ success: true }));
          } catch (e) {
            console.error('Error deleting user directory:', e.message);
            console.error('Error code:', e.code);
            console.error('Error path:', e.path);
            return res.end(JSON.stringify({ error: 'failed to remove account directory', details: String(e) }));
          }
        } else if(data.changeBrightness) {
          const userFile = directoryPath + data.username + '/' + data.username + '.txt';
          let userData;
          try {
            userData = JSON.parse(fs.readFileSync(userFile, "utf8"));
          } catch {
            res.writeHead(404);
            return res.end(JSON.stringify({ error: "User file not found" }));
          }
          userData.brightness = data.brightness;
          fs.writeFileSync(userFile, JSON.stringify(userData, null, 2));
        }
        else if(data.changeVolume) {
          const userFile = directoryPath + data.username + '/' + data.username + '.txt';
          let userData;
          try {
            userData = JSON.parse(fs.readFileSync(userFile, "utf8"));
          } catch {
            res.writeHead(404);
            return res.end(JSON.stringify({ error: "User file not found" }));
          }
          userData.volume = data.volume;
          fs.writeFileSync(userFile, JSON.stringify(userData, null, 2));
        }
        else if(data.setTheme) {
          const userFile = directoryPath + data.username + '/' + data.username + '.txt';
          let userData;
          try {
            userData = JSON.parse(fs.readFileSync(userFile, "utf8"));
          } catch {
            res.writeHead(404);
            return res.end(JSON.stringify({ error: "User file not found" }));
          }
          userData.dark = data.dark;
          fs.writeFileSync(userFile, JSON.stringify(userData, null, 2));
        } else if (data.setAutohideTaskbar) {
          const userFile = directoryPath + data.username + '/' + data.username + '.txt';
          let userData;
          try {
            userData = JSON.parse(fs.readFileSync(userFile, "utf8"));
          } catch {
            res.writeHead(404);
            return res.end(JSON.stringify({ error: "User file not found" }));
          }
          userData.autohidetaskbar = !!data.autohidetaskbar;
          fs.writeFileSync(userFile, JSON.stringify(userData, null, 2));
        }
        else if(data.updateSiteSettings) {
          const userFile = directoryPath + data.username + '/' + data.username + '.txt';
          let userData;
          try {
            userData = JSON.parse(fs.readFileSync(userFile, "utf8"));
          } catch {
            res.writeHead(404);
            return res.end(JSON.stringify({ error: "User file not found" }));
          }
          console.log(data)
          for(let i = 0; i < userData.siteSettings.length; i++) {
            if(userData.siteSettings[i][0] === data.url) {
              userData.siteSettings[i][1] = data.newSandbox;
            }
          }
          if(data.addTheSite) {
            let a = [];
            a.push(data.url);
            a.push(data.newSandbox);
            userData.siteSettings.push(a);
          }
          userData.enableURLSync = data.enableURLSync;
          userData.lazyloading = data.lazyloading;
          fs.writeFileSync(userFile, JSON.stringify(userData, null, 2));
        }
      else if (data.requestSiteSettings) {
        console.log('req site settings');
          const userFile = directoryPath + data.username + '/' + data.username + '.txt';
          let userData;
          try {
            userData = JSON.parse(fs.readFileSync(userFile, "utf8"));
          } catch {
            res.writeHead(404);
            return res.end(JSON.stringify({ error: "User file not found" }));
          }
          responseContent = {siteSettings: userData.siteSettings};
      } else if (data.setEditorSettings) {
          // Editor settings are now stored in app-local VFS file
          // (/apps/textEditor/data/settings.json), not in the general
          // auth/system user file.
          const userFile = directoryPath + data.username + '/' + data.username + '.txt';
          let userData;
          try {
            userData = JSON.parse(fs.readFileSync(userFile, "utf8"));
          } catch {
            res.writeHead(404);
            return res.end(JSON.stringify({ error: "User file not found" }));
          }
          // Cleanup legacy field if it exists so the user file remains
          // system-only data (taskbuttons, brightness, etc.).
          if (Object.prototype.hasOwnProperty.call(userData, 'editorSettings')) {
            delete userData.editorSettings;
            fs.writeFileSync(userFile, JSON.stringify(userData, null, 2));
          }
          responseContent = { success: true };
        } else if (data.setAutoupdate) {
          const userFile = directoryPath + data.username + '/' + data.username + '.txt';
          let userData;
          try {
            userData = JSON.parse(fs.readFileSync(userFile, "utf8"));
          } catch {
            res.writeHead(404);
            return res.end(JSON.stringify({ error: "User file not found" }));
          }
          userData.autoupdate = !!data.autoupdate;
          fs.writeFileSync(userFile, JSON.stringify(userData, null, 2));
          responseContent = { success: true };
        }    
      } catch (err) {
        console.error(err);
        responseContent = { error: 'Invalid JSON or server error' };
      }

      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify(responseContent)); // send exactly once
    });
  } else {
    res.writeHead(405);
    res.end(JSON.stringify({ error: 'Send a POST request with JSON' }));
  }
}

function startServer(port = 8082, host = '0.0.0.0') {
  const server = http.createServer(handleZMCd);
  server.listen(port, host, () => {
    console.log(`zmcd server listening on port ${port}`);
  });
  return server;
}

module.exports = { handleZMCd, startServer };
