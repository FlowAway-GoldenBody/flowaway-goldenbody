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
window.protectedGlobals.getFilesFromFolder = async function (relPath) {
  window.protectedGlobals.missingFolders.delete(relPath);
  var r = await window.protectedGlobals.filePost({ requestFile: true, requestFileName: relPath });
  if (r && r.kind === "folder" && Array.isArray(r.files)) return r.files;

  var isMissing =
    !!(
      r &&
      (
        r.missing ||
        r.kind === "missing" ||
        r.error === "ENOENT" ||
        r.code === "ENOENT"
      )
    );

  if (isMissing) {
    window.protectedGlobals.missingFolders.add(relPath);
    var missingError = new Error("ENOENT: Missing folder " + String(relPath));
    missingError.code = "ENOENT";
    throw missingError;
  }

  throw new Error("Invalid folder response for " + String(relPath));
}

window.protectedGlobals.dedupefiles = function (folders) {
  var seen = new Set();
  var list = [];
  for (const folder of folders || []) {
    if (!Array.isArray(folder)) continue;
    var folderName = folder[0].trim();
    if (!folderName || folderName === ".DS_Store" || folderName.startsWith("."))
      continue;
    var folderPath =
      folder[2] && folder[2].path ? folder[2].path : `systemfiles/runtime/apps/${folderName}`;
    var key = String(folderPath).toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    list.push(folder);
  }
  return list;
}

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
  // If caller passed an ArrayBuffer or Uint8Array, decode directly
  if (
    b64OrBuffer &&
    (b64OrBuffer instanceof ArrayBuffer || ArrayBuffer.isView(b64OrBuffer))
  ) {
    var buf = b64OrBuffer instanceof ArrayBuffer ? b64OrBuffer : b64OrBuffer.buffer;
    return new TextDecoder("utf-8").decode(buf);
  }

  // Otherwise assume base64 string
  var buf = window.protectedGlobals.base64ToArrayBuffer(String(b64OrBuffer || ""));
  return new TextDecoder("utf-8").decode(buf);
};

window.protectedGlobals.decodeFileTextStrict = function decodeFileTextStrict(rawContent, pathLabel, options) {
  var opts = options && typeof options === "object" ? options : {};
  var allowEmpty = !!opts.allowEmpty;
  var text = window.protectedGlobals.base64ToUtf8(rawContent);

  if (typeof text !== "string") {
    throw new Error("decodeFileTextStrict: Decoded file content is not text. " + String(pathLabel || "unknown path"));
  }

  if (!allowEmpty && !text.trim()) {
    throw new Error("decodeFileTextStrict: File content is empty. " + String(pathLabel || "unknown path"));
  }

  return text;
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