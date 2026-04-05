// Preserve window.data if already set (e.g., from ouchbad.js account creation), otherwise initialize
// absolutely no hardcoded app names allowed! all apps should be installed and theres no way to predict their name and structure in advance, so we must not bake in any assumptions here. we will rely on dynamic detection and labeling based on heuristics instead.
// i mean by no if(appId === 'browser') or similar checks anywhere in the core (flowaway.js/goldenbody.js). its not allowed!
if (!window.data) window.data = data;
window.____gbEventListners = [];
window.loaded = false;
window.APP_VERSION = "v1.13.0";

if (typeof data.autohidetaskbar === "undefined") {
  data.autohidetaskbar = false;
}
var hasChanges;
var atTop = "";
var zTop = 10;
function removeAllEventListernersInWindow() {
  for (const listener of window.____gbEventListners) {
    try {
      window.removeEventListener(        listener.type,         listener.handler,         listener.options      );
      document.removeEventListener(        listener.type,         listener.handler,         listener.options      );
    } catch (e) {
      console.error("Error removing event listener", e);
    }
  }
  window.____gbEventListners = [];
}
function formatBytes(bytes, decimals = 2) {
  if (bytes === 0) return "0 Bytes";

  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ["Bytes", "KB", "MB", "GB", "TB", "PB", "EB"];

  const i = Math.floor(Math.log(bytes) / Math.log(k));

  return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + " " + sizes[i];
}
function calculateVwInPixels(vwValue) {
  const viewportWidth = window.innerWidth; // Get the current viewport width in pixels
  const pixels = (vwValue * viewportWidth) / 100; // Apply the conversion formula
  return pixels;
}

window._flowawayDebugState = window._flowawayDebugState || {
  enabled: false,
  errors: [],
  maxErrors: 200,
};

window.setFlowawayDebug = function (enabled) {
  window._flowawayDebugState = window._flowawayDebugState || {
    enabled: false,
    errors: [],
    maxErrors: 200,
  };
  window._flowawayDebugState.enabled = !!enabled;
};

window.getFlowawayErrors = function () {
  window._flowawayDebugState = window._flowawayDebugState || {
    enabled: false,
    errors: [],
    maxErrors: 200,
  };
  return (window._flowawayDebugState.errors || []).slice();
};

function flowawayDebug(scope, message, meta) {
  try {
    if (!window._flowawayDebugState || !window._flowawayDebugState.enabled)
      return;
    if (typeof meta === "undefined")
      console.debug("[FLOWAWAY][" + scope + "] " + message);
    else console.debug("[FLOWAWAY][" + scope + "] " + message, meta);
  } catch (e) {}
}

function flowawayError(scope, message, error, meta) {
  try {
    window._flowawayDebugState = window._flowawayDebugState || {
      enabled: false,
      errors: [],
      maxErrors: 200,
    };
    var entry = {
      ts: Date.now(),
      scope: scope,
      message: message,
      meta: meta || null,
      error: error ? error.stack || error.message || String(error) : null,
    };
    window._flowawayDebugState.errors = window._flowawayDebugState.errors || [];
    window._flowawayDebugState.errors.push(entry);
    if (
      window._flowawayDebugState.errors.length >
      (window._flowawayDebugState.maxErrors || 200)
    ) {
      window._flowawayDebugState.errors.shift();
    }
  } catch (e) {}

  if (typeof meta === "undefined")
    console.error("[FLOWAWAY][" + scope + "] " + message, error);
  else console.error("[FLOWAWAY][" + scope + "] " + message, meta, error);

  try {
    showFlowawayMessage(
      "System Message",
      "[" + String(scope || "runtime") + "] " + String(message || "Unknown error"),
      "error",
    );
  } catch (e) {}
}

