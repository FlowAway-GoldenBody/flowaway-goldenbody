// Minimal Eval JS app - injects/evaluates JS from a given file path
window.evalJsAppGlobals = {};
evalJsApp = function (path, posX = 50, posY = 50) {
  // create a hidden root so the app system can track this instance
  const root = document.createElement("div");
  root.className = "app-root app-window-root eval-js";
  root.style.display = "none";
  document.body.appendChild(root);

  const instance = (window.apptools && window.apptools.api && window.apptools.api.createAppInstance)
    ? window.apptools.api.createAppInstance({ rootElement: root, title: "Eval JS" })
    : { rootElement: root, title: "Eval JS" };

  if (window.apptools && window.apptools.api && window.apptools.api.trackInstance) {
    window.apptools.api.trackInstance(instance, "evalJsApp");
  }

  function decodeMaybeBase64Text(raw) {
    const text = String(raw || "").trim();
    if (!text) return "";
    const looksLikeBase64 = /^[A-Za-z0-9+/]+={0,2}$/.test(text) && text.length % 4 === 0;
    if (!looksLikeBase64) return text;
    try {
      return atob(text);
    } catch (e) {
      return text;
    }
  }

  (async function () {
    try {
      let raw = "";
      if (typeof ReadFile === "function") {
        const res = await ReadFile(path);
        if (res && !res.missing) {
          if (typeof res.filecontent === "string") raw = decodeMaybeBase64Text(res.filecontent);
          else if (typeof res === "string") raw = decodeMaybeBase64Text(res);
        }
      } else if (typeof readFile === "function") {
        raw = decodeMaybeBase64Text(readFile(path));
      } else if (typeof fetch === "function") {
        try {
          const resp = await fetch(path);
          if (resp.ok) raw = await resp.text();
        } catch (e) {
          // ignore
        }
      }

      if (!raw) {
        console.warn("eval-js: no content found for", path);
        return;
      }

      const script = document.createElement("script");
      script.type = "text/javascript";
      script.textContent = raw;
      document.body.appendChild(script);
    } catch (e) {
      console.error("eval-js: error evaluating", path, e);
    }
  })();

  return instance;
};
