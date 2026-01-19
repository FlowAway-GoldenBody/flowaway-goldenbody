// plz define all your apps here first, dont give any values to the vars, or it will break
let browser = function(    preloadlink = null,
    preloadsize = 100,
    posX = 20,
    posY = 20,
){
  if(browser) {browser(    preloadlink = null,
    preloadsize = 100,
    posX = 20,
    posY = 20,
)}
};
let fileExplorer = function(startPath = "/", posX = 50, posY = 50){if(fileExplorer) {fileExplorer(startPath = "/", posX = 50, posY = 50)}};
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
  .sim-chrome-root * { box-sizing: border-box; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial; }
  .sim-chrome-top { background: linear-gradient(#f6f7f8,#ededf0); height: 44px; display:flex; align-items:center; padding:0 8px; gap:8px; }
  .sim-chrome-tabs { display:flex; gap:2px;
      ms-overflow-style: none; scrollbar-width: none; align-items:center; padding:0; height: 32px; }
      .sim-chrome-tabs::-webkit-scrollbar {
      display:none;
      }
  .sim-tab { display:flex; align-items:center; gap:8px; padding:6px 10px; background:transparent; border-radius:6px; cursor:pointer; user-select:none; font-size:13px; color:#333; max-width:200px;
min-width:185px; overflow:hidden; white-space:nowrap; text-overflow:ellipsis;}
  .sim-tab.active { background: rgba(0,0,0,0.06); box-shadow: inset 0 -1px 0 rgba(0,0,0,0.04); }
  .sim-tab .close { font-weight:700; color:#777; cursor:pointer; padding-left:6px; margin-left: auto;}
  .sim-address-row { display:flex; align-items:center; gap:8px; flex:1; margin: 0 8px; }
  .sim-url-input { flex:1; height:32px; border-radius:6px; border:1px solid rgba(0,0,0,0.12); padding:0 10px; font-size:14px; }
.sim-proxy-input { flex:0.1; size:10; height:32px; border-radius:6px; border:1px solid rgba(0,0,0,0.12); padding:0 10px; font-size:14px; }
  .sim-open-btn, .sim-fullscreen-btn, .sim-netab-btn { height:28px; padding:0 12px; border-radius:12px; border:1px solid rgba(0,0,0,0.12); background:#fff; cursor:pointer; font-size:13px; }
  .sim-toolbar { display:flex; align-items:center; gap:8px; padding:8px; background: #fff; border-top: 1px solid rgba(0,0,0,0.06); }
  .sim-iframe { width:100%; height: calc(100% - 84px); border:0; background:#fff; padding:10}
  .sim-status { font-size:12px; color:#666; margin-left:8px; }
  /* Tiny responsive */
  @media (max-width: 600px) {
    .sim-chrome-root { left:6px; right:6px; width:auto; height:480px; }
  }
      .sim-explorer-root * { box-sizing: border-box; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial; }
`;
  document.head.appendChild(style);
  const css = `

    #startMenu {
        position: fixed;
        bottom: 60px;
        left: 10px;
        width: 400px;
        height: 500px;
        background: #1f1f1f;
        color: white;
        border-radius: 6px;
        padding: 10px;
        display: none;
    }

    #startMenu h3 {
        margin-top: 0;
    }

    .apps {
        display: flex;
        flex-direction: column;
    }

    .app {
        padding: 8px;
        background: #333;
        margin: 4px 0;
        border-radius: 4px;
        cursor: pointer;
        transition: 0.2s;
    }

    .app:hover {
        background: #555;
    }
`;
const styleTag = document.createElement("style");
  styleTag.textContent = css;
  document.head.appendChild(styleTag);

  // ----------------- CREATE START BUTTON -----------------

  // ----------------- CREATE START MENU -----------------
  const startMenu = document.createElement("div");
  startMenu.id = "startMenu";
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
        background: #333;
        border-radius: 6px;
        text-align: center;
        cursor: pointer;
    ">
        🗂<br>
        <span style="font-size:14px;">File Explorer</span>
    </div>

    <div class="app" data-app="Notes" style="
        padding: 10px;
        background: #333;
        border-radius: 6px;
        text-align: center;
        cursor: pointer;
    ">
        📝<br>
        <span style="font-size:14px;">Notes</span>
    </div>

    <div class="app" id="browserapp" data-app="Browser" style="
        padding: 10px;
        background: #333;
        border-radius: 6px;
        text-align: center;
        cursor: pointer;
    ">
        🌐<br>
        <span style="font-size:14px;">Browser</span>
    </div>

    <div class="app" data-app="Music" style="
        padding: 10px;
        background: #333;
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
    if (el.classList.contains("sim-chrome-root")) {
      atTop = "browser";
    } else if (el.classList.contains("sim-explorer-root")) {
      atTop = "fileExplorer";
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
    }
  });
  let feApp = document.createElement('script');
  feApp.src = `${goldenbodywebsite}fileExplorer.js`;
  document.body.appendChild(feApp);
  let bApp = document.createElement('script');
  bApp.src = `${goldenbodywebsite}browser.js`;
  document.body.appendChild(bApp);
  let sysScript = document.createElement('script');
  sysScript.src = `${goldenbodywebsite}system.js`;
  document.body.appendChild(sysScript);
const zmcdserver = "http://localhost:8082/server/zmcd";
let SERVER = "http://localhost:8083";
let username = data[0];
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