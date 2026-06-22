(async function () {
  let refreshBatteryInfo = () => {
    window.protectedGlobals.updateBattery();
    window.protectedGlobals.statusData.batteryLevel = window.protectedGlobals.batteryLevel || NaN;
    window.protectedGlobals.statusData.isCharging = window.protectedGlobals.batteryCharging || false;
    window.protectedGlobals.updateStatusBar();
  };
  try {
    setTimeout(refreshBatteryInfo, 1000);
  } catch {}
  let batteryInterval = setInterval(refreshBatteryInfo, 60000);
  let timeInterval = setInterval(window.protectedGlobals.updateTime, 15000);
  // SVG Icons
  var svgIcons = {
    wifi: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12.55a11 11 0 0 1 14.08 0"/><path d="M1.42 9a16 16 0 0 1 21.16 0"/><path d="M8.53 16.11a6 6 0 0 1 6.94 0"/><circle cx="12" cy="20" r="1.5" fill="currentColor" stroke="none"/></svg>',
    battery: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="1" y="6" width="18" height="12" rx="2" ry="2"/><line x1="23" y1="9" x2="23" y2="15"/></svg>',
    brightness: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="5"/><line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/><line x1="1" y1="12" x2="3" y2="12"/><line x1="21" y1="12" x2="23" y2="12"/><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/></svg>'
  };
  let batteryIcons = {
    0: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="1" y="6" width="18" height="12" rx="2" ry="2"/><line x1="23" y1="9" x2="23" y2="15"/></svg>',
    // up to 1/5 filled black, leave some margin with the icon border so it look good
    20: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"> <rect x="1" y="6" width="18" height="12" rx="2" ry="2"/> <line x1="23" y1="9" x2="23" y2="15"/> <rect x="3.5" y="8.5" width="3" height="7" rx="1" fill="currentColor" stroke="none"/> </svg>',
    40: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"> <rect x="1" y="6" width="18" height="12" rx="2" ry="2"/> <line x1="23" y1="9" x2="23" y2="15"/> <rect x="3.5" y="8.5" width="6" height="7" rx="1" fill="currentColor" stroke="none"/> </svg>',
    60: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"> <rect x="1" y="6" width="18" height="12" rx="2" ry="2"/> <line x1="23" y1="9" x2="23" y2="15"/> <rect x="3.5" y="8.5" width="9" height="7" rx="1" fill="currentColor" stroke="none"/> </svg>',
    80: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"> <rect x="1" y="6" width="18" height="12" rx="2" ry="2"/> <line x1="23" y1="9" x2="23" y2="15"/> <rect x="3.5" y="8.5" width="12" height="7" rx="1" fill="currentColor" stroke="none"/> </svg>',
    100: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"> <rect x="1" y="6" width="18" height="12" rx="2" ry="2"/> <line x1="23" y1="9" x2="23" y2="15"/> <rect x="3.5" y="8.5" width="14" height="7" rx="1" fill="currentColor" stroke="none"/> </svg>'
  }
  function calcTop() {
    let atTop = '';
    let topZindex = 0;
    for (let win of document.querySelectorAll('.app-window-root')) {
      if (win.style.display === 'none') continue;
      const z = parseInt(window.getComputedStyle(win).zIndex) || 0;
      if (z > topZindex) {
        topZindex = z;
        atTop = win.dataset && win.dataset.appId ? win.dataset.appId : (win.id ? String(win.id).trim() : '');
      }
    }
    for (let app of window.protectedGlobals.apps) {
      for (let win of window[app.globalvarobjectstring]?.[app.allapparraystring] || []) {
        if (win.rootElement.style.display !== 'none' && win.rootElement.style.zIndex == topZindex) {
          atTop = app.functionname;
          break;
        }
      }
    }
    return atTop;
  }
  var taskbuttonStyles = document.createElement('style');
  taskbuttonStyles.textContent = `
    .taskbutton {
      position: relative;
      transition: all 0.2s ease;
      min-height: 40px;
      max-height: 40px;
    }
    
    .taskbutton::after {
      content: '';
      position: absolute;
      bottom: 2px;
      left: 50%;
      transform: translateX(-50%);
      width: 0;
      height: 3px;
      background-color: #000;
      border-radius: 2px;
      transition: width 0.2s ease, background-color 0.2s ease;
    }
    
    /* Active app - long purple line */
    .taskbutton.task-active {
      opacity: 1;
      filter: brightness(1.1);
    }
    
    .taskbutton.light.task-active::after {
      width: 40px;
      background-color: #9966ff;
      height: 4px;
    }
    .taskbutton.dark.task-active::after {
      width: 40px;
      background-color: #cc99ff;
      height: 4px;
  }
    /* Open but not focused - short black line */
    .taskbutton.task-open {
      opacity: 0.85;
    }
    
    .taskbutton.light.task-open::after {
      width: 20px;
      background-color: #000;
    }
    
    .taskbutton.dark.task-open::after {
      width: 20px;
      background-color: #fff;
    }
    
    /* Closed/not running - no indicator */
    .taskbutton.task-closed {}
    
    .taskbutton.task-closed::after {
      width: 0;
    }

    /* Status bar styles */
    .taskbar-divider {
      width: 1px;
      height: 40px;
      background-color: rgba(0, 0, 0, 0.2);
      margin: 0 8px;
    }

    .taskbar-divider.dark {
      background-color: rgba(255, 255, 255, 0.2);
    }

    .status-container {
      display: flex;
      align-items: center;
      gap: 12px;
      margin-right: 8px;
    }

    .status-item {
      display: flex;
      align-items: center;
      justify-content: center;
      width: 36px;
      height: 36px;
      cursor: pointer;
      border-radius: 6px;
      transition: all 0.2s ease;
      user-select: none;
    }

    .status-item:hover {
      background-color: rgba(0, 0, 0, 0.1);
    }

    .status-item.dark:hover {
      background-color: rgba(255, 255, 255, 0.15);
    }

    .status-item svg {
      width: 18px;
      height: 18px;
      stroke: currentColor;
    }

    .taskbar.light .status-item {
      color: #000;
    }

    .taskbar.dark .status-item {
      color: #fff;
    }

    .taskbar.light .time-display {
      color: #000;
    }

    .taskbar.dark .time-display {
      color: #fff;
    }

    .status-icon {
      font-size: 18px;
      display: flex;
      align-items: center;
      justify-content: center;
    }

    .time-display {
      font-size: 13px;
      font-weight: 500;
      min-width: 70px;
      text-align: center;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
      color: inherit;
    }

    .status-item:has(.time-display) {
      min-width: 70px;
      max-width: 70px;
      transition: all 0.2s ease;
    }

    .status-item:has(.time-display):hover {
      min-width: 80px;
      max-width: 80px;
    }

    .taskbar-buttons-container {
      display: flex;
      align-items: center;
      gap: 0;
      max-width: 80%;
      overflow-x: auto;
      overflow-y: hidden;
      scrollbar-width: none;
    }

    .taskbar-buttons-container::-webkit-scrollbar {
      display: none;
    }

    .taskbar-right-section {
      display: flex;
      align-items: center;
      margin-left: auto;
      gap: 0;
    }

    .status-menu {
      position: fixed;
      right: 10px;
      bottom: 70px;
      background: rgba(240, 240, 240, 0.98);
      backdrop-filter: blur(10px);
      border-radius: 12px;
      box-shadow: 0 8px 32px rgba(0, 0, 0, 0.15);
      padding: 16px;
      min-width: 280px;
      z-index: 100000;
      display: none;
      flex-direction: column;
      gap: 12px;
      color: #000;
    }

    .status-menu.dark {
      background: rgba(50, 50, 50, 0.98);
      color: #fff;
    }

    .status-menu.show {
      display: flex;
    }

    .status-section {
      display: flex;
      flex-direction: column;
      gap: 8px;
    }

    .status-section-title {
      font-size: 11px;
      font-weight: 600;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      opacity: 0.6;
      margin-bottom: 4px;
    }

    .status-toggle {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 10px;
      border-radius: 8px;
      background: rgba(0, 0, 0, 0.05);
      cursor: pointer;
      transition: all 0.2s ease;
    }

    .status-toggle.dark {
      background: rgba(255, 255, 255, 0.08);
    }

    .status-toggle:hover {
      background: rgba(0, 0, 0, 0.1);
    }

    .status-toggle.dark:hover {
      background: rgba(255, 255, 255, 0.12);
    }

    .toggle-label {
      display: flex;
      align-items: center;
      gap: 8px;
      font-size: 14px;
      font-weight: 500;
      color: inherit;
    }

    .toggle-label svg,
    .slider-label svg {
      width: 18px;
      height: 18px;
      stroke: currentColor;
      flex-shrink: 0;
    }

    .toggle-switch {
      width: 44px;
      height: 24px;
      background: rgba(0, 0, 0, 0.3);
      border-radius: 12px;
      position: relative;
      transition: all 0.3s ease;
    }

    .toggle-switch.active {
      background: #5ac950;
    }

    .toggle-switch-dot {
      width: 20px;
      height: 20px;
      background: white;
      border-radius: 50%;
      position: absolute;
      top: 2px;
      left: 2px;
      transition: all 0.3s ease;
    }

    .toggle-switch.active .toggle-switch-dot {
      left: 22px;
    }

    .slider-container {
      display: flex;
      flex-direction: column;
      gap: 6px;
    }

    .slider-label {
      font-size: 14px;
      font-weight: 500;
      display: flex;
      justify-content: space-between;
      align-items: center;
    }

    .slider {
      width: 100%;
      height: 6px;
      border-radius: 3px;
      background: rgba(0, 0, 0, 0.1);
      outline: none;
      -webkit-appearance: none;
      appearance: none;
    }

    .slider.dark {
      background: rgba(255, 255, 255, 0.15);
    }

    .slider::-webkit-slider-thumb {
      -webkit-appearance: none;
      appearance: none;
      width: 14px;
      height: 14px;
      border-radius: 50%;
      background: #5ac950;
      cursor: pointer;
      transition: all 0.2s ease;
    }

    .slider::-moz-range-thumb {
      width: 14px;
      height: 14px;
      border-radius: 50%;
      background: #5ac950;
      cursor: pointer;
      border: none;
      transition: all 0.2s ease;
    }

    .battery-bar {
      width: 100%;
      height: 8px;
      background: rgba(0, 0, 0, 0.1);
      border-radius: 4px;
      overflow: hidden;
    }

    .battery-bar.dark {
      background: rgba(255, 255, 255, 0.15);
    }

    .battery-fill {
      height: 100%;
      background: #5ac950;
      border-radius: 4px;
      transition: all 0.3s ease;
    }

    .battery-fill.low {
      background: #ff9500;
    }

    .battery-fill.critical {
      background: #ff3b30;
    }

    .status-info {
      font-size: 12px;
      opacity: 0.7;
      display: flex;
      justify-content: space-between;
      padding: 8px 10px;
      border-radius: 8px;
      background: rgba(0, 0, 0, 0.05);
    }

    .status-info.dark {
      background: rgba(255, 255, 255, 0.08);
    }
  `;
  document.head.appendChild(taskbuttonStyles);
  // taskbar
  var taskbuttons;
  // Remove any existing taskbar element (cleanup from previous runs)
  var _oldTb = document.getElementById('taskbar');
  if (_oldTb) _oldTb.remove();
  // Create the taskbar
  var taskbar = document.createElement("div");
  window.protectedGlobals.taskbar = taskbar; // expose taskbar reference for other modules
  taskbar.className = 'taskbar';
  taskbar.style.opacity = 0.8;
  taskbar.id = "taskbar";
  taskbar.style.position = "fixed";
  taskbar.style.zIndex = 100000; // very high z-index to ensure it stays on top of app content but below modals/menus
  taskbar.style.bottom = "0";
  taskbar.style.left = "0";
  taskbar.style.width = "100%";
  taskbar.style.height = "60px";
  taskbar.style.display = "flex";
  taskbar.style.alignItems = "center";
  taskbar.style.paddingLeft = "4%"; // 50px empty space on left
  taskbar.style.paddingRight = "1%"; // Add padding on right
  taskbar.style.boxSizing = "border-box";
  document.body.appendChild(taskbar);
  window.protectedGlobals.taskbar = taskbar;

  // Create taskbuttons container
  var taskbuttonsContainer = document.createElement('div');
  taskbuttonsContainer.className = 'taskbar-buttons-container';
  taskbuttonsContainer.id = 'taskbar-buttons-container';
  window.protectedGlobals.taskbuttonsContainer = taskbuttonsContainer;
  taskbar.appendChild(taskbuttonsContainer);

  // Create right section for status bar
  var rightSection = document.createElement('div');
  rightSection.className = 'taskbar-right-section';
  rightSection.id = 'taskbar-right-section';
  window.protectedGlobals.rightSection = rightSection;
  let tempdata = null;
  try {
    tempdata = await window.protectedGlobals.ReadFile('/systemfiles/userprofile/statusData.json', { text: true, direct: true });
    tempdata = JSON.parse(tempdata);
    tempdata.wifiEnabled = true;
  } catch {}
  // Initialize protectedGlobals status data
  if (!tempdata) {
    window.protectedGlobals.statusData = {
      wifiEnabled: true, // Always start with WiFi on, don't persist
      batterySaverEnabled: (window.protectedGlobals.data && window.protectedGlobals.data.batterySaverEnabled) || false,
      brightness: (window.protectedGlobals.data && window.protectedGlobals.data.brightness) || 100,
      batteryLevel: window.protectedGlobals.batteryLevel || NaN,
      isCharging: false
    };
  }
  else window.protectedGlobals.statusData = tempdata;
  // Apply initial brightness if not at 100%
  if (window.protectedGlobals.statusData.brightness !== 100) {
    document.documentElement.style.filter = 'brightness(' + (window.protectedGlobals.statusData.brightness / 100) + ')';
  }

  // Create status bar on the right side
  var statusContainer = document.createElement('div');
  statusContainer.className = 'status-container';
  
  // WiFi indicator
  var wifiItem = document.createElement('div');
  wifiItem.className = 'status-item';
  wifiItem.innerHTML = svgIcons.wifi;
  wifiItem.title = 'WiFi';
  wifiItem.addEventListener('click', function(e) {
    e.stopPropagation();
    window.protectedGlobals.statusData.wifiEnabled = !window.protectedGlobals.statusData.wifiEnabled;
    window.dispatchEvent(new CustomEvent('wifi-toggle', { detail: { enabled: window.protectedGlobals.statusData.wifiEnabled } }));
    updateStatusBar();
    if (window.protectedGlobals.buildStatusMenu) window.protectedGlobals.buildStatusMenu();
  });
  
  // Battery indicator
  var batteryItem = document.createElement('div');
  batteryItem.className = 'status-item';
  batteryItem.innerHTML = svgIcons.battery;
  batteryItem.title = 'Battery';
  
  // Time display
  var timeItem = document.createElement('div');
  timeItem.className = 'status-item';
  var timeDisplay = document.createElement('div');
  timeDisplay.className = 'time-display';
  timeItem.appendChild(timeDisplay);
  timeItem.title = 'System Status';
  timeItem.style.cursor = 'pointer';
  timeItem.style.marginRight = '8px';
  
  // Brightness indicator
  var brightnessItem = document.createElement('div');
  brightnessItem.className = 'status-item';
  brightnessItem.innerHTML = svgIcons.brightness;
  brightnessItem.title = 'Brightness';
  
  statusContainer.appendChild(wifiItem);
  statusContainer.appendChild(batteryItem);
  statusContainer.appendChild(timeItem);
  
  // Add divider
  var divider = document.createElement('div');
  divider.className = 'taskbar-divider';
  if (window.protectedGlobals.data && window.protectedGlobals.data.dark) {
    divider.classList.add('dark');
  }
  rightSection.appendChild(divider);
  rightSection.appendChild(statusContainer);
  taskbar.appendChild(rightSection);
  
  // Create status menu
  var statusMenu = document.createElement('div');
  statusMenu.className = 'status-menu';
  if (window.protectedGlobals.data && window.protectedGlobals.data.dark) {
    statusMenu.classList.add('dark');
  }
  statusMenu.id = 'status-menu';
  document.body.appendChild(statusMenu);
  
  // Build status menu content
  window.protectedGlobals.buildStatusMenu = function() {
    statusMenu.innerHTML = `
      <div class="status-section">
        <div class="status-section-title">CONNECTIVITY</div>
        <div class="status-toggle" data-toggle="wifi">
          <div class="toggle-label">
            ${svgIcons.wifi}
            <span>WiFi</span>
          </div>
          <div class="toggle-switch ${window.protectedGlobals.statusData.wifiEnabled ? 'active' : ''}">
            <div class="toggle-switch-dot"></div>
          </div>
        </div>
      </div>
      
      <div class="status-section">
        <div class="status-section-title">POWER</div>
        <div class="status-toggle" data-toggle="battery-saver">
          <div class="toggle-label">
            ${svgIcons.battery}
            <span>Battery Saver</span>
          </div>
          <div class="toggle-switch ${window.protectedGlobals.statusData.batterySaverEnabled ? 'active' : ''}">
            <div class="toggle-switch-dot"></div>
          </div>
        </div>
        <div class="status-info">
          <span>Battery: ${window.protectedGlobals.statusData.batteryLevel}%</span>
          <span>${window.protectedGlobals.statusData.isCharging ? '⚡ Charging' : ''}</span>
        </div>
      </div>
      
      <div class="status-section">
        <div class="slider-container">
          <div class="slider-label">
            ${svgIcons.brightness}
            <span id="brightness-value">${window.protectedGlobals.statusData.brightness}%</span>
          </div>
          <input type="range" class="slider" id="brightness-slider" min="10" max="${window.protectedGlobals.statusData.batterySaverEnabled ? 50 : 100}" value="${window.protectedGlobals.statusData.brightness}">
        </div>
      </div>
    `;
    
    // Add event listeners to toggles
    var toggles = statusMenu.querySelectorAll('.status-toggle');
    toggles.forEach(function(toggle) {
      toggle.addEventListener('click', function(e) {
        // prevent this click from bubbling to document click handler which would close the menu
        if (e && e.stopPropagation) e.stopPropagation();
        var toggleType = this.dataset.toggle;
        if (toggleType === 'wifi') {
          window.protectedGlobals.statusData.wifiEnabled = !window.protectedGlobals.statusData.wifiEnabled;
          window.dispatchEvent(new CustomEvent('wifi-toggle', { detail: { enabled: window.protectedGlobals.statusData.wifiEnabled } }));
          updateStatusBar();
        } else if (toggleType === 'battery-saver') {
          window.protectedGlobals.statusData.batterySaverEnabled = !window.protectedGlobals.statusData.batterySaverEnabled;
          if (!window.protectedGlobals.data) window.protectedGlobals.data = {};
          window.protectedGlobals.data.batterySaverEnabled = window.protectedGlobals.statusData.batterySaverEnabled;
          if (window.protectedGlobals.statusData.batterySaverEnabled) {
            window.protectedGlobals.statusData.brightness /= 2; // dim brightness when battery saver is on
          } else {
            window.protectedGlobals.statusData.brightness *= 2; // restore brightness when battery saver is off
          }
          document.documentElement.style.filter = 'brightness(' + (window.protectedGlobals.statusData.brightness / 100) + ')';
          // turn it off when battery saver is closed
          // persist to server if available
          window.protectedGlobals.writeStatus();
          updateStatusBar();
        }
        window.protectedGlobals.buildStatusMenu();
      });
    });
    
    // Brightness slider
    var brightnessSlider = statusMenu.querySelector('#brightness-slider');
    if (brightnessSlider) {
      // prevent pointerdown clicks on the slider from bubbling and closing the menu
      brightnessSlider.addEventListener('pointerdown', function(e) { if (e && e.stopPropagation) e.stopPropagation(); });
      brightnessSlider.addEventListener('input', function(e) {
        window.protectedGlobals.statusData.brightness = Number(e.target.value);
        statusMenu.querySelector('#brightness-value').textContent = window.protectedGlobals.statusData.brightness + '%';
        // Apply brightness filter to document
        var brightnessValue = window.protectedGlobals.statusData.brightness / 100;
        document.documentElement.style.filter = 'brightness(' + brightnessValue + ')';
        window.protectedGlobals.writeStatus();
        updateStatusBar();
      });
    }
  };
  
  // Update status bar display
  window.protectedGlobals.updateStatusBar = function() {
    // Update WiFi icon
    wifiItem.innerHTML = window.protectedGlobals.statusData.wifiEnabled ? svgIcons.wifi : '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" opacity="0.4" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12.55a11 11 0 0 1 14.08 0"/><path d="M1.42 9a16 16 0 0 1 21.16 0"/><path d="M8.53 16.11a6 6 0 0 1 6.94 0"/><circle cx="12" cy="20" r="1.5" fill="currentColor" stroke="none"/></svg>';
    
    // Update battery icon color
    var batteryPercent = window.protectedGlobals.statusData.batteryLevel;
    if (batteryPercent >= 80) {
      batteryItem.innerHTML = batteryIcons[80];
    } else if (batteryPercent >= 60) {
      batteryItem.innerHTML = batteryIcons[60];
    } else if (batteryPercent >= 40) {
      batteryItem.innerHTML = batteryIcons[40];
    } else if (batteryPercent >= 20) {
      batteryItem.innerHTML = batteryIcons[20];
    } else if (batteryPercent >= 0) {
      batteryItem.innerHTML = batteryIcons[0];
    } else {
      batteryItem.innerHTML = batteryIcons[0];
    }
    
    // Update time display
    function updateTime() {
    var now = new Date();
    var hours = String(now.getHours()).padStart(2, '0');
    var mins = String(now.getMinutes()).padStart(2, '0');
    var ampm = now.getHours() >= 12 ? 'PM' : 'AM';
    timeDisplay.textContent = hours + ':' + mins + ' ' + ampm;
    }
    updateTime();
    window.protectedGlobals.updateTime = updateTime; // expose updateTime for external calls if needed
  };
  
  // Bind updateStatusBar to the local scope reference
  var updateStatusBar = window.protectedGlobals.updateStatusBar;
  
  // Update time every minute
  setInterval(updateStatusBar, 60000);
  updateStatusBar();
  
  // Initialize status bar theme
  
  // Time click handler - toggle status menu
  timeItem.addEventListener('click', function(e) {
    e.stopPropagation();
    statusMenu.classList.toggle('show');
    if (statusMenu.classList.contains('show')) {
      window.protectedGlobals.buildStatusMenu();
    }
  });
  
  // Close menu when clicking outside
  document.addEventListener('click', function(e) {
    if (!statusMenu.contains(e.target) && !timeItem.contains(e.target)) {
      statusMenu.classList.remove('show');
    }
  });
  
  // Update status bar theme when switching between light/dark
  window.protectedGlobals.updateStatusBarTheme = function() {
    if (window.protectedGlobals.data && window.protectedGlobals.data.dark) {
      statusMenu.classList.add('dark');
      divider.classList.add('dark');
    } else {
      statusMenu.classList.remove('dark');
      divider.classList.remove('dark');
    }
  };
  // window.protectedGlobals.updateStatusBarTheme();

  // Autohide support (reveals only from bottom-edge hold)
  var autohideEnabled = !!(window.protectedGlobals.data && window.protectedGlobals.data.autohidetaskbar);
  function getTaskbarRevealEdgePx() {
    var v = Number(window.protectedGlobals.data && window.protectedGlobals.data.taskbarRevealEdgePx);
    if (!Number.isFinite(v)) return 6;
    return Math.max(1, Math.min(64, Math.round(v)));
  }
  function getTaskbarRevealHoldDelayMs() {
    var v = Number(window.protectedGlobals.data && window.protectedGlobals.data.taskbarRevealHoldDelayMs);
    if (!Number.isFinite(v)) return 450;
    return Math.max(0, Math.min(5000, Math.round(v)));
  }
  // Ensure global handler registry exists and clean any previous autohide listeners
  window.protectedGlobals.systemAPIs = window.protectedGlobals.systemAPIs || {};
  if (window.protectedGlobals.systemAPIs.autohideCleanup) {
    window.protectedGlobals.systemAPIs.autohideCleanup();
    delete window.protectedGlobals.systemAPIs.autohideCleanup;
  }
  if (window.protectedGlobals.systemAPIs.taskButtonContextMenuCleanup) {
    window.protectedGlobals.systemAPIs.taskButtonContextMenuCleanup();
    delete window.protectedGlobals.systemAPIs.taskButtonContextMenuCleanup;
  }
  // Also remove any previously-registered autohide refs (older versions)
  if (window.protectedGlobals.systemAPIs.autohideRefs) {
    var r = window.protectedGlobals.systemAPIs.autohideRefs;
    if (r && r.mousemove) document.removeEventListener('mousemove', r.mousemove);
    if (r && r.pointerenter) document.removeEventListener('pointerenter', r.pointerenter);
    if (r && r.pointerleave) document.removeEventListener('pointerleave', r.pointerleave);
    if (r && r.touchstart) document.removeEventListener('touchstart', r.touchstart);
    if (r && r.touchmove) document.removeEventListener('touchmove', r.touchmove);
    if (r && r.touchend) document.removeEventListener('touchend', r.touchend);
    if (r && r.touchcancel) document.removeEventListener('touchcancel', r.touchcancel);
    delete window.protectedGlobals.systemAPIs.autohideRefs;
  }
  taskbar.style.transition = 'transform 0.25s ease, opacity 0.25s ease';
  taskbar.style.transform = 'translateY(0)';
  var taskbarVisible = true;
  function showTaskbar() {
    if (_hideTimer) {
      clearTimeout(_hideTimer);
      _hideTimer = null;
    }
    if (taskbarVisible) return;
    taskbar.style.transform = 'translateY(0)';
    taskbar.style.opacity = 0.8;
    taskbarVisible = true;
  }
  function hideTaskbar() {
    if (!taskbarVisible) return;
    taskbar.style.transform = 'translateY(100%)';
    taskbar.style.opacity = 0;
    taskbarVisible = false;
  }
  // Autohide handlers (kept as references so we can add/remove them)
  var _revealHoldTimer = null;
  var _hideTimer = null;
  var autohideActive = false; // whether listeners are currently attached
  var _taskButtonContextMenuOpen = false;
  var _taskbarContextMenuOpen = false;
  var _lastMouseX = null;
  var _lastMouseY = null;
  function _isMouseWithinTaskbarRect() {
    if (!Number.isFinite(_lastMouseX) || !Number.isFinite(_lastMouseY)) return false;
    var rect = taskbar.getBoundingClientRect();
    return (
      _lastMouseX >= rect.left &&
      _lastMouseX <= rect.right &&
      _lastMouseY >= rect.top &&
      _lastMouseY <= rect.bottom
    );
  }
  function _cancelHideTimer() {
    if (_hideTimer) {
      clearTimeout(_hideTimer);
      _hideTimer = null;
    }
  }
  function _cancelRevealTimer() {
    if (_revealHoldTimer) {
      clearTimeout(_revealHoldTimer);
      _revealHoldTimer = null;
    }
  }
  function _scheduleHide() {
    _cancelHideTimer();
    _hideTimer = setTimeout(function () {
      if (_taskButtonContextMenuOpen || _taskbarContextMenuOpen) {
        _hideTimer = null;
        return;
      }
      if (taskbar.matches(':hover') || _isMouseWithinTaskbarRect()) {
        _hideTimer = null;
        return;
      }
      hideTaskbar();
      _hideTimer = null;
    }, 120);
  }
  function _onMouseMove(e) {
    _lastMouseX = e.clientX;
    _lastMouseY = e.clientY;
    var revealEdgePx = getTaskbarRevealEdgePx();
    var inRevealZone = e.clientY >= window.innerHeight - revealEdgePx;
    if (inRevealZone) {
      if (taskbarVisible) {
        _cancelRevealTimer();
        return;
      }
      if (_revealHoldTimer) return;
      _revealHoldTimer = setTimeout(function () {
        _revealHoldTimer = null;
        showTaskbar();
      }, getTaskbarRevealHoldDelayMs());
    } else {
      _cancelRevealTimer();
      _scheduleHide();
    }
  }
  function _onTaskbarEnter() {
    _cancelHideTimer();
    showTaskbar();
  }
  function _onTaskbarLeave() {
    if (_taskButtonContextMenuOpen || _taskbarContextMenuOpen) return;
    _cancelRevealTimer();
    _cancelHideTimer();
    hideTaskbar();
  }
  function _setTaskButtonContextMenuOpen(isOpen) {
    if (!autohideEnabled) {
      _taskButtonContextMenuOpen = false;
      return;
    }
    _taskButtonContextMenuOpen = !!isOpen;
    if (_taskButtonContextMenuOpen) {
      showTaskbar();
      return;
    }
    _scheduleHide();
  }
  function _onContextMenuCapture(e) {
    if (!autohideEnabled) return;
    var isTaskButton = !!(e && e.target && e.target.closest && e.target.closest('.taskbutton'));
    _setTaskButtonContextMenuOpen(isTaskButton);
  }
  function _onPointerDownCloseTaskButtonContextMenu() {
    if (_taskButtonContextMenuOpen) _setTaskButtonContextMenuOpen(false);
  }
  function _onEscapeCloseTaskButtonContextMenu(e) {
    if (e && e.key === 'Escape' && _taskButtonContextMenuOpen) {
      _setTaskButtonContextMenuOpen(false);
    }
  }
  function _setTaskbarContextMenuOpen(isOpen) {
    if (!autohideEnabled) {
      _taskbarContextMenuOpen = false;
      return;
    }
    _taskbarContextMenuOpen = !!isOpen;
    if (_taskbarContextMenuOpen) {
      showTaskbar();
      return;
    }
    _scheduleHide();
  }
  taskbar.addEventListener('contextmenu', _onContextMenuCapture, true);
  document.addEventListener('contextmenu', _onContextMenuCapture, true);
  document.addEventListener('pointerdown', _onPointerDownCloseTaskButtonContextMenu, true);
  document.addEventListener('keydown', _onEscapeCloseTaskButtonContextMenu, true);
  window.protectedGlobals.systemAPIs.taskButtonContextMenuCleanup = function () {
    taskbar.removeEventListener('contextmenu', _onContextMenuCapture, true);
    document.removeEventListener('contextmenu', _onContextMenuCapture, true);
    document.removeEventListener('pointerdown', _onPointerDownCloseTaskButtonContextMenu, true);
    document.removeEventListener('keydown', _onEscapeCloseTaskButtonContextMenu, true);
  };
  function _onTouchStart(e) {
    var t = e.touches && e.touches[0];
    if (!t) return;
    var revealEdgePx = getTaskbarRevealEdgePx();
    if (t.clientY >= window.innerHeight - revealEdgePx) {
      if (taskbarVisible) {
        _cancelRevealTimer();
        return;
      }
      if (_revealHoldTimer) return;
      _revealHoldTimer = setTimeout(function () {
        _revealHoldTimer = null;
        showTaskbar();
      }, getTaskbarRevealHoldDelayMs());
    } else {
      _cancelRevealTimer();
      _scheduleHide();
    }
  }
  function _onTouchMove(e) {
    var t = e.touches && e.touches[0];
    if (!t) return;
    var revealEdgePx = getTaskbarRevealEdgePx();
    if (t.clientY < window.innerHeight - revealEdgePx) {
      _cancelRevealTimer();
      _scheduleHide();
    }
  }
  function _onTouchEnd() {
    _cancelRevealTimer();
    _scheduleHide();
  }

  function enableAutohide() {
    if (autohideActive) return;
    autohideEnabled = true;
    hideTaskbar();
    for(let root of document.querySelectorAll('.app-window-root')){
      if(root.style.height === `calc(100% - 60px)`) {
      root.style.height = '100%';
      }
    }
    document.addEventListener('mousemove', _onMouseMove);
    taskbar.addEventListener('pointerenter', _onTaskbarEnter);
    taskbar.addEventListener('pointerleave', _onTaskbarLeave);
    document.addEventListener('touchstart', _onTouchStart, { passive: true });
    document.addEventListener('touchmove', _onTouchMove, { passive: true });
    document.addEventListener('touchend', _onTouchEnd, { passive: true });
    document.addEventListener('touchcancel', _onTouchEnd, { passive: true });

    // register cleanup so other instances (rebuild) can remove these listeners
    window.protectedGlobals.systemAPIs.autohideCleanup = function () {
      _cancelRevealTimer();
      if (_hideTimer) {
        clearTimeout(_hideTimer);
        _hideTimer = null;
      }
      document.removeEventListener('mousemove', _onMouseMove);
      taskbar.removeEventListener('pointerenter', _onTaskbarEnter);
      taskbar.removeEventListener('pointerleave', _onTaskbarLeave);
      document.removeEventListener('touchstart', _onTouchStart);
      document.removeEventListener('touchmove', _onTouchMove);
      document.removeEventListener('touchend', _onTouchEnd);
      document.removeEventListener('touchcancel', _onTouchEnd);
    };
    // also expose concrete refs so older runtimes can remove them explicitly
    window.protectedGlobals.systemAPIs.autohideRefs = {
      mousemove: _onMouseMove,
      pointerenter: _onTaskbarEnter,
      pointerleave: _onTaskbarLeave,
      touchstart: _onTouchStart,
      touchmove: _onTouchMove,
      touchend: _onTouchEnd,
      touchcancel: _onTouchEnd
    };
    autohideActive = true;
  }

  function disableAutohide() {
    if (!autohideEnabled) return;
    autohideEnabled = false;
    _cancelRevealTimer();
    for(let root of document.querySelectorAll('.app-window-root')){
      if(root.style.height === `100%`) {
      root.style.height = `calc(100% - 60px)`;
      }
    }
    if (_hideTimer) {
      clearTimeout(_hideTimer);
      _hideTimer = null;
    }
    // remove listeners added when enabled
    if (window.protectedGlobals.systemAPIs && window.protectedGlobals.systemAPIs.autohideCleanup) {
      window.protectedGlobals.systemAPIs.autohideCleanup();
      delete window.protectedGlobals.systemAPIs.autohideCleanup;
    } else {
      document.removeEventListener('mousemove', _onMouseMove);
      taskbar.removeEventListener('pointerenter', _onTaskbarEnter);
      taskbar.removeEventListener('pointerleave', _onTaskbarLeave);
      document.removeEventListener('touchstart', _onTouchStart);
      document.removeEventListener('touchmove', _onTouchMove);
      document.removeEventListener('touchend', _onTouchEnd);
      document.removeEventListener('touchcancel', _onTouchEnd);
    }
    if (window.protectedGlobals.systemAPIs && window.protectedGlobals.systemAPIs.autohideRefs) {
      var rr = window.protectedGlobals.systemAPIs.autohideRefs;
      if (rr && rr.mousemove) document.removeEventListener('mousemove', rr.mousemove);
      if (rr && rr.pointerenter) taskbar.removeEventListener('pointerenter', rr.pointerenter);
      if (rr && rr.pointerleave) taskbar.removeEventListener('pointerleave', rr.pointerleave);
      if (rr && rr.touchstart) document.removeEventListener('touchstart', rr.touchstart);
      if (rr && rr.touchmove) document.removeEventListener('touchmove', rr.touchmove);
      if (rr && rr.touchend) document.removeEventListener('touchend', rr.touchend);
      if (rr && rr.touchcancel) document.removeEventListener('touchcancel', rr.touchcancel);
      delete window.protectedGlobals.systemAPIs.autohideRefs;
    }
    autohideActive = false;
    // ensure visible
    showTaskbar();
  }

  window.protectedGlobals.applyTaskbarAutohideSettings = function (settings) {
    if (!window.protectedGlobals.data) window.protectedGlobals.data = {};
    if (settings && settings.autohidetaskbar !== undefined) {
      window.protectedGlobals.data.autohidetaskbar = !!settings.autohidetaskbar;
    }
    if (settings && settings.taskbarRevealEdgePx !== undefined) {
      window.protectedGlobals.data.taskbarRevealEdgePx = Number(settings.taskbarRevealEdgePx);
    }
    if (settings && settings.taskbarRevealHoldDelayMs !== undefined) {
      window.protectedGlobals.data.taskbarRevealHoldDelayMs = Number(settings.taskbarRevealHoldDelayMs);
    }
    autohideEnabled = !!(window.protectedGlobals.data && window.protectedGlobals.data.autohidetaskbar);
    if (autohideEnabled) enableAutohide(); else disableAutohide();
  };

  // Initialize autohide according to current setting
  if (autohideEnabled) enableAutohide(); else disableAutohide();

  // Context menu on taskbar to toggle autohide
  (function attachTaskbarContextMenu() {
    var cm = document.createElement('div');
    cm.style.position = 'fixed';
    cm.style.zIndex = 100001; // above taskbar but below modals/overlays
    cm.style.background = window.protectedGlobals.data && window.protectedGlobals.data.dark ? 'rgba(50,50,50,0.95)' : 'rgba(220,220,220,0.95)';
    cm.style.color = window.protectedGlobals.data && window.protectedGlobals.data.dark ? 'white' : 'black';
    cm.style.padding = '8px';
    cm.style.borderRadius = '6px';
    cm.style.boxShadow = '0 6px 20px rgba(0,0,0,0.4)';
    cm.style.display = 'none';
    cm.style.minWidth = '180px';
    cm.style.fontSize = '14px';

    var chk = document.createElement('input');
    chk.type = 'checkbox';
    chk.id = 'taskbar-autohide-checkbox';
    chk.style.marginRight = '8px';
    var lbl = document.createElement('label');
    lbl.htmlFor = chk.id;
    lbl.style.cursor = 'pointer';
    lbl.textContent = 'Autohide taskbar';

    var row = document.createElement('div');
    row.style.display = 'flex';
    row.style.alignItems = 'center';
    row.style.gap = '8px';
    row.appendChild(chk);
    row.appendChild(lbl);

    cm.appendChild(row);
    document.body.appendChild(cm);

    function closeMenu() {
      cm.style.display = 'none';
      _setTaskbarContextMenuOpen(false);
      document.removeEventListener('pointerdown', onDocPointerDown);
      taskbar.removeEventListener('pointerdown', onDocPointerDown);
      document.removeEventListener('keydown', onEsc);
    }

    function onDocPointerDown(e) {
      if ((!cm.contains(e.target) && !taskbar.contains(e.target)) || e.target === taskbar) closeMenu();
    }
    function onEsc(e) { if (e.key === 'Escape') closeMenu(); }

    taskbar.addEventListener('contextmenu', function (ev) {
      if(ev.target && ev.target.closest && ev.target.closest('.taskbutton')) return; // ignore right-clicks on task buttons
      ev.preventDefault();
      if (autohideEnabled) _setTaskbarContextMenuOpen(true);
      var x = ev.clientX;
      var y = ev.clientY;
      chk.checked = !!(window.protectedGlobals.data && window.protectedGlobals.data.autohidetaskbar);
      cm.style.left = Math.min(window.innerWidth - 200, x) + 'px';
      cm.style.top = Math.min(window.innerHeight - 50, y) + 'px';
      cm.style.color = window.protectedGlobals.data && window.protectedGlobals.data.dark ? 'white' : 'black'; 
      cm.style.background = window.protectedGlobals.data && window.protectedGlobals.data.dark ? 'rgba(50,50,50,0.95)' : 'rgba(220,220,220,0.95)';
      cm.style.display = 'block';
      document.addEventListener('pointerdown', onDocPointerDown);
      taskbar.addEventListener('pointerdown', onDocPointerDown); // also close if clicking taskbar (but not buttons)
      document.addEventListener('keydown', onEsc);
    });

    chk.addEventListener('change', function () {
      var newVal = !!chk.checked;
      if (!window.protectedGlobals.data) window.protectedGlobals.data = {}; window.protectedGlobals.data.autohidetaskbar = newVal;
      // update runtime behavior
      if (newVal) enableAutohide(); else disableAutohide();

      // persist to server if available
      persistUserProfilePatch({ autohidetaskbar: newVal });
      closeMenu();
    });
  })();

  //fullscreen
  function _fullscreen() {
    document.documentElement.requestFullscreen();
    _isfullscreen = true;
  }
  var iconid = 0;
  var draggedTaskButton = null;


  function syncTaskButtons() {
    taskbuttons = [...window.protectedGlobals.taskbuttonsContainer.querySelectorAll("button")];
    window.protectedGlobals.taskbuttons = taskbuttons;
    window.protectedGlobals.saveTaskButtons(true);
  }

  function setupTaskButtonDrag(btn) {
    if (isFixedTaskButton(btn)) {
      btn.draggable = false;
      return;
    }
    btn.draggable = true;

    btn.addEventListener("dragstart", (e) => {
      draggedTaskButton = btn;
      e.dataTransfer.effectAllowed = "move";
      e.dataTransfer.setData("text/plain", btn.id || btn.value || "taskbutton");
      btn.style.opacity = "0.6";
    });

    btn.addEventListener("dragend", () => {
      btn.style.opacity = "1";
      draggedTaskButton = null;
      syncTaskButtons();
    });
  }

  taskbar.addEventListener("dragover", (e) => {
    if (!draggedTaskButton) return;
    e.preventDefault();

    if (isFixedTaskButton(draggedTaskButton)) return;

    const target = e.target && e.target.closest ? e.target.closest("button.taskbutton") : null;
    if (!target || target === draggedTaskButton) return;
    if (isFixedTaskButton(target)) return;

    const rect = target.getBoundingClientRect();
    const insertBefore = e.clientX < rect.left + rect.width / 2;
    window.protectedGlobals.taskbuttonsContainer.insertBefore(draggedTaskButton, insertBefore ? target : target.nextSibling);
  });

  taskbar.addEventListener("drop", (e) => {
    if (!draggedTaskButton) return;
    e.preventDefault();
    syncTaskButtons();
  });
  function isFixedTaskButton(btn) {
    return btn.dataset && btn.dataset.fixedTaskbar === 'true';
  }
  function addTaskButton(name, onclickFunc, appcontextmenuhandler = false, globalvarobjectstring = '', appId = '', fixedTaskbar = false, pinned = false, __startMenu = false, options = {}) {
    var btn = document.createElement("button");
    if (!options.svg) {
      btn.innerText = name;
    } else {
      btn.innerHTML = name;
    }
    btn.value = name;
    if (!__startMenu) {
      btn.id = name + "-" + iconid;
      iconid++;
    } else btn.id = name;
    btn.style.padding = "3px";
    btn.style.marginRight = "5px";
    btn.style.border = "none";
    btn.className = 'taskbutton';
    var isDarkTaskbarTheme = !!(window.protectedGlobals.data && window.protectedGlobals.data.dark);
    btn.classList.toggle('dark', isDarkTaskbarTheme);
    btn.classList.toggle('light', !isDarkTaskbarTheme);
    btn.style.borderRadius = "3px";
    btn.style.cursor = "pointer";
    btn.style.height = "67%"; // slightly smaller than 60px taskbar
    btn.style.display = "flex";
    btn.style.alignItems = "center";
    btn.style.justifyContent = "center";

    btn.style.width = "60px";
    btn.style.fontSize = "30px"; // Ensures
    btn.addEventListener("click", () => {
      console.log("Task clicked:", btn.value);
      onclickFunc();
      var aid = (btn.dataset && btn.dataset.appId) ? btn.dataset.appId : (btn.value && String(btn.value).trim());
      if (aid && (window.protectedGlobals.addToRecents)) {
        window.protectedGlobals.addToRecents(aid);
      }
    });
    if (appId) {
      btn.dataset.appId = appId;
    }
    if (pinned) {
      btn.dataset.pinned = 'true';
    }
    if (fixedTaskbar) {
      btn.dataset.fixedTaskbar = 'true';
    }
    if (appcontextmenuhandler) {
      var contextHandler = null;
      if ((appcontextmenuhandler)) {
        contextHandler = appcontextmenuhandler;
      } else {
        if (
          globalvarobjectstring &&
          window[globalvarobjectstring] &&
          (window[globalvarobjectstring][appcontextmenuhandler])
        ) {
          contextHandler = window[globalvarobjectstring][appcontextmenuhandler];
        } else if ((window[appcontextmenuhandler])) {
          contextHandler = window[appcontextmenuhandler];
        }
      }
      if (contextHandler) {
        btn.addEventListener("contextmenu", contextHandler);
      }
    }
    setupTaskButtonDrag(btn);
    window.protectedGlobals.taskbuttonsContainer.appendChild(btn);
    setTimeout(() => {
      window.protectedGlobals.applyStyles();
    }, 100);
  window.protectedGlobals.taskbuttons = [...window.protectedGlobals.taskbuttonsContainer.querySelectorAll("button")];
    return btn;
  }
  window.protectedGlobals.addTaskButton = addTaskButton;
  function removeTaskButton(btn) {
    btn.remove();
  window.protectedGlobals.taskbuttons = [...window.protectedGlobals.taskbuttonsContainer.querySelectorAll("button")];
    window.protectedGlobals.saveTaskButtons();
  };
  window.protectedGlobals.removeTaskButton = removeTaskButton;
  window.protectedGlobals._fullscreen = _fullscreen;
  addTaskButton("⤢", window.protectedGlobals._fullscreen, false, '', '', true);
  addTaskButton("▶", window.protectedGlobals.starthandler, false, '', '', true, false, true, { svg: true});
  window.protectedGlobals.purgeButtons();


  // hook bringtofront and launchapp
  let originalBringToFront = window.protectedGlobals.bringToFront;
  window.protectedGlobals.bringToFront = function (div) {
    console.log("bringToFront called with appId:", div);
    if (originalBringToFront) {
      originalBringToFront(div);
    }
    setTimeout(() => {
    // Check if task button exists for this app, if not create one
    let atTop = calcTop();
    let exist = false;
    for (const btn of window.protectedGlobals.taskbuttons) {
      if (btn.dataset.appId === atTop) {
        exist = true;
        break;
      }
    }
    if (!exist) {
      // If no task button exists for this app, add one
      const appInfo = window.protectedGlobals.apps.find(app => app.functionname === atTop);
      let btn = null;
      if (appInfo) {
        if (appInfo.cmf) {
          btn = window.protectedGlobals.addTaskButton(
            appInfo.icon,
            () => window.protectedGlobals.launchApp(atTop),
            window[appInfo.globalvarobjectstring][appInfo.cmf],
            "",
            atTop,
            false,
          );
        }
        else {
          btn = window.protectedGlobals.addTaskButton(
            appInfo.icon,
            () => window.protectedGlobals.launchApp(atTop),
            window.protectedGlobals.cmf,
            "",
            atTop,
            false,
          );
        }
        if (btn) btn.dataset.appId = atTop;
      } else {
        console.warn("No app info found for appId:", atTop);
      }
    }
    // Add 'task-active' class to the corresponding task button and remove from others
    if (window.protectedGlobals.taskbuttons) {
      for (let btn of window.protectedGlobals.taskbuttons) {
        const btnAppId = btn.dataset && btn.dataset.appId ? btn.dataset.appId : (btn.value && String(btn.value).trim());
        if (btnAppId === atTop) {
          btn.classList.add('task-active');
          btn.classList.remove('task-open', 'task-closed');
        } else if (btn.classList.contains('task-active')) {
          btn.classList.remove('task-active');
          btn.classList.add('task-open');
        }
      }
    }
    }, 300);
  };
  // let originalLaunchApp = window.protectedGlobals.launchApp;
  // window.protectedGlobals.launchApp = function (appId) {
  //   console.log("launchApp called with appId:", appId);
  //   if (originalLaunchApp) {
  //     originalLaunchApp(appId);
  //   }
  //   let exist = false;
  //   for (const btn of window.protectedGlobals.taskbuttons) {
  //     if (btn.dataset.appId === appId) {
  //       exist = true;
  //       break;
  //     }
  //   }
  //   if (!exist) {
  //     // If no task button exists for this app, add one
  //     const appInfo = window.protectedGlobals.apps.find(app => app.functionname === appId);
  //     let btn = null;
  //     if (appInfo) {
  //     if (appInfo.cmf) {
  //       btn = window.protectedGlobals.addTaskButton(
  //         appInfo.icon,
  //         () => window.protectedGlobals.launchApp(appId),
  //         window[appInfo.globalvarobjectstring][appInfo.cmf],
  //         "",
  //         appId,
  //         false,
  //       );
  //     }
  //     else {
  //       btn = window.protectedGlobals.addTaskButton(
  //         appInfo.icon,
  //         () => window.protectedGlobals.launchApp(appId),
  //         window.protectedGlobals.cmf,
  //         "",
  //         appId,
  //         false,
  //       );
  //     }
  //     if (btn) btn.dataset.appId = appId;
  //     } else {
  //       console.warn("No app info found for appId:", appId);
  //     }
  //   }
  //   // Add 'task-open' class to the corresponding task button if not already active
  //   if (window.protectedGlobals.taskbuttons) {
  //     for (let btn of window.protectedGlobals.taskbuttons) {
  //       const btnAppId = btn.dataset && btn.dataset.appId ? btn.dataset.appId : (btn.value && String(btn.value).trim());
  //       if (btnAppId === appId) {
  //           btn.classList.remove('task-open');
  //           btn.classList.remove('task-closed');
  //           btn.classList.add('task-active');
  //           btn.appactive = true; // custom property to track if app is active/open
  //       }
  //     }
  //   }
  // };
  // Track previous display values to only trigger on display changes
  const displayStyleMap = new WeakMap();
  
  let appObserver = new MutationObserver(mutations => {
    mutations.forEach(mutation => {
      if (mutation.type === 'childList') {
        mutation.removedNodes.forEach(removedNode => {
          if (removedNode.classList && removedNode.classList.contains('app-window-root')) {
            // An app window was removed, find corresponding task button and mark as closed
            setTimeout(() => {
              for (let app of window.protectedGlobals.apps) {
                if (window[app.globalvarobjectstring] && window[app.globalvarobjectstring]?.[app.allapparraystring]?.length == 0) {
                  let appId = app.functionname;
                  for (let btn of window.protectedGlobals.taskbuttons) {
                    const btnAppId = btn.dataset.appId;
                    if (btnAppId === appId) {
                      btn.classList.remove('task-active', 'task-open');
                      btn.classList.add('task-closed');
                      btn.appactive = false;
                      if (btn.dataset.pinned !== 'true') {
                        removeTaskButton(btn);
                      }
                    }
                  }
                }
              }
            }, 500);
          }
        });
      }
      if (mutation.type === 'childList' && mutation.removedNodes.length > 0 && mutation.removedNodes[0].classList && mutation.removedNodes[0].classList.contains('app-window-root')) {
        setTimeout(() => {
          let atTop = calcTop();
          for (let btn of window.protectedGlobals.taskbuttons) {
            const btnAppId = btn.dataset && btn.dataset.appId ? btn.dataset.appId : (btn.value && String(btn.value).trim());
            if (btnAppId === atTop) {
              btn.classList.add('task-active');
              btn.classList.remove('task-open', 'task-closed');
            } else if (btn.classList.contains('task-active')) {
              btn.classList.remove('task-active');
              btn.classList.add('task-open');
            }
          }
        }, 500);
      }
    });
  });
  appObserver.observe(document.body, { childList: true, subtree: true });










})();

