// ----------------- DYNAMIC AP LOADER -----------------
window.apps = window.apps || [];
window._flowawayMissingFolders = window._flowawayMissingFolders || new Set();

async function getFolderListing(relPath) {
  try {
    window._flowawayMissingFolders.delete(relPath);
    var r = await filePost({ requestFile: true, requestFileName: relPath });
    if (r && r.kind === "folder" && Array.isArray(r.files)) return r.files;
    if (
      r &&
      (r.missing ||
        r.code === "ENOENT" ||
        r.kind === "missing" ||
        r.error === "ENOENT")
    ) {
      window._flowawayMissingFolders.add(relPath);
      return null;
    }
  } catch (e) {
    console.error("getFolderListing error", e);
  }
  return null;
}

function normalizeAppFolders(folders) {
  var seen = new Set();
  var list = [];
  for (const folder of folders || []) {
    if (!Array.isArray(folder) || typeof folder[0] !== "string") continue;
    var folderName = folder[0].trim();
    if (!folderName || folderName === ".DS_Store" || folderName.startsWith("."))
      continue;
    var folderPath =
      folder[2] && folder[2].path ? folder[2].path : `apps/${folderName}`;
    var key = String(folderPath).toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    list.push(folder);
  }
  return list;
}

function getFlowawayAppLoaderRuntime() {
  var runtime = window.FlowawayAppLoader;
  if (!runtime || runtime.__loaded !== true) {
    flowawayCrash(
      "App loader runtime unavailable.",
      "systemfiles/appLoader.js was not loaded.",
    );
  }
  return runtime;
}

function isImageIconValue(value) {
  return !!getFlowawayAppLoaderRuntime().isImageIconValue(value);
}

function getIconMimeType(pathOrValue) {
  return getFlowawayAppLoaderRuntime().getIconMimeType(pathOrValue);
}

function toIconImageMarkupFromSource(iconSource) {
  return getFlowawayAppLoaderRuntime().toIconImageMarkupFromSource(iconSource);
}

function getPreferredAppIdentifier(app) {
  if (!app) return "";
  return app.functionname || app.id || app.icon || "";
}

function appMatchesIdentifier(app, identifier) {
  if (!app || !identifier) return false;
  var id = String(identifier).trim();
  if (!id) return false;
  var candidates = [app.functionname, app.id, app.icon]
    .filter((v) => typeof v !== "undefined" && v !== null)
    .map((v) => String(v).trim())
    .filter(Boolean);
  return candidates.includes(id);
}

function getAppInstanceArrayKeys(app) {
  var keys = [];
  if (!app) return keys;
  if (typeof app.allapparraystring === "string") {
    var oneKey = app.allapparraystring.trim();
    if (oneKey) keys.push(oneKey);
  } else if (Array.isArray(app.allapparraystring)) {
    for (var i = 0; i < app.allapparraystring.length; i++) {
      var key =
        typeof app.allapparraystring[i] === "string"
          ? app.allapparraystring[i].trim()
          : "";
      if (key && keys.indexOf(key) === -1) keys.push(key);
    }
  }
  return keys;
}

function ensureAppRuntimeState(app) {
  if (!app || !app.globalvarobjectstring) return null;
  try {
    var globalName = String(app.globalvarobjectstring || "").trim();
    if (!globalName) return null;

    var appGlobalObj = window[globalName];
    if (!appGlobalObj || typeof appGlobalObj !== "object") {
      appGlobalObj = {};
      window[globalName] = appGlobalObj;
    }

    var keys = getAppInstanceArrayKeys(app);
    for (var i = 0; i < keys.length; i++) {
      if (!Array.isArray(appGlobalObj[keys[i]])) {
        appGlobalObj[keys[i]] = [];
      }
    }

    if (!Number.isFinite(Number(appGlobalObj.goldenbodyId))) {
      appGlobalObj.goldenbodyId = 0;
    } else {
      appGlobalObj.goldenbodyId = Number(appGlobalObj.goldenbodyId);
    }

    return appGlobalObj;
  } catch (e) {
    return null;
  }
}

function getPrimaryAppInstanceArray(app) {
  if (!app) return [];
  try {
    var appGlobalObj = ensureAppRuntimeState(app);
    if (!appGlobalObj || typeof appGlobalObj !== "object") return [];
    var keys = getAppInstanceArrayKeys(app);
    for (var i = 0; i < keys.length; i++) {
      if (Array.isArray(appGlobalObj[keys[i]])) return appGlobalObj[keys[i]];
    }
    return [];
  } catch (e) {
    return [];
  }
}

function getAllAppInstanceArrays(app) {
  var lists = [];
  if (!app) return lists;
  try {
    var appGlobalObj = ensureAppRuntimeState(app);
    if (!appGlobalObj || typeof appGlobalObj !== "object") return lists;
    var keys = getAppInstanceArrayKeys(app);
    for (var i = 0; i < keys.length; i++) {
      var key = keys[i];
      if (!Array.isArray(appGlobalObj[key])) appGlobalObj[key] = [];
      if (lists.indexOf(appGlobalObj[key]) === -1) lists.push(appGlobalObj[key]);
    }
    return lists;
  } catch (e) {
    return [];
  }
}

function allocateAppGoldenbodyId(app) {
  var appGlobalObj = ensureAppRuntimeState(app);
  if (!appGlobalObj || typeof appGlobalObj !== "object") return null;
  appGlobalObj.goldenbodyId = Number(appGlobalObj.goldenbodyId || 0) + 1;
  return appGlobalObj.goldenbodyId;
}

function registerAppInstance(app, instance) {
  if (!app || !instance) return;
  var list = getPrimaryAppInstanceArray(app);
  if (!Array.isArray(list)) return;
  if (list.indexOf(instance) === -1) list.push(instance);
}

function deregisterAppInstance(app, instance) {
  if (!app || !instance) return;
  var lists = getAllAppInstanceArrays(app);
  if (!Array.isArray(lists) || !lists.length) return;
  for (var li = 0; li < lists.length; li++) {
    var list = lists[li];
    if (!Array.isArray(list)) continue;
    var index = list.indexOf(instance);
    if (index !== -1) list.splice(index, 1);
  }
}

function allocateFallbackRuntimeGoldenbodyId() {
  var now = Date.now();
  var state = Number(window.__flowawayFallbackRuntimeGoldenbodyState || 0);
  if (!Number.isFinite(state) || state <= 0) state = 0;
  if (state < now) state = now;
  else state = state + 1;
  window.__flowawayFallbackRuntimeGoldenbodyState = state;
  return state;
}

function applyAppWindowTagging(app, rootElement) {
  if (!app || !rootElement || !rootElement.dataset) return;
  try {
    var appIdentifier = getPreferredAppIdentifier(app);
    var appLabel = String(
      app.label || app.functionname || app.id || appIdentifier || "",
    );
    if (appIdentifier) rootElement.dataset.appId = String(appIdentifier);
    var currentTitle = String(rootElement.getAttribute("data-title") || "").trim();
    if (!currentTitle && appLabel) {
      rootElement.setAttribute("data-title", appLabel);
      rootElement.dataset.title = appLabel;
    }
  } catch (e) {}
}

window.ensureAppRuntimeState = ensureAppRuntimeState;

function resolveApptoolsContext(explicitAppId) {
  var launchContext = window.__flowawayLaunchContext || null;
  var resolvedAppId = String(explicitAppId || "").trim();
  if (!resolvedAppId && launchContext && launchContext.appId) {
    resolvedAppId = String(launchContext.appId || "").trim();
  }
  var app = (window.apps || []).find(function (a) {
    return appMatchesIdentifier(a, resolvedAppId);
  }) || (launchContext && launchContext.app) || null;
  if (!resolvedAppId && app) {
    resolvedAppId = getPreferredAppIdentifier(app);
  }
  return {
    appId: resolvedAppId || "",
    app: app || null,
    launchContext: launchContext || null,
  };
}

