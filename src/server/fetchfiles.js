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
      // Avoid reading entire file into memory when listing folders.
      // Return metadata (name, relativePath, size) instead of base64 content.
      const stat = await fsp.stat(fullPath);
      files.push({
        name: entry.name,
        relativePath: path.relative(base, fullPath).replace(/\\/g, '/'),
        size: stat.size
      });
    }
  }

  return files;
}

let directoryPath = path.resolve(__dirname, './zmcdfiles');
if (!fs.existsSync(directoryPath)) fs.mkdirSync(directoryPath, { recursive: true });

// Storage quota (bytes). Can be overridden by env var STORAGE_QUOTA_BYTES.
const DEFAULT_QUOTA_BYTES = Number(process.env.STORAGE_QUOTA_BYTES) || 1 * 1024 * 1024 * 1024; // 1 GB default
// How old can upload part files be before we consider them stale and remove them (hours)
const UPLOAD_PART_TTL_HOURS = Number(process.env.UPLOAD_PART_TTL_HOURS) || 24; // default 24 hours

// Server-side clipboard storage: persist clipboard per user across requests
const userClipboards = new Map(); // username -> clipboard state

// ─────────────────────────────
// Helpers
// ─────────────────────────────


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

async function handleFetchfiles(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    res.writeHead(204);
    return res.end();
  }

  // Support simple streaming download endpoint for large files.
  if (req.method === 'GET' && req.url && req.url.startsWith('/download')) {
    try {
      const { URL } = require('url');
      const full = new URL(req.url, `http://${req.headers.host}`);
      const username = full.searchParams.get('username');
      const rel = full.searchParams.get('path');
      if (!username || !rel) {
        res.writeHead(400);
        return res.end('missing username or path');
      }
      const userRoot = path.join(directoryPath, username, 'root');
      const abs = path.join(userRoot, rel);
      if (!fs.existsSync(abs)) {
        res.writeHead(404);
        return res.end('not found');
      }
      const stat = await fsp.stat(abs);
      if (stat.isDirectory()) {
        res.writeHead(400);
        return res.end('path is a directory');
      }
  res.setHeader('Content-Length', stat.size);
  res.setHeader('Content-Disposition', `attachment; filename="${path.basename(abs)}"`);
      const stream = fs.createReadStream(abs);
      stream.pipe(res);
      stream.on('error', (e) => {
        console.error('stream error', e);
        res.destroy();
      });
      return;
    } catch (e) {
      console.error('download error', e);
      res.writeHead(500);
      return res.end('server error');
    }
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
        const clipboard = userClipboards.get(username) || null;
        return res.end(JSON.stringify({ tree, clipboard }));
      }


      // 2️⃣ REQUEST FILE (supports chunked download for large files)
if (data.requestFile) {
  const fullPath = path.join(userRoot, data.requestFileName);
  const stat = await fsp.stat(fullPath);
  
  if (stat.isFile()) {
    const fileSize = stat.size;
    const chunkSize = 10 * 1024 * 1024; // 10MB chunks
    const chunkIndex = typeof data.chunkIndex === 'number' ? data.chunkIndex : 0;
    const start = chunkIndex * chunkSize;
    const end = Math.min(start + chunkSize, fileSize);
    const isLastChunk = end >= fileSize;
    
    // For small files, send whole file as base64
    if (fileSize <= chunkSize) {
      const buffer = await fsp.readFile(fullPath);
      const filecontent = buffer.toString('base64');
      return res.end(JSON.stringify({ filecontent, fileSize, isLastChunk: true }));
    }
    
    // For large files, stream only the requested chunk (avoids loading whole file)
    async function readChunkStream(fp, s, e) {
      return new Promise((resolve, reject) => {
        const parts = [];
        const rs = fs.createReadStream(fp, { start: s, end: e - 1 });
        rs.on('data', (c) => parts.push(c));
        rs.on('end', () => resolve(Buffer.concat(parts)));
        rs.on('error', (err) => reject(err));
      });
    }

    const chunkBuffer = await readChunkStream(fullPath, start, end);
    const chunkBase64 = chunkBuffer.toString('base64');
    return res.end(JSON.stringify({
      filecontent: chunkBase64,
      fileSize,
      chunkIndex,
      isLastChunk,
      totalChunks: Math.ceil(fileSize / chunkSize)
    }));
  }

  if (stat.isDirectory()) {
    const files = await walkDir(fullPath);
    return res.end(JSON.stringify({
      kind: 'folder',
      files: files
    }));
  }
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
  let base = path.basename(destPath, ext);

  // Strip any leading numeric prefix of the form "(n) " to avoid nesting like "(1)(24) name.ext"
  const leadMatch = base.match(/^\((\d+)\)\s*(.*)$/);
  if (leadMatch) base = leadMatch[2] || '';

  const compareName = base + ext;

  // Read existing entries in the directory and determine the maximum numeric prefix for compareName
  let entries = [];
  try {
    entries = await fsp.readdir(dir);
  } catch (e) {
    // Directory may not exist yet; fall back to returning the original candidate
    return path.join(dir, compareName);
  }

  let found = false;
  let maxNum = -Infinity;
  for (const name of entries) {
    if (name === compareName) {
      found = true;
      maxNum = Math.max(maxNum, 0);
      continue;
    }
    const m = name.match(/^\((\d+)\)\s*(.*)$/);
    if (m && m[2] === compareName) {
      found = true;
      const n = parseInt(m[1], 10);
      if (!Number.isNaN(n)) maxNum = Math.max(maxNum, n);
    }
  }

  if (!found) return path.join(dir, compareName);

  const newName = `(${maxNum + 1}) ${base}${ext}`;
  return path.join(dir, newName);
}

