window.data = data;
window.loaded = false;
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

// --- Global picker helpers ---
function base64ToArrayBuffer(base64) {
  const binaryString = atob(base64);
  const len = binaryString.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) bytes[i] = binaryString.charCodeAt(i);
  return bytes.buffer;
}

// UTF-8 safe base64 -> string helper. Use this for text files (JS, txt, svg, etc.)
function base64ToUtf8(b64) {
  try {
    const buf = base64ToArrayBuffer(b64);
    return new TextDecoder('utf-8').decode(buf);
  } catch (e) {
    // fallback to atob for environments without TextDecoder support
    try {
      return atob(b64);
    } catch (ee) { return ''; }
  }
}

async function fetchFileContentByPath(path) {
  if (!path) throw new Error('No path');
  const res = await filePost({ requestFile: true, requestFileName: path });
  if (res && res.filecontent) return res.filecontent;
  throw new Error('Could not fetch file: ' + path);
}
async function makeFlowawayFileHandle(name, path, filecontent = null) {
  await filePost({ saveSnapshot: true, directions: [{ edit: true, contents: filecontent, path, replace: true }, { end: true }] });
  return {
    kind: 'file',
    name,
    path,
    async getFile() {
      const b64 = await fetchFileContentByPath(path);
      const buf = base64ToArrayBuffer(b64);
      const type = (function (n) { const ext = n.split('.').pop().toLowerCase(); const m = { txt: 'text/plain', js: 'application/javascript', json: 'application/json', html: 'text/html' }; return m[ext] || 'application/octet-stream'; })(name);
      return new File([buf], name, { type });
    }
  };
}

