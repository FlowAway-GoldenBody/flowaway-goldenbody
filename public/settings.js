//settings global vars
  let allSettings = [];
  let settingsId = 0;

let settings = function (posX = 50, posY = 50) {
    startMenu.style.display = 'none';
      async function post(data) {
        const res = await fetch(zmcdserver, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ username, ...data }),
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
    root.classList.add('settings');
    bringToFront(root);
    document.body.appendChild(root);
    settingsId++;
    root._settingsId = settingsId;

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
    btnMin.className = 'btnMinColor';
    btnMin.title = "Minimize";
    topBar.appendChild(btnMin);

    var btnMax = document.createElement("button");
    btnMax.innerText = "‎     □    ‎ ";
    btnMax.className = 'btnMaxColor';
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
      for (let i = 0; i < allSettings.length; i++) {
        if (allSettings[i].rootElement == root) {
          index = i;
        }
      }
      if (index !== false) allSettings.splice(index, 1);
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
  oldinput.style.width = "100%";
  oldinput.style.boxSizing = "border-box";
  oldinput.style.padding = "6px";

  const input = document.createElement("input");
  input.type = "password";
  input.placeholder = "New password";
  input.style.width = "100%";
  input.style.boxSizing = "border-box";
  input.style.padding = "6px";

  const confirm = document.createElement("input");
  confirm.type = "password";
  confirm.placeholder = "Confirm password";
  confirm.style.width = "100%";
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
        newPassword: input.value
      });

      if (res.success) {
        status.textContent = "Password updated successfully.";
        status.style.color = "green";
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

  section.append(label, oldinput, input, confirm, button, status);
  root.append(title, section);


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

  root.appendChild(sectionTitle("Sound"));

  const volumeLabel = document.createElement("div");
  volumeLabel.textContent = "Volume";

  const volume = document.createElement("input");
  volume.type = "range";
  volume.min = 0;
  volume.max = 100;
  volume.value = data.volume;
  volume.style.width = "100%";

  volume.oninput = async () => {
    await post({changeVolume: true, volume: volume.value});
    data.volume = volume.value;
    // Optional global hook
    window.dispatchEvent(
      new CustomEvent("system-volume", {
        detail: volume.value
      })
    );
  };

  root.append(volumeLabel, volume);

  /* =========================================================
     🌞 DISPLAY — BRIGHTNESS
  ========================================================= */

  root.appendChild(sectionTitle("Display"));

  const brightLabel = document.createElement("div");
  brightLabel.textContent = "Brightness";

  const brightness = document.createElement("input");
  brightness.type = "range";
  brightness.min = 0;
  brightness.max = 100;
  brightness.value = data.brightness;
  brightness.style.width = "100%";

  brightness.oninput = async () => {
    // Simple global brightness effect
    document.documentElement.style.filter =
      `brightness(${brightness.value}%)`;
      data.brightness = brightness.value;
    await post({
        changeBrightness: true,
        brightness: brightness.value
    });
  };

  root.append(brightLabel, brightness);
/* =========================================================
   🌗 APPEARANCE — THEME
========================================================= */

root.appendChild(sectionTitle("Appearance"));

const themeRow = document.createElement("div");
themeRow.style.display = "flex";
themeRow.style.alignItems = "center";
themeRow.style.justifyContent = "space-between";
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
    dark: data.dark
  });
};

