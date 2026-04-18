// Preserve protected runtime data if already set (e.g., from ouchbad.js account creation), otherwise initialize
// absolutely no hardcoded app names allowed! all apps should be installed and theres no way to predict their name and structure in advance, so we must not bake in any assumptions here. we will rely on dynamic detection and labeling based on heuristics instead.
// i mean by no if(appId === 'browser') or similar checks anywhere in the core (flowaway.js/goldenbody.js). its not allowed!

// all added global system vars are in the protectedglobals namespace, no exceptions. this is to avoid conflicts with apps and to make it clear what is part of the core system vs what is app-level.
// ----------------- Convenience file helpers -----------------
// These wrap the existing `filePost` API so apps can easily perform
// common VFS actions. Responses are the raw server responses; use
// `base64ToArrayBuffer()` above to convert base64 payloads when needed.
window.protectedGlobals.missingFolders = window.protectedGlobals.missingFolders || new Set();

window.protectedGlobals.ReadFile = async function (relPath) {
  if (!relPath) throw new Error("No path");
  return await window.protectedGlobals.filePost({
    requestFile: true,
    requestFileName: String(relPath),
  });
};

window.protectedGlobals.WriteFile = async function (relPath, contents, options = {}) {
  if (!relPath) throw new Error("No path");
  // Use the saveSnapshot + directions API to perform edits
  if (options.buffer) {
    contents = arrayBufferToBase64(contents);
  }
  const directions = [
    {
      edit: true,
      path: String(relPath),
      contents: String(contents || ""),
      replace: !!options.replace,
    },
    { end: true },
  ];
  return await window.protectedGlobals.filePost({ saveSnapshot: true, directions });
};

window.protectedGlobals.DeleteFile = async function (relPath) {
  if (!relPath) throw new Error("No path");
  const directions = [{ delete: true, path: String(relPath) }, { end: true }];
  return await window.protectedGlobals.filePost({ saveSnapshot: true, directions });
};

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
// auth related stuff
  window.protectedGlobals.zmcdpost = async function (data) {
    const headers = { 'Content-Type': 'application/json' };
    if (window.protectedGlobals.data && window.protectedGlobals.data.authToken) headers['Authorization'] = 'Bearer ' + window.protectedGlobals.data.authToken;
    var res = await fetch(window.protectedGlobals.zmcdserver, {
        method: 'POST',
        headers,
        body: JSON.stringify({
            username: getCurrentUsernameForRequests(),
            ...data
        })
    });
    let body = null;
    try {
        body = await res.json();
    } catch (e) {
        body = null;
    }
    if (body && (body.authToken || body.token)) {
        try {
            window.protectedGlobals.data = window.protectedGlobals.data || {};
            window.protectedGlobals.data.authToken = body.authToken || body.token;
        } catch (e) {}
    }
    if (res.status === 401) {
        try {
            window.protectedGlobals.showSessionExpiredDialog();
        } catch (e) {}
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
    zIndex: 99999,
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

    const password = (      pwdInput && typeof pwdInput.value === 'string')         ? pwdInput.value.trim() : '';

    // If no password provided yet, focus the input and ask the user to enter it.
    if (!password) {
      status.textContent =         "Enter your account password above and click Refill to submit.";
      status.style.color = "#c66";
      try {         pwdInput.focus();       } catch (e) {}
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

      let body = null;
      try {         body = await res.json();       } catch (e) {         body = null;       }

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
      setTimeout(() => {         try {           dlg.remove();         } catch (e) {}       }, 350);
    } catch (err) {
      console.error('Refill request error', err);
      status.textContent = 'Session refill failed. Sign in again.';
      status.style.color = 'red';
    }

    refillBtn.disabled = false;
    refillBtn.textContent = 'Refill Session';
  });
  reloadBtn.addEventListener("click", () => {
    window.protectedGlobals.rebuildhandler();
  });

  document.body.appendChild(dlg);
};

