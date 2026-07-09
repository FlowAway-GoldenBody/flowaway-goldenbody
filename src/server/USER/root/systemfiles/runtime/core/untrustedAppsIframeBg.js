'use strict';

(() => {
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




    window.addEventListener("translatedmessage", async (e) => {
        let options = e.detail.data.options;
        let path = e.detail.data.path;
        let source = e.detail.source;
        if (!typeof options === "object") options = undefined;
        if (e.detail.data.readFile) {
            path = "systemfiles/runtime/apps/" + e.detail.from + "/" + path;
            let result = await window.protectedGlobals.ReadFile(path, options);
            source.postMessage({ readFileResult: true, result: result, from: e.detail.from }, "*");
        } else if (e.detail.data.writeFile) {
            path = "systemfiles/runtime/apps/" + e.detail.from + "/" + path;
            let result = await window.protectedGlobals.WriteFile(path, e.detail.data.content, options);
            source.postMessage({ writeFileResult: true, result: result, from: e.detail.from }, "*");
        } else if (e.detail.data.deleteFile) {
            path = "systemfiles/runtime/apps/" + e.detail.from + "/" + path;
            let result = await window.protectedGlobals.DeleteFile(path, options);
            source.postMessage({ deleteFileResult: true, result: result, from: e.detail.from }, "*");
        } else if (e.detail.data.readFolder) {
            path = "systemfiles/runtime/apps/" + e.detail.from + "/" + path;
            let result = await window.protectedGlobals.ReadFolder(path, options);
            source.postMessage({ readFolderResult: true, result: result, from: e.detail.from }, "*");
        } else if (e.detail.data.writeFolder) {
            path = "systemfiles/runtime/apps/" + e.detail.from + "/" + path;
            let result = await window.protectedGlobals.WriteFolder(path, options);
            source.postMessage({ writeFolderResult: true, result: result, from: e.detail.from }, "*");
        } else if (e.detail.data.deleteFolder) {
            path = "systemfiles/runtime/apps/" + e.detail.from + "/" + path;
            let result = await window.protectedGlobals.DeleteFolder(path, options);
            source.postMessage({ deleteFolderResult: true, result: result, from: e.detail.from }, "*");
        }
    });
})()