//settings global vars
window.settingsGlobals = {};
settingsGlobals.allSettings = [];
settingsGlobals.goldenbodyId = 0;

function persistSettingsProfilePatch(patch) {
  if (typeof window.protectedGlobals.persistUserProfilePatch === "function") {
     return window.protectedGlobals.persistUserProfilePatch(patch || {});
  }
  return Promise.resolve({ success: false, error: "profile persistence unavailable" });
}

settings = function (posX = 50, posY = 50) {
  window.protectedGlobals.startMenu.style.display = "none";

  let isMaximized = false;
  let _isMinimized = false;
  window.protectedGlobals.atTop = "settings";
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
  root.classList.add("settings");
  root.dataset.appId = "settings";
  window.protectedGlobals.bringToFront(root);
  document.body.appendChild(root);
  settingsGlobals.goldenbodyId++;
  root.goldenbodyId = settingsGlobals.goldenbodyId;

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
    root.style.top = "0";
    root.style.width = "100%";
    root.style.height = !window.protectedGlobals.data.autohidetaskbar ? `calc(100% - 60px)` : "100%";
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
    const index = settingsGlobals.allSettings.findIndex(
      (instance) => instance.rootElement == root,
    );
    if (index !== -1) settingsGlobals.allSettings.splice(index, 1);
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
    for (const instance of [...settingsGlobals.allSettings]) {
      if (instance && typeof instance.closeWindow === "function") {
        instance.closeWindow();
      }
    }
    settingsGlobals.allSettings = [];
  }

  function hideAll() {
    for (const instance of settingsGlobals.allSettings) {
      if (instance && typeof instance.hideWindow === "function") {
        instance.hideWindow();
      }
    }
  }

  function showAll() {
    settingsGlobals.allSettings.sort(
      (a, b) => a.rootElement.style.zIndex - b.rootElement.style.zIndex,
    );
    for (const instance of settingsGlobals.allSettings) {
      if (instance && typeof instance.showWindow === "function") {
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

      topBar.addEventListener("mousedown", (ev) => {
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

      window.addEventListener("settings" + root.goldenbodyId, "mousemove", (ev) => {
        if (!dragging) return;
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

      window.addEventListener("settings" + root.goldenbodyId, "mouseup", () => {
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

  // Assuming you already have a root container like:
  // const root = document.getElementById("root");

  // Make mainContainer fill the root and add padding
  let mainContainer = document.createElement("div");
  mainContainer.style.width = "calc(100% - 50%)";
  mainContainer.style.height = "100%";
  mainContainer.style.boxSizing = "border-box"; // ensures padding is included
  mainContainer.style.margin = "0 15px"; // top/bottom 0, left/right 8px
  mainContainer.style.overflowY = "auto"; // optional: adds scroll if content overflows
  root.appendChild(mainContainer);

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

    if (!input.value || !confirm.value) {
      status.textContent = "Password cannot be empty.";
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
        status.textContent = String(res.error);
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
  /* =========================================================
     🔊 SOUND — VOLUME
  ========================================================= */

  mainContainer.appendChild(sectionTitle("Sound"));

  const volumeLabel = document.createElement("div");
  volumeLabel.textContent = "Volume";

  const volume = document.createElement("input");
  volume.type = "range";
  volume.min = 0;
  volume.max = 100;
  volume.value = window.protectedGlobals.data.volume;
  volume.style.width = "calc(100% - 10px)";

  volume.oninput = async () => {
    window.protectedGlobals.data.volume = volume.value;
    await persistSettingsProfilePatch({ volume: Number(volume.value) });
    // Optional global hook
    window.dispatchEvent(
      new CustomEvent("system-volume", {
        detail: volume.value,
      }),
    );
  };

  mainContainer.append(volumeLabel, volume);

  /* ========================================================="}
     🌞 DISPLAY — BRIGHTNESS
  ========================================================= */

  mainContainer.appendChild(sectionTitle("Display"));

  const brightLabel = document.createElement("div");
  brightLabel.textContent = "Brightness";

  const brightness = document.createElement("input");
  brightness.type = "range";
  brightness.min = 0;
  brightness.max = 100;
  brightness.value = window.protectedGlobals.data.brightness;
  brightness.style.width = "calc(100% - 10px)";

  brightness.oninput = async () => {
    // Simple global brightness effect
    document.documentElement.style.filter = `brightness(${brightness.value}%)`;
    window.protectedGlobals.data.brightness = brightness.value;
    await persistSettingsProfilePatch({ brightness: Number(brightness.value) });
  };

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
    await persistSettingsProfilePatch({ dark: !!window.protectedGlobals.data.dark });
  };

  themeRow.append(themeLabel, themeToggle);
  mainContainer.appendChild(themeRow);

  window.protectedGlobals.data.taskbarRevealEdgePx = Number.isFinite(Number(window.protectedGlobals.data.taskbarRevealEdgePx))
    ? Math.max(1, Math.min(64, Math.round(Number(window.protectedGlobals.data.taskbarRevealEdgePx))))
    : 6;
  window.protectedGlobals.data.taskbarRevealHoldDelayMs = Number.isFinite(Number(window.protectedGlobals.data.taskbarRevealHoldDelayMs))
    ? Math.max(0, Math.min(5000, Math.round(Number(window.protectedGlobals.data.taskbarRevealHoldDelayMs))))
    : 450;

  const autohideRow = document.createElement("div");
  autohideRow.style.alignItems = "center";
  autohideRow.style.marginTop = "8px";

  // const autohideLabel = document.createElement("div");
  // autohideLabel.textContent = "Autohide Taskbar";
  // autohideLabel.style.fontSize = "13px";

  // const autohideToggle = document.createElement("input");
  // autohideToggle.type = "checkbox";
  // autohideToggle.checked = !!window.protectedGlobals.data.autohidetaskbar;

  // autohideToggle.onchange = async () => {
  //   window.protectedGlobals.data.autohidetaskbar = autohideToggle.checked;
  //   await persistSettingsProfilePatch({
  //     autohidetaskbar: !!window.protectedGlobals.data.autohidetaskbar,
  //     taskbarRevealEdgePx: Number(window.protectedGlobals.data.taskbarRevealEdgePx),
  //     taskbarRevealHoldDelayMs: Number(window.protectedGlobals.data.taskbarRevealHoldDelayMs),
  //   });
  //   if (window.protectedGlobals.applyTaskbarAutohideSettings) {
  //     window.protectedGlobals.applyTaskbarAutohideSettings({
  //       autohidetaskbar: window.protectedGlobals.data.autohidetaskbar,
  //       taskbarRevealEdgePx: window.protectedGlobals.data.taskbarRevealEdgePx,
  //       taskbarRevealHoldDelayMs: window.protectedGlobals.data.taskbarRevealHoldDelayMs,
  //     });
  //   }
  // };

  // autohideRow.append(autohideLabel, autohideToggle);
  // mainContainer.appendChild(autohideRow);

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
    await persistSettingsProfilePatch({
      autohidetaskbar: !!window.protectedGlobals.data.autohidetaskbar,
      taskbarRevealEdgePx: normalized,
      taskbarRevealHoldDelayMs: Number(window.protectedGlobals.data.taskbarRevealHoldDelayMs),
    });
    if (window.protectedGlobals.applyTaskbarAutohideSettings) {
      window.protectedGlobals.applyTaskbarAutohideSettings({
        autohidetaskbar: window.protectedGlobals.data.autohidetaskbar,
        taskbarRevealEdgePx: window.protectedGlobals.data.taskbarRevealEdgePx,
        taskbarRevealHoldDelayMs: window.protectedGlobals.data.taskbarRevealHoldDelayMs,
      });
    }
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
    await persistSettingsProfilePatch({
      autohidetaskbar: !!window.protectedGlobals.data.autohidetaskbar,
      taskbarRevealEdgePx: Number(window.protectedGlobals.data.taskbarRevealEdgePx),
      taskbarRevealHoldDelayMs: normalized,
    });
    if (window.protectedGlobals.applyTaskbarAutohideSettings) {
      window.protectedGlobals.applyTaskbarAutohideSettings({
        autohidetaskbar: window.protectedGlobals.data.autohidetaskbar,
        taskbarRevealEdgePx: window.protectedGlobals.data.taskbarRevealEdgePx,
        taskbarRevealHoldDelayMs: window.protectedGlobals.data.taskbarRevealHoldDelayMs,
      });
    }
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
    await persistSettingsProfilePatch({ autoupdate: !!window.protectedGlobals.data.autoupdate });
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
    await persistSettingsProfilePatch({ DRAG_THRESHOLD: normalized });
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
    deleteBtn.disabled = true;

    try {
      deleteStatus.textContent = "Account deletion moved to login service.";
      deleteStatus.style.color = "orange";
      deleteBtn.disabled = false;
    } catch {
      deleteStatus.textContent = "Failed to request account deletion.";
      deleteStatus.style.color = "red";
      deleteBtn.disabled = false;
    }
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
  aboutBtn.textContent = "About";
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
      resize: "both",
    });
    window.protectedGlobals.bringToFront(dlg);
    const header = document.createElement("div");
    header.style.display = "flex";
    header.style.alignItems = "center";
    header.style.justifyContent = "flex-start";
    header.style.padding = "8px 10px";
    header.style.cursor = "move";
    header.style.background = window.protectedGlobals.data.dark ? "#111" : "#f1f1f1";
    header.style.flexShrink = "0";
    header.style.position = "relative";
    header.onclick = () => window.protectedGlobals.bringToFront(dlg);
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
      <div style="font-weight:600;margin-bottom:6px">About Flowaway Goldenbody</div>
      <div style="margin-bottom:6px">An utopia that has EVERYTHING unblocked (anything internet filters block, code your own apps, works on chromebooks), free, open-source, forever.</div>
      <div style="font-size:12px;color:gray">Version: ${window.protectedGlobals.APP_VERSION || 'unknown'}</div>
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

  settingsGlobals.allSettings.push({
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
    goldenbodyId: settingsGlobals.goldenbodyId,
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
    goldenbodyId: settingsGlobals.goldenbodyId,
  };
};