function initAppTools() {
  var existing = window.apptools && typeof window.apptools === "object"
    ? window.apptools
    : {};
  existing.api = existing.api && typeof existing.api === "object"
    ? existing.api
    : {};

  existing.createRoot = function (appId, posX, posY) {
    var ctx = resolveApptoolsContext(appId);
    var root = document.createElement("div");
    root.className = "app-root app-window-root";
    var isDark = !!(window.data && window.data.dark);
    root.classList.toggle("dark", isDark);
    root.classList.toggle("light", !isDark);
    if (ctx.appId) {
      root.classList.add(ctx.appId);
      root.dataset.appId = ctx.appId;
      root.setAttribute("data-app-id", ctx.appId);
    }
    root.style.position = "fixed";
    root.style.left = Number.isFinite(Number(posX)) ? String(Number(posX)) + "px" : "70px";
    root.style.top = Number.isFinite(Number(posY)) ? String(Number(posY)) + "px" : "70px";
    root.style.width = "1000px";
    root.style.height = "640px";
    if (document && document.body) {
      document.body.appendChild(root);
    }
    if (typeof bringToFront === "function") bringToFront(root);
    if (ctx.appId) atTop = ctx.appId;
    return root;
  };

  existing.api.makeDraggableResizable = function (root, dragTarget, btnMax) {
    if (!root || !dragTarget || root._apptoolsDragResizeBound) return;
    root._apptoolsDragResizeBound = true;

    function getInstance() {
      return root._appInstance && typeof root._appInstance === "object"
        ? root._appInstance
        : null;
    }

    function getBounds() {
      return {
        left: root.style.left || root.offsetLeft + "px",
        top: root.style.top || root.offsetTop + "px",
        width: root.style.width || root.offsetWidth + "px",
        height: root.style.height || root.offsetHeight + "px",
      };
    }

    function applyBounds(bounds) {
      if (!bounds) return;
      root.style.left = bounds.left;
      root.style.top = bounds.top;
      root.style.width = bounds.width;
      root.style.height = bounds.height;
    }

    function setMaximizedIcon(maximized) {
      if (btnMax && typeof window.setWindowMaximizeIcon === "function") {
        window.setWindowMaximizeIcon(btnMax, !!maximized);
      }
    }

    (function makeDraggable() {
      var dragging = false;
      var startX = 0;
      var startY = 0;
      var origLeft = 0;
      var origTop = 0;
      var thresholdCrossed = false;

      function getDragThreshold() {
        var v = Number(data && data.DRAG_THRESHOLD);
        if (!Number.isFinite(v)) return 15;
        return Math.max(2, Math.min(128, Math.round(v)));
      }

      var currentX;
      var currentY;

      dragTarget.addEventListener("mousedown", function (ev) {
        var configuredThreshold = Number(data && data.DRAG_THRESHOLD);
        if (Number.isFinite(configuredThreshold) && configuredThreshold > 0) {
          window.DRAG_THRESHOLD = configuredThreshold;
        }
        dragging = true;
        thresholdCrossed = false;
        startX = ev.clientX;
        startY = ev.clientY;
        origLeft = root.offsetLeft;
        origTop = root.offsetTop;
        currentX = ev.clientX;
        currentY = ev.clientY;
        document.body.style.userSelect = "none";
      });

      window.addEventListener("mousemove", function (ev) {
        if (!dragging) return;
        var dragDistance = Math.sqrt(
          Math.pow(ev.clientX - startX, 2) + Math.pow(ev.clientY - startY, 2),
        );
        if (!thresholdCrossed && dragDistance >= getDragThreshold()) {
          thresholdCrossed = true;
          var instance = getInstance();
          var isMaximized = !!((instance && instance._isMaximized) || root._apptoolsMaximized);
          if (isMaximized) {
            applyBounds(
              (instance && instance._flowawaySavedBounds) ||
                root._apptoolsSavedBounds ||
                getBounds(),
            );
            if (instance && typeof instance.restoreWindow === "function") {
              instance.restoreWindow(false);
            } else {
              root.style.borderRadius = "10px";
              if (instance) instance._isMaximized = false;
              root._apptoolsMaximized = false;
              setMaximizedIcon(false);
            }
            root.style.left = ev.clientX - root.clientWidth / 2 + "px";
            origLeft = ev.clientX - root.clientWidth / 2;
          }
        }
        if (!thresholdCrossed) return;
        var dx = ev.clientX - startX;
        var dy = ev.clientY - startY;
        root.style.left = origLeft + dx + "px";
        root.style.top = Math.max(0, origTop + dy) + "px";
      });

      window.addEventListener("mouseup", function () {
        if (!dragging) return;
        dragging = false;
        thresholdCrossed = false;
        document.body.style.userSelect = "";
      });
    })();

    function resize() {
      var el = root;
      var BW = 8;
      var minW = 450;
      var minH = 350;
      var active = null;

      function hitTest(e) {
        var r = el.getBoundingClientRect();
        var x = e.clientX;
        var y = e.clientY;
        var onL = x >= r.left && x <= r.left + BW;
        var onR = x <= r.right && x >= r.right - BW;
        var onT = y >= r.top && y <= r.top + BW;
        var onB = y <= r.bottom && y >= r.bottom - BW;
        if (onT && onL) return "nw";
        if (onT && onR) return "ne";
        if (onB && onL) return "sw";
        if (onB && onR) return "se";
        if (onL) return "w";
        if (onR) return "e";
        if (onT) return "n";
        if (onB) return "s";
        return "";
      }

      el.addEventListener("pointermove", function (e) {
        if (active) return;
        var d = hitTest(e);
        el.style.cursor = d
          ? d === "nw" || d === "se"
            ? "nwse-resize"
            : d === "ne" || d === "sw"
              ? "nesw-resize"
              : d === "n" || d === "s"
                ? "ns-resize"
                : "ew-resize"
          : "default";
      });

      el.addEventListener("pointerdown", function (e) {
        var dir = hitTest(e);
        if (!dir) return;
        var instance = getInstance();
        active = {
          dir: dir,
          sx: e.clientX,
          sy: e.clientY,
          sw: el.offsetWidth,
          sh: el.offsetHeight,
          sl: el.offsetLeft,
          st: el.offsetTop,
          startedMaximized: !!((instance && instance._isMaximized) || root._apptoolsMaximized),
          restoredFromMax: false,
        };
        document.body.style.userSelect = "none";
        try {
          el.setPointerCapture(e.pointerId);
        } catch (captureErr) {}
      });

      el.addEventListener("pointermove", function (e) {
        if (!active) return;
        if (
          active.startedMaximized &&
          !active.restoredFromMax &&
          (Math.abs(e.clientX - active.sx) > 1 ||
            Math.abs(e.clientY - active.sy) > 1)
        ) {
          var instance = getInstance();
          if (instance && typeof instance.restoreWindow === "function") {
            instance.restoreWindow(false);
          } else {
            root.style.borderRadius = "10px";
            if (instance) instance._isMaximized = false;
            root._apptoolsMaximized = false;
            setMaximizedIcon(false);
          }
          active.sx = e.clientX;
          active.sy = e.clientY;
          active.sw = el.offsetWidth;
          active.sh = el.offsetHeight;
          active.sl = el.offsetLeft;
          active.st = el.offsetTop;
          active.restoredFromMax = true;
        }
        var dx = e.clientX - active.sx;
        var dy = e.clientY - active.sy;
        if (active.dir.includes("e")) {
          el.style.width = Math.max(minW, active.sw + dx) + "px";
        }
        if (active.dir.includes("s")) {
          el.style.height = Math.max(minH, active.sh + dy) + "px";
        }
        if (active.dir.includes("w")) {
          el.style.width = Math.max(minW, active.sw - dx) + "px";
          el.style.left = active.sl + dx + "px";
        }
        if (active.dir.includes("n")) {
          el.style.height = Math.max(minH, active.sh - dy) + "px";
          el.style.top = Math.max(0, active.st + dy) + "px";
        }
      });

      el.addEventListener("pointerup", function () {
        active = null;
        document.body.style.userSelect = "";
        var bounds = getBounds();
        if (bounds.width == "100%" || bounds.height == "100%") {
        } else {
          var instance = getInstance();
          if (instance) instance._flowawaySavedBounds = bounds;
          root._apptoolsSavedBounds = bounds;
        }
      });

      el.addEventListener("pointercancel", function () {
        active = null;
        document.body.style.userSelect = "";
        var bounds = getBounds();
        var instance = getInstance();
        if (instance) instance._flowawaySavedBounds = bounds;
        root._apptoolsSavedBounds = bounds;
      });

      el.style.touchAction = "none";
    }

    resize();
    root.tabIndex = "0";
  };

  existing.createtitlebar = function (root) {
    if (!root || typeof root.querySelector !== "function") return null;
    var existingTop = root.querySelector(".appTopBar");
    if (existingTop) return existingTop;

    var dragStrip = root.querySelector(".appTopDragStrip");
    if (!dragStrip) {
      dragStrip = document.createElement("div");
      dragStrip.className = "appTopDragStrip";
      dragStrip.style.height = "14px";
      dragStrip.style.flexShrink = "0";
      dragStrip.style.display = "flex";
      dragStrip.style.cursor = "move";
      dragStrip.style.width = "100%";
      dragStrip.addEventListener("click", function () {
        if (typeof bringToFront === "function") bringToFront(root);
      });
      root.prepend(dragStrip);
    }

    var barrier = root.querySelector(".appTopBarrier");
    if (!barrier) {
      barrier = document.createElement("div");
      barrier.className = "appTopBarrier";
      barrier.style.flexShrink = "0";
      barrier.style.display = "flex";
      barrier.style.height = "14px";
      barrier.style.width = "100%";
      barrier.addEventListener("click", function () {
        if (typeof bringToFront === "function") bringToFront(root);
      });
      root.prepend(barrier);
    }

    var topBar = document.createElement("div");
    topBar.className = "appTopBar";
    topBar.style.display = "flex";
    topBar.style.justifyContent = "flex-end";
    topBar.style.alignItems = "center";
    topBar.style.padding = "2px";
    topBar.style.marginTop = "3px";
    topBar.style.cursor = "move";
    topBar.style.flexShrink = "0";
    topBar.style.position = "absolute";
    topBar.style.top = "6px";
    topBar.style.right = "6px";
    topBar.style.width = "auto";
    topBar.style.paddingTop = "14px"; // drag area height
    topBar.style.paddingBottom = "2px";
    
    var btnMin = document.createElement("button");
    btnMin.className = "btnMinColor";
    btnMin.title = "Minimize";

    var btnMax = document.createElement("button");
    btnMax.className = "btnMaxColor";
    btnMax.title = "Maximize/Restore";

    var btnClose = document.createElement("button");
    btnClose.title = "Close";
    btnClose.style.color = "white";
    btnClose.style.backgroundColor = "red";

    function applyWindowControlStyles() {
      var applyIcon =
        typeof window.applyWindowControlIcon === "function"
          ? window.applyWindowControlIcon
          : function () {};
      var setMaxIcon =
        typeof window.setWindowMaximizeIcon === "function"
          ? window.setWindowMaximizeIcon
          : function () {};

      applyIcon(btnMin, "minimize");
      var currentInstance = getInstance();
      setMaxIcon(btnMax, !!(currentInstance && currentInstance._isMaximized));
      applyIcon(btnClose, "close");
    }

    [btnMin, btnMax, btnClose].forEach(function (el) {
      el.style.margin = "0 2px";
      el.style.border = "none";
      el.style.padding = "4px 6px";
      el.style.fontSize = "14px";
      el.style.cursor = "pointer";
      topBar.appendChild(el);
    });

    [topBar, btnMin, btnMax, btnClose].forEach(function (el) {
      el.style.margin = "0 2px";
      el.style.border = "none";
      el.style.padding = "4px 6px";
      el.style.fontSize = "14px";
      el.style.cursor = "pointer";
    });

    function applyTitlebarTheme() {
      var dark = !!(window.data && window.data.dark);
      root.classList.toggle("dark", dark);
      root.classList.toggle("light", !dark);
      topBar.style.background = dark ? "#444" : "#ccc";
      btnMin.style.background = dark ? "black" : "white";
      btnMin.style.color = dark ? "white" : "black";
      btnMax.style.background = dark ? "black" : "white";
      btnMax.style.color = dark ? "white" : "black";
      btnClose.style.backgroundColor = "red";
      btnClose.style.color = "white";
      applyWindowControlStyles();
    }

    applyTitlebarTheme();
    root.addEventListener("styleapplied", applyTitlebarTheme);

    function getInstance() {
      return root._appInstance && typeof root._appInstance === "object"
        ? root._appInstance
        : null;
    }

    function setMaximizedIcon(maximized) {
      if (typeof window.setWindowMaximizeIcon === "function") {
        window.setWindowMaximizeIcon(btnMax, !!maximized);
      }
    }

    function maximizeOrRestore() {
      var instance = getInstance();
      var isMax = (instance && !!instance._isMaximized) || !!root._apptoolsMaximized;
      if (!isMax) {
        if (instance && typeof instance.maximizeWindow === "function") {
          instance.maximizeWindow();
          return;
        }
        var savedBounds = {
          left: root.style.left || root.offsetLeft + "px",
          top: root.style.top || root.offsetTop + "px",
          width: root.style.width || root.offsetWidth + "px",
          height: root.style.height || root.offsetHeight + "px",
        };
        root._apptoolsSavedBounds = savedBounds;
        root.style.left = "0";
        root.style.top = "0";
        root.style.width = "100%";
        root.style.height = !data.autohidetaskbar ? "calc(100% - 60px)" : "100%";
        root.style.borderRadius = "0";
        root._apptoolsMaximized = true;
        setMaximizedIcon(true);
        return;
      }
      if (instance && typeof instance.restoreWindow === "function") {
        instance.restoreWindow(true);
        return;
      }
      var restoreBounds = root._apptoolsSavedBounds || null;
      if (restoreBounds) {
        root.style.left = restoreBounds.left;
        root.style.top = restoreBounds.top;
        root.style.width = restoreBounds.width;
        root.style.height = restoreBounds.height;
      }
      root.style.borderRadius = "10px";
      root._apptoolsMaximized = false;
      setMaximizedIcon(false);
    }

    btnMin.addEventListener("click", function () {
      var instance = getInstance();
      if (instance && typeof instance.hideWindow === "function") {
        instance.hideWindow();
        return;
      }
      root.style.display = "none";
    });

    btnMax.addEventListener("click", function () {
      maximizeOrRestore();
    });

    btnClose.addEventListener("click", function () {
      var instance = getInstance();
      if (instance && typeof instance.closeWindow === "function") {
        instance.closeWindow();
        return;
      }
      if (typeof root.remove === "function") root.remove();
    });

    topBar.addEventListener("click", function () {
      if (typeof bringToFront === "function") bringToFront(root);
    });

    root.appendChild(topBar);
    existing.api.makeDraggableResizable(root, dragStrip, btnMax);
    return topBar;
  };

  existing.api.trackInstance = function (instance, appOrId) {
    if (!instance || typeof instance !== "object") return null;
    var app = null;
    if (appOrId && typeof appOrId === "object") {
      app = appOrId;
    } else {
      var hintedAppId = String(appOrId || "").trim();
      if (!hintedAppId && instance.rootElement && instance.rootElement.dataset) {
        hintedAppId = String(instance.rootElement.dataset.appId || "").trim();
      }
      if (!hintedAppId && instance.appId) {
        hintedAppId = String(instance.appId || "").trim();
      }
      if (hintedAppId) {
        app = (window.apps || []).find(function (candidate) {
          return appMatchesIdentifier(candidate, hintedAppId);
        }) || null;
      }
    }

    if (!app) return instance;

    var appState = ensureAppRuntimeState(app);
    var keys = getAppInstanceArrayKeys(app);
    if (!appState || !keys.length) return instance;

    if (!Number(instance.goldenbodyId)) {
      var allocated = allocateAppGoldenbodyId(app);
      if (Number.isFinite(Number(allocated)) && Number(allocated) > 0) {
        instance.goldenbodyId = Number(allocated);
        instance._goldenbodyId = Number(allocated);
      }
    }

    if (instance.rootElement) {
      instance.rootElement._goldenbodyId = instance.goldenbodyId;
      if (instance.rootElement.dataset) {
        instance.rootElement.dataset.goldenbodyId = String(instance.goldenbodyId || "");
        instance.rootElement.dataset.appId = String(getPreferredAppIdentifier(app) || "");
      }
    }

    for (var i = 0; i < keys.length; i++) {
      var key = keys[i];
      if (!Array.isArray(appState[key])) appState[key] = [];
      if (appState[key].indexOf(instance) === -1) appState[key].push(instance);
    }
    return instance;
  };

  existing.api.untrackInstance = function (instance, appOrId) {
    if (!instance || typeof instance !== "object") return null;
    var app = null;
    if (appOrId && typeof appOrId === "object") {
      app = appOrId;
    } else {
      var hintedAppId = String(appOrId || "").trim();
      if (!hintedAppId && instance.rootElement && instance.rootElement.dataset) {
        hintedAppId = String(instance.rootElement.dataset.appId || "").trim();
      }
      if (hintedAppId) {
        app = (window.apps || []).find(function (candidate) {
          return appMatchesIdentifier(candidate, hintedAppId);
        }) || null;
      }
    }
    if (app) {
      deregisterAppInstance(app, instance);
    }
    return instance;
  };

  existing.api.createAppInstance = function (ops) {
    var options = ops && typeof ops === "object" ? ops : {};
    var ctx = resolveApptoolsContext(options.appId || options.appid || "");
    var app = ctx.app;
    var appId = ctx.appId;
    var root = options.rootElement || options.root || null;
    var title = String(options.title || options.apptitle || "").trim();

    if (!root || typeof root !== "object") {
      root = existing.createRoot(appId, options.posX, options.posY);
    }

    if (title && typeof window.setAppDataTitle === "function") {
      window.setAppDataTitle(root, title);
    }

    var instance = {
      rootElement: root,
      btnMax: options.btnMax || (root && root.querySelector ? root.querySelector(".btnMaxColor") : null),
      _isMinimized: !!options._isMinimized,
      _isMaximized: !!options._isMaximized,
      goldenbodyId: Number(options.goldenbodyId) || 0,
    };

    Object.defineProperty(instance, "isMaximized", {
      configurable: true,
      enumerable: true,
      get: function () {
        return !!instance._isMaximized;
      },
      set: function (value) {
        instance._isMaximized = !!value;
      },
    });

    instance.getBounds = function () {
      if (!instance.rootElement || !instance.rootElement.style) {
        return {
          left: "70px",
          top: "70px",
          width: "700px",
          height: "auto",
        };
      }
      return {
        left: instance.rootElement.style.left,
        top: instance.rootElement.style.top,
        width: instance.rootElement.style.width,
        height: instance.rootElement.style.height,
      };
    };

    instance.applyBounds = function (bounds) {
      if (!bounds || !instance.rootElement || !instance.rootElement.style) return;
      instance.rootElement.style.left = bounds.left;
      instance.rootElement.style.top = bounds.top;
      instance.rootElement.style.width = bounds.width;
      instance.rootElement.style.height = bounds.height;
    };

    instance.maximizeWindow = function () {
      if (!instance.rootElement || !instance.rootElement.style) return;
      var savedBounds = instance.getBounds();
      instance._flowawaySavedBounds = savedBounds;
      instance.rootElement._apptoolsSavedBounds = savedBounds;
      instance.rootElement.style.left = "0";
      instance.rootElement.style.top = "0";
      instance.rootElement.style.width = "100%";
      instance.rootElement.style.height = !data.autohidetaskbar ? "calc(100% - 60px)" : "100%";
      instance.rootElement.style.borderRadius = "0px";
      instance._isMaximized = true;
      instance._isMinimized = false;
      instance.rootElement._apptoolsMaximized = true;
      if (instance.btnMax && typeof window.setWindowMaximizeIcon === "function") {
        window.setWindowMaximizeIcon(instance.btnMax, true);
      }
    };

    instance.restoreWindow = function (useOriginalBounds) {
      if (!instance.rootElement || !instance.rootElement.style) return;
      var shouldUseOriginal = typeof useOriginalBounds === "undefined" ? true : !!useOriginalBounds;
      if (shouldUseOriginal) {
        var restoreBounds =
          instance._flowawaySavedBounds ||
          instance.rootElement._apptoolsSavedBounds ||
          null;
        if (restoreBounds) {
          instance.applyBounds(restoreBounds);
        }
      }
      instance.rootElement.style.borderRadius = "10px";
      instance._isMaximized = false;
      instance.rootElement._apptoolsMaximized = false;
      if (instance.btnMax && typeof window.setWindowMaximizeIcon === "function") {
        window.setWindowMaximizeIcon(instance.btnMax, false);
      }
    };

    instance.showWindow = function () {
      if (!instance.rootElement || !instance.rootElement.style) return;
      var previousDisplay =
        typeof instance._flowawayPreviousDisplay === "string"
          ? instance._flowawayPreviousDisplay
          : "";
      instance.rootElement.style.display =
        previousDisplay && previousDisplay !== "none" ? previousDisplay : "";
      instance._isMinimized = false;
      if (typeof bringToFront === "function") bringToFront(instance.rootElement);
    };

    instance.hideWindow = function () {
      if (!instance.rootElement || !instance.rootElement.style) return;
      var currentDisplay =
        typeof instance.rootElement.style.display === "string"
          ? instance.rootElement.style.display
          : "";
      if (currentDisplay && currentDisplay !== "none") {
        instance._flowawayPreviousDisplay = currentDisplay;
      }
      instance.rootElement.style.display = "none";
      instance._isMinimized = true;
    };

    instance.closeWindow = function () {
      try {
        if (instance.rootElement && typeof instance.rootElement.remove === "function") {
          instance.rootElement.remove();
        }
      } catch (e) {}
      try {
        if (app) deregisterAppInstance(app, instance);
      } catch (e) {}
    };

    instance.showAll = function () {
      if (!app) {
        instance.showWindow();
        return;
      }
      var allInstances = window.getAppInstances(app);
      allInstances.sort(function (a, b) {
        var az = Number(a && a.rootElement && a.rootElement.style && a.rootElement.style.zIndex) || 0;
        var bz = Number(b && b.rootElement && b.rootElement.style && b.rootElement.style.zIndex) || 0;
        return az - bz;
      });
      for (var i = 0; i < allInstances.length; i++) {
        if (allInstances[i] && typeof allInstances[i].showWindow === "function") {
          allInstances[i].showWindow();
        }
      }
    };

    instance.hideAll = function () {
      if (!app) {
        instance.hideWindow();
        return;
      }
      var allInstances = window.getAppInstances(app);
      for (var i = 0; i < allInstances.length; i++) {
        if (allInstances[i] && typeof allInstances[i].hideWindow === "function") {
          allInstances[i].hideWindow();
        }
      }
    };

    instance.closeAll = function () {
      if (!app) {
        instance.closeWindow();
        return;
      }
      var allInstances = [...window.getAppInstances(app)];
      for (var i = 0; i < allInstances.length; i++) {
        if (allInstances[i] && typeof allInstances[i].closeWindow === "function") {
          allInstances[i].closeWindow();
        }
      }
    };

    instance.newWindow = function () {
      if (!appId) return null;
      return launchApp(appId);
    };

    if (app && !instance.goldenbodyId) {
      var allocated = allocateAppGoldenbodyId(app);
      if (Number.isFinite(Number(allocated)) && Number(allocated) > 0) {
        instance.goldenbodyId = Number(allocated);
      }
    } else if (!instance.goldenbodyId) {
      var fallbackAllocated = allocateFallbackRuntimeGoldenbodyId();
      if (Number.isFinite(Number(fallbackAllocated)) && Number(fallbackAllocated) > 0) {
        instance.goldenbodyId = Number(fallbackAllocated);
      }
    }

    if (instance.rootElement) {
      instance.rootElement._appInstance = instance;
      instance.rootElement._goldenbodyId = instance.goldenbodyId;
      if (instance.rootElement.dataset) {
        instance.rootElement.dataset.goldenbodyId = String(instance.goldenbodyId);
        if (appId) instance.rootElement.dataset.appId = String(appId);
      }
    }

    return instance;
  };

  window.apptools = existing;
}

