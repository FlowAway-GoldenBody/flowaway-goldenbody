function applyTaskButtons() {
  if (window.appsButtonsApplied) return;
  if (!window.apps || window.apps.length === 0) return;

  var taskbarReady = false;
  try {
    taskbarReady =
      typeof taskbar !== "undefined" &&
      !!taskbar &&
      taskbar.isConnected &&
      typeof addTaskButton === "function";
  } catch (e) {
    taskbarReady = false;
  }

  if (!taskbarReady) {
    try {
      if (typeof loadSystemHelperScript === "function")
        loadSystemHelperScript();
    } catch (e) {}

    try {
      window._flowaway_handlers = window._flowaway_handlers || {};
      if (!window._flowaway_handlers.applyTaskButtonsRetryTimer) {
        window._flowaway_handlers.applyTaskButtonsRetryTimer = setTimeout(
          () => {
            try {
              if (
                window._flowaway_handlers &&
                window._flowaway_handlers.applyTaskButtonsRetryTimer
              ) {
                clearTimeout(
                  window._flowaway_handlers.applyTaskButtonsRetryTimer,
                );
                delete window._flowaway_handlers.applyTaskButtonsRetryTimer;
              }
            } catch (e) {}
            try {
              applyTaskButtons();
            } catch (e) {}
          },
          200,
        );
      }
    } catch (e) {}
    return;
  }

  window.appsButtonsApplied = true;
  window._suppressTaskbarPersist = true;

  try {
    // Clear existing dynamic task buttons (keep system buttons in the first two slots)
    var existingTaskButtons = [
      ...taskbar.querySelectorAll("button.taskbutton"),
    ];
    existingTaskButtons.splice(0, 2);
    existingTaskButtons.forEach((btn) => btn.remove());

    // Prefer dynamic apps discovered in /apps
    var savedTaskButtons = Array.isArray(data && data.taskbuttons)
      ? data.taskbuttons
      : [];
    var seenAppIds = new Set();
    for (const taskbutton of savedTaskButtons) {
      const app = (window.apps || []).find((a) =>
        appMatchesIdentifier(a, taskbutton),
      );
      if (app) {
        const appId = getPreferredAppIdentifier(app);
        if (seenAppIds.has(appId)) continue;
        seenAppIds.add(appId);
        const btn = addTaskButton(
          app.icon,
          () => launchApp(appId),
          "cmf",
          "",
          appId,
        );
        if (btn) btn.dataset.appId = appId;
      }
    }
    taskbuttons = [...taskbar.querySelectorAll("button")];
  } catch (e) {
    window.appsButtonsApplied = false;
    try {
      window._flowaway_handlers = window._flowaway_handlers || {};
      if (!window._flowaway_handlers.applyTaskButtonsRetryTimer) {
        window._flowaway_handlers.applyTaskButtonsRetryTimer = setTimeout(
          () => {
            try {
              if (
                window._flowaway_handlers &&
                window._flowaway_handlers.applyTaskButtonsRetryTimer
              ) {
                clearTimeout(
                  window._flowaway_handlers.applyTaskButtonsRetryTimer,
                );
                delete window._flowaway_handlers.applyTaskButtonsRetryTimer;
              }
            } catch (e) {}
            try {
              applyTaskButtons();
            } catch (e) {}
          },
          200,
        );
      }
    } catch (retryErr) {}
  } finally {
    window._suppressTaskbarPersist = false;
  }
}

function purgeButtons() {
  buttons = [...taskbar.querySelectorAll("button")];
  buttons.splice(0, 3);
  buttons.forEach((b) => {
    if (!b.dataset.appId) {
      b.dataset.appId = b.textContent;
    }
  });
  // Build a generic map from appId -> [buttons]
  window.appButtons = window.appButtons || {};
  window.appButtons = {};
  for (let i = 0; i < taskbuttons.length; i++) {
    let tb = taskbuttons[i];
    var id;
    try {
      id = tb.dataset.appId;
    } catch (e) {}
    if (!id) continue;
    window.appButtons[id] = window.appButtons[id] || [];
    window.appButtons[id].push(tb);
  }
}

