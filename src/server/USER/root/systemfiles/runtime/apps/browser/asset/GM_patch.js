const unsafeWindow = window;

const GM_addElement = (parent, tag, props) => {
    if (typeof parent === 'string') {
        props = tag || {};
        tag = parent;
        parent = document.head;
    }

    const el = document.createElement(tag);
    for (const [key, value] of Object.entries(props)) {
        if (key === 'text') el.textContent = value;
        else el.setAttribute(key, value);
    }
    document.head.appendChild(el);
    return el;
};

const GM_addStyle = (css) => {
    const style = document.createElement('style');
    style.textContent = css;
    document.head.appendChild(style);
    return style;
}

function GM_download(detailsOrUrl, name) {
    let url, filename, saveAs, onload, onerror, onprogress, headers, conflictAction;

    if (typeof detailsOrUrl === "string") {
        url = detailsOrUrl;
        filename = name;
    } else {
        ({ url, name: filename, saveAs, onload, onerror, onprogress, headers, conflictAction } = detailsOrUrl);
    }

    const controller = new AbortController();

    const run = async () => {
        try {
            let objectUrl;

            if (url instanceof Blob || url instanceof File) {
                objectUrl = URL.createObjectURL(url);
                filename ??= url instanceof File ? url.name : filename;
            } else {
                const fetchOptions = { signal: controller.signal };
                if (headers) fetchOptions.headers = headers;

                const response = await fetch(url, fetchOptions);

                if (!response.ok) {
                    onerror?.({ error: "not_succeeded", details: `HTTP ${response.status}` });
                    return;
                }

                const total = Number(response.headers.get("content-length")) || 0;
                let loaded = 0;
                const chunks = [];

                const reader = response.body.getReader();
                while (true) {
                    const { done, value } = await reader.read();
                    if (done) break;
                    chunks.push(value);
                    loaded += value.length;
                    onprogress?.({ loaded, total, lengthComputable: total > 0 });
                }

                const blob = new Blob(chunks);
                objectUrl = URL.createObjectURL(blob);
            }

            const anchor = document.createElement("a");
            anchor.href = objectUrl;
            anchor.download = filename ?? "";
            if (saveAs) anchor.target = "_blank";

            document.body.appendChild(anchor);
            anchor.click();
            document.body.removeChild(anchor);

            URL.revokeObjectURL(objectUrl);
            onload?.();
        } catch (err) {
            if (err.name === "AbortError") return;
            onerror?.({ error: "not_succeeded", details: err.message });
        }
    };

    run();

    return { abort: () => controller.abort() };
}

const GM_getResourceText = () => (console.warn('GM_getResourceText is not supported in this environment.'), '');
const GM_getResourceURL = () => (console.warn('GM_getResourceURL is not supported in this environment.'), '');
try {
const GM_info = {
    isIncognito: false,
    scriptHandler: 'shim',
    scriptMetaStr: `__META_STR__`,
    scriptWillUpdate: true,
    userAgentData: navigator.userAgentData || null,
    version: '1',
    script: JSON.parse(`__SCRIPT_OBJ__`)
}
} catch (e) {}
const GM_log = (...args) => console.log(...args);

const GM_notification = (_, ondone) => {
    console.warn('GM_notification is not supported in this environment');
    if (typeof ondone === 'function') ondone();
}

const GM_openInTab = (url) => window.open(url, '_blank');

const GM_registerMenuCommand = () => console.warn('GM_registerMenuCommand is not supported in this environment.');
const GM_unregisterMenuCommand = () => console.warn('GM_unregisterMenuCommand is not supported in this environment.');

const GM_setClipboard = async (text, _, cb) => {
    await navigator.clipboard.writeText(text);
    if (typeof cb === 'function') cb();
}

const GM_getTab = () => Promise.reject(new Error('GM_getTab is not supported in this environment.'));
const GM_saveTab = () => Promise.reject(new Error('GM_saveTab is not supported in this environment.'));
const GM_getTabs = () => (console.warn('GM_getTabs is not supported in this environment.'), Promise.resolve([]));