initAppTools();

function resolveLaunchContextRoot() {
  try {
    var launchContext = window.__flowawayLaunchContext;
    var launchAppId =
      launchContext && launchContext.appId
        ? String(launchContext.appId)
        : "";
    var roots = Array.from(document.querySelectorAll(".app-window-root"));
    if (launchAppId) {
      for (var i = roots.length - 1; i >= 0; i--) {
        var root = roots[i];
        if (!root || !root.dataset) continue;
        if (String(root.dataset.appId || "") === launchAppId) {
          return root;
        }
      }
    }
    return roots.length ? roots[roots.length - 1] : null;
  } catch (e) {
    return null;
  }
}

window.setAppDataTitle = function (targetOrTitle, maybeTitle) {
  var target = null;
  var title = "";

  if (
    targetOrTitle &&
    typeof targetOrTitle === "object" &&
    typeof targetOrTitle.setAttribute === "function"
  ) {
    target = targetOrTitle;
    title = String(maybeTitle || "").trim();
  } else {
    title = String(targetOrTitle || "").trim();
    target = resolveLaunchContextRoot();
  }

  if (!target || !title) return false;
  try {
    target.setAttribute("data-title", title);
    if (target.dataset) target.dataset.title = title;
    return true;
  } catch (e) {
    return false;
  }
};

