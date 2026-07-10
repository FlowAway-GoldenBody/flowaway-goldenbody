'use strict';

(() => {
async function showAppPermissionPrompt(appName, permissionType) {
    return new Promise((resolve) => {

        const saveChoice = (allowed, remember) => {
            if (remember) {
                if (!window.protectedGlobals.appPerms[appName]) {
                    window.protectedGlobals.appPerms[appName] = {};
                }

                window.protectedGlobals.appPerms[appName][permissionType] = String(allowed);

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
        dialog.style.cssText = `
            width:420px;
            margin-left: ${document.body.offsetWidth-476}; // width + 2 * padding
            margin-right: 0;
            top:0px;
            z-index:100003;
            background:#fff;
            border-radius:16px;
            box-shadow:0 20px 60px rgba(0,0,0,.35);
            padding:28px;
            font-family:system-ui,sans-serif;
            animation:popup .18s ease;
        `;
        dialog.style.position = "fixed";

        // App Icon
        const icon = document.createElement("div");
        icon.textContent = `"${appName}" says:`;
        icon.style.cssText = `
            font-size:42px;
            text-align:center;
            margin-bottom:14px;
            color:black;
        `;

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
        desc.innerHTML = `
            <strong>${appName}</strong> wants permission to access
            <strong>${permissionType}</strong>.
        `;
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
            icon,
            title,
            desc,
            rememberRow,
            buttons
        );

        document.body.appendChild(dialog);

        const style = document.createElement("style");
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

        const escListener = (e) => {
            if (e.key === "Escape") {
                saveChoice(false, false);
            }
        };

        window.addEventListener("keydown", escListener);
    });
}
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
            if (document.body) document.body.dispatchEvent(keyEvent);
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
            if (document.body) document.body.dispatchEvent(mouseEvent);
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
        if (typeof options !== "object" || options === null) options = undefined;
        let requestId = e.detail.data.requestId;
        async function sendResponse() {
            if (e.detail.data.readFile) {
                path = "systemfiles/runtime/apps/" + e.detail.from + "/" + path;
                let result = await window.protectedGlobals.ReadFile(path, options);
                source.postMessage({ readFileResult: true, result: result, from: e.detail.from, requestId: requestId }, "*");
            } else if (e.detail.data.deleteFile) {
                path = "systemfiles/runtime/apps/" + e.detail.from + "/" + path;
                let result = await window.protectedGlobals.DeleteFile(path, options);
                source.postMessage({ deleteFileResult: true, result: result, from: e.detail.from, requestId: requestId }, "*");
            } else if (e.detail.data.readFolder) {
                path = "systemfiles/runtime/apps/" + e.detail.from + "/" + path;
                let result = await window.protectedGlobals.ReadFolder(path, options);
                source.postMessage({ readFolderResult: true, result: result, from: e.detail.from, requestId: requestId }, "*");
            } else if (e.detail.data.deleteFolder) {
                path = "systemfiles/runtime/apps/" + e.detail.from + "/" + path;
                let result = await window.protectedGlobals.DeleteFolder(path, options);
                source.postMessage({ deleteFolderResult: true, result: result, from: e.detail.from, requestId: requestId }, "*");
            }
        }
        async function sendProtectedResponse() {
            if (e.detail.data.writeFile) {
                path = "systemfiles/runtime/apps/" + e.detail.from + "/" + path;
                let result = await window.protectedGlobals.WriteFile(path, e.detail.data.content, options);
                source.postMessage({ writeFileResult: true, result: result, from: e.detail.from, requestId: requestId }, "*");
            } else if (e.detail.data.writeFolder) {
                path = "systemfiles/runtime/apps/" + e.detail.from + "/" + path;
                let result = await window.protectedGlobals.WriteFolder(path, options);
                source.postMessage({ writeFolderResult: true, result: result, from: e.detail.from, requestId: requestId }, "*");
            } 
        };
        if (!window.protectedGlobals.appPerms[appName]) {
            window.protectedGlobals.appPerms[appName] = { storage: "ask", notification: "ask" };
        }
        if (e.detail.data.writeFolder || e.detail.data.writeFile) {
            if (window.protectedGlobals.appPerms[appName].storage === "true") {
                sendProtectedResponse();
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