"use strict";

window.protectedGlobals.missingFolders = window.protectedGlobals.missingFolders || new Set();

(function () {
  if (window.__runtimeCoreWorkerHookInstalled || !window.Worker) return;

  const NativeWorker = window.Worker;

  const buildWorkerBootstrap = function (scriptURL) {
    const sourceUrl = scriptURL == null ? "" : String(scriptURL);
    const sourceLiteral = JSON.stringify(sourceUrl);
    return [
      "(function () {",
      "  const notifyHost = function (eventName) {",
      "    try { postMessage({ type: '__flowaway_worker_event__', event: eventName, ts: Date.now() }); } catch (err) {}",
      "  };",
      "  const nativeClose = typeof self.close === 'function' ? self.close.bind(self) : null;",
      "  const nativeTerminate = typeof self.terminate === 'function' ? self.terminate.bind(self) : null;",
      "  if (nativeClose) {",
      "    self.close = function () {",
      "      notifyHost('self.close');",
      "      return nativeClose.apply(this, arguments);",
      "    };",
      "  }",
      "  if (nativeTerminate) {",
      "    self.terminate = function () {",
      "      notifyHost('self.terminate');",
      "      return nativeTerminate.apply(this, arguments);",
      "    };",
      "  }",
      "  const __sourceUrl = " + sourceLiteral + ";",
      "  if (__sourceUrl) {",
      "    fetch(__sourceUrl).then(function (response) { return response.text(); }).then(function (code) {",
      "      try { (0, eval)(code); } catch (error) { setTimeout(function () { throw error; }, 0); }",
      "    }).catch(function (error) { setTimeout(function () { throw error; }, 0); });",
      "  }",
      "})();",
    ].join("\n");
  };

  window.Worker = function WrappedWorker() {
    const scriptURL = arguments.length > 0 ? arguments[0] : null;
    const options = arguments.length > 1 ? arguments[1] : null;
    const wrappedURL = scriptURL && typeof scriptURL === 'string'
      ? URL.createObjectURL(new Blob([buildWorkerBootstrap(scriptURL)], { type: 'text/javascript' }))
      : scriptURL;

    const worker = arguments.length > 1
      ? new NativeWorker(wrappedURL, options)
      : new NativeWorker(wrappedURL);

    const nativeTerminate = typeof worker.terminate === 'function' ? worker.terminate.bind(worker) : null;
    if (nativeTerminate) {
      worker.terminate = function () {
        if (worker.__flowawayTerminationGuard) {
          return nativeTerminate.apply(this, arguments);
        }
        worker.__flowawayTerminationGuard = true;
        try {
          if (window.protectedGlobals && typeof window.protectedGlobals.onWorkerTerminate === 'function') {
            window.protectedGlobals.onWorkerTerminate(worker, arguments);
          }
        } catch (err) {}
        const result = nativeTerminate.apply(this, arguments);
        worker.__flowawayTerminationGuard = false;
        return result;
      };
    }

    worker.addEventListener('message', function (event) {
      if (!event || !event.data || event.data.type !== '__flowaway_worker_event__') return;
      try {
        if (window.protectedGlobals && typeof window.protectedGlobals.onWorkerEvent === 'function') {
          window.protectedGlobals.onWorkerEvent(worker, event.data);
        }
      } catch (err) {}
    });

    return worker;
  };

  window.Worker.prototype = NativeWorker.prototype;
  window.__runtimeCoreWorkerHookInstalled = true;
})();