window.setDataTitle = window.setAppDataTitle;

async function toIconImageMarkup(iconPathOrUrl, folderPath) {
  return getFlowawayAppLoaderRuntime().toIconImageMarkup(iconPathOrUrl, folderPath);
}

// Helper function to extract app data from an app folder
async function extractAppData(appFolder) {
  return getFlowawayAppLoaderRuntime().extractAppData(appFolder);
}
async function loadAppsFromTree() {
  if (loaded) return;
  loaded = true;
  window.apps = [];
  if (!window.treeData) await window.loadTree();
  try {
    var rootChildren = (window.treeData && window.treeData[1]) || [];
    var appsNode = rootChildren.find(
      (c) => c[0] === "apps" && Array.isArray(c[1]),
    );
    if (!appsNode) return;
    var appFolders = normalizeAppFolders(appsNode[1]);
    for (const appFolder of appFolders) {
      try {
        const appData = await extractAppData(appFolder);
        if (appData) {
          ensureAppRuntimeState(appData);
          window.apps.push(appData);
        }
      } catch (e) {
        flowawayError("loadAppsFromTree", "Failed to parse app folder", e, {
          folder: appFolder && appFolder[0],
        });
      }
    }

    // Sort apps alphabetically by label
    window.apps.sort((a, b) => a.label.localeCompare(b.label));

    // render
    await renderAppsGrid();

     // reapply task buttons now that apps may be present
     applyTaskButtons();
    purgeButtons();
    setTimeout(() => {
      var appUpdatedEvent = new CustomEvent("appUpdated", { detail: null });
      window.dispatchEvent(appUpdatedEvent);
      setTimeout(() => {
        var appUpdatedEvent = new CustomEvent("appUpdated", { detail: null });
        window.dispatchEvent(appUpdatedEvent);
        setTimeout(() => {
          var appUpdatedEvent = new CustomEvent("appUpdated", { detail: null });
          window.dispatchEvent(appUpdatedEvent);
          setTimeout(() => {
            var appUpdatedEvent = new CustomEvent("appUpdated", {
              detail: null,
            });
            window.dispatchEvent(appUpdatedEvent);
          }, 5000);
        }, 5000);
      }, 5000);
    }, 5000);
    // Start polling for app changes
    startAppPolling();
  } catch (e) {
    flowawayError("loadAppsFromTree", "loadAppsFromTree failed", e);
  }
}

