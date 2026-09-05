const fs = require("fs");
const path = require("path");
const fsp = require("fs/promises");
const { getUserUsage, getUserQuotaBytes } = require("./storageQuota");
const { withUserLock, writeFileWithQuota, deletePathWithQuota, copyPathWithQuota } = require("./quotaFs");

const MAX_BODY = 100 * 1024 * 1024;
async function exists(fullPath) {
  try {
    await fsp.access(fullPath);
    return true;
  } catch {
    return false;
  }
}
async function move(src, dest) {
  try {
    await fsp.rename(src, dest);
  } catch (err) {
    if (err.code === "EXDEV") {
      await fsp.cp(src, dest, { recursive: true });
      await fsp.rm(src, { recursive: true, force: true });
    } else {
      throw err;
    }
  }
}
const limit = createLimiter(32);
function safeResolve(root, userPath = "") {
  const resolvedRoot = path.resolve(root);
  const resolved = path.resolve(path.join(root, String(userPath)));

  if (resolved !== resolvedRoot && !resolved.startsWith(resolvedRoot + path.sep)) {
    throw new Error("Invalid path");
  }

  return resolved;
}
function createLimiter(maxConcurrent = 64, maxQueue = 500) {
  let active = 0;
  const queue = [];

  return async (fn) => {
    if (active >= maxConcurrent) {
      if (queue.length >= maxQueue) {
        throw new Error("Too many pending operations");
      }
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
async function buildUserFileTree(rootPath) {
  const root = ["root", []];

  const stack = [
    {
      path: rootPath,
      children: root[1],
    },
  ];

  while (stack.length) {
    const { path: dir, children } = stack.pop();

    let entries;
    try {
      entries = await limit(() =>
        fsp.readdir(dir, { withFileTypes: true }),
      );
    } catch {
      continue;
    }

    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name);

      let stat;
      try {
        stat = await limit(() => fsp.stat(fullPath));
      } catch {
        continue;
      }

      if (entry.isDirectory()) {
        const dirChildren = [];
        children.push([
          entry.name,
          dirChildren,
          {
            mtime: stat.mtimeMs,
          },
        ]);

        stack.push({
          path: fullPath,
          children: dirChildren,
        });
      } else {
        children.push([
          entry.name,
          null,
          {
            size: stat.size,
            mtime: stat.mtimeMs,
          },
        ]);
      }
    }
  }

  return root;
}


async function getDirSizeBytes(root) {
  async function walk(dir) {
    let entries;

    try {
      entries = await limit(() => fsp.readdir(dir, { withFileTypes: true }));
    } catch {
      return 0;
    }

    const sizes = await Promise.all(
      entries.map(async (entry) => {
        const full = safeResolve(dir, entry.name);

        if (entry.isDirectory()) {
          return walk(full);
        }

        if (entry.isFile()) {
          try {
            const stat = await limit(() => fsp.lstat(full));
            return stat.size;
          } catch {
            return 0;
          }
        }

        return 0;
      })
    );

      return sizes.reduce((a, b) => a + b, 0);
  }

  return walk(root);
}

async function authenticateUser(username, providedPassword, authHeader) {
  if (!username) return false;

  try {
    const userFile = safeResolve(directoryPath, `${username}/${username}.txt`);
    const txt = await fsp.readFile(userFile, "utf8");
    const obj = JSON.parse(txt);

    if (!obj || typeof obj.password !== "string") return false;

    if (providedPassword === obj.password) return true;

    if (typeof authHeader === "string" && authHeader.startsWith("Bearer ")) {
      const token = authHeader.slice(7).trim();

      const now = Date.now();

      return Array.isArray(obj.authTokens) &&
        obj.authTokens.some(
          t => t.token === token && t.expires > now
        );
    }

    return false;
  } catch {
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

function stripLeadingSlash(value) {
  const text = String(value ?? "");
  return text.replace(/^\/+/, "");
}

function getPermissionForRelativePath(relPath, permissionEntries) {
  const normalizedTarget = removeUnwantedStuffInPath(relPath);

  let matched = null;

  for (const row of permissionEntries || []) {
    const base = removeUnwantedStuffInPath(row && row.path);

    const isMatch = normalizedTarget === base || normalizedTarget.startsWith(`${base}/`);

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

// Server-side clipboard storage: persist clipboard per user across requests
const userClipboards = new Map(); // username -> clipboard state

// ─────────────────────────────
// Helpers
// ─────────────────────────────

async function getRawBody(req) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    let total = 0;

    req.on("data", (chunk) => {
      total += chunk.length;
      if (total > MAX_BODY) {
        req.destroy();
        return;
      }
      chunks.push(chunk);
    });

    req.on("end", () => {
      resolve(Buffer.concat(chunks));
    });

    req.on("aborted", () => {
      reject(new Error("Request aborted by client"));
    });
  });
}

async function handleRawFileUpload(req, res) {
  // 1. START CONSUMING THE STREAM IMMEDIATELY
  // This prevents TCP window stalling and backpressure issues
  const bodyPromise = getRawBody(req);
  
  function base64ToUtf8(base64Str) {
    return Buffer.from(base64Str, "base64").toString("utf8");
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

  // 2. Perform async authentication and permission checks safely
  if (!(await authenticateUser(username, password, authHeader))) {
    res.writeHead(401);
    return res.end(JSON.stringify({ error: "unauthorized" }));
  }

  const normalizedPath = removeUnwantedStuffInPath(relPath);
  const userRoot = safeResolve(directoryPath, `${username}/root`);

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
        path: `${normalizedPath}`,
      }),
    );
  }

  const replace = String(headers["x-file-replace"] || "true") !== "false";
  const filePath = safeResolve(userRoot, normalizedPath);
  
  // 3. AWAIT THE BODY HERE 
  // The network chunks have already been safely buffered into memory
  const rawBody = await bodyPromise;

  let oldSize = 0;

  return withUserLock(username, async () => {
    const { loadTreeRequired } = await writeFileWithQuota(username, userRoot, filePath, rawBody, replace);
    res.writeHead(200, { "Content-Type": "application/json" });
    return res.end(JSON.stringify({ success: true, loadTreeRequired }));
  });
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
  res.setHeader("Access-Control-Allow-Methods", "POST");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization, X-Username, X-File-Path, X-File-Replace, X-File-Action");
  res.setHeader("Access-Control-Expose-Headers", "X-File-Size,X-Chunk-Index,X-Is-Last-Chunk,X-Total-Chunks");

  // Support simple streaming download endpoint for large files.
  if (req.method === "POST" && req.headers["content-type"] && req.headers["content-type"].startsWith("application/octet-stream") && req.headers["x-file-action"] === "write") {
    return handleRawFileUpload(req, res);
  }

  if (req.method !== "POST") {
    res.writeHead(405);
    return res.end();
  }

  let chunks = [];
  let total = 0;
  req.on("data", (chunk) => { 
    total += chunk.length;
    if (total > MAX_BODY) {
      req.destroy();
      return;
    }
    chunks.push(chunk);
  });
  req.on("end", async () => {
    const body = Buffer.concat(chunks).toString("utf8");
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

        const permission = getPermissionForRelativePath(normalizedRequestPath, userPathPermissions);

        if (!permission.read) return jsonResponse({ error: "read permission denied", path: `${normalizedRequestPath}` }, 403);

        const fullPath = safeResolve(userRoot, normalizedRequestPath);

        let stat;
        try {
          stat = await fsp.stat(fullPath);
        } catch (e) {
          if (e?.code === "ENOENT") return jsonResponse({ missing: true, code: "ENOENT", kind: "missing", requestFileName: data.requestFileName }, 404);
          throw e;
        }

        if (stat.isDirectory()) {
          const dirents = await fsp.readdir(fullPath, { withFileTypes: true });

          const files = dirents.map((d) => ({
            name: d.name,
            type: d.isDirectory() ? "folder" : "file",
            relativePath: d.name,
          }));

          return jsonResponse({ kind: "folder", files });
        }

        if (!stat.isFile()) {
          return jsonResponse({ error: "Unsupported path type" }, 400);
        }

        res.setHeader("Content-Type", "application/octet-stream");
        res.setHeader("Content-Length", String(stat.size));

        return fs.createReadStream(fullPath).pipe(res);
      }

      if (data.requestFolder) {
        const normalizedRequestPath = removeUnwantedStuffInPath(data.requestFolderName);

        const wantDetails = Boolean(data.detail || data.wantDetails);

        const relForPerm = normalizedRequestPath || "";

        const permission = getPermissionForRelativePath(relForPerm, userPathPermissions);
        if (!permission.read) {
          res.writeHead(403);
          return res.end(
            JSON.stringify({
              error: "read permission denied",
              path: `${relForPerm}`,
            }),
          );
        }

        const fullPath = safeResolve(userRoot, normalizedRequestPath);


        let stat;

        try {
          stat = await fsp.stat(fullPath);
        } catch (e) {
          if (e?.code === "ENOENT") {
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

        if (!stat.isDirectory()) {
          return res.end(
            JSON.stringify({
              error: "Not a directory",
              path: `${relForPerm}`,
            }),
          );
        }

        const dirents = await fsp.readdir(fullPath, { withFileTypes: true });

        if (!wantDetails) {
          const files = dirents.map((d) => stripLeadingSlash(d.name));

          return res.end(
            JSON.stringify({
              kind: "folder",
              files,
            }),
          );
        }

        const files = await limit(() => Promise.all(
          dirents.map(async (d) => {
            const entryPath = stripLeadingSlash(d.name);

            const type = d.isDirectory() ? "folder" : "file";

            const result = {
              path: entryPath,
              type,
            };

            try {
              const entryStat = await fsp.stat(safeResolve(fullPath, d.name));

              result.mtime = entryStat.mtimeMs;

              if (type === "file") {
                result.size = entryStat.size;
              }

              if (type === "folder" && data.directoryDetail) {
                // only if you really want folder sizes
                result.size = await getDirSizeBytes(safeResolve(fullPath, d.name));
              }
            } catch {}

            return result;
          }),
        ));
        return res.end(
          JSON.stringify({
            kind: "folder",
            files,
          }),
        );
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
          return safeResolve(dir, compareName);
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

        if (!found) return safeResolve(dir, compareName);

        const newName = `(${maxNum + 1}) ${base}${ext}`;
        return safeResolve(dir, newName);
      }

      async function applyDirections(rootPath, directions, username, userPathPermissions, options = {}) {
        let success = true;
        const moveMode = Boolean(options && options.move);
        // result object used to return information back to the caller
        const result = {};
        // Initialize clipboard from server storage or create new
        let clipboard = userClipboards.get(username) || null;

        const normalizePathInput = (p = "") => {
          if (!p || p === "root") return "";

          let text = String(p).replace(/\\/g, "/").trim();
          while (text.startsWith("/")) text = text.slice(1);
          if (text.startsWith("root/")) text = text.slice(5);
          return text;
        };

        const resolvePath = (p = "") => {
          const normalized = normalizePathInput(p);
          if (!normalized) return rootPath;
          return safeResolve(rootPath, normalized);
        };

        const directionPathToRelative = (p = "") => {
          const normalized = normalizePathInput(p);
          if (!normalized) return "";
          return removeUnwantedStuffInPath(normalized);
        };

        const isImmediateRootChild = (relativePath) => removeUnwantedStuffInPath(relativePath) === "/root";
        const assertNotImmediateRootChild = (relativePath, action) => {
          if (isImmediateRootChild(relativePath)) {
            const err = new Error(`Cannot ${action} item named 'root' at the top level`);
            err.code = "EINVAL";
            throw err;
          }
        };

        const assertReadAllowed = (relativePath) => {
          const perm = getPermissionForRelativePath(relativePath, userPathPermissions);
          if (!perm.read) {
            const err = new Error(`Read permission denied: ${relativePath}`);
            err.code = "EACCES";
            throw err;
          }
        };

        const assertWriteAllowed = (relativePath) => {
          const perm = getPermissionForRelativePath(relativePath, userPathPermissions);
          if (!perm.write) {
            const err = new Error(`Write permission denied: ${relativePath}`);
            err.code = "EACCES";
            throw err;
          }
        };

        try {
          for (const dir of directions) {
            if (dir.addFolder) {
              let parentPath;
              let folderPath;

              if (dir.name && dir.name.length) {
                parentPath = resolvePath(dir.path || "root");
                folderPath = safeResolve(parentPath, dir.name);
              } else {
                const requestedPath = typeof dir.path === "string" ? dir.path : "";
                const normalizedRequestedPath = removeUnwantedStuffInPath(requestedPath);
                folderPath = resolvePath(requestedPath);
                parentPath = path.dirname(folderPath);
              }

              const parentRel = removeUnwantedStuffInPath(path.relative(rootPath, parentPath || rootPath).replace(/\\/g, "/"));
              const folderRel = removeUnwantedStuffInPath(path.relative(rootPath, folderPath || rootPath).replace(/\\/g, "/"));
              assertNotImmediateRootChild(folderRel, "create");
              assertWriteAllowed(parentRel);

              await ensureDir(parentPath || rootPath);

              // If an entry exists at the target path, ensure it's a directory.
              if (await exists(folderPath)) {
                const existingStat = await fsp.stat(folderPath);

                if (!existingStat.isDirectory()) {
                  throw new Error(`Cannot create folder, file exists: ${folderPath}`);
                }
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
                const err = new Error("Folder does not exist");
                err.code = "ENOENT";
                err.path = `${folderRel}`;
                throw err;
              }
              result.checkFolder = { exists: true, path: `${folderRel}` };
              continue;
            }

            if (dir.checkFile) {
              const filePath = resolvePath(dir.path);
              const fileRel = directionPathToRelative(dir.path || "");
              assertReadAllowed(fileRel);
              console.log(filePath, fileRel);
              const stat = await fsp.stat(filePath).catch(() => null);
              if (!stat || !stat.isFile()) {
                const err = new Error("File does not exist");
                err.code = "ENOENT";
                err.path = `${fileRel}`;
                throw err;
              }
              result.checkFile = { exists: true, path: `${fileRel}` };
              continue;
            }
            if (dir.addFile) {
              const fileRel = directionPathToRelative(dir.path || "");
              assertNotImmediateRootChild(fileRel, "create");
              assertWriteAllowed(fileRel);
              const filePath = resolvePath(dir.path);
              await writeFileWithQuota(username, userRoot, filePath, "", true);
              continue;
            }

            if (dir.renameFolder) {
              dir.rename = true;
            }

            if (dir.rename) {
              const oldPath = resolvePath(dir.path);
              const oldRel = directionPathToRelative(dir.path || "");
              assertWriteAllowed(oldRel);

              const newName = path.basename(String(dir.newName || "").trim());

              if (!newName || newName === "." || newName === "..") {
                throw new Error("Invalid rename name");
              }

              // Prevent hidden traversal attempts like ../file or folder/file
              if (newName !== dir.newName) {
                throw new Error("Invalid rename name");
              }

              const parentDir = path.dirname(oldPath);
              const newPath = safeResolve(parentDir, newName);

              const newRel = path.join(path.dirname(oldRel), newName).replace(/\\/g, "/");
              assertNotImmediateRootChild(newRel, "rename to");
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
              const targetExists = await exists(targetPath);
              if (!targetExists) {
                success = false;
                continue;
              }
              // Move to hidden .trash folder instead of permanently deleting
              const trashDir = safeResolve(rootPath, ".trash");
              await fsp.mkdir(trashDir, { recursive: true });
              const itemName = path.basename(targetPath);
              let trashDest = safeResolve(trashDir, itemName);
              // Avoid overwriting existing trash items by appending a timestamp
              if (await exists(trashDest)) {
                trashDest = safeResolve(trashDir, `${Date.now()}_${itemName}`);
              }
              try {
                await fsp.rename(targetPath, trashDest);
              } catch (e) {
                if (e && (e.code === "ENOENT" || e.code === "ENOTDIR")) {
                  success = false;
                  continue;
                }
                try {
                  await move(targetPath, trashDest);
                } catch (moveErr) {
                  console.error("soft-delete move failed", {
                    targetPath,
                    trashDest,
                    error: moveErr && (moveErr.stack || moveErr.message || String(moveErr)),
                  });
                  success = false;
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
              const trashDir = safeResolve(rootPath, ".trash");
              const normalizedTarget = path.resolve(targetPath);
              const normalizedTrash = path.resolve(trashDir);
              if (!normalizedTarget.startsWith(normalizedTrash + path.sep) && normalizedTarget !== normalizedTrash) {
                // Not inside .trash — refuse
                success = false;
                continue;
              }
              await deletePathWithQuota(username, userRoot, targetPath);
              continue;
            }

            if (dir.restore) {
              const restoreRelPath = directionPathToRelative(dir.path || "");
              assertWriteAllowed(restoreRelPath);
              const targetPath = resolvePath(dir.path);
              // Security: only restore items that are inside .trash
              const trashDir = safeResolve(rootPath, ".trash");
              const normalizedTarget = path.resolve(targetPath);
              const normalizedTrash = path.resolve(trashDir);
              if (!normalizedTarget.startsWith(normalizedTrash + path.sep)) {
                success = false;
                continue; // refuse to restore items not in .trash
              }
              const itemName = path.basename(targetPath);
              let dest = safeResolve(rootPath, itemName);
              // Avoid overwriting by appending a numeric suffix
              if (await exists(dest)) {
                let n = 1;
                while (await exists(safeResolve(rootPath, `(${n}) ${itemName}`))) n++;
                dest = safeResolve(rootPath, `(${n}) ${itemName}`);
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

              const destinationPath = resolvePath(dir.path || "root");
              const destinationExists = await exists(destinationPath);
              const destinationStat = destinationExists ? await fsp.stat(destinationPath).catch(() => null) : null;

              const quota = await getUserQuotaBytes(userRoot);
              let currentUsed = await getUserUsage(username, userRoot);

              for (const item of clipboard) {
                const sourceRelPath = removeUnwantedStuffInPath(item?.path || "");
                assertReadAllowed(sourceRelPath);

                const src = safeResolve(userRoot, item.path);

                if (!(await exists(src))) {
                  continue;
                }

                const itemKind = item && (item.kind || item.type || "file");
                const originalDestPath = String(dir.path || "root");
                const looksLikeExplicitFileTarget =
                  itemKind !== "directory" &&
                  itemKind !== "folder" &&
                  (/(?:^|\/)[^\/]+\.[^\/]+$/.test(originalDestPath.replace(/\\/g, "/")) ||
                    originalDestPath.replace(/\\/g, "/").endsWith("/"));

                // New behavior: paste/move should place source at the destination path directly
                // and must fail if the destination already exists.
                let dest = destinationPath;
                // Ensure parent directory exists
                const parentDir = path.dirname(dest);
                await ensureDir(parentDir);
                if (await exists(dest)) {
                  throw new Error(`Destination already exists: ${dest}`);
                }

                const destRelPath = removeUnwantedStuffInPath(path.relative(userRoot, dest).replace(/\\/g, "/"));
                assertWriteAllowed(destRelPath);

                try {
                  currentUsed = await copyPathWithQuota(username, userRoot, src, dest, currentUsed);
                } catch (err) {
                  if (err?.code === "QUOTA_EXCEEDED") {
                    success = false;
                    continue;
                  }
                  throw err;
                }

                // If the caller requested a move instead of a copy, remove the source now.
                const moveFlag = Boolean(dir.move ?? moveMode);
                if (moveFlag) {
                  try {
                    // Ensure we have permission to remove the source
                    // (assertWriteAllowed already enforced above when moveFlag was set by caller)
                    const normalizedSrc = path.resolve(src);
                    const normalizedDest = path.resolve(dest);
                    // Reject moves where destination is inside source (would be recursive)
                    if (normalizedDest.startsWith(normalizedSrc + path.sep) || normalizedDest === normalizedSrc) {
                      success = false;
                      continue;
                    }
                    await deletePathWithQuota(username, userRoot, src);
                  } catch (e) {
                    // deletion failed, mark operation as partially failed but continue
                    success = false;
                  }
                }
              }

              continue;
            }
          // Persist clipboard to server storage for this user
        }     
        } finally {
          // Include clipboard in result so client can sync it
          if (clipboard) {
            userClipboards.set(username, clipboard);
          } else {
            userClipboards.delete(username);
          }
          result.clipboard = clipboard;
        }
        result.success = success;
        return result;
      }

      if (data.saveSnapshot) {
        // Apply all frontend directions to build tree
        const result = await withUserLock(username, () => applyDirections(userRoot, data.directions, username, userPathPermissions, { move: Boolean(data.move) }));

        const safePayload = {
          success: result.success,
          result: {
            ...(result.checkFolder ? { checkFolder: result.checkFolder } : {}),
            ...(result.checkFile ? { checkFile: result.checkFile } : {}),
          },
          clipboard: result.clipboard,
        };

        return res.end(JSON.stringify(safePayload));
      }

      res.writeHead(400);
      res.end(JSON.stringify({ error: "Unknown action" }));
      } catch (err) {
        console.error(err);
        if (res.headersSent) return;
        if (err && err.code === "EACCES") {
          res.writeHead(403);
          return res.end(JSON.stringify({ error: err.message, path: err.path }));
        }
        if (err && err.code === "EINVAL") {
          res.writeHead(400);
          return res.end(JSON.stringify({ error: err.message }));
        }
        if (err && err.code === "ENOENT" && err.path) {
          res.writeHead(400);
          return res.end(JSON.stringify({ error: err.message, path: err.path }));
        }
        res.writeHead(500);
        res.end(JSON.stringify({ error: err.message }));
      }
  });
}

module.exports = {
  handleFetchfiles
};