console.log("runtimeCore.js loaded");
window.protectedGlobals.unzip = async function (path, destinationFolder) {
  if (!destinationFolder) {
    destinationFolder = path.split("/").slice(0, -1).join("/"); // default to the folder containing the zip file
  }
  if (!path) throw new Error("No path");
  const res = await window.protectedGlobals.filePost({ unzip: true, path: String(path), destinationFolder });
  return res;
};
window.protectedGlobals.WriteFolder = async function (relPath) {
  if (!relPath) throw new Error("No path");
  const directions = [{ path: String(relPath), addFolder: true }, { end: true }];
  const res = await window.protectedGlobals.filePost({ saveSnapshot: true, directions });
  if (res && res.success) {
    window.protectedGlobals.missingFolders.delete(relPath);
  }
  return res;
}
window.protectedGlobals.FolderExists = async function (relPath) {
  if (!relPath) throw new Error("No path");
  const normalizedPath = String(relPath || "").trim().replace(/\\/g, "/");
  const requestPath = normalizedPath === "root"
    ? ""
    : normalizedPath.replace(/^\/+/g, "").replace(/^root\//, "");
  const res = await window.protectedGlobals.filePost({
    saveSnapshot: true,
    directions: [{ checkFolder: true, path: requestPath }],
  });
  return Boolean(res && res.result?.checkFolder);
};
window.protectedGlobals.FileExists = async function (relPath) {
  if (!relPath) throw new Error("No path");
  const normalizedPath = String(relPath || "").trim().replace(/\\/g, "/");
  const requestPath = normalizedPath === "root"
    ? ""
    : normalizedPath.replace(/^\/+/g, "").replace(/^root\//, "");
  const res = await window.protectedGlobals.filePost({
    saveSnapshot: true,
    directions: [{ checkFile: true, path: requestPath }],
  });
  return Boolean(res && res.result?.checkFile);
};
window.protectedGlobals.ReadFile = async function (
  relPath,
  options = { text: true, buffer: false, direct: false, stream: false }
) {
  if (!relPath) throw new Error("No path");

  const isBuffer = !!options.buffer;
  const isText = !!options.text;
  const isStream = !!options.stream;
  const modes = [isBuffer, isText, isStream].filter(Boolean).length;
  if (modes !== 1) {
    throw new Error("Choose exactly one of text, buffer, or stream.");
  }

  const headers = {
    "Content-Type": "application/json",
  };

  if (window.protectedGlobals.data.authToken) {
    headers.Authorization =
      "Bearer " + window.protectedGlobals.data.authToken;
  }

  const MAX_RETRIES = 5;
  const TIMEOUT_MS = 2000;

  let response;

  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), TIMEOUT_MS);

    try {
      response = await fetch(window.protectedGlobals.SERVER, {
        method: "POST",
        headers,
        signal: controller.signal,
        body: JSON.stringify({
          username: window.protectedGlobals.getCurrentUsernameForRequests(),
          requestFile: true,
          requestFileName: String(relPath),
        }),
      });

      clearTimeout(timeout);
      break; // Success
    } catch (err) {
      clearTimeout(timeout);

      if (attempt === MAX_RETRIES) {
        throw err.name === "AbortError"
          ? new Error("Request timed out after 5 attempts.")
          : err;
      }

      console.warn(
        `ReadFile attempt ${attempt} failed, retrying...`,
        err
      );
    }
  }

  if (response.status === 401) {
    const refilled = await window.protectedGlobals.showSessionExpiredDialog().catch(() => false);
    if (refilled) return await window.protectedGlobals.ReadFile(relPath, options);
    return { error: "unauthorized" };
  }

  const contentType = (
    response.headers.get("content-type") || ""
  ).toLowerCase();

  if (contentType.includes("application/json")) {
    const payload = await response.json();

    if (payload.missing) return undefined;

    throw new Error(
      payload.error || payload.message || "Failed to read file"
    );
  }

  if (!response.ok) {
    throw new Error(`Failed to read file: ${response.status} ${relPath}`);
  }

  const fileSize = Number(response.headers.get("content-length") || 0);

  let filecontent = null;
  if (isBuffer) {
    filecontent = await response.arrayBuffer();
  } else if (isText) {
    filecontent = await response.text();
  } else {
    filecontent = response.body;
  }

  if (options.direct) {
    return filecontent;
  }

  return {
    fileSize,
    filecontent,
  };
};
window.protectedGlobals.ReadFolder = async function (relPath, options = { detail: false, directoryDetail: false }) {
  if (!relPath) throw new Error("No path");
  let res = await window.protectedGlobals.filePost({
    requestFolder: true,
    requestFolderName: String(relPath),
    detail: options.detail,
    directoryDetail: options.directoryDetail
  });
  return res.files;
}
window.protectedGlobals.WriteFile = async function (
  relPath,
  contents,
  options = { replace: true, stream: false }
) {
  let normalizedPath = String(relPath || "").trim();
  if (!normalizedPath) throw new Error("No path");

  if (!options.retrytimeout) {
    options.retrytimeout = 15000; // default 15 seconds
  }

  function utf8ToBase64(str) {
    const bytes = new TextEncoder().encode(str);
    const binaryString = String.fromCharCode(...bytes);
    return btoa(binaryString);
  }

  // Normalize legacy prefixes and leading slashes.
  normalizedPath = normalizedPath.replace(/\\/g, "/");

  if (normalizedPath === "root") {
    normalizedPath = "";
  } else if (normalizedPath.startsWith("root/")) {
    normalizedPath = normalizedPath.slice("root/".length);
  } else if (normalizedPath.startsWith("/root/")) {
    normalizedPath = normalizedPath.slice("/root/".length);
  }

  while (normalizedPath.startsWith("/")) {
    normalizedPath = normalizedPath.slice(1);
  }

  if (!normalizedPath) throw new Error("No path");

  const replace =
    options && typeof options === "object"
      ? options.replace !== false
      : options !== false;

  // Convert the entire input to bytes first.
  let raw;

  if (!options.stream) {
    if (contents instanceof ArrayBuffer) {
      raw = contents;
    } else if (ArrayBuffer.isView(contents)) {raw = contents.buffer;}
    else if (
      typeof Blob !== "undefined" &&
      contents instanceof Blob
    ) {
      raw = await contents.arrayBuffer();
    } else if (contents == null) {
      raw = new ArrayBuffer(0);
    } else if (contents instanceof Uint8Array) {
      raw = contents;
    } else {
      raw = new TextEncoder().encode(String(contents));
    }
  } else {
    const tempres = new Response(contents);
    raw = await tempres.arrayBuffer();
  }

  const CHUNK_SIZE = 10 * 1024 * 1024; // 10 MB

  const baseHeaders = {
    "Content-Type": "application/octet-stream",
    "X-File-Action": "write",
    "X-File-Path": utf8ToBase64(normalizedPath),
    "X-Username":
      window.protectedGlobals.getCurrentUsernameForRequests(),
  };

  const maxAttempts = 15;

  async function sendChunk(chunk, chunkReplace) {
    const headers = {
      ...baseHeaders,
      "X-File-Replace": chunkReplace ? "true" : "false",
    };
    headers["Authorization"] = "Bearer " + window.protectedGlobals.data.authToken;
    let response;

    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      const controller = new AbortController();

      const timeout = setTimeout(
        () => controller.abort(),
        options.retrytimeout
      );

      try {
        response = await fetch(window.protectedGlobals.SERVER, {
          method: "POST",
          headers,
          body: new Blob([chunk]), // a hack to make the server send all of it
          signal: controller.signal,
        });

        clearTimeout(timeout);

        // Request completed, regardless of HTTP status.
        // Don't retry completed requests.
        break;
      } catch (err) {
        clearTimeout(timeout);

        // Only retry timed-out requests.
        const timedOut = err.name === "AbortError";

        if (!timedOut || attempt === maxAttempts) {
          throw err;
        }
      }
    }

    let body = {};

    try {
      body = await response.json();
    } catch {}

    if (
      response.status === 401 &&
      !window.protectedGlobals.firstlogin
    ) {
      const refilled = await window.protectedGlobals.showSessionExpiredDialog().catch(() => false);
      if (refilled) return await sendChunk(chunk, chunkReplace);
      return { error: "unauthorized" };
    }

    return {
      response,
      body,
    };
  }

  // Always send at least one request, including for an empty file.
  const totalChunks = Math.max(
    1,
    Math.ceil(raw.byteLength / CHUNK_SIZE)
  );

  let lastResult = {};

  for (let chunkIndex = 0; chunkIndex < totalChunks; chunkIndex++) {
    const start = chunkIndex * CHUNK_SIZE;
    const end = Math.min(start + CHUNK_SIZE, raw.byteLength);

    const chunk = raw.slice(start, end);

    // The first chunk honors the caller's replace option.
    // All later chunks must append to the existing file.
    const chunkReplace =
      chunkIndex === 0 ? replace : false;

    lastResult = await sendChunk(chunk, chunkReplace);

    // If the server returned an error status, stop immediately.
    if (!lastResult.response.ok) {
      return lastResult.body;
    }
  }

  return lastResult.body;
};
window.protectedGlobals.DeleteFile = async function (relPath) {
  if (!relPath) throw new Error("No path");
  const directions = [{ delete: true, path: String(relPath) }, { end: true }];
  return await window.protectedGlobals.filePost({ saveSnapshot: true, directions });
};
window.protectedGlobals.DeleteFolder = async function (relPath) {
  if (!relPath) throw new Error("No path");
  const directions = [{ deleteFolder: true, path: String(relPath) }, { end: true }];
  return await window.protectedGlobals.filePost({ saveSnapshot: true, directions });
}
window.protectedGlobals.RenameFile = async function (relPath, newName) {
  if (!relPath) throw new Error("No path");
  if (!newName) throw new Error("No new name");
  const directions = [
    { rename: true, path: String(relPath), newName: String(newName) },
    { end: true },
  ];
  return await window.protectedGlobals.filePost({ saveSnapshot: true, directions });
};

window.protectedGlobals.RenameFolder = async function (relPath, newName) {
  if (!relPath) throw new Error("No path");
  if (!newName) throw new Error("No new name");
  const directions = [
    { renameFolder: true, path: String(relPath), newName: String(newName) },
    { end: true },
  ];
  return await window.protectedGlobals.filePost({ saveSnapshot: true, directions });
};

window.protectedGlobals.PasteFile = async function (destinationRelPath, clipboardItems) {
  if (!destinationRelPath) throw new Error("No destination path");
  if (!Array.isArray(clipboardItems) || !clipboardItems.length)
    throw new Error("No clipboard items");
  const directions = [
    { copy: true, directions: clipboardItems },
    { paste: true, path: String(destinationRelPath) },
    { end: true },
  ];
  return await window.protectedGlobals.filePost({ saveSnapshot: true, directions });
};

