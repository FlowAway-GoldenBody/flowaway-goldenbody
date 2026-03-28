//textEditor global vars
window.textEditorGlobals = {};
textEditorGlobals.alltextEditor = [];
textEditorGlobals.goldenbodyId = 0;
textEditorGlobals.settingsPath = "/apps/textEditor/data/settings.json";
textEditorGlobals.editorSettings = {
  fontSize: 14,
  tabSize: 2,
  autosave: false,
};
textEditorGlobals.settingsLoadPromise = null;
textEditorGlobals.__textEditorStyle = document.createElement("style");
textEditorGlobals.__textEditorStyle.textContent = `
.texteditor-topbar.dark{
  background: #111;
  color: #eee;
}
.texteditor-topbar.light {
  background: #fafafa;
  color: #000;
}
`;
document.head.appendChild(textEditorGlobals.__textEditorStyle);

function normalizeTextEditorSettings(value) {
  const base = {
    fontSize: 14,
    tabSize: 2,
    autosave: false,
  };
  if (!value || typeof value !== "object") return base;
  const parsedFontSize = Number(value.fontSize);
  const parsedTabSize = Number(value.tabSize);
  return {
    fontSize:
      Number.isFinite(parsedFontSize) && parsedFontSize >= 8 && parsedFontSize <= 48
        ? parsedFontSize
        : base.fontSize,
    tabSize:
      Number.isFinite(parsedTabSize) && parsedTabSize >= 1 && parsedTabSize <= 8
        ? parsedTabSize
        : base.tabSize,
    autosave: !!value.autosave,
  };
}

function decodeMaybeBase64Text(raw) {
  const text = String(raw || "").trim();
  if (!text) return "";
  const looksLikeBase64 = /^[A-Za-z0-9+/]+={0,2}$/.test(text) && text.length % 4 === 0;
  if (!looksLikeBase64) return text;
  try {
    return atob(text);
  } catch (e) {
    return text;
  }
}

async function loadTextEditorSettings(forceRefresh = false) {
  if (!forceRefresh && textEditorGlobals.settingsLoadPromise) {
    return textEditorGlobals.settingsLoadPromise;
  }

  textEditorGlobals.settingsLoadPromise = (async () => {
    try {
      let raw = "";
      if (typeof ReadFile === "function") {
        const res = await ReadFile(textEditorGlobals.settingsPath);
        if (res && !res.missing) {
          if (typeof res.filecontent === "string") raw = decodeMaybeBase64Text(res.filecontent);
          else if (typeof res === "string") raw = decodeMaybeBase64Text(res);
        }
      } else if (typeof readFile === "function") {
        raw = decodeMaybeBase64Text(readFile(textEditorGlobals.settingsPath));
      }

      if (raw) {
        textEditorGlobals.editorSettings = normalizeTextEditorSettings(JSON.parse(raw));
      }
    } catch (e) {
      textEditorGlobals.editorSettings = normalizeTextEditorSettings(textEditorGlobals.editorSettings);
    }
    return textEditorGlobals.editorSettings;
  })();

  return textEditorGlobals.settingsLoadPromise;
}

async function saveTextEditorSettings(settings) {
  const normalized = normalizeTextEditorSettings(settings);
  textEditorGlobals.editorSettings = normalized;
  textEditorGlobals.settingsLoadPromise = Promise.resolve(normalized);
  const content = btoa(JSON.stringify(normalized, null, 2));

  if (typeof WriteFile === "function") {
    await WriteFile(textEditorGlobals.settingsPath, content, { replace: true });
    return;
  }
  if (typeof filePost === "function") {
    await filePost({
      saveSnapshot: true,
      directions: [
        { edit: true, path: textEditorGlobals.settingsPath, contents: content, replace: true },
        { end: true },
      ],
    });
  }
}

function getTextEditorSettings() {
  return normalizeTextEditorSettings(textEditorGlobals.editorSettings);
}

