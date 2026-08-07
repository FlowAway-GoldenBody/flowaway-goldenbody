"use strict";
window.protectedGlobals.applyWindowControlIcon = function (button, iconName, options = {}) {
  if (!button) return;
  var svg = window.protectedGlobals.windowControlSvgs[iconName] || "";
  button.innerHTML = svg;
  button.style.minHeight = options.minHeight || "1vh";

  // Store metadata on the element so we can recompute on resize
  button.dataset.flowControl = "true";
  button.dataset.flowControlIcon = iconName;
  // preferred vw amount for this control (numbers only)
  if (typeof options.minVw !== "undefined")
    button.dataset.minVw = String(options.minVw);
  else
    button.dataset.minVw =
      iconName === "restore" || iconName === "maximize" ? "2.6" : "2.3";
  // thresholds and fallbacks (pixels) - keep them identical per your request
  if (typeof options.thresholdPx !== "undefined")
    button.dataset.thresholdPx = String(options.thresholdPx);
  else
    button.dataset.thresholdPx =
      iconName === "restore" || iconName === "maximize" ? "35" : "31";
  if (typeof options.fallbackPx !== "undefined")
    button.dataset.fallbackPx = String(options.fallbackPx);
  else
    button.dataset.fallbackPx =
      iconName === "restore" || iconName === "maximize" ? "35" : "31";
  // allow overriding the explicit CSS value for minWidth
  if (typeof options.minWidth !== "undefined")
    button.dataset.minWidthOption = String(options.minWidth);

  // Apply sizing now based on current viewport
  if (!window.protectedGlobals._applyFlowawayControlSizing) {
    window.protectedGlobals._applyFlowawayControlSizing = function (btn) {
      if (!btn) return;
      var icon = btn.dataset.flowControlIcon;
      var vwVal =
        parseFloat(btn.dataset.minVw) ||
        (icon === "restore" || icon === "maximize" ? 2.6 : 2.3);
      var threshold =
        parseFloat(btn.dataset.thresholdPx) ||
        (icon === "restore" || icon === "maximize" ? 35 : 31);
      var fallback =
        btn.dataset.fallbackPx ||
        (icon === "restore" || icon === "maximize" ? "35" : "31");
      var computedPx =window.protectedGlobals.calculateVwInPixels(vwVal);

      // If a minWidth option was explicitly provided, respect it but cap it
      var opt = btn.dataset.minWidthOption;
      if (opt) {
        var s = String(opt).trim();
        if (s.endsWith("px")) {
          var val = parseFloat(s);
          if (!isNaN(val)) {
            var capped = Math.min(val, threshold);
            btn.style.minWidth = capped + "px";
            return;
          }
        }
        if (s.endsWith("vw")) {
          var vwNum = parseFloat(s);
          if (!isNaN(vwNum)) {
            var px = window.protectedGlobals.calculateVwInPixels(vwNum);
            if (px < threshold) {
              btn.style.minWidth = s; // safe to use vw
              return;
            } else {
              btn.style.minWidth = fallback + "px";
              return;
            }
          }
        }
        // fallback: try numeric parse as px
        var maybe = parseFloat(s);
        if (!isNaN(maybe)) {
          var capped2 = Math.min(maybe, threshold);
          btn.style.minWidth = capped2 + "px";
          return;
        }
        // If we couldn't parse, fallthrough to default behavior
      }

      // Default behavior: use vw when its computed px is below threshold, otherwise use fallback px
      if (computedPx < threshold) {
        btn.style.minWidth = vwVal + "vw";
      } else {
        btn.style.minWidth = fallback + "px";
      }
    };

    // Add a resize handler that reapplies sizing to tracked controls
    if (window.protectedGlobals.systemAPIs && window.protectedGlobals.systemAPIs.onResize)
      window.removeEventListener("resize", window.protectedGlobals.systemAPIs.onResize);
    window.protectedGlobals.systemAPIs = window.protectedGlobals.systemAPIs || {};
    window.protectedGlobals.systemAPIs.onResize = function () {
      document.querySelectorAll("[data-flow-control]").forEach((b) => {
        window.protectedGlobals._applyFlowawayControlSizing(b);
      });
    };
    window.addEventListener("resize", window.protectedGlobals.systemAPIs.onResize);
  }

  // finally apply sizing for this particular button
  window.protectedGlobals._applyFlowawayControlSizing(button);
};

