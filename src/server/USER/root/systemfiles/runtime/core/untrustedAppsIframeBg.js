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
})();