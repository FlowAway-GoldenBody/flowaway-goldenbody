(function () {
  window.protectedGlobals = window.protectedGlobals || {};
  window.permGlobals = window.permGlobals || {};
  window.protectedGlobals.timerSpeed = 1;
// (() => {
//   const timers = [];
//   let nextId = 1;

//   window.setInterval = (cb, interval) => {
//     const id = nextId++;

//     const tick = () => {
//       if (timers.includes(id)) { return; }
//       try {
//         cb();
//       } catch (e) {
//         console.trace(e);
//       }
//       setTimeout(
//         tick,
//         interval * window.protectedGlobals.timerSpeed
//       )
//     };
//       setTimeout(
//         tick,
//         interval * window.protectedGlobals.timerSpeed
//       )

//     return id;
//   };

//   window.clearInterval = (id) => {
//     if (!(timers.indexOf(id) > -1)) { timers.push(id); console.log("interval id cleared: " + String(id)); }
//     else {
//       console.log("interval id not found or already cleared: " + String(id));
//     }
//   };
// })();
// we want dynamic timer speed adjustment, so we will override setInterval and clearInterval to allow for that
(() => {
  const nativeSetTimeout = window.setTimeout;
  const cancelled = new Set();
  let nextId = 1;

  window.setInterval = (cb, interval) => {
    const id = nextId++;

    const tick = () => {
      if (cancelled.has(id)) { cancelled.delete(id); return; }

      try {
        cb();
      } catch (err) {
        console.trace(err);
      }

      if (!cancelled.has(id)) {
        const speed =
          Number(window.protectedGlobals?.timerSpeed) || 1;

        nativeSetTimeout(tick, interval * speed);
      }
    };

    const speed =
      Number(window.protectedGlobals?.timerSpeed) || 1;

    nativeSetTimeout(tick, interval * speed);

    return id;
  };

  window.clearInterval = (id, options) => {
    cancelled.add(id);
    if (!options || !options.nolog) {
      console.log("Interval cleared: " + String(id));
    }
  };
})();
  if (!window.permGlobals.origFetch) {
    window.permGlobals.origFetch = window.fetch;
  }
  window.fetch = function (...args) {
    // this is only for people to protect their data
    try {
    if (!window.protectedGlobals.statusData.wifiEnabled) return Promise.resolve(new Response("WiFi is disabled", { status: 403 }));
    else return window.permGlobals.origFetch.apply(this, args);
    } 
    catch (e) {
      return window.permGlobals.origFetch.apply(this, args);
    };
  };
  window.protectedGlobals.____gbEventListners = [];
  if (window.protectedGlobals._bootLoaded) {
    return;
  }
  window.protectedGlobals._bootLoaded = true;

  function crash(message, detail) {
    window.protectedGlobals.notification(message + ': ' + detail);
    throw new Error(String(message || "Flowaway initialization failed.") + (detail ? "\n\n" + String(detail) : ""));
  }

  function base64ToUtf8Local(b64) {
    var binaryString = atob(String(b64 || ""));
    var len = binaryString.length;
    var bytes = new Uint8Array(len);
    for (var i = 0; i < len; i++) {
      bytes[i] = binaryString.charCodeAt(i);
    }
    if ((TextDecoder)) {
      return new TextDecoder("utf-8").decode(bytes);
    }
    return binaryString;
  }

  async function fetchAndLoadScript(path) {
    if (!(window.protectedGlobals.filePost)) {
      crash("Flowaway bootstrap missing filePost.", "Cannot fetch " + String(path || ""));
      return;
    }

    var response = await window.protectedGlobals.filePost({
      requestFile: true,
      requestFileName: String(path || ""),
    });

    if (!response || typeof response.filecontent !== "string") {
      crash("Flowaway bootstrap failed to fetch script.", String(path || ""));
      return;
    }

    var scriptText = base64ToUtf8Local(response.filecontent);
    if (!scriptText || !scriptText.trim()) {
      crash("Flowaway bootstrap received empty script.", String(path || ""));
      return;
    }

    var script = document.createElement("script");
    script.type = "text/javascript";
    script.textContent = scriptText;
    document.body.appendChild(script);
  }

  async function loadRuntime() {
    var parts = [
      "systemfiles/runtime/core/runtimeCore.js",
    ];

    for (var i = 0; i < parts.length; i++) {
      await fetchAndLoadScript(parts[i]);
    }

    window.protectedGlobals._runtimeLoaded = true;
  }

  loadRuntime();
})();
