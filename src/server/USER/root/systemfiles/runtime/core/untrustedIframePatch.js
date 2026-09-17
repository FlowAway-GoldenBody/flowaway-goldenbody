"use strict";
// disable all apis that can be used to exit fullscreen
(() => {
// 1. Keep a state variable and store original network APIs
let networkAllowed = window.networkAllowed || false; 
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
if (event.data && typeof event.data.allowNetwork === 'boolean') {
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

(function () {
    const buildWorkerBootstrap = function (scriptURL) {
        const sourceUrl = scriptURL == null ? "" : String(scriptURL);
        const sourceLiteral = JSON.stringify(sourceUrl);
        return [
            "(function () {",
            "  self.Worker = undefined;",
            "  self.SharedWorker = undefined;",
            "  const blockFetch = function () { return Promise.reject(new TypeError('Network request blocked.')); };",
            "  const blockXHR = function () { throw new Error('XHR blocked.'); };",
            "  const blockWebSocket = function () { throw new Error('WebSocket connection blocked.'); };",
            "  self.fetch = blockFetch;",
            "  self.XMLHttpRequest = function GuardedXHR() { return blockXHR(); };",
            "  self.WebSocket = function GuardedWebSocket() { return blockWebSocket(); };",
            "  const __sourceUrl = " + sourceLiteral + ";",
            "  if (__sourceUrl) {",
            "    try { importScripts(__sourceUrl); } catch (err) { throw err; }",
            "  }",
            "})();",
        ].join("\n");
    };

    const NativeWorker = window.Worker;
    if (NativeWorker) {
        const WrappedWorker = function WrappedWorker(scriptURL, options) {
            const sourceUrl = scriptURL == null ? "" : String(scriptURL);
            const wrappedUrl = URL.createObjectURL(new Blob([buildWorkerBootstrap(sourceUrl)], { type: 'text/javascript' }));
            const worker = options ? new NativeWorker(wrappedUrl, options) : new NativeWorker(wrappedUrl);
            return worker;
        };
        WrappedWorker.prototype = NativeWorker.prototype;
        Object.defineProperty(window, 'Worker', {
            value: WrappedWorker,
            writable: true,
            configurable: true,
        });
    }
})();
// Additional protections: mutation observer and extra API guards
(function(){
    const iframeBlockedMessage = "Creation or insertion of iframe elements is blocked.";

    // Prevent cloning nodes that contain iframes
    try {
        const _cloneNode = Node.prototype.cloneNode;
        Object.defineProperty(Node.prototype, 'cloneNode', {
            value: function(deep) {
                try {
                    if (this && this.nodeType === 1) {
                        if (this.tagName && String(this.tagName).toLowerCase() === 'iframe') {
                            throw new Error(iframeBlockedMessage);
                        }
                        if (deep && this.querySelector && this.querySelector('iframe')) {
                            throw new Error(iframeBlockedMessage);
                        }
                    }
                } catch (e) {
                    throw e;
                }
                return _cloneNode.call(this, deep);
            },
            writable: false,
            configurable: false,
        });
    } catch (e) {}

    // Block common insertion helpers: append, prepend, before, after, replaceWith, insertAdjacentElement
    const safeGuardAppendLike = (proto, name) => {
        try {
            const orig = proto[name];
            if (!orig) return;
            Object.defineProperty(proto, name, {
                value: function() {
                    for (let i = 0; i < arguments.length; i++) {
                        const node = arguments[i];
                        if (node && ((typeof node.tagName === 'string' && node.tagName.toUpperCase() === 'IFRAME') || (typeof HTMLIFrameElement !== 'undefined' && node instanceof HTMLIFrameElement))) {
                            throw new Error(iframeBlockedMessage);
                        }
                        // if a string is provided (e.g., insertAdjacentElement not relevant) skip
                    }
                    return orig.apply(this, arguments);
                },
                writable: false,
                configurable: false,
            });
        } catch (e) {}
    };

    safeGuardAppendLike(Element.prototype, 'append');
    safeGuardAppendLike(Element.prototype, 'prepend');
    safeGuardAppendLike(Element.prototype, 'before');
    safeGuardAppendLike(Element.prototype, 'after');
    safeGuardAppendLike(Element.prototype, 'replaceWith');
    safeGuardAppendLike(Element.prototype, 'insertAdjacentElement');

    // Block setting outerHTML that contains iframe tags
    try {
        const descOuter = Object.getOwnPropertyDescriptor(Element.prototype, 'outerHTML');
        if (descOuter && descOuter.set) {
            Object.defineProperty(Element.prototype, 'outerHTML', {
                get: descOuter.get,
                set: function(html) {
                    if (typeof html === 'string' && /<iframe[\s>]/i.test(html)) {
                        throw new Error(iframeBlockedMessage);
                    }
                    return descOuter.set.call(this, html);
                },
                configurable: false,
                enumerable: descOuter.enumerable
            });
        }
    } catch (e) {}

    // Block Range.createContextualFragment
    try {
        if (typeof Range !== 'undefined' && Range.prototype && Range.prototype.createContextualFragment) {
            const _createCF = Range.prototype.createContextualFragment;
            Object.defineProperty(Range.prototype, 'createContextualFragment', {
                value: function(html) {
                    if (typeof html === 'string' && /<iframe[\s>]/i.test(html)) {
                        throw new Error(iframeBlockedMessage);
                    }
                    return _createCF.call(this, html);
                },
                writable: false,
                configurable: false,
            });
        }
    } catch (e) {}

    // Block DOMParser.parseFromString
    try {
        if (typeof DOMParser !== 'undefined' && DOMParser.prototype && DOMParser.prototype.parseFromString) {
            const _parse = DOMParser.prototype.parseFromString;
            Object.defineProperty(DOMParser.prototype, 'parseFromString', {
                value: function(str, type) {
                    if (typeof str === 'string' && /<iframe[\s>]/i.test(str)) {
                        throw new Error(iframeBlockedMessage);
                    }
                    return _parse.call(this, str, type);
                },
                writable: false,
                configurable: false,
            });
        }
    } catch (e) {}

    // MutationObserver to remove any iframes that bypass API guards
    try {
        const observer = new MutationObserver((mutations) => {
            for (const m of mutations) {
                if (m.addedNodes && m.addedNodes.length) {
                    for (const node of Array.from(m.addedNodes)) {
                        try {
                            if (node && node.tagName && String(node.tagName).toLowerCase() === 'iframe') {
                                node.remove();
                                continue;
                            }
                            // if subtree contains iframe, remove them
                            if (node && node.querySelector) {
                                const list = node.querySelectorAll('iframe');
                                for (const f of Array.from(list)) {
                                    f.remove();
                                }
                            }
                        } catch (e) {}
                    }
                }
            }
        });
        observer.observe(document.documentElement || document, { childList: true, subtree: true });

        // Periodic sweep fallback
        setInterval(() => {
            try {
                const els = document.querySelectorAll('iframe');
                for (const el of Array.from(els)) {
                    el.remove();
                }
            } catch (e) {}
        }, 500);
    } catch (e) {}

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
// Prevent creation and insertion of new iframes from inside this sandboxed iframe.
(function(){
    const iframeBlockedMessage = "Creation or insertion of iframe elements is blocked.";

    // Block document.createElement('iframe')
    const _createElement = Document.prototype.createElement;
    Object.defineProperty(Document.prototype, 'createElement', {
        value: function(tagName, options) {
            if (String(tagName).toLowerCase() === 'iframe') {
                throw new Error(iframeBlockedMessage);
            }
            return _createElement.call(this, tagName, options);
        },
        writable: false,
        configurable: false,
    });

    // Block document.createElementNS(..., 'iframe')
    const _createElementNS = Document.prototype.createElementNS;
    if (_createElementNS) {
        Object.defineProperty(Document.prototype, 'createElementNS', {
            value: function(ns, tagName, options) {
                if (String(tagName).toLowerCase() === 'iframe') {
                    throw new Error(iframeBlockedMessage);
                }
                return _createElementNS.call(this, ns, tagName, options);
            },
            writable: false,
            configurable: false,
        });
    }

    // Block appending/inserting/replacing iframe nodes
    const _appendChild = Node.prototype.appendChild;
    Object.defineProperty(Node.prototype, 'appendChild', {
        value: function(node) {
            if (node && ((typeof node.tagName === 'string' && node.tagName.toUpperCase() === 'IFRAME') || (typeof HTMLIFrameElement !== 'undefined' && node instanceof HTMLIFrameElement))) {
                throw new Error(iframeBlockedMessage);
            }
            return _appendChild.call(this, node);
        },
        writable: false,
        configurable: false,
    });

    const _insertBefore = Node.prototype.insertBefore;
    Object.defineProperty(Node.prototype, 'insertBefore', {
        value: function(node, refNode) {
            if (node && ((typeof node.tagName === 'string' && node.tagName.toUpperCase() === 'IFRAME') || (typeof HTMLIFrameElement !== 'undefined' && node instanceof HTMLIFrameElement))) {
                throw new Error(iframeBlockedMessage);
            }
            return _insertBefore.call(this, node, refNode);
        },
        writable: false,
        configurable: false,
    });

    const _replaceChild = Node.prototype.replaceChild;
    Object.defineProperty(Node.prototype, 'replaceChild', {
        value: function(newChild, oldChild) {
            if (newChild && ((typeof newChild.tagName === 'string' && newChild.tagName.toUpperCase() === 'IFRAME') || (typeof HTMLIFrameElement !== 'undefined' && newChild instanceof HTMLIFrameElement))) {
                throw new Error(iframeBlockedMessage);
            }
            return _replaceChild.call(this, newChild, oldChild);
        },
        writable: false,
        configurable: false,
    });

    // Prevent inserting iframe HTML via innerHTML
    try {
        const desc = Object.getOwnPropertyDescriptor(Element.prototype, 'innerHTML');
        if (desc && desc.set) {
            Object.defineProperty(Element.prototype, 'innerHTML', {
                get: desc.get,
                set: function(html) {
                    if (typeof html === 'string' && /<iframe[\s>]/i.test(html)) {
                        throw new Error(iframeBlockedMessage);
                    }
                    return desc.set.call(this, html);
                },
                configurable: false,
                enumerable: desc.enumerable
            });
        }
    } catch (e) {}

    // Prevent insertAdjacentHTML from injecting iframes
    try {
        const _insertAdjacentHTML = Element.prototype.insertAdjacentHTML;
        Object.defineProperty(Element.prototype, 'insertAdjacentHTML', {
            value: function(position, text) {
                if (typeof text === 'string' && /<iframe[\s>]/i.test(text)) {
                    throw new Error(iframeBlockedMessage);
                }
                return _insertAdjacentHTML.call(this, position, text);
            },
            writable: false,
            configurable: false,
        });
    } catch (e) {}

    // Prevent document.write / writeln from adding iframes
    try {
        const _docWrite = document.write;
        if (_docWrite) {
            Object.defineProperty(document, 'write', {
                value: function(...args) {
                    if (args.some(a => typeof a === 'string' && /<iframe[\s>]/i.test(a))) {
                        throw new Error(iframeBlockedMessage);
                    }
                    return _docWrite.apply(document, args);
                },
                writable: false,
                configurable: false,
            });
        }
    } catch (e) {}
    try {
        const _docWriteln = document.writeln;
        if (_docWriteln) {
            Object.defineProperty(document, 'writeln', {
                value: function(...args) {
                    if (args.some(a => typeof a === 'string' && /<iframe[\s>]/i.test(a))) {
                        throw new Error(iframeBlockedMessage);
                    }
                    return _docWriteln.apply(document, args);
                },
                writable: false,
                configurable: false,
            });
        }
    } catch (e) {}

    // Prevent opening new windows (which can be targeted to create frames)
    try {
        const _windowOpen = window.open;
        Object.defineProperty(window, 'open', {
            value: function() {
                throw new Error("Opening new windows or iframes is blocked.");
            },
            writable: false,
            configurable: false,
        });
    } catch (e) {}

})();
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

    getBounds: () => {
        let requestId = createRequestId();
        window.parent.postMessage({getBounds: true, requestId}, '*');
        return new Promise((resolve, reject) => {
            const handleMessage = createRequestMessageHandler(requestId, resolve, reject);
            window.addEventListener('message', handleMessage);
        });
    },

    setBounds: (bounds) => {
        window.parent.postMessage({setBounds: true, bounds}, '*');
    },

    messageToWorker: (message) => {
        window.parent.postMessage({messageToWorker: true, message}, '*');
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
            if ((event.data.type !== this.type) || ((event.data.channel !== appName) && (event.data.channel !== '*'))) return;
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
