const http = require("http");
const fs = require("fs-extra");
const path = require("path");
const fsp = require("fs/promises");

const limit = createLimiter(64);
function safeResolve(root, userPath = "") {
  const resolvedRoot = path.resolve(root);
  const resolved = path.join(root, String(userPath));

  if (
    resolved !== resolvedRoot &&
    !resolved.startsWith(resolvedRoot + path.sep)
  ) {
    throw new Error("Invalid path");
  }

  return resolved;
}
function createLimiter(maxConcurrent = 64) {
  let active = 0;
  const queue = [];

  return async (fn) => {
    if (active >= maxConcurrent) {
      await new Promise((resolve) => queue.push(resolve));
    }

    active++;

    try {
      return await fn();
    } finally {
      active--;
      queue.shift()?.();
    }
  };
}

async function walkDir(dir, base = dir) {
  let entries;

  try {
    entries = await limit(() => fsp.readdir(dir, { withFileTypes: true }));
  } catch {
    return [];
  }

  const results = await Promise.all(
    entries.map(async (entry) => {
      const fullPath = path.join(dir, entry.name);

      if (entry.isDirectory()) {
        return walkDir(fullPath, base);
      }

      try {
        const stat = await limit(() => fsp.stat(fullPath));

        return [
          {
            name: entry.name,
            relativePath: path.relative(base, fullPath).replace(/\\/g, "/"),
            size: stat.size,
          },
        ];
      } catch {
        return [];
      }
    }),
  );

  const files = [];

  for (const result of results) {
    files.push(...result);
  }

  return files;
}

function getUserAuthFilePath(username) {
  return safeResolve(directoryPath, `${username}/${username}.txt`);
}

async function readUserAuth(username) {
  const filePath = getUserAuthFilePath(username);
  const txt = await fsp.readFile(filePath, "utf8");
  const trimmed = txt.trim();
  const parsed = JSON.parse(trimmed);
  return parsed;
}

async function writeUserAuth(username, authObj) {
  const filePath = getUserAuthFilePath(username);
  const existing = await readUserAuth(username);
  const merged = {
    ...existing,
    ...authObj,
  };
  await fsp.mkdir(path.dirname(filePath), { recursive: true });
  await fsp.writeFile(filePath, JSON.stringify(merged, null, 2), "utf8");
}

async function authenticateUser(username, providedPassword, authHeader) {
  try {
    if (!username) return false;
    const userFile = safeResolve(directoryPath, `${username}/${username}.txt`);
    try {
      const txt = await fsp.readFile(userFile, "utf8");
      const obj = JSON.parse(txt);
      if (obj && typeof obj.password === "string" && obj.password.length) {
        if (providedPassword === obj.password) return true;
        // Otherwise check bearer token from header
        if (typeof authHeader === "string" && authHeader.startsWith("Bearer ")) {
          const token = authHeader.slice(7).trim();
          if (Array.isArray(obj.authTokens)) {
            const now = Date.now();
            obj.authTokens = obj.authTokens.filter((t) => t && t.expires && t.expires > now);
            const valid = obj.authTokens.some(
              (t) => t.token === token && t.expires > now
            );

            return valid;
          }
        }
        return false;
      }
      // no password set: deny
      return false;
    } catch (e) {
      // missing or unreadable user file: deny
      return false;
    }
  } catch (e) {
    return false;
  }
}

let directoryPath = path.resolve(__dirname, "./zmcdfiles");
if (!fs.existsSync(directoryPath)) fs.mkdirSync(directoryPath, { recursive: true });

function removeUnwantedStuffInPath(value) {
  let raw = String(value ?? "")
    .replace(/\\/g, "/")
    .trim();

  if (!raw) return "/";

  if (raw.startsWith("root/")) {
    raw = raw.slice(5);
  }

  const normalized = path.posix.normalize(raw.startsWith("/") ? raw : `/${raw}`);

  return normalized === "." ? "/" : normalized;
}

