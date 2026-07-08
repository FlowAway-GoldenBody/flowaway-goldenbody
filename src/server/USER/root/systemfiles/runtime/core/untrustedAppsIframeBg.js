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
        } else if (event.data.keydownOnApp) {
            const keyEvent = new KeyboardEvent("keydown", {
                key: event.data.key || event.data.comboKey || "",
                code: event.data.code || "",
                ctrlKey: !!event.data.ctrl,
                altKey: !!event.data.alt,
                shiftKey: !!event.data.shift,
                metaKey: !!event.data.meta,
                repeat: !!event.data.repeat,
                bubbles: true,
                cancelable: true,
            });
            keyEvent.__gbComboKey = event.data.comboKey || "";
            keyEvent.__gbOriginalKey = event.data.key || "";
            window.dispatchEvent(keyEvent);
            document.dispatchEvent(keyEvent);
        }
    });
})();