// ----------------- DYNAMIC AP LOADER -----------------
window.apps = window.apps || [];
window._flowawayMissingFolders = window._flowawayMissingFolders || new Set();

async function getFolderListing(relPath) {
  try {
    window._flowawayMissingFolders.delete(relPath);
    var r = await filePost({ requestFile: true, requestFileName: relPath });
    if (r && r.kind === "folder" && Array.isArray(r.files)) return r.files;
    if (
      r &&
      (r.missing ||
        r.code === "ENOENT" ||
        r.kind === "missing" ||
        r.error === "ENOENT")
    ) {
      window._flowawayMissingFolders.add(relPath);
      return null;
    }
  } catch (e) {
    console.error("getFolderListing error", e);
  }
  return null;
}

function normalizeAppFolders(folders) {
  var seen = new Set();
  var list = [];
  for (const folder of folders || []) {
    if (!Array.isArray(folder) || typeof folder[0] !== "string") continue;
    var folderName = folder[0].trim();
    if (!folderName || folderName === ".DS_Store" || folderName.startsWith("."))
      continue;
    var folderPath =
      folder[2] && folder[2].path ? folder[2].path : `apps/${folderName}`;
    var key = String(folderPath).toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    list.push(folder);
  }
  return list;
}

function getFlowawayAppLoaderRuntime() {
  var runtime = window.FlowawayAppLoader;
  if (!runtime || runtime.__loaded !== true) {
    flowawayCrash(
      "App loader runtime unavailable.",
      "systemfiles/appLoader.js was not loaded.",
    );
  }
  return runtime;
}

function isImageIconValue(value) {
  return !!getFlowawayAppLoaderRuntime().isImageIconValue(value);
}

function getIconMimeType(pathOrValue) {
  return getFlowawayAppLoaderRuntime().getIconMimeType(pathOrValue);
}

function toIconImageMarkupFromSource(iconSource) {
  return getFlowawayAppLoaderRuntime().toIconImageMarkupFromSource(iconSource);
}

function getPreferredAppIdentifier(app) {
  if (!app) return "";
  return app.functionname || app.id || app.icon || "";
}

function appMatchesIdentifier(app, identifier) {
  if (!app || !identifier) return false;
  var id = String(identifier).trim();
  if (!id) return false;
  var candidates = [app.functionname, app.id, app.icon]
    .filter((v) => typeof v !== "undefined" && v !== null)
    .map((v) => String(v).trim())
    .filter(Boolean);
  return candidates.includes(id);
}

function resolveLaunchContextRoot() {
  try {
    var launchContext = window.__flowawayLaunchContext;
    var launchAppId =
      launchContext && launchContext.appId
        ? String(launchContext.appId)
        : "";
    var roots = Array.from(document.querySelectorAll(".app-window-root"));
    if (launchAppId) {
      for (var i = roots.length - 1; i >= 0; i--) {
        var root = roots[i];
        if (!root || !root.dataset) continue;
        if (String(root.dataset.appId || "") === launchAppId) {
          return root;
        }
      }
    }
    return roots.length ? roots[roots.length - 1] : null;
  } catch (e) {
    return null;
  }
}

window.setAppDataTitle = function (targetOrTitle, maybeTitle) {
  var target = null;
  var title = "";

  if (
    targetOrTitle &&
    typeof targetOrTitle === "object" &&
    typeof targetOrTitle.setAttribute === "function"
  ) {
    target = targetOrTitle;
    title = String(maybeTitle || "").trim();
  } else {
    title = String(targetOrTitle || "").trim();
    target = resolveLaunchContextRoot();
  }

  if (!target || !title) return false;
  try {
    target.setAttribute("data-title", title);
    if (target.dataset) target.dataset.title = title;
    return true;
  } catch (e) {
    return false;
  }
};

window.setDataTitle = window.setAppDataTitle;

async function toIconImageMarkup(iconPathOrUrl, folderPath) {
  return getFlowawayAppLoaderRuntime().toIconImageMarkup(iconPathOrUrl, folderPath);
}

