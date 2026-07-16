const http = require("http");
const fs = require("fs-extra");
const path = require("path");
const fsp = require("fs/promises");
const AdmZip = require("adm-zip");
const { pipeline } = require("stream");
const { promisify } = require("util");
const pipelineAsync = promisify(pipeline);

async function walkDir(dir, base = dir) {
  const entries = await fsp.readdir(dir, { withFileTypes: true });
  const files = [];

  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);

    if (entry.isDirectory()) {
      files.push(...(await walkDir(fullPath, base)));
    } else {
      // Avoid reading entire file into memory when listing folders.
      const stat = await fsp.stat(fullPath);
      files.push({
        name: entry.name,
        relativePath: path.relative(base, fullPath).replace(/\\/g, "/"),
        size: stat.size,
      });
    }
  }

  return files;
}

function isPlainObject(value) {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function getUserAuthFilePath(username) {
  return path.join(directoryPath, username, `${username}.txt`);
}

async function readUserAuth(username) {
  const filePath = getUserAuthFilePath(username);
  try {
    const txt = await fsp.readFile(filePath, "utf8");
    const trimmed = typeof txt === "string" ? txt.trim() : "";
    if (!trimmed) return {};
    const parsed = JSON.parse(trimmed);
    return isPlainObject(parsed) ? parsed : {};
  } catch (err) {
    if (err && (err.code === "ENOENT" || err.code === "EISDIR")) {
      return {};
    }
    return {};
  }
}

async function writeUserAuth(username, authObj) {
  const filePath = getUserAuthFilePath(username);
  const existing = await readUserAuth(username);
  const merged = {
    ...existing,
    ...(isPlainObject(authObj) ? authObj : {}),
  };
  await fsp.mkdir(path.dirname(filePath), { recursive: true });
  await fsp.writeFile(filePath, JSON.stringify(merged, null, 2), "utf8");
}

function getUsernameFromRoot(rootPath) {
  return path.basename(path.dirname(rootPath));
}

async function getUserUsedBytes(userRoot, username) {
  if (!username) username = getUsernameFromRoot(userRoot);
  const authObj = await readUserAuth(username);
  if (Number.isFinite(authObj.usedBytes) && authObj.usedBytes >= 0) {
    return authObj.usedBytes;
  }
  const calculated = await getDirSizeBytes(userRoot).catch(() => 0);
  authObj.usedBytes = calculated;
  await writeUserAuth(username, authObj).catch(() => {});
  return calculated;
}

async function adjustUserUsedBytes(userRoot, username, delta) {
  if (!username) username = getUsernameFromRoot(userRoot);
  if (!Number.isFinite(delta) || delta === 0) return;
  const authObj = await readUserAuth(username);
  let current = Number.isFinite(authObj.usedBytes) ? authObj.usedBytes : null;
  if (current === null) {
    current = await getDirSizeBytes(userRoot).catch(() => 0);
  }
  const updated = Math.max(0, current + Number(delta));
  authObj.usedBytes = updated;
  await writeUserAuth(username, authObj).catch(() => {});
}

// Authenticate a username/password pair against a per-user JSON file
// placed next to the user's folder: <username>/<username>.txt
// If the user file does not exist, authentication fails.
// If the user file exists but contains no `password` field, allow.
async function authenticateUser(username, providedPassword, authHeader) {
  try {
    if (!username) return false;
    const userDir = path.join(directoryPath, username);
    const userFile = path.join(userDir, `${username}.txt`);
    try {
      const txt = await fsp.readFile(userFile, "utf8");
      const obj = JSON.parse(txt);
      if (obj && typeof obj.password === "string" && obj.password.length) {
        // Check password match first
        if (providedPassword === obj.password) return true;
        // Otherwise check bearer token from header
        if (
          typeof authHeader === "string" &&
          authHeader.startsWith("Bearer ")
        ) {
          const token = authHeader.slice(7).trim();
          if (Array.isArray(obj.authTokens)) {
            const now = Date.now();
            obj.authTokens = obj.authTokens.filter(
              (t) => t && t.expires && t.expires > now,
            );
            return obj.authTokens.some(
              (t) => t.token === token && t.expires > now,
            );
          }
        }
        return false;
      }
      // no password set → allow
      return true;
    } catch (e) {
      // missing or unreadable user file → deny (prevents recreating deleted accounts)
      return false;
    }
  } catch (e) {
    return false;
  }
}

let directoryPath = path.resolve(__dirname, "./zmcdfiles");
if (!fs.existsSync(directoryPath))
  fs.mkdirSync(directoryPath, { recursive: true });

function normalizeUserRelativePath(inputPath) {
  if (typeof inputPath !== "string") return "";
  const cleaned = inputPath.replace(/\\/g, "/").trim();
  if (!cleaned) return "";

  const normalized = path.posix.normalize("/" + cleaned).replace(/^\/+/, "");
  if (!normalized || normalized === ".") return "";
  if (normalized.startsWith("..") || normalized.includes("/../")) return "";

  return normalized;
}

function normalizePermissionPath(value) {
  const raw = String(value || "")
    .replace(/\\/g, "/")
    .trim();
  if (!raw) return "/";
  const normalized = path.posix.normalize(
    raw.startsWith("/") ? raw : `/${raw}`,
  );
  if (!normalized || normalized === ".") return "/";
  if (normalized.includes("..")) return "";
  return normalized;
}

function normalizePermissionEntries(entries) {
  const list = Array.isArray(entries) ? entries : [];
  const out = [];
  for (const row of list) {
    const normalizedPath = normalizePermissionPath(row && row.path);
    if (!normalizedPath) continue;
    const perm = row && row.perm ? row.perm : {};
    out.push({
      path: normalizedPath,
      perm: {
        read: perm.read !== false,
        write: perm.write !== false,
      },
    });
  }
  if (!out.some((row) => row && row.path === "/systemfiles")) {
    out.push({
      path: "/systemfiles",
      perm: {
        read: true,
        write: false,
      },
    });
  }
  return out;
}

function sanitizeZipEntryPath(entryName) {
  if (typeof entryName !== "string") return "";
  const repaired = entryName.replace(/\\/g, "/").trim();
  if (!repaired) return "";
  const normalized = path.posix.normalize(repaired);
  if (!normalized || normalized === "." || normalized.startsWith("/"))
    return "";
  if (
    normalized === ".." ||
    normalized.includes("/../") ||
    normalized.includes("../")
  )
    return "";
  const parts = normalized.split("/").filter(Boolean);
  if (!parts.length) return "";
  return parts.join("/");
}

async function writeEditPayload(filePath, buffer, { replace = true } = {}) {
  const content = Buffer.isBuffer(buffer)
    ? buffer
    : Buffer.from(String(buffer));
  await fsp.mkdir(path.dirname(filePath), { recursive: true });

  if (replace) {
    await fsp.writeFile(filePath, content);
  } else {
    await fsp.appendFile(filePath, content);
  }
}

async function getDirSizeBytes(dir) {
  let total = 0;
  try {
    const entries = await fsp.readdir(dir, { withFileTypes: true });
    for (const entry of entries) {
      if (entry.name && entry.name.startsWith(".temp")) continue;
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
  const normalizedRel = normalizeUserRelativePath(relPath);
  const normalizedTarget = normalizePermissionPath(
    normalizedRel ? `/${normalizedRel}` : "/",
  );
  if (!normalizedTarget) return { read: false, write: false };

  let matched = null;
  for (const row of permissionEntries || []) {
    const base = normalizePermissionPath(row && row.path);
    if (!base) continue;
    const isMatch =
      normalizedTarget === base || normalizedTarget.startsWith(`${base}/`);
    if (!isMatch) continue;
    if (!matched || base.length > matched.path.length) {
      matched = {
        path: base,
        perm: {
          read: row.perm && row.perm.read !== false,
          write: row.perm && row.perm.write !== false,
        },
      };
    }
  }

  if (!matched) return { read: true, write: true };
  return matched.perm;
}

// Storage quota (bytes). Can be overridden by env var STORAGE_QUOTA_BYTES.
const DEFAULT_QUOTA_BYTES =
  Number(process.env.STORAGE_QUOTA_BYTES) || 5 * 1024 * 1024 * 1024; // 5 GB default
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
      const stats = await fsp.stat(fullPath);
      if (entry.isDirectory()) {
        nodes.push([
          entry.name,
          await walk(fullPath),
          { mtime: stats.mtimeMs, mtimeMs: stats.mtimeMs },
        ]);
      } else {
        nodes.push([
          entry.name,
          null,
          {
            size: stats.size,
            mtime: stats.mtimeMs,
            mtimeMs: stats.mtimeMs,
          },
        ]);
      }
    }

    return nodes;
  }

  const rootStat = await fsp.stat(rootPath).catch(() => null);
  const rootMeta = rootStat
    ? { mtime: rootStat.mtimeMs, mtimeMs: rootStat.mtimeMs }
    : {};
  return ["root", await walk(rootPath), rootMeta];
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

    req.on("data", chunk => {
      total += chunk.length;
      console.log("data", chunk.length, "total:", total);
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
      console.log("ABORTED total:", total);
    });
req.socket.on("close", hadError => {
  console.log("socket close", hadError);
});

req.socket.on("error", err => {
  console.log("socket error", err);
});

req.on("aborted", () => {
  console.log("ABORTED");
  console.log("req.complete =", req.complete);
  console.log("req.destroyed =", req.destroyed);
  res.writeHead(499);
  res.end(JSON.stringify({ error: "Client aborted the request" }));
});
  });
}