async function writeEditPayload(filePath, buffer, { replace = true } = {}) {
  const content = Buffer.isBuffer(buffer) ? buffer : Buffer.from(String(buffer));
  await fsp.mkdir(path.dirname(filePath), { recursive: true });

  if (replace) {
    await fsp.writeFile(filePath, content);
  } else {
    await fsp.appendFile(filePath, content);
  }
}

async function getDirSizeBytes(root) {
  let total = 0;

  async function walk(target) {
    let stat;

    try {
      stat = await fsp.stat(target);
    } catch {
      return;
    }

    if (stat.isFile()) {
      total += stat.size;
      return;
    }

    if (!stat.isDirectory()) {
      return;
    }

    let entries;
    try {
      entries = await fsp.readdir(target, { withFileTypes: true });
    } catch {
      return;
    }

    await Promise.all(
      entries.map((entry) => walk(path.join(target, entry.name)))
    );
  }

  await walk(root);
  return total;
}

async function getUserQuotaBytes(rootPath) {
  try {
    const userDir = path.dirname(rootPath);
    const uname = path.basename(userDir);
    const authPath = path.join(userDir, `${uname}.txt`);
    const authTxt = await fsp.readFile(authPath, "utf8");
    const authObj = JSON.parse(authTxt);
    const maxSpaceGb = Number(authObj && authObj.maxSpace);
    if (Number.isFinite(maxSpaceGb) && maxSpaceGb > 0) {
      return maxSpaceGb * 1024 * 1024 * 1024;
    }
  } catch (e) {
    // ignore and fall through to default
  }
  return DEFAULT_QUOTA_BYTES;
}

function getPermissionForRelativePath(relPath, permissionEntries) {
  const normalizedTarget = removeUnwantedStuffInPath(relPath);

  if (!normalizedTarget) {
    return { read: false, write: false };
  }

  let matched = null;

  for (const row of permissionEntries || []) {
    const base = removeUnwantedStuffInPath(row && row.path);

    if (!base) continue;

    const isMatch =
      normalizedTarget === base ||
      normalizedTarget.startsWith(`${base}/`);

    if (!isMatch) continue;

    if (!matched || base.length > matched.path.length) {
      matched = {
        path: base,
        perm: {
          read: row.perm?.read !== false,
          write: row.perm?.write !== false,
        },
      };
    }
  }

  // No matching permission
  if (!matched) {
    return {
      read: true,
      write: true,
    };
  }

  return matched.perm;
}

// Storage quota (bytes). Can be overridden by env var STORAGE_QUOTA_BYTES.
const DEFAULT_QUOTA_BYTES = Number(process.env.STORAGE_QUOTA_BYTES) || 5 * 1024 * 1024 * 1024; // 5 GB default
// How old can upload part files be before we consider them stale and remove them (hours)
const UPLOAD_PART_TTL_HOURS = Number(process.env.UPLOAD_PART_TTL_HOURS) || 24; // default 24 hours

// Server-side clipboard storage: persist clipboard per user across requests
const userClipboards = new Map(); // username -> clipboard state

// ─────────────────────────────
// Helpers
// ─────────────────────────────


async function buildUserFileTree(rootPath) {
  async function walk(dir) {
    let entries;

    try {
      entries = await limit(() => fsp.readdir(dir, { withFileTypes: true }));
    } catch {
      return [];
    }

    const nodes = await Promise.all(
      entries.map(async (entry) => {
        const fullPath = path.join(dir, entry.name);

        let stats;
        try {
          stats = await limit(() => fsp.stat(fullPath));
        } catch {
          return null;
        }

        if (entry.isDirectory()) {
          return [
            entry.name,
            await walk(fullPath),
            {
              mtime: stats.mtimeMs,
              mtimeMs: stats.mtimeMs,
            },
          ];
        }

        return [
          entry.name,
          null,
          {
            size: stats.size,
            mtime: stats.mtimeMs,
            mtimeMs: stats.mtimeMs,
          },
        ];
      }),
    );

    return nodes.filter(Boolean);
  }

  const rootStat = await limit(() => fsp.stat(rootPath)).catch(() => null);

  return [
    "root",
    await walk(rootPath),
    rootStat
      ? {
          mtime: rootStat.mtimeMs,
          mtimeMs: rootStat.mtimeMs,
        }
      : {},
  ];
}

