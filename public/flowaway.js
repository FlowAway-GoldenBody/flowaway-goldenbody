/*
  CONTRIBUTING: Adding a new App

  This file bootstraps the client UI (start menu, taskbar, apps). When adding a new
  application, follow these steps so other contributors can find and wire it correctly:

  1) App script file
     - Put the app's client-side JS under `public/` (e.g. `public/myApp.js`). The app should
       expose a top-level function (e.g. `myApp()`) that creates and returns the window root
       element or registers itself with the global runtime.
     - Load the script from `flowaway.js` near the other app loaders (search for `feApp`,
       `bApp`, `settingsApp`, `sysScript`). Example:
         let myAppScript = document.createElement('script');
         myAppScript.src = `${goldenbodywebsite}myApp.js`;
         document.body.appendChild(myAppScript);

  2) Start menu entry (visible in the app launcher)
     - Add a clickable `.app` block inside `startMenu.innerHTML` (search for "File Explorer" in
       this file to see examples). Use a unique `id` and `data-app` attribute. The click handler
       below maps `data-app` to the app opener function (see `startMenu.addEventListener('click', ...)`).

  3) Taskbar button
     - `data.taskbuttons` in the user's file determines which quick-launch buttons appear.
       When creating a new user in `src/server/zmcd.js`, include your app id in the default
       `taskbuttons` array so it appears by default for new users.

  4) Keyboard shortcuts
     - Global shortcuts live inside the `window.addEventListener('keydown', ...)` handler.
       Add new key combos (Ctrl/Cmd + key) in that handler so the app opens the focused
       window or creates a new instance. Follow the existing structure (check for `atTop`)
       and call your app function (e.g. `myApp()`). Keep shortcuts discoverable and avoid
       collisions with browser defaults.

  5) Context / integration points
     - If your app needs to appear in the taskbar, add its id to `data.taskbuttons` and
       update any UI that enumerates `taskbuttons` when rendering the taskbar.
     - If your app needs saved user settings, store them in the user's `${username}.txt`
       file (see `zmcd.js`) or extend `siteSettings`. For quota or file access, use the
       existing `fileExplorer` APIs and server endpoints.

  6) Notifications & server messages
     - Use the global `notification(message)` helper (defined later in this file) to show
       transient messages in the UI. The verification WS also calls this helper for server
       push messages.

  7) Testing & deployment
     - Load the client and verify: start menu entry appears, shortcut opens the app, taskbar
       button created, and app script loads without console errors.

  8) referencing other apps
    use the global arrays allBrowsers, allExplorers, allSettings to get references to the apps. and please make their root elements accessible via a property like `rootElement` on the app instance. read other apps for examples. make sure to handle the case where there are multiple instances of the app (e.g. multiple browsers opened). also this is the only place where other apps should be referenced directly. please avoid circular dependencies. global functions like __openFile() are real global ones, if the global function isn't used in multiple apps, plz define it inside the app script instead.
    
  Quick reference locations in repo:
    - app scripts: public/*.js
    - server user file template: src/server/zmcd.js
    - file explorer integration: src/server/fetchfiles.js
    - verification WS: src/server/verification.js (notifies and updates online flag)
*/
window.data = data;

  var atTop = "";
  let zTop = 10;

let worldvolume = 0.5;
let verificationsocketSecure = location.protocol === 'https:' ? 'wss://' : 'ws://';
let vsURL = verificationsocketSecure + location.hostname + ':3000';
// global vars
let savedScrollX = 0;
let savedScrollY = 0;
let nhjd = 1;

window.addEventListener("scroll", () => {
  window.scrollTo(savedScrollX, savedScrollY);
});


savedScrollX = window.scrollX;
savedScrollY = window.scrollY;

// body restrictions
let bodyStyle = document.createElement("style");
bodyStyle.textContent = `body {
overflow: hidden;
}`;
document.body.appendChild(bodyStyle);
window.addEventListener("contextmenu", function (e) {
  e.preventDefault();
});
// content
window.addEventListener("beforeunload", function (event) {
  event.preventDefault();
});