async function handleRawFileUpload(req, res) {
  console.log({
  contentLength: req.headers["content-length"],
  transferEncoding: req.headers["transfer-encoding"],
});
  const headers = req.headers || {};
  const username = String(headers["x-username"] || "").trim();
  const password = String(headers["x-password"] || "").trim();
  const authHeader = headers.authorization || headers.Authorization || "";
  const relPath = String(headers["x-file-path"] || "").trim();

  if (!username || !relPath) {
    res.writeHead(400);
    return res.end(JSON.stringify({ error: "Missing username or file path" }));
  }

  if (!(await authenticateUser(username, password, authHeader))) {
    res.writeHead(401);
    return res.end(JSON.stringify({ error: "unauthorized" }));
  }

  const normalizedPath = normalizeUserRelativePath(relPath);
  if (!normalizedPath) {
    res.writeHead(400);
    return res.end(JSON.stringify({ error: "Invalid file path" }));
  }

  const authFilePath = path.join(directoryPath, username, `${username}.txt`);
  let userPathPermissions = [];
  try {
    const authContent = await fsp.readFile(authFilePath, "utf8");
    const authObj = JSON.parse(authContent);
    userPathPermissions = normalizePermissionEntries(
      authObj && authObj.pathPermissions,
    );
  } catch (e) {
    userPathPermissions = [];
  }

  const permission = getPermissionForRelativePath(
    normalizedPath,
    userPathPermissions,
  );
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
  const userRoot = path.join(directoryPath, username, "root");
  // await fsp.mkdir(userRoot, { recursive: true });
  const filePath = path.join(userRoot, normalizedPath);
  const rawBody = await getRawBody(req);

  let oldSize = 0;
  try {
    const st = await fsp.stat(filePath);
    if (st.isFile()) oldSize = st.size;
  } catch (e) {
    oldSize = 0;
  }

  const currentUsed = await getUserUsedBytes(userRoot, username);
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
  if (delta !== 0) {
    await adjustUserUsedBytes(userRoot, username, delta).catch(() => {});
  }
  res.writeHead(200, { "Content-Type": "application/json" });
  return res.end(JSON.stringify({ success: true }));
}