function saveTaskButtons(silence = true) {
  var buttons = [...taskbar.querySelectorAll("button")];
  buttons.splice(0, 2);
  var postdata = [];
  for (const b of buttons) {
    if (b.dataset && b.dataset.appId) {
      postdata.push(b.dataset.appId);
    } else {
      // If no dataset, try to infer id from value or textContent
      var inferred =
        (b.value && String(b.value).trim()) ||
        (b.textContent && String(b.textContent).trim());
      if (inferred) postdata.push(inferred);
    }
  }
  if (!silence) notification("taskbuttons saved!");
  posttaskbuttons(postdata);
}
function bringToFront(el) {
  if (!el) return;
  var appId = resolveWindowAppId(el);
  atTop = appId || "";
  el.style.zIndex = String(++zTop);
}

function resolveWindowAppId(el) {
  if (!el) return "";
  var appId = el.dataset && el.dataset.appId;
  if (!appId) appId = el.getAttribute && el.getAttribute("data-app-id");
  if (!appId && window.apps && Array.isArray(window.apps)) {
    for (const a of window.apps) {
      try {
        // Only use real identifier strings (functionname) for class/id matching.
        // a.id and a.icon are icon content (emoji or HTML markup), not valid identifiers.
        var candidates = [a.functionname].filter(function (c) {
          return c && typeof c === "string" && c.length < 64;
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
      } catch (e) {}
    }
  }
  return appId || "";
}

function findAppByIdentifier(identifier) {
  if (!identifier || !window.apps || !Array.isArray(window.apps)) return null;
  for (const a of window.apps) {
    if (!a) continue;
    // Only match against true identifiers (functionname).
    // Do NOT match a.id or a.icon — those contain icon HTML/emoji content, not identifiers.
    if (identifier === a.functionname) {
      return a;
    }
  }
  return null;
}

function resolveWindowLabel(el) {
  var appId = resolveWindowAppId(el);
  var windowTitle = "";
  try {
    windowTitle = (
      (el && el.getAttribute && el.getAttribute("data-title")) ||
      ""
    ).trim();
  } catch (e) {}
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

function getSwitchableWindows() {
  try {
    return Array.from(document.querySelectorAll(".app-window-root")).filter((el) => {
      if (!el || !el.isConnected) return false;
      var cs = window.getComputedStyle(el);
      if (!cs) return false;
      return cs.display !== "none" && cs.visibility !== "hidden";
    });
  } catch (e) {
    return [];
  }
}

function resolveFocusedWindowRoot(windows) {
  var active = null;
  try {
    active = document.activeElement;
  } catch (e) {
    active = null;
  }

  if (active) {
    try {
      if (typeof active.closest === "function") {
        var candidate = active.closest(".app-window-root");
        if (candidate && (!windows || windows.indexOf(candidate) !== -1)) {
          return candidate;
        }
      }
    } catch (e) {}
  }

  if (atTop && windows && windows.length) {
    for (var i = 0; i < windows.length; i++) {
      if (resolveWindowAppId(windows[i]) === atTop) return windows[i];
    }
  }

  return null;
}

var windowSwitchState = {
  active: false,
  mod: "",
  order: [],
  index: 0,
  lastTs: 0,
  pendingTarget: null,
  previewRoot: null,
  previewList: null,
};

function ensureWindowSwitchPreview() {
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
  var systemDark = data.dark;
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

function hideWindowSwitchPreview() {
  if (!windowSwitchState.previewRoot) return;
  windowSwitchState.previewRoot.style.display = "none";
}

function renderWindowSwitchPreview(modLabel) {
  ensureWindowSwitchPreview();
  if (!windowSwitchState.previewRoot || !windowSwitchState.previewList) return;

  var list = windowSwitchState.previewList;
  var panel = list.parentElement;
  var systemDark = data.dark;
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
    try {
      selectedRow.scrollIntoView({
        behavior: "auto",
        block: "nearest",
        inline: "center",
      });
    } catch (e) {}
  }

  windowSwitchState.previewRoot.style.display = "flex";
  windowSwitchState.previewRoot.setAttribute("data-mod", modLabel || "");
}

function commitWindowSwitchTarget() {
  var target = windowSwitchState.pendingTarget;
  if (!target || !target.isConnected) return;
  bringToFront(target);
  try {
    target.focus({ preventScroll: true });
  } catch (e) {
    try {
      target.focus();
    } catch (err) {}
  }
}

function resetWindowSwitchState() {
  hideWindowSwitchPreview();
  windowSwitchState.active = false;
  windowSwitchState.mod = "";
  windowSwitchState.order = [];
  windowSwitchState.index = 0;
  windowSwitchState.lastTs = 0;
  windowSwitchState.pendingTarget = null;
}

function cycleWindowFocus(reverse, modKey, options) {
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

function syncWindowSwitchPreview(target, modKey) {
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
try {
  if (window._flowaway_handlers.onKeydown)
    window.removeEventListener("keydown", window._flowaway_handlers.onKeydown);
  window._flowaway_handlers.onKeydown = function (e) {
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
      cycleFocusedWindow(!!e.shiftKey, e.altKey ? "Alt" : "Ctrl");
      return;
    }

    // Check user-defined shortcuts first
    if (data && data.shortcuts && data.shortcuts[combo]) {
      e.preventDefault();
      launchApp(data.shortcuts[combo]);
      return;
    }

    // Keyboard shortcuts: Brightness and Volume
    // Ctrl+Alt+ArrowUp / Ctrl+Alt+ArrowDown -> brightness +/-5
    if (
      e.ctrlKey &&
      !e.shiftKey &&
      e.altKey &&
      (e.key === "ArrowUp" || e.key === "ArrowDown")
    ) {
      e.preventDefault();
      applyBrightnessDelta(e.key === "ArrowUp" ? 5 : -5);
      return;
    }

    // Ctrl+Shift+ArrowUp / Ctrl+Shift+ArrowDown -> volume +/-5
    if (
      e.ctrlKey &&
      e.shiftKey &&
      (e.key === "ArrowUp" || e.key === "ArrowDown")
    ) {
      e.preventDefault();
      applyVolumeDelta(e.key === "ArrowUp" ? 5 : -5);
      return;
    }

    // Default: Ctrl+N -> open new instance of focused app or a sensible default
    if (e.ctrlKey && keyPart === "N") {
      e.preventDefault();
      launchFocusedAppWindow();
      return;
    } else if (e.ctrlKey && e.shiftKey && keyPart === "W") {
      // Close only the topmost app window for the focused app (atTop)
      e.preventDefault();
      e.stopPropagation();
      closeFocusedAppWindow();
      return;
    }
  };
  window.addEventListener("keydown", window._flowaway_handlers.onKeydown);

  if (window._flowaway_handlers.onKeyup)
    window.removeEventListener("keyup", window._flowaway_handlers.onKeyup);
  window._flowaway_handlers.onKeyup = function (e) {
    if (e.key === "Alt" || e.key === "Control") {
      commitWindowSwitchTarget();
      resetWindowSwitchState();
    }
  };
  window.addEventListener("keyup", window._flowaway_handlers.onKeyup);

  if (window._flowaway_handlers.onBlur)
    window.removeEventListener("blur", window._flowaway_handlers.onBlur);
  window._flowaway_handlers.onBlur = function () {
    resetWindowSwitchState();
  };
  window.addEventListener("blur", window._flowaway_handlers.onBlur);

  if (window._flowaway_handlers.onVisibilityChange)
    document.removeEventListener(
      "visibilitychange",
      window._flowaway_handlers.onVisibilityChange,
    );
  window._flowaway_handlers.onVisibilityChange = function () {
    if (document.hidden) resetWindowSwitchState();
  };
  document.addEventListener(
    "visibilitychange",
    window._flowaway_handlers.onVisibilityChange,
  );
} catch (e) {}

function applyStyles() {
  try {
    var roots = document.querySelectorAll(".app-window-root");
    for (const r of roots) {
      try {
        // don't let the global applyStyles override its classes.
        if (!(r.dataset.themeManual === 'true')) {
          r.classList.toggle("dark", data.dark);
          r.classList.toggle("light", !data.dark);
        }
      } catch (e) {
        // fallback to safe toggle if dataset access fails
        r.classList.toggle("dark", data.dark);
        r.classList.toggle("light", !data.dark);
      }
      try {
        r.dispatchEvent(new CustomEvent("styleapplied", {}));
      } catch (e) {}
    }
  } catch (e) {}

  // if(data.dark) {
  //   document.body.style.background = "#444";
  //   document.body.style.color = "white";
  // } else {
  //   document.body.style.background = "white";
  //   document.body.style.color = "black";
  // }
  var startMenuEl = window.startMenu || document.getElementById("startMenu");
  var taskbarEl = window.taskbar || document.getElementById("taskbar");
  if (startMenuEl) {
    startMenuEl.classList.toggle("dark", data.dark);
    startMenuEl.classList.toggle("light", !data.dark);
  }
  if (taskbarEl) {
    taskbarEl.classList.toggle("dark", data.dark);
    taskbarEl.classList.toggle("light", !data.dark);
  }
  var taskButtonsList = Array.isArray(window.taskbuttons)
    ? window.taskbuttons
    : [];
  for (var button of taskButtonsList) {
    button.classList.toggle("dark", data.dark);
    button.classList.toggle("light", !data.dark);
  }
}
setTimeout(() => {
  applyStyles();
}, 100);

// Ensure apps are loaded shortly after startup (safe-guard if tree already present)
setTimeout(() => {
  try {
    loadAppsFromTree();
  } catch (e) {}
}, 200);
function mainRecurseFrames(doc) {
  if (!doc) return null;

  var frames = doc.querySelectorAll("iframe");

  for (const frame of frames) {
    const childDoc = frame.contentDocument;
    function setAllMediaVolume(newVolume) {
      // Ensure the volume is between 0.0 and 1.0
      newVolume = Math.min(Math.max(newVolume, 0.0), 1.0);

      // Select all audio and video elements
      var mediaElements = [];
      try {
        mediaElements = childDoc.querySelectorAll("audio, video");
      } catch (e) {}

      mediaElements.forEach((element) => {
        element.volume = newVolume;
      });
    }
    setAllMediaVolume(data.volume / 100);
    // Recurse into child document if accessible
    if (childDoc) {
      mainRecurseFrames(childDoc);
    }
  }

  return null;
}

document.documentElement.style.filter = `brightness(${data.brightness}%)`;
function setAllMediaVolume(newVolume) {
  // Ensure the volume is between 0.0 and 1.0
  newVolume = Math.min(Math.max(newVolume, 0.0), 1.0);

  // Select all audio and video elements
  var mediaElements = document.querySelectorAll("audio, video");

  mediaElements.forEach((element) => {
    element.volume = newVolume;
  });
}
try {
  if (window._flowaway_handlers.onSystemVolume)
    window.removeEventListener(
      "system-volume",
      window._flowaway_handlers.onSystemVolume,
    );
  window._flowaway_handlers.onSystemVolume = (e) => {
    setAllMediaVolume(e.detail / 100);
  };
  window.addEventListener(
    "system-volume",
    window._flowaway_handlers.onSystemVolume,
  );
} catch (e) {}
// 1. Create a new MutationObserver instance with a callback function
var observer = new MutationObserver((mutationsList, observer) => {
  if (mutationsList) {
    setAllMediaVolume(data.volume / 100);
    mainRecurseFrames(document);
    document.documentElement.style.filter = `brightness(${data.brightness}%)`;
  }
});

// 2. Select the target node you want to observe (e.g., the entire document body)
var targetNode = document.body;

// 3. Configure the observer with an options object
var config = {
  childList: true, // Observe direct children addition/removal
  attributes: true, // Observe attribute changes
  characterData: true, // Observe changes to text content
  subtree: true, // Observe changes in the entire subtree (children, grandchildren, etc.)
  attributeOldValue: true, // Record the old value of the attribute
  characterDataOldValue: true, // Record the old value of the character data
};

// 4. Start observing the target node with the specified configuration
try {
  if (window._flowaway_handlers.observer) {
    try {
      window._flowaway_handlers.observer.disconnect();
    } catch (e) {}
  }
  window._flowaway_handlers.observer = observer;
  observer.observe(targetNode, config);
} catch (e) {
  try {
    observer.observe(targetNode, config);
  } catch (ee) {}
}

// To stop observing later:
// observer.disconnect();

setAllMediaVolume(parseInt(data.volume) / 100);
// helpers global
function getStringAfterChar(str, char) {
  var index = str.indexOf(char);
  if (index !== -1) {
    // Add 1 to the index to start after the character itself
    return str.substring(index + 1);
  } else {
    // Return the original string or handle the case where the character is not found
    return str;
  }
}

// Global notification helper: call notification("message") to show a temporary toast for 3s
function notification(message, options) {
  try {
    if (!message && message !== 0) return;
    options = options || {};

    // theme detection: explicit option > data-theme attributes > global var > data.dark > data-dark flag > default
    var dataDark = null;
    try {
      if (window.data && typeof window.data.dark !== 'undefined') dataDark = window.data.dark;
    } catch (e) {}
    var themeCandidate = options.theme || (document.documentElement && document.documentElement.getAttribute('data-theme')) || (document.body && (document.body.getAttribute('data-theme') || document.body.dataset.theme)) || window.flowawayTheme || dataDark || null;
    var theme = themeCandidate;

    // normalize bool-like values
    if (typeof theme === 'boolean') theme = theme ? 'dark' : 'light';
    if (typeof theme === 'number') theme = theme ? 'dark' : 'light';
    if (typeof theme === 'string') {
      var t = theme.trim().toLowerCase();
      if (t === 'true' || t === '1' || t === 'yes' || t === 'on') theme = 'dark';
      else if (t === 'false' || t === '0' || t === 'no' || t === 'off') theme = 'light';
      else theme = t;
    }

    if (!theme) {
      try {
        var dd = (document.documentElement && document.documentElement.dataset && document.documentElement.dataset.dark) || (document.body && document.body.dataset && document.body.dataset.dark);
        if (dd === true || dd === 1 || dd === 'true' || dd === '1' || dd === 'yes' || dd === 'on') {
          theme = 'dark';
        } else {
          theme = 'light';
        }
      } catch (e) {
        theme = 'light';
      }
    }

    // Prefer the unified in-UI message system if available
    if (typeof window.showFlowawayMessage === "function") {
      try {
        showFlowawayMessage("Notification", String(message), options.level || "info");
        return null;
      } catch (e) {}
    }

    // Fallback inline toast with theme-aware styling
    var container = document.getElementById("global-notifications");
    if (!container) {
      container = document.createElement("div");
      container.id = "global-notifications";
      Object.assign(container.style, {
        position: "fixed",
        right: "20px",
        bottom: "20px",
        display: "flex",
        flexDirection: "column",
        gap: "8px",
        zIndex: 9999999,
        pointerEvents: "none",
      });
      document.body.appendChild(container);
    }

    var toast = document.createElement("div");
    toast.textContent = String(message);

    // determine colors
    var bg = 'rgba(0,0,0,0.8)';
    var color = 'white';
    if (theme === 'light' || theme === 'default') {
      bg = 'white';
      color = '#111';
    } else if (theme === 'dark') {
      bg = 'rgba(0,0,0,0.85)';
      color = 'white';
    } else {
      try {
        var cs = getComputedStyle(document.documentElement || document.body);
        var varBg = cs.getPropertyValue('--notification-bg') || cs.getPropertyValue('--bg');
        var varColor = cs.getPropertyValue('--notification-color') || cs.getPropertyValue('--fg');
        if (varBg) bg = varBg.trim();
        if (varColor) color = varColor.trim();
      } catch (e) {}
    }

    Object.assign(toast.style, {
      background: bg,
      color: color,
      padding: "8px 12px",
      borderRadius: "8px",
      maxWidth: "320px",
      boxShadow: "0 6px 20px rgba(0,0,0,0.12)",
      opacity: "0",
      transform: "translateY(6px)",
      transition: "opacity 220ms ease, transform 220ms ease",
      pointerEvents: "auto",
      fontSize: "13px",
      lineHeight: "1.2",
      borderLeft: "4px solid transparent",
    });

    // accent by level
    var level = (options.level || 'info').toLowerCase();
    if (level === 'warn' || level === 'warning') {
      toast.style.borderLeft = '4px solid #f1c40f';
    } else if (level === 'error' || level === 'danger') {
      toast.style.borderLeft = '4px solid #e74c3c';
    } else if (level === 'success') {
      toast.style.borderLeft = '4px solid #2ecc71';
    }

    container.appendChild(toast);

    // Force layout then animate in
    requestAnimationFrame(() => {
      toast.style.opacity = "1";
      toast.style.transform = "translateY(0)";
    });

    // Remove after duration
    var dismissMs = typeof options.duration === 'number' ? options.duration : 3000;
    setTimeout(() => {
      toast.style.opacity = "0";
      toast.style.transform = "translateY(6px)";
      setTimeout(() => {
        try {
          toast.remove();
        } catch (e) {}
        if (container && container.children.length === 0) {
          try { container.remove(); } catch (e) {}
        }
      }, 260);
    }, dismissMs);
    return toast;
  } catch (e) {
    console.error("notify error", e);
  }
}
var style = document.createElement("style");
style.textContent = `

/* =========================================================
   🌞 LIGHT THEME (default)
========================================================= */
.app-root {
  position: fixed;
  top: 70px;
  left: 70px;
  width: 700px;
  border-radius: 10px;
  overflow: hidden;
  box-shadow: 0 10px 30px rgba(0, 0, 0, 0.25);
}

.app-root * {
  /* box-sizing: border-box; */
  font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial;
}

.appContent {
  flex: 1;
  padding: 24px;
  overflow: auto;
}
 .sim-url-input { flex:1; height:32px; border-radius:6px; border:1px solid rgba(0,0,0,0.12); padding:0 10px; font-size:14px; }
.sim-chrome-top {
  background: linear-gradient(#f6f7f8,#ededf0);
  height: 44px;
  display:flex;
  align-items:center;
  padding:0 8px;
  gap:8px;
}

.sim-chrome-tabs {
  display:flex;
  gap:2px;
  align-items:center;
  height:32px;
  scrollbar-width:none;
}
.sim-chrome-tabs::-webkit-scrollbar { display:none; }

.sim-tab {
  display:flex;
  align-items:center;
  gap:8px;
  padding:6px 10px;
  border-radius:6px;
  cursor:pointer;
  user-select:none;
  font-size:13px;
  color:#333;
  max-width:200px;
  min-width:185px;
  overflow:hidden;
  white-space:nowrap;
  text-overflow:ellipsis;
}

.sim-tab.active {
  background: rgba(0,0,0,0.06);
  box-shadow: inset 0 -1px 0 rgba(0,0,0,0.04);
}

.sim-tab .close {
  font-weight:700;
  color:#777;
  cursor:pointer;
  margin-left:auto;
}

.sim-address-row {
  display:flex;
  align-items:center;
  gap:8px;
  flex:1;
  margin: 0 8px;
}

.sim-open-btn,
.sim-fullscreen-btn,
.sim-netab-btn {
  height:28px;
  padding:0 12px;
  border-radius:12px;
  border:1px solid rgba(0,0,0,0.12);
  background:#fff;
  cursor:pointer;
  font-size:13px;
}

.sim-toolbar {
  display:flex;
  align-items:center;
  gap:8px;
  padding:8px;
  background:#fff;
  border-top:1px solid rgba(0,0,0,0.06);
}

.sim-iframe {
  width:100%;
  height:calc(100% - 84px);
  border:0;
  background:#fff;
}

.sim-status {
  font-size:12px;
  color:#666;
  margin-left:8px;
}

.appTopBar {
  background: #ccc;
  display: flex;
  align-items: center;
  justify-content: flex-end;
  gap: 2px;
  padding: 1px;
  margin-top: 2px;
  flex-shrink: 0;
  cursor: move;
  user-select: none;
  position: absolute;
  top: 5px;
  right: 5px;
  width: auto;
  z-index: 3;
}

.appTopBarTitle {
  display: none;
  font-size: 13px;
  font-weight: 600;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.appTopDragStrip {
  height: 12px;
  flex-shrink: 0;
  display: flex;
  cursor: move;
  width: 100%;
}

.appWindowControls {
  display: flex;
  align-items: center;
  gap: 2px;
}

.appWindowControl {
  border: none;
  border-radius: 3px;
  min-width: 23px;
  height: 18px;
  font-size: 11px;
  padding: 0 3px;
  cursor: pointer;
  display: inline-flex;
  align-items: center;
  justify-content: center;
}

.appWindowCloseColor {
  background: #d90429;
  color: #fff;
}

.panel {}







/* =========================================================
   ☀️ LIGHT THEME
========================================================= */

.panel.light {
  background: #ededf0;
  color: black;
}
.app-root.light {
  background: #eee;
  color: #222;
}

.app-root.light .sim-chrome-top {
  background: linear-gradient(#f6f7f8, #ededf0);
}

.app-root.light .sim-chrome-tabs {
  background: transparent;
}

.app-root.light .sim-tab {
  color: #333;
}

.app-root.light .sim-tab.active {
  background: rgba(0,0,0,0.06);
  box-shadow: inset 0 -1px 0 rgba(0,0,0,0.04);
}

.app-root.light .sim-tab .close {
  color: #777;
}

/* Address row */
.app-root.light .sim-address-row {
  background: transparent;
  margin: 0 8px;
}

/* URL / proxy inputs */
.app-root.light .sim-url-input,
.app-root.light .sim-proxy-input {
  background: #fff;
  color: #222;
  border: 1px solid rgba(0,0,0,0.12);
}

/* Buttons */
.app-root.light .sim-open-btn,
.app-root.light .sim-fullscreen-btn,
.app-root.light .sim-netab-btn {
  background: #fff;
  color: #222;
  border: 1px solid rgba(0,0,0,0.12);
}

/* Toolbar */
.app-root.light .sim-toolbar {
  background: #fff;
  border-top: 1px solid rgba(0,0,0,0.06);
}

/* Iframe area */
.app-root.light .sim-iframe {
  background: #fff;
}

/* Status text */
.app-root.light .sim-status {
  color: #666;
}

/* Top draggable bar */
.app-root.light .appTopBar {
  background: #ccc;
}

/* Window control buttons */
.app-root.light .btnMaxColor,
.app-root.light .btnMinColor {
  background: white;
  color: #000;
}

.app-root.light .appWindowCloseColor {
  background: #d90429;
  color: #fff;
}

.app-root.light .misc {
  background: white;
  color: black;
}

.app-root.light .misc2 {
  background: black;
  color: #eee;
}

.app-menu.light {
  background: white;
  color: black;
}

/* =========================================================
   🌙 DARK THEME
========================================================= */
.panel.dark {
  background: #444;
  color: #fff;
}
.app-root.dark .sim-address-row {
  background: #222; margin: 0 8px;
}

/* Iframe background */
.app-root.dark .sim-iframe {
  background: #111; /* deep dark, matches content area */
}
.app-root.dark {
  background:#1e1e1e;
  color:#ddd;
}

.app-root.dark .sim-chrome-top {
  background: linear-gradient(#2a2a2a,#1f1f1f);
}

.app-root.dark .sim-tab {
  color:#ddd;
}

.app-root.dark .sim-tab.active {
  background: rgba(255,255,255,0.08);
}

.app-root.dark .sim-tab .close {
  color:rgba(251, 248, 248, 1);
}
  .app-root.dark .sim-url-input { flex:1; height:32px; background-color: "black"; border-radius:6px; border:1px solid rgba(0,0,0,0.12); padding:0 10px; font-size:14px; }
.app-root.dark .sim-url-input,
.app-root.dark .sim-proxy-input {
  background:#2a2a2a;
  color:#eee;
  border:1px solid rgba(255,255,255,0.15);
}

.app-root.dark .sim-open-btn,
.app-root.dark .sim-fullscreen-btn,
.app-root.dark .sim-netab-btn {
  background:#2a2a2a;
  color:#eee;
  border:1px solid rgba(255,255,255,0.15);
}

.app-root.dark .sim-toolbar {
  background:#1e1e1e;
  border-top:1px solid rgba(255,255,255,0.08);
}

.app-root.dark .sim-iframe {
  background:#111;
}

.app-root.dark .sim-status {
  color:#aaa;
}

.app-root.dark .app-menu {
  color: black;
}

.app-root.dark .btnMaxColor {
  color: white;
  background: black;
}

.app-root.dark .btnMinColor {
  color: white;
  background: black;
}

.app-root.dark .appWindowCloseColor {
  background: #d90429;
  color: #fff;
}

.app-root.dark .appTopBar {
  background: #444;
}

.app-root.dark .misc {
  background: black;
  color: white;
}

.app-root.dark .misc2 {
  background: #444;
  color: white;
}

.app-menu.dark {
  background: black;
  color: white;
}

/* =========================================================
   📱 Responsive
========================================================= */
@media (max-width: 600px) {
  .app-root {
    left:6px;
    right:6px;
    width:auto;
    height:480px;
  }
}










/* taskbar/system */
.taskbar {}
.taskbutton{}
.taskbar.light {
  background: lightgray;
  color: black;
}
.taskbutton.dark {
  background: #444;
  color: white;
}

.taskbutton.light {
  background: white;
  color: black;
}
.taskbar.dark {
  background: #222;
  color: white;
}


`;

document.head.appendChild(style);
