// global const/let is banned in non (()=>{})() wrappers
(function () {
const css = window.protectedGlobals.css = `

    .startMenu {
        position: fixed;
        bottom: 60px;
        left: 10px;
        width: 400px;
        height: 500px;
        border-radius: 6px;
        padding: 10px;
        overflow: hidden;
        display: none;
    }

    .startMenuBody {
      position: absolute;
      top: 88px;
      left: 10px;
      right: 10px;
      bottom: 74px;
      overflow-y: auto;
      -ms-overflow-style: none;
      scrollbar-width: none;
    }

    .startMenuBody::-webkit-scrollbar {
      display: none;
      width: 0;
      height: 0;
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
  /* position at the bottom of the start menu */
  bottom: 8px;
  left: 8px;
  right: 8px;

  display: flex;
  justify-content: space-between;
  align-items: center;

  font-size: 15px;
  padding: 10px 12px;
  border-radius: 6px;
  min-height: 42px;
}

#appsGrid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 8px;
}

.statusLeft,
.statusRight {
    display: flex;
    align-items: center;
    gap: 10px;
}

.statusRight span {
  font-size: 16px;
  font-weight: 600;
}

#signOutBtn {
  padding: 8px 12px;
  border-radius: 8px;
  border: none;
  cursor: pointer;
  background: #e53e3e;
  color: white;
  font-weight: 600;
}

.startMenu.dark .statusBar {
    background: #2a2a2a;
}

.startMenu.light .statusBar {
    background: #e6e6e6;
}

/* Start Menu Tabs */
.startMenuTabs {
  display: flex;
  gap: 4px;
  margin-bottom: 12px;
  border-bottom: 2px solid rgba(255,255,255,0.1);
}

.startMenuTab {
  padding: 8px 12px;
  border: none;
  background: transparent;
  color: inherit;
  cursor: pointer;
  border-bottom: 3px solid transparent;
  transition: 0.2s;
  font-weight: 500;
  font-size: 13px;
}

.startMenuTab.active {
  border-bottom-color: #4A90E2;
  color: #4A90E2;
}

.startMenu.dark .startMenuTab:hover {
  background: #333;
}

.startMenu.light .startMenuTab:hover {
  background: #f0f0f0;
}

/* Tab Content Sections */
.tabSection {
  display: none;
}

.tabSection.active {
  display: block;
}

/* App Grid Improvements */
.tabSection.active.grid-view {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 8px;
  align-content: start;
}

.tabSection.active.list-view {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.tabSection.list-view .app {
  padding: 10px;
  display: flex;
  align-items: center;
  gap: 8px;
}

.tabSection.grid-view .app {
  margin: 0;
  min-width: 0;
}

/* Dragging feedback */
.app {
  user-select: none;
}

.app.dragging {
  opacity: 0.5;
  background: rgba(255,255,255,0.2) !important;
}

.app.drag-over {
  border: 2px dashed #4A90E2;
  background: rgba(74, 144, 226, 0.1) !important;
}

.app:hover {
  transform: scale(1.05);
  box-shadow: 0 4px 12px rgba(0,0,0,0.3);
}

/* Context Menu */
.app-context-menu {
  position: fixed;
  z-index: 9999;
  background: #2a2a2a;
  color: white;
  border-radius: 6px;
  box-shadow: 0 4px 16px rgba(0,0,0,0.5);
  min-width: 180px;
}

.startMenu.light .app-context-menu {
  background: #f5f5f5;
  color: black;
  box-shadow: 0 4px 16px rgba(0,0,0,0.2);
}

.context-menu-item {
  padding: 10px 12px;
  cursor: pointer;
  border: none;
  background: transparent;
  color: inherit;
  width: 100%;
  text-align: left;
  font-size: 13px;
  transition: 0.1s;
}

.context-menu-item:hover {
  background: rgba(74, 144, 226, 0.2);
}

.context-menu-item.danger:hover {
  background: rgba(229, 62, 62, 0.2);
  color: #e53e3e;
}

.startMenu.light .context-menu-item:hover {
  background: rgba(74, 144, 226, 0.1);
}

`;
const styleTag = window.protectedGlobals.styleTag = document.createElement("style");
styleTag.textContent = window.protectedGlobals.css;
document.head.appendChild(styleTag);

// ----------------- CREATE START BUTTON -----------------

// ============= START MENU CONFIG SYSTEM =============
window.protectedGlobals._startMenuConfig = null;

const loadStartMenuConfig = window.protectedGlobals.loadStartMenuConfig = async function loadStartMenuConfig() {
  try {
    const configPath = 'systemfiles/userprofile/startMenu-config.json';
    const configData = await window.protectedGlobals.fetchFileContentByPath(configPath);
    const configText = window.protectedGlobals.base64ToUtf8(configData);
    window.protectedGlobals._startMenuConfig = JSON.parse(configText);
    return window.protectedGlobals._startMenuConfig;
  } catch (e) {
    window.protectedGlobals.flowawayError('startMenu', 'Failed to load config, using defaults', e);
    window.protectedGlobals._startMenuConfig = {
      version: '1.0',
      pinnedApps: [],
      hiddenApps: [],
      appOrder: [],
      recents: [],
      maxRecents: 5,
      displayMode: 'grid',
      gridColumns: 4
    };
    return window.protectedGlobals._startMenuConfig;
  }
}

const saveStartMenuConfig = window.protectedGlobals.saveStartMenuConfig = async function saveStartMenuConfig() {
  try {
    if (!window.protectedGlobals._startMenuConfig) return;
    const configJson = JSON.stringify(window.protectedGlobals._startMenuConfig, null, 2);
    await window.protectedGlobals.filePost({
      action: 'saveStartMenuConfig',
      configJson: configJson
    });
  } catch (e) {
    window.protectedGlobals.flowawayError('startMenu', 'Failed to save config', e);
  }
}

const addToRecents = window.protectedGlobals.addToRecents = function addToRecents(appId) {
  if (!window.protectedGlobals._startMenuConfig) return;
  const recents = window.protectedGlobals._startMenuConfig.recents || [];
  const index = recents.indexOf(appId);
  if (index > -1) recents.splice(index, 1);
  recents.unshift(appId);
  if (recents.length > (window.protectedGlobals._startMenuConfig.maxRecents || 5)) {
    recents.pop();
  }
  window.protectedGlobals._startMenuConfig.recents = recents;
  saveStartMenuConfig();
}

const removeFromStartMenu = window.protectedGlobals.removeFromStartMenu = function removeFromStartMenu(appId) {
  if (!window.protectedGlobals._startMenuConfig) return;
  const pinnedApps = window.protectedGlobals._startMenuConfig.pinnedApps || [];
  const index = pinnedApps.indexOf(appId);
  if (index > -1) {
    pinnedApps.splice(index, 1);
    window.protectedGlobals._startMenuConfig.pinnedApps = pinnedApps;
    saveStartMenuConfig();
    renderPinnedAppsGrid();
  }
}

// ============= CREATE START MENU -================
try {
  var existingStartMenu = document.getElementById("startMenu");
  if (existingStartMenu) existingStartMenu.remove();
} catch (e) {}
const startMenu = window.protectedGlobals.startMenu = document.createElement("div");
startMenu.id = "startMenu";
startMenu.className = "startMenu";
startMenu.style.zIndex = 999;
startMenu.innerHTML = `

<h3 style="margin:0 0 10px 0; font-size:18px;">Start</h3>

<div class="startMenuTabs">
  <button class="startMenuTab active" data-tab="pinned">Pinned</button>
  <button class="startMenuTab" data-tab="recents">Recent</button>
  <button class="startMenuTab" data-tab="all">All Apps</button>
  <button class="startMenuTab" data-tab="shortcuts">Shortcuts</button>
</div>

<div class="startMenuBody">
    <div id="appsGrid" class="tabSection active grid-view" data-tab="pinned"></div>
    <div id="recentsGrid" class="tabSection grid-view" data-tab="recents"></div>
    <div id="allAppsGrid" class="tabSection grid-view" data-tab="all"></div>
    <div id="shortcutsGrid" class="tabSection grid-view" data-tab="shortcuts"></div>
</div>

    <div class="statusBar">
    <div class="statusLeft">
        <span id="wifiStatus">📶</span>
        <button id="signOutBtn" style="margin-left:8px;padding:6px 8px;border-radius:6px;border:none;background:#e53e3e;color:white;font-weight:600;">Sign Out</button>
    </div>

    <div class="statusRight">
      <span id="batteryStatus">🔋 --%</span>
      <span id="timeStatus">--:--</span>
    </div>
</div>
`;

document.body.appendChild(startMenu);

// Load config on startup
(async () => {
  await loadStartMenuConfig();
  await window.protectedGlobals.loadAppsFromTree();
})();

// ============= TAB SWITCHING =============
window.protectedGlobals.tabButtons = startMenu.querySelectorAll('.startMenuTab');
window.protectedGlobals.tabSections = startMenu.querySelectorAll('.tabSection');

const switchTab = window.protectedGlobals.switchTab = function switchTab(tabName) {
  if (!tabName) return;
  try {
    document
      .querySelectorAll('.app-context-menu, .app-menu')
      .forEach(function (menuNode) {
        try {
          menuNode.remove();
        } catch (e) {}
      });
  } catch (e) {}
  // Hide all sections
  window.protectedGlobals.tabSections.forEach(function (section) {
    section.classList.remove('active');
    section.style.display = 'none';
  });
  // Deactivate all tabs
  window.protectedGlobals.tabButtons.forEach(function (btn) {
    btn.classList.remove('active');
  });

  // Show selected section
  var section = startMenu.querySelector(`.tabSection[data-tab="${tabName}"]`);
  if (section) {
    section.classList.add('active');
    section.style.display = section.classList.contains('list-view')
      ? 'flex'
      : 'grid';
  }

  // Activate selected tab
  var btn = startMenu.querySelector(`.startMenuTab[data-tab="${tabName}"]`);
  if (btn) btn.classList.add('active');

  // Render appropriate grid
  if (tabName === 'pinned') renderPinnedAppsGrid();
  else if (tabName === 'recents') renderRecentsGrid();
  else if (tabName === 'all') renderAllAppsGrid();
  else if (tabName === 'shortcuts') renderQuickActionsGrid();
}

window.protectedGlobals.tabButtons.forEach(btn => {
  btn.addEventListener('click', function (e) {
    e.preventDefault();
    e.stopPropagation();
    switchTab(this.dataset && this.dataset.tab);
  });
});

const applyBrightnessDelta = window.protectedGlobals.applyBrightnessDelta = function applyBrightnessDelta(delta) {
  window.protectedGlobals.data = window.protectedGlobals.data || {};
  window.protectedGlobals.data.brightness = Math.min(
    100,
    Math.max(0, (parseInt(window.protectedGlobals.data.brightness) || 0) + delta),
  );
  document.documentElement.style.filter = `brightness(${window.protectedGlobals.data.brightness}%)`;
  try {
    if (typeof window.protectedGlobals.persistUserProfilePatch === "function") {
      window.protectedGlobals.persistUserProfilePatch({ brightness: Number(window.protectedGlobals.data.brightness) });
    }
  } catch (err) {}
  try {
    window.protectedGlobals.notification(`Brightness: ${window.protectedGlobals.data.brightness}%`);
  } catch (e) {}
}

const applyVolumeDelta = window.protectedGlobals.applyVolumeDelta = function applyVolumeDelta(delta) {
  window.protectedGlobals.data = window.protectedGlobals.data || {};
  window.protectedGlobals.data.volume = Math.min(
    100,
    Math.max(0, (parseInt(window.protectedGlobals.data.volume) || 0) + delta),
  );
  window.protectedGlobals.setAllMediaVolume(window.protectedGlobals.data.volume / 100);
  window.dispatchEvent(new CustomEvent("system-volume", { detail: window.protectedGlobals.data.volume }));
  try {
    if (typeof window.protectedGlobals.persistUserProfilePatch === "function") {
      window.protectedGlobals.persistUserProfilePatch({ volume: Number(window.protectedGlobals.data.volume) });
    }
  } catch (err) {}
  try {
    window.protectedGlobals.notification(`Volume: ${window.protectedGlobals.data.volume}%`);
  } catch (e) {}
}

const cycleFocusedWindow = window.protectedGlobals.cycleFocusedWindow = function cycleFocusedWindow(reverse, modKey = "Alt") {
  if (typeof window.protectedGlobals.cycleWindowFocus === "function") {
    window.protectedGlobals.cycleWindowFocus(!!reverse, modKey);
  }
}

const launchFocusedAppWindow = window.protectedGlobals.launchFocusedAppWindow = function launchFocusedAppWindow() {
  var focusedApp = window.protectedGlobals.atTop;
    window.protectedGlobals.launchApp(focusedApp);
  // this fallback is okay because it dont cause the user to crash out
  var fallback =
    (window.protectedGlobals.data && window.protectedGlobals.data.taskbuttons && window.protectedGlobals.data.taskbuttons[0]) ||
    (window.protectedGlobals.apps && window.protectedGlobals.apps[0] && window.protectedGlobals.apps[0].functionname);
  if (fallback) window.protectedGlobals.launchApp(fallback);
}

const closeFocusedAppWindow = window.protectedGlobals.closeFocusedAppWindow = function closeFocusedAppWindow() {
  if (!window.protectedGlobals.atTop) return;
  try {
    var targetAppId = String(window.protectedGlobals.atTop || "").trim();
    if (!targetAppId) return;

    var roots = Array.from(document.querySelectorAll(".app-window-root"));
    var candidates = roots.filter(
      (root) => root.dataset && root.dataset.appId === targetAppId,
    );

    if (!candidates.length) {
      candidates = roots.filter(
        (root) => root.classList && root.classList.contains(targetAppId),
      );
    }

    if (!candidates.length) return;

    candidates.sort((a, b) => {
      var za = parseInt(a.style.zIndex) || 0;
      var zb = parseInt(b.style.zIndex) || 0;
      return za - zb;
    });

    var top = candidates[candidates.length - 1];
    if (top) {
      try {
        top.remove();
      } catch (e) {}

      try {
        var appObj = (window.protectedGlobals.apps || []).find(function (a) {
          return window.protectedGlobals.appMatchesIdentifier(a, targetAppId);
        });
        if (appObj && appObj.globalvarobjectstring && appObj.allapparraystring) {
          var gv = window[appObj.globalvarobjectstring];
          if (gv && typeof gv === "object") {
            var arrayKeys = [];
            if (typeof appObj.allapparraystring === "string") {
              var single = appObj.allapparraystring.trim();
              if (single) arrayKeys.push(single);
            } else if (Array.isArray(appObj.allapparraystring)) {
              for (var ak = 0; ak < appObj.allapparraystring.length; ak++) {
                var normalized =
                  typeof appObj.allapparraystring[ak] === "string"
                    ? appObj.allapparraystring[ak].trim()
                    : "";
                if (normalized && arrayKeys.indexOf(normalized) === -1) {
                  arrayKeys.push(normalized);
                }
              }
            }

            for (var keyCursor = 0; keyCursor < arrayKeys.length; keyCursor++) {
              var arr = gv[arrayKeys[keyCursor]];
              if (!Array.isArray(arr)) continue;
              for (var i = arr.length - 1; i >= 0; i--) {
                var inst = arr[i];
                var instRoot = inst && (inst.rootElement || inst.root || inst.rootEl);
                if (
                  inst === top ||
                  instRoot === top ||
                  (top && top._goldenbodyId && (inst._goldenbodyId === top._goldenbodyId || (instRoot && instRoot._goldenbodyId === top._goldenbodyId)))
                ) {
                  arr.splice(i, 1);
                }
              }
            }
          }
        }
      } catch (e) {}

      try {
        window.protectedGlobals.removeAllEventListenersForApp(targetAppId + top._goldenbodyId);
      } catch (e) {}
    }
  } catch (e) {
    console.error("close focused app window error", e);
  }
}

const createShortcutButton = window.protectedGlobals.createShortcutButton = function createShortcutButton(label, description, handler) {
  var isDarkTheme = !!(window.protectedGlobals.data && window.protectedGlobals.data.dark);
  const btn = document.createElement("button");
  btn.type = "button";
  btn.style.padding = "12px";
  btn.style.borderRadius = "8px";
  btn.style.border = isDarkTheme ? "1px solid rgba(255,255,255,0.12)" : "1px solid rgba(0,0,0,0.12)";
  btn.style.background = isDarkTheme ? "#2a2a2a" : "#fff";
  btn.style.color = isDarkTheme ? "#f5f5f5" : "#222";
  btn.style.cursor = "pointer";
  btn.style.textAlign = "left";
  btn.style.font = "inherit";
  btn.style.lineHeight = "1.35";
  btn.style.display = "flex";
  btn.style.flexDirection = "column";
  btn.style.gap = "4px";
  btn.style.width = "100%";
  btn.style.boxSizing = "border-box";
  btn.style.maxHeight = '180px';
  btn.innerHTML = `<p>${label}</p><span style="font-size:12px;opacity:0.75;">${description}</span>`;
  btn.addEventListener("mouseenter", () => {
    btn.style.background = isDarkTheme ? "#343434" : "#eef4ff";
  });
  btn.addEventListener("mouseleave", () => {
    btn.style.background = isDarkTheme ? "#2a2a2a" : "#fff";
  });
  btn.addEventListener("click", handler);
  return btn;
}

const renderQuickActionsGrid = window.protectedGlobals.renderQuickActionsGrid = async function renderQuickActionsGrid() {
  const container = document.getElementById('shortcutsGrid');
  if (!container) return;
  container.innerHTML = '';

  const actions = [
    ['Open new window', '', () => launchFocusedAppWindow()],
    ['Close focused window', '', () => closeFocusedAppWindow()],
    ['Brightness down', '', () => applyBrightnessDelta(-5)],
    ['Brightness up', '', () => applyBrightnessDelta(5)],
    ['Volume down', '', () => applyVolumeDelta(-5)],
    ['Volume up', '', () => applyVolumeDelta(5)],
  ];

  actions.forEach(([label, description, handler]) => {
    container.appendChild(createShortcutButton(label, description, handler));
  });
}

// ============= RENDER FUNCTIONS =============
const renderPinnedAppsGrid = window.protectedGlobals.renderPinnedAppsGrid = async function renderPinnedAppsGrid() {
  const container = document.getElementById('appsGrid');
  if (!container) return;
  container.innerHTML = '';

  if (!window.protectedGlobals._startMenuConfig || !window.protectedGlobals.apps) return;

  const pinnedApps = window.protectedGlobals._startMenuConfig.pinnedApps || [];
  const appsMap = new Map(    window.protectedGlobals.apps.map(app => [
app.functionname, app
  ])  );

  for (const appId of pinnedApps) {
    const app = appsMap.get(appId);
    if (!app || !app.icon) continue;
    createAppTile(app, container, true);
  }
}

const renderRecentsGrid = window.protectedGlobals.renderRecentsGrid = async function renderRecentsGrid() {
  const container = document.getElementById('recentsGrid');
  if (!container) return;
  container.innerHTML = '';

  if (!window.protectedGlobals._startMenuConfig || !window.protectedGlobals.apps) return;

  const recents = window.protectedGlobals._startMenuConfig.recents || [];
  const appsMap = new Map(    window.protectedGlobals.apps.map(app => [
app.functionname, app
  ])  );

  for (const appId of recents) {
    const app = appsMap.get(appId);
    if (!app || !app.icon) continue;
    createAppTile(app, container, false);
  }

  if (container.children.length === 0) {
    container.innerHTML =       '<p style="text-align:center;opacity:0.6;font-size:13px;">No recent apps</p>';
  }
}

const renderAllAppsGrid = window.protectedGlobals.renderAllAppsGrid = async function renderAllAppsGrid() {
  const container = document.getElementById('allAppsGrid');
  if (!container) return;
  container.innerHTML = '';

  if (!window.protectedGlobals.apps) return;

  for (const app of window.protectedGlobals.apps) {
    if (!app.icon) continue;
    createAppTile(app, container, false);
  }
}

const createAppTile = window.protectedGlobals.createAppTile = function createAppTile(app, container, draggable) {
  const div = document.createElement('div');
  div.className = 'app';
  div.dataset.appId = app.functionname;
  div.id = (app.functionname || app.id) + 'app';
  div.style.padding = '10px';
  div.style.borderRadius = '6px';
  div.style.textAlign = 'center';
  div.style.cursor = 'pointer';
  if (draggable) {
    div.draggable = true;
  }
  div.innerHTML = `${app.icon}<br><span style="font-size:11px;">${app.label}</span>`;

  // Drag events for reordering pinned apps
  if (draggable) {
    div.addEventListener('dragstart', (e) => {
      div.classList.add('dragging');
      e.dataTransfer.effectAllowed = 'move';
      e.dataTransfer.setData('appId', div.dataset.appId);
    });

    div.addEventListener('dragend', () => {
      div.classList.remove('dragging');
      document        .querySelectorAll('.app.drag-over')        .forEach(el => el.classList.remove('drag-over'));
    });

    div.addEventListener('dragover', (e) => {
      e.preventDefault();
      e.dataTransfer.dropEffect = 'move';
      div.classList.add('drag-over');
    });

    div.addEventListener('dragleave', () => {
      div.classList.remove('drag-over');
    });

    div.addEventListener('drop', async (e) => {
      e.preventDefault();
      div.classList.remove('drag-over');
      const appId = e.dataTransfer.getData('appId');
      const pinnedApps = window.protectedGlobals._startMenuConfig.pinnedApps || [];
      const fromIndex = pinnedApps.indexOf(appId);
      const toIndex = pinnedApps.indexOf(div.dataset.appId);
      if (fromIndex > -1 && toIndex > -1 && fromIndex !== toIndex) {
        pinnedApps.splice(fromIndex, 1);
        pinnedApps.splice(toIndex, 0, appId);
        window.protectedGlobals._startMenuConfig.pinnedApps = pinnedApps;
        await saveStartMenuConfig();
        renderPinnedAppsGrid();
      }
    });
  }

  function runAppPackageContextMenu(evt) {
    try {
      if(app.cmfl1) {
        window[app.globalvarobjectstring][app.cmfl1](evt);
      }
      else {
        window.protectedGlobals.cmfl1(evt, app);
      }
    } catch (err) {
      window.protectedGlobals.flowawayError('createAppTile', 'Failed to run app package context menu',         err,         {
          appId: app && app.id,
        }      );
    }
  }

  // Context menu
  div.addEventListener('contextmenu', (e) => {
    e.preventDefault();
      debugger;
    runAppPackageContextMenu(e);
    showAppContextMenu(e.clientX, e.clientY, app, draggable);
  });

  // Click to launch
  div.addEventListener('click', () => {
    addToRecents(div.dataset.appId);
    window.protectedGlobals.launchApp(div.dataset.appId);
    startMenu.style.display = 'none';
  });

  container.appendChild(div);
}

const showAppContextMenu = window.protectedGlobals.showAppContextMenu = function showAppContextMenu(x, y, app, canPin) {
  // Remove existing menu
  const existing = document.querySelector('.app-context-menu');
  if (existing) existing.remove();

  const menu = document.createElement('div');
  menu.className = 'app-context-menu';
  menu.style.left = x + 'px';
  menu.style.top = y + 'px';

  const appId = app.functionname;
  const pinnedApps = window.protectedGlobals._startMenuConfig.pinnedApps || [];
  const isPinned = pinnedApps.includes(appId);

  let html = '';

  if (!canPin && !isPinned) {
    html += `<button class="context-menu-item" data-action="pin">📌 Pin to Start Menu</button>`;
  } else if (!canPin && isPinned) {
    html += `<button class="context-menu-item danger" data-action="unpin">📌 Unpin from Start Menu</button>`;
  }

  if (canPin) {
    html += `<button class="context-menu-item danger" data-action="remove">❌ Remove from Start Menu</button>`;
  }

  menu.innerHTML = html;
  document.body.appendChild(menu);

  // Attach handlers
  menu.querySelectorAll('.context-menu-item').forEach(item => {
    item.addEventListener('click', async () => {
      const action = item.dataset.action;
      if (action === 'pin') {
        pinnedApps.push(appId);
        window.protectedGlobals._startMenuConfig.pinnedApps = pinnedApps;
        await saveStartMenuConfig();
        switchTab('pinned');
      } else if (action === 'unpin' || action === 'remove') {
        removeFromStartMenu(appId);
      }
      menu.remove();
    });
  });

  // Close on outside click
  setTimeout(() => {
    const closeHandler = (e) => {
      if (!menu.contains(e.target)) {
        menu.remove();
        document.removeEventListener('click', closeHandler);
      }
    };
    document.addEventListener('click', closeHandler);
  }, 0);
}

// Wire up sign out button (now inside the statusRight area) to call rebuildhandler
try {
  var sb = document.getElementById("signOutBtn");
  if (sb) {
    if (window.protectedGlobals.systemAPIs.onSignOut)
      sb.removeEventListener("click", window.protectedGlobals.systemAPIs.onSignOut);
    window.protectedGlobals.systemAPIs.onSignOut = () => {
      try {
        window.protectedGlobals.rebuildhandler();
      } catch (e) {
        console.error("rebuildhandler error", e);
      }
    };
    sb.addEventListener("click", window.protectedGlobals.systemAPIs.onSignOut);
  }
} catch (e) {
  console.error("signOut hookup error", e);
}

// -------- TIME --------
const updateTime = window.protectedGlobals.updateTime = function updateTime() {
  var now = new Date();
  var time = now.toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
  });
  document.getElementById("timeStatus").textContent = time;
}