window.protectedGlobals.setWindowMaximizeIcon = function (button, isMaximized) {
  window.protectedGlobals.applyWindowControlIcon(button, isMaximized ? "restore" : "maximize");
};

// helper functions for apps to use, not critical but can be used for various things, feel free to edit or remove as you see fit, these are just examples of things you can do with the apis provided to you in entry.json
window.protectedGlobals.formatBytes = function(bytes, decimals = 2) {
  if (bytes === 0) return "0 Bytes";

  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ["Bytes", "KB", "MB", "GB", "TB", "PB", "EB"];

  const i = Math.floor(Math.log(bytes) / Math.log(k));

  return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + " " + sizes[i];
}
window.protectedGlobals.calculateVwInPixels = function(vwValue) {
  const viewportWidth = window.innerWidth; // Get the current viewport width in pixels
  const pixels = (vwValue * viewportWidth) / 100; // Apply the conversion formula
  return pixels;
}


























// optional functions
window.protectedGlobals.buildPersistableUserProfile = async function (overrides = false) {
  var runtime = window.protectedGlobals.data;
  try {
    if (!overrides) return JSON.parse(await window.protectedGlobals.ReadFile('systemfiles/userprofile/profile.json', { text: true, direct: true }));
  } catch {}
  return {
    taskbuttons:
      Array.isArray(overrides.taskbuttons)
        ? overrides.taskbuttons
        : Array.isArray(runtime.taskbuttons)
          ? runtime.taskbuttons
          : [],
    brightness: Number.isFinite(Number(overrides.brightness))
      ? Number(overrides.brightness)
      : Number.isFinite(Number(runtime.brightness))
        ? Number(runtime.brightness)
        : 100,
    dark: typeof overrides.dark === "boolean" ? overrides.dark : !!runtime.dark,
    autohidetaskbar:
      typeof overrides.autohidetaskbar === "boolean"
        ? overrides.autohidetaskbar
        : !!runtime.autohidetaskbar,
    taskbarRevealEdgePx: Number.isFinite(Number(overrides.taskbarRevealEdgePx))
      ? Math.max(1, Math.min(64, Math.round(Number(overrides.taskbarRevealEdgePx))))
      : Number.isFinite(Number(runtime.taskbarRevealEdgePx))
        ? Math.max(1, Math.min(64, Math.round(Number(runtime.taskbarRevealEdgePx))))
        : 6,
    taskbarRevealHoldDelayMs: Number.isFinite(Number(overrides.taskbarRevealHoldDelayMs))
      ? Math.max(0, Math.min(5000, Math.round(Number(overrides.taskbarRevealHoldDelayMs))))
      : Number.isFinite(Number(runtime.taskbarRevealHoldDelayMs))
        ? Math.max(0, Math.min(5000, Math.round(Number(runtime.taskbarRevealHoldDelayMs))))
        : 450,
    autoupdate:
      typeof overrides.autoupdate === "boolean"
        ? overrides.autoupdate
        : typeof runtime.autoupdate === "boolean"
          ? runtime.autoupdate
          : true,
    DRAG_THRESHOLD: Number.isFinite(Number(overrides.DRAG_THRESHOLD))
      ? Math.max(2, Math.min(128, Math.round(Number(overrides.DRAG_THRESHOLD))))
      : Number.isFinite(Number(runtime.DRAG_THRESHOLD))
        ? Math.max(2, Math.min(128, Math.round(Number(runtime.DRAG_THRESHOLD))))
        : 15,
    taskbarOnTop:
      typeof overrides.taskbarOnTop === "boolean"
        ? overrides.taskbarOnTop
        : typeof runtime.taskbarOnTop === "boolean"
          ? runtime.taskbarOnTop
          : false,
    compactTaskbar:
      typeof overrides.compactTaskbar === "boolean"
        ? overrides.compactTaskbar
        : typeof runtime.compactTaskbar === "boolean"
          ? runtime.compactTaskbar
          : false,
  };
};

