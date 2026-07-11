"use strict";

console.log('indexedDB patch loaded');
Object.defineProperty(frameWin, "indexedDB", {
  value: {
    open(name, version) {
      function base64ToArrayBuffer(base64) {
        const bin = atob(base64);
        const bytes = new Uint8Array(bin.length);

        for (let i = 0; i < bin.length; i++) {
          bytes[i] = bin.charCodeAt(i);
        }

        return bytes.buffer;
      }
      function arrayBufferToBase64(buffer) {
        const bytes = new Uint8Array(buffer);
        const chunkSize = 0x8000; // 32KB chunks (safe for large buffers)
        let binary = "";

        for (let i = 0; i < bytes.length; i += chunkSize) {
          binary += String.fromCharCode(...bytes.subarray(i, i + chunkSize));
        }

        return btoa(binary);
      }
      function deserialize(value) {
        // 1. detect encoded binary (legacy or current format)
        if (value && (value.__type === "bytes" || value.__bytes === true)) {
          return base64ToArrayBuffer(value.data);
        }

        // 2. arrays
        if (Array.isArray(value)) {
          return value.map(deserialize);
        }

        // 3. objects
        if (value && typeof value === "object") {
          const out = {};
          for (const k in value) {
            out[k] = deserialize(value[k]);
          }
          return out;
        }

        return value;
      }
      function serialize(value) {
        if (value instanceof frameWin.ArrayBuffer) {
          return {
            __type: "bytes",
            data: arrayBufferToBase64(value)
          };
        }

        if (Array.isArray(value)) {
          return value.map(serialize);
        }

        if (value && typeof value === "object") {
          const out = {};
          for (const k in value) {
            out[k] = serialize(value[k]);
          }
          return out;
        }

        return value;
      }
      const hydrateStores = async () => {
        try {
          const stores = await window.protectedGlobals.ReadFolder(basePath);

          for (const storeName of stores) {
            const storePath = `${basePath}/${storeName}`;
            if (storeName.includes("metadata.json")) continue;
            const files = await window.protectedGlobals.ReadFolder(storePath);

            const options = metadata.stores?.[storeName] ?? {};

            if (!db.stores[storeName]) {
                db.createObjectStore(storeName, options);
            }

            const store = db.stores[storeName];

            for (const file of files) {
              if (file === ".store") continue;

              const key = file.replace(".json", "");
              const raw = await window.protectedGlobals.ReadFile(
                `${storePath}/${file}`,
                { text: true, direct: true }
              );

              let parsed;
              try {
                parsed = JSON.parse(raw);
              } catch {
                // fallback if it's not JSON
                parsed = raw;
              }

              try {
                store.data[key] = deserialize(parsed);
              } catch (e) {
                try {
                  // fallback for raw binary stored as base64 text
                  const bin = atob(raw);
                  const arr = new Uint8Array([...bin].map(c => c.charCodeAt(0)));
                  store.data[key] = arr.buffer;
                } catch (innerErr) {
                  console.warn("Failed to hydrate key:", key, e, innerErr);
                }
              }
            }
          }
        } catch (e) {
          
          console.warn("No stores to hydrate:", e);
        }
      };
        let metadata = null;
      // =========================================================
      // REQUEST OBJECT (REAL EVENTTARGET + legacy handlers)
      // =========================================================
      class IDBRequest extends EventTarget {
        constructor(transaction = null) {
          super();

          this.transaction = transaction;
          this.result = null;
          this.error = null;
          this.readyState = "pending";

          // legacy handlers (Eaglercraft sometimes uses these)
          this.onupgradeneeded = null;
          this.onsuccess = null;
          this.onerror = null;

          // listener registry (for debugging / compatibility)
          this._listeners = new Map();
        }

        addEventListener(type, cb) {
          super.addEventListener(type, cb);

          if (!this._listeners.has(type)) {
            this._listeners.set(type, new Set());
          }
          this._listeners.get(type).add(cb);
        }

        removeEventListener(type, cb) {
          super.removeEventListener(type, cb);
          this._listeners.get(type)?.delete(cb);
        }

        dispatchEvent(event) {
          const type = event.type;

          // 1. EventTarget path
          super.dispatchEvent(event);

          // 2. legacy on* handlers (IndexedDB style)
          const handler = this["on" + type];
          if (typeof handler === "function") {
            handler.call(this, event);
          }

          return true;
        }
      }
      const request = new IDBRequest();

    const emit = (type, extra = {}) => {
        if (type === 'upgradeneeded') {
            setTimeout(async () => {
            if (db._schemaDirty) {
            const writePromise = (async () => {
                await window.protectedGlobals.WriteFile(
                `${basePath}/metadata.json`,
                JSON.stringify({
                    version,
                    stores: Object.fromEntries(
                      Object.entries(db.stores).map(([name, store]) => [
                          name,
                          {
                              keyPath: store.keyPath,
                              autoIncrement: store.autoIncrement
                          }
                      ])
                  )
                }),
                { text: true, direct: true }
                );

                for (const name of Object.keys(db.stores)) {
                await window.protectedGlobals.WriteFile(
                    `${basePath}/${name}/.store`,
                    "{}",
                    { text: true, direct: true }
                );
                }
            })();

            db._schemaWritePromise = writePromise;
            db._schemaDirty = false;
            }
        }, 100);
        }
        const event = new Event(type);

        Object.defineProperty(event, "target", {
          value: request
        });

        Object.defineProperty(event, "result", {
          value: request.result
        });

        Object.assign(event, extra);

        request.dispatchEvent(event);
    };

      // =========================================================
      // PATH ROOT
      // =========================================================
      let url = new URL(window.browserGlobals.unshuffleURL(frameWin.location.href)).hostname;
      const basePath =
        `/systemfiles/runtime/apps/browser/` +
        `${window.browserGlobals.getCurProfileName()}/localstorage/indexedDB/` +
        `${url}/${name}`;

      // =========================================================
      // DB CORE
      // =========================================================
      const db = {
        name,
        version,
        stores: {},

        objectStoreNames: {
          _set: new Set(),
          contains(n) {
            return this._set.has(n);
          }
        },

        close() {
          this.closed = true;
        },
        createObjectStore(storeName, options = {}) {
          if (this.stores[storeName]) {
            throw new Error("Object store exists: " + storeName);
          }

          const store = {
            name: storeName,
            keyPath: options.keyPath ?? null,
            autoIncrement: options.autoIncrement ?? false,

            data: {},
            getAll(transaction = null) {
              const request = new IDBRequest(transaction);
              transaction?._requestStarted?.(request);

              const run = async () => {
                try {
                  const entries = transaction
                    ? transaction._getVisibleEntries(storeName)
                    : Object.entries(this.data);

                  request.result = entries.map(([key, value]) => ({
                    key,
                    value
                  }));

                  request.readyState = "done";
                  request.dispatchEvent(new Event("success"));
                } catch (err) {
                  request.error = err;
                  request.readyState = "done";
                  request.dispatchEvent(new Event("error"));
                } finally {
                  transaction?._requestFinished?.(request);
                }
              };

              if (transaction) {
                transaction._enqueueOperation(run);
              } else {
                setTimeout(run, 0);
              }

              return request;
            },
            getAllKeys(transaction = null) {
              const request = new IDBRequest(transaction);
              transaction?._requestStarted?.(request);

              const run = async () => {
                try {
                  const entries = transaction
                    ? transaction._getVisibleEntries(storeName)
                    : Object.entries(this.data);

                  request.result = entries.map(([key]) => key);
                  request.readyState = "done";
                  request.dispatchEvent(new Event("success"));
                } catch (err) {
                  request.error = err;
                  request.readyState = "done";
                  request.dispatchEvent(new Event("error"));
                } finally {
                  transaction?._requestFinished?.(request);
                }
              };

              if (transaction) {
                transaction._enqueueOperation(run);
              } else {
                setTimeout(run, 0);
              }

              return request;
            },
            put(value, key, transaction = null) {
              const request = new IDBRequest(transaction);
              transaction?._requestStarted?.(request);

              const run = async () => {
                try {
                  let finalKey = key;

                  // 1. explicit key wins
                  if (finalKey === undefined && this.keyPath) {
                    if (Array.isArray(this.keyPath)) {
                      finalKey = this.keyPath.map(k => value?.[k]).join("|");
                    } else {
                      finalKey = value?.[this.keyPath];
                    }
                  }

                  // 2. ONLY autoIncrement fallback if allowed
                  if (finalKey === undefined || finalKey === null) {
                    if (this.autoIncrement) {
                      finalKey = crypto.randomUUID(); // or counter
                    } else {
                      
                      throw new DOMException(
                        "No key specified and object store does not use autoIncrement.",
                        "DataError"
                      );
                    }
                  }

                  if (transaction) {
                    transaction._stagePut(storeName, finalKey, value);
                  } else {
                    this.data[finalKey] = value;
                  }

                  request.result = finalKey;
                  request.readyState = "done";

                  void queueWrite(async () => {
                    const encoded =
                      value instanceof frameWin.ArrayBuffer
                        ? String.fromCharCode(...new Uint8Array(value))
                        : JSON.stringify(serialize(value));

                    await window.protectedGlobals.WriteFile(
                      `${basePath}/${storeName}/${finalKey}.json`,
                      encoded,
                      { text: true, direct: true }
                    );
                  }, transaction);
                  request.dispatchEvent(new Event("success"));
                } catch (err) {
                  request.error = err;
                  request.readyState = "done";
                  request.dispatchEvent(new Event("error"));
                } finally {
                  transaction?._requestFinished?.(request);
                }
              };

              if (transaction) {
                transaction._enqueueOperation(run);
              } else {
                setTimeout(run, 0);
              }

              return request;
            },

            get(key, transaction = null) {
              const request = new IDBRequest(transaction);
              transaction?._requestStarted?.(request);

              const run = async () => {
                try {
                  let value;

                  if (transaction) {
                    value = transaction._getVisibleValue(storeName, key);
                  } else {
                    value = this.data[key];
                  }

                  if (value === undefined) {
                    const filePath = `${basePath}/${storeName}/${key}.json`;

                    const raw = await window.protectedGlobals.ReadFile(
                      filePath,
                      { text: true, direct: true }
                    );

                    try {
                      value = deserialize(JSON.parse(raw));
                    } catch {
                      value = raw;
                    }

                    if (!transaction) {
                      this.data[key] = value;
                    }
                  }

                  request.result = value;
                  request.readyState = "done";
                  request.dispatchEvent(new Event("success"));

                } catch (err) {
                  request.error = err;
                  request.readyState = "done";
                  request.dispatchEvent(new Event("error"));
                } finally {
                  transaction?._requestFinished?.(request);
                }
              };

              if (transaction) {
                transaction._enqueueOperation(run);
              } else {
                setTimeout(run, 0);
              }

              return request;
            },

          delete(key, transaction = null) {
            const request = new IDBRequest(transaction);
            transaction?._requestStarted?.(request);

            const run = async () => {
              try {
                if (transaction) {
                  transaction._stageDelete(storeName, key);
                } else {
                  delete this.data[key];
                }

                void queueWrite(async () => {
                  await window.protectedGlobals.DeleteFile(
                    `${basePath}/${storeName}/${key}.json`
                  );
                }, transaction);

                request.result = undefined;
                request.readyState = "done";

                request.dispatchEvent(new Event("success"));
              } catch (err) {
                request.error = err;
                request.readyState = "done";
                request.dispatchEvent(new Event("error"));
              } finally {
                transaction?._requestFinished?.(request);
              }
            };

            if (transaction) {
              transaction._enqueueOperation(run);
            } else {
              setTimeout(run, 0);
            }

            return request;
          },

          clear(transaction = null) {
            const request = new IDBRequest(transaction);
            transaction?._requestStarted?.(request);

            const run = async () => {
              try {
                if (transaction) {
                  transaction._stageClear(storeName);
                } else {
                  this.data = {};
                }

                void queueWrite(async () => {
                  await window.protectedGlobals.DeleteFolder(
                    `${basePath}/${storeName}`
                  );
                }, transaction);

                request.result = undefined;
                request.readyState = "done";

                request.dispatchEvent(new Event("success"));
              } catch (err) {
                request.error = err;
                request.readyState = "done";
                request.dispatchEvent(new Event("error"));
              } finally {
                transaction?._requestFinished?.(request);
              }
            };

            if (transaction) {
              transaction._enqueueOperation(run);
            } else {
              setTimeout(run, 0);
            }
            
            return request;
          }
          };
          if (!options.keyPath) debugger;
          this.stores[storeName] = store;
          this.objectStoreNames._set.add(storeName);
          db._schemaDirty = true;
          return store;
        },

        transaction(names) {
          if (this.closed) throw new Error("Database is closed");
          if (!Array.isArray(names)) names = [names];

          class IDBTransaction extends EventTarget {
            constructor() {
              super();
              this.mode = "readonly";
              this.db = db;
              this.error = null;
              this.onabort = null;
              this.oncomplete = null;
              this.onerror = null;
              this._listeners = new Map();
              this._pendingRequests = 0;
              this._aborted = false;
              this._completeDispatched = false;
              this._finalized = false;
              this._storeViews = new Map();
              this._queue = Promise.resolve();
            }

            addEventListener(type, cb) {
              super.addEventListener(type, cb);

              if (!this._listeners.has(type)) {
                this._listeners.set(type, new Set());
              }
              this._listeners.get(type).add(cb);
            }

            removeEventListener(type, cb) {
              super.removeEventListener(type, cb);
              this._listeners.get(type)?.delete(cb);
            }

            dispatchEvent(event) {
              const type = event.type;
              super.dispatchEvent(event);

              const handler = this["on" + type];
              if (typeof handler === "function") {
                handler.call(this, event);
              }

              return true;
            }

            objectStore(name) {
              const store = db.stores[name];
              if (!store) throw new Error("Missing store: " + name);

              return {
                name: store.name,
                keyPath: store.keyPath,
                autoIncrement: store.autoIncrement,
                getAll: () => store.getAll(this),
                getAllKeys: () => store.getAllKeys(this),
                put: (value, key) => store.put(value, key, this),
                get: (key) => store.get(key, this),
                delete: (key) => store.delete(key, this),
                clear: () => store.clear(this)
              };
            }

            _enqueueOperation(fn) {
              const run = async () => {
                try {
                  await fn();
                } catch (err) {
                  console.error("IDB transaction operation failed:", err);
                }
              };

              const scheduled = new Promise((resolve) => {
                setTimeout(() => {
                  run().finally(resolve);
                }, 0);
              });

              this._queue = this._queue.then(() => scheduled, () => scheduled);
              return this._queue;
            }

            _requestStarted(request) {
              if (this._aborted || this._completeDispatched) return;
              this._pendingRequests += 1;
              request.transaction = this;
            }

            _requestFinished(request) {
              if (this._completeDispatched || this._aborted) return;
              this._pendingRequests = Math.max(0, this._pendingRequests - 1);
              this._maybeComplete();
            }

            _writeStarted() {}

            _writeFinished() {}

            _getStoreView(storeName) {
              let view = this._storeViews.get(storeName);
              if (!view) {
                const store = db.stores[storeName];
                view = {
                  snapshot: store ? { ...store.data } : {},
                  pending: new Map(),
                  deleted: new Set(),
                  cleared: false
                };
                this._storeViews.set(storeName, view);
              }
              return view;
            }

            _getVisibleValue(storeName, key) {
              const view = this._getStoreView(storeName);
              if (view.cleared || view.deleted.has(key)) return undefined;
              if (view.pending.has(key)) return view.pending.get(key);
              return view.snapshot[key];
            }

            _getVisibleEntries(storeName) {
              const view = this._getStoreView(storeName);
              if (view.cleared) return [];

              const entries = [];
              const seen = new Set();

              for (const [key, value] of Object.entries(view.snapshot)) {
                if (view.deleted.has(key)) continue;
                if (view.pending.has(key)) {
                  entries.push([key, view.pending.get(key)]);
                  seen.add(key);
                } else {
                  entries.push([key, value]);
                  seen.add(key);
                }
              }

              for (const [key, value] of view.pending.entries()) {
                if (!seen.has(key)) entries.push([key, value]);
              }

              return entries;
            }

            _stagePut(storeName, key, value) {
              const view = this._getStoreView(storeName);
              view.cleared = false;
              view.deleted.delete(key);
              view.pending.set(key, value);
            }

            _stageDelete(storeName, key) {
              const view = this._getStoreView(storeName);
              view.cleared = false;
              view.pending.delete(key);
              view.deleted.add(key);
            }

            _stageClear(storeName) {
              const view = this._getStoreView(storeName);
              view.cleared = true;
              view.pending.clear();
              view.deleted.clear();
            }

            _commitPendingChanges() {
              if (this._finalized || this._aborted) return;
              this._finalized = true;

              for (const [storeName, view] of this._storeViews.entries()) {
                const store = db.stores[storeName];
                if (!store) continue;

                if (view.cleared) {
                  store.data = {};
                  void queueWrite(async () => {
                    await window.protectedGlobals.DeleteFolder(`${basePath}/${storeName}`);
                  }, this);
                  continue;
                }

                for (const key of view.deleted) {
                  delete store.data[key];
                  void queueWrite(async () => {
                    await window.protectedGlobals.DeleteFile(`${basePath}/${storeName}/${key}.json`);
                  }, this);
                }

                for (const [key, value] of view.pending.entries()) {
                  store.data[key] = value;
                  void queueWrite(async () => {
                    const encoded =
                      value instanceof frameWin.ArrayBuffer
                        ? String.fromCharCode(...new Uint8Array(value))
                        : JSON.stringify(serialize(value));

                    await window.protectedGlobals.WriteFile(
                      `${basePath}/${storeName}/${key}.json`,
                      encoded,
                      { text: true, direct: true }
                    );
                  }, this);
                }
              }
            }

            _maybeComplete() {
              if (this._aborted || this._completeDispatched) return;
              if (this._pendingRequests === 0) {
                this._completeDispatched = true;
                this._commitPendingChanges();
                setTimeout(() => {
                  this.dispatchEvent(new Event("complete"));
                }, 0);
              }
            }

            async commit() {
              if (this._aborted || this._completeDispatched || this._finalized) return;
              this._commitPendingChanges();
              this._maybeComplete();
            }

            abort(reason) {
              if (this._aborted || this._completeDispatched) return;
              this._aborted = true;
              this.error = reason ?? null;
              this.dispatchEvent(new Event("abort"));
            }
          }

          return new IDBTransaction();
        }
      };

      // =========================================================
      // WRITE QUEUE
      // =========================================================
      const queueWrite = (fn, transaction = null) => {
        const promise = new Promise((resolve, reject) => {
          const run = async () => {
            if (transaction) transaction._writeStarted();
            try {
              await fn();
              resolve();
            } catch (err) {
              reject(err);
            } finally {
              if (transaction) transaction._writeFinished();
            }
          };

          writeQueue.push(run);
          flushQueue();
        });

        return promise;
      };

      const writeQueue = [];
      let flushing = false;

      const flushQueue = async () => {
        if (flushing) return;
        flushing = true;

        while (writeQueue.length) {
          try {
            await writeQueue.shift()();
          } catch (e) {
            console.error("VFS write error:", e);
          }
        }

        flushing = false;
      };

      // =========================================================
      // OPEN LOGIC
      // =========================================================
      setTimeout(async () => {
        let exists = false;

        try {
          const raw = await window.protectedGlobals.ReadFile(
            `${basePath}/metadata.json`,
            { text: true, direct: true }
          );
          if (!raw) await window.protectedGlobals.WriteFile(
            `${basePath}/metadata.json`,
            JSON.stringify({ version }),
            { text: true, direct: true }
          );
          metadata = JSON.parse(raw);
        } catch {}

        try {
          const folder = await window.protectedGlobals.ReadFolder(basePath);
          exists = folder && folder.length > 0;
        } catch {}

        const oldVersion = metadata?.version ?? 0;
        const needsUpgrade = !exists || version > oldVersion;
        request.result = db;

        // IMPORTANT: IndexedDB behavior
        if (needsUpgrade) {
          emit("upgradeneeded", {
            oldVersion,
            newVersion: version
          });
        }

        // wait for upgrade work to finish
        await flushQueue();
        await hydrateStores();
        request.readyState = "done";
        emit("success");
      }, 0);

      return request;
    },

    deleteDatabase(dbname) {
      const request = new (class extends EventTarget {
        constructor() {
          super();
          this.result = undefined;
          this.error = null;
          this.readyState = "pending";
          this._listeners = new Map();
          this.addEventListener = (type, cb) => {
            super.addEventListener(type, cb);
            if (!this._listeners.has(type)) {
              this._listeners.set(type, new Set());
            }
            this._listeners.get(type).add(cb);
          };
          this.removeEventListener = (type, cb) => {
            super.removeEventListener(type, cb);
            this._listeners.get(type)?.delete(cb);
          };
          this.dispatchEvent = (event) => {
            const type = event.type;
            super.dispatchEvent(event);
            const handler = this["on" + type];
            if (typeof handler === "function") {
              handler.call(this, event);
            }
            return true;
          };
          this.onsuccess = null;
          this.onerror = null;
          setTimeout(async () => {
            try {
              await window.protectedGlobals.DeleteFolder(
                `/systemfiles/runtime/apps/browser/` +
                  `${window.browserGlobals.getCurProfileName()}/localstorage/indexedDB/${
                    new URL(window.browserGlobals.unshuffleURL(frameWin.location.href)).hostname + "/" + dbname
                  }`
              );
              this.result = undefined;
              this.readyState = "done";
              this.onsuccess?.call(this, new Event("success"));
              this._listeners.get("success")?.forEach((cb) => cb.call(this, new Event("success")));
            } catch (err) {
              this.error = err;
              this.readyState = "done";
              this.onerror?.call(this, new Event("error"));
              this._listeners.get("error")?.forEach((cb) => cb.call(this, new Event("error")));
            }
          }, 0);
        }
      });

      return request;
    },

    databases() { return []; },

    cmp(a, b) {
      return a === b ? 0 : a > b ? 1 : -1;
    }
  }
});