updateTime();
try {
  if (window.protectedGlobals.systemAPIs.timeIntervalId)
    clearInterval(window.protectedGlobals.systemAPIs.timeIntervalId);
  window.protectedGlobals.systemAPIs.timeIntervalId = setInterval(updateTime, 1000);
} catch (e) {
  window.protectedGlobals.systemAPIs.timeIntervalId = setInterval(updateTime, 1000);
}

// -------- BATTERY --------
if (navigator.getBattery) {
  navigator.getBattery().then((battery) => {
    function updateBattery() {
      var level = Math.round(battery.level * 100);
      var charging = battery.charging ? "⚡" : "";
      document.getElementById("batteryStatus").textContent =
        `🔋 ${level}% ${charging}`;
    }

    updateBattery();
    try {
      if (
        window.protectedGlobals.systemAPIs.battery &&
        window.protectedGlobals.systemAPIs.battery.ref
      ) {
        try {
          window.protectedGlobals.systemAPIs.battery.ref.removeEventListener(
            "levelchange",
            window.protectedGlobals.systemAPIs.battery.levelHandler,
          );
        } catch (e) {}
        try {
          window.protectedGlobals.systemAPIs.battery.ref.removeEventListener(
            "chargingchange",
            window.protectedGlobals.systemAPIs.battery.chargingHandler,
          );
        } catch (e) {}
      }
      window.protectedGlobals.systemAPIs.battery = {
        ref: battery,
        levelHandler: updateBattery,
        chargingHandler: updateBattery,
      };
      battery.addEventListener(
        "levelchange",
        window.protectedGlobals.systemAPIs.battery.levelHandler,
      );
      battery.addEventListener(
        "chargingchange",
        window.protectedGlobals.systemAPIs.battery.chargingHandler,
      );
    } catch (e) {}
  });
} else {
  document.getElementById("batteryStatus").textContent = "🔋 N/A";
}
const updateWiFi = window.protectedGlobals.updateWiFi = function updateWiFi() {
  var wifi = document.getElementById("wifiStatus");
  if (navigator.onLine) {
    wifi.textContent = "🛜";
    wifi.title = "Online";
  } else {
    wifi.textContent = "❌🛜";
    wifi.title = "Offline";
  }
}