async function filePost(data) {
  const res = await fetch(SERVER, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ username, ...data }),
  });
  return res.json();
}
async function zmcdpost(data) {
  const res = await fetch(zmcdserver, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ username, ...data }),
  });
  return res.json();
}
async function posttaskbuttons(data) {
  const res = await fetch(zmcdserver, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      username: username,
      data: data,
      edittaskbuttons: true,
    }),
  });
  return res.json();
}
function annotateTreeWithPaths(tree, basePath = '') {
  const [name, children, meta = {}] = tree;

  const path =
    name === 'root'
      ? ''
      : basePath
      ? `${basePath}/${name}`
      : name;

  tree[2] = { ...meta, path };

  if (Array.isArray(children)) {
    for (const child of children) {
      annotateTreeWithPaths(child, path);
    }
  }
}
window.loadTree = async function () {
  const data = await filePost({ initFE: true });
  treeData = data.tree;

  annotateTreeWithPaths(treeData); // ✅ ADD THIS LINE

  // render();
};


// Verification websocket with reconnect/backoff. call connectVerificationSocket() to (re)connect.
let verificationsocket = null;
let GBSOCKETI = 0; // reconnection attempts
let GBSOCKET_MAX_BACKOFF = 60 * 1000; // max 60s
let username = data.username;





// fullscreen keyboard lock
document.addEventListener("fullscreenchange", async () => {
  if (document.fullscreenElement) {
    // Lock when entering fullscreen
    if (navigator.keyboard && typeof navigator.keyboard.lock === "function") {
      await navigator.keyboard.lock(["Escape"]);
    }
  } else {
    // Unlock when exiting fullscreen
    if (
      navigator.keyboard &&
      typeof navigator.keyboard.unlock === "function"
    ) {
      navigator.keyboard.unlock();
    }
  }
});

