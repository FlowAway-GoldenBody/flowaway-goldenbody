"use strict";
(function () {
  if (window.protectedGlobals.FlowawayAppPolling && window.protectedGlobals.FlowawayAppPolling.__loaded) return;

  const state = {
    active: false,
    socket: null,
    reconnectTimer: null,
    backoff: 0,
  };

  async function refreshAppForFolder(folderName) {
    if (!folderName || !window.protectedGlobals.apps || !window.protectedGlobals.extractAppData) return;

    const normalized = String(folderName || "").replace(/\\/g, "/").split("/").filter(Boolean).pop();
    if (!normalized) return;

    const existingApp = window.protectedGlobals.apps.find(function (app) {
      return String(app.path || "").split("/").pop() === normalized;
    });

    const appPath = existingApp ? existingApp.path : "systemfiles/runtime/apps/" + normalized;
    const freshApp = await window.protectedGlobals.extractAppData([normalized, null, { path: appPath }]);
    if (!freshApp) return;

    if (existingApp) {
      const index = window.protectedGlobals.apps.indexOf(existingApp);
      if (index >= 0) window.protectedGlobals.apps[index] = freshApp;
    } else {
      window.protectedGlobals.apps.push(freshApp);
    }

    window.protectedGlobals.initAppRuntimeState(freshApp);
    await window.protectedGlobals.renderAppsGrid();
    window.protectedGlobals.applyTaskButtons();

    window.dispatchEvent(new CustomEvent("appUpdated", { detail: null }));
  }

  function startViaWebSocket() {
    if (
      state.socket &&
      (state.socket.readyState === WebSocket.OPEN || state.socket.readyState === WebSocket.CONNECTING)
    ) {
      return true;
    }

    const base = String(window.protectedGlobals.BASE || "");
    const username = (window.protectedGlobals.data && window.protectedGlobals.data.username) || "";
    const appPollingURL = base + "/server/appSocket";
    state.socket = new WebSocket(appPollingURL);

    state.socket.onopen = function () {
      state.backoff = 0;
      if (state.reconnectTimer) {
        clearTimeout(state.reconnectTimer);
        state.reconnectTimer = null;
      }
      state.socket.send(JSON.stringify({ subscribeToAppChanges: true, username: username }));
    };

    state.socket.onmessage = function (ev) {
      try {
        const msg = JSON.parse(ev.data);
        if (!msg || !msg.appChanges) return;
        const changedApps = Array.isArray(msg.changedApps) ? msg.changedApps : [];
        if (!changedApps.length) return;
        changedApps.forEach(function (folderName) {
          refreshAppForFolder(folderName).catch(async function (err) {
            // folder is gone, this app is deleted
            const normalized = String(folderName || "").replace(/\\/g, "/").split("/").filter(Boolean).pop();
            let app = window.protectedGlobals.apps.find(function (app) {
              return String(app.path || "").split("/").pop() === normalized;
            });
            window[app.globalVarObjectString][app.allAppArrayString].forEach(e => { 
              e.rootElement.remove();
            });
            await window.protectedGlobals.renderAppsGrid();
            window.protectedGlobals.taskbuttons.forEach(b => {
              if (b.dataset.appId == app.functionName) b.remove();
            });
            window.protectedGlobals.apps.splice(window.protectedGlobals.apps.indexOf(app), 1);
            });
        });
      } catch (err) {
        console.warn("[APP POLLING] invalid message", err);
      }
    };

    state.socket.onerror = function (err) {
      console.warn("[APP POLLING] WebSocket error", err);
    };

    state.socket.onclose = function () {
      state.socket = null;
      if (state.reconnectTimer) clearTimeout(state.reconnectTimer);
      state.backoff = Math.min(state.backoff + 1, 10);
      const delay = state.backoff * 1000;
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
    startViaWebSocket();
  }

  function stop() {
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
    start: start,
    stop: stop,
    startViaWebSocket: startViaWebSocket,
    refreshAppForFolder: refreshAppForFolder,
  };

  start();
})();