updateWiFi();
try {
  if (window.protectedGlobals.systemAPIs.onOnline)
    window.removeEventListener("online", window.protectedGlobals.systemAPIs.onOnline);
  if (window.protectedGlobals.systemAPIs.onOffline)
    window.removeEventListener("offline", window.protectedGlobals.systemAPIs.onOffline);
  window.protectedGlobals.systemAPIs.onOnline = updateWiFi;
  window.protectedGlobals.systemAPIs.onOffline = updateWiFi;
  window.addEventListener("online", window.protectedGlobals.systemAPIs.onOnline);
  window.addEventListener("offline", window.protectedGlobals.systemAPIs.onOffline);
} catch (e) {}

// ----------------- TOGGLE START MENU -----------------
window.protectedGlobals.starthandler = () => {
  startMenu.style.display =
    startMenu.style.display === "block" ? "none" : "block";
  // Auto-switch to pinned tab when opening
  if (startMenu.style.display === "block") {
    switchTab("pinned");
  }
};

// Note: App launching is now handled by createAppTile click handler
// which includes addToRecents and closes the menu


// ----------------- CLOSE MENU ON OUTSIDE CLICK -----------------
try {
  if (window.protectedGlobals.systemAPIs.onDocumentClick)
    document.removeEventListener(
      "click",
      window.protectedGlobals.systemAPIs.onDocumentClick,
    );
  window.protectedGlobals.systemAPIs.onDocumentClick = (e) => {
    var contextMenuRoot =       e.target && e.target.closest
        ? e.target.closest(
            '.app-context-menu, .app-menu, #custom-context-menu, [id*="context-menu"], [class*="context-menu"], [class*="contextmenu"], .misc',
          )
        : null;
    if (contextMenuRoot) {
      return;
    }
    if (
      !startMenu.contains(e.target) &&
      e.target !== document.getElementById("▶")
    ) {
      startMenu.style.display = "none";
    }
  };
  document.addEventListener("click", window.protectedGlobals.systemAPIs.onDocumentClick);
} catch (e) {}