window.protectedGlobals.persistUserProfilePatch = async function (patch = {}) {
  var profile = await window.protectedGlobals.buildPersistableUserProfile(patch);
  Object.assign(window.protectedGlobals.data, profile);
  var encoded = JSON.stringify(profile, null, 2);
  return window.protectedGlobals.WriteFile("/systemfiles/userprofile/profile.json", encoded, { replace: true });
};

(async () => {
  var profile = await window.protectedGlobals.buildPersistableUserProfile();
  Object.assign(window.protectedGlobals.data, profile);
})();






































window.protectedGlobals.throwError = function(scope, message, error, meta) {
console.error(
  "Error in " + String(scope || "unknown") + ": " + String(message || "No message") + (error ? "\n\n" + String(error) : "") + (meta ? "\n\nMeta: " + JSON.stringify(meta) : "")
);
}

window.protectedGlobals.showModal = function(title, body, level) {
  var isDark = true;
  var darkVal = null;
  if (typeof window.protectedGlobals.data.dark !== "undefined") darkVal = window.protectedGlobals.data.dark;
  else if (document.documentElement && document.documentElement.dataset && typeof document.documentElement.dataset.dark !== "undefined") darkVal = document.documentElement.dataset.dark;
  else if (document.body && document.body.dataset && typeof document.body.dataset.dark !== "undefined") darkVal = document.body.dataset.dark;

  if (typeof darkVal === "boolean") isDark = darkVal;
  else if (typeof darkVal === "number") isDark = !!darkVal;
  else if (typeof darkVal === "string") {
    var dv = darkVal.trim().toLowerCase();
    if (dv === "false" || dv === "0" || dv === "no" || dv === "off") isDark = false;
    else if (dv === "true" || dv === "1" || dv === "yes" || dv === "on") isDark = true;
  }

  var container = document.getElementById("flowaway-message-stack");
  if (!container) {
    container = document.createElement("div");
    container.id = "flowaway-message-stack";
    Object.assign(container.style, {
      position: "fixed",
      top: "14px",
      right: "14px",
      zIndex: "100000",
      display: "flex",
      flexDirection: "column",
      gap: "10px",
      maxWidth: "min(460px, calc(100vw - 24px))",
      pointerEvents: "none",
    });
    document.body.appendChild(container);
  }

  var card = document.createElement("div");
  var baseBg = isDark ? "#161616" : "#ffffff";
  var errorBg = isDark ? "#2a1717" : "#fff1f1";
  var fg = isDark ? "#fff" : "#111";
  var border = isDark ? "1px solid rgba(255,255,255,0.18)" : "1px solid rgba(0,0,0,0.16)";
  Object.assign(card.style, {
    pointerEvents: "auto",
    borderRadius: "10px",
    border: border,
    background: level === "error" ? errorBg : baseBg,
    color: fg,
    minWidth: "300px",
    boxShadow: isDark ? "0 8px 28px rgba(0,0,0,0.35)" : "0 8px 28px rgba(0,0,0,0.18)",
    fontFamily: "sans-serif",
    fontSize: "13px",
    lineHeight: "1.4",
    overflow: "hidden",
  });

  var header = document.createElement("div");
  Object.assign(header.style, {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    padding: "10px 12px",
    fontWeight: "700",
    borderBottom: isDark ? "1px solid rgba(255,255,255,0.12)" : "1px solid rgba(0,0,0,0.10)",
  });

  var titleEl = document.createElement("div");
  titleEl.textContent = String(title || "Message");

  var closeBtn = document.createElement("button");
  closeBtn.type = "button";
  closeBtn.textContent = "✕";
  Object.assign(closeBtn.style, {
    border: "none",
    background: "transparent",
    color: fg,
    fontSize: "16px",
    lineHeight: "1",
    cursor: "pointer",
    padding: "0 2px",
  });
  closeBtn.addEventListener("click", function () {
    card.remove();
  });

  var bodyEl = document.createElement("div");
  bodyEl.textContent = String(body || "");
  bodyEl.style.padding = "10px 12px 12px";
  bodyEl.style.whiteSpace = "pre-wrap";

  header.appendChild(titleEl);
  header.appendChild(closeBtn);
  card.appendChild(header);
  card.appendChild(bodyEl);
  container.appendChild(card);

  setTimeout(function () {
    card.remove();
  }, 9000);
}

