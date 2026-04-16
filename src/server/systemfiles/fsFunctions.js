// required functions for user file system
window.protectedGlobals.findNodeByPath = function (relPath) {
  var parts = relPath.split("/");
  var current = window.protectedGlobals.treeData;
  for (let i = 1; i < parts.length; i++) {
    if (!current[1]) return null;
    current = current[1].find((c) => c[0] === parts[i]);
  }
  return current;
};
window.protectedGlobals.removeNodeFromTree = function (node, pathParts) {
  if (!node || !Array.isArray(node[1])) return false;

  var [target, ...rest] = pathParts;

  for (let i = 0; i < node[1].length; i++) {
    var child = node[1][i];

    if (child[0] === target) {
      if (rest.length === 0) {
        node[1].splice(i, 1); // delete node
        return true;
      } else {
        return window.protectedGlobals.removeNodeFromTree(child, rest); // go deeper
      }
    }
  }

  return false; // not found
};

window.protectedGlobals.loadTree = async function () {
  if (window.protectedGlobals.loadTreePromise) {
    return window.protectedGlobals.loadTreePromise;
  }

  window.protectedGlobals.loadTreePromise = (async () => {
    var data = await window.protectedGlobals.filePost({ initFE: true });
    window.protectedGlobals.treeData = data.tree;

    window.protectedGlobals.annotateTreeWithPaths(window.protectedGlobals.treeData); // ✅ ADD THIS LINE
  })();

  try {
    await window.protectedGlobals.loadTreePromise;
  } finally {
    window.protectedGlobals.loadTreePromise = null;
  }

  // render();
};

// --- Global picker helpers ---
window.protectedGlobals.base64ToArrayBuffer = function base64ToArrayBuffer(base64) {
  var binaryString = atob(base64);
  var len = binaryString.length;
  var bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) bytes[i] = binaryString.charCodeAt(i);
  return bytes.buffer;
};

// UTF-8 safe base64 -> string helper. Use this for text files (JS, txt, svg, etc.)
window.protectedGlobals.base64ToUtf8 = function base64ToUtf8(b64OrBuffer) {
  try {
    // If caller passed an ArrayBuffer or Uint8Array, decode directly
    if (
      b64OrBuffer &&
      (b64OrBuffer instanceof ArrayBuffer || ArrayBuffer.isView(b64OrBuffer))
    ) {
      var buf =
        b64OrBuffer instanceof ArrayBuffer ? b64OrBuffer : b64OrBuffer.buffer;
      return new TextDecoder("utf-8").decode(buf);
    }

    // Otherwise assume base64 string
    var buf = window.protectedGlobals.base64ToArrayBuffer(String(b64OrBuffer || ""));
    return new TextDecoder("utf-8").decode(buf);
  } catch (e) {
    try {
      // fallback to atob for environments without TextDecoder support
      if (typeof b64OrBuffer === "string") return atob(b64OrBuffer);
    } catch (ee) {}
    return "";
  }
};

window.protectedGlobals.decodeFileTextStrict = function decodeFileTextStrict(rawContent, pathLabel, options) {
  var opts = options && typeof options === "object" ? options : {};
  var allowEmpty = !!opts.allowEmpty;
  var text = "";

  try {
    text = window.protectedGlobals.base64ToUtf8(rawContent);
  } catch (e) {
    window.protectedGlobals.throwError(
      "decodeFileTextStrict",
      "Failed to decode file content.",
      e,
      String(pathLabel || "unknown path"),
    );
    return "";
  }

  if (typeof text !== "string") {
    window.protectedGlobals.throwError("decodeFileTextStrict", "Decoded file content is not text.", null, String(pathLabel || "unknown path"));
    return "";
  }

  if (!allowEmpty && !text.trim()) {
    window.protectedGlobals.throwError("decodeFileTextStrict", "File content is empty.", null, String(pathLabel || "unknown path"));
    return "";
  }

  return text;
};
window.protectedGlobals.fetchFileContentByPath = async function fetchFileContentByPath(path) {
  if (!path) throw new Error("No path");
  var normalizedPath = String(path).trim();
  if (!normalizedPath) throw new Error("No path");

  var now = Date.now();
  var recentHit = window.protectedGlobals.fileFetchRecent.get(normalizedPath);
  if (recentHit && now - recentHit.ts <= window.protectedGlobals.FLOWAWAY_FILE_FETCH_CACHE_MS) {
    return recentHit.value;
  }

  var inFlight = window.protectedGlobals.fileFetchInFlight.get(normalizedPath);
  if (inFlight) {
    return inFlight;
  }

  var req = (async () => {
    var res = await window.protectedGlobals.filePost({
      requestFile: true,
      requestFileName: normalizedPath,
    });

    if (!res || typeof res !== "object") {
      window.protectedGlobals.flowawayCrash("File read returned invalid response.", normalizedPath);
    }

    // If server returned a simple base64 payload for small files
    if (
      res &&
      typeof res.filecontent === "string" &&
      (!res.totalChunks || res.totalChunks <= 1)
    ) {
      window.protectedGlobals.fileFetchRecent.set(normalizedPath, {
        ts: Date.now(),
        value: res.filecontent,
      });
      return res.filecontent;
    }

    // If server indicates chunking, fetch all chunks and combine as ArrayBuffer
    if (res && typeof res.totalChunks === "number" && res.totalChunks > 1) {
      var chunks = [];
      // first chunk
      if (typeof res.filecontent === "string")
        chunks.push(window.protectedGlobals.base64ToArrayBuffer(res.filecontent));

      for (let i = 1; i < res.totalChunks; i++) {
        var part = await window.protectedGlobals.filePost({
          requestFile: true,
          requestFileName: normalizedPath,
          chunkIndex: i,
        });
        if (!part || typeof part.filecontent !== "string")
          throw new Error("Missing chunk " + i + " for " + normalizedPath);
        chunks.push(window.protectedGlobals.base64ToArrayBuffer(part.filecontent));
      }

      // Combine into single ArrayBuffer
      var total = chunks.reduce((s, c) => s + (c.byteLength || 0), 0);
      var combined = new Uint8Array(total);
      var off = 0;
      for (const c of chunks) {
        var u = new Uint8Array(c);
        combined.set(u, off);
        off += u.byteLength;
      }
      var combinedBuffer = combined.buffer;
      window.protectedGlobals.fileFetchRecent.set(normalizedPath, {
        ts: Date.now(),
        value: combinedBuffer,
      });
      return combinedBuffer;
    }

    window.protectedGlobals.flowawayCrash("Could not fetch requested file.", normalizedPath);
  })();

  window.protectedGlobals.fileFetchInFlight.set(normalizedPath, req);
  try {
    return await req;
  } finally {
    if (window.protectedGlobals.fileFetchInFlight.get(normalizedPath) === req) {
      window.protectedGlobals.fileFetchInFlight.delete(normalizedPath);
    }
  }
};
// Helper function to hash script content (handles Unicode characters)
window.protectedGlobals.hashScriptContent = function hashScriptContent(text) {
  var hash = 0;
  for (let i = 0; i < text.length; i++) {
    var char = text.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash = hash & hash; // Convert to 32-bit integer
  }
  return Math.abs(hash).toString(16);
};
window.protectedGlobals.annotateTreeWithPaths = function annotateTreeWithPaths(tree, basePath = "") {
  var [name, children, meta = {}] = tree;

  var path = name === "root" ? "" : basePath ? `${basePath}/${name}` : name;

  tree[2] = { ...meta, path };

  if (Array.isArray(children)) {
    for (const child of children) {
      window.protectedGlobals.annotateTreeWithPaths(child, path);
    }
  }
};