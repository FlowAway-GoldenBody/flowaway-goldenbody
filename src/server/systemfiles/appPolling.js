(function () {
  if (window.protectedGlobals.FlowawayAppPolling && window.protectedGlobals.FlowawayAppPolling.__loaded) return;
function normalizeAppFolders(folders) {
    var seen = new Set();
    var list = [];
    for (const folder of folders || []) {
        if (!Array.isArray(folder) || typeof folder[0] !== 'string') continue;
        var folderName = folder[0].trim();
        if (!folderName || folderName === '.DS_Store' || folderName.startsWith('.')) continue;
        var folderPath = folder[2] && folder[2].path ? folder[2].path : `systemfiles/runtime/apps/${folderName}`;
        var key = String(folderPath).toLowerCase();
        if (seen.has(key)) continue;
        seen.add(key);
        list.push(folder);
    }
    return list;
}
  var state = {
    active: false,
    socket: null,
    socketBackoff: 0,
    timer: null,
    inFlight: false,
    dirty: false,
    pendingFolders: new Set(),
    reconnectTimer: null,
    socketMaxBackoff: 60 * 1000,
    debounceMs: 1000,
  };

  function normalizeFolderName(value) {
    var normalized = String(value || "").trim();
    if (!normalized || normalized.startsWith(".")) return "";
    return normalized;
  }

  function queueHint(msg) {
    if (!msg || typeof msg !== "object") return;
    if (!Array.isArray(msg.changedApps)) return;
    for (var i = 0; i < msg.changedApps.length; i++) {
      var normalized = normalizeFolderName(msg.changedApps[i]);
      if (!normalized) continue;
      state.pendingFolders.add(normalized);
    }
  }

  function collectHint() {
    var changedApps = Array.from(state.pendingFolders);
    state.pendingFolders.clear();
    return { changedApps: changedApps };
  }

  function notifyAppUpdatedBurst() {
    setTimeout(function () {
      var appUpdatedEvent = new CustomEvent("appUpdated", { detail: null });
      window.dispatchEvent(appUpdatedEvent);
      setTimeout(function () {
        var ev2 = new CustomEvent("appUpdated", { detail: null });
        window.dispatchEvent(ev2);
        setTimeout(function () {
          var ev3 = new CustomEvent("appUpdated", { detail: null });
          window.dispatchEvent(ev3);
          setTimeout(function () {
            var ev4 = new CustomEvent("appUpdated", { detail: null });
            window.dispatchEvent(ev4);
          }, 5000);
        }, 5000);
      }, 5000);
    }, 5000);
  }

  function refreshAppsUiAfterChanges() {
    try {
      if (typeof window.protectedGlobals.loadAppsFromTree === "function") window.protectedGlobals.loadAppsFromTree();
    } catch (e) {
      if (typeof window.protectedGlobals.throwError === "function") {
        window.protectedGlobals.throwError("refreshAppsUiAfterChanges", "loadAppsFromTree failed", e);
      }
    }
    try {
      if (typeof window.protectedGlobals.renderAppsGrid === "function") window.protectedGlobals.renderAppsGrid();
    } catch (e) {
      if (typeof window.protectedGlobals.throwError === "function") {
        window.protectedGlobals.throwError("refreshAppsUiAfterChanges", "renderAppsGrid failed", e);
      }
    }
    try {
      if (typeof window.protectedGlobals.applyTaskButtons === "function") window.protectedGlobals.applyTaskButtons();
    } catch (e) {
      if (typeof window.protectedGlobals.throwError === "function") {
        window.protectedGlobals.throwError("refreshAppsUiAfterChanges", "applyTaskButtons failed", e);
      }
    }
    try {
      if (typeof window.protectedGlobals.purgeButtons === "function") window.protectedGlobals.purgeButtons();
    } catch (e) {
      if (typeof window.protectedGlobals.throwError === "function") {
        window.protectedGlobals.throwError("refreshAppsUiAfterChanges", "purgeButtons failed", e);
      }
    }
    notifyAppUpdatedBurst();
  }

  async function reloadAppScript(existingApp, oldFunctionName, oldCmf) {
    if (!existingApp || !existingApp.jsFile) return false;
    var fetchFileContentByPath = window.protectedGlobals.fetchFileContentByPath;
    var decodeFileTextStrict = window.protectedGlobals.decodeFileTextStrict;
    var hashScriptContent = window.protectedGlobals.hashScriptContent;
    var isProtectedAppGlobalName = window.protectedGlobals.isProtectedAppGlobalName;
    if (typeof fetchFileContentByPath !== "function") return false;
    if (typeof decodeFileTextStrict !== "function") return false;
    if (typeof hashScriptContent !== "function") return false;

    var b64 = await fetchFileContentByPath(existingApp.path + "/" + existingApp.jsFile);
    var scriptText = decodeFileTextStrict(b64, existingApp.path + "/" + existingApp.jsFile, {
      allowEmpty: true,
    });
    if (!String(scriptText || "").trim()) {
      if (existingApp.scriptLoaded && existingApp._scriptElement) {
        existingApp._scriptElement.remove();
        existingApp.scriptLoaded = false;
        existingApp._scriptElement = null;
      }
      if (typeof window.protectedGlobals.throwError === "function") {
        window.protectedGlobals.throwError("reloadAppScript", "App script is empty; unload only", null, {
          path: existingApp.path,
          jsFile: existingApp.jsFile,
        });
      }
      return false;
    }
    var currentHash = hashScriptContent(scriptText);

    if (existingApp.scriptLoaded && existingApp._scriptElement) {
      existingApp._scriptElement.remove();
      existingApp.scriptLoaded = false;
    }

    try {
      if (oldFunctionName && typeof window[oldFunctionName] !== "undefined") {
        try {
          delete window[oldFunctionName];
        } catch (e) {}
      }
      if (
        oldCmf &&
        typeof isProtectedAppGlobalName === "function" &&
        !isProtectedAppGlobalName(oldCmf) &&
        typeof window[oldCmf] !== "undefined"
      ) {
        try {
          delete window[oldCmf];
        } catch (e) {}
      }
    } catch (e) {}

    var s = document.createElement("script");
    s.type = "text/javascript";
    s.textContent = scriptText;
    try {
      new Function(scriptText);
    } catch (e) {
      if (typeof window.protectedGlobals.throwError === "function") {
        window.protectedGlobals.throwError("reloadAppScript", "Updated app script has invalid syntax", e, {
          path: existingApp.path,
          jsFile: existingApp.jsFile,
        });
      }
      return false;
    }
    try {
      document.body.appendChild(s);
    } catch (e) {
      if (typeof window.protectedGlobals.throwError === "function") {
        window.protectedGlobals.throwError("reloadAppScript", "Failed to apply updated app script", e, {
          path: existingApp.path,
          jsFile: existingApp.jsFile,
        });
      }
      return false;
    }
    existingApp.scriptLoaded = true;
    existingApp._scriptElement = s;
    existingApp._lastScriptHash = currentHash;
    return true;
  }

  async function pollAppChanges(forceMetadataCheck, targetFolders) {
    if (!window.protectedGlobals.treeData) return;

    try {
      var scriptReloadedPaths = new Set();
      var rootChildren = (window.protectedGlobals.treeData && window.protectedGlobals.treeData[1]) || [];
      var appsNode = rootChildren.find(function (c) {
        return c[0] === "apps" && Array.isArray(c[1]);
      });
      if (!appsNode) return;

      var currentAppFolders = normalizeAppFolders(appsNode[1]);
      var targetFolderSet =
        Array.isArray(targetFolders) && targetFolders.length
          ? new Set(targetFolders.map(function (v) { return String(v || "").trim(); }).filter(Boolean))
          : null;
      window.protectedGlobals.hasChanges = false;

      var currentFolderNames = new Set(currentAppFolders.map(function (f) { return f[0]; }));
      var knownFolderNames = new Set(
        (window.protectedGlobals.apps || []).map(function (a) {
          return String(a.path || "").split("/").pop();
        }),
      );

      var hasStructuralChanges =
        currentFolderNames.size !== knownFolderNames.size ||
        Array.from(currentFolderNames).some(function (name) {
          return !knownFolderNames.has(name);
        });

      if (hasStructuralChanges) {
        for (var ai = 0; ai < currentAppFolders.length; ai++) {
          var appFolder = currentAppFolders[ai];
          try {
            var folderName = appFolder[0];
            var expectedPath = appFolder[2] && appFolder[2].path ? appFolder[2].path : "systemfiles/runtime/apps/" + folderName;
            var existingApp = (window.protectedGlobals.apps || []).find(function (a) { return a.path === expectedPath; });
            if (existingApp) continue;

            var newAppData = await window.protectedGlobals.extractAppData(appFolder);
            if (!newAppData) continue;
            if (typeof window.protectedGlobals.ensureAppRuntimeState === "function") {
              window.protectedGlobals.ensureAppRuntimeState(newAppData);
            }
            window.protectedGlobals.apps.push(newAppData);
            window.protectedGlobals.apps.sort(function (a, b) { return a.label.localeCompare(b.label); });
              window.protectedGlobals.throwError("pollAppChanges", "New app detected", null, {
                label: newAppData.label,
                path: newAppData.path,
              });
            window.protectedGlobals.hasChanges = true;
          } catch (e) {
            if (typeof window.protectedGlobals.throwError === "function") {
              window.protectedGlobals.throwError("pollAppChanges", "Failed while handling new app folder", e, {
                folder: appFolder && appFolder[0],
              });
            }
          }
        }

        var appsToDelete = [];
        for (var i = 0; i < window.protectedGlobals.apps.length; i++) {
          var app = window.protectedGlobals.apps[i];
          var stillExists = currentAppFolders.some(function (f) {
            var expectedPath = f[2] && f[2].path ? f[2].path : "systemfiles/runtime/apps/" + f[0];
            return expectedPath === app.path;
          });
          if (!stillExists) appsToDelete.push(i);
        }

        for (var di = appsToDelete.length - 1; di >= 0; di--) {
          try {
            var appIndex = appsToDelete[di];
            var deletedApp = window.protectedGlobals.apps[appIndex];
            try {
              if (deletedApp.functionname && window[deletedApp.functionname]) {
                try {
                  window[deletedApp.functionname] = null;
                  delete window[deletedApp.functionname];
                } catch (e) {}
              }
            } catch (e) {}

            if (deletedApp._scriptElement) deletedApp._scriptElement.remove();
            window.protectedGlobals.apps.splice(appIndex, 1);

            var appElement =
              document.getElementById((deletedApp.functionname || deletedApp.id) + "app") ||
              document.getElementById(deletedApp.id + "app");
            if (appElement) appElement.remove();

            try {
              var taskbarBtn = Array.from((window.protectedGlobals.taskbar || document.getElementById("taskbar") || document.createElement("div")).querySelectorAll("button")).find(function (btn) {
                return (
                  (btn.dataset && typeof window.protectedGlobals.appMatchesIdentifier === "function" && window.protectedGlobals.appMatchesIdentifier(deletedApp, btn.dataset.appId)) ||
                  btn.textContent.includes(deletedApp.label)
                );
              });
              if (taskbarBtn) taskbarBtn.remove();
            } catch (e) {}

            var appIdToMatch = deletedApp.functionname;
            var windowsToClose = Array.from(document.querySelectorAll(".app-window-root")).filter(function (root) {
              return root.dataset && root.dataset.appId === appIdToMatch;
            });
            for (var wi = 0; wi < windowsToClose.length; wi++) {
              windowsToClose[wi].remove();
            }

            window.protectedGlobals.hasChanges = true;
          } catch (e) {
            if (typeof window.protectedGlobals.throwError === "function") {
              window.protectedGlobals.throwError("pollAppChanges", "Failed while deleting app", e, { index: di });
            }
          }
        }
      }

      if (forceMetadataCheck) {
        var foldersForMetadata = targetFolderSet
          ? currentAppFolders.filter(function (f) {
              return targetFolderSet.has(String(f[0] || "").trim());
            })
          : currentAppFolders;

        for (var mi = 0; mi < foldersForMetadata.length; mi++) {
          var folder = foldersForMetadata[mi];
          try {
            var folderName2 = folder[0];
            var expectedPath2 = folder[2] && folder[2].path ? folder[2].path : "systemfiles/runtime/apps/" + folderName2;
            var existingApp2 = (window.protectedGlobals.apps || []).find(function (a) { return a.path === expectedPath2; });
            if (!existingApp2) continue;
            if (typeof window.protectedGlobals.ensureAppRuntimeState === "function") {
              window.protectedGlobals.ensureAppRuntimeState(existingApp2);
            }

            var newAppData2 = await window.protectedGlobals.extractAppData(folder);
            if (!newAppData2) continue;

            var jsFileChanged = existingApp2.jsFile !== newAppData2.jsFile;
            var functionChanged = existingApp2.functionname !== newAppData2.functionname;
            var cmfChanged = existingApp2.cmf !== newAppData2.cmf;
            var appModified =
              jsFileChanged ||
              functionChanged ||
              existingApp2.id !== newAppData2.id ||
              existingApp2.icon !== newAppData2.icon ||
              existingApp2.label !== newAppData2.label ||
              JSON.stringify(existingApp2.allapparraystring || []) !== JSON.stringify(newAppData2.allapparraystring || []) ||
              existingApp2.globalvarobjectstring !== newAppData2.globalvarobjectstring ||
              cmfChanged ||
              existingApp2.cmfl1 !== newAppData2.cmfl1 ||
              JSON.stringify(existingApp2.openfilecapability || []) !== JSON.stringify(newAppData2.openfilecapability || []);

            if (!appModified) continue;

            var oldFunctionName = existingApp2.functionname;
            var oldCmf = existingApp2.cmf;
            var oldId = existingApp2.id;
            var oldFunctionTileId = existingApp2.functionname;

            existingApp2.functionname = newAppData2.functionname;
            existingApp2.jsFile = newAppData2.jsFile;
            existingApp2.icon = newAppData2.icon;
            existingApp2.label = newAppData2.label;
            existingApp2.id = newAppData2.id;
            existingApp2.globalvarobjectstring = newAppData2.globalvarobjectstring;
            existingApp2.allapparraystring = newAppData2.allapparraystring;
            existingApp2.cmf = newAppData2.cmf;
            existingApp2.cmfl1 = newAppData2.cmfl1;
            existingApp2.openfilecapability = newAppData2.openfilecapability;
            if (typeof window.protectedGlobals.ensureAppRuntimeState === "function") {
              window.protectedGlobals.ensureAppRuntimeState(existingApp2);
            }

            var appGridElement =
              document.getElementById((newAppData2.functionname || newAppData2.id) + "app") ||
              document.getElementById((oldFunctionTileId || oldId) + "app") ||
              document.getElementById(existingApp2.id + "app");
            if (appGridElement) {
              appGridElement.innerHTML = existingApp2.icon + '<br><span style="font-size:14px;">' + existingApp2.label + "</span>";
            }

            var scriptReloadRequired = jsFileChanged || functionChanged || cmfChanged;
            if (scriptReloadRequired && existingApp2.jsFile) {
              try {
                if (await reloadAppScript(existingApp2, oldFunctionName, oldCmf)) {
                  scriptReloadedPaths.add(existingApp2.path);
                }
              } catch (e) {
                console.error("[APP POLLING] Failed to reload script for " + existingApp2.label + ":", e);
              }
            }

            window.protectedGlobals.hasChanges = true;
          } catch (e) {
            if (typeof window.protectedGlobals.throwError === "function") {
              window.protectedGlobals.throwError("pollAppChanges", "Failed while refreshing app metadata", e, {
                folder: folder && folder[0],
              });
            }
          }
        }
      }

      if (forceMetadataCheck) {
        var appsForScriptCheck = targetFolderSet
          ? (window.protectedGlobals.apps || []).filter(function (a) {
              return targetFolderSet.has(String((a.path || "").split("/").pop() || "").trim());
            })
          : (window.protectedGlobals.apps || []);

        for (var si = 0; si < appsForScriptCheck.length; si++) {
          var appToCheck = appsForScriptCheck[si];
          try {
            if (scriptReloadedPaths.has(appToCheck.path)) continue;
            if (!appToCheck.jsFile || !appToCheck._lastScriptHash) continue;

            var b64Current = await window.protectedGlobals.fetchFileContentByPath(appToCheck.path + "/" + appToCheck.jsFile);
            var scriptTextCurrent = window.protectedGlobals.decodeFileTextStrict(
              b64Current,
              appToCheck.path + "/" + appToCheck.jsFile,
              { allowEmpty: false },
            );
            var currentHashNow = window.protectedGlobals.hashScriptContent(scriptTextCurrent);
            if (currentHashNow === appToCheck._lastScriptHash) continue;

            if (appToCheck.scriptLoaded && appToCheck._scriptElement) {
              appToCheck._scriptElement.remove();
              appToCheck.scriptLoaded = false;
            }

            if (await reloadAppScript(appToCheck, appToCheck.functionname, appToCheck.cmf)) {
              appToCheck._lastScriptHash = currentHashNow;
              window.protectedGlobals.hasChanges = true;
            }
          } catch (e) {
            if (typeof window.protectedGlobals.throwError === "function") {
              window.protectedGlobals.throwError("pollAppChanges", "Failed to check script hash", e, {
                appId: appToCheck && appToCheck.id,
                label: appToCheck && appToCheck.label,
              });
            }
          }
        }
      }

      if (window.protectedGlobals.hasChanges && window.protectedGlobals.data) {
        refreshAppsUiAfterChanges();
      }
    } catch (e) {
      if (typeof window.protectedGlobals.throwError === "function") {
        window.protectedGlobals.throwError("pollAppChanges", "Error during polling", e);
      }
    }
  }

  async function pollSpecificAppChanges(changedFolders) {
    if (!Array.isArray(changedFolders) || !changedFolders.length) return;
    
    try {
      var folderNames = Array.from(
        new Set(changedFolders.map(function (v) { return String(v || "").trim(); }).filter(Boolean)),
      );
      var localHasChanges = false;
      var shouldFallback = false;
      var scriptReloadedPaths = new Set();

      for (var fi = 0; fi < folderNames.length; fi++) {
        var folderName = folderNames[fi];
        try {
          var expectedPath = "systemfiles/runtime/apps/" + folderName;
          var existingApp = (window.protectedGlobals.apps || []).find(function (a) {
            return a.path === expectedPath || String(a.path || "").split("/").pop() === folderName;
          });
          if (existingApp && typeof window.protectedGlobals.ensureAppRuntimeState === "function") {
            window.protectedGlobals.ensureAppRuntimeState(existingApp);
          }

          if (!existingApp) {
            var folderStillExists = null;
            try {
              folderStillExists = await window.protectedGlobals.getFilesFromFolder(expectedPath);
            } catch (e) {
              folderStillExists = null;
            }
            if (Array.isArray(folderStillExists)) {
              shouldFallback = true;
            }
            continue;
          }

          var appFolder = [folderName, [], { path: existingApp.path || expectedPath }];
          var newAppData = null;
          try {
            newAppData = await window.protectedGlobals.extractAppData(appFolder);
          } catch (e) {
            var isEnoent = !!(e && (e.code === "ENOENT" || String(e.message || "").includes("ENOENT")));
            if (!isEnoent) throw e;

            try {
              if (existingApp._scriptElement) existingApp._scriptElement.remove();
            } catch (ee) {}
            try {
              if (existingApp.functionname && typeof window[existingApp.functionname] !== "undefined") {
                try {
                  delete window[existingApp.functionname];
                } catch (ee) {}
              }
              if (
                existingApp.cmf &&
                typeof window.protectedGlobals.isProtectedAppGlobalName === "function" &&
                !window.protectedGlobals.isProtectedAppGlobalName(existingApp.cmf) &&
                typeof window[existingApp.cmf] !== "undefined"
              ) {
                try {
                  delete window[existingApp.cmf];
                } catch (ee) {}
              }
            } catch (ee) {}

            var appIndexToDelete = (window.protectedGlobals.apps || []).findIndex(function (a) {
              return a === existingApp || String(a.path || "").split("/").pop() === folderName;
            });
            if (appIndexToDelete >= 0) window.protectedGlobals.apps.splice(appIndexToDelete, 1);

            try {
              var appElementToDelete =
                document.getElementById((existingApp.functionname || existingApp.id) + "app") ||
                document.getElementById(existingApp.id + "app");
              if (appElementToDelete) appElementToDelete.remove();
            } catch (ee) {}

            try {
              var taskbarBtnToDelete = Array.from((window.protectedGlobals.taskbar || document.getElementById("taskbar") || document.createElement("div")).querySelectorAll("button")).find(function (btn) {
                return (
                  (btn.dataset && typeof window.protectedGlobals.appMatchesIdentifier === "function" && window.protectedGlobals.appMatchesIdentifier(existingApp, btn.dataset.appId)) ||
                  btn.textContent.includes(existingApp.label)
                );
              });
              if (taskbarBtnToDelete) taskbarBtnToDelete.remove();
            } catch (ee) {}

            try {
              var appIdToClose = existingApp.functionname;
              var windowsToClose = Array.from(document.querySelectorAll(".app-window-root")).filter(function (root) {
                return root.dataset && root.dataset.appId === appIdToClose;
              });
              for (var wi = 0; wi < windowsToClose.length; wi++) {
                windowsToClose[wi].remove();
              }
            } catch (ee) {}

            localHasChanges = true;
            continue;
          }

          if (!newAppData) continue;

          var jsFileChanged = existingApp.jsFile !== newAppData.jsFile;
          var functionChanged = existingApp.functionname !== newAppData.functionname;
          var cmfChanged = existingApp.cmf !== newAppData.cmf;
          var appModified =
            jsFileChanged ||
            functionChanged ||
            existingApp.id !== newAppData.id ||
            existingApp.icon !== newAppData.icon ||
            existingApp.label !== newAppData.label ||
            JSON.stringify(existingApp.allapparraystring || []) !== JSON.stringify(newAppData.allapparraystring || []) ||
            existingApp.globalvarobjectstring !== newAppData.globalvarobjectstring ||
            cmfChanged ||
            existingApp.cmfl1 !== newAppData.cmfl1 ||
            JSON.stringify(existingApp.openfilecapability || []) !== JSON.stringify(newAppData.openfilecapability || []);

          if (appModified) {
            var oldFunctionName = existingApp.functionname;
            var oldCmf = existingApp.cmf;
            var oldId = existingApp.id;
            var oldFunctionTileId = existingApp.functionname;

            existingApp.functionname = newAppData.functionname;
            existingApp.jsFile = newAppData.jsFile;
            existingApp.icon = newAppData.icon;
            existingApp.label = newAppData.label;
            existingApp.id = newAppData.id;
            existingApp.globalvarobjectstring = newAppData.globalvarobjectstring;
            existingApp.allapparraystring = newAppData.allapparraystring;
            existingApp.cmf = newAppData.cmf;
            existingApp.cmfl1 = newAppData.cmfl1;
            existingApp.openfilecapability = newAppData.openfilecapability;
            if (typeof window.protectedGlobals.ensureAppRuntimeState === "function") {
              window.protectedGlobals.ensureAppRuntimeState(existingApp);
            }

            var appGridElement =
              document.getElementById((newAppData.functionname || newAppData.id) + "app") ||
              document.getElementById((oldFunctionTileId || oldId) + "app") ||
              document.getElementById(existingApp.id + "app");
            if (appGridElement) {
              appGridElement.innerHTML = existingApp.icon + '<br><span style="font-size:14px;">' + existingApp.label + "</span>";
            }

            var scriptReloadRequired = jsFileChanged || functionChanged || cmfChanged;
            if (scriptReloadRequired && existingApp.jsFile) {
              try {
                if (await reloadAppScript(existingApp, oldFunctionName, oldCmf)) {
                  scriptReloadedPaths.add(existingApp.path);
                  localHasChanges = true;
                }
              } catch (e) {
                console.error("[APP POLLING] Failed to reload script for " + existingApp.label + ":", e);
              }
            }

            localHasChanges = true;
          }

          if (!scriptReloadedPaths.has(existingApp.path) && existingApp.jsFile && existingApp._lastScriptHash) {
            try {
              var b64Current = await window.protectedGlobals.fetchFileContentByPath(existingApp.path + "/" + existingApp.jsFile);
              var scriptTextCurrent = window.protectedGlobals.decodeFileTextStrict(
                b64Current,
                existingApp.path + "/" + existingApp.jsFile,
                { allowEmpty: false },
              );
              var currentHashNow = window.protectedGlobals.hashScriptContent(scriptTextCurrent);
              if (currentHashNow !== existingApp._lastScriptHash) {
                if (await reloadAppScript(existingApp, existingApp.functionname, existingApp.cmf)) {
                  existingApp._lastScriptHash = currentHashNow;
                  localHasChanges = true;
                }
              }
            } catch (e) {
              if (typeof window.protectedGlobals.throwError === "function") {
                window.protectedGlobals.throwError("pollSpecificAppChanges", "Failed to check script hash", e, {
                  folder: folderName,
                  appId: existingApp && existingApp.id,
                });
              }
            }
          }
        } catch (e) {
          if (typeof window.protectedGlobals.throwError === "function") {
            window.protectedGlobals.throwError("pollSpecificAppChanges", "Failed while processing changed app folder", e, {
              folder: folderName,
            });
          }
        }
      }

      if (shouldFallback) {
        await window.protectedGlobals.loadTree();
        await pollAppChanges(true, folderNames);
        return;
      }

      if (localHasChanges && window.protectedGlobals.data) {
        refreshAppsUiAfterChanges();
      }
    } catch (e) {
      if (typeof window.protectedGlobals.throwError === "function") {
        window.protectedGlobals.throwError("pollSpecificAppChanges", "Targeted poll failed, falling back to full poll", e);
      }
      await window.protectedGlobals.loadTree();
      await pollAppChanges(true, changedFolders);
    }
  }

  function schedulePoll() {
    clearTimeout(state.timer);
    state.timer = setTimeout(async function () {
      if (state.inFlight) {
        state.dirty = true;
        return;
      }
      state.inFlight = true;
      try {
        var hint = collectHint();
        if (!hint.changedApps.length) return;
        await pollSpecificAppChanges(hint.changedApps);
      } catch (e) {
        console.error("[APP POLLING] Scheduled poll error:", e);
      } finally {
        state.inFlight = false;
        if (state.dirty) {
          state.dirty = false;
          schedulePoll();
        }
      }
    }, state.debounceMs);
  }

  function startViaWebSocket() {
    if (typeof WebSocket === "undefined") return false;
    if (
      state.socket &&
      (state.socket.readyState === WebSocket.OPEN || state.socket.readyState === WebSocket.CONNECTING)
    ) {
      return true;
    }

    var base = String(window.protectedGlobals.BASE || "");
    var username = (window.protectedGlobals.data && window.protectedGlobals.data.username) || "";
    var appPollingURL = base + "/server/appSocket";
    state.socket = new WebSocket(appPollingURL);

    state.socket.onopen = function () {
      state.socketBackoff = 0;
      if (state.reconnectTimer) {
        clearTimeout(state.reconnectTimer);
        state.reconnectTimer = null;
      }
      try {
        state.socket.send(
          JSON.stringify({
            subscribeToAppChanges: true,
            username: username,
          }),
        );
      } catch (e) {}
    };

    state.socket.onmessage = function (ev) {
      try {
        var msg = JSON.parse(ev.data);
        if (!msg || !msg.appChanges) return;
        if (!Array.isArray(msg.changedApps) || msg.changedApps.length === 0) return;
        queueHint(msg);
        schedulePoll();
      } catch (e) {
        console.error("[APP POLLING] Error parsing WebSocket message:", e);
      }
    };

    state.socket.onerror = function (err) {
      console.warn("[APP POLLING] WebSocket error", err);
    };

    state.socket.onclose = function () {
      state.socket = null;
      if (state.socketBackoff < 10) state.socketBackoff++;
      var delay = Math.min(state.socketBackoff * 1000, state.socketMaxBackoff);
      if (state.reconnectTimer) clearTimeout(state.reconnectTimer);
      state.reconnectTimer = setTimeout(function () {
        state.reconnectTimer = null;
        startViaWebSocket();
      }, delay);
    };

    return true;
  }

  function start() {
    if (state.active) return;
    state.active = true;
    var wsStarted = startViaWebSocket();
    if (!wsStarted) {
      console.log("[APP POLLING] WebSocket unavailable; no fallback polling");
      return;
    }
    console.log("[APP POLLING] WebSocket polling enabled");
  }

  function stop() {
    try {
      if (state.timer) clearTimeout(state.timer);
      state.timer = null;
      state.inFlight = false;
      state.dirty = false;
      state.pendingFolders.clear();
      if (state.reconnectTimer) clearTimeout(state.reconnectTimer);
      state.reconnectTimer = null;
      if (state.socket) {
        try {
          state.socket.onmessage = null;
          state.socket.onerror = null;
          state.socket.onclose = null;
          state.socket.close();
        } catch (e) {}
      }
      state.socket = null;
      state.active = false;
    } catch (e) {}
  }

  window.protectedGlobals.FlowawayAppPolling = {
    __loaded: true,
    state: state,
    queueHint: queueHint,
    collectHint: collectHint,
    schedulePoll: schedulePoll,
    startViaWebSocket: startViaWebSocket,
    pollAppChanges: pollAppChanges,
    pollSpecificAppChanges: pollSpecificAppChanges,
    refreshAppsUiAfterChanges: refreshAppsUiAfterChanges,
    start: start,
    stop: stop,
  };
})();