// Helper function to extract app data from an app folder
async function extractAppData(appFolder) {
  return getFlowawayAppLoaderRuntime().extractAppData(appFolder);
}
async function loadAppsFromTree() {
  if (loaded) return;
  loaded = true;
  window.apps = [];
  if (!window.treeData) await window.loadTree();
  try {
    var rootChildren = (window.treeData && window.treeData[1]) || [];
    var appsNode = rootChildren.find(
      (c) => c[0] === "apps" && Array.isArray(c[1]),
    );
    if (!appsNode) return;
    var appFolders = normalizeAppFolders(appsNode[1]);
    for (const appFolder of appFolders) {
      try {
        const appData = await extractAppData(appFolder);
        if (appData) window.apps.push(appData);
      } catch (e) {
        flowawayError("loadAppsFromTree", "Failed to parse app folder", e, {
          folder: appFolder && appFolder[0],
        });
      }
    }

    // Sort apps alphabetically by label
    window.apps.sort((a, b) => a.label.localeCompare(b.label));

    // render
    await renderAppsGrid();

     // reapply task buttons now that apps may be present
     applyTaskButtons();
    purgeButtons();
    setTimeout(() => {
      var appUpdatedEvent = new CustomEvent("appUpdated", { detail: null });
      window.dispatchEvent(appUpdatedEvent);
      setTimeout(() => {
        var appUpdatedEvent = new CustomEvent("appUpdated", { detail: null });
        window.dispatchEvent(appUpdatedEvent);
        setTimeout(() => {
          var appUpdatedEvent = new CustomEvent("appUpdated", { detail: null });
          window.dispatchEvent(appUpdatedEvent);
          setTimeout(() => {
            var appUpdatedEvent = new CustomEvent("appUpdated", {
              detail: null,
            });
            window.dispatchEvent(appUpdatedEvent);
          }, 5000);
        }, 5000);
      }, 5000);
    }, 5000);
    // Start polling for app changes
    startAppPolling();
  } catch (e) {
    flowawayError("loadAppsFromTree", "loadAppsFromTree failed", e);
  }
}

