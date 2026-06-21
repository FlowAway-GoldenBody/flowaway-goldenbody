(function () {
window.protectedGlobals.applyTaskButtons = function applyTaskButtons() {
  if (window.protectedGlobals.appsButtonsApplied) return;
  if (!window.protectedGlobals.apps || window.protectedGlobals.apps.length === 0) return;

  var taskbarReady = !!(window.protectedGlobals.taskbar && window.protectedGlobals.taskbar.isConnected);

  if (!taskbarReady) {
    window.protectedGlobals.systemAPIs = window.protectedGlobals.systemAPIs || {};
    if (!window.protectedGlobals.systemAPIs.applyTaskButtonsRetryTimer) {
      window.protectedGlobals.systemAPIs.applyTaskButtonsRetryTimer = setTimeout(
        () => {
          if (
            window.protectedGlobals.systemAPIs &&
            window.protectedGlobals.systemAPIs.applyTaskButtonsRetryTimer
          ) {
            clearTimeout(
              window.protectedGlobals.systemAPIs.applyTaskButtonsRetryTimer,
            );
            delete window.protectedGlobals.systemAPIs.applyTaskButtonsRetryTimer;
          }
          applyTaskButtons();
        },
        200,
      );
    }
    return;
  }

  window.protectedGlobals.appsButtonsApplied = true;

  // Clear existing dynamic task buttons (keep system buttons in the first two slots)
  var existingTaskButtons = [
    ...window.protectedGlobals.taskbuttonsContainer.querySelectorAll("button.taskbutton"),
  ];
  existingTaskButtons.splice(0, 2);
  existingTaskButtons.forEach((btn) => btn.remove());

  // Prefer dynamic apps discovered in /apps
  var savedTaskButtons = Array.isArray(window.protectedGlobals.data && window.protectedGlobals.data.taskbuttons)
    ? window.protectedGlobals.data.taskbuttons
    : [];
  var seenAppIds = new Set();
  for (const taskbutton of savedTaskButtons) {
    const app = (window.protectedGlobals.apps || []).find((a) =>
      window.protectedGlobals.appMatchesIdentifier(a, taskbutton),
    );
    if (app) {
      const appId = app.functionname;
      let btn;
      if (seenAppIds.has(appId)) continue;
      seenAppIds.add(appId);
      
      if (app.cmf) {
        btn = window.protectedGlobals.addTaskButton(
          app.icon,
          () => window.protectedGlobals.launchApp(appId),
          window[app.globalvarobjectstring][app.cmf],
          "",
          appId,
          false,
          true, // pinned by default if in saved taskbuttons
        );
      }
      else {
        btn = window.protectedGlobals.addTaskButton(
          app.icon,
          () => window.protectedGlobals.launchApp(appId),
          window.protectedGlobals.cmf,
          "",
          appId,
          false,
          true
        );
      }
      if (btn) btn.dataset.appId = appId;
    }
  }
  window.protectedGlobals.taskbuttons = [...window.protectedGlobals.taskbuttonsContainer.querySelectorAll("button")];
  window.protectedGlobals.saveTaskButtons();
}

const purgeButtons = window.protectedGlobals.purgeButtons = function purgeButtons() {
  var buttons = [...window.protectedGlobals.taskbuttonsContainer.querySelectorAll("button")];
  buttons.splice(0, 3);
  buttons.forEach((b) => {
    if (!b.dataset.appId) {
      b.dataset.appId = b.textContent;
    }
  });
  // Build a generic map from appId -> [buttons]
  window.protectedGlobals.appButtons = window.protectedGlobals.appButtons || {};
  window.protectedGlobals.appButtons = {};
  for (let i = 0; i < (window.protectedGlobals.taskbuttons || []).length; i++) {
    let tb = window.protectedGlobals.taskbuttons[i];
    var id = tb.dataset.appId;
    if (!id) continue;
    window.protectedGlobals.appButtons[id] = window.protectedGlobals.appButtons[id] || [];
    window.protectedGlobals.appButtons[id].push(tb);
  }
}

const saveTaskButtons = window.protectedGlobals.saveTaskButtons = function saveTaskButtons(silence = true) {
  if (!window.protectedGlobals.appsButtonsApplied) return;
  var buttons = [...window.protectedGlobals.taskbuttonsContainer.querySelectorAll("button")];
  buttons.splice(0, 2);
  var postdata = [];
  for (const b of buttons) {
    // Only save pinned buttons
    if (b.dataset && b.dataset.pinned === 'true') {
      if (b.dataset.appId) {
        postdata.push(b.dataset.appId);
      } else {
        // If no appId, try to infer id from value or textContent
        var inferred =
          (b.value && String(b.value).trim()) ||
          (b.textContent && String(b.textContent).trim());
        if (inferred) postdata.push(inferred);
      }
    }
  }
  if (!silence) window.protectedGlobals.notification("taskbuttons saved!");
  window.protectedGlobals.posttaskbuttons(postdata);
}
const bringToFront = window.protectedGlobals.bringToFront = function bringToFront(el) {
  if (!el) return;
  var appId = resolveWindowAppId(el);
  window.protectedGlobals.atTop = appId || "";
  el.style.zIndex = String(++window.protectedGlobals.zTop);
}

const resolveWindowAppId = window.protectedGlobals.resolveWindowAppId = function resolveWindowAppId(el) {
  if (!el) return "";
  var appId = el.dataset && el.dataset.appId;
  if (!appId) appId = el.getAttribute && el.getAttribute("data-app-id");
  if (!appId && window.protectedGlobals.apps && Array.isArray(window.protectedGlobals.apps)) {
    for (const a of window.protectedGlobals.apps) {
      // Only use real identifier strings (functionname) for class/id matching.
      // a.id and a.icon are icon content (emoji or HTML markup), not valid identifiers.
      var candidates = [a.functionname].filter(function (c) {
        return c && c.length < 64;
      });
      var matched = candidates.some(function (cid) {
        return (
          el.classList.contains(cid) || el.id === cid + "app" || el.id === cid
        );
      });
      if (matched) {
        appId = a.functionname;
        break;
      }
    }
  }
  return appId || "";
}

const findAppByIdentifier = window.protectedGlobals.findAppByIdentifier = function findAppByIdentifier(identifier) {
  if (!identifier || !window.protectedGlobals.apps || !Array.isArray(window.protectedGlobals.apps)) return null;
  for (const a of window.protectedGlobals.apps) {
    if (!a) continue;
    // Only match against true identifiers (functionname).
    // Do NOT match a.id or a.icon — those contain icon HTML/emoji content, not identifiers.
    if (identifier === a.functionname) {
      return a;
    }
  }
  return null;
}

const resolveWindowLabel = window.protectedGlobals.resolveWindowLabel = function resolveWindowLabel(el) {
  var appId = resolveWindowAppId(el);
  var windowTitle = "";
  windowTitle = (
    (el && el.getAttribute && el.getAttribute("data-title")) ||
    ""
  ).trim();
  if (windowTitle && windowTitle !== "undefined" && windowTitle !== "null")
    return windowTitle;

  var appMeta = findAppByIdentifier(appId);
  if (appMeta) {
    var appLabel = (appMeta.label || appMeta.name || "").trim();
    if (appLabel && appLabel !== "undefined" && appLabel !== "null")
      return appLabel;
  }
  if (appId !== "undefined" && appId !== "null")
    return appId;
  return "Window";
}

const getSwitchableWindows = window.protectedGlobals.getSwitchableWindows = function getSwitchableWindows() {
  return Array.from(document.querySelectorAll(".app-window-root")).filter((el) => {
    if (!el || !el.isConnected) return false;
    var cs = window.getComputedStyle(el);
    if (!cs) return false;
    return cs.display !== "none" && cs.visibility !== "hidden";
  });
}

const resolveFocusedWindowRoot = window.protectedGlobals.resolveFocusedWindowRoot = function resolveFocusedWindowRoot(windows) {
  var active = null;
  active = document.activeElement;

  if (active) {
    if ((active.closest)) {
      var candidate = active.closest(".app-window-root");
      if (candidate && (!windows || windows.indexOf(candidate) !== -1)) {
        return candidate;
      }
    }
  }

  if (window.protectedGlobals.atTop && windows && windows.length) {
    for (var i = 0; i < windows.length; i++) {
      if (resolveWindowAppId(windows[i]) === window.protectedGlobals.atTop) return windows[i];
    }
  }

  return null;
}

window.protectedGlobals.windowSwitchState = {
  active: false,
  mod: "",
  order: [],
  index: 0,
  lastTs: 0,
  pendingTarget: null,
  previewRoot: null,
  previewList: null,
};
var windowSwitchState = window.protectedGlobals.windowSwitchState;

var prepareWindowSwitchPreview = window.protectedGlobals.prepareWindowSwitchPreview = function prepareWindowSwitchPreview() {
  if (
    windowSwitchState.previewRoot &&
    windowSwitchState.previewRoot.isConnected
  )
    return;

  var root = document.createElement("div");
  root.setAttribute("aria-hidden", "true");
  Object.assign(root.style, {
    position: "fixed",
    inset: "0",
    zIndex: "2147483646",
    display: "none",
    alignItems: "center",
    justifyContent: "center",
    pointerEvents: "none",
    background: "rgba(0, 0, 0, 0.12)",
    backdropFilter: "blur(2px)",
  });

  var panel = document.createElement("div");
  var systemDark = !!(window.protectedGlobals.data && window.protectedGlobals.data.dark);
  Object.assign(panel.style, {
    minWidth: "520px",
    maxWidth: "88vw",
    maxHeight: "76vh",
    overflow: "hidden",
    borderRadius: "14px",
    background: systemDark ? "rgba(26,26,26,0.96)" : "rgba(245,245,245,0.96)",
    color: systemDark ? "#fff" : "#111",
    border: systemDark
      ? "1px solid rgba(255,255,255,0.14)"
      : "1px solid rgba(0,0,0,0.1)",
    boxShadow: "0 14px 40px rgba(0,0,0,0.35)",
    padding: "12px",
    display: "flex",
    flexDirection: "column",
    gap: "10px",
    fontFamily: "system-ui, -apple-system, sans-serif",
  });

  var title = document.createElement("div");
  title.textContent = "Switch windows";
  title.style.fontSize = "13px";
  title.style.opacity = "0.75";
  title.style.padding = "0 6px";

  var list = document.createElement("div");
  Object.assign(list.style, {
    display: "flex",
    flexDirection: "row",
    gap: "10px",
    overflowX: "auto",
    overflowY: "hidden",
    maxWidth: "84vw",
    minHeight: "130px",
    padding: "2px",
  });

  panel.appendChild(title);
  panel.appendChild(list);
  root.appendChild(panel);
  document.body.appendChild(root);

  windowSwitchState.previewRoot = root;
  windowSwitchState.previewList = list;
}

var hideWindowSwitchPreview = window.protectedGlobals.hideWindowSwitchPreview = function hideWindowSwitchPreview() {
  if (!windowSwitchState.previewRoot) return;
  windowSwitchState.previewRoot.style.display = "none";
}

var renderWindowSwitchPreview = window.protectedGlobals.renderWindowSwitchPreview = function renderWindowSwitchPreview(modLabel) {
  prepareWindowSwitchPreview();
  if (!windowSwitchState.previewRoot || !windowSwitchState.previewList) return;

  var list = windowSwitchState.previewList;
  var panel = list.parentElement;
  var systemDark = !!(window.protectedGlobals.data && window.protectedGlobals.data.dark);
  if (panel) {
    panel.style.background = systemDark
      ? "rgba(26,26,26,0.96)"
      : "rgba(245,245,245,0.96)";
    panel.style.color = systemDark ? "#fff" : "#111";
    panel.style.border = systemDark
      ? "1px solid rgba(255,255,255,0.14)"
      : "1px solid rgba(0,0,0,0.1)";
  }
  list.innerHTML = "";
  var order = windowSwitchState.order || [];
  var selectedRow = null;

  for (var i = 0; i < order.length; i++) {
    var el = order[i];
    var appId = resolveWindowAppId(el);
    var appLabel = resolveWindowLabel(el);
    var active = i === windowSwitchState.index;

    var row = document.createElement("div");
    Object.assign(row.style, {
      display: "flex",
      flexDirection: "column",
      justifyContent: "center",
      alignItems: "center",
      gap: "10px",
      borderRadius: "10px",
      padding: "12px 14px",
      minWidth: "150px",
      maxWidth: "150px",
      minHeight: "110px",
      boxSizing: "border-box",
      background: active
        ? systemDark
          ? "rgba(255,255,255,0.16)"
          : "rgba(0,0,0,0.12)"
        : systemDark
          ? "rgba(255,255,255,0.05)"
          : "rgba(0,0,0,0.04)",
      border: active
        ? systemDark
          ? "1px solid rgba(255,255,255,0.28)"
          : "1px solid rgba(0,0,0,0.24)"
        : systemDark
          ? "1px solid rgba(255,255,255,0.08)"
          : "1px solid rgba(0,0,0,0.08)",
    });

    var icon = document.createElement("div");
    var iconApp = findAppByIdentifier(appId);
    var iconValue = (iconApp && iconApp.icon) || "🗔";
    if (iconValue && iconValue.trim().startsWith("<")) {
      icon.innerHTML = iconValue;
    } else {
      icon.textContent = iconValue;
    }
    Object.assign(icon.style, {
      width: "28px",
      textAlign: "center",
      fontSize: "24px",
      lineHeight: "1",
    });

    var text = document.createElement("div");
    text.textContent = appLabel;
    text.style.fontSize = "14px";
    text.style.fontWeight = active ? "600" : "500";
    text.style.textAlign = "center";
    text.style.maxWidth = "100%";
    text.style.overflow = "hidden";
    text.style.textOverflow = "ellipsis";
    text.style.whiteSpace = "nowrap";

    row.appendChild(icon);
    row.appendChild(text);
    list.appendChild(row);
    if (active) selectedRow = row;
  }

  if (selectedRow && selectedRow.scrollIntoView) {
    selectedRow.scrollIntoView({
      behavior: "auto",
      block: "nearest",
      inline: "center",
    });
  }

  windowSwitchState.previewRoot.style.display = "flex";
  windowSwitchState.previewRoot.setAttribute("data-mod", modLabel || "");
}

var commitWindowSwitchTarget = window.protectedGlobals.commitWindowSwitchTarget = function commitWindowSwitchTarget() {
  var target = windowSwitchState.pendingTarget;
  if (!target || !target.isConnected) return;
  window.protectedGlobals.bringToFront(target);
  target.focus({ preventScroll: true });
}

var resetWindowSwitchState = window.protectedGlobals.resetWindowSwitchState = function resetWindowSwitchState() {
  hideWindowSwitchPreview();
  windowSwitchState.active = false;
  windowSwitchState.mod = "";
  windowSwitchState.order = [];
  windowSwitchState.index = 0;
  windowSwitchState.lastTs = 0;
  windowSwitchState.pendingTarget = null;
}

var cycleWindowFocus = window.protectedGlobals.cycleWindowFocus = function cycleWindowFocus(reverse, modKey, options) {
  var windows = getSwitchableWindows();
  if (!windows || windows.length <= 1) return false;

  windows.sort(function (a, b) {
    var za = parseInt(a.style.zIndex) || 0;
    var zb = parseInt(b.style.zIndex) || 0;
    return zb - za;
  });

  var now = Date.now();
  var mod = modKey || "";
  var timedOut = now - windowSwitchState.lastTs > 1500;
  var shouldReset =
    !windowSwitchState.active || windowSwitchState.mod !== mod || timedOut;

  if (shouldReset) {
    windowSwitchState.active = true;
    windowSwitchState.mod = mod;
    windowSwitchState.order = windows.slice();
    var forcedFocusedWindow =
      options &&
      options.forceCurrentWindow &&
      windowSwitchState.order.indexOf(options.forceCurrentWindow) !== -1
        ? options.forceCurrentWindow
        : null;
    var focusedWindow =
      forcedFocusedWindow || resolveFocusedWindowRoot(windowSwitchState.order);
    var focusedIndex = focusedWindow
      ? windowSwitchState.order.indexOf(focusedWindow)
      : -1;
    windowSwitchState.index = focusedIndex >= 0 ? focusedIndex : 0;
  } else {
    windowSwitchState.order = windowSwitchState.order.filter(function (el) {
      return windows.indexOf(el) !== -1;
    });
    for (var i = 0; i < windows.length; i++) {
      if (windowSwitchState.order.indexOf(windows[i]) === -1) {
        windowSwitchState.order.push(windows[i]);
      }
    }
    if (!windowSwitchState.order.length) {
      windowSwitchState.order = windows.slice();
      windowSwitchState.index = 0;
    }
    if (windowSwitchState.index >= windowSwitchState.order.length) {
      windowSwitchState.index = 0;
    }
  }

  var count = windowSwitchState.order.length;
  if (count <= 1) return false;

  var step = reverse ? -1 : 1;
  windowSwitchState.index = (windowSwitchState.index + step + count) % count;
  var target = windowSwitchState.order[windowSwitchState.index];
  if (!target) return false;

  windowSwitchState.pendingTarget = target;
  windowSwitchState.lastTs = now;
  renderWindowSwitchPreview(mod);
  return true;
}

var syncWindowSwitchPreview = window.protectedGlobals.syncWindowSwitchPreview = function syncWindowSwitchPreview(target, modKey) {
  if (!target || !target.isConnected) return false;

  var windows = getSwitchableWindows();
  if (!windows || windows.length <= 1) return false;

  windows.sort(function (a, b) {
    var za = parseInt(a.style.zIndex) || 0;
    var zb = parseInt(b.style.zIndex) || 0;
    return zb - za;
  });

  var index = windows.indexOf(target);
  if (index < 0) return false;

  var mod = modKey || windowSwitchState.mod || "";
  windowSwitchState.active = true;
  windowSwitchState.mod = mod;
  windowSwitchState.order = windows;
  windowSwitchState.index = index;
  windowSwitchState.pendingTarget = target;
  windowSwitchState.lastTs = Date.now();
  renderWindowSwitchPreview(mod);
  return true;
}

// keydown - single binding
if (window.protectedGlobals.systemAPIs.onKeydown)
  window.removeEventListener("keydown", window.protectedGlobals.systemAPIs.onKeydown);
window.protectedGlobals.systemAPIs.onKeydown = function (e) {
    // Build normalized combo e.g. 'Ctrl+Shift+N'
    var parts = [];
    if (e.ctrlKey) parts.push("Ctrl");
    if (e.altKey) parts.push("Alt");
    if (e.shiftKey) parts.push("Shift");
    var keyPart = String(e.key).toUpperCase();
    parts.push(keyPart);
    var combo = parts.join("+");

    // Alt+Tab (and Ctrl+Tab fallback): cycle focused app window
    if (
      (e.altKey && e.key === "Tab") ||
      (e.ctrlKey && !e.altKey && e.key === "Tab")
    ) {
      e.preventDefault();
      window.protectedGlobals.cycleFocusedWindow(!!e.shiftKey, e.altKey ? "Alt" : "Ctrl");
      return;
    }

    // Check user-defined shortcuts first
    if (window.protectedGlobals.data && window.protectedGlobals.data.shortcuts && window.protectedGlobals.data.shortcuts[combo]) {
      e.preventDefault();
      window.protectedGlobals.launchApp(window.protectedGlobals.data.shortcuts[combo]);
      return;
    }

    // Ctrl+Alt+ArrowUp / Ctrl+Alt+ArrowDown -> brightness +/-5
    if (
      e.ctrlKey &&
      !e.shiftKey &&
      e.altKey &&
      (e.key === "ArrowUp" || e.key === "ArrowDown")
    ) {
      e.preventDefault();
      window.protectedGlobals.applyBrightnessDelta(e.key === "ArrowUp" ? 5 : -5);
      return;
    }

    // Default: Ctrl+N -> open new instance of focused app or a sensible default
    if (e.ctrlKey && keyPart === "N") {
      e.preventDefault();
      window.protectedGlobals.launchFocusedAppWindow();
      return;
    } else if (e.ctrlKey && e.shiftKey && keyPart === "W") {
      // Close only the topmost app window for the focused app (atTop)
      e.preventDefault();
      e.stopPropagation();
      window.protectedGlobals.closeFocusedAppWindow();
      return;
    }
};
window.addEventListener("keydown", window.protectedGlobals.systemAPIs.onKeydown);

if (window.protectedGlobals.systemAPIs.onKeyup)
  window.removeEventListener("keyup", window.protectedGlobals.systemAPIs.onKeyup);
window.protectedGlobals.systemAPIs.onKeyup = function (e) {
  if (e.key === "Alt" || e.key === "Control") {
    commitWindowSwitchTarget();
    resetWindowSwitchState();
  }
};
window.addEventListener("keyup", window.protectedGlobals.systemAPIs.onKeyup);

if (window.protectedGlobals.systemAPIs.onBlur)
  window.removeEventListener("blur", window.protectedGlobals.systemAPIs.onBlur);
window.protectedGlobals.systemAPIs.onBlur = function () {
  resetWindowSwitchState();
};
window.addEventListener("blur", window.protectedGlobals.systemAPIs.onBlur);

if (window.protectedGlobals.systemAPIs.onVisibilityChange)
  document.removeEventListener(
    "visibilitychange",
    window.protectedGlobals.systemAPIs.onVisibilityChange,
  );
window.protectedGlobals.systemAPIs.onVisibilityChange = function () {
  if (document.hidden) resetWindowSwitchState();
};
document.addEventListener(
  "visibilitychange",
  window.protectedGlobals.systemAPIs.onVisibilityChange,
);

window.protectedGlobals.applyStyles = function applyStyles() {
  var roots = document.querySelectorAll(".app-window-root");
  for (const r of roots) {
    // don't let the global applyStyles override its classes.
    if (!(r.dataset.themeManual === 'true')) {
      r.classList.toggle("dark", !!(window.protectedGlobals.data && window.protectedGlobals.data.dark));
      r.classList.toggle("light", !(window.protectedGlobals.data && window.protectedGlobals.data.dark));
    }
    r.dispatchEvent(new CustomEvent("styleapplied", {}));
  }

  // if(window.protectedGlobals.data.dark) {
  //   document.body.style.background = "#444";
  //   document.body.style.color = "white";
  // } else {
  //   document.body.style.background = "white";
  //   document.body.style.color = "black";
  // }
  var startMenuEl = window.protectedGlobals.startMenu || document.getElementById("startMenu");
  var taskbarEl = window.protectedGlobals.taskbar || document.getElementById("taskbar");
  if (startMenuEl) {
    startMenuEl.classList.toggle("dark", !!(window.protectedGlobals.data && window.protectedGlobals.data.dark));
    startMenuEl.classList.toggle("light", !(window.protectedGlobals.data && window.protectedGlobals.data.dark));
  }
  if (taskbarEl) {
    taskbarEl.classList.toggle("dark", !!(window.protectedGlobals.data && window.protectedGlobals.data.dark));
    taskbarEl.classList.toggle("light", !(window.protectedGlobals.data && window.protectedGlobals.data.dark));
  }
  var taskButtonsList = Array.isArray(window.protectedGlobals.taskbuttons)
    ? window.protectedGlobals.taskbuttons
    : [];
  for (var button of taskButtonsList) {
    button.classList.toggle("dark", !!(window.protectedGlobals.data && window.protectedGlobals.data.dark));
    button.classList.toggle("light", !(window.protectedGlobals.data && window.protectedGlobals.data.dark));
  }
  // Update status bar theme
  if (window.protectedGlobals.updateStatusBarTheme) {
    window.protectedGlobals.updateStatusBarTheme();
  }
}
setTimeout(() => {
  window.protectedGlobals.applyStyles();
}, 100);

// Ensure apps are loaded shortly after startup (safe-guard if tree already present)
setTimeout(() => {
  window.protectedGlobals.loadAppsFromTree();
}, 200);


document.documentElement.style.filter = `brightness(${window.protectedGlobals.data && window.protectedGlobals.statusData.brightness}%)`;

// // 1. Create a new MutationObserver instance with a callback function
// window.protectedGlobals.observer = new MutationObserver((mutationsList, observer) => {
//   if (mutationsList) {
//     document.documentElement.style.filter = `brightness(${window.protectedGlobals.data && window.protectedGlobals.statusData.brightness}%)`;
//   }
// });
// var observer = window.protectedGlobals.observer;

// 2. Select the target node you want to observe (e.g., the entire document body)
// window.protectedGlobals.targetNode = document.body;
// var targetNode = window.protectedGlobals.targetNode;

// 3. Configure the observer with an options object
// window.protectedGlobals.config = {
//   childList: true, // Observe direct children addition/removal
//   attributes: true, // Observe attribute changes
//   characterData: true, // Observe changes to text content
//   subtree: true, // Observe changes in the entire subtree (children, grandchildren, etc.)
//   attributeOldValue: true, // Record the old value of the attribute
//   characterDataOldValue: true, // Record the old value of the character data
// };
// var config = window.protectedGlobals.config;

// // 4. Start observing the target node with the specified configuration
// if (window.protectedGlobals.systemAPIs.observer) {
//   window.protectedGlobals.systemAPIs.observer.disconnect();
// }
// window.protectedGlobals.systemAPIs.observer = observer;
// window.protectedGlobals.observer.observe(window.protectedGlobals.targetNode, window.protectedGlobals.config);

// To stop observing later:
// observer.disconnect();

// helpers global
var getStringAfterChar = window.protectedGlobals.getStringAfterChar = function getStringAfterChar(str, char) {
  var index = str.indexOf(char);
  if (index !== -1) {
    // Add 1 to the index to start after the character itself
    return str.substring(index + 1);
  } else {
    // Return the original string or handle the case where the character is not found
    return str;
  }
}

// Global window.protectedGlobals.notification helper: call window.protectedGlobals.notification("message") to show a temporary toast for 3s
window.protectedGlobals.notification = function(message, options) {
    if (!message && message !== 0) return;
    options = options || {};

    // theme detection: explicit option > data-theme attributes > protected theme state > data-dark flag > default
    var dataDark = null;
    if (window.protectedGlobals.data && window.protectedGlobals.data.dark !== undefined) dataDark = window.protectedGlobals.data.dark;
    var themeCandidate = options.theme || (document.documentElement && document.documentElement.getAttribute('data-theme')) || (document.body && (document.body.getAttribute('data-theme') || document.body.dataset.theme)) || window.protectedGlobals.flowawayTheme || dataDark || null;
    var theme = themeCandidate;

    // normalize bool-like values
    if (theme === true || theme === false) theme = theme ? 'dark' : 'light';
    var t = String(theme).trim().toLowerCase();
    if (t === 'true' || t === '1' || t === 'yes' || t === 'on') theme = 'dark';
    else if (t === 'false' || t === '0' || t === 'no' || t === 'off') theme = 'light';
    else theme = t;

    if (!theme) {
      var dd = (document.documentElement && document.documentElement.dataset && document.documentElement.dataset.dark) || (document.body && document.body.dataset && document.body.dataset.dark);
      if (dd === true || dd === 1 || dd === 'true' || dd === '1' || dd === 'yes' || dd === 'on') {
        theme = 'dark';
      } else {
        theme = 'light';
      }
    }

    window.protectedGlobals.showModal("Notification", String(message), options.level || "info");
    return null;
  }











// // dialogue
//   window.protectedGlobals.showDialog = async function() {
//     // If already exists, bring to front
//     const existing = document.getElementById("settings-about-dialog");
//     if (existing) {
//       existing.style.display = "flex";
//       return;
//     }

//     const dlg = document.createElement("div");
//     dlg.id = "settings-about-dialog";
//     Object.assign(dlg.style, {
//       position: "fixed",
//       left: "calc(50% - 300px)",
//       top: "calc(50% - 90px)",
//       width: "50vw",
//       height: "50vh",
//       minHeight: "180px",
//       minWidth: "420px",
//       background: window.protectedGlobals.data.dark ? "#222" : "#fff",
//       color: window.protectedGlobals.data.dark ? "#fff" : "#000",
//       borderRadius: "8px",
//       boxShadow: "0 8px 30px rgba(0,0,0,0.3)",
//       display: "flex",
//       flexDirection: "column",
//       overflow: "hidden",
//       resize: "both",
//     });
//     window.protectedGlobals.bringToFront(dlg);
//     const header = document.createElement("div");
//     header.style.display = "flex";
//     header.style.alignItems = "center";
//     header.style.justifyContent = "flex-start";
//     header.style.padding = "8px 10px";
//     header.style.cursor = "move";
//     header.style.background = window.protectedGlobals.data.dark ? "#111" : "#f1f1f1";
//     header.style.flexShrink = "0";
//     header.style.position = "relative";
//     header.onclick = () => window.protectedGlobals.bringToFront(dlg);
//     const htitle = document.createElement("div");
//     htitle.textContent = "About";
//     htitle.style.fontWeight = "600";

//     const closeX = document.createElement("button");
//     closeX.setAttribute("aria-label", "Close dialog");
//     closeX.innerHTML = `
//       <svg width="12" height="12" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
//         <path d="M6 6L18 18" stroke="white" stroke-width="2.4" stroke-linecap="round"/>
//         <path d="M18 6L6 18" stroke="white" stroke-width="2.4" stroke-linecap="round"/>
//       </svg>
//     `;
//     Object.assign(closeX.style, {
//       border: "none",
//       background: "red",
//       cursor: "pointer",
//       width: "35px",
//       height: "23px",
//       padding: "0",
//       display: "grid",
//       placeItems: "center",
//       lineHeight: "0",
//     });

//     header.append(htitle);
//     dlg.appendChild(header);

//     // position the close button in the top-right corner of the dialog
//     Object.assign(closeX.style, {
//       position: "absolute",
//       right: "8px",
//       top: "8px",
//     });
//     dlg.appendChild(closeX);

//     const content = document.createElement("div");
//     content.style.padding = "12px";
//     content.style.fontSize = "13px";
//     content.style.flex = "1";
//     content.style.overflow = "auto";
//     content.innerHTML = `
//       <div style="font-weight:600;margin-bottom:6px">About Flowaway Goldenbody</div>
//       <div style="margin-bottom:6px">An utopia that has EVERYTHING unblocked (anything internet filters block, code your own apps, works on chromebooks), free, open-source, forever.</div>
//       <div style="font-size:12px;color:gray">Version: ${window.protectedGlobals.APP_VERSION || 'unknown'}</div>
//     `;
//     dlg.appendChild(content);

//     document.body.appendChild(dlg);

//     // Close handler
//     closeX.addEventListener("click", () => dlg.remove());

//     // Make dialog draggable using pointer events on header
//     (function makeDraggableDialog() {
//       let dragging = false;
//       let startX = 0,
//         startY = 0,
//         origLeft = 0,
//         origTop = 0;

//       header.addEventListener("pointerdown", (ev) => {
//         dragging = true;
//         startX = ev.clientX;
//         startY = ev.clientY;
//         origLeft = dlg.offsetLeft;
//         origTop = dlg.offsetTop;
//         header.setPointerCapture(ev.pointerId);
//         document.body.style.userSelect = "none";
//       });

//       window.addEventListener("pointermove", (ev) => {
//         if (!dragging) return;
//         const dx = ev.clientX - startX;
//         const dy = ev.clientY - startY;
//         dlg.style.left = origLeft + dx + "px";
//         dlg.style.top = Math.max(0, origTop + dy) + "px";
//       });

//       window.addEventListener("pointerup", (ev) => {
//         if (!dragging) return;
//         dragging = false;
//         {
//           header.releasePointerCapture(ev.pointerId);
//         }
//         document.body.style.userSelect = "";
//       });
//     })();
//   }
})();
