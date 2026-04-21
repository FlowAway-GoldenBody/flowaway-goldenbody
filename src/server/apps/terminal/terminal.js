// this app is a place holder
// how it works is you reference the path of the app you want to run, the 2nd arg is the command, and the rest is from the app itself.

window.terminalGlobals = {};
terminalGlobals.allTerminals = [];
terminalGlobals.goldenbodyId = 0;

window.protectedGlobals.__terminalCustomCommands =
  window.protectedGlobals.__terminalCustomCommands && typeof window.protectedGlobals.__terminalCustomCommands === "object"
    ? window.protectedGlobals.__terminalCustomCommands
    : {};

window.protectedGlobals.__terminalBuiltInCommandNames = Array.isArray(window.protectedGlobals.__terminalBuiltInCommandNames)
  ? window.protectedGlobals.__terminalBuiltInCommandNames
  : [
      "help", "clear", "echo", "date", "whoami", "pwd", "history", "exit",
      "ls", "cd", "cat", "head", "tail", "mkdir", "touch", "write", "rm", "cp", "mv",
      "changeperm", "apps", "open", "run",
    ];

function normalizeTerminalCommandName(raw) {
  var value = String(raw || "").trim().toLowerCase();
  if (!value) return "";
  if (!/^[a-z][a-z0-9._-]*$/i.test(value)) return "";
  return value;
}

function getTerminalBuiltInCommandNames() {
  var names = Array.isArray(window.protectedGlobals.__terminalBuiltInCommandNames)
    ? window.protectedGlobals.__terminalBuiltInCommandNames
    : [];
  var normalizedNames = [];
  var seen = {};
  for (var i = 0; i < names.length; i++) {
    var normalized = normalizeTerminalCommandName(names[i]);
    if (normalized && !seen[normalized]) {
      normalizedNames.push(normalized);
      seen[normalized] = true;
    }
  }
  return normalizedNames;
}

function getTerminalBuiltInCommandMap() {
  var names = getTerminalBuiltInCommandNames();
  var map = {};
  for (var i = 0; i < names.length; i++) {
    map[names[i]] = true;
  }
  return map;
}

window.protectedGlobals.registerTerminalAppCommand = function (definition, options) {
  var opts = options && typeof options === "object" ? options : {};
  var force = !!opts.force;
  var def = definition && typeof definition === "object" ? definition : {};
  var name = normalizeTerminalCommandName(def.name);
  if (!name) {
    return { ok: false, error: "invalid command name" };
  }
  if (typeof def.handler !== "function") {
    return { ok: false, error: "handler must be a function" };
  }

  var aliases = Array.isArray(def.aliases) ? def.aliases : [];
  var normalizedAliases = [];
  for (var i = 0; i < aliases.length; i++) {
    var aliasName = normalizeTerminalCommandName(aliases[i]);
    if (aliasName && aliasName !== name && normalizedAliases.indexOf(aliasName) === -1) {
      normalizedAliases.push(aliasName);
    }
  }

  var builtInMap = getTerminalBuiltInCommandMap();
  if (!force) {
    if (builtInMap[name]) {
      return { ok: false, error: "cannot override built-in command without force" };
    }
    for (var j = 0; j < normalizedAliases.length; j++) {
      if (builtInMap[normalizedAliases[j]]) {
        return { ok: false, error: "cannot use built-in alias without force" };
      }
    }
  }

  var registry =
    window.protectedGlobals.__terminalCustomCommands && typeof window.protectedGlobals.__terminalCustomCommands === "object"
      ? window.protectedGlobals.__terminalCustomCommands
      : {};

  for (var existingName in registry) {
    if (!Object.prototype.hasOwnProperty.call(registry, existingName)) continue;
    if (existingName === name) continue;
    var existing = registry[existingName] || {};
    var existingAliases = Array.isArray(existing.aliases) ? existing.aliases : [];
    if (!force) {
      if (existingName === name || existingAliases.indexOf(name) !== -1) {
        return { ok: false, error: "command name already registered" };
      }
      var overlap = normalizedAliases.find(function (a) {
        return a === existingName || existingAliases.indexOf(a) !== -1;
      });
      if (overlap) {
        return { ok: false, error: "command alias already registered" };
      }
    } else {
      existing.aliases = existingAliases.filter(function (alias) {
        return normalizedAliases.indexOf(alias) === -1 && alias !== name;
      });
      registry[existingName] = existing;
    }
  }

  registry[name] = {
    name: name,
    description: String(def.description || ""),
    usage: String(def.usage || name),
    handler: def.handler,
    aliases: normalizedAliases,
    sourceApp: def.sourceApp ? String(def.sourceApp) : "",
    forceOverride: force,
    updatedAt: Date.now(),
  };
  window.protectedGlobals.__terminalCustomCommands = registry;
  return { ok: true, command: registry[name] };
};

window.protectedGlobals.unregisterTerminalAppCommand = function (nameOrAlias) {
  var target = normalizeTerminalCommandName(nameOrAlias);
  if (!target) return false;
  var registry =
    window.protectedGlobals.__terminalCustomCommands && typeof window.protectedGlobals.__terminalCustomCommands === "object"
      ? window.protectedGlobals.__terminalCustomCommands
      : {};
  if (registry[target]) {
    delete registry[target];
    window.protectedGlobals.__terminalCustomCommands = registry;
    return true;
  }
  for (var name in registry) {
    if (!Object.prototype.hasOwnProperty.call(registry, name)) continue;
    var aliases = Array.isArray(registry[name].aliases) ? registry[name].aliases : [];
    if (aliases.indexOf(target) !== -1) {
      delete registry[name];
      window.protectedGlobals.__terminalCustomCommands = registry;
      return true;
    }
  }
  return false;
};

if (!window.protectedGlobals.__terminalTaskmanDemoRegistered && typeof window.protectedGlobals.registerTerminalAppCommand === "function") {
  window.protectedGlobals.registerTerminalAppCommand({
    name: "taskman",
    description: "Show Flowaway task-manager snapshot summary.",
    usage: "taskman [json]",
    sourceApp: "terminal",
    handler: function (context, args) {
      if (typeof window.protectedGlobals.getTaskManagerSnapshot !== "function") {
        return "taskman: task manager data unavailable";
      }
      var snapshot = window.protectedGlobals.getTaskManagerSnapshot();
      var summary = snapshot && snapshot.summary ? snapshot.summary : {};
      if (String(args && args[0] || "").toLowerCase() === "json") {
        return snapshot || {};
      }
      context.writeLine("Tasks: " + Number(summary.totalEntries || 0));
      context.writeLine("Running: " + Number(summary.running || 0));
      context.writeLine("Idle: " + Number(summary.idle || 0));
      context.writeLine("Unknown: " + Number(summary.unknown || 0));
      context.writeLine("Instance Tasks: " + Number(summary.totalInstances || 0));
      return;
    },
  });
  window.protectedGlobals.__terminalTaskmanDemoRegistered = true;
}