async function renderAppsGrid() {
  // Load config and render pinned apps
  if (!window._startMenuConfig) await loadStartMenuConfig();
  await renderPinnedAppsGrid();
  // Also load all app scripts
  if (!window.apps) return;
  for (const app of window.apps) {
    try {
      ensureAppRuntimeState(app);
      if (!app.icon) {
        if (!app.scriptLoaded && app.jsFile) {
          try {
            var b64NoIcon = await fetchFileContentByPath(
              `${app.path}/${app.jsFile}`,
            );
            var scriptTextNoIcon = base64ToUtf8(b64NoIcon);
            app._lastScriptHash = hashScriptContent(scriptTextNoIcon);
            try {
              var globalvarobjectstring = app.globalvarobjectstring;
              if (app.functionname && typeof window[app.functionname] !== "undefined") {
                try {
                  delete window[app.functionname];
                } catch (e) {}
              }
              if (
                app.cmf &&
                globalvarobjectstring &&
                window[globalvarobjectstring] &&
                !isProtectedAppGlobalName(app.cmf) &&
                typeof window[globalvarobjectstring][app.cmf] !== "undefined"
              ) {
                try {
                  delete window[globalvarobjectstring][app.cmf];
                } catch (e) {}
              }
            } catch (e) {}
            var beforeGlobalsNoIcon = new Set(
              Object.getOwnPropertyNames(window),
            );
            var sNoIcon = document.createElement("script");
            sNoIcon.type = "text/javascript";
            sNoIcon.textContent = scriptTextNoIcon;
            document.body.appendChild(sNoIcon);
            app.scriptLoaded = true;
            app._scriptElement = sNoIcon;
            try {
              app._addedGlobals = [];
              var captureAddedNoIcon = () => {
                try {
                  var afterNoIcon = Object.getOwnPropertyNames(window);
                  var newlyNoIcon = afterNoIcon.filter(
                    (k) =>
                      !beforeGlobalsNoIcon.has(k) &&
                      !(app._addedGlobals || []).includes(k),
                  );
                  if (newlyNoIcon.length)
                    app._addedGlobals = [
                      ...new Set([
                        ...(app._addedGlobals || []),
                        ...newlyNoIcon,
                      ]),
                    ];
                } catch (e) {}
              };
              captureAddedNoIcon();
              setTimeout(captureAddedNoIcon, 120);
              setTimeout(captureAddedNoIcon, 800);
              setTimeout(captureAddedNoIcon, 2500);
            } catch (e) {}
          } catch (e) {
            flowawayError(
              "renderAppsGrid",
              "Failed to load app script (no icon)",
              e,
              {                 appId: app && app.id,                 path: app && app.path               },
            );
          }
        }
        continue;
      }
      // Skip old rendering - handled by new renderPinnedAppsGrid/renderAllAppsGrid/renderRecentsGrid
      // Just load the app script
      if (!app.scriptLoaded && app.jsFile) {
        try {
          var b64 = await fetchFileContentByPath(`${app.path}/${app.jsFile}`);
          var scriptText = decodeFileTextStrict(
            b64,
            `${app.path}/${app.jsFile}`,
            { allowEmpty: true },
          );
          if (!String(scriptText || "").trim()) {
            flowawayError("renderAppsGrid", "App script is empty; skipping load", null, {
              appId: app && app.id,
              path: app && app.path,
              jsFile: app && app.jsFile,
            });
            continue;
          }
          // Store hash for future change detection
          app._lastScriptHash = hashScriptContent(scriptText);
          // Prefer removing globals created by previous script rather than deleting app metadata
          try {
            var globalvarobjectstring = app.globalvarobjectstring;
            if (app.functionname && typeof window[app.functionname] !== "undefined") {
              try {
                delete window[app.functionname];
              } catch (e) {}
            }
            if (
              app.cmf &&
              globalvarobjectstring &&
              window[globalvarobjectstring] &&
              !isProtectedAppGlobalName(app.cmf) &&
              typeof window[globalvarobjectstring][app.cmf] !== "undefined"
            ) {
              try {
                delete window[globalvarobjectstring][app.cmf];
              } catch (e) {}
            }
          } catch (e) {}
          // snapshot globals before injection
          var beforeGlobals = new Set(Object.getOwnPropertyNames(window));
          var s = document.createElement("script");
          s.type = "text/javascript";
          s.textContent = scriptText;
          document.body.appendChild(s);
          app.scriptLoaded = true;
          app._scriptElement = s;
          // record any globals the script introduced (best-effort)
          try {
            app._addedGlobals = [];
            var captureAdded = () => {
              try {
                var after = Object.getOwnPropertyNames(window);
                var newly = after.filter(
                  (k) =>
                    !beforeGlobals.has(k) &&
                    !(app._addedGlobals || []).includes(k),
                );
                if (newly.length)
                  app._addedGlobals = [
                    ...new Set([...(app._addedGlobals || []), ...newly]),
                  ];
              } catch (e) {}
            };
            // immediate capture and a few delayed captures to catch async initializers
            captureAdded();
            setTimeout(captureAdded, 120);
            setTimeout(captureAdded, 800);
            setTimeout(captureAdded, 2500);
          } catch (e) {}
        } catch (e) {
          flowawayCrash(
            "Failed to load app script.",
            `${app && app.path}/${app && app.jsFile}` + "\n" + String(e && (e.stack || e.message) || e),
          );
        }
      }
    } catch (e) {
      flowawayError("renderAppsGrid", "Failed while loading app", e, {
        appId: app && app.id,
        path: app && app.path,
      });
      continue;
    }
  }
}
async function launchApp(appId) {
  var app = (window.apps || []).find((a) => appMatchesIdentifier(a, appId));
  window[app.functionname]();
}

