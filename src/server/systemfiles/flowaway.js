(function () {
  window.protectedGlobals = window.protectedGlobals || {};
  if (window.protectedGlobals._bootLoaded) {
    return;
  }
  window.protectedGlobals._bootLoaded = true;

  function crash(message, detail) {
    var title = "System Crash";
    var body = String(message || "Failed to load system runtime.");
    var extra = detail ? String(detail) : "";

    try {
      var existing = document.getElementById("flowaway-fatal-crash-dialog");
      if (!existing) {
        var overlay = document.createElement("div");
        overlay.id = "flowaway-fatal-crash-dialog";
        Object.assign(overlay.style, {
          position: "fixed",
          inset: "0",
          zIndex: "2147483647",
          background: "rgba(0, 0, 0, 0.72)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          padding: "20px",
        });

        var box = document.createElement("div");
        Object.assign(box.style, {
          width: "min(680px, 100%)",
          borderRadius: "10px",
          border: "1px solid rgba(255,255,255,0.18)",
          background: "#161616",
          color: "#fff",
          fontFamily: "sans-serif",
          padding: "18px",
          boxSizing: "border-box",
        });

        var titleEl = document.createElement("div");
        titleEl.textContent = title;
        titleEl.style.fontSize = "18px";
        titleEl.style.fontWeight = "700";
        titleEl.style.marginBottom = "10px";

        var bodyEl = document.createElement("div");
        bodyEl.id = "flowaway-fatal-crash-body";
        bodyEl.style.whiteSpace = "pre-wrap";
        bodyEl.style.fontSize = "13px";
        bodyEl.style.lineHeight = "1.45";

        box.appendChild(titleEl);
        box.appendChild(bodyEl);
        overlay.appendChild(box);
        document.body.appendChild(overlay);
      }

      var bodyNode = document.getElementById("flowaway-fatal-crash-body");
      if (bodyNode) {
        bodyNode.textContent = extra ? body + "\n\n" + extra : body;
      }
    } catch (e) {
      try {
        console.error(title + ": " + body + (extra ? "\n\n" + extra : ""));
      } catch (ee) {}
    }

    throw new Error(body + (extra ? " | " + extra : ""));
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

  async function loadVfsScript(path) {
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
      "systemfiles/runtimeCore.js",
      "systemfiles/runtimeAppRuntime.js",
      "systemfiles/runtimeWindowSystem.js",
      "systemfiles/runtimeShell.js",
    ];

    for (var i = 0; i < parts.length; i++) {
      await loadVfsScript(parts[i]);
    }

    window.protectedGlobals._runtimeLoaded = true;
  }

  loadRuntime().catch(function (e) {
    crash("Flowaway bootstrap failed.", String((e && (e.stack || e.message)) || e));
  });
})();
