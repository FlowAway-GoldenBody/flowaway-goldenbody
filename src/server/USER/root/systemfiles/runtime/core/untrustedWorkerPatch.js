"use strict";
// disable all apis that can be used to exit fullscreen
(() => {
// 1. Keep a state variable and store original network APIs
let networkAllowed = true; 
const _originalFetch = globalThis.fetch;
const _originalXHR = globalThis.XMLHttpRequest;
const _originalWebSocket = globalThis.WebSocket;

// 2. Override Fetch API
let fetch = function(...args) {
if (!networkAllowed) {
    return Promise.reject(new TypeError("Network request blocked."));
}
return _originalFetch.apply(this, args);
};

// 3. Override XMLHttpRequest (XHR)
let XHR = function() {
const xhr = new _originalXHR();
const _originalOpen = xhr.open;

xhr.open = function(...args) {
    if (!networkAllowed) {
    throw new Error("XHR blocked.");
    }
    return _originalOpen.apply(this, args);
};
return xhr;
};

// 4. Override WebSockets
let WS = function(...args) {
if (!networkAllowed) {
    throw new Error("WebSocket connection blocked.");
}
return new _originalWebSocket(...args);
};

// 5. Listen for the toggle message from your main page switch
// Only accept control messages that are explicitly tagged as coming from the runtime
globalThis.addEventListener('message', (event) => {
    if (!event || !event.data || typeof event.data !== 'object') return;
    if (event.data.__fromRuntime !== true) return;
    if (event.data && typeof event.data.allowNetwork === 'boolean' && event.data.verify === 'syfamr') {
        networkAllowed = event.data.allowNetwork;
    }
});
Object.defineProperty(globalThis, 'fetch', { value: fetch, writable: false, configurable: false });
Object.defineProperty(globalThis, 'XMLHttpRequest', { value: XHR, writable: false, configurable: false });
Object.defineProperty(globalThis, 'WebSocket', { value: WS, writable: false, configurable: false });
globalThis.lockAPI = (api, parent) => {
    Object.defineProperty(parent, api, {
        get: function () {
            throw new Error("Access to " + api + " is Banned.");
        },
        set: function () {
            throw new Error("Access to " + api + " is Banned.");
        },
        configurable: false,
    });
};
})();
try {
globalThis.lockAPI("showOpenFilePicker", globalThis);
globalThis.lockAPI("showSaveFilePicker", globalThis);
globalThis.lockAPI("showDirectoryPicker", globalThis);
globalThis.lockAPI("exitFullscreen", globalThis);
globalThis.lockAPI("webkitExitFullscreen", globalThis);
globalThis.lockAPI("mozCancelFullScreen", globalThis);
globalThis.lockAPI("msExitFullscreen", globalThis);
globalThis.lockAPI("exitFullscreen", document);
globalThis.lockAPI("indexedDB", globalThis);
globalThis.lockAPI("localStorage", globalThis);
globalThis.lockAPI("sessionStorage", globalThis);
globalThis.lockAPI("caches", globalThis);
globalThis.lockAPI("cookie", document);
} catch {}
let createRequestId;
(function () {
    let __goldenbodyRequestCounter = 0;
    createRequestId = () => {
        return ++__goldenbodyRequestCounter;
    };
})();

const normalizePathInput = (pathOrHandle) => {
    let path = pathOrHandle;
    let key = undefined;
    if (pathOrHandle && typeof pathOrHandle === "object" && typeof pathOrHandle.path === "string") {
        path = pathOrHandle.path;
        if (typeof pathOrHandle.key === "string") {
            key = pathOrHandle.key;
        }
    }
    return { path, key };
};