// ─────────────────────────────
// Server
// ─────────────────────────────

async function handleFetchfiles(req, res) {


  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST,OPTIONS");
  res.setHeader(
    "Access-Control-Allow-Headers",
    "Content-Type, Authorization, X-Username, X-File-Path, X-File-Replace, X-File-Action",
  );
  res.setHeader(
    "Access-Control-Expose-Headers",
    "X-File-Size,X-Chunk-Index,X-Is-Last-Chunk,X-Total-Chunks",
  );
  // safe response helpers (prevent double-write/write-after-end)
  const safeWriteHead = (code, headers) => {
    try {
      if (res.headersSent) return;
      res.writeHead(code, headers);
    } catch (e) {
      console.warn("safeWriteHead failed", e);
    }
  };
  const safeEnd = (body) => {
    try {
      if (res.writableEnded) return;
      return res.end(body);
    } catch (e) {
      console.warn("safeEnd failed", e);
    }
  };
  const safeRespond = (code, body) => {
    if (typeof code === "number") safeWriteHead(code);
    return safeEnd(body);
  };

  // Protect against accidental writes after end by overriding res.end for this request
  try {
    const _origEnd = res.end.bind(res);
    res.end = function (body, ...args) {
      try {
        if (res.writableEnded) return;
        return _origEnd(body, ...args);
      } catch (e) {
        console.warn("res.end override failed", e);
      }
    };
  } catch (e) {
    console.warn("Failed to install res.end override", e);
  }

  if (req.method === "OPTIONS") {
    return safeRespond(204);
  }

  // Helper: safe JSON stringify that avoids crashing on circular structures
  function safeStringify(obj) {
    const seen = new WeakSet();
    return JSON.stringify(obj, function (key, value) {
      if (typeof value === "object" && value !== null) {
        if (seen.has(value)) return "[Circular]";
        seen.add(value);
      }
      // avoid accidentally serializing sockets or request/response objects
      if (
        value &&
        (value instanceof req.constructor || value instanceof res.constructor)
      )
        return "[Non-serializable]";
      return value;
    });
  }
  // Support simple streaming download endpoint for large files.
  // console.log('fetchfiles request', req.method, req.url);
  if (
    req.method === "POST" &&
    req.headers["content-type"] &&
    req.headers["content-type"].startsWith("application/octet-stream") &&
    req.headers["x-file-action"] === "write"
  ) {
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

    const username =
      typeof data.username === "string" ? data.username.trim() : "";
    if (!username) {
      res.writeHead(400);
      return res.end(JSON.stringify({ error: "Missing username" }));
    }

    // Authenticate all POST actions. If the user has a password set
    // in their user file (username.txt) it must match `data.password`.
    const authHeader =
      (req.headers &&
        (req.headers.authorization || req.headers.Authorization)) ||
      "";
    if (!(await authenticateUser(username, data.password, authHeader))) {
      res.writeHead(401);
      return res.end(JSON.stringify({ error: "unauthorized" }));
    }

    const authFilePath = path.join(directoryPath, username, `${username}.txt`);
    let userPathPermissions = [];
    try {
      const authContent = await fsp.readFile(authFilePath, "utf8");
      const authObj = JSON.parse(authContent);
      userPathPermissions = normalizePermissionEntries(
        authObj && authObj.pathPermissions,
      );
    } catch (e) {
      userPathPermissions = [];
    }

    const userRoot = path.join(directoryPath, username, "root");
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
        const normalizedRequestPath = normalizeUserRelativePath(
          data.requestFileName,
        );
        const jsonResponse = (payload, status = 200) => {
          res.setHeader("Content-Type", "application/json");
          if (status && status !== 200) res.writeHead(status);
          return res.end(JSON.stringify(payload));
        };

        if (!normalizedRequestPath) {
          return jsonResponse({ error: "Invalid file path" }, 400);
        }

        const permission = getPermissionForRelativePath(
          normalizedRequestPath,
          userPathPermissions,
        );
        if (!permission.read) {
          return jsonResponse(
            {
              error: "read permission denied",
              path: `/${normalizedRequestPath}`,
            },
            403,
          );
        }

        const fullPath = path.join(userRoot, normalizedRequestPath);
        const relativeToRoot = path.relative(userRoot, fullPath);
        if (
          relativeToRoot.startsWith("..") ||
          path.isAbsolute(relativeToRoot)
        ) {
          return jsonResponse({ error: "Invalid file path" }, 400);
        }

        let stat;
        try {
          stat = await fsp.stat(fullPath);
        } catch (e) {
          if (e && e.code === "ENOENT") {
            return jsonResponse(
              {
                missing: true,
                code: "ENOENT",
                kind: "missing",
                requestFileName: data.requestFileName,
              },
              404,
            );
          }
          throw e;
        }

        if (stat.isDirectory()) {
          const files = await walkDir(fullPath);
          return jsonResponse({ kind: "folder", files });
        }

        if (!stat.isFile()) {
          return jsonResponse({ error: "Unsupported path type" }, 400);
        }

        const fileSize = stat.size;
        const chunkSize = 10 * 1024 * 1024; // 10MB chunks
        const chunkIndex =
          typeof data.chunkIndex === "number" ? data.chunkIndex : 0;
        const start = chunkIndex * chunkSize;
        const end = Math.min(start + chunkSize, fileSize);
        const isLastChunk = end >= fileSize;

        if (!data.buffer && !data.text) {
          return jsonResponse(
            {
              error:
                "Base64 transport is no longer supported. Use buffer or text transfer.",
            },
            400,
          );
        }

        if (start >= fileSize) {
          return jsonResponse({ error: "chunkIndex out of range" }, 400);
        }

        const chunkBuffer = await readFileChunk(fullPath, start, end);
        res.setHeader("Content-Type", "application/octet-stream");
        res.setHeader("X-File-Size", String(fileSize));
        res.setHeader("X-Chunk-Index", String(chunkIndex));
        res.setHeader("X-Is-Last-Chunk", isLastChunk ? "1" : "0");
        res.setHeader(
          "X-Total-Chunks",
          String(Math.ceil(fileSize / chunkSize)),
        );
        return res.end(chunkBuffer);
      }

      if (data.requestFolder) {
        const normalizedRequestPath = normalizeUserRelativePath(
          data.requestFolderName,
        );
        // return an array with all the file/folder names in the requested folder (non-recursive)

        // normalizedRequestPath may be empty for root; use '' for permission lookup
        const relForPerm = normalizedRequestPath || "";
        const permission = getPermissionForRelativePath(
          relForPerm,
          userPathPermissions,
        );
        if (!permission.read) {
          res.writeHead(403);
          return res.end(
            JSON.stringify({
              error: "read permission denied",
              path: `/${relForPerm}`,
            }),
          );
        }

        const fullPath = path.join(userRoot, normalizedRequestPath);
        const relativeToRoot = path.relative(userRoot, fullPath);
        if (
          relativeToRoot.startsWith("..") ||
          path.isAbsolute(relativeToRoot)
        ) {
          return res.end(JSON.stringify({ error: "Invalid folder path" }));
        }

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

        if (!stat.isDirectory()) {
          return res.end(
            JSON.stringify({
              error: "Not a directory",
              path: `/${relForPerm}`,
            }),
          );
        }

        const dirents = await fsp.readdir(fullPath, { withFileTypes: true });
        const names = dirents.map((d) => d.name);
        return res.end(JSON.stringify({ kind: "folder", files: names }));
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

      async function applyDirections(
        rootPath,
        directions,
        username,
        userPathPermissions,
      ) {
        // result object used to return information back to the caller
        const result = {};
        // Initialize clipboard from server storage or create new
        let clipboard = userClipboards.get(username) || null;

        const resolvePath = (p = "") => {
          // Normalize and support several caller conventions:
          // - empty or 'root' -> rootPath
          // - 'root/dir/sub' -> drop leading 'root'
          // - 'dir/sub' -> relative to rootPath
          if (!p || p === "root") return rootPath;
          const parts = p.split("/").filter(Boolean);
          if (parts[0] === "root") parts.shift();
          return path.join(rootPath, ...parts);
        };

        const directionPathToRelative = (p = "") => {
          if (!p || p === "root") return "";
          const parts = String(p).split("/").filter(Boolean);
          if (parts[0] === "root") parts.shift();
          return normalizeUserRelativePath(parts.join("/"));
        };

        const assertReadAllowed = (relativePath) => {
          const perm = getPermissionForRelativePath(
            relativePath,
            userPathPermissions,
          );
          if (!perm.read) {
            const err = new Error(`Read permission denied: /${relativePath}`);
            err.code = "EACCES";
            throw err;
          }
        };

        const assertWriteAllowed = (relativePath) => {
          const perm = getPermissionForRelativePath(
            relativePath,
            userPathPermissions,
          );
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
        const ensureDir = async (p) => {
          await fsp.mkdir(p, { recursive: true });
        };
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
              const requestedPath =
                typeof dir.path === "string" ? dir.path : "";
              const normalizedRequestedPath =
                normalizeUserRelativePath(requestedPath);
              if (normalizedRequestedPath) {
                folderPath = resolvePath(requestedPath);
                parentPath = path.dirname(folderPath);
              } else {
                parentPath = resolvePath("root");
                folderPath = path.join(parentPath, `new-folder-${Date.now()}`);
              }
            }

            const parentRel = normalizeUserRelativePath(
              path
                .relative(rootPath, parentPath || rootPath)
                .replace(/\\/g, "/"),
            );
            assertWriteAllowed(parentRel);

            await ensureDir(parentPath || rootPath);

            // If an entry exists at the target path, ensure it's a directory.
            const existingStat = await statCached(folderPath);
            if (existingStat) {
              if (!existingStat.isDirectory()) {
                throw new Error(
                  `Cannot create folder, file exists: ${folderPath}`,
                );
              }
              // already a folder → OK
            } else {
              await fsp.mkdir(folderPath, { recursive: true });
            }

            continue;
          }
          if (dir.deleteFolder) {
            const folderRel = directionPathToRelative(dir.path || "");
            assertWriteAllowed(folderRel);
            const normalizedRequestPath = normalizeUserRelativePath(dir.path);
            if (!normalizedRequestPath) {
              return res.end(JSON.stringify({ error: "Invalid folder path" }));
            }
            fsp.rm(path.join(userRoot, normalizedRequestPath), {
              recursive: true,
              force: true,
            });
            continue;
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
              return res.end(
                JSON.stringify({ exists: true, path: `/${folderRel}` }),
              );
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
              return res.end(
                JSON.stringify({ exists: true, path: `/${fileRel}` }),
              );
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
              const oldRel = dir.path.split("/").slice(1).join("/");
              const newPath = path.join(path.dirname(oldPath), dir.newName);
              const newRel = path
                .join(path.dirname(oldRel), dir.newName)
                .replace(/\\/g, "/");
              assertWriteAllowed(normalizeUserRelativePath(newRel));
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
              console.error(e);
            }
            continue;
          }

          if (dir.delete) {
            const deleteRelPath = directionPathToRelative(dir.path || "");
            assertWriteAllowed(deleteRelPath);
            const targetPath = resolvePath(dir.path);
            const relativeTarget = path
              .relative(rootPath, targetPath)
              .replace(/\\/g, "/");
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
                  error:
                    moveErr &&
                    (moveErr.stack || moveErr.message || String(moveErr)),
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
            if (
              !normalizedTarget.startsWith(normalizedTrash + path.sep) &&
              normalizedTarget !== normalizedTrash
            ) {
              // Not inside .trash — refuse
              continue;
            }
            const deleteSize = await getDirSizeBytes(targetPath).catch(() => 0);
            await fsp.rm(targetPath, { recursive: true, force: true });
            if (deleteSize !== 0) {
              await adjustUserUsedBytes(rootPath, username, -deleteSize).catch(
                () => {},
              );
            }
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
            let dest = path.join(rootPath, itemName);
            // Avoid overwriting by appending a numeric suffix
            if (await existsCached(dest)) {
              let n = 1;
              while (
                await existsCached(path.join(rootPath, `(${n}) ${itemName}`))
              )
                n++;
              dest = path.join(rootPath, `(${n}) ${itemName}`);
            }
            await fsp.rename(targetPath, dest);
            continue;
          }

          if (dir.copy) {
            const copyRows = Array.isArray(dir.directions)
              ? dir.directions
              : [];
            for (const row of copyRows) {
              const copyRelPath = normalizeUserRelativePath(
                row && row.path ? row.path : "",
              );
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
            const destinationRelPath = directionPathToRelative(
              dir.path || "root",
            );
            assertWriteAllowed(destinationRelPath);
            const destinationDir = path.join(userRoot, dir.path);
            // Resolve per-user quota and current usage once
            const quota = await getUserQuotaBytes(userRoot);
            let currentUsed = await getUserUsedBytes(userRoot, username);
            let pasteDelta = 0;

            // Check and copy/move each item; abort the whole paste if any item would exceed quota
            for (const item of clipboard) {
              const sourceRelPath = normalizeUserRelativePath(
                item && item.path ? item.path : "",
              );
              assertReadAllowed(sourceRelPath);
              const src = path.join(userRoot, item.path);

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
                throw new Error(
                  `Storage quota exceeded: cannot paste "${path.basename(item.path)}" (${srcSize} bytes)`,
                );
              }
                // Copy
                await fsp.cp(src, dest, {
                  recursive: true,
                  force: false,
                });
                pasteDelta += srcSize;
                currentUsed += srcSize;
            }

            if (pasteDelta !== 0) {
              await adjustUserUsedBytes(userRoot, username, pasteDelta).catch(
                () => {},
              );
            }
            continue;
          }

          if (dir.edit) {
            // Two modes supported for edits:
            // 2) Chunked upload: dir.chunk (single part), dir.chunks (array of parts), and dir.finalize/dir.finalizeUpload to assemble
            const destRel = dir.path || "";
            const editRelPath = directionPathToRelative(destRel);
            assertWriteAllowed(editRelPath);
            // console.log(destRel)
            const filePath = resolvePath(destRel);
            // console.log(filePath)

            const shouldReplace = dir.replace !== false;

            // If caller requests replace:true, remove existing file and any temp parts
            if (dir.replace) {
              // console.log(dir.path)
              try {
                // remove existing final file if present
                await fsp.rm(filePath, { force: true, recursive: false });
              } catch (e) {
                // ignore errors
              }
              try {
                // remove temp part files for this target
                const safeName = destRel
                  .replace(/\\/g, "_")
                  .replace(/[^a-zA-Z0-9._-]/g, "_");
                const parts = (await fsp.readdir(userTempDir)).filter((f) =>
                  f.startsWith(`${safeName}.part.`),
                );
                for (const p of parts)
                  await fsp.rm(path.join(userTempDir, p), { force: true });
              } catch (e) {
                // ignore cleanup errors
              }
            }

            // Special request: check which part files already exist for resume support
            if (dir.checkParts) {
              const destRel = dir.path || "";
              const safeName = destRel
                .replace(/\\/g, "_")
                .replace(/[^a-zA-Z0-9._-]/g, "_");
              let parts = (await fsp.readdir(userTempDir)).filter((f) =>
                f.startsWith(`${safeName}.part.`),
              );

              // If no parts found, attempt to discover parts using alternative naming
              // strategies (sanitization mismatches, omitted leading 'root', or basename-only).
              if (!parts || parts.length === 0) {
                try {
                  const all = await fsp.readdir(userTempDir);
                  // write directory snapshot for diagnostics
                  try {
                    await fsp.writeFile(
                      path.join(userTempDir, `${safeName}.tempdir.json`),
                      JSON.stringify(all, null, 2),
                    );
                  } catch (e) {}

                  // candidate names to try
                  const candidates = new Set();
                  candidates.add(safeName);
                  if (safeName.startsWith("root_"))
                    candidates.add(safeName.replace(/^root_/, ""));
                  // try using only basename
                  candidates.add(
                    path.basename(destRel).replace(/[^a-zA-Z0-9._-]/g, "_"),
                  );
                  // also try url-encoded and decoded variants
                  candidates.add(encodeURIComponent(safeName));
                  candidates.add(decodeURIComponent(safeName));

                  for (const c of candidates) {
                    const found = all.filter((f) => f.startsWith(`${c}.part.`));
                    if (found && found.length) {
                      parts = found;
                      console.warn(
                        "VFS finalize: found parts using alternative candidate",
                        c,
                        "count",
                        found.length,
                      );
                      break;
                    }
                  }
                } catch (e) {
                  // ignore
                }
              }
              const indices = parts
                .map((p) => {
                  const m = p.match(/\.part\.(\d+)$/);
                  return m ? Number(m[1]) : NaN;
                })
                .filter((n) => !Number.isNaN(n));
              result.checkParts = result.checkParts || {};
              result.checkParts[destRel] = indices.sort((a, b) => a - b);
              continue;
            }

            // 2a) Chunk(s) provided as an array
            if (Array.isArray(dir.chunks) && dir.chunks.length) {
              for (const ch of dir.chunks) {
                const idxNum = Number.isFinite(Number(ch.index))
                  ? Number(ch.index)
                  : 0;
                const idx = String(Number(idxNum)).padStart(6, "0");
                const chunkBase64 = ch.chunk || ch.data || ch.contents || "";
                const safeName = destRel
                  .replace(/\\/g, "_")
                  .replace(/[^a-zA-Z0-9._-]/g, "_");
                const partPath = path.join(
                  userTempDir,
                  `${safeName}.part.${idx}`,
                );
                const buffer = Buffer.from(chunkBase64, "base64");
                await fsp.writeFile(partPath, buffer);
              }
              continue;
            }

            // 2b) Single chunk entry
            if (dir.chunk) {
              const idxNum = Number.isFinite(Number(dir.index))
                ? Number(dir.index)
                : 0;
              const idx = String(Number(idxNum)).padStart(6, "0");
              const chunkBase64 = dir.chunk || "";
              const safeName = destRel
                .replace(/\\/g, "_")
                .replace(/[^a-zA-Z0-9._-]/g, "_");
              const partPath = path.join(
                userTempDir,
                `${safeName}.part.${idx}`,
              );
              const buffer = Buffer.from(chunkBase64, "base64");
              await fsp.writeFile(partPath, buffer);
              continue;
            }

            // 2c) Finalize assembly if requested
            if (dir.finalize || dir.finalizeUpload) {
              // Ensure target dir exists
              await fsp.mkdir(path.dirname(filePath), { recursive: true });

              const safeName = destRel
                .replace(/\\/g, "_")
                .replace(/[^a-zA-Z0-9._-]/g, "_");
              const parts = (await fsp.readdir(userTempDir)).filter((f) =>
                f.startsWith(`${safeName}.part.`),
              );

              // Quota check: sum parts (also collect diagnostics)
              let partsTotal = 0;
              let oldSize = 0;
              const partsInfo = [];
              for (const p of parts) {
                const pth = path.join(userTempDir, p);
                let s = { size: 0 };
                try {
                  s = await fsp.stat(pth);
                } catch (e) {
                  /* ignore stat errors */
                }
                partsTotal += s.size || 0;
                partsInfo.push({ name: p, size: s.size || 0 });
              }

              // Write diagnostic parts file to help debug zero-byte assembly issues
              try {
                await fsp.writeFile(
                  path.join(userTempDir, `${safeName}.parts.json`),
                  JSON.stringify(partsInfo, null, 2),
                );
              } catch (e) {
                console.warn("VFS: failed to write parts diagnostic file", e);
              }

              console.warn("VFS finalize:", {
                safeName,
                partsCount: parts.length,
                partsTotal,
                filePath,
              });

              if (parts.length === 0 || partsTotal === 0) {
                console.error(
                  "VFS finalize: no parts or zero total bytes for",
                  safeName,
                  filePath,
                );
                // Throw to surface error to caller so the client can retry instead of creating 0-byte file
                throw new Error(`No upload parts found for ${safeName}`);
              }

              const quota = await getUserQuotaBytes(rootPath);
              const currentUsed = await getUserUsedBytes(rootPath, username);
              if (shouldReplace) {
                try {
                  const stat = await fsp.stat(filePath);
                  if (stat.isFile()) oldSize = stat.size || 0;
                } catch (e) {
                  oldSize = 0;
                }
              }

              const delta = shouldReplace ? partsTotal - oldSize : partsTotal;
              if (delta > 0 && currentUsed + delta > quota) {
                for (const p of parts)
                  await fsp.rm(path.join(userTempDir, p), { force: true });
                throw new Error(
                  `Storage quota exceeded: cannot finalize upload ${dir.path}`,
                );
              }

              parts.sort((a, b) => {
                const ma = a.match(/\.part\.(\d+)$/);
                const mb = b.match(/\.part\.(\d+)$/);
                const ai = ma ? Number(ma[1]) : 0;
                const bi = mb ? Number(mb[1]) : 0;
                return ai - bi;
              });

              await fsp.mkdir(path.dirname(filePath), { recursive: true });
              const writeStream = fs.createWriteStream(filePath, {
                flags: shouldReplace ? "w" : "a",
              });

              for (const p of parts) {
                const pth = path.join(userTempDir, p);
                await new Promise((resolve, reject) => {
                  const readStream = fs.createReadStream(pth);
                  readStream.on("error", reject);
                  readStream.on("end", resolve);
                  readStream.pipe(writeStream, { end: false });
                });
                await fsp.rm(path.join(userTempDir, p), { force: true });
              }

              await new Promise((resolve, reject) => {
                writeStream.end((err) => {
                  if (err) reject(err);
                  else resolve();
                });
              });

              if (delta !== 0) {
                await adjustUserUsedBytes(rootPath, username, delta).catch(
                  () => {},
                );
              }
              continue;
            }

            // 1) Inline small-file edit (unchanged behavior)
            if (typeof dir.contents === "string") {
              const buffer = Buffer.from(dir.contents, "base64");
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

              const currentUsed = await getUserUsedBytes(rootPath, username);
              const delta = shouldReplace ? newSize - oldSize : newSize;
              const quota = await getUserQuotaBytes(rootPath);
              if (delta > 0 && currentUsed + delta > quota) {
                throw new Error(
                  `Storage quota exceeded: cannot write ${path.basename(filePath)} (${delta} additional bytes)`,
                );
              }

              await writeEditPayload(filePath, buffer, {
                replace: shouldReplace,
              });
              if (delta !== 0) {
                await adjustUserUsedBytes(rootPath, username, delta).catch(
                  () => {},
                );
              }
              continue;
            }

            // nothing matched: skip
            continue;
          }
          if (dir.end) {
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
      if (data.unzip) {
        try {
          const zipRelPath = normalizeUserRelativePath(data.path);
          if (!zipRelPath) {
            return res.end(JSON.stringify({ error: "Invalid zip path" }));
          }

          const zipFullPath = path.join(userRoot, zipRelPath);
          const zipRelativeToRoot = path.relative(userRoot, zipFullPath);
          if (
            zipRelativeToRoot.startsWith("..") ||
            path.isAbsolute(zipRelativeToRoot)
          ) {
            return res.end(JSON.stringify({ error: "Invalid zip path" }));
          }

          const zipSourcePerm = getPermissionForRelativePath(
            zipRelPath,
            userPathPermissions,
          );
          if (!zipSourcePerm.read) {
            res.writeHead(403);
            return res.end(
              JSON.stringify({
                error: "read permission denied",
                path: `/${zipRelPath}`,
              }),
            );
          }

          let zipStat;
          try {
            zipStat = await fsp.stat(zipFullPath);
          } catch (e) {
            if (e && e.code === "ENOENT") {
              return res.end(
                JSON.stringify({
                  missing: true,
                  code: "ENOENT",
                  kind: "missing",
                  path: data.path,
                }),
              );
            }
            throw e;
          }

          if (!zipStat.isFile()) {
            return res.end(JSON.stringify({ error: "Zip path is not a file" }));
          }

          const destinationRelPath = normalizeUserRelativePath(
            data.destinationFolder || path.posix.dirname(zipRelPath),
          );
          if (destinationRelPath === "") {
            const destinationPerm = getPermissionForRelativePath(
              "",
              userPathPermissions,
            );
            if (!destinationPerm.write) {
              res.writeHead(403);
              return res.end(
                JSON.stringify({ error: "write permission denied", path: "/" }),
              );
            }
          } else {
            const destinationPerm = getPermissionForRelativePath(
              destinationRelPath,
              userPathPermissions,
            );
            if (!destinationPerm.write) {
              res.writeHead(403);
              return res.end(
                JSON.stringify({
                  error: "write permission denied",
                  path: `/${destinationRelPath}`,
                }),
              );
            }
          }

          const destinationFullPath = path.join(
            userRoot,
            destinationRelPath || "",
          );
          await fsp.mkdir(destinationFullPath, { recursive: true });

          const zip = new AdmZip(zipFullPath);
          const extractedFiles = [];
          const toExtract = [];
          let unzipDelta = 0;

          for (const entry of zip.getEntries() || []) {
            const entryName = sanitizeZipEntryPath(entry && entry.entryName);
            if (!entryName) continue;
            if (
              entry &&
              (entry.isDirectory ||
                (entry.header && entry.header.isDir) ||
                entry.entryName.endsWith("/"))
            ) {
              continue;
            }

            const outputPath = path.join(
              destinationFullPath,
              ...entryName.split("/"),
            );
            const outputRel = normalizeUserRelativePath(
              path.relative(userRoot, outputPath).replace(/\\/g, "/"),
            );
            if (!outputRel) continue;

            const existingStat = await fsp.stat(outputPath).catch(() => null);
            const existingSize = existingStat && existingStat.isFile() ? existingStat.size : 0;
            const entrySize = Number(entry.header?.size || 0);
            unzipDelta += entrySize - existingSize;
            toExtract.push({ entry, outputPath, outputRel });
          }

          const quota = await getUserQuotaBytes(userRoot);
          const currentUsed = await getUserUsedBytes(userRoot, username);
          if (unzipDelta > 0 && currentUsed + unzipDelta > quota) {
            return res.end(
              JSON.stringify({
                error: `Storage quota exceeded: cannot unzip ${zipRelPath}`,
              }),
            );
          }

          for (const item of toExtract) {
            await fsp.mkdir(path.dirname(item.outputPath), { recursive: true });
            zip.extractEntryTo(item.entry, path.dirname(item.outputPath), false, true);
            extractedFiles.push(item.outputRel);
          }

          if (unzipDelta !== 0) {
            await adjustUserUsedBytes(userRoot, username, unzipDelta).catch(
              () => {},
            );
          }

          return res.end(
            JSON.stringify({
              success: true,
              path: `/${zipRelPath}`,
              destinationFolder: `/${destinationRelPath || ""}`,
              extractedFiles,
            }),
          );
        } catch (err) {
          console.error("unzip error", err);
          res.writeHead(500);
          return res.end(
            JSON.stringify({
              error: err && err.message ? err.message : "Failed to unzip file",
            }),
          );
        }
      }

      if (data.saveSnapshot) {
        // Apply all frontend directions to build tree
        const result = await applyDirections(
          userRoot,
          data.directions,
          username,
          userPathPermissions,
        );

        // Only return safe/serializable parts of result to avoid circular objects
        const safePayload = {
          success: true,
          // prefer explicit known keys; fall back to safeStringify for unexpected content
          result:
            result && typeof result === "object"
              ? {
                  ...(result.checkParts
                    ? { checkParts: result.checkParts }
                    : {}),
                }
              : {},
          clipboard: result && "clipboard" in result ? result.clipboard : null,
        };

        return res.end(safeStringify(safePayload));
      }

      // Save start menu config
      if (data.action === "saveStartMenuConfig" && data.configJson) {
        try {
          const permission = getPermissionForRelativePath(
            "systemfiles/userprofile/startMenu-config.json",
            userPathPermissions,
          );
          if (!permission.write) {
            res.writeHead(403);
            return res.end(
              JSON.stringify({
                error: "write permission denied",
                path: "/systemfiles/userprofile/startMenu-config.json",
              }),
            );
          }
          const configPath = path.join(
            userRoot,
            "systemfiles",
            "userprofile",
            "startMenu-config.json",
          );
          await fsp.mkdir(path.dirname(configPath), { recursive: true });
          await fsp.writeFile(configPath, data.configJson, "utf8");
          return res.end(JSON.stringify({ success: true }));
        } catch (err) {
          console.error("Failed to save startMenu config:", err);
          res.writeHead(500);
          return res.end(
            JSON.stringify({ error: "Failed to save config: " + err.message }),
          );
        }
      }

      console.warn("Unknown action in directions:", dir);
      res.writeHead(400);
      res.end(JSON.stringify({ error: "Unknown action" }));
    } catch (err) {
      console.error(err);
      if (res.headersSent) {
        console.warn(
          "Response headers already sent; cannot send error response",
        );
        return;
      }
      if (err && err.code === "EACCES") {
        res.writeHead(403);
        return res.end(
          JSON.stringify({ error: err.message || "permission denied" }),
        );
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
  writeEditPayload,
  readUserAuth,
  writeUserAuth,
  getUserUsedBytes,
  adjustUserUsedBytes,
};