function showFlowawayMessage(title, body, level) {
  var isDark = true;
  try {
    var darkVal = null;
    if (window.data && typeof window.data.dark !== "undefined") darkVal = window.data.dark;
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
  showFlowawayMessage("Alert", String(message || ""), "info");
};

window.confirm = function (message) {
  showFlowawayMessage("Confirm", String(message || ""), "info");
  return false;
};

window.prompt = function (message, defaultValue) {
  var text = String(message || "");
  if (typeof defaultValue !== "undefined" && defaultValue !== null) {
    text += "\nDefault: " + String(defaultValue);
  }
  showFlowawayMessage("Prompt", text, "info");
  return null;
};

function flowawayCrash(message, detail) {
  var title = "System Crash";
  var body = String(message || "A fatal system error occurred.");
  var extra = detail ? String(detail) : "";

  try {
    if (window._flowawayCrashed) {
      try {
        showFlowawayMessage(title, extra ? body + "\n\n" + extra : body, "fatal");
      } catch (e) {}
      return;
    }
    window._flowawayCrashed = true;
    flowawayError("fatal", body, null, extra ? { detail: extra } : undefined);

    var existing = document.getElementById("flowaway-fatal-crash-dialog");
    if (!existing) {
      var overlay = document.createElement("div");
      overlay.id = "flowaway-fatal-crash-dialog";
      Object.assign(overlay.style, {
        position: "fixed",
        inset: "0",
        zIndex: "2147483647",
        background: "rgba(0, 0, 0, 0.72)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "20px",
      });

      var box = document.createElement("div");
      Object.assign(box.style, {
        width: "min(680px, 100%)",
        borderRadius: "10px",
        border: "1px solid rgba(255,255,255,0.18)",
        background: "#161616",
        color: "#fff",
        fontFamily: "sans-serif",
        padding: "18px",
        boxSizing: "border-box",
      });

      var titleEl = document.createElement("div");
      titleEl.textContent = title;
      titleEl.style.fontSize = "18px";
      titleEl.style.fontWeight = "700";
      titleEl.style.marginBottom = "10px";

      var bodyEl = document.createElement("div");
      bodyEl.id = "flowaway-fatal-crash-body";
      bodyEl.style.whiteSpace = "pre-wrap";
      bodyEl.style.fontSize = "13px";
      bodyEl.style.lineHeight = "1.45";

      box.appendChild(titleEl);
      box.appendChild(bodyEl);
      overlay.appendChild(box);
      document.body.appendChild(overlay);
    }

    var bodyNode = document.getElementById("flowaway-fatal-crash-body");
    if (bodyNode) {
      bodyNode.textContent = extra ? body + "\n\n" + extra : body;
    }
  } catch (e) {
    try {
      console.error(title + ": " + body + (extra ? "\n\n" + extra : ""));
    } catch (ee) {}
  }

  throw new Error(body + (extra ? " | " + extra : ""));
}

var nativeEventTargetAdd =
  window.EventTarget &&
  window.EventTarget.prototype &&
  typeof window.EventTarget.prototype.addEventListener === "function"
    ? window.EventTarget.prototype.addEventListener
    : null;
var nativeDocumentEventlister = nativeEventTargetAdd
  ? nativeEventTargetAdd.bind(document)
  : document.addEventListener.bind(document);
var nativeWindowEventlister = nativeEventTargetAdd
  ? nativeEventTargetAdd.bind(window)
  : window.addEventListener.bind(window);
var nativeEventTargetRemove =
  window.EventTarget &&
  window.EventTarget.prototype &&
  typeof window.EventTarget.prototype.removeEventListener === "function"
    ? window.EventTarget.prototype.removeEventListener
    : null;
var nativeDocumentEventRemover = nativeEventTargetRemove
  ? nativeEventTargetRemove.bind(document)
  : document.removeEventListener.bind(document);
var nativeWindowEventRemover = nativeEventTargetRemove
  ? nativeEventTargetRemove.bind(window)
  : window.removeEventListener.bind(window);

function isValidEventListener(handler) {
  return (
    typeof handler === "function" ||
    !!(handler && typeof handler.handleEvent === "function")
  );
}

function normalizeCaptureOption(options) {
  if (typeof options === "boolean") return options;
  if (
    options &&
    typeof options === "object" &&
    typeof options.capture === "boolean"
  )
    return options.capture;
  return false;
}

function normalizeAddEventArgs(a, b, c, d) {
  // Supports both signatures:
  // 1) native: (type, handler, options)
  // 2) scoped: (appname, type, handler, options)
  if (typeof b === "string" && isValidEventListener(c)) {
    return { appname: String(a || ""), type: b, handler: c, options: d };
  }
  return { appname: "", type: a, handler: b, options: c };
}

function addScopedListener(
  targetName,
  nativeAdd,
  appname,
  type,
  handler,
  options,
) {
  if (typeof type !== "string" || !isValidEventListener(handler)) {
    return;
  }
  window.____gbEventListners.push({type, handler, options});
  nativeAdd(type, handler, options);

  if (!appname) return;
  var scopedAppName = String(appname).trim();
  if (!scopedAppName) return;
  window[scopedAppName + "_handlers"] =
    window[scopedAppName + "_handlers"] || [];
  window[scopedAppName + "_handlers"].push({
    target: targetName,
    type,
    handler,
    options,
    capture: normalizeCaptureOption(options),
  });
}

document.addEventListener = function (a, b, c, d) {
  var parsed = normalizeAddEventArgs(a, b, c, d);
  addScopedListener(
    "document",
    nativeDocumentEventlister,
    parsed.appname,
    parsed.type,
    parsed.handler,
    parsed.options,
  );
};

window.addEventListener = function (a, b, c, d) {
  var parsed = normalizeAddEventArgs(a, b, c, d);
  addScopedListener(
    "window",
    nativeWindowEventlister,
    parsed.appname,
    parsed.type,
    parsed.handler,
    parsed.options,
  );
};

window.removeAllEventListenersForApp = function (appname) {
  var scopedAppName = String(appname || "").trim();
  if (!scopedAppName) return;
  var handlers = window[scopedAppName + "_handlers"] || [];
  handlers.forEach(({ target, type, handler, options, capture }) => {
    if (target === "document") {
      try {
        nativeDocumentEventRemover(type, handler, options);
      } catch (e) {}
      try {
        nativeDocumentEventRemover(
          type,
          handler,
          typeof capture === "boolean"
            ? capture
            : normalizeCaptureOption(options),
        );
      } catch (e) {}
      return;
    }
    if (target === "window") {
      try {
        nativeWindowEventRemover(type, handler, options);
      } catch (e) {}
      try {
        nativeWindowEventRemover(
          type,
          handler,
          typeof capture === "boolean"
            ? capture
            : normalizeCaptureOption(options),
        );
      } catch (e) {}
      return;
    }
    // Backward compatibility for older tracked entries without target.
    var fallbackCapture =
      typeof capture === "boolean" ? capture : normalizeCaptureOption(options);
    try {
      nativeWindowEventRemover(type, handler, options);
    } catch (e) {}
    try {
      nativeWindowEventRemover(type, handler, fallbackCapture);
    } catch (e) {}
    try {
      nativeDocumentEventRemover(type, handler, options);
    } catch (e) {}
    try {
      nativeDocumentEventRemover(type, handler, fallbackCapture);
    } catch (e) {}
  });
  window[scopedAppName + "_handlers"] = [];
};

window.windowControlSvgs = {
  minimize:
    '<svg viewBox="0 0 24 24" width="14" height="14" aria-hidden="true" focusable="false" style="display:block;margin:auto" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="5" y1="12" x2="19" y2="12"></line></svg>',
  maximize:
    '<svg viewBox="0 0 24 24" width="14" height="14" aria-hidden="true" focusable="false" style="display:block;margin:auto" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="5" y="5" width="14" height="14" rx="1" ry="1"></rect></svg>',
  restore:
    '<svg viewBox="0 0 24 24" width="14" height="14" aria-hidden="true" focusable="false" style="display:block;margin:auto" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="9" y="9" width="10" height="10" rx="1" ry="1"></rect><path d="M15 9V5H5v10h4"></path></svg>',
  close:
    '<svg viewBox="0 0 24 24" width="14" height="14" aria-hidden="true" focusable="false" style="display:block;margin:auto" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="6" y1="6" x2="18" y2="18"></line><line x1="18" y1="6" x2="6" y2="18"></line></svg>',
};

window.applyWindowControlIcon = function (button, iconName, options = {}) {
  if (!button) return;
  var svg = window.windowControlSvgs[iconName] || "";
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
  if (!window._applyFlowawayControlSizing) {
    window._applyFlowawayControlSizing = function (btn) {
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
      var computedPx = calculateVwInPixels(vwVal);

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
            var px = calculateVwInPixels(vwNum);
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
      if (window._flowaway_handlers && window._flowaway_handlers.onResize)
        window.removeEventListener(
          "resize",
          window._flowaway_handlers.onResize,
        );
      window._flowaway_handlers = window._flowaway_handlers || {};
      window._flowaway_handlers.onResize = function () {
        try {
          document.querySelectorAll("[data-flow-control]").forEach((b) => {
            try {
              window._applyFlowawayControlSizing(b);
            } catch (e) {}
          });
        } catch (e) {}
      };
      window.addEventListener("resize", window._flowaway_handlers.onResize);
    } catch (e) {}
  }

  // finally apply sizing for this particular button
  try {
    window._applyFlowawayControlSizing(button);
  } catch (e) {}
};

window.setWindowMaximizeIcon = function (button, isMaximized) {
  window.applyWindowControlIcon(button, isMaximized ? "restore" : "maximize");
};
document.body.style.backgroundImage =
  "url(https://flowaway-goldenbody.github.io/GBCDN/cloudwithtemples.png)";
document.body.style.backgroundSize = "cover";
document.body.style.backgroundPosition = "center";
document.body.style.backgroundRepeat = "no-repeat";
var rebuildhandler = function () {
  try {
    try {
      window._flowawayIsRebuilding = true;
    } catch (e) {}
    try {
      if (
        window.FlowawayProcess &&
        typeof window.FlowawayProcess.disposeAll === "function"
      ) {
        window.FlowawayProcess.disposeAll("rebuild");
      }
    } catch (e) {}
    try {
      if (
        window._flowaway_handlers &&
        window._flowaway_handlers.processTrackerFallbackTimer
      ) {
        clearInterval(window._flowaway_handlers.processTrackerFallbackTimer);
        delete window._flowaway_handlers.processTrackerFallbackTimer;
      }
      if (
        window._flowaway_handlers &&
        window._flowaway_handlers.processTrackerSyncTimer
      ) {
        clearTimeout(window._flowaway_handlers.processTrackerSyncTimer);
        delete window._flowaway_handlers.processTrackerSyncTimer;
      }
    } catch (e) {}
    try {
      if (
        window.FlowawayAppPolling &&
        typeof window.FlowawayAppPolling.stop === "function"
      ) {
        window.FlowawayAppPolling.stop();
      }
    } catch (e) {}
    try {
      if (window.process && window.FlowawayProcess && window.process === window.FlowawayProcess) {
        delete window.process;
      }
    } catch (e) {}
    try {
      delete window.FlowawayProcess;
      delete window.__processRuntime;
      delete window.__processes;
      delete window.__processRegistry;
      delete window.__processObjectsByPid;
      delete window.__dynamicProcesses;
      delete window.__taskManagerSnapshot;
      delete window.__taskProcessCounter;
      delete window.__taskProcessIdByIdentity;
      delete window.__taskProcessObjectIdentity;
      delete window.__taskProcessObjectIdentityCounter;
      delete window._flowawayProcessTrackerState;
      delete window.__flowawayProcessSystemPromise;
      delete window.__flowawayProcessSystemFailed;
      delete window.FlowawayAppLoader;
      delete window.__flowawayAppLoaderSystemPromise;
      delete window.FlowawayAppPolling;
      delete window.__flowawayAppPollingSystemPromise;
      delete window.__flowawayAppPollingSystemFailed;
      delete window.__flowawayProcessLoadTreeWrapped;
      delete window.__flowawayProcessLaunchAppWrapped;
      delete window.__flowawayProcessAppUpdatedBound;
      delete window.__flowawayLaunchContext;
    } catch (e) {}
    // remove all event listeners to refresh the environment.
    removeAllEventListernersInWindow();
    window.apps.forEach((app) => {
      try {
        // dont remove this ai
        delete window[app.globalvarobjectstring]
      } catch (e) {
        notification("Error occurred while trying to access app global object: " + e.message);
      }
    });
    window.apps = [];
    // Pause and unload any playing media to avoid audio carrying over
    try {
      document.querySelectorAll("audio,video").forEach((m) => {
        try {
          m.pause();
          m.src = "";
        } catch (e) {}
      });
    } catch (e) {}
    try {
      if (
        window.FlowawayAppPolling &&
        typeof window.FlowawayAppPolling.stop === "function"
      ) {
        window.FlowawayAppPolling.stop();
      }
    } catch (e) {}
    try {
      if (
        window._flowaway_handlers &&
        window._flowaway_handlers.timeIntervalId
      ) {
        clearInterval(window._flowaway_handlers.timeIntervalId);
        delete window._flowaway_handlers.timeIntervalId;
      }
      if (
        window._flowaway_handlers &&
        window._flowaway_handlers.applyTaskButtonsRetryTimer
      ) {
        clearTimeout(window._flowaway_handlers.applyTaskButtonsRetryTimer);
        delete window._flowaway_handlers.applyTaskButtonsRetryTimer;
      }
    } catch (e) {}
    try {
      var oldTaskbar = document.getElementById("taskbar");
      if (oldTaskbar) oldTaskbar.remove();
      var oldStartMenu = document.getElementById("startMenu");
      if (oldStartMenu) oldStartMenu.remove();
    } catch (e) {}

    try {
      window.apps = [];
      window.appButtons = {};
      window.appsButtonsApplied = false;
      window._suppressTaskbarPersist = true;
    } catch (e) {}

    try {
      delete window._flowawayLoadTreePromise;
      delete window._flowawayFileFetchInFlight;
      delete window._flowawayFileFetchRecent;
      delete window._flowawaySystemHelperState;
      delete window._flowawayMissingFolders;
      window.loaded = false;
      window.__flowawayBootLoaded = false;
      window.__flowawayRuntimeLoaded = false;
      window._flowawayCrashed = false;
      window._flowawayIsRebuilding = false;
    } catch (e) {}
    // Remove all children from the documentElement (head/body) to get a clean slate
    var docEl = document.documentElement;
    while (docEl.firstChild) docEl.removeChild(docEl.firstChild);

    // Recreate minimal head and body so we can inject ouchbad.js reliably
    var head = document.createElement("head");
    var meta = document.createElement("meta");
    meta.setAttribute("charset", "utf-8");
    head.appendChild(meta);
    docEl.appendChild(head);

    var body = document.createElement("body");
    docEl.appendChild(body);
    // Inject homepage loader
    var script = document.createElement("script");
    script.src = "ouchbad.js";

    //clear state
    window.appsButtonsApplied = false;
    data = null;
    // small timeout to ensure DOM plumbing finishes
    setTimeout(() => {
      try {
        document.body.appendChild(script);
      } catch (e) {
        console.error("append homepage script failed", e);
        location.reload();
      }
    }, 80);
  } catch (err) {
    console.error("rebuildhandler error, falling back to reload", err);
    try {
      location.reload();
    } catch (e) {
      /* ignore */
    }
  }
};
var worldvolume = 0.5;

window.findNodeByPath = function (relPath) {
  var parts = relPath.split("/");
  var current = treeData;
  for (let i = 1; i < parts.length; i++) {
    if (!current[1]) return null;
    current = current[1].find((c) => c[0] === parts[i]);
  }
  return current;
};
window.removeNodeFromTree = function (node, pathParts) {
  if (!node || !Array.isArray(node[1])) return false;

  var [target, ...rest] = pathParts;

  for (let i = 0; i < node[1].length; i++) {
    var child = node[1][i];

    if (child[0] === target) {
      if (rest.length === 0) {
        node[1].splice(i, 1); // delete node
        return true;
      } else {
        return window.removeNodeFromTree(child, rest); // go deeper
      }
    }
  }

  return false; // not found
};
// global vars
var savedScrollX = 0;
var savedScrollY = 0;
var nhjd = 1;

// central place to store named handlers so we can remove/rebind safely
window._flowaway_handlers = window._flowaway_handlers || {};

// Scroll lock - ensure single binding
try {
  if (window._flowaway_handlers.onScroll)
    window.removeEventListener("scroll", window._flowaway_handlers.onScroll);
  window._flowaway_handlers.onScroll = () => {
    window.scrollTo(savedScrollX, savedScrollY);
  };
  window.addEventListener("scroll", window._flowaway_handlers.onScroll);
} catch (e) {}

savedScrollX = window.scrollX;
savedScrollY = window.scrollY;

// body restrictions
var bodyStyle = document.createElement("style");
bodyStyle.textContent = `body {
overflow: hidden;
}`;
document.body.appendChild(bodyStyle);
// Prevent default context menu (single binding)
try {
  if (window._flowaway_handlers.onContextMenu)
    window.removeEventListener(
      "contextmenu",
      window._flowaway_handlers.onContextMenu,
    );
  window._flowaway_handlers.onContextMenu = function (e) {
    e.preventDefault();
  };
  window.addEventListener(
    "contextmenu",
    window._flowaway_handlers.onContextMenu,
  );
} catch (e) {}
// content
try {
  if (window._flowaway_handlers.onBeforeUnload)
    window.removeEventListener(
      "beforeunload",
      window._flowaway_handlers.onBeforeUnload,
    );
  window._flowaway_handlers.onBeforeUnload = function (event) {
    event.preventDefault();
  };
  window.addEventListener(
    "beforeunload",
    window._flowaway_handlers.onBeforeUnload,
  );
} catch (e) {}

function showSessionExpiredDialog() {
  if (    document.getElementById("session-expired-dialog") ||     window._flowawayIsRebuilding  ) {
    // already shown
    return;
  }

  const dlg = document.createElement("div");
  dlg.id = "session-expired-dialog";
  Object.assign(dlg.style, {
    position: "fixed",
    left: "50%",
    top: "50%",
    transform: "translate(-50%, -50%)",
    width: "420px",
    maxWidth: "90vw",
    background: window.data && window.data.dark ? "#222" : "#fff",
    color: window.data && window.data.dark ? "#fff" : "#000",
    borderRadius: "8px",
    boxShadow: "0 8px 30px rgba(0,0,0,0.3)",
    zIndex: 99999,
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
  htitle.textContent = "Session Expired";
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
    display: "grid",
    placeItems: "center",
    lineHeight: "0",
    fontSize: "14px",
  });

  header.append(htitle);
  header.append(closeX);
  dlg.appendChild(header);

  const content = document.createElement("div");
  content.style.padding = "8px 0";
  content.style.fontSize = "13px";
  content.style.flex = "1";
  content.textContent =
    "Your session has expired. Refill using your current session token, or sign in again if needed.";
  dlg.appendChild(content);

  const status = document.createElement("div");
  status.style.fontSize = "12px";
  status.style.minHeight = "16px";
  status.style.marginBottom = "8px";
  dlg.appendChild(status);

  // Password input for password-based refill
  const pwdRow = document.createElement("div");
  pwdRow.style.display = "flex";
  pwdRow.style.gap = "8px";
  pwdRow.style.alignItems = "center";
  pwdRow.style.marginBottom = "8px";

  const pwdInput = document.createElement("input");
  pwdInput.type = "password";
  pwdInput.placeholder = "Account password";
  Object.assign(pwdInput.style, {
    flex: "1",
    padding: "6px",
    borderRadius: "6px",
    border: "1px solid #ccc",
    boxSizing: "border-box",
  });

  pwdRow.appendChild(pwdInput);
  dlg.appendChild(pwdRow);

  const btnRow = document.createElement("div");
  btnRow.style.display = "flex";
  btnRow.style.justifyContent = "flex-end";
  btnRow.style.gap = "8px";

  const reloadBtn = document.createElement("button");
  reloadBtn.textContent = "Sign In Again";
  reloadBtn.style.padding = "6px 10px";

  const refillBtn = document.createElement("button");
  refillBtn.textContent = "Refill Session";
  refillBtn.style.padding = "6px 10px";

  const closeBtn = document.createElement("button");
  closeBtn.textContent = "Close";
  closeBtn.style.padding = "6px 10px";

  btnRow.append(closeBtn, refillBtn, reloadBtn);
  dlg.appendChild(btnRow);

  closeX.addEventListener("click", () => dlg.remove());
  closeBtn.addEventListener("click", () => dlg.remove());
  refillBtn.addEventListener("click", async () => {
    // When user clicks refill, don't attempt token-based refill automatically.
    // Instead prompt for password and only send a password-based refill when provided.
    const uname = (function () {
      const u = getCurrentUsernameForRequests();
      if (u && typeof u === 'string' && u.trim()) return u.trim();
      if (window.data && typeof window.data.username === 'string')         return window.data.username.trim();
      return '';
    })();

    if (!uname) {
      status.textContent = "No username available. Sign in again.";
      status.style.color = "red";
      return;
    }

    const password = (      pwdInput && typeof pwdInput.value === 'string')         ? pwdInput.value.trim() : '';

    // If no password provided yet, focus the input and ask the user to enter it.
    if (!password) {
      status.textContent =         "Enter your account password above and click Refill to submit.";
      status.style.color = "#c66";
      try {         pwdInput.focus();       } catch (e) {}
      return;
    }

    // Now send password-based refill request (do not rely on existing session token)
    refillBtn.disabled = true;
    refillBtn.textContent = "Refilling...";
    status.textContent = "";

    try {
      const res = await fetch(zmcdserver, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({           refillSession: true,           username: uname,           password         }),
      });

      let body = null;
      try {         body = await res.json();       } catch (e) {         body = null;       }

      if (!res.ok) {
        const serverMsg =           (body && body.error) || body || res.statusText || 'unknown error';
        status.textContent = `Session refill failed: ${serverMsg} (HTTP ${res.status})`;
        status.style.color = 'red';
        console.error('Refill failed:', res.status, body);
        refillBtn.disabled = false;
        refillBtn.textContent = 'Refill Session';
        return;
      }

      if (!body || !body.success || !body.authToken) {
        const serverMsg = (body && body.error) || 'Invalid server response';
        status.textContent = `Session refill failed: ${serverMsg}`;
        status.style.color = 'red';
        console.error('Refill unexpected response:', body);
        refillBtn.disabled = false;
        refillBtn.textContent = 'Refill Session';
        return;
      }

      window.data = window.data || {};
      window.data.authToken = body.authToken;
      status.textContent = 'Session refilled. You can continue.';
      status.style.color = 'green';
      setTimeout(() => {         try {           dlg.remove();         } catch (e) {}       }, 350);
    } catch (err) {
      console.error('Refill request error', err);
      status.textContent = 'Session refill failed. Sign in again.';
      status.style.color = 'red';
    }

    refillBtn.disabled = false;
    refillBtn.textContent = 'Refill Session';
  });
  reloadBtn.addEventListener("click", () => {
    rebuildhandler();
  });

  document.body.appendChild(dlg);
}