if (!window.protectedGlobals.__terminalProcessCommandsRegistered && typeof window.protectedGlobals.registerTerminalAppCommand === "function") {
  window.protectedGlobals.registerTerminalAppCommand({
    name: "procs",
    description: "List the current Flowaway process snapshot.",
    usage: "procs [json]",
    sourceApp: "terminal",
    handler: function (context, args) {
      if (typeof window.protectedGlobals.FlowawayProcess !== "object" || !window.protectedGlobals.FlowawayProcess) {
        return "procs: process runtime unavailable";
      }
      var snapshot = typeof window.protectedGlobals.FlowawayProcess.snapshot === "function"
        ? window.protectedGlobals.FlowawayProcess.snapshot()
        : typeof window.protectedGlobals.getTaskManagerSnapshot === "function"
          ? window.protectedGlobals.getTaskManagerSnapshot()
          : null;
      if (String(args && args[0] || "").toLowerCase() === "json") {
        return snapshot || {};
      }
      var summary = snapshot && snapshot.summary ? snapshot.summary : {};
      context.writeLine("Processes: " + Number(summary.totalEntries || 0));
      context.writeLine("Running: " + Number(summary.running || 0));
      context.writeLine("Idle: " + Number(summary.idle || 0));
      context.writeLine("Unknown: " + Number(summary.unknown || 0));
      context.writeLine("Instance Tasks: " + Number(summary.totalInstances || 0));
      return;
    },
  });

  window.protectedGlobals.registerTerminalAppCommand({
    name: "killproc",
    description: "Terminate a process by pid.",
    usage: "killproc <pid>",
    sourceApp: "terminal",
    handler: function (context, args) {
      var target = String(args && args[0] || "").trim();
      if (!target) return "killproc: missing pid";
      if (typeof window.protectedGlobals.FlowawayProcess !== "object" || !window.protectedGlobals.FlowawayProcess) {
        return "killproc: process runtime unavailable";
      }
      var pid = Number(target);
      if (!Number.isFinite(pid)) {
        return "killproc: pid must be numeric";
      }
      var ok = false;
      if (typeof window.protectedGlobals.FlowawayProcess.terminate === "function") {
        ok = !!window.protectedGlobals.FlowawayProcess.terminate(pid, "terminal-kill");
      }
      return ok ? "killproc: terminated " + String(pid) : "killproc: no matching process for pid " + String(pid);
    },
  });

  window.protectedGlobals.__terminalProcessCommandsRegistered = true;
}