window.protectedGlobals.PasteFolder = async function (destinationRelPath, clipboardItems) {
  if (!destinationRelPath) throw new Error("No destination path");
  if (!Array.isArray(clipboardItems) || !clipboardItems.length)
    throw new Error("No clipboard items");
  const directions = [
    { copy: true, directions: clipboardItems },
    { pasteFolder: true, path: String(destinationRelPath) },
    { end: true },
  ];
  return await window.protectedGlobals.filePost({ saveSnapshot: true, directions });
};

// Helper function to extract auth token from response
function extractAuthTokenFromResponse(body) {
  if (body && (body.authToken || body.token)) {
    window.protectedGlobals.data.authToken = body.authToken || body.token;
  }
}

// auth related stuff
  window.protectedGlobals.zmcdpost = async function (data) {
    const headers = { 'Content-Type': 'application/json' };
    if (window.protectedGlobals.data.authToken) headers['Authorization'] = 'Bearer ' + window.protectedGlobals.data.authToken;
    var res = await fetch(window.protectedGlobals.zmcdserver, {
        method: 'POST',
        headers,
        body: JSON.stringify({
            username: window.protectedGlobals.getCurrentUsernameForRequests(),
            ...data
        })
    });
    let body = await res.json();
    extractAuthTokenFromResponse(body);
    var zmcdErrorMessage = body && body.error ? String(body.error) : "";
    if (res.status === 403 || /denied/i.test(zmcdErrorMessage)) {
      window.protectedGlobals.notification(zmcdErrorMessage || "Access denied.");
    }
    if (res.status === 401) {
      const refilled = await window.protectedGlobals.showSessionExpiredDialog().catch(() => false);
      if (refilled) return await window.protectedGlobals.zmcdpost(data);
      return { error: 'unauthorized' };
    }
    return body;
}
window.protectedGlobals._sessionExpiredPromiseQueue = window.protectedGlobals._sessionExpiredPromiseQueue || [];
window.protectedGlobals._sessionExpiredDialogOpen = window.protectedGlobals._sessionExpiredDialogOpen || false;
window.protectedGlobals.showSessionExpiredDialog = function showSessionExpiredDialog() {
  // Return a promise that resolves true when a session refill occurs,
  // or rejects when the user cancels / chooses Sign In Again.
  if (window.protectedGlobals._sessionExpiredDialogOpen) {
    return new Promise((resolve, reject) => {
      window.protectedGlobals._sessionExpiredPromiseQueue.push({ resolve, reject });
    });
  }

  window.protectedGlobals._sessionExpiredDialogOpen = true;

  const dlg = document.createElement("div");
  dlg.id = "session-expired-dialog";
  Object.assign(dlg.style, {
    position: "fixed",
    left: "50%",
    top: "50%",
    transform: "translate(-50%, -50%)",
    width: "420px",
    maxWidth: "90vw",
    background: window.protectedGlobals.data.dark ? "#222" : "#fff",
    color: window.protectedGlobals.data.dark ? "#fff" : "#000",
    borderRadius: "8px",
    boxShadow: "0 8px 30px rgba(0,0,0,0.3)",
    zIndex: 100002,
    display: "flex",
    flexDirection: "column",
    overflow: "hidden",
    padding: "12px",
  });

  const header = document.createElement("div");
  header.style.display = "flex";
  header.style.alignItems = "center";
  header.style.justifyContent = "space-between";

  const htitle = document.createElement("div");
  htitle.textContent = "Session Expired";
  htitle.style.fontWeight = "600";

  const closeX = document.createElement("button");
  closeX.setAttribute("aria-label", "Close dialog");
  closeX.textContent = "✕";
  Object.assign(closeX.style, {
    border: "none",
    background: "transparent",
    cursor: "pointer",
    width: "32px",
    height: "28px",
    padding: "0",
    display: "grid",
    placeItems: "center",
    lineHeight: "0",
    fontSize: "14px",
  });

  header.append(htitle);
  header.append(closeX);
  dlg.appendChild(header);

  const content = document.createElement("div");
  content.style.padding = "8px 0";
  content.style.fontSize = "13px";
  content.style.flex = "1";
  content.textContent =
    "Your session has expired. Refill using your current session token, or sign in again if needed.";
  dlg.appendChild(content);

  const status = document.createElement("div");
  status.style.fontSize = "12px";
  status.style.minHeight = "16px";
  status.style.marginBottom = "8px";
  dlg.appendChild(status);

  // Password input for password-based refill
  const pwdRow = document.createElement("div");
  pwdRow.style.display = "flex";
  pwdRow.style.gap = "8px";
  pwdRow.style.alignItems = "center";
  pwdRow.style.marginBottom = "8px";

  const pwdInput = document.createElement("input");
  pwdInput.type = "password";
  pwdInput.placeholder = "Account password";
  Object.assign(pwdInput.style, {
    flex: "1",
    padding: "6px",
    borderRadius: "6px",
    border: "1px solid #ccc",
    boxSizing: "border-box",
  });

  pwdRow.appendChild(pwdInput);
  dlg.appendChild(pwdRow);

  const btnRow = document.createElement("div");
  btnRow.style.display = "flex";
  btnRow.style.justifyContent = "flex-end";
  btnRow.style.gap = "8px";

  const reloadBtn = document.createElement("button");
  reloadBtn.textContent = "Sign In Again";
  reloadBtn.style.padding = "6px 10px";

  const refillBtn = document.createElement("button");
  refillBtn.textContent = "Refill Session";
  refillBtn.style.padding = "6px 10px";

  const closeBtn = document.createElement("button");
  closeBtn.textContent = "Close";
  closeBtn.style.padding = "6px 10px";

  btnRow.append(closeBtn, refillBtn, reloadBtn);
  dlg.appendChild(btnRow);

  function rejectAll(reason) {
    try {
      (window.protectedGlobals._sessionExpiredPromiseQueue || []).forEach((p) => {
        try { p.reject(reason); } catch (e) {}
      });
    } finally {
      window.protectedGlobals._sessionExpiredPromiseQueue = [];
    }
  }

  function resolveAll(value) {
    try {
      (window.protectedGlobals._sessionExpiredPromiseQueue || []).forEach((p) => {
        try { p.resolve(value); } catch (e) {}
      });
    } finally {
      window.protectedGlobals._sessionExpiredPromiseQueue = [];
    }
  }

  const cleanupAndReject = (reason) => {
    if (dlg && dlg.remove) dlg.remove();
    window.protectedGlobals._sessionExpiredDialogOpen = false;
    rejectAll(reason || new Error('Session refill canceled'));
  };

  const cleanupAndResolve = (value) => {
    if (dlg && dlg.remove) dlg.remove();
    window.protectedGlobals._sessionExpiredDialogOpen = false;
    resolveAll(value === undefined ? true : value);
  };

  closeX.addEventListener("click", () => cleanupAndReject(new Error('User closed dialog')));
  closeBtn.addEventListener("click", () => cleanupAndReject(new Error('User closed dialog')));
  refillBtn.addEventListener("click", async () => {
    // When user clicks refill, don't attempt token-based refill automatically.
    // Instead prompt for password and only send a password-based refill when provided.
    const uname = (function () {
      const u = window.protectedGlobals.getCurrentUsernameForRequests();
      if (u && typeof u === 'string' && u.trim()) return u.trim();
      return window.protectedGlobals.data.username.trim();
      return '';
    })();

    if (!uname) {
      status.textContent = "No username available. Sign in again.";
      status.style.color = "red";
      return;
    }

    const password = (pwdInput && typeof pwdInput.value === 'string') ? pwdInput.value.trim() : '';

    // If no password provided yet, focus the input and ask the user to enter it.
    if (!password) {
      status.textContent =         "Enter your account password above and click Refill to submit.";
      status.style.color = "#c66";
      pwdInput.focus();
      return;
    }

    // Now send password-based refill request (do not rely on existing session token)
    refillBtn.disabled = true;
    refillBtn.textContent = "Refilling...";
    status.textContent = "";

    try {
      const res = await fetch(window.protectedGlobals.zmcdserver, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({           refillSession: true,           username: uname,           password         }),
      });

      let body = await res.json();

      if (!res.ok) {
        const serverMsg =           (body && body.error) || body || res.statusText || 'unknown error';
        status.textContent = `Session refill failed: ${serverMsg} (HTTP ${res.status})`;
        status.style.color = 'red';
        console.error('Refill failed:', res.status, body);
        refillBtn.disabled = false;
        refillBtn.textContent = 'Refill Session';
        return;
      }

      if (!body || !body.success || !body.authToken) {
        const serverMsg = (body && body.error) || 'Invalid server response';
        status.textContent = `Session refill failed: ${serverMsg}`;
        status.style.color = 'red';
        console.error('Refill unexpected response:', body);
        refillBtn.disabled = false;
        refillBtn.textContent = 'Refill Session';
        return;
      }

      window.protectedGlobals.data.authToken = body.authToken;
      status.textContent = 'Session refilled. You can continue.';
      status.style.color = 'green';
      // resolve queued promises and then remove dialog
      cleanupAndResolve(true);
      return;
    } finally {
      refillBtn.disabled = false;
      refillBtn.textContent = 'Refill Session';
    }
  });
  reloadBtn.addEventListener("click", () => {
    // User chose to sign in again: reject pending promises and trigger rebuild
    window.protectedGlobals.rebuildhandler();
    cleanupAndReject(new Error('User chose to sign in again'));
  });

  document.body.appendChild(dlg);

  // Return a promise for this caller and add to queue so multiple callers
  // all get notified when a refill or cancel happens.
  const p = new Promise((resolve, reject) => {
    window.protectedGlobals._sessionExpiredPromiseQueue.push({ resolve, reject });
  });

  // Also listen for dialog removal via external means (safety): if removed,
  // reject remaining promises.
  const observer = new MutationObserver(() => {
    if (!document.body.contains(dlg)) {
      observer.disconnect();
      if (window.protectedGlobals._sessionExpiredDialogOpen) {
        window.protectedGlobals._sessionExpiredDialogOpen = false;
        rejectAll(new Error('Session dialog removed'));
      }
    }
  });
  observer.observe(document.body, { childList: true });

  return p;
};

