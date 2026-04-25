//explorer global vars
window.explorerGlobals = {};
explorerGlobals.allExplorers = [];
explorerGlobals.goldenbodyId = 0;
explorerGlobals.clipboard = {
  item: null, // tree node reference
  path: null, // full path string
};

fileExplorer = function (path = '/', posX = 50, posY = 50) {
  let isMaximized = false;
  let _isMinimized = false;
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
  const applyWindowControlIcon =
    window.protectedGlobals.applyWindowControlIcon || function () {};
  const setWindowMaximizeIcon = window.protectedGlobals.setWindowMaximizeIcon || function () {};
  applyWindowControlIcon(btnMin, "minimize");
  setWindowMaximizeIcon(btnMax, false);
  applyWindowControlIcon(btnClose, "close");
  topBar.addEventListener("click", function () {
    window.protectedGlobals.bringToFront(root);
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
    root.style.height = !window.protectedGlobals.data.autohidetaskbar ? `calc(100% - 60px)` : "100%";
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

  function closeWindow() {
    root.remove();
    const index = explorerGlobals.allExplorers.findIndex(
      (instance) => instance.rootElement == root,
    );
    if (index !== -1) explorerGlobals.allExplorers.splice(index, 1);
    window.protectedGlobals.removeAllEventListenersForApp("fileExplorer" + root._goldenbodyId);
  }

  function hideWindow() {
    if (!isMaximized) savedBounds = getBounds();
    root.style.display = "none";
    _isMinimized = true;
  }

  function showWindow() {
    root.style.display = "flex";
    _isMinimized = false;
    window.protectedGlobals.bringToFront(root);
  }

  function closeAll() {
    for (const instance of [...explorerGlobals.allExplorers]) {
      if (instance && typeof instance.closeWindow === "function") {
        instance.closeWindow();
      }
    }
    explorerGlobals.allExplorers = [];
  }

  function hideAll() {
    for (const instance of explorerGlobals.allExplorers) {
      if (instance && typeof instance.hideWindow === "function") {
        instance.hideWindow();
      }
    }
  }

  function showAll() {
    explorerGlobals.allExplorers.sort(
      (a, b) => a.rootElement.style.zIndex - b.rootElement.style.zIndex,
    );
    for (const instance of explorerGlobals.allExplorers) {
      if (instance && typeof instance.showWindow === "function") {
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
      let thresholdCrossed = false;
      let DRAG_THRESHOLD = window.protectedGlobals.data.DRAG_THRESHOLD || 15; // pixels required to trigger drag behavior
      let mouseDownX = 0,
        mouseDownY = 0;
      let currentX, currentY;

      topBar.addEventListener("mousedown", (ev) => {
        DRAG_THRESHOLD = Number(window.protectedGlobals.data.DRAG_THRESHOLD) || DRAG_THRESHOLD;
        dragging = true;
        thresholdCrossed = false;
        startX = ev.clientX;
        startY = ev.clientY;
        mouseDownX = ev.clientX;
        mouseDownY = ev.clientY;
        origLeft = root.offsetLeft;
        origTop = root.offsetTop;
        currentX = ev.clientX;
        currentY = ev.clientY;
        document.body.style.userSelect = "none";
      });

      window.addEventListener("fileExplorer" + root._goldenbodyId, "mousemove", (ev) => {
        if (!dragging) return;
        const dragDistance = Math.sqrt(
          Math.pow(ev.clientX - mouseDownX, 2) + Math.pow(ev.clientY - mouseDownY, 2),
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

      window.addEventListener("fileExplorer" + root._goldenbodyId, "mouseup", () => {
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
  let selectedItem = null; // single right-click selection
  let selectedItems = []; // array for multi-select / drag & drop
  let dragItems = []; // temporary array for drag operation
  let directions = [];

  // --- CONFIG ---
  const username = window.protectedGlobals.data.username;
  let currentPath = ["root"];
  let treeData = window.protectedGlobals.treeData;

  function getCurrentFolderPath() {
    return currentPath.slice(1).join("/") + (currentPath.length > 1 ? "/" : "");
  }

  // --- ELEMENTS ---
  const container = document.createElement("div");
  container.style.display = "flex";
  container.style.height = "100%";
  root.appendChild(container);

  // Sidebar
  const sidebar = document.createElement("div");
  sidebar.style.width = "180px";
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
  const refreshBtn = document.createElement("button");
  refreshBtn.textContent = "🔄 Refresh";
  sidebar.appendChild(refreshBtn);

  const uploadBtn = document.createElement("button");
  uploadBtn.textContent = "⬆ Upload";
  sidebar.appendChild(uploadBtn);

  const homeBtn = document.createElement("button");
  homeBtn.textContent = "🏠 Home";
  sidebar.appendChild(homeBtn);

  const saveBtn = document.createElement("button");
  saveBtn.textContent = "💾 Save";
  sidebar.appendChild(saveBtn);

  const trashBtn = document.createElement("button");
  trashBtn.textContent = "🗑 Trash";
  sidebar.appendChild(trashBtn);

  const emptyTrashBtn = document.createElement("button");
  emptyTrashBtn.textContent = "🔥 Empty Trash";
  emptyTrashBtn.style.display = "none";
  emptyTrashBtn.style.background = "#7f1b1b";
  emptyTrashBtn.style.color = "white";
  sidebar.appendChild(emptyTrashBtn);

  const fileInput = document.createElement("input");
  fileInput.type = "file";
  fileInput.multiple = true;
  fileInput.style.display = "none";
  sidebar.appendChild(fileInput);

  // Main area
  const main = document.createElement("div");
  main.style.flex = "1";
  main.style.display = "flex";
  main.style.flexDirection = "column";
  container.appendChild(main);

  const topbar = document.createElement("div");
  topbar.style.padding = "8px";
  topbar.style.borderBottom = "1px solid #ddd";
  main.appendChild(topbar);

  const breadcrumbs = document.createElement("div");
  topbar.appendChild(breadcrumbs);

  const fileArea = document.createElement("div");
  fileArea.style.flex = "1";
  fileArea.style.overflowY = "auto";
  fileArea.style.padding = "8px";
  main.appendChild(fileArea);
  fileArea.tabIndex = "1";

  const contextMenu = document.createElement("div");
  contextMenu.style.position = "absolute";
  contextMenu.className = "misc";
  contextMenu.style.border = "1px solid #ccc";
  contextMenu.style.display = "none";
  contextMenu.style.zIndex = "1000";
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
      row.style.background = rowItem && selectedItems.includes(rowItem) ? "#d0e6ff" : "";
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

    node[1].forEach((item, index) => {
      if (item[0] == ".DS_Store" || item[0].startsWith(".temp")) return;
      const isFolder = Array.isArray(item[1]);
      const div = document.createElement("div");

      // Metadata
      div.dataset.index = index;
      div.dataset.isFolder = isFolder;
      div.dataset.fsItem = "true";
      div.style.display = "flex";
      div.style.alignItems = "center";
      div.style.padding = "6px";
      div.style.borderBottom = "1px solid #eee";
      div.style.cursor = "pointer";
      div.draggable = true;
      if (item[0].endsWith(".smh")) {div.addEventListener('dblclick', () => evalJsApp(item[2].path));}
      // Highlight selected
      if (selectedItems.includes(item)) div.style.background = "#d0e6ff";

      // Click selection
      div.onclick = (e) => handleSelection(e, item, node[1], index);

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
      icon.textContent = isFolder ? "📁" : "📄";
      icon.style.width = "30px";
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

      fileArea.appendChild(div);
    });
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
    // Sort: folders first, then files; both alphabetically case-insensitive
    node[1].sort((a, b) => {
      const aIsFolder = Array.isArray(a[1]);
      const bIsFolder = Array.isArray(b[1]);
      if (aIsFolder && !bIsFolder) return -1;
      if (!aIsFolder && bIsFolder) return 1;
      const na = (Array.isArray(a) ? a[0] : String(a)).toLowerCase();
      const nb = (Array.isArray(b) ? b[0] : String(b)).toLowerCase();
      return na < nb ? -1 : na > nb ? 1 : 0;
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
    title.textContent = "⚠️ Permanently Delete";
    title.style.cssText = "font-size:17px;font-weight:700;color:#c0392b;";

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
  const createFolderBtn = document.createElement("button");
  createFolderBtn.textContent = "+ Folder";
  createFolderBtn.onclick = createFolder;
  sidebar.appendChild(createFolderBtn);

  const createFileBtn = document.createElement("button");
  createFileBtn.textContent = "+ File";
  createFileBtn.onclick = createFile;
  sidebar.appendChild(createFileBtn);
  // Storage usage display
  const storageDiv = document.createElement("div");
  storageDiv.style.marginTop = "8px";
  storageDiv.style.fontSize = "13px";
  storageDiv.style.color = "#cbd5e1";
  storageDiv.textContent = "Storage used: —";
  sidebar.appendChild(storageDiv);
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
      if (e && typeof e.preventDefault === "function") e.preventDefault();
      if (e && typeof e.stopPropagation === "function") e.stopPropagation();
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
      if (e && typeof e.preventDefault === "function") e.preventDefault();
      if (e && typeof e.stopPropagation === "function") e.stopPropagation();
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
      div.style.padding = "6px 10px";
      div.style.cursor = disabled ? "not-allowed" : "pointer";
      div.className = "misc";
      if (!disabled) {
        div.onmouseenter = () => {
          div.className = "misc2";
        };
        div.onmouseleave = () => (div.className = "misc");
        div.onclick = () => {
          hideContextMenu();
          action();
        };
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
      openWithParent.textContent = "Open with ‎▶";
      openWithParent.style.padding = "6px 10px";
      openWithParent.style.cursor = "pointer";
      openWithParent.className = "misc";

      let submenu;
      openWithParent.addEventListener("mouseenter", () => {
        if (submenu) return; // already open
        // Create submenu positioned to the right of the main menu
        submenu = document.createElement("div");
        submenu.style.position = "absolute";
        submenu.style.border = "1px solid #ccc";
        submenu.style.background = window.protectedGlobals.data.dark ? "black" : "white";
        submenu.style.zIndex = 2000;
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
            if (!functionName || typeof window[functionName] !== "function") return null;
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
          emptyItem.style.padding = "6px 10px";
          emptyItem.style.opacity = "0.7";
          emptyItem.style.cursor = "default";
          emptyItem.className = "misc";
          submenu.appendChild(emptyItem);
        } else {
          for (const app of apps) {
            const appItem = document.createElement("div");
            appItem.textContent = app.label;
            appItem.style.padding = "6px 10px";
            appItem.style.cursor = "pointer";
            appItem.className = "misc";
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
          } catch (e) {}
        });
      });

      document.addEventListener(
        "pointerdown",
        (e) => {
          setTimeout(() => {
            if (submenu) {
              root.removeChild(submenu);
              submenu = null;
            }
          }, 1000);
        },
        { capture: true, once: true },
      );
      contextMenu.appendChild(openWithParent);
    }

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
    saveBtn.textContent = "💾 Saved!";
    setTimeout(() => (saveBtn.textContent = "💾 Save"), 1000);
  };

  // Autosave on change with debounce
  let triggerAutosave = () => {
    if (directions.length === 0) return; // nothing to save
    clearTimeout(autosaveTimer);
    autosaveTimer = setTimeout(() => handlesave(), AUTOSAVE_DELAY);
  };

  saveBtn.onclick = handlesave;
  // root.addEventListener("mouseup", handlesave);
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

  function readChunkAsBase64(blob) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        const base64 = arrayBufferToBase64(reader.result);
        resolve(base64);
      };
      reader.onerror = reject;
      reader.readAsArrayBuffer(blob);
    });
  }

  function fileToBase64(file) {
    // small files only
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        // Strip off "data:*/*;base64," prefix
        const base64 = reader.result.split(",")[1];
        resolve(base64);
      };
      reader.onerror = reject;
      reader.readAsDataURL(file); // reads file as base64
    });
  }

  function sleep(ms) {
    return new Promise((r) => setTimeout(r, ms));
  }

  async function uploadChunkWithRetries(path, file, index, total) {
    let attempts = 0;
    while (true) {
      try {
        const start = index * CHUNK_SIZE;
        const end = Math.min(file.size, start + CHUNK_SIZE);
        const blob = file.slice(start, end);
        const chunkBase64 = await readChunkAsBase64(blob);
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

  let notificationCounter = 0;
  fileInput.addEventListener("change", async (e) => {
    const files = [...e.target.files];
    const node = findNode(treeData, currentPath);
    if (!node || !node[1]) return;

    // Compute current used bytes from tree data
    let currentUsed = getNodeSize(treeData);

    // Filter files that would exceed quota. Skip those which would push over limit.
    const allowed = [];
    for (const f of files) {
      if (currentUsed + f.size > STORAGE_QUOTA_BYTES) {
        window.protectedGlobals.notification(
          `Cannot upload "${f.name}" — storage quota would be exceeded.`,
        );
        continue; // skip this file
      }
      currentUsed += f.size;
      allowed.push(f);
    }

    // Process allowed files
    for (const f of allowed) {
      // Add file to treeData (metadata only)
      let newName = getUniqueName(f.name);
      node[1].push([newName, null, { size: f.size }]);
      const targetPath = [...currentPath]; // current folder path array
      let cp = targetPath.join("/");

      if (f.size <= MAX_INLINE_BASE64) {
        // small file: inline as before
        const content = await fileToBase64(f);
        directions.push({
          edit: true,
          contents: content,
          path: cp + "/" + newName,
          replace: true,
        });
      } else {
        // large file: chunked upload with resume + per-chunk retries
        const total = Math.ceil(f.size / CHUNK_SIZE);

        // ensure server has a file placeholder
        await window.protectedGlobals.filePost({
          saveSnapshot: true,
          directions: [
            { addFile: true, path: cp + "/" + newName, replace: true },
            { end: true },
          ],
        });

        // Ask server which parts already exist (resume)
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

        // If all parts already present, skip part uploads and finalize
        if (presentSet.size < total) {
          for (let i = 0; i < total; i++) {
            if (presentSet.has(i)) continue; // already uploaded

            try {
              await uploadChunkWithRetries(cp + "/" + newName, f, i, total);
              uploadedCount++;
              // simple progress log — UI progress can hook into this later
              window.protectedGlobals.notificationCounter++;
              window.protectedGlobals.notification(
                `Uploading "${newName}": ${uploadedCount}/${total} chunks uploaded.`,
              );
              console.log(
                `upload progress ${newName}: ${uploadedCount}/${total}`,
              );
            } catch (err) {
              console.error(`Failed to upload chunk ${i} for ${newName}:`, err);
              window.protectedGlobals.notification(`Upload failed for "${newName}" (chunk ${i}).`);
              break; // abort this file
            }

            // allow event loop to breathe for very large files
            await sleep(0);
          }
        }

        // finalize assembly on server (safe even if all parts were already present)
        try {
          await window.protectedGlobals.filePost({
            saveSnapshot: true,
            directions: [
              { edit: true, path: cp + "/" + newName, finalize: true },
              { end: true },
            ],
          });
        } catch (e) {
          console.error("finalize failed for", newName, e);
          window.protectedGlobals.notification(`Failed to finalize upload for "${newName}".`);
        }
      }
    }

    e.target.value = ""; // reset input
    render(); // update UI
    if (allowed.length) handlesave();
  });

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


