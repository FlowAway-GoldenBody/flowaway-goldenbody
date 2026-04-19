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
    try {
      if (window.protectedGlobals.systemAPIs && window.protectedGlobals.systemAPIs.onResize)
        window.removeEventListener(
          "resize",
          window.protectedGlobals.systemAPIs.onResize,
        );
      window.protectedGlobals.systemAPIs = window.protectedGlobals.systemAPIs || {};
      window.protectedGlobals.systemAPIs.onResize = function () {
        try {
          document.querySelectorAll("[data-flow-control]").forEach((b) => {
            try {
              window.protectedGlobals._applyFlowawayControlSizing(b);
            } catch (e) {}
          });
        } catch (e) {}
      };
      window.addEventListener("resize", window.protectedGlobals.systemAPIs.onResize);
    } catch (e) {}
  }

  // finally apply sizing for this particular button
  try {
    window.protectedGlobals._applyFlowawayControlSizing(button);
  } catch (e) {}
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
window.protectedGlobals.buildPersistableUserProfile = function buildPersistableUserProfile(overrides = {}) {
  var runtime = window.protectedGlobals.data && typeof window.protectedGlobals.data === "object" ? window.protectedGlobals.data : {};
  return {
    schemaVersion: 1,
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
    volume: Number.isFinite(Number(overrides.volume))
      ? Number(overrides.volume)
      : Number.isFinite(Number(runtime.volume))
        ? Number(runtime.volume)
        : 40,
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
  };
};

window.protectedGlobals.persistUserProfilePatch = async function (patch = {}) {
  var profile = window.protectedGlobals.buildPersistableUserProfile(patch);
  window.protectedGlobals.data = window.protectedGlobals.data || {};
  Object.assign(window.protectedGlobals.data, profile);
  var encoded = btoa(JSON.stringify(profile, null, 2));
  return await window.protectedGlobals.filePost({
    saveSnapshot: true,
    directions: [
      {
        edit: true,
        path: window.protectedGlobals.USER_PROFILE_PATH,
        contents: encoded,
        replace: true,
      },
      { end: true },
    ],
  });
};







































window.protectedGlobals.throwError = function(scope, message, error, meta) {
throw new Error(
  "Error in " + String(scope || "unknown") + ": " + String(message || "No message") + (error ? "\n\n" + String(error) : "") + (meta ? "\n\nMeta: " + JSON.stringify(meta) : "")
);
}

