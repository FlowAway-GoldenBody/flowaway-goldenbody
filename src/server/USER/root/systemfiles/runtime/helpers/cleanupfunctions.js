"use strict";
// required functions for the system cleanup
window.protectedGlobals.rebuildhandler = function () {
  for (let i = 0; i < 10000; i++) {
    clearInterval(i, { nolog: true });
  }
  window.protectedGlobals.process.disposeAll();
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