const GM_getValue = (key, defaultValue) => {
    const item = localStorage.getItem(`gm_${key}`);
    if (item !== null) {
        try {
            return JSON.parse(item);
        } catch {
            return item;
        }
    } else return defaultValue;
}
const GM_deleteValue = (key) => localStorage.removeItem(`gm_${key}`);
const GM_listValues = () => Object.keys(localStorage).filter(k => k.startsWith('gm_')).map(k => k.slice(3));
const GM_setValues = (obj) => {
    for (const [key, value] of Object.entries(obj)) GM_setValue(key, value);
}
const GM_getValues = (keys) => {
    const result = {};
    for (const key of keys) result[key] = GM_getValue(key);
    return result;
}
const GM_deleteValues = (keys) => {
    for (const key of keys) GM_deleteValue(key);
}

const _valueListeners = {};

const GM_setValue = (key, value) => {
    const old = GM_getValue(key);
    localStorage.setItem(`gm_${key}`, JSON.stringify(value));
    if (_valueListeners[key]) {
        for (const fn of Object.values(_valueListeners[key])) {
            fn(key, old, value, false);
        }
    }
};

const GM_addValueChangeListener = (key, fn) => {
    const id = crypto.randomUUID();
    (_valueListeners[key] ??= {})[id] = fn;
    return id;
};

const GM_removeValueChangeListener = (id) => {
    for (const key of Object.keys(_valueListeners)) {
        if (_valueListeners[key][id]) {
            delete _valueListeners[key][id];
            if (Object.keys(_valueListeners[key]).length === 0) delete _valueListeners[key];
            return;
        }
    }
};

window.addEventListener('storage', (e) => {
    if (!e.key?.startsWith('gm_')) return;
    const key = e.key.slice(3);
    if (!_valueListeners[key]) return;
    const oldVal = e.oldValue !== null ? JSON.parse(e.oldValue) : undefined;
    const newVal = e.newValue !== null ? JSON.parse(e.newValue) : undefined;
    for (const fn of Object.values(_valueListeners[key])) fn(key, oldVal, newVal, true);
});

function GM_xmlhttpRequest(details) {
    const {
        method = "GET",
        url,
        headers,
        data,
        timeout,
        context,
        responseType,
        overrideMimeType,
        user,
        password,
        onabort,
        onerror,
        onloadstart,
        onprogress,
        onreadystatechange,
        ontimeout,
        onload,
        anonymous,
        nocache,
        revalidate,
        redirect,
    } = details;

    const controller = new AbortController();
    const xhr = new XMLHttpRequest();

    const makeResponse = () => ({
        finalUrl: xhr.responseURL,
        readyState: xhr.readyState,
        status: xhr.status,
        statusText: xhr.statusText,
        responseHeaders: xhr.getAllResponseHeaders(),
        response: xhr.response,
        responseXML: xhr.responseXML,
        responseText: xhr.responseType === "" || xhr.responseType === "text" ? xhr.responseText : undefined,
        context,
    });

    let reqUrl = url instanceof URL ? url.toString() : url;
    if (nocache || revalidate) {
        const u = new URL(reqUrl, location.href);
        if (nocache) u.searchParams.set("_nocache", Date.now());
        if (revalidate) u.searchParams.set("_revalidate", "1");
        reqUrl = u.toString();
    }

    xhr.open(method, reqUrl, true, user ?? null, password ?? null);

    if (responseType && responseType !== "stream") xhr.responseType = responseType;
    if (overrideMimeType) xhr.overrideMimeType(overrideMimeType);
    if (timeout) xhr.timeout = timeout;
    if (anonymous) xhr.withCredentials = false;

    if (headers) {
        for (const [key, value] of Object.entries(headers)) {
            xhr.setRequestHeader(key, value);
        }
    }

    if (redirect === "error") {
        xhr.setRequestHeader("X-No-Redirect", "1");
    }

    xhr.onabort = () => onabort?.(makeResponse());
    xhr.onerror = () => onerror?.(makeResponse());
    xhr.ontimeout = () => ontimeout?.(makeResponse());
    xhr.onload = () => onload?.(makeResponse());
    xhr.onloadstart = () => onloadstart?.(makeResponse());
    xhr.onprogress = (e) => onprogress?.({ ...makeResponse(), loaded: e.loaded, total: e.total, lengthComputable: e.lengthComputable });
    xhr.onreadystatechange = () => onreadystatechange?.(makeResponse());

    let body = data ?? null;
    if (data instanceof URLSearchParams || data instanceof FormData) body = data;

    xhr.send(body);
    controller.signal.addEventListener("abort", () => xhr.abort());

    return { abort: () => xhr.abort() };
}