async function applyDirections(rootPath, directions, username) {
  // result object used to return information back to the caller
  const result = {};
  // Initialize clipboard from server storage or create new
  let clipboard = userClipboards.get(username) || null;

  const resolvePath = (p = '') => {
    // Normalize and support several caller conventions:
    // - empty or 'root' -> rootPath
    // - 'root/dir/sub' -> drop leading 'root'
    // - 'dir/sub' -> relative to rootPath
    if (!p || p === 'root') return rootPath;
    const parts = p.split('/').filter(Boolean);
    if (parts[0] === 'root') parts.shift();
    return path.join(rootPath, ...parts);
  }

  // Helper: compute total size (bytes) of a directory recursively
  async function getDirSizeBytes(dir) {
    let total = 0;
    try {
      const entries = await fsp.readdir(dir, { withFileTypes: true });
      for (const entry of entries) {
        // Skip temporary copy folders used during paste operations
        if (entry.name && entry.name.startsWith('.temp')) continue;
        const full = path.join(dir, entry.name);
        if (entry.isDirectory()) {
          total += await getDirSizeBytes(full);
        } else if (entry.isFile()) {
          try {
            const s = await fsp.stat(full);
            total += s.size || 0;
          } catch (e) {
            // ignore stat errors for individual files
          }
        }
      }
    } catch (e) {
      // dir may not exist yet
    }
    return total;
  }

  // Helper: read a user's maxSpace (GB) from their user file and return bytes
  async function getUserQuotaBytes(rootPath) {
    try {
      const userDir = path.dirname(rootPath); // .../username
      const username = path.basename(userDir);
      const userFile = path.join(userDir, `${username}.txt`);
      const txt = await fsp.readFile(userFile, 'utf8');
      const obj = JSON.parse(txt);
      if (obj && typeof obj.maxSpace === 'number' && obj.maxSpace > 0) {
        return obj.maxSpace * 1024 * 1024 * 1024;
      }
    } catch (e) {
      // ignore and fall through to default
    }
    return DEFAULT_QUOTA_BYTES;
  }
  // Prepare per-user temp directory for chunked uploads
  const userDir = path.dirname(rootPath); // .../username
  const userTempDir = path.join(userDir, '.uploads_temp');
  await fsp.mkdir(userTempDir, { recursive: true });

  // Cleanup stale part files for this user on every apply (keeps disk usage bounded)
  try {
    const ttlMs = UPLOAD_PART_TTL_HOURS * 60 * 60 * 1000;
    const now = Date.now();
    const parts = await fsp.readdir(userTempDir).catch(() => []);
    for (const p of parts) {
      try {
        if (!p.includes('.part.')) continue;
        const st = await fsp.stat(path.join(userTempDir, p));
        if (now - st.mtimeMs > ttlMs) {
          await fsp.rm(path.join(userTempDir, p), { force: true });
        }
      } catch (e) {
        // ignore individual errors
      }
    }
  } catch (e) {
    // best-effort cleanup
    console.error('stale part cleanup error', e);
  }

  for (const dir of directions) {
 if (dir.addFolder) {
  console.log(dir.path)
  // dir.path may be either the parent folder (where to create) OR
  // a full target path that already includes the new folder name.
  // Normalize: if dir.name provided, treat dir.path as parent; otherwise
  // try to derive name from path.
  let parentPath = resolvePath(dir.path || 'root');
  let folderPath;
  if (dir.name && dir.name.length) {
    folderPath = path.join(parentPath, dir.name);
  } else {
    // If no explicit name, assume dir.path includes the new name
    // e.g. 'root/a/newFolder' -> parent = 'root/a' name = 'newFolder'
    const parts = (dir.path || '').split('/').filter(Boolean);
    if (parts.length > 1) {
      const name = parts.pop();
      parentPath = resolvePath('root/' + parts.join('/'));
      folderPath = path.join(parentPath, name);
    } else {
      // fallback: create under parentPath with a timestamped name
      folderPath = path.join(parentPath, `new-folder-${Date.now()}`);
    }
  }

  await ensureDir(parentPath);

  // If an entry exists at the target path, ensure it's a directory.
  if (await exists(folderPath)) {
    const stat = await fsp.stat(folderPath);
    if (!stat.isDirectory()) {
      throw new Error(`Cannot create folder, file exists: ${folderPath}`);
    }
    // already a folder → OK
  } else {
    await fsp.mkdir(folderPath, { recursive: true });
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
        try {
      const oldPath = resolvePath(dir.path);
      const oldRel = dir.path.split('/').slice(1).join('/');
      const newPath = path.join(path.dirname(oldPath), dir.newName);
      const newRel = path.join(path.dirname(oldRel), dir.newName).replace(/\\/g, '/');
      await fsp.rename(oldPath, newPath);

      // Update any server-side clipboard entries that reference the renamed path
      try {
        if (clipboard && Array.isArray(clipboard)) {
          clipboard = clipboard.map((c) => {
            if (!c || typeof c.path !== 'string') return c;
            if (c.path === oldRel) {
              return { ...c, path: newRel, name: dir.newName };
            }
            if (c.path.startsWith(oldRel + '/')) {
              return { ...c, path: newRel + c.path.slice(oldRel.length) };
            }
            return c;
          });
        }
      } catch (e) {
        // ignore clipboard update failures
      }

        } catch(e) {console.log(e)}
      continue;
    }

    if (dir.delete) {
      const targetPath = resolvePath(dir.path);
      if(targetPath.split('/').at(-1) === 'apps') {
        continue; // prevent deleting 'apps' folder
      }
      await fsp.rm(targetPath, { recursive: true, force: true });

      // Clean up any server-side clipboard entries that reference this path
      try {
        const rel = dir.path.split('/').slice(1).join('/'); // remove leading "root"
        if (clipboard && Array.isArray(clipboard)) {
          clipboard = clipboard.filter((c) => {
            if (!c || typeof c.path !== 'string') return true;
            // If deleting a folder, remove entries inside it as well
            return !(c.path === rel || c.path.startsWith(rel + '/'));
          });
        }
      } catch (e) {
        // ignore cleanup failures
      }

      continue;
    }

    if (dir.copy) {
        // Store the list of items to clipboard and avoid creating on-disk temp copies.
        // Copy will be performed at paste time from the live location; if the source
        // no longer exists when pasting, the operation will fail (matching real cloud drive behavior).
        clipboard = dir.directions;
      continue;
    }

    if (dir.paste && clipboard) {
        const destinationDir = path.join(userRoot, dir.path);
        // Resolve per-user quota and current usage once
        const quota = await getUserQuotaBytes(userRoot);
        let currentUsed = await getDirSizeBytes(userRoot);

        // Check and copy/move each item; abort the whole paste if any item would exceed quota
        for (const item of clipboard) {
          const src = path.join(userRoot, item.path);

          // ensure source still exists
          if (!fs.existsSync(src)) {
            continue; // skip missing source
          }

          // compute size of src (could be folder)
          const srcSize = await getDirSizeBytes(src);

          if (currentUsed + srcSize > quota) {
            throw new Error(`Storage quota exceeded: cannot paste "${path.basename(item.path)}" (${srcSize} bytes)`);
          }

          let dest = path.join(destinationDir, path.basename(item.path));

          // 🔑 collision handling
          dest = await getUniquePath(dest);

          // If this is a cut/move operation and moving a folder, prevent moving into itself
          if (item.isCut) {
            const st = await fsp.stat(src);
            if (st.isDirectory()) {
              const rel = path.relative(src, dest);
              if (rel === '' || (!rel.startsWith('..') && !path.isAbsolute(rel))) {
                throw new Error(`Cannot move folder into itself or a subfolder: ${item.path}`);
              }
            }
          }

          if (item.isCut) {
            // Move/rename
            await fsp.mkdir(path.dirname(dest), { recursive: true });
            await fsp.rename(src, dest);
          } else {
            // Copy
            await fsp.cp(src, dest, {
              recursive: true,
              force: false
            });
          }

          // increase currentUsed so subsequent items are checked correctly
          currentUsed += srcSize;
        }
      continue;
    }

    if (dir.edit) {
      // Two modes supported for edits:
      // 1) Small inline edit: dir.contents (base64 string)
      // 2) Chunked upload: dir.chunk (single part), dir.chunks (array of parts), and dir.finalize/dir.finalizeUpload to assemble
      const destRel = dir.path || '';
      console.log(destRel)
      const filePath = resolvePath(destRel);
      console.log(filePath)

      // If caller requests replace:true, remove existing file and any temp parts
      if (dir.replace) {
        console.log(dir.path)
        try {
          // remove existing final file if present
          await fsp.rm(filePath, { force: true, recursive: false });
        } catch (e) {
          // ignore errors
        }
        try {
          // remove temp part files for this target
          const safeName = destRel.replace(/\\/g, '_').replace(/[^a-zA-Z0-9._-]/g, '_');
          const parts = (await fsp.readdir(userTempDir)).filter(f => f.startsWith(`${safeName}.part.`));
          for (const p of parts) await fsp.rm(path.join(userTempDir, p), { force: true });
        } catch (e) {
          // ignore cleanup errors
        }
      }

      // Special request: check which part files already exist for resume support
      if (dir.checkParts) {
        const destRel = dir.path || '';
        const safeName = destRel.replace(/\\/g, '_').replace(/[^a-zA-Z0-9._-]/g, '_');
        let parts = (await fsp.readdir(userTempDir)).filter(f => f.startsWith(`${safeName}.part.`));

        // If no parts found, attempt to discover parts using alternative naming
        // strategies (sanitization mismatches, omitted leading 'root', or basename-only).
        if (!parts || parts.length === 0) {
          try {
            const all = await fsp.readdir(userTempDir);
            // write directory snapshot for diagnostics
            try { await fsp.writeFile(path.join(userTempDir, `${safeName}.tempdir.json`), JSON.stringify(all, null, 2)); } catch (e) {}

            // candidate names to try
            const candidates = new Set();
            candidates.add(safeName);
            if (safeName.startsWith('root_')) candidates.add(safeName.replace(/^root_/, ''));
            // try using only basename
            candidates.add(path.basename(destRel).replace(/[^a-zA-Z0-9._-]/g, '_'));
            // also try url-encoded and decoded variants
            candidates.add(encodeURIComponent(safeName));
            candidates.add(decodeURIComponent(safeName));

            for (const c of candidates) {
              const found = all.filter(f => f.startsWith(`${c}.part.`));
              if (found && found.length) {
                parts = found;
                console.warn('VFS finalize: found parts using alternative candidate', c, 'count', found.length);
                break;
              }
            }
          } catch (e) {
            // ignore
          }
        }
        const indices = parts.map(p => {
          const m = p.match(/\.part\.(\d+)$/);
          return m ? Number(m[1]) : NaN;
        }).filter(n => !Number.isNaN(n));
        result.checkParts = result.checkParts || {};
        result.checkParts[destRel] = indices.sort((a, b) => a - b);
        continue;
      }

      // 2a) Chunk(s) provided as an array
      if (Array.isArray(dir.chunks) && dir.chunks.length) {
        for (const ch of dir.chunks) {
          const idxNum = Number.isFinite(Number(ch.index)) ? Number(ch.index) : 0;
          const idx = String(Number(idxNum)).padStart(6, '0');
          const chunkBase64 = ch.chunk || ch.data || ch.contents || '';
          const safeName = destRel.replace(/\\/g, '_').replace(/[^a-zA-Z0-9._-]/g, '_');
          const partPath = path.join(userTempDir, `${safeName}.part.${idx}`);
          const buffer = Buffer.from(chunkBase64, 'base64');
          await fsp.writeFile(partPath, buffer);
        }
        continue;
      }

      // 2b) Single chunk entry
      if (dir.chunk) {
        const idxNum = Number.isFinite(Number(dir.index)) ? Number(dir.index) : 0;
        const idx = String(Number(idxNum)).padStart(6, '0');
        const chunkBase64 = dir.chunk || '';
        const safeName = destRel.replace(/\\/g, '_').replace(/[^a-zA-Z0-9._-]/g, '_');
        const partPath = path.join(userTempDir, `${safeName}.part.${idx}`);
        const buffer = Buffer.from(chunkBase64, 'base64');
        await fsp.writeFile(partPath, buffer);
        continue;
      }

      // 2c) Finalize assembly if requested
      if (dir.finalize || dir.finalizeUpload) {
        // Ensure target dir exists
        await fsp.mkdir(path.dirname(filePath), { recursive: true });

        const safeName = destRel.replace(/\\/g, '_').replace(/[^a-zA-Z0-9._-]/g, '_');
        const parts = (await fsp.readdir(userTempDir)).filter(f => f.startsWith(`${safeName}.part.`));

        // Quota check: sum parts (also collect diagnostics)
        let partsTotal = 0;
        const partsInfo = [];
        for (const p of parts) {
          const pth = path.join(userTempDir, p);
          let s = { size: 0 };
          try { s = await fsp.stat(pth); } catch (e) { /* ignore stat errors */ }
          partsTotal += s.size || 0;
          partsInfo.push({ name: p, size: s.size || 0 });
        }

        // Write diagnostic parts file to help debug zero-byte assembly issues
        try {
          await fsp.writeFile(path.join(userTempDir, `${safeName}.parts.json`), JSON.stringify(partsInfo, null, 2));
        } catch (e) {
          console.warn('VFS: failed to write parts diagnostic file', e);
        }

        console.warn('VFS finalize:', { safeName, partsCount: parts.length, partsTotal, filePath });

        if (parts.length === 0 || partsTotal === 0) {
          console.error('VFS finalize: no parts or zero total bytes for', safeName, filePath);
          // Throw to surface error to caller so the client can retry instead of creating 0-byte file
          throw new Error(`No upload parts found for ${safeName}`);
        }
        const quota = await getUserQuotaBytes(rootPath);
        const currentUsed = await getDirSizeBytes(rootPath);
        if (currentUsed + partsTotal > quota) {
          for (const p of parts) await fsp.rm(path.join(userTempDir, p), { force: true });
          throw new Error(`Storage quota exceeded: cannot finalize upload ${dir.path}`);
        }

        parts.sort((a, b) => {
          const ma = a.match(/\.part\.(\d+)$/);
          const mb = b.match(/\.part\.(\d+)$/);
          const ai = ma ? Number(ma[1]) : 0;
          const bi = mb ? Number(mb[1]) : 0;
          return ai - bi;
        });

        const writeStream = fs.createWriteStream(filePath, { flags: 'w' });
        for (const p of parts) {
          const pth = path.join(userTempDir, p);
          const buffer = await fsp.readFile(pth);
          await new Promise((resolve, reject) => {
            writeStream.write(buffer, (err) => {
              if (err) reject(err);
              else resolve();
            });
          });
          await fsp.rm(path.join(userTempDir, p), { force: true });
        }
        await new Promise((resolve, reject) => {
          writeStream.end((err) => {
            if (err) reject(err);
            else resolve();
          });
        });
        continue;
      }

      // 1) Inline small-file edit (unchanged behavior)
      if (typeof dir.contents === 'string') {
        const buffer = Buffer.from(dir.contents, 'base64');
        // Ensure destination directory exists
        await fsp.mkdir(path.dirname(filePath), { recursive: true });

        // Check quota: determine existing file size (if any) and new size
        const newSize = buffer.length;
        let oldSize = 0;
        try {
          const st = await fsp.stat(filePath);
          if (st.isFile()) oldSize = st.size || 0;
        } catch (e) {
          // file may not exist yet
        }

        const currentUsed = await getDirSizeBytes(rootPath);
        const delta = newSize - oldSize;
        const quota = await getUserQuotaBytes(rootPath);
        if (delta > 0 && currentUsed + delta > quota) {
          throw new Error(`Storage quota exceeded: cannot write ${path.basename(filePath)} (${delta} additional bytes)`);
        }

        console.log(filePath, buffer.length);
        await fsp.writeFile(filePath, buffer);
        continue;
      }

      // nothing matched: skip
      continue;
    }
    if(dir.end) {
        // Persist clipboard to server storage for this user
        if (clipboard) {
          userClipboards.set(username, clipboard);
        } else {
          userClipboards.delete(username);
        }
    }
  }
  // Include clipboard in result so client can sync it
  result.clipboard = clipboard;
  // return any collected results (e.g., checkParts)
  return result;
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
  const result = await applyDirections(userRoot, data.directions, username);

  return res.end(JSON.stringify({ success: true, result, clipboard: result.clipboard }));
}


      res.writeHead(400);
      res.end(JSON.stringify({ error: 'Unknown action' }));

    } catch (err) {
      console.error(err);
      res.writeHead(500);
      res.end(JSON.stringify({ error: err.message }));
    }
  });
}

function startServer(port = 8083, host = '0.0.0.0') {
  const server = http.createServer((req, res) => handleFetchfiles(req, res));
  server.listen(port, host, () => {
    console.log(`fetchfiles server listening on port ${port}`);
  });
  return server;
}

module.exports = { handleFetchfiles, startServer };