async function renderAppsGrid() {
  // Load config and render pinned apps
  if (!window._startMenuConfig) await loadStartMenuConfig();
  await renderPinnedAppsGrid();
  // Also load all app scripts
  if (!window.apps) return;
  for (const app of window.apps) {
    try {
      if (!app.icon) {
        if (!app.scriptLoaded && app.jsFile) {
          try {
            var b64NoIcon = await fetchFileContentByPath(
              `${app.path}/${app.jsFile}`,
            );
            var scriptTextNoIcon = base64ToUtf8(b64NoIcon);
            app._lastScriptHash = hashScriptContent(scriptTextNoIcon);
            try {
              var globalvarobjectstring = app.globalvarobjectstring;
              if (app.functionname && typeof window[app.functionname] !== "undefined") {
                try {
                  delete window[app.functionname];
                } catch (e) {}
              }
              if (
                app.cmf &&
                globalvarobjectstring &&
                window[globalvarobjectstring] &&
                !isProtectedAppGlobalName(app.cmf) &&
                typeof window[globalvarobjectstring][app.cmf] !== "undefined"
              ) {
                try {
                  delete window[globalvarobjectstring][app.cmf];
                } catch (e) {}
              }
            } catch (e) {}
            var beforeGlobalsNoIcon = new Set(
              Object.getOwnPropertyNames(window),
            );
            var sNoIcon = document.createElement("script");
            sNoIcon.type = "text/javascript";
            sNoIcon.textContent = scriptTextNoIcon;
            document.body.appendChild(sNoIcon);
            app.scriptLoaded = true;
            app._scriptElement = sNoIcon;
            try {
              app._addedGlobals = [];
              var captureAddedNoIcon = () => {
                try {
                  var afterNoIcon = Object.getOwnPropertyNames(window);
                  var newlyNoIcon = afterNoIcon.filter(
                    (k) =>
                      !beforeGlobalsNoIcon.has(k) &&
                      !(app._addedGlobals || []).includes(k),
                  );
                  if (newlyNoIcon.length)
                    app._addedGlobals = [
                      ...new Set([
                        ...(app._addedGlobals || []),
                        ...newlyNoIcon,
                      ]),
                    ];
                } catch (e) {}
              };
              captureAddedNoIcon();
              setTimeout(captureAddedNoIcon, 120);
              setTimeout(captureAddedNoIcon, 800);
              setTimeout(captureAddedNoIcon, 2500);
            } catch (e) {}
          } catch (e) {
            flowawayError(
              "renderAppsGrid",
              "Failed to load app script (no icon)",
              e,
              {                 appId: app && app.id,                 path: app && app.path               },
            );
          }
        }
        continue;
      }
      // Skip old rendering - handled by new renderPinnedAppsGrid/renderAllAppsGrid/renderRecentsGrid
      // Just load the app script
      if (!app.scriptLoaded && app.jsFile) {
        try {
          var b64 = await fetchFileContentByPath(`${app.path}/${app.jsFile}`);
          var scriptText = decodeFileTextStrict(
            b64,
            `${app.path}/${app.jsFile}`,
            { allowEmpty: true },
          );
          if (!String(scriptText || "").trim()) {
            flowawayError("renderAppsGrid", "App script is empty; skipping load", null, {
              appId: app && app.id,
              path: app && app.path,
              jsFile: app && app.jsFile,
            });
            continue;
          }
          // Store hash for future change detection
          app._lastScriptHash = hashScriptContent(scriptText);
          // Prefer removing globals created by previous script rather than deleting app metadata
          try {
            var globalvarobjectstring = app.globalvarobjectstring;
            if (app.functionname && typeof window[app.functionname] !== "undefined") {
              try {
                delete window[app.functionname];
              } catch (e) {}
            }
            if (
              app.cmf &&
              globalvarobjectstring &&
              window[globalvarobjectstring] &&
              !isProtectedAppGlobalName(app.cmf) &&
              typeof window[globalvarobjectstring][app.cmf] !== "undefined"
            ) {
              try {
                delete window[globalvarobjectstring][app.cmf];
              } catch (e) {}
            }
          } catch (e) {}
          // snapshot globals before injection
          var beforeGlobals = new Set(Object.getOwnPropertyNames(window));
          var s = document.createElement("script");
          s.type = "text/javascript";
          s.textContent = scriptText;
          document.body.appendChild(s);
          app.scriptLoaded = true;
          app._scriptElement = s;
          // record any globals the script introduced (best-effort)
          try {
            app._addedGlobals = [];
            var captureAdded = () => {
              try {
                var after = Object.getOwnPropertyNames(window);
                var newly = after.filter(
                  (k) =>
                    !beforeGlobals.has(k) &&
                    !(app._addedGlobals || []).includes(k),
                );
                if (newly.length)
                  app._addedGlobals = [
                    ...new Set([...(app._addedGlobals || []), ...newly]),
                  ];
              } catch (e) {}
            };
            // immediate capture and a few delayed captures to catch async initializers
            captureAdded();
            setTimeout(captureAdded, 120);
            setTimeout(captureAdded, 800);
            setTimeout(captureAdded, 2500);
          } catch (e) {}
        } catch (e) {
          flowawayCrash(
            "Failed to load app script.",
            `${app && app.path}/${app && app.jsFile}` + "\n" + String(e && (e.stack || e.message) || e),
          );
        }
      }
    } catch (e) {
      flowawayError("renderAppsGrid", "Failed while loading app", e, {
        appId: app && app.id,
        path: app && app.path,
      });
      continue;
    }
  }
}
async function launchApp(appId) {
  var app = (window.apps || []).find((a) => appMatchesIdentifier(a, appId));
  if (!app) {
    // fallback: try to call a global function named like the appId (or the id listed in entry)
    try {
      var globalFn = window[appId] || null;
      if (typeof globalFn === "function") return globalFn();
    } catch (e) {}
    flowawayError("launchApp", "App not found", null, { appId: appId });
    return;
  }

  if (!app.scriptLoaded && app.jsFile) {
    try {
      var b64 = await fetchFileContentByPath(`${app.path}/${app.jsFile}`);
      var scriptText = decodeFileTextStrict(
        b64,
        `${app.path}/${app.jsFile}`,
        { allowEmpty: true },
      );
      if (!String(scriptText || "").trim()) {
        flowawayError("launchApp", "App script is empty; nothing to execute", null, {
          appId: app && app.id,
          path: app && app.path,
          jsFile: app && app.jsFile,
        });
        return;
      }
      // Store hash for future change detection
      app._lastScriptHash = hashScriptContent(scriptText);
      // Remove any prior globals exposed by a previous version of this app
      try {
        var globalvarobjectstring = app.globalvarobjectstring;
        if (app.functionname && typeof window[app.functionname] !== "undefined") {
          try {
            delete window[app.functionname];
          } catch (e) {}
        }
        if (
          app.cmf &&
          globalvarobjectstring &&
          window[globalvarobjectstring] &&
          !isProtectedAppGlobalName(app.cmf) &&
          typeof window[globalvarobjectstring][app.cmf] !== "undefined"
        ) {
          try {
            delete window[globalvarobjectstring][app.cmf];
          } catch (e) {}
        }
      } catch (e) {}
      // snapshot globals before injection
      var beforeGlobals = new Set(Object.getOwnPropertyNames(window));
      var s = document.createElement("script");
      s.type = "text/javascript";
      s.textContent = scriptText;
      document.body.appendChild(s);
      app.scriptLoaded = true;
      app._scriptElement = s;
      // record any globals the script introduced (best-effort)
      try {
        app._addedGlobals = [];
        var captureAdded = () => {
          try {
            var after = Object.getOwnPropertyNames(window);
            var newly = after.filter(
              (k) =>
                !beforeGlobals.has(k) && !(app._addedGlobals || []).includes(k),
            );
            if (newly.length)
              app._addedGlobals = [
                ...new Set([...(app._addedGlobals || []), ...newly]),
              ];
          } catch (e) {}
        };
        captureAdded();
        setTimeout(captureAdded, 120);
        setTimeout(captureAdded, 800);
        setTimeout(captureAdded, 2500);
      } catch (e) {}
    } catch (e) {
      flowawayError("launchApp", "Failed to load app script", e, {
        appId: app && app.id,
        path: app && app.path,
      });
    }
  }

  try {
    window.__flowawayLaunchContext = {
      appId: getPreferredAppIdentifier(app),
      app: app,
      launchedAt: Date.now(),
    };
    if (app.functionname && typeof window[app.functionname] === "function") {
      window[app.functionname]();
    } else if (typeof window[app.id] === "function") {
      window[app.id]();
    } else {
      flowawayError("launchApp", "No callable entry function for app", null, {
        appId: app && app.id,
        functionname: app && app.functionname,
      });
      return;
    }
    // After the app varructs its UI, try to tag the new top-level window(s) with appId
    setTimeout(() => {
      try {
        var appIdentifier = getPreferredAppIdentifier(app);
        var appLabel = String(app.label || app.functionname || app.id || appIdentifier || "");
        var roots = Array.from(document.querySelectorAll(".app-window-root"));
        // find ones without app id yet
        var untagged = roots.filter((r) => !r.dataset || !r.dataset.appId);
        if (untagged.length) {
          // tag the most recently added
          var candidate = untagged[untagged.length - 1];
          candidate.dataset.appId = appIdentifier;
        }

        for (var i = 0; i < roots.length; i++) {
          var root = roots[i];
          if (!root || !root.dataset) continue;
          if (String(root.dataset.appId || "") !== String(appIdentifier || "")) continue;
          var currentTitle = String(root.getAttribute("data-title") || "").trim();
          if (!currentTitle && appLabel) {
            root.setAttribute("data-title", appLabel);
            root.dataset.title = appLabel;
          }
        }
      } catch (e) {}
    }, 40);
    return;
  } catch (e) {
    flowawayError("launchApp", "launchApp execution failed", e, {
      appId: app && app.id,
      functionname: app && app.functionname,
    });
  } finally {
    try {
      delete window.__flowawayLaunchContext;
    } catch (e) {}
  }
}

