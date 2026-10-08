"use strict";
window.protectedGlobals.initAppTools = function () {
  var existing = window.protectedGlobals.apptools || {};
  existing.api = existing.api || {};

  function ensureResizeHandles(root) {
    if (!root || root._apptoolsResizeHandlesReady) return;
    root._apptoolsResizeHandlesReady = true;

    var handleSize = 7;
    var cornerSize = 10;
    var minW = 450;
    var minH = 350;

    var active = null;
    var activeHandle = null;

    function finishResize(e, saveBounds) {
      if (!active) return;

      if (e && e.pointerId !== undefined && e.pointerId !== active.pointerId) {
        return;
      }

      var completed = saveBounds !== false;
      var pointerId = active.pointerId;
      var handle = activeHandle;

      active = null;
      activeHandle = null;

      document.body.style.userSelect = "";

      try {
        if (handle && handle.hasPointerCapture(pointerId)) {
          handle.releasePointerCapture(pointerId);
        }
      } catch (_) {}

      if (!completed) return;

      var bounds = {
        left: root.style.left || root.offsetLeft + "px",
        top: root.style.top || root.offsetTop + "px",
        width: root.style.width || root.offsetWidth + "px",
        height: root.style.height || root.offsetHeight + "px",
      };

      var instance = root._appInstance || null;

      if (instance) {
        instance.savedBounds = bounds;
      }

      root._apptoolsSavedBounds = bounds;
    }

    var resizeBlurHandler = function () {
      finishResize(null, false);
    };

    var resizePointerUpHandler = function (e) {
      if (active && e.pointerId === active.pointerId) {
        finishResize(e, true);
      }
    };

    window.addEventListener("blur", resizeBlurHandler);
    document.addEventListener("pointerup", resizePointerUpHandler);

    root._destroyResizeListeners = function () {
      window.removeEventListener("blur", resizeBlurHandler);
      document.removeEventListener("pointerup", resizePointerUpHandler);
      finishResize(null, false);
    };

    var handleConfigs = [
      {
        className: "app-resize-handle-left",
        direction: "w",
        style: {
          left: "0px",
          top: "0px",
          bottom: "0px",
          width: handleSize + "px",
          cursor: "ew-resize",
        },
      },
      {
        className: "app-resize-handle-top",
        direction: "n",
        style: {
          left: "0px",
          right: "0px",
          top: "0px",
          height: handleSize + "px",
          cursor: "ns-resize",
        },
      },
      {
        className: "app-resize-handle-right",
        direction: "e",
        style: {
          right: "0px",
          top: "0px",
          bottom: "0px",
          width: handleSize + "px",
          cursor: "ew-resize",
        },
      },
      {
        className: "app-resize-handle-bottom",
        direction: "s",
        style: {
          left: "0px",
          right: "0px",
          bottom: "0px",
          height: handleSize + "px",
          cursor: "ns-resize",
        },
      },
      {
        className: "app-resize-handle-topleft",
        direction: "nw",
        style: {
          left: "0px",
          top: "0px",
          width: cornerSize + "px",
          height: cornerSize + "px",
          cursor: "nwse-resize",
        },
      },
      {
        className: "app-resize-handle-topright",
        direction: "ne",
        style: {
          right: "0px",
          top: "0px",
          width: cornerSize + "px",
          height: cornerSize + "px",
          cursor: "nesw-resize",
        },
      },
      {
        className: "app-resize-handle-bottomleft",
        direction: "sw",
        style: {
          left: "0px",
          bottom: "0px",
          width: cornerSize + "px",
          height: cornerSize + "px",
          cursor: "nesw-resize",
        },
      },
      {
        className: "app-resize-handle-bottomright",
        direction: "se",
        style: {
          right: "0px",
          bottom: "0px",
          width: cornerSize + "px",
          height: cornerSize + "px",
          cursor: "nwse-resize",
        },
      },
    ];

    handleConfigs.forEach(function (cfg) {
      var handle = document.createElement("div");

      handle.className = "app-resize-handle " + cfg.className;
      handle.style.position = "absolute";
      handle.style.zIndex = root.style.zIndex;
      handle.style.background = "transparent";
      handle.style.opacity = "0";
      handle.style.pointerEvents = "auto";
      handle.style.touchAction = "none";

      handle._finishResize = function (saveBounds) {
        finishResize(null, saveBounds);
      };

      Object.keys(cfg.style).forEach(function (key) {
        handle.style[key] = cfg.style[key];
      });

      handle.addEventListener("pointerdown", function (e) {
        e.preventDefault();
        e.stopPropagation();

        var instance = root._appInstance || null;
        var isMaximized = !!((instance && instance._isMaximized) || root._apptoolsMaximized);

        activeHandle = handle;

        active = {
          direction: cfg.direction,
          pointerId: e.pointerId,
          startX: e.clientX,
          startY: e.clientY,
          width: root.offsetWidth,
          height: root.offsetHeight,
          left: root.offsetLeft,
          top: root.offsetTop,
          startedMaximized: isMaximized,
          restoredFromMax: false,
        };

        document.body.style.userSelect = "none";

        handle.setPointerCapture(e.pointerId);
      });

      handle.addEventListener("pointermove", function (e) {
        if (!active || e.pointerId !== active.pointerId) return;

        e.preventDefault();
        e.stopPropagation();

        /*
         * If the window is maximized, the first resize movement restores it.
         * restoreWindow(false) only changes the state/border and does not
         * restore the old bounds, which lets the resize continue naturally.
         */
        if (active.startedMaximized && !active.restoredFromMax && (Math.abs(e.clientX - active.startX) > 1 || Math.abs(e.clientY - active.startY) > 1)) {
          var instance = root._appInstance || null;

          if (instance) {
            instance.restoreWindow(false);
          }

          active.startX = e.clientX;
          active.startY = e.clientY;
          active.width = root.offsetWidth;
          active.height = root.offsetHeight;
          active.left = root.offsetLeft;
          active.top = root.offsetTop;
          active.restoredFromMax = true;
        }

        var dx = e.clientX - active.startX;
        var dy = e.clientY - active.startY;

        var newWidth = active.width;
        var newHeight = active.height;
        var newLeft = active.left;
        var newTop = active.top;

        if (cfg.direction.indexOf("e") !== -1) {
          newWidth = Math.max(minW, active.width + dx);
        }

        if (cfg.direction.indexOf("s") !== -1) {
          newHeight = Math.max(minH, active.height + dy);
        }

        if (cfg.direction.indexOf("w") !== -1) {
          newWidth = Math.max(minW, active.width - dx);

          if (newWidth !== minW || dx < 0) {
            newLeft = active.left + (active.width - newWidth);
          }
        }

        if (cfg.direction.indexOf("n") !== -1) {
          var requestedTop = active.top + dy;
          var maxTop = active.top + active.height - minH;

          newTop = Math.max(0, Math.min(requestedTop, maxTop));
          newHeight = active.height + (active.top - newTop);
        }

        root.style.width = newWidth + "px";
        root.style.height = newHeight + "px";

        if (cfg.direction.indexOf("w") !== -1) {
          root.style.left = newLeft + "px";
        }

        if (cfg.direction.indexOf("n") !== -1) {
          root.style.top = newTop + "px";
        }
      });

      handle.addEventListener("pointercancel", function (e) {
        finishResize(e, false);
      });

      root.appendChild(handle);
    });
  }
  existing.createRoot = function (appId, posX, posY, width, height, maximize, minimize, hiddenDragstrip) {
    var ctx = window.protectedGlobals.resolveApptoolsContext(appId);
    var root = document.createElement("div");
    root.className = "app-root app-window-root";
    var isDark = !!window.protectedGlobals.data.dark;
    root.classList.toggle("dark", isDark);
    root.classList.toggle("light", !isDark);
    if (ctx.appId) {
      root.dataset.appId = ctx.appId;
      root.setAttribute("data-app-id", ctx.appId);
    }
    root.style.position = "fixed";
    root.hiddenDragstrip = !!hiddenDragstrip;
    root.style.left = Number.isFinite(Number(posX)) ? String(Number(posX)) + "px" : "70px";
    root.style.top = Number.isFinite(Number(posY)) ? String(Number(posY)) + "px" : "70px";
    root.style.width = typeof width === "number" ? String(width) + "px" : "1000px";
    root.style.height = typeof height === "number" ? String(height) + "px" : "640px";
    document.body.appendChild(root);
    ensureResizeHandles(root);
    root._cancelResize = function () {
      var handles = root.querySelectorAll(".app-resize-handle");

      handles.forEach(function (handle) {
        if (typeof handle._finishResize === "function") {
          handle._finishResize(false);
        }
      });

      document.body.style.userSelect = "";
    };
    window.protectedGlobals.bringToFront(root);
    if (ctx.appId) window.protectedGlobals.atTop = ctx.appId;
    return root;
  };

  existing.api.makeDraggableResizable = function (root, dragTarget) {
    if (!root  || root._apptoolsDragResizeBound) return;
    root._apptoolsDragResizeBound = true;
    ensureResizeHandles(root);

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

    function makeDraggable() {
      var dragging = false;
      var startX = 0;
      var startY = 0;
      var origLeft = 0;
      var origTop = 0;
      var thresholdCrossed = false;

      function getDragThreshold() {
        var v = Number(window.protectedGlobals.data.DRAG_THRESHOLD);
        if (!Number.isFinite(v)) return 15;
        return Math.max(2, Math.min(128, Math.round(v)));
      }

      function dragPointerDownHandler(ev) {
        if (ev.target !== dragTarget) return;
        var configuredThreshold = Number(window.protectedGlobals.data.DRAG_THRESHOLD);

        if (Number.isFinite(configuredThreshold) && configuredThreshold > 0) {
          window.protectedGlobals.DRAG_THRESHOLD = configuredThreshold;
        }

        dragging = true;
        thresholdCrossed = false;
        startX = ev.clientX;
        startY = ev.clientY;
        origLeft = root.offsetLeft;
        origTop = root.offsetTop;

        document.body.style.userSelect = "none";
      }

      function dragPointerMoveHandler(ev) {
        if (!dragging) return;

        var dragDistance = Math.sqrt(Math.pow(ev.clientX - startX, 2) + Math.pow(ev.clientY - startY, 2));

        if (!thresholdCrossed && dragDistance >= getDragThreshold()) {
          thresholdCrossed = true;

          var instance = getInstance();
          var isMaximized = !!((instance && instance._isMaximized) || root._apptoolsMaximized);

          if (isMaximized) {
            applyBounds((instance && instance.savedBounds) || root._apptoolsSavedBounds || getBounds());

            if (instance) {
              instance.restoreWindow(false);
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
      }

      function dragPointerUpHandler() {
        if (!dragging) return;

        dragging = false;
        thresholdCrossed = false;
        document.body.style.userSelect = "";
      }

      dragTarget.addEventListener("pointerdown", dragPointerDownHandler);

      window.addEventListener("pointermove", dragPointerMoveHandler);

      window.addEventListener("pointerup", dragPointerUpHandler);

      /*
       * Store the exact handlers so closeWindow() can remove
       * the listeners later.
       */
      root._destroyDragListeners = function () {
        dragTarget.removeEventListener("pointerdown", dragPointerDownHandler);

        window.removeEventListener("pointermove", dragPointerMoveHandler);

        window.removeEventListener("pointerup", dragPointerUpHandler);

        dragging = false;
        thresholdCrossed = false;
        document.body.style.userSelect = "";
      };
    };
    makeDraggable();
    root.tabIndex = "0";
  };
  let applyTitlebarTheme = null;
  existing.createTitlebar = function (root) {
    if (!root) return null;
    var existingTop = root.querySelector(".appTopBar");
    if (existingTop) return existingTop;

    var dragStrip = !root.hiddenDragstrip ? root.querySelector(".appTopDragStrip") : false;
    if (!dragStrip && !root.hiddenDragstrip) {
      dragStrip = document.createElement("div");
      dragStrip.className = "appTopDragStrip";
      dragStrip.style.height = "28px";
      dragStrip.style.flexShrink = "0";
      dragStrip.style.display = "flex";
      dragStrip.style.cursor = "move";
      dragStrip.style.width = "100%";
      dragStrip.addEventListener("click", function () {
        window.protectedGlobals.bringToFront(root);
      });
      root.prepend(dragStrip);
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
    topBar.style.paddingTop = "28px"; // drag area height
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
      el.style.cursor = "pointer";
      topBar.appendChild(el);
    });

    [topBar, btnMin, btnMax, btnClose].forEach(function (el) {
      el.style.margin = "0 2px";
      el.style.border = "none";
      el.style.padding = "4px 6px";
      el.style.cursor = "pointer";
    });

    applyTitlebarTheme = function (forced = false, overrideDark = null) {
      if (forced !== true && root.dataset.themeManual === "true") return;
      var dark = overrideDark !== null ? !!overrideDark : !!window.protectedGlobals.data.dark;
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
    };

    applyTitlebarTheme(true);
    root.addEventListener("styleapplied", applyTitlebarTheme);

    function getInstance() {
      return root._appInstance || null;
    }

    function setMaximizedIcon(maximized) {
      window.protectedGlobals.setWindowMaximizeIcon(btnMax, !!maximized);
    }

    function maximizeOrRestore() {
      var instance = getInstance();
      if (!instance) return;

      if (instance._isMaximized) {
        instance.restoreWindow(true);
      } else {
        instance.maximizeWindow();
      }
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
    existing.api.makeDraggableResizable(root, dragStrip || root);
    return topBar;
  };

  existing.api.trackInstance = function (instance, appOrId) {
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
        app =
          (window.protectedGlobals.apps || []).find(function (candidate) {
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
        instance.rootElement.dataset.appId = app.id.trim();
      }
    }

    var instances = appState[app.allAppArrayString];
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
    var topbar = options.topbar || options.titlebar || null;
    var initialAppId = options.appId || options.appid || "";

    var ctx = window.protectedGlobals.resolveApptoolsContext(initialAppId, root);
    var app = ctx.app;
    var appId = ctx.appId;
    var title = String(options.title || options.apptitle || "").trim();

    var instance = {
      rootElement: root,
      btnMax: options.btnMax || (root && root.querySelector ? root.querySelector(".btnMaxColor") : null),
      _isMinimized: !!options._isMinimized,
      _isMaximized: !!options._isMaximized,
      topbar: topbar,
      topbarElement: topbar,
      titlebar: topbar,
      titlebarElement: topbar,
      applyTitlebarTheme,
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
      instance.rootElement._cancelResize();
      if (!instance.rootElement || !instance.rootElement.style) return;
      var savedBounds = instance.getBounds();
      instance.savedBounds = savedBounds;
      instance.rootElement._apptoolsSavedBounds = savedBounds;
      instance.rootElement.style.left = "0";
      instance.rootElement.style.top = window.protectedGlobals.data.autohidetaskbar ? "0px" : window.protectedGlobals.currentAppMaximizedTop;
      instance.rootElement.style.width = "100%";
      instance.rootElement.style.height = window.protectedGlobals.data.autohidetaskbar ? "100%" : `calc(100% - ${window.protectedGlobals.currentTaskbarHeight}px)`;
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
      instance.rootElement._cancelResize();
      var shouldUseOriginal = useOriginalBounds !== false;
      if (shouldUseOriginal) {
        var restoreBounds = instance.savedBounds || instance.rootElement._apptoolsSavedBounds || null;
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
      instance.rootElement.style.display = previousDisplay && previousDisplay !== "none" ? previousDisplay : "";
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
      window.protectedGlobals.bringToFront(window.protectedGlobals.atTopElement);
    };

    instance.closeWindow = function () {
      instance.rootElement._cancelResize();
      instance.rootElement._destroyResizeListeners();
      instance.rootElement._destroyDragListeners();
      if (instance.rootElement?.remove) {
        instance.rootElement.remove();
      }
      if (app && window[app.globalVarObjectString] && window[app.globalVarObjectString][app.allAppArrayString]) {
        var instances = window[app.globalVarObjectString][app.allAppArrayString];
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
      var allInstances = window[app.globalVarObjectString][app.allAppArrayString];
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
      var allInstances = window[app.globalVarObjectString][app.allAppArrayString];
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
      var allInstances = [...window[app.globalVarObjectString][app.allAppArrayString]];
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

    if (!root) {
      root = existing.createRoot(appId, options.posX, options.posY, options.width, options.height, undefined, undefined, options.hiddenDragstrip);
      instance.rootElement = root;
    }
    if (!topbar) {
      topbar = existing.createTitlebar(root);
      instance.topbar = topbar;
      instance.topbarElement = topbar;
      instance.titlebar = topbar;
      instance.titlebarElement = topbar;
      instance.btnMax = root.querySelector(".btnMaxColor");
      // Ensure the instance gets the titlebar theme applier function
      // createTitlebar assigns to the outer `applyTitlebarTheme` variable,
      // so copy that function onto the instance after creation.
      instance.applyTitlebarTheme = applyTitlebarTheme || null;
      // Also attach to the DOM root for external callers that expect it there.
      if (instance.rootElement) instance.rootElement._applyTitlebarTheme = instance.applyTitlebarTheme;
    }

    // Ensure the DOM root element references this instance (set after root/topbar creation)
    if (instance.rootElement) {
      instance.rootElement._appInstance = instance;
      instance.rootElement._goldenbodyId = instance.goldenbodyId;
      if (instance.rootElement.dataset) {
        instance.rootElement.dataset.goldenbodyId = String(instance.goldenbodyId);
        if (appId) instance.rootElement.dataset.appId = String(appId);
      }
    }
    if (title) {
      window.protectedGlobals.setAppDataTitle(root, title);
    }

    if (options.maximize) {
      instance.maximizeWindow();
    }
    if (options.minimize) {
      instance.hideWindow();
    }
    return instance;
  };

  window.protectedGlobals.apptools = existing;
};
window.protectedGlobals.initAppTools();