// Terminal global vars - dispatch events to running apps to add terminal plugins
  // Command format: <app> <command> <args>
  window.allTerminals = [];
  window.terminalId = 0;

terminal = function (posX = 50, posY = 50) {
    startMenu.style.display = 'none';
    let isMaximized = false;
    let _isMinimized = false;
    atTop = "terminal";
    const root = document.createElement("div");
    debugger;
    root.className = "sim-chrome-root";
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
    root.classList.add('terminal');
    bringToFront(root);
    document.body.appendChild(root);
    terminalId++;
    root._terminalId = terminalId;
    // per-terminal current working directory (string, e.g. "/" or "/path/to/folder")
    root._cwd = '/';

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
    dragStrip.style.cursor = 'move';
    dragStrip.style.width = "100%";
    dragStrip.addEventListener("click", function () {
      bringToFront(root);
    });
    root.prepend(dragStrip);
    const barrier = document.createElement("div");
    barrier.style.flexShrink = "0";
    barrier.style.display = "flex";
    barrier.style.height = "14px";
    barrier.style.width = "100%";
    barrier.addEventListener("click", function () {
      bringToFront(root);
    });
    root.prepend(barrier);


    var btnMin = document.createElement("button");
    btnMin.innerText = "‎    –    ‎";
    btnMin.className = 'btnMinColor';
    btnMin.title = "Minimize";
    topBar.appendChild(btnMin);

    var btnMax = document.createElement("button");
    btnMax.innerText = "‎     □    ‎ ";
    btnMax.className = 'btnMaxColor';
    btnMax.style.fontSize = "20px";
    btnMax.title = "Maximize/Restore";
    topBar.appendChild(btnMax);

    var btnClose = document.createElement("button");
    btnClose.innerText = "‎     x    ‎ ";
    btnClose.title = "Close";
    btnClose.style.color = "white";
    btnClose.style.backgroundColor = "red";
    topBar.appendChild(btnClose);

    [topBar, btnMin, btnMax, btnClose].forEach((el) => {
      el.style.margin = "0 2px";
      el.style.border = "none";
      el.style.padding = "2px 5px";
      el.style.fontSize = "14px";
      el.style.cursor = "pointer";
    });
    topBar.addEventListener("click", function () {
      bringToFront(root);
    });
    root.appendChild(topBar);
    // --- Saved bounds shared correctly ---
    let savedBounds = {
      left: root.style.left,
      top: root.style.top,
      width: root.style.width,
      height: root.style.height,
    };

    // Minimize
    btnMin.addEventListener("click", () => {
      savedBounds = getBounds();
      root.style.display = "none";
      _isMinimized = true;
    });

    // Maximize / Restore
    btnMax.addEventListener("click", () => {
      if (!isMaximized) {
        savedBounds = getBounds();
        root.style.left = "0";
        root.style.top = "0";
        root.style.width = "100%";
        root.style.height = `calc(100% - 60px)`;
        btnMax.textContent = "‎ ⧉ ‎";
        isMaximized = true;
        _isMinimized = false;
      } else {
        applyBounds(savedBounds);
        btnMax.textContent = "‎ □ ‎";
        isMaximized = false;
      }
    });

    // Close
    btnClose.addEventListener("click", () => {
      root.remove();
      let index = false;
      for (let i = 0; i < allTerminals.length; i++) {
        if (allTerminals[i].rootElement == root) {
          index = i;
        }
      }
      if (index !== false) allTerminals.splice(index, 1);
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
        let currentX, currentY;

        topBar.addEventListener("mousedown", (ev) => {
          dragging = true;
          startX = ev.clientX;
          startY = ev.clientY;
          origLeft = root.offsetLeft;
          origTop = root.offsetTop;
          currentX = ev.clientX;
          currentY = ev.clientY;
          document.body.style.userSelect = "none";
        });

        window.addEventListener("mousemove", (ev) => {
          if (!dragging) return;
          if (ev.clientX - currentX != 0 || ev.clientY - currentY != 0) {
            applyBounds(savedBounds);
            if (isMaximized) {
              root.style.left = ev.clientX - root.clientWidth / 2 + "px";
              origLeft = ev.clientX - root.clientWidth / 2;
              btnMax.textContent = "‎     □     ‎";
              isMaximized = false;
            }
          }
          const dx = ev.clientX - startX;
          const dy = ev.clientY - startY;
          root.style.left = origLeft + dx + "px";
          root.style.top = Math.max(0, origTop + dy) + "px";
        });

        window.addEventListener("mouseup", () => {
          dragging = false;
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
          };
          document.body.style.userSelect = "none";
          el.setPointerCapture(e.pointerId);
        });

        el.addEventListener("pointermove", (e) => {
          if (!active) return;
          isMaximized = false;
          btnMax.textContent = "‎     □    ‎ ";
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

      // --- Terminal UI: output + input ---
      const terminalContent = document.createElement('div');
      Object.assign(terminalContent.style, {
        display: 'flex',
        flexDirection: 'column',
        flex: '1',
        padding: '12px',
        gap: '8px',
        overflow: 'hidden'
      });

      const output = document.createElement('div');
      Object.assign(output.style, {
        flex: '1',
        overflow: 'auto',
        background: 'rgba(0,0,0,0.04)',
        padding: '8px',
        borderRadius: '6px',
        fontFamily: 'monospace',
        fontSize: '13px',
        whiteSpace: 'pre-wrap'
      });

      const inputRow = document.createElement('div');
      Object.assign(inputRow.style, { display: 'flex', gap: '8px', alignItems: 'center' });
      const prompt = document.createElement('div');
      prompt.textContent = root._cwd || '/';
      Object.assign(prompt.style, { fontFamily: 'monospace', fontSize: '13px' });
      const input = document.createElement('input');
      input.type = 'text';
      input.placeholder = 'Type command: <app> <command> <args>';
      Object.assign(input.style, { flex: '1', padding: '6px 8px', borderRadius: '6px', border: '1px solid rgba(0,0,0,0.12)', fontFamily: 'monospace' });

      inputRow.appendChild(prompt);
      inputRow.appendChild(input);
      terminalContent.appendChild(output);
      terminalContent.appendChild(inputRow);
      // insert before any other children so it fills the window
      root.appendChild(terminalContent);

      // handle command entry
      input.addEventListener('keydown', (ev) => {
        if (ev.key === 'Enter') {
          const raw = String(input.value || '').trim();
          if (!raw) return;
          // echo
          const echo = document.createElement('div');
          echo.textContent = `$ ${raw}`;
          echo.style.color = 'var(--cmd-color, #111)';
          output.appendChild(echo);
          output.scrollTop = output.scrollHeight;

          // parse into parts supporting quoted args, escaped chars, and backslash-space for literal spaces
          // e.g. cd '/my folder', app 'arg\ with\ space', app "double quoted"
          function splitArgs(str) {
            const out = [];
            let cur = '';
            let inSingleQuote = false;
            let inDoubleQuote = false;
            let isEscaped = false;

            for (let i = 0; i < str.length; i++) {
              const ch = str[i];

              // Handle escaped characters: backslash followed by any character (including space)
              if (isEscaped) {
                cur += ch;
                isEscaped = false;
                continue;
              }

              // Mark next character as escaped
              if (ch === '\\') {
                isEscaped = true;
                continue;
              }

              // Handle single-quoted strings (preserve everything inside)
              if (inSingleQuote) {
                if (ch === "'") {
                  inSingleQuote = false;
                } else {
                  cur += ch;
                }
                continue;
              }

              // Handle double-quoted strings (preserve everything inside)
              if (inDoubleQuote) {
                if (ch === '"') {
                  inDoubleQuote = false;
                } else {
                  cur += ch;
                }
                continue;
              }

              // Start single quote
              if (ch === "'") {
                inSingleQuote = true;
                continue;
              }

              // Start double quote
              if (ch === '"') {
                inDoubleQuote = true;
                continue;
              }

              // Split on whitespace when not quoted/escaped
              if (/\s/.test(ch)) {
                if (cur.length) {
                  out.push(cur);
                  cur = '';
                }
                continue;
              }

              // Regular character
              cur += ch;
            }

            if (cur.length) out.push(cur);
            return out;
          }

          const parts = splitArgs(raw);
          const appName = parts[0] || '';
          const cmd = parts[1] || '';
          const args = parts.slice(2);

          // built-in terminal commands: cd, pwd
          const normalizePath = (base, rel) => {
            // returns normalized path with leading '/' (root = '/')
            const baseParts = String(base || '/').split('/').filter(Boolean);
            let partsArr = [];
            if (typeof rel === 'string' && rel.startsWith('/')) {
              partsArr = rel.split('/').filter(Boolean);
            } else if (typeof rel === 'string' && rel.length > 0) {
              partsArr = baseParts.concat(rel.split('/').filter(Boolean));
            } else {
              partsArr = baseParts.slice();
            }
            const out = [];
            for (const p of partsArr) {
              if (p === '.' || p === '') continue;
              if (p === '..') { out.pop(); } else out.push(p);
            }
            return '/' + out.join('/');
          };
    function cleanPath(p) {
      return String(p || '').trim().replace(/^['"]|['"]$/g, '');
    }
function resolvePathParts(path, baseCwd) {
  const cleaned = cleanPath(path);

  const base =
    baseCwd && baseCwd !== '/'
      ? String(baseCwd).replace(/^\/+/, '').split('/').filter(Boolean)
      : [];

  let parts;
  if (!cleaned || cleaned === '.') {
    parts = base;
  } else if (cleaned.startsWith('/')) {
    parts = cleaned.replace(/^\/+/, '').split('/').filter(Boolean);
  } else {
    parts = base.concat(cleaned.split('/').filter(Boolean));
  }

  const resolved = [];
  for (const p of parts) {
    if (p === '.' || p === '') continue;
    if (p === '..') resolved.pop();
    else resolved.push(p);
  }

  // 🚨 Guard against "root" ever leaking
  if (resolved[0] === 'root') {
    throw new Error('BUG: frontend path resolved to "root"');
  }

  return resolved;
}


    function resolvePathToNode(path, baseCwd) {
      const parts = resolvePathParts(path, baseCwd);
      let current = treeData;
      for (const seg of parts) {
        if (!Array.isArray(current[1])) return null;
        current = current[1].find(c => c[0] === seg);
        if (!current) return null;
      }
      return current;
    }


// If the command itself is 'cd' (user typed: cd <path>)
if (appName === 'cd') {
  const appendOutput = (text, isError = false) => {
    const div = document.createElement('div');
    div.textContent = String(text);
    if (isError) div.style.color = 'var(--error-color, #d32f2f)';
    output.appendChild(div);
    output.scrollTop = output.scrollHeight;
  };

  try {
    // parts already come from splitArgs(), so escaped chars are handled
    const rawTarget = parts[1] ?? '/';

    // Resolve target relative to current cwd, handling .., ., and top-level absolute paths
    const resolvedParts = resolvePathParts(rawTarget, root._cwd || '');
    const node = resolvePathToNode(resolvedParts.join('/'), '');

    if (!node || !Array.isArray(node[1])) {
      appendOutput(`cd: no such directory: ${rawTarget}`, true);
      input.value = '';
      return;
    }

    // Update cwd: store without leading "/" (canonical form)
    const normalized =
      resolvedParts.length === 0
        ? ''
        : resolvedParts.join('/');

    root._cwd = normalized;
    prompt.textContent = '/' + (normalized || '');
    appendOutput(`cwd -> /${normalized || ''}`);
  } catch (e) {
    appendOutput(`cd error: ${e.message || e}`, true);
  }

  input.value = '';
  return;
}


          if (appName === 'pwd') {
            const pdiv = document.createElement('div');
            pdiv.textContent = root._cwd || '/';
            output.appendChild(pdiv);
            output.scrollTop = output.scrollHeight;
            input.value = '';
            return;
          }

          // Dispatch global event for apps to handle: include terminalId and cwd
          try {
            window.dispatchEvent(new CustomEvent('terminalCommand', {
              detail: { terminalId: root._terminalId, cwd: root._cwd, raw, parts, app: appName, command: cmd, args }
            }));
          } catch (e) { console.error('dispatch terminalCommand', e); }

          input.value = '';
        }
      });

      allTerminals.push({
        rootElement: root,
        btnMax,
        _isMinimized,
        isMaximized,
        getBounds,
        applyBounds,
        terminalId,
      });
          applyStyles();

      return {
        rootElement: root,
        btnMax,
        _isMinimized,
        isMaximized,
        getBounds,
        applyBounds,
        terminalId,
      };
    }
}






  // Terminal context menu
  window.terminalButtons = [];
  window.terminalMenu = null;
  terminalContextMenu = function(e, needRemove = true) {
    e.preventDefault();

    // Remove any existing menus
    document.querySelectorAll(".app-menu").forEach((m) => m.remove());

    const menu = document.createElement("div");
    window.terminalMenu = menu;
    try {
        removeOtherMenus('terminal');
    } catch (e) {}
    menu.className = "app-menu";
    Object.assign(menu.style, {
      position: "fixed",
      left: `${e.clientX}px`,
      border: "1px solid #ccc",
      borderRadius: "4px",
      boxShadow: "0 2px 6px rgba(0,0,0,0.2)",
      zIndex: 9999999,
      padding: "4px 0",
      minWidth: "160px",
      fontSize: "13px",
      visibility: "hidden", // hide temporarily so offsetHeight works
    });
      data.dark ? menu.classList.toggle('dark', true) : menu.classList.toggle('light', true);

    // --- Menu items ---
    const closeAll = document.createElement("div");
    closeAll.textContent = "Close all";
    closeAll.style.padding = "6px 10px";
    closeAll.style.cursor = "pointer";
    closeAll.addEventListener("click", () => {
      for (const i of allTerminals) {
        i.rootElement.remove();
      }

      allTerminals = [];
      menu.remove();
    });
    menu.appendChild(closeAll);

    const hideAll = document.createElement("div");
    hideAll.textContent = "Hide all";
    hideAll.style.padding = "6px 10px";
    hideAll.style.cursor = "pointer";
    hideAll.addEventListener("click", () => {
      for (const i of allTerminals) {
        i.rootElement.style.display = "none";
      }
      menu.remove();
    });
    menu.appendChild(hideAll);

    const showAll = document.createElement("div");
    showAll.textContent = "Show all";
    showAll.style.padding = "6px 10px";
    showAll.style.cursor = "pointer";
    showAll.addEventListener("click", () => {
      for (const i of allTerminals) {
        i.rootElement.style.display = "block";
        bringToFront(i.rootElement);
      }
      menu.remove();
    });
    menu.appendChild(showAll);

    const newWindow = document.createElement("div");
    newWindow.textContent = "New window";
    newWindow.style.padding = "6px 10px";
    newWindow.style.cursor = "pointer";
    newWindow.addEventListener("click", () => {
      terminal(50, 50);
      menu.remove();
    });
    menu.appendChild(newWindow);
    if (needRemove) {
      const remove = document.createElement("div");
      remove.textContent = "Remove from taskbar";
      remove.style.padding = "6px 10px";
      remove.style.cursor = "pointer";
      remove.addEventListener("click", () => {
        // Remove the setting’s taskbar button if it exists
        saveTaskButtons();
        for (let i = taskbuttons.length; i > 0; i--) {
          i--;
          let index = parseInt(getStringAfterChar(e.target.id, "-"));
          if (
            index === parseInt(getStringAfterChar(taskbuttons[i].id, "-")) &&
            taskbuttons[i].id.startsWith("🖥️")
          ) {
            taskbuttons[i].remove();
            iconid = 0;
            let newtb = [];
            for (const a of taskbuttons) {
              a.id = Array.from(a.id)[0] + "-" + iconid;
              iconid++;
              if (Array.from(a.id)[0] !== "▶") {
                newtb.push(a);
              } else {
                a.id = Array.from(a.id)[0];
                newtb.push(a);
                iconid--;
              }
            }
            break;
          }
          i++;
        }
        menu.remove();
      });
      menu.appendChild(remove);
    } else {
      const add = document.createElement("div");
      add.textContent = "Add to taskbar";
      add.style.padding = "6px 10px";
      add.style.cursor = "pointer";
      add.addEventListener("click", function () {
        let terminalButton = addTaskButton("🖥️", terminal);
        saveTaskButtons();
        purgeButtons();
        for (const fb of terminalButtons) {
          fb.addEventListener("contextmenu", terminalContextMenu);
        }
      });
      menu.appendChild(add);
    }
    const barrier = document.createElement("hr");
    menu.appendChild(barrier);

    if (allTerminals.length === 0) {
      const item = document.createElement("div");
      item.textContent = "No open windows";
      item.style.padding = "6px 10px";
      menu.appendChild(item);
    } else {
      allTerminals.forEach((instance, i) => {
        const item = document.createElement("div");
        item.textContent = instance.title || `Terminal ${i + 1}`;

        Object.assign(item.style, {
            padding: "6px 10px",
            cursor: "pointer",
            maxWidth: "185px",

            whiteSpace: "nowrap",      // ⬅️ prevent wrapping
            overflow: "hidden",        // ⬅️ hide overflow
            textOverflow: "ellipsis",  // ⬅️ show …
        });


        item.addEventListener("click", () => {
          // Bring to front
          bringToFront(instance.rootElement);

          // Unminimize if hidden
          if (instance.rootElement.style.display === "none") {
            instance.rootElement.style.display = "flex";
            instance.rootElement._isMinimized = false;
            instance.rootElement._isMaximized = false;
          }
          menu.remove();
        });

        menu.appendChild(item);
      });
    }

    document.body.appendChild(menu);

    // --- Position menu above click ---
    requestAnimationFrame(() => {
      const menuHeight = menu.offsetHeight;
      let top = e.clientY - menuHeight; // above click
      if (top < 0) top = 0; // prevent going off screen
      menu.style.top = `${top}px`;
      menu.style.visibility = "visible";
    });

    // Remove menu on click outside
    window.addEventListener("click", () => menu.remove(), { once: true });
  }


  debugger;
    window.addEventListener("appUpdated", () => {
  var terminalBtn = document.getElementById("terminalapp");
  terminalBtn.addEventListener("contextmenu",   function ehl1(e) {
    terminalContextMenu(e, (needremove = false));
  });
    });

// Use MutationObserver to attach contextmenu listeners to taskbar/start buttons for terminal
try {
  function attachTerminalContext(btn) {
    try {
      if (!btn || !(btn instanceof HTMLElement)) return;
      if (btn.dataset && btn.dataset.terminalContextBound) return;
      const aid = (btn.dataset && btn.dataset.appId) || btn.id || '';
      if (!(String(aid) === '🖥️' || String(aid) === 'terminal')) return;
      btn.addEventListener('contextmenu', terminalContextMenu);
      if (btn.dataset) btn.dataset.terminalContextBound = '1';
      terminalButtons.push(btn);
    } catch (e) {}
  }

  try {
    const existing = (typeof taskbar !== 'undefined' && taskbar) ? taskbar.querySelectorAll('button') : document.querySelectorAll('button');
    for (const b of existing) attachTerminalContext(b);
  } catch (e) {}

  const observerTarget = (typeof taskbar !== 'undefined' && taskbar) ? taskbar : document.body;
  const mo = new MutationObserver((mutations) => {
    for (const m of mutations) {
      for (const n of m.addedNodes) {
        if (!(n instanceof HTMLElement)) continue;
        if (n.matches && n.matches('button')) attachTerminalContext(n);
        else {
          try { n.querySelectorAll && n.querySelectorAll('button') && n.querySelectorAll('button').forEach(attachTerminalContext); } catch (e) {}
        }
      }
    }
  });
  mo.observe(observerTarget, { childList: true, subtree: true });
} catch (e) {
  console.error('failed to attach terminal context handlers', e);
}