window.protectedGlobals.getCurrentUsernameForRequests = function getCurrentUsernameForRequests() {
  return window.protectedGlobals.data.username.trim();
};

window.protectedGlobals.filePost = async function filePost(data) {
  const headers = { "Content-Type": "application/json" };
  if (window.protectedGlobals.data.authToken)
    headers["Authorization"] = "Bearer " + window.protectedGlobals.data.authToken;
  var res = await fetch(window.protectedGlobals.SERVER, {
    method: "POST",
    headers,
    body: JSON.stringify({
      username: window.protectedGlobals.getCurrentUsernameForRequests(),
      ...data,
    }),
  });
  let body = await res.json();
  extractAuthTokenFromResponse(body);
  var fileErrorMessage = body && body.error ? String(body.error) : "";
  if (res.status === 403 || /denied/i.test(fileErrorMessage)) {
    window.protectedGlobals.notification(fileErrorMessage || "Access denied.");
  }
  if (res.status === 401 && !window.protectedGlobals.firstlogin) {
    const refilled = await window.protectedGlobals.showSessionExpiredDialog().catch(() => false);
    if (refilled) return await window.protectedGlobals.filePost(data);
    return { error: "unauthorized" };
  }

  window.protectedGlobals.firstlogin = false;
  return body;
};

window.protectedGlobals.posttaskbuttons = async function posttaskbuttons(data) {
  return await window.protectedGlobals.persistUserProfilePatch({ taskbuttons: data });
};
window.protectedGlobals.downloadPost = async function downloadPost(data) {
  if (data.filename.length > 100) {
    data.filename = data.filename.substring(0, 100) + data.filename.split(".").slice(-1);
    if (data.filename.length > 130) {
      data.filename = "downloaded_file.nametoolong";
    }
  }
  var res = await fetch(window.protectedGlobals.downloadserver, {
    method: "POST",
    headers: (function () {
      const h = { "Content-Type": "application/json" };
      if (window.protectedGlobals.data.authToken)
        h["Authorization"] = "Bearer " + window.protectedGlobals.data.authToken;
      return h;
    })(),
    body: JSON.stringify({
      username: window.protectedGlobals.getCurrentUsernameForRequests(),
      data: data,
      edittaskbuttons: true,
    }),
  });
  let body = await res.json();
  extractAuthTokenFromResponse(body);
  if (res.status === 200) {
    window.protectedGlobals.notification("Download successful! Filename: " + data.filename + ". Check your downloads folder.");
  }
  if (res.status === 401) {
    const refilled = await window.protectedGlobals.showSessionExpiredDialog().catch(() => false);
    if (refilled) return await window.protectedGlobals.downloadPost(data);
    return { error: "unauthorized" };
  }
  return body;
};








// import scripts
window.protectedGlobals.delay = ms => new Promise(resolve => setTimeout(resolve, ms));

window.tmpGlobals = {};
window.tmpGlobals.coreScriptUrls = [
  "/systemfiles/runtime/core/untrustedAppsIframeBg.js",
  "systemfiles/runtime/helpers/coreVariables.js",
  "systemfiles/runtime/helpers/fsFunctions.js",
  "systemfiles/runtime/helpers/appHelperFunctions.js",
  "systemfiles/runtime/helpers/miscFunctions.js",
  "systemfiles/runtime/core/runtimeWindowSystem.js",
  "systemfiles/runtime/core/appLoader.js",
  "systemfiles/runtime/helpers/initapptools.js",
  "systemfiles/runtime/helpers/cleanupfunctions.js",
  "systemfiles/runtime/core/startMenu.js",
  "systemfiles/runtime/core/processes.js",
  "systemfiles/runtime/core/goldenbody.js"
];
window.tmpGlobals.coreESMUrls = [
  "systemfiles/runtime/helpers/screenshot-esm.js",
  "systemfiles/runtime/core/screenshot-esm.js"
];
window.tmpGlobals.scriptContents = [];
window.tmpGlobals.loadCoreScriptsSequentially = async function() {
  for (const element of window.tmpGlobals.coreScriptUrls) {
    let f = await window.protectedGlobals.ReadFile(element, { text: true, direct: true });
    if (typeof f !== 'string') continue;
    var script = document.createElement('script');
    script.type = 'text/javascript';
    script.textContent = f;
    window.tmpGlobals.scriptContents.push(script);
  }
};