// ===== LIVE APP POLLING =====
function getFlowawayAppPollingRuntime() {
  var runtime = window.FlowawayAppPolling;
  if (!runtime || runtime.__loaded !== true) {
    flowawayCrash(
      "App polling runtime unavailable.",
      "systemfiles/appPolling.js was not loaded.",
    );
  }
  return runtime;
}

function queueAppPollingHint(msg) {
  return getFlowawayAppPollingRuntime().queueHint(msg);
}

function collectAppPollingHint() {
  return getFlowawayAppPollingRuntime().collectHint();
}

function refreshAppsUiAfterChanges() {
  return getFlowawayAppPollingRuntime().refreshAppsUiAfterChanges();
}

function scheduleAppPoll(reason = "unknown") {
  return getFlowawayAppPollingRuntime().schedulePoll(reason);
}

function startAppPollingViaWebSocket() {
  return getFlowawayAppPollingRuntime().startViaWebSocket();
}

async function pollAppChanges(forceMetadataCheck = false, targetFolders = null) {
  return getFlowawayAppPollingRuntime().pollAppChanges(forceMetadataCheck, targetFolders);
}

async function pollSpecificAppChanges(changedFolders = []) {
  return getFlowawayAppPollingRuntime().pollSpecificAppChanges(changedFolders);
}
// appUpdated - ensure single binding
try {
  if (window._flowaway_handlers.onAppUpdated)
    window.removeEventListener(
      "appUpdated",
      window._flowaway_handlers.onAppUpdated,
    );
  window._flowaway_handlers.onAppUpdated = (e) => {
    purgeButtons();
  };
  window.addEventListener("appUpdated", window._flowaway_handlers.onAppUpdated);
} catch (e) {}
function startAppPolling() {
  return getFlowawayAppPollingRuntime().start();
}

// Ensure loadAppsFromTree runs after initial tree load
var oldLoadTree = window.loadTree;
window.loadTree = async function () {
  await oldLoadTree();
  await loadAppsFromTree();
  annotateTreeWithPaths(window.treeData);
};
async function ensureFlowawayAppLoaderLoaded() {
  try {
    if (window.FlowawayAppLoader && window.FlowawayAppLoader.__loaded) {
      return true;
    }

    if (window.__flowawayAppLoaderSystemPromise) {
      try {
        await window.__flowawayAppLoaderSystemPromise;
      } catch (e) {}
      if (window.FlowawayAppLoader && window.FlowawayAppLoader.__loaded) {
        return true;
      }
      delete window.__flowawayAppLoaderSystemPromise;
    }

    window.__flowawayAppLoaderSystemPromise = (async function () {
      if (typeof fetchFileContentByPath === "function") {
        var b64Runtime = await fetchFileContentByPath("systemfiles/appLoader.js");
        var inlineText = decodeFileTextStrict(
          b64Runtime,
          "systemfiles/appLoader.js",
          { allowEmpty: false },
        );
        var inlineScript = document.createElement("script");
        inlineScript.type = "text/javascript";
        inlineScript.textContent = inlineText;
        document.body.appendChild(inlineScript);
        if (window.FlowawayAppLoader && window.FlowawayAppLoader.__loaded) {
          return true;
        }
      }

      await new Promise(function (resolve, reject) {
        try {
          var script = document.createElement("script");
          script.src = "systemfiles/appLoader.js";
          script.async = false;
          script.onload = function () {
            resolve(true);
          };
          script.onerror = function (err) {
            reject(err || new Error("Failed to load systemfiles/appLoader.js"));
          };
          document.body.appendChild(script);
        } catch (e) {
          reject(e);
        }
      });

      if (window.FlowawayAppLoader && window.FlowawayAppLoader.__loaded) {
        return true;
      }
      flowawayCrash(
        "App loader runtime failed to initialize.",
        "systemfiles/appLoader.js loaded but FlowawayAppLoader is unavailable.",
      );
    })();

    try {
      await window.__flowawayAppLoaderSystemPromise;
      return !!(window.FlowawayAppLoader && window.FlowawayAppLoader.__loaded);
    } catch (e) {
      delete window.__flowawayAppLoaderSystemPromise;
      flowawayCrash(
        "Failed to load app loader runtime.",
        String(e && (e.stack || e.message) || e),
      );
      return false;
    }
  } catch (e) {
    flowawayCrash(
      "Unexpected app loader runtime failure.",
      String(e && (e.stack || e.message) || e),
    );
    return false;
  }
}

async function ensureFlowawayAppPollingLoaded() {
  try {
    if (window.FlowawayAppPolling && window.FlowawayAppPolling.__loaded) {
      return true;
    }

    if (window.__flowawayAppPollingSystemPromise) {
      try {
        await window.__flowawayAppPollingSystemPromise;
      } catch (e) {}
      if (window.FlowawayAppPolling && window.FlowawayAppPolling.__loaded) {
        return true;
      }
      delete window.__flowawayAppPollingSystemPromise;
    }

    window.__flowawayAppPollingSystemPromise = (async function () {
      if (typeof fetchFileContentByPath === "function") {
        var b64Runtime = await fetchFileContentByPath("systemfiles/appPolling.js");
        var inlineText = decodeFileTextStrict(
          b64Runtime,
          "systemfiles/appPolling.js",
          { allowEmpty: false },
        );
        var inlineScript = document.createElement("script");
        inlineScript.type = "text/javascript";
        inlineScript.textContent = inlineText;
        document.body.appendChild(inlineScript);
        if (window.FlowawayAppPolling && window.FlowawayAppPolling.__loaded) {
          return true;
        }
      }

      await new Promise(function (resolve, reject) {
        try {
          var script = document.createElement("script");
          script.src = "systemfiles/appPolling.js";
          script.async = false;
          script.onload = function () {
            resolve(true);
          };
          script.onerror = function (err) {
            reject(err || new Error("Failed to load systemfiles/appPolling.js"));
          };
          document.body.appendChild(script);
        } catch (e) {
          reject(e);
        }
      });

      if (window.FlowawayAppPolling && window.FlowawayAppPolling.__loaded) {
        return true;
      }
      flowawayCrash(
        "App polling runtime failed to initialize.",
        "systemfiles/appPolling.js loaded but FlowawayAppPolling is unavailable.",
      );
    })();

    try {
      await window.__flowawayAppPollingSystemPromise;
      delete window.__flowawayAppPollingSystemFailed;
      return !!(window.FlowawayAppPolling && window.FlowawayAppPolling.__loaded);
    } catch (e) {
      window.__flowawayAppPollingSystemFailed = true;
      delete window.__flowawayAppPollingSystemPromise;
      flowawayCrash(
        "Failed to load app polling runtime.",
        String(e && (e.stack || e.message) || e),
      );
      return false;
    }
  } catch (e) {
    flowawayCrash(
      "Unexpected app polling runtime failure.",
      String(e && (e.stack || e.message) || e),
    );
    return false;
  }
}

