"use strict";
"use strict";
// required variables.
window.protectedGlobals.windowControlSvgs = {
  minimize:
    '<svg viewBox="0 0 24 24" width="14" height="14" aria-hidden="true" focusable="false" style="display:block;margin:auto" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="5" y1="12" x2="19" y2="12"></line></svg>',
  maximize:
    '<svg viewBox="0 0 24 24" width="14" height="14" aria-hidden="true" focusable="false" style="display:block;margin:auto" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="5" y="5" width="14" height="14" rx="1" ry="1"></rect></svg>',
  restore:
    '<svg viewBox="0 0 24 24" width="14" height="14" aria-hidden="true" focusable="false" style="display:block;margin:auto" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="9" y="9" width="10" height="10" rx="1" ry="1"></rect><path d="M15 9V5H5v10h4"></path></svg>',
  close:
    '<svg viewBox="0 0 24 24" width="14" height="14" aria-hidden="true" focusable="false" style="display:block;margin:auto" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="6" y1="6" x2="18" y2="18"></line><line x1="18" y1="6" x2="6" y2="18"></line></svg>',
};
window.protectedGlobals.fileIconSet = {
  folder: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" class="size-6"> <!-- folder body --> <path d="M3 7a2.5 2.5 0 0 1 2.5-2.5h4.2c.6 0 1.2.2 1.6.6l1.2 1.1c.2.2.5.3.8.3h5.2A2.5 2.5 0 0 1 21 9v8.5A2.5 2.5 0 0 1 18.5 20h-13A2.5 2.5 0 0 1 3 17.5V7Z" fill="#FDCB22" stroke="currentColor" stroke-width="0.8" stroke-linejoin="round" /> <!-- subtle fold highlight (not a cut, just visual depth) --> <path d="M3 11.2H21" stroke="#000000" stroke-opacity="0.35" stroke-width="1" stroke-linecap="round" /> </svg>`,
  file: `<svg xmlns="http://www.w3.org/2000/svg"
     viewBox="0 0 90 90"
     fill="currentColor">
  <path d="M77.474 17.28L61.526 1.332C60.668.473 59.525 0 58.311 0H15.742c-2.508 0-4.548 2.04-4.548 4.548v80.904c0 2.508 2.04 4.548 4.548 4.548h58.516c2.508 0 4.549-2.04 4.549-4.548V20.496c0-1.215-.474-2.358-1.333-3.216zM61.073 5.121l12.611 12.612H62.35c-.704 0-1.276-.573-1.276-1.277V5.121zM74.258 87H15.742c-.854 0-1.548-.694-1.548-1.548V4.548C14.194 3.694 14.888 3 15.742 3h42.332v13.456c0 2.358 1.918 4.277 4.276 4.277h13.457v64.719C75.807 86.306 75.112 87 74.258 87z"/>
  <path d="M68.193 33.319H41.808a1.5 1.5 0 010-3h26.385a1.5 1.5 0 010 3z"/>
  <path d="M34.456 33.319H21.807a1.5 1.5 0 010-3h12.649a1.5 1.5 0 010 3z"/>
  <path d="M42.298 20.733H21.807a1.5 1.5 0 010-3h20.491a1.5 1.5 0 010 3z"/>
  <path d="M68.193 44.319H21.807a1.5 1.5 0 010-3h46.386a1.5 1.5 0 010 3z"/>
  <path d="M48.191 55.319H21.807a1.5 1.5 0 010-3h26.384a1.5 1.5 0 010 3z"/>
  <path d="M68.193 55.319H55.544a1.5 1.5 0 010-3h12.649a1.5 1.5 0 010 3z"/>
  <path d="M68.193 66.319H21.807a1.5 1.5 0 010-3h46.386a1.5 1.5 0 010 3z"/>
  <path d="M68.193 77.319H55.544a1.5 1.5 0 010-3h12.649a1.5 1.5 0 010 3z"/>
</svg>`,
};
window.protectedGlobals.savedScrollX = 0;
window.protectedGlobals.savedScrollY = 0;
window.protectedGlobals.nhjd = 1;
window.protectedGlobals.systemAPIs = window.protectedGlobals.systemAPIs || {};
window.protectedGlobals.USER_PROFILE_PATH = "systemfiles/userprofile/profile.json";
window.protectedGlobals.APP_VERSION = "this app is not versioned";
window.protectedGlobals.hasChanges = false;
window.protectedGlobals.atTop = "";
window.protectedGlobals.zTop = 10;
// required functions for user file system
window.protectedGlobals.findNodeByPath = function (relPath) {
  if (typeof relPath !== "string") return null;
  const normalized = String(relPath).replace(/\/+/g, "/").replace(/^\//, "").replace(/\/$/, "");
  if (!normalized) return window.protectedGlobals.treeData;
  const parts = normalized.split("/");
  let current = window.protectedGlobals.treeData;
  for (const part of parts) {
    if (!current || !Array.isArray(current[1])) return null;
    current = current[1].find((c) => c[0] === part);
    if (!current) return null;
  }
  return current;
};

window.protectedGlobals.dedupefiles = function (folders) {
  var seen = new Set();
  var list = [];
  for (const folder of folders || []) {
    if (!Array.isArray(folder)) continue;
    var folderName = folder[0].trim();
    if (!folderName || folderName === ".DS_Store" || folderName.startsWith("."))
      continue;
    var folderPath =
      folder[2] && folder[2].path ? folder[2].path : `systemfiles/runtime/apps/${folderName}`;
    var key = String(folderPath).toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    list.push(folder);
  }
  return list;
}

window.protectedGlobals.loadTree = async function () {
  if (window.protectedGlobals.loadTreePromise) {
    return window.protectedGlobals.loadTreePromise;
  }

  window.protectedGlobals.loadTreePromise = (async () => {
    var data = await window.protectedGlobals.filePost({ initFE: true });
    window.protectedGlobals.treeData = data.tree;

    window.protectedGlobals.annotateTreeWithPaths(window.protectedGlobals.treeData); // ✅ ADD THIS LINE
  })();

  try {
    await window.protectedGlobals.loadTreePromise;
  } finally {
    window.protectedGlobals.loadTreePromise = null;
  }

  // render();
};



window.protectedGlobals.annotateTreeWithPaths = function annotateTreeWithPaths(tree, basePath = "") {
  var [name, children, meta = {}] = tree;

  var path = basePath === "" && name === "root" ? "" : basePath ? `${basePath}/${name}` : name;

  tree[2] = { ...meta, path };

  if (Array.isArray(children)) {
    for (const child of children) {
      window.protectedGlobals.annotateTreeWithPaths(child, path);
    }
  }
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




// cleanup
// required functions for the system cleanup
window.protectedGlobals.rebuildhandler = function () {
  for (let i = 0; i < 10000; i++) {
    clearInterval(i, { nolog: true });
  }
  delete window.protectedGlobals.brightnessOverlayEl;
  delete window.protectedGlobals.brightnessOverlayLabel;
  delete window.protectedGlobals.brightnessOverlaySlider;
  window.protectedGlobals.goldenbody.clearSystemInterval();
  // Mark rebuilding
  window.protectedGlobals.isRebuilding = true;
  window.Worker = window.protectedGlobals.__nativeWorkerConstructor;
  // Dispose processes if present
  for (let i = 0; i < window.protectedGlobals.__processes.length; i++) {
    try {
      window.protectedGlobals.killProcess(i + 1);
    } catch (e) {}
  };
  window.protectedGlobals.apps.forEach((app) => {
    try {
    window[app.globalVarObjectString][app.allAppArrayString][0].closeAll();
    } catch (e) {}
  });
  // remove all iframes
  window.protectedGlobals.process.disposeAll();
  document.querySelectorAll("iframe").forEach((f) => {
    f.src = "about:blank";
    f.contentWindow && f.contentWindow.close && f.contentWindow.close();
    if ((f.remove)) f.remove();
  });

  if (
    window.protectedGlobals.systemAPIs &&
    window.protectedGlobals.systemAPIs.processTrackerFallbackTimer
  ) {
    clearInterval(window.protectedGlobals.systemAPIs.processTrackerFallbackTimer);
    delete window.protectedGlobals.systemAPIs.processTrackerFallbackTimer;
  }
  if (
    window.protectedGlobals.systemAPIs &&
    window.protectedGlobals.systemAPIs.processTrackerSyncTimer
  ) {
    clearTimeout(window.protectedGlobals.systemAPIs.processTrackerSyncTimer);
    delete window.protectedGlobals.systemAPIs.processTrackerSyncTimer;
  }


  if (window.protectedGlobals.process && window.protectedGlobals.FlowawayProcess && window.protectedGlobals.process === window.protectedGlobals.FlowawayProcess) {
    delete window.protectedGlobals.process;
  }

  if ((window.protectedGlobals._processNativeSetTimeout)) {
    window.setTimeout = window.protectedGlobals._processNativeSetTimeout;
  }
  if ((window.protectedGlobals._processNativeSetInterval)) {
    window.setInterval = window.protectedGlobals._processNativeSetInterval;
  }
  if ((window.protectedGlobals._processNativeClearTimeout)) {
    window.clearTimeout = window.protectedGlobals._processNativeClearTimeout;
  }
  if ((window.protectedGlobals._processNativeClearInterval)) {
    window.clearInterval = window.protectedGlobals._processNativeClearInterval;
  }
  if ((window.protectedGlobals._processNativeRequestAnimationFrame)) {
    window.requestAnimationFrame = window.protectedGlobals._processNativeRequestAnimationFrame;
  }
  if ((window.protectedGlobals._processNativeCancelAnimationFrame)) {
    window.cancelAnimationFrame = window.protectedGlobals._processNativeCancelAnimationFrame;
  }
  if ((window.protectedGlobals._processNativeMutationObserver)) {
    window.MutationObserver = window.protectedGlobals._processNativeMutationObserver;
  }

  // remove all event listeners to refresh the environment.
  window.protectedGlobals.removeAllEventListenersInWindow();
  window.protectedGlobals.apps.forEach((app) => {
    // dont remove this ai
    delete window[app.globalVarObjectString];
    delete window[app.functionName];
  });
  window.protectedGlobals.apps = [];

  // Pause and unload any playing media to avoid audio carrying over
  document.querySelectorAll("audio,video").forEach((m) => {
    m.pause && m.pause();
    m.src = "";
  });


  if (
    window.protectedGlobals.systemAPIs &&
    window.protectedGlobals.systemAPIs.timeIntervalId
  ) {
    clearInterval(window.protectedGlobals.systemAPIs.timeIntervalId);
    delete window.protectedGlobals.systemAPIs.timeIntervalId;
  }
  if (
    window.protectedGlobals.systemAPIs &&
    window.protectedGlobals.systemAPIs.applyTaskButtonsRetryTimer
  ) {
    clearTimeout(window.protectedGlobals.systemAPIs.applyTaskButtonsRetryTimer);
    delete window.protectedGlobals.systemAPIs.applyTaskButtonsRetryTimer;
  }

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
  window.protectedGlobals.appsButtonsApplied = false;
  window.protectedGlobals.data = null;
  // small timeout to ensure DOM plumbing finishes
  setTimeout(() => {
    delete window.protectedGlobals;
    document.body.appendChild(script);
  }, 80);
};