window.removeotherMenus = function(except) {
  try {
    if(except !== 'browser') {
      browsermenu.remove();
      browsermenu = null;
    }
    else if(except !== 'fileExplorer') {
      explorermenu.remove();
      explorermenu = null;
    }
    else if(except !== 'settings') {
      settingsmenu.remove();
      settingsmenu = null;
    }
  } catch (e) {}
};
  function applyTaskButtons() {
  for (const taskbutton of data.taskbuttons) {
    if (taskbutton === "browser") addTaskButton("🌐", browser);
    else if (taskbutton === "fileExplorer") addTaskButton("🗂", fileExplorer);
    else if (taskbutton === "settings") addTaskButton("⚙", settings);
  }
  taskbuttons = [...taskbar.querySelectorAll("button")];
 }
  function purgeButtons() {
    explorerButtons = [];
    browserButtons = [];
    settingsButtons = [];
  for (let i = 0; i < taskbuttons.length; i++) {
    if (taskbuttons[i].textContent === "🌐") {
      browserButtons.push(taskbuttons[i]);
    } else if (taskbuttons[i].textContent === "🗂") {
      explorerButtons.push(taskbuttons[i]);
    } else if (taskbuttons[i].textContent === "⚙") {
      settingsButtons.push(taskbuttons[i]);
    }
  }
  }

  function saveTaskButtons() {
    let taskbuttons = [...taskbar.querySelectorAll("button")];
    let postdata = [];
    for (const b of taskbuttons) {
      if (b.textContent === "🌐") {
        postdata.push("browser");
      } else if (b.textContent === "🗂") {
        postdata.push("fileExplorer");
      } else if (b.textContent === "⚙") {
        postdata.push("settings");
      }
    }
    posttaskbuttons(postdata);
  }
  function bringToFront(el) {
    if (el.classList.contains("browser")) {
      atTop = "browser";
    } else if (el.classList.contains("fileExplorer")) {
      atTop = "fileExplorer";
    } else if (el.classList.contains("settings")) {
      atTop = "settings";
    }
    if (!el) return;
    el.style.zIndex = String(++zTop);
  }

  window.addEventListener("keydown", function (e) {
    if (e.ctrlKey && e.key === "n") {
      e.preventDefault();
      if (atTop == "browser" || atTop == "") {
        browser();
      } else if (atTop == "fileExplorer") {
        fileExplorer();
      }
      else if (atTop == "settings") {
        settings();
      }

    } else if (e.ctrlKey && e.shiftKey && e.key === "W" && atTop == "browser") {
      let allIds = [];
      for (let i = 0; i < allBrowsers.length; i++) {
        allIds.push(allBrowsers[i].rootElement._goldenbodyId);
      }
      let maxId = Math.max(...allIds);
      for (let i = 0; i < allBrowsers.length; i++) {
        if (allBrowsers[i].rootElement._goldenbodyId == maxId) {
          allBrowsers[i].rootElement.remove();
          allBrowsers[i].rootElement = null;
          allBrowsers.splice(i, 1);
        }
      }
    } else if (
      e.ctrlKey &&
      e.shiftKey &&
      e.key === "W" &&
      atTop == "fileExplorer"
    ) {
      let allIds = [];
      for (let i = 0; i < allExplorers.length; i++) {
        allIds.push(allExplorers[i].explorerId);
      }
      let maxId = Math.max(...allIds);
      for (let i = 0; i < allExplorers.length; i++) {
        if (allExplorers[i].explorerId == maxId) {
          allExplorers[i].rootElement.remove();
          allExplorers.splice(i, 1);
        }
      }
    }  else if (
      e.ctrlKey &&
      e.shiftKey &&
      e.key === "W" &&
      atTop == "settings"
    ) {
      let allIds = [];
      for (let i = 0; i < allSettings.length; i++) {
        allIds.push(allSettings[i].settingsId);
      }
      let maxId = Math.max(...allIds);
      for (let i = 0; i < allSettings.length; i++) {
        if (allSettings[i].settingsId == maxId) {
          allSettings[i].rootElement.remove();
          allSettings.splice(i, 1);
        }
      }
    }
  });
function connectVerificationSocket() {
  try {
    if (typeof WebSocket === 'undefined') return;
    // avoid creating multiple sockets
    if (verificationsocket && (verificationsocket.readyState === WebSocket.OPEN || verificationsocket.readyState === WebSocket.CONNECTING)) return;

    verificationsocket = new WebSocket(vsURL);

    verificationsocket.onopen = () => {
      console.log(`[GOLDENBODY]: Connected to ${vsURL}`);
      GBSOCKETI = 0; // reset backoff on success
      // send addPerson message with credentials if available
      try {
        verificationsocket.send(JSON.stringify({ addPerson: true, username: data.username, password: data.password }));
      } catch (e) {}
    };

    verificationsocket.onmessage = (ev) => {
      // handle any verification messages here if needed
      try {
        const msg = JSON.parse(ev.data);
        // example: show notifications for important server messages
        if (msg && msg.notify) {
          try { notification(msg.notify); } catch (e) {}
        }
      } catch (e) {
        // ignore non-json payloads
      }
    };

    verificationsocket.onerror = (err) => {
      // console.warn('[GOLDENBODY] error', err);
    };

    verificationsocket.onclose = (e) => {
      if(GBSOCKETI < 10) GBSOCKETI++; // increment interval
      // exponential backoff for reconnect attempts
      console.log(`[GOLDENBODY]: Disconnected from ${vsURL} with code ${e.code} - Attempting to reconnect in ${GBSOCKETI} seconds...`);
      setTimeout(() => {
        connectVerificationSocket();
      }, GBSOCKETI * 1000);
    };
  } catch (e) {
    console.error('connectVerificationSocket error', e);
  }
}

