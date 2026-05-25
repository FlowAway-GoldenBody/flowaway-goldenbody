// required functions for the system cleanup
window.protectedGlobals.rebuildhandler = function () {
  for (let i = 0; i < 10000; i++) {
    clearInterval(i);
    clearTimeout(i);
  }

  // Mark rebuilding
  window.protectedGlobals.isRebuilding = true;

  // Dispose processes if present
  if (
    window.protectedGlobals.FlowawayProcess &&
    (window.protectedGlobals.FlowawayProcess.disposeAll)
  ) {
    window.protectedGlobals.FlowawayProcess.disposeAll("rebuild");
  }
  window.protectedGlobals.apps.forEach((app) => {
    try {
    window[app.globalvarobjectstring][app.allapparraystring][0].closeAll();
    } catch (e) {
      console.error("Error closing app during rebuild:", e);
    }
  });
  // remove all iframes
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

  if (
    window.protectedGlobals.FlowawayAppPolling &&
    (window.protectedGlobals.FlowawayAppPolling.stop)
  ) {
    window.protectedGlobals.FlowawayAppPolling.stop();
  }

  if (window.protectedGlobals.process && window.protectedGlobals.FlowawayProcess && window.protectedGlobals.process === window.protectedGlobals.FlowawayProcess) {
    delete window.protectedGlobals.process;
  }

  delete window.protectedGlobals.FlowawayProcess;
  delete window.protectedGlobals.__processRuntime;
  delete window.protectedGlobals.__processes;
  delete window.protectedGlobals.__processRegistry;
  delete window.protectedGlobals.__processObjectsByPid;
  delete window.protectedGlobals.__dynamicProcesses;
  delete window.protectedGlobals.__taskManagerSnapshot;
  delete window.protectedGlobals.__taskProcessCounter;
  delete window.protectedGlobals.__taskProcessIdByIdentity;
  delete window.protectedGlobals.__taskProcessObjectIdentity;
  delete window.protectedGlobals.__taskProcessObjectIdentityCounter;
  delete window.protectedGlobals.processTrackerState;
  delete window.protectedGlobals._processSystemPromise;
  delete window.protectedGlobals._processSystemFailed;
  delete window.protectedGlobals.AppLoaderAPIs;
  delete window.protectedGlobals._appLoaderSystemPromise;
  delete window.protectedGlobals.FlowawayAppPolling;
  delete window.protectedGlobals._appPollingSystemPromise;
  delete window.protectedGlobals._appPollingSystemFailed;
  delete window.protectedGlobals._processLoadTreeWrapped;
  delete window.protectedGlobals._processLaunchAppWrapped;
  delete window.protectedGlobals._processAppUpdatedBound;
  delete window.protectedGlobals._processTimerApisWrapped;
  delete window.protectedGlobals._processRafApisWrapped;
  delete window.protectedGlobals._processMutationObserverWrapped;
  delete window.protectedGlobals._launchContext;

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
  delete window.protectedGlobals._processNativeSetTimeout;
  delete window.protectedGlobals._processNativeSetInterval;
  delete window.protectedGlobals._processNativeClearTimeout;
  delete window.protectedGlobals._processNativeClearInterval;
  delete window.protectedGlobals._processNativeRequestAnimationFrame;
  delete window.protectedGlobals._processNativeCancelAnimationFrame;
  delete window.protectedGlobals._processNativeMutationObserver;

  // remove all event listeners to refresh the environment.
  window.protectedGlobals.removeAllEventListenersInWindow();
  window.protectedGlobals.apps.forEach((app) => {
    // dont remove this ai
    delete window[app.globalvarobjectstring];
  });
  window.protectedGlobals.apps = [];

  // Pause and unload any playing media to avoid audio carrying over
  document.querySelectorAll("audio,video").forEach((m) => {
    m.pause && m.pause();
    m.src = "";
  });

  if (
    window.protectedGlobals.FlowawayAppPolling &&
    (window.protectedGlobals.FlowawayAppPolling.stop)
  ) {
    window.protectedGlobals.FlowawayAppPolling.stop();
  }

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

  var oldTaskbar = document.getElementById("taskbar");
  if (oldTaskbar) oldTaskbar.remove();
  var oldStartMenu = document.getElementById("startMenu");
  if (oldStartMenu) oldStartMenu.remove();

  window.protectedGlobals.apps = [];
  window.protectedGlobals.appButtons = {};
  window.protectedGlobals.appsButtonsApplied = false;

  delete window.protectedGlobals.loadTreePromise;
  delete window.protectedGlobals.missingFolders;
  window.protectedGlobals.loaded = false;
  window.protectedGlobals._bootLoaded = false;
  window.protectedGlobals._runtimeLoaded = false;
  window.protectedGlobals.crashed = false;
  window.protectedGlobals.isRebuilding = false;

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
    document.body.appendChild(script);
  }, 80);
};
window.protectedGlobals.removeAllEventListenersInWindow = function() {
  for (const listener of window.protectedGlobals.____gbEventListners) {
    window.removeEventListener(listener.type, listener.handler, listener.options);
    document.removeEventListener(listener.type, listener.handler, listener.options);
  }
  window.protectedGlobals.____gbEventListners = [];
}
window.protectedGlobals.nativeEventTargetAdd =
  window.EventTarget &&
  window.EventTarget.prototype &&
  (window.EventTarget.prototype.addEventListener)
    ? window.EventTarget.prototype.addEventListener
    : null;