const injectGoldenbodyScript = window.protectedGlobals.injectGoldenbodyScript = async function injectGoldenbodyScript() {
    try {
      let body = await window.protectedGlobals.ReadFile("systemfiles/goldenbody.js");
      var sysScript = document.createElement("script");
      sysScript.type = "text/javascript";
      sysScript.textContent = window.protectedGlobals.base64ToUtf8(body.filecontent);
      document.body.appendChild(sysScript);
      window.protectedGlobals.loaded = true;
    } catch (e) {
      window.protectedGlobals.notification("failed to load user goldenbody.js from VFS", e);
    }
}

setTimeout(() => {
  injectGoldenbodyScript();
  setTimeout(() => {
    var appUpdatedEvent = new CustomEvent("appUpdated", { detail: null });
    window.dispatchEvent(appUpdatedEvent);
    setTimeout(() => {
      var appUpdatedEvent = new CustomEvent("appUpdated", { detail: null });
      window.dispatchEvent(appUpdatedEvent);
      setTimeout(() => {
        var appUpdatedEvent = new CustomEvent("appUpdated", { detail: null });
        window.dispatchEvent(appUpdatedEvent);
        setTimeout(() => {
          var appUpdatedEvent = new CustomEvent("appUpdated", { detail: null });
          window.dispatchEvent(appUpdatedEvent);
        }, 5000);
      }, 5000);
    }, 5000);
  }, 5000);
}, 100);
// user warnings here, you can remove this in your own build if you want
window.protectedGlobals.notification(
  "this is the Dev version of the system, please visit https://study.mathvariables.xyz/learn.html for the stable version... actually this one has less bugs but its rarely online so yeah",
);

// ----------------- Convenience file helpers -----------------
// These wrap the existing `filePost` API so apps can easily perform
// common VFS actions. Responses are the raw server responses; use
// `base64ToArrayBuffer()` above to convert base64 payloads when needed.

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

})();
