window.taskManagerGlobals = window.taskManagerGlobals || {};
taskManagerGlobals.allTaskManagers = Array.isArray(taskManagerGlobals.allTaskManagers)
  ? taskManagerGlobals.allTaskManagers
  : [];
taskManagerGlobals.goldenbodyId = Number(taskManagerGlobals.goldenbodyId || 0);

taskManager = function (posX = 50, posY = 50) {
  if (typeof startMenu !== "undefined" && startMenu) {
    startMenu.style.display = "none";
  }

  let isMaximized = false;
  let _isMinimized = false;
  let disposed = false;
  let autoRefreshTimer = null;
  let selectedRowKey = "";
  let latestRows = [];

  try {
    atTop = "taskManager";
  } catch (e) {}

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
  root.classList.add("taskManager");
  root.dataset.appId = "taskManager";
  bringToFront(root);
  document.body.appendChild(root);

  taskManagerGlobals.goldenbodyId++;
  root._goldenbodyId = taskManagerGlobals.goldenbodyId;
  const scopedListenerName = "taskManager" + root._goldenbodyId;

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
    topBar.style.paddingTop = "14px";
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

  const applyWindowControlIcon = window.applyWindowControlIcon || function () {};
  const setWindowMaximizeIcon = window.setWindowMaximizeIcon || function () {};
  applyWindowControlIcon(btnMin, "minimize");
  setWindowMaximizeIcon(btnMax, false);
  applyWindowControlIcon(btnClose, "close");

  topBar.addEventListener("click", function () {
    bringToFront(root);
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
    root.style.height = !data.autohidetaskbar ? "calc(100% - 60px)" : "100%";
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
    savedBounds = getBounds();
    root.style.display = "none";
    _isMinimized = true;
  }

  function showWindow() {
    if (disposed) return;
    root.style.display = "flex";
    _isMinimized = false;
    bringToFront(root);
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

    const index = taskManagerGlobals.allTaskManagers.findIndex(
      (instance) => instance.rootElement === root,
    );
    if (index !== -1) taskManagerGlobals.allTaskManagers.splice(index, 1);

    if (typeof window.removeAllEventListenersForApp === "function") {
      window.removeAllEventListenersForApp(scopedListenerName);
    }
  }

  function closeAll() {
    for (const instance of [...taskManagerGlobals.allTaskManagers]) {
      if (instance && typeof instance.closeWindow === "function") {
        instance.closeWindow();
      }
    }
    taskManagerGlobals.allTaskManagers = [];
  }

  function hideAll() {
    for (const instance of taskManagerGlobals.allTaskManagers) {
      if (instance && typeof instance.hideWindow === "function") {
        instance.hideWindow();
      }
    }
  }

  function showAll() {
    taskManagerGlobals.allTaskManagers.sort(
      (a, b) => a.rootElement.style.zIndex - b.rootElement.style.zIndex,
    );
    for (const instance of taskManagerGlobals.allTaskManagers) {
      if (instance && typeof instance.showWindow === "function") {
        instance.showWindow();
      }
    }
  }

  function newWindow() {
    taskManager(50, 50);
  }

  btnMin.addEventListener("click", () => {
    hideWindow();
  });

  btnMax.addEventListener("click", () => {
    if (!isMaximized) maximizeWindow();
    else restoreWindow(true);
  });

  btnClose.addEventListener("click", closeWindow);

  makeDraggableResizable(root, dragStrip, btnMax);

  function makeDraggableResizable(el, dragTarget) {
    (function makeDraggable() {
      let dragging = false;
      let startX = 0;
      let startY = 0;
      let origLeft = 0;
      let origTop = 0;
      let currentX;
      let currentY;

      dragTarget.addEventListener("mousedown", (ev) => {
        dragging = true;
        startX = ev.clientX;
        startY = ev.clientY;
        origLeft = root.offsetLeft;
        origTop = root.offsetTop;
        currentX = ev.clientX;
        currentY = ev.clientY;
        document.body.style.userSelect = "none";
      });

      window.addEventListener(scopedListenerName, "mousemove", (ev) => {
        if (!dragging || disposed) return;
        if (ev.clientX - currentX !== 0 || ev.clientY - currentY !== 0) {
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

      window.addEventListener(scopedListenerName, "mouseup", () => {
        dragging = false;
        document.body.style.userSelect = "";
      });
    })();

    (function makeResizable() {
      const BW = 8;
      const minW = 720;
      const minH = 420;
      let active = null;

      function hitTest(e) {
        const r = el.getBoundingClientRect();
        const x = e.clientX;
        const y = e.clientY;
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
      }

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

        const dx = e.clientX - active.sx;
        const dy = e.clientY - active.sy;

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

      el.addEventListener("pointerup", () => {
        active = null;
        document.body.style.userSelect = "";
        if (getBounds().width !== "100%" && getBounds().height !== "100%") {
          savedBounds = getBounds();
        }
      });

      el.addEventListener("pointercancel", () => {
        active = null;
        document.body.style.userSelect = "";
        savedBounds = getBounds();
      });

      el.style.touchAction = "none";
    })();

    root.tabIndex = "0";
  }

  const main = document.createElement("div");
  Object.assign(main.style, {
    display: "flex",
    flexDirection: "column",
    flex: "1",
    minHeight: "0",
    padding: "16px",
    gap: "12px",
  });
  root.appendChild(main);

  const title = document.createElement("div");
  title.textContent = "Task Manager";
  title.style.fontSize = "20px";
  title.style.fontWeight = "700";
  main.appendChild(title);

  const summaryGrid = document.createElement("div");
  Object.assign(summaryGrid.style, {
    display: "grid",
    gridTemplateColumns: "repeat(5, minmax(0, 1fr))",
    gap: "8px",
    flexShrink: "0",
  });
  main.appendChild(summaryGrid);

  function createSummaryCard(label) {
    const card = document.createElement("div");
    Object.assign(card.style, {
      border: "1px solid rgba(127,127,127,0.35)",
      borderRadius: "8px",
      padding: "10px",
      display: "flex",
      flexDirection: "column",
      gap: "4px",
      minHeight: "64px",
      justifyContent: "center",
    });

    const name = document.createElement("div");
    name.textContent = label;
    name.style.fontSize = "12px";
    name.style.opacity = "0.8";

    const value = document.createElement("div");
    value.textContent = "0";
    value.style.fontSize = "22px";
    value.style.fontWeight = "700";

    card.appendChild(name);
    card.appendChild(value);
    summaryGrid.appendChild(card);

    return value;
  }

  const totalTasksValue = createSummaryCard("Total Tasks");
  const runningValue = createSummaryCard("Running");
  const idleValue = createSummaryCard("Idle");
  const unknownValue = createSummaryCard("Unknown");
  const totalInstancesValue = createSummaryCard("Total Instances");

  const controls = document.createElement("div");
  Object.assign(controls.style, {
    display: "flex",
    alignItems: "center",
    gap: "10px",
    flexWrap: "wrap",
    flexShrink: "0",
  });
  main.appendChild(controls);

  const refreshBtn = document.createElement("button");
  refreshBtn.textContent = "Refresh";

  const autoRefreshLabel = document.createElement("label");
  autoRefreshLabel.textContent = "Auto-refresh:";
  autoRefreshLabel.style.fontSize = "13px";

  const autoRefreshSelect = document.createElement("select");
  [
    { value: "0", label: "Off" },
    { value: "1", label: "1s" },
    { value: "2", label: "2s" },
    { value: "5", label: "5s" },
  ].forEach((opt) => {
    const option = document.createElement("option");
    option.value = opt.value;
    option.textContent = opt.label;
    autoRefreshSelect.appendChild(option);
  });

  const killBtn = document.createElement("button");
  killBtn.textContent = "Kill Selected";

  [refreshBtn, killBtn].forEach((btn) => {
    btn.style.padding = "6px 10px";
    btn.style.borderRadius = "6px";
    btn.style.border = "1px solid rgba(127,127,127,0.35)";
    btn.style.cursor = "pointer";
  });
  autoRefreshSelect.style.padding = "6px 8px";
  autoRefreshSelect.style.borderRadius = "6px";

  controls.appendChild(refreshBtn);
  controls.appendChild(autoRefreshLabel);
  controls.appendChild(autoRefreshSelect);
  controls.appendChild(killBtn);

  const tableWrap = document.createElement("div");
  Object.assign(tableWrap.style, {
    flex: "1",
    minHeight: "0",
    overflow: "auto",
    border: "1px solid rgba(127,127,127,0.35)",
    borderRadius: "8px",
  });
  main.appendChild(tableWrap);

  const table = document.createElement("table");
  Object.assign(table.style, {
    width: "100%",
    borderCollapse: "collapse",
    tableLayout: "fixed",
    fontSize: "13px",
  });
  tableWrap.appendChild(table);

  const thead = document.createElement("thead");
  table.appendChild(thead);

  const headerRow = document.createElement("tr");
  ["App", "Source", "Status", "Instances", "Entry/Global"].forEach((name) => {
    const th = document.createElement("th");
    th.textContent = name;
    th.style.textAlign = "left";
    th.style.padding = "9px 10px";
    th.style.position = "sticky";
    th.style.top = "0";
    th.style.zIndex = "1";
    th.style.background = "rgba(127,127,127,0.12)";
    th.style.borderBottom = "1px solid rgba(127,127,127,0.35)";
    headerRow.appendChild(th);
  });
  thead.appendChild(headerRow);

  const tbody = document.createElement("tbody");
  table.appendChild(tbody);

  const statusLine = document.createElement("div");
  statusLine.style.fontSize = "12px";
  statusLine.style.opacity = "0.9";
  statusLine.textContent = "Ready.";
  main.appendChild(statusLine);

  function setStatus(message, isError = false) {
    statusLine.textContent = message;
    statusLine.style.color = isError ? "#d9534f" : "";
  }

  function sanitizeTaskEntry(input, index) {
    const item = input && typeof input === "object" ? input : {};
    const appId = String(item.appId || item.id || item.label || "unknown-app");
    const label = String(item.label || appId);
    const entry = String(item.entry || "");
    const globalVar = String(item.globalVar || item.globalvarobject || "");
    const sourceType = String(item.sourceType || "unknown");
    const status = String(item.status || "unknown");
    const instanceCount = Number(item.instanceCount || 0);

    return {
      appId,
      label,
      entry,
      globalVar,
      sourceType,
      status,
      instanceCount: Number.isFinite(instanceCount) ? instanceCount : 0,
      rowKey: [appId, entry, globalVar, String(index)].join("::"),
    };
  }

  function flattenSnapshot(snapshot) {
    const source = snapshot && typeof snapshot === "object" ? snapshot : {};
    let rows = [];

    if (Array.isArray(source.flat) && source.flat.length > 0) {
      rows = source.flat.map((item, index) => sanitizeTaskEntry(item, index));
    } else if (source.registry && typeof source.registry === "object") {
      const flattened = [];
      const keys = Object.keys(source.registry);
      for (let i = 0; i < keys.length; i++) {
        const group = source.registry[keys[i]];
        const entries = Array.isArray(group && group.entries) ? group.entries : [];
        for (let j = 0; j < entries.length; j++) {
          flattened.push(entries[j]);
        }
      }
      rows = flattened.map((item, index) => sanitizeTaskEntry(item, index));
    }

    return rows;
  }

  function summarizeRows(snapshot, rows) {
    const provided = snapshot && snapshot.summary && typeof snapshot.summary === "object"
      ? snapshot.summary
      : null;

    if (provided) {
      return {
        totalEntries: Number(provided.totalEntries || rows.length),
        running: Number(provided.running || 0),
        idle: Number(provided.idle || 0),
        unknown: Number(provided.unknown || 0),
        totalInstances: Number(provided.totalInstances || 0),
      };
    }

    let running = 0;
    let idle = 0;
    let unknown = 0;
    let totalInstances = 0;

    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];
      totalInstances += Number(row.instanceCount || 0);
      if (row.status === "running") running++;
      else if (row.status === "idle") idle++;
      else unknown++;
    }

    return {
      totalEntries: rows.length,
      running,
      idle,
      unknown,
      totalInstances,
    };
  }

  function renderSummary(summary) {
    totalTasksValue.textContent = String(Number(summary.totalEntries || 0));
    runningValue.textContent = String(Number(summary.running || 0));
    idleValue.textContent = String(Number(summary.idle || 0));
    unknownValue.textContent = String(Number(summary.unknown || 0));
    totalInstancesValue.textContent = String(Number(summary.totalInstances || 0));
  }

  function renderRows(rows) {
    latestRows = rows;

    if (selectedRowKey && !rows.some((r) => r.rowKey === selectedRowKey)) {
      selectedRowKey = "";
    }

    tbody.innerHTML = "";

    if (!rows.length) {
      const tr = document.createElement("tr");
      const td = document.createElement("td");
      td.colSpan = 5;
      td.style.padding = "12px";
      td.style.opacity = "0.8";
      td.textContent = "No task entries available.";
      tr.appendChild(td);
      tbody.appendChild(tr);
      return;
    }

    rows.forEach((row) => {
      const tr = document.createElement("tr");
      tr.dataset.rowKey = row.rowKey;
      tr.style.cursor = "pointer";
      tr.style.borderBottom = "1px solid rgba(127,127,127,0.2)";

      if (row.rowKey === selectedRowKey) {
        tr.style.background = "rgba(127,127,127,0.18)";
      }

      const cells = [
        row.label || row.appId,
        row.sourceType,
        row.status,
        String(Number(row.instanceCount || 0)),
        row.entry && row.globalVar
          ? row.entry + " / " + row.globalVar
          : row.entry || row.globalVar || "-",
      ];

      cells.forEach((cellText, index) => {
        const td = document.createElement("td");
        td.textContent = cellText;
        td.style.padding = "8px 10px";
        td.style.overflow = "hidden";
        td.style.textOverflow = "ellipsis";
        td.style.whiteSpace = "nowrap";
        if (index === 3) td.style.textAlign = "right";
        tr.appendChild(td);
      });

      tr.addEventListener("click", () => {
        selectedRowKey = row.rowKey;
        renderRows(latestRows);
      });

      tbody.appendChild(tr);
    });
  }

  function loadSnapshot() {
    if (typeof window.getTaskManagerSnapshot !== "function") {
      return { unavailable: true, rows: [], summary: summarizeRows(null, []) };
    }

    let snapshot;
    try {
      snapshot = window.getTaskManagerSnapshot();
    } catch (e) {
      return { unavailable: true, rows: [], summary: summarizeRows(null, []) };
    }

    const rows = flattenSnapshot(snapshot);
    const summary = summarizeRows(snapshot, rows);
    return { unavailable: false, rows, summary };
  }

  function refreshSnapshot(showOkMessage = true) {
    if (disposed) return;

    const result = loadSnapshot();
    renderSummary(result.summary);
    renderRows(result.rows);

    if (result.unavailable) {
      setStatus("Task snapshot API unavailable (window.getTaskManagerSnapshot).", true);
      return;
    }

    if (showOkMessage) {
      setStatus("Snapshot refreshed at " + new Date().toLocaleTimeString() + ".");
    }
  }

  function resolveAppMetaForRow(row) {
    const apps = Array.isArray(window.apps) ? window.apps : [];
    const wanted = [row.appId, row.entry, row.globalVar, row.label]
      .filter(Boolean)
      .map((v) => String(v));

    for (let i = 0; i < apps.length; i++) {
      const app = apps[i] || {};
      const candidates = [
        app.id,
        app.entry,
        app.startbtnid,
        app.globalvarobject,
        app.label,
        app.name,
      ]
        .filter(Boolean)
        .map((v) => String(v));

      for (let j = 0; j < wanted.length; j++) {
        if (candidates.indexOf(wanted[j]) !== -1) {
          return app;
        }
      }
    }

    return null;
  }

  function getLiveInstancesFromMeta(appMeta, row) {
    function readArrayFromObjectOfArrays(globalObj, preferredKeys) {
      if (!globalObj || typeof globalObj !== "object") return [];

      const preferred = Array.isArray(preferredKeys)
        ? preferredKeys.filter(Boolean).map((v) => String(v))
        : [];

      for (let i = 0; i < preferred.length; i++) {
        const key = preferred[i];
        if (Array.isArray(globalObj[key])) {
          return globalObj[key].slice();
        }
      }

      const keys = Object.keys(globalObj);
      for (let i = 0; i < keys.length; i++) {
        if (Array.isArray(globalObj[keys[i]])) {
          return globalObj[keys[i]].slice();
        }
      }

      return [];
    }

    if (!appMeta && row && row.globalVar && window[row.globalVar]) {
      const globalObj = window[row.globalVar];
      return readArrayFromObjectOfArrays(globalObj, [
        row.entry,
        row.appId,
        row.label,
      ]);
    }

    if (!appMeta) return [];

    if (typeof window.getAppInstances === "function") {
      const list = window.getAppInstances(appMeta);
      if (Array.isArray(list)) return list.slice();
    }

    if (appMeta.globalvarobject && appMeta.allapparray) {
      try {
        const globalObj = window[appMeta.globalvarobject];
        const list = globalObj && globalObj[appMeta.allapparray];
        if (Array.isArray(list)) return list.slice();
      } catch (e) {}
    }

    if (appMeta.globalvarobject) {
      try {
        const globalObj = window[appMeta.globalvarobject];
        return readArrayFromObjectOfArrays(globalObj, [
          appMeta.allapparray,
          row && row.entry,
          row && row.appId,
          row && row.label,
        ]);
      } catch (e) {}
    }

    return [];
  }

  function removeRootsByAppHint(row, appMeta, knownInstances) {
    const hints = [
      row && row.appId,
      row && row.entry,
      appMeta && appMeta.id,
      appMeta && appMeta.entry,
      appMeta && appMeta.startbtnid,
      appMeta && appMeta.allapparray,
    ]
      .filter(Boolean)
      .map((v) => String(v));

    const removedRoots = [];
    let removed = 0;
    const roots = Array.from(document.querySelectorAll(".app-root"));
    for (let i = 0; i < roots.length; i++) {
      const el = roots[i];
      const appId = String((el.dataset && el.dataset.appId) || "");
      if (!appId || hints.indexOf(appId) === -1) continue;
      if (el === root) continue;
      try {
        removedRoots.push(el);
        el.remove();
        removed++;
      } catch (e) {}
    }

    if (removedRoots.length && typeof window.removeAllEventListenersForApp === "function") {
      for (let r = 0; r < removedRoots.length; r++) {
        const gid =
          removedRoots[r] &&
          (removedRoots[r]._goldenbodyId ||
            removedRoots[r].goldenbodyId ||
            (removedRoots[r].dataset && removedRoots[r].dataset.goldenbodyId));
        if (!gid) continue;

        for (let h = 0; h < hints.length; h++) {
          try {
            window.removeAllEventListenersForApp(String(hints[h]) + String(gid));
          } catch (e) {}
        }
      }
    }

    if (
      removedRoots.length &&
      appMeta &&
      appMeta.globalvarobject &&
      appMeta.allapparray &&
      window[appMeta.globalvarobject] &&
      Array.isArray(window[appMeta.globalvarobject][appMeta.allapparray])
    ) {
      try {
        const arr = window[appMeta.globalvarobject][appMeta.allapparray];
        const removedSet = new Set(removedRoots);
        const known = Array.isArray(knownInstances) ? knownInstances : [];
        window[appMeta.globalvarobject][appMeta.allapparray] = arr.filter((item) => {
          if (!item || typeof item !== "object") return true;
          const itemRoot = item.rootElement;
          if (itemRoot && removedSet.has(itemRoot)) return false;
          if (itemRoot && itemRoot.isConnected === false) return false;
          if (known.length && known.indexOf(item) !== -1 && itemRoot && itemRoot.isConnected === false) {
            return false;
          }
          return true;
        });
      } catch (e) {}
    }

    return removed;
  }

  function closeOneInstance(instance, appMeta, row) {
    if (!instance || typeof instance !== "object") return false;

    if (typeof instance.closeWindow === "function") {
      try {
        instance.closeWindow();
        return true;
      } catch (e) {}
    }

    if (typeof instance.close === "function") {
      try {
        instance.close();
        return true;
      } catch (e) {}
    }

    if (instance.rootElement && typeof instance.rootElement.remove === "function") {
      try {
        instance.rootElement.remove();
      } catch (e) {}

      const base =
        (appMeta && (appMeta.entry || appMeta.id || appMeta.startbtnid)) ||
        (row && (row.entry || row.appId)) ||
        "";
      const gid = instance._goldenbodyId || instance.goldenbodyId;
      if (
        base &&
        gid &&
        typeof window.removeAllEventListenersForApp === "function"
      ) {
        try {
          window.removeAllEventListenersForApp(String(base) + String(gid));
        } catch (e) {}
      }
      return true;
    }

    return false;
  }

  function killSelectedRow() {
    if (!selectedRowKey) {
      setStatus("Select a row first.", true);
      return;
    }

    const row = latestRows.find((item) => item.rowKey === selectedRowKey);
    if (!row) {
      setStatus("Selected row is no longer available.", true);
      selectedRowKey = "";
      renderRows(latestRows);
      return;
    }

    const appMeta = resolveAppMetaForRow(row);
    const instances = getLiveInstancesFromMeta(appMeta, row);
    const startingCount = instances.length;

    let attempted = 0;
    let closed = 0;
    let usedCloseAll = false;

    if (instances.length > 0) {
      const first = instances[0];
      if (first && typeof first.closeAll === "function") {
        usedCloseAll = true;
        attempted = instances.length;
        try {
          first.closeAll();
        } catch (e) {}
      } else {
        for (let i = 0; i < instances.length; i++) {
          attempted++;
          if (closeOneInstance(instances[i], appMeta, row)) {
            closed++;
          }
        }
      }
    }

    let removedRoots = 0;
    if (closed === 0) {
      removedRoots = removeRootsByAppHint(row, appMeta, instances);
      closed += removedRoots;
    }

    if (
      appMeta &&
      appMeta.globalvarobject &&
      appMeta.allapparray &&
      window[appMeta.globalvarobject] &&
      Array.isArray(window[appMeta.globalvarobject][appMeta.allapparray])
    ) {
      try {
        const arr = window[appMeta.globalvarobject][appMeta.allapparray];
        if (arr.length && closed >= arr.length) {
          window[appMeta.globalvarobject][appMeta.allapparray] = [];
        }
      } catch (e) {}
    }

    if (typeof window.removeAllEventListenersForApp === "function") {
      const prefixes = [
        row.appId,
        row.entry,
        appMeta && appMeta.entry,
        appMeta && appMeta.id,
        appMeta && appMeta.startbtnid,
      ].filter(Boolean);

      for (let p = 0; p < prefixes.length; p++) {
        const base = String(prefixes[p]);
        for (let i = 0; i < instances.length; i++) {
          const gid = instances[i] && (instances[i]._goldenbodyId || instances[i].goldenbodyId);
          if (!gid) continue;
          try {
            window.removeAllEventListenersForApp(base + String(gid));
          } catch (e) {}
        }
      }
    }

    refreshSnapshot(false);
    const remainingInstances = getLiveInstancesFromMeta(appMeta, row);
    const remainingCount = remainingInstances.length;
    if (startingCount > 0) {
      attempted = Math.max(attempted, startingCount);
      closed = Math.max(closed, startingCount - remainingCount);
    } else if (usedCloseAll) {
      closed = Math.max(0, attempted - remainingCount);
    }

    if (closed > 0) {
      setStatus(
        "Kill completed for '" + row.label + "' (closed " + closed + ", attempted " + attempted + ").",
      );
    } else {
      setStatus("No closeable instances found for '" + row.label + "'.", true);
    }
  }

  function applyAutoRefreshFromUI() {
    clearAutoRefresh();

    const sec = Number(autoRefreshSelect.value || 0);
    if (!Number.isFinite(sec) || sec <= 0) {
      setStatus("Auto-refresh disabled.");
      return;
    }

    autoRefreshTimer = setInterval(() => {
      refreshSnapshot(false);
    }, sec * 1000);
    setStatus("Auto-refresh every " + sec + "s enabled.");
  }

  refreshBtn.addEventListener("click", () => refreshSnapshot(true));
  killBtn.addEventListener("click", killSelectedRow);
  autoRefreshSelect.addEventListener("change", applyAutoRefreshFromUI);

  window.addEventListener(scopedListenerName, "appUpdated", () => {
    refreshSnapshot(false);
  });

  taskManagerGlobals.allTaskManagers.push({
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

  refreshSnapshot(false);
  setStatus("Ready.");

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
