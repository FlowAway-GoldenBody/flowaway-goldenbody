//explorer global vars
  let allExplorers = [];
  let explorerId = 0;
  let clipboard = {
    item: null, // tree node reference
    path: null, // full path string
  };
fileExplorer = function (posX = 50, posY = 50) {
    let isMaximized = false;
    let _isMinimized = false;
    atTop = "fileExplorer";
    const root = document.createElement("div");
    root.className = "sim-explorer-root";
    Object.assign(root.style, {
      position: "fixed",
      top: posY + "px",
      left: posX + "px",
      width: "1000px",
      height: "640px",
      boxShadow: "0 12px 40px rgba(0,0,0,0.35)",
      borderRadius: "10px",
      overflow: "hidden",
      background: "#f0f0f0",
      display: "flex",
      flexDirection: "column",
      fontFamily: "sans-serif",
      zIndex: 1000,
    });

    bringToFront(root);
    document.body.appendChild(root);
    explorerId++;
    root._explorerId = explorerId;

    // --- Top bar ---
    var topBar = false;
    if (!topBar) {
      topBar = document.createElement("div");
      topBar.className = "browserTopBar";
      topBar.style.display = "flex";
      topBar.style.justifyContent = "flex-end";
      topBar.style.alignItems = "center";
      topBar.style.padding = "2px";
      topBar.style.marginTop = "3px";
      topBar.style.background = "#ccc";
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
    dragStrip.style.cursor = 'move';
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
    btnMin.innerText = "‎    –    ‎";
    btnMin.title = "Minimize";
    topBar.appendChild(btnMin);

    var btnMax = document.createElement("button");
    btnMax.innerText = "‎     □    ‎ ";
    btnMax.style.fontSize = "20px";
    btnMax.title = "Maximize/Restore";
    topBar.appendChild(btnMax);

    var btnClose = document.createElement("button");
    btnClose.innerText = "‎     x    ‎ ";
    btnClose.title = "Close";
    btnClose.style.color = "white";
    btnClose.style.backgroundColor = "red";
    topBar.appendChild(btnClose);

    [topBar, btnMin, btnMax, btnClose].forEach((el) => {
      el.style.margin = "0 2px";
      el.style.border = "none";
      el.style.padding = "2px 5px";
      el.style.fontSize = "14px";
      el.style.cursor = "pointer";
    });
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

    // Minimize
    btnMin.addEventListener("click", () => {
      savedBounds = getBounds();
      root.style.display = "none";
      _isMinimized = true;
    });

    // Maximize / Restore
    btnMax.addEventListener("click", () => {
      if (!isMaximized) {
        savedBounds = getBounds();
        root.style.left = "0";
        root.style.top = "0";
        root.style.width = "100%";
        root.style.height = `calc(100% - 60px)`;
        btnMax.textContent = "‎ ⧉ ‎";
        isMaximized = true;
        _isMinimized = false;
      } else {
        applyBounds(savedBounds);
        btnMax.textContent = "‎ □ ‎";
        isMaximized = false;
      }
    });

    // Close
    btnClose.addEventListener("click", () => {
      root.remove();
      let index = false;
      for (let i = 0; i < allExplorers.length; i++) {
        if (allExplorers[i].rootElement == root) {
          index = i;
        }
      }
      if (index !== false) allExplorers.splice(index, 1);
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
          if (ev.clientX - currentX > 1 || ev.clientY - currentY > 1) {
            applyBounds(savedBounds);
            if (isMaximized) {
              root.style.left = ev.clientX - root.clientWidth / 2 + "px";
              origLeft = ev.clientX - root.clientWidth / 2;
              btnMax.textContent = "‎     □     ‎";
              isMaximized = false;
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
          isMaximized = false;
          btnMax.textContent = "‎     □    ‎ ";
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

      let selectedItem = null; // single right-click selection
      let selectedItems = []; // array for multi-select / drag & drop
      let dragItems = []; // temporary array for drag operation
      let directions = [];

      // --- CONFIG ---
      const username = data[0];
      let currentPath = ["root"];

      // --- UTILS ---
      async function post(data) {
        const res = await fetch(SERVER, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ username, ...data }),
        });
        return res.json();
      }

      function getCurrentFolderPath() {
        return (
          currentPath.slice(1).join("/") + (currentPath.length > 1 ? "/" : "")
        );
      }

      // --- ELEMENTS ---
      const container = document.createElement("div");
      container.style.display = "flex";
      container.style.height = "100%";
      container.style.background = "#f4f4f4";
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
      text.textContent = data[0];
      sidebar.appendChild(text);
      sidebar.appendChild(document.createElement("br"));

      const uploadBtn = document.createElement("button");
      uploadBtn.textContent = "⬆ Upload";
      sidebar.appendChild(uploadBtn);

      const homeBtn = document.createElement("button");
      homeBtn.textContent = "🏠 Home";
      sidebar.appendChild(homeBtn);

      const saveBtn = document.createElement("button");
      saveBtn.textContent = "💾 Save";
      sidebar.appendChild(saveBtn);

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
      contextMenu.style.background = "white";
      contextMenu.style.border = "1px solid #ccc";
      contextMenu.style.display = "none";
      contextMenu.style.zIndex = "1000";
      root.appendChild(contextMenu);

      fileArea.oncontextmenu = (e) => {
        e.preventDefault();

        // If right-clicked on a file/folder row, let that handler run
        const row = e.target.closest("[data-fs-item]");
        if (row) return;

        // Blank area
        selectedItem = null;
        showContextMenu(e.clientX, e.clientY, false, true);
      };

      // --- RENDER ---
      window.loadTree = async function () {
        const data = await post({ initFE: true });
        treeData = data.tree;
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
  render();
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
          if(item[0] == '.DS_Store') return;
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

          // Highlight selected
          if (selectedItems.includes(item)) div.style.background = "#d0e6ff";

          // Click selection
          div.onclick = (e) => handleSelection(e, item, node[1], index);

          // Double-click folder open
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
            e.dataTransfer.setData(
              "application/json",
              JSON.stringify(dragData),
            );

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

      function render() {
        renderBreadcrumbs();
        renderFiles();
        hideContextMenu();
      }
      // --- CREATE FOLDER ---
      function getUniqueName(base, ext = "") {
        const node = findNode(treeData, currentPath);
        if (!node || !node[1]) return base + ext;

        const existing = node[1].map((i) => i[0]);
        let name = base + ext;
        let i = 1;

        while (existing.includes(name)) {
          name = `(${i}) ${base}`;
          i++;
        }
        return name;
      }
      async function createFolder() {
        const folderName = getUniqueName("New Folder");
        const node = findNode(treeData, currentPath);
        if (!node || !node[1]) return;

        // Add new folder with empty children
        node[1].push([folderName, []]);
        render();
        const targetPath = [...currentPath]; // current folder path array
        directions.push({addFolder: true, path: targetPath.join("/"), name: folderName});
      }

      async function createFile() {
        const fileName = getUniqueName("New File.txt");
        const node = findNode(treeData, currentPath);
        if (!node || !node[1]) return;

        // Add new file with empty content object
        node[1].push([fileName, null, { size: 0 }]);
        render();
        const targetPath = [...currentPath]; // current folder path array
        directions.push({addFile: true, path: targetPath.join("/") + '/' + fileName});
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

      // Deselect when clicking outside file items
      document.addEventListener("click", (e) => {
        // Ignore clicks inside the context menu
        if (contextMenu.contains(e.target)) return;

        // Check if the click is inside any file/folder div
        const isClickInsideFile = e.target.closest('[data-fs-item="true"]');
        if (!isClickInsideFile) {
          selectedItems = [];
          selectedItem = null;
          render();
        }
      });
      function getFullPathFromNode(node, pathArray = []) {
        if (!node) return pathArray.join("/");
        pathArray.push(node[0]);
        return pathArray.join("/");
      }
      let handlepaste = (e) => {
        if((e.ctrlKey && e.key.toLowerCase() === 'v') || e == 'cmp') {
        const targetPath = [...currentPath]; // current folder path array

        for (const item of clipboard) {
          const sourceFullPath = getFullPathFromNode(item.node, []); // e.g., "FolderA"
          const targetFullPath = targetPath.join("/"); // e.g., "FolderA/Sub"

          // ❌ Prevent circular paste
          if (
            item.isFolder &&
            targetFullPath.startsWith(sourceFullPath + "/")
          ) {
            alert(
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
        directions.push({paste: true, path: targetPath.join("/")})
        handlesave();
        render();
        }
      };
      let handlecopy = (e) => {
        if((e.ctrlKey && e.key.toLowerCase() === 'c') || e == 'copy') {
        clipboard = selectedItems.map((item) => ({
          node: item,
          path: getCurrentFolderPath() + item[0],
          name: item[0],
          isFolder: Array.isArray(item[1]),
          isCut: false,
        }));
        const targetPath = [...currentPath]; // current folder path array
        let predirections = [];
        targetPath.splice(0, 1);
        for(let i = 0; i < clipboard.length; i++) {
          if(targetPath.length !== 0)
          predirections.push({path: targetPath.join("/") + '/' + clipboard[i].name});
          else
          predirections.push({path: clipboard[i].name});
        }
        directions.push({copy: true, directions: predirections});
      }
      }
      root.addEventListener('keydown', handlepaste);
      root.addEventListener('keydown', handlecopy);
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
          div.style.color = disabled ? "#999" : "#000";

          if (!disabled) {
            div.onmouseenter = () => (div.style.background = "#eee");
            div.onmouseleave = () => (div.style.background = "white");
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

        // Delete for multi-select
        if (!isBlank && selectedItems.length) {
          addItem("Delete", () => {
            const targetPath = [...currentPath]; // current folder path array
            for (const item of selectedItems) {
              directions.push({delete: true, path: targetPath.join("/") + '/' + item[0]});
              const name = item[0]; // "New Folder"
const deletePath = [...currentPath.slice(1), item[0]]; 
// slice(1) removes "root" if treeData is the root node
removeNodeFromTree(treeData, deletePath);

            }
            selectedItems = [];
            selectedItem = null;
            render();
          });
        }

        // Rename only if single item is selected
        if (!isBlank && selectedItem && selectedItems.length <= 1) {
          addItem("Rename", () => {
            const oldName = selectedItem[0];

            const items = [...fileArea.children];
            const row = items.find(
              (r) =>
                r.querySelector("div:nth-child(2)").textContent === oldName,
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
              if(newName.includes('.') && selectedItem[1]) {
                newName = '"." is not allowed in folder names!'; 
              }
              for(let i = 0; i < fileArea.children.length; i++) {
                if(fileArea.children[i].children[1].textContent === newName)
                newName = getUniqueName(newName);
              }

              // Update treeData locally
              selectedItem[0] = newName;

              // If part of a folder, also update the tree node's reference
              const node = findNode(treeData, currentPath);
              if (node && node[1]) {
                const child = node[1].find((c) => c === selectedItem);
                if (child) child[0] = newName;
              }

              render();
            const targetPath = [...currentPath]; // current folder path array
            directions.push({rename: true, path: targetPath.join("/") + '/' + oldName, newName: newName});
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
          addItem("Copy", () => handlecopy('copy'));
        }

        if (isBlank && clipboard.length) {
          addItem("Paste", () => handlepaste('cmp'));
        }

        contextMenu.style.left = x + "px";
        contextMenu.style.top = y + "px";
        contextMenu.style.display = "block";
      }

      function hideContextMenu() {
        contextMenu.style.display = "none";
      }
      document.addEventListener("click", hideContextMenu);

      // --- BUTTONS ---
      uploadBtn.onclick = () => fileInput.click();
      homeBtn.onclick = () => {
        currentPath = ["root"];
        render();
      };
      let handlesave = async (e) => {
        // console.log(directions);
        await post({
          saveSnapshot: true,
          directions: directions
        });
        let found = false;
        for(let i = directions.length - 1; i >= 0; i--) {
          if(!directions[i].copy) directions.splice(i, 1);
          else {if(found){directions.splice(i, 1);} else{found = true;}}
        }
        saveBtn.textContent = "💾 Saved!";
        setTimeout(() => (saveBtn.textContent = "💾 Save"), 1000);
      };
      saveBtn.onclick = handlesave;
      // root.addEventListener("mouseup", handlesave);
      function fileToBase64(file) {
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

      fileInput.addEventListener("change", async (e) => {
        const files = [...e.target.files];
        const node = findNode(treeData, currentPath);
        if (!node || !node[1]) return;

        for (const f of files) {
          const content = await fileToBase64(f); // Base64 string

          // Add file to treeData
          let newName = getUniqueName(f.name);
          node[1].push([newName, null, { size: f.size }]);
          const targetPath = [...currentPath]; // current folder path array
          let cp = targetPath.join("/");
          directions.push({edit: true, contents: content, path: cp+'/'+newName});
        }

        e.target.value = ""; // reset input
        render(); // update UI
        handlesave();
      });

      // --- INIT ---
      loadTree();

      allExplorers.push({
        rootElement: root,
        btnMax,
        _isMinimized,
        isMaximized,
        getBounds,
        applyBounds,
        explorerId,
      });
      return {
        rootElement: root,
        btnMax,
        _isMinimized,
        isMaximized,
        getBounds,
        applyBounds,
        explorerId,
      };
    }
  }








  //app stuff
  let explorerButtons = [];
  let explorermenu;
  function fileExplorerContextMenu(e, needRemove = true) {
    e.preventDefault();

    // Remove any existing menus
    document.querySelectorAll(".explorer-menu").forEach((m) => m.remove());

    const menu = document.createElement("div");
    explorermenu = menu;
    try {
      browsermenu.remove();
      browsermenu = null;
    } catch (e) {}
    menu.className = "explorer-menu";
    Object.assign(menu.style, {
      position: "fixed",
      left: `${e.clientX}px`,
      background: "#fff",
      border: "1px solid #ccc",
      borderRadius: "4px",
      boxShadow: "0 2px 6px rgba(0,0,0,0.2)",
      zIndex: 9999999,
      padding: "4px 0",
      minWidth: "160px",
      fontSize: "13px",
      visibility: "hidden", // hide temporarily so offsetHeight works
    });

    // --- Menu items ---
    const closeAll = document.createElement("div");
    closeAll.textContent = "Close all";
    closeAll.style.padding = "6px 10px";
    closeAll.style.cursor = "pointer";
    closeAll.addEventListener("click", () => {
      for (const i of allExplorers) {
        i.rootElement.remove();
      }

      allExplorers = [];
      menu.remove();
    });
    menu.appendChild(closeAll);

    const hideAll = document.createElement("div");
    hideAll.textContent = "Hide all";
    hideAll.style.padding = "6px 10px";
    hideAll.style.cursor = "pointer";
    hideAll.addEventListener("click", () => {
      for (const i of allExplorers) {
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
      for (const i of allExplorers) {
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
      fileExplorer("/", 50, 50);
      menu.remove();
    });
    menu.appendChild(newWindow);
    if (needRemove) {
      const remove = document.createElement("div");
      remove.textContent = "Remove from taskbar";
      remove.style.padding = "6px 10px";
      remove.style.cursor = "pointer";
      remove.addEventListener("click", () => {
        // Remove the explorer’s taskbar button if it exists
        save();
        for (let i = taskbuttons.length; i > 0; i--) {
          i--;
          let index = parseInt(getStringAfterChar(e.target.id, "-"));
          if (
            index === parseInt(getStringAfterChar(taskbuttons[i].id, "-")) &&
            taskbuttons[i].id.startsWith("🗂")
          ) {
            taskbuttons[i].remove();
            iconid = 0;
            let newtb = [];
            for (const a of taskbuttons) {
              a.id = Array.from(a.id)[0] + "-" + iconid;
              iconid++;
              if (Array.from(a.id)[0] !== "▶") {
                newtb.push(a);
              } else {
                a.id = Array.from(a.id)[0];
                newtb.push(a);
                iconid--;
              }
            }
            break;
          }
          i++;
        }
        menu.remove();
      });
      menu.appendChild(remove);
    } else {
      const add = document.createElement("div");
      add.textContent = "Add to taskbar";
      add.style.padding = "6px 10px";
      add.style.cursor = "pointer";
      add.addEventListener("click", function () {
        let explorerButton = addTaskButton("🗂", fileExplorer);
        save();
        purgeButtons();
        for (const fb of explorerButtons) {
          fb.addEventListener("contextmenu", fileExplorerContextMenu);
        }
      });
      menu.appendChild(add);
    }
    const barrier = document.createElement("hr");
    menu.appendChild(barrier);

    if (allExplorers.length === 0) {
      const item = document.createElement("div");
      item.textContent = "No open windows";
      item.style.padding = "6px 10px";
      menu.appendChild(item);
    } else {
      allExplorers.forEach((instance, i) => {
        const item = document.createElement("div");
        item.textContent = instance.title || `Explorer ${i + 1}`;

        Object.assign(item.style, {
            padding: "6px 10px",
            cursor: "pointer",
            maxWidth: "185px",

            whiteSpace: "nowrap",      // ⬅️ prevent wrapping
            overflow: "hidden",        // ⬅️ hide overflow
            textOverflow: "ellipsis",  // ⬅️ show …
        });


        item.addEventListener("click", () => {
          // Bring to front
          bringToFront(instance);

          // Unminimize if hidden
          if (instance.style.display === "none") {
            instance.style.display = "flex";
            instance._isMinimized = false;
            instance.isMaximized = false;
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
  }

  function ehl1(e) {
    fileExplorerContextMenu(e, (needremove = false));
  }
  let ebtn = document.getElementById("explorerapp");
  ebtn.addEventListener("click", function () {
    fileExplorer();
  });
  ebtn.addEventListener("contextmenu", ehl1);
  sysScript.addEventListener('load', () => {
    for (const explorerButton of explorerButtons) {
    explorerButton.addEventListener("contextmenu", fileExplorerContextMenu);
  }});