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

                (function installIndexedDBShim() {
                  if (frameWin.__gbIndexedDBShimInstalled) return;
                  frameWin.__gbIndexedDBShimInstalled = true;

                  const nativeIndexedDB = frameWin.indexedDB;

                  function cloneValue(value) {
                    try {
                      return frameWin.structuredClone(value);
                    } catch (e) {
                      try {
                        return JSON.parse(JSON.stringify(value));
                      } catch (ee) {
                        return value;
                      }
                    }
                  }

                  function emitEvent(target, eventName, payload) {
                    const handler = target['on' + eventName];
                    if (!handler) return;
                    try {
                      handler(payload);
                    } catch (e) {}
                  }

                  function dispatchAsync(target, eventName, payload) {
                    Promise.resolve().then(function () {
                      emitEvent(target, eventName, payload);
                    });
                  }

                  function toDomStringList(values) {
                    const list = {
                      contains: function (v) {
                        return values.indexOf(v) !== -1;
                      },
                      item: function (idx) {
                        return values[idx] || null;
                      },
                      forEach: function (cb) {
                        return values.forEach(cb);
                      },
                      [Symbol.iterator]: function* () {
                        for (const value of values) {
                          yield value;
                        }
                      },
                    };
                    frameWin.Object.defineProperty(list, 'length', {
                      get: function () {
                        return values.length;
                      },
                    });
                    return list;
                  }

                  function getOriginKey() {
                    try {
                      return new URL(frameWin.location.href).origin;
                    } catch (e) {
                      try {
                        return String(frameWin.location.origin || 'null');
                      } catch (ee) {
                        return 'null';
                      }
                    }
                  }

                  const IDB_FS_PATH = (frameWin.top && frameWin.top.browserGlobals && frameWin.top.browserGlobals.indexedDbPath)
                    ? frameWin.top.browserGlobals.indexedDbPath
                    : '/systemfiles/runtime/apps/browser/profile/localstorage/indexeddb.json';

                  let allDbStateCache = null;
                  let allDbStateLoadPromise = null;
                  let allDbStateWriteQueue = Promise.resolve();

                  async function loadAllDbState() {
                    if (allDbStateCache) return allDbStateCache;
                    if (allDbStateLoadPromise) return allDbStateLoadPromise;

                    allDbStateLoadPromise = (async function () {
                      let raw = '';
                      try {
                        const fileRes = await frameWin.top.protectedGlobals.ReadFile(IDB_FS_PATH);
                        raw = fileRes && fileRes.filecontent ? fileRes.filecontent : '';
                      } catch (e) {
                        raw = '';
                      }

                      if (!raw) {
                        raw = btoa(JSON.stringify({ origins: {} }));
                        await frameWin.top.protectedGlobals.WriteFile(IDB_FS_PATH, raw);
                      }

                      let parsed = { origins: {} };
                      try {
                        const decoded = frameWin.top.browserGlobals.decodeMaybeBase64(raw);
                        parsed = JSON.parse(decoded || '{}');
                      } catch (e) {
                        parsed = { origins: {} };
                      }

                      if (!parsed || !parsed.origins) {
                        parsed = { origins: {} };
                      }

                      allDbStateCache = parsed;
                      return allDbStateCache;
                    })().finally(function () {
                      allDbStateLoadPromise = null;
                    });

                    return allDbStateLoadPromise;
                  }

                  function queuePersistAllDbState() {
                    allDbStateWriteQueue = allDbStateWriteQueue
                      .then(async function () {
                        const payload = allDbStateCache && allDbStateCache.origins
                          ? allDbStateCache
                          : { origins: {} };
                        await frameWin.top.protectedGlobals.WriteFile(
                          IDB_FS_PATH,
                          btoa(JSON.stringify(payload)),
                        );
                      })
                      .catch(function () {});

                    return allDbStateWriteQueue;
                  }

                  function getOriginBucket(allState) {
                    const originKey = getOriginKey();
                    if (!allState.origins[originKey]) {
                      allState.origins[originKey] = {};
                    }
                    return allState.origins[originKey];
                  }

                  function persistDbState(name, state) {
                    if (!allDbStateCache || !allDbStateCache.origins) {
                      allDbStateCache = { origins: {} };
                    }
                    const bucket = getOriginBucket(allDbStateCache);
                    bucket[String(name)] = state;
                    queuePersistAllDbState();
                  }

                  function makeRequest(run) {
                    const request = {
                      result: undefined,
                      error: null,
                      onsuccess: null,
                      onerror: null,
                    };
                    Promise.resolve()
                      .then(run)
                      .then(function (result) {
                        request.result = result;
                        dispatchAsync(request, 'success', { target: request, type: 'success' });
                      })
                      .catch(function (error) {
                        request.error = error;
                        dispatchAsync(request, 'error', { target: request, type: 'error' });
                      });
                    return request;
                  }

                  function getStoreMeta(state, storeName) {
                    const store = state.stores[storeName];
                    if (!store) {
                      throw new DOMException('frameWin.Object store not found', 'NotFoundError');
                    }
                    return store;
                  }

                  function normalizeStoreNames(storeNames) {
                    if (Array.isArray(storeNames)) return storeNames.map(String);
                    return [String(storeNames)];
                  }

                  function resolveKey(store, value, key, allowAutoIncrement) {
                    if (key !== undefined) return key;

                    if (store.keyPath) {
                      if (store.keyPath.indexOf('.') === -1) {
                        const kp = store.keyPath;
                        if (value && frameWin.Object.prototype.hasOwnProperty.call(value, kp)) {
                          return value[kp];
                        }
                        if (store.autoIncrement && allowAutoIncrement) {
                          store.__autoIncrement = Number(store.__autoIncrement || 1);
                          const generated = store.__autoIncrement;
                          store.__autoIncrement += 1;
                          try {
                            value[kp] = generated;
                          } catch (e) {}
                          return generated;
                        }
                        throw new DOMException('Key path not found', 'DataError');
                      }
                      throw new DOMException('Nested keyPath is not supported by this shim', 'DataError');
                    }

                    if (store.autoIncrement && allowAutoIncrement) {
                      store.__autoIncrement = Number(store.__autoIncrement || 1);
                      const generated = store.__autoIncrement;
                      store.__autoIncrement += 1;
                      return generated;
                    }

                    throw new DOMException('A key is required for this object store', 'DataError');
                  }

                  function keyToRecordKey(key) {
                    return JSON.stringify(key);
                  }

                  function createIDBIndex(dbState, dbName, storeName, indexName) {
                    return {
                      get: function (queryValue) {
                        return makeRequest(function () {
                          const store = getStoreMeta(dbState, storeName);
                          const index = store.indexes && store.indexes[indexName];
                          if (!index) {
                            throw new DOMException('Index not found', 'NotFoundError');
                          }
                          const data = store.data || {};
                          const keys = frameWin.Object.keys(data);
                          for (const key of keys) {
                            const row = data[key];
                            const value = row && row.value;
                            if (value && value[index.keyPath] === queryValue) {
                              return cloneValue(value);
                            }
                          }
                          return undefined;
                        });
                      },
                    };
                  }

                  function createIDBObjectStore(dbState, dbName, storeName, mode) {
                    return {
                      name: storeName,
                      put: function (value, key) {
                        return makeRequest(function () {
                          const store = getStoreMeta(dbState, storeName);
                          const resolvedKey = resolveKey(store, value, key, true);
                          const recordKey = keyToRecordKey(resolvedKey);
                          store.data = store.data || {};
                          store.data[recordKey] = {
                            key: cloneValue(resolvedKey),
                            value: cloneValue(value),
                          };
                          persistDbState(dbName, dbState);
                          return cloneValue(resolvedKey);
                        });
                      },
                      add: function (value, key) {
                        return makeRequest(function () {
                          const store = getStoreMeta(dbState, storeName);
                          const resolvedKey = resolveKey(store, value, key, true);
                          const recordKey = keyToRecordKey(resolvedKey);
                          store.data = store.data || {};
                          if (frameWin.Object.prototype.hasOwnProperty.call(store.data, recordKey)) {
                            throw new DOMException('Key already exists', 'ConstraintError');
                          }
                          store.data[recordKey] = {
                            key: cloneValue(resolvedKey),
                            value: cloneValue(value),
                          };
                          persistDbState(dbName, dbState);
                          return cloneValue(resolvedKey);
                        });
                      },
                      get: function (key) {
                        return makeRequest(function () {
                          const store = getStoreMeta(dbState, storeName);
                          const recordKey = keyToRecordKey(key);
                          const row = (store.data || {})[recordKey];
                          return row ? cloneValue(row.value) : undefined;
                        });
                      },
                      getAll: function () {
                        return makeRequest(function () {
                          const store = getStoreMeta(dbState, storeName);
                          const data = store.data || {};
                          return frameWin.Object.keys(data).map(function (k) {
                            return cloneValue(data[k].value);
                          });
                        });
                      },
                      delete: function (key) {
                        return makeRequest(function () {
                          if (mode === 'readonly') {
                            throw new DOMException('Transaction is readonly', 'ReadOnlyError');
                          }
                          const store = getStoreMeta(dbState, storeName);
                          const recordKey = keyToRecordKey(key);
                          if (store.data) {
                            delete store.data[recordKey];
                            persistDbState(dbName, dbState);
                          }
                          return undefined;
                        });
                      },
                      clear: function () {
                        return makeRequest(function () {
                          if (mode === 'readonly') {
                            throw new DOMException('Transaction is readonly', 'ReadOnlyError');
                          }
                          const store = getStoreMeta(dbState, storeName);
                          store.data = {};
                          persistDbState(dbName, dbState);
                          return undefined;
                        });
                      },
                      count: function () {
                        return makeRequest(function () {
                          const store = getStoreMeta(dbState, storeName);
                          return frameWin.Object.keys(store.data || {}).length;
                        });
                      },
                      createIndex: function (name, keyPath, options) {
                        if (mode === 'readonly') {
                          throw new DOMException('Transaction is readonly', 'ReadOnlyError');
                        }
                        const store = getStoreMeta(dbState, storeName);
                        store.indexes = store.indexes || {};
                        store.indexes[name] = {
                          keyPath: String(keyPath),
                          unique: !!(options && options.unique),
                        };
                        persistDbState(dbName, dbState);
                        return createIDBIndex(dbState, dbName, storeName, name);
                      },
                      index: function (name) {
                        return createIDBIndex(dbState, dbName, storeName, name);
                      },
                    };
                  }

                  function createIDBTransaction(dbState, dbName, storeNames, mode) {
                    const normalizedMode = mode || 'readonly';
                    const normalizedStores = normalizeStoreNames(storeNames);
                    const tx = {
                      mode: normalizedMode,
                      objectStore: function (name) {
                        if (normalizedStores.indexOf(String(name)) === -1) {
                          throw new DOMException('Store is not in this transaction scope', 'NotFoundError');
                        }
                        return createIDBObjectStore(dbState, dbName, String(name), normalizedMode);
                      },
                      oncomplete: null,
                      onerror: null,
                      onabort: null,
                      abort: function () {
                        dispatchAsync(tx, 'abort', { target: tx, type: 'abort' });
                      },
                    };

                    Promise.resolve().then(function () {
                      dispatchAsync(tx, 'complete', { target: tx, type: 'complete' });
                    });

                    return tx;
                  }

                  function createIDBDatabase(dbState, dbName) {
                    return {
                      name: dbName,
                      get version() {
                        return Number(dbState.version || 0);
                      },
                      get objectStoreNames() {
                        return toDomStringList(frameWin.Object.keys(dbState.stores || {}));
                      },
                      close: function () {},
                      createObjectStore: function (name, options) {
                        const storeName = String(name);
                        if (dbState.stores[storeName]) {
                          throw new DOMException('frameWin.Object store already exists', 'ConstraintError');
                        }
                        dbState.stores[storeName] = {
                          name: storeName,
                          keyPath: options && options.keyPath !== undefined ? String(options.keyPath) : null,
                          autoIncrement: !!(options && options.autoIncrement),
                          __autoIncrement: 1,
                          data: {},
                          indexes: {},
                        };
                        persistDbState(dbName, dbState);
                        return createIDBObjectStore(dbState, dbName, storeName, 'readwrite');
                      },
                      deleteObjectStore: function (name) {
                        const storeName = String(name);
                        if (!dbState.stores[storeName]) {
                          throw new DOMException('frameWin.Object store not found', 'NotFoundError');
                        }
                        delete dbState.stores[storeName];
                        persistDbState(dbName, dbState);
                      },
                      transaction: function (storeNames, mode) {
                        return createIDBTransaction(dbState, dbName, storeNames, mode || 'readonly');
                      },
                    };
                  }

                  function makeOpenRequest(name, version) {
                    const request = {
                      result: undefined,
                      error: null,
                      onsuccess: null,
                      onerror: null,
                      onupgradeneeded: null,
                    };

                    Promise.resolve().then(async function () {
                      try {
                        const dbName = String(name || '');
                        if (!dbName) {
                          throw new DOMException('Database name is required', 'DataError');
                        }

                        const allState = await loadAllDbState();
                        const originBucket = getOriginBucket(allState);
                        const dbState = originBucket[dbName]
                          ? originBucket[dbName]
                          : {
                              name: String(dbName),
                              version: 0,
                              stores: {},
                            };
                        originBucket[dbName] = dbState;
                        const currentVersion = Number(dbState.version || 0);
                        const requestedVersion = version === undefined ? (currentVersion || 1) : Number(version);

                        if (!Number.isFinite(requestedVersion) || requestedVersion <= 0) {
                          throw new DOMException('Invalid version', 'TypeError');
                        }
                        if (requestedVersion < currentVersion) {
                          throw new DOMException('Version is lower than current database version', 'VersionError');
                        }

                        const db = createIDBDatabase(dbState, dbName);
                        request.result = db;

                        if (requestedVersion > currentVersion) {
                          dbState.version = requestedVersion;
                          persistDbState(dbName, dbState);
                          dispatchAsync(request, 'upgradeneeded', {
                            target: request,
                            type: 'upgradeneeded',
                            oldVersion: currentVersion,
                            newVersion: requestedVersion,
                          });
                        }

                        dispatchAsync(request, 'success', { target: request, type: 'success' });
                      } catch (error) {
                        request.error = error;
                        dispatchAsync(request, 'error', { target: request, type: 'error' });
                      }
                    });

                    return request;
                  }

                  const shimIndexedDB = {
                    open: function (name, version) {
                      return makeOpenRequest(name, version);
                    },
                    deleteDatabase: function (name) {
                      const request = {
                        result: undefined,
                        error: null,
                        onsuccess: null,
                        onerror: null,
                        onblocked: null,
                      };
                      Promise.resolve().then(async function () {
                        try {
                          const allState = await loadAllDbState();
                          const bucket = getOriginBucket(allState);
                          delete bucket[String(name)];
                          queuePersistAllDbState();
                          dispatchAsync(request, 'success', { target: request, type: 'success' });
                        } catch (error) {
                          request.error = error;
                          dispatchAsync(request, 'error', { target: request, type: 'error' });
                        }
                      });
                      return request;
                    },
                    databases: async function () {
                      const out = [];
                      const allState = await loadAllDbState();
                      const bucket = getOriginBucket(allState);
                      const dbNames = frameWin.Object.keys(bucket);
                      for (const dbName of dbNames) {
                        const state = bucket[dbName] || { version: 0 };
                        out.push({ name: dbName, version: Number(state.version || 0) });
                      }
                      return out;
                    },
                    cmp: function (first, second) {
                      const a = JSON.stringify(first);
                      const b = JSON.stringify(second);
                      if (a === b) return 0;
                      return a > b ? 1 : -1;
                    },
                  };

                  function defineWindowProp(name, value) {
                    frameWin.Object.defineProperty(frameWin, name, {
                      configurable: true,
                      enumerable: true,
                      writable: true,
                      value,
                    });
                  }

                  try {
                    defineWindowProp('indexedDB', shimIndexedDB);
                    defineWindowProp('mozIndexedDB', shimIndexedDB);
                    defineWindowProp('webkitIndexedDB', shimIndexedDB);
                    defineWindowProp('msIndexedDB', shimIndexedDB);

                    if (!frameWin.IDBDatabase) {
                      defineWindowProp('IDBDatabase', function IDBDatabase() {});
                    }
                    if (!frameWin.IDBObjectStore) {
                      defineWindowProp('IDBObjectStore', function IDBObjectStore() {});
                    }
                    if (!frameWin.IDBTransaction) {
                      defineWindowProp('IDBTransaction', function IDBTransaction() {});
                    }
                    if (!frameWin.IDBRequest) {
                      defineWindowProp('IDBRequest', function IDBRequest() {});
                    }
                    if (!frameWin.IDBOpenDBRequest) {
                      defineWindowProp('IDBOpenDBRequest', function IDBOpenDBRequest() {});
                    }
                  } catch (e) {
                    try {
                      if (nativeIndexedDB) {
                        defineWindowProp('indexedDB', nativeIndexedDB);
                        defineWindowProp('mozIndexedDB', nativeIndexedDB);
                        defineWindowProp('webkitIndexedDB', nativeIndexedDB);
                        defineWindowProp('msIndexedDB', nativeIndexedDB);
                      }
                    } catch (ee) {}
                  }
                })();
          // Provide synthetic FileSystemHandle classes so libraries that use instanceof
          // checks (e.g., FileSystemObserver) accept our synthetic handles.
          function FileSystemHandle() {}
          function FileSystemFileHandle() { FileSystemHandle.call(this); }
          FileSystemFileHandle.prototype = frameWin.Object.create(FileSystemHandle.prototype);
          FileSystemFileHandle.prototype.constructor = FileSystemFileHandle;
          function FileSystemDirectoryHandle() { FileSystemHandle.call(this); }
          FileSystemDirectoryHandle.prototype = frameWin.Object.create(FileSystemHandle.prototype);
          FileSystemDirectoryHandle.prototype.constructor = FileSystemDirectoryHandle;

          // Polyfill common methods on prototypes so returned handles behave like
          // native FileSystemHandle objects.

