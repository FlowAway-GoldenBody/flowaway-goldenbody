(function () {
  if (window.protectedGlobals.FlowawayAppPolling && window.protectedGlobals.FlowawayAppPolling.__loaded) return;
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

  function checkAppModified(existingApp, newAppData) {
    if (!existingApp || !newAppData) return false;
    var jsFileChanged = existingApp.jsFile !== newAppData.jsFile;
    var functionChanged = existingApp.functionname !== newAppData.functionname;
    var cmfChanged = existingApp.cmf !== newAppData.cmf;
    return (
      jsFileChanged ||
      functionChanged ||
      existingApp.id !== newAppData.id ||
      existingApp.icon !== newAppData.icon ||
      existingApp.label !== newAppData.label ||
      JSON.stringify(existingApp.allapparraystring || []) !== JSON.stringify(newAppData.allapparraystring || []) ||
      existingApp.globalvarobjectstring !== newAppData.globalvarobjectstring ||
      cmfChanged ||
      existingApp.cmfl1 !== newAppData.cmfl1 ||
      JSON.stringify(existingApp.openfilecapability || []) !== JSON.stringify(newAppData.openfilecapability || [])
    );
  }

  function normalizeFolderName(value) {
    var normalized = String(value || "").replace(/\\/g, "/").trim();
    if (!normalized || normalized.startsWith(".")) return "";
    var parts = normalized.split("/").filter(Boolean);
    if (!parts.length) return "";
    var appsIndex = parts.lastIndexOf("apps");
    var candidate = appsIndex >= 0 && parts[appsIndex + 1] ? parts[appsIndex + 1] : parts[0];
    if (!candidate || candidate.startsWith(".")) return "";
    return candidate;
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
    if ((window.protectedGlobals.renderAppsGrid)) window.protectedGlobals.renderAppsGrid();
    if ((window.protectedGlobals.applyTaskButtons)) window.protectedGlobals.applyTaskButtons();
    if ((window.protectedGlobals.purgeButtons)) window.protectedGlobals.purgeButtons();
    notifyAppUpdatedBurst();
  }

  async function reloadAppScript(existingApp, oldFunctionName, oldCmf) {
    if (!existingApp || !existingApp.jsFile) return false;
    var fetchFileContentByPath = window.protectedGlobals.fetchFileContentByPath;
    var decodeFileTextStrict = window.protectedGlobals.decodeFileTextStrict;
    var hashScriptContent = window.protectedGlobals.hashScriptContent;
    var isProtectedAppGlobalName = window.protectedGlobals.isProtectedAppGlobalName;

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
      if ((window.protectedGlobals.throwError)) {
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

    if (oldFunctionName && typeof window[oldFunctionName] !== "undefined") {
      delete window[oldFunctionName];
    }
    if (
      oldCmf &&
      (isProtectedAppGlobalName) &&
      !isProtectedAppGlobalName(oldCmf) &&
      typeof window[oldCmf] !== "undefined"
    ) {
      delete window[oldCmf];
    }
    if(existingApp.jsFile) {
    var s = document.createElement("script");
    s.type = "text/javascript";
    s.textContent = scriptText;
    new Function(scriptText);
    document.body.appendChild(s);
    } else {
      window.protectedGlobals.smh.initSMH(existingApp);
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
      var systemfilesNode = rootChildren.find(function (c) {
        return c[0] === "systemfiles" && Array.isArray(c[1]);
      });
      var runtimeNode =
        systemfilesNode && Array.isArray(systemfilesNode[1])
          ? systemfilesNode[1].find(function (c) { return c[0] === "runtime" && Array.isArray(c[1]); })
          : null;
      var appsNode =
        runtimeNode && Array.isArray(runtimeNode[1])
          ? runtimeNode[1].find(function (c) { return c[0] === "apps" && Array.isArray(c[1]); })
          : null;
      if (!appsNode) return;

      var currentAppFolders = window.protectedGlobals.dedupefiles(appsNode[1]);
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
            window.protectedGlobals.initAppRuntimeState(newAppData);
            window.protectedGlobals.apps.push(newAppData);
            window.protectedGlobals.apps.sort(function (a, b) { return a.label.localeCompare(b.label); });
            window.protectedGlobals.hasChanges = true;
          } catch (e) {
            if ((window.protectedGlobals.throwError)) {
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
            if (deletedApp.functionname && window[deletedApp.functionname]) {
              window[deletedApp.functionname] = null;
              delete window[deletedApp.functionname];
            }

            if (deletedApp._scriptElement) deletedApp._scriptElement.remove();
            window.protectedGlobals.apps.splice(appIndex, 1);

            var appElement =
              document.getElementById((deletedApp.functionname || deletedApp.id) + "app") ||
              document.getElementById(deletedApp.id + "app");
            if (appElement) appElement.remove();

            var taskbarBtn = Array.from((window.protectedGlobals.taskbar || document.getElementById("taskbar") || document.createElement("div")).querySelectorAll("button")).find(function (btn) {
              return (
                (btn.dataset && (window.protectedGlobals.appMatchesIdentifier) && window.protectedGlobals.appMatchesIdentifier(deletedApp, btn.dataset.appId)) ||
                btn.textContent.includes(deletedApp.label)
              );
            });
            if (taskbarBtn) taskbarBtn.remove();

            var appIdToMatch = deletedApp.functionname;
            var windowsToClose = Array.from(document.querySelectorAll(".app-window-root")).filter(function (root) {
              return root.dataset && root.dataset.appId === appIdToMatch;
            });
            for (var wi = 0; wi < windowsToClose.length; wi++) {
              windowsToClose[wi].remove();
            }

            window.protectedGlobals.hasChanges = true;
          } catch (e) {
            if ((window.protectedGlobals.throwError)) {
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
            window.protectedGlobals.initAppRuntimeState(existingApp2);

            var newAppData2 = await window.protectedGlobals.extractAppData(folder);
            if (!newAppData2) continue;

            var jsFileChanged = existingApp2.jsFile !== newAppData2.jsFile;
            var functionChanged = existingApp2.functionname !== newAppData2.functionname;
            var cmfChanged = existingApp2.cmf !== newAppData2.cmf;
            var appModified = checkAppModified(existingApp2, newAppData2);

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
            window.protectedGlobals.initAppRuntimeState(existingApp2);

            var appGridElement =
              document.getElementById((newAppData2.functionname || newAppData2.id) + "app") ||
              document.getElementById((oldFunctionTileId || oldId) + "app") ||
              document.getElementById(existingApp2.id + "app");
            if (appGridElement) {
              appGridElement.innerHTML = existingApp2.icon + '<br><span style="font-size:14px;">' + existingApp2.label + "</span>";
            }

            var scriptReloadRequired = jsFileChanged || functionChanged || cmfChanged;
            if (scriptReloadRequired && existingApp2.jsFile) {
              if (await reloadAppScript(existingApp2, oldFunctionName, oldCmf)) {
                scriptReloadedPaths.add(existingApp2.path);
              }
            }

            window.protectedGlobals.hasChanges = true;
          } catch (e) {
            if ((window.protectedGlobals.throwError)) {
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
            if ((window.protectedGlobals.throwError)) {
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
      if ((window.protectedGlobals.throwError)) {
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
          if (existingApp) {
            window.protectedGlobals.initAppRuntimeState(existingApp);
          }

          if (!existingApp) {
            var folderStillExists = null;
            folderStillExists = await window.protectedGlobals.getFilesFromFolder(expectedPath);
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
              if (existingApp.functionname) {
                delete window[existingApp.functionname];
              }
              if (
                existingApp.cmf &&
                (window.protectedGlobals.isProtectedAppGlobalName) &&
                !window.protectedGlobals.isProtectedAppGlobalName(existingApp.cmf)
              ) {
                delete window[existingApp.cmf];
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
                  (btn.dataset && (window.protectedGlobals.appMatchesIdentifier) && window.protectedGlobals.appMatchesIdentifier(existingApp, btn.dataset.appId)) ||
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
          var appModified = checkAppModified(existingApp, newAppData);

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
            window.protectedGlobals.initAppRuntimeState(existingApp);

            var appGridElement =
              document.getElementById((newAppData.functionname || newAppData.id) + "app") ||
              document.getElementById((oldFunctionTileId || oldId) + "app") ||
              document.getElementById(existingApp.id + "app");
            if (appGridElement) {
              appGridElement.innerHTML = existingApp.icon + '<br><span style="font-size:14px;">' + existingApp.label + "</span>";
            }

            var scriptReloadRequired = jsFileChanged || functionChanged || cmfChanged;
            if (scriptReloadRequired && existingApp.jsFile) {
              if (await reloadAppScript(existingApp, oldFunctionName, oldCmf)) {
                scriptReloadedPaths.add(existingApp.path);
                localHasChanges = true;
              }
            }

            localHasChanges = true;
          }

          if (!scriptReloadedPaths.has(existingApp.path) && existingApp.jsFile && existingApp._lastScriptHash) {
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
          }
        } catch (e) {
          if ((window.protectedGlobals.throwError)) {
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
      if ((window.protectedGlobals.throwError)) {
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
      state.socket.send(
        JSON.stringify({
          subscribeToAppChanges: true,
          username: username,
        }),
      );
    };

    state.socket.onmessage = function (ev) {
        var msg = JSON.parse(ev.data);
        if (!msg) return;
        if (!Array.isArray(msg.changedApps) || msg.changedApps.length === 0) return;
        queueHint(msg);
        schedulePoll();
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
  start();
  function stop() {
    if (state.timer) clearTimeout(state.timer);
    state.timer = null;
    state.inFlight = false;
    state.dirty = false;
    state.pendingFolders.clear();
    if (state.reconnectTimer) clearTimeout(state.reconnectTimer);
    state.reconnectTimer = null;
    if (state.socket) {
      state.socket.onmessage = null;
      state.socket.onerror = null;
      state.socket.onclose = null;
      state.socket.close();
    }
    state.socket = null;
    state.active = false;
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