// ===== LIVE APP POLLING =====
function getFlowawayAppPollingRuntime() {
  var runtime = window.FlowawayAppPolling;
  if (!runtime || runtime.__loaded !== true) {
    flowawayCrash(
      "App polling runtime unavailable.",
      "systemfiles/appPolling.js was not loaded.",
    );
  }
  return runtime;
}

function queueAppPollingHint(msg) {
  return getFlowawayAppPollingRuntime().queueHint(msg);
}

function collectAppPollingHint() {
  return getFlowawayAppPollingRuntime().collectHint();
}

function refreshAppsUiAfterChanges() {
  return getFlowawayAppPollingRuntime().refreshAppsUiAfterChanges();
}

function scheduleAppPoll(reason = "unknown") {
  return getFlowawayAppPollingRuntime().schedulePoll(reason);
}

function startAppPollingViaWebSocket() {
  return getFlowawayAppPollingRuntime().startViaWebSocket();
}

async function pollAppChanges(forceMetadataCheck = false, targetFolders = null) {
  return getFlowawayAppPollingRuntime().pollAppChanges(forceMetadataCheck, targetFolders);
}

async function pollSpecificAppChanges(changedFolders = []) {
  return getFlowawayAppPollingRuntime().pollSpecificAppChanges(changedFolders);
}
// appUpdated - ensure single binding
try {
  if (window._flowaway_handlers.onAppUpdated)
    window.removeEventListener(
      "appUpdated",
      window._flowaway_handlers.onAppUpdated,
    );
  window._flowaway_handlers.onAppUpdated = (e) => {
    purgeButtons();
  };
  window.addEventListener("appUpdated", window._flowaway_handlers.onAppUpdated);
} catch (e) {}
function startAppPolling() {
  return getFlowawayAppPollingRuntime().start();
}

