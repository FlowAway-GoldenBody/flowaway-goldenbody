window.protectedGlobals.initAppTools = function () {
  var existing = window.protectedGlobals.apptools || {};
  existing.api = existing.api || {};

  existing.createRoot = function (appId, posX, posY) {
    var ctx = window.protectedGlobals.resolveApptoolsContext(appId);
    var root = document.createElement("div");
    root.className = "app-root app-window-root";
    var isDark = !!(window.protectedGlobals.data && window.protectedGlobals.data.dark);
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
    window.protectedGlobals.bringToFront(root);
    if (ctx.appId) window.protectedGlobals.atTop = ctx.appId;
    return root;
  };

  existing.api.makeDraggableResizable = function (root, dragTarget, btnMax) {
    if (!root || !dragTarget || root._apptoolsDragResizeBound) return;
    root._apptoolsDragResizeBound = true;

    function getInstance() {
      return root._appInstance || null;
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
        window.protectedGlobals.setWindowMaximizeIcon(btnMax, !!maximized);
    }
    let active = null;
    (function makeDraggable() {
      var dragging = false;
      var startX = 0;
      var startY = 0;
      var origLeft = 0;
      var origTop = 0;
      var thresholdCrossed = false;

      function getDragThreshold() {
        var v = Number(window.protectedGlobals.data && window.protectedGlobals.data.DRAG_THRESHOLD);
        if (!Number.isFinite(v)) return 15;
        return Math.max(2, Math.min(128, Math.round(v)));
      }

      var currentX;
      var currentY;

      dragTarget.addEventListener("mousedown", function (ev) {
        if (active) return;
        var configuredThreshold = Number(window.protectedGlobals.data && window.protectedGlobals.data.DRAG_THRESHOLD);
        if (Number.isFinite(configuredThreshold) && configuredThreshold > 0) {
          window.protectedGlobals.DRAG_THRESHOLD = configuredThreshold;
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
              (instance && instance.savedBounds) ||
                root._apptoolsSavedBounds ||
                getBounds(),
            );
            if (instance) {
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
      active = null;

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
        el.setPointerCapture(e.pointerId);
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
          if (instance) {
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
          if (instance) instance.savedBounds = bounds;
          root._apptoolsSavedBounds = bounds;
        }
      });

      el.addEventListener("pointercancel", function () {
        active = null;
        document.body.style.userSelect = "";
        var bounds = getBounds();
        var instance = getInstance();
        if (instance) instance.savedBounds = bounds;
        root._apptoolsSavedBounds = bounds;
      });

      el.style.touchAction = "none";
    }

    resize();
    root.tabIndex = "0";
  };

  existing.createtitlebar = function (root) {
    if (!root) return null;
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
        window.protectedGlobals.bringToFront(root);
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
        window.protectedGlobals.bringToFront(root);
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
      var applyIcon = window.protectedGlobals.applyWindowControlIcon;
      var setMaxIcon = window.protectedGlobals.setWindowMaximizeIcon;

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
      var dark = !!(window.protectedGlobals.data && window.protectedGlobals.data.dark);
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
      return root._appInstance || null;
    }

    function setMaximizedIcon(maximized) {
      window.protectedGlobals.setWindowMaximizeIcon(btnMax, !!maximized);
    }

    function maximizeOrRestore() {
      var instance = getInstance();
      var isMax = (instance && !!instance._isMaximized) || !!root._apptoolsMaximized;
      if (!isMax) {
        if (instance) {
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
        root.style.height = !(window.protectedGlobals.data && window.protectedGlobals.data.autohidetaskbar) ? "calc(100% - 60px)" : "100%";
        root.style.borderRadius = "0";
        root._apptoolsMaximized = true;
        setMaximizedIcon(true);
        return;
      }
      if (instance) {
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
      if (instance) {
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
      if (instance) {
        instance.closeWindow();
        return;
      }
      root.remove();
    });

    topBar.addEventListener("click", function () {
      window.protectedGlobals.bringToFront(root);
    });

    root.appendChild(topBar);
    existing.api.makeDraggableResizable(root, dragStrip, btnMax);
    return topBar;
  };

  existing.api.trackInstance = function (instance, appOrId) {
    var app = null;
    
    if (appOrId && typeof appOrId === 'object') {
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
        app = (window.protectedGlobals.apps || []).find(function (candidate) {
          return window.protectedGlobals.appMatchesIdentifier(candidate, hintedAppId);
        }) || null;
      }
    }

    if (!app) {
      console.warn("trackInstance: Could not resolve app");
      return instance;
    }

    var appState = window.protectedGlobals.initAppRuntimeState(app);
    if (!Number(instance.goldenbodyId)) {
      var allocated = window.protectedGlobals.allocateAppGoldenbodyId(app);
      if (Number.isFinite(Number(allocated)) && Number(allocated) > 0) {
        instance.goldenbodyId = Number(allocated);
        instance._goldenbodyId = Number(allocated);
      }
    }

    if (instance.rootElement) {
      instance.rootElement._goldenbodyId = instance.goldenbodyId;
      if (instance.rootElement.dataset) {
        instance.rootElement.dataset.goldenbodyId = String(instance.goldenbodyId);
        instance.rootElement.dataset.appId = app.functionname.trim();
      }
    }

    var instances = appState[app.allapparraystring];
    if (instances && Array.isArray(instances)) {
      if (instances.indexOf(instance) === -1) {
        instances.push(instance);
      }
    }
    return instance;
  };



  existing.api.createAppInstance = function (ops) {
    var options = ops || {};
    var root = options.rootElement || options.root || null;
    
    var initialAppId = options.appId || options.appid || "";
    
    var ctx = window.protectedGlobals.resolveApptoolsContext(initialAppId, root);
    var app = ctx.app;
    var appId = ctx.appId;
    var title = String(options.title || options.apptitle || "").trim();

    if (!root) {
      root = existing.createRoot(appId, options.posX, options.posY);
    }

    if (title) {
      window.protectedGlobals.setAppDataTitle(root, title);
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
      instance.savedBounds = savedBounds;
      instance.rootElement._apptoolsSavedBounds = savedBounds;
      instance.rootElement.style.left = "0";
      instance.rootElement.style.top = "0";
      instance.rootElement.style.width = "100%";
      instance.rootElement.style.height = !(window.protectedGlobals.data && window.protectedGlobals.data.autohidetaskbar) ? "calc(100% - 60px)" : "100%";
      instance.rootElement.style.borderRadius = "0px";
      instance._isMaximized = true;
      instance._isMinimized = false;
      instance.rootElement._apptoolsMaximized = true;
      if (instance.btnMax) {
        window.protectedGlobals.setWindowMaximizeIcon(instance.btnMax, true);
      }
    };

    instance.restoreWindow = function (useOriginalBounds) {
      if (!instance.rootElement || !instance.rootElement.style) return;
      var shouldUseOriginal = useOriginalBounds !== false;
      if (shouldUseOriginal) {
        var restoreBounds =
          instance.savedBounds ||
          instance.rootElement._apptoolsSavedBounds ||
          null;
        if (restoreBounds) {
          instance.applyBounds(restoreBounds);
        }
      }
      instance.rootElement.style.borderRadius = "10px";
      instance._isMaximized = false;
      instance.rootElement._apptoolsMaximized = false;
      if (instance.btnMax) {
        window.protectedGlobals.setWindowMaximizeIcon(instance.btnMax, false);
      }
    };

    instance.showWindow = function () {
      if (!instance.rootElement || !instance.rootElement.style) return;
      var previousDisplay = instance.previousDisplay || "";
      instance.rootElement.style.display =
        previousDisplay && previousDisplay !== "none" ? previousDisplay : "";
      instance._isMinimized = false;
      window.protectedGlobals.bringToFront(instance.rootElement);
    };

    instance.hideWindow = function () {
      if (!instance.rootElement || !instance.rootElement.style) return;
      var currentDisplay = instance.rootElement.style.display || "";
      if (currentDisplay && currentDisplay !== "none") {
        instance.previousDisplay = currentDisplay;
      }
      instance.rootElement.style.display = "none";
      instance._isMinimized = true;
    };

    instance.closeWindow = function () {
      if (instance.rootElement && instance.rootElement.remove) {
        instance.rootElement.remove();
      }
      if (app && window[app.globalvarobjectstring] && window[app.globalvarobjectstring][app.allapparraystring]) {
        var instances = window[app.globalvarobjectstring][app.allapparraystring];
        var idx = instances.indexOf(instance);
        if (idx >= 0) {
          instances.splice(idx, 1);
        }
      }
    };

    instance.showAll = function () {
      if (!app) {
        instance.showWindow();
        return;
      }
      var allInstances = window[app.globalvarobjectstring][app.allapparraystring];
      allInstances.sort(function (a, b) {
        var az = Number(a && a.rootElement && a.rootElement.style && a.rootElement.style.zIndex) || 0;
        var bz = Number(b && b.rootElement && b.rootElement.style && b.rootElement.style.zIndex) || 0;
        return az - bz;
      });
      for (var i = 0; i < allInstances.length; i++) {
        if (allInstances[i]) {
          allInstances[i].showWindow();
        }
      }
    };

    instance.hideAll = function () {
      if (!app) {
        instance.hideWindow();
        return;
      }
      var allInstances = window[app.globalvarobjectstring][app.allapparraystring];
      for (var i = 0; i < allInstances.length; i++) {
        if (allInstances[i]) {
          allInstances[i].hideWindow();
        }
      }
    };

    instance.closeAll = function () {
      if (!app) {
        instance.closeWindow();
        return;
      }
      var allInstances = [...window[app.globalvarobjectstring][app.allapparraystring]];
      for (var i = 0; i < allInstances.length; i++) {
        if (allInstances[i]) {
          allInstances[i].closeWindow();
        }
      }
    };

    instance.newWindow = function () {
      if (!appId) return null;
      return window.protectedGlobals.launchApp(appId);
    };

    if (app && !instance.goldenbodyId) {
      var allocated = window.protectedGlobals.allocateAppGoldenbodyId(app);
      if (Number.isFinite(Number(allocated)) && Number(allocated) > 0) {
        instance.goldenbodyId = Number(allocated);
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

  window.protectedGlobals.apptools = existing;
};
window.protectedGlobals.initAppTools();