// Load core scripts sequentially by injecting script elements (avoids eval).
(async function() {
await window.tmpGlobals.loadCoreScriptsSequentially();
for (const script of window.tmpGlobals.scriptContents) {
    document.head.appendChild(script);
}
})();
// import ESM scripts
(async function() {
  let firstObjectUrl = '';
for (const element of window.tmpGlobals.coreESMUrls) {
  let f = await window.protectedGlobals.ReadFile(element, { text: true, direct: true });
  if (typeof f !== 'string') continue;
  if (firstObjectUrl) {
    let replaceStart = f.indexOf('<') - 1;
    let replaceEnd = f.indexOf('>', replaceStart) + 1;
    if (replaceStart !== -2 && replaceEnd !== 0) {
      let importPath = f.substring(replaceStart + 1, replaceEnd).trim();
      if (importPath.startsWith('/')) {
        importPath = importPath.substring(1);
      }
      const newImportPath = firstObjectUrl;
      f = f.substring(0, replaceStart + 1) + newImportPath + f.substring(replaceEnd);
    }
  }
  const script = document.createElement('script');
  script.type = 'module';
  const URL = window.URL.createObjectURL(new Blob([f], { type: 'text/javascript' }));
  firstObjectUrl = firstObjectUrl || URL;
  script.src = URL;
  document.head.appendChild(script);
}

})();
// if u wanna keep it just remove the next line
delete window.tmpGlobals.coreScriptUrls;



// this is not required, just a image
document.documentElement.style.height = "100%";

document.body.style.margin = "0";
document.body.style.height = "100vh";
window.protectedGlobals.refreshBackground = async function refreshBackground() {
  let backgroundBuffer = await window.protectedGlobals.ReadFile("/systemfiles/background/background.png", { buffer: true, direct: true });
  if (!backgroundBuffer) {
      backgroundBuffer = await window.protectedGlobals.ReadFile("/systemfiles/background/origbackground.png", { buffer: true, direct: true });
  }

  if (window.protectedGlobals._desktopBackgroundObjectUrl) {
    URL.revokeObjectURL(window.protectedGlobals._desktopBackgroundObjectUrl);
    delete window.protectedGlobals._desktopBackgroundObjectUrl;
  }

  if (backgroundBuffer instanceof ArrayBuffer) {
    const blob = new Blob([backgroundBuffer], { type: "image/png" });
    const url = URL.createObjectURL(blob);
    window.protectedGlobals._desktopBackgroundObjectUrl = url;
    document.body.style.backgroundImage = `url(${url})`;
  } else {
    document.body.style.backgroundImage = "";
  }
};
window.protectedGlobals.setBodyBackground = window.protectedGlobals.refreshBackground;
window.protectedGlobals.changeBackground = async function changeBackground() {
  try {
    const selectedPath = await window.protectedGlobals.pickFile({ accept: "file", startPath: "/" }).catch((e) => {
      console.error("Failed to open background picker", e);
      window.protectedGlobals.notification("Failed to open background picker.");
      return null;
    });
    if (!selectedPath) {
      window.protectedGlobals.notification("No image selected.");
      return false;
    }

    const backgroundBuffer = await window.protectedGlobals.ReadFile(selectedPath, { buffer: true, direct: true });
    if (!backgroundBuffer) {
      window.protectedGlobals.notification?.("Could not read the selected image.");
      return false;
    }

    await window.protectedGlobals.DeleteFile("systemfiles/background/background.png").catch(() => {});
    await window.protectedGlobals.WriteFile("systemfiles/background/background.png", backgroundBuffer, { replace: true });
    await window.protectedGlobals.refreshBackground();
    window.protectedGlobals.notification?.("Background updated.");
    return true;
  } catch (e) {
    console.error("Failed to change background", e);
    window.protectedGlobals.notification?.("Failed to change background.");
    return false;
  }
};
window.protectedGlobals.resetBackground = async function resetBackground() {
  try {
    await window.protectedGlobals.DeleteFile("systemfiles/background/background.png").catch(() => {});
    await window.protectedGlobals.refreshBackground();
    window.protectedGlobals.notification?.("Background reset.");
    return true;
  } catch (e) {
    console.error("Failed to reset background", e);
    window.protectedGlobals.notification?.("Failed to reset background.");
    return false;
  }
};
window.protectedGlobals.refreshBackground();
document.body.style.backgroundSize = "cover";
document.body.style.backgroundPosition = "center";
document.body.style.backgroundRepeat = "no-repeat";




// Scroll lock - ensure single binding
window.protectedGlobals.systemAPIs = window.protectedGlobals.systemAPIs || {};
if (window.protectedGlobals.systemAPIs.onScroll)
  window.removeEventListener("scroll", window.protectedGlobals.systemAPIs.onScroll);
window.protectedGlobals.systemAPIs.onScroll = () => {
  window.scrollTo(window.protectedGlobals.savedScrollX, window.protectedGlobals.savedScrollY);
};
window.addEventListener("scroll", window.protectedGlobals.systemAPIs.onScroll);

window.protectedGlobals.savedScrollX = window.scrollX;
window.protectedGlobals.savedScrollY = window.scrollY;

// body restrictions
window.protectedGlobals.bodyStyle = document.createElement("style");
window.protectedGlobals.bodyStyle.textContent = `body {
overflow: hidden;
}`;
document.body.appendChild(window.protectedGlobals.bodyStyle);
// Desktop background context menu
window.protectedGlobals.showBackgroundContextMenu = function (x, y) {
  let menu = document.getElementById("desktop-background-context-menu");
  if (menu) menu.remove();

  menu = document.createElement("div");
  menu.id = "desktop-background-context-menu";
  Object.assign(menu.style, {
    position: "fixed",
    left: x + "px",
    top: y + "px",
    zIndex: 100002,
    minWidth: "180px",
    padding: "6px",
    borderRadius: "8px",
    background: window.protectedGlobals.data.dark ? "#1a1a1a" : "#ffffff",
    color: window.protectedGlobals.data.dark ? "#ffffff" : "#111111",
    border: window.protectedGlobals.data.dark ? "1px solid rgba(255,255,255,0.12)" : "1px solid rgba(0,0,0,0.12)",
    boxShadow: "0 10px 24px rgba(0,0,0,0.25)",
    fontFamily: "system-ui, -apple-system, sans-serif",
    fontSize: "13px",
  });

  const addItem = (label, handler) => {
    const row = document.createElement("div");
    row.textContent = label;
    Object.assign(row.style, {
      padding: "8px 10px",
      borderRadius: "6px",
      cursor: "pointer",
    });
    row.onmouseenter = () => {
      row.style.background = window.protectedGlobals.data.dark ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.05)";
    };
    row.onmouseleave = () => {
      row.style.background = "transparent";
    };
    row.onclick = async () => {
      menu.remove();
      if (handler) await handler();
    };
    menu.appendChild(row);
  };

  addItem("Change background", async () => {
    await window.protectedGlobals.changeBackground();
  });

  addItem("Reset background", async () => {
    await window.protectedGlobals.resetBackground();
  });

  document.body.appendChild(menu);
};

