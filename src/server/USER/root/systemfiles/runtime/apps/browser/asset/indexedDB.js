Object.defineProperty(frameWin, 'indexedDB', {
  value: {
    open(name, version) {
        let eventListeners = [];
        let request = { 
            onupgradeneeded: null, 
            onsuccess: null, 
            onerror: null,
            readyState: 'pending',
            addEventListener: function(event, callback) {
                eventListeners.push({ event, callback });
            },
            removeEventListener: function(event, callback) {
                eventListeners = eventListeners.filter(listener => !(listener.event === event && listener.callback === callback));
            },
            dispatchEvent: function(event) {
                for (const listener of eventListeners) {
                    if (listener.event === event.type) {
                        listener.callback(event);
                    }
                }
            },
        };
        setTimeout(async () => {
            let metadata = await window.protectedGlobals.ReadFile(`/systemfiles/runtime/apps/browser/${window.browserGlobals.getCurProfileName()}/localstorage/indexedDB/${window.browserGlobals.mainWebsite(frameWin.location.href)}/${name}/metadata.json`, { text: true, direct: true });
            let content = await window.protectedGlobals.ReadFolder(`/systemfiles/runtime/apps/browser/${window.browserGlobals.getCurProfileName()}/localstorage/indexedDB/${window.browserGlobals.mainWebsite(frameWin.location.href)}/${name}`);
            if (!content) {
                if (request.onupgradeneeded) {
                    request.onupgradeneeded({ target: request });
                }
                eventListeners.forEach(listener => {
                    if (listener.event === 'upgradeneeded') {
                        listener.callback({ target: request });
                    }
                });
                eventListeners.forEach(listener => {
                    if (listener.event === 'success') {
                        listener.callback({ target: request });
                    }
                });
                if (request.onsuccess) {
                    request.onsuccess({ target: request });
                }
            } else if (version > metadata.version) {
                if (request.onupgradeneeded) {
                    request.onupgradeneeded({ target: request });
                }
                eventListeners.forEach(listener => {
                    if (listener.event === 'upgradeneeded') {
                        listener.callback({ target: request });
                    }
                });
                eventListeners.forEach(listener => {
                    if (listener.event === 'success') {
                        listener.callback({ target: request });
                    }
                });
                if (request.onsuccess) {
                    request.onsuccess({ target: request });
                }
            }
            else {
                if (request.onsuccess) {
                    request.onsuccess({ target: request });
                }
                eventListeners.forEach(listener => {
                    if (listener.event === 'success') {
                        listener.callback({ target: request });
                    }
                });
            }
            request.result = {};
            for (let i = 0; i < content.length; i++) {
                content[i] = content[i].replace(/\.json$/, '');
            }
            request.result.objectStoreNames = [...content];
            request.result.objectStoreNames.contains = function(name) {
                return content.includes(name);
            };
            request.result.createObjectStore = function(name, options = {}) {
                if (content.includes(name)) {
                    throw new Error(`Object store ${name} already exists`);
                }
                content.push(name);
                request.result.objectStoreNames = [...content];
                request.result.objectStoreNames.contains = function(name) {
                    return content.includes(name);
                };
                let keyPath = options.keyPath || null;
                let autoIncrement = options.autoIncrement || false;
                request.result[name] = {
                    keyPath,
                    autoIncrement,
                    data: {},
                    put: function(value, key) {
                        if (keyPath) {
                            key = value[keyPath];
                        }
                        request.result[name].data[key] = value;
                    },
                    get: function(key) {
                        return request.result[name].data[key];
                    },
                    delete: function(key) {
                        delete request.result[name].data[key];
                    },
                    clear: function() {
                        request.result[name].data = {};
                    }
                };
            };
            request.readyState = 'done';
        }, 0);
        return request;
    },
    deleteDatabase(name) {},
    databases() {},
    cmp(first, second) {}
  },
})