// Session-expired suppression removed. Previously set/checked a global
// `window._flowawaySuppressSessionExpiredUntil`; this logic is no longer
// required and has been removed.

function getCurrentUsernameForRequests() {
  var liveUsername = "";
  var cachedUsername = "";
  try {
    if (window.data && typeof window.data.username === "string") {
      liveUsername = String(window.data.username || "").trim();
    } else if (
      typeof data !== "undefined" &&
      data &&
      typeof data.username === "string"
    ) {
      liveUsername = String(data.username || "").trim();
    }
  } catch (e) {}

  try {
    if (typeof window.__flowawayCachedUsername === "string") {
      cachedUsername = String(window.__flowawayCachedUsername || "").trim();
    }
  } catch (e) {}

  try {
    if (typeof username === "string") {
      cachedUsername = String(username || "").trim() || cachedUsername;
    }
  } catch (e) {}

  if (liveUsername) {
    try {
      window.__flowawayCachedUsername = liveUsername;
    } catch (e) {}
    try {
      if (typeof username === "string" && liveUsername !== username) {
        username = liveUsername;
      }
    } catch (e) {}
  }

  return liveUsername || cachedUsername;
}


async function filePost(data) {
  const headers = { "Content-Type": "application/json" };
  if (window.data && window.data.authToken)
    headers["Authorization"] = "Bearer " + window.data.authToken;
  var res = await fetch(SERVER, {
    method: "POST",
    headers,
    body: JSON.stringify({
      username: getCurrentUsernameForRequests(),
      ...data,
    }),
  });
  let body = null;
  try {
    body = await res.json();
  } catch (e) {
    body = null;
  }
  if (body && (body.authToken || body.token)) {
    try {
      window.data = window.data || {};
      window.data.authToken = body.authToken || body.token;
    } catch (e) {}
  }
  if (res.status === 401 && !firstlogin) {
    try {
      showSessionExpiredDialog();
    } catch (e) {}
    return body || { error: "unauthorized" };
  }
  firstlogin = false;
  return body;
}
async function zmcdpost(data) {
  const headers = { "Content-Type": "application/json" };
  if (window.data && window.data.authToken)
    headers["Authorization"] = "Bearer " + window.data.authToken;
  var res = await fetch(zmcdserver, {
    method: "POST",
    headers,
    body: JSON.stringify({
      username: getCurrentUsernameForRequests(),
      ...data,
    }),
  });
  let body = null;
  try {
    body = await res.json();
  } catch (e) {
    body = null;
  }
  if (body && (body.authToken || body.token)) {
    try {
      window.data = window.data || {};
      window.data.authToken = body.authToken || body.token;
    } catch (e) {}
  }
  if (res.status === 401) {
    try {
      showSessionExpiredDialog();
    } catch (e) {}
    return body || { error: "unauthorized" };
  }
  return body;
}
async function posttaskbuttons(data) {
  const headers = { "Content-Type": "application/json" };
  if (window.data && window.data.authToken)
    headers["Authorization"] = "Bearer " + window.data.authToken;
  var res = await fetch(zmcdserver, {
    method: "POST",
    headers,
    body: JSON.stringify({
      username: getCurrentUsernameForRequests(),
      data: data,
      edittaskbuttons: true,
    }),
  });
  let body = null;
  try {
    body = await res.json();
  } catch (e) {
    body = null;
  }
  if (body && (body.authToken || body.token)) {
    try {
      window.data = window.data || {};
      window.data.authToken = body.authToken || body.token;
    } catch (e) {}
  }
  if (res.status === 401) {
    try {
      showSessionExpiredDialog();
    } catch (e) {}
    return body || { error: "unauthorized" };
  }
  return body;
}
async function downloadPost(data) {
  var res = await fetch(downloadserver, {
    method: "POST",
    headers: (function () {
      const h = { "Content-Type": "application/json" };
      if (window.data && window.data.authToken)
        h["Authorization"] = "Bearer " + window.data.authToken;
      return h;
    })(),
    body: JSON.stringify({
      username: getCurrentUsernameForRequests(),
      data: data,
      edittaskbuttons: true,
    }),
  });
  let body = null;
  try {
    body = await res.json();
  } catch (e) {
    body = null;
  }
  if (body && (body.authToken || body.token)) {
    try {
      window.data = window.data || {};
      window.data.authToken = body.authToken || body.token;
    } catch (e) {}
  }
  if (res.status === 401) {
    try {
      showSessionExpiredDialog();
    } catch (e) {}
    return body || { error: "unauthorized" };
  }
  return body;
}
function annotateTreeWithPaths(tree, basePath = "") {
  var [name, children, meta = {}] = tree;

  var path = name === "root" ? "" : basePath ? `${basePath}/${name}` : name;

  tree[2] = { ...meta, path };

  if (Array.isArray(children)) {
    for (const child of children) {
      annotateTreeWithPaths(child, path);
    }
  }
}
window.loadTree = async function () {
  if (window._flowawayLoadTreePromise) {
    return window._flowawayLoadTreePromise;
  }

  window._flowawayLoadTreePromise = (async () => {
    var data = await filePost({ initFE: true });
    treeData = data.tree;

    annotateTreeWithPaths(treeData); // ✅ ADD THIS LINE
  })();

  try {
    await window._flowawayLoadTreePromise;
  } finally {
    window._flowawayLoadTreePromise = null;
  }

  // render();
};

