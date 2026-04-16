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
    enableURLSync:
      typeof overrides.enableURLSync === "boolean"
        ? overrides.enableURLSync
        : typeof runtime.enableURLSync === "boolean"
          ? runtime.enableURLSync
          : true,
    lazyloading:
      typeof overrides.lazyloading === "boolean"
        ? overrides.lazyloading
        : typeof runtime.lazyloading === "boolean"
          ? runtime.lazyloading
          : true,
    autoupdate:
      typeof overrides.autoupdate === "boolean"
        ? overrides.autoupdate
        : typeof runtime.autoupdate === "boolean"
          ? runtime.autoupdate
          : true,
    siteSettings:
      Array.isArray(overrides.siteSettings)
        ? overrides.siteSettings
        : Array.isArray(runtime.siteSettings)
          ? runtime.siteSettings
          : [],
    maxSpace: Number.isFinite(Number(overrides.maxSpace)) && Number(overrides.maxSpace) > 0
      ? Number(overrides.maxSpace)
      : Number.isFinite(Number(runtime.maxSpace)) && Number(runtime.maxSpace) > 0
        ? Number(runtime.maxSpace)
        : 5,
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