window.protectedGlobals.showModal = function(title, body, level) {
  var isDark = true;
  try {
    var darkVal = null;
    if (window.protectedGlobals.data && typeof window.protectedGlobals.data.dark !== "undefined") darkVal = window.protectedGlobals.data.dark;
    else if (document.documentElement && document.documentElement.dataset && typeof document.documentElement.dataset.dark !== "undefined") darkVal = document.documentElement.dataset.dark;
    else if (document.body && document.body.dataset && typeof document.body.dataset.dark !== "undefined") darkVal = document.body.dataset.dark;

    if (typeof darkVal === "boolean") isDark = darkVal;
    else if (typeof darkVal === "number") isDark = !!darkVal;
    else if (typeof darkVal === "string") {
      var dv = darkVal.trim().toLowerCase();
      if (dv === "false" || dv === "0" || dv === "no" || dv === "off") isDark = false;
      else if (dv === "true" || dv === "1" || dv === "yes" || dv === "on") isDark = true;
    }
  } catch (e) {}

  var container = document.getElementById("flowaway-message-stack");
  if (!container) {
    container = document.createElement("div");
    container.id = "flowaway-message-stack";
    Object.assign(container.style, {
      position: "fixed",
      top: "14px",
      right: "14px",
      zIndex: "2147483646",
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
    try {
      card.remove();
    } catch (e) {}
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
    try {
      card.remove();
    } catch (e) {}
  }, 9000);
}

window.alert = function (message) {
  window.protectedGlobals.showModal("Alert", String(message || ""), "info");
};

window.confirm = function (message) {
  window.protectedGlobals.showModal("Confirm", String(message || ""), "info");
  return false;
};

window.prompt = function (message, defaultValue) {
  var text = String(message || "");
  if (typeof defaultValue !== "undefined" && defaultValue !== null) {
    text += "\nDefault: " + String(defaultValue);
  }
  window.protectedGlobals.showModal("Prompt", text, "info");
  return null;
};

window.protectedGlobals.flowawayCrash = function(message, detail) {
  window.protectedGlobals.notification("A critical error occurred: " + String(message || "") + (detail ? "\n\n" + String(detail) : ""));
}






window.protectedGlobals.removeOtherMenus = function (except) {
  try {
    // Remove any menus with the shared .app-menu class (used across apps)
    var menus = document.querySelectorAll(".app-menu");
    for (const m of menus) {
      try {
        if (except && m.dataset && m.dataset.appId === except) continue;
      } catch (e) {}
      try {
        m.remove();
      } catch (e) {}
    }
  } catch (e) {}
};
window.protectedGlobals.showUnifiedAppContextMenu = function (e,   appOverride = null,   needRemove = true) {
  if (!e) return;
  e.preventDefault();

  var app = window.protectedGlobals.resolveAppFromEvent(e, appOverride);
  if (!app) return;

  document.querySelectorAll(".app-menu").forEach((m) => m.remove());
  try {
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
  } catch (err) {}

  const menu = document.createElement("div");
  try {
    window.protectedGlobals.removeOtherMenus(app.id || app.functionname || "");
  } catch (err) {}

  menu.className = "app-menu";
  if (app && app.id) menu.dataset.appId = String(app.id);
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
    visibility: "hidden",
  });
  (window.protectedGlobals.data && window.protectedGlobals.data.dark)
    ? menu.classList.toggle("dark", true)
    : menu.classList.toggle("light", true);

  function withInstances(handler) {
    try {
      var instances = window.protectedGlobals.getAppInstances(app);
      handler(instances);
    } catch (err) {}
    menu.remove();
  }

  const closeAll = document.createElement("div");
  closeAll.textContent = "Close all";
  closeAll.style.padding = "6px 10px";
  closeAll.style.cursor = "pointer";
  closeAll.addEventListener("click", () => {
    withInstances((instances) => {
      const first = instances[0];
      if (first && typeof first.closeAll === "function") {
        first.closeAll();
        return;
      }
      for (const instance of [...instances]) {
        if (instance && typeof instance.closeWindow === "function") {
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
      if (first && typeof first.hideAll === "function") {
        first.hideAll();
        return;
      }
      for (const instance of instances) {
        if (instance && typeof instance.hideWindow === "function") {
          instance.hideWindow();
        } else if (instance && instance.rootElement) {
          instance.rootElement.style.display = "none";
        }
      }
    });
  });
  menu.appendChild(hideAll);

  const showAll = document.createElement("div");
  showAll.textContent = "Show all";
  showAll.style.padding = "6px 10px";
  showAll.style.cursor = "pointer";
  showAll.addEventListener("click", () => {
    withInstances((instances) => {
      const first = instances[0];
      if (first && typeof first.showAll === "function") {
        first.showAll();
        return;
      }
      instances.sort((a, b) => {
        var az = Number(a && a.rootElement && a.rootElement.style && a.rootElement.style.zIndex) || 0;
        var bz = Number(b && b.rootElement && b.rootElement.style && b.rootElement.style.zIndex) || 0;
        return az - bz;
      });
      for (const instance of instances) {
        if (instance && typeof instance.showWindow === "function") {
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
      if (first && typeof first.newWindow === "function") {
        first.newWindow();
      } else {
        window.protectedGlobals.launchApp(app.functionname);
      }
    });
  });
  menu.appendChild(newWindow);

  if (needRemove) {
    const remove = document.createElement("div");
    remove.textContent = "Remove from taskbar";
    remove.style.padding = "6px 10px";
    remove.style.cursor = "pointer";
    const contextMenuEvent = e;
    remove.addEventListener("click", () => {
      var btn =
        contextMenuEvent &&         contextMenuEvent.target &&         contextMenuEvent.target.closest
          ? contextMenuEvent.target.closest("button.taskbutton")
          : null;
      if (btn) {
        window.protectedGlobals.removeTaskButton(btn);
        try {
          window.protectedGlobals.saveTaskButtons();
          window.protectedGlobals.purgeButtons();
        } catch (err) {}
      }
      menu.remove();
    });
    menu.appendChild(remove);
  } else {
    const appId = app.functionname;
    const existingBtn = document.querySelector(
      `button.taskbutton[data-app-id="${appId}"]`,
    );

    if (existingBtn) {
      const remove = document.createElement("div");
      remove.textContent = "Remove from taskbar";
      remove.style.padding = "6px 10px";
      remove.style.cursor = "pointer";
      remove.addEventListener("click", function () {
        window.protectedGlobals.removeTaskButton(existingBtn);
        try {
          window.protectedGlobals.saveTaskButtons();
          window.protectedGlobals.purgeButtons();
        } catch (err) {}
        menu.remove();
      });
      menu.appendChild(remove);
    } else {
      const add = document.createElement("div");
      add.textContent = "Add to taskbar";
      add.style.padding = "6px 10px";
      add.style.cursor = "pointer";
      add.addEventListener("click", function () {
        let btn;
        if(app.cmf) {
        btn = window.protectedGlobals.addTaskButton(
          app.icon,
          () => window.protectedGlobals.launchApp(appId),
          window[app.globalvarobjectstring][app.cmf],
          "",
          appId,
        );
        }
        else {
        btn = window.protectedGlobals.addTaskButton(
          app.icon,
          () => window.protectedGlobals.launchApp(appId),
          window.protectedGlobals.cmf,
          "",
          appId,
        );
       }
        if (btn) btn.dataset.appId = appId;
        window.protectedGlobals.saveTaskButtons();
        window.protectedGlobals.purgeButtons();
        menu.remove();
      });
      menu.appendChild(add);
    }
  }

  const barrier = document.createElement("hr");
  menu.appendChild(barrier);

  const instances = window.protectedGlobals.getAppInstances(app);
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
        try {
          if (instance && typeof instance.showWindow === "function") {
            instance.showWindow();
          } else if (instance && instance.rootElement) {
            instance.rootElement.style.display = "block";
            window.protectedGlobals.bringToFront(instance.rootElement);
          }
        } catch (err) {}
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
    try {
      nativeMenuRemove();
    } catch (err) {}
    try {
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
    } catch (err) {}
  }

  try {
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
  } catch (err) {}

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
  window.protectedGlobals.showUnifiedAppContextMenu(e, appOverride, true);
};

window.protectedGlobals.cmfl1 = function (e, appOverride = null) {
  window.protectedGlobals.showUnifiedAppContextMenu(e, appOverride, false);
};