// --- Global picker helpers ---
function base64ToArrayBuffer(base64) {
  var binaryString = atob(base64);
  var len = binaryString.length;
  var bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) bytes[i] = binaryString.charCodeAt(i);
  return bytes.buffer;
}

// UTF-8 safe base64 -> string helper. Use this for text files (JS, txt, svg, etc.)
function base64ToUtf8(b64OrBuffer) {
  try {
    // If caller passed an ArrayBuffer or Uint8Array, decode directly
    if (
      b64OrBuffer &&
      (b64OrBuffer instanceof ArrayBuffer || ArrayBuffer.isView(b64OrBuffer))
    ) {
      var buf =
        b64OrBuffer instanceof ArrayBuffer ? b64OrBuffer : b64OrBuffer.buffer;
      return new TextDecoder("utf-8").decode(buf);
    }

    // Otherwise assume base64 string
    var buf = base64ToArrayBuffer(String(b64OrBuffer || ""));
    return new TextDecoder("utf-8").decode(buf);
  } catch (e) {
    try {
      // fallback to atob for environments without TextDecoder support
      if (typeof b64OrBuffer === "string") return atob(b64OrBuffer);
    } catch (ee) {}
    return "";
  }
}

function decodeFileTextStrict(rawContent, pathLabel, options) {
  var opts = options && typeof options === "object" ? options : {};
  var allowEmpty = !!opts.allowEmpty;
  var text = "";

  try {
    text = base64ToUtf8(rawContent);
  } catch (e) {
    flowawayError(
      "decodeFileTextStrict",
      "Failed to decode file content.",
      e,
      String(pathLabel || "unknown path"),
    );
    return "";
  }

  if (typeof text !== "string") {
    flowawayError("decodeFileTextStrict", "Decoded file content is not text.", null, String(pathLabel || "unknown path"));
    return "";
  }

  if (!allowEmpty && !text.trim()) {
    flowawayError("decodeFileTextStrict", "File content is empty.", null, String(pathLabel || "unknown path"));
    return "";
  }

  return text;
}