FileSystemFileHandle.prototype.getFile = async function () {
  return this._file;
};

FileSystemFileHandle.prototype.createWritable = async function () {
  const path = this.path;
  const name = this.name;

  // Delegate to native handle if present
  try {
    if (this._file && (this._file.handle || this._file.fileHandle)) {
      const h = this._file.handle || this._file.fileHandle;
      if (h.createWritable) return await h.createWritable();
    }
  } catch {}

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

      // Return a promise that resolves when the request is sent
        window.browserGlobals.handleVfsSaveFile(frameWin, {
          __VFS__: true,
          kind: 'saveFile',
          path,
          name,
          buffer,
        });
return Promise.resolve();
    },

    async close() {
      closed = true;
      // Give a small delay to ensure previous writes are processed
      await new Promise(r => setTimeout(r, 10));
      window.browserGlobals.handleVfsSaveFile(frameWin, {
        __VFS__: true,
        kind: 'saveFile',
        path,
        name,
        lastOne: true,
      });
    },

    async abort(reason) {
      closed = true;
      window.browserGlobals.handleVfsSaveFile(frameWin, {
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
  await new Promise((resolve) => {
    window.browserGlobals.handleVfsSaveFile(frameWin, {
      __VFS__: true,
      kind: 'saveFile',
      path,
      name,
      buffer,
    });

    resolve();
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
              return !!(h && (h.path || h.name) && typeof h.getFile === 'function');
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

    const dt = new DataTransfer();
    for (const file of injectedFiles) {
      dt.items.add(file);
    }

    frameWin.Object.defineProperty(activeInput, 'files', {
      configurable: true,
      get: () => dt.files
    });

    activeInput.dispatchEvent(new Event('change', { bubbles: true }));

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
      }, 10);
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
              if (chunk && chunk.byteLength > 0) {
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
    return new Promise((resolve, reject) => {
      pendingDirectoryRejectors.push(reject);
      pendingDirectoryResolvers.push((path, treeNode) => {
        const h = new FileSystemDirectoryHandle();
        h.name = path.split('/').pop() || 'root';
        h.kind = 'directory';
        h.path = path;
        h._treeNode = treeNode; // store for entries() iteration
        
        // entries() method to iterate over directory contents
        h.entries = async function* () {
          if (!this._treeNode || !Array.isArray(this._treeNode[1])) return;
          for (const child of this._treeNode[1]) {
            const name = child[0];
            const isFolder = Array.isArray(child[1]);
            if (isFolder) {
const dirHandle = new FileSystemDirectoryHandle();
dirHandle.name = name;
dirHandle.kind = 'directory';
dirHandle.path = (this.path ? this.path + '/' : '') + name;
dirHandle._treeNode = child;

// attach ALL directory methods
dirHandle.entries = this.entries;
dirHandle.values = this.values;
dirHandle.keys = this.keys;
dirHandle.getDirectoryHandle = this.getDirectoryHandle;
dirHandle.getFileHandle = this.getFileHandle;
dirHandle.isSameEntry = this.isSameEntry;

yield [name, dirHandle];

            } else {
              const fileHandle = new FileSystemFileHandle();
              fileHandle.name = name;
              fileHandle.kind = 'file';
              fileHandle.path = (this.path ? this.path + '/' : '') + name;
              yield [name, fileHandle];
            }
          }
        };

        // values() method
        h.values = async function* () {
          for await (const [, handle] of this.entries()) {
            yield handle;
          }
        };

        // keys() method
        h.keys = async function* () {
          for await (const [name] of this.entries()) {
            yield name;
          }
        };

        // getDirectoryHandle(name) method
        h.getDirectoryHandle = async function(name, options = {}) {
          if (!this._treeNode || !Array.isArray(this._treeNode[1])) {
            throw new DOMException(this.name + ' is not a directory', 'NotADirectoryError');
          }
          let child = this._treeNode[1].find(c => c[0] === name);
          if (!child) {
            if (options && options.create) {
              // Create a new in-memory directory node so subsequent operations
              // (entries, getFileHandle, etc.) can operate on it.
              const newNode = [name, []];
              if (!Array.isArray(this._treeNode[1])) this._treeNode[1] = [];
              this._treeNode[1].push(newNode);
              child = newNode;
            } else {
              throw new DOMException('A directory with the name "' + name + '" was not found.', 'NotFoundError');
            }
          }
          if (!Array.isArray(child[1])) {
            throw new DOMException('"' + name + '" is not a directory', 'TypeMismatchError');
          }
          const dirHandle = new FileSystemDirectoryHandle();
          dirHandle.name = name;
          dirHandle.kind = 'directory';
          dirHandle.path = this.path + '/' + name;
          dirHandle._treeNode = child;
          dirHandle.entries = this.entries;
          dirHandle.values = this.values;
          dirHandle.keys = this.keys;
          dirHandle.getDirectoryHandle = this.getDirectoryHandle;
          dirHandle.getFileHandle = this.getFileHandle;
          dirHandle.isSameEntry = this.isSameEntry;
          return dirHandle;
        };

        // getFileHandle(name) method
        h.getFileHandle = async function(name, options = {}) {
          if (!this._treeNode || !Array.isArray(this._treeNode[1])) {
            throw new DOMException('' + this.name + ' is not a directory', 'NotADirectoryError');
          }
          const child = this._treeNode[1].find(c => c[0] === name);
          if (!child) {
            // Allow creation of new files when requested. We don't mutate the
            // host tree here; instead return a handle pointing at the intended
            // path so \`createWritable()\` will route writes through the VFS.
            if (options && options.create) {
              const fileHandle = new FileSystemFileHandle();
              fileHandle.name = name;
              fileHandle.kind = 'file';
              fileHandle.path = this.path + '/' + name;
              return fileHandle;
            }
            throw new DOMException('A file with the name "' + name + '" was not found.', 'NotFoundError');
          }
          if (Array.isArray(child[1])) {
            throw new DOMException('"' + name + '" is not a file', 'TypeMismatchError');
          }
          const fileHandle = new FileSystemFileHandle();
          fileHandle.name = name;
          fileHandle.kind = 'file';
          fileHandle.path = this.path + '/' + name;
          return fileHandle;
        };

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
    const req = pendingFileRequests.get(d.path);
    if (!req) return;

    pendingFileRequests.delete(d.path);

    const file = new File(
      [d.buffer],
      d.name,
      { type: d.type || 'application/octet-stream' }
    );

    file.fullPath = normalizeVfsPath(d.path);
    req.resolve(file);
  }
});

// ---- now override getFile ----
FileSystemFileHandle.prototype.getFile = async function () {
  if (this._file) return this._file;

  if (!this.path) {
    throw new Error('File not available');
  }

  const file = await new Promise((resolve, reject) => {
    pendingFileRequests.set(this.path, { resolve, reject });
    window.browserGlobals.requestFileForFrame(frameWin, {
      path: this.path,
      name: this.name,
    });

    setTimeout(() => {
      if (pendingFileRequests.has(this.path)) {
        pendingFileRequests.delete(this.path);
        
        reject(new Error('File request timed out'));
      }
    }, 30000);
  });

  this._file = file;
  return file;
};


  // �📎 <input type="file">
  frameWin.document.addEventListener(
    'click',
    e => {
      const input = e.target;
      if (!(input instanceof frameWin.HTMLInputElement)) return;
      if (input.type !== 'file') return;

      e.preventDefault();
      e.stopImmediatePropagation();

      activeInput = input;
      pickerMode = 'input';

      window.browserGlobals.showOpenFilePicker(frameWin, {
        allowMultiple: input.multiple,
        allowDirectory: input.hasAttribute('webkitdirectory')
      });
    },
    true
  );
})();