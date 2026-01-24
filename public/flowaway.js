// plz define all your apps here first, dont give any values to the vars, or it will break

window.data = data;
  var atTop = "";
  let zTop = 10;

let worldvolume = 0.5;

// function toggleStyles() {
//   data.dark = !data.dark;
//   for(const b of allBrowsers) {
//     b.rootElement.classList.toggle('dark', data.dark);
//     b.rootElement.classList.toggle('light', !data.dark);
//   }
//   for(const b of allExplorers) {
//     b.rootElement.classList.toggle('dark', data.dark);
//     b.rootElement.classList.toggle('light', !data.dark);
//   }
//   for(const b of allSettings) {
//     b.rootElement.classList.toggle('dark', data.dark);
//     b.rootElement.classList.toggle('light', !data.dark);
//   }
//   if(document.body.style.background === 'white') {
//   document.body.style.background = "#444";
//   document.body.style.color = "white";
//   } else {
//   document.body.style.background = "white";
//   document.body.style.color = "black";
//   }
//   startMenu.classList.toggle("dark", data.dark);
//   startMenu.classList.toggle("light", !data.dark);
// }
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
</div>
`;

  document.body.appendChild(startMenu);

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
        allIds.push(allSettings[i].explorerId);
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




let username = data.username;
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