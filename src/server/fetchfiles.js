const http = require('http');
const fs = require('fs-extra');
const path = require('path');
const fsp = require('fs/promises');
async function walkDir(dir, base = dir) {
  const entries = await fsp.readdir(dir, { withFileTypes: true });
  const files = [];

  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);

    if (entry.isDirectory()) {
      files.push(...await walkDir(fullPath, base));
    } else {
      const buffer = await fsp.readFile(fullPath);
      files.push({
        name: entry.name,
        relativePath: path.relative(base, fullPath).replace(/\\/g, '/'),
        content: buffer.toString('base64')
      });
    }
  }

  return files;
}

const directoryPath = '/Users/baoer/Dev/projects/rammerhead/src/server/zmcdfiles/';
if (!fs.existsSync(directoryPath)) fs.mkdirSync(directoryPath, { recursive: true });

// ─────────────────────────────
// Helpers
// ─────────────────────────────

async function readFile(filePath, asBase64 = false) {
  const data = await fsp.readFile(filePath);
  return asBase64 ? data.toString('base64') : data.toString('utf8');
}
async function readFileAsBase64(filePath) {
  const data = await fsp.readFile(filePath); // Buffer
  return data.toString('base64');            // Convert buffer to base64
}
async function buildUserFileTree(rootPath) {
  async function walk(dir) {
    const entries = await fsp.readdir(dir, { withFileTypes: true });
    const nodes = [];

    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name);

      if (entry.isDirectory()) {
        nodes.push([entry.name, await walk(fullPath)]);
      } else {
        const stats = await fsp.stat(fullPath);

        // READ FILE AS BUFFER
        // const buffer = await fsp.readFile(fullPath);

        nodes.push([
          entry.name,
          null,
          {
            size: stats.size,
            // content: buffer.toString('base64'), // ✅ base64 content
          }
        ]);
      }
    }

    return nodes;
  }

  return ['root', await walk(rootPath)];
}



// ─────────────────────────────
// Server
// ─────────────────────────────