function createPickerModal(tree, options = {}) {
  const { allowDirectory = false, multiple = false, save = false, suggestedName = '', filecontent = null } = options;
  const overlay = document.createElement('div');
  Object.assign(overlay.style, { position: 'fixed', inset: '0', background: 'rgba(0,0,0,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100000 });
  const box = document.createElement('div');
  Object.assign(box.style, { width: '700px', height: '500px', background: data.dark ? '#1e1e1e' : '#fff', borderRadius: '8px', display: 'flex', flexDirection: 'column', overflow: 'hidden' });
  overlay.appendChild(box);
  const breadcrumb = document.createElement('div'); breadcrumb.style.padding = '8px'; box.appendChild(breadcrumb);
  const fileArea = document.createElement('div'); Object.assign(fileArea.style, { flex: '1', overflow: 'auto', padding: '8px', borderTop: '1px solid #ddd' }); box.appendChild(fileArea);
  const saveContainer = document.createElement('div'); saveContainer.style.padding = '8px'; box.appendChild(saveContainer);
  const bar = document.createElement('div'); bar.style.padding = '8px'; bar.style.display = 'flex'; bar.style.justifyContent = 'flex-end'; box.appendChild(bar);
  const cancelBtn = document.createElement('button'); cancelBtn.textContent = 'Cancel'; bar.appendChild(cancelBtn);
  const okBtn = document.createElement('button'); okBtn.textContent = save ?'Save' : 'Open'; okBtn.style.marginLeft = '8px'; bar.appendChild(okBtn);

  let currentPath = ['root'];
  let selection = [];
  let filenameInput = null;

  function render() {
    breadcrumb.innerHTML = '';
    currentPath.forEach((p, i) => {
      const span = document.createElement('span'); span.textContent = i === 0 ? 'Home' : ' / ' + p; span.style.cursor = 'pointer'; span.onclick = () => { currentPath = currentPath.slice(0, i + 1); render(); }; breadcrumb.appendChild(span);
    });
    fileArea.innerHTML = '';
    let node = JSON.parse(JSON.stringify(tree));
    for (let i = 1; i < currentPath.length; i++) {
      node = (node[1] || []).find(c => c[0] === currentPath[i]);
      if (!node) return;
    }
    if (!node || !node[1]) return;
    node[1].forEach(item => {
      const isDir = Array.isArray(item[1]);
      const div = document.createElement('div'); div.style.padding = '6px'; div.style.cursor = 'pointer'; div.textContent = (isDir ? '📁 ' : '📄 ') + item[0];
      div.onclick = (e) => {
        const toggle = e.ctrlKey || e.metaKey;

        // If this is a directory and the picker does NOT allow directory selection,
        // don't treat single clicks as selecting the directory. Double-click will
        // still navigate into the directory (see ondblclick below).
        if (isDir && !allowDirectory) {
          // Optionally provide a light hover/preview effect but do not add to selection
          fileArea.querySelectorAll('div').forEach(d => d.style.background = '');
          div.style.background = '#f0f0f0';
          return;
        }

        if (!toggle || !multiple) {
          selection = [item];
          fileArea.querySelectorAll('div').forEach(d => d.style.background = '');
          div.style.background = '#d0e6ff';
        } else {
          const idx = selection.indexOf(item);
          if (idx >= 0) { selection.splice(idx, 1); div.style.background = ''; } else { selection.push(item); div.style.background = '#d0e6ff'; }
        }
      };
      if (isDir) div.ondblclick = () => { currentPath.push(item[0]); render(); };
      fileArea.appendChild(div);
    });
    // If this modal is a Save dialog, render filename input
    saveContainer.innerHTML = '';
    if (save) {
      const lbl = document.createElement('div'); lbl.textContent = 'Filename:'; lbl.style.marginBottom = '6px'; saveContainer.appendChild(lbl);
      filenameInput = document.createElement('input');
      filenameInput.style.width = '100%';
      filenameInput.placeholder = 'filename.txt';
      filenameInput.value = suggestedName || '';
      saveContainer.appendChild(filenameInput);
    }
  }

  render();

  document.body.appendChild(overlay);

  return new Promise((resolve) => {
    cancelBtn.onclick = () => { overlay.remove(); resolve(null); };
    okBtn.onclick = async () => {
      // Save flow: return a chosen full path string
      if (save) {
        // determine selected folder (prefer selected dir, otherwise currentPath)
        let folderPath = currentPath.slice(1).join('/');
        if (selection.length && Array.isArray(selection[0][1])) {
          const sel = selection[0];
          folderPath = (sel[2] && sel[2].path) ? sel[2].path : (currentPath.slice(1).join('/'));
        }
        const fname = (filenameInput && filenameInput.value || '').trim();
        if (!fname) { notification('Enter filename'); return; }
        overlay.remove();
        const chosen = folderPath ? ('/' + folderPath + '/' + fname) : fname;
        let returnValue = {path: chosen, name: fname, filecontent: filecontent};
        return resolve(returnValue);
      }

        overlay.remove();
        if (!selection.length) return resolve(null);
        // If directory-only requested, return selected folder node(s)
        if (allowDirectory) {
          const dirs = selection.filter(s => Array.isArray(s[1]));
          if (multiple) return resolve(dirs);
          return resolve(dirs[0] || null);
        }
      // otherwise return file nodes
      const files = selection.filter(s => !Array.isArray(s[1]));
      // map to handles with full path from annotated tree
      const handles = files.map(f => {
        // f is [name, null, meta]
        const path = (f[2] && f[2].path) ? f[2].path : (currentPath.slice(1).concat([f[0]]).join('/'));
        return makeFlowawayFileHandle(f[0], path);
      });
      resolve(handles);
    };
  });
}

// Global functions
window.flowawayOpenFilePicker = async function (options = {}) {
  if (!window.treeData) await window.loadTree();
  const res = await createPickerModal(window.treeData, { allowDirectory: false, multiple: !!options.multiple });
  return res; // array of handles or null
};

window.flowawayDirectoryPicker = async function (options = {}) {
  if (!window.treeData) await window.loadTree();
  options.allowDirectory = true;
  console.log(options)
  const sel = await createPickerModal(window.treeData, options);
  // return folder node (the array structure)
  return sel; // may be null
};

window.flowawaySaveFilePicker = async function (options = {}, suggestedPath = '') {
  if (!window.treeData) await window.loadTree();
  // Use the picker modal with save input enabled for consistent UI
  const chosen = await createPickerModal(window.treeData, { allowDirectory: true, save: true, suggestedName: suggestedPath.split('/').pop() || '', filecontent: options.filecontent || null });
  console.log(chosen)
  return makeFlowawayFileHandle(chosen.name, chosen.path, chosen.filecontent);
};

// Helper function to hash script content (handles Unicode characters)
function hashScriptContent(text) {
  let hash = 0;
  for (let i = 0; i < text.length; i++) {
    const char = text.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32-bit integer
  }
  return Math.abs(hash).toString(16);
}

// ----------------- DYNAMIC AP LOADER -----------------
window.apps = window.apps || [];

async function getFolderListing(relPath) {
  try {
    const r = await filePost({ requestFile: true, requestFileName: relPath });
    if (r && r.kind === 'folder' && Array.isArray(r.files)) return r.files;
  } catch (e) { console.error('getFolderListing error', e); }
  return null;
}

// Helper function to extract app data from an app folder
async function extractAppData(appFolder) {
  const folderName = appFolder[0];
  const folderPath = (appFolder[2] && appFolder[2].path) ? appFolder[2].path : `apps/${folderName}`;
  const files = await getFolderListing(folderPath);
  if (!files) return null;
  
  // find files
  const jsFile = files.find(f => f.name.toLowerCase().endsWith('.js'))?.relativePath || null;
  const txtFile = files.find(f => f.name.toLowerCase().endsWith('.txt'))?.relativePath || null;
  const iconFile = files.find(f => f.name.toLowerCase().startsWith('icon') || f.name.toLowerCase().endsWith('.png') || f.name.toLowerCase().endsWith('.svg'))?.relativePath || null;

  let entryName = null;
  let label = folderName;
  let icon = '🔧';

  if (txtFile) {
    try {
      const b64 = await fetchFileContentByPath(`${folderPath}/${txtFile}`);
      const txt = base64ToUtf8(b64).trim();
      const lines = txt.split('\n').map(s => s.trim()).filter(Boolean);
      if (lines.length) entryName = lines[0];
      if (lines.length > 1) label = lines[1];
      if (lines.length > 2) startbtnid = lines[2];
    } catch (e) { console.error('read txt', e); }
  }

  if (iconFile) {
    if (iconFile.toLowerCase().endsWith('.png') || iconFile.toLowerCase().endsWith('.svg')) {
      icon = `<img src="${goldenbodywebsite}download?username=${encodeURIComponent(username)}&path=${encodeURIComponent(folderPath + '/' + iconFile)}" style="width:26px;height:26px;object-fit:contain;display:block;margin:0 auto;"/>`;
    } else {
      try {
        const b64 = await fetchFileContentByPath(`${folderPath}/${iconFile}`);
        icon = base64ToUtf8(b64).trim() || icon;
      } catch (e) { console.error('read icon txt', e); }
    }
  }

  return { id: icon, path: folderPath, jsFile, entry: entryName, label, startbtnid, icon, scriptLoaded: false };
}

async function loadAppsFromTree() {
  if(loaded) return;
  loaded = true;
  window.apps = [];
  if (!window.treeData) await window.loadTree();
  try {
    const rootChildren = (window.treeData && window.treeData[1]) || [];
    const appsNode = rootChildren.find(c => c[0] === 'apps' && Array.isArray(c[1]));
    if (!appsNode) return;
    for (const appFolder of appsNode[1]) {
      const appData = await extractAppData(appFolder);
      if (appData) window.apps.push(appData);
    }

    // Sort apps alphabetically by label
    window.apps.sort((a, b) => a.label.localeCompare(b.label));

    // render
    renderAppsGrid();
    // reapply task buttons now that apps may be present
    applyTaskButtons();
    purgeButtons();
    
    // Start polling for app changes
    startAppPolling();
  } catch (e) { console.error('loadAppsFromTree error', e); }
}

async function renderAppsGrid() {
  const container = document.getElementById('appsGrid');
  if (!container) return;
  // Remove all current children to render fresh
  container.innerHTML = '';
  for (const app of window.apps) {
    const div = document.createElement('div');
    div.className = 'app';
    div.dataset.appId = app.icon;
    div.id = app.id + 'app';
    div.style.padding = '10px';
    div.style.borderRadius = '6px';
    div.style.textAlign = 'center';
    div.style.cursor = 'pointer';
    div.id = app.startbtnid;
    div.innerHTML = `${app.icon}<br><span style="font-size:14px;">${app.label}</span>`;
    container.appendChild(div);
      if (!app.scriptLoaded && app.jsFile) {
    try {
      const b64 = await fetchFileContentByPath(`${app.path}/${app.jsFile}`);
      const scriptText = base64ToUtf8(b64);
      // Store hash for future change detection
      app._lastScriptHash = hashScriptContent(scriptText);
      
      // snapshot globals before injection
      const beforeGlobals = new Set(Object.getOwnPropertyNames(window));
      const s = document.createElement('script');
      s.type = 'text/javascript';
      s.textContent = scriptText;
      document.body.appendChild(s);
      app.scriptLoaded = true;
      app._scriptElement = s;
      // record any globals the script introduced (best-effort)
      try {
        app._addedGlobals = [];
        const captureAdded = () => {
          try {
            const after = Object.getOwnPropertyNames(window);
            const newly = after.filter(k => !beforeGlobals.has(k) && !(app._addedGlobals || []).includes(k));
            if (newly.length) app._addedGlobals = [...new Set([...(app._addedGlobals || []), ...newly])];
          } catch (e) {}
        };
        // immediate capture and a few delayed captures to catch async initializers
        captureAdded();
        setTimeout(captureAdded, 120);
        setTimeout(captureAdded, 800);
        setTimeout(captureAdded, 2500);
      } catch (e) {}
    } catch (e) { console.error('failed to load app script', e); }
  }

  }
}

async function launchApp(appId) {
  const app = (window.apps || []).find(a => a.id === appId);
  if (!app) {
    // fallback: try to call a global function named like the appId (or the id listed in entry)
    try {
      const globalFn = window[appId] || null;
      if (typeof globalFn === 'function') return globalFn();
    } catch (e) {}
    console.warn('App not found:', appId);
    return;
  }

    if (!app.scriptLoaded && app.jsFile) {
    try {
      const b64 = await fetchFileContentByPath(`${app.path}/${app.jsFile}`);
      const scriptText = base64ToUtf8(b64);
      // Store hash for future change detection
      app._lastScriptHash = hashScriptContent(scriptText);
      
      // snapshot globals before injection
      const beforeGlobals = new Set(Object.getOwnPropertyNames(window));
      const s = document.createElement('script');
      s.type = 'text/javascript';
      s.textContent = scriptText;
      document.body.appendChild(s);
      app.scriptLoaded = true;
      app._scriptElement = s;
      // record any globals the script introduced (best-effort)
      try {
        app._addedGlobals = [];
        const captureAdded = () => {
          try {
            const after = Object.getOwnPropertyNames(window);
            const newly = after.filter(k => !beforeGlobals.has(k) && !(app._addedGlobals || []).includes(k));
            if (newly.length) app._addedGlobals = [...new Set([...(app._addedGlobals || []), ...newly])];
          } catch (e) {}
        };
        captureAdded();
        setTimeout(captureAdded, 120);
        setTimeout(captureAdded, 800);
        setTimeout(captureAdded, 2500);
      } catch (e) {}
    } catch (e) { console.error('failed to load app script', e); }
  }

  try {
    if (app.entry && typeof window[app.entry] === 'function') {
      window[app.entry]();
    } else if (typeof window[app.id] === 'function') {
      window[app.id]();
    }
    // After the app constructs its UI, try to tag the new top-level window(s) with appId
    setTimeout(() => {
      try {
        const roots = Array.from(document.querySelectorAll('.sim-chrome-root'));
        // find ones without app id yet
        const untagged = roots.filter(r => !r.dataset || !r.dataset.appId);
        if (untagged.length) {
          // tag the most recently added
          const candidate = untagged[untagged.length - 1];
          candidate.dataset.appId = app.entry || app.id;
        }
      } catch (e) {}
    }, 40);
    return;
  } catch (e) { console.error('launchApp error', e); }
}

// ===== LIVE APP POLLING =====
let appPollingActive = false;

async function pollAppChanges() {
  if (!window.treeData) return;
  
  try {
    const rootChildren = (window.treeData && window.treeData[1]) || [];
    const appsNode = rootChildren.find(c => c[0] === 'apps' && Array.isArray(c[1]));
    if (!appsNode) return;
    
    // Get current app folders from the file system
    const currentAppFolders = appsNode[1] || [];
    let hasChanges = false;
    
    // Check for new apps and modified apps
    for (const appFolder of currentAppFolders) {
      const folderName = appFolder[0];
      const expectedPath = (appFolder[2] && appFolder[2].path) ? appFolder[2].path : `apps/${folderName}`;
      
      const existingApp = window.apps.find(a => a.path === expectedPath);
      const newAppData = await extractAppData(appFolder);
      if (!newAppData) continue;
      
      if (!existingApp) {
        // New app detected!
        window.apps.push(newAppData);
        window.apps.sort((a, b) => a.label.localeCompare(b.label));
        console.log(`[APP POLLING] New app detected: ${newAppData.label}`);
        hasChanges = true;
      } else {
        // Check if app metadata changed (entry, jsFile, icon, label)
        let appModified = false;
        let scriptContentChanged = false;
        
        if (existingApp.entry !== newAppData.entry) {
          console.log(`[APP POLLING] ${existingApp.label}: entry changed from ${existingApp.entry} to ${newAppData.entry}`);
          appModified = true;
        }
        if (existingApp.jsFile !== newAppData.jsFile) {
          console.log(`[APP POLLING] ${existingApp.label}: JS file changed from ${existingApp.jsFile} to ${newAppData.jsFile}`);
          appModified = true;
        }
        
        // Check if JS file content has changed (even if file path is the same)
        if (existingApp.jsFile && newAppData.jsFile && existingApp.jsFile === newAppData.jsFile && existingApp._lastScriptHash) {
          try {
            const b64 = await fetchFileContentByPath(`${existingApp.path}/${existingApp.jsFile}`);
            const scriptText = base64ToUtf8(b64);
            const currentHash = hashScriptContent(scriptText); // Quick hash for comparison
            if (currentHash !== existingApp._lastScriptHash) {
              console.log(`[APP POLLING] ${existingApp.label}: JS file content changed`);
              scriptContentChanged = true;
              appModified = true;
            }
          } catch (e) {
            console.error(`[APP POLLING] Failed to check script hash for ${existingApp.label}:`, e);
          }
        }
        
        if (existingApp.icon !== newAppData.icon) {
          console.log(`[APP POLLING] ${existingApp.label}: icon changed`);
          appModified = true;
        }
        if (existingApp.label !== newAppData.label) {
          console.log(`[APP POLLING] App label changed from ${existingApp.label} to ${newAppData.label}`);
          appModified = true;
        }
        
        if (appModified) {
          hasChanges = true;
          
          // Store original values for comparison before updating
          const iconChanged = existingApp.icon !== newAppData.icon;
          
          // Clean up old global variables and functions before reloading
          try {
            // Only delete the entry point function and app-specific name variants
            // DO NOT delete _addedGlobals automatically since we can't reliably
            // distinguish app-specific globals from others added around the same time
            if (existingApp.entry && window[existingApp.entry]) {
              window[existingApp.entry] = null;
              delete window[existingApp.entry];
            }
            const variantsToClean = [
              existingApp.id,
              existingApp.label,
              existingApp.label.toLowerCase(),
              existingApp.label.replace(/\s+/g, ''),
              existingApp.label.replace(/\s+/g, '').toLowerCase(),
            ];
            for (const variant of variantsToClean) {
              if (window[variant]) {
                window[variant] = null;
                delete window[variant];
              }
            }
          } catch (e) {
            console.warn(`[APP POLLING] Error cleaning old app globals:`, e);
          }
          
          // Remove old script if it was loaded
          if (existingApp.scriptLoaded && existingApp._scriptElement) {
            existingApp._scriptElement.remove();
            existingApp.scriptLoaded = false;
          }
          
          // Update app object with new data
          existingApp.entry = newAppData.entry;
          existingApp.jsFile = newAppData.jsFile;
          existingApp.icon = newAppData.icon;
          existingApp.label = newAppData.label;
          existingApp.startbtnid = newAppData.startbtnid;
          existingApp.id = newAppData.id;
          
          console.log(`[APP POLLING] App updated: ${existingApp.label}`);
          
          // Immediately re-render the grid icon for this app
          const appGridElement = document.getElementById(newAppData.startbtnid || (newAppData.id + 'app'));
          if (appGridElement) {
            appGridElement.innerHTML = `${existingApp.icon}<br><span style="font-size:14px;">${existingApp.label}</span>`;
          }
          
          // // Update taskbar icon if the icon changed
          // if (iconChanged) {
          //   const taskbarBtn = Array.from(taskbar.querySelectorAll('button')).find(btn =>
          //     (btn.dataset && btn.dataset.appId === existingApp.id) ||
          //     btn.textContent.includes(existingApp.label)
          //   );
          //   if (taskbarBtn) {
          //     taskbarBtn.innerHTML = `${newAppData.icon}<span style="margin-left:8px;">${newAppData.label}</span>`;
          //   }
          // }
          
          // Reload script if app has JS file
          if (existingApp.jsFile) {
            try {
              const b64 = await fetchFileContentByPath(`${existingApp.path}/${existingApp.jsFile}`);
              const scriptText = base64ToUtf8(b64);
              // Store hash for future change detection
              existingApp._lastScriptHash = hashScriptContent(scriptText);
              
              // snapshot globals before injection
              const beforeGlobals2 = new Set(Object.getOwnPropertyNames(window));
              const s = document.createElement('script');
              s.type = 'text/javascript';
              s.textContent = scriptText;
              document.body.appendChild(s);
              existingApp.scriptLoaded = true;
              existingApp._scriptElement = s;
              // record any globals introduced
              try {
                let added = Object.getOwnPropertyNames(window).filter(k => !beforeGlobals2.has(k));
                existingApp._addedGlobals = added;
                setTimeout(() => {
                  try {
                    const after2 = Object.getOwnPropertyNames(window);
                    const newly = after2.filter(k => !beforeGlobals2.has(k) && !(existingApp._addedGlobals || []).includes(k));
                    if (newly.length) existingApp._addedGlobals = [...new Set([...(existingApp._addedGlobals || []), ...newly])];
                  } catch (e) {}
                }, 120);
              } catch (e) {}
              console.log(`[APP POLLING] Script reloaded for: ${existingApp.label}`);
            } catch (e) {
              console.error(`[APP POLLING] Failed to reload script for ${existingApp.label}:`, e);
            }
          }
          
          hasChanges = true;
        }
      }
    }
    
    // Check for deleted apps
    const appsToDelete = [];
    for (let i = 0; i < window.apps.length; i++) {
      const app = window.apps[i];
      const stillExists = currentAppFolders.some(f => {
        const expectedPath = (f[2] && f[2].path) ? f[2].path : `apps/${f[0]}`;
        return expectedPath === app.path;
      });
      
      if (!stillExists) {
        appsToDelete.push(i);
      }
    }
    
    // Delete apps in reverse order to maintain indices
    for (let i = appsToDelete.length - 1; i >= 0; i--) {
      const appIndex = appsToDelete[i];
      const app = window.apps[appIndex];
      
      console.log(`[APP POLLING] App deleted: ${app.label}`);
      
      // 0. Clean up global variables and functions
      try {
        // Clear entry point function
        if (app.entry && window[app.entry]) {
          window[app.entry] = null;
          delete window[app.entry];
          console.log(`[APP POLLING] Cleared function: ${app.entry}`);
        }
        
        // Try to clear other related variables (app id, label variants, etc.)
        const variantsToClean = [
          app.id,
          app.label,
          app.label.toLowerCase(),
          app.label.replace(/\s+/g, ''),
          app.label.replace(/\s+/g, '').toLowerCase(),
        ];
        
        for (const variant of variantsToClean) {
          if (window[variant]) {
            window[variant] = null;
            delete window[variant];
            console.log(`[APP POLLING] Cleared variable: ${variant}`);
          }
        }
        // Clear any globals recorded when the app loaded
        try {
          if (app._addedGlobals && app._addedGlobals.length) {
            for (const g of app._addedGlobals) {
              try {
                if (window[g]) {
                  window[g] = null;
                  delete window[g];
                  console.log(`[APP POLLING] Cleared added global: ${g}`);
                }
              } catch (ee) {}
            }
            app._addedGlobals = null;
            delete app._addedGlobals;
          }
        } catch (ee) {}
      } catch (e) {
        console.warn(`[APP POLLING] Error cleaning global variables for ${app.label}:`, e);
      }
      
      // 1. Remove script element from DOM if loaded
      if (app._scriptElement) {
        app._scriptElement.remove();
      }
      
      // 2. Remove from apps array
      window.apps.splice(appIndex, 1);
      
      // 3. Remove from apps grid
      const appElement = document.getElementById(app.id + 'app');
      if (appElement) appElement.remove();
      
      // 4. Remove taskbar button
      const taskbarBtn = Array.from(taskbar.querySelectorAll('button')).find(btn => 
        (btn.dataset && btn.dataset.appId === app.icon) || 
        btn.textContent.includes(app.label)
      );
      if (taskbarBtn) taskbarBtn.remove();
      
      // 5. Close all windows with matching appId
      const appIdToMatch = app.entry || app.icon;
      const windowsToClose = Array.from(document.querySelectorAll('.sim-chrome-root')).filter(root => 
        root.dataset && root.dataset.appId === appIdToMatch
      );
      for (const windowEl of windowsToClose) {
        windowEl.remove();
      }
      
      hasChanges = true;
    }
    
    // If any changes detected, re-render and apply
    if (hasChanges) {
      renderAppsGrid();
      applyTaskButtons();
      purgeButtons();
      // Dispatch custom event when apps have been updated
      setTimeout(() => {
              const appUpdatedEvent = new CustomEvent('appUpdated', { detail: { apps: window.apps } });
      window.dispatchEvent(appUpdatedEvent);
      }, 1000);

    }
    
  } catch (e) {
    console.error('[APP POLLING] Error during polling:', e);
  }
}
window.addEventListener('appUpdated', (e) => {
      rebuildTaskButtons();
      purgeButtons();
  // You can add additional handling here if needed when apps are updated
});
function startAppPolling() {
  if (appPollingActive) return;
  appPollingActive = true;
  
  // Poll every 7 seconds (5-10 second range)
  setInterval(() => {
    try {
      pollAppChanges();
    } catch (e) {
      console.error('[APP POLLING] Poll cycle error:', e);
    }
  }, 7000);
  
  console.log('[APP POLLING] App polling started (7s interval)');
}

// Ensure loadAppsFromTree runs after initial tree load
const oldLoadTree = window.loadTree;
window.loadTree = async function () {
  await oldLoadTree();
  await loadAppsFromTree();
};

// ----------------- END dynamic app loader -----------------

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
    // Remove any menus with the shared .app-menu class (used across apps)
    const menus = document.querySelectorAll('.app-menu');
    for (const m of menus) {
      try {
        if (except && m.dataset && m.dataset.appId === except) continue;
      } catch (e) {}
      try { m.remove(); } catch (e) {}
    }
  } catch (e) {}
};
  function applyTaskButtons() {
    if(window.apps.length === 0 || window.appsButtonsApplied) return;
    window.appsButtonsApplied = true;
    // Clear existing task buttons (except first 3)
  // Prefer dynamic apps discovered in /apps
  for (const taskbutton of data.taskbuttons) {
    const app = (window.apps || []).find(a => a.id === taskbutton);
    if (app) {
      const btn = addTaskButton(app.icon || '🔧', () => launchApp(app.id));
      if (btn) btn.dataset.appId = app.icon;
    } 
  }
  taskbuttons = [...taskbar.querySelectorAll("button")];
 }
 // add a function that rebuilds taskbuttons
 function rebuildTaskButtons() {
    // Clear existing task buttons (except first 3)
    let buttons = [...taskbar.querySelectorAll("button")];
    buttons.splice(0, 3);
    buttons.forEach(b => {
      b.remove();
    });
    // add taskbuttons without calling applytaskbuttons to prevent dupes
    for (const taskbutton of data.taskbuttons) {
    const app = (window.apps || []).find(a => a.id === taskbutton);
    if (app) {
      const btn = addTaskButton(app.icon || '🔧', () => launchApp(app.id));
      if (btn) btn.dataset.appId = app.icon;
    } 
  }
    purgeButtons();
  }
  function purgeButtons() {
    buttons = [...taskbar.querySelectorAll("button")];
    buttons.splice(0, 3);
    buttons.forEach(b => {
      b.dataset.appId = b.textContent;
    });
    // Build a generic map from appId -> [buttons]
    window.appButtons = window.appButtons || {};
    window.appButtons = {};
    for (let i = 0; i < taskbuttons.length; i++) {
      const tb = taskbuttons[i];
      let id;
      try {
        id = tb.dataset.appId;
      } catch (e) {}
      if (!id) continue;
      window.appButtons[id] = window.appButtons[id] || [];
      window.appButtons[id].push(tb);
    }
  }

  function saveTaskButtons() {
    let buttons = [...taskbar.querySelectorAll("button")];
    buttons.splice(0, 3);
    let postdata = [];
    for (const b of buttons) {
        if (b.dataset && b.dataset.appId) {
        postdata.push(b.dataset.appId);
      } else {
        // If no dataset, try to infer id from value or textContent
        const inferred = (b.value && String(b.value).trim()) || (b.textContent && String(b.textContent).trim());
        if (inferred) postdata.push(inferred);
      }
    }
    posttaskbuttons(postdata);
  }
  function bringToFront(el) {
    if (!el) return;
    // Prefer explicit dataset app id
    let appId = el.dataset && el.dataset.appId;
    // fallback: data-app-id attribute
    if (!appId) appId = el.getAttribute && el.getAttribute('data-app-id');
    // fallback: check classes against discovered app ids
    if (!appId && window.apps && Array.isArray(window.apps)) {
      for (const a of window.apps) {
        try {
          if (el.classList.contains(a.id) || el.id === (a.id + 'app') || el.id === a.id) {
            appId = a.id; break;
          }
        } catch (e) {}
      }
    }
    atTop = appId || '';
    el.style.zIndex = String(++zTop);
  }

  window.addEventListener("keydown", function (e) {
    // Build normalized combo e.g. 'Ctrl+Shift+N'
    const parts = [];
    if (e.ctrlKey) parts.push('Ctrl');
    if (e.shiftKey) parts.push('Shift');
    const keyPart = String(e.key).toUpperCase();
    parts.push(keyPart);
    const combo = parts.join('+');

    // Check user-defined shortcuts first
    if (data && data.shortcuts && data.shortcuts[combo]) {
      e.preventDefault();
      launchApp(data.shortcuts[combo]);
      return;
    }

    // Default: Ctrl+N -> open new instance of focused app or a sensible default
    if (e.ctrlKey && keyPart === 'N') {
      e.preventDefault();
      const focusedApp = atTop || '';
      if (focusedApp && typeof launchApp === 'function') {
        // attempt to open another instance of focused app
        launchApp(focusedApp);
        return;
      }
      // fallback: first taskbutton or first discovered app
      const fallback = (data.taskbuttons && data.taskbuttons[0]) || (window.apps && window.apps[0] && window.apps[0].id);
      if (fallback) launchApp(fallback);
      return;
    } else if (e.ctrlKey && e.shiftKey && e.key === "W") {
      // Close topmost window for the focused app (atTop)
      if (!atTop) return;
      try {
        // Prefer elements explicitly tagged with data-app-id
        const candidates = Array.from(document.querySelectorAll(`[data-app-id="${atTop}"]`));
        // fallback: match elements with class name equal to app id
        if (!candidates.length) {
          const byClass = Array.from(document.getElementsByClassName(atTop));
          for (const el of byClass) candidates.push(el);
        }
        if (!candidates.length) return;
        // Choose the one with highest z-index or last in document
        candidates.sort((a, b) => {
          const za = parseInt(a.style.zIndex) || 0;
          const zb = parseInt(b.style.zIndex) || 0;
          return za - zb;
        });
        const top = candidates[candidates.length - 1];
        if (top) top.remove();
      } catch (e) { console.error('close focused app window error', e); }
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
  try {
    const roots = document.querySelectorAll('.sim-chrome-root');
    for (const r of roots) {
      r.classList.toggle('dark', data.dark);
      r.classList.toggle('light', !data.dark);
      try { r.dispatchEvent(new CustomEvent('styleapplied', {})); } catch (e) {}
    }
  } catch (e) {}

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

// Ensure apps are loaded shortly after startup (safe-guard if tree already present)
setTimeout(() => { try { loadAppsFromTree(); } catch (e) {} }, 200);
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

.appTopBar {
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
.sim-chrome-root.light .appTopBar {
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

.app-menu.light {
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

.sim-chrome-root.dark .app-menu {
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

.sim-chrome-root.dark .appTopBar {
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

.app-menu.dark {
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
    <!-- Dynamic apps grid (populated from user's /apps folder) -->
    <div id="appsGrid" style="display: contents;"></div>

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
  // Delegated click handler: apps rendered dynamically will set data-app-id to the app id
  startMenu.addEventListener("click", (e) => {
    let el = e.target;
    while (el && !el.classList.contains('app')) el = el.parentElement;
    if (!el) return;
    const appId = el.dataset.appId;
    if (!appId) return;
    launchApp(appId);
    startMenu.style.display = "none";
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


  // Do not pre-load specific app scripts here; apps are loaded from the user's `apps/` folder dynamically.
  // Only load system helper script.
  let sysScript = document.createElement('script');

setTimeout(() => {
  sysScript.src = `${goldenbodywebsite}system.js`;
  document.body.appendChild(sysScript);
  setTimeout(() => {
      const appUpdatedEvent = new CustomEvent('appUpdated', { detail: null });
      window.dispatchEvent(appUpdatedEvent);
  }, 1000);
}, 100);