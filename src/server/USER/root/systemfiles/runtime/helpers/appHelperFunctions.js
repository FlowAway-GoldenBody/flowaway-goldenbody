"use strict";
window.protectedGlobals.appMatchesIdentifier = function (app, identifier) {
  if (!app || !identifier) return false;
  var id = String(identifier).trim();
  if (!id) return false;
  var candidates = [app.id]
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


window.protectedGlobals.launchApp = async function (appId, args) {
  if (!window.protectedGlobals.appsButtonsApplied) {
    window.protectedGlobals.notification("Apps are still loading, please wait a moment and try again.");
    return;
  }
  var app = (window.protectedGlobals.apps || []).find((a) => window.protectedGlobals.appMatchesIdentifier(a, appId));
  if (!app) {
    throw new Error("App not found: " + String(appId));
  }
  window.protectedGlobals._launchContext = { appId: String(appId || ""), args: args === undefined ? [] : Array.isArray(args) ? args : [args] };
  var result = window[app.functionName](...window.protectedGlobals._launchContext.args);
  return result;
};

window.protectedGlobals.initAppRuntimeState = function (app) {
  var globalName = String(app.globalVarObjectString || "").trim();

  var appGlobalObj = window[globalName] || {};
  window[globalName] = appGlobalObj;
  window[globalName][app.allAppArrayString] = window[globalName][app.allAppArrayString] || [];
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
    // Load app folders in parallel to reduce startup latency. Preserve per-folder error handling.
    const loaders = (appFolders || []).map(async (appFolder) => {
      try {
        const appData = await window.protectedGlobals.extractAppData(appFolder);
        if (appData) {
          window.protectedGlobals.initAppRuntimeState(appData);
          return appData;
        }
      } catch (e) {
        try {
          window.protectedGlobals.throwError("loadAppsFromTree", "Failed to parse app folder", e, {
            folder: appFolder && appFolder[0],
          });
        } catch {}
      }
      return null;
    });

    const loadedApps = (await Promise.all(loaders)).filter(Boolean);
    if (loadedApps.length) {
      window.protectedGlobals.apps.push(...loadedApps);
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
    throw e;
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
    if (window.protectedGlobals.systemAPIs && window.protectedGlobals.systemAPIs.onResize)
      window.removeEventListener("resize", window.protectedGlobals.systemAPIs.onResize);
    window.protectedGlobals.systemAPIs = window.protectedGlobals.systemAPIs || {};
    window.protectedGlobals.systemAPIs.onResize = function () {
      document.querySelectorAll("[data-flow-control]").forEach((b) => {
        window.protectedGlobals._applyFlowawayControlSizing(b);
      });
    };
    window.addEventListener("resize", window.protectedGlobals.systemAPIs.onResize);
  }

  // finally apply sizing for this particular button
  window.protectedGlobals._applyFlowawayControlSizing(button);
};

window.protectedGlobals.setWindowMaximizeIcon = function (button, isMaximized) {
  window.protectedGlobals.applyWindowControlIcon(button, isMaximized ? "restore" : "maximize");
};

window.protectedGlobals.calculateVwInPixels = function(vwValue) {
  const viewportWidth = window.innerWidth; // Get the current viewport width in pixels
  const pixels = (vwValue * viewportWidth) / 100; // Apply the conversion formula
  return pixels;
}
window.protectedGlobals.removeOtherMenus = function (except) {
  // Remove any menus with the shared .app-menu class (used across apps)
  var menus = document.querySelectorAll(".app-menu");
  for (const m of menus) {
    if (except && m.dataset && m.dataset.appId === except) continue;
    if ((m.remove)) m.remove();
  }
};
window.protectedGlobals.showUnifiedAppContextMenu = function (e,   appOverride = null) {
  if (!e) return;
  e.preventDefault();

  var app = window.protectedGlobals.resolveAppFromEvent(e, appOverride);
  if (!app) return;

  document.querySelectorAll(".app-menu").forEach((m) => m.remove());
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

  const menu = document.createElement("div");
  window.protectedGlobals.removeOtherMenus(app.id || "");

  menu.className = "app-menu";
  if (app && app.id) menu.dataset.appId = String(app.id);
  Object.assign(menu.style, {
    position: "fixed",
    left: `${e.clientX}px`,
    top: `${e.clientY}px`,
    border: "1px solid #ccc",
    borderRadius: "4px",
    boxShadow: "0 2px 6px rgba(0,0,0,0.2)",
    zIndex: 100001, // maximum z-index to ensure it appears on top
    padding: "4px 0",
    minWidth: "160px",
    fontSize: "13px",
    visibility: "hidden",
  });
  (window.protectedGlobals.data.dark)
    ? menu.classList.toggle("dark", true)
    : menu.classList.toggle("light", true);

  function withInstances(handler) {
    var instances = window[app.globalVarObjectString][app.allAppArrayString];
    handler(instances);
    menu.remove();
  }

  const closeAll = document.createElement("div");
  closeAll.textContent = "Close all";
  closeAll.style.padding = "6px 10px";
  closeAll.style.cursor = "pointer";
  closeAll.addEventListener("click", () => {
    withInstances((instances) => {
      const first = instances[0];
      if (first && (first.closeAll)) {
        first.closeAll();
        return;
      }
      for (const instance of [...instances]) {
        if (instance && (instance.closeWindow)) {
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
      if (first && (first.hideAll)) {
        first.hideAll();
        return;
      }
      for (const instance of instances) {
        if (instance && (instance.hideWindow)) {
          instance.hideWindow();
        } else if (instance && instance.rootElement) {
          instance.rootElement.style.display = "none";
        }
      }
    });
    window.protectedGlobals.bringToFront(null);
  });
  menu.appendChild(hideAll);

  const showAll = document.createElement("div");
  showAll.textContent = "Show all";
  showAll.style.padding = "6px 10px";
  showAll.style.cursor = "pointer";
  showAll.addEventListener("click", () => {
    withInstances((instances) => {
      const first = instances[0];
      if (first && (first.showAll)) {
        first.showAll();
        return;
      }
      instances.sort((a, b) => {
        var az = Number(a && a.rootElement && a.rootElement.style && a.rootElement.style.zIndex) || 0;
        var bz = Number(b && b.rootElement && b.rootElement.style && b.rootElement.style.zIndex) || 0;
        return az - bz;
      });
      for (const instance of instances) {
        if (instance && (instance.showWindow)) {
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
      if (first && (first.newWindow)) {
        first.newWindow();
      } else {
        window.protectedGlobals.launchApp(app.id);
      }
    });
  });
  menu.appendChild(newWindow);

    const appId = app.id;
    const existingBtn = document.querySelector(
      `button.taskbutton[data-app-id="${appId}"]`,
    );

    if (existingBtn && existingBtn.dataset && existingBtn.dataset.pinned === "true") {
    const remove = document.createElement("div");
    remove.textContent = "Unpin from taskbar";
    remove.style.padding = "6px 10px";
    remove.style.cursor = "pointer";
    const contextMenuEvent = e;
    remove.addEventListener("click", () => {
      var btn =
        contextMenuEvent &&         contextMenuEvent.target &&         contextMenuEvent.target.closest
          ? contextMenuEvent.target.closest("button.taskbutton")
          : null;
      if (!btn) btn = window.protectedGlobals.taskbuttons.find((b) => b.dataset && b.dataset.appId === appId);
      if (btn) {
        btn.dataset.pinned = "false";
        if (window[app.globalVarObjectString][app.allAppArrayString].length === 0) {
          window.protectedGlobals.removeTaskButton(btn);
        }
        window.protectedGlobals.saveTaskButtons();
        window.protectedGlobals.purgeButtons();
      }
      menu.remove();
    });
    menu.appendChild(remove);
    } else {
    const add = document.createElement("div");
    add.textContent = "Pin to taskbar";
    add.style.padding = "6px 10px";
    add.style.cursor = "pointer";
    add.addEventListener("click", function () {
      // we only add a task button if the button dont exist, but we need to mark it pinned anyhow
      let taskbtnexist = false;
      let taskbuttons = window.protectedGlobals.taskbuttonsContainer.querySelectorAll("button");
      for (let btn of taskbuttons) {
        if (btn.dataset && btn.dataset.appId === appId) {
          taskbtnexist = true;
          btn.dataset.pinned = "true";
          break;
        }
      }
      if (!taskbtnexist) {
        let btn;
        if(app.cmf) {
        btn = window.protectedGlobals.addTaskButton(
          app.pngEnabled ? app.id : app.icon,
          () => window.protectedGlobals.launchApp(appId),
          window[app.globalVarObjectString][app.cmf],
          "",
          appId,
          false, true, false, { png: app.pngEnabled, pngContent: app.icon }
        );
        }
        else {
        btn = window.protectedGlobals.addTaskButton(
          app.pngEnabled ? app.id : app.icon,
          () => window.protectedGlobals.launchApp(appId),
          window.protectedGlobals.cmf,
          "",
          appId,
          false, true, false, { png: app.pngEnabled, pngContent: app.icon }
        );
      }
        if (btn) btn.dataset.appId = appId;
        window.protectedGlobals.saveTaskButtons();
        window.protectedGlobals.purgeButtons();
      }
        menu.remove();
    });
    menu.appendChild(add);
  }

  const barrier = document.createElement("hr");
  menu.appendChild(barrier);

  const instances = window[app.globalVarObjectString][app.allAppArrayString];
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
        if (instance && (instance.showWindow)) {
          instance.showWindow();
        } else if (instance && instance.rootElement) {
          instance.rootElement.style.display = "block";
          window.protectedGlobals.bringToFront(instance.rootElement);
        }
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
    nativeMenuRemove();
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
  }

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
  window.protectedGlobals.showUnifiedAppContextMenu(e, appOverride);
};

window.protectedGlobals.cmfl1 = function (e, appOverride = null) {
  window.protectedGlobals.showUnifiedAppContextMenu(e, appOverride);
};
