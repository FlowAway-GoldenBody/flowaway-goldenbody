"use strict";

//settings global vars
window.settingsGlobals = {};
window.settingsGlobals.allSettings = [];
window.settingsGlobals.goldenbodyId = 0;

window.settingsGlobals.persistSettingsProfilePatch = function (patch) {
  return window.protectedGlobals.persistUserProfilePatch(patch || {});
};
window.settings = function (posX = 50, posY = 50) {
  window.protectedGlobals.startMenu.style.display = "none";
  if (posX == 50 && posY == 50) {
    let pos = window.protectedGlobals.getNextWindowXY();
    posX = pos.x;
    posY = pos.y;
  }
  let isMaximized = false;
  let _isMinimized = false;
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
  root.dataset.appId = "Settings";
  window.protectedGlobals.bringToFront(root);
  document.body.appendChild(root);
  window.settingsGlobals.goldenbodyId++;
  root.goldenbodyId = window.settingsGlobals.goldenbodyId;

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
    root.style.top = window.protectedGlobals.data.autohidetaskbar ? '0px' : window.protectedGlobals.currentAppMaximizedTop;    root.style.width = "100%";
    root.style.height = window.protectedGlobals.data.autohidetaskbar ? '100%' : `calc(100% - ${window.protectedGlobals.currentTaskbarHeight}px)`;
    root.style.borderRadius = "0px";
    isMaximized = true;
    _isMinimized = false;
    window.protectedGlobals.setWindowMaximizeIcon(btnMax, true);
  }

  function restoreWindow(useOriginalBounds = true) {
    if (useOriginalBounds && savedBounds) {
      applyBounds(savedBounds);
    }
    root.style.borderRadius = "10px";
    isMaximized = false;
    window.protectedGlobals.setWindowMaximizeIcon(btnMax, false);
  }

  function closeWindow() {
    root.remove();
    const index = window.settingsGlobals.allSettings.findIndex(
      (instance) => instance.rootElement == root,
    );
    if (index !== -1) window.settingsGlobals.allSettings.splice(index, 1);
    window.protectedGlobals.removeAllEventListenersForApp("settings" + root.goldenbodyId);
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
    for (const instance of [...window.settingsGlobals.allSettings]) {
      if (instance && (instance.closeWindow)) {
        instance.closeWindow();
      }
    }
    window.settingsGlobals.allSettings = [];
  }

  function hideAll() {
    for (const instance of window.settingsGlobals.allSettings) {
      if (instance && (instance.hideWindow)) {
        instance.hideWindow();
      }
    }
  }

  function showAll() {
    window.settingsGlobals.allSettings.sort(
      (a, b) => a.rootElement.style.zIndex - b.rootElement.style.zIndex,
    );
    for (const instance of window.settingsGlobals.allSettings) {
      if (instance && (instance.showWindow)) {
        instance.showWindow();
      }
    }
  }

  function newWindow() {
    settings(50, 50);
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
    let active = null;
    (function makeDraggable() {
      let dragging = false,
        startX = 0,
        startY = 0,
        origLeft = 0,
        origTop = 0;
      let thresholdCrossed = false;
      function getDragThreshold() {
        const v = Number(window.protectedGlobals.data.DRAG_THRESHOLD);
        if (!Number.isFinite(v)) return 15;
        return Math.max(2, Math.min(128, Math.round(v)));
      }
      let currentX, currentY;

      topBar.addEventListener("pointerdown", (ev) => {
        if (active) return;
        let DRAG_THRESHOLD = 15;
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

      window.addEventListener("settings" + root.goldenbodyId, "pointermove", (ev) => {
        if (!dragging) return;
        if (active) return;
        const dragDistance = Math.sqrt(
          Math.pow(ev.clientX - startX, 2) + Math.pow(ev.clientY - startY, 2),
        );
        if (!thresholdCrossed && dragDistance >= getDragThreshold()) {
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

      window.addEventListener("settings" + root.goldenbodyId, "pointerup", () => {
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

  // Make mainContainer fill the root and add padding
  const contentWrapper = document.createElement("div");
  contentWrapper.style.display = "flex";
  contentWrapper.style.flex = "1";
  contentWrapper.style.padding = "12px 15px 15px 15px";
  contentWrapper.style.gap = "16px";
  contentWrapper.style.minHeight = "0";
  root.appendChild(contentWrapper);

  let mainContainer = document.createElement("div");
  mainContainer.style.flex = "1";
  mainContainer.style.minWidth = "0";
  mainContainer.style.height = "100%";
  mainContainer.style.boxSizing = "border-box";
  mainContainer.style.overflowY = "auto";

  const rightPanel = document.createElement("div");
  rightPanel.style.width = "50%";
  rightPanel.style.maxWidth = "50%";
  rightPanel.style.height = "100%";
  rightPanel.style.boxSizing = "border-box";
  rightPanel.style.overflowY = "auto";
  rightPanel.style.borderLeft = "1px solid rgba(255,255,255,0.08)";
  rightPanel.style.paddingLeft = "14px";

  contentWrapper.append(mainContainer, rightPanel);

  const title = document.createElement("div");
  title.textContent = "Account Settings";
  title.style.fontSize = "16px";
  title.style.fontWeight = "600";
  title.style.marginBottom = "12px";

  const section = document.createElement("div");
  section.style.marginBottom = "16px";

  const label = document.createElement("div");
  label.textContent = "Change Password";
  label.style.fontSize = "13px";
  label.style.marginBottom = "6px";

  const oldinput = document.createElement("input");
  oldinput.type = "password";
  oldinput.placeholder = "Old password";
  oldinput.autocomplete = "current-password";
  oldinput.style.width = "calc(100% - 10px)";
  oldinput.style.boxSizing = "border-box";
  oldinput.style.padding = "6px";

  const input = document.createElement("input");
  input.type = "password";
  input.placeholder = "New password";
  input.autocomplete = "new-password";
  input.style.width = "calc(100% - 10px)";
  input.style.boxSizing = "border-box";
  input.style.padding = "6px";

  const confirm = document.createElement("input");
  confirm.type = "password";
  confirm.placeholder = "Confirm password";
  confirm.autocomplete = "new-password";
  confirm.style.width = "calc(100% - 10px)";
  confirm.style.boxSizing = "border-box";
  confirm.style.padding = "6px";
  confirm.style.marginTop = "6px";

  const button = document.createElement("button");
  button.textContent = "Save Password";
  button.style.marginTop = "10px";

  const status = document.createElement("div");
  status.style.marginTop = "8px";
  status.style.fontSize = "12px";

  button.onclick = async () => {
    status.textContent = "";
    oldinput.style.borderColor = "";

    if (!oldinput.value) {
      oldinput.style.borderColor = "red";
      status.textContent = "Old password is required.";
      status.style.color = "red";
      return;
    }

    if (!input.value || !confirm.value) {
      status.textContent = "New password cannot be empty.";
      status.style.color = "red";
      return;
    }

    if (input.value !== confirm.value) {
      status.textContent = "Passwords do not match.";
      status.style.color = "red";
      return;
    }

    button.disabled = true;
    button.textContent = "Saving...";

    try {
      const res = await window.protectedGlobals.zmcdpost({
        updatePassword: true,
        oldPassword: oldinput.value,
        newPassword: input.value,
      });

      if (res && res.error) {
        if (String(res.error).toLowerCase().includes("wrong") || String(res.error).toLowerCase().includes("old password")) {
          oldinput.style.borderColor = "red";
          status.textContent = "Wrong password.";
        } else {
          status.textContent = String(res.error);
        }
        status.style.color = "red";
      } else {
        status.textContent = "Password updated.";
        status.style.color = "green";
        oldinput.value = "";
        input.value = "";
        confirm.value = "";
      }
    } catch (e) {
      status.textContent = "Failed to update password.";
      status.style.color = "red";
    }

    button.disabled = false;
    button.textContent = "Save Password";
  };

  section.append(
    label,
    oldinput,
    document.createElement("br"),
    input,
    document.createElement("br"),
    confirm,
    document.createElement("br"),
    button,
    status,
  );
  mainContainer.append(title, section);

  async function saveAppPermissions() {
    const appPermsPayload = window.protectedGlobals.appPerms || {};
    await window.protectedGlobals.WriteFile(
      "/systemfiles/userprofile/appPermissions.json",
      JSON.stringify(appPermsPayload, null, 2),
      { text: true },
    );
    return appPermsPayload;
  }

  function setAppRowSaveButtonState(saveBtn, hasChanges) {
    if (!saveBtn) return;
    saveBtn.dataset.hasPendingChanges = hasChanges ? "true" : "false";
    const dark = !!window.protectedGlobals.data.dark;
    saveBtn.disabled = !hasChanges;
    saveBtn.style.opacity = hasChanges ? "1" : "0.6";
    saveBtn.style.background = hasChanges
      ? (dark ? "rgba(100, 150, 255, 0.32)" : "rgba(100, 150, 255, 0.2)")
      : (dark ? "rgba(255,255,255,0.1)" : "rgba(0,0,0,0.05)");
    saveBtn.style.color = dark ? "#fff" : "#111";
    saveBtn.style.borderColor = dark ? "rgba(255,255,255,0.2)" : "rgba(0,0,0,0.12)";
  }

  const appListHeader = document.createElement("div");
  appListHeader.style.display = "flex";
  appListHeader.style.justifyContent = "space-between";
  appListHeader.style.alignItems = "center";
  appListHeader.style.marginBottom = "12px";

  const appListHeaderText = document.createElement("div");
  appListHeaderText.textContent = "App Settings";
  appListHeaderText.style.fontSize = "16px";
  appListHeaderText.style.fontWeight = "700";


  appListHeader.append(appListHeaderText);

  const appListDesc = document.createElement("div");
  appListDesc.textContent = "Installed app folders from /systemfiles/runtime/apps.";
  appListDesc.style.fontSize = "12px";
  appListDesc.style.color = window.protectedGlobals.data.dark ? "#ccc" : "#555";
  appListDesc.style.marginBottom = "12px";

  const appListContainer = document.createElement("div");
  appListContainer.style.display = "flex";
  appListContainer.style.flexDirection = "column";
  appListContainer.style.gap = "8px";

  rightPanel.append(appListHeader, appListDesc, appListContainer);
  window.settingsGlobals.appListContainer = appListContainer;
  refreshAppList().catch(() => {});

  function sectionTitle(text) {
    const d = document.createElement("div");
    d.textContent = text;
    d.style.fontSize = "14px";
    d.style.fontWeight = "600";
    d.style.margin = "14px 0 6px";
    return d;
  }

  function statusLine() {
    const d = document.createElement("div");
    d.style.fontSize = "12px";
    d.style.marginTop = "6px";
    return d;
  }

  async function loadInstalledApps() {
    const appsRoot = "/systemfiles/runtime/apps";
    const entries = (await window.protectedGlobals.ReadFolder(appsRoot).catch(() => [])) || [];
    if (!Array.isArray(entries)) return [];

    const validApps = [];
    for (const entry of entries) {
      if (!entry || typeof entry !== "string") continue;
      if (entry.startsWith(".")) continue;

      try {
        const entryJson = await window.protectedGlobals.ReadFile(
          `${appsRoot}/${entry}/entry.json`,
          { text: true, direct: true },
        );
        if (entryJson) {
          validApps.push(entry);
        }
      } catch (e) {
        continue;
      }
    }

    return validApps;
  }

  async function readAppMetadata(appFolderName) {
    const appPath = `/systemfiles/runtime/apps/${appFolderName}`;
    const entryPath = `${appPath}/entry.json`;
    const meta = { folderName: appFolderName, name: appFolderName, label: appFolderName, icon: null, iconType: "text", functionName: appFolderName, requestAdminPerm: false, id: appFolderName };
    let entryText = null;
    function iconDataToBase64(raw) {
      if (raw instanceof ArrayBuffer || ArrayBuffer.isView(raw)) {
        const bytes = raw instanceof ArrayBuffer ? new Uint8Array(raw) : new Uint8Array(raw.buffer, raw.byteOffset, raw.byteLength);
        const chunkSize = 0x8000;
        let binary = "";
        for (let i = 0; i < bytes.length; i += chunkSize) {
          binary += String.fromCharCode(...bytes.subarray(i, i + chunkSize));
        }
        return btoa(binary);
      }
      if (typeof raw === "string") {
        return raw.trim();
      }
      return null;
    }
    try {
      entryText = await window.protectedGlobals.ReadFile(entryPath, { text: true, direct: true });
    } catch (e) {
      entryText = null;
    }
    if (entryText) {
      try {
        const data = JSON.parse(entryText);
        if (data && typeof data === "object") {
          meta.label = data.label || appFolderName;
          meta.functionName = data.functionName || appFolderName;
          meta.id = data.id || appFolderName;
          meta.name = data.label || appFolderName;
          meta.requestAdminPerm = !!data.requestAdminPerm;
          let iconFile = data.iconFile;
          if (!iconFile) {
            if (data.icon) iconFile = data.icon;
          }
          if (iconFile) {
            const iconPath = `${appPath}/${iconFile}`;
            try {
              if (data.pngEnabled) {
                const raw = await window.protectedGlobals.ReadFile(iconPath, { buffer: true, direct: true });
                const iconString = iconDataToBase64(raw);
                if (iconString) {
                  meta.icon = iconString;
                  meta.iconType = "img";
                }
              } else if (data.svgEnabled) {
                const svgText = await window.protectedGlobals.ReadFile(iconPath, { text: true, direct: true });
                if (svgText) {
                  meta.icon = svgText.trim();
                  meta.iconType = "svg";
                }
              } else if (data.nonTextIcon) {
                const raw = await window.protectedGlobals.ReadFile(iconPath, { buffer: true, direct: true });
                const iconString = iconDataToBase64(raw);
                if (iconString) {
                  meta.icon = iconString;
                  meta.iconType = iconFile.toLowerCase().endsWith(".png") ? "img" : iconFile.toLowerCase().endsWith(".svg") ? "svg" : "text";
                }
              } else {
                const textIcon = await window.protectedGlobals.ReadFile(iconPath, { text: true, direct: true });
                if (textIcon) {
                  meta.icon = String(textIcon).trim();
                  meta.iconType = "text";
                }
              }
            } catch (e) {
              meta.icon = null;
              meta.iconType = "text";
            }
          }
        }
      } catch (e) {
        // ignore invalid entry.json
      }
    }
    return meta;
  }

  function applyAppRowTheme(row, label, iconWrapper, deleteBtn, permsToggleBtn, saveBtn, adminPermsBtn, adminPermsInfo, detailsContainer) {
    const dark = !!window.protectedGlobals.data.dark;
    if (row) {
      row.style.borderColor = dark ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.08)";
      row.style.background = dark ? "rgba(255,255,255,0.03)" : "#f6f6f6";
    }
    if (label) {
      label.style.color = dark ? "#fff" : "#111";
    }
    if (iconWrapper) {
      iconWrapper.style.background = dark ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.04)";
    }
    if (deleteBtn) {
      deleteBtn.style.background = "#c0392b";
      deleteBtn.style.color = "white";
    }
    if (permsToggleBtn) {
      const isExpanded = permsToggleBtn.dataset.expanded === "true";
      permsToggleBtn.style.borderColor = dark ? "rgba(255,255,255,0.2)" : "rgba(0,0,0,0.12)";
      permsToggleBtn.style.background = isExpanded
        ? (dark ? "rgba(33, 150, 243, 0.28)" : "rgba(33, 150, 243, 0.2)")
        : (dark ? "rgba(255,255,255,0.1)" : "rgba(0,0,0,0.05)");
      permsToggleBtn.style.color = dark ? "#fff" : "#111";
    }
    if (saveBtn) {
      setAppRowSaveButtonState(saveBtn, saveBtn.dataset.hasPendingChanges === "true");
    }
    if (adminPermsBtn) {
      const isExpanded = adminPermsBtn.dataset.expanded === "true";
      adminPermsBtn.style.borderColor = dark ? "rgba(255,255,255,0.2)" : "rgba(0,0,0,0.12)";
      adminPermsBtn.style.background = isExpanded
        ? (dark ? "rgba(33, 150, 243, 0.28)" : "rgba(33, 150, 243, 0.2)")
        : (dark ? "rgba(255,255,255,0.1)" : "rgba(0,0,0,0.05)");
      adminPermsBtn.style.color = dark ? "#fff" : "#111";
    }
    if (adminPermsInfo) {
      adminPermsInfo.style.color = dark ? "#ccc" : "#555";
    }
    if (detailsContainer) {
      detailsContainer.style.background = dark ? "rgba(255,255,255,0.02)" : "rgba(0,0,0,0.02)";
    }
  }

  function syncAppRowsTheme() {
    const container = window.settingsGlobals.appListContainer;
    if (!container) return;
    const appItems = Array.from(container.children || []).filter((child) => child instanceof HTMLElement && child.dataset.appItem === "true");
    appItems.forEach((appWrapper) => {
      const row = appWrapper.querySelector("[data-app-row='true']");
      const label = appWrapper.querySelector("[data-app-row-label='true']");
      const iconWrapper = appWrapper.querySelector("[data-app-row-icon='true']");
      const deleteBtn = appWrapper.querySelector("[data-app-row-delete='true']");
      const permsToggleBtn = appWrapper.querySelector("[data-app-row-perms-toggle='true']");
      const saveBtn = appWrapper.querySelector("[data-app-row-save='true']");
      const adminPermsBtn = appWrapper.querySelector("[data-app-row-admin-toggle='true']");
      const adminPermsInfo = appWrapper.querySelector("[data-app-row-admin-info='true']");
      const detailsContainer = appWrapper.querySelector("[data-app-row-perms-container='true']") || appWrapper.querySelector("[data-app-row-admin-perms-container='true']");
      applyAppRowTheme(row, label, iconWrapper, deleteBtn, permsToggleBtn, saveBtn, adminPermsBtn, adminPermsInfo, detailsContainer);
    });
  }

  function createAppItem(appMeta, refreshList) {
    const appWrapper = document.createElement("div");
    appWrapper.dataset.appItem = "true";

    const row = document.createElement("div");
    row.dataset.appRow = "true";
    row.style.display = "flex";
    row.style.alignItems = "center";
    row.style.justifyContent = "space-between";
    row.style.padding = "8px 10px";
    row.style.marginBottom = "8px";
    row.style.border = "1px solid rgba(255,255,255,0.08)";
    row.style.borderRadius = "8px";
    row.style.background = window.protectedGlobals.data.dark ? "rgba(255,255,255,0.03)" : "#f6f6f6";

    const left = document.createElement("div");
    left.style.display = "flex";
    left.style.alignItems = "center";
    left.style.gap = "10px";
    left.style.minWidth = "0";

    const iconWrapper = document.createElement("div");
    iconWrapper.dataset.appRowIcon = "true";
    iconWrapper.style.width = "36px";
    iconWrapper.style.height = "36px";
    iconWrapper.style.display = "grid";
    iconWrapper.style.placeItems = "center";
    iconWrapper.style.borderRadius = "10px";
    iconWrapper.style.background = window.protectedGlobals.data.dark ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.04)";
    iconWrapper.style.overflow = "hidden";
    iconWrapper.style.flexShrink = "0";

    if (appMeta.iconType === "img" && appMeta.icon) {
      const img = document.createElement("img");
      img.src = `data:image/png;base64,${appMeta.icon}`;
      img.style.maxWidth = "100%";
      img.style.maxHeight = "100%";
      img.style.display = "block";
      iconWrapper.appendChild(img);
    } else if (appMeta.iconType === "svg" && appMeta.icon) {
      iconWrapper.innerHTML = appMeta.icon;
      const svg = iconWrapper.querySelector("svg");
      if (svg) {
        svg.style.width = "100%";
        svg.style.height = "100%";
      }
    } else if (appMeta.icon) {
      const text = document.createElement("div");
      text.textContent = appMeta.icon[0] || appMeta.label[0] || "A";
      text.style.fontSize = "16px";
      text.style.fontWeight = "700";
      iconWrapper.appendChild(text);
    } else {
      const text = document.createElement("div");
      text.textContent = appMeta.label[0] ? appMeta.label[0].toUpperCase() : "A";
      text.style.fontSize = "16px";
      text.style.fontWeight = "700";
      iconWrapper.appendChild(text);
    }

    const label = document.createElement("div");
    label.dataset.appRowLabel = "true";
    label.style.whiteSpace = "nowrap";
    label.style.overflow = "hidden";
    label.style.textOverflow = "ellipsis";
    label.style.fontSize = "14px";
    label.style.fontWeight = "600";
    label.style.color = window.protectedGlobals.data.dark ? "#fff" : "#111";
    label.textContent = appMeta.label;

    left.append(iconWrapper, label);

    const right = document.createElement("div");
    right.style.display = "flex";
    right.style.alignItems = "center";
    right.style.gap = "8px";

    const deleteBtn = document.createElement("button");
    deleteBtn.dataset.appRowDelete = "true";
    deleteBtn.textContent = "Delete";
    deleteBtn.style.background = "#c0392b";
    deleteBtn.style.color = "white";
    deleteBtn.style.border = "none";
    deleteBtn.style.padding = "6px 10px";
    deleteBtn.style.borderRadius = "6px";
    deleteBtn.style.cursor = "pointer";
    deleteBtn.style.whiteSpace = "nowrap";

    applyAppRowTheme(row, label, iconWrapper, deleteBtn);

    deleteBtn.addEventListener("click", async () => {
      let userConfirm = await window.protectedGlobals.showConfirmDialog("Delete App", "This will delete this app and all the data it wrote in it's own folder. (Note: If you accidentally deleted a system app you can recover it in the login page in the Reset System App section)");
      if (!userConfirm) return;
      deleteBtn.disabled = true;
      deleteBtn.textContent = "Deleting...";
      try {
        window.protectedGlobals.deleteApp(appMeta);
        await refreshAppList();
      } catch (err) {
        deleteBtn.disabled = false;
        deleteBtn.textContent = "Delete";
        alert(`Failed to delete app folder: ${err.message || err}`);
      }
    });

    right.append(deleteBtn);
    row.append(left, right);
    appWrapper.appendChild(row);

    if (appMeta.requestAdminPerm) {
      const adminPermsContainer = document.createElement("div");
      adminPermsContainer.dataset.appRowAdminPermsContainer = "true";
      adminPermsContainer.style.display = "none";
      adminPermsContainer.style.padding = "0 10px 8px 46px";
      adminPermsContainer.style.fontSize = "12px";
      adminPermsContainer.style.flexDirection = "column";

      const adminPermsInfo = document.createElement("div");
      adminPermsInfo.dataset.appRowAdminInfo = "true";
      adminPermsInfo.textContent = "This app has admin permission. It can do everything you can because it is a system app or you granted it a key during installation.";
      adminPermsInfo.style.lineHeight = "1.4";
      adminPermsContainer.appendChild(adminPermsInfo);

      const adminPermsBtn = document.createElement("button");
      adminPermsBtn.dataset.appRowAdminToggle = "true";
      adminPermsBtn.textContent = "Permissions";
      adminPermsBtn.style.border = "1px solid rgba(255,255,255,0.2)";
      adminPermsBtn.style.borderRadius = "4px";
      adminPermsBtn.style.padding = "3px 8px";
      adminPermsBtn.style.fontSize = "11px";
      adminPermsBtn.style.cursor = "pointer";
      adminPermsBtn.style.background = window.protectedGlobals.data.dark ? "rgba(255,255,255,0.1)" : "rgba(0,0,0,0.05)";
      adminPermsBtn.style.color = "inherit";

      adminPermsBtn.addEventListener("click", () => {
        const isVisible = adminPermsContainer.style.display !== "none";
        adminPermsContainer.style.display = isVisible ? "none" : "flex";
        adminPermsBtn.dataset.expanded = String(!isVisible);
        applyAppRowTheme(row, label, iconWrapper, deleteBtn, null, null, adminPermsBtn, adminPermsInfo, adminPermsContainer);
      });

      right.appendChild(adminPermsBtn);
      appWrapper.appendChild(adminPermsContainer);
    } else {
      const permsContainer = document.createElement("div");
      permsContainer.dataset.appRowPermsContainer = "true";
      permsContainer.style.display = "none";
      permsContainer.style.padding = "0 10px 8px 46px";
      permsContainer.style.fontSize = "12px";
      permsContainer.style.gap = "8px";
      permsContainer.style.flexDirection = "column";

      const existingPerms = window.protectedGlobals.appPerms && window.protectedGlobals.appPerms[appMeta.name] ? window.protectedGlobals.appPerms[appMeta.name] : {};
      const pendingPerms = { ...existingPerms };
      const permsList = ["storage", "notification", "LaunchApp"];
      const permToggles = {};
      permsList.forEach(perm => {
        const permRow = document.createElement("div");
        permRow.style.display = "flex";
        permRow.style.alignItems = "center";
        permRow.style.gap = "8px";
        permRow.style.justifyContent = "space-between";

        const permLabel = document.createElement("div");
        permLabel.textContent = perm.charAt(0).toUpperCase() + perm.slice(1);
        permLabel.style.flex = "1";

        const cycleBtn = document.createElement("button");
        cycleBtn.style.border = "1px solid rgba(255,255,255,0.2)";
        cycleBtn.style.borderRadius = "4px";
        cycleBtn.style.padding = "3px 8px";
        cycleBtn.style.fontSize = "11px";
        cycleBtn.style.cursor = "pointer";
        cycleBtn.style.background = window.protectedGlobals.data.dark ? "rgba(255,255,255,0.1)" : "rgba(0,0,0,0.05)";
        cycleBtn.style.color = "inherit";
        cycleBtn.style.whiteSpace = "nowrap";

        const currentPerm = pendingPerms[perm] || "ask";
        let state = currentPerm || "ask";
        permToggles[perm] = { btn: cycleBtn, state: state };

        const updateBtnText = () => {
          cycleBtn.textContent = state === "ask" ? "Ask" : state === "true" ? "Allow" : "Deny";
          cycleBtn.style.background = state === "ask"
            ? (window.protectedGlobals.data.dark ? "rgba(255,255,255,0.1)" : "rgba(0,0,0,0.05)")
            : state === "true"
              ? "rgba(76, 175, 80, 0.3)"
              : "rgba(244, 67, 54, 0.3)";
        };
        updateBtnText();

        cycleBtn.addEventListener("click", () => {
          state = state === "ask" ? "true" : state === "true" ? "false" : "ask";
          permToggles[perm].state = state;
          pendingPerms[perm] = state;
          updateBtnText();
          setAppRowSaveButtonState(appSaveBtn, true);
        });

        permRow.append(permLabel, cycleBtn);
        permsContainer.appendChild(permRow);
      });

      const appSaveBtn = document.createElement("button");
      appSaveBtn.dataset.appRowSave = "true";
      appSaveBtn.textContent = "Save";
      appSaveBtn.style.border = "1px solid rgba(255,255,255,0.2)";
      appSaveBtn.style.borderRadius = "4px";
      appSaveBtn.style.padding = "3px 8px";
      appSaveBtn.style.fontSize = "11px";
      appSaveBtn.style.cursor = "pointer";
      appSaveBtn.style.background = window.protectedGlobals.data.dark ? "rgba(255,255,255,0.1)" : "rgba(0,0,0,0.05)";
      appSaveBtn.style.color = "inherit";
      appSaveBtn.style.alignSelf = "flex-start";
      appSaveBtn.style.marginTop = "4px";
      setAppRowSaveButtonState(appSaveBtn, false);

      appSaveBtn.addEventListener("click", async () => {
        const originalText = appSaveBtn.textContent;
        appSaveBtn.textContent = "Saving...";
        appSaveBtn.disabled = true;
        try {
          window.protectedGlobals.appPerms = window.protectedGlobals.appPerms || {};
          window.protectedGlobals.appPerms[appMeta.id] = { ...pendingPerms };
          await saveAppPermissions();
          appSaveBtn.textContent = "Saved!";
          setAppRowSaveButtonState(appSaveBtn, false);
          setTimeout(() => {
              appSaveBtn.textContent = originalText;
          }, 2000);
        } catch (err) {
          appSaveBtn.textContent = originalText;
          setAppRowSaveButtonState(appSaveBtn, true);
          alert(`Failed to save permissions for ${appMeta.label}: ${err.message || err}`);
        }
      });

      const togglePermsBtn = document.createElement("button");
      togglePermsBtn.dataset.appRowPermsToggle = "true";
      togglePermsBtn.textContent = "Permissions";
      togglePermsBtn.style.border = "1px solid rgba(255,255,255,0.2)";
      togglePermsBtn.style.borderRadius = "4px";
      togglePermsBtn.style.padding = "3px 8px";
      togglePermsBtn.style.fontSize = "11px";
      togglePermsBtn.style.cursor = "pointer";
      togglePermsBtn.style.background = window.protectedGlobals.data.dark ? "rgba(255,255,255,0.1)" : "rgba(0,0,0,0.05)";
      togglePermsBtn.style.color = "inherit";

      togglePermsBtn.addEventListener("click", () => {
        const isVisible = permsContainer.style.display !== "none";
        permsContainer.style.display = isVisible ? "none" : "flex";
        togglePermsBtn.dataset.expanded = String(!isVisible);
        // scroll to the bottom of the appWrapper to ensure the permissions are visible
        if (!isVisible) {
          setTimeout(() => {
            appWrapper.scrollIntoView({ behavior: "smooth", block: "end" });
          }, 100);
        }
        applyAppRowTheme(row, label, iconWrapper, deleteBtn, togglePermsBtn, appSaveBtn, null, null, permsContainer);
      });

      permsContainer.appendChild(appSaveBtn);
      right.appendChild(togglePermsBtn);
      appWrapper.appendChild(permsContainer);
    }

    return appWrapper;
  }

  root.addEventListener("styleapplied", syncAppRowsTheme);

  async function refreshAppList() {
    if (!window.settingsGlobals.appListContainer) return;
    const container = window.settingsGlobals.appListContainer;
    container.innerHTML = "";
    const loading = document.createElement("div");
    loading.textContent = "Loading apps...";
    loading.style.color = window.protectedGlobals.data.dark ? "#ccc" : "#555";
    container.appendChild(loading);
    try {
      const apps = await loadInstalledApps();
      container.innerHTML = "";
      if (!apps.length) {
        const empty = document.createElement("div");
        empty.textContent = "No installed apps found.";
        empty.style.color = window.protectedGlobals.data.dark ? "#ccc" : "#555";
        container.appendChild(empty);
        return;
      }
      for (const appName of apps) {
        const meta = await readAppMetadata(appName);
        container.appendChild(createAppItem(meta, refreshAppList));
      }
    } catch (e) {
      container.innerHTML = "";
      const error = document.createElement("div");
      error.textContent = `Unable to load apps: ${e.message || e}`;
      error.style.color = "red";
      container.appendChild(error);
    }
  }

  /* ========================================================="}
     🌞 DISPLAY — BRIGHTNESS
  ========================================================= */

  mainContainer.appendChild(sectionTitle("Display"));

  const brightLabel = document.createElement("div");
  brightLabel.textContent = "Brightness";

  const brightness = document.createElement("input");
  brightness.type = "range";
  brightness.min = 0;
  brightness.style.width = "calc(100% - 10px)";

  const syncBrightnessSlider = () => {
    const max = !!window.protectedGlobals.statusData.batterySaverEnabled ? 50 : 100;
    const current = Number(window.protectedGlobals.statusData.brightness) || 0;
    const clamped = Math.min(max, Math.max(0, current));
    brightness.max = max;
    brightness.value = clamped;
    window.protectedGlobals.statusData.brightness = clamped;
    document.documentElement.style.filter = `brightness(${clamped}%)`;
  };

  brightness.oninput = async () => {
    const nextValue = Math.min(!!window.protectedGlobals.statusData.batterySaverEnabled ? 50 : 100, Math.max(0, Number(brightness.value) || 0));
    document.documentElement.style.filter = `brightness(${nextValue}%)`;
    window.protectedGlobals.statusData.brightness = nextValue;
    brightness.value = nextValue;
    window.dispatchEvent(new CustomEvent("brightness-state-updated", {
      detail: {
        batterySaverEnabled: !!window.protectedGlobals.statusData.batterySaverEnabled,
        brightness: nextValue,
      },
    }));
    await window.settingsGlobals.persistSettingsProfilePatch({ brightness: Number(nextValue) });
  };

  window.addEventListener("brightness-state-updated", syncBrightnessSlider);
  window.addEventListener("styleapplied", syncBrightnessSlider);
  syncBrightnessSlider();

  mainContainer.append(brightLabel, brightness);
  /* =========================================================
   🌗 APPEARANCE — THEME
========================================================= */

  mainContainer.appendChild(sectionTitle("Appearance"));

  const themeRow = document.createElement("div");
  themeRow.style.alignItems = "center";
  themeRow.style.marginTop = "8px";

  const themeLabel = document.createElement("div");
  themeLabel.textContent = "Dark Mode";
  themeLabel.style.fontSize = "13px";

  const themeToggle = document.createElement("input");
  themeToggle.type = "checkbox";
  themeToggle.checked = !!window.protectedGlobals.data.dark;

  /* Toggle handler */
  themeToggle.onchange = async () => {
    window.protectedGlobals.data.dark = themeToggle.checked;

    // Apply theme immediately
    window.protectedGlobals.applyStyles();

    // Persist to backend (optional but recommended)
    await window.settingsGlobals.persistSettingsProfilePatch({ dark: !!window.protectedGlobals.data.dark });
  };

  themeRow.append(themeLabel, themeToggle);
  mainContainer.appendChild(themeRow);
  const backgroundLabel = document.createElement("div");
  backgroundLabel.textContent = "Background";
  backgroundLabel.style.fontSize = "13px";
  backgroundLabel.style.marginTop = "8px";
  mainContainer.appendChild(backgroundLabel);
  const backgroundActionsRow = document.createElement("div");
  backgroundActionsRow.style.display = "flex";
  backgroundActionsRow.style.flexWrap = "wrap";
  backgroundActionsRow.style.gap = "8px";
  backgroundActionsRow.style.marginTop = "8px";
  const changeBackgroundBtn = document.createElement("button");
  changeBackgroundBtn.textContent = "Change Background";
  changeBackgroundBtn.style.padding = "6px 10px";
  changeBackgroundBtn.style.borderRadius = "6px";
  changeBackgroundBtn.style.border = "1px solid rgba(255,255,255,0.16)";
  changeBackgroundBtn.style.background = window.protectedGlobals.data.dark ? "rgba(255,255,255,0.12)" : "rgba(0,0,0,0.05)";
  changeBackgroundBtn.style.color = window.protectedGlobals.data.dark ? "#fff" : "#111";
  changeBackgroundBtn.style.cursor = "pointer";
  changeBackgroundBtn.onclick = async () => {
    await window.protectedGlobals.changeBackground();
  };

  const resetBackgroundBtn = document.createElement("button");
  resetBackgroundBtn.textContent = "Reset Background";
  resetBackgroundBtn.style.padding = "6px 10px";
  resetBackgroundBtn.style.borderRadius = "6px";
  resetBackgroundBtn.style.border = "1px solid rgba(255,255,255,0.16)";
  resetBackgroundBtn.style.background = window.protectedGlobals.data.dark ? "rgba(255,255,255,0.12)" : "rgba(0,0,0,0.05)";
  resetBackgroundBtn.style.color = window.protectedGlobals.data.dark ? "#fff" : "#111";
  resetBackgroundBtn.style.cursor = "pointer";
  resetBackgroundBtn.onclick = async () => {
    await window.protectedGlobals.resetBackground();
  };
  root.addEventListener("styleapplied", () => {
    changeBackgroundBtn.style.background = window.protectedGlobals.data.dark ? "rgba(255,255,255,0.12)" : "rgba(0,0,0,0.05)";
    changeBackgroundBtn.style.color = window.protectedGlobals.data.dark ? "#fff" : "#111";
    resetBackgroundBtn.style.background = window.protectedGlobals.data.dark ? "rgba(255,255,255,0.12)" : "rgba(0,0,0,0.05)";
    resetBackgroundBtn.style.color = window.protectedGlobals.data.dark ? "#fff" : "#111";
  });
  backgroundActionsRow.append(changeBackgroundBtn, resetBackgroundBtn);
  mainContainer.appendChild(backgroundActionsRow);
  mainContainer.appendChild(document.createElement("hr"));

  window.protectedGlobals.data.taskbarRevealEdgePx = Number.isFinite(Number(window.protectedGlobals.data.taskbarRevealEdgePx))
    ? Math.max(1, Math.min(64, Math.round(Number(window.protectedGlobals.data.taskbarRevealEdgePx))))
    : 6;
  window.protectedGlobals.data.taskbarRevealHoldDelayMs = Number.isFinite(Number(window.protectedGlobals.data.taskbarRevealHoldDelayMs))
    ? Math.max(0, Math.min(5000, Math.round(Number(window.protectedGlobals.data.taskbarRevealHoldDelayMs))))
    : 450;

  const autohideRow = document.createElement("div");
  autohideRow.style.alignItems = "center";
  autohideRow.style.marginTop = "8px";

  const taskbarRevealEdgeLabel = document.createElement("div");
  taskbarRevealEdgeLabel.textContent = "Taskbar Reveal Edge (px)";

  const taskbarRevealEdge = document.createElement("input");
  taskbarRevealEdge.type = "number";
  taskbarRevealEdge.min = "1";
  taskbarRevealEdge.max = "64";
  taskbarRevealEdge.step = "1";
  taskbarRevealEdge.value = Number.isFinite(Number(window.protectedGlobals.data.taskbarRevealEdgePx))
    ? String(Number(window.protectedGlobals.data.taskbarRevealEdgePx))
    : "6";
  taskbarRevealEdge.style.width = "calc(100% - 10px)";

  taskbarRevealEdge.onchange = async () => {
    const normalized = Math.max(1, Math.min(64, Math.round(Number(taskbarRevealEdge.value) || 6)));
    taskbarRevealEdge.value = String(normalized);
    window.protectedGlobals.data.taskbarRevealEdgePx = normalized;
    await window.settingsGlobals.persistSettingsProfilePatch({
      autohidetaskbar: !!window.protectedGlobals.data.autohidetaskbar,
      taskbarRevealEdgePx: normalized,
      taskbarRevealHoldDelayMs: Number(window.protectedGlobals.data.taskbarRevealHoldDelayMs),
    });
    window.protectedGlobals.applyTaskbarAutohideSettings({
      autohidetaskbar: window.protectedGlobals.data.autohidetaskbar,
      taskbarRevealEdgePx: window.protectedGlobals.data.taskbarRevealEdgePx,
      taskbarRevealHoldDelayMs: window.protectedGlobals.data.taskbarRevealHoldDelayMs,
    });
  };

  const taskbarRevealHoldLabel = document.createElement("div");
  taskbarRevealHoldLabel.textContent = "Taskbar Reveal Hold Delay (ms)";

  const taskbarRevealHold = document.createElement("input");
  taskbarRevealHold.type = "number";
  taskbarRevealHold.min = "0";
  taskbarRevealHold.max = "5000";
  taskbarRevealHold.step = "50";
  taskbarRevealHold.value = Number.isFinite(Number(window.protectedGlobals.data.taskbarRevealHoldDelayMs))
    ? String(Number(window.protectedGlobals.data.taskbarRevealHoldDelayMs))
    : "450";
  taskbarRevealHold.style.width = "calc(100% - 10px)";

  taskbarRevealHold.onchange = async () => {
    const normalized = Math.max(0, Math.min(5000, Math.round(Number(taskbarRevealHold.value) || 450)));
    taskbarRevealHold.value = String(normalized);
    window.protectedGlobals.data.taskbarRevealHoldDelayMs = normalized;
    await window.settingsGlobals.persistSettingsProfilePatch({
      autohidetaskbar: !!window.protectedGlobals.data.autohidetaskbar,
      taskbarRevealEdgePx: Number(window.protectedGlobals.data.taskbarRevealEdgePx),
      taskbarRevealHoldDelayMs: normalized,
    });
    window.protectedGlobals.applyTaskbarAutohideSettings({
      autohidetaskbar: window.protectedGlobals.data.autohidetaskbar,
      taskbarRevealEdgePx: window.protectedGlobals.data.taskbarRevealEdgePx,
      taskbarRevealHoldDelayMs: window.protectedGlobals.data.taskbarRevealHoldDelayMs,
    });
  };

  mainContainer.append(
    taskbarRevealEdgeLabel,
    taskbarRevealEdge,
    taskbarRevealHoldLabel,
    taskbarRevealHold,
  );

  /* =========================================================
   ⚙️ AUTO-UPDATE SYSTEM APPS
========================================================= */

  const autoupdateRow = document.createElement("div");
  autoupdateRow.style.alignItems = "center";
  autoupdateRow.style.marginTop = "8px";

  const autoupdateLabel = document.createElement("div");
  autoupdateLabel.textContent = "Auto-Update System/System Apps";
  autoupdateLabel.style.fontSize = "13px";

  const autoupdateToggle = document.createElement("input");
  autoupdateToggle.type = "checkbox";
  autoupdateToggle.checked = !!window.protectedGlobals.data.autoupdate;

  /* Toggle handler */
  autoupdateToggle.onchange = async () => {
    window.protectedGlobals.data.autoupdate = autoupdateToggle.checked;
    await window.settingsGlobals.persistSettingsProfilePatch({ autoupdate: !!window.protectedGlobals.data.autoupdate });
  };

  autoupdateRow.append(autoupdateLabel, autoupdateToggle);
  mainContainer.appendChild(autoupdateRow);

  mainContainer.appendChild(sectionTitle("Windowing"));

  const dragThresholdLabel = document.createElement("div");
  dragThresholdLabel.textContent = "Window Drag Threshold (px)";

  const dragThresholdInput = document.createElement("input");
  dragThresholdInput.type = "number";
  dragThresholdInput.min = "2";
  dragThresholdInput.max = "128";
  dragThresholdInput.step = "1";
  dragThresholdInput.value = Number.isFinite(Number(window.protectedGlobals.data.DRAG_THRESHOLD))
    ? String(Number(window.protectedGlobals.data.DRAG_THRESHOLD))
    : "15";
  dragThresholdInput.style.width = "calc(100% - 10px)";

  dragThresholdInput.onchange = async () => {
    const normalized = Math.max(2, Math.min(128, Math.round(Number(dragThresholdInput.value) || 15)));
    dragThresholdInput.value = String(normalized);
    window.protectedGlobals.data.DRAG_THRESHOLD = normalized;
    await window.settingsGlobals.persistSettingsProfilePatch({ DRAG_THRESHOLD: normalized });
  };

  mainContainer.append(dragThresholdLabel, dragThresholdInput);

  /* =========================================================
     🗑️ DANGER ZONE — DELETE ACCOUNT
  ========================================================= */

  mainContainer.appendChild(sectionTitle("Danger Zone"));

  const deleteBtn = document.createElement("button");
  deleteBtn.textContent = "Delete Account";
  deleteBtn.style.background = "#c0392b";
  deleteBtn.style.color = "white";

  const deleteStatus = statusLine();

  deleteBtn.onclick = async () => {
    const existingDialog = document.getElementById("settings-delete-account-dialog");
    if (existingDialog) {
      existingDialog.remove();
    }

    const dlg = document.createElement("div");
    dlg.id = "settings-delete-account-dialog";
    Object.assign(dlg.style, {
      position: "fixed",
      left: "50%",
      top: "50%",
      transform: "translate(-50%, -50%)",
      width: "420px",
      maxWidth: "90vw",
      background: window.protectedGlobals.data.dark ? "#222" : "#fff",
      color: window.protectedGlobals.data.dark ? "#fff" : "#000",
      borderRadius: "8px",
      boxShadow: "0 8px 30px rgba(0,0,0,0.3)",
      zIndex: 100002,
      display: "flex",
      flexDirection: "column",
      overflow: "hidden",
      padding: "12px",
    });

    const header = document.createElement("div");
    header.style.display = "flex";
    header.style.alignItems = "center";
    header.style.justifyContent = "space-between";

    const htitle = document.createElement("div");
    htitle.textContent = "Delete Account";
    htitle.style.fontWeight = "600";

    const closeX = document.createElement("button");
    closeX.setAttribute("aria-label", "Close dialog");
    closeX.textContent = "✕";
    Object.assign(closeX.style, {
      border: "none",
      background: "transparent",
      cursor: "pointer",
      width: "32px",
      height: "28px",
      padding: "0",
    });
    closeX.onclick = () => dlg.remove();

    header.append(htitle, closeX);
    dlg.appendChild(header);

    const content = document.createElement("div");
    Object.assign(content.style, {
      flex: "1",
      padding: "12px 0",
      overflow: "auto",
      fontSize: "13px",
    });

    const warning = document.createElement("div");
    warning.style.color = "#c0392b";
    warning.style.marginBottom = "12px";
    warning.textContent = "⚠️ WARNING: This will permanently delete your account and ALL data. This cannot be undone.";

    const passwordLabel = document.createElement("div");
    passwordLabel.style.marginTop = "12px";
    passwordLabel.style.marginBottom = "4px";
    passwordLabel.textContent = "Enter your password to confirm:";
    passwordLabel.style.fontWeight = "500";

    const passwordInput = document.createElement("input");
    passwordInput.type = "password";
    passwordInput.placeholder = "Password";
    passwordInput.style.width = "100%";
    passwordInput.style.padding = "6px";
    passwordInput.style.boxSizing = "border-box";
    passwordInput.style.borderRadius = "4px";
    passwordInput.style.border = "1px solid #ccc";
    passwordInput.style.marginBottom = "12px";

    const errorMsg = document.createElement("div");
    errorMsg.style.color = "red";
    errorMsg.style.fontSize = "12px";
    errorMsg.style.marginBottom = "12px";
    errorMsg.style.display = "none";

    content.append(warning, passwordLabel, passwordInput, errorMsg);
    dlg.appendChild(content);

    const footer = document.createElement("div");
    footer.style.display = "flex";
    footer.style.gap = "8px";
    footer.style.justifyContent = "flex-end";
    footer.style.flexShrink = "0";

    const cancelBtn = document.createElement("button");
    cancelBtn.textContent = "Cancel";
    Object.assign(cancelBtn.style, {
      padding: "6px 12px",
      border: "1px solid #ccc",
      borderRadius: "4px",
      background: window.protectedGlobals.data.dark ? "#333" : "#f0f0f0",
      color: "inherit",
      cursor: "pointer",
    });
    cancelBtn.onclick = () => dlg.remove();

    const confirmBtn = document.createElement("button");
    confirmBtn.textContent = "Delete Account";
    Object.assign(confirmBtn.style, {
      padding: "6px 12px",
      border: "none",
      borderRadius: "4px",
      background: "#c0392b",
      color: "white",
      cursor: "pointer",
    });

    confirmBtn.onclick = async () => {
      if (!passwordInput.value) {
        errorMsg.textContent = "Password is required.";
        errorMsg.style.display = "block";
        return;
      }

      confirmBtn.disabled = true;
      errorMsg.style.display = "none";

      try {
        const result = await window.protectedGlobals.zmcdpost({
          deleteAcc: true,
          oldPassword: passwordInput.value,
          username: window.protectedGlobals.getCurrentUsernameForRequests(),
        });

        if (result && result.success) {
          deleteStatus.textContent = "Account deleted successfully. Redirecting to login...";
          deleteStatus.style.color = "green";
          dlg.remove();
          setTimeout(() => {
            window.protectedGlobals.rebuildhandler();
          }, 2000);
        } else {
          const errorText = result && result.error ? String(result.error) : "Failed to delete account.";
          errorMsg.textContent = errorText;
          errorMsg.style.display = "block";
          confirmBtn.disabled = false;
          deleteStatus.textContent = errorText;
          deleteStatus.style.color = "red";
        }
      } catch (e) {
        errorMsg.textContent = "Error: " + (e.message || "Failed to request account deletion.");
        errorMsg.style.display = "block";
        confirmBtn.disabled = false;
        deleteStatus.textContent = "Error: " + (e.message || "Failed to request account deletion.");
        deleteStatus.style.color = "red";
      }
    };

    footer.append(cancelBtn, confirmBtn);
    dlg.appendChild(footer);

    document.body.appendChild(dlg);
    passwordInput.focus();
  };

  mainContainer.append(deleteBtn, deleteStatus);
  // === About section + draggable dialog ===
  mainContainer.appendChild(sectionTitle("About"));

  const aboutRow = document.createElement("div");
  aboutRow.style.display = "flex";
  aboutRow.style.alignItems = "center";
  aboutRow.style.justifyContent = "space-between";
  aboutRow.style.marginTop = "8px";

  const aboutText = document.createElement("div");
  aboutText.textContent = "About Flowaway Goldenbody";
  aboutText.style.fontSize = "13px";

  const aboutBtn = document.createElement("button");
  aboutBtn.textContent = "Developer Docs";
  aboutBtn.style.marginLeft = "8px";

  aboutRow.append(aboutText, aboutBtn);
  mainContainer.appendChild(aboutRow);

  function showAboutDialog() {
    // If already exists, bring to front
    const existing = document.getElementById("settings-about-dialog");
    if (existing) {
      existing.style.display = "flex";
      return;
    }

    const dlg = document.createElement("div");
    dlg.id = "settings-about-dialog";
    Object.assign(dlg.style, {
      position: "fixed",
      left: "calc(50% - 300px)",
      top: "calc(50% - 90px)",
      width: "50vw",
      height: "50vh",
      minHeight: "180px",
      minWidth: "420px",
      background: window.protectedGlobals.data.dark ? "#222" : "#fff",
      color: window.protectedGlobals.data.dark ? "#fff" : "#000",
      borderRadius: "8px",
      boxShadow: "0 8px 30px rgba(0,0,0,0.3)",
      display: "flex",
      flexDirection: "column",
      overflow: "hidden",
      zIndex: 3000,
      resize: "both",
    });
    const header = document.createElement("div");
    header.style.display = "flex";
    header.style.alignItems = "center";
    header.style.justifyContent = "flex-start";
    header.style.padding = "8px 10px";
    header.style.cursor = "move";
    header.style.background = window.protectedGlobals.data.dark ? "#111" : "#f1f1f1";
    header.style.flexShrink = "0";
    header.style.position = "relative";
    const htitle = document.createElement("div");
    htitle.textContent = "About";
    htitle.style.fontWeight = "600";

    const closeX = document.createElement("button");
    closeX.setAttribute("aria-label", "Close dialog");
    closeX.innerHTML = `
      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
        <path d="M6 6L18 18" stroke="white" stroke-width="2.4" stroke-linecap="round"/>
        <path d="M18 6L6 18" stroke="white" stroke-width="2.4" stroke-linecap="round"/>
      </svg>
    `;
    Object.assign(closeX.style, {
      border: "none",
      background: "red",
      cursor: "pointer",
      width: "35px",
      height: "23px",
      padding: "0",
      display: "grid",
      placeItems: "center",
      lineHeight: "0",
    });

    header.append(htitle);
    dlg.appendChild(header);

    // position the close button in the top-right corner of the dialog
    Object.assign(closeX.style, {
      position: "absolute",
      right: "8px",
      top: "8px",
    });
    dlg.appendChild(closeX);

    const content = document.createElement("div");
    content.style.padding = "12px";
    content.style.fontSize = "13px";
    content.style.flex = "1";
    content.style.overflow = "auto";
    content.innerHTML = `
      <h2>App Developer Docs</h2>
      <p>This environment supports two app styles:</p>
      <ul>
        <li><strong>Sandboxed iframe apps</strong> using <code>requestAdminPerm: false</code>.</li>
        <li><strong>Admin apps</strong> using <code>requestAdminPerm: true</code> and a user-provided key.</li>
      </ul>
      <h3>App package layout</h3>
      <p>Apps live under <code>/systemfiles/runtime/apps/&lt;app-folder&gt;</code>. Every app must include an <code>entry.json</code> file and an executable JS file named by <code>jsFile</code>.</p>
      <h3><code>entry.json</code> fields</h3>
      <ul>
        <li><code>id</code> - unique app identifier.</li>
        <li><code>jsFile</code> - entry script file relative to the app folder.</li>
        <li><code>label</code> - display name for the app.</li>
        <li><code>iconFile</code> - icon asset path relative to the app folder.</li>
        <li><code>nonTextIcon</code> - boolean flag that tells the runtime the icon is not plain text. Use this for binary or complex icon rendering.</li>
        <li><code>svgEnabled</code> - boolean flag to render <code>iconFile</code> as SVG markup.</li>
        <li><code>pngEnabled</code> - boolean flag to render <code>iconFile</code> as a PNG image.</li>
        <li><code>requestAdminPerm</code> - <code>true</code> for full admin mode, <code>false</code> for sandboxed iframe mode.</li>
        <li><code>openfileCapability</code> - optional list of VFS file/folder patterns or capabilities used by File Explorer to determine if a file extension can be opened by this app. (extension is the .something behind a file), (VFS aka. cloud storage)</li>
        <li><code>enableDebugging</code> - boolean flag to enable debugging features for the app.</li>
      </ul>
      <p>These icon fields are used by start menu, taskbar, and runtime window rendering logic in <code>startMenu.js</code>, <code>goldenbody.js</code>, and <code>runtimeWindowSystem.js</code>. They determine whether the icon is rendered as text, SVG, or PNG.</p>
      <p>If <code>requestAdminPerm</code> is <code>true</code>, these extra fields are required:</p>
      <ul>
        <li><code>functionName</code> - globally exported launch function that the runtime calls.</li>
        <li><code>globalVarObjectString</code> - name of the global object for app instances.</li>
        <li><code>allAppArrayString</code> - array name under the global object for tracking instances.</li>
        <li><code>cmf</code> and <code>cmfl1</code> - app btn contextmenu hooks. (i personally think its useless)</li>
        <li><code>headless</code> - if you have this on, the app will only run in the background, it will be ignored if you have the <code>icon</code> entry in the json file.</li>
      </ul>
      <h3>How <code>requestAdminPerm</code> works</h3>
      <p>An app with <code>requestAdminPerm: true</code> is treated as an admin-style app only when the runtime can verify a matching key.</p>
      <p>The loader reads:</p>
      <ul>
        <li><code>&lt;app-folder&gt;/jsKey.txt</code></li>
        <li><code>systemfiles/userprofile/jsApiKey.txt</code></li>
      </ul>
      <p>Only if both exist and match will the runtime load the app script directly with full privileges. If the key is missing or invalid, the app is skipped or replaced by a placeholder launcher.</p>
      <p>This means admin apps are developer-mode apps: they can behave like system apps, but they still need a user-supplied API key to run. (system apps has those keys too, but they are written when ur acc is created)</p>
      <h3>Sandboxed iframe apps</h3>
      <p>When <code>requestAdminPerm</code> is <code>false</code>, the app runs inside a sandboxed iframe using <code>untrustedIframePatch.js</code>. That iframe has:</p>
      <ul>
        <li><code>sandbox="allow-scripts allow-pointer-lock"</code></li>
        <li>No direct access to DOM APIs like file inputs, localStorage, sessionStorage, IndexedDB, caches, or fullscreen exit APIs. (EXPERIMENTAL, aka not done)</li>
        <li>Only the exposed runtime API surface available through <code>window.__goldenbodyAPI</code>.</li>
      </ul>
      <h3>Iframe API reference</h3>
      <p>Sandboxed apps should call <code>window.__goldenbodyAPI</code>. Every method returns a promise, so await it in async code.</p>
      <ul>
        <li><code>readFile(pathOrHandle, options)</code> - read a file from the VFS. The first argument can be a plain string path or a picker result object like <code>{ path, key }</code>.</li>
        <li><code>writeFile(pathOrHandle, content, options)</code> - write text or binary data to a file.</li>
        <li><code>readFolder(pathOrHandle, options)</code> - list the children of a folder. If <code>options.detail === true</code>, the runtime returns objects with <code>path</code> and <code>type</code>.</li>
        <li><code>writeFolder(pathOrHandle, options)</code> - create a folder.</li>
        <li><code>deleteFile(pathOrHandle, options)</code> - delete a file.</li>
        <li><code>deleteFolder(pathOrHandle, options)</code> - delete a folder.</li>
        <li><code>renameFile(pathOrHandle, newName, options)</code> - rename a file.</li>
        <li><code>renameFolder(pathOrHandle, newName, options)</code> - rename a folder.</li>
        <li><code>pasteFile(destinationOrHandle, clipboardItems, options)</code> - paste a file payload into a destination folder.</li>
        <li><code>pasteFolder(destinationOrHandle, clipboardItems, options)</code> - paste a folder payload into a destination folder.</li>
        <li><code>folderExists(pathOrHandle, options)</code> - resolve <code>true</code> if the target exists and is a folder.</li>
        <li><code>fileExists(pathOrHandle, options)</code> - resolve <code>true</code> if the target exists and is a file.</li>
        <li><code>showOpenFilePicker(options)</code> - return a picker handle object describing the selected file or folder.</li>
        <li><code>showSaveFilePicker(options)</code> - return a picker handle object for a destination file.</li>
        <li><code>showDirectoryPicker(options)</code> - return a picker handle object for a destination directory.</li>
        <li><code>setInstanceTitle(title)</code> - set the instance title of your current instance.</li>
        <li><code>message(message, toInstance)</code> - send an instance message. Use <code>*</code> or <code>all</code> to broadcast.</li>
        <li><code>getCurInstanceNum()</code> - return the index of the current instance.</li>
        <li><code>getLiveInstanceIndex()</code> - return the number of live instances for your app.</li>
        <li><code>getTheme()</code> - return <code>dark</code> or <code>light</code>.</li>
      </ul>
      <p>These methods send a message to the host frame and return a promise.</p>
      <h4>How handles work</h4>
      <p>A handle in this platform is not a browser <code>FileSystemHandle</code> and it is not a special object you need to open or close. It is a small runtime record shaped like:</p>
      <pre><code>{ path: '/some/path.txt', key: 'uuid-key' }</code></pre>
      <p>The <code>path</code> field tells the runtime which VFS path to use. The <code>key</code> field is the permission token that was created when the user picked that file or folder. You keep this object and pass it back to later FS calls whenever you want to keep using the same picked target.</p>
      <p>There are two common patterns:</p>
      <ol>
        <li><strong>Plain path</strong>: use a normal string such as <code>/root/demo/notes.txt</code> when the target is already known and you are not using a picker token. This is the simplest pattern for paths you already know.</li>
        <li><strong>Handle object</strong>: use the object returned by <code>showOpenFilePicker</code>, <code>showSaveFilePicker</code>, or <code>showDirectoryPicker</code> when you want to keep editing the same picked target after the picker closes. The runtime uses the saved <code>path</code> plus the saved <code>key</code> for future calls. This is the pattern you want for writes and edits to a picked file or folder.</li>
      </ol>
      <h4>How to use each FS API</h4>
      <ul>
        <li><strong>readFile(input, options)</strong> - read a file. The first argument can be a plain string path or a handle object. Example: <code>await window.__goldenbodyAPI.readFile('/root/demo/notes.txt', { text: true })</code>. Result: a string when <code>{ text: true }</code> is used, or raw file bytes when you omit that option.</li>
        <li><strong>writeFile(input, content, options)</strong> - write text or binary content to a file. Example with a plain path: <code>await window.__goldenbodyAPI.writeFile('/root/demo/notes.txt', 'hello', { text: true })</code>. Result: <code>undefined</code>. Example with a handle: <code>await window.__goldenbodyAPI.writeFile(savedFileHandle, 'updated', { text: true })</code>. Result: <code>undefined</code>.</li>
        <li><strong>writeFolder(input, options)</strong> - create a folder. Example: <code>await window.__goldenbodyAPI.writeFolder('/root/demo/new-folder')</code>. Result: <code>undefined</code>. If you have a picked folder handle, you can reuse it: <code>await window.__goldenbodyAPI.writeFolder(folderHandle)</code>.</li>
        <li><strong>readFolder(input, options)</strong> - list children of a folder. Example without a handle: <code>await window.__goldenbodyAPI.readFolder('/root/demo')</code>. Result: an array of names, such as <code>['notes.txt', 'subfolder']</code>. Example with detail: <code>await window.__goldenbodyAPI.readFolder('/root/demo', { detail: true })</code>. Result: an array of objects like <code>[{ path: '/root/demo/notes.txt', type: 'file' }]</code>.</li>
        <li><strong>deleteFile(input, options)</strong> - delete a file. Example: <code>await window.__goldenbodyAPI.deleteFile('/root/demo/notes.txt')</code>. Result: <code>undefined</code>.</li>
        <li><strong>deleteFolder(input, options)</strong> - delete a folder. Example: <code>await window.__goldenbodyAPI.deleteFolder('/root/demo/old-folder')</code>. Result: <code>undefined</code>.</li>
        <li><strong>renameFile(input, newName, options)</strong> - rename a file. Example: <code>await window.__goldenbodyAPI.renameFile('/root/demo/notes.txt', 'draft.txt')</code>. Result: <code>undefined</code>.</li>
        <li><strong>renameFolder(input, newName, options)</strong> - rename a folder. Example: <code>await window.__goldenbodyAPI.renameFolder('/root/demo/old-folder', 'new-folder')</code>. Result: <code>undefined</code>.</li>
        <li><strong>pasteFile(destination, clipboardItems, options)</strong> - copy or move a file payload into a destination folder. Example: <code>await window.__goldenbodyAPI.pasteFile('/root/demo', [{ path: '/root/demo/template.txt', kind: 'file' }])</code>. Result: <code>undefined</code>.</li>
        <li><strong>pasteFolder(destination, clipboardItems, options)</strong> - copy or move a folder payload. Example: <code>await window.__goldenbodyAPI.pasteFolder('/root/demo', [{ path: '/root/demo/template-folder', kind: 'directory' }])</code>. Result: <code>undefined</code>.</li>
        <li><strong>folderExists(input, options)</strong> - check whether the target exists and is a folder. Example: <code>await window.__goldenbodyAPI.folderExists('/root/demo')</code>. Result: <code>true</code> or <code>false</code>.</li>
        <li><strong>fileExists(input, options)</strong> - check whether the target exists and is a file. Example: <code>await window.__goldenbodyAPI.fileExists('/root/demo/notes.txt')</code>. Result: <code>true</code> or <code>false</code>.</li>
      </ul>
      <h4>How to write a file inside a folder you picked</h4>
      <p>First pick a directory. Then build a child path inside that directory and reuse the same <code>key</code> from the folder handle.</p>
      <pre><code>const folderHandle = await window.__goldenbodyAPI.showDirectoryPicker();
const childFilePath = folderHandle.path + '/notes.txt';
await window.__goldenbodyAPI.writeFile(
  { path: childFilePath, key: folderHandle.key },
  'hello from the picked folder',
  { text: true }
);
</code></pre>
      <p>The important detail is that the folder handle object is not the file itself. It describes a directory, and you create the real file path by appending the file name to that directory path.</p>
      <h4>How to modify a file you picked</h4>
      <p>If you want to edit a file the user picked, keep the picker result and reuse it for later read/write calls.</p>
      <pre><code>const pickedFile = await window.__goldenbodyAPI.showOpenFilePicker();
const currentText = await window.__goldenbodyAPI.readFile(pickedFile, { text: true });
await window.__goldenbodyAPI.writeFile(
  pickedFile,
  currentText + '\n\nappended by the app',
  { text: true }
);
</code></pre>
      <p>The same handle object can be passed to <code>readFile</code>, <code>writeFile</code>, <code>deleteFile</code>, and the other file APIs. You do not need to re-pick the file for each operation as long as you keep the object around.</p>
      <h4>Picker results</h4>
      <p>Results from external pickers include:</p>
      <pre><code>{ kind: 'file' | 'directory', path, key, name }</code></pre>
      <p>If the picker path is not authorized with a valid key, writes do not go to the external path.</p>
      <h4>Using a directory picked with showDirectoryPicker</h4>
      <p>When you call <code>showDirectoryPicker</code>, the returned object is a folder handle that can be reused for all subsequent operations against that folder. The important part is that you keep the returned object and use it as the first argument whenever you want to operate inside that directory.</p>
      <pre><code>const folderHandle = await window.__goldenbodyAPI.showDirectoryPicker();

// read the folder contents
const listing = await window.__goldenbodyAPI.readFolder(folderHandle, { detail: true });
console.log(listing);

// check whether a child exists
const childExists = await window.__goldenbodyAPI.fileExists({ path: folderHandle.path + '/notes.txt', key: folderHandle.key });
console.log(childExists);

// write a new file inside that picked folder
await window.__goldenbodyAPI.writeFile(
  { path: folderHandle.path + '/notes.txt', key: folderHandle.key },
  'created via picked folder handle',
  { text: true }
);

// rename an existing child inside that folder
await window.__goldenbodyAPI.renameFile(
  { path: folderHandle.path + '/notes.txt', key: folderHandle.key },
  'renamed.txt'
);

// delete a child inside that folder
await window.__goldenbodyAPI.deleteFile({ path: folderHandle.path + '/renamed.txt', key: folderHandle.key });
</code></pre>
      <p>You can also use the same handle for a directory-level operation such as creating a subfolder, listing children, or checking whether the directory itself exists.</p>
      <pre><code>const folderHandle = await window.__goldenbodyAPI.showDirectoryPicker();
const exists = await window.__goldenbodyAPI.folderExists(folderHandle);
if (!exists) {
  await window.__goldenbodyAPI.writeFolder(folderHandle);
}
const children = await window.__goldenbodyAPI.readFolder(folderHandle);
console.log(children);
</code></pre>
      <h4>Common examples</h4>
      <pre><code>const saveHandle = await window.__goldenbodyAPI.showSaveFilePicker({ suggestedName: 'hello.txt' });
await window.__goldenbodyAPI.writeFile(saveHandle, 'hello world', { text: true });
const contents = await window.__goldenbodyAPI.readFile(saveHandle, { text: true });
console.log(contents);
</code></pre>
      <pre><code>const folderHandle = await window.__goldenbodyAPI.showDirectoryPicker();
const folderExists = await window.__goldenbodyAPI.folderExists(folderHandle);
if (!folderExists) {
  await window.__goldenbodyAPI.writeFolder(folderHandle);
}
const listing = await window.__goldenbodyAPI.readFolder(folderHandle, { detail: true });
console.log(listing);
await window.__goldenbodyAPI.renameFolder(folderHandle, 'new-name');
</code></pre>
      <pre><code>const targetFolder = '/root/demo';
const clipboardItems = [{ path: '/root/demo/template.txt', kind: 'file' }];
await window.__goldenbodyAPI.pasteFile(targetFolder, clipboardItems);
</code></pre>
      <h3>Admin app strategy</h3>
      <p>Admin apps should be designed differently from iframe apps:</p>
      <ul>
        <li>They can access the runtime directly once verified.</li>
        <li>They are not limited by the sandboxed APIs.</li>
        <li>They still must be installed under <code>/systemfiles/runtime/apps/&lt;folder&gt;</code> with a matching <code>jsKey.txt</code>.</li>
      </ul>
      <p>If you want to build a full system-style app, use <code>requestAdminPerm: true</code> and make sure your <code>jsKey.txt</code> is valid.</p>
      <h3>Admin app GUI framework</h3>
      <p>Admin apps can build their window looks through <code>window.protectedGlobals.apptools</code>, which is initialized by <code>initapptools.js</code>. The usual flow is:</p>
      <ol>
        <li>Create an app instance with <code>window.protectedGlobals.apptools.api.createAppInstance({...})</code>.</li>
        <li>Attach a title bar with <code>window.protectedGlobals.apptools.createtitlebar(root)</code>.</li>
        <li>Register the instance with <code>window.protectedGlobals.apptools.api.trackInstance(instance, appId)</code> so maximize/minimize/show/hide/close state is tracked by the runtime.</li>
      </ol>
      <pre><code>
"use strict";

window.myadminapp = () => {
  // necessary for the runtime to track this app instance
  const appId = "myAdminApp";
  let pos = window.protectedGlobals.getNextWindowXY();
  const instance = window.protectedGlobals.apptools.api.createAppInstance({ appId, posX: pos.x, posY: pos.y });
  window.protectedGlobals.apptools.api.trackInstance(instance, appId);

  // vars u prob need
  let appwindow = instance.rootElement;
  let dragTarget = instance.titlebarElement;
};
</code></pre>
      <p>For admin apps, <code>appLoader.js</code> validates the app entry object and only injects the script after the runtime confirms that the app folder has a matching <code>jsKey.txt</code> and <code>systemfiles/userprofile/jsApiKey.txt</code>.</p>
      <h3>Permissions and app settings</h3>
      <p>The Settings app stores <code>window.protectedGlobals.appPerms</code> in <code>/systemfiles/userprofile/appPermissions.json</code>. For sandboxed apps this controls:</p>
      <ul>
        <li><code>storage</code> - allow, deny, or ask for write access.</li>
        <li><code>notification</code> - allow, deny, or ask for notifications.</li>
        <li><code>launch</code> - allow, deny, or ask for launching other apps.</li>
      </ul>
      <p>Admin apps with valid keys are trusted differently, because they are expected to run with user-level privilege when the key is verified.</p>
      <h3>Entry file example</h3>
      <pre><code>{
  "id": "myApp",
  "label": "My App",
  "jsFile": "script.js",
  "iconFile": "icon.svg",
  "requestAdminPerm": false,
  "nonTextIcon": true, /* important */
  "svgEnabled": true, /* important */
  "pngEnabled": false, /* important */
  "openfileCapability": [".txt", ".md"],
  "enableDebugging": true
}
</code></pre>
      <p>For admin apps, include the launcher hooks and optionally a <code>headless</code> flag:</p>
      <pre><code>{
  "id": "myAdminApp",
  "label": "My Admin App",
  "jsFile": "app.js",
  "iconFile": "icon.svg",
  "requestAdminPerm": true,
  "functionName": "myAdminAppLauncher",
  "globalVarObjectString": "myAdminAppGlobals",
  "allAppArrayString": "instances",
  "cmf": "",
  "cmfl1": "",
  "headless": false
}
</code></pre>
      <h3>Bottom line</h3>
      <p>There are no hidden files or directories anywhere in cloud storage. You can edit <code>systemfiles</code> to change how the client behaves. If you break it, you can restore the system tree from the login page and remove broken non-system apps there. A copy of broken files will also be stored in your cloud storage.</p>
    `;
    dlg.appendChild(content);

    document.body.appendChild(dlg);

    // Close handler
    closeX.addEventListener("click", () => dlg.remove());

    // Make dialog draggable using pointer events on header
    (function makeDraggableDialog() {
      let dragging = false;
      let startX = 0,
        startY = 0,
        origLeft = 0,
        origTop = 0;

      header.addEventListener("pointerdown", (ev) => {
        dragging = true;
        startX = ev.clientX;
        startY = ev.clientY;
        origLeft = dlg.offsetLeft;
        origTop = dlg.offsetTop;
        header.setPointerCapture(ev.pointerId);
        document.body.style.userSelect = "none";
      });

      window.addEventListener("pointermove", (ev) => {
        if (!dragging) return;
        const dx = ev.clientX - startX;
        const dy = ev.clientY - startY;
        dlg.style.left = origLeft + dx + "px";
        dlg.style.top = Math.max(0, origTop + dy) + "px";
      });

      window.addEventListener("pointerup", (ev) => {
        if (!dragging) return;
        dragging = false;
        try {
          header.releasePointerCapture(ev.pointerId);
        } catch (e) {}
        document.body.style.userSelect = "";
      });
    })();
  }

  aboutBtn.addEventListener("click", showAboutDialog);

  window.settingsGlobals.allSettings.push({
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
    showAll: showAll,
    hideAll: hideAll,
    closeAll: closeAll,
    newWindow: newWindow,
    goldenbodyId: window.settingsGlobals.goldenbodyId,
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
    showAll: showAll,
    hideAll: hideAll,
    closeAll: closeAll,
    newWindow: newWindow,
    goldenbodyId: window.settingsGlobals.goldenbodyId,
  };
};