// Auto-start verification socket but safe-guarded in case server not present
try { connectVerificationSocket(); } catch (e) {}
function applyStyles() {
  for(const b of allBrowsers) {
    b.rootElement.classList.toggle('dark', data.dark);
    b.rootElement.classList.toggle('light', !data.dark);
    b.rootElement.dispatchEvent(new CustomEvent('styleapplied', {}));
  }
  for(const b of allExplorers) {
    b.rootElement.classList.toggle('dark', data.dark);
    b.rootElement.classList.toggle('light', !data.dark);
  }
  for(const b of allSettings) {
    b.rootElement.classList.toggle('dark', data.dark);
    b.rootElement.classList.toggle('light', !data.dark);
  }
  if(data.dark) {
  document.body.style.background = "#444";
  document.body.style.color = "white";
  } else {
  document.body.style.background = "white";
  document.body.style.color = "black";
  }
  startMenu.classList.toggle("dark", data.dark);
  startMenu.classList.toggle("light", !data.dark);
  taskbar.classList.toggle("dark", data.dark);
  taskbar.classList.toggle("light", !data.dark);
  for(const button of taskbuttons) {
    button.classList.toggle("dark", data.dark);
    button.classList.toggle("light", !data.dark);
  }
}
setTimeout(() => {
  applyStyles();
}, 100);
function mainRecurseFrames(doc) {
  if (!doc) return null;

  const frames = doc.querySelectorAll("iframe");

  for (const frame of frames) {
      const childDoc = frame.contentDocument;
    function setAllMediaVolume(newVolume) {
      // Ensure the volume is between 0.0 and 1.0
      newVolume = Math.min(Math.max(newVolume, 0.0), 1.0);

      // Select all audio and video elements
      let mediaElements = [];
      try{mediaElements = childDoc.querySelectorAll('audio, video');}catch(e){}

      mediaElements.forEach(element => {
        element.volume = newVolume;
      });
    }
      setAllMediaVolume(data.volume / 100);
      // Recurse into child document if accessible
      if (childDoc) {
        mainRecurseFrames(childDoc);
      }
  }

  return null;
}

    document.documentElement.style.filter =
      `brightness(${data.brightness}%)`;
function setAllMediaVolume(newVolume) {
  // Ensure the volume is between 0.0 and 1.0
  newVolume = Math.min(Math.max(newVolume, 0.0), 1.0);

  // Select all audio and video elements
  const mediaElements = document.querySelectorAll('audio, video');

  mediaElements.forEach(element => {
    element.volume = newVolume;
  });
}
    window.addEventListener('system-volume', (e) => {
      setAllMediaVolume(e.detail / 100);
    });
// 1. Create a new MutationObserver instance with a callback function
const observer = new MutationObserver((mutationsList, observer) => {
  if(mutationsList) {
      setAllMediaVolume(data.volume / 100);
      mainRecurseFrames(document);
      document.documentElement.style.filter =
      `brightness(${data.brightness}%)`;
  }
});

// 2. Select the target node you want to observe (e.g., the entire document body)
const targetNode = document.body;

// 3. Configure the observer with an options object
const config = {
    childList: true, // Observe direct children addition/removal
    attributes: true, // Observe attribute changes
    characterData: true, // Observe changes to text content
    subtree: true, // Observe changes in the entire subtree (children, grandchildren, etc.)
    attributeOldValue: true, // Record the old value of the attribute
    characterDataOldValue: true // Record the old value of the character data
};

// 4. Start observing the target node with the specified configuration
observer.observe(targetNode, config);

// To stop observing later:
// observer.disconnect();
      
    setAllMediaVolume(parseInt(data.volume) / 100);
    let backgroundMusic = document.createElement('audio');
    backgroundMusic.src = 'https://flowaway-goldenbody.github.io/GBCDN/music/zmxytgd.mp3';
    backgroundMusic.loop = true;
    document.body.prepend(backgroundMusic);
    window.addEventListener('mousedown', () => {backgroundMusic.play();}, {once: true});