const GM_webRequest = () => console.warn('GM_webRequest is not supported in this environment.');

const GM_cookie = {
    list(details = {}, callback) {
        try {
            const { name, domain, path } = details;
            const all = document.cookie.split("; ").filter(Boolean);

            let cookies = all.map(entry => {
                const eqIdx = entry.indexOf("=");
                const cookieName = entry.slice(0, eqIdx);
                const cookieValue = entry.slice(eqIdx + 1);
                return {
                    name: cookieName,
                    value: cookieValue,
                    domain: document.domain,
                    path: "/",
                    secure: location.protocol === "https:",
                    session: true,
                    hostOnly: true,
                    httpOnly: false,
                    sameSite: "unspecified",
                    firstPartyDomain: "",
                    partitionKey: null,
                    expirationDate: undefined,
                };
            });

            if (name) cookies = cookies.filter(c => c.name === name);
            if (domain) cookies = cookies.filter(c => c.domain === domain || c.domain.endsWith(`.${domain}`));
            if (path) cookies = cookies.filter(c => c.path === path);

            callback?.(cookies, null);
            return Promise.resolve(cookies);
        } catch (err) {
            callback?.([], err.message);
            return Promise.reject(err.message);
        }
    },

    set(details = {}, callback) {
        try {
            const { name, value, domain, path, secure, expirationDate, httpOnly } = details;

            if (!name) throw new Error("Cookie name is required");

            let str = `${encodeURIComponent(name)}=${encodeURIComponent(value ?? "")}`;

            if (domain) str += `; Domain=${domain}`;
            if (path) str += `; Path=${path}`;
            else str += `; Path=/`;
            if (expirationDate) str += `; Expires=${new Date(expirationDate * 1000).toUTCString()}`;
            if (secure) str += `; Secure`;
            if (httpOnly) str += `; HttpOnly`;

            document.cookie = str;

            callback?.(undefined);
            return Promise.resolve();
        } catch (err) {
            callback?.(err.message);
            return Promise.reject(err.message);
        }
    },

    delete(details = {}, callback) {
        try {
            const { name, path, domain } = details;

            if (!name) throw new Error("Cookie name is required");

            let str = `${encodeURIComponent(name)}=; Expires=Thu, 01 Jan 1970 00:00:00 GMT`;
            if (path) str += `; Path=${path}`;
            else str += `; Path=/`;
            if (domain) str += `; Domain=${domain}`;

            document.cookie = str;

            callback?.(undefined);
            return Promise.resolve();
        } catch (err) {
            callback?.(err.message);
            return Promise.reject(err.message);
        }
    },
};

const GM_audio = {
    setMute: () => console.warn('GM_audio.setMute is not supported in this environment.'),
    getState: () => (console.warn('GM_audio.getState is not supported in this environment.'), Promise.resolve({ muted: false })),
    addStateChangeListener: () => console.warn('GM_audio.addStateChangeListener is not supported in this environment.'),
    removeStateChangeListener: () => console.warn('GM_audio.removeStateChangeListener is not supported in this environment.'),
};

(() => {
    const dispatch = (url) =>
        window.dispatchEvent(new CustomEvent("urlchange", { detail: { url } }));

    const wrap = (fn) =>
        function (...args) {
            const result = fn.apply(this, args);
            dispatch(location.href);
            return result;
        };

    history.pushState = wrap(history.pushState);
    history.replaceState = wrap(history.replaceState);

    window.addEventListener("popstate", () => dispatch(location.href));
    window.addEventListener("hashchange", () => dispatch(location.href));

    let _handler = null;
    Object.defineProperty(window, "onurlchange", {
        get: () => _handler,
        set(fn) {
            if (_handler) window.removeEventListener("urlchange", _handler);
            _handler = fn;
            if (fn) window.addEventListener("urlchange", fn);
        },
        configurable: true,
    });
})();