async function readFileChunk(fullPath, start, end) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    const stream = fs.createReadStream(fullPath, { start, end: end - 1 });
    stream.on("data", (chunk) => chunks.push(chunk));
    stream.on("end", () => resolve(Buffer.concat(chunks)));
    stream.on("error", reject);
  });
}

async function getRawBody(req) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    let total = 0;

    req.on("data", (chunk) => {
      total += chunk.length;
      chunks.push(chunk);
    });

    req.on("end", () => {
      console.log("END total:", total);
      resolve(Buffer.concat(chunks));
    });

    req.on("close", () => {
      console.log("CLOSE total:", total);
    });

    req.on("aborted", () => {
      console.log("ABORTED");
      console.log("req.complete =", req.complete);
      console.log("req.destroyed =", req.destroyed);
    });
  });
}

async function handleRawFileUpload(req, res) {
  console.log({
    contentLength: req.headers["content-length"],
    transferEncoding: req.headers["transfer-encoding"],
  });
  function base64ToUtf8(base64Str) {
    const binString = atob(base64Str);
    const bytes = Uint8Array.from(binString, (m) => m.charCodeAt(0));
    return new TextDecoder().decode(bytes);
  }
  const headers = req.headers || {};
  const username = String(headers["x-username"] || "").trim();
  const password = String(headers["x-password"] || "").trim();
  const authHeader = headers.authorization || headers.Authorization || "";
  const relPath = base64ToUtf8(String(headers["x-file-path"] || "").trim());

  if (!username || !relPath) {
    res.writeHead(400);
    return res.end(JSON.stringify({ error: "Missing username or file path" }));
  }

  if (!(await authenticateUser(username, password, authHeader))) {
    res.writeHead(401);
    return res.end(JSON.stringify({ error: "unauthorized" }));
  }

  const normalizedPath = removeUnwantedStuffInPath(relPath);
  const userRoot = path.join(directoryPath, username, "root");
  if (!normalizedPath) {
    res.writeHead(400);
    return res.end(JSON.stringify({ error: "Invalid file path" }));
  }

  const authFilePath = safeResolve(directoryPath, `${username}/${username}.txt`);
  let userPathPermissions = [];
  try {
    const authContent = await fsp.readFile(authFilePath, "utf8");
    const authObj = JSON.parse(authContent);
    userPathPermissions = authObj.pathPermissions;
  } catch (e) {
    userPathPermissions = [];
  }

  const permission = getPermissionForRelativePath(normalizedPath, userPathPermissions);
  if (!permission.write) {
    res.writeHead(403);
    return res.end(
      JSON.stringify({
        error: "write permission denied",
        path: `/${normalizedPath}`,
      }),
    );
  }

  const replace = String(headers["x-file-replace"] || "true") !== "false";
  // await fsp.mkdir(userRoot, { recursive: true });
  const filePath = safeResolve(userRoot, normalizedPath);
  const rawBody = await getRawBody(req);

  let oldSize = 0;
  try {
    const st = await fsp.stat(filePath);
    if (st.isFile()) oldSize = st.size;
  } catch (e) {
    oldSize = 0;
  }

  const currentUsed = await getDirSizeBytes(userRoot);
  const quota = await getUserQuotaBytes(userRoot);
  const delta = replace ? rawBody.length - oldSize : rawBody.length;
  if (delta > 0 && currentUsed + delta > quota) {
    res.writeHead(403);
    return res.end(
      JSON.stringify({
        error: `Storage quota exceeded: cannot write ${normalizedPath}`,
      }),
    );
  }

  await fsp.mkdir(path.dirname(filePath), { recursive: true });
  await fsp.writeFile(filePath, rawBody, { flag: replace ? "w" : "a" });

  res.writeHead(200, { "Content-Type": "application/json" });
  return res.end(JSON.stringify({ success: true }));
}

// ─────────────────────────────
// Server
// ─────────────────────────────