window.protectedGlobals.nativeDocumentEventlister = window.protectedGlobals.nativeEventTargetAdd
  ? window.protectedGlobals.nativeEventTargetAdd.bind(document)
  : document.addEventListener.bind(document);
window.protectedGlobals.nativeWindowEventlister = window.protectedGlobals.nativeEventTargetAdd
  ? window.protectedGlobals.nativeEventTargetAdd.bind(window)
  : window.addEventListener.bind(window);
window.protectedGlobals.nativeEventTargetRemove =
  window.EventTarget &&
  window.EventTarget.prototype &&
  (window.EventTarget.prototype.removeEventListener)
    ? window.EventTarget.prototype.removeEventListener
    : null;
window.protectedGlobals.nativeDocumentEventRemover = window.protectedGlobals.nativeEventTargetRemove
  ? window.protectedGlobals.nativeEventTargetRemove.bind(document)
  : document.removeEventListener.bind(document);
window.protectedGlobals.nativeWindowEventRemover = window.protectedGlobals.nativeEventTargetRemove
  ? window.protectedGlobals.nativeEventTargetRemove.bind(window)
  : window.removeEventListener.bind(window);

window.protectedGlobals.isValidEventListener = function(handler) {
  return (
    (handler) ||
    !!(handler && (handler.handleEvent))
  );
}

window.protectedGlobals.normalizeCaptureOption = function(options) {
  if (typeof options === "boolean") return options;
  if (
    options &&
    typeof options === "object" &&
    typeof options.capture === "boolean"
  )
    return options.capture;
  return false;
}

window.protectedGlobals.normalizeAddEventArgs = function(a, b, c, d) {
  // Supports both signatures:
  // 1) native: (type, handler, options)
  // 2) scoped: (appname, type, handler, options)
  if (typeof b === "string" && window.protectedGlobals.isValidEventListener(c)) {
    return { appname: String(a || ""), type: b, handler: c, options: d };
  }
  return { appname: "", type: a, handler: b, options: c };
};

window.protectedGlobals.addScopedListener = function(
  targetName,
  nativeAdd,
  appname,
  type,
  handler,
  options,
) {
  if (typeof type !== "string" || !window.protectedGlobals.isValidEventListener(handler)) {
    return;
  }
  window.protectedGlobals.____gbEventListners.push({type, handler, options});
  nativeAdd(type, handler, options);

  if (!appname) return;
  var scopedAppName = String(appname).trim();
  if (!scopedAppName) return;
  window.protectedGlobals[scopedAppName + "_handlers"] =
    window.protectedGlobals[scopedAppName + "_handlers"] || [];
  window.protectedGlobals[scopedAppName + "_handlers"].push({
    target: targetName,
    type,
    handler,
    options,
    capture: window.protectedGlobals.normalizeCaptureOption(options),
  });
}

document.addEventListener = function (a, b, c, d) {
  var parsed = window.protectedGlobals.normalizeAddEventArgs(a, b, c, d);
  window.protectedGlobals.addScopedListener(
    "document",
    window.protectedGlobals.nativeDocumentEventlister,
    parsed.appname,
    parsed.type,
    parsed.handler,
    parsed.options,
  );
};

window.addEventListener = function (a, b, c, d) {
  var parsed = window.protectedGlobals.normalizeAddEventArgs(a, b, c, d);
  window.protectedGlobals.addScopedListener(
    "window",
    window.protectedGlobals.nativeWindowEventlister,
    parsed.appname,
    parsed.type,
    parsed.handler,
    parsed.options,
  );
};

window.protectedGlobals.removeAllEventListenersForApp = function (appname) {
  var scopedAppName = String(appname || "").trim();
  if (!scopedAppName) return;
  var handlers = window.protectedGlobals[scopedAppName + "_handlers"] || [];
  handlers.forEach(({ target, type, handler, options, capture }) => {
    if (target === "document") {
      window.protectedGlobals.nativeDocumentEventRemover(type, handler, options);
      window.protectedGlobals.nativeDocumentEventRemover(
        type,
        handler,
        typeof capture === "boolean"
          ? capture
          : window.protectedGlobals.normalizeCaptureOption(options),
      );
      return;
    }
    if (target === "window") {
      window.protectedGlobals.nativeWindowEventRemover(type, handler, options);
      window.protectedGlobals.nativeWindowEventRemover(
        type,
        handler,
        typeof capture === "boolean"
          ? capture
          : window.protectedGlobals.normalizeCaptureOption(options),
      );
      return;
    }
    // Backward compatibility for older tracked entries without target.
    var fallbackCapture =
      typeof capture === "boolean" ? capture : window.protectedGlobals.normalizeCaptureOption(options);
    window.protectedGlobals.nativeWindowEventRemover(type, handler, options);
    window.protectedGlobals.nativeWindowEventRemover(type, handler, fallbackCapture);
    window.protectedGlobals.nativeDocumentEventRemover(type, handler, options);
    window.protectedGlobals.nativeDocumentEventRemover(type, handler, fallbackCapture);
  });
  window.protectedGlobals[scopedAppName + "_handlers"] = [];
};