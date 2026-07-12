"use strict";

(function () {
  let knownAppId = [];
  let knownAppGlobals = [];
  let knownAppFuncs = [];
  if (window.protectedGlobals.AppLoaderAPIs && window.protectedGlobals.AppLoaderAPIs.__loaded) {
    return;
  }
  function checkEntryObject(entryObj) {
    if (!entryObj.id) return false;
    if (knownAppId.includes(entryObj.id)) {console.error(`Identifier ${entryObj.id} is already declared`); return false;}
    else knownAppId.push(entryObj.id);

    if (!entryObj.jsFile) return false;
    if (!entryObj.label && !entryObj.headless) return false;
    if (!entryObj.iconFile) return false;

    if (entryObj.requestAdminPerm) {
      if (!entryObj.allAppArrayString) return false;

      if (!entryObj.functionName) return false;
      if (knownAppFuncs.includes(entryObj.functionName)) {console.error(`Identifier ${entryObj.functionName} is already declared`); return false;}
      else knownAppFuncs.push(entryObj.functionName);
      
      if (!entryObj.globalVarObjectString) return false;
      if (knownAppGlobals.includes(entryObj.globalVarObjectString)) {console.error(`Identifier ${entryObj.globalVarObjectString} is already declared`); return false;}
      else knownAppGlobals.push(entryObj.globalVarObjectString);
    }
    
    return true;
  }
  async function getVerification(path) {
    let result = await window.protectedGlobals.ReadFile(path, { text: true, direct: true });
    let userKey = await window.protectedGlobals.ReadFile("systemfiles/userprofile/jsApiKey.txt", { text: true, direct: true });
    if (result === userKey) return true;
    else return false;
  }
  function generateNamespace() {
    return crypto.randomUUID();
  }


  async function loadAppScript(pkg) {
    if (!pkg || !pkg.jsFile || pkg.scriptLoaded || !pkg.requestAdminPerm) return false;

    var jsKeyOk = true;
    try {
      var appKey = String(await window.protectedGlobals.ReadFile(`${pkg.path}/jsKey.txt`, { text: true, direct: true }) || "").trim();
      var masterKey = String(await window.protectedGlobals.ReadFile("systemfiles/userprofile/jsApiKey.txt", { text: true, direct: true }) || "").trim();
      jsKeyOk = !!appKey && !!masterKey && appKey === masterKey;
    } catch (e) {
      jsKeyOk = false;
    }

    if (!jsKeyOk) {
      console.warn("Skipping app script due to missing/invalid jskey", pkg && pkg.id, pkg && pkg.path);
      return false;
    }

    var scriptText = String(await window.protectedGlobals.ReadFile(`${pkg.path}/${pkg.jsFile}`, { text: true, direct: true }) || "");
    if (!String(scriptText || "").trim()) {
      console.warn("App script is empty; skipping load", { appId: pkg && pkg.id, path: pkg && pkg.path, jsFile: pkg && pkg.jsFile });
      return false;
    }

    pkg._lastScriptHash = "deprecated field";
    try {
      var globalVarObjectString = pkg.globalVarObjectString;
      if (pkg.functionName) delete window[pkg.functionName];
      if (
        pkg.cmf &&
        globalVarObjectString &&
        window[globalVarObjectString] &&
        !window.protectedGlobals.isProtectedAppGlobalName(pkg.cmf)
      ) {
        delete window[globalVarObjectString][pkg.cmf];
      }
    } catch (e) {}

    var scriptEl = document.createElement("script");
    scriptEl.type = "text/javascript";
    scriptEl.textContent = scriptText;
    document.body.appendChild(scriptEl);
    pkg.scriptLoaded = true;
    pkg._scriptElement = scriptEl;
    return true;
  }







let getFilesFromFolder = async function (relPath) {
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

  window.protectedGlobals.__externalPickerKeys = window.protectedGlobals.__externalPickerKeys || new Map();

  function normalizeVfsPath(path) {
    if (!path && path !== "") return "";
    return String(path).replace(/\/+/g, "/").replace(/^\//, "");
  }

  function isPathUnderRoot(path, root) {
    if (typeof path !== "string" || typeof root !== "string") return false;
    const normalizedPath = normalizeVfsPath(path);
    const normalizedRoot = normalizeVfsPath(root);
    return normalizedPath === normalizedRoot || normalizedPath.startsWith(normalizedRoot + "/");
  }

  function isExternalKeyAllowed(path, key, appName) {
    if (!key || typeof path !== "string") return false;
    const mapping = window.protectedGlobals.__externalPickerKeys.get(key);
    if (!mapping) return false;
    if (mapping.appName !== appName) return false;
    if (mapping.kind === "file") {
      return normalizeVfsPath(path) === normalizeVfsPath(mapping.path);
    }
    if (mapping.kind === "directory") {
      return isPathUnderRoot(path, mapping.path);
    }
    return false;
  }

  function createPickerTheme(isDark) {
    return {
      panelBg: isDark ? "#1f1f1f" : "#ffffff",
      panelText: isDark ? "#e8e8e8" : "#111111",
      border: isDark ? "#3a3a3a" : "#d0d7de",
      muted: isDark ? "#aaaaaa" : "#666666",
      inputBg: isDark ? "#121212" : "#ffffff",
      inputText: isDark ? "#f2f2f2" : "#111111",
      buttonBg: isDark ? "#2a2a2a" : "#f3f4f6",
      buttonText: isDark ? "#e8e8e8" : "#111111",
      selectedBg: isDark ? "#3b4d7a" : "#d0e6ff",
      hoverBg: isDark ? "#2a2a2a" : "#f4f7ff",
    };
  }

  async function showVfsPickerDialog({ title, mode, suggestedName }) {
    if (!window.protectedGlobals.treeData) {
      await window.protectedGlobals.onlyloadTree();
    }
    let currentPath = "";
    let selectedPath = "";
    const overlay = document.createElement("div");
    overlay.style.cssText = `position:fixed;top:0;left:0;width:100vw;height:100vh;z-index:1000000;display:flex;align-items:center;justify-content:center;padding:12px;background:rgba(0,0,0,0.35);`;
    const panel = document.createElement("div");
    panel.style.position = "absolute";
    panel.style.left = "50%";
    panel.style.top = "50%";
    panel.style.transform = "translate(-50%, -50%)";
    panel.style.minWidth = "400px";
    panel.style.maxWidth = "100vw";
    panel.style.maxHeight = "100vh";
    panel.style.width = "640px";
    panel.style.resize = "both";
    panel.style.overflow = "hidden";
    panel.style.display = "flex";
    panel.style.flexDirection = "column";
    panel.style.boxSizing = "border-box";
    panel.style.borderRadius = "12px";
    overlay.appendChild(panel);

    const titleBar = document.createElement("div");
    titleBar.textContent = title;
    titleBar.style.fontWeight = "700";
    titleBar.style.padding = "16px 20px";
    titleBar.style.fontSize = "16px";
    panel.appendChild(titleBar);

    const breadcrumb = document.createElement("div");
    breadcrumb.style.padding = "0 20px 12px";
    breadcrumb.style.fontSize = "13px";
    panel.appendChild(breadcrumb);

    const list = document.createElement("div");
    list.style.flex = "1";
    list.style.overflow = "auto";
    list.style.padding = "0 20px 12px";
    panel.appendChild(list);

    let saveInput = null;
    if (mode === "saveFile") {
      const row = document.createElement("div");
      row.style.display = "flex";
      row.style.alignItems = "center";
      row.style.gap = "10px";
      row.style.padding = "0 20px 12px";
      saveInput = document.createElement("input");
      saveInput.type = "text";
      saveInput.placeholder = "File name";
      saveInput.value = suggestedName || "";
      saveInput.style.flex = "1";
      saveInput.style.padding = "10px 12px";
      saveInput.style.borderRadius = "8px";
      saveInput.style.border = "1px solid transparent";
      row.appendChild(saveInput);
      panel.appendChild(row);
    }

    const buttonBar = document.createElement("div");
    buttonBar.style.display = "flex";
    buttonBar.style.justifyContent = "flex-end";
    buttonBar.style.gap = "10px";
    buttonBar.style.padding = "12px 20px 20px";
    panel.appendChild(buttonBar);

    const cancelButton = document.createElement("button");
    cancelButton.textContent = "Cancel";
    cancelButton.style.border = "none";
    cancelButton.style.borderRadius = "8px";
    cancelButton.style.padding = "10px 14px";
    cancelButton.style.cursor = "pointer";
    buttonBar.appendChild(cancelButton);

    const actionButton = document.createElement("button");
    actionButton.textContent = mode === "saveFile" ? "Save" : mode === "showDirectoryPicker" ? "Select Folder" : "Open";
    actionButton.style.border = "none";
    actionButton.style.borderRadius = "8px";
    actionButton.style.padding = "10px 14px";
    actionButton.style.cursor = "pointer";
    actionButton.style.fontWeight = "700";
    buttonBar.appendChild(actionButton);

    let theme = createPickerTheme(!!(window.protectedGlobals.data && window.protectedGlobals.data.dark));
    const updateStyles = () => {
      const isDark = !!(window.protectedGlobals.data && window.protectedGlobals.data.dark);
      theme = createPickerTheme(isDark);
      panel.style.background = theme.panelBg;
      panel.style.color = theme.panelText;
      panel.style.border = `1px solid ${theme.border}`;
      titleBar.style.color = theme.panelText;
      breadcrumb.style.color = theme.muted;
      list.style.background = theme.panelBg;
      cancelButton.style.background = theme.buttonBg;
      cancelButton.style.color = theme.buttonText;
      actionButton.style.background = isDark ? "#3b5df2" : "#2563eb";
      actionButton.style.color = "#ffffff";
      if (saveInput) {
        saveInput.style.background = theme.inputBg;
        saveInput.style.color = theme.inputText;
        saveInput.style.borderColor = theme.border;
      }
      renderEntries();
    };

    function getCurrentNode() {
      const node = window.protectedGlobals.findNodeByPath(currentPath) || window.protectedGlobals.findNodeByPath("/" + currentPath);
      return node || window.protectedGlobals.treeData;
    }

    function getEntries() {
      const node = getCurrentNode();
      const children = Array.isArray(node && node[1]) ? node[1] : [];
      return children.map((child) => {
        const isFolder = Array.isArray(child[1]);
        const childPath = child[2] && typeof child[2].path === "string" ? child[2].path : normalizeVfsPath(currentPath ? currentPath + "/" + child[0] : child[0]);
        return {
          label: child[0],
          kind: isFolder ? "folder" : "file",
          path: childPath,
        };
      });
    }

    function createPickerItemIcon(kind, size = 18) {
      const iconMarkup = window.protectedGlobals?.fileIconSet?.[kind];
      if (iconMarkup) {
        const wrapper = document.createElement("div");
        wrapper.innerHTML = iconMarkup.trim();
        const candidate = wrapper.firstElementChild;
        if (candidate && candidate.tagName.toLowerCase() === "svg") {
          candidate.setAttribute("width", String(size));
          candidate.setAttribute("height", String(size));
          candidate.style.flexShrink = "0";
          candidate.style.display = "block";
          candidate.style.verticalAlign = "middle";
          return candidate;
        }
      }
      const ns = "http://www.w3.org/2000/svg";
      const svg = document.createElementNS(ns, "svg");
      svg.setAttribute("width", String(size));
      svg.setAttribute("height", String(size));
      svg.setAttribute("viewBox", "0 0 24 24");
      svg.setAttribute("fill", "none");
      svg.setAttribute("stroke", "currentColor");
      svg.setAttribute("stroke-width", "1.8");
      svg.setAttribute("stroke-linecap", "round");
      svg.setAttribute("stroke-linejoin", "round");
      svg.style.flexShrink = "0";
      svg.style.display = "block";
      svg.style.verticalAlign = "middle";
      svg.innerHTML = kind === "folder"
        ? '<path d="M3 7a2.5 2.5 0 0 1 2.5-2.5h4.2c.6 0 1.2.2 1.6.6l1.2 1.1c.2.2.5.3.8.3h5.2A2.5 2.5 0 0 1 21 9v8.5A2.5 2.5 0 0 1 18.5 20h-13A2.5 2.5 0 0 1 3 17.5V7Z" fill="#FDCB22" stroke="currentColor" stroke-width="0.8" stroke-linejoin="round" /><path d="M3 11.2H21" stroke="#000000" stroke-opacity="0.35" stroke-width="1" stroke-linecap="round" />'
        : '<path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" /><path d="M14 2v6h6" />';
      return svg;
    }

    function renderBreadcrumb() {
      breadcrumb.innerHTML = "";
      const parts = currentPath ? currentPath.split("/") : [];
      const homeLink = document.createElement("span");
      homeLink.textContent = "Home";
      homeLink.style.cursor = "pointer";
      homeLink.onclick = () => {
        currentPath = "";
        selectedPath = "";
        renderEntries();
      };
      breadcrumb.appendChild(homeLink);
      let pathSoFar = "";
      parts.forEach((part, index) => {
        if (!part) return;
        pathSoFar = index === 0 ? part : pathSoFar + "/" + part;
        const sep = document.createElement("span");
        sep.textContent = " / ";
        sep.style.color = theme.muted;
        breadcrumb.appendChild(sep);
        const link = document.createElement("span");
        link.textContent = part;
        link.style.cursor = "pointer";
        link.style.textDecoration = "underline";
        link.style.marginLeft = "2px";
        link.onmouseenter = () => { link.style.opacity = "0.8"; };
        link.onmouseleave = () => { link.style.opacity = "1"; };
        link.onclick = () => {
          currentPath = pathSoFar;
          selectedPath = "";
          renderEntries();
        };
        breadcrumb.appendChild(link);
      });
    }

    function renderEntries() {
      renderBreadcrumb();
      list.innerHTML = "";
      const entries = getEntries();
      if (entries.length === 0) {
        const empty = document.createElement("div");
        empty.textContent = "This folder is empty.";
        empty.style.padding = "16px 0";
        empty.style.color = theme.muted;
        list.appendChild(empty);
        return;
      }
      entries.sort((a, b) => {
        if (a.kind !== b.kind) return a.kind === "folder" ? -1 : 1;
        return a.label.localeCompare(b.label);
      });
      for (const entry of entries) {
        const row = document.createElement("div");
        row.style.display = "flex";
        row.style.justifyContent = "space-between";
        row.style.alignItems = "center";
        row.style.padding = "10px 12px";
        row.style.borderRadius = "8px";
        row.style.cursor = "pointer";
        row.style.marginBottom = "6px";
        row.style.background = entry.path === selectedPath ? theme.selectedBg : theme.panelBg;
        row.style.border = `1px solid ${entry.path === selectedPath ? theme.border : "transparent"}`;

        const isDirectoryPicker = mode === "showDirectoryPicker";
        const disableFileSelection = isDirectoryPicker && entry.kind === "file";
        if (disableFileSelection) {
          row.style.opacity = "0.55";
          row.style.cursor = "default";
        }

        row.onmouseenter = () => {
          if (!disableFileSelection && entry.path !== selectedPath) row.style.background = theme.hoverBg;
        };
        row.onmouseleave = () => {
          row.style.background = entry.path === selectedPath ? theme.selectedBg : theme.panelBg;
        };

        const label = document.createElement("div");
        label.style.display = "flex";
        label.style.alignItems = "center";
        label.style.gap = "10px";
        label.style.color = theme.panelText;
        label.appendChild(createPickerItemIcon(entry.kind, 18));
        label.appendChild(document.createTextNode(entry.label));
        row.appendChild(label);

        const badge = document.createElement("span");
        badge.textContent = entry.kind;
        badge.style.color = theme.muted;
        badge.style.fontSize = "12px";
        row.appendChild(badge);

        if (!disableFileSelection) {
          row.onclick = () => {
            if (entry.kind === "folder") {
              if (mode === "showDirectoryPicker") {
                selectedPath = entry.path;
                renderEntries();
              } else if (mode === "openFile") {
                selectedPath = "";
                renderEntries();
              }
            } else {
              selectedPath = entry.path;
              if (mode === "saveFile" && saveInput) {
                saveInput.value = entry.label;
              }
              renderEntries();
            }
          };

          row.ondblclick = () => {
            if (entry.kind === "folder") {
              currentPath = entry.path;
              selectedPath = "";
              renderEntries();
            }
          };
        }

        list.appendChild(row);
      }
    }

    function cleanup() {
      overlay.remove();
    }

    function finishPicker(resolve, reject) {
      if (mode === "openFile") {
        if (!selectedPath) {
          return;
        }
        cleanup();
        resolve(selectedPath);
        return;
      }
      if (mode === "openDirectory") {
        const pickPath = selectedPath || currentPath;
        cleanup();
        resolve(normalizeVfsPath(pickPath));
        return;
      }
      if (mode === "saveFile") {
        const filename = saveInput ? saveInput.value.trim() : "";
        if (!filename) return;
        const pickPath = normalizeVfsPath((currentPath ? currentPath + "/" : "") + filename);
        cleanup();
        resolve(pickPath);
        return;
      }
      if (mode === "showDirectoryPicker") {
        const pickPath = selectedPath || currentPath;
        cleanup();
        resolve(normalizeVfsPath(pickPath));
        return;
      }
    }

    function makeDraggable(handle, box) {
      let dragging = false;
      let startX = 0;
      let startY = 0;
      let originLeft = 0;
      let originTop = 0;
      handle.style.cursor = "move";
      handle.addEventListener("pointerdown", (event) => {
        if (event.button !== 0) return;
        dragging = true;
        const rect = box.getBoundingClientRect();
        originLeft = rect.left;
        originTop = rect.top;
        startX = event.clientX;
        startY = event.clientY;
        box.style.transform = "none";
        document.addEventListener("pointermove", move);
        document.addEventListener("pointerup", up);
        event.preventDefault();
      });
      function move(event) {
        if (!dragging) return;
        box.style.left = `${originLeft + event.clientX - startX}px`;
        box.style.top = `${originTop + event.clientY - startY}px`;
      }
      function up() {
        dragging = false;
        document.removeEventListener("pointermove", move);
        document.removeEventListener("pointerup", up);
      }
    }

    document.body.appendChild(overlay);
    updateStyles();
    makeDraggable(titleBar, panel);

    return new Promise((resolve, reject) => {
      cancelButton.onclick = () => {
        cleanup();
        reject(new Error("The user aborted a request."));
      };
      actionButton.onclick = () => finishPicker(resolve, reject);
    });
  }

  window.protectedGlobals.extractAppData = async function (appFolder) {
    
    var folderName = appFolder[0];
    var folderPath =
      appFolder[2] && appFolder[2].path
        ? appFolder[2].path
        : "systemfiles/runtime/apps/" + folderName;
    var files = await getFilesFromFolder(folderPath);
    if (!Array.isArray(files)) {
      throw new Error("Invalid folder listing for " + String(folderPath));
    }

    var entryObjectfile =
      files.find(function (f) {
        return f.name.toLowerCase() === "entry.json";
      })?.relativePath || null;







    function createPlaceholderFunction() {
      let entryObj = getEntryObj();
      window[entryObj.functionName] = function () {
        console.warn("App integrity check failed: jsKey.txt does not match master key for " + String(folderName));
        window.protectedGlobals.notification(`unable to start app "${entryObj.label}" because of JS key check error, if you believe this is a mistake, use the fix account feature of the login page. (CODE: JSKEYMISMATCH)`);
      }
    }
    async function createIframeContainerAppFunction() {
      let entryObj = getEntryObj();
      let scriptText = await window.protectedGlobals.ReadFile(folderPath + '/' + entryObj.jsFile, { text: true, direct: true });
      let untrustedIframePatch = await window.protectedGlobals.ReadFile('systemfiles/runtime/core/untrustedIframePatch.js', { text: true, direct: true });
      window[entryObj.functionName] = async function (path, posX = 50, posY = 50) {
        entryObj = getPkg();
        if (posX == 50 && posY == 50) {
          let pos = window.protectedGlobals.getNextWindowXY();
          posX = pos.x;
          posY = pos.y;
        }
        let filecontent;
        let filehandlekey = "invalid key";
        if (path) {
          filecontent = await window.protectedGlobals.ReadFile(path, { direct: true });
          filehandlekey = crypto.randomUUID();
        }
        var root = window.protectedGlobals.apptools.createRoot(entryObj.id, posX, posY);
        var topbar = window.protectedGlobals.apptools.createtitlebar(root);
        // create an iframe that fills the whole window;
        let iframe = document.createElement("iframe");
        iframe.style.top = "0";
        iframe.style.left = "0";
        iframe.style.width = "100%";
        iframe.style.height = "100%";
        iframe.style.border = "none";
        if (!window.protectedGlobals.appPerms[entryObj.id]) window.protectedGlobals.appPerms[entryObj.id] = { storage: "ask", notification: "ask" };
        let instanceNum = window[entryObj.globalVarObjectString][entryObj.allAppArrayString].length;
        let iframePath = path ? { path: path, key: filehandlekey } : null;
        let html = `<html><head><script>window.__path__ = ${JSON.stringify(iframePath)};window.__curInstanceNum__ = ${instanceNum};window.__userSelectedFile__ = ${JSON.stringify(filecontent || null)};window.addEventListener('contextmenu', (e) => {e.preventDefault();});</script></head><body style="margin: 0; padding: 0;"><script>${untrustedIframePatch}</script><script>${scriptText}</script></body></html>`;
        const blob = new Blob([html], { type: "text/html" });
        iframe.src = URL.createObjectURL(blob);
        iframe.sandbox = "allow-scripts allow-pointer-lock";
        let appObj;
        window.protectedGlobals.apps.forEach(app => {
          if (app.id === entryObj.id) {
            app.allIframe.push(iframe);
            appObj = app;
          }
        });
        root.appendChild(iframe);
        window.addEventListener(appObj.id + root.goldenbodyId, 'message', async (e) => {
          if (e.source !== iframe.contentWindow) {
            return;
          }
          if (e.data.showOpenFilePicker) {
            try {
              const selectedPath = await showVfsPickerDialog({ title: "Open File", mode: "openFile" });
              if (!selectedPath) {
                throw new Error("No file or folder selected.");
              }
              const node = window.protectedGlobals.findNodeByPath(selectedPath);
              const isFolder = node && Array.isArray(node[1]);
              const key = crypto.randomUUID();
              window.protectedGlobals.__externalPickerKeys.set(key, { appName: appObj.id, kind: isFolder ? "directory" : "file", path: selectedPath });
              e.source.postMessage({ openFilePickerResult: { kind: isFolder ? "directory" : "file", path: selectedPath, key, name: selectedPath.split("/").pop() || selectedPath }, requestId: e.data.requestId }, "*");
            } catch (err) {
              e.source.postMessage({ error: err.message || "The user aborted a request.", requestId: e.data.requestId }, "*");
            }
            return;
          }
          if (e.data.showSaveFilePicker) {
            try {
              const selectedPath = await showVfsPickerDialog({ title: "Save File", mode: "saveFile", suggestedName: e.data.options && e.data.options.suggestedName ? e.data.options.suggestedName : "" });
              if (!selectedPath) {
                throw new Error("No save destination selected.");
              }
              const key = crypto.randomUUID();
              window.protectedGlobals.__externalPickerKeys.set(key, { appName: appObj.id, kind: "file", path: selectedPath });
              e.source.postMessage({ showSaveFilePickerResult: { kind: "file", path: selectedPath, key, name: selectedPath.split("/").pop() || "untitled" }, requestId: e.data.requestId }, "*");
            } catch (err) {
              e.source.postMessage({ error: err.message || "The user aborted a request.", requestId: e.data.requestId }, "*");
            }
            return;
          }
          if (e.data.showDirectoryPicker) {
            try {
              const selectedPath = await showVfsPickerDialog({ title: "Select Folder", mode: "showDirectoryPicker" });
              if (!selectedPath) {
                throw new Error("No folder selected.");
              }
              const key = crypto.randomUUID();
              window.protectedGlobals.__externalPickerKeys.set(key, { appName: appObj.id, kind: "directory", path: selectedPath });
              e.source.postMessage({ showDirectoryPickerResult: { kind: "directory", path: selectedPath, key, name: selectedPath.split("/").pop() || selectedPath }, requestId: e.data.requestId }, "*");
            } catch (err) {
              e.source.postMessage({ error: err.message || "The user aborted a request.", requestId: e.data.requestId }, "*");
            }
            return;
          }
          window.dispatchEvent(new CustomEvent("translatedmessage", { detail: {data: e.data, from: appObj.folderName, source: e.source, appName: appObj.id} }));
          if (e.data.setInstanceTitle) {
            instance.title = e.data.title || instance.title;
          } else if (e.data.instanceMessage) {
            let toInstance = e.data.toInstance;
            let fromInstance = instance.instanceNum;
            let message = e.data.message;
            if (toInstance === "*" || toInstance === "all") {
              window[appObj.globalVarObjectString][appObj.allAppArrayString].forEach(inst => {
                if (inst.instanceNum !== fromInstance) {
                  inst.iframe.contentWindow.postMessage({instanceMessage: true, message: message, fromInstance: fromInstance}, '*');
                }
              });
            } else {
              let targetInstance = window[appObj.globalVarObjectString][appObj.allAppArrayString].find(inst => inst.instanceNum === toInstance);
              if (targetInstance) {
                targetInstance.iframe.contentWindow.postMessage({instanceMessage: true, message: message, fromInstance: fromInstance}, '*');
              }
            }
          } else if (e.data.getLiveInstanceIndex) {
            let liveInstanceIndex = window[appObj.globalVarObjectString][appObj.allAppArrayString].length;
            iframe.contentWindow.postMessage({liveInstanceIndex: liveInstanceIndex, requestId: e.data.requestId}, '*');
          }
        });
        var instance = window.protectedGlobals.apptools.api.createAppInstance({
          rootElement: root,
          title: entryObj.label,
          btnMax: topbar ? topbar.querySelector(".btnMaxColor") : null,
        });
        instance.iframe = iframe;
        instance.instanceNum = instanceNum;
        let origClose = instance.closeWindow;
        instance.closeWindow = function () {
          origClose();
          appObj.allIframe.splice(appObj.allIframe.indexOf(iframe), 1);
        };
        window.protectedGlobals.apptools.api.trackInstance(instance, entryObj.id);
        return instance;
      }
    }

    var functionName = null;
    let id = null;
    var label = folderName;
    var icon = null;
    var globalVarObjectString = "";
    var allAppArrayString = "";
    var openfileCapability = [];
    var cmf = "";
    var cmfl1 = "";
    let jsFile = null;
    let iconFile = null;
    let allIframe = [];

    var entryText = await window.protectedGlobals.ReadFile(folderPath + "/" + entryObjectfile, { text: true, direct: true });
    var entryObj = JSON.parse(entryText);
    if (!checkEntryObject(entryObj)) {
      throw new Error("Invalid entry.json for app " + folderName);
    }
    id = entryObj.id;
    let verify = await getVerification(folderPath + '/jsKey.txt');
    iconFile = entryObj.iconFile || null;
    label = entryObj.label || label;
    openfileCapability = entryObj.openfileCapability || [];
    let getEntryObj = () => {
      return entryObj;
    };
    if (entryObj.requestAdminPerm && verify) {
      functionName = entryObj.functionName;
      globalVarObjectString = entryObj.globalVarObjectString || "";
      allAppArrayString = entryObj.allAppArrayString || "";
      cmf = entryObj.cmf || "";
      cmfl1 = entryObj.cmfl1 || "";
      jsFile = entryObj.jsFile || "";
    } else if (entryObj.requestAdminPerm) {
      functionName = generateNamespace();
      entryObj.functionName = functionName;
      createPlaceholderFunction();
    } else {
      allIframe = [];
      globalVarObjectString = generateNamespace();
      allAppArrayString = generateNamespace();
      functionName = generateNamespace();
      entryObj.globalVarObjectString = globalVarObjectString;
      entryObj.allAppArrayString = allAppArrayString;
      entryObj.functionName = functionName;
      jsFile = entryObj.jsFile || "";
      createIframeContainerAppFunction(entryObj);
    }






    console.log("Found icon file for app " + folderName + ": " + iconFile); 
    if (!entryObj.headless || !iconFile) {
      var iconPath = folderPath + "/" + iconFile;
      function iconDataToBase64(raw) {
        if (raw instanceof ArrayBuffer || ArrayBuffer.isView(raw)) {
          var bytes = raw instanceof ArrayBuffer ? new Uint8Array(raw) : new Uint8Array(raw.buffer, raw.byteOffset, raw.byteLength);
          var chunkSize = 0x8000;
          var binary = "";
          for (var i = 0; i < bytes.length; i += chunkSize) {
            binary += String.fromCharCode(...bytes.subarray(i, i + chunkSize));
          }
          return btoa(binary);
        }
        if (typeof raw === "string") {
          return raw.trim();
        }
        return null;
      }
      if (!entryObj.nonTextIcon) {
        var parsedIcon = String(await window.protectedGlobals.ReadFile(iconPath, { text: true, direct: true }) || "").trim();
        icon = parsedIcon || icon;
      } else if (entryObj.svgEnabled) {
        var parsedIcon = String(await window.protectedGlobals.ReadFile(iconPath, { text: true, direct: true }) || "").trim();
        icon = parsedIcon || icon;
      } else if (entryObj.pngEnabled) {
        var rawIcon = await window.protectedGlobals.ReadFile(iconPath, { buffer: true, direct: true });
        var parsedIcon = iconDataToBase64(rawIcon || "");
        icon = parsedIcon || icon;
      }
    }


    let pkg = {
      folderName: folderName,
      entryObjectfile: entryObjectfile,
      allIframe: allIframe,
      id: id,
      path: folderPath,
      jsFile: jsFile,
      allAppArrayString: allAppArrayString,
      functionName: functionName || folderName,
      label: label,
      icon: icon,
      scriptLoaded: false,
      globalVarObjectString: globalVarObjectString,
      requestAdminPerm: entryObj.requestAdminPerm,
      cmf: cmf,
      cmfl1: cmfl1,
      svgEnabled: !!entryObj.svgEnabled,
      pngEnabled: !!entryObj.pngEnabled,
      nonTextIcon: !!entryObj.nonTextIcon,
      openfileCapability: openfileCapability,
    };
    let getPkg = () => {
      return pkg;
    };
    window.protectedGlobals.initAppRuntimeState(pkg);
    await loadAppScript(pkg);
    return pkg;
  }

  window.protectedGlobals.AppLoaderAPIs = {
    extractAppData: window.protectedGlobals.extractAppData,
    __loaded: true,
  };
})();