window.alert = function (message) {
  window.protectedGlobals.showModal("Alert", String(message || ""), "info");
};







window.protectedGlobals.removeOtherMenus = function (except) {
  // Remove any menus with the shared .app-menu class (used across apps)
  var menus = document.querySelectorAll(".app-menu");
  for (const m of menus) {
    if (except && m.dataset && m.dataset.appId === except) continue;
    if ((m.remove)) m.remove();
  }
};
window.protectedGlobals.showUnifiedAppContextMenu = function (e,   appOverride = null) {
  if (!e) return;
  e.preventDefault();

  var app = window.protectedGlobals.resolveAppFromEvent(e, appOverride);
  if (!app) return;

  document.querySelectorAll(".app-menu").forEach((m) => m.remove());
  window.protectedGlobals.systemAPIs = window.protectedGlobals.systemAPIs || {};
  if (window.protectedGlobals.systemAPIs.onAppMenuOutsidePointerDown) {
    document.removeEventListener(
      "pointerdown",
      window.protectedGlobals.systemAPIs.onAppMenuOutsidePointerDown,
      true,
    );
    delete window.protectedGlobals.systemAPIs.onAppMenuOutsidePointerDown;
  }
  if (window.protectedGlobals.systemAPIs.onAppMenuEscapeKey) {
    document.removeEventListener(
      "keydown",
      window.protectedGlobals.systemAPIs.onAppMenuEscapeKey,
      true,
    );
    delete window.protectedGlobals.systemAPIs.onAppMenuEscapeKey;
  }

  const menu = document.createElement("div");
  window.protectedGlobals.removeOtherMenus(app.id || "");

  menu.className = "app-menu";
  if (app && app.id) menu.dataset.appId = String(app.id);
  Object.assign(menu.style, {
    position: "fixed",
    left: `${e.clientX}px`,
    top: `${e.clientY}px`,
    border: "1px solid #ccc",
    borderRadius: "4px",
    boxShadow: "0 2px 6px rgba(0,0,0,0.2)",
    zIndex: 100001, // maximum z-index to ensure it appears on top
    padding: "4px 0",
    minWidth: "160px",
    fontSize: "13px",
    visibility: "hidden",
  });
  (window.protectedGlobals.data.dark)
    ? menu.classList.toggle("dark", true)
    : menu.classList.toggle("light", true);

  function withInstances(handler) {
    var instances = window[app.globalVarObjectString][app.allAppArrayString];
    handler(instances);
    menu.remove();
  }

  const closeAll = document.createElement("div");
  closeAll.textContent = "Close all";
  closeAll.style.padding = "6px 10px";
  closeAll.style.cursor = "pointer";
  closeAll.addEventListener("click", () => {
    withInstances((instances) => {
      const first = instances[0];
      if (first && (first.closeAll)) {
        first.closeAll();
        return;
      }
      for (const instance of [...instances]) {
        if (instance && (instance.closeWindow)) {
          instance.closeWindow();
        }
      }
    });
  });
  menu.appendChild(closeAll);

  const hideAll = document.createElement("div");
  hideAll.textContent = "Hide all";
  hideAll.style.padding = "6px 10px";
  hideAll.style.cursor = "pointer";
  hideAll.addEventListener("click", () => {
    withInstances((instances) => {
      const first = instances[0];
      if (first && (first.hideAll)) {
        first.hideAll();
        return;
      }
      for (const instance of instances) {
        if (instance && (instance.hideWindow)) {
          instance.hideWindow();
        } else if (instance && instance.rootElement) {
          instance.rootElement.style.display = "none";
        }
      }
    });
    window.protectedGlobals.bringToFront(null);
  });
  menu.appendChild(hideAll);

  const showAll = document.createElement("div");
  showAll.textContent = "Show all";
  showAll.style.padding = "6px 10px";
  showAll.style.cursor = "pointer";
  showAll.addEventListener("click", () => {
    withInstances((instances) => {
      const first = instances[0];
      if (first && (first.showAll)) {
        first.showAll();
        return;
      }
      instances.sort((a, b) => {
        var az = Number(a && a.rootElement && a.rootElement.style && a.rootElement.style.zIndex) || 0;
        var bz = Number(b && b.rootElement && b.rootElement.style && b.rootElement.style.zIndex) || 0;
        return az - bz;
      });
      for (const instance of instances) {
        if (instance && (instance.showWindow)) {
          instance.showWindow();
        } else if (instance && instance.rootElement) {
          instance.rootElement.style.display = "block";
          window.protectedGlobals.bringToFront(instance.rootElement);
        }
      }
    });
  });
  menu.appendChild(showAll);

  const newWindow = document.createElement("div");
  newWindow.textContent = "New window";
  newWindow.style.padding = "6px 10px";
  newWindow.style.cursor = "pointer";
  newWindow.addEventListener("click", () => {
    withInstances((instances) => {
      const first = instances[0];
      if (first && (first.newWindow)) {
        first.newWindow();
      } else {
        window.protectedGlobals.launchApp(app.id);
      }
    });
  });
  menu.appendChild(newWindow);

    const appId = app.id;
    const existingBtn = document.querySelector(
      `button.taskbutton[data-app-id="${appId}"]`,
    );

    if (existingBtn && existingBtn.dataset && existingBtn.dataset.pinned === "true") {
    const remove = document.createElement("div");
    remove.textContent = "Unpin from taskbar";
    remove.style.padding = "6px 10px";
    remove.style.cursor = "pointer";
    const contextMenuEvent = e;
    remove.addEventListener("click", () => {
      var btn =
        contextMenuEvent &&         contextMenuEvent.target &&         contextMenuEvent.target.closest
          ? contextMenuEvent.target.closest("button.taskbutton")
          : null;
      if (!btn) btn = window.protectedGlobals.taskbuttons.find((b) => b.dataset && b.dataset.appId === appId);
      if (btn) {
        btn.dataset.pinned = "false";
        if (window[app.globalVarObjectString][app.allAppArrayString].length === 0) {
          window.protectedGlobals.removeTaskButton(btn);
        }
        window.protectedGlobals.saveTaskButtons();
        window.protectedGlobals.purgeButtons();
      }
      menu.remove();
    });
    menu.appendChild(remove);
    } else {
    const add = document.createElement("div");
    add.textContent = "Pin to taskbar";
    add.style.padding = "6px 10px";
    add.style.cursor = "pointer";
    add.addEventListener("click", function () {
      // we only add a task button if the button dont exist, but we need to mark it pinned anyhow
      let taskbtnexist = false;
      let taskbuttons = window.protectedGlobals.taskbuttonsContainer.querySelectorAll("button");
      for (let btn of taskbuttons) {
        if (btn.dataset && btn.dataset.appId === appId) {
          taskbtnexist = true;
          btn.dataset.pinned = "true";
          break;
        }
      }
      if (!taskbtnexist) {
        let btn;
        if(app.cmf) {
        btn = window.protectedGlobals.addTaskButton(
          app.nonTextIcon ? app.id : app.icon,
          () => window.protectedGlobals.launchApp(appId),
          window[app.globalVarObjectString][app.cmf],
          "",
          appId,
          false, true, false, { svg: app.svgEnabled, png: app.pngEnabled, svgContent: app.icon, pngContent: app.icon }
        );
        }
        else {
        btn = window.protectedGlobals.addTaskButton(
          app.nonTextIcon ? app.id : app.icon,
          () => window.protectedGlobals.launchApp(appId),
          window.protectedGlobals.cmf,
          "",
          appId,
          false, true, false, { svg: app.svgEnabled, png: app.pngEnabled, svgContent: app.icon, pngContent: app.icon }
        );
      }
        if (btn) btn.dataset.appId = appId;
        window.protectedGlobals.saveTaskButtons();
        window.protectedGlobals.purgeButtons();
      }
        menu.remove();
    });
    menu.appendChild(add);
  }

  const barrier = document.createElement("hr");
  menu.appendChild(barrier);

  const instances = window[app.globalVarObjectString][app.allAppArrayString];
  if (instances.length === 0) {
    const item = document.createElement("div");
    item.textContent = "No open windows";
    item.style.padding = "6px 10px";
    menu.appendChild(item);
  } else {
    instances.forEach((instance, i) => {
      const item = document.createElement("div");
      item.textContent = instance.title || `${app.label || "Window"} ${i + 1}`;
      Object.assign(item.style, {
        padding: "6px 10px",
        cursor: "pointer",
        maxWidth: "185px",
        whiteSpace: "nowrap",
        overflow: "hidden",
        textOverflow: "ellipsis",
      });

      item.addEventListener("click", () => {
        if (instance && (instance.showWindow)) {
          instance.showWindow();
        } else if (instance && instance.rootElement) {
          instance.rootElement.style.display = "block";
          window.protectedGlobals.bringToFront(instance.rootElement);
        }
        menu.remove();
      });

      menu.appendChild(item);
    });
  }

  document.body.appendChild(menu);

  var nativeMenuRemove = menu.remove.bind(menu);
  var menuClosed = false;
  function closeMenu() {
    if (menuClosed) return;
    menuClosed = true;
    nativeMenuRemove();
    if (window.protectedGlobals.systemAPIs && window.protectedGlobals.systemAPIs.onAppMenuOutsidePointerDown) {
      document.removeEventListener(
        "pointerdown",
        window.protectedGlobals.systemAPIs.onAppMenuOutsidePointerDown,
        true,
      );
      delete window.protectedGlobals.systemAPIs.onAppMenuOutsidePointerDown;
    }
    if (window.protectedGlobals.systemAPIs && window.protectedGlobals.systemAPIs.onAppMenuEscapeKey) {
      document.removeEventListener(
        "keydown",
        window.protectedGlobals.systemAPIs.onAppMenuEscapeKey,
        true,
      );
      delete window.protectedGlobals.systemAPIs.onAppMenuEscapeKey;
    }
  }

  window.protectedGlobals.systemAPIs = window.protectedGlobals.systemAPIs || {};
  window.protectedGlobals.systemAPIs.onAppMenuOutsidePointerDown = function (evt) {
    if (!menu || !menu.isConnected) {
      closeMenu();
      return;
    }
    if (evt && evt.target && menu.contains(evt.target)) return;
    closeMenu();
  };
  window.protectedGlobals.systemAPIs.onAppMenuEscapeKey = function (evt) {
    if (!evt) return;
    if (evt.key === "Escape") closeMenu();
  };
  document.addEventListener(
    "pointerdown",
    window.protectedGlobals.systemAPIs.onAppMenuOutsidePointerDown,
    true,
  );
  document.addEventListener(
    "keydown",
    window.protectedGlobals.systemAPIs.onAppMenuEscapeKey,
    true,
  );

  menu.remove = closeMenu;

  requestAnimationFrame(() => {
    const menuHeight = menu.offsetHeight;
    let top = e.clientY - menuHeight;
    if (top < 0) top = 0;
    menu.style.top = `${top}px`;
    menu.style.visibility = "visible";
  });

};