async function handleFetchfiles(req, res) {
  const jsonResponse = (payload, status = 200) => {
    res.setHeader("Content-Type", "application/json");
    if (status !== 200) res.writeHead(status);
    return res.end(JSON.stringify(payload));
  };

  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST,OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization, X-Username, X-File-Path, X-File-Replace, X-File-Action");
  res.setHeader("Access-Control-Expose-Headers", "X-File-Size,X-Chunk-Index,X-Is-Last-Chunk,X-Total-Chunks");

  // Support simple streaming download endpoint for large files.
  // console.log('fetchfiles request', req.method, req.url);
  if (req.method === "POST" && req.headers["content-type"] && req.headers["content-type"].startsWith("application/octet-stream") && req.headers["x-file-action"] === "write") {
    return handleRawFileUpload(req, res);
  }

  if (req.method !== "POST") {
    res.writeHead(405);
    return res.end();
  }

  let body = "";
  req.on("data", (c) => (body += c));
  req.on("end", async () => {
    let data;
    try {
      data = JSON.parse(body);
    } catch {
      res.writeHead(400);
      return res.end(JSON.stringify({ error: "Invalid JSON" }));
    }

    if (!data || typeof data !== "object") {
      res.writeHead(400);
      return res.end(JSON.stringify({ error: "Invalid request body" }));
    }

    const username = typeof data.username === "string" ? data.username.trim() : "";
    if (!username) {
      res.writeHead(400);
      return res.end(JSON.stringify({ error: "Missing username" }));
    }

    // Authenticate all POST actions. If the user has a password set
    // in their user file (username.txt) it must match `data.password`.
    const authHeader = (req.headers && (req.headers.authorization || req.headers.Authorization)) || "";
    if (!(await authenticateUser(username, data.password, authHeader))) {
      res.writeHead(401);
      return res.end(JSON.stringify({ error: "unauthorized" }));
    }

    const authFilePath = safeResolve(directoryPath, `${username}/${username}.txt`);

    let userPathPermissions = [];
    try {
      const authContent = await fsp.readFile(authFilePath, "utf8");
      const authObj = JSON.parse(authContent);
      userPathPermissions = authObj && authObj.pathPermissions;
    } catch (e) {
      userPathPermissions = [];
    }

    const userRoot = path.join(directoryPath, username, "root");
    await fsp.mkdir(userRoot, { recursive: true });

    try {
      if (data.initFE) {
        const tree = await buildUserFileTree(userRoot);
        const clipboard = userClipboards.get(username) || null;
        return res.end(JSON.stringify({ tree, clipboard }));
      }

      if (data.requestFile) {
        const normalizedRequestPath = removeUnwantedStuffInPath(data.requestFileName);

        if (!normalizedRequestPath) return jsonResponse({ error: "Invalid file path" }, 400);

        const permission = getPermissionForRelativePath(normalizedRequestPath, userPathPermissions);

        if (!permission.read) return jsonResponse({ error: "read permission denied", path: `/${normalizedRequestPath}` }, 403);

        const fullPath = safeResolve(userRoot, normalizedRequestPath);
        const relativeToRoot = path.relative(userRoot, fullPath);

        if (relativeToRoot.startsWith("..") || path.isAbsolute(relativeToRoot)) return jsonResponse({ error: "Invalid file path" }, 400);

        let stat;
        try {
          stat = await fsp.stat(fullPath);
        } catch (e) {
          if (e?.code === "ENOENT") return jsonResponse({ missing: true, code: "ENOENT", kind: "missing", requestFileName: data.requestFileName }, 404);
          throw e;
        }

        if (stat.isDirectory()) {
          const files = await walkDir(fullPath);
          return jsonResponse({ kind: "folder", files });
        }

        if (!stat.isFile()) {
          return jsonResponse({ error: "Unsupported path type" }, 400);
        }

        res.setHeader("Content-Type", "application/octet-stream");
        res.setHeader("Content-Length", String(stat.size));
        res.setHeader("X-File-Name", path.basename(fullPath));

        return fs.createReadStream(fullPath).pipe(res);
      }

      if (data.requestFolder) {
        const normalizedRequestPath = removeUnwantedStuffInPath(data.requestFolderName);
        const wantDetails = Boolean(data.detail || data.wantDetails);
        // return an array with all the file/folder names in the requested folder (non-recursive)
        const relForPerm = normalizedRequestPath || "";
        const permission = getPermissionForRelativePath(relForPerm, userPathPermissions);
        if (!permission.read) {
          res.writeHead(403);
          return res.end(JSON.stringify({ error: "read permission denied", path: `/${relForPerm}` }));
        }

        const fullPath = safeResolve(userRoot, normalizedRequestPath);
        const relativeToRoot = path.relative(userRoot, fullPath);
        if (relativeToRoot.startsWith("..") || path.isAbsolute(relativeToRoot)) return res.end(JSON.stringify({ error: "Invalid folder path" }));

        let stat;
        try {
          stat = await fsp.stat(fullPath);
        } catch (e) {
          if (e && e.code === "ENOENT") {
            return res.end(
              JSON.stringify({
                missing: true,
                code: "ENOENT",
                kind: "missing",
                requestFolderName: data.requestFolderName,
              }),
            );
          }
          throw e;
        }

        if (!stat.isDirectory()) return res.end(JSON.stringify({ error: "Not a directory", path: `/${relForPerm}` }));

        const dirents = await fsp.readdir(fullPath, { withFileTypes: true });
        const files = await Promise.all(
          dirents.map(async (d) => {
            if (!wantDetails) return d.name;

            const entryPath = removeUnwantedStuffInPath(normalizedRequestPath ? `${normalizedRequestPath}/${d.name}` : d.name);
            let type = "folder";
            try {
              const entryStat = await fsp.stat(path.join(fullPath, d.name));
              type = entryStat && entryStat.isDirectory() ? "folder" : "file";
            } catch (e) {
              // fall back to folder for directories and file for others
              type = d.isDirectory() ? "folder" : "file";
            }

            return {
              path: entryPath,
              type,
            };
          }),
        );
        return res.end(JSON.stringify({ kind: "folder", files }));
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
        if (leadMatch) base = leadMatch[2] || "";

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
      async function applyDirections(rootPath, directions, username, userPathPermissions) {
        // result object used to return information back to the caller
        const result = {};
        // Initialize clipboard from server storage or create new
        let clipboard = userClipboards.get(username) || null;

        const resolvePath = (p = "") => {
          if (!p || p === "root") return rootPath;

          if (p.startsWith("root/")) {
            p = p.slice(5);
          }

          return safeResolve(rootPath, p);
        };

        const directionPathToRelative = (p = "") => {
          if (!p || p === "root") return "";
          const parts = String(p).split("/").filter(Boolean);
          if (parts[0] === "root") parts.shift();
          return removeUnwantedStuffInPath(parts.join("/"));
        };

        const assertReadAllowed = (relativePath) => {
          const perm = getPermissionForRelativePath(relativePath, userPathPermissions);
          if (!perm.read) {
            const err = new Error(`Read permission denied: /${relativePath}`);
            err.code = "EACCES";
            throw err;
          }
        };

        const assertWriteAllowed = (relativePath) => {
          const perm = getPermissionForRelativePath(relativePath, userPathPermissions);
          if (!perm.write) {
            const err = new Error(`Write permission denied: /${relativePath}`);
            err.code = "EACCES";
            throw err;
          }
        };

        const pathStatsCache = new Map();
        const statCached = async (fullPath) => {
          if (pathStatsCache.has(fullPath)) return pathStatsCache.get(fullPath);
          const stat = await fsp.stat(fullPath).catch(() => null);
          pathStatsCache.set(fullPath, stat);
          return stat;
        };
        const existsCached = async (fullPath) => !!(await statCached(fullPath));
        let usageDelta = 0;

        // Prepare per-user temp directory for chunked uploads
        const userDir = path.dirname(rootPath); // .../username
        const userTempDir = path.join(userDir, ".uploads_temp");
        await fsp.mkdir(userTempDir, { recursive: true });

        // Cleanup stale part files for this user on every apply (keeps disk usage bounded)
        try {
          const ttlMs = UPLOAD_PART_TTL_HOURS * 60 * 60 * 1000;
          const now = Date.now();
          const parts = await fsp.readdir(userTempDir).catch(() => []);
          for (const p of parts) {
            try {
              if (!p.includes(".part.")) continue;
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
          console.error("stale part cleanup error", e);
        }

        for (const dir of directions) {
          if (dir.addFolder) {
            let parentPath;
            let folderPath;

            if (dir.name && dir.name.length) {
              parentPath = resolvePath(dir.path || "root");
              folderPath = path.join(parentPath, dir.name);
            } else {
              const requestedPath = typeof dir.path === "string" ? dir.path : "";
              const normalizedRequestedPath = removeUnwantedStuffInPath(requestedPath);
              if (normalizedRequestedPath) {
                folderPath = resolvePath(requestedPath);
                parentPath = path.dirname(folderPath);
              } else {
                parentPath = resolvePath("root");
                folderPath = path.join(parentPath, `new-folder-${Date.now()}`);
              }
            }

            const parentRel = removeUnwantedStuffInPath(path.relative(rootPath, parentPath || rootPath).replace(/\\/g, "/"));
            assertWriteAllowed(parentRel);

            await ensureDir(parentPath || rootPath);

            // If an entry exists at the target path, ensure it's a directory.
            const existingStat = await statCached(folderPath);
            if (existingStat) {
              if (!existingStat.isDirectory()) {
                throw new Error(`Cannot create folder, file exists: ${folderPath}`);
              }
              // already a folder → OK
            } else {
              await fsp.mkdir(folderPath, { recursive: true });
            }

            continue;
          }
          if (dir.deleteFolder) {
            dir.delete = true;
          }
          if (dir.checkFolder) {
            const folderPath = resolvePath(dir.path);
            const folderRel = directionPathToRelative(dir.path || "");
            assertReadAllowed(folderRel);
            const stat = await fsp.stat(folderPath).catch(() => null);
            if (!stat || !stat.isDirectory()) {
              res.writeHead(400);
              return res.end(
                JSON.stringify({
                  error: "Folder does not exist",
                  path: `/${folderRel}`,
                }),
              );
            } else {
              res.writeHead(200);
              return res.end(JSON.stringify({ exists: true, path: `/${folderRel}` }));
            }
          }
          if (dir.checkFile) {
            const filePath = resolvePath(dir.path);
            const fileRel = directionPathToRelative(dir.path || "");
            assertReadAllowed(fileRel);
            const stat = await fsp.stat(filePath).catch(() => null);
            if (!stat || !stat.isFile()) {
              res.writeHead(400);
              return res.end(
                JSON.stringify({
                  error: "File does not exist",
                  path: `/${fileRel}`,
                }),
              );
            } else {
              res.writeHead(200);
              return res.end(JSON.stringify({ exists: true, path: `/${fileRel}` }));
            }
          }
          if (dir.addFile) {
            const fileRel = directionPathToRelative(dir.path || "");
            assertWriteAllowed(fileRel);
            const filePath = resolvePath(dir.path);
            await fsp.mkdir(path.dirname(filePath), { recursive: true });
            await fsp.writeFile(filePath, "");
            continue;
          }

          if (dir.renameFolder) {
            dir.rename = true;
          }

          if (dir.rename) {
            try {
              const oldRelPath = directionPathToRelative(dir.path || "");
              assertWriteAllowed(oldRelPath);
              const oldPath = resolvePath(dir.path);
              const oldRel = directionPathToRelative(dir.path || "");

              const newName = path.basename(String(dir.newName || "").trim());

              if (!newName || newName === "." || newName === "..") {
                throw new Error("Invalid rename name");
              }

              // Prevent hidden traversal attempts like ../file or folder/file
              if (newName !== dir.newName) {
                throw new Error("Invalid rename name");
              }

              const parentDir = path.dirname(oldPath);
              const newPath = path.join(parentDir, newName);

              const newRel = path.join(
                path.dirname(oldRel),
                newName
              ).replace(/\\/g, "/");

              assertWriteAllowed(removeUnwantedStuffInPath(newRel));

              await fsp.rename(oldPath, newPath);

              // Update any server-side clipboard entries that reference the renamed path
              try {
                if (clipboard && Array.isArray(clipboard)) {
                  clipboard = clipboard.map((c) => {
                    if (!c || typeof c.path !== "string") return c;
                    if (c.path === oldRel) {
                      return { ...c, path: newRel, name: dir.newName };
                    }
                    if (c.path.startsWith(oldRel + "/")) {
                      return {
                        ...c,
                        path: newRel + c.path.slice(oldRel.length),
                      };
                    }
                    return c;
                  });
                }
              } catch (e) {
                // ignore clipboard update failures
              }
            } catch (e) {
              throw e;
            }
            continue;
          }

          if (dir.delete) {
            const deleteRelPath = directionPathToRelative(dir.path || "");
            assertWriteAllowed(deleteRelPath);
            const targetPath = resolvePath(dir.path);
            const relativeTarget = path.relative(rootPath, targetPath).replace(/\\/g, "/");
            if (relativeTarget === "systemfiles") {
              continue; // prevent deleting root 'systemfiles' folder only
            }
            const targetExists = await existsCached(targetPath);
            if (!targetExists) {
              continue;
            }
            // Move to hidden .trash folder instead of permanently deleting
            const trashDir = path.join(rootPath, ".trash");
            await fsp.mkdir(trashDir, { recursive: true });
            const itemName = path.basename(targetPath);
            let trashDest = path.join(trashDir, itemName);
            // Avoid overwriting existing trash items by appending a timestamp
            if (await existsCached(trashDest)) {
              trashDest = path.join(trashDir, `${Date.now()}_${itemName}`);
            }
            try {
              await fsp.rename(targetPath, trashDest);
            } catch (e) {
              if (e && (e.code === "ENOENT" || e.code === "ENOTDIR")) {
                continue;
              }
              try {
                await fs.move(targetPath, trashDest, { overwrite: false });
              } catch (moveErr) {
                console.error("soft-delete move failed", {
                  targetPath,
                  trashDest,
                  error: moveErr && (moveErr.stack || moveErr.message || String(moveErr)),
                });
                continue;
              }
            }

            // Clean up any server-side clipboard entries that reference this path
            try {
              const rel = dir.path.split("/").slice(1).join("/"); // remove leading "root"
              if (clipboard && Array.isArray(clipboard)) {
                clipboard = clipboard.filter((c) => {
                  if (!c || typeof c.path !== "string") return true;
                  // If deleting a folder, remove entries inside it as well
                  return !(c.path === rel || c.path.startsWith(rel + "/"));
                });
              }
            } catch (e) {
              // ignore cleanup failures
            }

            continue;
          }

          if (dir.permanentDelete) {
            const deleteRelPath = directionPathToRelative(dir.path || "");
            assertWriteAllowed(deleteRelPath);
            const targetPath = resolvePath(dir.path);
            // Security: only allow permanent deletion of items inside .trash
            const trashDir = path.join(rootPath, ".trash");
            const normalizedTarget = path.resolve(targetPath);
            const normalizedTrash = path.resolve(trashDir);
            if (!normalizedTarget.startsWith(normalizedTrash + path.sep) && normalizedTarget !== normalizedTrash) {
              // Not inside .trash — refuse
              continue;
            }
            await fsp.rm(targetPath, { recursive: true, force: true });

            continue;
          }

          if (dir.restore) {
            const restoreRelPath = directionPathToRelative(dir.path || "");
            assertWriteAllowed(restoreRelPath);
            const targetPath = resolvePath(dir.path);
            // Security: only restore items that are inside .trash
            const trashDir = path.join(rootPath, ".trash");
            const normalizedTarget = path.resolve(targetPath);
            const normalizedTrash = path.resolve(trashDir);
            if (!normalizedTarget.startsWith(normalizedTrash + path.sep)) {
              continue; // refuse to restore items not in .trash
            }
            const itemName = path.basename(targetPath);
            let dest = safeResolve(rootPath, itemName);
            // Avoid overwriting by appending a numeric suffix
            if (await existsCached(dest)) {
              let n = 1;
              while (await existsCached(path.join(rootPath, `(${n}) ${itemName}`))) n++;
              dest = path.join(rootPath, `(${n}) ${itemName}`);
            }
            await fsp.rename(targetPath, dest);
            continue;
          }

          if (dir.copy) {
            const copyRows = Array.isArray(dir.directions) ? dir.directions : [];
            for (const row of copyRows) {
              const copyRelPath = removeUnwantedStuffInPath(row && row.path ? row.path : "");
              assertReadAllowed(copyRelPath);
            }
            // Store the list of items to clipboard and avoid creating on-disk temp copies.
            // Copy will be performed at paste time from the live location; if the source
            // no longer exists when pasting, the operation will fail (matching real cloud drive behavior).
            clipboard = dir.directions;
            continue;
          }

          if (dir.pasteFolder) {
            dir.paste = true;
          }

          if (dir.paste && clipboard) {
            const destinationRelPath = directionPathToRelative(dir.path || "root");
            assertWriteAllowed(destinationRelPath);
            const destinationDir = safeResolve(userRoot, dir.path);
            // Resolve per-user quota and current usage once
            const quota = await getUserQuotaBytes(userRoot);
            let currentUsed = await getDirSizeBytes(userRoot);
            let pasteDelta = 0;

            // Check and copy/move each item; abort the whole paste if any item would exceed quota
            for (const item of clipboard) {
              const sourceRelPath = removeUnwantedStuffInPath(item && item.path ? item.path : "");
              assertReadAllowed(sourceRelPath);
              const src = safeResolve(userRoot, item.path);
              // ensure source still exists
              if (!(await existsCached(src))) {
                continue; // skip missing source
              }

              // compute size of src (could be folder)
              const srcSize = await getDirSizeBytes(src);

              let dest = path.join(destinationDir, path.basename(item.path));

              // 🔑 collision handling
              dest = await getUniquePath(dest);

              if (currentUsed + srcSize > quota) {
                throw new Error(`Storage quota exceeded: cannot paste "${path.basename(item.path)}" (${srcSize} bytes)`);
              }
              // Copy
              await fsp.cp(src, dest, {
                recursive: true,
                force: false,
              });
              pasteDelta += srcSize;
              currentUsed += srcSize;
            }

            continue;
          }

          // Persist clipboard to server storage for this user
          // dir.end is obsolete now
          if (clipboard) {
            userClipboards.set(username, clipboard);
          } else {
            userClipboards.delete(username);
          }
        }
        // Include clipboard in result so client can sync it
        result.clipboard = clipboard;
        // return any collected results (e.g., checkParts)
        return result;
      }

      if (data.saveSnapshot) {
        // Apply all frontend directions to build tree
        const result = await applyDirections(userRoot, data.directions, username, userPathPermissions);

        // Only return safe/serializable parts of result to avoid circular objects
        const safePayload = {
          success: true,
          result:
            result && typeof result === "object"
              ? {
                  ...(result.checkParts ? { checkParts: result.checkParts } : {}),
                }
              : {},
          clipboard: result && "clipboard" in result ? result.clipboard : null,
        };

        return res.end(JSON.stringify(safePayload));
      }

      res.writeHead(400);
      res.end(JSON.stringify({ error: "Unknown action" }));
    } catch (err) {
      console.error(err);
      if (res.headersSent) {
        console.warn("Response headers already sent; cannot send error response");
        return;
      }
      if (err && err.code === "EACCES") {
        res.writeHead(403);
        return res.end(JSON.stringify({ error: err.message || "permission denied" }));
      }
      res.writeHead(500);
      res.end(JSON.stringify({ error: err.message }));
    }
  });
}

function startServer(port = 8083, host = "0.0.0.0") {
  const server = http.createServer((req, res) => handleFetchfiles(req, res));
  server.listen(port, host, () => {
    // console.log(`fetchfiles server listening on port ${port}`);
  });
  return server;
}

module.exports = {
  handleFetchfiles,
  startServer,
};