// Ensure loadAppsFromTree runs after initial tree load
var oldLoadTree = window.loadTree;
window.loadTree = async function () {
  await oldLoadTree();
  await loadAppsFromTree();
};
async function ensureFlowawayAppLoaderLoaded() {
  try {
    if (window.FlowawayAppLoader && window.FlowawayAppLoader.__loaded) {
      return true;
    }

    if (window.__flowawayAppLoaderSystemPromise) {
      try {
        await window.__flowawayAppLoaderSystemPromise;
      } catch (e) {}
      if (window.FlowawayAppLoader && window.FlowawayAppLoader.__loaded) {
        return true;
      }
      delete window.__flowawayAppLoaderSystemPromise;
    }

    window.__flowawayAppLoaderSystemPromise = (async function () {
      if (typeof fetchFileContentByPath === "function") {
        var b64Runtime = await fetchFileContentByPath("systemfiles/appLoader.js");
        var inlineText = decodeFileTextStrict(
          b64Runtime,
          "systemfiles/appLoader.js",
          { allowEmpty: false },
        );
        var inlineScript = document.createElement("script");
        inlineScript.type = "text/javascript";
        inlineScript.textContent = inlineText;
        document.body.appendChild(inlineScript);
        if (window.FlowawayAppLoader && window.FlowawayAppLoader.__loaded) {
          return true;
        }
      }

      await new Promise(function (resolve, reject) {
        try {
          var script = document.createElement("script");
          script.src = "systemfiles/appLoader.js";
          script.async = false;
          script.onload = function () {
            resolve(true);
          };
          script.onerror = function (err) {
            reject(err || new Error("Failed to load systemfiles/appLoader.js"));
          };
          document.body.appendChild(script);
        } catch (e) {
          reject(e);
        }
      });

      if (window.FlowawayAppLoader && window.FlowawayAppLoader.__loaded) {
        return true;
      }
      flowawayCrash(
        "App loader runtime failed to initialize.",
        "systemfiles/appLoader.js loaded but FlowawayAppLoader is unavailable.",
      );
    })();

    try {
      await window.__flowawayAppLoaderSystemPromise;
      return !!(window.FlowawayAppLoader && window.FlowawayAppLoader.__loaded);
    } catch (e) {
      delete window.__flowawayAppLoaderSystemPromise;
      flowawayCrash(
        "Failed to load app loader runtime.",
        String(e && (e.stack || e.message) || e),
      );
      return false;
    }
  } catch (e) {
    flowawayCrash(
      "Unexpected app loader runtime failure.",
      String(e && (e.stack || e.message) || e),
    );
    return false;
  }
}