window._flowawayFileFetchInFlight =
  window._flowawayFileFetchInFlight || new Map();
window._flowawayFileFetchRecent = window._flowawayFileFetchRecent || new Map();
var FLOWAWAY_FILE_FETCH_CACHE_MS = 750;

async function fetchFileContentByPath(path) {
  if (!path) throw new Error("No path");
  var normalizedPath = String(path).trim();
  if (!normalizedPath) throw new Error("No path");

  var now = Date.now();
  var recentHit = window._flowawayFileFetchRecent.get(normalizedPath);
  if (recentHit && now - recentHit.ts <= FLOWAWAY_FILE_FETCH_CACHE_MS) {
    return recentHit.value;
  }

  var inFlight = window._flowawayFileFetchInFlight.get(normalizedPath);
  if (inFlight) {
    return inFlight;
  }

  var req = (async () => {
    var res = await filePost({
      requestFile: true,
      requestFileName: normalizedPath,
    });

    if (!res || typeof res !== "object") {
      flowawayCrash("File read returned invalid response.", normalizedPath);
    }

    // If server returned a simple base64 payload for small files
    if (
      res &&
      typeof res.filecontent === "string" &&
      (!res.totalChunks || res.totalChunks <= 1)
    ) {
      window._flowawayFileFetchRecent.set(normalizedPath, {
        ts: Date.now(),
        value: res.filecontent,
      });
      return res.filecontent;
    }

    // If server indicates chunking, fetch all chunks and combine as ArrayBuffer
    if (res && typeof res.totalChunks === "number" && res.totalChunks > 1) {
      var chunks = [];
      // first chunk
      if (typeof res.filecontent === "string")
        chunks.push(base64ToArrayBuffer(res.filecontent));

      for (let i = 1; i < res.totalChunks; i++) {
        var part = await filePost({
          requestFile: true,
          requestFileName: normalizedPath,
          chunkIndex: i,
        });
        if (!part || typeof part.filecontent !== "string")
          throw new Error("Missing chunk " + i + " for " + normalizedPath);
        chunks.push(base64ToArrayBuffer(part.filecontent));
      }

      // Combine into single ArrayBuffer
      var total = chunks.reduce((s, c) => s + (c.byteLength || 0), 0);
      var combined = new Uint8Array(total);
      var off = 0;
      for (const c of chunks) {
        var u = new Uint8Array(c);
        combined.set(u, off);
        off += u.byteLength;
      }
      var combinedBuffer = combined.buffer;
      window._flowawayFileFetchRecent.set(normalizedPath, {
        ts: Date.now(),
        value: combinedBuffer,
      });
      return combinedBuffer;
    }

    flowawayCrash("Could not fetch requested file.", normalizedPath);
  })();

  window._flowawayFileFetchInFlight.set(normalizedPath, req);
  try {
    return await req;
  } finally {
    if (window._flowawayFileFetchInFlight.get(normalizedPath) === req) {
      window._flowawayFileFetchInFlight.delete(normalizedPath);
    }
  }
}
// Helper function to hash script content (handles Unicode characters)
function hashScriptContent(text) {
  var hash = 0;
  for (let i = 0; i < text.length; i++) {
    var char = text.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash = hash & hash; // Convert to 32-bit integer
  }
  return Math.abs(hash).toString(16);
}

function isProtectedAppGlobalName(name) {
  if (!name || typeof name !== "string") return false;
  return (
    /Globals$/.test(name) ||
    name === "apps" ||
    name === "_flowaway_handlers" ||
    name === "cmf" ||
    name === "cmfl1"
  );
}

