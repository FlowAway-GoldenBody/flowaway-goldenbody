"use strict";
window.terminal = function (path, posX = 50, posY = 50) {
  try {
    const appId = "Terminal";
    if (posX == 50 && posY == 50) {
      const pos = window.protectedGlobals.getNextWindowXY();
      posX = pos.x;
      posY = pos.y;
    }

    const instance = window.protectedGlobals.apptools.api.createAppInstance({ appId, posX: posX, posY: posY });
    window.protectedGlobals.apptools.api.trackInstance(instance, appId);
    const root = instance.rootElement;
    root.style.background = "#0b0b0b";
    root.style.color = "#e6e6e6";
    root.style.fontFamily = "ui-monospace, SFMono-Regular, Menlo, Monaco, monospace";
    root.style.display = "flex";
    root.style.flexDirection = "column";

    const container = document.createElement("div");
    container.style.display = "flex";
    container.style.flexDirection = "column";
    container.style.height = "100%";
    container.style.boxSizing = "border-box";

    const output = document.createElement("div");
    output.style.flex = "1";
    output.style.overflow = "auto";
    output.style.whiteSpace = "pre-wrap";
    output.style.padding = "10px";
    output.style.background = "#0b0b0b";
    output.style.color = "#e6e6e6";

    const inputRow = document.createElement("div");
    inputRow.style.display = "flex";
    inputRow.style.gap = "8px";
    inputRow.style.padding = "8px";
    inputRow.style.borderTop = "1px solid #222";

    const prompt = document.createElement("div");
    prompt.textContent = "$";
    prompt.style.color = "#8b8b8b";
    prompt.style.paddingTop = "6px";

    // Use a contenteditable div so there is no visible input box — looks more like a real terminal
    const input = document.createElement("div");
    input.contentEditable = true;
    input.setAttribute('role', 'textbox');
    input.spellcheck = false;
    input.style.flex = "1";
    input.style.minWidth = "20px";
    input.style.background = "transparent";
    input.style.color = "#e6e6e6";
    input.style.border = "none";
    input.style.padding = "6px 8px";
    input.style.outline = "none";
    input.style.whiteSpace = "pre";
    input.style.caretColor = "#e6e6e6";

    inputRow.appendChild(prompt);
    inputRow.appendChild(input);
    container.appendChild(output);
    // Put inputRow inside the output area so the prompt sits on the last output line
    output.appendChild(inputRow);
    root.appendChild(container);

    // per-instance state (do not use globals)
    let terminalBusy = false;
    let terminalWorker = null;
    let terminalWorkerGracefulKill = false;
    let terminalWorkerKillTimer = null;
    let awaitingPasswordPrompt = null;
    // current working directory for this terminal instance
    let cwd = '/';

    function getTrackedWorkerPid(worker) {
      try {
        const runtime = window.protectedGlobals && window.protectedGlobals.__processRuntime;
        const bindings = runtime && runtime.workerProcessBindings ? runtime.workerProcessBindings : {};
        const keys = Object.keys(bindings);
        for (const key of keys) {
          const binding = bindings[key];
          if (binding && binding.instance === worker && binding.pid !== undefined && binding.pid !== null) {
            return Number(binding.pid);
          }
        }
      } catch (e) {}
      return Number(worker && worker.__terminalWorkerPid ? worker.__terminalWorkerPid : NaN) || null;
    }

    function finalizeTerminalWorker(worker, reason) {
      if (!worker) return;
      if (worker.__terminalFinalized) return;
      worker.__terminalFinalized = true;
      const pid = getTrackedWorkerPid(worker);
      if (pid && window.protectedGlobals && typeof window.protectedGlobals.killProcess === 'function') {
        try {
          window.protectedGlobals.killProcess(pid, reason || 'terminal-worker-exit');
        } catch (e) {}
      }
      if (terminalWorker === worker) {
        terminalBusy = false;
        terminalWorker = null;
        terminalWorkerGracefulKill = false;
        if (terminalWorkerKillTimer) {
          clearTimeout(terminalWorkerKillTimer);
          terminalWorkerKillTimer = null;
        }
      }
    }

    function bindTerminalWorkerLifecycle(worker, label) {
      if (!worker || worker.__terminalLifecycleBound) return worker;
      const trackedReason = (reason) => {
        try {
          if (terminalWorker === worker && reason === 'done') {
            printLine('Worker finished');
          }
          finalizeTerminalWorker(worker, reason || 'worker-exit');
        } catch (e) {}
      };

      worker.__terminalLifecycleBound = true;
      worker.__terminalWorkerLabel = label || 'worker';

      const rawMessageListener = function (event) {
        const data = event && event.data;
        if (!data || typeof data !== 'object') return;
        if (data.type === 'done' || data.type === 'exit') {
          trackedReason('done');
        }
      };
      const rawErrorListener = function () {
        trackedReason('error');
      };

      try {
        worker.addEventListener('message', rawMessageListener);
      } catch (e) {}
      try {
        worker.addEventListener('error', rawErrorListener);
      } catch (e) {}

      const nativeTerminate = typeof worker.terminate === 'function' ? worker.terminate.bind(worker) : null;
      if (nativeTerminate) {
        worker.terminate = function () {
          const result = nativeTerminate.apply(this, arguments);
          trackedReason('terminate');
          return result;
        };
      }

      const nativeClose = typeof worker.close === 'function' ? worker.close.bind(worker) : null;
      if (nativeClose) {
        worker.close = function () {
          const result = nativeClose.apply(this, arguments);
          trackedReason('close');
          return result;
        };
      }

      return worker;
    }

    function killActiveProcess({ graceful = false } = {}) {
      if (!terminalWorker) {
        terminalBusy = false;
        terminalWorkerGracefulKill = false;
        if (terminalWorkerKillTimer) {
          clearTimeout(terminalWorkerKillTimer);
          terminalWorkerKillTimer = null;
        }
        return;
      }
      const shouldGraceful = Boolean(graceful && terminalWorkerGracefulKill);
      if (shouldGraceful) {
        printLine('Graceful kill requested...');
        if (terminalWorkerKillTimer) clearTimeout(terminalWorkerKillTimer);
        terminalWorker.postMessage({ type: 'onkill', graceMs: 3000 });
        terminalWorkerKillTimer = setTimeout(() => {
          try {
            if (terminalWorker && typeof terminalWorker.terminate === 'function') terminalWorker.terminate();
          } catch (e) {}
          finalizeTerminalWorker(terminalWorker, 'graceful-timeout');
          printLine('Worker terminated');
        }, 3000);
        return;
      }
      if (terminalWorkerKillTimer) {
        clearTimeout(terminalWorkerKillTimer);
        terminalWorkerKillTimer = null;
      }
      try {
        if (terminalWorker && typeof terminalWorker.terminate === 'function') terminalWorker.terminate();
      } catch (e) {}
      finalizeTerminalWorker(terminalWorker, 'manual-terminate');
      printLine('Worker terminated');
    }

    function printLine(text, klass) {
      const line = document.createElement("div");
      line.textContent = text;
      if (klass) line.className = klass;
      // Insert before the inputRow so the input remains the last element
      if (output.contains(inputRow)) {
        output.insertBefore(line, inputRow);
      } else {
        output.appendChild(line);
      }
      output.scrollTop = output.scrollHeight;
    }

    function printError(err) {
      printLine(String(err), "err");
    }

    function listActiveThreadRows() {
      const snapshot = (window.protectedGlobals && typeof window.protectedGlobals.getTaskManagerSnapshot === 'function')
        ? window.protectedGlobals.getTaskManagerSnapshot()
        : null;
      const rows = snapshot && Array.isArray(snapshot.flat) ? snapshot.flat : [];
      return rows.filter((row) => row && row.pid !== null && row.pid !== undefined && row.pid !== '' && String(row.status || '').toLowerCase() !== 'terminated');
    }

    function killThreadByPid(targetPid) {
      if (!targetPid && targetPid !== 0) return false;
      const pid = Number(targetPid);
      if (!Number.isFinite(pid)) return false;
      if (window.protectedGlobals && typeof window.protectedGlobals.killProcess === 'function') {
        return !!window.protectedGlobals.killProcess(pid, 'terminal-thread-kill');
      }
      return false;
    }

    async function runPermissionUpdate(pathValue, permArg, passwordValue) {
      if (passwordValue === null || String(passwordValue).trim() === '') {
        printError('Password required to change permissions.');
        return;
      }
      const normalizedPerm = String(permArg || '').toLowerCase();
      const read = normalizedPerm.includes('r');
      const write = normalizedPerm.includes('w');
      const targetPath = resolveTerminalPath(pathValue, cwd);
      try {
        const res = await window.protectedGlobals.zmcdpost({
          password: String(passwordValue),
          updatePathPermission: { path: targetPath, perm: { read, write } }
        });
        if (res && res.success) printLine('Permission updated');
        else printError(res && res.error ? String(res.error) : 'Failed to update permission');
      } catch (e) { printError(e.message || String(e)); }
    }

    function parseQuotedPath(cmdline) {
      if (!cmdline || !String(cmdline).trim()) return null;
      const tokens = tokenize(String(cmdline));
      if (tokens.length < 2) return null;
      return tokens[1];
    }

    function tokenize(cmdline) {
      // shell-like tokenizer: splits on spaces except inside quote pairs, and supports
      // escaped quotes as part of the argument value.
      const res = [];
      let cur = "";
      let quoteChar = null;
      let esc = false;
      for (let i = 0; i < cmdline.length; i++) {
        const ch = cmdline[i];
        if (esc) {
          cur += ch;
          esc = false;
          continue;
        }
        if (ch === "\\") {
          esc = true;
          continue;
        }
        if ((ch === '"' || ch === "'") && quoteChar !== ch) {
          if (!quoteChar) {
            quoteChar = ch;
            continue;
          }
        }
        if ((ch === '"' || ch === "'") && quoteChar === ch) {
          quoteChar = null;
          continue;
        }
        if (!quoteChar && /\s/.test(ch)) {
          if (cur !== "") {
            res.push(cur);
            cur = "";
          }
          continue;
        }
        cur += ch;
      }
      if (cur !== "") res.push(cur);
      return res;
    }

    function parseJsonOrKvArgs(rawArgs) {
      const items = Array.isArray(rawArgs) ? rawArgs : (rawArgs === undefined || rawArgs === null ? [] : [rawArgs]);
      if (items.length === 0) return {};

      const out = {};
      const assign = (key, value) => {
        if (!key || typeof key !== 'string') return;
        out[key] = value;
      };

      const maybeParseSingle = (text) => {
        if (!text || typeof text !== 'string') return null;
        const trimmed = text.trim();
        if (!trimmed) return null;
        try {
          const parsed = JSON.parse(trimmed);
          if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) return parsed;
        } catch (e) {}

        const compact = trimmed.replace(/^\[|\]$/g, '').replace(/^\{|\}$/g, '').trim();
        if (compact && /["'].*["']\s*:\s*["'].*["']/.test(compact)) {
          const pairs = {};
          const re = /["']([^"']+)["']\s*:\s*(["'])(.*?)\2|["']([^"']+)["']\s*:\s*([^,\]}]+)/g;
          let m;
          while ((m = re.exec(compact)) !== null) {
            const key = m[1] || m[4];
            const value = m[3] ?? m[5];
            if (key) pairs[key] = String(value).trim();
          }
          if (Object.keys(pairs).length) return pairs;
        }
        return null;
      };

      for (const item of items) {
        if (item === undefined || item === null) continue;
        const text = String(item).trim();
        if (!text) continue;

        const parsed = maybeParseSingle(text);
        if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
          Object.assign(out, parsed);
          continue;
        }

        // Allow a single literal like ["key":"value"] or {'key':'value'} to normalize into an object.
        const raw = text.replace(/^\[|\]$/g, '').replace(/^\{|\}$/g, '').trim();
        if (raw && /['"].+['"]\s*:\s*.+/.test(raw)) {
          const re = /(?:['"]([^'"]+)['"]|([^\s:=,]+))\s*:\s*(?:['"]([^'"]*)['"]|([^,\]}]+))/g;
          let m;
          while ((m = re.exec(raw)) !== null) {
            const key = (m[1] || m[2] || '').trim();
            const value = (m[3] || m[4] || '').trim();
            if (key) assign(key, value);
          }
          continue;
        }

        const eq = text.indexOf('=');
        if (eq > 0) {
          assign(text.slice(0, eq), text.slice(eq + 1));
          continue;
        }

        const colon = text.indexOf(':');
        if (colon > 0 && !text.startsWith('/') && !text.includes(' ')) {
          assign(text.slice(0, colon), text.slice(colon + 1));
        }
      }
      return out;
    }

    // worker-related helpers
    function normalizeCloudPath(pathValue) {
      if (pathValue === undefined || pathValue === null) return '/';
      const value = String(pathValue).replace(/\\/g, '/').trim();
      if (!value) return '/';
      const parts = [];
      for (const part of value.split('/')) {
        if (!part || part === '.') continue;
        if (part === '..') {
          if (parts.length) parts.pop();
          continue;
        }
        parts.push(part);
      }
      return '/' + parts.join('/');
    }

    function normalizeVfsPath(path) {
      if (!path && path !== "") return "";
      return normalizeCloudPath(path);
    }

    function resolveTerminalPath(pathValue, baseDir = cwd) {
      const raw = (pathValue === undefined || pathValue === null) ? '' : String(pathValue).trim();
      if (!raw) return normalizeCloudPath(String(baseDir || '/'));
      const base = normalizeCloudPath(String(baseDir || '/'));
      const candidate = raw.startsWith('/') ? raw : (base === '/' ? '/' + raw : base + '/' + raw);
      return normalizeCloudPath(candidate);
    }

    function toDisplayPath(absPath, baseDir = cwd) {
      const abs = normalizeCloudPath(absPath);
      const base = normalizeCloudPath(String(baseDir || '/'));
      if (abs === base) return '.';
      if (abs.startsWith(base + '/')) return abs.slice(base.length + 1) || '.';
      return abs;
    }

    function getAppRootFromPath(pathValue) {
      const raw = typeof pathValue === 'string' ? pathValue.trim() : '';
      if (!raw || raw === '/' || raw === '.') return '/';
      const normalized = normalizeCloudPath(raw);
      const looksLikeFile = /\/[^/]+\.[^/]+$/i.test(normalized);
      if (looksLikeFile) {
        const parent = normalized.replace(/\/[^/]+$/, '') || '/';
        return parent === '' ? '/' : parent;
      }
      return normalized;
    }

    function isUserProfilePath(pathValue) {
      const normalized = normalizeCloudPath(pathValue);
      return normalized === '/systemfiles/userprofile' || normalized.startsWith('/systemfiles/userprofile/');
    }

    function canAccessWorkerPath(target, appRoot) {
      const normalizedTarget = normalizeCloudPath(target);
      if (isUserProfilePath(normalizedTarget)) return false;

      const appsRoot = '/systemfiles/runtime/apps';
      if (normalizedTarget === appsRoot || normalizedTarget.startsWith(appsRoot + '/')) {
        if (!appRoot || String(appRoot).trim() === '' || String(appRoot).trim() === '/') return false;
        const root = getAppRootFromPath(appRoot);
        return normalizedTarget === root || normalizedTarget.startsWith(root + '/');
      }

      return true;
    }

    function isPathUnderRoot(path, root) {
      if (typeof path !== 'string' || typeof root !== 'string') return false;
      const npath = normalizeVfsPath(path);
      const nroot = normalizeVfsPath(root);
      if (!nroot) return true;
      return npath === nroot || npath.startsWith(nroot + '/');
    }

    function resolveWorkerPath(p, appRoot) {
      if (!appRoot || String(appRoot).trim() === '' || String(appRoot).trim() === '/') {
        if (p === undefined || p === null || p === '') return '/';
        const s = String(p);
        return normalizeVfsPath(s.startsWith('/') ? s : '/' + s);
      }
      const base = getAppRootFromPath(appRoot);
      if (p === undefined || p === null || p === '') return normalizeVfsPath(base === '/' ? '/' : base);
      const s = String(p);
      if (s === '/') return '/';
      if (s.startsWith('/')) return normalizeVfsPath(s);
      return normalizeVfsPath(base + '/' + s);
    }

    async function spawnWorkerFromScript(scriptText, appRoot, initialArgs) {
      if (!scriptText) throw new Error('No script');
      // Build worker bootstrap that provides a simple `api` proxy to the app
      const bootstrap = `
        let _reqId = 0;
        const _pending = new Map();
        function nextId(){ return String(++_reqId); }
        self._startArgs = [];
        self._appScope = '';
        // convenience alias for worker scripts
        self.args = self._startArgs;
        const _nativeClose = (typeof self.close === 'function') ? self.close.bind(self) : null;
        function log(msg){ postMessage({type:'log', msg: String(msg)}); }
        function exit(code){ postMessage({type:'done', code: code || 0}); if(_nativeClose) _nativeClose(); }
        // override close inside worker so calls to self.close() notify the main thread first
        try { if (_nativeClose) { self.close = function(){ postMessage({type:'done'}); _nativeClose(); }; } } catch(e) {}
        self.api = {
          readFile: (path, opts) => { const id = nextId(); postMessage({type:'api', id, op:'readFile', path, opts}); return new Promise((res, rej)=>_pending.set(id,{res,rej})); },
          writeFile: (path, content, opts) => { const id = nextId(); postMessage({type:'api', id, op:'writeFile', path, content, opts}); return new Promise((res, rej)=>_pending.set(id,{res,rej})); },
          readFolder: (path, opts)=>{ const id = nextId(); postMessage({type:'api', id, op:'readFolder', path, opts}); return new Promise((res, rej)=>_pending.set(id,{res,rej})); },
          fileExists: (path)=>{ const id = nextId(); postMessage({type:'api', id, op:'fileExists', path}); return new Promise((res, rej)=>_pending.set(id,{res,rej})); },
          folderExists: (path)=>{ const id = nextId(); postMessage({type:'api', id, op:'folderExists', path}); return new Promise((res, rej)=>_pending.set(id,{res,rej})); },
          deleteFile: (path)=>{ const id = nextId(); postMessage({type:'api', id, op:'deleteFile', path}); return new Promise((res, rej)=>_pending.set(id,{res,rej})); },
          deleteFolder: (path)=>{ const id = nextId(); postMessage({type:'api', id, op:'deleteFolder', path}); return new Promise((res, rej)=>_pending.set(id,{res,rej})); },
          writeFolder: (path)=>{ const id = nextId(); postMessage({type:'api', id, op:'writeFolder', path}); return new Promise((res, rej)=>_pending.set(id,{res,rej})); },
          renameFile: (path, newName)=>{ const id = nextId(); postMessage({type:'api', id, op:'renameFile', path, newName}); return new Promise((res, rej)=>_pending.set(id,{res,rej})); },
          renameFolder: (path, newName)=>{ const id = nextId(); postMessage({type:'api', id, op:'renameFolder', path, newName}); return new Promise((res, rej)=>_pending.set(id,{res,rej})); },
          pasteFile: (destination, clipboardItems, opts)=>{ const id = nextId(); postMessage({type:'api', id, op:'pasteFile', path: destination, clipboardItems, opts}); return new Promise((res, rej)=>_pending.set(id,{res,rej})); },
          pasteFolder: (destination, clipboardItems, opts)=>{ const id = nextId(); postMessage({type:'api', id, op:'pasteFolder', path: destination, clipboardItems, opts}); return new Promise((res, rej)=>_pending.set(id,{res,rej})); },
          writeline: (msg)=>{ postMessage({type:'log', msg: String(msg)}); return Promise.resolve(true); },
          getStartArgs: ()=>{ return self._startArgs || {}; },
        };
        self.addEventListener('message', (ev)=>{
          const d = ev.data;
          if (!d) return;
          if (d.type === 'start') {
            self._startArgs = d.args || {};
            self.args = self._startArgs;
            self._appScope = d.appScope || '';
            return;
          }
          if (d.type === 'onkill') {
            const graceMs = Number(d.graceMs) || 3000;
            if (typeof self.onkill === 'function') {
              try {
                self.onkill({ type: 'onkill', graceMs });
              } catch (err) {
                postMessage({type:'log', msg: 'onkill callback failed: ' + String(err)});
                postMessage({type:'done'});
                if (_nativeClose) _nativeClose();
              }
              return;
            }
            postMessage({type:'log', msg: 'No onkill handler; terminating immediately'});
            postMessage({type:'done'});
            if (_nativeClose) _nativeClose();
            return;
          }
          if (d.type === 'apiResult') {
            const p = _pending.get(d.id);
            if (!p) return;
            const result = d.result;
            if (result && typeof result === 'object' && Object.prototype.hasOwnProperty.call(result, 'error')) {
              p.rej(new Error(String(result.error)));
            } else {
              p.res(result);
            }
            _pending.delete(d.id);
          }
        });
      `;

      const full = bootstrap + '\n' + scriptText;
      const blob = new Blob([full], { type: 'application/javascript' });
      const url = URL.createObjectURL(blob);
      const worker = new Worker(url);

      const startArgs = (initialArgs && typeof initialArgs === 'object' && !Array.isArray(initialArgs)) ? initialArgs : (Array.isArray(initialArgs) ? initialArgs : []);
      worker.postMessage({ type: 'start', args: startArgs, appScope: appRoot || '', content: (Array.isArray(startArgs) && startArgs.length>0) ? startArgs[0] : undefined });

      // main-thread proxy for worker API
      worker.onmessage = async (ev) => {
        const d = ev.data;
        if (!d || typeof d !== 'object') return;
        if (d.type === 'log') {
          printLine(String(d.msg || ''));
          return;
        }
        if (d.type === 'done') {
          printLine('Worker finished');
          try { worker.terminate(); } catch (e) {}
          if (terminalWorkerKillTimer) {
            clearTimeout(terminalWorkerKillTimer);
            terminalWorkerKillTimer = null;
          }
          terminalBusy = false;
          terminalWorker = null;
          terminalWorkerGracefulKill = false;
          return;
        }
        if (d.type === 'api') {
          const id = d.id;
          const op = d.op;
          try {
            let result;
            // enforce app-scoped access for app workers; user-created workers remain unrestricted.
            const target = d.path || (d.payload && d.payload.path) || '';
            const resolved = resolveWorkerPath(target, appRoot);
            if (['readFile','writeFile','readFolder','fileExists','folderExists','deleteFile','deleteFolder','writeFolder','renameFile','renameFolder','pasteFile','pasteFolder'].includes(op)) {
              if (!canAccessWorkerPath(target, appRoot)) {
                throw new Error('Path not allowed: ' + String(target));
              }
            }
            switch (op) {
              case 'readFile': result = await window.protectedGlobals.ReadFile(resolved, d.opts || { text: true, direct: true }); break;
              case 'writeFile': result = await window.protectedGlobals.WriteFile(resolved, d.content, { replace: true }); break;
              case 'readFolder': result = await window.protectedGlobals.ReadFolder(resolved, d.opts || {}); break;
              case 'fileExists': result = await window.protectedGlobals.FileExists(resolved); break;
              case 'folderExists': result = await window.protectedGlobals.FolderExists(resolved); break;
              case 'deleteFile': result = await window.protectedGlobals.DeleteFile(resolved); break;
              case 'deleteFolder': result = await window.protectedGlobals.DeleteFolder(resolved); break;
              case 'writeFolder': result = await window.protectedGlobals.WriteFolder(resolved); break;
              case 'renameFile': result = await window.protectedGlobals.RenameFile(resolved, d.newName); break;
              case 'renameFolder': result = await window.protectedGlobals.RenameFolder(resolved, d.newName); break;
              case 'pasteFile': result = await window.protectedGlobals.PasteFile(resolved, Array.isArray(d.clipboardItems) ? d.clipboardItems : []); break;
              case 'pasteFolder': result = await window.protectedGlobals.PasteFolder(resolved, Array.isArray(d.clipboardItems) ? d.clipboardItems : []); break;
              default: throw new Error('Unknown op ' + op);
            }
            worker.postMessage({ type: 'apiResult', id, result });
          } catch (e) {
            worker.postMessage({ type: 'apiResult', id, result: { error: String(e && e.message ? e.message : e) } });
          }
        }
      };

      return worker;
    }

    async function handleCommand(cmdline) {
      if (!cmdline || !cmdline.trim()) return;
      printLine(`$ ${cmdline}`);
      const parts = tokenize(cmdline);
      if (parts.length === 0) return;
      const cmd = parts[0].toLowerCase();

      // If a worker is active, only allow control commands
      if (terminalBusy) {
        if (cmd === 'kill' || cmd === 'stop') {
          killActiveProcess({ graceful: terminalWorkerGracefulKill });
          return;
        }
        printError('A process is alive rn, plz wait or kill it.');
        return;
      }

      // builtins
      if (cmd === "help") {
        printLine("Built-in commands: help, echo, clear, cat, ls, read, write, rm, rmdir, mkdir, mv, perm, apps, worker, threads, killthread, killallthreads, kill");
        // list custom app commands
        const appCmds = [];
        (window.protectedGlobals.apps || []).forEach(a => {
          (a.commands || []).forEach(c => appCmds.push({ app: a.label || a.id, name: c.name }));
        });
        if (appCmds.length) {
          printLine("\nApp commands:");
          appCmds.forEach(ac => printLine(` - ${ac.name} (from ${ac.app})`));
        }
        return;
      }

      if (cmd === 'kill' || cmd === 'stop') {
        const targetArg = parts[1];
        if (targetArg && Number.isFinite(Number(targetArg))) {
          const ok = killThreadByPid(Number(targetArg));
          printLine(ok ? `Thread ${targetArg} terminated` : `No active thread with id ${targetArg}`);
          return;
        }
        if (terminalWorker) {
          killActiveProcess({ graceful: terminalWorkerGracefulKill });
          return;
        }
        printError('Usage: kill <pid> or kill while a worker is active');
        return;
      }

      if (cmd === "clear") {
        // Remove all printed lines but preserve the inputRow
        const savedInput = inputRow;
        output.innerHTML = "";
        output.appendChild(savedInput);
        return;
      }

      if (cmd === "echo") {
        printLine(parts.slice(1).join(" "));
        return;
      }

      if (cmd === "apps") {
        (window.protectedGlobals.apps || []).forEach(a => printLine(`${a.id} - ${a.label}`));
        return;
      }

      if (cmd === 'threads' || cmd === 'thread' || cmd === 'ps') {
        const rows = listActiveThreadRows();
        if (!rows.length) {
          printLine('No active threads');
          return;
        }
        rows.forEach((row) => {
          const pid = row.pid ?? row.processId ?? row.id ?? 'unknown';
          const title = row.title || row.label || row.name || row.type || 'process';
          const status = row.status || 'running';
          const type = row.type || row.processKind || row.sourceType || 'process';
          printLine(`${pid} | ${type} | ${status} | ${title}`);
        });
        return;
      }

      if (cmd === 'killthread' || cmd === 'kill-thread') {
        const targetPid = Number(parts[1]);
        if (!Number.isFinite(targetPid)) {
          printError('Usage: killthread <pid>');
          return;
        }
        const ok = killThreadByPid(targetPid);
        printLine(ok ? `Thread ${targetPid} terminated` : `No active thread with id ${targetPid}`);
        return;
      }

      if (cmd === 'killallthreads' || cmd === 'kill-all-threads') {
        const rows = listActiveThreadRows();
        if (!rows.length) {
          printLine('No active threads to kill');
          return;
        }
        let count = 0;
        rows.forEach((row) => {
          const pid = Number(row.pid ?? row.processId ?? row.id);
          if (!Number.isFinite(pid)) return;
          const killed = killThreadByPid(pid);
          if (killed) count += 1;
        });
        printLine(`Terminated ${count} active thread${count === 1 ? '' : 's'}`);
        return;
      }

      if (cmd === 'pwd') {
        printLine(String(cwd || '/'));
        return;
      }

      if (cmd === 'cd') {
        const pathArg = parseQuotedPath(cmdline) || parts[1] || '';
        if (!pathArg) { cwd = '/'; printLine(cwd); return; }
        try {
          const target = resolveTerminalPath(pathArg, cwd);
          const exists = await window.protectedGlobals.FolderExists ? await window.protectedGlobals.FolderExists(target) : true;
          if (!exists) { printError('No such directory: ' + target); return; }
          cwd = target;
          printLine(cwd);
        } catch (e) { printError(e.message || String(e)); }
        return;
      }

      if (cmd === "cat") {
        // require path in quotes
        const path = parseQuotedPath(cmdline) || parts[1];
        if (!path) {
          printError('Usage: cat "<path>"  (path must be in double quotes)');
          return;
        }
        try {
          const targetPath = resolveTerminalPath(path, cwd);
          const txt = await window.protectedGlobals.ReadFile(targetPath, { text: true, direct: true });
          printLine(String(txt || ""));
        } catch (e) {
          printError(e.message || String(e));
        }
        return;
      }

      if (cmd === "ls") {
        const path = parseQuotedPath(cmdline) || parts[1] || cwd || "/";
        try {
          const targetPath = resolveTerminalPath(path, cwd);
          const listing = await window.protectedGlobals.ReadFolder ? await window.protectedGlobals.ReadFolder(targetPath) : null;
          if (Array.isArray(listing)) {
            listing.forEach(i => printLine(String(i)));
          } else {
            // fallback: use findNodeByPath
            const node = window.protectedGlobals.findNodeByPath(path);
            if (node && Array.isArray(node[1])) {
              const children = node[1].map(c => c[0]);
              children.forEach(c => printLine(c));
            } else {
              printError('Not a directory or unable to list: ' + path);
            }
          }
        } catch (e) {
          printError(e.message || String(e));
        }
        return;
      }
      
      if (cmd === 'read') {
        const pathArg = parseQuotedPath(cmdline) || parts[1];
        if (!pathArg) { printError('Usage: read "<path>"'); return; }
        try {
          const targetPath = resolveTerminalPath(pathArg, cwd);
          const txt = await window.protectedGlobals.ReadFile(targetPath, { text: true, direct: true });
          printLine(String(txt || ''));
        } catch (e) { printError(e.message || String(e)); }
        return;
      }

      if (cmd === 'write') {
        // write "<path>" "content"
        const tokens = tokenize(cmdline);
        if (tokens.length < 3) { printError('Usage: write "<path>" "content"'); return; }
        const pathArg = tokens[1];
        const content = tokens.slice(2).join(' ');
        try {
          const targetPath = resolveTerminalPath(pathArg, cwd);
          await window.protectedGlobals.WriteFile(targetPath, content, { replace: true });
          printLine('Wrote ' + targetPath);
        } catch (e) { printError(e.message || String(e)); }
        return;
      }

      if (cmd === 'rm') {
        const pathArg = parseQuotedPath(cmdline) || parts[1];
        if (!pathArg) { printError('Usage: rm "<path>"'); return; }
        try {
          const targetPath = resolveTerminalPath(pathArg, cwd);
          await window.protectedGlobals.DeleteFile(targetPath);
          printLine('Deleted ' + targetPath);
        } catch (e) { printError(e.message || String(e)); }
        return;
      }

      if (cmd === 'rmdir') {
        const pathArg = parseQuotedPath(cmdline) || parts[1];
        if (!pathArg) { printError('Usage: rmdir "<path>"'); return; }
        try {
          const targetPath = resolveTerminalPath(pathArg, cwd);
          await window.protectedGlobals.DeleteFolder(targetPath);
          printLine('Deleted folder ' + targetPath);
        } catch (e) { printError(e.message || String(e)); }
        return;
      }

      if (cmd === 'mkdir') {
        const pathArg = parseQuotedPath(cmdline) || parts[1];
        if (!pathArg) { printError('Usage: mkdir "<path>"'); return; }
        try {
          const targetPath = resolveTerminalPath(pathArg, cwd);
          await window.protectedGlobals.WriteFolder(targetPath);
          printLine('Created folder ' + targetPath);
        } catch (e) { printError(e.message || String(e)); }
        return;
      }

      if (cmd === 'mv' || cmd === 'rename') {
        // mv "<path>" "newname"
        const tokens = tokenize(cmdline);
        if (tokens.length < 3) { printError('Usage: mv "<path>" "newname"'); return; }
        const pathArg = tokens[1];
        const newName = tokens.slice(2).join(' ');
        try {
          const targetPath = resolveTerminalPath(pathArg, cwd);
          await window.protectedGlobals.RenameFile(targetPath, newName);
          printLine('Renamed ' + targetPath + ' -> ' + newName);
        } catch (e) { printError(e.message || String(e)); }
        return;
      }

      if (cmd === 'perm' || cmd === 'chmod') {
        // perm "<path>" rw|r|w|
        const path = parseQuotedPath(cmdline) || parts[1];
        if (!path) { printError('Usage: perm "<path>" <r|w|rw|none>'); return; }
        const m = cmdline.match(/\s(\w+)\s*$/);
        const permArg = m ? m[1] : '';
        awaitingPasswordPrompt = { path, permArg };
        printLine('Password:');
        return;
      }
      if (cmd === 'worker') {
        // worker "<scriptPath>"
        // Built-in terminal workers are intentionally unrestricted so they can act as a
        // full cloud-drive helper; app-command workers remain scoped to their app folder.
        const workerArgs = tokenize(cmdline).slice(1).filter(v => v !== undefined && v !== null && String(v).trim() !== '');
        const workerPath = workerArgs[0] ? String(workerArgs[0]).trim() : '';
        const scriptPath = workerPath || null;
        if (!workerPath) { printError('Usage: worker "<scriptPath>"'); return; }
        try {
          terminalBusy = true;
          let worker;
          const resolvedScriptPath = scriptPath ? resolveTerminalPath(scriptPath, cwd) : null;
          if (resolvedScriptPath) {
            const txt = await window.protectedGlobals.ReadFile(resolvedScriptPath, { text: true, direct: true });
            worker = await spawnWorkerFromScript(String(txt || ''), null, []);
          } else {
            const wrapper = `self.addEventListener('message',(e)=>{ if (e.data && e.data.type==='start') { (async ()=>{ try{ const listing = await api.readFolder('/'); postMessage({type:'log', msg: JSON.stringify(listing)}); postMessage({type:'done'}); }catch(err){ postMessage({type:'log', msg: 'Worker error: '+String(err)}); postMessage({type:'done'}); } })(); } });`;
            worker = await spawnWorkerFromScript(wrapper, null, []);
          }
          bindTerminalWorkerLifecycle(worker, scriptPath);
          const trackedPid = getTrackedWorkerPid(worker);
          if (trackedPid) worker.__terminalWorkerPid = trackedPid;
          terminalWorker = worker;
          printLine(`Worker started for ${workerPath}${trackedPid ? ` (pid ${trackedPid})` : ''}`);
          return;
        } catch (e) { printError(e.message || String(e)); terminalBusy = false; terminalWorker = null; }
      }
      // try to match an app-provided command (case-insensitive)
      const apps = window.protectedGlobals.apps || [];
      // Support invoking as: <appId> <cmd> [args...]
      if (parts.length >= 2) {
        const appIdCandidate = parts[0];
        const appMatch = apps.find(a => (a.id || '').toLowerCase() === String(appIdCandidate || '').toLowerCase());
        if (appMatch) {
          // if app has no commands, inform the user
          if (!appMatch.commands || !Array.isArray(appMatch.commands) || appMatch.commands.length === 0) {
            printError(`This app has no command available: ${appMatch.id}`);
            return;
          }
          const cmdCandidate = parts[1].toLowerCase();
          const cmdObj = (appMatch.commands || []).find(c => (c.name || '').toLowerCase() === cmdCandidate);
          if (!cmdObj) {
            // suggest closest command name
            const levenshtein = (a, b) => {
              const m = a.length, n = b.length;
              const dp = Array.from({length: m+1}, () => new Array(n+1).fill(0));
              for (let i=0;i<=m;i++) dp[i][0]=i;
              for (let j=0;j<=n;j++) dp[0][j]=j;
              for (let i=1;i<=m;i++) for (let j=1;j<=n;j++) {
                const cost = a[i-1]===b[j-1]?0:1;
                dp[i][j] = Math.min(dp[i-1][j]+1, dp[i][j-1]+1, dp[i-1][j-1]+cost);
              }
              return dp[m][n];
            };
            const names = (appMatch.commands||[]).map(c => (c.name||''));
            let best = {name: '', d: Infinity};
            for (const n of names) {
              const d = levenshtein(cmdCandidate, n.toLowerCase());
              if (d < best.d) best = { name: n, d };
            }
            if (best.d < Infinity) {
              printError(`Command ${parts[1]} doesn't exist for ${appMatch.id}; closest command is: ${best.name}`);
            } else {
              printError(`Command ${parts[1]} doesn't exist for ${appMatch.id}`);
            }
            return;
          }
          if (cmdObj) {
            // rebuild cmdline for command-specific args
            const cmdArgs = parts.slice(2);
            const kvArgs = parseJsonOrKvArgs(cmdArgs);
            // reuse existing handling by pretending the command was invoked alone with src
            try {
              if (cmdObj.src && String(cmdObj.src).startsWith('/')) {
                const content = await window.protectedGlobals.ReadFile(cmdObj.src, { text: true, direct: true });
                const isJs = String(cmdObj.src || '').toLowerCase().endsWith('.js') || String(content || '').trim().startsWith('(function') || String(content || '').includes('self.api') || String(content || '').includes('globalThis');
                terminalBusy = true;
                terminalWorkerGracefulKill = Boolean(cmdObj.receive_onkill_handler);
                let worker;
                const appRoot = appMatch.path || getAppRootFromPath(cmdObj.src);
                if (isJs) worker = await spawnWorkerFromScript(String(content || ''), appRoot, kvArgs);
                else worker = await spawnWorkerFromScript(`self.addEventListener('message',(e)=>{ if (e.data && e.data.type==='start') { postMessage({type:'log', msg: e.data.content || ''}); postMessage({type:'done'}); } });`, appRoot, [String(content || '')]);
                bindTerminalWorkerLifecycle(worker, `${appMatch.id}:${cmdObj.name}`);
                const trackedPid = getTrackedWorkerPid(worker);
                if (trackedPid) worker.__terminalWorkerPid = trackedPid;
                terminalWorker = worker;
                printLine(`Started worker for ${appMatch.id} ${cmdObj.name}${trackedPid ? ` (pid ${trackedPid})` : ''}`);
                return;
              }
            } catch (e) {
              printError(e.message || String(e));
              return;
            }
          }
        }
      }
      for (const a of apps) {
        if (!a.commands || !Array.isArray(a.commands)) continue;
        for (const c of a.commands) {
          if (!c || !c.name) continue;
          if (c.name.toLowerCase() === cmd) {
            // if command has a src that looks like an absolute path, print its contents
            try {
              if (c.src && String(c.src).startsWith('/')) {
                // For app-provided commands backed by a file path, spawn a worker
                // that runs the file (if JS) or receives the file content as initial data.
                try {
                  const content = await window.protectedGlobals.ReadFile(c.src, { text: true, direct: true });
                  const isJs = String(c.src || '').toLowerCase().endsWith('.js') || String(content || '').trim().startsWith('(function') || String(content || '').includes('self.api') || String(content || '').includes('globalThis');
                  let worker;
                  terminalBusy = true;
                  terminalWorkerGracefulKill = Boolean(c.receive_onkill_handler);
                  const kvArgs = parseJsonOrKvArgs(parts.slice(1));
                  const appRoot = a.path || getAppRootFromPath(c.src);
                  if (isJs) {
                    worker = await spawnWorkerFromScript(String(content || ''), appRoot, kvArgs);
                  } else {
                    // wrap content in a minimal script that exposes it to the worker
                    const wrapper = `self.addEventListener('message', (e)=>{ if (e.data && e.data.type==='start') { if (e.data.content) postMessage({type:'log', msg: e.data.content}); postMessage({type:'done'}); } });`;
                    const combined = wrapper;
                    worker = await spawnWorkerFromScript(combined, appRoot, [String(content || '')]);
                  }
                  bindTerminalWorkerLifecycle(worker, `${a.id}:${c.name}`);
                  const trackedPid = getTrackedWorkerPid(worker);
                  if (trackedPid) worker.__terminalWorkerPid = trackedPid;
                  terminalWorker = worker;
                  printLine(`Started worker for ${a.id} ${c.name}${trackedPid ? ` (pid ${trackedPid})` : ''}`);
                  return;
                } catch (e) {
                  printError(e.message || String(e));
                  return;
                }
              } else if (c.src) {
                // otherwise try launching the app with the src as argument
                try {
                  await window.protectedGlobals.launchApp(a.id, c.src);
                  printLine(`Launched ${a.id} ${c.src}`);
                } catch (launchErr) {
                  printError('Failed to launch app: ' + String(launchErr));
                }
                return;
              } else {
                // no src, just attempt to launch the app
                try {
                  await window.protectedGlobals.launchApp(a.id);
                  printLine(`Launched ${a.id}`);
                } catch (launchErr) {
                  printError('Failed to launch app: ' + String(launchErr));
                }
                return;
              }
            } catch (e) {
              printError(e.message || String(e));
              return;
            }
          }
        }
      }
      // If user typed an app id alone, try launching that app
      const appById = apps.find(a => (a.id || '').toLowerCase() === String(cmd || '').toLowerCase());
      if (appById) {
        try {
          await window.protectedGlobals.launchApp(appById.id);
          printLine(`Launched ${appById.id}`);
        } catch (launchErr) {
          printError('Failed to launch app: ' + String(launchErr));
        }
        return;
      }

      printError('Unknown command: ' + cmd + ' (type help)');
    }

      // keyboard handling: Enter runs command, Up/Down for history, Tab for path autocomplete
    const history = [];
    let historyIndex = 0;

    function setInputText(txt) {
      input.innerText = txt || '';
      // move caret to end
      try {
        const sel = window.getSelection();
        const range = document.createRange();
        range.selectNodeContents(input);
        range.collapse(false);
        sel.removeAllRanges();
        sel.addRange(range);
      } catch (e) {}
    }

    async function autocompletePath() {
      const full = String(input.textContent || "");
      const match = full.match(/"((?:\\.|[^"\\])*)"?$/) || full.match(/(\S+)$/);
      let token = '';
      let isQuoted = false;
      if (match) {
        if (full.includes('"')) {
          isQuoted = true;
          token = match[1] || '';
        } else {
          token = match[1] || match[0] || '';
        }
      }
      if (!token) return;

      const absoluteToken = resolveTerminalPath(token, cwd);
      const lastSlash = absoluteToken.lastIndexOf('/');
      const parent = lastSlash >= 0 ? absoluteToken.slice(0, lastSlash) || '/' : '/';
      const prefix = lastSlash >= 0 ? absoluteToken.slice(lastSlash + 1) : absoluteToken.replace(/^\//, '');

      try {
        const listing = await window.protectedGlobals.ReadFolder(parent);
        if (!Array.isArray(listing)) return;
        const matches = listing.filter(x => String(x).startsWith(prefix));
        if (matches.length === 1) {
          const completedAbs = (parent === '/' ? '/' : parent) + '/' + matches[0];
          const completed = token.startsWith('/') ? completedAbs : toDisplayPath(completedAbs, cwd);
          if (isQuoted) {
            const replaced = full.replace(/"((?:\\.|[^"\\])*)"?$/, '"' + completed + '"');
            setInputText(replaced);
          } else {
            const replaced = full.replace(/(\S+)$/, completed);
            setInputText(replaced);
          }
        } else if (matches.length > 1) {
          printLine('Suggestions: ' + matches.join(' '));
        }
      } catch (e) { /* ignore */ }
    }

    // Prevent default Enter behavior (inserting a newline) and run command instead
    input.addEventListener('keydown', async (ev) => {
      if ((ev.key === 'c' || ev.key === 'C') && (ev.ctrlKey) && terminalBusy) {
        ev.preventDefault();
        killActiveProcess({ graceful: terminalWorkerGracefulKill });
        return;
      }
      if (ev.key === 'Enter') {
        ev.preventDefault();
        const value = String(input.textContent || "").trim();
        if (awaitingPasswordPrompt) {
          const pending = awaitingPasswordPrompt;
          awaitingPasswordPrompt = null;
          input.innerText = '';
          await runPermissionUpdate(pending.path, pending.permArg, value);
          return;
        }
        if (value) {
          history.push(value);
          historyIndex = history.length;
        }
        input.innerText = '';
        await handleCommand(value);
      } else if (ev.key === 'Tab') {
        ev.preventDefault();
        await autocompletePath();
      } else if (ev.key === 'ArrowUp') {
        ev.preventDefault();
        if (history.length === 0) return;
        if (historyIndex > 0) historyIndex -= 1;
        setInputText(history[historyIndex] || '');
      } else if (ev.key === 'ArrowDown') {
        ev.preventDefault();
        if (history.length === 0) return;
        if (historyIndex < history.length - 1) historyIndex += 1;
        else { historyIndex = history.length; setInputText(''); return; }
        setInputText(history[historyIndex] || '');
      }
    });

    const cleanupInstance = () => {
      if (terminalWorker) {
        killActiveProcess({ graceful: terminalWorkerGracefulKill });
      }
    };

    const originalCloseWindow = typeof instance.closeWindow === 'function' ? instance.closeWindow.bind(instance) : null;
    instance.closeWindow = function () {
      cleanupInstance();
      if (originalCloseWindow) return originalCloseWindow();
      if (root && root.remove) root.remove();
      return true;
    };
    window.addEventListener('beforeunload', cleanupInstance, { once: true });

    // clicking anywhere in the output focuses the prompt
    output.addEventListener('click', () => {
      try { input.focus(); } catch (e) {}
    });

    // focus the prompt when instance is opened
    setTimeout(() => { try { input.focus(); } catch (e) {} }, 50);
    return instance;
  } catch (err) {
    console.error('terminal app failed to start', err);
    window.protectedGlobals.notification('Terminal failed to start: ' + String(err));
  }
};