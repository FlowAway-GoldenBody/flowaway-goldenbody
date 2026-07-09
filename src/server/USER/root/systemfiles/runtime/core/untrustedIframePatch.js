"use strict";
// disable all apis that can be used to exit fullscreen
window.__hiddengoldenbodyAPI = {};
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

window.lockAPI("showOpenFilePicker", window);
window.lockAPI("showSaveFilePicker", window);
window.lockAPI("showDirectoryPicker", window);
window.lockAPI("exitFullscreen", window);
window.lockAPI("webkitExitFullscreen", window);
window.lockAPI("mozCancelFullScreen", window);
window.lockAPI("msExitFullscreen", window);
window.lockAPI("exitFullscreen", document);
window.lockAPI("webkitExitFullscreen", document);
window.lockAPI("mozCancelFullScreen", document);
window.lockAPI("msExitFullscreen", document);
window.lockAPI("indexedDB", window);
window.lockAPI("localStorage", window);
window.lockAPI("sessionStorage", window);
window.lockAPI("caches", window);
window.lockAPI("cookies", document);

Object.defineProperty(window.HTMLInputElement.prototype, 'type', {
    set: (val) => {if (val == 'file') return new Error("Access to file input is Banned.");},
    configurable: false
});
const createRequestId = () => {
    if (typeof window.__goldenbodyRequestCounter !== "number") {
        window.__goldenbodyRequestCounter = 0;
    }
    window.__goldenbodyRequestCounter += 1;
    return window.__goldenbodyRequestCounter;
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

        resolve(event.data.result);
    };
};

window.__goldenbodyAPI = {
    readFile: async (path, options) => {
        let requestId = createRequestId();
        window.parent.postMessage({readFile: true, path, options, requestId}, '*');
        return new Promise((resolve, reject) => {
            const handleMessage = createRequestMessageHandler(requestId, resolve, reject);
            window.addEventListener('message', handleMessage);
        });
    },
    readFileSuper: async (path, options) => {
        let requestId = createRequestId();
        window.parent.postMessage({readFileSuper: true, path, options, requestId}, '*');
        return new Promise((resolve, reject) => {
            const handleMessage = createRequestMessageHandler(requestId, resolve, reject);
            window.addEventListener('message', handleMessage);
        });
    },
    writeFile: async (path, content, options) => {
        let requestId = createRequestId();
        window.parent.postMessage({writeFile: true, path, content, options, requestId}, '*');
        return new Promise((resolve, reject) => {
            const handleMessage = createRequestMessageHandler(requestId, resolve, reject);
            window.addEventListener('message', handleMessage);
        });
    },
    writeFileSuper: async (path, content, options) => {
        let requestId = createRequestId();
        window.parent.postMessage({writeFileSuper: true, path, content, options, requestId}, '*');
        return new Promise((resolve, reject) => {
            const handleMessage = createRequestMessageHandler(requestId, resolve, reject);
            window.addEventListener('message', handleMessage);
        });
    },
    writeFolder: async (path, content, options) => {
        let requestId = createRequestId();
        window.parent.postMessage({writeFolder: true, path, options, requestId}, '*');
        return new Promise((resolve, reject) => {
            const handleMessage = createRequestMessageHandler(requestId, resolve, reject);
            window.addEventListener('message', handleMessage);
        });
    },
    writeFolderSuper: async (path, content, options) => {
        let requestId = createRequestId();
        window.parent.postMessage({writeFolderSuper: true, path, options, requestId}, '*');
        return new Promise((resolve, reject) => {
            const handleMessage = createRequestMessageHandler(requestId, resolve, reject);
            window.addEventListener('message', handleMessage);
        });
    },
    readFolder: async (path, options) => {
        let requestId = createRequestId();
        window.parent.postMessage({readFolder: true, path, options, requestId}, '*');
        return new Promise((resolve, reject) => {
            const handleMessage = createRequestMessageHandler(requestId, resolve, reject);
            window.addEventListener('message', handleMessage);
        });
    },
    readFolderSuper: async (path, options) => {
        let requestId = createRequestId();
        window.parent.postMessage({readFolderSuper: true, path, options, requestId}, '*');
        return new Promise((resolve, reject) => {
            const handleMessage = createRequestMessageHandler(requestId, resolve, reject);
            window.addEventListener('message', handleMessage);
        });
    },
    deleteFile: async (path, options) => {
        let requestId = createRequestId();
        window.parent.postMessage({deleteFile: true, path, options, requestId}, '*');
        return new Promise((resolve, reject) => {
            const handleMessage = createRequestMessageHandler(requestId, resolve, reject);
            window.addEventListener('message', handleMessage);
        });
    },
    deleteFileSuper: async (path, options) => {
        let requestId = createRequestId();
        window.parent.postMessage({deleteFileSuper: true, path, options, requestId}, '*');
        return new Promise((resolve, reject) => {
            const handleMessage = createRequestMessageHandler(requestId, resolve, reject);
            window.addEventListener('message', handleMessage);
        });
    },
    deleteFolder: async (path, options) => {
        let requestId = createRequestId();
        window.parent.postMessage({deleteFolder: true, path, options, requestId}, '*');
        return new Promise((resolve, reject) => {
            const handleMessage = createRequestMessageHandler(requestId, resolve, reject);
            window.addEventListener('message', handleMessage);
        });
    },
    deleteFolderSuper: async (path, options) => {
        let requestId = createRequestId();
        window.parent.postMessage({deleteFolderSuper: true, path, options, requestId}, '*');
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
        return window.curInstanceNum || null;
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
document.createElement =  function (...args) {
    const element = HTMLDocument.prototype.createElement.apply(this, args);
    if (args[0] === "iframe") {
        throw new Error("Access to iframe creation is Banned.");
    }
    Object.defineProperty(element, "attachShadow", {
        get: function () {
            throw new Error("Access to attachShadow is Banned.");
        },
        set: function () {
            throw new Error("Access to attachShadow is Banned.");
        },
        configurable: false,
    });
    element.addEventListener("contextmenu", (e) => {
        e.preventDefault();
    });
    return element;
};
