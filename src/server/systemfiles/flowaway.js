(function () {
  window.protectedGlobals = window.protectedGlobals || {};
  if (window.protectedGlobals._bootLoaded) {
    return;
  }
  window.protectedGlobals._bootLoaded = true;

  function crash(message, detail) {
    window.protectedGlobals.notification(message + ': ' + detail);
    throw new Error(String(message || "Flowaway initialization failed.") + (detail ? "\n\n" + String(detail) : ""));
  }

  function base64ToUtf8Local(b64) {
    try {
      var binaryString = atob(String(b64 || ""));
      var len = binaryString.length;
      var bytes = new Uint8Array(len);
      for (var i = 0; i < len; i++) {
        bytes[i] = binaryString.charCodeAt(i);
      }
      if (typeof TextDecoder === "function") {
        return new TextDecoder("utf-8").decode(bytes);
      }
      return binaryString;
    } catch (e) {
      try {
        return atob(String(b64 || ""));
      } catch (ee) {
        return "";
      }
    }
  }

  async function fetchAndLoadScript(path) {
    if (typeof window.protectedGlobals.filePost !== "function") {
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
      "systemfiles/runtime/runtimeCore.js",
    ];

    for (var i = 0; i < parts.length; i++) {
      await fetchAndLoadScript(parts[i]);
    }

    window.protectedGlobals._runtimeLoaded = true;
  }

  loadRuntime().catch(function (e) {
    crash("Flowaway bootstrap failed.", String((e && (e.stack || e.message)) || e));
  });
  window.protectedGlobals.notification("if you dont see any apps, refresh the page!", {duration: 5000});
})();