async function ensureFlowawayAppPollingLoaded() {
  try {
    if (window.FlowawayAppPolling && window.FlowawayAppPolling.__loaded) {
      return true;
    }

    if (window.__flowawayAppPollingSystemPromise) {
      try {
        await window.__flowawayAppPollingSystemPromise;
      } catch (e) {}
      if (window.FlowawayAppPolling && window.FlowawayAppPolling.__loaded) {
        return true;
      }
      delete window.__flowawayAppPollingSystemPromise;
    }

    window.__flowawayAppPollingSystemPromise = (async function () {
      if (typeof fetchFileContentByPath === "function") {
        var b64Runtime = await fetchFileContentByPath("systemfiles/appPolling.js");
        var inlineText = decodeFileTextStrict(
          b64Runtime,
          "systemfiles/appPolling.js",
          { allowEmpty: false },
        );
        var inlineScript = document.createElement("script");
        inlineScript.type = "text/javascript";
        inlineScript.textContent = inlineText;
        document.body.appendChild(inlineScript);
        if (window.FlowawayAppPolling && window.FlowawayAppPolling.__loaded) {
          return true;
        }
      }

      await new Promise(function (resolve, reject) {
        try {
          var script = document.createElement("script");
          script.src = "systemfiles/appPolling.js";
          script.async = false;
          script.onload = function () {
            resolve(true);
          };
          script.onerror = function (err) {
            reject(err || new Error("Failed to load systemfiles/appPolling.js"));
          };
          document.body.appendChild(script);
        } catch (e) {
          reject(e);
        }
      });

      if (window.FlowawayAppPolling && window.FlowawayAppPolling.__loaded) {
        return true;
      }
      flowawayCrash(
        "App polling runtime failed to initialize.",
        "systemfiles/appPolling.js loaded but FlowawayAppPolling is unavailable.",
      );
    })();

    try {
      await window.__flowawayAppPollingSystemPromise;
      delete window.__flowawayAppPollingSystemFailed;
      return !!(window.FlowawayAppPolling && window.FlowawayAppPolling.__loaded);
    } catch (e) {
      window.__flowawayAppPollingSystemFailed = true;
      delete window.__flowawayAppPollingSystemPromise;
      flowawayCrash(
        "Failed to load app polling runtime.",
        String(e && (e.stack || e.message) || e),
      );
      return false;
    }
  } catch (e) {
    flowawayCrash(
      "Unexpected app polling runtime failure.",
      String(e && (e.stack || e.message) || e),
    );
    return false;
  }
}

async function ensureProcessRuntimeLoaded() {
  try {
    if (window.FlowawayProcess && window.FlowawayProcess.__loaded) {
      return true;
    }

    if (window.__flowawayProcessSystemPromise) {
      try {
        await window.__flowawayProcessSystemPromise;
      } catch (e) {}
      if (window.FlowawayProcess && window.FlowawayProcess.__loaded) {
        return true;
      }
      delete window.__flowawayProcessSystemPromise;
    }

    window.__flowawayProcessSystemPromise = (async function () {
      if (typeof fetchFileContentByPath === "function") {
        var b64ProcessRuntime = await fetchFileContentByPath("systemfiles/processes.js");
        var inlineProcessText = decodeFileTextStrict(
          b64ProcessRuntime,
          "systemfiles/processes.js",
          { allowEmpty: false },
        );
        var inlineProcessScript = document.createElement("script");
        inlineProcessScript.type = "text/javascript";
        inlineProcessScript.textContent = inlineProcessText;
        document.body.appendChild(inlineProcessScript);
        if (window.FlowawayProcess && window.FlowawayProcess.__loaded) {
          return true;
        }
      }

      await new Promise(function (resolve, reject) {
        try {
          var script = document.createElement("script");
          script.src = "systemfiles/processes.js";
          script.async = false;
          script.onload = function () {
            resolve(true);
          };
          script.onerror = function (err) {
            reject(err || new Error("Failed to load systemfiles/processes.js"));
          };
          document.body.appendChild(script);
        } catch (e) {
          reject(e);
        }
      });

      if (window.FlowawayProcess && window.FlowawayProcess.__loaded) {
        return true;
      }
      flowawayCrash(
        "Process runtime failed to initialize.",
        "systemfiles/processes.js loaded but FlowawayProcess is unavailable.",
      );
    })();

    try {
      await window.__flowawayProcessSystemPromise;
      delete window.__flowawayProcessSystemFailed;
      return !!(window.FlowawayProcess && window.FlowawayProcess.__loaded);
    } catch (e) {
      window.__flowawayProcessSystemFailed = true;
      delete window.__flowawayProcessSystemPromise;
      flowawayCrash(
        "Failed to load process runtime.",
        String(e && (e.stack || e.message) || e),
      );
      return false;
    }
  } catch (e) {
    flowawayCrash(
      "Unexpected process runtime loader failure.",
      String(e && (e.stack || e.message) || e),
    );
    return false;
  }
}