const server = http.createServer(async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    res.writeHead(204);
    return res.end();
  }

  if (req.method !== 'POST') {
    res.writeHead(405);
    return res.end();
  }

  let body = '';
  req.on('data', c => body += c);
  req.on('end', async () => {
    let data;
    try {
      data = JSON.parse(body);
    } catch {
      res.writeHead(400);
      return res.end(JSON.stringify({ error: 'Invalid JSON' }));
    }

    const username = data.username;
    const userRoot = path.join(directoryPath, username, 'root');
    await fsp.mkdir(userRoot, { recursive: true });

    try {
      // 1️⃣ GET TREE
      if (data.initFE) {
        const tree = await buildUserFileTree(userRoot);
        return res.end(JSON.stringify({ tree }));
      }

      // 2️⃣ REQUEST FILE
if (data.requestFile) {
  const fullPath = path.join(userRoot, data.requestFileName);
console.log(fullPath)

  // Read as raw buffer

  // Convert to base64
const stat = await fsp.stat(fullPath);
console.log(stat)
if (stat.isFile()) {
      const buffer = await fsp.readFile(fullPath);
  const filecontent = buffer.toString('base64');
  return res.end(JSON.stringify({ filecontent }));
}

if (stat.isDirectory()) {
  const files = await walkDir(fullPath);
  console.log(files)
  return res.end(JSON.stringify({
    kind: 'folder',
    files: files
  }));
}
}
function ensurePath(tree, pathParts) {
  let current = tree;
  for (const part of pathParts) {
    if (!current[1]) current[1] = [];
    let child = current[1].find(n => n[0] === part);
    if (!child) {
      child = [part, []]; // folder
      current[1].push(child);
    }
    current = child;
  }
  return current; // returns the node at path
}

async function exists(p) {
  try {
    await fsp.stat(p);
    return true;
  } catch {
    return false;
  }
}

async function ensureDir(p) {
  await fsp.mkdir(p, { recursive: true });
}
async function getUniquePath(destPath) {
  const dir = path.dirname(destPath);
  const ext = path.extname(destPath);
  const base = path.basename(destPath, ext);

  let attempt = 0;
  let candidate = destPath;

  while (true) {
    try {
      await fsp.access(candidate);
      attempt++;
      candidate = path.join(
        dir,
        `(${attempt}) ${base}${ext}`
      );
    } catch {
      return candidate; // does not exist
    }
  }
}

async function applyDirections(rootPath, directions) {
  let clipboard = null; // holds copied path or temp data

  const resolvePath = (p) =>
    path.join(rootPath, ...p.split('/').slice(1)); // drop "root"

  for (const dir of directions) {
 if (dir.addFolder) {
  const parentPath = resolvePath(dir.path);
  const folderPath = path.join(parentPath, dir.name);

  await ensureDir(parentPath);

  // 🚨 Detect file collision
  if (await exists(folderPath)) {
    const stat = await fsp.stat(folderPath);
    if (!stat.isDirectory()) {
      throw new Error(`Cannot create folder, file exists: ${folderPath}`);
    }
    // already a folder → OK
  } else {
    await fsp.mkdir(folderPath);
  }

  continue;
}

    if (dir.addFile) {
      const filePath = resolvePath(dir.path);
      await fsp.mkdir(path.dirname(filePath), { recursive: true });
      await fsp.writeFile(filePath, '');
      continue;
    }

    if (dir.rename) {
      const oldPath = resolvePath(dir.path);
      const newPath = path.join(path.dirname(oldPath), dir.newName);
      await fsp.rename(oldPath, newPath);
      continue;
    }

    if (dir.delete) {
      const targetPath = resolvePath(dir.path);
      await fsp.rm(targetPath, { recursive: true, force: true });
      continue;
    }

    if (dir.copy) {
        clipboard = dir.directions;
      continue;
    }

    if (dir.paste && clipboard) {
        const destinationDir = resolvePath(dir.path);

        for (const item of clipboard) {
        const src = path.join(userRoot, item.path);

        let dest = path.join(
            destinationDir,
            path.basename(item.path)
        );

        // 🔑 collision handling
        dest = await getUniquePath(dest);

        console.log("SRC :", src);
        console.log("DEST:", dest);

        await fsp.cp(src, dest, {
            recursive: true,
            force: false
        });
        }
      continue;
    }

    if (dir.edit) {
      const filePath = resolvePath(dir.path);
      const buffer = Buffer.from(dir.contents ?? '', 'base64');
      console.log(filePath, buffer)
      await fsp.writeFile(filePath, buffer);
      continue;
    }
  }
}
function copyRecursive(src, dest) {
    fs.copy(src, dest)
}

function getNode(node, pathParts) {
  let current = node;
  for (const part of pathParts) {
    if (!current[1]) return null;
    current = current[1].find(n => n[0] === part);
    if (!current) return null;
  }
  return current;
}
function removeNodeFromTree(node, pathParts) {
  if (!node[1]) return false;
  const [target, ...rest] = pathParts;

  for (let i = 0; i < node[1].length; i++) {
    const child = node[1][i];
    if (child[0] === target) {
      if (rest.length === 0) {
        node[1].splice(i, 1);
        return true;
      } else {
        return removeNodeFromTree(child, rest);
      }
    }
  }
  return false;
}
if (data.saveSnapshot) {
  // Apply all frontend directions to build tree
  applyDirections(userRoot, data.directions);

  return res.end(JSON.stringify({ success: true }));
}


      // 3️⃣ SAVE (single authoritative commit)
      if (data.saveSnapshot) {
        await fsp.rm(userRoot, { recursive: true, force: true });
        await fsp.mkdir(userRoot, { recursive: true });
        console.log(data.tree);
        await writeTreeToDisk(data.tree, userRoot);

        return res.end(JSON.stringify({ success: true }));
      }

      res.writeHead(400);
      res.end(JSON.stringify({ error: 'Unknown action' }));

    } catch (err) {
      console.error(err);
      res.writeHead(500);
      res.end(JSON.stringify({ error: err.message }));
    }
  });
});

server.listen(8083, () => {
  console.log('Server listening on port 8083');
});