window.addEventListener("contextmenu", (e) => {
  if (e.target !== document.body) {
    return;
  }
  const interactiveTarget = e.target && e.target.closest && e.target.closest("input, textarea, select, button, a, [contenteditable='true'], .app-window-root, .taskbar");
  if (interactiveTarget) return;
  if (e.target && e.target !== document.body && e.target !== document.documentElement && !document.body.contains(e.target)) {
    return;
  }
  e.preventDefault();
  window.protectedGlobals.showBackgroundContextMenu(e.clientX, e.clientY);
});

document.addEventListener("click", () => {
  const menu = document.getElementById("desktop-background-context-menu");
  if (menu) menu.remove();
}, true);

document.addEventListener("keydown", (e) => {
  if (e.key === "Escape") {
    const menu = document.getElementById("desktop-background-context-menu");
    if (menu) menu.remove();
  }
});

// prevent apps from doing window.top.location.reload()
  window.addEventListener(
    "beforeunload",
    (e) => e.preventDefault()
  );


window.protectedGlobals.deleteApp = async function (obj) {
  window.protectedGlobals.DeleteFolder(`/systemfiles/runtime/apps/${obj.folderName}`);
  for (const element of window.protectedGlobals.apps) {
    if (element.id == obj.id) {
      try {
        window[element.globalVarObjectString][element.allAppArrayString][0].closeAll();
      } catch {
        // no instance of the app is running, so nothing to close
      }
      window.protectedGlobals.knownAppStuff.knownAppId.splice(window.protectedGlobals.knownAppStuff.knownAppId.indexOf(element.id), 1);
      window.protectedGlobals.knownAppStuff.knownAppGlobals.splice(window.protectedGlobals.knownAppStuff.knownAppGlobals.indexOf(element.globalVarObjectString), 1);
      window.protectedGlobals.knownAppStuff.knownAppFuncs.splice(window.protectedGlobals.knownAppStuff.knownAppFuncs.indexOf(element.functionName), 1);
      window.protectedGlobals.renderAppsGrid();
      [...window.protectedGlobals.taskbuttonsContainer.querySelectorAll("button")].forEach(b => {
        if (b.dataset.appId === element.id) b.remove();
        window.protectedGlobals.taskbuttons = [...window.protectedGlobals.taskbuttonsContainer.querySelectorAll("button")];
      });
      window.protectedGlobals.persistUserProfilePatch({ taskbuttons: window.protectedGlobals.data.taskbuttons });
      window.protectedGlobals._startMenuConfig.pinnedApps.splice(window.protectedGlobals._startMenuConfig.pinnedApps.indexOf(element.id), 1);
      window.protectedGlobals._startMenuConfig.recents.splice(window.protectedGlobals._startMenuConfig.recents.indexOf(element.id), 1);
      window.protectedGlobals.saveStartMenuConfig();
      delete window[element.globalVarObjectString];
      delete window[element.functionName];
      try { window.protectedGlobals.workers[element.id]?.terminate(); }
      catch {
        // this app have no worker, so nothing to terminate
      }
      window.protectedGlobals.apps.splice(window.protectedGlobals.apps.indexOf(element), 1);
    }
  }
};

window.protectedGlobals.installApp = async function (folderName) {
  await window.protectedGlobals.onlyloadTree();
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
  appFolders.forEach(async (f) => {
    if (f[0] === folderName) {
      let appData = await window.protectedGlobals.extractAppData(f);
      window.protectedGlobals.apps.sort((a, b) => a.label.localeCompare(b.label));
      window.protectedGlobals.initAppRuntimeState(appData);
      window.protectedGlobals.apps.push(appData);
    }
  });
  window.protectedGlobals.renderAppsGrid();
};







window.protectedGlobals.isProtectedAppGlobalName = function isProtectedAppGlobalName(name) {
  if (!name || typeof name !== "string") return false;
  return (
    /Globals$/.test(name) ||
    name === "apps" ||
    name === "systemAPIs" ||
    name === "cmf" ||
    name === "cmfl1"
  );
};