Promise.all([
  ensureFlowawayAppLoaderLoaded(),
  ensureFlowawayAppPollingLoaded(),
  ensureProcessRuntimeLoaded(),
])
  .finally(function () {
    if (typeof window.loadTree === "function") {
      window.loadTree();
    }
  });
window.onlyloadTree = oldLoadTree;
// ----------------- END dynamic app loader -----------------

var username = (  typeof data !== 'undefined' && data && typeof data.username === 'string')     ? data.username : '';

// fullscreen keyboard lock
// fullscreenchange - ensure single binding
try {
  if (window._flowaway_handlers.onFullscreenChange)
    document.removeEventListener(
      "fullscreenchange",
      window._flowaway_handlers.onFullscreenChange,
    );
  window._flowaway_handlers.onFullscreenChange = async () => {
    if (document.fullscreenElement) {
      if (navigator.keyboard && typeof navigator.keyboard.lock === "function") {
        try {
          await navigator.keyboard.lock(["Escape"]);
        } catch (e) {}
      }
    } else {
      if (
        navigator.keyboard &&
        typeof navigator.keyboard.unlock === "function"
      ) {
        try {
          navigator.keyboard.unlock();
        } catch (e) {}
      }
    }
  };
  document.addEventListener(
    "fullscreenchange",
    window._flowaway_handlers.onFullscreenChange,
  );
} catch (e) {}