const createRequestMessageHandler = (requestId, resolve, reject) => {
    return function handleMessage(event) {
        // Ensure this message was sent by the runtime (prevents in-worker spoofing)
        if (!event || !event.data || typeof event.data !== "object" || event.data.__fromRuntime !== true) {
            return;
        }
        if (event.data.requestId !== requestId) {
            return;
        }

        globalThis.removeEventListener("message", handleMessage);

        if (event.data.error) {
            reject(new Error(event.data.error));
            return;
        }
        if (event.data.result === "Permission denied") {
            reject(new Error("Permission denied"));
            return;
        }

        const result = event.data.result ?? event.data.openFilePickerResult ?? event.data.showSaveFilePickerResult ?? event.data.showDirectoryPickerResult;

        resolve(result);
    };
};
globalThis.alert = function (message) {
    globalThis.parent.postMessage({alert: true, message}, '*');
};
globalThis.__goldenbodyAPI = {
    readFile: async (pathOrHandle, options) => {
        const { path, key } = normalizePathInput(pathOrHandle);
        let requestId = createRequestId();
        globalThis.parent.postMessage({readFile: true, path, key, options, requestId}, '*');
        return new Promise((resolve, reject) => {
            const handleMessage = createRequestMessageHandler(requestId, resolve, reject);
            globalThis.addEventListener('message', handleMessage);
        });
    },

    writeFile: async (pathOrHandle, content, options) => {
        const { path, key } = normalizePathInput(pathOrHandle);
        let requestId = createRequestId();
        globalThis.parent.postMessage({writeFile: true, path, content, key, options, requestId}, '*');
        return new Promise((resolve, reject) => {
            const handleMessage = createRequestMessageHandler(requestId, resolve, reject);
            globalThis.addEventListener('message', handleMessage);
        });
    },

    writeFolder: async (pathOrHandle, options) => {
        const { path, key } = normalizePathInput(pathOrHandle);
        let requestId = createRequestId();
        globalThis.parent.postMessage({writeFolder: true, path, key, options, requestId}, '*');
        return new Promise((resolve, reject) => {
            const handleMessage = createRequestMessageHandler(requestId, resolve, reject);
            globalThis.addEventListener('message', handleMessage);
        });
    },

    readFolder: async (pathOrHandle, options) => {
        const { path, key } = normalizePathInput(pathOrHandle);
        let requestId = createRequestId();
        globalThis.parent.postMessage({readFolder: true, path, key, options, requestId}, '*');
        return new Promise((resolve, reject) => {
            const handleMessage = createRequestMessageHandler(requestId, resolve, reject);
            globalThis.addEventListener('message', handleMessage);
        });
    },

    folderExists: async (pathOrHandle, options) => {
        const { path, key } = normalizePathInput(pathOrHandle);
        let requestId = createRequestId();
        globalThis.parent.postMessage({folderExists: true, path, key, options, requestId}, '*');
        return new Promise((resolve, reject) => {
            const handleMessage = createRequestMessageHandler(requestId, resolve, reject);
            globalThis.addEventListener('message', handleMessage);
        });
    },

    fileExists: async (pathOrHandle, options) => {
        const { path, key } = normalizePathInput(pathOrHandle);
        let requestId = createRequestId();
        globalThis.parent.postMessage({fileExists: true, path, key, options, requestId}, '*');
        return new Promise((resolve, reject) => {
            const handleMessage = createRequestMessageHandler(requestId, resolve, reject);
            globalThis.addEventListener('message', handleMessage);
        });
    },

    deleteFile: async (pathOrHandle, options) => {
        const { path, key } = normalizePathInput(pathOrHandle);
        let requestId = createRequestId();
        globalThis.parent.postMessage({deleteFile: true, path, key, options, requestId}, '*');
        return new Promise((resolve, reject) => {
            const handleMessage = createRequestMessageHandler(requestId, resolve, reject);
            globalThis.addEventListener('message', handleMessage);
        });
    },

    deleteFolder: async (pathOrHandle, options) => {
        const { path, key } = normalizePathInput(pathOrHandle);
        let requestId = createRequestId();
        globalThis.parent.postMessage({deleteFolder: true, path, key, options, requestId}, '*');
        return new Promise((resolve, reject) => {
            const handleMessage = createRequestMessageHandler(requestId, resolve, reject);
            globalThis.addEventListener('message', handleMessage);
        });
    },

    renameFile: async (pathOrHandle, newName, options) => {
        const { path, key } = normalizePathInput(pathOrHandle);
        if (!newName) throw new Error('No new name');
        let requestId = createRequestId();
        globalThis.parent.postMessage({renameFile: true, path, key, newName, options, requestId}, '*');
        return new Promise((resolve, reject) => {
            const handleMessage = createRequestMessageHandler(requestId, resolve, reject);
            globalThis.addEventListener('message', handleMessage);
        });
    },

    renameFolder: async (pathOrHandle, newName, options) => {
        const { path, key } = normalizePathInput(pathOrHandle);
        if (!newName) throw new Error('No new name');
        let requestId = createRequestId();
        globalThis.parent.postMessage({renameFolder: true, path, key, newName, options, requestId}, '*');
        return new Promise((resolve, reject) => {
            const handleMessage = createRequestMessageHandler(requestId, resolve, reject);
            globalThis.addEventListener('message', handleMessage);
        });
    },

    pasteFile: async (destinationOrHandle, clipboardItems, options) => {
        const { path, key } = normalizePathInput(destinationOrHandle);
        if (!Array.isArray(clipboardItems) || !clipboardItems.length) {
            throw new Error('No clipboard items');
        }
        let requestId = createRequestId();
        globalThis.parent.postMessage({pasteFile: true, path, key, clipboardItems, options, requestId}, '*');
        return new Promise((resolve, reject) => {
            const handleMessage = createRequestMessageHandler(requestId, resolve, reject);
            globalThis.addEventListener('message', handleMessage);
        });
    },

    pasteFolder: async (destinationOrHandle, clipboardItems, options) => {
        const { path, key } = normalizePathInput(destinationOrHandle);
        if (!Array.isArray(clipboardItems) || !clipboardItems.length) {
            throw new Error('No clipboard items');
        }
        let requestId = createRequestId();
        globalThis.parent.postMessage({pasteFolder: true, path, key, clipboardItems, options, requestId}, '*');
        return new Promise((resolve, reject) => {
            const handleMessage = createRequestMessageHandler(requestId, resolve, reject);
            globalThis.addEventListener('message', handleMessage);
        });
    },

    showOpenFilePicker: async (options = {}) => {
        let requestId = createRequestId();
        globalThis.parent.postMessage({showOpenFilePicker: true, options, requestId}, '*');
        return new Promise((resolve, reject) => {
            const handleMessage = createRequestMessageHandler(requestId, resolve, reject);
            globalThis.addEventListener('message', handleMessage);
        });
    },

    showSaveFilePicker: async (options = {}) => {
        let requestId = createRequestId();
        globalThis.parent.postMessage({showSaveFilePicker: true, options, requestId}, '*');
        return new Promise((resolve, reject) => {
            const handleMessage = createRequestMessageHandler(requestId, resolve, reject);
            globalThis.addEventListener('message', handleMessage);
        });
    },

    showDirectoryPicker: async (options = {}) => {
        let requestId = createRequestId();
        globalThis.parent.postMessage({showDirectoryPicker: true, options, requestId}, '*');
        return new Promise((resolve, reject) => {
            const handleMessage = createRequestMessageHandler(requestId, resolve, reject);
            globalThis.addEventListener('message', handleMessage);
        });
    },

    launchApp: async (appId, args = []) => {
        if (!appId || typeof appId !== 'string') {
            throw new Error('Invalid appId');
        }
        let requestId = createRequestId();
        globalThis.parent.postMessage({launchApp: true, appId, args, requestId}, '*');
        return new Promise((resolve, reject) => {
            const handleMessage = createRequestMessageHandler(requestId, resolve, reject);
            globalThis.addEventListener('message', handleMessage);
        });
    },

    message: (message, toInstance) => {
        globalThis.parent.postMessage({instanceMessage: true, message: message, toInstance: toInstance}, '*');
    },

    getLiveInstanceIndex: async () => {
        let requestId = createRequestId();
        globalThis.parent.postMessage({getLiveInstanceIndex: true, requestId}, '*');
        return new Promise((resolve, reject) => {
            const handleMessage = (event) => {
                if (!event || !event.data || typeof event.data !== 'object') return;
                if (event.data.requestId !== requestId) return;
                globalThis.removeEventListener('message', handleMessage);
                if (event.data.liveInstanceIndex !== undefined) {
                    resolve(event.data.liveInstanceIndex);
                } else {
                    reject(new Error("Failed to get live instance index."));
                }
            };
            globalThis.addEventListener('message', handleMessage);
        });
    },

    getTheme: () => {
        let requestId = createRequestId();
        globalThis.parent.postMessage({getTheme: true, requestId}, '*');
        return new Promise((resolve, reject) => {
            const handleMessage = (event) => {
                if (event.data.requestId !== requestId) return;
                globalThis.removeEventListener('message', handleMessage);
                resolve(event.data.theme);
            };
            globalThis.addEventListener('message', handleMessage);
        });
    },

    Observer: class {
        constructor(callback, type) {
            this.callback = callback;
            this.type = type;
            this.cbwrapper = this.callbackWrapper.bind(this);
            globalThis.addEventListener('message', this.cbwrapper);
        }
        // appName is a const defined in the iframe patch script, which is the app's id
        callbackWrapper(event) {
                // only accept observer messages originating from the runtime
                if (!event || !event.data || event.data.__fromRuntime !== true) return;
                if ((event.data.type !== this.type) || event.data.verify !== 'syfamr' || ((event.data.channel !== appName) && (event.data.channel !== '*'))) return;
            this.callback(event.data);
        }
        disconnect() {
            globalThis.removeEventListener('message', this.cbwrapper);
        }
        remove() {
            this.disconnect();
        }
    },

    FShandle: class {
        constructor(handle) {
            this.path = handle.path;
            this.key = handle.key;
        }
    }
};