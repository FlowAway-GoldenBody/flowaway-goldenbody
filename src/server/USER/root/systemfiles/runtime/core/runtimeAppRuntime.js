(function () {

// ----------------- DYNAMIC AP LOADER -----------------
window.protectedGlobals.apps = window.protectedGlobals.apps || [];

window.protectedGlobals.setDataTitle = window.protectedGlobals.setAppDataTitle;

// appUpdated - ensure single binding
try {
  if (window.protectedGlobals.systemAPIs.onAppUpdated)
    window.removeEventListener(
      "appUpdated",
      window.protectedGlobals.systemAPIs.onAppUpdated,
    );
  window.protectedGlobals.systemAPIs.onAppUpdated = (e) => {
    window.protectedGlobals.purgeButtons();
  };
  window.addEventListener("appUpdated", window.protectedGlobals.systemAPIs.onAppUpdated);
} catch (e) {}

// Ensure loadAppsFromTree runs after initial tree load

window.protectedGlobals.oldLoadTree = window.protectedGlobals.loadTree;
window.protectedGlobals.loadTree = async function () {
  await window.protectedGlobals.oldLoadTree();
  await window.protectedGlobals.loadAppsFromTree();
  window.protectedGlobals.annotateTreeWithPaths(window.protectedGlobals.treeData);
};
Promise.all([
  window.protectedGlobals.ensureFlowawayAppLoaderLoaded(),
  window.protectedGlobals.ensureFlowawayAppPollingLoaded(),
  window.protectedGlobals.ensureProcessRuntimeLoaded(),
])
  .finally(function () {
    if (typeof window.protectedGlobals.loadTree === "function") {
      window.protectedGlobals.loadTree();
    }
  });
window.protectedGlobals.onlyloadTree = window.protectedGlobals.oldLoadTree;
// ----------------- END dynamic app loader -----------------

window.protectedGlobals.username = window.protectedGlobals.data && typeof window.protectedGlobals.data.username === 'string' ? window.protectedGlobals.data.username : '';

// fullscreen keyboard lock
// fullscreenchange - ensure single binding
try {
  if (window.protectedGlobals.systemAPIs.onFullscreenChange)
    document.removeEventListener(
      "fullscreenchange",
      window.protectedGlobals.systemAPIs.onFullscreenChange,
    );
  window.protectedGlobals.systemAPIs.onFullscreenChange = async () => {
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
    window.protectedGlobals.systemAPIs.onFullscreenChange,
  );
} catch (e) {}
})();