async function ensureProcessRuntimeLoaded() {
  try {
    if (window.FlowawayProcess && window.FlowawayProcess.__loaded) {
      return true;
    }

    if (window.__flowawayProcessSystemPromise) {
      try {
        await window.__flowawayProcessSystemPromise;
      } catch (e) {}
      if (window.FlowawayProcess && window.FlowawayProcess.__loaded) {
        return true;
      }
      delete window.__flowawayProcessSystemPromise;
    }

    window.__flowawayProcessSystemPromise = (async function () {
      if (typeof fetchFileContentByPath === "function") {
        var b64ProcessRuntime = await fetchFileContentByPath("systemfiles/processes.js");
        var inlineProcessText = decodeFileTextStrict(
          b64ProcessRuntime,
          "systemfiles/processes.js",
          { allowEmpty: false },
        );
        var inlineProcessScript = document.createElement("script");
        inlineProcessScript.type = "text/javascript";
        inlineProcessScript.textContent = inlineProcessText;
        document.body.appendChild(inlineProcessScript);
        if (window.FlowawayProcess && window.FlowawayProcess.__loaded) {
          return true;
        }
      }

      await new Promise(function (resolve, reject) {
        try {
          var script = document.createElement("script");
          script.src = "systemfiles/processes.js";
          script.async = false;
          script.onload = function () {
            resolve(true);
          };
          script.onerror = function (err) {
            reject(err || new Error("Failed to load systemfiles/processes.js"));
          };
          document.body.appendChild(script);
        } catch (e) {
          reject(e);
        }
      });

      if (window.FlowawayProcess && window.FlowawayProcess.__loaded) {
        return true;
      }
      flowawayCrash(
        "Process runtime failed to initialize.",
        "systemfiles/processes.js loaded but FlowawayProcess is unavailable.",
      );
    })();

    try {
      await window.__flowawayProcessSystemPromise;
      delete window.__flowawayProcessSystemFailed;
      return !!(window.FlowawayProcess && window.FlowawayProcess.__loaded);
    } catch (e) {
      window.__flowawayProcessSystemFailed = true;
      delete window.__flowawayProcessSystemPromise;
      flowawayCrash(
        "Failed to load process runtime.",
        String(e && (e.stack || e.message) || e),
      );
      return false;
    }
  } catch (e) {
    flowawayCrash(
      "Unexpected process runtime loader failure.",
      String(e && (e.stack || e.message) || e),
    );
    return false;
  }
}

Promise.all([
  ensureFlowawayAppLoaderLoaded(),
  ensureFlowawayAppPollingLoaded(),
  ensureProcessRuntimeLoaded(),
])
  .finally(function () {
    if (typeof window.loadTree === "function") {
      window.loadTree();
    }
  });
window.onlyloadTree = oldLoadTree;
// ----------------- END dynamic app loader -----------------

var username = (  typeof data !== 'undefined' && data && typeof data.username === 'string')     ? data.username : '';

// fullscreen keyboard lock
// fullscreenchange - ensure single binding
try {
  if (window._flowaway_handlers.onFullscreenChange)
    document.removeEventListener(
      "fullscreenchange",
      window._flowaway_handlers.onFullscreenChange,
    );
  window._flowaway_handlers.onFullscreenChange = async () => {
    if (document.fullscreenElement) {
      if (navigator.keyboard && typeof navigator.keyboard.lock === "function") {
        try {
          await navigator.keyboard.lock(["Escape"]);
        } catch (e) {}
      }
    } else {
      if (
        navigator.keyboard &&
        typeof navigator.keyboard.unlock === "function"
      ) {
        try {
          navigator.keyboard.unlock();
        } catch (e) {}
      }
    }
  };
  document.addEventListener(
    "fullscreenchange",
    window._flowaway_handlers.onFullscreenChange,
  );
} catch (e) {}

window.removeOtherMenus = function (except) {
  try {
    // Remove any menus with the shared .app-menu class (used across apps)
    var menus = document.querySelectorAll(".app-menu");
    for (const m of menus) {
      try {
        if (except && m.dataset && m.dataset.appId === except) continue;
      } catch (e) {}
      try {
        m.remove();
      } catch (e) {}
    }
  } catch (e) {}
};

window.resolveAppFromEvent = function (evt, appOverride = null) {
  if (appOverride && typeof appOverride === "object") return appOverride;
  try {
    var appId =
      evt &&
      evt.target &&
      evt.target.closest &&
      evt.target.closest("[data-app-id], [data-appid]")
        ? evt.target.closest("[data-app-id], [data-appid]").dataset.appId ||
          evt.target.closest("[data-app-id], [data-appid]").dataset.appid
        : "";

    if (!appId && evt && evt.target && evt.target.closest) {
      var taskBtn = evt.target.closest("button.taskbutton");
      if (taskBtn) {
        appId =
          (taskBtn.dataset && taskBtn.dataset.appId) ||
          (taskBtn.value && String(taskBtn.value).trim()) ||
          "";
      }
    }

    if (!appId) return null;
    return       (window.apps || []).find((a) => appMatchesIdentifier(a, appId)) || null;
  } catch (e) {
    return null;
  }
};

window.getAppInstances = function (app) {
  if (!app) return [];
  try {
    return getPrimaryAppInstanceArray(app);
  } catch (e) {
    return [];
  }
};

