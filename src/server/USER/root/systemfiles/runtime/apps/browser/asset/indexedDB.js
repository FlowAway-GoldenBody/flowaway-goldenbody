console.log('indexedDB patch loaded');
Object.defineProperty(frameWin, "indexedDB", {
  value: {
    open(name, version) {
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
                    stores: Object.keys(db.stores)
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

        createObjectStore(storeName, options = {}) {
          if (this.stores[storeName]) {
            throw new Error("Object store exists: " + storeName);
          }

          const store = {
            name: storeName,
            keyPath: options.keyPath || null,
            data: {},

            put(value, key) {
              if (this.keyPath) {
                key = value[this.keyPath];
              }

              this.data[key] = value;

              queueWrite(async () => {
                await window.protectedGlobals.WriteFile(
                  `${basePath}/${storeName}/${key}.json`,
                  JSON.stringify(value),
                  { text: true, direct: true }
                );
              });
            },

            get(key) {
              return this.data[key] ?? null;
            },

            delete(key) {
              delete this.data[key];

              queueWrite(async () => {
                await window.protectedGlobals.DeleteFile(
                  `${basePath}/${storeName}/${key}.json`
                );
              });
            },

            clear() {
              this.data = {};

              queueWrite(async () => {
                await window.protectedGlobals.DeleteFolder(
                  `${basePath}/${storeName}`
                );
              });
            }
          };

          this.stores[storeName] = store;
          this.objectStoreNames._set.add(storeName);
          db._schemaDirty = true;
          return store;
        },

        transaction(names) {
          if (!Array.isArray(names)) names = [names];

          return {
            objectStore: (n) => db.stores[n],
            commit: async () => flushQueue(),
            abort: () => {}
          };
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
            debugger;
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
        request.readyState = "done";

        // IMPORTANT: IndexedDB behavior
        if (needsUpgrade) {
          emit("upgradeneeded", {
            oldVersion,
            newVersion: version
          });
        }

        // wait for upgrade work to finish
        await flushQueue();
        emit("success");
      }, 0);

      return request;
    },

    deleteDatabase() {},
    databases() { return []; },

    cmp(a, b) {
      return a === b ? 0 : a > b ? 1 : -1;
    }
  }
});