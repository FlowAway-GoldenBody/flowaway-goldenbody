//settings global vars
window.settingsGlobals = {};
settingsGlobals.allSettings = [];
settingsGlobals.settingsId = 0;

settings = function (posX = 50, posY = 50) {
  startMenu.style.display = "none";
  async function post(data) {
    const res = await fetch(zmcdserver, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username, ...data, password: password }), // include password for authentication
    });
    return res.json();
  }

  let isMaximized = false;
  let _isMinimized = false;
  atTop = "settings";
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
  root.classList.add("settings");
  root.dataset.appId = "settings";
  bringToFront(root);
  document.body.appendChild(root);
  settingsGlobals.settingsId++;
  root.settingsId = settingsGlobals.settingsId;

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
    for (let i = 0; i < settingsGlobals.allSettings.length; i++) {
      if (settingsGlobals.allSettings[i].rootElement == root) {
        index = i;
      }
    }
    if (index !== false) settingsGlobals.allSettings.splice(index, 1);
    window.removeAllEventListenersForApp("settings" + root.settingsId);
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

      window.addEventListener("settings" + root.settingsId, "mousemove", (ev) => {
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

      window.addEventListener("settings" + root.settingsId, "mouseup", () => {
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
  oldinput.style.width = "calc(100% - 10px)";
  oldinput.style.boxSizing = "border-box";
  oldinput.style.padding = "6px";

  const input = document.createElement("input");
  input.type = "password";
  input.placeholder = "New password";
  input.style.width = "calc(100% - 10px)";
  input.style.boxSizing = "border-box";
  input.style.padding = "6px";

  const confirm = document.createElement("input");
  confirm.type = "password";
  confirm.placeholder = "Confirm password";
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
      const res = await post({
        updatePassword: true,
        oldPassword: oldinput.value,
        newPassword: input.value,
      });

      if (res.success) {
        status.textContent = "Password updated successfully.";
        status.style.color = "green";
        password = input.value; // Update global password variable
        data.password = input.value; // Update password in data object
        input.value = "";
        confirm.value = "";
      } else {
        throw new Error(res.error || "Failed");
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
  volume.value = data.volume;
  volume.style.width = "calc(100% - 10px)";

  volume.oninput = async () => {
    await post({ changeVolume: true, volume: volume.value });
    data.volume = volume.value;
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
  brightness.value = data.brightness;
  brightness.style.width = "calc(100% - 10px)";

  brightness.oninput = async () => {
    // Simple global brightness effect
    document.documentElement.style.filter = `brightness(${brightness.value}%)`;
    data.brightness = brightness.value;
    await post({
      changeBrightness: true,
      brightness: brightness.value,
    });
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
  themeToggle.checked = !!data.dark;

  /* Toggle handler */
  themeToggle.onchange = async () => {
    data.dark = themeToggle.checked;

    // Apply theme immediately
    applyStyles();

    // Persist to backend (optional but recommended)
    await post({
      setTheme: true,
      dark: data.dark,
    });
  };

  themeRow.append(themeLabel, themeToggle);
  mainContainer.appendChild(themeRow);

  /* =========================================================
   ⚙️ AUTO-UPDATE SYSTEM APPS
========================================================= */

  const autoupdateRow = document.createElement("div");
  autoupdateRow.style.alignItems = "center";
  autoupdateRow.style.marginTop = "8px";

  const autoupdateLabel = document.createElement("div");
  autoupdateLabel.textContent = "Auto-Update System Apps";
  autoupdateLabel.style.fontSize = "13px";

  const autoupdateToggle = document.createElement("input");
  autoupdateToggle.type = "checkbox";
  autoupdateToggle.checked = !!data.autoupdate;

  /* Toggle handler */
  autoupdateToggle.onchange = async () => {
    data.autoupdate = autoupdateToggle.checked;

    // Persist to backend
    await post({
      setAutoupdate: true,
      autoupdate: data.autoupdate,
    });
  };

  autoupdateRow.append(autoupdateLabel, autoupdateToggle);
  mainContainer.appendChild(autoupdateRow);

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
      const res = await post({
        deleteAcc: true,
        username: username,
        password: oldinput.value,
      });

      if (!res.success) {
        throw new Error();
      }

      deleteStatus.textContent = "Account deleted.";
      deleteStatus.style.color = "green";

      // Optional: force logout / reload
      setTimeout(() => location.reload(), 1000);
    } catch {
      deleteStatus.textContent = "Wrong password in old password input.";
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
  aboutText.textContent = "Learn more about this app.";
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
      existing.style.zIndex = 2001;
      return;
    }

    const dlg = document.createElement("div");
    dlg.id = "settings-about-dialog";
    Object.assign(dlg.style, {
      position: "fixed",
      left: "calc(50% - 260px)",
      top: "calc(50% - 90px)",
      width: "520px",
      minHeight: "180px",
      minWidth: "420px",
      background: data && data.dark ? "#222" : "#fff",
      color: data && data.dark ? "#fff" : "#000",
      borderRadius: "8px",
      boxShadow: "0 8px 30px rgba(0,0,0,0.3)",
      zIndex: 2000,
      display: "flex",
      flexDirection: "column",
      overflow: "hidden",
      resize: "both",
    });

    const header = document.createElement("div");
    header.style.display = "flex";
    header.style.alignItems = "center";
    header.style.justifyContent = "flex-start";
    header.style.padding = "8px 10px";
    header.style.cursor = "move";
    header.style.background = data && data.dark ? "#111" : "#f1f1f1";
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
      <div style="font-weight:600;margin-bottom:6px">About Flowaway Goldenbody</div>
      <div style="margin-bottom:6px">An utopia that has EVERYTHING unblocked (anything internet filters block, code your own apps, works on chromebooks), free, open-source, forever.</div>
      <div style="font-size:12px;color:gray">Version: ${typeof APP_VERSION !== 'undefined' ? APP_VERSION : 'unknown'}</div>
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
    settingsId: settingsGlobals.settingsId,
  });
  applyStyles();

  return {
    rootElement: root,
    btnMax,
    _isMinimized,
    isMaximized,
    getBounds,
    applyBounds,
    settingsId: settingsGlobals.settingsId,
  };
};

//app stuff
settingsGlobals.settingsContextMenu = function (e, needRemove = true) {
  e.preventDefault();

  // Remove any existing menus
  document.querySelectorAll(".app-menu").forEach((m) => m.remove());

  const menu = document.createElement("div");
  try {
    removeOtherMenus("settings");
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
    for (const i of settingsGlobals.allSettings) {
      i.rootElement.remove();
    }

    settingsGlobals.allSettings = [];
    menu.remove();
  });
  menu.appendChild(closeAll);

  const hideAll = document.createElement("div");
  hideAll.textContent = "Hide all";
  hideAll.style.padding = "6px 10px";
  hideAll.style.cursor = "pointer";
  hideAll.addEventListener("click", () => {
    for (const i of settingsGlobals.allSettings) {
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
    settingsGlobals.allSettings.sort(
      (a, b) => a.rootElement.style.zIndex - b.rootElement.style.zIndex,
    );
    for (const i of settingsGlobals.allSettings) {
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
    settings(50, 50);
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
      addTaskButton("⚙", settings, "settingsContextMenu", "settingsGlobals");
      saveTaskButtons();
      purgeButtons();
    });
    menu.appendChild(add);
  }
  const barrier = document.createElement("hr");
  menu.appendChild(barrier);

  if (settingsGlobals.allSettings.length === 0) {
    const item = document.createElement("div");
    item.textContent = "No open windows";
    item.style.padding = "6px 10px";
    menu.appendChild(item);
  } else {
    settingsGlobals.allSettings.forEach((instance, i) => {
      const item = document.createElement("div");
      item.textContent = instance.title || `Settings ${i + 1}`;

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
settingsGlobals.settingscontextmenuhandlerL1 = function (e) {
  settingsGlobals.settingsContextMenu(e, false);
};