themeRow.append(themeLabel, themeToggle);
root.appendChild(themeRow);
  /* =========================================================
     🗑️ DANGER ZONE — DELETE ACCOUNT
  ========================================================= */

  root.appendChild(sectionTitle("Danger Zone"));

  const deleteBtn = document.createElement("button");
  deleteBtn.textContent = "Delete Account";
  deleteBtn.style.background = "#c0392b";
  deleteBtn.style.color = "white";

  const deleteStatus = statusLine();

  deleteBtn.onclick = async () => {

    deleteBtn.disabled = true;

    try {
      const res = await post({ deleteAcc: true, username: username, password: oldinput.value });

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

  root.append(deleteBtn, deleteStatus);




      allSettings.push({
        rootElement: root,
        btnMax,
        _isMinimized,
        isMaximized,
        getBounds,
        applyBounds,
        settingsId,
      });
          applyStyles();

      return {
        rootElement: root,
        btnMax,
        _isMinimized,
        isMaximized,
        getBounds,
        applyBounds,
        settingsId,
      };
    }
}






  //app stuff
  let settingsButtons = [];
  let settingsmenu;
  function settingsContextMenu(e, needRemove = true) {
    e.preventDefault();

    // Remove any existing menus
    document.querySelectorAll(".browser-menu").forEach((m) => m.remove());

    const menu = document.createElement("div");
    settingsmenu = menu;
    try {
      browsermenu.remove();
      browsermenu = null;
      explorermenu.remove();
      explorermenu = null;

    } catch (e) {}
    menu.className = "browser-menu";
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
      data.dark ? menu.classList.toggle('dark', true) : menu.classList.toggle('light', true);

    // --- Menu items ---
    const closeAll = document.createElement("div");
    closeAll.textContent = "Close all";
    closeAll.style.padding = "6px 10px";
    closeAll.style.cursor = "pointer";
    closeAll.addEventListener("click", () => {
      for (const i of allSettings) {
        i.rootElement.remove();
      }

      allSettings = [];
      menu.remove();
    });
    menu.appendChild(closeAll);

    const hideAll = document.createElement("div");
    hideAll.textContent = "Hide all";
    hideAll.style.padding = "6px 10px";
    hideAll.style.cursor = "pointer";
    hideAll.addEventListener("click", () => {
      for (const i of allSettings) {
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
      for (const i of allSettings) {
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
      settings("/", 50, 50);
      menu.remove();
    });
    menu.appendChild(newWindow);
    if (needRemove) {
      const remove = document.createElement("div");
      remove.textContent = "Remove from taskbar";
      remove.style.padding = "6px 10px";
      remove.style.cursor = "pointer";
      remove.addEventListener("click", () => {
        // Remove the setting’s taskbar button if it exists
        save();
        for (let i = taskbuttons.length; i > 0; i--) {
          i--;
          let index = parseInt(getStringAfterChar(e.target.id, "-"));
          if (
            index === parseInt(getStringAfterChar(taskbuttons[i].id, "-")) &&
            taskbuttons[i].id.startsWith("⚙")
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
        let settingsButton = addTaskButton("⚙", settings);
        save();
        purgeButtons();
        for (const fb of settingsButtons) {
          fb.addEventListener("contextmenu", settingsContextMenu);
        }
      });
      menu.appendChild(add);
    }
    const barrier = document.createElement("hr");
    menu.appendChild(barrier);

    if (allSettings.length === 0) {
      const item = document.createElement("div");
      item.textContent = "No open windows";
      item.style.padding = "6px 10px";
      menu.appendChild(item);
    } else {
      allSettings.forEach((instance, i) => {
        const item = document.createElement("div");
        item.textContent = instance.title || `Settings ${i + 1}`;

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
    settingsContextMenu(e, (needremove = false));
  }
  let sbtn = document.getElementById("settingsapp");
  sbtn.addEventListener("click", function () {
    settings();
  });
  sbtn.addEventListener("contextmenu", ehl1);
try {
  sysScript.addEventListener('load', () => {
    for (const settingsButton of settingsButtons) {
    settingsButton.addEventListener("contextmenu", settingsContextMenu);
  }});
} catch(e) {
    console.error('failed to add contextmenu, retrying in 1 second');
    setTimeout(() => {
    for (const settingsButton of settingsButtons) {
    settingsButton.addEventListener("contextmenu", settingsContextMenu);
    }
}, 1000);
}