textEditor = function (path, posX = 50, posY = 50) {
  let hasFileOpen = false;
  let editorName;

  if (!window.treeData) {
    window.onlyloadTree();
  }
  startMenu.style.display = "none";
  let isMaximized = false;
  let _isMinimized = false;
  atTop = "textEditor";
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
  root.classList.add("textEditor");
  root.dataset.appId = "textEditor";
  bringToFront(root);
  document.body.appendChild(root);
  textEditorGlobals.goldenbodyId++;
  root._goldenbodyId = textEditorGlobals.goldenbodyId;

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
    const index = textEditorGlobals.alltextEditor.findIndex(
      (instance) => instance.rootElement == root,
    );
    if (index !== -1) textEditorGlobals.alltextEditor.splice(index, 1);
    window.removeAllEventListenersForApp("textEditor" + root._goldenbodyId);
  }

  function hideWindow() {
    savedBounds = getBounds();
    root.style.display = "none";
    _isMinimized = true;
  }

  function showWindow() {
    root.style.display = "flex";
    _isMinimized = false;
    bringToFront(root);
  }

  function closeAll() {
    for (const instance of [...textEditorGlobals.alltextEditor]) {
      if (instance && typeof instance.closeWindow === "function") {
        instance.closeWindow();
      }
    }
    textEditorGlobals.alltextEditor = [];
  }

  function hideAll() {
    for (const instance of textEditorGlobals.alltextEditor) {
      if (instance && typeof instance.hideWindow === "function") {
        instance.hideWindow();
      }
    }
  }

  function showAll() {
    textEditorGlobals.alltextEditor.sort(
      (a, b) => a.rootElement.style.zIndex - b.rootElement.style.zIndex,
    );
    for (const instance of textEditorGlobals.alltextEditor) {
      if (instance && typeof instance.showWindow === "function") {
        instance.showWindow();
      }
    }
  }

  function newWindow() {
    textEditor(50, 50);
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

      window.addEventListener("textEditor" + root._goldenbodyId, "mousemove", (ev) => {
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

      window.addEventListener("textEditor" + root._goldenbodyId, "mouseup", () => {
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
  
  // --- EVENT LISTENER ---
  // Listen to clicks on the text editor for any app-specific handlers
  document.addEventListener("textEditor" + root._goldenbodyId, "click", (e) => {
    // App-specific click handler can be implemented here
  });
  
  // --- Editor toolbar + content area (polished) ---
  const contentWrap = document.createElement("div");
  Object.assign(contentWrap.style, {
    flex: "1 1 auto",
    display: "flex",
    flexDirection: "column",
    padding: "10px",
    boxSizing: "border-box",
    overflow: "hidden",
  });

  // Toolbar
  const toolbar = document.createElement("div");
  Object.assign(toolbar.style, {
    display: "flex",
    alignItems: "center",
    gap: "8px",
    padding: "6px 8px",
    borderBottom: "1px solid rgba(0,0,0,0.06)",
  });
  toolbar.className = "texteditor-topbar";
  root.addEventListener("styleapplied", () => {
    toolbar.classList.toggle("dark", data.dark);
    toolbar.classList.toggle("light", !data.dark);
  });
  // Title: prefer editorName (if set) then path then fallback
  const titleLabel = document.createElement("div");
  const visibleName = `Untitled text`;
  titleLabel.textContent = visibleName;
  Object.assign(titleLabel.style, { fontWeight: "600", fontSize: "14px" });

  const newBtn = document.createElement("button");
  newBtn.textContent = "New";
  newBtn.title = "New file";
  newBtn.style.padding = "6px 10px";
  newBtn.style.cursor = "pointer";

  const openBtn = document.createElement("button");
  openBtn.textContent = "Open...";
  openBtn.title = "Open local file";
  openBtn.style.padding = "6px 10px";
  openBtn.style.cursor = "pointer";

  const spacer = document.createElement("div");
  spacer.style.flex = "1";

  const revertBtn = document.createElement("button");
  revertBtn.textContent = "Revert";
  revertBtn.disabled = true;
  revertBtn.title = "Revert to last saved";
  revertBtn.style.padding = "6px 10px";
  revertBtn.style.cursor = "pointer";

  const saveBtn = document.createElement("button");
  saveBtn.textContent = "Save";
  saveBtn.disabled = true;
  saveBtn.title = "Save (Ctrl/Cmd+S)";
  saveBtn.style.padding = "6px 10px";
  saveBtn.style.cursor = "pointer";

  toolbar.appendChild(titleLabel);
  toolbar.appendChild(newBtn);
  toolbar.appendChild(openBtn);
  toolbar.appendChild(spacer);
  toolbar.appendChild(revertBtn);
  toolbar.appendChild(saveBtn);

  // Editor Settings button (opens a small panel; Cancel / Apply; click outside closes)
  const editorSettingsBtn = document.createElement("button");
  editorSettingsBtn.textContent = "Editor Settings";
  editorSettingsBtn.title = "Text editor settings";
  editorSettingsBtn.style.padding = "6px 10px";
  editorSettingsBtn.style.cursor = "pointer";
  toolbar.appendChild(editorSettingsBtn);

  editorSettingsBtn.addEventListener("click", async () => {
    if (document.querySelector(".texteditor-settings-overlay")) return; // already open
    await loadTextEditorSettings();
    const currentSettings = getTextEditorSettings();

    // overlay
    const overlay = document.createElement("div");
    overlay.className = "texteditor-settings-overlay";
    Object.assign(overlay.style, {
      position: "fixed",
      top: "0",
      left: "0",
      right: "0",
      bottom: "0",
      background: "rgba(0,0,0,0.25)",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      zIndex: 99999999,
    });
    document.body.appendChild(overlay);

    // panel
    const panel = document.createElement("div");
    Object.assign(panel.style, {
      width: "360px",
      padding: "12px",
      borderRadius: "8px",
      background: data && data.dark ? "#222" : "#fff",
      boxShadow: "0 8px 30px rgba(0,0,0,0.2)",
      display: "flex",
      flexDirection: "column",
      gap: "8px",
    });
    overlay.appendChild(panel);

    // controls (match settings.js logic)
    const fontLabel = document.createElement("div");
    fontLabel.textContent = "Font size (px)";
    const fontInput = document.createElement("input");
    fontInput.type = "number";
    fontInput.min = 8;
    fontInput.max = 48;
    fontInput.style.width = "100px";
    fontInput.value =
      currentSettings.fontSize || parseInt(textarea.style.fontSize) || 14;

    const tabLabel = document.createElement("div");
    tabLabel.textContent = "Tab size (spaces)";
    const tabInput = document.createElement("input");
    tabInput.type = "number";
    tabInput.min = 1;
    tabInput.max = 8;
    tabInput.style.width = "100px";
    tabInput.value = currentSettings.tabSize || 2;

    const autosaveRow = document.createElement("div");
    autosaveRow.style.display = "flex";
    autosaveRow.style.alignItems = "center";
    const autosave = document.createElement("input");
    autosave.type = "checkbox";
    autosave.checked = !!currentSettings.autosave;
    const autosaveLabel = document.createElement("span");
    autosaveLabel.textContent = " Autosave";

    autosaveRow.appendChild(autosave);
    autosaveRow.appendChild(autosaveLabel);

    // buttons
    const btnRow = document.createElement("div");
    btnRow.style.display = "flex";
    btnRow.style.justifyContent = "flex-end";
    btnRow.style.gap = "8px";
    const btnCancel = document.createElement("button");
    btnCancel.textContent = "Cancel";
    const btnApply = document.createElement("button");
    btnApply.textContent = "Apply";

    btnRow.appendChild(btnCancel);
    btnRow.appendChild(btnApply);

    panel.appendChild(fontLabel);
    panel.appendChild(fontInput);
    panel.appendChild(tabLabel);
    panel.appendChild(tabInput);
    panel.appendChild(autosaveRow);
    panel.appendChild(btnRow);

    // Cancel handler
    btnCancel.addEventListener("click", () => {
      overlay.remove();
    });

    // click outside to close
    overlay.addEventListener("click", (ev) => {
      if (ev.target === overlay) overlay.remove();
    });

    // Apply handler - keep existing server logic (filePost) as in settings.js
    btnApply.addEventListener("click", async () => {
      const newSettings = {
        fontSize: Number(fontInput.value),
        tabSize: Number(tabInput.value),
        autosave: !!autosave.checked,
      };

      const normalized = normalizeTextEditorSettings(newSettings);

      // update local settings and save to app file
      try {
        await saveTextEditorSettings(normalized);
      } catch (e) {
        console.warn("Failed to save editor settings", e);
      }

      // apply locally
      textEditorGlobals.editorSettings = normalized;
      window.editorSettings = normalized;
      try {
        // update this editor's textarea
        textarea.style.fontSize = (normalized.fontSize || 14) + "px";
      } catch (e) {}

      // keep parity with settings.js: update any open editors if available
      try {
        if (Array.isArray(textEditorGlobals.alltextEditor)) {
          for (const inst of textEditorGlobals.alltextEditor) {
            try {
              if (inst && inst.rootElement) {
                const ta =
                  inst.rootElement.querySelector &&
                  inst.rootElement.querySelector(".texteditor-area");
                if (ta) ta.style.fontSize = (normalized.fontSize || 14) + "px";
              }
            } catch (e) {}
          }
        }
      } catch (e) {}

      overlay.remove();
    });
  });
  // Editor
  const textarea = document.createElement("textarea");
  textarea.className = "texteditor-area";
  textarea.setAttribute("aria-label", titleLabel.textContent);
  Object.assign(textarea.style, {
    flex: "1 1 auto",
    width: "100%",
    resize: "none",
    display: "none",
    outline: "none",
    border:
      data && data.dark
        ? "1px solid rgba(255,255,255,0.06)"
        : "1px solid rgba(0,0,0,0.08)",
    borderRadius: "6px",
    padding: "12px",
    boxSizing: "border-box",
    fontFamily:
      'ui-monospace, SFMono-Regular, Menlo, Monaco, "Roboto Mono", monospace',
    fontSize: getTextEditorSettings().fontSize + "px",
    lineHeight: "1.5",
    background: data && data.dark ? "#0f1724" : "white",
    color: data && data.dark ? "#e6eef8" : "#0f1724",
    caretColor: "#06f",
  });

  // Status bar (words/chars/lines/position)
  const statusBar = document.createElement("div");
  Object.assign(statusBar.style, {
    height: "24px",
    flex: "0 0 auto",
    display: "flex",
    gap: "12px",
    alignItems: "center",
    fontSize: "12px",
    color: data && data.dark ? "#9fb0c8" : "#556",
    paddingTop: "6px",
  });

  const statWords = document.createElement("div");
  const statChars = document.createElement("div");
  const statLines = document.createElement("div");
  const statPos = document.createElement("div");
  statWords.textContent = "Words: 0";
  statChars.textContent = "Chars: 0";
  statLines.textContent = "Lines: 1";
  statPos.textContent = "Ln 1, Col 1";

  statusBar.appendChild(statWords);
  statusBar.appendChild(statChars);
  statusBar.appendChild(statLines);
  statusBar.appendChild(statPos);

  loadTextEditorSettings()
    .then((settings) => {
      try {
        const normalized = normalizeTextEditorSettings(settings);
        textEditorGlobals.editorSettings = normalized;
        textarea.style.fontSize = (normalized.fontSize || 14) + "px";
      } catch (e) {}
    })
    .catch(() => {});

  // assemble
  contentWrap.appendChild(toolbar);
  contentWrap.appendChild(textarea);
  contentWrap.appendChild(statusBar);
  root.appendChild(contentWrap);

  // Save-as dialog (defined here so New/Save can reuse it)
  function openEditorSaveUI() {
    if (!window.treeData) {
      try {
        window.onlyloadTree();
      } catch (e) {}
    }

    let pickerTree = JSON.parse(JSON.stringify(window.treeData || {}));
    let pickerCurrentPath = ["root"];
    let pickerSelection = [];
    let pickerOverlay = document.createElement("div");

    Object.assign(pickerOverlay.style, {
      position: "fixed",
      top: "0",
      left: "0",
      right: "0",
      bottom: "0",
      background: "rgba(0,0,0,0.4)",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      zIndex: 99999999,
    });
    document.body.appendChild(pickerOverlay);

    const pickerBox = document.createElement("div");
    Object.assign(pickerBox.style, {
      width: "680px",
      height: "460px",
      borderRadius: "8px",
      background: data && data.dark ? "#222" : "#fff",
      display: "flex",
      flexDirection: "column",
      overflow: "hidden",
    });
    pickerOverlay.appendChild(pickerBox);

    const breadcrumbDiv = document.createElement("div");
    breadcrumbDiv.style.padding = "6px";
    pickerBox.appendChild(breadcrumbDiv);

    const fileArea = document.createElement("div");
    fileArea.style.flex = "1";
    fileArea.style.overflowY = "auto";
    fileArea.style.borderTop = "1px solid #ccc";
    pickerBox.appendChild(fileArea);

    const filenameRow = document.createElement("div");
    filenameRow.style.padding = "8px";
    filenameRow.style.display = "flex";
    filenameRow.style.gap = "8px";
    pickerBox.appendChild(filenameRow);

    const filenameInput = document.createElement("input");
    filenameInput.placeholder = "untitled.txt";
    Object.assign(filenameInput.style, { flex: "1", padding: "6px" });
    filenameRow.appendChild(filenameInput);

    const btnBar = document.createElement("div");
    btnBar.style.padding = "6px";
    btnBar.style.display = "flex";
    btnBar.style.justifyContent = "flex-end";
    pickerBox.appendChild(btnBar);

    const btnCancel = document.createElement("button");
    btnCancel.textContent = "Cancel";
    btnBar.appendChild(btnCancel);

    const btnSave = document.createElement("button");
    btnSave.textContent = "Save";
    btnBar.appendChild(btnSave);

    function renderPicker() {
      breadcrumbDiv.innerHTML = "";
      pickerCurrentPath.forEach((p, i) => {
        const span = document.createElement("span");
        span.textContent = i === 0 ? "Home" : " / " + p;
        span.style.cursor = "pointer";
        span.onclick = () => {
          pickerCurrentPath = pickerCurrentPath.slice(0, i + 1);
          renderPicker();
        };
        breadcrumbDiv.appendChild(span);
      });

      fileArea.innerHTML = "";
      let node = pickerTree;
      for (let i = 1; i < pickerCurrentPath.length; i++) {
        if (!node || !node[1]) break;
        node = node[1].find((c) => c[0] === pickerCurrentPath[i]);
      }
      if (!node || !node[1]) return;

      node[1].forEach((item) => {
        const div = document.createElement("div");
        div.textContent = (Array.isArray(item[1]) ? "📁 " : "📄 ") + item[0];
        div.style.padding = "6px";
        div.style.cursor = "pointer";
        div.onclick = (e) => {
          const isToggle = e.ctrlKey || e.metaKey;
          if (!isToggle) {
            pickerSelection = [item];
            fileArea
              .querySelectorAll("div")
              .forEach((d) => (d.style.background = ""));
            div.style.background = "#d0e6ff";
          } else {
            const idx = pickerSelection.indexOf(item);
            if (idx >= 0) {
              pickerSelection.splice(idx, 1);
              div.style.background = "";
            } else {
              pickerSelection.push(item);
              div.style.background = "#d0e6ff";
            }
          }
        };

        if (Array.isArray(item[1])) {
          div.ondblclick = () => {
            pickerCurrentPath.push(item[0]);
            renderPicker();
          };
        }
        fileArea.appendChild(div);
      });
    }

    renderPicker();

    const getUIMessage = (msg) => {
      if (typeof notification === "function") notification(msg);
      else notification(msg);
    };

    return new Promise((resolve) => {
      btnCancel.onclick = () => {
        resolve(null);
        pickerOverlay.remove();
      };

      btnSave.onclick = () => {
        const selections = [...pickerSelection];
        const basePath = pickerCurrentPath.slice(1).join("/");
        const fname = filenameInput.value.trim();
        if (!fname) return getUIMessage("Enter a filename");

        let chosen = null;
        if (!selections.length)
          chosen = basePath ? basePath + "/" + fname : fname;
        else {
          const sel = selections[0];
          const isFolder = Array.isArray(sel[1]);
          if (isFolder) chosen = (basePath ? basePath + "/" : "") + fname;
          else {
            // if i picked a file i dont do anything, but if its root directory handle it
            if (pickerCurrentPath.length === 1 && !selections.length)
              chosen = fname;
            else {
              notification("Cannot select a file for save destination");
              throw new Error("Cannot select a file for save destination");
            }
          }
        }

        if (!chosen) return getUIMessage("Could not determine save path");
        resolve(chosen);
        pickerOverlay.remove();
        editorName = fname;
        setTimeout(() => {
          returnObject.title = titleLabel.textContent;
        }, 1000);
      };
    });
  }

  // wire New/Open actions
  newBtn.addEventListener("click", async () => {
    // Use the Save As picker to choose a new file path (keeps UX consistent)
    editorName = `Untitled-${textEditorGlobals.goldenbodyId}`;
    if (path) {
      editorName = path.split("/").pop() || editorName;
    }
    const chosen = await openEditorSaveUI();
    if (!chosen) return; // cancelled
    hasFileOpen = true;
    if (textarea.style.display === "none") {
      textarea.style.display = "block";
      revertBtn.disabled = false;
      saveBtn.disabled = false;
    }
    path = chosen;
    titleLabel.textContent = editorName;
    storageKey = `textEditor:${textEditorGlobals.goldenbodyId}:${editorName}:content`;
    textarea.value = "";
    updateStatus();
    // Immediately save the empty/new file to the server
    try {
      await doSave(false);
    } catch (e) {
      /* swallow */
    }
  });

  // Recreate the app's custom picker UI (same overlay from browser.js)
  function openEditorPickerUI() {
    if (!window.treeData) {
      try {
        window.onlyloadTree();
      } catch (e) {}
    }

    let pickerTree = JSON.parse(JSON.stringify(window.treeData || {}));
    let pickerCurrentPath = ["root"];
    let pickerSelection = [];
    let pickerOverlay = document.createElement("div");

    Object.assign(pickerOverlay.style, {
      position: "fixed",
      top: "0",
      left: "0",
      right: "0",
      bottom: "0",
      background: "rgba(0,0,0,0.4)",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      zIndex: 99999999,
    });
    document.body.appendChild(pickerOverlay);

    const pickerBox = document.createElement("div");
    Object.assign(pickerBox.style, {
      width: "680px",
      height: "420px",
      borderRadius: "8px",
      background: data && data.dark ? "#222" : "#fff",
      color: data && data.dark ? "#e6eef8" : "#0f1724",
      display: "flex",
      flexDirection: "column",
      overflow: "hidden",
    });
    pickerOverlay.appendChild(pickerBox);

    const breadcrumbDiv = document.createElement("div");
    breadcrumbDiv.style.padding = "6px";
    pickerBox.appendChild(breadcrumbDiv);

    const fileArea = document.createElement("div");
    fileArea.style.flex = "1";
    fileArea.style.overflowY = "auto";
    fileArea.style.borderTop = "1px solid #ccc";
    pickerBox.appendChild(fileArea);

    const btnBar = document.createElement("div");
    btnBar.style.padding = "6px";
    btnBar.style.display = "flex";
    btnBar.style.justifyContent = "flex-end";
    pickerBox.appendChild(btnBar);

    const btnCancel = document.createElement("button");
    btnCancel.textContent = "Cancel";
    btnBar.appendChild(btnCancel);

    const btnOpen = document.createElement("button");
    btnOpen.textContent = "Open";
    btnBar.appendChild(btnOpen);

    function renderPicker() {
      breadcrumbDiv.innerHTML = "";
      pickerCurrentPath.forEach((p, i) => {
        const span = document.createElement("span");
        span.textContent = i === 0 ? "Home" : " / " + p;
        span.style.cursor = "pointer";
        span.onclick = () => {
          pickerCurrentPath = pickerCurrentPath.slice(0, i + 1);
          renderPicker();
        };
        breadcrumbDiv.appendChild(span);
      });

      fileArea.innerHTML = "";
      let node = pickerTree;
      for (let i = 1; i < pickerCurrentPath.length; i++) {
        if (!node || !node[1]) break;
        node = node[1].find((c) => c[0] === pickerCurrentPath[i]);
      }
      if (!node || !node[1]) return;

      node[1].forEach((item) => {
        const div = document.createElement("div");
        div.textContent = (Array.isArray(item[1]) ? "📁 " : "📄 ") + item[0];
        div.style.padding = "6px";
        div.style.cursor = "pointer";
        div.onclick = (e) => {
          const isToggle = e.ctrlKey || e.metaKey;
          if (!isToggle) {
            pickerSelection = [item];
            fileArea
              .querySelectorAll("div")
              .forEach((d) => (d.style.background = ""));
            div.style.background = "#d0e6ff";
          } else {
            const idx = pickerSelection.indexOf(item);
            if (idx >= 0) {
              pickerSelection.splice(idx, 1);
              div.style.background = "";
            } else {
              pickerSelection.push(item);
              div.style.background = "#d0e6ff";
            }
          }
        };

        if (Array.isArray(item[1])) {
          div.ondblclick = () => {
            pickerCurrentPath.push(item[0]);
            renderPicker();
          };
        }
        fileArea.appendChild(div);
      });
    }

    renderPicker();

    return new Promise((resolve) => {
      btnCancel.onclick = () => {
        resolve([]);
        pickerOverlay.remove();
      };

      btnOpen.onclick = () => {
        const selections = [...pickerSelection];
        if (!selections.length) return notification("Select a file or folder");

        // Compute a full path for each selected item using the current picker path
        const basePath = pickerCurrentPath.slice(1).join("/");
        const mapped = selections.map((sel) => {
          const name = sel[0];
          const isFolder = Array.isArray(sel[1]);
          const path = basePath ? basePath + "/" + name : name;
          // return a node-shaped array compatible with browser picker consumers
          return [name, sel[1], { path }];
        });

        resolve(mapped);
        pickerOverlay.remove();
      };
    });
  }
  // Assign the editor's path from the picked file (do not reuse old path)
  async function preloadFile() {
    const res = await filePost({ requestFile: true, requestFileName: path });
    if (res) {
      hasFileOpen = true;
      if (textarea.style.display === "none") {
        textarea.style.display = "block";
        revertBtn.disabled = false;
        saveBtn.disabled = false;
      }
      textarea.value = b64DecodeUnicode(res.filecontent);
      editorName = path.split("/").pop() || editorName;
      titleLabel.textContent = editorName;
      storageKey = `textEditor:${textEditorGlobals.goldenbodyId}:${editorName || "untitled"}:content`;
      updateStatus();
      returnObject.title = titleLabel.textContent;
    }
  }
  if (path) preloadFile();
  openBtn.addEventListener("click", async () => {
    try {
      const selections = await openEditorPickerUI();
      if (!selections || !selections.length) return;
      hasFileOpen = true;
      if (textarea.style.display === "none") {
        textarea.style.display = "block";
        revertBtn.disabled = false;
        saveBtn.disabled = false;
      }
      // prefer first file selection
      let picked = null;
      for (const sel of selections) {
        if (!Array.isArray(sel[1])) {
          picked = sel;
          break;
        }
      }
      if (!picked) return notification("Please select a file to open");

      // reconstruct path similar to browser.sendFileNodeToIframe
      const fullPath =
        picked[2] && picked[2].path
          ? picked[2].path
          : picked[0]
            ? picked[0]
            : null;

      const reqName = toRequestFileName(fullPath || picked[0]);
      if (!reqName) return;

      try {
        const res = await filePost({ requestFile: true, requestFileName: reqName });
        textarea.value = b64DecodeUnicode(res.filecontent);
        // Assign the editor's path from the picked file (do not reuse old path)
        path = fullPath || picked[0];
        editorName = path.split("/").pop() || editorName;
        titleLabel.textContent = editorName;
        storageKey = `textEditor:${textEditorGlobals.goldenbodyId}:${editorName || "untitled"}:content`;
        updateStatus();
      } catch (e) {
        console.warn("Failed to fetch picked file", e);
      }
    } catch (e) {
      console.warn("Picker cancelled or failed", e);
    }
    returnObject.title = titleLabel.textContent;
  });

  // Helpers: stats and caret position
  function computeStats() {
    const v = textarea.value || "";
    const words = v.trim().length ? v.trim().split(/\s+/).length : 0;
    const chars = v.length;
    const lines = v.split("\n").length;
    return { words, chars, lines };
  }

  function getCaretPosition() {
    const pos = textarea.selectionStart || 0;
    const before = textarea.value.slice(0, pos);
    const line = (before.match(/\n/g) || []).length + 1;
    const col = pos - (before.lastIndexOf("\n") + 1) + 1;
    return { line, col };
  }

  function updateStatus() {
    const s = computeStats();
    statWords.textContent = `Words: ${s.words}`;
    statChars.textContent = `Chars: ${s.chars}`;
    statLines.textContent = `Lines: ${s.lines}`;
    const p = getCaretPosition();
    statPos.textContent = `Ln ${p.line}, Col ${p.col}`;
  }

  // Debounced autosave
  let saveTimer = null;
  // Helpers for UTF-8-safe base64
  function b64EncodeUnicode(str) {
    try {
      return btoa(
        encodeURIComponent(str).replace(
          /%([0-9A-F]{2})/g,
          function (match, p1) {
            return String.fromCharCode("0x" + p1);
          },
        ),
      );
    } catch (e) {
      return btoa(str);
    }
  }

  function b64DecodeUnicode(b64) {
    try {
      return decodeURIComponent(
        Array.prototype.map
          .call(atob(b64), function (c) {
            return "%" + ("00" + c.charCodeAt(0).toString(16)).slice(-2);
          })
          .join(""),
      );
    } catch (e) {
      return atob(b64);
    }
  }

  // Normalize paths for the server APIs used by the backend (see src/server/fetchfiles.js)
  function toRequestFileName(p) {
    if (!p) return null;
    let s = p;
    if (s.startsWith("/")) s = s.slice(1);
    if (s.startsWith("root/")) s = s.slice(5);
    return s;
  }

  function toDirectionsPath(p) {
    if (!p) return null;
    let s = p;
    if (s.startsWith("/")) s = s.slice(1);
    if (!s.startsWith("root/")) s = "root/" + s;
    return s;
  }

  async function doSave(auto = true) {
    try {
      // show transient saved state locally
      saveBtn.textContent = auto ? "Autosaved" : "Saved";
      setTimeout(() => (saveBtn.textContent = "Save"), 1200);
      const dirPath = toDirectionsPath(path);

      // Only perform remote save on explicit user Save (not autosave), and when we have a real path
      if (!auto && path) {
        if (dirPath) {
          try {
            const base64 = b64EncodeUnicode(textarea.value || "");
            await filePost({
              saveSnapshot: true,
              directions: [
                { edit: true, path: dirPath, contents: base64, replace: true },
              ],
            });
            saveBtn.textContent = "Saved!!!";
            setTimeout(() => (saveBtn.textContent = "Save"), 1200);
          } catch (e) {
            saveBtn.textContent = "Save failed!!!";
            setTimeout(() => (saveBtn.textContent = "Save"), 1500);
          }
        }
      } else if (auto) {
        const base64 = b64EncodeUnicode(textarea.value || "");
        await filePost({
          saveSnapshot: true,
          directions: [
            { edit: true, path: dirPath, contents: base64, replace: true },
          ],
        });
      }
    } catch (e) {
      saveBtn.textContent = "Save failed!!!";
      setTimeout(() => (saveBtn.textContent = "Save"), 1500);
    }
  }

  // input handlers
  textarea.addEventListener("input", () => {
    updateStatus();
    if (getTextEditorSettings().autosave) {
      clearTimeout(saveTimer);
      saveTimer = setTimeout(() => doSave(true), 900);
    }
  });

  // caret / selection updates
  textarea.addEventListener("keyup", updateStatus);
  textarea.addEventListener("click", updateStatus);

  // tab handling and save shortcut
  textarea.addEventListener("keydown", (ev) => {
    if (ev.key === "Tab") {
      ev.preventDefault();
      const start = textarea.selectionStart;
      const end = textarea.selectionEnd;
      const tab = " ".repeat(getTextEditorSettings().tabSize || 2);
      textarea.value =
        textarea.value.substring(0, start) +
        tab +
        textarea.value.substring(end);
      textarea.selectionStart = textarea.selectionEnd = start + tab.length;
      updateStatus();
      return;
    }

    if ((ev.ctrlKey || ev.metaKey) && ev.key.toLowerCase() === "s") {
      ev.preventDefault();
      clearTimeout(saveTimer);
      doSave(false);
    }
  });

  // Save / Revert buttons
  saveBtn.addEventListener("click", () => {
    clearTimeout(saveTimer);
    doSave(false);
  });
  revertBtn.addEventListener("click", async () => {
    try {
      // Prefer server version when a path is provided
      if (path) {
        const reqName = toRequestFileName(path);
        if (reqName) {
          try {
            const res = await filePost({
              requestFile: true,
              requestFileName: reqName,
            });
            if (res && res.filecontent) {
              textarea.value = b64DecodeUnicode(res.filecontent);
              updateStatus();
              return;
            }
            // If the server returned a folder listing or no content, fall through to local
          } catch (e) {
            // ignore and fall back to local
          }
        }
      }

      const saved = localStorage.getItem(storageKey);
      if (saved !== null) textarea.value = saved;
      else if (typeof text === "string") textarea.value = text || "";
    } catch (e) {}
    updateStatus();
  });

  // Initial status
  updateStatus();
  let returnObject = {
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
    goldenbodyId: textEditorGlobals.goldenbodyId,
    title: titleLabel.textContent,
    textarea,
  };
  textEditorGlobals.alltextEditor.push(returnObject);

  applyStyles();

  return returnObject;
};


