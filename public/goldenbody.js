  // taskbar
  var taskbuttons;
  // Remove any existing taskbar element (cleanup from previous runs)
  try {
    var _oldTb = document.getElementById('taskbar');
    if (_oldTb) _oldTb.remove();
  } catch (e) {}
  // Create the taskbar
  var taskbar = document.createElement("div");
  taskbar.className = 'taskbar';
  taskbar.style.opacity = 0.8;
  taskbar.id = "taskbar";
  taskbar.style.position = "fixed";
  taskbar.style.zIndex = 999999; // very high z-index to ensure it stays on top of app content but below modals/menus
  taskbar.style.bottom = "0";
  taskbar.style.left = "0";
  taskbar.style.width = "100%";
  taskbar.style.height = "60px";
  taskbar.style.display = "flex";
  taskbar.style.alignItems = "center";
  taskbar.style.paddingLeft = "4%"; // 50px empty space on left
  taskbar.style.boxSizing = "border-box";
  debugger
  document.body.appendChild(taskbar);

  // Autohide support (shows when mouse is near bottom or hovering)
  try {
    var autohideEnabled = (typeof data !== 'undefined' && data && data.autohidetaskbar);
  } catch (e) {
    var autohideEnabled = false;
  }
  // Ensure global handler registry exists and clean any previous autohide listeners
  window._flowaway_handlers = window._flowaway_handlers || {};
  if (window._flowaway_handlers.autohideCleanup) {
    try { window._flowaway_handlers.autohideCleanup(); } catch (e) {}
    delete window._flowaway_handlers.autohideCleanup;
  }
  // Also remove any previously-registered autohide refs (older versions)
  if (window._flowaway_handlers.autohideRefs) {
    try {
      var r = window._flowaway_handlers.autohideRefs;
      if (r && r.mousemove) document.removeEventListener('mousemove', r.mousemove);
      if (r && r.pointerenter) document.removeEventListener('pointerenter', r.pointerenter);
      if (r && r.pointerleave) document.removeEventListener('pointerleave', r.pointerleave);
      if (r && r.focus) window.removeEventListener('focus', r.focus);
      if (r && r.touchstart) document.removeEventListener('touchstart', r.touchstart);
    } catch (e) {}
    delete window._flowaway_handlers.autohideRefs;
  }
  taskbar.style.transition = 'transform 0.25s ease, opacity 0.25s ease';
  taskbar.style.transform = 'translateY(0)';
  var taskbarVisible = true;
  function showTaskbar() {
    if (taskbarVisible) return;
    taskbar.style.transform = 'translateY(0)';
    taskbar.style.opacity = 0.8;
    taskbarVisible = true;
    for(let root of document.querySelectorAll('.app-root')){
      if(root.style.height === "100%") {
      root.style.height = `calc(100% - 60px)`;
      }
    }
  }
  function hideTaskbar() {
    if (!taskbarVisible) return;
    taskbar.style.transform = 'translateY(100%)';
    taskbar.style.opacity = 0;
    taskbarVisible = false;
    for(let root of document.querySelectorAll('.app-root')){
      if(root.style.height === `calc(100% - 60px)`){
      root.style.height = "100%";
      }
    }
  }
  // Autohide handlers (kept as references so we can add/remove them)
  var _lastMoveTs = 0;
  var autohideActive = false; // whether listeners are currently attached
  function _onMouseMove(e) {
    _lastMoveTs = Date.now();
    var nearBottom = e.clientY > window.innerHeight - 120;
    if (nearBottom) {
      showTaskbar();
    } else {
      setTimeout(function () {
        if (Date.now() - _lastMoveTs > 600 && !taskbar.matches(':hover')) hideTaskbar();
      }, 700);
    }
  }
  function _onTaskbarEnter() { showTaskbar(); }
  function _onTaskbarLeave() { setTimeout(function () { if (!taskbar.matches(':hover')) hideTaskbar(); }, 300); }
  function _onWindowFocus() { showTaskbar(); }
  function _onTouchStart(e) { var t = e.touches && e.touches[0]; if (t && t.clientY > window.innerHeight - 120) showTaskbar(); }

  function enableAutohide() {
    if (autohideActive) return;
    autohideEnabled = true;
    hideTaskbar();
    document.addEventListener('mousemove', _onMouseMove);
    taskbar.addEventListener('pointerenter', _onTaskbarEnter);
    taskbar.addEventListener('pointerleave', _onTaskbarLeave);
    window.addEventListener('focus', _onWindowFocus);
    document.addEventListener('touchstart', _onTouchStart, { passive: true });

    // register cleanup so other instances (rebuild) can remove these listeners
    window._flowaway_handlers.autohideCleanup = function () {
      try {
        document.removeEventListener('mousemove', _onMouseMove);
        taskbar.removeEventListener('pointerenter', _onTaskbarEnter);
        taskbar.removeEventListener('pointerleave', _onTaskbarLeave);
        window.removeEventListener('focus', _onWindowFocus);
        document.removeEventListener('touchstart', _onTouchStart);
      } catch (e) {}
    };
    // also expose concrete refs so older runtimes can remove them explicitly
    window._flowaway_handlers.autohideRefs = {
      mousemove: _onMouseMove,
      pointerenter: _onTaskbarEnter,
      pointerleave: _onTaskbarLeave,
      focus: _onWindowFocus,
      touchstart: _onTouchStart
    };
    autohideActive = true;
  }

  function disableAutohide() {
    if (!autohideEnabled) return;
    autohideEnabled = false;
    // remove listeners added when enabled
    if (window._flowaway_handlers && window._flowaway_handlers.autohideCleanup) {
      try { window._flowaway_handlers.autohideCleanup(); } catch (e) {}
      delete window._flowaway_handlers.autohideCleanup;
    } else {
      document.removeEventListener('mousemove', _onMouseMove);
      taskbar.removeEventListener('pointerenter', _onTaskbarEnter);
      taskbar.removeEventListener('pointerleave', _onTaskbarLeave);
      window.removeEventListener('focus', _onWindowFocus);
      document.removeEventListener('touchstart', _onTouchStart);
    }
    if (window._flowaway_handlers && window._flowaway_handlers.autohideRefs) {
      try {
        var rr = window._flowaway_handlers.autohideRefs;
        if (rr && rr.mousemove) document.removeEventListener('mousemove', rr.mousemove);
        if (rr && rr.pointerenter) taskbar.removeEventListener('pointerenter', rr.pointerenter);
        if (rr && rr.pointerleave) taskbar.removeEventListener('pointerleave', rr.pointerleave);
        if (rr && rr.focus) window.removeEventListener('focus', rr.focus);
        if (rr && rr.touchstart) document.removeEventListener('touchstart', rr.touchstart);
      } catch (e) {}
      delete window._flowaway_handlers.autohideRefs;
    }
    autohideActive = false;
    // ensure visible
    showTaskbar();
  }

  // Initialize autohide according to current setting
  if (autohideEnabled) enableAutohide(); else disableAutohide();

  // Context menu on taskbar to toggle autohide
  (function attachTaskbarContextMenu() {
    var cm = document.createElement('div');
    cm.style.position = 'fixed';
    cm.style.zIndex = 1000000; // above taskbar but below modals/overlays
    cm.style.background = data.dark ? 'rgba(50,50,50,0.95)' : 'rgba(220,220,220,0.95)';
    cm.style.color = data.dark ? 'white' : 'black';
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
      document.removeEventListener('pointerdown', onDocPointerDown);
      document.removeEventListener('keydown', onEsc);
    }

    function onDocPointerDown(e) {
      if ((!cm.contains(e.target) && !taskbar.contains(e.target)) || e.target === taskbar) closeMenu();
    }
    function onEsc(e) { if (e.key === 'Escape') closeMenu(); }

    taskbar.addEventListener('contextmenu', function (ev) {
      if(ev.target && ev.target.closest && ev.target.closest('.taskbutton')) return; // ignore right-clicks on task buttons
      ev.preventDefault();
      var x = ev.clientX;
      var y = ev.clientY;
      chk.checked = !!(window.data && window.data.autohidetaskbar);
      cm.style.left = Math.min(window.innerWidth - 200, x) + 'px';
      cm.style.top = Math.min(window.innerHeight - 50, y) + 'px';
      cm.style.color = data.dark ? 'white' : 'black'; 
      cm.style.background = data.dark ? 'rgba(50,50,50,0.95)' : 'rgba(220,220,220,0.95)';
      cm.style.display = 'block';
      document.addEventListener('pointerdown', onDocPointerDown);
      taskbar.addEventListener('pointerdown', onDocPointerDown); // also close if clicking taskbar (but not buttons)
      document.addEventListener('keydown', onEsc);
    });

    chk.addEventListener('change', function () {
      var newVal = !!chk.checked;
      try { if (!window.data) window.data = {}; window.data.autohidetaskbar = newVal; } catch (e) {}
      // update runtime behavior
      if (newVal) enableAutohide(); else disableAutohide();

      // persist to server if available
      try {
        if (typeof zmcdpost === 'function') {
          zmcdpost({ setAutohideTaskbar: true, autohidetaskbar: newVal });
        } else if (window.zmcdpost && typeof window.zmcdpost === 'function') {
          window.zmcdpost({ setAutohideTaskbar: true, autohidetaskbar: newVal });
        }
      } catch (e) { console.warn('failed to persist autohide setting', e); }
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
    taskbuttons = [...taskbar.querySelectorAll("button")];
    if (!window._suppressTaskbarPersist) {
      saveTaskButtons(true);
    }
  }

  function setupTaskButtonDrag(btn) {
    btn.draggable = true;

    btn.addEventListener("dragstart", (e) => {
      draggedTaskButton = btn;
      try {
        e.dataTransfer.effectAllowed = "move";
        e.dataTransfer.setData("text/plain", btn.id || btn.value || "taskbutton");
      } catch (err) {}
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

    const target = e.target && e.target.closest ? e.target.closest("button.taskbutton") : null;
    if (!target || target === draggedTaskButton) return;

    const rect = target.getBoundingClientRect();
    const insertBefore = e.clientX < rect.left + rect.width / 2;
    taskbar.insertBefore(draggedTaskButton, insertBefore ? target : target.nextSibling);
  });

  taskbar.addEventListener("drop", (e) => {
    if (!draggedTaskButton) return;
    e.preventDefault();
    syncTaskButtons();
  });

  function addTaskButton(name, onclickFunc, appcontextmenuhandler = false, globalvarobjectstring = '') {
    var btn = document.createElement("button");
    btn.innerText = name;
    btn.value = name;
    if (name !== "▶") {
      btn.id = name + "-" + iconid;
      iconid++;
    } else btn.id = name;
    btn.style.padding = "3px";
    btn.style.marginRight = "5px";
    btn.style.border = "none";
    btn.className = 'taskbutton';
    btn.style.borderRadius = "3px";
    btn.style.cursor = "pointer";
    btn.style.height = "67%"; // slightly smaller than 60px taskbar
    btn.style.display = "flex";
    btn.style.alignItems = "center";
    btn.style.justifyContent = "center";

    btn.style.width = "60px";
    btn.style.fontSize = "30px"; // Ensures
      debugger

    btn.addEventListener("click", () => {
      console.log("Task clicked:", btn.value);
      onclickFunc();
    });
    if(appcontextmenuhandler) {
      btn.addEventListener('contextmenu', window[globalvarobjectstring][appcontextmenuhandler])
    }
    setupTaskButtonDrag(btn);
    taskbar.appendChild(btn);
    syncTaskButtons();
    setTimeout(() => {
      applyStyles();
    }, 100);
    return btn;
  }
  function removeTaskButton(btn) {
    btn.remove();
    saveTaskButtons();
  }
  window._suppressTaskbarPersist = true;
  addTaskButton("⤢", _fullscreen);
  addTaskButton("▶", starthandler);
  window._suppressTaskbarPersist = false;
  purgeButtons();