window.protectedGlobals.cmf = function (e, appOverride = null) {
  window.protectedGlobals.showUnifiedAppContextMenu(e, appOverride);
};

window.protectedGlobals.cmfl1 = function (e, appOverride = null) {
  window.protectedGlobals.showUnifiedAppContextMenu(e, appOverride);
};




window.protectedGlobals.showConfirmDialog = (title, message) => {
    return new Promise((resolve) => {
      document.getElementById("confirm-dialog")?.remove();

      const dialog = document.createElement("div");
      dialog.id = "confirm-dialog";
      dialog.className = "panel";
      dialog.classList.toggle("dark", window.browserGlobals.dark);
      dialog.classList.toggle("light", !window.browserGlobals.dark);
      dialog.style.cssText =
        "position:fixed;left:50%;top:50%;transform:translate(-50%,-50%);z-index:999999;width:380px;border-radius:10px;box-shadow:0 20px 60px rgba(0,0,0,.6);padding:20px;font-family:system-ui;font-size:14px;";

      let resolved = false;
      function closeConfirmDialog(result) {
        if (resolved) return;
        resolved = true;
        try {
          document.removeEventListener(
            "pointerdown",
            onOutsidePointerDown,
            true,
          );
        } catch (e) {}
        try {
          document.removeEventListener("keydown", onEscKeyDown, true);
        } catch (e) {}
        dialog.remove();
        resolve(result);
      }

      function onOutsidePointerDown(event) {
        if (!dialog.contains(event.target)) {
          closeConfirmDialog(false);
        }
      }

      function onEscKeyDown(event) {
        if (event.key === "Escape") {
          event.preventDefault();
          closeConfirmDialog(false);
        }
      }

      const titleEl = document.createElement("div");
      titleEl.style.cssText =
        "font-weight:600;margin-bottom:12px;font-size:16px;";
      titleEl.textContent = title;
      dialog.appendChild(titleEl);

      const msgEl = document.createElement("div");
      msgEl.style.cssText = `font-size:14px;color:#${window.browserGlobals.dark ? "ccc" : "666"};margin-bottom:20px;line-height:1.5;`;
      msgEl.textContent = message;
      dialog.appendChild(msgEl);

      const btnRow = document.createElement("div");
      btnRow.style.cssText = "display:flex;justify-content:flex-end;gap:8px;";

      const btnCancel = document.createElement("button");
      btnCancel.textContent = "Cancel";
      btnCancel.style.cssText =
        "padding:8px 16px;border-radius:6px;border:1px solid #ccc;background:#f5f5f5;cursor:pointer;font-size:14px;";
      btnCancel.onmouseenter = () => (btnCancel.style.background = "#e8e8e8");
      btnCancel.onmouseleave = () => (btnCancel.style.background = "#f5f5f5");
      btnCancel.onclick = () => closeConfirmDialog(false);

      const btnConfirm = document.createElement("button");
      btnConfirm.textContent = "Continue";
      btnConfirm.style.cssText =
        "padding:8px 16px;border-radius:6px;border:none;background:#4c8bf5;color:#fff;cursor:pointer;font-size:14px;";
      btnConfirm.onmouseenter = () => (btnConfirm.style.background = "#3a75d4");
      btnConfirm.onmouseleave = () => (btnConfirm.style.background = "#4c8bf5");
      btnConfirm.onclick = () => closeConfirmDialog(true);

      btnRow.appendChild(btnCancel);
      btnRow.appendChild(btnConfirm);
      dialog.appendChild(btnRow);

      document.body.appendChild(dialog);

      setTimeout(() => {
        if (!resolved) {
          document.addEventListener("pointerdown", onOutsidePointerDown, true);
          document.addEventListener("keydown", onEscKeyDown, true);
        }
      }, 0);

      btnConfirm.focus();
    });
  }