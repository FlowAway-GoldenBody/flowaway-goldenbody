"use strict";
// Preserve protected runtime data if already set (e.g., from ouchbad.js account creation), otherwise initialize
// absolutely no hardcoded app names allowed! all apps should be installed and theres no way to predict their name and structure in advance, so we must not bake in any assumptions here. we will rely on dynamic detection and labeling based on heuristics instead.
// i mean by no if(appId === 'browser') or similar checks anywhere in the core (flowaway.js/goldenbody.js). its not allowed!

// all added global system vars are in the protectedglobals namespace, no exceptions. this is to avoid conflicts with apps and to make it clear what is part of the core system vs what is app-level.
// ----------------- Convenience file helpers -----------------
// These wrap the existing `filePost` API so apps can easily perform
// common VFS actions. Responses are the raw server responses; use
window.protectedGlobals.missingFolders = window.protectedGlobals.missingFolders || new Set();


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
  const directions = [{ edit: true, path: String(relPath), addFolder: true }, { end: true }];
  const res = await window.protectedGlobals.filePost({ saveSnapshot: true, directions });
  if (res && res.success) {
    window.protectedGlobals.missingFolders.delete(relPath);
  }
  return res;
}
window.protectedGlobals.FolderExists = async function (relPath) {
  if (!relPath) throw new Error("No path");
  const res = await window.protectedGlobals.filePost({saveSnapshot: true, directions: [{ checkFolder: true, path: String(relPath) }] });
  if (res && res.exists) {
    return true;
  } else {
    return false;
  }
}
window.protectedGlobals.FileExists = async function (relPath) {
  if (!relPath) throw new Error("No path");
  const res = await window.protectedGlobals.filePost({ saveSnapshot: true, directions: [{ checkFile: true, path: String(relPath) }] });
  if (res && res.exists) {
    return true;
  } else {
    return false;
  }
}
window.protectedGlobals.ReadFile = async function (relPath, options = { text: true }) {
  if (!relPath) throw new Error("No path");

  options = Object.assign(
    {
      text: true,
      buffer: false,
      direct: false,
      largeFile: false,
    },
    options,
  );

  const isBuffer = !!options.buffer;
  const isText = !isBuffer && options.text !== false;
  const useLargeFile = !!options.largeFile;

  const headers = { "Content-Type": "application/json" };
  if (window.protectedGlobals.data && window.protectedGlobals.data.authToken) {
    headers["Authorization"] = "Bearer " + window.protectedGlobals.data.authToken;
  }

  async function requestChunk(chunkIndex) {
    const response = await fetch(window.protectedGlobals.SERVER, {
      method: "POST",
      headers,
      body: JSON.stringify({
        username: window.protectedGlobals.getCurrentUsernameForRequests(),
        requestFile: true,
        requestFileName: String(relPath),
        chunkIndex,
        buffer: isBuffer,
        text: isText,
      }),
    });

    if (response.status === 401) {
      window.protectedGlobals.showSessionExpiredDialog();
      return { unauthorized: true };
    }

    const contentType = (response.headers.get("content-type") || "").toLowerCase();
    if (contentType.includes("application/json")) {
      return { json: await response.json() };
    }

    const rawChunk = await response.arrayBuffer();
    return {
      rawChunk,
      meta: {
        fileSize: Number(response.headers.get("x-file-size") || "0"),
        chunkIndex: Number(response.headers.get("x-chunk-index") || "0"),
        isLastChunk: response.headers.get("x-is-last-chunk") === "1",
        totalChunks: Number(response.headers.get("x-total-chunks") || "0"),
      },
    };
  }

  const initialResponse = await requestChunk(0);
  if (initialResponse.unauthorized) return;
  if (initialResponse.json) {
    if (initialResponse.json && initialResponse.json.missing) return undefined;
    return initialResponse.json;
  }

  if (useLargeFile) {
    const fileSize = initialResponse.meta.fileSize;
    const totalChunks = initialResponse.meta.totalChunks;
    const decoder = isText ? new TextDecoder() : null;
    let currentChunkIndex = 0;
    let finished = false;

    function enqueueChunk(controller, rawChunk, isLastChunk) {
      if (isText) {
        controller.enqueue(decoder.decode(new Uint8Array(rawChunk), { stream: !isLastChunk }));
      } else {
        controller.enqueue(new Uint8Array(rawChunk));
      }
      if (isLastChunk) {
        finished = true;
        controller.close();
      }
    }

    return {
      largeFile: true,
      fileSize,
      totalChunks,
      stream: new ReadableStream({
        async start(controller) {
          enqueueChunk(controller, initialResponse.rawChunk, initialResponse.meta.isLastChunk);
          if (initialResponse.meta.isLastChunk) return;
          currentChunkIndex = 1;
        },
        async pull(controller) {
          if (finished) return;
          const response = await requestChunk(currentChunkIndex);
          if (response.unauthorized) {
            controller.error(new Error("Unauthorized"));
            return;
          }
          if (response.json) {
            controller.error(new Error(response.json.error || "Failed to stream file"));
            return;
          }

          enqueueChunk(controller, response.rawChunk, response.meta.isLastChunk);
          currentChunkIndex += 1;
        },
        cancel() {
          finished = true;
        },
      }),
    };
  }

  const fileSize = initialResponse.meta.fileSize;
  const totalChunks = initialResponse.meta.totalChunks;

  if (totalChunks === 1) {
    const rawChunk = initialResponse.rawChunk;
    if (isBuffer) return rawChunk;
    if (isText) return new TextDecoder().decode(rawChunk);
    if (options.direct) return rawChunk;
    return {
      ...initialResponse.meta,
      filecontent: rawChunk,
    };
  }

  if (isText) {
    const decoder = new TextDecoder();
    let text = decoder.decode(new Uint8Array(initialResponse.rawChunk), { stream: true });
    let nextIndex = 1;

    while (true) {
      const response = await requestChunk(nextIndex);
      if (response.unauthorized) return;
      if (response.json) {
        if (response.json && response.json.missing) return undefined;
        return response.json;
      }

      const isLast = response.meta.isLastChunk;
      text += decoder.decode(new Uint8Array(response.rawChunk), { stream: !isLast });
      if (isLast) break;
      nextIndex += 1;
    }
    return text + decoder.decode();
  }

  const fullBuffer = new Uint8Array(fileSize);
  fullBuffer.set(new Uint8Array(initialResponse.rawChunk), 0);
  let offset = initialResponse.rawChunk.byteLength;
  let nextIndex = 1;

  while (true) {
    const response = await requestChunk(nextIndex);
    if (response.unauthorized) return;
    if (response.json) {
      if (response.json && response.json.missing) return undefined;
      return response.json;
    }

    fullBuffer.set(new Uint8Array(response.rawChunk), offset);
    offset += response.rawChunk.byteLength;
    if (response.meta.isLastChunk) break;
    nextIndex += 1;
  }

  if (options.direct) return fullBuffer.buffer;
  return {
    fileSize,
    chunkIndex: totalChunks - 1,
    isLastChunk: true,
    totalChunks,
    filecontent: fullBuffer.buffer,
  };
};
window.protectedGlobals.ReadFolder = async function (relPath) {
  if (!relPath) throw new Error("No path");
  let res = await window.protectedGlobals.filePost({
    requestFolder: true,
    requestFolderName: String(relPath),
  });
  return res.files;
}
window.protectedGlobals.WriteFile = async function (relPath, contents, options = { replace: true }) {
  // remove the 1st 4 char if it is "root" because legacy code may have added "root" to the path, but the server expects paths relative to the root, not starting with "root"
  if (relPath.startsWith("root")) {
    relPath = relPath.slice(4);
  }
  if (!relPath) throw new Error("No path");

  const raw = (contents instanceof ArrayBuffer || ArrayBuffer.isView(contents))
    ? contents instanceof ArrayBuffer
      ? new Uint8Array(contents)
      : new Uint8Array(contents.buffer, contents.byteOffset, contents.byteLength)
    : new TextEncoder().encode(String(contents || ""));

  const headers = {
    "Content-Type": "application/octet-stream",
    "X-File-Action": "write",
    "X-File-Path": String(relPath),
    "X-File-Replace": options.replace !== false ? "true" : "false",
    "X-Username": window.protectedGlobals.getCurrentUsernameForRequests(),
  };
  if (window.protectedGlobals.data && window.protectedGlobals.data.authToken) {
    headers["Authorization"] = "Bearer " + window.protectedGlobals.data.authToken;
  }

  const response = await fetch(window.protectedGlobals.SERVER, {
    method: "POST",
    headers,
    body: raw,
  });

  const body = await response.json();
  if (response.status === 401 && !window.protectedGlobals.firstlogin) {
    window.protectedGlobals.showSessionExpiredDialog();
    return body || { error: "unauthorized" };
  }

  window.protectedGlobals.queueOnlyLoadTreeRefresh();
  return body;
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

// clipboardItems: array of { path: 'root/dir/file', isCut: true|false }
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

// Helper function to extract auth token from response
function extractAuthTokenFromResponse(body) {
  if (body && (body.authToken || body.token)) {
    window.protectedGlobals.data = window.protectedGlobals.data || {};
    window.protectedGlobals.data.authToken = body.authToken || body.token;
  }
}

// auth related stuff
  window.protectedGlobals.zmcdpost = async function (data) {
    const headers = { 'Content-Type': 'application/json' };
    if (window.protectedGlobals.data && window.protectedGlobals.data.authToken) headers['Authorization'] = 'Bearer ' + window.protectedGlobals.data.authToken;
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
      window.protectedGlobals.showSessionExpiredDialog();
        return body || { error: 'unauthorized' };
    }
    return body;
}
window.protectedGlobals.showSessionExpiredDialog = function showSessionExpiredDialog() {
  if (    document.getElementById("session-expired-dialog") ||     window.protectedGlobals.isRebuilding  ) {
    // already shown
    return;
  }

  const dlg = document.createElement("div");
  dlg.id = "session-expired-dialog";
  Object.assign(dlg.style, {
    position: "fixed",
    left: "50%",
    top: "50%",
    transform: "translate(-50%, -50%)",
    width: "420px",
    maxWidth: "90vw",
    background: window.protectedGlobals.data && window.protectedGlobals.data.dark ? "#222" : "#fff",
    color: window.protectedGlobals.data && window.protectedGlobals.data.dark ? "#fff" : "#000",
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

  closeX.addEventListener("click", () => dlg.remove());
  closeBtn.addEventListener("click", () => dlg.remove());
  refillBtn.addEventListener("click", async () => {
    // When user clicks refill, don't attempt token-based refill automatically.
    // Instead prompt for password and only send a password-based refill when provided.
    const uname = (function () {
      const u = window.protectedGlobals.getCurrentUsernameForRequests();
      if (u && typeof u === 'string' && u.trim()) return u.trim();
      if (window.protectedGlobals.data && typeof window.protectedGlobals.data.username === 'string')         return window.protectedGlobals.data.username.trim();
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

      window.protectedGlobals.data = window.protectedGlobals.data || {};
      window.protectedGlobals.data.authToken = body.authToken;
      status.textContent = 'Session refilled. You can continue.';
      status.style.color = 'green';
      setTimeout(() => { dlg.remove(); }, 350);
    } finally {
      refillBtn.disabled = false;
      refillBtn.textContent = 'Refill Session';
    }
  });
  reloadBtn.addEventListener("click", () => {
    window.protectedGlobals.rebuildhandler();
  });

  document.body.appendChild(dlg);
};

window.protectedGlobals.getCurrentUsernameForRequests = function getCurrentUsernameForRequests() {
  var liveUsername = "";
  var cachedUsername = "";
  if (window.protectedGlobals.data && typeof window.protectedGlobals.data.username === "string") {
    liveUsername = window.protectedGlobals.data.username.trim();
  }

  if (typeof window.protectedGlobals._cachedUsername === "string") {
    cachedUsername = window.protectedGlobals._cachedUsername.trim();
  }

  if (liveUsername) {
    window.protectedGlobals._cachedUsername = liveUsername;
  }

  return liveUsername || cachedUsername;
};

window.protectedGlobals.filePost = async function filePost(data) {
  const headers = { "Content-Type": "application/json" };
  if (window.protectedGlobals.data && window.protectedGlobals.data.authToken)
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
    window.protectedGlobals.showSessionExpiredDialog();
    return body || { error: "unauthorized" };
  }
  if (!data || !data.initFE) {
    window.protectedGlobals.queueOnlyLoadTreeRefresh();
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
      if (window.protectedGlobals.data && window.protectedGlobals.data.authToken)
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
    window.protectedGlobals.showSessionExpiredDialog();
    return body || { error: "unauthorized" };
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
  "systemfiles/runtime/core/runtimeAppRuntime.js",
  "systemfiles/runtime/core/runtimeWindowSystem.js",
  "systemfiles/runtime/core/appLoader.js",
  "systemfiles/runtime/helpers/initapptools.js",
  "systemfiles/runtime/helpers/cleanupfunctions.js",
  "systemfiles/runtime/core/startMenu.js",
  "systemfiles/runtime/core/processes.js",
  "systemfiles/runtime/core/goldenbody.js",
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
    // yield to the event loop to ensure script execution side-effects settle
    await new Promise(function (res) { setTimeout(res, 0); });
  }
};

// Load core scripts sequentially by injecting script elements (avoids eval).
(async function() {
await window.tmpGlobals.loadCoreScriptsSequentially();
for (const script of window.tmpGlobals.scriptContents) {
    document.head.appendChild(script);
}
})();
// if u wanna keep it just remove the next line
delete window.tmpGlobals.coreScriptUrls;




// this is not required, just a image
document.documentElement.style.height = "100%";

document.body.style.margin = "0";
document.body.style.height = "100vh";
window.protectedGlobals.setBodyBackground = async function () {
  const backgroundBuffer = await window.protectedGlobals.ReadFile("systemfiles/background/background.png", { buffer: true, direct: true });
  if (backgroundBuffer instanceof ArrayBuffer) {
    const blob = new Blob([backgroundBuffer], { type: "image/png" });
    const url = URL.createObjectURL(blob);
    document.body.style.backgroundImage = `url(${url})`;
  } else if (typeof backgroundBuffer === "string" && backgroundBuffer) {
    const binary = atob(backgroundBuffer);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
    const blob = new Blob([bytes], { type: "image/png" });
    const url = URL.createObjectURL(blob);
    document.body.style.backgroundImage = `url(${url})`;
  }
};
window.protectedGlobals.setBodyBackground();
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
// Prevent default context menu (single binding)
  // customize right click menu, it can ban the use of it. due to its causing troubles
  window.addEventListener("contextmenu", (e) => e.preventDefault());

// prevent apps from doing window.top.location.reload()
  window.addEventListener(
    "beforeunload",
    (e) => e.preventDefault()
  );




window.protectedGlobals.onlyLoadTreeRefreshPending = false;
window.protectedGlobals.onlyLoadTreeRefreshInFlight = null;

window.protectedGlobals.queueOnlyLoadTreeRefresh = function queueOnlyLoadTreeRefresh() {
  window.protectedGlobals.onlyLoadTreeRefreshPending = true;
  if (window.protectedGlobals.onlyLoadTreeRefreshInFlight) return;

  window.protectedGlobals.onlyLoadTreeRefreshInFlight = (async function runOnlyLoadTreeRefresh() {
    while (window.protectedGlobals.onlyLoadTreeRefreshPending) {
      window.protectedGlobals.onlyLoadTreeRefreshPending = false;
      if (window.protectedGlobals.onlyloadTree) {
        await window.protectedGlobals.onlyloadTree();
      }
    }
  })();

  window.protectedGlobals.onlyLoadTreeRefreshInFlight.finally(() => {
    window.protectedGlobals.onlyLoadTreeRefreshInFlight = null;
  });
};


window.protectedGlobals.deleteApp = async function (obj) {
  window.protectedGlobals.DeleteFolder(`/systemfiles/runtime/apps/${obj.folderName}`);
  window.protectedGlobals.apps.forEach(element => {
    if (element.id == obj.id) {
      window[element.globalVarObjectString][element.allAppArrayString].forEach(e => {
        e.rootElement.remove();
        e.closeWindow();
      });
      window.protectedGlobals.renderAppsGrid();
      window.protectedGlobals.taskbuttons.forEach(b => {
        if (b.dataset.appId === element.id) b.remove();
        let index = window.protectedGlobals.taskbuttons.indexOf(b);
        if (index > -1) window.protectedGlobals.taskbuttons.splice(index, 1);
        let index2 = window.protectedGlobals.data.taskbuttons.indexOf(b.dataset.appId);
        if (index2 > -1) window.protectedGlobals.data.taskbuttons.splice(index2, 1);
      });
      window.protectedGlobals.persistUserProfilePatch({ taskbuttons: window.protectedGlobals.data.taskbuttons });
      window.protectedGlobals._startMenuConfig.pinnedApps.splice(window.protectedGlobals._startMenuConfig.pinnedApps.indexOf(element.id), 1);
      window.protectedGlobals._startMenuConfig.recents.splice(window.protectedGlobals._startMenuConfig.recents.indexOf(element.id), 1);
      window.protectedGlobals.saveStartMenuConfig();
      delete window[element.globalVarObjectString];
      delete window[element.functionName];
      window.protectedGlobals.apps.splice(window.protectedGlobals.apps.indexOf(element), 1);
    }
  });
};

window.protectedGlobals.installApp = async function (folderName) {
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