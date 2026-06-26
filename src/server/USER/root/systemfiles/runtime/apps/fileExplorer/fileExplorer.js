//explorer global vars
window.explorerGlobals = {};
explorerGlobals.allExplorers = [];
explorerGlobals.goldenbodyId = 0;
explorerGlobals.clipboard = {
  item: null, // tree node reference
  path: null, // full path string
};

fileExplorer = async function (path = '/', posX = 50, posY = 50) {
  if (posX == 50 && posY == 50) {
    let pos = window.protectedGlobals.getNextWindowXY();
    posX = pos.x;
    posY = pos.y;
  }
  let isMaximized = false;
  let _isMinimized = false;
  let disposed = false;
  let autoRefreshTimer = null;
  window.protectedGlobals.atTop = "fileExplorer";
  const root = document.createElement("div");
  root.className = "app-root app-window-root";
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
  root.classList.add("fileExplorer");
  root.dataset.appId = "fileExplorer";
  window.protectedGlobals.bringToFront(root);
  document.body.appendChild(root);
  explorerGlobals.goldenbodyId++;
  root._goldenbodyId = explorerGlobals.goldenbodyId;
  const scopedListenerName = "fileExplorer" + root._goldenbodyId;

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
    window.protectedGlobals.bringToFront(root);
  });
  root.prepend(dragStrip);

  const barrier = document.createElement("div");
  barrier.style.flexShrink = "0";
  barrier.style.display = "flex";
  barrier.style.height = "14px";
  barrier.style.width = "100%";
  barrier.addEventListener("click", function () {
    window.protectedGlobals.bringToFront(root);
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
  btnClose.className = "btnCloseColor";
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

  const applyWindowControlIcon = window.protectedGlobals.applyWindowControlIcon || function () {};
  const setWindowMaximizeIcon = window.protectedGlobals.setWindowMaximizeIcon || function () {};
  applyWindowControlIcon(btnMin, "minimize");
  setWindowMaximizeIcon(btnMax, false);
  applyWindowControlIcon(btnClose, "close");

  topBar.addEventListener("click", function () {
    window.protectedGlobals.bringToFront(root);
  });
  root.appendChild(topBar);

  let savedBounds = {
    left: root.style.left,
    top: root.style.top,
    width: root.style.width,
    height: root.style.height,
  };

  function getBounds() {
    return {
      left: root.style.left,
      top: root.style.top,
      width: root.style.width,
      height: root.style.height,
    };
  }

  function applyBounds(bounds) {
    if (!bounds) return;
    root.style.left = bounds.left;
    root.style.top = bounds.top;
    root.style.width = bounds.width;
    root.style.height = bounds.height;
  }

  function maximizeWindow() {
    savedBounds = getBounds();
    root.style.left = "0";
    root.style.top = "0";
    root.style.width = "100%";
    root.style.height = !window.protectedGlobals.data.autohidetaskbar ? "calc(100% - 60px)" : "100%";
    root.style.borderRadius = "0";
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

  function hideWindow() {
    if (!isMaximized) savedBounds = getBounds();
    root.style.display = "none";
    _isMinimized = true;
  }

  function showWindow() {
    if (disposed) return;
    root.style.display = "flex";
    _isMinimized = false;
    window.protectedGlobals.bringToFront(root);
  }

  function clearAutoRefresh() {
    if (autoRefreshTimer) {
      clearInterval(autoRefreshTimer);
      autoRefreshTimer = null;
    }
  }

  function closeWindow() {
    if (disposed) return;
    disposed = true;
    clearAutoRefresh();
    root.remove();

    const index = explorerGlobals.allExplorers.findIndex(
      (instance) => instance.rootElement === root,
    );
    if (index !== -1) explorerGlobals.allExplorers.splice(index, 1);

    if ((window.protectedGlobals.removeAllEventListenersForApp)) {
      window.protectedGlobals.removeAllEventListenersForApp(scopedListenerName);
    }
  }

  function closeAll() {
    for (const instance of [...explorerGlobals.allExplorers]) {
      if (instance && (instance.closeWindow)) {
        instance.closeWindow();
      }
    }
    explorerGlobals.allExplorers = [];
  }

  function hideAll() {
    for (const instance of explorerGlobals.allExplorers) {
      if (instance && (instance.hideWindow)) {
        instance.hideWindow();
      }
    }
  }

  function showAll() {
    explorerGlobals.allExplorers.sort(
      (a, b) => a.rootElement.style.zIndex - b.rootElement.style.zIndex,
    );
    for (const instance of explorerGlobals.allExplorers) {
      if (instance && (instance.showWindow)) {
        instance.showWindow();
      }
    }
  }

  function newWindow() {
    fileExplorer("/", 50, 50);
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
  makeDraggableResizable(root, dragStrip);
  // --- Make draggable/resizable from previous snippet ---
  function makeDraggableResizable(el, dragTarget) {
    let active = null;
    (function makeDraggable() {
      let dragging = false;
      let startX = 0;
      let startY = 0;
      let origLeft = 0;
      let origTop = 0;
      let thresholdCrossed = false;
      let DRAG_THRESHOLD = window.protectedGlobals.data.DRAG_THRESHOLD || 15;
      let currentX, currentY;

      dragTarget.addEventListener("pointerdown", (ev) => {
        if (active) return;
        DRAG_THRESHOLD = Number(window.protectedGlobals.data.DRAG_THRESHOLD) || DRAG_THRESHOLD;
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

      window.addEventListener(scopedListenerName, "pointermove", (ev) => {
        if (!dragging || disposed) return;
        if (active) return;
        const dragDistance = Math.sqrt(
          Math.pow(ev.clientX - startX, 2) + Math.pow(ev.clientY - startY, 2),
        );
        if (!thresholdCrossed && dragDistance >= DRAG_THRESHOLD) {
          thresholdCrossed = true;
          if (isMaximized) {
            applyBounds(savedBounds);
            restoreWindow(false);
            root.style.left = ev.clientX - root.clientWidth / 2 + "px";
            origLeft = ev.clientX - root.clientWidth / 2;
          }
        }
        if (!thresholdCrossed) return;
        const dx = ev.clientX - startX;
        const dy = ev.clientY - startY;
        root.style.left = origLeft + dx + "px";
        root.style.top = Math.max(0, origTop + dy) + "px";
      });

      window.addEventListener(scopedListenerName, "pointerup", () => {
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
      active = null;

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
        if (active || disposed) return;
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
        if (disposed) return;
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
        if (!active || disposed) return;
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
  let selectedItem = null; // single right-click selection
  let selectedItems = []; // array for multi-select / drag & drop
  let dragItems = []; // temporary array for drag operation
  let directions = [];

  // --- CONFIG ---
  const username = window.protectedGlobals.data.username;
  let currentPath = ["root"];
  let treeData = window.protectedGlobals.treeData;
  // UI state: sort and display modes
  let profile = {};
  try {
    profile = JSON.parse(await window.protectedGlobals.ReadFile("/systemfiles/runtime/apps/fileExplorer/profileData/profile.json", { text: true, direct: true }));
  } catch (e) {}
    
  if (!profile.sortMode || !profile.sortOrder || !profile.displayMode) {
    profile = {
      sortMode: "name", // name | size | date
      sortOrder: "asc", // asc | desc
      displayMode: "list", // list | tiles
    };
    window.protectedGlobals.WriteFile("/systemfiles/runtime/apps/fileExplorer/profileData/profile.json", JSON.stringify(profile), { text: true });
  }

  function getCurrentFolderPath() {
    return currentPath.slice(1).join("/") + (currentPath.length > 1 ? "/" : "");
  }

  // --- ELEMENTS ---
  let isDark = !!(window.protectedGlobals && window.protectedGlobals.data && window.protectedGlobals.data.dark);
  let sidebar = null;
  let topbar = null;
  let breadcrumbs = null;
  let controls = null;
  let sortSelect = null;
  let sortOrderBtn = null;
  let viewToggle = null;
  let fileArea = null;
  let contextMenu = null;
  let storageDiv = null;
  let refreshBtn = null;
  let uploadBtn = null;
  let homeBtn = null;
  let saveBtn = null;
  let trashBtn = null;
  let emptyTrashBtn = null;
  let createFolderBtn = null;
  let createFileBtn = null;
  const container = document.createElement("div");
  container.style.display = "flex";
  container.style.height = "100%";
  root.style.color = isDark ? "#e6eef8" : "#111";
  root.style.background = isDark ? "#0f172a" : "#ffffff";
  root.appendChild(container);

  // Sidebar
  sidebar = document.createElement("div");
  sidebar.style.width = "185px";
  sidebar.style.background = "#1e293b";
  sidebar.style.color = "white";
  sidebar.style.padding = "10px";
  sidebar.style.display = "flex";
  sidebar.style.flexDirection = "column";
  sidebar.style.gap = "6px";
  container.appendChild(sidebar);
  let text = document.createElement("h3");
  text.textContent = window.protectedGlobals.data.username;
  sidebar.appendChild(text);
  sidebar.appendChild(document.createElement("br"));
  refreshBtn = document.createElement("button");
  // helper to create simple SVG icons (uses currentColor for strokes)
const ICONS = {
  refresh: `
    <path d="M21 2v6h-6"/>
    <path d="M20.49 13A8.5 8.5 0 1 1 18 5.3L21 8"/>
  `,

  upload: `<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="size-6"> <path stroke-linecap="round" stroke-linejoin="round" d="M3 16.5v2.25A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75V16.5m-13.5-9L12 3m0 0 4.5 4.5M12 3v13.5" /> </svg>`,

  home: `<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="size-6"> <path stroke-linecap="round" stroke-linejoin="round" d="m2.25 12 8.954-8.955c.44-.439 1.152-.439 1.591 0L21.75 12M4.5 9.75v10.125c0 .621.504 1.125 1.125 1.125H9.75v-4.875c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21h4.125c.621 0 1.125-.504 1.125-1.125V9.75M8.25 21h8.25" /> </svg>`,

  save: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"> <!-- Cloud --> <path d="M18 18a4 4 0 0 0 .3-8A6 6 0 0 0 6.7 8.2 4.5 4.5 0 0 0 7 18h11z"/> <!-- Download arrow --> <path d="M12 9v6"/> <path d="M9.5 12.5 12 15l2.5-2.5"/> </svg>`,

  trash: `<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="size-6"> <path stroke-linecap="round" stroke-linejoin="round" d="m14.74 9-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 0 1-2.244 2.077H8.084a2.25 2.25 0 0 1-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 0 0-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 0 1 3.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 0 0-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 0 0-7.5 0" /> </svg>`,

  folder: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" class="size-6"> <!-- folder body --> <path d="M3 7a2.5 2.5 0 0 1 2.5-2.5h4.2c.6 0 1.2.2 1.6.6l1.2 1.1c.2.2.5.3.8.3h5.2A2.5 2.5 0 0 1 21 9v8.5A2.5 2.5 0 0 1 18.5 20h-13A2.5 2.5 0 0 1 3 17.5V7Z" fill="#FDCB22" stroke="currentColor" stroke-width="0.8" stroke-linejoin="round" /> <!-- subtle fold highlight (not a cut, just visual depth) --> <path d="M3 11.2H21" stroke="#000000" stroke-opacity="0.35" stroke-width="1" stroke-linecap="round" /> </svg>`,

  file: `
    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
    <path d="M14 2v6h6"/>
  `,

  chev: `
    <path d="m9 18 6-6-6-6"/>
  `,

  list: `
    <path d="M8 6h13"/>
    <path d="M8 12h13"/>
    <path d="M8 18h13"/>
    <path d="M3 6h.01"/>
    <path d="M3 12h.01"/>
    <path d="M3 18h.01"/>
  `,

  grid: `
    <rect x="3" y="3" width="7" height="7" rx="1"/>
    <rect x="14" y="3" width="7" height="7" rx="1"/>
    <rect x="3" y="14" width="7" height="7" rx="1"/>
    <rect x="14" y="14" width="7" height="7" rx="1"/>
  `,

  warning: `
    <path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/>
    <path d="M12 9v4"/>
    <path d="M12 17h.01"/>
  `
};

function makeIcon(type, size = 16) {
  const ns = "http://www.w3.org/2000/svg";

  const svg = document.createElementNS(ns, "svg");

  svg.setAttribute("width", size);
  svg.setAttribute("height", size);
  svg.setAttribute("viewBox", "0 0 24 24");
  svg.setAttribute("fill", "none");
  svg.setAttribute("stroke", "currentColor");
  svg.setAttribute("stroke-width", "2");
  svg.setAttribute("stroke-linecap", "round");
  svg.setAttribute("stroke-linejoin", "round");

  svg.style.verticalAlign = "middle";
  svg.style.flexShrink = "0";
  svg.style.display = "block";

  svg.innerHTML = ICONS[type] || "";

  return svg;
}

  function styleSidebarButton(btn) {
    if (!btn) return;
    btn.style.color = isDark ? "#f8fafc" : "#111";
    btn.style.background = isDark ? "rgba(255,255,255,0.08)" : "#f8fafc";
    btn.style.border = isDark ? "1px solid rgba(255,255,255,0.1)" : "1px solid #d1d5db";
    btn.style.borderRadius = "8px";
    btn.style.padding = "8px 10px";
    btn.style.textAlign = "left";
    btn.style.display = "inline-flex";
    btn.style.alignItems = "center";
    btn.style.justifyContent = "flex-start";
    btn.style.gap = "8px";
    btn.style.lineHeight = "1";
  }

  refreshBtn.innerHTML = '';
  refreshBtn.appendChild(makeIcon('refresh',16));
  refreshBtn.appendChild(document.createTextNode('Refresh'));
  styleSidebarButton(refreshBtn);
  sidebar.appendChild(refreshBtn);

  uploadBtn = document.createElement("button");
  uploadBtn.innerHTML = '';
  uploadBtn.appendChild(makeIcon('upload',16));
  uploadBtn.appendChild(document.createTextNode('Upload'));
  styleSidebarButton(uploadBtn);
  sidebar.appendChild(uploadBtn);

  homeBtn = document.createElement("button");
  homeBtn.innerHTML = '';
  homeBtn.appendChild(makeIcon('home',16));
  homeBtn.appendChild(document.createTextNode('Home'));
  styleSidebarButton(homeBtn);
  sidebar.appendChild(homeBtn);

  saveBtn = document.createElement("button");
  saveBtn.innerHTML = '';
  saveBtn.appendChild(makeIcon('save',16));
  saveBtn.appendChild(document.createTextNode('Save'));
  styleSidebarButton(saveBtn);
  sidebar.appendChild(saveBtn);

  trashBtn = document.createElement("button");
  trashBtn.innerHTML = '';
  trashBtn.appendChild(makeIcon('trash',16));
  trashBtn.appendChild(document.createTextNode('Trash'));
  styleSidebarButton(trashBtn);
  sidebar.appendChild(trashBtn);

  emptyTrashBtn = document.createElement("button");
  emptyTrashBtn.innerHTML = '';
  emptyTrashBtn.appendChild(makeIcon('trash',16));
  emptyTrashBtn.appendChild(document.createTextNode('Empty Trash'));
  emptyTrashBtn.style.display = "none";
  emptyTrashBtn.style.background = "#7f1b1b";
  emptyTrashBtn.style.color = "white";
  styleSidebarButton(emptyTrashBtn);
  sidebar.appendChild(emptyTrashBtn);

  const fileInput = document.createElement("input");
  fileInput.type = "file";
  fileInput.multiple = true;
  fileInput.style.display = "none";
  sidebar.appendChild(fileInput);

  const uploadProgress = document.createElement("div");
  uploadProgress.style.position = "absolute";
  uploadProgress.style.left = "16px";
  uploadProgress.style.right = "16px";
  uploadProgress.style.bottom = "16px";
  uploadProgress.style.zIndex = "2000";
  uploadProgress.style.display = "none";
  uploadProgress.style.flexDirection = "column";
  uploadProgress.style.gap = "8px";
  uploadProgress.style.padding = "10px 12px";
  uploadProgress.style.borderRadius = "10px";
  uploadProgress.style.background = "rgba(15, 23, 42, 0.92)";
  uploadProgress.style.color = "white";
  uploadProgress.style.boxShadow = "0 10px 30px rgba(0,0,0,0.35)";
  uploadProgress.style.pointerEvents = "none";
  uploadProgress.style.backdropFilter = "blur(4px)";
  uploadProgress.style.fontSize = "13px";
  const uploadProgressTitle = document.createElement("div");
  uploadProgressTitle.style.fontWeight = "600";
  const uploadProgressStatus = document.createElement("div");
  uploadProgressStatus.style.opacity = "0.85";
  const uploadProgressBarOuter = document.createElement("div");
  uploadProgressBarOuter.style.height = "10px";
  uploadProgressBarOuter.style.borderRadius = "999px";
  uploadProgressBarOuter.style.overflow = "hidden";
  uploadProgressBarOuter.style.background = "rgba(255,255,255,0.15)";
  const uploadProgressBarInner = document.createElement("div");
  uploadProgressBarInner.style.height = "100%";
  uploadProgressBarInner.style.width = "0%";
  uploadProgressBarInner.style.borderRadius = "999px";
  uploadProgressBarInner.style.background = "linear-gradient(90deg, #22c55e, #38bdf8)";
  uploadProgressBarOuter.appendChild(uploadProgressBarInner);
  uploadProgress.appendChild(uploadProgressTitle);
  uploadProgress.appendChild(uploadProgressStatus);
  uploadProgress.appendChild(uploadProgressBarOuter);
  root.appendChild(uploadProgress);

  const uploadState = {
    visible: false,
    totalBytes: 0,
    doneBytes: 0,
    title: "",
    status: "",
    hideTimer: null,
  };

  function renderUploadProgress() {
    if (!uploadState.visible) {
      uploadProgress.style.display = "none";
      return;
    }
    uploadProgress.style.display = "flex";
    uploadProgressTitle.textContent = uploadState.title || "Uploading files";
    uploadProgressStatus.textContent = uploadState.status || "";
    const pct =
      uploadState.totalBytes > 0
        ? Math.max(0, Math.min(100, (uploadState.doneBytes / uploadState.totalBytes) * 100))
        : 0;
    uploadProgressBarInner.style.width = `${pct}%`;
    uploadProgressBarInner.style.background = uploadState.error
      ? "linear-gradient(90deg, #ef4444, #f97316)"
      : "linear-gradient(90deg, #22c55e, #38bdf8)";
  }

  function showUploadProgress(title, status, totalBytes) {
    if (uploadState.hideTimer) {
      clearTimeout(uploadState.hideTimer);
      uploadState.hideTimer = null;
    }
    uploadState.visible = true;
    uploadState.error = false;
    uploadState.title = title || "Uploading files";
    uploadState.status = status || "";
    uploadState.totalBytes = Math.max(0, Number(totalBytes) || 0);
    uploadState.doneBytes = 0;
    renderUploadProgress();
  }

  function updateUploadProgress(doneBytes, status) {
    if (!uploadState.visible) return;
    uploadState.doneBytes = Math.max(0, Math.min(uploadState.totalBytes, Number(doneBytes) || 0));
    if (status !== undefined) uploadState.status = status;
    renderUploadProgress();
  }

  function setUploadError(title, status) {
    uploadState.visible = true;
    uploadState.error = true;
    uploadState.title = title || "Upload failed";
    uploadState.status = status || "";
    uploadState.doneBytes = uploadState.totalBytes;
    renderUploadProgress();
  }

  function hideUploadProgress(delay = 700) {
    if (uploadState.hideTimer) clearTimeout(uploadState.hideTimer);
    uploadState.hideTimer = setTimeout(() => {
      uploadState.visible = false;
      uploadState.error = false;
      renderUploadProgress();
    }, delay);
  }

  function applyExplorerTheme() {
    isDark = !!(window.protectedGlobals && window.protectedGlobals.data && window.protectedGlobals.data.dark);
    root.style.color = isDark ? "#e6eef8" : "#111";
    root.style.background = isDark ? "#0f172a" : "#ffffff";
    if (sidebar) {
      sidebar.style.background = isDark ? "#1e293b" : "#f8fafc";
      sidebar.style.color = isDark ? "#f8fafc" : "#111";
    }
    if (topbar) {
      topbar.style.background = isDark ? "#0f172a" : "#ffffff";
      topbar.style.color = isDark ? "#e6eef8" : "#111";
      topbar.style.borderBottom = isDark ? "1px solid rgba(255,255,255,0.08)" : "1px solid #ddd";
    }
    if (breadcrumbs) {
      breadcrumbs.style.color = isDark ? "#e6eef8" : "#111";
    }
    if (controls) {
      controls.style.background = isDark ? "rgba(255,255,255,0.04)" : "#f3f4f6";
      controls.style.boxShadow = isDark ? "none" : "inset 0 1px 0 rgba(255,255,255,0.6)";
    }
    if (sortSelect) {
      sortSelect.style.border = isDark ? "1px solid rgba(255,255,255,0.12)" : "1px solid rgba(0,0,0,0.08)";
      sortSelect.style.background = isDark ? "#111827" : "transparent";
      sortSelect.style.color = isDark ? "#e6eef8" : "#111";
    }
    if (sortOrderBtn) {
      sortOrderBtn.style.background = isDark ? "#111827" : "transparent";
      sortOrderBtn.style.color = isDark ? "#e6eef8" : "#111";
    }
    if (viewToggle) {
      viewToggle.style.background = isDark ? "#111827" : "transparent";
      viewToggle.style.color = isDark ? "#e6eef8" : "#111";
    }
    if (fileArea) {
      fileArea.style.background = isDark ? "#0f172a" : "#ffffff";
      fileArea.style.color = isDark ? "#e6eef8" : "#111";
    }
    if (storageDiv) {
      storageDiv.style.color = isDark ? "#cbd5e1" : "#334155";
    }
    if (contextMenu) {
      contextMenu.style.border = isDark ? "1px solid rgba(255,255,255,0.06)" : "1px solid #ccc";
      contextMenu.style.background = isDark ? "#0b0b0b" : "white";
      contextMenu.style.color = isDark ? "#e6eef8" : "#111";
      contextMenu.style.boxShadow = isDark ? "0 8px 30px rgba(0,0,0,0.6)" : "0 8px 20px rgba(0,0,0,0.08)";
    }
    [refreshBtn, uploadBtn, homeBtn, saveBtn, trashBtn, emptyTrashBtn, createFolderBtn, createFileBtn].forEach(styleSidebarButton);
  }

  // Main area
  const main = document.createElement("div");
  main.style.flex = "1";
  main.style.display = "flex";
  main.style.flexDirection = "column";
  container.appendChild(main);

  topbar = document.createElement("div");
  topbar.style.padding = "8px";
  topbar.style.borderBottom = isDark ? "1px solid rgba(255,255,255,0.08)" : "1px solid #ddd";
  topbar.style.background = isDark ? "#0f172a" : "#ffffff";
  topbar.style.color = isDark ? "#e6eef8" : "#111";
  main.appendChild(topbar);

  breadcrumbs = document.createElement("div");
  breadcrumbs.style.color = isDark ? "#e6eef8" : "#111";
  topbar.appendChild(breadcrumbs);
  // Controls: sort and view mode
  controls = document.createElement("div");
  controls.style.display = "inline-flex";
  controls.style.gap = "8px";
  controls.style.float = "right";
  controls.style.alignItems = "center";
  controls.style.background = window.protectedGlobals && window.protectedGlobals.data && window.protectedGlobals.data.dark ? 'rgba(255,255,255,0.04)' : '#f3f4f6';
  controls.style.padding = '6px';
  controls.style.borderRadius = '10px';
  controls.style.boxShadow = window.protectedGlobals && window.protectedGlobals.data && window.protectedGlobals.data.dark ? 'none' : 'inset 0 1px 0 rgba(255,255,255,0.6)';

  sortSelect = document.createElement("select");
  [
    { v: "name", t: "Sort: Name" },
    { v: "size", t: "Sort: Size" },
    { v: "date", t: "Sort: Date" },
  ].forEach((opt) => {
    const o = document.createElement("option");
    o.value = opt.v;
    o.textContent = opt.t;
    sortSelect.appendChild(o);
  });
  sortSelect.value = profile.sortMode;
  sortSelect.onchange = () => {
    profile.sortMode = sortSelect.value;
    window.protectedGlobals.WriteFile("/systemfiles/runtime/apps/fileExplorer/profileData/profile.json", JSON.stringify(profile), { text: true });
    render();
  };
  // modern select styling
  sortSelect.style.padding = '6px 8px';
  sortSelect.style.border = isDark ? '1px solid rgba(255,255,255,0.12)' : '1px solid rgba(0,0,0,0.08)';
  sortSelect.style.borderRadius = '6px';
  sortSelect.style.background = isDark ? '#111827' : 'transparent';
  sortSelect.style.color = isDark ? '#e6eef8' : '#111';
  sortSelect.style.fontSize = '13px';

  sortOrderBtn = document.createElement("button");
  sortOrderBtn.textContent = profile.sortOrder === "asc" ? "↑" : "↓";
  sortOrderBtn.title = "Toggle sort order";
  sortOrderBtn.onclick = () => {
    profile.sortOrder = profile.sortOrder === "asc" ? "desc" : "asc";
    sortOrderBtn.textContent = profile.sortOrder === "asc" ? "↑" : "↓";
    window.protectedGlobals.WriteFile("/systemfiles/runtime/apps/fileExplorer/profileData/profile.json", JSON.stringify(profile), { text: true });
    render();
  };
  sortOrderBtn.style.border = 'none';
  sortOrderBtn.style.padding = '6px 8px';
  sortOrderBtn.style.borderRadius = '6px';
  sortOrderBtn.style.background = isDark ? '#111827' : 'transparent';
  sortOrderBtn.style.color = isDark ? '#e6eef8' : '#111';
  sortOrderBtn.style.cursor = 'pointer';

  viewToggle = document.createElement("button");
  viewToggle.title = "Toggle view (list / tiles)";
  // style the toggle as a modern pill button
  viewToggle.style.border = 'none';
  viewToggle.style.padding = '6px 8px';
  viewToggle.style.borderRadius = '8px';
  viewToggle.style.background = isDark ? '#111827' : 'transparent';
  viewToggle.style.color = isDark ? '#e6eef8' : '#111';
  viewToggle.style.cursor = 'pointer';
  viewToggle.style.display = 'inline-flex';
  viewToggle.style.alignItems = 'center';
  viewToggle.style.justifyContent = 'center';

  function updateViewToggleIcon() {
    viewToggle.innerHTML = '';
    // show the icon representing the current mode
    const iconType = profile.displayMode === 'list' ? 'list' : 'grid';
    const icon = makeIcon(iconType, 14);
    // make the icon inherit color from button
    icon.style.color = '';
    viewToggle.appendChild(icon);
    viewToggle.title = profile.displayMode === 'list' ? 'List view' : 'Tiles view';
  }
  updateViewToggleIcon();
  viewToggle.onclick = () => {
    profile.displayMode = profile.displayMode === "list" ? "tiles" : "list";
    updateViewToggleIcon();
    window.protectedGlobals.WriteFile("/systemfiles/runtime/apps/fileExplorer/profileData/profile.json", JSON.stringify(profile), { text: true });
    render();
  };

  controls.appendChild(sortSelect);
  controls.appendChild(sortOrderBtn);
  controls.appendChild(viewToggle);
  topbar.appendChild(controls);

  fileArea = document.createElement("div");
  fileArea.style.flex = "1";
  fileArea.style.overflowY = "auto";
  fileArea.style.padding = "8px";
  fileArea.style.background = isDark ? "#0f172a" : "#ffffff";
  fileArea.style.color = isDark ? "#e6eef8" : "#111";
  main.appendChild(fileArea);
  fileArea.tabIndex = "1";

  contextMenu = document.createElement("div");
  contextMenu.style.position = "absolute";
  contextMenu.className = "misc";
  // adapt appearance for dark/light themes
  contextMenu.style.border = isDark ? "1px solid rgba(255,255,255,0.06)" : "1px solid #ccc";
  contextMenu.style.background = isDark ? "#0b0b0b" : "white";
  contextMenu.style.color = isDark ? "#e6eef8" : "#111";
  contextMenu.style.display = "none";
  contextMenu.style.zIndex = "1000";
  contextMenu.style.borderRadius = "10px";
  contextMenu.style.padding = "4px";
  contextMenu.style.minWidth = "220px";
  contextMenu.style.maxWidth = "260px";
  contextMenu.style.boxShadow = isDark ? "0 8px 30px rgba(0,0,0,0.6)" : "0 8px 20px rgba(0,0,0,0.08)";
  root.appendChild(contextMenu);

  fileArea.oncontextmenu = (e) => {
    e.preventDefault();

    // If right-clicked on a file/folder row, let that handler run
    const row = e.target?.closest?.("[data-fs-item]");
    if (row) return;

    // Blank area
    selectedItem = null;
    showContextMenu(e.clientX, e.clientY, false, true);
  };

  // --- RENDER ---
  let onlyloadTree = async function () {
    const data = await window.protectedGlobals.filePost({ initFE: true });
    window.protectedGlobals.treeData = data.tree;
    treeData = window.protectedGlobals.treeData;
    window.protectedGlobals.annotateTreeWithPaths(window.protectedGlobals.treeData);
    // Ensure nodes have date metadata (mtime) so client can sort by date
    function ensureDates(node) {
      if (!node || !Array.isArray(node[1])) return;
      for (const child of node[1]) {
        // Ensure metadata object exists
        if (!child[2] || typeof child[2] !== 'object') child[2] = child[2] || {};
        // If size missing or falsy, default to 0
        try { child[2].size = Number(child[2].size) || 0; } catch (e) { child[2].size = 0; }
        // If mtime missing, set to current time (fallback)
        if (!child[2].mtime && !child[2].modified && !child[2].date && !child[2].mtimeMs) {
          child[2].mtime = Date.now();
          child[2].mtimeMs = child[2].mtime;
        } else if (child[2].mtimeMs && !child[2].mtime) {
          child[2].mtime = child[2].mtimeMs;
        }
        if (Array.isArray(child[1])) ensureDates(child);
      }
    }
    try { ensureDates(window.protectedGlobals.treeData); } catch(e){}
    // Restore clipboard from server
    if (data.clipboard && Array.isArray(data.clipboard)) {
      explorerGlobals.clipboard = data.clipboard;
    }
    // If a startup `path` was provided to fileExplorer(posX,posY,path),
    // try to resolve it to an existing folder in `treeData` and set
    // `currentPath` accordingly. If the path points to a file, use its
    // parent folder. If nothing is found, fall back to root.
    try {
      if (path !== "/") {
        // normalize and split, strip leading/trailing slashes
        let parts = path.replace(/^\/+|\/+$/g, "").split("/").filter(Boolean);
        // if someone passed a path starting with 'root', remove it
        if (parts.length && parts[0] === "root") parts = parts.slice(1);

        // build candidate search array starting with 'root'
        let candidate = ["root", ...parts];

        // walk backwards until we find an existing node in treeData
        while (candidate.length > 1) {
          const nodeFound = findNode(treeData, candidate);
          if (nodeFound) {
            // if it's a folder, use it; if it's a file, use its parent
            if (Array.isArray(nodeFound[1])) {
              currentPath = candidate.slice();
              break;
            } else {
              candidate.pop();
              currentPath = candidate.slice();
              break;
            }
          }
          candidate.pop();
        }
      }
    } catch (e) {
      console.warn("fileExplorer: failed to set startup path", e);
    }

    render();
  };

  function findNode(node, path) {
    let current = node;
    for (let i = 1; i < path.length; i++) {
      if (!current[1]) return null;
      current = current[1].find((c) => c[0] === path[i]);
    }
    return current;
  }

  function formatSize(bytes) {
    if (!bytes) return "";
    if (bytes < 1024) return bytes + " B";
    if (bytes < 1024 ** 2) return (bytes / 1024).toFixed(1) + " KB";
    if (bytes < 1024 ** 3) return (bytes / 1024 ** 2).toFixed(1) + " MB";
    return (bytes / 1024 ** 3).toFixed(1) + " GB";
  }

  function formatDate(ts) {
    if (!ts) return "";
    try {
      const d = new Date(Number(ts));
      return d.toLocaleString();
    } catch (e) {
      return String(ts);
    }
  }

  function renderBreadcrumbs() {
    breadcrumbs.innerHTML = "";
    currentPath.forEach((p, i) => {
      const span = document.createElement("span");
      span.textContent = i === 0 ? "Home" : " / " + p;
      span.style.cursor = "pointer";
      span.onclick = () => {
        currentPath = currentPath.slice(0, i + 1);
        render();
      };
      breadcrumbs.appendChild(span);
    });
  }
  function getNodeSize(node) {
    if (!node) return 0; // safety
    if (node[1] === null) return node[2]?.size || 0; // file
    if (!Array.isArray(node[1])) return 0; // invalid folder

    return node[1].reduce((sum, child) => sum + getNodeSize(child), 0);
  }

  // Update the storage display element in the sidebar.
  function updateStorageDisplay() {
    try {
      if (typeof storageDiv === "undefined") return;
      if (!treeData) {
        storageDiv.textContent = "Storage used: —";
        return;
      }
      const total = getNodeSize(treeData);
      storageDiv.textContent = `Storage used: ${formatSize(total)}/${window.protectedGlobals.data.maxSpace} GB`;
    } catch (e) {
      console.error("updateStorageDisplay error:", e);
    }
  }

  function removeNodeFromTree(node, pathParts) {
    if (!node || !Array.isArray(node[1])) return false;

    const [target, ...rest] = pathParts;

    for (let i = 0; i < node[1].length; i++) {
      const child = node[1][i];

      if (child[0] === target) {
        if (rest.length === 0) {
          node[1].splice(i, 1); // delete node
          return true;
        } else {
          return removeNodeFromTree(child, rest); // go deeper
        }
      }
    }

    return false; // not found
  }

  let lastSelectedIndex = null;

  function refreshSelectionUI(items) {
    const rows = fileArea.querySelectorAll("[data-fs-item]");
    rows.forEach((row) => {
      const idx = Number(row.dataset.index);
      const rowItem = items?.[idx];
      row.style.background = rowItem && selectedItems.includes(rowItem)
        ? (isDark ? "rgba(59,130,246,0.24)" : "#d0e6ff")
        : "";
    });
  }

  function handleSelection(e, item, items, index) {
    if (!items || index == null) return;

    // SHIFT = range selection
    if (e.shiftKey && lastSelectedIndex !== null) {
      const start = Math.min(lastSelectedIndex, index);
      const end = Math.max(lastSelectedIndex, index);
      const range = items.slice(start, end + 1);

      if (e.ctrlKey || e.metaKey) {
        // Ctrl/Cmd + Shift → add range
        for (const it of range) {
          if (!selectedItems.includes(it)) {
            selectedItems.push(it);
          }
        }
      } else {
        // Shift only → replace selection
        selectedItems = range;
      }
    } else if (e.ctrlKey || e.metaKey) {
      // Ctrl/Cmd toggle
      const i = selectedItems.indexOf(item);
      if (i >= 0) selectedItems.splice(i, 1);
      else selectedItems.push(item);

      lastSelectedIndex = index;
    } else {
      // Single click
      selectedItems = [item];
      lastSelectedIndex = index;
    }

    selectedItem = item;
    refreshSelectionUI(items);
  }

  // ──────────────────────────────
  // GET ITEM PATH RELATIVE TO ROOT
  // ──────────────────────────────
  function getItemPath(item, node = treeData, current = []) {
    if (!node[1]) return null;
    for (const child of node[1]) {
      if (child === item) return [...current, child[0]].join("/");
      if (Array.isArray(child[1])) {
        const path = getItemPath(item, child, [...current, child[0]]);
        if (path) return path;
      }
    }
    return null;
  }

  // ──────────────────────────────
  // FIND PARENT PATH OF ITEM
  // ──────────────────────────────
  function findParentPath(targetItem, node = treeData, path = ["root"]) {
    if (!node[1]) return null;
    for (const item of node[1]) {
      if (item === targetItem) return path;
      if (Array.isArray(item[1])) {
        const res = findParentPath(targetItem, item, [...path, item[0]]);
        if (res) return res;
      }
    }
    return null;
  }

  // ──────────────────────────────
  // RENDER FILES + MULTISELECT + DRAG
  // ──────────────────────────────
  function renderFiles() {
    fileArea.innerHTML = "";
    const node = findNode(treeData, currentPath);
    if (!node || !node[1]) return;
    const items = node[1].filter(item => !(item[0] == ".DS_Store" || item[0].startsWith(".temp")));

    if (profile.displayMode === "tiles") {
      const grid = document.createElement("div");
      grid.style.display = "flex";
      grid.style.flexWrap = "wrap";
      grid.style.gap = "12px";
      grid.style.alignItems = "flex-start";
      grid.style.padding = "6px";

      items.forEach((item, index) => {
        const isFolder = Array.isArray(item[1]);
        const tile = document.createElement("div");
        tile.dataset.index = index;
        tile.dataset.fsItem = "true";
        tile.style.width = "140px";
        tile.style.minHeight = "140px";
        tile.style.display = "flex";
        tile.style.flexDirection = "column";
        tile.style.alignItems = "center";
        tile.style.justifyContent = "flex-start";
        tile.style.padding = "10px";
        tile.style.border = isDark ? "1px solid rgba(255,255,255,0.08)" : "1px solid #eee";
        tile.style.borderRadius = "8px";
        tile.style.cursor = "pointer";
        tile.style.color = isDark ? "#e6eef8" : "#111";
        tile.style.background = isDark ? "rgba(255,255,255,0.02)" : "transparent";
        if (selectedItems.includes(item)) tile.style.background = isDark ? "rgba(59,130,246,0.24)" : "#d0e6ff";

        tile.onclick = (e) => handleSelection(e, item, items, index);
        tile.ondblclick = () => { selectedItems = []; if (isFolder) { currentPath.push(item[0]); render(); } };
        tile.oncontextmenu = (e) => { e.preventDefault(); handleSelection(e, item, items, index); showContextMenu(e.clientX, e.clientY, isFolder); };

        const icon = document.createElement("div");
        icon.style.fontSize = "36px";
        icon.style.marginBottom = "8px";
        icon.appendChild(makeIcon(isFolder ? 'folder' : 'file', 36));
        tile.appendChild(icon);

        const name = document.createElement("div");
        name.textContent = item[0];
        name.style.textAlign = "center";
        name.style.wordBreak = "break-word";
        name.style.marginBottom = "6px";
        tile.appendChild(name);

        const size = document.createElement("div");
        size.textContent = formatSize(isFolder ? getNodeSize(item) : item[2]?.size);
        size.style.fontSize = "12px";
        size.style.opacity = "0.8";
        tile.appendChild(size);

        const date = document.createElement("div");
        date.textContent = formatDate(item[2]?.mtime || item[2]?.modified || item[2]?.date || item[2]?.mtimeMs);
        date.style.fontSize = "12px";
        date.style.opacity = "0.8";
        tile.appendChild(date);

        grid.appendChild(tile);
      });

      fileArea.appendChild(grid);
    } else {
      items.forEach((item, index) => {
        const isFolder = Array.isArray(item[1]);
        const div = document.createElement("div");

        // Metadata
        div.dataset.index = index;
        div.dataset.isFolder = isFolder;
        div.dataset.fsItem = "true";
        div.style.display = "flex";
        div.style.alignItems = "center";
        div.style.padding = "6px";
        div.style.borderBottom = isDark ? "1px solid rgba(255,255,255,0.08)" : "1px solid #eee";
        div.style.cursor = "pointer";
        div.style.color = isDark ? "#e6eef8" : "#111";
        if (item[0].endsWith(".smh")) {div.addEventListener('dblclick', () => evalJsApp(item[2].path));}
        // Highlight selected
        if (selectedItems.includes(item)) div.style.background = isDark ? "rgba(59,130,246,0.24)" : "#d0e6ff";

        // Click selection
        div.onclick = (e) => handleSelection(e, item, items, index);

        // Double-click folder open (or file open in text editor)
        div.ondblclick = () => {
          selectedItems = [];
          if (isFolder) {
            currentPath.push(item[0]);
            render();
          }
        };

        // Context menu
        div.oncontextmenu = (e) => {
          e.preventDefault();
          selectedItem = item;
          showContextMenu(e.clientX, e.clientY, isFolder);
        };

        // Drag start
        div.ondragstart = (e) => {
          dragItems = [...(selectedItems.length ? selectedItems : [item])];

          // Serialize for cross-window / iframe
          const dragData = dragItems.map((it) => ({
            name: it[0],
            isFolder: Array.isArray(it[1]),
            path: getItemPath(it),
          }));
          e.dataTransfer.setData("application/json", JSON.stringify(dragData));

          // Optional drag image
          const dragIcon = document.createElement("div");
          dragIcon.textContent = `${dragData.length} item(s)`;
          dragIcon.style.padding = "4px 8px";
          dragIcon.style.background = "#d0e6ff";
          dragIcon.style.border = "1px solid #aaa";
          document.body.appendChild(dragIcon);
          e.dataTransfer.setDragImage(dragIcon, -10, -10);
          setTimeout(() => document.body.removeChild(dragIcon), 0);
        };

        // Icon
        const icon = document.createElement("div");
        icon.style.width = "30px";
        icon.appendChild(makeIcon(isFolder ? 'folder' : 'file', 20));
        div.appendChild(icon);

        // Name
        const nameDiv = document.createElement("div");
        nameDiv.textContent = item[0];
        nameDiv.style.flex = "1";
        div.appendChild(nameDiv);

        // Size
        const sizeDiv = document.createElement("div");
        sizeDiv.textContent = formatSize(
          isFolder ? getNodeSize(item) : item[2]?.size,
        );
        sizeDiv.style.width = "100px";
        sizeDiv.style.textAlign = "right";
        sizeDiv.style.color = "#555";
        div.appendChild(sizeDiv);

        // Date
        const dateDiv = document.createElement("div");
        dateDiv.textContent = formatDate(item[2]?.mtime || item[2]?.modified || item[2]?.date || item[2]?.mtimeMs);
        dateDiv.style.width = "180px";
        dateDiv.style.textAlign = "right";
        dateDiv.style.color = "#555";
        dateDiv.style.paddingLeft = "12px";
        div.appendChild(dateDiv);

        fileArea.appendChild(div);
      });
    }
    fileArea.appendChild(document.createElement("br"));
    fileArea.appendChild(document.createElement("br"));
    fileArea.appendChild(document.createElement("br"));
    fileArea.appendChild(document.createElement("br"));
    fileArea.appendChild(document.createElement("br"));
    fileArea.appendChild(document.createElement("br"));
    fileArea.appendChild(document.createElement("br"));
    fileArea.appendChild(document.createElement("br"));
    fileArea.appendChild(document.createElement("br"));
    fileArea.appendChild(document.createElement("br"));
    fileArea.appendChild(document.createElement("br"));
    fileArea.appendChild(document.createElement("br"));

    // Blank area drop
    fileArea.ondragover = (e) => e.preventDefault();
    fileArea.ondrop = async (e) => {
      e.preventDefault();
      const raw = e.dataTransfer.getData("application/json");
      if (!raw) return;

      const items = JSON.parse(raw);
      const targetNode = findNode(treeData, currentPath);

      for (const item of items) {
        const srcNode = findNodeByPath(item.path);
        if (srcNode) {
          // Remove from old parent
          const parent = findNode(treeData, findParentPath(srcNode));
          if (parent && parent[1])
            parent[1] = parent[1].filter((n) => n !== srcNode);
          // Add to new location
          targetNode[1].push(srcNode);
        } else {
          // Dragged from external window/iframe: implement copy/upload if needed
          console.warn("External drag not fully implemented", item);
        }
      }

      dragItems = [];
      render();
    };
  }

  // ──────────────────────────────
  // HELPER: FIND NODE BY PATH
  // ──────────────────────────────
  function findNodeByPath(relPath) {
    const parts = relPath.split("/");
    let current = treeData;
    for (let i = 1; i < parts.length; i++) {
      if (!current[1]) return null;
      current = current[1].find((c) => c[0] === parts[i]);
    }
    return current;
  }

  // Helper to find the parent path of an item in treeData
  function findParentPath(targetItem, node = treeData, path = ["root"]) {
    if (!node[1]) return null;
    for (const item of node[1]) {
      if (item === targetItem) return path;
      if (Array.isArray(item[1])) {
        const res = findParentPath(targetItem, item, [...path, item[0]]);
        if (res) return res;
      }
    }
    return null;
  }

  // --- SORT HELPERS ---
  function sortChildren(node) {
    if (!node || !Array.isArray(node[1])) return;
    // Sort children according to sortMode/sortOrder
    node[1].sort((a, b) => {
      const aIsFolder = Array.isArray(a[1]);
      const bIsFolder = Array.isArray(b[1]);
      // Keep folders first
      if (aIsFolder && !bIsFolder) return -1;
      if (!aIsFolder && bIsFolder) return 1;

      const getKey = (item) => {
        if (profile.sortMode === "name") return String(item[0] || "").toLowerCase();
        if (profile.sortMode === "size") {
          return Number(item[1] === null ? (item[2] && item[2].size) || 0 : getNodeSize(item)) || 0;
        }
        if (profile.sortMode === "date") {
          // Accept multiple date keys
          const meta = item[2] || {};
          return Number(meta.mtime || meta.modified || meta.date || meta.mtimeMs || 0) || 0;
        }
        return String(item[0] || "").toLowerCase();
      };

      const ka = getKey(a);
      const kb = getKey(b);
      if (ka < kb) return profile.sortOrder === "asc" ? -1 : 1;
      if (ka > kb) return profile.sortOrder === "asc" ? 1 : -1;
      return 0;
    });
    // Recurse into folders to ensure deep sort
    for (const child of node[1]) {
      if (Array.isArray(child[1])) sortChildren(child);
    }
  }

  function sortTree() {
    try {
      if (!treeData) return;
      sortChildren(treeData);
    } catch (e) {
      console.error("sortTree error", e);
    }
  }

  function render() {
    // Always keep treeData sorted before rendering so the UI is alphabetical
    sortTree();
    window.protectedGlobals.annotateTreeWithPaths(treeData);
    renderBreadcrumbs();
    renderFiles();
    updateStorageDisplay();
    hideContextMenu();
    // Show Empty Trash button only when inside .trash
    const inTrash = currentPath.length >= 2 && currentPath[1] === ".trash";
    emptyTrashBtn.style.display = inTrash ? "" : "none";
  }

  // ──────────────────────────────
  // PERMANENT DELETE CONFIRM DIALOG
  // ──────────────────────────────
  function showPermanentDeleteDialog(itemCount, onConfirm) {
    const overlay = document.createElement("div");
    overlay.style.cssText =
      "position:absolute;inset:0;background:rgba(0,0,0,0.55);z-index:9000;display:flex;align-items:center;justify-content:center;";

    const box = document.createElement("div");
    box.className = "misc";
    box.style.cssText =
      "padding:24px 28px;border-radius:10px;min-width:320px;max-width:420px;display:flex;flex-direction:column;gap:14px;box-shadow:0 8px 32px rgba(0,0,0,0.4);";

    const title = document.createElement("div");
    title.style.cssText = "display:flex;gap:8px;align-items:center;font-size:17px;font-weight:700;color:#c0392b;";
    const warnIcon = makeIcon('warning',18);
    const titleText = document.createElement('span');
    titleText.textContent = 'Permanently Delete';
    title.appendChild(warnIcon);
    title.appendChild(titleText);

    const desc = document.createElement("div");
    desc.style.fontSize = "13px";
    desc.innerHTML = `You are about to <strong>permanently delete ${itemCount} item${itemCount !== 1 ? "s" : ""}</strong>. This cannot be undone.<br><br>Type <strong>delete</strong> below to confirm:`;

    const input = document.createElement("input");
    input.placeholder = 'Type "delete" to confirm';
    input.style.cssText =
      "padding:7px 10px;width:100%;box-sizing:border-box;border:1px solid #c0392b;border-radius:5px;font-size:14px;outline:none;";

    const btnRow = document.createElement("div");
    btnRow.style.cssText = "display:flex;gap:10px;justify-content:flex-end;";

    const cancelBtn = document.createElement("button");
    cancelBtn.textContent = "Cancel";
    cancelBtn.style.cssText =
      "padding:6px 16px;border-radius:5px;cursor:pointer;";
    cancelBtn.onclick = () => {
      root.removeChild(overlay);
    };

    const confirmBtn = document.createElement("button");
    confirmBtn.textContent = "Delete Forever";
    confirmBtn.style.cssText =
      "padding:6px 16px;border-radius:5px;background:#c0392b;color:white;cursor:pointer;border:none;opacity:0.4;pointer-events:none;";
    confirmBtn.setAttribute("disabled", "true");

    input.oninput = () => {
      const valid = input.value.trim().toLowerCase() === "delete";
      confirmBtn.style.opacity = valid ? "1" : "0.4";
      confirmBtn.style.pointerEvents = valid ? "" : "none";
      confirmBtn.disabled = !valid;
    };

    input.onkeydown = (e) => {
      if (e.key === "Enter" && input.value.trim().toLowerCase() === "delete") {
        root.removeChild(overlay);
        onConfirm();
      }
    };

    confirmBtn.onclick = () => {
      root.removeChild(overlay);
      onConfirm();
    };

    btnRow.appendChild(cancelBtn);
    btnRow.appendChild(confirmBtn);
    box.appendChild(title);
    box.appendChild(desc);
    box.appendChild(input);
    box.appendChild(btnRow);
    overlay.appendChild(box);
    root.appendChild(overlay);
    requestAnimationFrame(() => input.focus());
  }
  // --- CREATE FOLDER ---
  // --- PROPERTIES DIALOG ---
  function showProperties(item) {
    if (!item) return;
    const isFolder = Array.isArray(item[1]);
    const meta = item[2] || {};
    const overlay = document.createElement("div");
    overlay.style.cssText = "position:absolute;inset:0;background:rgba(0,0,0,0.35);z-index:9500;display:flex;align-items:center;justify-content:center;";

    const box = document.createElement("div");
    box.className = "misc";
    box.style.cssText = "padding:18px 20px;border-radius:8px;min-width:320px;max-width:520px;display:flex;flex-direction:column;gap:10px;box-shadow:0 8px 32px rgba(0,0,0,0.35);";
    // adapt background/text for dark theme
    if (window.protectedGlobals && window.protectedGlobals.data && window.protectedGlobals.data.dark) {
      box.style.background = "#0b0b0b";
      box.style.color = "#e6eef8";
    } else {
      box.style.background = "white";
      box.style.color = "#111";
    }

    const title = document.createElement("div");
    title.textContent = "Properties";
    title.style.fontSize = "16px";
    title.style.fontWeight = "700";

    const rows = [];
    const addRow = (label, value) => {
      const row = document.createElement("div");
      row.style.display = "flex";
      row.style.justifyContent = "space-between";
      row.style.gap = "12px";
      const lab = document.createElement("div"); lab.textContent = label; lab.style.opacity = "0.85";
      const val = document.createElement("div"); val.textContent = value; val.style.opacity = "0.9"; val.style.textAlign = "right";
      row.appendChild(lab);
      row.appendChild(val);
      box.appendChild(row);
      rows.push(row);
    };

    addRow("Name", item[0]);
    addRow("Type", isFolder ? "Folder" : "File");
    addRow("Size", isFolder ? formatSize(getNodeSize(item)) : formatSize(meta.size));
    addRow("Modified", formatDate(meta.mtime || meta.modified || meta.date || meta.mtimeMs));
    addRow("Path", getItemPath(item) || getFullPathFromNode(item));

    const btnRow = document.createElement("div");
    btnRow.style.display = "flex";
    btnRow.style.justifyContent = "flex-end";

    const ok = document.createElement("button");
    ok.textContent = "OK";
    ok.style.padding = "6px 12px";
    ok.onclick = () => { if (root.contains(overlay)) root.removeChild(overlay); };

    btnRow.appendChild(ok);
    box.prepend(title);
    box.appendChild(btnRow);
    overlay.appendChild(box);

    // Close when clicking outside the box
    overlay.addEventListener("pointerdown", (e) => {
      if (e.target === overlay) {
        if (root.contains(overlay)) root.removeChild(overlay);
      }
    });

    // Append to root (not body)
    root.appendChild(overlay);
    requestAnimationFrame(() => ok.focus());
  }
  function getUniqueName(nameOrBase, ext = "", existingChildren) {
    // Accept optional `existingChildren` array (e.g. node[1]) to check uniqueness
    const node = Array.isArray(existingChildren)
      ? { 1: existingChildren }
      : findNode(treeData, currentPath);
    const children = (node && node[1]) || [];

    // If folder structure is not ready, just return the original name (with normalized ext if provided)
    if (!children || !Array.isArray(children) || children.length === 0) {
      if (ext) {
        const e = ext.startsWith(".") ? ext : "." + ext;
        return nameOrBase + e;
      }
      return nameOrBase;
    }

    // Determine base and extension similar to server's getUniquePath
    let base = nameOrBase;
    let extension = ext || "";
    if (!extension) {
      const idx = nameOrBase.lastIndexOf(".");
      // treat a dot at position 0 (e.g., ".bashrc") as part of the name, not an extension
      if (idx > 0) {
        base = nameOrBase.slice(0, idx);
        extension = nameOrBase.slice(idx); // includes the dot
      }
    } else {
      if (!extension.startsWith(".")) extension = "." + extension;
    }

    // Remove any leading "(n) " prefix from the base so we don't nest prefixes
    const leadMatch = base.match(/^\((\d+)\)\s*(.*)$/);
    if (leadMatch) {
      base = leadMatch[2] || "";
    }

    const compareName = base + extension;

    // Compute the highest existing numeric prefix for this exact base+ext (treat plain name as prefix 0)
    let found = false;
    let maxNum = -Infinity;
    for (const child of children) {
      const name = Array.isArray(child) ? child[0] : child || "";
      if (!name) continue;
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

    if (!found) return compareName;

    return `(${maxNum + 1}) ${base}${extension}`;
  }
  async function createFolder() {
    const folderName = getUniqueName("New Folder");
    const node = findNode(treeData, currentPath);
    if (!node || !node[1]) return;

    // Add new folder with empty children
    node[1].push([folderName, []]);
    render();
    const targetPath = [...currentPath]; // current folder path array
    directions.push({
      addFolder: true,
      path: targetPath.join("/"),
      name: folderName,
    });
    triggerAutosave();
  }

  async function createFile() {
    const fileName = getUniqueName("New File.txt");
    const node = findNode(treeData, currentPath);
    if (!node || !node[1]) return;

    // Add new file with empty content object
    node[1].push([fileName, null, { size: 0 }]);
    render();
    const targetPath = [...currentPath]; // current folder path array
    directions.push({
      addFile: true,
      path: targetPath.join("/") + "/" + fileName,
    });
    triggerAutosave();
  }

  // --- ADD BUTTONS ---
  createFolderBtn = document.createElement("button");
  createFolderBtn.textContent = "+ Folder";
  createFolderBtn.onclick = createFolder;
  styleSidebarButton(createFolderBtn);
  sidebar.appendChild(createFolderBtn);

  createFileBtn = document.createElement("button");
  createFileBtn.textContent = "+ File";
  createFileBtn.onclick = createFile;
  styleSidebarButton(createFileBtn);
  sidebar.appendChild(createFileBtn);

  // Storage usage display
  storageDiv = document.createElement("div");
  storageDiv.style.marginTop = "8px";
  storageDiv.style.fontSize = "13px";
  storageDiv.style.color = isDark ? "#cbd5e1" : "#334155";
  storageDiv.textContent = "Storage used: —";
  sidebar.appendChild(storageDiv);
  applyExplorerTheme();
  // Client-side quota (bytes). Prefer server-provided `window.protectedGlobals.data.maxSpace` (GB) if available.
  const maxSpaceGb = Number(window.protectedGlobals.data.maxSpace);
  const STORAGE_QUOTA_BYTES =
    Number.isFinite(maxSpaceGb) && maxSpaceGb > 0
      ? maxSpaceGb * 1024 * 1024 * 1024
      : 5 * 1024 * 1024 * 1024; // fallback 5 GB
  // Deselect when clicking outside file items
  root.addEventListener("click", (e) => {
    // Ignore clicks inside the context menu
    if (contextMenu.contains(e.target)) return;

    // Check if the click is inside any file/folder div
    const isClickInsideFile = e.target?.closest?.('[data-fs-item="true"]');
    if (!isClickInsideFile) {
      selectedItems = [];
      selectedItem = null;
      render();
    }

    const tag = String((e.target && e.target.tagName) || "").toUpperCase();
    const keepNativeFocus =
      tag === "INPUT" ||
      tag === "TEXTAREA" ||
      tag === "SELECT" ||
      !!(e.target && e.target.isContentEditable);
    if (!keepNativeFocus) {
      try {
        root.focus();
      } catch (err) {}
    }
  });
  function getFullPathFromNode(node, pathArray = []) {
    if (!node) return pathArray.join("/");
    pathArray.push(node[0]);
    return pathArray.join("/");
  }
  let handlepaste = (e) => {
    if (e !== "cmp") {
      if (!e || !e.target || !root.contains(e.target)) return;
      if (e.repeat) return;
    }
    if ((e.ctrlKey && e.key.toLowerCase() === "v") || e == "cmp") {
      if (e && (e.preventDefault)) e.preventDefault();
      if (e && (e.stopPropagation)) e.stopPropagation();
      const targetPath = [...currentPath]; // current folder path array
      // Quota check: sum total size of clipboard items
      let currentUsed = getNodeSize(treeData);
      let clipboardTotal = 0;
      for (const item of explorerGlobals.clipboard) {
        clipboardTotal += getNodeSize(item.node);
      }
      if (currentUsed + clipboardTotal > STORAGE_QUOTA_BYTES) {
        window.protectedGlobals.notification("Cannot paste — storage quota would be exceeded.");
        return;
      }

      for (const item of explorerGlobals.clipboard) {
        const sourceFullPath = getFullPathFromNode(item.node, []); // e.g., "FolderA"
        const targetFullPath = targetPath.join("/"); // e.g., "FolderA/Sub"

        // ❌ Prevent circular paste
        if (item.isFolder && targetFullPath.startsWith(sourceFullPath + "/")) {
          window.protectedGlobals.notification(
            `Cannot paste folder "${item.name}" into itself or a subfolder.`,
          );
          continue;
        }

        // Find target node in treeData
        const node = findNode(treeData, targetPath);
        if (!node || !node[1]) continue;

        // Deep clone the node to avoid circular references
        const newNode = JSON.parse(JSON.stringify(item.node));

        // Generate a unique name if conflict exists
        newNode[0] = getUniqueName(newNode[0], "", node[1]);

        node[1].push(newNode);
      }
      targetPath.splice(0, 1);
      directions.push({ paste: true, path: targetPath.join("/") });
      render();
      triggerAutosave();
    }
  };
  let handlecopy = (e) => {
    if (e !== "copy") {
      if (!e || !e.target || !root.contains(e.target)) return;
      if (e.repeat) return;
    }
    if ((e.ctrlKey && e.key.toLowerCase() === "c") || e == "copy") {
      if (e && (e.preventDefault)) e.preventDefault();
      if (e && (e.stopPropagation)) e.stopPropagation();
      explorerGlobals.clipboard = selectedItems.map((item) => ({
        node: item,
        path: getCurrentFolderPath() + item[0],
        name: item[0],
        isFolder: Array.isArray(item[1]),
        isCut: false,
      }));
      const targetPath = [...currentPath]; // current folder path array
      let predirections = [];
      targetPath.splice(0, 1);
      for (let i = 0; i < explorerGlobals.clipboard.length; i++) {
        if (targetPath.length !== 0)
          predirections.push({
            path:
              targetPath.join("/") + "/" + explorerGlobals.clipboard[i].name,
          });
        else predirections.push({ path: explorerGlobals.clipboard[i].name });
      }
      directions.push({ copy: true, directions: predirections });
    }
  };
  root.addEventListener("keydown", handlepaste);
  root.addEventListener("keydown", handlecopy);
  // --- CONTEXT MENU ---
  function showContextMenu(clientX, clientY, isFolder, isBlank = false) {
    contextMenu.innerHTML = "";
    const containerRect = container.getBoundingClientRect();
    let x = clientX - containerRect.left;
    let y = clientY - containerRect.top;

    // Prevent menu from going outside container
    x = Math.min(x, containerRect.width - contextMenu.offsetWidth) + 5;
    y = Math.min(y, containerRect.height - contextMenu.offsetHeight) + 30;
    const addItem = (label, action, disabled = false) => {
      const div = document.createElement("div");
      div.textContent = label;
      div.style.padding = "4px 8px";
      div.style.cursor = disabled ? "not-allowed" : "pointer";
      div.style.userSelect = "none";
      div.style.borderRadius = "7px";
      div.style.margin = "1px 1px";
      div.style.display = "flex";
      div.style.alignItems = "center";
      div.style.justifyContent = "space-between";
      div.style.minHeight = "24px";
      div.style.background = "transparent";
      div.style.color = "inherit";
      div.style.fontSize = "92%";
      if (disabled) {
        div.style.opacity = "0.55";
      } else {
        const hoverBg = isDark ? 'rgba(255,255,255,0.07)' : 'rgba(0,0,0,0.05)';
        div.addEventListener('mouseenter', () => (div.style.background = hoverBg));
        div.addEventListener('mouseleave', () => (div.style.background = 'transparent'));
        div.addEventListener('click', () => {
          hideContextMenu();
          try { action(); } catch(e) { console.error(e); }
        });
      }

      contextMenu.appendChild(div);
    };

    // ──────────────
    // MULTI-SELECT LOGIC
    // ──────────────
    const isMulti = selectedItems.length > 1;

    // Delete (works for single or multi)
    // ──────────────────────────────
    // CONTEXT MENU ITEMS
    // ──────────────────────────────

    // Detect whether we are inside .trash
    const inTrash = currentPath.length >= 2 && currentPath[1] === ".trash";

    // Delete / Delete Permanently for multi-select
    if (!isBlank && selectedItems.length) {
      if (inTrash) {
        // ── Inside .trash: permanently delete with confirmation dialog ──
        addItem("Delete Permanently", () => {
          showPermanentDeleteDialog(selectedItems.length, () => {
            const targetPath = [...currentPath];
            for (const item of selectedItems) {
              directions.push({
                permanentDelete: true,
                path: targetPath.join("/") + "/" + item[0],
              });
              const deletePath = [...currentPath.slice(1), item[0]];
              removeNodeFromTree(treeData, deletePath);
            }
            selectedItems = [];
            selectedItem = null;
            render();
            triggerAutosave();
          });
        });

        // ── Restore: move item back to root ──
        addItem("Restore", () => {
          const targetPath = [...currentPath];
          for (const item of selectedItems) {
            directions.push({
              restore: true,
              path: targetPath.join("/") + "/" + item[0],
            });
            const deletePath = [...currentPath.slice(1), item[0]];
            removeNodeFromTree(treeData, deletePath);
          }
          selectedItems = [];
          selectedItem = null;
          render();
          triggerAutosave();
        });
      } else {
        // ── Normal delete: move to .trash ──
        addItem("Delete", () => {
          const targetPath = [...currentPath]; // current folder path array
          for (const item of selectedItems) {
            directions.push({
              delete: true,
              path: targetPath.join("/") + "/" + item[0],
            });

            // Remove from local tree
            const deletePath = [...currentPath.slice(1), item[0]];
            // slice(1) removes "root" if treeData is the root node
            removeNodeFromTree(treeData, deletePath);

            // If explorerGlobals.clipboard is an array, remove any entries that reference this deleted path.
            if (!Array.isArray(explorerGlobals.clipboard))
              explorerGlobals.clipboard = [];
            const rel = deletePath.join("/");
            const isFolder = Array.isArray(item[1]);
            explorerGlobals.clipboard = explorerGlobals.clipboard.filter(
              (c) => {
                if (!c || typeof c.path !== "string") return true;
                if (isFolder) {
                  return !(c.path === rel || c.path.startsWith(rel + "/"));
                }
                return c.path !== rel;
              },
            );
          }
          selectedItems = [];
          selectedItem = null;
          render();
          triggerAutosave();
        });
      }
    }

    // Rename only if single item is selected
    if (!isBlank && selectedItem && selectedItems.length <= 1) {
      if(isFolder) {
      addItem("Open in Terminal", () => {
        const path = getItemPath(selectedItem);
        if (path) {
          window.terminal(path);
        }
      });
      }
      addItem("Rename", () => {
        const oldName = selectedItem[0];

        const items = [...fileArea.children];
        const row = items.find(
          (r) => r.querySelector("div:nth-child(2)").textContent === oldName,
        );
        if (!row) return;

        const nameDiv = row.children[1];
        const input = document.createElement("input");
        input.value = oldName;
        input.style.width = "100%";
        nameDiv.textContent = "";
        nameDiv.appendChild(input);
        input.focus();
        input.select();
        let newName;
        const finish = () => {
          newName = input.value.trim();
          if (!newName || newName === oldName) {
            render();
            return;
          }

          for (let i = 0; i < fileArea.children.length; i++) {
            try {
              if (fileArea.children[i].children[1].textContent === newName)
                newName = getUniqueName(newName);
            } catch (e) {}
          }

          // Update treeData locally
          selectedItem[0] = newName;

          // If part of a folder, also update the tree node's reference
          const node = findNode(treeData, currentPath);
          if (node && node[1]) {
            const child = node[1].find((c) => c === selectedItem);
            if (child) child[0] = newName;
          }

          // Update local explorerGlobals.clipboard entries that reference this path (files or nested inside folders)
          try {
            const oldRel = [...currentPath.slice(1), oldName].join("/");
            const newRel = [...currentPath.slice(1), newName].join("/");
            if (!Array.isArray(explorerGlobals.clipboard))
              explorerGlobals.clipboard = [];
            explorerGlobals.clipboard = explorerGlobals.clipboard.map((c) => {
              if (!c || typeof c.path !== "string") return c;
              if (c.path === oldRel) {
                const updated = { ...c, path: newRel };
                if (updated.name) updated.name = newName;
                if (updated.node && updated.node === selectedItem)
                  updated.node[0] = newName;
                return updated;
              }
              if (c.path.startsWith(oldRel + "/")) {
                return { ...c, path: newRel + c.path.slice(oldRel.length) };
              }
              return c;
            });

            // Update any pending copy/delete directions that reference the old path
            for (const d of directions) {
              if (d && d.copy && Array.isArray(d.directions)) {
                d.directions = d.directions.map((p) => {
                  if (!p || typeof p.path !== "string") return p;
                  if (p.path === oldRel) return { ...p, path: newRel };
                  if (p.path.startsWith(oldRel + "/"))
                    return { ...p, path: newRel + p.path.slice(oldRel.length) };
                  return p;
                });
              }
              if (d && d.delete && typeof d.path === "string") {
                // d.path could be "folder/file" or "folder/sub/file"
                if (d.path === oldRel) d.path = newRel;
                else if (d.path.startsWith(oldRel + "/"))
                  d.path = newRel + d.path.slice(oldRel.length);
                else if (d.path.endsWith("/" + oldName)) {
                  d.path =
                    d.path.slice(0, d.path.length - oldName.length) + newName;
                }
              }
            }
          } catch (e) {
            // ignore update errors
          }

          render();
          const targetPath = [...currentPath]; // current folder path array
          directions.push({
            rename: true,
            path: targetPath.join("/") + "/" + oldName,
            newName: newName,
          });
          triggerAutosave();
        };

        input.onblur = finish;
        input.onkeydown = (e) => {
          if (e.key === "Enter") finish();
          if (e.key === "Escape") render();
        };
      });
    }

      // Properties menu item for single selection
      if (!isBlank && selectedItem && selectedItems.length <= 1) {
        addItem("Properties", () => {
          try { showProperties(selectedItem); } catch (e) { console.error(e); }
        });
      }

    // Copy / Cut (works for multi-select)
    if (!isBlank && selectedItems.length) {
      addItem("Copy", () => handlecopy("copy"));
    }

    if (isBlank && explorerGlobals.clipboard.length) {
      addItem("Paste", () => handlepaste("cmp"));
    }

    // "Open with" submenu for files (always show Text Editor option)
    if (!isFolder && !isBlank) {
      const openWithParent = document.createElement("div");
      openWithParent.style.display = "flex";
      openWithParent.style.alignItems = "center";
      openWithParent.style.justifyContent = "space-between";
      const openLabel = document.createElement('span');
      openLabel.textContent = 'Open with';
      openLabel.style.marginRight = '8px';
      openLabel.style.fontSize = '92%';
      openWithParent.appendChild(openLabel);
      openWithParent.appendChild(makeIcon('chev',12));
      openWithParent.style.padding = "4px 8px";
      openWithParent.style.margin = "1px 1px";
      openWithParent.style.borderRadius = "7px";
      openWithParent.style.minHeight = "24px";
      openWithParent.style.cursor = "pointer";
      openWithParent.style.background = "transparent";
      openWithParent.style.color = "inherit";
      openWithParent.addEventListener('mouseenter', () => {
        openWithParent.style.background = isDark ? 'rgba(255,255,255,0.07)' : 'rgba(0,0,0,0.05)';
      });
      openWithParent.addEventListener('mouseleave', () => {
        openWithParent.style.background = 'transparent';
      });

      let submenu;
      openWithParent.addEventListener("mouseenter", () => {
        if (submenu) return; // already open
        // Create submenu positioned to the right of the main menu
        submenu = document.createElement("div");
        submenu.style.position = "absolute";
        submenu.style.border = isDark ? "1px solid rgba(255,255,255,0.08)" : "1px solid rgba(0,0,0,0.08)";
        submenu.style.background = isDark ? "#111827" : "#ffffff";
        submenu.style.color = isDark ? "#e6eef8" : "#111";
        submenu.style.zIndex = 2000;
        submenu.style.borderRadius = "10px";
        submenu.style.boxShadow = isDark ? "0 12px 32px rgba(0,0,0,0.55)" : "0 10px 24px rgba(0,0,0,0.12)";
        submenu.style.padding = "6px";
        submenu.style.minWidth = "170px";
        const toOpen = selectedItems.length ? selectedItems.slice() : [selectedItem];
        const selectedExtensions = toOpen
          .filter((node) => node && !Array.isArray(node[1]))
          .map((node) => {
            const candidatePath = node[2].path;
            return String(candidatePath || "");
          })
          .map((path) => {
            const fileName = String(path).split("/").pop() || "";
            const dotIndex = fileName.lastIndexOf(".");
            return dotIndex > 0 ? fileName.slice(dotIndex).toLowerCase() : "";
          });

        function normalizeOpenFileCapability(value) {
          if (Array.isArray(value)) {
            return value
              .map((v) => String(v || "").trim().toLowerCase())
              .filter(Boolean);
          }
          if (typeof value === "string") {
            return value
              .split(",")
              .map((v) => String(v || "").trim().toLowerCase())
              .filter(Boolean);
          }
          return [];
        }

        function appSupportsSelectedExtensions(app) {
          const caps = normalizeOpenFileCapability(app.openfilecapability);
          if (!caps.length) return false;
          if (caps.includes("*")) return true;
          if (!selectedExtensions.length) return false;
          return selectedExtensions.every((ext) => caps.includes(ext));
        }

        const apps = (Array.isArray(window.protectedGlobals.apps) ? window.protectedGlobals.apps : [])
          .map((app) => {
            const functionName = app && (app.functionname || app.id);
            if (!functionName || !(window[functionName])) return null;
            return {
              label: app.label || functionName,
              functionName,
              openfilecapability: app.openfilecapability,
            };
          })
          .filter(Boolean)
          .filter((app) => {
            const ownId = String(root.dataset.appId || "").toLowerCase();
            return String(app.functionName || "").toLowerCase() !== ownId;
          })
          .filter((app) => appSupportsSelectedExtensions(app));

        if (!apps.length) {
          const emptyItem = document.createElement("div");
          emptyItem.textContent = "No apps available";
          emptyItem.style.padding = "8px 10px";
          emptyItem.style.opacity = "0.7";
          emptyItem.style.cursor = "default";
          emptyItem.style.borderRadius = "8px";
          emptyItem.style.fontSize = "92%";
          submenu.appendChild(emptyItem);
        } else {
          for (const app of apps) {
            const appItem = document.createElement("div");
            appItem.textContent = app.label;
            appItem.style.padding = "8px 10px";
            appItem.style.cursor = "pointer";
            appItem.style.borderRadius = "8px";
            appItem.style.margin = "2px 0";
            appItem.style.fontSize = "92%";
            appItem.style.background = "transparent";
            appItem.addEventListener('mouseenter', () => {
              appItem.style.background = isDark ? 'rgba(255,255,255,0.07)' : 'rgba(0,0,0,0.05)';
            });
            appItem.addEventListener('mouseleave', () => {
              appItem.style.background = 'transparent';
            });
            appItem.onclick = async () => {
              try {
                hideContextMenu();
                for (const node of toOpen) {
                  if (!node || Array.isArray(node[1])) continue;
                  let path = node[2].path;
                  console.log("Opening with app", app.functionName, path, node);
                  try {
                    window[app.functionName](path);
                  } catch (e) {
                    console.error("open with app error", e);
                  }
                }
              } catch (e) {
                console.error(e);
              }
            };
            submenu.appendChild(appItem);
          }
        }
        // append to `root` so positioning is relative to the explorer window
        root.appendChild(submenu);

        // Position the submenu relative to `root` and keep it inside the window
        requestAnimationFrame(() => {
          try {
            const parentRect = openWithParent.getBoundingClientRect();
            const menuRect = contextMenu.getBoundingClientRect();
            const rootRect = root.getBoundingClientRect();

            // Compute coordinates relative to root's top-left
            let left = menuRect.right - rootRect.left;
            let top = parentRect.top - rootRect.top;

            const sh = submenu.offsetHeight || 0;
            const rw = rootRect.width || root.clientWidth;
            const rh = rootRect.height || root.clientHeight;

            // Keep submenu inside root horizontally
            if (left + submenu.offsetWidth > rw - 8) {
              // position to the left of the main menu if it would overflow
              const altLeft =
                menuRect.left - rootRect.left - submenu.offsetWidth;
              if (altLeft > 8) left = altLeft;
            }

            // If submenu would go off bottom of root, move it up
            if (top + sh > rh - 8) {
              top = Math.max(8, rh - sh - 8);
            }

            submenu.style.left = left + "px";
            submenu.style.top = top + "px";
            submenu.onclick = (e) => {
              setTimeout(() => {
                if (submenu) {
                  submenu.remove();
                  submenu = null;
                }
              }, 10);
            };
          } catch (e) {}
        });
      });

      document.addEventListener(
        "pointerdown",
        (e) => {
          if (submenu && !submenu.contains(e.target)) {
            submenu.remove();
            submenu = null;
          }
        },
        { capture: true, once: true },
      );

      contextMenu.appendChild(openWithParent);
    }
    if (contextMenu.children.length === 0) {contextMenu.style.display = "none"; return;} // don't show empty menu
    contextMenu.style.left = x + "px";
    contextMenu.style.top = y + "px";
    contextMenu.style.display = "block";
  }

  function hideContextMenu() {
    contextMenu.style.display = "none";
  }
  document.addEventListener("fileExplorer" + root._goldenbodyId, "click", hideContextMenu);

  // --- BUTTONS ---
  refreshBtn.onclick = async () => {
    await onlyloadTree();
    render();
  };
  uploadBtn.onclick = () => fileInput.click();
  homeBtn.onclick = () => {
    currentPath = ["root"];
    render();
  };
  trashBtn.onclick = () => {
    currentPath = ["root", ".trash"];
    render();
  };
  emptyTrashBtn.onclick = () => {
    // Find all items currently in the .trash node
    const trashNode = findNode(treeData, ["root", ".trash"]);
    const trashItems = trashNode && trashNode[1] ? trashNode[1].slice() : [];
    const count = trashItems.length;
    if (!count) return;
    showPermanentDeleteDialog(count, () => {
      for (const item of trashItems) {
        directions.push({
          permanentDelete: true,
          path: "root/.trash/" + item[0],
        });
        removeNodeFromTree(treeData, [".trash", item[0]]);
      }
      render();
      triggerAutosave();
    });
  };

  // Debounced autosave timer
  let autosaveTimer = null;
  const AUTOSAVE_DELAY = 800; // ms

  let handlesave = async (e) => {
    // console.log(directions);
    directions.push({ end: true });
    const response = await window.protectedGlobals.filePost({
      saveSnapshot: true,
      directions: directions,
    });
    directions = [];
    // // Restore explorerGlobals.clipboard from server response (keep existing if not returned)
    // if (response.explorerGlobals.clipboard && Array.isArray(response.explorerGlobals.clipboard)) {
    //   explorerGlobals.clipboard = response.explorerGlobals.clipboard;
    // }
    saveBtn.innerHTML = '';
    saveBtn.appendChild(makeIcon('save',16));
    saveBtn.appendChild(document.createTextNode('Saved!'));
    setTimeout(() => {
      saveBtn.innerHTML = '';
      saveBtn.appendChild(makeIcon('save',16));
      saveBtn.appendChild(document.createTextNode('Save'));
    }, 1000);
  };

  // Autosave on change with debounce
  let triggerAutosave = () => {
    if (directions.length === 0) return; // nothing to save
    clearTimeout(autosaveTimer);
    autosaveTimer = setTimeout(() => handlesave(), AUTOSAVE_DELAY);
  };

  saveBtn.onclick = handlesave;
  // root.addEventListener("pointerup", handlesave);
  // --- Upload helpers ---
  const MAX_INLINE_BASE64 = 10 * 1024 * 1024; // 10 MB inline threshold
  const CHUNK_SIZE = 10 * 1024 * 1024; // 10 MB chunks for large files
  const MAX_CHUNK_RETRIES = 3;
  const CHUNK_RETRY_BASE_MS = 500; // ms

  function arrayBufferToBase64(buffer) {
    let binary = "";
    const bytes = new Uint8Array(buffer);
    const chunkSize = 0x8000;
    for (let i = 0; i < bytes.length; i += chunkSize) {
      const slice = bytes.subarray(i, i + chunkSize);
      binary += String.fromCharCode.apply(null, slice);
    }
    return btoa(binary);
  }

  function fileToBase64(file, onProgress) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onprogress = (ev) => {
        if (typeof onProgress === "function" && ev && ev.lengthComputable) {
          onProgress(ev.loaded, ev.total);
        }
      };
      reader.onload = () => {
        const base64 = arrayBufferToBase64(reader.result);
        resolve(base64);
      };
      reader.onerror = reject;
      reader.readAsArrayBuffer(file);
    });
  }

  function sleep(ms) {
    return new Promise((r) => setTimeout(r, ms));
  }

  function readBlobAsBase64(blob, onProgress) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onprogress = (ev) => {
        if (typeof onProgress === "function" && ev && ev.lengthComputable) {
          onProgress(ev.loaded, ev.total);
        }
      };
      reader.onload = () => {
        const base64 = arrayBufferToBase64(reader.result);
        resolve(base64);
      };
      reader.onerror = reject;
      reader.readAsArrayBuffer(blob);
    });
  }

  async function uploadChunkWithRetries(path, file, index, total, onProgress) {
    let attempts = 0;
    while (true) {
      try {
        const start = index * CHUNK_SIZE;
        const end = Math.min(file.size, start + CHUNK_SIZE);
        const blob = file.slice(start, end);
        const chunkBase64 = await readBlobAsBase64(blob, onProgress);
        // Only send replace:true on the first chunk (index 0)
        const shouldReplace = index === 0;
        await window.protectedGlobals.filePost({
          saveSnapshot: true,
          directions: [
            {
              edit: true,
              path,
              chunk: chunkBase64,
              index,
              total,
              replace: shouldReplace,
            },
            { end: true },
          ],
        });
        return true;
      } catch (err) {
        attempts++;
        if (attempts > MAX_CHUNK_RETRIES) throw err;
        const backoff = CHUNK_RETRY_BASE_MS * Math.pow(2, attempts - 1);
        console.warn(
          `chunk upload failed for ${path} index ${index}, retrying in ${backoff}ms (attempt ${attempts})`,
          err,
        );
        await sleep(backoff);
      }
    }
  }

  fileInput.addEventListener("change", async (e) => {
    const files = [...e.target.files];
    const node = findNode(treeData, currentPath);
    if (!node || !node[1]) return;

    let currentUsed = getNodeSize(treeData);
    const allowed = [];
    for (const f of files) {
      if (currentUsed + f.size > STORAGE_QUOTA_BYTES) {
        window.protectedGlobals.notification(
          `Cannot upload "${f.name}" — storage quota would be exceeded.`,
        );
        continue;
      }
      currentUsed += f.size;
      allowed.push(f);
    }

    if (!allowed.length) {
      e.target.value = "";
      return;
    }

    const totalBytes = allowed.reduce((sum, file) => sum + file.size, 0);
    let uploadedBytes = 0;
    let uploadFailed = false;
    showUploadProgress(
      `Uploading ${allowed.length} file${allowed.length === 1 ? "" : "s"}`,
      `0/${allowed.length} ready`,
      totalBytes,
    );

    try {
      for (let fileIndex = 0; fileIndex < allowed.length; fileIndex++) {
        const f = allowed[fileIndex];
        const newName = getUniqueName(f.name);
        node[1].push([newName, null, { size: f.size }]);
        const targetPath = [...currentPath];
        const cp = targetPath.join("/");
        const fileLabel = `${fileIndex + 1}/${allowed.length}: ${newName}`;

        if (f.size <= MAX_INLINE_BASE64) {
          const content = await fileToBase64(f, (loaded) => {
            updateUploadProgress(uploadedBytes + loaded, `Reading ${fileLabel}`);
          });
          updateUploadProgress(uploadedBytes + f.size, `Saving ${fileLabel}`);
          await window.protectedGlobals.filePost({
            saveSnapshot: true,
            directions: [
              {
                edit: true,
                contents: content,
                path: cp + "/" + newName,
                replace: true,
              },
              { end: true },
            ],
          });
          uploadedBytes += f.size;
          updateUploadProgress(uploadedBytes, `Uploaded ${fileLabel}`);
        } else {
          const total = Math.ceil(f.size / CHUNK_SIZE);

          await window.protectedGlobals.filePost({
            saveSnapshot: true,
            directions: [
              { addFile: true, path: cp + "/" + newName, replace: true },
              { end: true },
            ],
          });

          let presentParts = [];
          try {
            const chk = await window.protectedGlobals.filePost({
              saveSnapshot: true,
              directions: [
                { checkParts: true, path: cp + "/" + newName },
                { end: true },
              ],
            });
            presentParts =
              (chk &&
                chk.result &&
                chk.result.checkParts &&
                chk.result.checkParts[cp + "/" + newName]) ||
              [];
          } catch (e) {
            console.warn("checkParts failed, will attempt full upload", e);
            presentParts = [];
          }

          const presentSet = new Set(presentParts);
          let uploadedCount = presentSet.size;
          let fileDoneBytes = 0;

          if (presentSet.size < total) {
            for (let i = 0; i < total; i++) {
              const chunkBytes = Math.min(CHUNK_SIZE, f.size - i * CHUNK_SIZE);
              if (presentSet.has(i)) {
                fileDoneBytes += chunkBytes;
                uploadedBytes += chunkBytes;
                updateUploadProgress(
                  uploadedBytes,
                  `Resuming ${fileLabel} (${uploadedCount}/${total} chunks)`,
                );
                continue;
              }

              try {
                await uploadChunkWithRetries(cp + "/" + newName, f, i, total, (loaded) => {
                  updateUploadProgress(
                    uploadedBytes + fileDoneBytes + loaded,
                    `Uploading ${fileLabel} (${uploadedCount + 1}/${total} chunks)`,
                  );
                });
                uploadedCount++;
                fileDoneBytes += chunkBytes;
                uploadedBytes += chunkBytes;
                updateUploadProgress(
                  uploadedBytes,
                  `Uploading ${fileLabel} (${uploadedCount}/${total} chunks)`,
                );
              } catch (err) {
                console.error(`Failed to upload chunk ${i} for ${newName}:`, err);
                setUploadError(
                  "Upload failed",
                  `Chunk ${i + 1}/${total} failed for ${newName}`,
                );
                uploadFailed = true;
                break;
              }

              await sleep(0);
            }
          } else {
            uploadedBytes += f.size;
            updateUploadProgress(uploadedBytes, `Resuming ${fileLabel} (already present)`);
          }

          if (uploadFailed) break;

          try {
            updateUploadProgress(uploadedBytes, `Finalizing ${fileLabel}`);
            await window.protectedGlobals.filePost({
              saveSnapshot: true,
              directions: [
                { edit: true, path: cp + "/" + newName, finalize: true },
                { end: true },
              ],
            });
          } catch (e) {
            console.error("finalize failed for", newName, e);
            setUploadError("Upload failed", `Could not finalize ${newName}`);
            uploadFailed = true;
            break;
          }
        }
      }

      if (!uploadFailed) {
        updateUploadProgress(totalBytes, "Upload complete");
        hideUploadProgress(900);
      }
    } catch (err) {
      console.error("upload failed", err);
      setUploadError("Upload failed", err && (err.message || String(err)));
      hideUploadProgress(2200);
    } finally {
      e.target.value = "";
      render();
      if (allowed.length) handlesave();
    }
  });

  const handleStyleApplied = () => {
    applyExplorerTheme();
    try {
      render();
    } catch (e) {
      console.warn("fileExplorer styleapplied refresh failed", e);
    }
  };
  root.addEventListener("styleapplied", handleStyleApplied);

  // --- INIT ---
  onlyloadTree();

  explorerGlobals.allExplorers.push({
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
    goldenbodyId: explorerGlobals.goldenbodyId,
  });
  window.protectedGlobals.applyStyles();

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
    goldenbodyId: explorerGlobals.goldenbodyId,
  };
};