window.removeOtherMenus = function (except) {
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

window.resolveAppFromEvent = function (evt, appOverride = null) {
  if (appOverride && typeof appOverride === "object") return appOverride;
  try {
    var appId =
      evt &&
      evt.target &&
      evt.target.closest &&
      evt.target.closest("[data-app-id], [data-appid]")
        ? evt.target.closest("[data-app-id], [data-appid]").dataset.appId ||
          evt.target.closest("[data-app-id], [data-appid]").dataset.appid
        : "";

    if (!appId && evt && evt.target && evt.target.closest) {
      var taskBtn = evt.target.closest("button.taskbutton");
      if (taskBtn) {
        appId =
          (taskBtn.dataset && taskBtn.dataset.appId) ||
          (taskBtn.value && String(taskBtn.value).trim()) ||
          "";
      }
    }

    if (!appId) return null;
    return       (window.apps || []).find((a) => appMatchesIdentifier(a, appId)) || null;
  } catch (e) {
    return null;
  }
};

window.getAppInstances = function (app) {
  if (!app || !app.globalvarobjectstring || !app.allapparraystring) return [];
  try {
    var appGlobalObj = window[app.globalvarobjectstring];
    if (!appGlobalObj || typeof appGlobalObj !== "object") return [];

    var keys = [];
    if (typeof app.allapparraystring === "string") {
      var oneKey = app.allapparraystring.trim();
      if (oneKey) keys.push(oneKey);
    } else if (Array.isArray(app.allapparraystring)) {
      for (var i = 0; i < app.allapparraystring.length; i++) {
        var key = typeof app.allapparraystring[i] === "string" ? app.allapparraystring[i].trim() : "";
        if (key && keys.indexOf(key) === -1) keys.push(key);
      }
    }

    for (var keyIndex = 0; keyIndex < keys.length; keyIndex++) {
      var list = appGlobalObj[keys[keyIndex]];
      if (Array.isArray(list)) return list;
    }

    return [];
  } catch (e) {
    return [];
  }
};

window.showUnifiedAppContextMenu = function (e,   appOverride = null,   needRemove = true) {
  if (!e) return;
  e.preventDefault();

  var app = window.resolveAppFromEvent(e, appOverride);
  if (!app) return;

  document.querySelectorAll(".app-menu").forEach((m) => m.remove());
  try {
    window._flowaway_handlers = window._flowaway_handlers || {};
    if (window._flowaway_handlers.onAppMenuOutsidePointerDown) {
      document.removeEventListener(
        "pointerdown",
        window._flowaway_handlers.onAppMenuOutsidePointerDown,
        true,
      );
      delete window._flowaway_handlers.onAppMenuOutsidePointerDown;
    }
    if (window._flowaway_handlers.onAppMenuEscapeKey) {
      document.removeEventListener(
        "keydown",
        window._flowaway_handlers.onAppMenuEscapeKey,
        true,
      );
      delete window._flowaway_handlers.onAppMenuEscapeKey;
    }
  } catch (err) {}

  const menu = document.createElement("div");
  try {
    removeOtherMenus(app.id || app.functionname || "");
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
  data.dark
    ? menu.classList.toggle("dark", true)
    : menu.classList.toggle("light", true);

  function withInstances(handler) {
    try {
      var instances = window.getAppInstances(app);
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
      instances.sort(        (a, b) => a.rootElement.style.zIndex - b.rootElement.style.zIndex      );
      for (const instance of instances) {
        if (instance && typeof instance.showWindow === "function") {
          instance.showWindow();
        } else if (instance && instance.rootElement) {
          instance.rootElement.style.display = "block";
          bringToFront(instance.rootElement);
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
        launchApp(getPreferredAppIdentifier(app));
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
        removeTaskButton(btn);
        try {
          saveTaskButtons();
          purgeButtons();
        } catch (err) {}
      }
      menu.remove();
    });
    menu.appendChild(remove);
  } else {
    const appId = getPreferredAppIdentifier(app);
    const existingBtn = document.querySelector(
      `button.taskbutton[data-app-id="${appId}"]`,
    );

    if (existingBtn) {
      const remove = document.createElement("div");
      remove.textContent = "Remove from taskbar";
      remove.style.padding = "6px 10px";
      remove.style.cursor = "pointer";
      remove.addEventListener("click", function () {
        removeTaskButton(existingBtn);
        try {
          saveTaskButtons();
          purgeButtons();
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
        const btn = addTaskButton(
          app.icon,
          () => launchApp(appId),
          "cmf",
          "",
          appId,
        );
        if (btn) btn.dataset.appId = appId;
        saveTaskButtons();
        purgeButtons();
        menu.remove();
      });
      menu.appendChild(add);
    }
  }

  const barrier = document.createElement("hr");
  menu.appendChild(barrier);

  const instances = window.getAppInstances(app);
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
            bringToFront(instance.rootElement);
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
      if (window._flowaway_handlers && window._flowaway_handlers.onAppMenuOutsidePointerDown) {
        document.removeEventListener(
          "pointerdown",
          window._flowaway_handlers.onAppMenuOutsidePointerDown,
          true,
        );
        delete window._flowaway_handlers.onAppMenuOutsidePointerDown;
      }
      if (window._flowaway_handlers && window._flowaway_handlers.onAppMenuEscapeKey) {
        document.removeEventListener(
          "keydown",
          window._flowaway_handlers.onAppMenuEscapeKey,
          true,
        );
        delete window._flowaway_handlers.onAppMenuEscapeKey;
      }
    } catch (err) {}
  }

  try {
    window._flowaway_handlers = window._flowaway_handlers || {};
    window._flowaway_handlers.onAppMenuOutsidePointerDown = function (evt) {
      if (!menu || !menu.isConnected) {
        closeMenu();
        return;
      }
      if (evt && evt.target && menu.contains(evt.target)) return;
      closeMenu();
    };
    window._flowaway_handlers.onAppMenuEscapeKey = function (evt) {
      if (!evt) return;
      if (evt.key === "Escape") closeMenu();
    };
    document.addEventListener(
      "pointerdown",
      window._flowaway_handlers.onAppMenuOutsidePointerDown,
      true,
    );
    document.addEventListener(
      "keydown",
      window._flowaway_handlers.onAppMenuEscapeKey,
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

window.cmf = function (e, appOverride = null) {
  window.showUnifiedAppContextMenu(e, appOverride, true);
};

window.cmfl1 = function (e, appOverride = null) {
  window.showUnifiedAppContextMenu(e, appOverride, false);
};

