// Terminal global vars - dispatch events to running apps to add terminal plugins
// Command format: <app> <command> <args>
window.terminalGlobals = {};
terminalGlobals.allTerminals = [];
terminalGlobals.terminalId = 0;

terminal = function (posX = 50, posY = 50) {
  notification(
    "this app is in active dev, many features are not implemented yet. Stay tuned for updates!",
  );
  startMenu.style.display = "none";
  let isMaximized = false;
  let _isMinimized = false;
  atTop = "terminal";
  const root = document.createElement("div");

  root.className = "sim-chrome-root";
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
  root.classList.add("terminal");
  root.dataset.appId = "terminal";
  bringToFront(root);
  document.body.appendChild(root);
  terminalGlobals.terminalId++;
  root._terminalId = terminalGlobals.terminalId;
  // per-terminal current working directory (string, e.g. "/" or "/path/to/folder")
  root._cwd = "/";

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

  // Minimize
  btnMin.addEventListener("click", () => {
    savedBounds = getBounds();
    root.style.display = "none";
    _isMinimized = true;
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
  btnClose.addEventListener("click", () => {
    root.remove();
    let index = false;
    for (let i = 0; i < terminalGlobals.allTerminals.length; i++) {
      if (terminalGlobals.allTerminals[i].rootElement == root) {
        index = i;
      }
    }
    if (index !== false) terminalGlobals.allTerminals.splice(index, 1);
  });

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

      topBar.addEventListener("mousedown", (ev) => {
        dragging = true;
        startX = ev.clientX;
        startY = ev.clientY;
        origLeft = root.offsetLeft;
        origTop = root.offsetTop;
        currentX = ev.clientX;
        currentY = ev.clientY;
        document.body.style.userSelect = "none";
      });

      window.addEventListener("mousemove", (ev) => {
        if (!dragging) return;
        if (ev.clientX - currentX != 0 || ev.clientY - currentY != 0) {
          applyBounds(savedBounds);
          if (isMaximized) {
            restoreWindow(false);
            root.style.left = ev.clientX - root.clientWidth / 2 + "px";
            origLeft = ev.clientX - root.clientWidth / 2;
          }
        }
        const dx = ev.clientX - startX;
        const dy = ev.clientY - startY;
        root.style.left = origLeft + dx + "px";
        root.style.top = Math.max(0, origTop + dy) + "px";
      });

      window.addEventListener("mouseup", () => {
        dragging = false;
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
        };
        document.body.style.userSelect = "none";
        el.setPointerCapture(e.pointerId);
      });

      el.addEventListener("pointermove", (e) => {
        if (!active) return;
        if (isMaximized) restoreWindow(false);
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
  terminalGlobals.allTerminals.push({
    rootElement: root,
    btnMax,
    _isMinimized,
    isMaximized,
    getBounds,
    applyBounds,
    terminalId: root._terminalId,
  });
  applyStyles();

  return {
    rootElement: root,
    btnMax,
    _isMinimized,
    isMaximized,
    getBounds,
    applyBounds,
    terminalId: root._terminalId,
  };
};

// Terminal context menu
terminalGlobals.terminalButtons = [];
terminalGlobals.terminalMenu = null;
terminalGlobals.terminalContextMenu = function (e, needRemove = true) {
  e.preventDefault();

  // Remove any existing menus
  document.querySelectorAll(".app-menu").forEach((m) => m.remove());

  const menu = document.createElement("div");
  window.terminalGlobals.terminalMenu = menu;
  try {
    removeOtherMenus("terminal");
  } catch (e) {}
  menu.className = "app-menu";
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
    visibility: "hidden", // hide temporarily so offsetHeight works
  });
  data.dark
    ? menu.classList.toggle("dark", true)
    : menu.classList.toggle("light", true);

  // --- Menu items ---
  const closeAll = document.createElement("div");
  closeAll.textContent = "Close all";
  closeAll.style.padding = "6px 10px";
  closeAll.style.cursor = "pointer";
  closeAll.addEventListener("click", () => {
    for (const i of terminalGlobals.allTerminals) {
      i.rootElement.remove();
    }

    terminalGlobals.allTerminals = [];
    menu.remove();
  });
  menu.appendChild(closeAll);

  const hideAll = document.createElement("div");
  hideAll.textContent = "Hide all";
  hideAll.style.padding = "6px 10px";
  hideAll.style.cursor = "pointer";
  hideAll.addEventListener("click", () => {
    for (const i of terminalGlobals.allTerminals) {
      i.rootElement.style.display = "none";
    }
    menu.remove();
  });
  menu.appendChild(hideAll);

  const showAll = document.createElement("div");
  showAll.textContent = "Show all";
  showAll.style.padding = "6px 10px";
  showAll.style.cursor = "pointer";
  showAll.addEventListener("click", () => {
    terminalGlobals.allTerminals.sort(
      (a, b) => a.rootElement.style.zIndex - b.rootElement.style.zIndex,
    );
    for (const i of terminalGlobals.allTerminals) {
      i.rootElement.style.display = "block";
      bringToFront(i.rootElement);
    }
    menu.remove();
  });
  menu.appendChild(showAll);

  const newWindow = document.createElement("div");
  newWindow.textContent = "New window";
  newWindow.style.padding = "6px 10px";
  newWindow.style.cursor = "pointer";
  newWindow.addEventListener("click", () => {
    terminal(50, 50);
    menu.remove();
  });
  menu.appendChild(newWindow);
  if (needRemove) {
    const remove = document.createElement("div");
    remove.textContent = "Remove from taskbar";
    remove.style.padding = "6px 10px";
    remove.style.cursor = "pointer";
    const contextmenuevent = e;
    remove.addEventListener("click", () => {
      removeTaskButton(contextmenuevent.target.closest("button"));
      menu.remove();
    });
    menu.appendChild(remove);
  } else {
    const add = document.createElement("div");
    add.textContent = "Add to taskbar";
    add.style.padding = "6px 10px";
    add.style.cursor = "pointer";
    add.addEventListener("click", function () {
      addTaskButton("🖥️", terminal, "terminalContextMenu", "terminalGlobals");
      saveTaskButtons();
      purgeButtons();
    });
    menu.appendChild(add);
  }
  const barrier = document.createElement("hr");
  menu.appendChild(barrier);

  if (terminalGlobals.allTerminals.length === 0) {
    const item = document.createElement("div");
    item.textContent = "No open windows";
    item.style.padding = "6px 10px";
    menu.appendChild(item);
  } else {
    terminalGlobals.allTerminals.forEach((instance, i) => {
      const item = document.createElement("div");
      item.textContent = instance.title || `Terminal ${i + 1}`;

      Object.assign(item.style, {
        padding: "6px 10px",
        cursor: "pointer",
        maxWidth: "185px",

        whiteSpace: "nowrap", // ⬅️ prevent wrapping
        overflow: "hidden", // ⬅️ hide overflow
        textOverflow: "ellipsis", // ⬅️ show …
      });

      item.addEventListener("click", () => {
        // Bring to front
        bringToFront(instance.rootElement);

        // Unminimize if hidden
        if (instance.rootElement.style.display === "none") {
          instance.rootElement.style.display = "flex";
          instance.rootElement._isMinimized = false;
          instance.rootElement._isMaximized = false;
        }
        menu.remove();
      });

      menu.appendChild(item);
    });
  }

  document.body.appendChild(menu);

  // --- Position menu above click ---
  requestAnimationFrame(() => {
    const menuHeight = menu.offsetHeight;
    let top = e.clientY - menuHeight; // above click
    if (top < 0) top = 0; // prevent going off screen
    menu.style.top = `${top}px`;
    menu.style.visibility = "visible";
  });

  // Remove menu on click outside
  window.addEventListener("click", () => menu.remove(), { once: true });
};
terminalGlobals.terminalcontextmenuhandlerL1 = function (e) {
  terminalGlobals.terminalContextMenu(e, false);
};
