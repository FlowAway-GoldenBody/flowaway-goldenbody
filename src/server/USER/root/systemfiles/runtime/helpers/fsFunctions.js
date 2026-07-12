"use strict";
// required functions for user file system
window.protectedGlobals.findNodeByPath = function (relPath) {
  if (typeof relPath !== "string") return null;
  const normalized = String(relPath).replace(/\/+/g, "/").replace(/^\//, "").replace(/\/$/, "");
  if (!normalized) return window.protectedGlobals.treeData;
  const parts = normalized.split("/");
  let current = window.protectedGlobals.treeData;
  for (const part of parts) {
    if (!current || !Array.isArray(current[1])) return null;
    current = current[1].find((c) => c[0] === part);
    if (!current) return null;
  }
  return current;
};

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