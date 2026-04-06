//yourApp global vars
window.yourAppGlobals = {};
yourAppGlobals.allYourAppInstances = [];
yourAppGlobals.goldenbodyId = 0;

yourApp = function (posX = 50, posY = 50) {
  startMenu.style.display = "none";
  let isMaximized = false;
  let _isMinimized = false;
  atTop = "yourApp";
  const root = document.createElement("div");

  root.className = "app-root";
  Object.assign(root.style, {
    position: "fixed",
    top: posY + "px",
    left: posX + "px",
    width: "1000px",
    height: "640px",
    boxShadow: "0 12px 40px rgba(0,0,0,0.35)",
    borderRadius: "10px",
    overflow: "hidden",
    display: "flex",
    flexDirection: "column",
    fontFamily: "sans-serif",
    zIndex: 1000,
  });
  root.classList.add("yourApp");
  bringToFront(root);
  document.body.appendChild(root);
  yourAppGlobals.goldenbodyId++;
  root._goldenbodyId = yourAppGlobals.goldenbodyId;

  // --- Top bar ---
  var topBar = false;
  if (!topBar) {
    topBar = document.createElement("div");
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
  }
  const dragStrip = document.createElement("div");
  dragStrip.style.height = "14px";
  dragStrip.style.flexShrink = "0";
  dragStrip.style.display = "flex";
  dragStrip.style.cursor = "move";
  dragStrip.style.width = "100%";
  dragStrip.addEventListener("click", function () {
    bringToFront(root);
  });
  root.prepend(dragStrip);
  const barrier = document.createElement("div");
  barrier.style.flexShrink = "0";
  barrier.style.display = "flex";
  barrier.style.height = "14px";
  barrier.style.width = "100%";
  barrier.addEventListener("click", function () {
    bringToFront(root);
  });
  root.prepend(barrier);

  var btnMin = document.createElement("button");
  btnMin.className = "btnMinColor";
  btnMin.title = "Minimize";
  topBar.appendChild(btnMin);

  var btnMax = document.createElement("button");
  btnMax.className = "btnMaxColor";
  btnMax.title = "Maximize/Restore";
  topBar.appendChild(btnMax);

  var btnClose = document.createElement("button");
  btnClose.title = "Close";
  btnClose.style.color = "white";
  btnClose.style.backgroundColor = "red";
  topBar.appendChild(btnClose);

  [topBar, btnMin, btnMax, btnClose].forEach((el) => {
    el.style.margin = "0 2px";
    el.style.border = "none";
    el.style.padding = "4px 6px";
    el.style.fontSize = "14px";
    el.style.cursor = "pointer";
  });
  const applyWindowControlIcon =
    window.applyWindowControlIcon || function () {};
  const setWindowMaximizeIcon = window.setWindowMaximizeIcon || function () {};
  applyWindowControlIcon(btnMin, "minimize");
  setWindowMaximizeIcon(btnMax, false);
  applyWindowControlIcon(btnClose, "close");
  topBar.addEventListener("click", function () {
    bringToFront(root);
  });
  root.appendChild(topBar);
  // --- Saved bounds shared correctly ---
  let savedBounds = {
    left: root.style.left,
    top: root.style.top,
    width: root.style.width,
    height: root.style.height,
  };

  function maximizeWindow() {
    savedBounds = getBounds();
    root.style.left = "0";
    root.style.top = "0";
    root.style.width = "100%";
    root.style.height = !data.autohidetaskbar ? `calc(100% - 60px)` : "100%";
    root.style.borderRadius = "0px";
    isMaximized = true;
    _isMinimized = false;
    setWindowMaximizeIcon(btnMax, true);
  }

  function restoreWindow(useOriginalBounds = true) {
    if (useOriginalBounds && savedBounds) {
      applyBounds(savedBounds);
    }
    root.style.borderRadius = "10px";
    isMaximized = false;
    setWindowMaximizeIcon(btnMax, false);
  }

  function closeWindow() {
    root.remove();
    const index = yourAppGlobals.allYourAppInstances.findIndex(
      (instance) => instance.rootElement == root,
    );
    if (index !== -1) yourAppGlobals.allYourAppInstances.splice(index, 1);
    window.removeAllEventListenersForApp("yourApp" + root._goldenbodyId);
  }

  function hideWindow() {
    if (!isMaximized) savedBounds = getBounds();
    root.style.display = "none";
    _isMinimized = true;
  }

  function showWindow() {
    root.style.display = "flex";
    _isMinimized = false;
    bringToFront(root);
  }

  function closeAll() {
    for (const instance of [...yourAppGlobals.allYourAppInstances]) {
      if (instance && typeof instance.closeWindow === "function") {
        instance.closeWindow();
      }
    }
    yourAppGlobals.allYourAppInstances = [];
  }

  function hideAll() {
    for (const instance of yourAppGlobals.allYourAppInstances) {
      if (instance && typeof instance.hideWindow === "function") {
        instance.hideWindow();
      }
    }
  }

  function showAll() {
    yourAppGlobals.allYourAppInstances.sort(
      (a, b) => a.rootElement.style.zIndex - b.rootElement.style.zIndex,
    );
    for (const instance of yourAppGlobals.allYourAppInstances) {
      if (instance && typeof instance.showWindow === "function") {
        instance.showWindow();
      }
    }
  }

  function newWindow() {
    yourApp(50, 50);
  }

  // Minimize
  btnMin.addEventListener("click", () => {
    hideWindow();
  });

  // Maximize / Restore
  btnMax.addEventListener("click", () => {
    if (!isMaximized) {
      maximizeWindow();
    } else {
      restoreWindow(true);
    }
  });

  // Close
  btnClose.addEventListener("click", closeWindow);

  // --- Make draggable / resizable ---
  makeDraggableResizable(root, dragStrip, btnMax);

  function getBounds() {
    return {
      left: root.style.left,
      top: root.style.top,
      width: root.style.width,
      height: root.style.height,
    };
  }

  function applyBounds(bounds) {
    root.style.left = bounds.left;
    root.style.top = bounds.top;
    root.style.width = bounds.width;
    root.style.height = bounds.height;
  }
  // --- Make draggable/resizable from previous snippet ---
  function makeDraggableResizable(el, topBar, btnMax) {
    (function makeDraggable() {
      let dragging = false,
        startX = 0,
        startY = 0,
        origLeft = 0,
        origTop = 0;
      let currentX, currentY;
      let thresholdCrossed = false;
      const DRAG_THRESHOLD = 15; // pixels required to trigger drag behavior

      topBar.addEventListener("mousedown", (ev) => {
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

      window.addEventListener("yourApp" + root._goldenbodyId, "mousemove", (ev) => {
        if (!dragging) return;
        
        // Calculate distance dragged from initial mousedown
        const dragDistance = Math.sqrt(
          Math.pow(ev.clientX - startX, 2) + Math.pow(ev.clientY - startY, 2)
        );
        
        // Only trigger the restore and drag behavior after crossing threshold
        if (!thresholdCrossed && dragDistance >= DRAG_THRESHOLD) {
          thresholdCrossed = true;
          // Restore window if it was maximized
          if (isMaximized) {
            applyBounds(savedBounds);
            restoreWindow(false);
            // Recenter the window under the cursor
            root.style.left = ev.clientX - root.clientWidth / 2 + "px";
            origLeft = ev.clientX - root.clientWidth / 2;
          }
        }
        
        if (!thresholdCrossed) return; // Don't move window until threshold crossed
        
        const dx = ev.clientX - startX;
        const dy = ev.clientY - startY;
        root.style.left = origLeft + dx + "px";
        root.style.top = Math.max(0, origTop + dy) + "px";
      });

      window.addEventListener("yourApp" + root._goldenbodyId, "mouseup", () => {
        dragging = false;
        thresholdCrossed = false;
        document.body.style.userSelect = "";
      });
    })();

    function resize() {
      const el = root;
      const BW = 8;
      const minW = 450,
        minH = 350;
      let active = null;

      const hitTest = (e) => {
        const r = el.getBoundingClientRect();
        const x = e.clientX,
          y = e.clientY;
        const onL = x >= r.left && x <= r.left + BW;
        const onR = x <= r.right && x >= r.right - BW;
        const onT = y >= r.top && y <= r.top + BW;
        const onB = y <= r.bottom && y >= r.bottom - BW;
        if (onT && onL) return "nw";
        if (onT && onR) return "ne";
        if (onB && onL) return "sw";
        if (onB && onR) return "se";
        if (onL) return "w";
        if (onR) return "e";
        if (onT) return "n";
        if (onB) return "s";
        return "";
      };

      el.addEventListener("pointermove", (e) => {
        if (active) return;
        const d = hitTest(e);
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

      el.addEventListener("pointerdown", (e) => {
        const dir = hitTest(e);
        if (!dir) return;
        active = {
          dir,
          sx: e.clientX,
          sy: e.clientY,
          sw: el.offsetWidth,
          sh: el.offsetHeight,
          sl: el.offsetLeft,
          st: el.offsetTop,
          startedMaximized: isMaximized,
          restoredFromMax: false,
        };
        document.body.style.userSelect = "none";
        el.setPointerCapture(e.pointerId);
      });

      el.addEventListener("pointermove", (e) => {
        if (!active) return;
        if (
          active.startedMaximized &&
          !active.restoredFromMax &&
          (Math.abs(e.clientX - active.sx) > 1 ||
            Math.abs(e.clientY - active.sy) > 1)
        ) {
          restoreWindow(false);
          active.sx = e.clientX;
          active.sy = e.clientY;
          active.sw = el.offsetWidth;
          active.sh = el.offsetHeight;
          active.sl = el.offsetLeft;
          active.st = el.offsetTop;
          active.restoredFromMax = true;
        }
        const dx = e.clientX - active.sx,
          dy = e.clientY - active.sy;
        if (active.dir.includes("e"))
          el.style.width = Math.max(minW, active.sw + dx) + "px";
        if (active.dir.includes("s"))
          el.style.height = Math.max(minH, active.sh + dy) + "px";
        if (active.dir.includes("w")) {
          el.style.width = Math.max(minW, active.sw - dx) + "px";
          el.style.left = active.sl + dx + "px";
        }
        if (active.dir.includes("n")) {
          el.style.height = Math.max(minH, active.sh - dy) + "px";
          el.style.top = Math.max(0, active.st + dy) + "px";
        }
      });

      el.addEventListener("pointerup", () => {
        active = null;
        document.body.style.userSelect = "";
        if (getBounds().width == "100%" || getBounds().height == "100%") {
        } else savedBounds = getBounds();
      });
      el.addEventListener("pointercancel", () => {
        active = null;
        document.body.style.userSelect = "";
        savedBounds = getBounds();
      });

      el.style.touchAction = "none";
    }
    resize();
    root.tabIndex = "0";
  }
  let a = document.createElement('h1');
  a.textContent = "this is a sample app, edit /apps/sample app/apptemplate.js to make it your own!";
  a.style.textAlign = "center";
  a.style.marginTop = "20px";
  root.appendChild(a);
  
  yourAppGlobals.allYourAppInstances.push({
    rootElement: root,
    btnMax,
    _isMinimized,
    isMaximized,
    getBounds,
    applyBounds,
    showWindow,
    hideWindow,
    closeWindow,
    showAll,
    hideAll,
    closeAll,
    newWindow,
    showall: showAll,
    hideall: hideAll,
    closeall: closeAll,
    newwindow: newWindow,
    goldenbodyId: root._goldenbodyId,
  });
  applyStyles();

  return {
    rootElement: root,
    btnMax,
    _isMinimized,
    isMaximized,
    getBounds,
    applyBounds,
    showWindow,
    hideWindow,
    closeWindow,
    showAll,
    hideAll,
    closeAll,
    newWindow,
    showall: showAll,
    hideall: hideAll,
    closeall: closeAll,
    newwindow: newWindow,
    goldenbodyId: root._goldenbodyId,
  };
};