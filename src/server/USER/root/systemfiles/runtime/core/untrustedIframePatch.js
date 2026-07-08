"use strict";

window.__goldenbodyAPI = {
    readFile: async (path, options) => {
        window.parent.postMessage({readFile: true, path, options}, '*');
        return new Promise((resolve, reject) => {
            function handleMessage(event) {
                window.removeEventListener('message', handleMessage);
                if (event.data.error) {
                    reject(new Error(event.data.error));
                } else {
                    resolve(event.data.content);
                }
            }
            window.addEventListener('message', handleMessage);
        });
    },
    readFileSuper: async (path, options) => {
        window.parent.postMessage({readFileSuper: true, path, options}, '*');
        return new Promise((resolve, reject) => {
            function handleMessage(event) {
                window.removeEventListener('message', handleMessage);
                if (event.data.error) {
                    reject(new Error(event.data.error));
                } else {
                    resolve(event.data.content);
                }
            }
            window.addEventListener('message', handleMessage);
        });
    },
    writeFile: async (path, content, options) => {
        window.parent.postMessage({writeFile: true, path, content, options}, '*');
        return new Promise((resolve, reject) => {
            function handleMessage(event) {
                window.removeEventListener('message', handleMessage);
                if (event.data.error) {
                    reject(new Error(event.data.error));
                } else {
                    resolve();
                }
            }
            window.addEventListener('message', handleMessage);
        });
    },
    writeFileSuper: async (path, content, options) => {
        window.parent.postMessage({writeFileSuper: true, path, content, options}, '*');
        return new Promise((resolve, reject) => {
            function handleMessage(event) {
                window.removeEventListener('message', handleMessage);
                if (event.data.error) {
                    reject(new Error(event.data.error));
                } else {
                    resolve();
                }
            }
            window.addEventListener('message', handleMessage);
        });
    },
    writeFolder: async (path, content, options) => {
        window.parent.postMessage({writeFolder: true, path, content, options}, '*');
        return new Promise((resolve, reject) => {
            function handleMessage(event) {
                window.removeEventListener('message', handleMessage);
                if (event.data.error) {
                    reject(new Error(event.data.error));
                } else {
                    resolve();
                }
            }
            window.addEventListener('message', handleMessage);
        });
    },
    writeFolderSuper: async (path, content, options) => {
        window.parent.postMessage({writeFolderSuper: true, path, content, options}, '*');
        return new Promise((resolve, reject) => {
            function handleMessage(event) {
                window.removeEventListener('message', handleMessage);
                if (event.data.error) {
                    reject(new Error(event.data.error));
                } else {
                    resolve();
                }
            }
            window.addEventListener('message', handleMessage);
        });
    },
    readFolder: async (path, options) => {
        window.parent.postMessage({readFolder: true, path, options}, '*');
        return new Promise((resolve, reject) => {
            function handleMessage(event) {
                window.removeEventListener('message', handleMessage);
                if (event.data.error) {
                    reject(new Error(event.data.error));
                } else {
                    resolve(event.data.content);
                }
            }
            window.addEventListener('message', handleMessage);
        });
    },
    readFolderSuper: async (path, options) => {
        window.parent.postMessage({readFolderSuper: true, path, options}, '*');
        return new Promise((resolve, reject) => {
            function handleMessage(event) {
                window.removeEventListener('message', handleMessage);
                if (event.data.error) {
                    reject(new Error(event.data.error));
                } else {
                    resolve(event.data.content);
                }
            }
            window.addEventListener('message', handleMessage);
        });
    },
    deleteFile: async (path, options) => {
        window.parent.postMessage({deleteFile: true, path, options}, '*');
        return new Promise((resolve, reject) => {
            function handleMessage(event) {
                window.removeEventListener('message', handleMessage);
                if (event.data.error) {
                    reject(new Error(event.data.error));
                } else {
                    resolve();
                }
            }
            window.addEventListener('message', handleMessage);
        });
    },
    deleteFileSuper: async (path, options) => {
        window.parent.postMessage({deleteFileSuper: true, path, options}, '*');
        return new Promise((resolve, reject) => {
            function handleMessage(event) {
                window.removeEventListener('message', handleMessage);
                if (event.data.error) {
                    reject(new Error(event.data.error));
                } else {
                    resolve();
                }
            }
            window.addEventListener('message', handleMessage);
        });
    }
};