window.protectedGlobals.getCurrentUsernameForRequests = function getCurrentUsernameForRequests() {
  var liveUsername = "";
  var cachedUsername = "";
  try {
    if (window.protectedGlobals.data && typeof window.protectedGlobals.data.username === "string") {
      liveUsername = String(window.protectedGlobals.data.username || "").trim();
    }
  } catch (e) {}

  try {
    if (typeof window.protectedGlobals._cachedUsername === "string") {
      cachedUsername = String(window.protectedGlobals._cachedUsername || "").trim();
    }
  } catch (e) {}

  if (liveUsername) {
    try {
      window.protectedGlobals._cachedUsername = liveUsername;
    } catch (e) {}
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
  let body = null;
  try {
    body = await res.json();
  } catch (e) {
    body = null;
  }
  if (body && (body.authToken || body.token)) {
    try {
      window.protectedGlobals.data = window.protectedGlobals.data || {};
      window.protectedGlobals.data.authToken = body.authToken || body.token;
    } catch (e) {}
  }
  if (res.status === 401 && !window.protectedGlobals.firstlogin) {
    try {
      window.protectedGlobals.showSessionExpiredDialog();
    } catch (e) {}
    return body || { error: "unauthorized" };
  }

  try {
    if (!data || !data.initFE) {
      window.protectedGlobals.queueOnlyLoadTreeRefresh();
    }
  } catch (e) {}

  window.protectedGlobals.firstlogin = false;
  return body;
};

window.protectedGlobals.posttaskbuttons = async function posttaskbuttons(data) {
  return await window.protectedGlobals.persistUserProfilePatch({ taskbuttons: data });
};
window.protectedGlobals.downloadPost = async function downloadPost(data) {
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
  let body = null;
  try {
    body = await res.json();
  } catch (e) {
    body = null;
  }
  if (body && (body.authToken || body.token)) {
    try {
      window.protectedGlobals.data = window.protectedGlobals.data || {};
      window.protectedGlobals.data.authToken = body.authToken || body.token;
    } catch (e) {}
  }
  if (res.status === 401) {
    try {
      window.protectedGlobals.showSessionExpiredDialog();
    } catch (e) {}
    return body || { error: "unauthorized" };
  }
  return body;
};








// import scripts

window.tmpGlobals = {};
window.tmpGlobals.decodeBase64ToUTF8 = function(base64) {
    // 1. Decode base64 to a binary string
    const binaryString = atob(base64);
    
    // 2. Convert binary string to a Uint8Array (array of bytes)
    const bytes = Uint8Array.from(binaryString, (char) => char.charCodeAt(0));
    
    // 3. Decode the bytes as UTF-8
    return new TextDecoder().decode(bytes);
}
window.tmpGlobals.coreScriptUrls = [
  "systemfiles/runtime/helper/coreVariables.js",
  "systemfiles/runtime/helper/fsFunctions.js",
  "systemfiles/runtime/helper/cleanupfunctions.js",
  "systemfiles/runtime/helper/miscFunctions.js",
  "systemfiles/runtime/appHelperFunctions.js",
  "systemfiles/runtime/runtimeAppRuntime.js",
  "systemfiles/runtime/runtimeWindowSystem.js",
  "systemfiles/runtime/runtimeShell.js",
];

window.tmpGlobals.loadCoreScriptsSequentially = async function() {
  for (const element of window.tmpGlobals.coreScriptUrls) {
    
    var script = document.createElement("script");
    let f = await window.protectedGlobals.ReadFile(element);
    let txt = f.filecontent;
    script.textContent = window.tmpGlobals.decodeBase64ToUTF8(txt);
    document.body.appendChild(script);
  }
};

window.tmpGlobals.loadCoreScriptsSequentially();
// if u wanna keep it just remove the next line
delete window.tmpGlobals.coreScriptUrls;




// this is not required, just a image
document.body.style.backgroundImage =
  "url(https://flowaway-goldenbody.github.io/GBCDN/cloudwithtemples.png)";
document.body.style.backgroundSize = "cover";
document.body.style.backgroundPosition = "center";
document.body.style.backgroundRepeat = "no-repeat";




// Scroll lock - ensure single binding
try {
  if (window.protectedGlobals.systemAPIs.onScroll)
    window.removeEventListener("scroll", window.protectedGlobals.systemAPIs.onScroll);
  window.protectedGlobals.systemAPIs.onScroll = () => {
    window.scrollTo(window.protectedGlobals.savedScrollX, window.protectedGlobals.savedScrollY);
  };
  window.addEventListener("scroll", window.protectedGlobals.systemAPIs.onScroll);
} catch (e) {}

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
      try {
        if (window.protectedGlobals.onlyloadTree) {
          await window.protectedGlobals.onlyloadTree();
        }
      } catch (e) {
        try {
          window.protectedGlobals.throwError(
            "queueOnlyLoadTreeRefresh",
            "onlyloadTree refresh failed.",
            e,
          );
        } catch (ee) {}
      }
    }
  })();

  window.protectedGlobals.onlyLoadTreeRefreshInFlight.finally(() => {
    window.protectedGlobals.onlyLoadTreeRefreshInFlight = null;
  });
};








window.protectedGlobals.fileFetchInFlight =
  window.protectedGlobals.fileFetchInFlight || new Map();
window.protectedGlobals.fileFetchRecent = window.protectedGlobals.fileFetchRecent || new Map();
window.protectedGlobals.FLOWAWAY_FILE_FETCH_CACHE_MS = 750;



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

