"use strict";
(() => {
  console.log('VFS injector active');
  frameWin.vfsloaded = true;
  // make this thing work ig usin this
  const {
  File,
  Blob,
  WritableStream,
  DataTransfer,
  Event,
  DOMException,
  TextEncoder,
  Uint8Array,
  ArrayBuffer
  } = frameWin;
  // make the site think we're a modern Chrome browser to maximize compatibility with libraries that gate features based on userAgent checks. We can override this because we'll provide our own implementations of any required APIs, so the userAgent string is mostly for show to get past naive checks.
                frameWin.Object.defineProperty(frameWin.navigator, 'userAgent', {
                    get: function () { return 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/145.0.0.0 Safari/537.36'; },
                    configurable: true
                });
                frameWin.Object.defineProperty(frameWin.navigator, 'userAgentData', {
                    get: function () { return JSON.parse('{"brands":[{"brand":"Not:A-Brand","version":"99"},{"brand":"Google Chrome","version":"145"},{"brand":"Chromium","version":"145"}],"mobile":false,"platform":"macOS"}'); },
                    configurable: true
                });

          // Provide synthetic FileSystemHandle classes so libraries that use instanceof
          // checks (e.g., FileSystemObserver) accept our synthetic handles.
          function FileSystemHandle() {}
          function FileSystemFileHandle() { FileSystemHandle.call(this); }
          FileSystemFileHandle.prototype = frameWin.Object.create(FileSystemHandle.prototype);
          FileSystemFileHandle.prototype.constructor = FileSystemFileHandle;
          function FileSystemDirectoryHandle() { FileSystemHandle.call(this); }
          FileSystemDirectoryHandle.prototype = frameWin.Object.create(FileSystemHandle.prototype);
          FileSystemDirectoryHandle.prototype.constructor = FileSystemDirectoryHandle;
          frameWin.FileSystemHandle = FileSystemHandle;
          frameWin.FileSystemFileHandle = FileSystemFileHandle;
          frameWin.FileSystemDirectoryHandle = FileSystemDirectoryHandle;
          // Polyfill common methods on prototypes so returned handles behave like
          // native FileSystemHandle objects.

          function normalizeEntryPath(targetPath) {
            if (typeof targetPath !== 'string') return '';
            return normalizeVfsPath(targetPath);
          }

          async function persistEntryCreation(targetPath, kind) {
            const resolvedPath = normalizeEntryPath(targetPath);
            if (!resolvedPath) {
              throw new DOMException('A path is required to create a filesystem entry.', 'TypeError');
            }

            await window.browserGlobals.handleVfsSaveFile(frameWin, {
              __VFS__: true,
              kind: kind === 'directory' ? 'createDirectory' : 'createFile',
              path: resolvedPath,
            });
          }

          function ensureTreeChild(parentHandle, name, kind) {
            if (!parentHandle || !parentHandle._treeNode || !Array.isArray(parentHandle._treeNode[1])) {
              return null;
            }

            const existingChild = parentHandle._treeNode[1].find((child) => child && child[0] === name);
            if (existingChild) {
              return existingChild;
            }

            const createdChild = kind === 'directory' ? [name, []] : [name, null];
            parentHandle._treeNode[1].push(createdChild);
            return createdChild;
          }

FileSystemFileHandle.prototype.getFile = async function () {
  return this._file;
};

FileSystemFileHandle.prototype.createWritable = async function () {
  const path = this.path;
  const name = this.name;

  if (!path) {
    const remote = await frameWin.showSaveFilePicker({ suggestedName: name });
    return await remote.createWritable();
  }

  let closed = false;
  let pendingWrites = [];

  // ✅ REAL WritableStream with proper async handling
  const stream = new WritableStream({
    async write(chunk) {
      if (closed) return;

      let buffer;

      if (chunk instanceof Blob) {
        buffer = await chunk.arrayBuffer();
      } else if (typeof chunk === 'string') {
        buffer = new TextEncoder().encode(chunk).buffer;
      } else if (chunk instanceof ArrayBuffer) {
        buffer = chunk;
      } else if (ArrayBuffer.isView(chunk)) {
        buffer = chunk.buffer;
      } else {
        buffer = new Uint8Array(chunk).buffer;
      }

      return window.browserGlobals.handleVfsSaveFile(frameWin, {
        __VFS__: true,
        kind: 'saveFile',
        path,
        name,
        buffer,
      });
    },

    async close() {
      closed = true;
      return window.browserGlobals.handleVfsSaveFile(frameWin, {
        __VFS__: true,
        kind: 'saveFile',
        path,
        name,
        lastOne: true,
      });
    },

    async abort(reason) {
      closed = true;
      return window.browserGlobals.handleVfsSaveFile(frameWin, {
        __VFS__: true,
        kind: 'saveFileAbort',
        path,
        name,
        reason,
      });
    }
  });

stream.write = async (chunk) => {
  if (closed) return;

  let buffer;

  if (chunk instanceof Blob) {
    buffer = await chunk.arrayBuffer();
  } else if (typeof chunk === 'string') {
    buffer = new TextEncoder().encode(chunk).buffer;
  } else if (chunk instanceof ArrayBuffer) {
    buffer = chunk;
  } else if (ArrayBuffer.isView(chunk)) {
    buffer = chunk.buffer;
  } else {
    buffer = new Uint8Array(chunk).buffer;
  }

  // IMPORTANT: return a promise that represents processing
  await window.browserGlobals.handleVfsSaveFile(frameWin, {
    __VFS__: true,
    kind: 'saveFile',
    path,
    name,
    buffer,
  });
}
  stream.close = async function () {
    const writer = stream.getWriter();
    try {
      await writer.close();
    } finally {
      writer.releaseLock();
    }
  };

  stream.abort = async function (reason) {
    const writer = stream.getWriter();
    try {
      await writer.abort(reason);
    } finally {
      writer.releaseLock();
    }
  };

  return stream;
};


          FileSystemFileHandle.prototype.queryPermission = async function () { return 'granted'; };
          FileSystemFileHandle.prototype.requestPermission = async function () { return 'granted'; };
          FileSystemFileHandle.prototype.isSameEntry = async function (other) {
            try { return !!(other && (other.path || other.name) && (this.path === other.path || this.name === other.name)); } catch (e) { return false; }
          };

          FileSystemDirectoryHandle.prototype.isSameEntry = async function (other) {
            try { return !!(other && (other.path || other.name) && (this.path === other.path || this.name === other.name)); } catch (e) { return false; }
          };

          FileSystemDirectoryHandle.prototype[Symbol.asyncIterator] = async function* () {
            if (typeof this.entries !== 'function') return;
            for await (const entry of this.entries()) {
              yield entry;
            }
          };

          FileSystemDirectoryHandle.prototype.entries = async function* () {
            if (!this._treeNode || !Array.isArray(this._treeNode[1])) return;
            for (const child of this._treeNode[1]) {
              const name = child[0];
              const isFolder = Array.isArray(child[1]);
              if (isFolder) {
                const dirHandle = new FileSystemDirectoryHandle();
                dirHandle.name = name;
                dirHandle.kind = 'directory';
                dirHandle.path = this.path ? this.path + '/' + name : name;
                dirHandle._treeNode = child;
                yield [name, dirHandle];
              } else {
                const fileHandle = new FileSystemFileHandle();
                fileHandle.name = name;
                fileHandle.kind = 'file';
                fileHandle.path = this.path ? this.path + '/' + name : name;
                yield [name, fileHandle];
              }
            }
          };

          FileSystemDirectoryHandle.prototype.values = async function* () {
            for await (const [, handle] of this.entries()) {
              yield handle;
            }
          };

          FileSystemDirectoryHandle.prototype.keys = async function* () {
            for await (const [name] of this.entries()) {
              yield name;
            }
          };

          FileSystemDirectoryHandle.prototype.getDirectoryHandle = async function (name, options = {}) {
            if (typeof name !== 'string') {
              throw new DOMException('The name must be a string', 'TypeError');
            }

            const segments = name.split('/').filter((part) => part !== '');
            if (segments.length > 1) {
              const parentPath = segments.slice(0, -1).join('/');
              const childName = segments[segments.length - 1];
              const parentHandle = await this.getDirectoryHandle(parentPath, options);
              return parentHandle.getDirectoryHandle(childName, options);
            }

            if (!this._treeNode || !Array.isArray(this._treeNode[1])) {
              throw new DOMException(this.name + ' is not a directory', 'NotADirectoryError');
            }

            let child = this._treeNode[1].find((c) => c[0] === name);
            if (!child) {
              if (options && options.create) {
                const createdPath = this.path ? this.path + '/' + name : name;
                await persistEntryCreation(createdPath, 'directory');
                child = ensureTreeChild(this, name, 'directory');
              } else {
                throw new DOMException('A directory with the name "' + name + '" was not found.', 'NotFoundError');
              }
            }

            if (!child || !Array.isArray(child[1])) {
              throw new DOMException('"' + name + '" is not a directory', 'TypeMismatchError');
            }

            const dirHandle = new FileSystemDirectoryHandle();
            dirHandle.name = name;
            dirHandle.kind = 'directory';
            dirHandle.path = this.path ? this.path + '/' + name : name;
            dirHandle._treeNode = child;
            return dirHandle;
          };

          FileSystemDirectoryHandle.prototype.getFileHandle = async function (name, options = {}) {
            if (typeof name !== 'string') {
              throw new DOMException('The name must be a string', 'TypeError');
            }

            const segments = name.split('/').filter((part) => part !== '');
            if (segments.length > 1) {
              const parentPath = segments.slice(0, -1).join('/');
              const childName = segments[segments.length - 1];
              const parentHandle = await this.getDirectoryHandle(parentPath, options);
              return parentHandle.getFileHandle(childName, options);
            }

            if (!this._treeNode || !Array.isArray(this._treeNode[1])) {
              throw new DOMException('' + this.name + ' is not a directory', 'NotADirectoryError');
            }

            let child = this._treeNode[1].find((c) => c[0] === name);
            if (!child) {
              if (options && options.create) {
                const createdPath = this.path ? this.path + '/' + name : name;
                await persistEntryCreation(createdPath, 'file');
                child = ensureTreeChild(this, name, 'file');
                const fileHandle = new FileSystemFileHandle();
                fileHandle.name = name;
                fileHandle.kind = 'file';
                fileHandle.path = this.path ? this.path + '/' + name : name;
                fileHandle._file = new File([], name, { type: 'application/octet-stream' });
                fileHandle._createdEmpty = true;
                if (fileHandle._file) {
                  try {
                    fileHandle._file.fullPath = normalizeVfsPath(fileHandle.path);
                    fileHandle._file.handle = fileHandle;
                    fileHandle._file.fileHandle = fileHandle;
                  } catch (e) {}
                }
                return fileHandle;
              } else {
                throw new DOMException('A file with the name "' + name + '" was not found.', 'NotFoundError');
              }
            }

            if (!child || Array.isArray(child[1])) {
              throw new DOMException('"' + name + '" is not a file', 'TypeMismatchError');
            }

            const fileHandle = new FileSystemFileHandle();
            fileHandle.name = name;
            fileHandle.kind = 'file';
            fileHandle.path = this.path ? this.path + '/' + name : name;
            return fileHandle;
          };

function makeFileHandle(file) {
  const h = new FileSystemFileHandle();

  h.kind = 'file';
  h.name = file.name;

  // Non-standard, VFS-only (informational)
  h.path = normalizeVfsPath(file.fullPath || file.webkitRelativePath || file.name);

  // Internal backing file
  h._file = file;

  return h;
}

          // Shim FileSystemObserver so sites that call new FileSystemObserver(...).observe(handle)
          // with our synthetic handles won't throw a TypeError. When a synthetic handle is
          // observed we forward an observe request to the top frame so the host can watch
          // the underlying path if desired.
          (function installFSObserverShim() {
            const NativeFSObserver = frameWin.FileSystemObserver;
            function isSyntheticHandle(h) {
              if (!h || typeof h !== 'object') return false;
              if (h instanceof FileSystemHandle || h instanceof FileSystemFileHandle || h instanceof FileSystemDirectoryHandle) return true;

              const kind = h.kind;
              if (kind === 'file' || kind === 'directory') return true;

              return !!(h.path || h.name) && (
                typeof h.getFile === 'function' ||
                typeof h.createWritable === 'function' ||
                typeof h.entries === 'function' ||
                typeof h.getDirectoryHandle === 'function' ||
                typeof h.getFileHandle === 'function'
              );
            }

            class FileSystemObserverShim {
              constructor(cb) {
                this.cb = cb;
                this._native = NativeFSObserver ? new NativeFSObserver(cb) : null;
                this._regs = new Map();
              }
              observe(handle) {
                if (isSyntheticHandle(handle)) {
                  const path = handle.path || handle.name || '/';
                  this._regs.set(handle, path);
                  try { frameWin.top.postMessage({ __VFS__: true, kind: 'observePath', path }, '*'); } catch(e){}
                  return;
                }
                if (this._native) return this._native.observe(handle);
                throw new TypeError('Failed to execute "observe" on "FileSystemObserver": parameter 1 is not of type "FileSystemHandle"');
              }
              unobserve(handle) {
                if (this._regs.has(handle)) {
                  const path = this._regs.get(handle);
                  this._regs.delete(handle);
                  try { frameWin.top.postMessage({ __VFS__: true, kind: 'unobservePath', path }, '*'); } catch(e){}
                  return;
                }
                if (this._native) return this._native.unobserve(handle);
              }
            }

            try {
              frameWin.FileSystemObserver = FileSystemObserverShim;
            } catch (e) {}
          })();

  let injectedFiles = [];
  let activeInput = null;
  let pickerMode = null; // 'input' | 'picker'
  let allFilesReceived = false;
  let pickerCancelled = false;
  let fileChunks = {}; // store chunks by path: { path: [buffer1, buffer2, ...] }

  function normalizeVfsPath(path) {
    if (typeof path !== 'string') return path;
    return path.startsWith('/') ? path.slice(1) : path;
  }

  function normalizeMimeType(type) {
    if (!type) return 'application/octet-stream';
    if (typeof type === 'string') return type;
    if (type.type) return type.type;
    return 'application/octet-stream';
  }

  function injectIntoActiveInput() {
    if (!activeInput) return;

    const targetInput = activeInput;
    const dt = new DataTransfer();
    for (const file of injectedFiles) {
      dt.items.add(file);
    }

    const filesList = dt.files;
    try {
      frameWin.Object.defineProperty(targetInput, 'files', {
        configurable: true,
        enumerable: true,
        get: () => filesList
      });
    } catch (e) {}

    try {
      const fileName = filesList && filesList.length ? filesList[0].name : '';
      frameWin.Object.defineProperty(targetInput, 'value', {
        configurable: true,
        enumerable: true,
        get: () => fileName ? `C:\\fakepath\\${fileName}` : ''
      });
    } catch (e) {}

    try {
      targetInput.dispatchEvent(new Event('input', { bubbles: true }));
    } catch (e) {}

    try {
      targetInput.dispatchEvent(new Event('change', { bubbles: true }));
    } catch (e) {}

    try {
      if (typeof targetInput.oninput === 'function') {
        targetInput.oninput(new Event('input', { bubbles: true }));
      }
    } catch (e) {}

    try {
      if (typeof targetInput.onchange === 'function') {
        targetInput.onchange(new Event('change', { bubbles: true }));
      }
    } catch (e) {}

    // cleanup
    injectedFiles = [];
    activeInput = null;
    pickerMode = null;
    allFilesReceived = false;
  }

  function waitUntilFiles() {
    return new Promise((resolve, reject) => {
      const i = setInterval(() => {
        if (pickerCancelled) {
          clearInterval(i);
          pickerCancelled = false;
          reject(new DOMException('The user aborted a request.', 'AbortError'));
          return;
        }
        if (allFilesReceived) {
          clearInterval(i);
          resolve();
        }
      }, 50);
      setTimeout(() => {clearInterval(i)}, 60000); // safety timeout
    });
  }

  frameWin.__gbReceiveVfsPayload = function (payload) {
    try {
      const evt = new frameWin.MessageEvent('message', { data: payload });
      frameWin.dispatchEvent(evt);
    } catch (e) {}
  };

  // 📨 Receive files
  frameWin.addEventListener('message', e => {
    const d = e.data;
    if (!d || d.__VFS__ !== true) return;

    if (d.kind === 'pickerCancelled') {
      pickerCancelled = true;
      return;
    }

    if (d.kind === 'file') {
      // Handle chunked file messages
        if (d.totalChunks && d.totalChunks > 1) {
          const pathKey = d.path || d.name;
          if (!fileChunks[pathKey]) {
            // use fill(null) to avoid sparse-array holes so .every() checks work
            fileChunks[pathKey] = {
              chunks: new Array(d.totalChunks).fill(null),
              metadata: {
                name: d.name,
                type: d.type,
                path: d.path,
                webkitRelativePath: d.webkitRelativePath
              }
            };
          }

          // Store chunk at correct index
          fileChunks[pathKey].chunks[d.chunkIndex] = d.buffer;

          // Check if all chunks received (no null left)
          const allChunksReceived = fileChunks[pathKey].chunks.every(c => c !== null);

          if (allChunksReceived) {
            // Combine chunks into single buffer
            const validChunks = fileChunks[pathKey].chunks; // no nulls remain

            const totalBytes = validChunks.reduce((sum, chunk) => sum + (chunk?.byteLength || 0), 0);
            const combinedBuffer = new Uint8Array(totalBytes);
            let offset = 0;
            for (const chunk of validChunks) {
              if (chunk && chunk.byteLength >= 0) {
                combinedBuffer.set(new Uint8Array(chunk), offset);
                offset += chunk.byteLength;
              }
            }

            const metadata = fileChunks[pathKey].metadata;
            const file = new File([combinedBuffer.buffer], metadata.name, {
              type: normalizeMimeType(metadata.type)
            });

            if (metadata.webkitRelativePath) {
              frameWin.Object.defineProperty(file, 'webkitRelativePath', {
                value: metadata.webkitRelativePath
              });
            }

            const rawPath = (metadata.path || metadata.webkitRelativePath || metadata.name) || metadata.name;
            const normPath = normalizeVfsPath(rawPath);
            file.fullPath = normPath;

            const syntheticHandle = {
              kind: 'file',
              name: metadata.name,
              path: normPath
            };

            try { file.handle = syntheticHandle; file.fileHandle = syntheticHandle; } catch (e) {}

            injectedFiles.push(file);
            delete fileChunks[pathKey];

            // Check if this is the last file
            if (d.lastOne) {
              if (pickerMode === 'input') {
                injectIntoActiveInput();
              } else if (pickerMode === 'picker') {
                allFilesReceived = true;
              }
            }
          }
          return;
        }
      
      // Handle non-chunked files (original path)
      const file = new File([d.buffer], d.name, {
        type: normalizeMimeType(d.type)
      });

      if (d.webkitRelativePath) {
        frameWin.Object.defineProperty(file, 'webkitRelativePath', {
          value: d.webkitRelativePath
        });
      }

      const rawPath = (d.path || d.webkitRelativePath || d.name) || d.name;
      const normPath = normalizeVfsPath(rawPath);
      file.fullPath = normPath;

      const syntheticHandle = {
        kind: 'file',
        name: d.name,
        path: normPath
      };

      try { file.handle = syntheticHandle; file.fileHandle = syntheticHandle; } catch (e) {}

      injectedFiles.push(file);
      
      // Check if this is the last file
      if (d.lastOne) {
        if (pickerMode === 'input') {
          injectIntoActiveInput();
        } else if (pickerMode === 'picker') {
          allFilesReceived = true;
        }
      }
    }
  });

  // 📂 showOpenFilePicker
  frameWin.showOpenFilePicker = async () => {
    try { frameWin.gbextern.exitFullscreen(); } catch(e) {}
    await window.protectedGlobals.onlyloadTree();
    pickerMode = 'picker';
    allFilesReceived = false;
    pickerCancelled = false;
    injectedFiles = [];

    await window.browserGlobals.showOpenFilePicker(frameWin);

    try {
      await waitUntilFiles();
      const files = injectedFiles.slice();
      return files.map(file => makeFileHandle(file));
    } finally {
      injectedFiles = [];
      allFilesReceived = false;
      pickerMode = null;
    }
  };


// 💾 showSaveFilePicker (fixed)
let pendingSaveResolvers = [];

frameWin.addEventListener('message', e => {
  const d = e.data;
  if (!d || d.__VFS__ !== true) return;

  if (d.kind === 'saveTarget') {
    const next = pendingSaveResolvers.shift();
    if (!next) return;

    // user canceled
    if (!d.path) {
      next.reject(
        new DOMException('The user aborted a request.', 'AbortError')
      );
      return;
    }

    next.resolve(normalizeVfsPath(d.path));
  }
});

frameWin.showSaveFilePicker = async (options = {}) => {
  await window.protectedGlobals.onlyloadTree();
  try {
  frameWin.gbextern.exitFullscreen();
  } catch(e) {}
  return new Promise((resolve, reject) => {
    pendingSaveResolvers.push({ resolve, reject });
    window.browserGlobals.showSaveFilePicker(frameWin, {
      suggestedName: options.suggestedName || null,
      types: options.types || null,
    });
  }).then(path => {
    const h = new FileSystemFileHandle();
    h.kind = 'file';
    h.path = path;
    h.name = path.split('/').pop() || options.suggestedName || 'untitled';

    return h;
  });
};


  // � showDirectoryPicker
  let pendingDirectoryResolvers = [];
  let pendingDirectoryRejectors = [];
  frameWin.addEventListener('message', e => {
    const d = e.data;
    if (!d || d.__VFS__ !== true) return;
    if (d.kind === 'directoryTarget') {
      if (!d.path) {
        for (const rej of pendingDirectoryRejectors) {
          try {
            rej(new DOMException('The user aborted a request.', 'AbortError'));
          } catch (e) {}
        }
        pendingDirectoryResolvers = [];
        pendingDirectoryRejectors = [];
        return;
      }
      const normalizedPath = normalizeVfsPath(d.path);
      for (const r of pendingDirectoryResolvers) try { r(normalizedPath, d.treeNode); } catch(e){}
      pendingDirectoryResolvers = [];
      pendingDirectoryRejectors = [];
    }
  });

  frameWin.showDirectoryPicker = async (options) => {
    await window.protectedGlobals.onlyloadTree();
    try { frameWin.gbextern.exitFullscreen(); } catch(e) {}
    return new Promise((resolve, reject) => {
      pendingDirectoryRejectors.push(reject);
      pendingDirectoryResolvers.push((path, treeNode) => {
        const h = new FileSystemDirectoryHandle();
        h.name = path.split('/').pop() || 'root';
        h.kind = 'directory';
        h.path = path;
        h._treeNode = treeNode; // store for entries() iteration
        




        resolve(h);
      });
      window.browserGlobals.showDirectoryPicker(frameWin);
    });
  };
let pendingFileRequests = new Map();

frameWin.addEventListener('message', e => {
  const d = e.data;
  if (!d || d.__VFS__ !== true) return;

  if (d.kind === 'fileData') {
    const pending = pendingFileRequests.get(d.path);
    if (!pending || pending.length === 0) return;

    pendingFileRequests.delete(d.path);

    const file = new File(
      [d.buffer],
      d.name,
      { type: d.type || 'application/octet-stream' }
    );

    file.fullPath = normalizeVfsPath(d.path);
    for (const req of pending) {
      try { req.resolve(file); } catch (e) {}
    }
    return;
  }

  if (d.kind === 'fileError') {
    const pending = pendingFileRequests.get(d.path);
    if (!pending || pending.length === 0) return;

    pendingFileRequests.delete(d.path);
    const error = new Error(d.message || 'File request failed');
    for (const req of pending) {
      try { req.reject(error); } catch (e) {}
    }
    return;
  }
});

// ---- now override getFile ----
FileSystemFileHandle.prototype.getFile = async function () {
  if (this._file) return this._file;
  if (this._pendingFilePromise) return this._pendingFilePromise;
  if (this._createdEmpty) {
    const emptyFile = new File([], this.name || 'untitled', { type: 'application/octet-stream' });
    try {
      emptyFile.fullPath = normalizeVfsPath(this.path || this.name || '');
      emptyFile.handle = this;
      emptyFile.fileHandle = this;
    } catch (e) {}
    this._file = emptyFile;
    return emptyFile;
  }

  if (!this.path) {
    throw new Error('File not available');
  }

  const pendingPromise = new Promise((resolve, reject) => {
    const pathKey = this.path;
    const pending = pendingFileRequests.get(pathKey) || [];
    const requestEntry = { resolve, reject };
    pending.push(requestEntry);
    pendingFileRequests.set(pathKey, pending);

    window.browserGlobals.requestFileForFrame(frameWin, {
      path: pathKey,
      name: this.name,
    }).catch(err => {
      const active = pendingFileRequests.get(pathKey);
      if (!active || active.length === 0) return;
      const idx = active.indexOf(requestEntry);
      if (idx !== -1) active.splice(idx, 1);
      if (active.length === 0) pendingFileRequests.delete(pathKey);
      reject(err);
    });

    setTimeout(() => {
      const active = pendingFileRequests.get(pathKey);
      if (!active || active.length === 0) return;
      const idx = active.indexOf(requestEntry);
      if (idx !== -1) active.splice(idx, 1);
      if (active.length === 0) pendingFileRequests.delete(pathKey);
      reject(new Error('File request timed out'));
    }, 30000);
  });

  this._pendingFilePromise = pendingPromise;

  try {
    const file = await pendingPromise;
    this._file = file;
    return file;
  } finally {
    if (this._pendingFilePromise === pendingPromise) {
      this._pendingFilePromise = null;
    }
  }
};


  // �📎 <input type="file">
  frameWin.document.addEventListener(
    'click',
    e => {
      const path = e.composedPath ? e.composedPath() : [];
      const input = path.find(node => node && node.tagName === 'INPUT' && node.type === 'file') ||
        (e.target && e.target.tagName === 'INPUT' && e.target.type === 'file' ? e.target : null);
      if (!input) return;

      e.preventDefault();
      e.stopImmediatePropagation();

      activeInput = input;
      pickerMode = 'input';
      allFilesReceived = false;
      pickerCancelled = false;
      injectedFiles = [];

      // Trigger the file picker for the input element
      (async () => {
        try {
          await window.browserGlobals.showOpenFilePicker(frameWin);
          await waitUntilFiles();
        } catch (err) {
          if (activeInput === input) {
            activeInput = null;
            pickerMode = null;
            injectedFiles = [];
          }
        }
      })();
    },
    true
  );
})();