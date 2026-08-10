"use strict";
// disable all apis that can be used to exit fullscreen
(() => {
// 1. Keep a state variable and store original network APIs
let networkAllowed = true; 
const _originalFetch = window.fetch;
const _originalXHR = window.XMLHttpRequest;
const _originalWebSocket = window.WebSocket;

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
window.addEventListener('message', (event) => {
if (event.data && typeof event.data.allowNetwork === 'boolean' && event.data.verify === 'syfamr') {
    networkAllowed = event.data.allowNetwork;
}
});
Object.defineProperty(window, 'fetch', { value: fetch, writable: false, configurable: false });
Object.defineProperty(window, 'XMLHttpRequest', { value: XHR, writable: false, configurable: false });
Object.defineProperty(window, 'WebSocket', { value: WS, writable: false, configurable: false });
window.lockAPI = (api, parent) => {
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
window.lockAPI("showOpenFilePicker", window);
window.lockAPI("showSaveFilePicker", window);
window.lockAPI("showDirectoryPicker", window);
window.lockAPI("exitFullscreen", window);
window.lockAPI("webkitExitFullscreen", window);
window.lockAPI("mozCancelFullScreen", window);
window.lockAPI("msExitFullscreen", window);
window.lockAPI("exitFullscreen", document);
window.lockAPI("indexedDB", window);
window.lockAPI("localStorage", window);
window.lockAPI("sessionStorage", window);
window.lockAPI("caches", window);
window.lockAPI("cookie", document);
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
        if (!event || !event.data || typeof event.data !== "object") {
            return;
        }
        if (event.data.requestId !== requestId) {
            return;
        }

        window.removeEventListener("message", handleMessage);

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
window.alert = function (message) {
    window.parent.postMessage({alert: true, message}, '*');
};
window.__goldenbodyAPI = {
    readFile: async (pathOrHandle, options) => {
        const { path, key } = normalizePathInput(pathOrHandle);
        let requestId = createRequestId();
        window.parent.postMessage({readFile: true, path, key, options, requestId}, '*');
        return new Promise((resolve, reject) => {
            const handleMessage = createRequestMessageHandler(requestId, resolve, reject);
            window.addEventListener('message', handleMessage);
        });
    },

    writeFile: async (pathOrHandle, content, options) => {
        const { path, key } = normalizePathInput(pathOrHandle);
        let requestId = createRequestId();
        window.parent.postMessage({writeFile: true, path, content, key, options, requestId}, '*');
        return new Promise((resolve, reject) => {
            const handleMessage = createRequestMessageHandler(requestId, resolve, reject);
            window.addEventListener('message', handleMessage);
        });
    },

    writeFolder: async (pathOrHandle, options) => {
        const { path, key } = normalizePathInput(pathOrHandle);
        let requestId = createRequestId();
        window.parent.postMessage({writeFolder: true, path, key, options, requestId}, '*');
        return new Promise((resolve, reject) => {
            const handleMessage = createRequestMessageHandler(requestId, resolve, reject);
            window.addEventListener('message', handleMessage);
        });
    },

    readFolder: async (pathOrHandle, options) => {
        const { path, key } = normalizePathInput(pathOrHandle);
        let requestId = createRequestId();
        window.parent.postMessage({readFolder: true, path, key, options, requestId}, '*');
        return new Promise((resolve, reject) => {
            const handleMessage = createRequestMessageHandler(requestId, resolve, reject);
            window.addEventListener('message', handleMessage);
        });
    },

    folderExists: async (pathOrHandle, options) => {
        const { path, key } = normalizePathInput(pathOrHandle);
        let requestId = createRequestId();
        window.parent.postMessage({folderExists: true, path, key, options, requestId}, '*');
        return new Promise((resolve, reject) => {
            const handleMessage = createRequestMessageHandler(requestId, resolve, reject);
            window.addEventListener('message', handleMessage);
        });
    },

    fileExists: async (pathOrHandle, options) => {
        const { path, key } = normalizePathInput(pathOrHandle);
        let requestId = createRequestId();
        window.parent.postMessage({fileExists: true, path, key, options, requestId}, '*');
        return new Promise((resolve, reject) => {
            const handleMessage = createRequestMessageHandler(requestId, resolve, reject);
            window.addEventListener('message', handleMessage);
        });
    },

    deleteFile: async (pathOrHandle, options) => {
        const { path, key } = normalizePathInput(pathOrHandle);
        let requestId = createRequestId();
        window.parent.postMessage({deleteFile: true, path, key, options, requestId}, '*');
        return new Promise((resolve, reject) => {
            const handleMessage = createRequestMessageHandler(requestId, resolve, reject);
            window.addEventListener('message', handleMessage);
        });
    },

    deleteFolder: async (pathOrHandle, options) => {
        const { path, key } = normalizePathInput(pathOrHandle);
        let requestId = createRequestId();
        window.parent.postMessage({deleteFolder: true, path, key, options, requestId}, '*');
        return new Promise((resolve, reject) => {
            const handleMessage = createRequestMessageHandler(requestId, resolve, reject);
            window.addEventListener('message', handleMessage);
        });
    },

    renameFile: async (pathOrHandle, newName, options) => {
        const { path, key } = normalizePathInput(pathOrHandle);
        if (!newName) throw new Error('No new name');
        let requestId = createRequestId();
        window.parent.postMessage({renameFile: true, path, key, newName, options, requestId}, '*');
        return new Promise((resolve, reject) => {
            const handleMessage = createRequestMessageHandler(requestId, resolve, reject);
            window.addEventListener('message', handleMessage);
        });
    },

    renameFolder: async (pathOrHandle, newName, options) => {
        const { path, key } = normalizePathInput(pathOrHandle);
        if (!newName) throw new Error('No new name');
        let requestId = createRequestId();
        window.parent.postMessage({renameFolder: true, path, key, newName, options, requestId}, '*');
        return new Promise((resolve, reject) => {
            const handleMessage = createRequestMessageHandler(requestId, resolve, reject);
            window.addEventListener('message', handleMessage);
        });
    },

    pasteFile: async (destinationOrHandle, clipboardItems, options) => {
        const { path, key } = normalizePathInput(destinationOrHandle);
        if (!Array.isArray(clipboardItems) || !clipboardItems.length) {
            throw new Error('No clipboard items');
        }
        let requestId = createRequestId();
        window.parent.postMessage({pasteFile: true, path, key, clipboardItems, options, requestId}, '*');
        return new Promise((resolve, reject) => {
            const handleMessage = createRequestMessageHandler(requestId, resolve, reject);
            window.addEventListener('message', handleMessage);
        });
    },

    pasteFolder: async (destinationOrHandle, clipboardItems, options) => {
        const { path, key } = normalizePathInput(destinationOrHandle);
        if (!Array.isArray(clipboardItems) || !clipboardItems.length) {
            throw new Error('No clipboard items');
        }
        let requestId = createRequestId();
        window.parent.postMessage({pasteFolder: true, path, key, clipboardItems, options, requestId}, '*');
        return new Promise((resolve, reject) => {
            const handleMessage = createRequestMessageHandler(requestId, resolve, reject);
            window.addEventListener('message', handleMessage);
        });
    },

    showOpenFilePicker: async (options = {}) => {
        let requestId = createRequestId();
        window.parent.postMessage({showOpenFilePicker: true, options, requestId}, '*');
        return new Promise((resolve, reject) => {
            const handleMessage = createRequestMessageHandler(requestId, resolve, reject);
            window.addEventListener('message', handleMessage);
        });
    },

    showSaveFilePicker: async (options = {}) => {
        let requestId = createRequestId();
        window.parent.postMessage({showSaveFilePicker: true, options, requestId}, '*');
        return new Promise((resolve, reject) => {
            const handleMessage = createRequestMessageHandler(requestId, resolve, reject);
            window.addEventListener('message', handleMessage);
        });
    },

    showDirectoryPicker: async (options = {}) => {
        let requestId = createRequestId();
        window.parent.postMessage({showDirectoryPicker: true, options, requestId}, '*');
        return new Promise((resolve, reject) => {
            const handleMessage = createRequestMessageHandler(requestId, resolve, reject);
            window.addEventListener('message', handleMessage);
        });
    },

    closeWindow: async () => {
        let requestId = createRequestId();
        window.parent.postMessage({closeWindow: true, requestId}, '*');
        return new Promise((resolve, reject) => {
            const handleMessage = createRequestMessageHandler(requestId, resolve, reject);
            window.addEventListener('message', handleMessage);
        });
    },

    launchApp: async (appId, args = []) => {
        if (!appId || typeof appId !== 'string') {
            throw new Error('Invalid appId');
        }
        let requestId = createRequestId();
        window.parent.postMessage({launchApp: true, appId, args, requestId}, '*');
        return new Promise((resolve, reject) => {
            const handleMessage = createRequestMessageHandler(requestId, resolve, reject);
            window.addEventListener('message', handleMessage);
        });
    },

    setInstanceTitle: (title) => {
        window.parent.postMessage({setInstanceTitle: true, title}, '*');
    },

    message: (message, toInstance) => {
        window.parent.postMessage({instanceMessage: true, message: message, toInstance: toInstance}, '*');
    },

    getCurInstanceNum: () => {
        return window.__curInstanceNum__ || null;
    },

    getLiveInstanceIndex: async () => {
        let requestId = createRequestId();
        window.parent.postMessage({getLiveInstanceIndex: true, requestId}, '*');
        return new Promise((resolve, reject) => {
            const handleMessage = (event) => {
                if (!event || !event.data || typeof event.data !== 'object') return;
                if (event.data.requestId !== requestId) return;
                window.removeEventListener('message', handleMessage);
                if (event.data.liveInstanceIndex !== undefined) {
                    resolve(event.data.liveInstanceIndex);
                } else {
                    reject(new Error("Failed to get live instance index."));
                }
            };
            window.addEventListener('message', handleMessage);
        });
    },

    getTheme: () => {
        let requestId = createRequestId();
        window.parent.postMessage({getTheme: true, requestId}, '*');
        return new Promise((resolve, reject) => {
            const handleMessage = (event) => {
                if (event.data.requestId !== requestId) return;
                window.removeEventListener('message', handleMessage);
                resolve(event.data.theme);
            };
            window.addEventListener('message', handleMessage);
        });
    },

    Observer: class {
        constructor(callback, type) {
            this.callback = callback;
            this.type = type;
            this.cbwrapper = this.callbackWrapper.bind(this);
            window.addEventListener('message', this.cbwrapper);
        }
        // appName is a const defined in the iframe patch script, which is the app's id
        callbackWrapper(event) {
            if ((event.data.type !== this.type) || event.data.verify !== 'syfamr' || ((event.data.channel !== appName) && (event.data.channel !== '*'))) return;
            this.callback(event.data);
        }
        disconnect() {
            window.removeEventListener('message', this.cbwrapper);
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
window.addEventListener("click", (e) => {
    window.parent.postMessage({clickOnApp:true}, '*');
});
window.addEventListener("keydown", (e) => {
    e.stopPropagation();
    const parts = [];
    if (e.ctrlKey) parts.push("Ctrl");
    if (e.altKey) parts.push("Alt");
    if (e.metaKey) parts.push("Meta");
    if (e.shiftKey) parts.push("Shift");
    const key = e.key === " " ? "Space" : e.key;
    const comboKey = parts.length ? parts.concat(String(key)).join("+") : String(key);

    window.parent.postMessage({
        keydownOnApp: true,
        key: key,
        comboKey: comboKey,
        code: e.code,
        ctrl: e.ctrlKey,
        alt: e.altKey,
        shift: e.shiftKey,
        meta: e.metaKey,
        repeat: e.repeat,
    }, '*');
});
window.addEventListener("keyup", (e) => {
    const parts = [];
    if (e.ctrlKey) parts.push("Ctrl");
    if (e.altKey) parts.push("Alt");
    if (e.metaKey) parts.push("Meta");
    if (e.shiftKey) parts.push("Shift");
    const key = e.key === " " ? "Space" : e.key;
    const comboKey = parts.length ? parts.concat(String(key)).join("+") : String(key);

    window.parent.postMessage({
        keyupOnApp: true,
        key: key,
        comboKey: comboKey,
        code: e.code,
        ctrl: e.ctrlKey,
        alt: e.altKey,
        shift: e.shiftKey,
        meta: e.metaKey,
        repeat: e.repeat,
    }, '*');
});
window.addEventListener("pointerdown", (e) => {
    window.parent.postMessage({
        pointerdownOnApp: true,
        button: e.button,
        clientX: e.clientX,
        clientY: e.clientY,
        ctrl: e.ctrlKey,
        alt: e.altKey,
        shift: e.shiftKey,
        meta: e.metaKey,
    }, '*');
});
window.addEventListener("pointerup", (e) => {
    window.parent.postMessage({
        pointerupOnApp: true,
        button: e.button,
        clientX: e.clientX,
        clientY: e.clientY,
        ctrl: e.ctrlKey,
        alt: e.altKey,
        shift: e.shiftKey,
        meta: e.metaKey,
    }, '*');
});
