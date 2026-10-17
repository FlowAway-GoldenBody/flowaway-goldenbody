'use strict';

(() => {
let style = null;
async function showAppPermissionPrompt(appName, permissionType, diffmsg = false, saveChoiceName = '') {
    return new Promise((resolve) => {

        const saveChoice = (allowed, remember) => {
            if (remember) {
                if (!window.protectedGlobals.appPerms[appName]) {
                    window.protectedGlobals.appPerms[appName] = {};
                }
                if (saveChoiceName) {
                    window.protectedGlobals.appPerms[appName][saveChoiceName] = String(allowed);
                } else {
                    window.protectedGlobals.appPerms[appName][permissionType] = String(allowed);
                }

                window.protectedGlobals.WriteFile(
                    "/systemfiles/userprofile/appPermissions.json",
                    JSON.stringify(window.protectedGlobals.appPerms),
                    { text: true }
                );
            }

            dialog.remove();
            window.removeEventListener("keydown", escListener);
            resolve(allowed);
        };

        // Backdrop

        // Dialog
        const dialog = document.createElement("div");
        // make the div in center horizontally
        dialog.style.cssText = `
            width:25%;
            top:10%;
            z-index:100003;
            background:#fff;
            left: 0;
            right: 0;
            margin: 0 auto;
            border-radius:16px;
            box-shadow:0 20px 60px rgba(0,0,0,.35);
            padding:28px;
            font-family:system-ui,sans-serif;
            animation:popup .18s ease;
        `;
        dialog.style.position = "fixed";

        // Title
        const title = document.createElement("h2");
        title.textContent = "Permission Request";
        title.style.cssText = `
            margin:0;
            text-align:center;
            font-size:22px;
            font-weight:600;
            color:#222;
        `;

        // Description
        const desc = document.createElement("p");

        const app = document.createElement("strong");
        app.textContent = appName;

        const perm = document.createElement("strong");
        perm.textContent = permissionType;
        if (diffmsg) {
            desc.append(
                app,
                document.createTextNode(" wants permission to "),
                perm,
                document.createTextNode(".")
            );
        } else {
            desc.append(
                app,
                document.createTextNode(" wants permission to access "),
                perm,
                document.createTextNode(".")
            );
        }
        desc.style.cssText = `
            margin:18px 0;
            color:#555;
            line-height:1.5;
            text-align:center;
            font-size:15px;
        `;

        // Remember checkbox
        const rememberRow = document.createElement("label");
        rememberRow.style.cssText = `
            display:flex;
            align-items:center;
            gap:10px;
            cursor:pointer;
            margin-bottom:24px;
            user-select:none;
            color:#444;
        `;

        const remember = document.createElement("input");
        remember.type = "checkbox";

        rememberRow.append(
            remember,
            document.createTextNode("Remember my choice")
        );

        // Button row
        const buttons = document.createElement("div");
        buttons.style.cssText = `
            display:flex;
            justify-content:flex-end;
            gap:10px;
        `;

        const deny = document.createElement("button");
        deny.textContent = "Deny";
        deny.style.cssText = `
            border:none;
            padding:10px 18px;
            border-radius:8px;
            background:#ececec;
            cursor:pointer;
            font-weight:600;
        `;

        const allow = document.createElement("button");
        allow.textContent = "Allow";
        allow.style.cssText = `
            border:none;
            padding:10px 18px;
            border-radius:8px;
            background:#2f80ed;
            color:white;
            cursor:pointer;
            font-weight:600;
        `;

        deny.onmouseenter = () => deny.style.background = "#ddd";
        deny.onmouseleave = () => deny.style.background = "#ececec";

        allow.onmouseenter = () => allow.style.background = "#1768cf";
        allow.onmouseleave = () => allow.style.background = "#2f80ed";

        deny.onclick = () => saveChoice(false, remember.checked);
        allow.onclick = () => saveChoice(true, remember.checked);

        buttons.append(deny, allow);

        dialog.append(
            title,
            desc,
            rememberRow,
            buttons
        );

        document.body.appendChild(dialog);
        if (!style) {
            style = document.createElement("style");
            style.textContent = `
                @keyframes fadeIn {
                    from { opacity:0; }
                    to { opacity:1; }
                }

                @keyframes popup {
                    from {
                        opacity:0;
                        transform:translateY(10px) scale(.96);
                    }
                    to {
                        opacity:1;
                        transform:none;
                    }
                }
            `;
            document.head.appendChild(style);
        }

        const escListener = (e) => {
            if (e.key === "Escape") {
                saveChoice(false, false);
            }
        };

        window.addEventListener("keydown", escListener);
    });
}

    function normalizeVfsPath(path) {
        if (!path && path !== "") return "";
        return String(path).replace(/\/+/g, "/").replace(/^\//, "");
    }

    function isPathUnderRoot(path, root) {
        if (typeof path !== "string" || typeof root !== "string") return false;
        const normalizedPath = normalizeVfsPath(path);
        const normalizedRoot = normalizeVfsPath(root);
        return normalizedPath === normalizedRoot || normalizedPath.startsWith(normalizedRoot + "/");
    }

    function isExternalKeyAllowed(path, key, appName) {
        if (!key || typeof path !== "string") return false;
        const keys = window.protectedGlobals.__externalPickerKeys;
        if (!keys || !(keys instanceof Map)) return false;
        const mapping = keys.get(key);
        if (!mapping) return false;
        if (mapping.appName !== appName) return false;
        if (mapping.kind === "file") {
            return normalizeVfsPath(path) === normalizeVfsPath(mapping.path);
        }
        if (mapping.kind === "directory") {
            return isPathUnderRoot(path, mapping.path);
        }
        return false;
    }

    function toWatchPathString(value) {
        if (typeof value === "string") return value;
        if (value && typeof value === "object") {
            if (typeof value.path === "string") return value.path;
            if (typeof value.value === "string") return value.value;
        }
        return "";
    }

    function normalizeWatchPayload(payload, appFolderName, isPublicOrApproved) {
        if (!payload || typeof payload !== "object") return payload;
        const payloadPath = typeof payload.path === "string" ? payload.path : "";
        if (!payloadPath || isPublicOrApproved) return payload;
        const internalRoot = `systemfiles/runtime/apps/${appFolderName}`;
        const normalizedPayloadPath = payloadPath.startsWith("/") ? payloadPath : `/${payloadPath}`;
        const targetPath = normalizedPayloadPath === `/${internalRoot}` || normalizedPayloadPath.startsWith(`/${internalRoot}/`)
            ? normalizedPayloadPath.slice(internalRoot.length + 1)
            : normalizedPayloadPath;
        payload.path = targetPath === "" ? "/" : targetPath;
        return payload;
    }

    window.protectedGlobals.clearAppInstanceWatchers = function (instanceSource) {
        if (!instanceSource || !window.protectedGlobals.__iframeWatchHandlesByInstance) return;
        const instanceWatchers = window.protectedGlobals.__iframeWatchHandlesByInstance.get(instanceSource);
        if (!instanceWatchers) return;
        for (const requestId of Array.from(instanceWatchers.keys())) {
            const watch = window.protectedGlobals.__iframeWatchHandles && window.protectedGlobals.__iframeWatchHandles.get(requestId);
            if (watch && typeof watch.close === "function") {
                watch.close();
            }
            if (window.protectedGlobals.__iframeWatchHandles) {
                window.protectedGlobals.__iframeWatchHandles.delete(requestId);
            }
        }
        window.protectedGlobals.__iframeWatchHandlesByInstance.delete(instanceSource);
    };

    window.protectedGlobals.clearAllWatchers = function () {
        if (window.protectedGlobals.__iframeWatchHandles) {
            for (const requestId of Array.from(window.protectedGlobals.__iframeWatchHandles.keys())) {
                const watch = window.protectedGlobals.__iframeWatchHandles.get(requestId);
                if (watch && typeof watch.close === "function") {
                    watch.close();
                }
                window.protectedGlobals.__iframeWatchHandles.delete(requestId);
            }
        }
        if (window.protectedGlobals.__iframeWatchHandlesByInstance) {
            window.protectedGlobals.__iframeWatchHandlesByInstance.clear();
        }
    };

    window.protectedGlobals.setIframesPointerEvents = function (none = true) {
        document.querySelectorAll("iframe").forEach((iframe) => {
            if (none) iframe.classList.add("pointer-events-none");
            else iframe.classList.remove("pointer-events-none");
        });
    };
    window.addEventListener("pointerdown", () => {
        window.protectedGlobals.setIframesPointerEvents(true);
    });
    window.addEventListener("pointerup", () => {
        window.protectedGlobals.setIframesPointerEvents(false);
    });
    window.addEventListener("message", (event) => {
        if (event.data.clickOnApp) {
            const clickEvent = new MouseEvent("click", {
                bubbles: true,
                cancelable: true,
                view: window,
            });
            window.dispatchEvent(clickEvent);
            document.dispatchEvent(clickEvent);
        } else if (event.data.keydownOnApp || event.data.keyupOnApp) {
            const type = event.data.keydownOnApp ? "keydown" : "keyup";
            const keyEvent = new KeyboardEvent(type, {
                key: event.data.key || event.data.comboKey || "",
                code: event.data.code || "",
                ctrlKey: !!event.data.ctrl,
                altKey: !!event.data.alt,
                shiftKey: !!event.data.shift,
                metaKey: !!event.data.meta,
                repeat: !!event.data.repeat,
                bubbles: true,
                cancelable: true,
                composed: true,
            });
            keyEvent.__gbComboKey = event.data.comboKey || "";
            keyEvent.__gbOriginalKey = event.data.key || "";
            window.dispatchEvent(keyEvent);
            document.dispatchEvent(keyEvent);
        } else if (event.data.pointerdownOnApp || event.data.pointerupOnApp) {
            const type = event.data.pointerdownOnApp ? "pointerdown" : "pointerup";
            const mouseEvent = new MouseEvent(type, {
                bubbles: true,
                cancelable: true,
                view: window,
                button: typeof event.data.button === "number" ? event.data.button : 0,
                clientX: typeof event.data.clientX === "number" ? event.data.clientX : 0,
                clientY: typeof event.data.clientY === "number" ? event.data.clientY : 0,
                ctrlKey: !!event.data.ctrl,
                altKey: !!event.data.alt,
                shiftKey: !!event.data.shift,
                metaKey: !!event.data.meta,
                composed: true,
            });
            window.dispatchEvent(mouseEvent);
            document.dispatchEvent(mouseEvent);
        }
    });



    let dialogOpen = false;
    async function sleep(ms) {
        return new Promise((resolve) => setTimeout(resolve, ms));
    }
    window.addEventListener("translatedmessage", async (e) => {
        while (dialogOpen) {
            await sleep(1000);
        }
        let appName = e.detail.appName;
        if (!window.protectedGlobals.appPerms[appName]) {
            window.protectedGlobals.appPerms[appName] = { storage: "ask", notification: "ask", launch: "ask" };
        }
        if (e.detail.data?.alert) {
            if (window.protectedGlobals.appPerms[appName].notification === "ask") {
                dialogOpen = true;
                let allow = await showAppPermissionPrompt(appName, "notification");
                dialogOpen = false;
                if (!allow) {
                    return;
                }
            } else if (window.protectedGlobals.appPerms[appName].notification === "false") {
                return;
            }
            window.protectedGlobals.notification(`"${appName}" says: ${e.detail.data.message}`);
            return;
        }

        let options = e.detail.data.options;
        let path = e.detail.data.path;
        let source = e.detail.source;
        let result = null;
        let requestId = e.detail.data.requestId;
        if (e.detail.data.launchApp) {
            const appId = String(e.detail.data.appId || "").trim();
            if (!appId) {
                source.postMessage({ error: "Invalid appId", requestId: requestId }, "*");
                return;
            }
            const permState = window.protectedGlobals.appPerms[appName].launchApp || "ask";
            let allowed = permState === "true";
            if (permState === "ask") {
                dialogOpen = true;
                allowed = await showAppPermissionPrompt(appName, `launch app "${appId}"`, true, 'launchApp');
                dialogOpen = false;
            }
            if (!allowed) {
                source.postMessage({ result: "Permission denied", requestId: requestId }, "*");
                return;
            }
            try {
                let launchResult = await window.protectedGlobals.launchApp(appId, e.detail.data.args);
                source.postMessage({ launchAppResult: true, result: launchResult, requestId: requestId }, "*");
            } catch (err) {
                source.postMessage({ error: err.message || String(err), requestId: requestId }, "*");
            }
            return;
        }
        if (e.detail.data.watchFile) {
            const requestId = e.detail.data.requestId;
            const rawKey = e.detail.data.key;
            const key = rawKey === undefined || rawKey === null || String(rawKey) === "" ? null : rawKey;
            const keyWasProvided = !!key;
            const watchPathValue = toWatchPathString(path);
            const externalKeyAllowed = keyWasProvided && isExternalKeyAllowed(watchPathValue, key, appName);
            if (keyWasProvided && !externalKeyAllowed) {
                source.postMessage({ error: "Invalid handle for filesystem access", from: e.detail.from, requestId }, "*");
                return;
            }

            let watchPath = watchPathValue;
            const isPublicOrApproved = watchPath.startsWith("/__public") || watchPath.startsWith("__public") || externalKeyAllowed;
            if (!isPublicOrApproved) {
                watchPath = "systemfiles/runtime/apps/" + e.detail.from + "/" + watchPath.replace(/^\/+/, "");
            }

            try {
                const watch = window.protectedGlobals.WatchFile(watchPath, (payload) => {
                    source.postMessage({ watchEvent: true, requestId, payload: normalizeWatchPayload(payload, e.detail.from, isPublicOrApproved) }, "*");
                }, e.detail.data.options || {});

                if (!window.protectedGlobals.__iframeWatchHandles) {
                    window.protectedGlobals.__iframeWatchHandles = new Map();
                }
                if (!window.protectedGlobals.__iframeWatchHandlesByInstance) {
                    window.protectedGlobals.__iframeWatchHandlesByInstance = new Map();
                }
                const instanceWatchers = window.protectedGlobals.__iframeWatchHandlesByInstance.get(source) || new Map();
                instanceWatchers.set(requestId, watch);
                window.protectedGlobals.__iframeWatchHandlesByInstance.set(source, instanceWatchers);
                window.protectedGlobals.__iframeWatchHandles.set(requestId, watch);
                source.postMessage({ watchFileResult: true, result: { requestId }, requestId }, "*");
            } catch (err) {
                source.postMessage({ error: err.message || String(err), requestId }, "*");
            }
            return;
        }
        if (e.detail.data.watchFolder) {
            const requestId = e.detail.data.requestId;
            const rawKey = e.detail.data.key;
            const key = rawKey === undefined || rawKey === null || String(rawKey) === "" ? null : rawKey;
            const keyWasProvided = !!key;
            const watchPathValue = toWatchPathString(path);
            const externalKeyAllowed = keyWasProvided && isExternalKeyAllowed(watchPathValue, key, appName);
            if (keyWasProvided && !externalKeyAllowed) {
                source.postMessage({ error: "Invalid handle for filesystem access", from: e.detail.from, requestId }, "*");
                return;
            }

            let watchPath = watchPathValue;
            const isPublicOrApproved = watchPath.startsWith("/__public") || watchPath.startsWith("__public") || externalKeyAllowed;
            if (!isPublicOrApproved) {
                watchPath = "systemfiles/runtime/apps/" + e.detail.from + "/" + watchPath.replace(/^\/+/, "");
            }

            try {
                const watch = window.protectedGlobals.WatchFolder(watchPath, (payload) => {
                    source.postMessage({ watchEvent: true, requestId, payload: normalizeWatchPayload(payload, e.detail.from, isPublicOrApproved) }, "*");
                }, e.detail.data.options || {});

                if (!window.protectedGlobals.__iframeWatchHandles) {
                    window.protectedGlobals.__iframeWatchHandles = new Map();
                }
                if (!window.protectedGlobals.__iframeWatchHandlesByInstance) {
                    window.protectedGlobals.__iframeWatchHandlesByInstance = new Map();
                }
                const instanceWatchers = window.protectedGlobals.__iframeWatchHandlesByInstance.get(source) || new Map();
                instanceWatchers.set(requestId, watch);
                window.protectedGlobals.__iframeWatchHandlesByInstance.set(source, instanceWatchers);
                window.protectedGlobals.__iframeWatchHandles.set(requestId, watch);
                source.postMessage({ watchFolderResult: true, result: { requestId }, requestId }, "*");
            } catch (err) {
                source.postMessage({ error: err.message || String(err), requestId }, "*");
            }
            return;
        }
        if (e.detail.data.cancelWatch) {
            const requestId = e.detail.data.requestId;
            try {
                const watch = window.protectedGlobals.__iframeWatchHandles && window.protectedGlobals.__iframeWatchHandles.get(requestId);
                if (watch && typeof watch.close === "function") {
                    watch.close();
                }
                if (window.protectedGlobals.__iframeWatchHandles) {
                    window.protectedGlobals.__iframeWatchHandles.delete(requestId);
                }
                if (window.protectedGlobals.__iframeWatchHandlesByInstance) {
                    const instanceWatchers = window.protectedGlobals.__iframeWatchHandlesByInstance.get(source);
                    if (instanceWatchers) {
                        instanceWatchers.delete(requestId);
                        if (instanceWatchers.size === 0) {
                            window.protectedGlobals.__iframeWatchHandlesByInstance.delete(source);
                        }
                    }
                }
                source.postMessage({ cancelWatchResult: true, requestId }, "*");
            } catch (err) {
                source.postMessage({ error: err.message || String(err), requestId }, "*");
            }
            return;
        }
        if (!e.detail.data.path) return;
        if (typeof options !== "object" || options === null) options = undefined;
        async function sendResponse() {
            const rawKey = e.detail.data.key;
            const key = rawKey === undefined || rawKey === null || String(rawKey) === "" ? null : rawKey;
            const keyWasProvided = !!key;
            const externalKeyAllowed = keyWasProvided && isExternalKeyAllowed(path, key, appName);

            if (keyWasProvided && !externalKeyAllowed) {
                source.postMessage({ error: "Invalid handle for filesystem access", from: e.detail.from, requestId: requestId }, "*");
                return;
            }

            if (e.detail.data.readFile) {
                if (externalKeyAllowed || path.startsWith("/__public") || path.startsWith("__public")) {
                    result = await window.protectedGlobals.ReadFile(path, options);
                    source.postMessage({ readFileResult: true, result: result, from: e.detail.from, requestId: requestId }, "*");
                    return;
                }
                path = "systemfiles/runtime/apps/" + e.detail.from + "/" + path;
                result = await window.protectedGlobals.ReadFile(path, options);
                source.postMessage({ readFileResult: true, result: result, from: e.detail.from, requestId: requestId }, "*");
            } else if (e.detail.data.readFolder) {
                if (externalKeyAllowed || path.startsWith("/__public") || path.startsWith("__public")) {
                    result = await window.protectedGlobals.ReadFolder(path, options);
                    source.postMessage({ readFolderResult: true, result: result, from: e.detail.from, requestId: requestId }, "*");
                    return;
                }
                path = "systemfiles/runtime/apps/" + e.detail.from + "/" + path;
                result = await window.protectedGlobals.ReadFolder(path, options);
                source.postMessage({ readFolderResult: true, result: result, from: e.detail.from, requestId: requestId }, "*");
            } else if (e.detail.data.folderExists) {
                if (externalKeyAllowed || path.startsWith("/__public") || path.startsWith("__public")) {
                    result = await window.protectedGlobals.FolderExists(path, options);
                    source.postMessage({ folderExistsResult: true, result: result, from: e.detail.from, requestId: requestId }, "*");
                    return;
                }
                path = "systemfiles/runtime/apps/" + e.detail.from + "/" + path;
                result = await window.protectedGlobals.FolderExists(path, options);
                source.postMessage({ folderExistsResult: true, result: result, from: e.detail.from, requestId: requestId }, "*");
            } else if (e.detail.data.fileExists) {
                if (externalKeyAllowed || path.startsWith("/__public") || path.startsWith("__public")) {
                    result = await window.protectedGlobals.FileExists(path, options);
                    source.postMessage({ fileExistsResult: true, result: result, from: e.detail.from, requestId: requestId }, "*");
                    return;
                }
                path = "systemfiles/runtime/apps/" + e.detail.from + "/" + path;
                result = await window.protectedGlobals.FileExists(path, options);
                source.postMessage({ fileExistsResult: true, result: result, from: e.detail.from, requestId: requestId }, "*");
            }
        }
        


















        async function sendProtectedResponse(externalAllowed) {
            const externalKey = e.detail.data.key;
            if (e.detail.data.writeFile) {
                if (externalAllowed || path.startsWith("/__public") || path.startsWith("__public")) {
                    result = await window.protectedGlobals.WriteFile(path, e.detail.data.content, options);
                    source.postMessage({ writeFileResult: true, result: result, from: e.detail.from, requestId: requestId }, "*");
                    return;
                }
                const internalPath = "systemfiles/runtime/apps/" + e.detail.from + "/" + path;
                result = await window.protectedGlobals.WriteFile(internalPath, e.detail.data.content, options);
                source.postMessage({ writeFileResult: true, result: result, from: e.detail.from, requestId: requestId }, "*");
            } else if (e.detail.data.writeFolder) {
                if (externalAllowed || path.startsWith("/__public") || path.startsWith("__public")) {
                    result = await window.protectedGlobals.WriteFolder(path, options);
                    source.postMessage({ writeFolderResult: true, result: result, from: e.detail.from, requestId: requestId }, "*");
                    return;
                }
                const internalPath = "systemfiles/runtime/apps/" + e.detail.from + "/" + path;
                result = await window.protectedGlobals.WriteFolder(internalPath, options);
                source.postMessage({ writeFolderResult: true, result: result, from: e.detail.from, requestId: requestId }, "*");
            } else if (e.detail.data.deleteFile) {
                if ((externalKey && isExternalKeyAllowed(path, externalKey, appName)) || path.startsWith("/__public") || path.startsWith("__public")) {
                    result = await window.protectedGlobals.DeleteFile(path, options);
                    source.postMessage({ deleteFileResult: true, result: result, from: e.detail.from, requestId: requestId }, "*");
                    return;
                }
                path = "systemfiles/runtime/apps/" + e.detail.from + "/" + path;
                result = await window.protectedGlobals.DeleteFile(path, options);
                source.postMessage({ deleteFileResult: true, result: result, from: e.detail.from, requestId: requestId }, "*");
            } else if (e.detail.data.deleteFolder) {
                if ((externalKey && isExternalKeyAllowed(path, externalKey, appName)) || path.startsWith("/__public") || path.startsWith("__public")) {
                    result = await window.protectedGlobals.DeleteFolder(path, options);
                    source.postMessage({ deleteFolderResult: true, result: result, from: e.detail.from, requestId: requestId }, "*");
                    return;
                }
                path = "systemfiles/runtime/apps/" + e.detail.from + "/" + path;
                result = await window.protectedGlobals.DeleteFolder(path, options);
                source.postMessage({ deleteFolderResult: true, result: result, from: e.detail.from, requestId: requestId }, "*");
            } else if (e.detail.data.renameFile) {
                if ((externalKey && isExternalKeyAllowed(path, externalKey, appName)) || path.startsWith("/__public") || path.startsWith("__public")) {
                    result = await window.protectedGlobals.RenameFile(path, e.detail.data.newName);
                    source.postMessage({ renameFileResult: true, result: result, from: e.detail.from, requestId: requestId }, "*");
                    return;
                }
                const internalPath = "systemfiles/runtime/apps/" + e.detail.from + "/" + path;
                result = await window.protectedGlobals.RenameFile(internalPath, e.detail.data.newName);
                source.postMessage({ renameFileResult: true, result: result, from: e.detail.from, requestId: requestId }, "*");
            } else if (e.detail.data.renameFolder) {
                if ((externalKey && isExternalKeyAllowed(path, externalKey, appName)) || path.startsWith("/__public") || path.startsWith("__public")) {
                    result = await window.protectedGlobals.RenameFolder(path, e.detail.data.newName);
                    source.postMessage({ renameFolderResult: true, result: result, from: e.detail.from, requestId: requestId }, "*");
                    return;
                }
                const internalPath = "systemfiles/runtime/apps/" + e.detail.from + "/" + path;
                result = await window.protectedGlobals.RenameFolder(internalPath, e.detail.data.newName);
                source.postMessage({ renameFolderResult: true, result: result, from: e.detail.from, requestId: requestId }, "*");
            } else if (e.detail.data.pasteFile) {
                if ((externalKey && isExternalKeyAllowed(path, externalKey, appName)) || path.startsWith("/__public") || path.startsWith("__public")) {
                    result = await window.protectedGlobals.PasteFile(path, e.detail.data.clipboard);
                    source.postMessage({ pasteFileResult: true, result: result, from: e.detail.from, requestId: requestId }, "*");
                    return;
                }
                const internalPath = "systemfiles/runtime/apps/" + e.detail.from + "/" + path;
                result = await window.protectedGlobals.PasteFile(internalPath, e.detail.data.clipboard);
                source.postMessage({ pasteFileResult: true, result: result, from: e.detail.from, requestId: requestId }, "*");
            } else if (e.detail.data.pasteFolder) {
                if ((externalKey && isExternalKeyAllowed(path, externalKey, appName)) || path.startsWith("/__public") || path.startsWith("__public")) {
                    result = await window.protectedGlobals.PasteFolder(path, e.detail.data.clipboard);
                    source.postMessage({ pasteFolderResult: true, result: result, from: e.detail.from, requestId: requestId }, "*");
                    return;
                }
                const internalPath = "systemfiles/runtime/apps/" + e.detail.from + "/" + path;
                result = await window.protectedGlobals.PasteFolder(internalPath, e.detail.data.clipboard);
                source.postMessage({ pasteFolderResult: true, result: result, from: e.detail.from, requestId: requestId }, "*");
            }
        };












        const rawKey = e.detail.data.key;
        const key = rawKey === undefined || rawKey === null || String(rawKey) === "" ? null : rawKey;
        const keyWasProvided = !!key;
        const externalWriteRequest = keyWasProvided && isExternalKeyAllowed(path, key, appName);
        const invalidHandleRequest = keyWasProvided && !externalWriteRequest;
        const isReadOnlyRequest = !e.detail.data.readFile && !e.detail.data.readFolder && !e.detail.data.folderExists && !e.detail.data.fileExists;

        if (invalidHandleRequest) {
            source.postMessage({ error: "Invalid handle for filesystem access", from: e.detail.from, requestId: requestId }, "*");
            return;
        }

        if (isReadOnlyRequest) {
            if (externalWriteRequest) {
                sendProtectedResponse(true);
            } else if (window.protectedGlobals.appPerms[appName].storage === "true") {
                sendProtectedResponse(false);
            } else if (window.protectedGlobals.appPerms[appName].storage === "ask") {
                dialogOpen = true;
                let allow = await showAppPermissionPrompt(appName, "storage");
                dialogOpen = false;
                if (allow) {
                    sendProtectedResponse();
                } else {
                    source.postMessage({ result: "Permission denied", from: e.detail.from, requestId: requestId }, "*");
                }
            } else {
                source.postMessage({ result: "Permission denied", from: e.detail.from, requestId: requestId }, "*");
            }
        } else {
            sendResponse();
        }
    });
})()