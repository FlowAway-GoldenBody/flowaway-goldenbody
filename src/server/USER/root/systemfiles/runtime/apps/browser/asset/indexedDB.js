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
        // 1. detect encoded binary
        if (value && value.__type === "bytes") {
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
                const raw = await window.protectedGlobals.ReadFile(`${storePath}/${file}`, { text: true, direct: true });

                try {
                  store.data[key] = JSON.parse(raw);
                } catch {
                  // fallback for binary
                  const bin = atob(raw);
                  const arr = new Uint8Array([...bin].map(c => c.charCodeAt(0)));
                  store.data[key] = arr.buffer;
                }
              } catch (e) {
                console.warn("Failed to hydrate key:", key, e);
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
        constructor() {
          super();

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
            getAll() {
              const request = new IDBRequest();

              setTimeout(() => {
                try {
                  request.result = Object.entries(this.data).map(([key, value]) => ({
                    key,
                    value
                  }));

                  request.readyState = "done";
                  request.dispatchEvent(new Event("success"));
                } catch (err) {
                  request.error = err;
                  request.dispatchEvent(new Event("error"));
                }
              }, 0);

              return request;
            },
            put(value, key) {
              const request = new IDBRequest();

              setTimeout(() => {
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
                  // 3. store in memory
                  this.data[finalKey] = value;

                  // 4. persist to file
                  queueWrite(async () => {
                    const encoded =
                      value instanceof frameWin.ArrayBuffer
                        ? btoa(String.fromCharCode(...new Uint8Array(value)))
                        : JSON.stringify(serialize(value));

                    await window.protectedGlobals.WriteFile(
                      `${basePath}/${storeName}/${finalKey}.json`,
                      encoded,
                      { text: true, direct: true }
                    );
                  });

                  request.result = finalKey;
                  request.readyState = "done";
                  request.dispatchEvent(new Event("success"));

                } catch (err) {
                  request.error = err;
                  request.readyState = "done";
                  request.dispatchEvent(new Event("error"));
                }
              }, 0);

              return request;
            },

            get(key) {
              const request = new IDBRequest();

              setTimeout(async () => {
                try {
                  // 1. fast path (memory)
                  
                  if (this.data[key] !== undefined) {
                    request.result = this.data[key];
                  } else {
                    // 2. slow path (disk fallback)
                    const filePath = `${basePath}/${storeName}/${key}.json`;

                    const raw = await window.protectedGlobals.ReadFile(
                      filePath,
                      { text: true, direct: true }
                    );

                    let value;
                    try {
                      const parsed = JSON.parse(raw);
                      const value = deserialize(parsed);
                    } catch {
                      value = raw;
                    }

                    // cache it
                    this.data[key] = value;

                    request.result = value;
                  }

                  request.readyState = "done";
                  request.dispatchEvent(new Event("success"));

                } catch (err) {
                  request.error = err;
                  request.dispatchEvent(new Event("error"));
                }
              }, 0);

              return request;
            },

          delete(key) {
            const request = new IDBRequest();

            setTimeout(() => {
              try {
                delete this.data[key];

                queueWrite(async () => {
                  await window.protectedGlobals.DeleteFile(
                    `${basePath}/${storeName}/${key}.json`
                  );
                });

                request.result = undefined;
                request.readyState = "done";

                request.dispatchEvent(new Event("success"));
              } catch (err) {
                request.error = err;
                request.dispatchEvent(new Event("error"));
              }
            }, 0);

            return request;
          },

          clear() {
            const request = new IDBRequest();

            setTimeout(() => {
              try {
                this.data = {};

                queueWrite(async () => {
                  await window.protectedGlobals.DeleteFolder(
                    `${basePath}/${storeName}`
                  );
                });

                request.result = undefined;
                request.readyState = "done";

                request.dispatchEvent(new Event("success"));
              } catch (err) {
                request.error = err;
                request.dispatchEvent(new Event("error"));
              }
            }, 0);
            
            return request;
          }
          };
          this.stores[storeName] = store;
          this.objectStoreNames._set.add(storeName);
          db._schemaDirty = true;
          return store;
        },

        transaction(names) {
          if (this.closed) throw new Error("Database is closed");
          if (!Array.isArray(names)) names = [names];

          class IDBTransaction extends EventTarget {
            objectStore(name) {
              const store = db.stores[name];
              if (!store) throw new Error("Missing store: " + name);
              return store;
            }

            async commit() {
              await flushQueue();
              this.dispatchEvent(new Event("complete"));
            }

            abort() {
              this.dispatchEvent(new Event("abort"));
            }
          }

          return new IDBTransaction();
        }
      };

      // =========================================================
      // WRITE QUEUE
      // =========================================================
      const queueWrite = (fn) => {
        writeQueue.push(fn);
        flushQueue();
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
