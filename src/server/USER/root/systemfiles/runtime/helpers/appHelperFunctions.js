window.protectedGlobals.appMatchesIdentifier = function (app, identifier) {
  if (!app || !identifier) return false;
  var id = String(identifier).trim();
  if (!id) return false;
  var candidates = [app.functionname, app.id, app.icon]
    .filter((v) => v !== null && v !== undefined)
    .map((v) => String(v).trim())
    .filter(Boolean);
  return candidates.includes(id);
};

window.protectedGlobals.resolveApptoolsContext = function (appId, rootElement) {
  var appIdStr = String(appId || "").trim();
  
  // Try to extract appId from rootElement if not provided
  if (!appIdStr && rootElement && rootElement.dataset) {
    appIdStr = String(rootElement.dataset.appId || "").trim();
  }
  
  var app = null;
  if (appIdStr) {
    app = (window.protectedGlobals.apps || []).find(function (candidate) {
      return window.protectedGlobals.appMatchesIdentifier(candidate, appIdStr);
    }) || null;
  }
  
  return {
    app: app,
    appId: appIdStr
  };
};


window.protectedGlobals.launchApp = async function (appId) {
  var app = (window.protectedGlobals.apps || []).find((a) => window.protectedGlobals.appMatchesIdentifier(a, appId));
  window[app.functionname]();
};

window.protectedGlobals.initAppRuntimeState = function (app) {
  var globalName = String(app.globalvarobjectstring || "").trim();

  var appGlobalObj = window[globalName] || {};
  window[globalName] = appGlobalObj;
  window[globalName][app.allapparraystring] = window[globalName][app.allapparraystring] || [];
  if (!Number.isFinite(Number(appGlobalObj.goldenbodyId))) {
    appGlobalObj.goldenbodyId = 0;
  } else {
    appGlobalObj.goldenbodyId = Number(appGlobalObj.goldenbodyId);
  }

  return appGlobalObj;
};

window.protectedGlobals.allocateAppGoldenbodyId = function (app) {
  var appGlobalObj = window.protectedGlobals.initAppRuntimeState(app);
  if (!appGlobalObj) return null;
  appGlobalObj.goldenbodyId = Number(appGlobalObj.goldenbodyId || 0) + 1;
  return appGlobalObj.goldenbodyId;
};



window.protectedGlobals.resolveLaunchContextRoot = function () {
  var launchContext = window.protectedGlobals._launchContext;
  var launchAppId = launchContext && launchContext.appId ? String(launchContext.appId) : "";
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
}
window.protectedGlobals.setAppDataTitle = function (targetOrTitle, maybeTitle) {
  var target = null;
  var title = "";

  if (targetOrTitle && targetOrTitle.setAttribute) {
    target = targetOrTitle;
    title = String(maybeTitle || "").trim();
  } else {
    title = String(targetOrTitle || "").trim();
    target = window.protectedGlobals.resolveLaunchContextRoot();
  }

  if (!target || !title) return false;
  target.setAttribute("data-title", title);
  if (target.dataset) target.dataset.title = title;
  return true;
};
window.protectedGlobals.loadAppsFromTree = async function () {
  if (window.protectedGlobals.loaded) return;
  window.protectedGlobals.loaded = true;
  window.protectedGlobals.apps = [];
  if (!window.protectedGlobals.treeData) await window.protectedGlobals.loadTree();
  try {
    var rootChildren = (window.protectedGlobals.treeData && window.protectedGlobals.treeData[1]) || [];
    var systemfilesNode = rootChildren.find(
      (c) => c[0] === "systemfiles" && Array.isArray(c[1]),
    );
    var runtimeNode =
      systemfilesNode && Array.isArray(systemfilesNode[1])
        ? systemfilesNode[1].find((c) => c[0] === "runtime" && Array.isArray(c[1]))
        : null;
    var appsNode =
      runtimeNode && Array.isArray(runtimeNode[1])
        ? runtimeNode[1].find((c) => c[0] === "apps" && Array.isArray(c[1]))
        : null;
    if (!appsNode) return;
    var appFolders = window.protectedGlobals.dedupefiles(appsNode[1]);
    for (const appFolder of appFolders) {
      try {
        const appData = await window.protectedGlobals.extractAppData(appFolder);
        if (appData) {
          window.protectedGlobals.initAppRuntimeState(appData);
          window.protectedGlobals.apps.push(appData);
        }
      } catch (e) {
        window.protectedGlobals.throwError("loadAppsFromTree", "Failed to parse app folder", e, {
          folder: appFolder && appFolder[0],
        });
      }
    }

    // Sort apps alphabetically by label
    window.protectedGlobals.apps.sort((a, b) => a.label.localeCompare(b.label));

    // render
    await window.protectedGlobals.renderAppsGrid();

     // reapply task buttons now that apps may be present
    window.protectedGlobals.applyTaskButtons();
      window.protectedGlobals.purgeButtons();
      var appUpdatedEvent = new CustomEvent("appUpdated", { detail: null });
      window.dispatchEvent(appUpdatedEvent);
  } catch (e) {
    window.protectedGlobals.throwError("loadAppsFromTree", "loadAppsFromTree failed", e);
  }
}



window.protectedGlobals.resolveAppFromEvent = function (evt, appOverride = null) {
  if (appOverride) return appOverride;
  try {
    var appNode = evt && evt.target && evt.target.closest
      ? evt.target.closest("[data-app-id], [data-appid]")
      : null;
    var appId =
      evt &&
      evt.target &&
      evt.target.closest &&
      appNode
        ? appNode.dataset.appId ||
          appNode.dataset.appid
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
    return (window.protectedGlobals.apps || []).find((a) => window.protectedGlobals.appMatchesIdentifier(a, appId)) || null;
  } catch (e) {
    return null;
  }
};