// helpers global
  function getStringAfterChar(str, char) {
    const index = str.indexOf(char);
    if (index !== -1) {
      // Add 1 to the index to start after the character itself
      return str.substring(index + 1);
    } else {
      // Return the original string or handle the case where the character is not found
      return str;
    }
  }

  // Global notification helper: call notification("message") to show a temporary toast for 3s
function notification (message) {
    try {
      if (!message && message !== 0) return;
      // Ensure a container exists
      let container = document.getElementById('global-notifications');
      if (!container) {
        container = document.createElement('div');
        container.id = 'global-notifications';
        Object.assign(container.style, {
          position: 'fixed',
          right: '20px',
          bottom: '20px',
          display: 'flex',
          flexDirection: 'column',
          gap: '8px',
          zIndex: 9999999,
          pointerEvents: 'none'
        });
        document.body.appendChild(container);
      }

      const toast = document.createElement('div');
      toast.textContent = String(message);
      Object.assign(toast.style, {
        background: 'rgba(0,0,0,0.8)',
        color: 'white',
        padding: '8px 12px',
        borderRadius: '8px',
        maxWidth: '320px',
        boxShadow: '0 6px 20px rgba(0,0,0,0.3)',
        opacity: '0',
        transform: 'translateY(6px)',
        transition: 'opacity 220ms ease, transform 220ms ease',
        pointerEvents: 'auto',
        fontSize: '13px',
        lineHeight: '1.2'
      });

      container.appendChild(toast);

      // Force layout then animate in
      requestAnimationFrame(() => {
        toast.style.opacity = '1';
        toast.style.transform = 'translateY(0)';
      });

      // Remove after 3s
      const dismissMs = 3000;
      setTimeout(() => {
        toast.style.opacity = '0';
        toast.style.transform = 'translateY(6px)';
        setTimeout(() => {
          try { toast.remove(); } catch (e) {}
          // remove container if empty
          if (container && container.children.length === 0) {
            try { container.remove(); } catch (e) {}
          }
        }, 260);
      }, dismissMs);
      return toast;
    } catch (e) {
      console.error('notify error', e);
    }
  };
  const style = document.createElement("style");
  style.textContent = `

/* =========================================================
   🌞 LIGHT THEME (default)
========================================================= */
.sim-chrome-root * {
  box-sizing: border-box;
  font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial;
}
 .sim-url-input { flex:1; height:32px; border-radius:6px; border:1px solid rgba(0,0,0,0.12); padding:0 10px; font-size:14px; }
.sim-chrome-top {
  background: linear-gradient(#f6f7f8,#ededf0);
  height: 44px;
  display:flex;
  align-items:center;
  padding:0 8px;
  gap:8px;
}

.sim-chrome-tabs {
  display:flex;
  gap:2px;
  align-items:center;
  height:32px;
  scrollbar-width:none;
}
.sim-chrome-tabs::-webkit-scrollbar { display:none; }

.sim-tab {
  display:flex;
  align-items:center;
  gap:8px;
  padding:6px 10px;
  border-radius:6px;
  cursor:pointer;
  user-select:none;
  font-size:13px;
  color:#333;
  max-width:200px;
  min-width:185px;
  overflow:hidden;
  white-space:nowrap;
  text-overflow:ellipsis;
}

.sim-tab.active {
  background: rgba(0,0,0,0.06);
  box-shadow: inset 0 -1px 0 rgba(0,0,0,0.04);
}

.sim-tab .close {
  font-weight:700;
  color:#777;
  cursor:pointer;
  margin-left:auto;
}

.sim-address-row {
  display:flex;
  align-items:center;
  gap:8px;
  flex:1;
  margin: 0 8px;
}

.sim-open-btn,
.sim-fullscreen-btn,
.sim-netab-btn {
  height:28px;
  padding:0 12px;
  border-radius:12px;
  border:1px solid rgba(0,0,0,0.12);
  background:#fff;
  cursor:pointer;
  font-size:13px;
}

.sim-toolbar {
  display:flex;
  align-items:center;
  gap:8px;
  padding:8px;
  background:#fff;
  border-top:1px solid rgba(0,0,0,0.06);
}

.sim-iframe {
  width:100%;
  height:calc(100% - 84px);
  border:0;
  background:#fff;
}

.sim-status {
  font-size:12px;
  color:#666;
  margin-left:8px;
}

.browserTopBar {
  background: #ccc
}

.panel {}







/* =========================================================
   ☀️ LIGHT THEME
========================================================= */

.panel.light {
  background: #ededf0;
  color: black;
}
.sim-chrome-root.light {
  background: #f4f5f7;
  color: #222;
}

.sim-chrome-root.light .sim-chrome-top {
  background: linear-gradient(#f6f7f8, #ededf0);
}

.sim-chrome-root.light .sim-chrome-tabs {
  background: transparent;
}

.sim-chrome-root.light .sim-tab {
  color: #333;
}

.sim-chrome-root.light .sim-tab.active {
  background: rgba(0,0,0,0.06);
  box-shadow: inset 0 -1px 0 rgba(0,0,0,0.04);
}

.sim-chrome-root.light .sim-tab .close {
  color: #777;
}

/* Address row */
.sim-chrome-root.light .sim-address-row {
  background: transparent;
  margin: 0 8px;
}

/* URL / proxy inputs */
.sim-chrome-root.light .sim-url-input,
.sim-chrome-root.light .sim-proxy-input {
  background: #fff;
  color: #222;
  border: 1px solid rgba(0,0,0,0.12);
}

/* Buttons */
.sim-chrome-root.light .sim-open-btn,
.sim-chrome-root.light .sim-fullscreen-btn,
.sim-chrome-root.light .sim-netab-btn {
  background: #fff;
  color: #222;
  border: 1px solid rgba(0,0,0,0.12);
}

/* Toolbar */
.sim-chrome-root.light .sim-toolbar {
  background: #fff;
  border-top: 1px solid rgba(0,0,0,0.06);
}

/* Iframe area */
.sim-chrome-root.light .sim-iframe {
  background: #fff;
}

/* Status text */
.sim-chrome-root.light .sim-status {
  color: #666;
}

/* Top draggable bar */
.sim-chrome-root.light .browserTopBar {
  background: #ccc;
}

/* Window control buttons */
.sim-chrome-root.light .btnMaxColor,
.sim-chrome-root.light .btnMinColor {
  background: white;
  color: #000;
}

.sim-chrome-root.light .misc {
  background: white;
  color: black;
}

.sim-chrome-root.light .misc2 {
  background: black;
  color: #eee;
}

.browser-menu.light {
  background: white;
  color: black;
}

/* =========================================================
   🌙 DARK THEME
========================================================= */
.panel.dark {
  background: #444;
  color: #fff;
}
.sim-chrome-root.dark .sim-address-row {
  background: #111; margin: 0px;/* explicit, avoids inherited light bg */
}

/* Iframe background */
.sim-chrome-root.dark .sim-iframe {
  background: #111; /* deep dark, matches content area */
}
.sim-chrome-root.dark {
  background:#1e1e1e;
  color:#ddd;
}

.sim-chrome-root.dark .sim-chrome-top {
  background: linear-gradient(#2a2a2a,#1f1f1f);
}

.sim-chrome-root.dark .sim-tab {
  color:#ddd;
}

.sim-chrome-root.dark .sim-tab.active {
  background: rgba(255,255,255,0.08);
}

.sim-chrome-root.dark .sim-tab .close {
  color:rgba(251, 248, 248, 1);
}
  .sim-chrome-root.dark .sim-url-input { flex:1; height:32px; background-color: "black"; border-radius:6px; border:1px solid rgba(0,0,0,0.12); padding:0 10px; font-size:14px; }
.sim-chrome-root.dark .sim-url-input,
.sim-chrome-root.dark .sim-proxy-input {
  background:#2a2a2a;
  color:#eee;
  border:1px solid rgba(255,255,255,0.15);
}

.sim-chrome-root.dark .sim-open-btn,
.sim-chrome-root.dark .sim-fullscreen-btn,
.sim-chrome-root.dark .sim-netab-btn {
  background:#2a2a2a;
  color:#eee;
  border:1px solid rgba(255,255,255,0.15);
}

.sim-chrome-root.dark .sim-toolbar {
  background:#1e1e1e;
  border-top:1px solid rgba(255,255,255,0.08);
}

.sim-chrome-root.dark .sim-iframe {
  background:#111;
}

.sim-chrome-root.dark .sim-status {
  color:#aaa;
}

.sim-chrome-root.dark .browser-menu {
  color: black;
}

.sim-chrome-root.dark .btnMaxColor {
  color: white;
  background: black;
}

.sim-chrome-root.dark .btnMinColor {
  color: white;
  background: black;
}

.sim-chrome-root.dark .browserTopBar {
  background: #444;
}

.sim-chrome-root.dark .misc {
  background: black;
  color: white;
}

.sim-chrome-root.dark .misc2 {
  background: #444;
  color: white;
}

.browser-menu.dark {
  background: black;
  color: white;
}

/* =========================================================
   📱 Responsive
========================================================= */
@media (max-width: 600px) {
  .sim-chrome-root {
    left:6px;
    right:6px;
    width:auto;
    height:480px;
  }
}










/* taskbar/system */
.taskbar {}
.taskbutton{}
.taskbar.light {
  background: lightgray;
  color: black;
}
.taskbutton.dark {
  background: #444 !important;
  color: white !important;
}

.taskbutton.light {
  background: white !important;
  color: black !important;
}
.taskbar.dark {
  background: #222;
  color: white;
}


`;

  document.head.appendChild(style);
  const css = `

    .startMenu {
        position: fixed;
        bottom: 60px;
        left: 10px;
        width: 400px;
        height: 500px;
        border-radius: 6px;
        padding: 10px;
        display: none;
    }

    .startMenu h3 {
        margin-top: 0;
    }

    .apps {
        display: flex;
        flex-direction: column;
    }

    .app {
        padding: 8px;
        margin: 4px 0;
        border-radius: 4px;
        cursor: pointer;
        transition: 0.2s;
    }

    /* dark */
    .startMenu.dark {
       background: #1f1f1f;
       color: white;
    }
    .startMenu.dark .app {
      background: #333;
    }
    
    /* light */
    .startMenu.light {
       background: lightgray;
       color: black;
    }
    .startMenu.light .app {
      background: #f8f4f4ff;
    }

.statusBar {
    position: absolute;
    bottom: 8px;
    left: 8px;
    right: 8px;

    display: flex;
    justify-content: space-between;
    align-items: center;

    font-size: 13px;
    padding: 6px 10px;
    border-radius: 4px;
}

.statusLeft,
.statusRight {
    display: flex;
    align-items: center;
    gap: 10px;
}

.startMenu.dark .statusBar {
    background: #2a2a2a;
}

.startMenu.light .statusBar {
    background: #e6e6e6;
}


`;
const styleTag = document.createElement("style");
  styleTag.textContent = css;
  document.head.appendChild(styleTag);

  // ----------------- CREATE START BUTTON -----------------

  // ----------------- CREATE START MENU -----------------
  const startMenu = document.createElement("div");
  startMenu.id = "startMenu";
  startMenu.className = 'startMenu';
  startMenu.style.zIndex = 999;
  startMenu.innerHTML = `

<h3 style="margin:0 0 10px 0; font-size:18px;">Apps</h3>

<div style="
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 8px;
">
    <div class="app" id="explorerapp" data-app="File Explorer" style="
        padding: 10px;
        border-radius: 6px;
        text-align: center;
        cursor: pointer;
    ">
        🗂<br>
        <span style="font-size:14px;">File Explorer</span>
    </div>

    <div class="app" id="settingsapp" data-app="Settings" style="
        padding: 10px;
        border-radius: 6px;
        text-align: center;
        cursor: pointer;
    ">
        ⚙<br>
        <span style="font-size:14px;">Settings</span>
    </div>

    <div class="app" id="browserapp" data-app="Browser" style="
        padding: 10px;
        border-radius: 6px;
        text-align: center;
        cursor: pointer;
    ">
        🌐<br>
        <span style="font-size:14px;">Browser</span>
    </div>

    <div class="app" data-app="Music" style="
        padding: 10px;
        border-radius: 6px;
        text-align: center;
        cursor: pointer;
    ">
        🎵<br>
        <span style="font-size:14px;">Music</span>
    </div>
    <div class="statusBar">
    <div class="statusLeft">
        <span id="wifiStatus">📶</span>
    </div>

    <div class="statusRight">
        <span id="batteryStatus">🔋 --%</span>
        <span id="timeStatus">--:--</span>
    </div>
</div>

</div>
`;

  document.body.appendChild(startMenu);