window.showUnifiedAppContextMenu = function (e,   appOverride = null,   needRemove = true) {
  if (!e) return;
  e.preventDefault();

  var app = window.resolveAppFromEvent(e, appOverride);
  if (!app) return;

  document.querySelectorAll(".app-menu").forEach((m) => m.remove());
  try {
    window._flowaway_handlers = window._flowaway_handlers || {};
    if (window._flowaway_handlers.onAppMenuOutsidePointerDown) {
      document.removeEventListener(
        "pointerdown",
        window._flowaway_handlers.onAppMenuOutsidePointerDown,
        true,
      );
      delete window._flowaway_handlers.onAppMenuOutsidePointerDown;
    }
    if (window._flowaway_handlers.onAppMenuEscapeKey) {
      document.removeEventListener(
        "keydown",
        window._flowaway_handlers.onAppMenuEscapeKey,
        true,
      );
      delete window._flowaway_handlers.onAppMenuEscapeKey;
    }
  } catch (err) {}

  const menu = document.createElement("div");
  try {
    removeOtherMenus(app.id || app.functionname || "");
  } catch (err) {}

  menu.className = "app-menu";
  if (app && app.id) menu.dataset.appId = String(app.id);
  Object.assign(menu.style, {
    position: "fixed",
    left: `${e.clientX}px`,
    border: "1px solid #ccc",
    borderRadius: "4px",
    boxShadow: "0 2px 6px rgba(0,0,0,0.2)",
    zIndex: 9999999,
    padding: "4px 0",
    minWidth: "160px",
    fontSize: "13px",
    visibility: "hidden",
  });
  data.dark
    ? menu.classList.toggle("dark", true)
    : menu.classList.toggle("light", true);

  function withInstances(handler) {
    try {
      var instances = window.getAppInstances(app);
      handler(instances);
    } catch (err) {}
    menu.remove();
  }

  const closeAll = document.createElement("div");
  closeAll.textContent = "Close all";
  closeAll.style.padding = "6px 10px";
  closeAll.style.cursor = "pointer";
  closeAll.addEventListener("click", () => {
    withInstances((instances) => {
      const first = instances[0];
      if (first && typeof first.closeAll === "function") {
        first.closeAll();
        return;
      }
      for (const instance of [...instances]) {
        if (instance && typeof instance.closeWindow === "function") {
          instance.closeWindow();
        }
      }
    });
  });
  menu.appendChild(closeAll);

  const hideAll = document.createElement("div");
  hideAll.textContent = "Hide all";
  hideAll.style.padding = "6px 10px";
  hideAll.style.cursor = "pointer";
  hideAll.addEventListener("click", () => {
    withInstances((instances) => {
      const first = instances[0];
      if (first && typeof first.hideAll === "function") {
        first.hideAll();
        return;
      }
      for (const instance of instances) {
        if (instance && typeof instance.hideWindow === "function") {
          instance.hideWindow();
        } else if (instance && instance.rootElement) {
          instance.rootElement.style.display = "none";
        }
      }
    });
  });
  menu.appendChild(hideAll);

  const showAll = document.createElement("div");
  showAll.textContent = "Show all";
  showAll.style.padding = "6px 10px";
  showAll.style.cursor = "pointer";
  showAll.addEventListener("click", () => {
    withInstances((instances) => {
      const first = instances[0];
      if (first && typeof first.showAll === "function") {
        first.showAll();
        return;
      }
      instances.sort((a, b) => {
        var az = Number(a && a.rootElement && a.rootElement.style && a.rootElement.style.zIndex) || 0;
        var bz = Number(b && b.rootElement && b.rootElement.style && b.rootElement.style.zIndex) || 0;
        return az - bz;
      });
      for (const instance of instances) {
        if (instance && typeof instance.showWindow === "function") {
          instance.showWindow();
        } else if (instance && instance.rootElement) {
          instance.rootElement.style.display = "block";
          bringToFront(instance.rootElement);
        }
      }
    });
  });
  menu.appendChild(showAll);

  const newWindow = document.createElement("div");
  newWindow.textContent = "New window";
  newWindow.style.padding = "6px 10px";
  newWindow.style.cursor = "pointer";
  newWindow.addEventListener("click", () => {
    withInstances((instances) => {
      const first = instances[0];
      if (first && typeof first.newWindow === "function") {
        first.newWindow();
      } else {
        launchApp(getPreferredAppIdentifier(app));
      }
    });
  });
  menu.appendChild(newWindow);

  if (needRemove) {
    const remove = document.createElement("div");
    remove.textContent = "Remove from taskbar";
    remove.style.padding = "6px 10px";
    remove.style.cursor = "pointer";
    const contextMenuEvent = e;
    remove.addEventListener("click", () => {
      var btn =
        contextMenuEvent &&         contextMenuEvent.target &&         contextMenuEvent.target.closest
          ? contextMenuEvent.target.closest("button.taskbutton")
          : null;
      if (btn) {
        removeTaskButton(btn);
        try {
          saveTaskButtons();
          purgeButtons();
        } catch (err) {}
      }
      menu.remove();
    });
    menu.appendChild(remove);
  } else {
    const appId = getPreferredAppIdentifier(app);
    const existingBtn = document.querySelector(
      `button.taskbutton[data-app-id="${appId}"]`,
    );

    if (existingBtn) {
      const remove = document.createElement("div");
      remove.textContent = "Remove from taskbar";
      remove.style.padding = "6px 10px";
      remove.style.cursor = "pointer";
      remove.addEventListener("click", function () {
        removeTaskButton(existingBtn);
        try {
          saveTaskButtons();
          purgeButtons();
        } catch (err) {}
        menu.remove();
      });
      menu.appendChild(remove);
    } else {
      const add = document.createElement("div");
      add.textContent = "Add to taskbar";
      add.style.padding = "6px 10px";
      add.style.cursor = "pointer";
      add.addEventListener("click", function () {
        const btn = addTaskButton(
          app.icon,
          () => launchApp(appId),
          "cmf",
          "",
          appId,
        );
        if (btn) btn.dataset.appId = appId;
        saveTaskButtons();
        purgeButtons();
        menu.remove();
      });
      menu.appendChild(add);
    }
  }

  const barrier = document.createElement("hr");
  menu.appendChild(barrier);

  const instances = window.getAppInstances(app);
  if (instances.length === 0) {
    const item = document.createElement("div");
    item.textContent = "No open windows";
    item.style.padding = "6px 10px";
    menu.appendChild(item);
  } else {
    instances.forEach((instance, i) => {
      const item = document.createElement("div");
      item.textContent = instance.title || `${app.label || "Window"} ${i + 1}`;
      Object.assign(item.style, {
        padding: "6px 10px",
        cursor: "pointer",
        maxWidth: "185px",
        whiteSpace: "nowrap",
        overflow: "hidden",
        textOverflow: "ellipsis",
      });

      item.addEventListener("click", () => {
        try {
          if (instance && typeof instance.showWindow === "function") {
            instance.showWindow();
          } else if (instance && instance.rootElement) {
            instance.rootElement.style.display = "block";
            bringToFront(instance.rootElement);
          }
        } catch (err) {}
        menu.remove();
      });

      menu.appendChild(item);
    });
  }

  document.body.appendChild(menu);

  var nativeMenuRemove = menu.remove.bind(menu);
  var menuClosed = false;
  function closeMenu() {
    if (menuClosed) return;
    menuClosed = true;
    try {
      nativeMenuRemove();
    } catch (err) {}
    try {
      if (window._flowaway_handlers && window._flowaway_handlers.onAppMenuOutsidePointerDown) {
        document.removeEventListener(
          "pointerdown",
          window._flowaway_handlers.onAppMenuOutsidePointerDown,
          true,
        );
        delete window._flowaway_handlers.onAppMenuOutsidePointerDown;
      }
      if (window._flowaway_handlers && window._flowaway_handlers.onAppMenuEscapeKey) {
        document.removeEventListener(
          "keydown",
          window._flowaway_handlers.onAppMenuEscapeKey,
          true,
        );
        delete window._flowaway_handlers.onAppMenuEscapeKey;
      }
    } catch (err) {}
  }

  try {
    window._flowaway_handlers = window._flowaway_handlers || {};
    window._flowaway_handlers.onAppMenuOutsidePointerDown = function (evt) {
      if (!menu || !menu.isConnected) {
        closeMenu();
        return;
      }
      if (evt && evt.target && menu.contains(evt.target)) return;
      closeMenu();
    };
    window._flowaway_handlers.onAppMenuEscapeKey = function (evt) {
      if (!evt) return;
      if (evt.key === "Escape") closeMenu();
    };
    document.addEventListener(
      "pointerdown",
      window._flowaway_handlers.onAppMenuOutsidePointerDown,
      true,
    );
    document.addEventListener(
      "keydown",
      window._flowaway_handlers.onAppMenuEscapeKey,
      true,
    );
  } catch (err) {}

  menu.remove = closeMenu;

  requestAnimationFrame(() => {
    const menuHeight = menu.offsetHeight;
    let top = e.clientY - menuHeight;
    if (top < 0) top = 0;
    menu.style.top = `${top}px`;
    menu.style.visibility = "visible";
  });

};

window.cmf = function (e, appOverride = null) {
  window.showUnifiedAppContextMenu(e, appOverride, true);
};

window.cmfl1 = function (e, appOverride = null) {
  window.showUnifiedAppContextMenu(e, appOverride, false);
};