terminal = function (posX = 50, posY = 50) {
  window.protectedGlobals.notification("Terminal is in beta. Type 'help' for available commands.");
  window.protectedGlobals.startMenu.style.display = "none";
  let isMaximized = false;
  let _isMinimized = false;
  window.protectedGlobals.atTop = "terminal";
  const root = document.createElement("div");

  root.className = "app-root app-window-root";
  Object.assign(root.style, {
    position: "fixed",
    top: posY + "px",
    left: posX + "px",
    width: "1000px",
    height: "640px",
    boxShadow: "0 12px 40px rgba(0,0,0,0.35)",
    borderRadius: "10px",
    overflow: "hidden",
    display: "flex",
    flexDirection: "column",
    fontFamily: "sans-serif",
    zIndex: 1000,
  });
  root.classList.add("terminal");
  root.dataset.appId = "terminal";
  window.protectedGlobals.bringToFront(root);
  document.body.appendChild(root);
  terminalGlobals.goldenbodyId++;
  root._goldenbodyId = terminalGlobals.goldenbodyId;

  // --- Top bar ---
  var topBar = false;
  if (!topBar) {
    topBar = document.createElement("div");
    topBar.className = "appTopBar";
    topBar.style.display = "flex";
    topBar.style.justifyContent = "flex-end";
    topBar.style.alignItems = "center";
    topBar.style.padding = "2px";
    topBar.style.marginTop = "3px";
    topBar.style.cursor = "move";
    topBar.style.flexShrink = "0";
    topBar.style.position = "absolute";
    topBar.style.top = "6px";
    topBar.style.right = "6px";
    topBar.style.width = "auto";
    topBar.style.paddingTop = "14px"; // drag area height
    topBar.style.paddingBottom = "2px";
  }
  const dragStrip = document.createElement("div");
  dragStrip.style.height = "14px";
  dragStrip.style.flexShrink = "0";
  dragStrip.style.display = "flex";
  dragStrip.style.cursor = "move";
  dragStrip.style.width = "100%";
  dragStrip.addEventListener("click", function () {
    window.protectedGlobals.bringToFront(root);
  });
  root.prepend(dragStrip);
  const barrier = document.createElement("div");
  barrier.style.flexShrink = "0";
  barrier.style.display = "flex";
  barrier.style.height = "14px";
  barrier.style.width = "100%";
  barrier.addEventListener("click", function () {
    window.protectedGlobals.bringToFront(root);
  });
  root.prepend(barrier);

  var btnMin = document.createElement("button");
  btnMin.className = "btnMinColor";
  btnMin.title = "Minimize";
  topBar.appendChild(btnMin);

  var btnMax = document.createElement("button");
  btnMax.className = "btnMaxColor";
  btnMax.title = "Maximize/Restore";
  topBar.appendChild(btnMax);

  var btnClose = document.createElement("button");
  btnClose.title = "Close";
  btnClose.style.color = "white";
  btnClose.style.backgroundColor = "red";
  topBar.appendChild(btnClose);

  [topBar, btnMin, btnMax, btnClose].forEach((el) => {
    el.style.margin = "0 2px";
    el.style.border = "none";
    el.style.padding = "4px 6px";
    el.style.fontSize = "14px";
    el.style.cursor = "pointer";
  });
  const applyWindowControlIcon =
    window.protectedGlobals.applyWindowControlIcon || function () {};
  const setWindowMaximizeIcon = window.protectedGlobals.setWindowMaximizeIcon || function () {};
  applyWindowControlIcon(btnMin, "minimize");
  setWindowMaximizeIcon(btnMax, false);
  applyWindowControlIcon(btnClose, "close");
  topBar.addEventListener("click", function () {
    window.protectedGlobals.bringToFront(root);
  });
  root.appendChild(topBar);
  // --- Saved bounds shared correctly ---
  let savedBounds = {
    left: root.style.left,
    top: root.style.top,
    width: root.style.width,
    height: root.style.height,
  };

  function closeWindow() {
    root.remove();
    let index = false;
    for (let i = 0; i < terminalGlobals.allTerminals.length; i++) {
      if (terminalGlobals.allTerminals[i].rootElement == root) {
        index = i;
      }
    }
    if (index !== false) terminalGlobals.allTerminals.splice(index, 1);
    window.protectedGlobals.removeAllEventListenersForApp("terminal" + root._goldenbodyId);
  }

  function hideWindow() {
    savedBounds = getBounds();
    root.style.display = "none";
    _isMinimized = true;
  }

  function showWindow() {
    root.style.display = "flex";
    _isMinimized = false;
    window.protectedGlobals.bringToFront(root);
  }

  function closeAll() {
    for (const instance of [...terminalGlobals.allTerminals]) {
      if (instance && typeof instance.closeWindow === "function") {
        instance.closeWindow();
      }
    }
    terminalGlobals.allTerminals = [];
  }

  function hideAll() {
    for (const instance of terminalGlobals.allTerminals) {
      if (instance && typeof instance.hideWindow === "function") {
        instance.hideWindow();
      }
    }
  }

  function showAll() {
    terminalGlobals.allTerminals.sort(
      (a, b) => a.rootElement.style.zIndex - b.rootElement.style.zIndex,
    );
    for (const instance of terminalGlobals.allTerminals) {
      if (instance && typeof instance.showWindow === "function") {
        instance.showWindow();
      }
    }
  }

  function newWindow() {
    terminal(50, 50);
  }

  function maximizeWindow() {
    savedBounds = getBounds();
    root.style.left = "0";
    root.style.top = "0";
    root.style.width = "100%";
    root.style.height = !window.protectedGlobals.data.autohidetaskbar ? `calc(100% - 60px)` : "100%";
    root.style.borderRadius = "0px";
    isMaximized = true;
    _isMinimized = false;
    setWindowMaximizeIcon(btnMax, true);
  }

  function restoreWindow(useOriginalBounds = true) {
    if (useOriginalBounds && savedBounds) {
      applyBounds(savedBounds);
    }
    root.style.borderRadius = "10px";
    isMaximized = false;
    setWindowMaximizeIcon(btnMax, false);
  }

  // Minimize
  btnMin.addEventListener("click", () => {
    hideWindow();
  });

  // Maximize / Restore
  btnMax.addEventListener("click", () => {
    if (!isMaximized) {
      maximizeWindow();
    } else {
      restoreWindow(true);
    }
  });

  // Close
  btnClose.addEventListener("click", () => {
    closeWindow();
  });

  // --- Make draggable / resizable ---
  makeDraggableResizable(root, dragStrip, btnMax);

  function getBounds() {
    return {
      left: root.style.left,
      top: root.style.top,
      width: root.style.width,
      height: root.style.height,
    };
  }

  function applyBounds(bounds) {
    root.style.left = bounds.left;
    root.style.top = bounds.top;
    root.style.width = bounds.width;
    root.style.height = bounds.height;
  }
  // --- Make draggable/resizable from previous snippet ---
  function makeDraggableResizable(el, topBar, btnMax) {
    (function makeDraggable() {
      let dragging = false,
        startX = 0,
        startY = 0,
        origLeft = 0,
        origTop = 0;
      let thresholdCrossed = false;
      let DRAG_THRESHOLD = window.protectedGlobals.data.DRAG_THRESHOLD || 15; // pixels required to trigger drag behavior
      let currentX, currentY;

      topBar.addEventListener("mousedown", (ev) => {
        DRAG_THRESHOLD = Number(window.protectedGlobals.data.DRAG_THRESHOLD) || DRAG_THRESHOLD;
        dragging = true;
        thresholdCrossed = false;
        startX = ev.clientX;
        startY = ev.clientY;
        origLeft = root.offsetLeft;
        origTop = root.offsetTop;
        currentX = ev.clientX;
        currentY = ev.clientY;
        document.body.style.userSelect = "none";
      });

      window.addEventListener("terminal" + root._goldenbodyId, "mousemove", (ev) => {
        if (!dragging) return;
        const dragDistance = Math.sqrt(Math.pow(ev.clientX - startX, 2) + Math.pow(ev.clientY - startY, 2));
        if (!thresholdCrossed && dragDistance >= DRAG_THRESHOLD) {
          thresholdCrossed = true;
          applyBounds(savedBounds);
          if (isMaximized) {
            restoreWindow(false);
            root.style.left = ev.clientX - root.clientWidth / 2 + "px";
            origLeft = ev.clientX - root.clientWidth / 2;
          }
        }
        if (!thresholdCrossed) return;
        const dx = ev.clientX - startX;
        const dy = ev.clientY - startY;
        root.style.left = origLeft + dx + "px";
        root.style.top = Math.max(0, origTop + dy) + "px";
      });

      window.addEventListener("terminal" + root._goldenbodyId, "mouseup", () => {
        dragging = false;
        thresholdCrossed = false;
        document.body.style.userSelect = "";
      });
    })();

    function resize() {
      const el = root;
      const BW = 8;
      const minW = 450,
        minH = 350;
      let active = null;

      const hitTest = (e) => {
        const r = el.getBoundingClientRect();
        const x = e.clientX,
          y = e.clientY;
        const onL = x >= r.left && x <= r.left + BW;
        const onR = x <= r.right && x >= r.right - BW;
        const onT = y >= r.top && y <= r.top + BW;
        const onB = y <= r.bottom && y >= r.bottom - BW;
        if (onT && onL) return "nw";
        if (onT && onR) return "ne";
        if (onB && onL) return "sw";
        if (onB && onR) return "se";
        if (onL) return "w";
        if (onR) return "e";
        if (onT) return "n";
        if (onB) return "s";
        return "";
      };

      el.addEventListener("pointermove", (e) => {
        if (active) return;
        const d = hitTest(e);
        el.style.cursor = d
          ? d === "nw" || d === "se"
            ? "nwse-resize"
            : d === "ne" || d === "sw"
              ? "nesw-resize"
              : d === "n" || d === "s"
                ? "ns-resize"
                : "ew-resize"
          : "default";
      });

      el.addEventListener("pointerdown", (e) => {
        const dir = hitTest(e);
        if (!dir) return;
        active = {
          dir,
          sx: e.clientX,
          sy: e.clientY,
          sw: el.offsetWidth,
          sh: el.offsetHeight,
          sl: el.offsetLeft,
          st: el.offsetTop,
          startedMaximized: isMaximized,
          restoredFromMax: false,
        };
        document.body.style.userSelect = "none";
        el.setPointerCapture(e.pointerId);
      });

      el.addEventListener("pointermove", (e) => {
        if (!active) return;
        if (
          active.startedMaximized &&
          !active.restoredFromMax &&
          (Math.abs(e.clientX - active.sx) > 1 ||
            Math.abs(e.clientY - active.sy) > 1)
        ) {
          restoreWindow(false);
          active.sx = e.clientX;
          active.sy = e.clientY;
          active.sw = el.offsetWidth;
          active.sh = el.offsetHeight;
          active.sl = el.offsetLeft;
          active.st = el.offsetTop;
          active.restoredFromMax = true;
        }
        const dx = e.clientX - active.sx,
          dy = e.clientY - active.sy;
        if (active.dir.includes("e"))
          el.style.width = Math.max(minW, active.sw + dx) + "px";
        if (active.dir.includes("s"))
          el.style.height = Math.max(minH, active.sh + dy) + "px";
        if (active.dir.includes("w")) {
          el.style.width = Math.max(minW, active.sw - dx) + "px";
          el.style.left = active.sl + dx + "px";
        }
        if (active.dir.includes("n")) {
          el.style.height = Math.max(minH, active.sh - dy) + "px";
          el.style.top = Math.max(0, active.st + dy) + "px";
        }
      });

      el.addEventListener("pointerup", () => {
        active = null;
        document.body.style.userSelect = "";
        if (getBounds().width == "100%" || getBounds().height == "100%") {
        } else savedBounds = getBounds();
      });
      el.addEventListener("pointercancel", () => {
        active = null;
        document.body.style.userSelect = "";
        savedBounds = getBounds();
      });

      el.style.touchAction = "none";
    }
    resize();
    root.tabIndex = "0";
  }
  
  // --- EVENT LISTENER ---
  root.addEventListener("click", () => {
    if (input.disabled) return;
    try { input.focus(); } catch (e) {}
  });

  const terminalSurface = document.createElement("div");
  Object.assign(terminalSurface.style, {
    flex: "1",
    minHeight: "0",
    margin: "0 8px 8px 8px",
    borderRadius: "8px",
    border: window.protectedGlobals.data.dark ? "1px solid #2f2f2f" : "1px solid #d8d8d8",
    background: window.protectedGlobals.data.dark ? "#0f0f10" : "#f5f6f8",
    color: window.protectedGlobals.data.dark ? "#d8d8d8" : "#222",
    display: "flex",
    flexDirection: "column",
    overflow: "hidden",
    fontFamily: "ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace",
    fontSize: "13px",
  });

  const output = document.createElement("div");
  Object.assign(output.style, {
    flex: "1",
    minHeight: "0",
    overflowY: "auto",
    padding: "12px",
    whiteSpace: "pre-wrap",
    wordBreak: "break-word",
    lineHeight: "1.35",
  });

  const inputWrap = document.createElement("div");
  Object.assign(inputWrap.style, {
    flexShrink: "0",
    borderTop: window.protectedGlobals.data.dark ? "1px solid #2a2a2a" : "1px solid #dcdcdc",
    padding: "10px 12px",
    display: "flex",
    alignItems: "center",
    gap: "8px",
  });

  const promptLabel = document.createElement("span");
  promptLabel.style.flexShrink = "0";
  promptLabel.style.opacity = "0.8";
  const input = document.createElement("input");
  input.type = "text";
  input.autocomplete = "off";
  input.spellcheck = false;
  Object.assign(input.style, {
    flex: "1",
    border: "none",
    outline: "none",
    background: "transparent",
    color: "inherit",
    font: "inherit",
  });

  inputWrap.appendChild(promptLabel);
  inputWrap.appendChild(input);
  terminalSurface.appendChild(output);
  terminalSurface.appendChild(inputWrap);
  root.appendChild(terminalSurface);

  function applyTerminalTheme() {
    const dark = !!window.protectedGlobals.data.dark;
    const textColor = dark ? "#d8d8d8" : "#111827";

    terminalSurface.style.border = dark
      ? "1px solid #2f2f2f"
      : "1px solid #d1d5db";
    terminalSurface.style.background = dark ? "#0f0f10" : "#f8fafc";
    terminalSurface.style.color = textColor;

    output.style.background = dark ? "#0f0f10" : "#ffffff";
    output.style.color = textColor;

    inputWrap.style.borderTop = dark
      ? "1px solid #2a2a2a"
      : "1px solid #d1d5db";
    inputWrap.style.background = dark ? "#0f0f10" : "#ffffff";

    promptLabel.style.color = dark ? "#cbd5e1" : "#334155";
    input.style.color = textColor;
    input.style.caretColor = dark ? "#e2e8f0" : "#111827";
  }

  root.addEventListener("styleapplied", applyTerminalTheme);
  applyTerminalTheme();

  const username = window.protectedGlobals.data.username || "guest";
  let cwdRelPath = "";
  let commandHistory = [];
  let historyIndex = -1;

  function cwdDisplayPath() {
    return cwdRelPath ? `~/${cwdRelPath}` : "~";
  }

  function updatePrompt() {
    promptLabel.textContent = `${username}@flowaway:${cwdDisplayPath()}$`;
  }

  function writeLine(text = "", color = "") {
    const line = document.createElement("div");
    line.textContent = text;
    if (color) line.style.color = color;
    output.appendChild(line);
    output.scrollTop = output.scrollHeight;
  }

  function renderEnteredCommand(text) {
    const entered = document.createElement("div");
    entered.textContent = `${promptLabel.textContent} ${text}`;
    entered.style.opacity = "0.9";
    output.appendChild(entered);
  }

  function parseArgs(raw) {
    const parts = [];
    let cur = "";
    let quote = "";

    for (let i = 0; i < raw.length; i++) {
      const ch = raw[i];
      if (quote) {
        if (ch === quote) {
          quote = "";
        } else {
          cur += ch;
        }
        continue;
      }

      if (ch === '"' || ch === "'") {
        quote = ch;
        continue;
      }

      if (/\s/.test(ch)) {
        if (cur) {
          parts.push(cur);
          cur = "";
        }
        continue;
      }

      cur += ch;
    }

    if (cur) parts.push(cur);
    return parts;
  }

  function splitPath(path) {
    return String(path || "")
      .split("/")
      .filter(Boolean);
  }

  function resolvePath(inputPath) {
    const raw = String(inputPath || "").trim();
    if (!raw || raw === ".") return cwdRelPath;

    let baseParts = splitPath(cwdRelPath);
    let pathToProcess = raw;

    if (raw === "~") return "";
    if (raw.startsWith("~/")) {
      baseParts = [];
      pathToProcess = raw.slice(2);
    } else if (raw.startsWith("/")) {
      baseParts = [];
      pathToProcess = raw.slice(1);
    }

    const pieces = splitPath(pathToProcess);
    for (const part of pieces) {
      if (part === ".") continue;
      if (part === "..") {
        if (baseParts.length) baseParts.pop();
        continue;
      }
      baseParts.push(part);
    }

    return baseParts.join("/");
  }

  function getTreeNode(relPath) {
    if (!window.protectedGlobals.treeData) return null;
    let cur = window.protectedGlobals.treeData;
    const parts = splitPath(relPath);
    for (const part of parts) {
      if (!cur || !Array.isArray(cur[1])) return null;
      cur = cur[1].find((entry) => entry && entry[0] === part);
      if (!cur) return null;
    }
    return cur;
  }

  function isDirectoryNode(node) {
    return !!(node && Array.isArray(node[1]));
  }

  function decodeBase64Utf8(raw) {
    if (typeof base64ToUtf8 === "function") {
      return base64ToUtf8(raw);
    }
    try {
      return decodeURIComponent(escape(atob(raw)));
    } catch (e) {
      return atob(raw);
    }
  }

  async function readFileByPath(relPath) {
    if (typeof window.protectedGlobals.fetchFileContentByPath !== "function") {
      throw new Error("fetchFileContentByPath is unavailable");
    }
    const b64 = await window.protectedGlobals.fetchFileContentByPath(relPath);
    return decodeBase64Utf8(b64);
  }

  function utf8ToBase64(text) {
    try {
      return btoa(unescape(encodeURIComponent(String(text || ""))));
    } catch (e) {
      return btoa(String(text || ""));
    }
  }

  function ensureServerResultOk(response) {
    if (!response) {
      throw new Error("empty server response");
    }
    if (response.error) {
      const errorMessage = String(response.error || "");
      if (/denied/i.test(errorMessage) && typeof window.protectedGlobals.notification === "function") {
        window.protectedGlobals.notification(errorMessage);
      }
      throw new Error(String(response.error));
    }
  }

  function parsePermissionMode(rawOptionText) {
    const normalized = String(rawOptionText || "").trim().toLowerCase();
    if (!normalized) return null;
    if (normalized === "none") return { read: false, write: false };
    if (normalized === "read") return { read: true, write: false };
    if (normalized === "write") return { read: false, write: true };

    const parts = normalized
      .replace(/[+,]/g, " ")
      .split(/\s+/)
      .map((part) => part.trim())
      .filter(Boolean);
    if (!parts.length) return null;

    let read = false;
    let write = false;
    for (const part of parts) {
      if (part === "read") {
        read = true;
        continue;
      }
      if (part === "write") {
        write = true;
        continue;
      }
      return null;
    }

    return { read, write };
  }

  function notifyDenied(message) {
    if (typeof window.protectedGlobals.notification === "function") {
      window.protectedGlobals.notification(String(message || "Access denied."));
    }
  }
  let pendingPasswordAction = null;

  function promptForPassword(promptMessage) {
    return new Promise((resolve) => {
      pendingPasswordAction = {
        resolve,
        promptMessage: String(promptMessage || "password"),
      };
      writeLine("password:");
      try { input.value = ""; } catch (e) {}
      try { input.focus(); } catch (e) {}
    });
  }

  async function saveTextFileByPath(relPath, text) {
    if (typeof window.protectedGlobals.filePost !== "function") {
      throw new Error("window.protectedGlobals.filePost is unavailable");
    }
    const response = await window.protectedGlobals.filePost({
      saveSnapshot: true,
      directions: [
        { edit: true, contents: utf8ToBase64(text), path: relPath, replace: true },
        { end: true },
      ],
    });
    ensureServerResultOk(response);
    if (typeof window.protectedGlobals.onlyloadTree === "function") {
      try {
        await window.protectedGlobals.onlyloadTree();
      } catch (e) {}
    }
  }

  async function applySnapshotDirections(directions) {
    if (typeof window.protectedGlobals.filePost !== "function") {
      throw new Error("window.protectedGlobals.filePost is unavailable");
    }
    const response = await window.protectedGlobals.filePost({
      saveSnapshot: true,
      directions: [...directions, { end: true }],
    });
    ensureServerResultOk(response);
    if (typeof window.protectedGlobals.onlyloadTree === "function") {
      try {
        await window.protectedGlobals.onlyloadTree();
      } catch (e) {}
    }
  }


  function listApps() {
    try {
      if (Array.isArray(window.protectedGlobals.apps) && window.protectedGlobals.apps.length) {
        return window.protectedGlobals.apps
          .map((a) => (a.functionname || a.id || a.label || a.path || ""))
          .filter(Boolean)
          .map((s) => String(s).toLowerCase());
      }
    } catch (e) {}
    return [];
  }

  function openAppByName(name) {
    const target = String(name || "").trim().toLowerCase();
    if (!target) return false;
    try {
      const apps = Array.isArray(window.protectedGlobals.apps) ? window.protectedGlobals.apps : [];
      let app = apps.find((a) => {
        const candidates = [a.functionname, a.id, a.label, a.path]
          .filter((v) => typeof v !== "undefined" && v !== null)
          .map((v) => String(v).toLowerCase());
        return candidates.includes(target);
      });
      if (!app) {
        app = apps.find((a) => String(a.label || "").toLowerCase() === target);
      }
      if (!app) {
        app = apps.find((a) => String(a.label || "").toLowerCase().startsWith(target));
      }
      if (!app) return false;
      const functionName = app.functionname || app.id;
      if (functionName && typeof window[functionName] === "function") {
        try {
          return window[functionName](90, 90);
        } catch (e) {
          return false;
        }
      }
    } catch (e) {}
    return false;
  }

  function getCustomCommandEntries() {
    var registry =
      window.protectedGlobals.__terminalCustomCommands && typeof window.protectedGlobals.__terminalCustomCommands === "object"
        ? window.protectedGlobals.__terminalCustomCommands
        : {};
    return Object.keys(registry)
      .map((name) => registry[name])
      .filter((entry) => entry && typeof entry.handler === "function")
      .sort((a, b) => String(a.name).localeCompare(String(b.name)));
  }

  function resolveCustomCommand(name) {
    var target = normalizeTerminalCommandName(name);
    if (!target) return null;
    var entries = getCustomCommandEntries();
    for (var i = 0; i < entries.length; i++) {
      if (entries[i].name === target) return entries[i];
      var aliases = Array.isArray(entries[i].aliases) ? entries[i].aliases : [];
      if (aliases.indexOf(target) !== -1) return entries[i];
    }
    return null;
  }

  async function executeCustomCommand(customCommand, args) {
    var context = {
      writeLine: function (value, color) {
        if (typeof value === "undefined") return;
        if (typeof value === "object" && value !== null) {
          writeLine(JSON.stringify(value, null, 2), color || "");
          return;
        }
        writeLine(String(value), color || "");
      },
      openAppByName: openAppByName,
      listApps: listApps,

      getCwd: function () {
        return cwdDisplayPath();
      },
    };

    try {
      var result = await customCommand.handler(context, args || []);
      if (typeof result === "undefined") return;
      if (typeof result === "string") {
        writeLine(result);
        return;
      }
      if (typeof result === "object" && result !== null) {
        writeLine(JSON.stringify(result, null, 2));
        return;
      }
      writeLine(String(result));
    } catch (err) {
      var message =
        err && typeof err.message === "string" && err.message
          ? err.message
          : "custom command failed";
      writeLine(`${customCommand.name}: ${message}`, "#ff7a7a");
    }
  }

  function getAllCommandNames() {
    var merged = getTerminalBuiltInCommandNames();
    var seen = {};
    for (var i = 0; i < merged.length; i++) seen[merged[i]] = true;
    var custom = getCustomCommandEntries();
    for (var j = 0; j < custom.length; j++) {
      var entry = custom[j];
      if (entry && entry.name && !seen[entry.name]) {
        merged.push(entry.name);
        seen[entry.name] = true;
      }
      var aliases = Array.isArray(entry && entry.aliases) ? entry.aliases : [];
      for (var k = 0; k < aliases.length; k++) {
        if (aliases[k] && !seen[aliases[k]]) {
          merged.push(aliases[k]);
          seen[aliases[k]] = true;
        }
      }
    }
    return merged;
  }

  async function runCommand(rawText) {
    const trimmed = String(rawText || "").trim();
    if (!trimmed) return;

    const tokens = parseArgs(trimmed);
    if (!tokens.length) return;
    const command = tokens[0].toLowerCase();
    const args = tokens.slice(1);
    const matchedCustomCommand = resolveCustomCommand(command);

    if (matchedCustomCommand && matchedCustomCommand.forceOverride) {
      await executeCustomCommand(matchedCustomCommand, args);
      return;
    }

    if (command === "help") {
      writeLine("Built-ins:  " + getTerminalBuiltInCommandNames().join(", "));
      writeLine("Filesystem: ls [path], cd [path], cat <path>, head [-n N] <path>, tail [-n N] <path>");
      writeLine("            mkdir <path>, touch <path>, write <path> <text>, rm <path>");
      writeLine("            cp <src> <dst>, mv <src> <dst>");
      writeLine("Perms:      changeperm <path> <read|write|read+write|none>");
      writeLine("Apps:       apps, open <app>, run <path|function> [args...]");
      const customCommands = getCustomCommandEntries();
      if (customCommands.length) {
        writeLine(
          "Custom:     " +
            customCommands
              .map((entry) => {
                var aliases = Array.isArray(entry.aliases) ? entry.aliases : [];
                if (!aliases.length) return entry.name;
                return entry.name + " (aliases: " + aliases.join(", ") + ")";
              })
              .join(", "),
        );
      }
      writeLine("Keys:       Tab=complete  ↑↓=history  Ctrl+L=clear  Ctrl+C=cancel");
      writeLine("Tip:        quote arguments with spaces, e.g. echo \"hello world\"");
      return;
    }

    if (command === "clear") {
      output.innerHTML = "";
      return;
    }

    if (command === "echo") {
      writeLine(expandVars(args.join(" ")));
      return;
    }

    if (command === "date") {
      writeLine(new Date().toString());
      return;
    }

    if (command === "whoami") {
      writeLine(username);
      return;
    }

    if (command === "pwd") {
      writeLine(cwdDisplayPath());
      return;
    }

    if (command === "ls") {
      const targetRelPath = resolvePath(args[0] || ".");
      const node = getTreeNode(targetRelPath);
      if (!node) {
        writeLine(`ls: cannot access '${args[0] || "."}': no such file or directory`, "#ff7a7a");
        return;
      }

      if (!isDirectoryNode(node)) {
        writeLine(node[0]);
        return;
      }

      const children = (node[1] || []).slice().sort((a, b) => String(a[0]).localeCompare(String(b[0])));
      if (!children.length) {
        writeLine("(empty)");
        return;
      }
      writeLine(children.map((entry) => isDirectoryNode(entry) ? `${entry[0]}/` : entry[0]).join("  "));
      return;
    }

    if (command === "history") {
      commandHistory.forEach((value, index) => {
        writeLine(`${index + 1}  ${value}`);
      });
      return;
    }

    if (command === "cd") {
      const target = args[0] || "~";
      const targetRelPath = resolvePath(target);
      const node = getTreeNode(targetRelPath);
      if (!node) {
        writeLine(`cd: no such file or directory: ${target}`, "#ff7a7a");
        return;
      }
      if (!isDirectoryNode(node)) {
        writeLine(`cd: not a directory: ${target}`, "#ff7a7a");
        return;
      }
      cwdRelPath = targetRelPath;
      updatePrompt();
      return;
    }

    if (command === "cat") {
      if (!args[0]) {
        writeLine("usage: cat <path>");
        return;
      }

      const targetRelPath = resolvePath(args[0]);
      const node = getTreeNode(targetRelPath);
      if (!node) {
        writeLine(`cat: ${args[0]}: No such file or directory`, "#ff7a7a");
        return;
      }
      if (isDirectoryNode(node)) {
        writeLine(`cat: ${args[0]}: Is a directory`, "#ff7a7a");
        return;
      }

      try {
        const content = await readFileByPath(targetRelPath);
        if (content.length > 6000) {
          writeLine(content.slice(0, 6000));
          writeLine("[output truncated]");
        } else {
          writeLine(content);
        }
      } catch (err) {
        writeLine(`cat: failed to read '${args[0]}'`, "#ff7a7a");
      }
      return;
    }

    if (command === "mkdir") {
      if (!args[0]) {
        writeLine("usage: mkdir <path>");
        return;
      }
      const targetRelPath = resolvePath(args[0]);
      if (!targetRelPath) {
        writeLine("mkdir: refusing to create root", "#ff7a7a");
        return;
      }
      const existing = getTreeNode(targetRelPath);
      if (existing && isDirectoryNode(existing)) {
        writeLine(`mkdir: ${args[0]}: directory already exists`, "#ffcf5a");
        return;
      }
      if (existing && !isDirectoryNode(existing)) {
        writeLine(`mkdir: ${args[0]}: file exists`, "#ff7a7a");
        return;
      }
      try {
        await applySnapshotDirections([{ addFolder: true, path: `root/${targetRelPath}` }]);
      } catch (e) {
        writeLine(`mkdir: failed to create '${args[0]}'`, "#ff7a7a");
      }
      return;
    }

    if (command === "touch") {
      if (!args[0]) {
        writeLine("usage: touch <path>");
        return;
      }
      const targetRelPath = resolvePath(args[0]);
      if (!targetRelPath) {
        writeLine("touch: invalid path", "#ff7a7a");
        return;
      }
      const existing = getTreeNode(targetRelPath);
      if (existing && isDirectoryNode(existing)) {
        writeLine(`touch: ${args[0]}: is a directory`, "#ff7a7a");
        return;
      }
      if (existing && !isDirectoryNode(existing)) {
        return;
      }
      try {
        await applySnapshotDirections([{ addFile: true, path: `root/${targetRelPath}` }]);
      } catch (e) {
        writeLine(`touch: failed to create '${args[0]}'`, "#ff7a7a");
      }
      return;
    }

    if (command === "write") {
      if (!args[0] || args.length < 2) {
        writeLine("usage: write <path> <text>");
        return;
      }
      const targetRelPath = resolvePath(args[0]);
      if (!targetRelPath) {
        writeLine("write: invalid path", "#ff7a7a");
        return;
      }
      const existing = getTreeNode(targetRelPath);
      if (existing && isDirectoryNode(existing)) {
        writeLine(`write: ${args[0]}: is a directory`, "#ff7a7a");
        return;
      }
      try {
        await saveTextFileByPath(targetRelPath, args.slice(1).join(" "));
      } catch (e) {
        writeLine(`write: failed to write '${args[0]}'`, "#ff7a7a");
      }
      return;
    }

    if (command === "rm") {
      if (!args[0]) {
        writeLine("usage: rm <path>");
        return;
      }
      const targetRelPath = resolvePath(args[0]);
      if (!targetRelPath) {
        writeLine("rm: refusing to remove root", "#ff7a7a");
        return;
      }
      const existing = getTreeNode(targetRelPath);
      if (!existing) {
        writeLine(`rm: cannot remove '${args[0]}': no such file or directory`, "#ff7a7a");
        return;
      }
      try {
        await applySnapshotDirections([{ delete: true, path: `root/${targetRelPath}` }]);
      } catch (e) {
        writeLine(`rm: failed to remove '${args[0]}'`, "#ff7a7a");
      }
      return;
    }

    if (command === "cp") {
      if (!args[0] || !args[1]) {
        writeLine("usage: cp <src> <dst>");
        return;
      }
      const srcRelPath = resolvePath(args[0]);
      const dstRelPath = resolvePath(args[1]);
      if (!srcRelPath) {
        writeLine("cp: invalid source path", "#ff7a7a");
        return;
      }
      if (!dstRelPath) {
        writeLine("cp: invalid destination path", "#ff7a7a");
        return;
      }
      const srcNode = getTreeNode(srcRelPath);
      if (!srcNode) {
        writeLine(`cp: '${args[0]}': No such file or directory`, "#ff7a7a");
        return;
      }
      if (isDirectoryNode(srcNode)) {
        writeLine(`cp: '${args[0]}': Is a directory`, "#ff7a7a");
        return;
      }
      let dstFinalPath = dstRelPath;
      const dstNode = getTreeNode(dstRelPath);
      if (dstNode && isDirectoryNode(dstNode)) {
        const fileName = srcRelPath.split("/").pop();
        dstFinalPath = dstRelPath ? `${dstRelPath}/${fileName}` : fileName;
      }
      try {
        const content = await readFileByPath(srcRelPath);
      let pendingPasswordAction = null;
        await saveTextFileByPath(dstFinalPath, content);
      } catch (e) {
        writeLine(`cp: failed to copy '${args[0]}'`, "#ff7a7a");
      }
      return;
    }

    if (command === "mv") {
      if (!args[0] || !args[1]) {
        writeLine("usage: mv <src> <dst>");
        return;
      }
      const srcRelPath = resolvePath(args[0]);
      const dstRelPath = resolvePath(args[1]);
      if (!srcRelPath) {
        writeLine("mv: invalid source path", "#ff7a7a");
        return;
      }
      if (!dstRelPath) {
        writeLine("mv: invalid destination path", "#ff7a7a");
        return;
      }
      const srcNode = getTreeNode(srcRelPath);
      if (!srcNode) {
        writeLine(`mv: '${args[0]}': No such file or directory`, "#ff7a7a");
        return;
      }
      if (isDirectoryNode(srcNode)) {
        writeLine(`mv: '${args[0]}': Is a directory (directory move not supported)`, "#ff7a7a");
        return;
      }
      let dstFinalPath = dstRelPath;
      const dstNode = getTreeNode(dstRelPath);
      if (dstNode && isDirectoryNode(dstNode)) {
        const fileName = srcRelPath.split("/").pop();
        dstFinalPath = dstRelPath ? `${dstRelPath}/${fileName}` : fileName;
      }
      try {
        const content = await readFileByPath(srcRelPath);
        await saveTextFileByPath(dstFinalPath, content);
        await applySnapshotDirections([{ delete: true, path: `root/${srcRelPath}` }]);
      } catch (e) {
        writeLine(`mv: failed to move '${args[0]}'`, "#ff7a7a");
      }
      return;
    }

    if (command === "head") {
      let n = 10;
      let pathArg = args[0];
      if (args[0] === "-n" && args[1] && args[2]) {
        n = parseInt(args[1], 10);
        if (!Number.isFinite(n) || n < 1) {
          writeLine("head: invalid line count", "#ff7a7a");
          return;
        }
        pathArg = args[2];
      } else if (args[0] === "-n") {
        writeLine("usage: head [-n N] <path>");
        return;
      }
      if (!pathArg) {
        writeLine("usage: head [-n N] <path>");
        return;
      }
      const targetRelPath = resolvePath(pathArg);
      const node = getTreeNode(targetRelPath);
      if (!node) {
        writeLine(`head: ${pathArg}: No such file or directory`, "#ff7a7a");
        return;
      }
      if (isDirectoryNode(node)) {
        writeLine(`head: ${pathArg}: Is a directory`, "#ff7a7a");
        return;
      }
      try {
        const content = await readFileByPath(targetRelPath);
        const lines = content.split("\n").slice(0, n);
        writeLine(lines.join("\n"));
      } catch (err) {
        writeLine(`head: failed to read '${pathArg}'`, "#ff7a7a");
      }
      return;
    }

    if (command === "tail") {
      let n = 10;
      let pathArg = args[0];
      if (args[0] === "-n" && args[1] && args[2]) {
        n = parseInt(args[1], 10);
        if (!Number.isFinite(n) || n < 1) {
          writeLine("tail: invalid line count", "#ff7a7a");
          return;
        }
        pathArg = args[2];
      } else if (args[0] === "-n") {
        writeLine("usage: tail [-n N] <path>");
        return;
      }
      if (!pathArg) {
        writeLine("usage: tail [-n N] <path>");
        return;
      }
      const targetRelPath = resolvePath(pathArg);
      const node = getTreeNode(targetRelPath);
      if (!node) {
        writeLine(`tail: ${pathArg}: No such file or directory`, "#ff7a7a");
        return;
      }
      if (isDirectoryNode(node)) {
        writeLine(`tail: ${pathArg}: Is a directory`, "#ff7a7a");
        return;
      }
      try {
        const content = await readFileByPath(targetRelPath);
        const allLines = content.split("\n");
        const lines = allLines.slice(Math.max(0, allLines.length - n));
        writeLine(lines.join("\n"));
      } catch (err) {
        writeLine(`tail: failed to read '${pathArg}'`, "#ff7a7a");
      }
      return;
    }

    if (command === "changeperm") {
      if (!args[0] || !args[1]) {
        writeLine("usage: changeperm <path> <read|write|read+write|none>");
        return;
      }

      const targetRelPath = resolvePath(args[0]);
      const mode = parsePermissionMode(args.slice(1).join(" "));
      if (!mode) {
        writeLine("changeperm: invalid mode (use read, write, read+write, or none)", "#ff7a7a");
        return;
      }

      if (typeof window.protectedGlobals.getCurrentUsernameForRequests !== "function" || typeof window.protectedGlobals.zmcdserver !== "string") {
        writeLine("changeperm: permission API unavailable", "#ff7a7a");
        return;
      }

      const normalizedPermissionPath = targetRelPath ? `/${targetRelPath}` : "/";
      const password = await promptForPassword(`Password required to change ${normalizedPermissionPath}`);
      if (password === null) {
        return;
      }

      try {
        const response = await window.protectedGlobals.zmcdpost({updatePathPermission: {
          path: normalizedPermissionPath,
          perm: mode,
        },           password: String(password || ""),
});
        let body = response;
        ensureServerResultOk(response);
        window.protectedGlobals.data = window.protectedGlobals.data || {};
        window.protectedGlobals.data.pathPermissions = Array.isArray(body.pathPermissions)
          ? body.pathPermissions
          : window.protectedGlobals.data.pathPermissions;
        writeLine(`changeperm: ${normalizedPermissionPath} -> read=${mode.read} write=${mode.write}`);
      } catch (e) {
        const message = String((e && e.message) || "failed");
        if (/denied|unauthorized/i.test(message)) {
          notifyDenied(message);
        }
        writeLine(`changeperm: ${message}`, "#ff7a7a");
      }
      return;
    }

    if (command === "apps") {
      writeLine("Openable apps: " + (listApps().join(", ") || "none detected"));
      return;
    }





    if (command === "unset") {
      if (!args[0]) {
        writeLine("usage: unset <KEY>");
        return;
      }
      return;
    }

    if (command === "open") {
      if (!args[0]) {
        writeLine("usage: open <app>");
        return;
      }
      const opened = openAppByName(args[0]);
      if (!opened) {
        writeLine(`open: unknown app '${args[0]}'`, "#ff7a7a");
      }
      return;
    }

    if (command === "run") {
      if (!args[0]) {
        writeLine("usage: run <path|function> [args...]");
        return;
      }

      const rawTarget = args[0];
      const resolvedPath = resolvePath(rawTarget);
      const fnName = rawTarget;
      const fn = window[fnName];

      if (typeof fn !== "function") {
        writeLine(`run: function not found for '${rawTarget}'`, "#ff7a7a");
        return;
      }

      try {
        const result = await fn(...args.slice(1));
        if (typeof result !== "undefined") {
          if (typeof result === "object") writeLine(JSON.stringify(result));
          else writeLine(String(result));
        }
      } catch (e) {
        writeLine(`run: execution failed for '${rawTarget}'`, "#ff7a7a");
      }
      return;
    }

    if (command === "exit") {
      closeWindow();
      return;
    }

    if (matchedCustomCommand) {
      await executeCustomCommand(matchedCustomCommand, args);
      return;
    }

    writeLine(`${command}: command not found`, "#ff7a7a");
  }

  function tabComplete() {
    const val = input.value;
    const trailingSpace = val.length > 0 && /\s$/.test(val);
    const tokens = parseArgs(val);

    if (tokens.length === 0 || (tokens.length === 1 && !trailingSpace)) {
      const partial = tokens[0] || "";
      const matches = getAllCommandNames().filter((c) => c.startsWith(partial));
      if (matches.length === 1) {
        input.value = matches[0] + " ";
      } else if (matches.length > 1) {
        writeLine(matches.join("  "));
        let common = matches[0];
        for (const m of matches.slice(1)) {
          let i = 0;
          while (i < common.length && i < m.length && common[i] === m[i]) i++;
          common = common.slice(0, i);
        }
        if (common.length > partial.length) input.value = common;
      }
      return;
    }

    const partial = trailingSpace ? "" : (tokens[tokens.length - 1] || "");
    const slashIdx = partial.lastIndexOf("/");
    const dirPart = slashIdx >= 0 ? partial.slice(0, slashIdx + 1) : "";
    const filePart = slashIdx >= 0 ? partial.slice(slashIdx + 1) : partial;

    const dirRelPath = dirPart ? resolvePath(dirPart.replace(/\/$/, "")) : cwdRelPath;
    // When dirRelPath is empty string we are at the filesystem root node
    const dirNode = dirRelPath ? getTreeNode(dirRelPath) : (window.protectedGlobals.treeData || null);
    if (!dirNode) return;
    const children = (dirNode && Array.isArray(dirNode[1])) ? dirNode[1] : [];
    const matches = children.filter((entry) =>
      String(entry[0]).toLowerCase().startsWith(filePart.toLowerCase())
    );

    if (matches.length === 0) return;

    const prefix = trailingSpace ? val : val.slice(0, val.length - partial.length);

    if (matches.length === 1) {
      const isDir = isDirectoryNode(matches[0]);
      input.value = prefix + dirPart + matches[0][0] + (isDir ? "/" : " ");
    } else {
      writeLine(matches.map((e) => isDirectoryNode(e) ? e[0] + "/" : e[0]).join("  "));
      let common = matches[0][0];
      for (const m of matches.slice(1)) {
        let i = 0;
        while (i < common.length && i < m[0].length && common[i].toLowerCase() === m[0][i].toLowerCase()) i++;
        common = common.slice(0, i);
      }
      if (common.length > filePart.length) {
        input.value = prefix + dirPart + common;
      }
    }
  }

  input.addEventListener("keydown", async (event) => {
    if (pendingPasswordAction) {
      if (event.key === "Escape") {
        event.preventDefault();
        const pending = pendingPasswordAction;
        pendingPasswordAction = null;
        try { input.value = ""; } catch (e) {}
        writeLine("changeperm: cancelled");
        if (pending && typeof pending.resolve === "function") pending.resolve(null);
        return;
      }

      if (event.key === "Enter") {
        event.preventDefault();
        const pending = pendingPasswordAction;
        const password = String(input.value || "");
        if (!password.trim()) {
          writeLine("password:");
          try { input.value = ""; } catch (e) {}
          return;
        }
        pendingPasswordAction = null;
        try { input.value = ""; } catch (e) {}
        if (pending && typeof pending.resolve === "function") pending.resolve(password);
        return;
      }

      if (event.key === "Tab" || event.ctrlKey || event.key === "ArrowUp" || event.key === "ArrowDown") {
        event.preventDefault();
        return;
      }
    }
    if (event.key === "Tab") {
      event.preventDefault();
      tabComplete();
      return;
    }

    if (event.key === "l" && event.ctrlKey) {
      event.preventDefault();
      output.innerHTML = "";
      return;
    }

    if (event.key === "c" && event.ctrlKey) {
      event.preventDefault();
      if (input.value) {
        renderEnteredCommand(input.value);
        writeLine("^C");
        input.value = "";
        historyIndex = commandHistory.length;
      }
      return;
    }

    if (event.key === "Enter") {
      const entered = input.value;
      renderEnteredCommand(entered);
      if (entered.trim()) {
        commandHistory.push(entered.trim());
      }
      historyIndex = commandHistory.length;
      try {
        await runCommand(entered);
      } catch (e) {
        writeLine("terminal: unexpected command error", "#ff7a7a");
      }
      input.value = "";
      return;
    }

    if (event.key === "ArrowUp") {
      if (!commandHistory.length) return;
      event.preventDefault();
      historyIndex = Math.max(0, historyIndex - 1);
      input.value = commandHistory[historyIndex] || "";
      input.setSelectionRange(input.value.length, input.value.length);
      return;
    }

    if (event.key === "ArrowDown") {
      if (!commandHistory.length) return;
      event.preventDefault();
      historyIndex = Math.min(commandHistory.length, historyIndex + 1);
      input.value = historyIndex === commandHistory.length ? "" : (commandHistory[historyIndex] || "");
      input.setSelectionRange(input.value.length, input.value.length);
    }
  });

  root.addEventListener("mousedown", () => {
    setTimeout(() => {
      try { input.focus(); } catch (e) {}
    }, 0);
  });

  updatePrompt();
  setTimeout(() => {
    try { input.focus(); } catch (e) {}
  }, 0);

  terminalGlobals.allTerminals.push({
    rootElement: root,
    btnMax,
    _isMinimized,
    isMaximized,
    getBounds,
    applyBounds,
    showWindow,
    hideWindow,
    closeWindow,
    showAll,
    hideAll,
    closeAll,
    newWindow,
    showall: showAll,
    hideall: hideAll,
    closeall: closeAll,
    newwindow: newWindow,
    goldenbodyId: root._goldenbodyId,
  });
  window.protectedGlobals.applyStyles();

  return {
    rootElement: root,
    btnMax,
    _isMinimized,
    isMaximized,
    getBounds,
    applyBounds,
    showWindow,
    hideWindow,
    closeWindow,
    showAll,
    hideAll,
    closeAll,
    newWindow,
    showall: showAll,
    hideall: hideAll,
    closeall: closeAll,
    newwindow: newWindow,
    goldenbodyId: root._goldenbodyId,
  };
};


