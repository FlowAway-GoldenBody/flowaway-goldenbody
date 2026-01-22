const http = require('http');
const generateId = require('../util/generateId');
const fs = require('fs');
const path = require('path');
const RammerheadSessionFileCache = require('../classes/RammerheadSessionFileCache.js');
const RammerheadLogging = require('../classes/RammerheadLogging');
const RammerheadSession = require('../classes/RammerheadSession');

const logger = new RammerheadLogging({ logLevel: 'debug' });
const store = new RammerheadSessionFileCache({ logger });
let directoryPath = path.resolve(__dirname, './zmcdfiles');
directoryPath += '/';
console.log(directoryPath)
let sessionPath = path.resolve(__dirname, '../../sessions');
sessionPath += '/'
console.log(sessionPath)

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

const server = http.createServer((req, res) => {
  // Allow CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

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
            const newContent = {
              username: filecontents.username,
              password: filecontents.password,
              id: sessionId,
              needNewAcc: false,
              taskbuttons: filecontents.taskbuttons
            };
            // console.log(newContent);
            const sfiles = fs.readdirSync(sessionPath).filter(f => !f.startsWith('.'));
            for(const sfileName of sfiles) {
              if(sfileName == originalId + '.rhfsession') {
                // console.log(sfileName)
                deleteFile(sessionPath + originalId + '.rhfsession');
              }
            }
            fs.writeFileSync(directoryPath + filecontents.username + '/' + filecontents.username + '.txt', JSON.stringify(newContent));

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
              needNewAcc: false,
              taskbuttons: ['browser', 'fileExplorer', 'settings'],
              brightness: 100,
              volume: 40,
              dark: false,
              siteSettings: []
            };
            fs.mkdirSync(directoryPath + data.username, { recursive: true });
            let userDirectoryPath = directoryPath + data.username + '/';
            fs.writeFileSync(userDirectoryPath + data.username + '.txt', JSON.stringify(newContent));
            responseContent = newContent;
          }
        } else {
          // Check credentials
          const foldernames = getFolderNamesSync(directoryPath);
          for (const foldername of foldernames) {
            let content;
            try {
              content = JSON.parse(fs.readFileSync(directoryPath + data.username + '/' + data.username + '.txt', 'utf8'));
              // console.log(content);
            } catch (e) {
              responseContent = 'error: invalid username or password'; // + ', original error: ' + e;
              break;
            }
            if (content.username === data.username && content.password === data.password) {
              if(!content.taskbuttons) {
                  content.taskbuttons = ['browser', 'fileExplorer', 'settings'];
                  fs.writeFileSync(directoryPath + data.username + '/' + data.username + '.txt', JSON.stringify(content));
              }
              responseContent = content;
              break;
            }
            else {
              responseContent = 'error: invalid username or password'; // + ', original error: ' + e;
              break;
            }
          }

        }
        if(data.edittaskbuttons) {
          let content = JSON.parse(fs.readFileSync(directoryPath + data.username + '/' + data.username + '.txt'));
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
          if (data.oldPassword !== userData.password) {
            return res.end(JSON.stringify({ error: "old password is wrong" }));
          }

          userData.password = data.newPassword;

          fs.writeFileSync(userFile, JSON.stringify(userData, null, 2));
          return res.end(JSON.stringify({ success: true }));
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
          if(data.password !== userData.password) {
            return res.end(JSON.stringify({ error: "wrong password" }));
          }
          fs.unlinkSync(sessionPath + userData.id + '.rhfsession');
          fs.rmSync(directoryPath + data.username, { recursive: true, force: true });
          console.log(`Directory deleted: ${directoryPath}`);
          return res.end(JSON.stringify({ success: true }));
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
              userData.siteSettings[i][1] = data.newAllow;
              userData.siteSettings[i][2] = data.newSandbox;
              userData.siteSettings[i][3] = data.newFullscreen; 
            }
          }
          if(data.addTheSite) {
            let a = [];
            a.push(data.url);
            a.push(data.newAllow);
            a.push(data.newSandbox);
            a.push(data.newFullscreen);
            userData.siteSettings.push(a);
          }
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
});

server.listen(8082, () => {
  console.log('Server listening on port 8082');
});