window.protectedGlobals.writeStatus = function writeStatus() {
  window.protectedGlobals.WriteFile('/systemfiles/userprofile/statusData.json', JSON.stringify(window.protectedGlobals.statusData), { text: true });
};


  // Load app permissions
  window.protectedGlobals.appPerms = {};
  (async () => {
    try {
      const appPermsFile = await window.protectedGlobals.ReadFile('/systemfiles/userprofile/appPermissions.json', { text: true, direct: true }).catch(() => null);
      if (appPermsFile) {
        window.protectedGlobals.appPerms = JSON.parse(appPermsFile) || {};
      }
    } catch (e) {
      console.log("Could not load app permissions:", e);
      window.protectedGlobals.appPerms = {};
    }
  })();

  function buildPickerSelectionState({
    selected,
    clickedPath,
    clickedIndex,
    anchorIndex = -1,
    allEntries = [],
    event = {},
    allowMultiple = true,
  }) {
    const nextSelection = new Set(selected || []);
    const hasShift = !!(event && event.shiftKey);
    const hasModifier = !!(event && (event.ctrlKey || event.metaKey));

    if (!allowMultiple) {
      const singleSelection = new Set();
      singleSelection.add(clickedPath);
      return singleSelection;
    }

    if (hasShift) {
      const start = anchorIndex >= 0 ? anchorIndex : clickedIndex;
      const end = clickedIndex;
      const [from, to] = [start, end].sort((a, b) => a - b);
      const rangeSelection = new Set();
      const entries = Array.isArray(allEntries) ? allEntries : [];
      for (let index = from; index <= to; index += 1) {
        const entry = entries[index];
        if (entry && entry.path) rangeSelection.add(entry.path);
      }
      return rangeSelection;
    }

    if (hasModifier) {
      if (nextSelection.has(clickedPath)) {
        nextSelection.delete(clickedPath);
      } else {
        nextSelection.add(clickedPath);
      }
      return nextSelection;
    }

    const singleSelection = new Set();
    singleSelection.add(clickedPath);
    return singleSelection;
  }

  window.protectedGlobals.buildPickerSelectionState = buildPickerSelectionState;

  // accept file/folder
  // return path or array of paths
  // a ui that lets the user pick a file/folder from their cloud storage
  window.protectedGlobals.pickFile = async function (options = { multiple: false, accept: "file" }) {
    await window.protectedGlobals.onlyloadTree();
    options = Object.assign({ multiple: false, accept: "file", startPath: "/" }, options);

    return new Promise((resolve, reject) => {
      const isDark = window.protectedGlobals.data.dark || false;

      // Create modal container
      const modal = document.createElement("div");
      modal.id = "filePickerModal";
      modal.style.cssText = `
        position: fixed;
        top: 0;
        left: 0;
        right: 0;
        bottom: 0;
        background: rgba(0, 0, 0, 0.5);
        display: flex;
        align-items: center;
        justify-content: center;
        z-index: 10000;
        font-family: system-ui, -apple-system, sans-serif;
      `;

      // Create picker dialog
      const dialog = document.createElement("div");
      dialog.style.cssText = `
        width: 600px;
        max-height: 80vh;
        border-radius: 8px;
        display: flex;
        flex-direction: column;
        box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
        overflow: hidden;
        background: ${isDark ? "#1e1e1e" : "#ffffff"};
        color: ${isDark ? "#ffffff" : "#000000"};
      `;

      // Header
      const header = document.createElement("div");
      header.style.cssText = `
        padding: 16px;
        border-bottom: 1px solid ${isDark ? "#333333" : "#e0e0e0"};
        display: flex;
        justify-content: space-between;
        align-items: center;
      `;

      const titleSpan = document.createElement("span");
      titleSpan.textContent = "Select " + (options.accept === "folder" ? "Folder" : options.accept === "file" ? "File" : "File or Folder");
      titleSpan.style.fontSize = "16px";
      titleSpan.style.fontWeight = "600";
      header.appendChild(titleSpan);

      const closeBtn = document.createElement("button");
      closeBtn.innerHTML = window.protectedGlobals.windowControlSvgs.close;
      closeBtn.style.cssText = `
        background: none;
        border: none;
        cursor: pointer;
        padding: 4px;
        color: ${isDark ? "#cccccc" : "#333333"};
        display: flex;
        align-items: center;
        justify-content: center;
        width: 24px;
        height: 24px;
      `;
      closeBtn.onclick = () => {
        modal.remove();
        resolve(options.multiple ? [] : null);
      };
      header.appendChild(closeBtn);
      dialog.appendChild(header);

      // Path display
      const pathBar = document.createElement("div");
      pathBar.style.cssText = `
        padding: 12px 16px;
        background: ${isDark ? "#252525" : "#f5f5f5"};
        border-bottom: 1px solid ${isDark ? "#333333" : "#e0e0e0"};
        font-size: 12px;
        color: ${isDark ? "#aaaaaa" : "#666666"};
        word-break: break-all;
      `;
      pathBar.textContent = "Current: " + options.startPath;
      dialog.appendChild(pathBar);

      // File browser area
      const browserContainer = document.createElement("div");
      browserContainer.style.cssText = `
        flex: 1;
        overflow-y: auto;
        padding: 8px 0;
      `;
      dialog.appendChild(browserContainer);

      // Selection state
      const selected = new Set();
      let currentPath = options.startPath || "/";
      let selectionAnchorIndex = -1;

      // Update path bar
      const updatePathBar = () => {
        pathBar.textContent = "Current: " + currentPath;
      };

      const getEntriesFromTreeData = (treePath) => {
        if (!window.protectedGlobals.treeData) return null;
        const node = window.protectedGlobals.findNodeByPath ? window.protectedGlobals.findNodeByPath(treePath) : null;
        if (!node || !Array.isArray(node[1])) return null;

        return node[1].map((child) => {
          if (!Array.isArray(child)) {
            return { raw: child, name: "", folder: false };
          }

          const name = typeof child[0] === "string" ? child[0] : "";
          const folder = Array.isArray(child[1]);
          return { raw: child, name, folder };
        });
      };

      // Load and render folder contents
      const loadFolder = async (path) => {
        browserContainer.innerHTML = '<div style="padding: 16px; text-align: center; color: ' + (isDark ? "#aaa" : "#666") + ';">Loading...</div>';
        try {
          let files = getEntriesFromTreeData(path);
          if (!files) {
            files = await window.protectedGlobals.ReadFolder(path).catch(() => []);
          }

          selected.clear();
          selectionAnchorIndex = -1;
          currentPath = path;
          updatePathBar();
          renderFiles(files, path);
        } catch (e) {
          browserContainer.innerHTML = '<div style="padding: 16px; color: #e74c3c;">Error loading folder: ' + e.message + '</div>';
        }
      };

      // Render file list
      const renderFiles = (files, path) => {
        browserContainer.innerHTML = "";

        if (path !== "/" && path !== "") {
          const parentItem = document.createElement("div");
          parentItem.style.cssText = `
            padding: 12px 16px;
            display: flex;
            align-items: center;
            cursor: pointer;
            background: ${isDark ? "#252525" : "#fafafa"};
            border-bottom: 1px solid ${isDark ? "#333333" : "#e0e0e0"};
          `;
          parentItem.onmouseover = () => parentItem.style.background = isDark ? "#333333" : "#f0f0f0";
          parentItem.onmouseout = () => parentItem.style.background = isDark ? "#252525" : "#fafafa";
          parentItem.ondblclick = () => {
            const newPath = path.split("/").slice(0, -1).join("/") || "/";
            loadFolder(newPath);
          };

          const parentIcon = document.createElement("span");
          parentIcon.innerHTML = window.protectedGlobals.windowControlSvgs.close.replace("width=\"14\"", "width=\"16\"").replace("height=\"14\"", "height=\"16\"");
          parentIcon.style.cssText = `
            width: 20px;
            height: 20px;
            margin-right: 12px;
            display: flex;
            align-items: center;
            justify-content: center;
            color: ${isDark ? "#aaa" : "#666"};
            transform: rotate(45deg);
          `;
          parentItem.appendChild(parentIcon);

          const parentText = document.createElement("span");
          parentText.textContent = "..";
          parentText.style.cssText = `
            font-size: 13px;
            color: ${isDark ? "#aaa" : "#666"};
          `;
          parentItem.appendChild(parentText);

          parentItem.onclick = (event) => {
            event.stopPropagation();
          };

          browserContainer.appendChild(parentItem);
        }

        if (!files || files.length === 0) {
          const emptyMsg = document.createElement("div");
          emptyMsg.style.cssText = `padding: 16px; text-align: center; color: ${isDark ? "#aaa" : "#999"};`;
          emptyMsg.textContent = "Folder is empty";
          browserContainer.appendChild(emptyMsg);
          return;
        }

        // Normalize entries returned from ReadFolder.
        // ReadFolder can return strings (names), arrays ([name, children,...]) or objects ({ name, folder }).
        const normalized = (files || []).map((file) => {
          let name = "";
          let isFolder = false;
          if (typeof file === "string") {
            name = file;
            isFolder = true; // assume folder for string entries; we'll probe on click
          } else if (Array.isArray(file)) {
            name = String(file[0] || "");
            isFolder = Array.isArray(file[1]);
          } else if (file && typeof file === "object") {
            name = String(file.name || file.filename || file[0] || "");
            isFolder = !!file.folder || !!file.isFolder || false;
          }
          return { raw: file, name, folder: !!isFolder };
        });

        const folders = normalized.filter((f) => f.folder);
        const filelist = normalized.filter((f) => !f.folder);

        const sortedFiles = [
          ...folders.sort((a, b) => String(a.name || "").localeCompare(String(b.name || ""))),
          ...filelist.sort((a, b) => String(a.name || "").localeCompare(String(b.name || ""))),
        ];
        const selectionEntries = sortedFiles.map((entry) => ({
          ...entry,
          path: path === "/" ? "/" + (entry.name || "") : path + "/" + (entry.name || ""),
        }));

        sortedFiles.forEach((file, index) => {
          const item = document.createElement("div");
          const isFolder = !!file.folder;
          const name = file.name || "";
          const filePath = path === "/" ? "/" + name : path + "/" + name;
          const isSelected = selected.has(filePath);
          const isFolderMode = options.accept === "folder";
          const isEnabledItem = !isFolderMode || isFolder;

          item.style.cssText = `
            padding: 12px 16px;
            display: flex;
            align-items: center;
            cursor: ${isEnabledItem ? "pointer" : "not-allowed"};
            opacity: ${isEnabledItem ? "1" : "0.45"};
            border-bottom: 1px solid ${isDark ? "#333333" : "#e0e0e0"};
            background: ${isSelected ? (isDark ? "#0e639c" : "#e3f2fd") : (isDark ? "#1e1e1e" : "#ffffff")};
          `;

          item.onmouseover = () => {
            if (!isEnabledItem || isSelected) return;
            item.style.background = isDark ? "#252525" : "#f5f5f5";
          };
          item.onmouseout = () => {
            if (!isEnabledItem || isSelected) return;
            item.style.background = isDark ? "#1e1e1e" : "#ffffff";
          };

          // Icon
          const icon = document.createElement("span");
          icon.style.cssText = `
            width: 20px;
            height: 20px;
            margin-right: 12px;
            display: flex;
            align-items: center;
            justify-content: center;
            flex-shrink: 0;
            color: ${isDark ? "#dcdcdc" : "#000000"};
          `;
          const iconMarkup = isFolder
            ? (window.protectedGlobals.fileIconSet?.folder || window.protectedGlobals.fileIconSet?.file)
            : (window.protectedGlobals.fileIconSet?.file || window.protectedGlobals.fileIconSet?.folder);
          icon.innerHTML = iconMarkup;
          item.appendChild(icon);

          // Filename
          const nameSpan = document.createElement("span");
          nameSpan.textContent = name;
          nameSpan.style.cssText = `
            flex: 1;
            font-size: 13px;
            color: ${isDark ? "#ffffff" : "#000000"};
            white-space: nowrap;
            overflow: hidden;
            text-overflow: ellipsis;
          `;
          item.appendChild(nameSpan);

          item.ondblclick = async (e) => {
            if (!isFolder) return;
            if (typeof file.raw === "string") {
              const probe = await window.protectedGlobals.ReadFolder(filePath).catch(() => null);
              if (Array.isArray(probe)) {
                loadFolder(filePath);
              }
              return;
            }
            loadFolder(filePath);
          };

          // Click handler
          item.onclick = async (e) => {
            if (isFolderMode && !isFolder) {
              e.preventDefault();
              e.stopPropagation();
              return;
            }

            if (isFolder) {
              if (isFolderMode) {
                const nextSelection = buildPickerSelectionState({
                  selected,
                  clickedPath: filePath,
                  clickedIndex: index,
                  anchorIndex: selectionAnchorIndex,
                  allEntries: selectionEntries,
                  event: e,
                  allowMultiple: !!options.multiple,
                });
                selected.clear();
                nextSelection.forEach((entryPath) => selected.add(entryPath));
                selectionAnchorIndex = index;
                renderFiles(files, path);
                return;
              }
              e.preventDefault();
              e.stopPropagation();
              return;
            }

            const nextSelection = buildPickerSelectionState({
              selected,
              clickedPath: filePath,
              clickedIndex: index,
              anchorIndex: selectionAnchorIndex,
              allEntries: selectionEntries,
              event: e,
              allowMultiple: !!options.multiple,
            });
            selected.clear();
            nextSelection.forEach((entryPath) => selected.add(entryPath));
            selectionAnchorIndex = index;
            renderFiles(files, path);
          };

          browserContainer.appendChild(item);
        });
      };

      // Footer
      const footer = document.createElement("div");
      footer.style.cssText = `
        padding: 16px;
        border-top: 1px solid ${isDark ? "#333333" : "#e0e0e0"};
        display: flex;
        gap: 8px;
        justify-content: flex-end;
      `;

      const cancelBtn = document.createElement("button");
      cancelBtn.textContent = "Cancel";
      cancelBtn.style.cssText = `
        padding: 8px 16px;
        border: 1px solid ${isDark ? "#666666" : "#cccccc"};
        background: ${isDark ? "#2d2d2d" : "#f5f5f5"};
        color: ${isDark ? "#ffffff" : "#000000"};
        border-radius: 4px;
        cursor: pointer;
        font-size: 13px;
      `;
      cancelBtn.onmouseover = () => cancelBtn.style.background = isDark ? "#3d3d3d" : "#eeeeee";
      cancelBtn.onmouseout = () => cancelBtn.style.background = isDark ? "#2d2d2d" : "#f5f5f5";
      cancelBtn.onclick = () => {
        modal.remove();
        resolve(options.multiple ? [] : null);
      };
      footer.appendChild(cancelBtn);

      const selectBtn = document.createElement("button");
      selectBtn.textContent = "Select";
      selectBtn.style.cssText = `
        padding: 8px 16px;
        border: none;
        background: #0e639c;
        color: #ffffff;
        border-radius: 4px;
        cursor: pointer;
        font-size: 13px;
      `;
      selectBtn.onmouseover = () => selectBtn.style.background = "#1177bb";
      selectBtn.onmouseout = () => selectBtn.style.background = "#0e639c";
      selectBtn.onclick = () => {
        modal.remove();
        if (options.multiple) {
          resolve(Array.from(selected));
        } else {
          resolve(selected.size > 0 ? Array.from(selected)[0] : null);
        }
      };
      footer.appendChild(selectBtn);
      dialog.appendChild(footer);

      // Add to page
      modal.appendChild(dialog);
      document.body.appendChild(modal);

      // Update theme on styleapplied event
      const updateTheme = () => {
        const newIsDark = window.protectedGlobals.data.dark || false;
        if (newIsDark !== isDark) {
          // Recreate the dialog with new theme
          modal.remove();
          window.protectedGlobals.pickFile(options).then(resolve).catch(reject);
        }
      };

      window.addEventListener("styleapplied", updateTheme);

      // Cleanup listener when modal closes
      const observer = new MutationObserver(() => {
        if (!document.body.contains(modal)) {
          window.removeEventListener("styleapplied", updateTheme);
          observer.disconnect();
        }
      });
      observer.observe(document.body, { childList: true });

      // Load initial folder
      loadFolder(options.startPath || "/");
    });
  };

window.protectedGlobals.sendMsgToAllIframes = (msg) => {
  const iframes = document.querySelectorAll("iframe");
  iframes.forEach((iframe) => {
    iframe.contentWindow.postMessage(msg, "*");
  });
};
(async () => {
  window.protectedGlobals.erudaText = await window.protectedGlobals.ReadFile('/systemfiles/runtime/helpers/eruda.min.js', { text: true, direct: true });
  window.protectedGlobals.fflateText = await window.protectedGlobals.ReadFile('/systemfiles/runtime/helpers/unzip.min.js', { text: true, direct: true });
})();
window.addEventListener("contextmenu", (e) => {e.preventDefault();});