// -------- TIME --------
function updateTime() {
    const now = new Date();
    const time = now.toLocaleTimeString([], {
        hour: '2-digit',
        minute: '2-digit'
    });
    document.getElementById("timeStatus").textContent = time;
}

updateTime();
setInterval(updateTime, 1000);

// -------- BATTERY --------
if (navigator.getBattery) {
    navigator.getBattery().then(battery => {
        function updateBattery() {
            const level = Math.round(battery.level * 100);
            const charging = battery.charging ? "⚡" : "";
            document.getElementById("batteryStatus").textContent =
                `🔋 ${level}% ${charging}`;
        }

        updateBattery();
        battery.addEventListener("levelchange", updateBattery);
        battery.addEventListener("chargingchange", updateBattery);
    });
} else {
    document.getElementById("batteryStatus").textContent = "🔋 N/A";
}
function updateWiFi() {
    const wifi = document.getElementById("wifiStatus");
    if (navigator.onLine) {
        wifi.textContent = "🛜";
        wifi.title = "Online";
    } else {
        wifi.textContent = "❌🛜";
        wifi.title = "Offline";
    }
}

updateWiFi();
window.addEventListener("online", updateWiFi);
window.addEventListener("offline", updateWiFi);

  // ----------------- TOGGLE START MENU -----------------
  let starthandler = () => {
    startMenu.style.display =
      startMenu.style.display === "block" ? "none" : "block";
  };

  // ----------------- OPEN APP ACTION -----------------
  startMenu.addEventListener("click", (e) => {
    if (e.target.classList.contains("app")) {
      const appName = e.target.getAttribute("data-app");
      if (appName === "Browser") {
        browser();
      }
      startMenu.style.display = "none";
    }
  });

  // ----------------- CLOSE MENU ON OUTSIDE CLICK -----------------
  document.addEventListener("click", (e) => {
    if (
      !startMenu.contains(e.target) &&
      e.target !== document.getElementById("▶")
    ) {
      startMenu.style.display = "none";
    }
  });


  let feApp = document.createElement('script');
  feApp.src = `${goldenbodywebsite}fileExplorer.js`;
  document.body.appendChild(feApp);
  let bApp = document.createElement('script');
  bApp.src = `${goldenbodywebsite}browser.js`;
  document.body.appendChild(bApp);
  let settingsApp = document.createElement('script');
  settingsApp.src = `${goldenbodywebsite}settings.js`;
  document.body.appendChild(settingsApp);
  let sysScript = document.createElement('script');

setTimeout(() => {
  sysScript.src = `${goldenbodywebsite}system.js`;
  document.body.appendChild(sysScript);
}, 100);