// Preserve window.data if already set (e.g., from ouchbad.js account creation), otherwise initialize
if (!window.data) window.data = data;
window.____gbEventListners = [];
window.loaded = false;
window.APP_VERSION = 'v1.12.7';

if (typeof data.autohidetaskbar === 'undefined') {
    data.autohidetaskbar = false;
}
var hasChanges;
var atTop = '';
var zTop = 10;
function removeAllEventListernersInWindow() {
    for (const listener of window.____gbEventListners) {
        try {
            window.removeEventListener(listener.type, listener.handler, listener.options);
            document.removeEventListener(listener.type, listener.handler, listener.options);
        } catch (e) {
            console.error('Error removing event listener', e);
        }
    }
    window.____gbEventListners = [];
}
function formatBytes(bytes, decimals = 2) {
    if (bytes === 0) return '0 Bytes';

    const k = 1024;
    const dm = decimals < 0 ? 0 : decimals;
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB', 'PB', 'EB'];

    const i = Math.floor(Math.log(bytes) / Math.log(k));

    return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
}
function calculateVwInPixels(vwValue) {
    const viewportWidth = window.innerWidth; // Get the current viewport width in pixels
    const pixels = (vwValue * viewportWidth) / 100; // Apply the conversion formula
    return pixels;
}

window._flowawayDebugState = window._flowawayDebugState || {
    enabled: false,
    errors: [],
    maxErrors: 200
};

window.setFlowawayDebug = function (enabled) {
    window._flowawayDebugState = window._flowawayDebugState || {
        enabled: false,
        errors: [],
        maxErrors: 200
    };
    window._flowawayDebugState.enabled = !!enabled;
};

window.getFlowawayErrors = function () {
    window._flowawayDebugState = window._flowawayDebugState || {
        enabled: false,
        errors: [],
        maxErrors: 200
    };
    return (window._flowawayDebugState.errors || []).slice();
};

function flowawayDebug(scope, message, meta) {
    try {
        if (!window._flowawayDebugState || !window._flowawayDebugState.enabled) return;
        if (typeof meta === 'undefined') console.debug('[FLOWAWAY][' + scope + '] ' + message);
        else console.debug('[FLOWAWAY][' + scope + '] ' + message, meta);
    } catch (e) {}
}

function flowawayError(scope, message, error, meta) {
    try {
        window._flowawayDebugState = window._flowawayDebugState || {
            enabled: false,
            errors: [],
            maxErrors: 200
        };
        var entry = {
            ts: Date.now(),
            scope: scope,
            message: message,
            meta: meta || null,
            error: error ? error.stack || error.message || String(error) : null
        };
        window._flowawayDebugState.errors = window._flowawayDebugState.errors || [];
        window._flowawayDebugState.errors.push(entry);
        if (window._flowawayDebugState.errors.length > (window._flowawayDebugState.maxErrors || 200)) {
            window._flowawayDebugState.errors.shift();
        }
    } catch (e) {}

    if (typeof meta === 'undefined') console.error('[FLOWAWAY][' + scope + '] ' + message, error);
    else console.error('[FLOWAWAY][' + scope + '] ' + message, meta, error);
}

var nativeEventTargetAdd =
    window.EventTarget &&
    window.EventTarget.prototype &&
    typeof window.EventTarget.prototype.addEventListener === 'function'
        ? window.EventTarget.prototype.addEventListener
        : null;
var nativeDocumentEventlister = nativeEventTargetAdd
    ? nativeEventTargetAdd.bind(document)
    : document.addEventListener.bind(document);
var nativeWindowEventlister = nativeEventTargetAdd
    ? nativeEventTargetAdd.bind(window)
    : window.addEventListener.bind(window);
var nativeEventTargetRemove =
    window.EventTarget &&
    window.EventTarget.prototype &&
    typeof window.EventTarget.prototype.removeEventListener === 'function'
        ? window.EventTarget.prototype.removeEventListener
        : null;
var nativeDocumentEventRemover = nativeEventTargetRemove
    ? nativeEventTargetRemove.bind(document)
    : document.removeEventListener.bind(document);
var nativeWindowEventRemover = nativeEventTargetRemove
    ? nativeEventTargetRemove.bind(window)
    : window.removeEventListener.bind(window);

function isValidEventListener(handler) {
    return typeof handler === 'function' || !!(handler && typeof handler.handleEvent === 'function');
}

function normalizeCaptureOption(options) {
    if (typeof options === 'boolean') return options;
    if (options && typeof options === 'object' && typeof options.capture === 'boolean') return options.capture;
    return false;
}

function normalizeAddEventArgs(a, b, c, d) {
    // Supports both signatures:
    // 1) native: (type, handler, options)
    // 2) scoped: (appname, type, handler, options)
    if (typeof b === 'string' && isValidEventListener(c)) {
        return { appname: String(a || ''), type: b, handler: c, options: d };
    }
    return { appname: '', type: a, handler: b, options: c };
}

function addScopedListener(targetName, nativeAdd, appname, type, handler, options) {
    if (typeof type !== 'string' || !isValidEventListener(handler)) {
        return;
    }
    window.____gbEventListners.push({ type, handler, options });
    nativeAdd(type, handler, options);

    if (!appname) return;
    var scopedAppName = String(appname).trim();
    if (!scopedAppName) return;
    window[scopedAppName + '_handlers'] = window[scopedAppName + '_handlers'] || [];
    window[scopedAppName + '_handlers'].push({
        target: targetName,
        type,
        handler,
        options,
        capture: normalizeCaptureOption(options)
    });
}

document.addEventListener = function (a, b, c, d) {
    var parsed = normalizeAddEventArgs(a, b, c, d);
    addScopedListener(
        'document',
        nativeDocumentEventlister,
        parsed.appname,
        parsed.type,
        parsed.handler,
        parsed.options
    );
};

window.addEventListener = function (a, b, c, d) {
    var parsed = normalizeAddEventArgs(a, b, c, d);
    addScopedListener('window', nativeWindowEventlister, parsed.appname, parsed.type, parsed.handler, parsed.options);
};

window.removeAllEventListenersForApp = function (appname) {
    var scopedAppName = String(appname || '').trim();
    if (!scopedAppName) return;
    var handlers = window[scopedAppName + '_handlers'] || [];
    handlers.forEach(({ target, type, handler, options, capture }) => {
        if (target === 'document') {
            try {
                nativeDocumentEventRemover(type, handler, options);
            } catch (e) {}
            try {
                nativeDocumentEventRemover(
                    type,
                    handler,
                    typeof capture === 'boolean' ? capture : normalizeCaptureOption(options)
                );
            } catch (e) {}
            return;
        }
        if (target === 'window') {
            try {
                nativeWindowEventRemover(type, handler, options);
            } catch (e) {}
            try {
                nativeWindowEventRemover(
                    type,
                    handler,
                    typeof capture === 'boolean' ? capture : normalizeCaptureOption(options)
                );
            } catch (e) {}
            return;
        }
        // Backward compatibility for older tracked entries without target.
        var fallbackCapture = typeof capture === 'boolean' ? capture : normalizeCaptureOption(options);
        try {
            nativeWindowEventRemover(type, handler, options);
        } catch (e) {}
        try {
            nativeWindowEventRemover(type, handler, fallbackCapture);
        } catch (e) {}
        try {
            nativeDocumentEventRemover(type, handler, options);
        } catch (e) {}
        try {
            nativeDocumentEventRemover(type, handler, fallbackCapture);
        } catch (e) {}
    });
    window[scopedAppName + '_handlers'] = [];
};

window.windowControlSvgs = {
    minimize:
        '<svg viewBox="0 0 24 24" width="14" height="14" aria-hidden="true" focusable="false" style="display:block;margin:auto" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="5" y1="12" x2="19" y2="12"></line></svg>',
    maximize:
        '<svg viewBox="0 0 24 24" width="14" height="14" aria-hidden="true" focusable="false" style="display:block;margin:auto" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="5" y="5" width="14" height="14" rx="1" ry="1"></rect></svg>',
    restore:
        '<svg viewBox="0 0 24 24" width="14" height="14" aria-hidden="true" focusable="false" style="display:block;margin:auto" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="9" y="9" width="10" height="10" rx="1" ry="1"></rect><path d="M15 9V5H5v10h4"></path></svg>',
    close: '<svg viewBox="0 0 24 24" width="14" height="14" aria-hidden="true" focusable="false" style="display:block;margin:auto" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="6" y1="6" x2="18" y2="18"></line><line x1="18" y1="6" x2="6" y2="18"></line></svg>'
};

window.applyWindowControlIcon = function (button, iconName, options = {}) {
    if (!button) return;
    var svg = window.windowControlSvgs[iconName] || '';
    button.innerHTML = svg;
    button.style.minHeight = options.minHeight || '1vh';

    // Store metadata on the element so we can recompute on resize
    button.dataset.flowControl = 'true';
    button.dataset.flowControlIcon = iconName;
    // preferred vw amount for this control (numbers only)
    if (typeof options.minVw !== 'undefined') button.dataset.minVw = String(options.minVw);
    else button.dataset.minVw = iconName === 'restore' || iconName === 'maximize' ? '2.6' : '2.3';
    // thresholds and fallbacks (pixels) - keep them identical per your request
    if (typeof options.thresholdPx !== 'undefined') button.dataset.thresholdPx = String(options.thresholdPx);
    else button.dataset.thresholdPx = iconName === 'restore' || iconName === 'maximize' ? '35' : '31';
    if (typeof options.fallbackPx !== 'undefined') button.dataset.fallbackPx = String(options.fallbackPx);
    else button.dataset.fallbackPx = iconName === 'restore' || iconName === 'maximize' ? '35' : '31';
    // allow overriding the explicit CSS value for minWidth
    if (typeof options.minWidth !== 'undefined') button.dataset.minWidthOption = String(options.minWidth);

    // Apply sizing now based on current viewport
    if (!window._applyFlowawayControlSizing) {
        window._applyFlowawayControlSizing = function (btn) {
            if (!btn) return;
            var icon = btn.dataset.flowControlIcon;
            var vwVal = parseFloat(btn.dataset.minVw) || (icon === 'restore' || icon === 'maximize' ? 2.6 : 2.3);
            var threshold =
                parseFloat(btn.dataset.thresholdPx) || (icon === 'restore' || icon === 'maximize' ? 35 : 31);
            var fallback = btn.dataset.fallbackPx || (icon === 'restore' || icon === 'maximize' ? '35' : '31');
            var computedPx = calculateVwInPixels(vwVal);

            // If a minWidth option was explicitly provided, respect it but cap it
            var opt = btn.dataset.minWidthOption;
            if (opt) {
                var s = String(opt).trim();
                if (s.endsWith('px')) {
                    var val = parseFloat(s);
                    if (!isNaN(val)) {
                        var capped = Math.min(val, threshold);
                        btn.style.minWidth = capped + 'px';
                        return;
                    }
                }
                if (s.endsWith('vw')) {
                    var vwNum = parseFloat(s);
                    if (!isNaN(vwNum)) {
                        var px = calculateVwInPixels(vwNum);
                        if (px < threshold) {
                            btn.style.minWidth = s; // safe to use vw
                            return;
                        } else {
                            btn.style.minWidth = fallback + 'px';
                            return;
                        }
                    }
                }
                // fallback: try numeric parse as px
                var maybe = parseFloat(s);
                if (!isNaN(maybe)) {
                    var capped2 = Math.min(maybe, threshold);
                    btn.style.minWidth = capped2 + 'px';
                    return;
                }
                // If we couldn't parse, fallthrough to default behavior
            }

            // Default behavior: use vw when its computed px is below threshold, otherwise use fallback px
            if (computedPx < threshold) {
                btn.style.minWidth = vwVal + 'vw';
            } else {
                btn.style.minWidth = fallback + 'px';
            }
        };

        // Add a resize handler that reapplies sizing to tracked controls
        try {
            if (window._flowaway_handlers && window._flowaway_handlers.onResize)
                window.removeEventListener('resize', window._flowaway_handlers.onResize);
            window._flowaway_handlers = window._flowaway_handlers || {};
            window._flowaway_handlers.onResize = function () {
                try {
                    document.querySelectorAll('[data-flow-control]').forEach((b) => {
                        try {
                            window._applyFlowawayControlSizing(b);
                        } catch (e) {}
                    });
                } catch (e) {}
            };
            window.addEventListener('resize', window._flowaway_handlers.onResize);
        } catch (e) {}
    }

    // finally apply sizing for this particular button
    try {
        window._applyFlowawayControlSizing(button);
    } catch (e) {}
};

window.setWindowMaximizeIcon = function (button, isMaximized) {
    window.applyWindowControlIcon(button, isMaximized ? 'restore' : 'maximize');
};
document.body.style.backgroundImage = 'url(https://flowaway-goldenbody.github.io/GBCDN/cloudwithtemples.png)';
document.body.style.backgroundSize = 'cover';
document.body.style.backgroundPosition = 'center';
document.body.style.backgroundRepeat = 'no-repeat';
var rebuildhandler = function () {
    try {
        try {
            window._flowawayIsRebuilding = true;
        } catch (e) {}
        // remove all event listeners to refresh the environment.
        removeAllEventListernersInWindow();
        // Pause and unload any playing media to avoid audio carrying over
        try {
            document.querySelectorAll('audio,video').forEach((m) => {
                try {
                    m.pause();
                    m.src = '';
                } catch (e) {}
            });
        } catch (e) {}
        try {
            if (appPollingTimer) clearTimeout(appPollingTimer);
            if (appPollingReconnectTimer) clearTimeout(appPollingReconnectTimer);
            if (appPollingSafetyInterval) clearInterval(appPollingSafetyInterval);
            appPollingTimer = null;
            appPollingReconnectTimer = null;
            appPollingSafetyInterval = null;
            appPollingInFlight = false;
            appPollingDirty = false;
            appPollingActive = false;
            appPollingPendingFolders = new Set();
            if (appPollingSocket) {
                try {
                    appPollingSocket.onopen = null;
                } catch (e) {}
                try {
                    appPollingSocket.onmessage = null;
                } catch (e) {}
                try {
                    appPollingSocket.onerror = null;
                } catch (e) {}
                try {
                    appPollingSocket.onclose = null;
                } catch (e) {}
                try {
                    appPollingSocket.close();
                } catch (e) {}
            }
            appPollingSocket = null;
        } catch (e) {}
        try {
            if (window._flowaway_handlers && window._flowaway_handlers.timeIntervalId) {
                clearInterval(window._flowaway_handlers.timeIntervalId);
                delete window._flowaway_handlers.timeIntervalId;
            }
            if (window._flowaway_handlers && window._flowaway_handlers.applyTaskButtonsRetryTimer) {
                clearTimeout(window._flowaway_handlers.applyTaskButtonsRetryTimer);
                delete window._flowaway_handlers.applyTaskButtonsRetryTimer;
            }
        } catch (e) {}
        try {
            var oldTaskbar = document.getElementById('taskbar');
            if (oldTaskbar) oldTaskbar.remove();
            var oldStartMenu = document.getElementById('startMenu');
            if (oldStartMenu) oldStartMenu.remove();
        } catch (e) {}

        try {
            window.apps = [];
            window.appButtons = {};
            window.appsButtonsApplied = false;
            window._suppressTaskbarPersist = true;
        } catch (e) {}

        try {
            delete window.__ouchbad_preinit_done;
            delete window.__ouchbad_BASE;
            delete window.__ouchbad_goldenbodywebsite;
            delete window.__ouchbad_zmcdserver;
            delete window.__ouchbad_SERVER;
            delete window.__ouchbad_downloadserver;
            delete window.__ouchbad_baseOrigin;
            delete window.__ouchbad_wsProtocol;
            delete window.__ouchbad_hostname;
            delete window._flowawayLoadTreePromise;
            delete window._flowawayFileFetchInFlight;
            delete window._flowawayFileFetchRecent;
            delete window._flowawaySystemHelperState;
            delete window._flowawayMissingFolders;
            window.loaded = false;
        } catch (e) {}
        // Remove all children from the documentElement (head/body) to get a clean slate
        var docEl = document.documentElement;
        while (docEl.firstChild) docEl.removeChild(docEl.firstChild);

        // Recreate minimal head and body so we can inject ouchbad.js reliably
        var head = document.createElement('head');
        var meta = document.createElement('meta');
        meta.setAttribute('charset', 'utf-8');
        head.appendChild(meta);
        docEl.appendChild(head);

        var body = document.createElement('body');
        docEl.appendChild(body);
        // Inject homepage loader
        var script = document.createElement('script');
        script.src = 'ouchbad.js';

        //clear state
        window.appsButtonsApplied = false;
        data = null;
        // small timeout to ensure DOM plumbing finishes
        setTimeout(() => {
            try {
                document.body.appendChild(script);
            } catch (e) {
                console.error('append homepage script failed', e);
                location.reload();
            }
        }, 80);
    } catch (err) {
        console.error('rebuildhandler error, falling back to reload', err);
        try {
            location.reload();
        } catch (e) {
            /* ignore */
        }
    }
};
var worldvolume = 0.5;

window.findNodeByPath = function (relPath) {
    var parts = relPath.split('/');
    var current = treeData;
    for (let i = 1; i < parts.length; i++) {
        if (!current[1]) return null;
        current = current[1].find((c) => c[0] === parts[i]);
    }
    return current;
};
window.removeNodeFromTree = function (node, pathParts) {
    if (!node || !Array.isArray(node[1])) return false;

    var [target, ...rest] = pathParts;

    for (let i = 0; i < node[1].length; i++) {
        var child = node[1][i];

        if (child[0] === target) {
            if (rest.length === 0) {
                node[1].splice(i, 1); // delete node
                return true;
            } else {
                return window.removeNodeFromTree(child, rest); // go deeper
            }
        }
    }

    return false; // not found
};
// global vars
var savedScrollX = 0;
var savedScrollY = 0;
var nhjd = 1;

// central place to store named handlers so we can remove/rebind safely
window._flowaway_handlers = window._flowaway_handlers || {};

// Scroll lock - ensure single binding
try {
    if (window._flowaway_handlers.onScroll) window.removeEventListener('scroll', window._flowaway_handlers.onScroll);
    window._flowaway_handlers.onScroll = () => {
        window.scrollTo(savedScrollX, savedScrollY);
    };
    window.addEventListener('scroll', window._flowaway_handlers.onScroll);
} catch (e) {}

savedScrollX = window.scrollX;
savedScrollY = window.scrollY;

// body restrictions
var bodyStyle = document.createElement('style');
bodyStyle.textContent = `body {
overflow: hidden;
}`;
document.body.appendChild(bodyStyle);
// Prevent default context menu (single binding)
try {
    if (window._flowaway_handlers.onContextMenu)
        window.removeEventListener('contextmenu', window._flowaway_handlers.onContextMenu);
    window._flowaway_handlers.onContextMenu = function (e) {
        e.preventDefault();
    };
    window.addEventListener('contextmenu', window._flowaway_handlers.onContextMenu);
} catch (e) {}
// content
try {
    if (window._flowaway_handlers.onBeforeUnload)
        window.removeEventListener('beforeunload', window._flowaway_handlers.onBeforeUnload);
    window._flowaway_handlers.onBeforeUnload = function (event) {
        event.preventDefault();
    };
    window.addEventListener('beforeunload', window._flowaway_handlers.onBeforeUnload);
} catch (e) {}

function showSessionExpiredDialog() {
    if (document.getElementById('session-expired-dialog') || window._flowawayIsRebuilding) {
        // already shown
        return;
    }

    const dlg = document.createElement('div');
    dlg.id = 'session-expired-dialog';
    Object.assign(dlg.style, {
        position: 'fixed',
        left: '50%',
        top: '50%',
        transform: 'translate(-50%, -50%)',
        width: '420px',
        maxWidth: '90vw',
        background: window.data && window.data.dark ? '#222' : '#fff',
        color: window.data && window.data.dark ? '#fff' : '#000',
        borderRadius: '8px',
        boxShadow: '0 8px 30px rgba(0,0,0,0.3)',
        zIndex: 99999,
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
        padding: '12px'
    });

    const header = document.createElement('div');
    header.style.display = 'flex';
    header.style.alignItems = 'center';
    header.style.justifyContent = 'space-between';

    const htitle = document.createElement('div');
    htitle.textContent = 'Session Expired';
    htitle.style.fontWeight = '600';

    const closeX = document.createElement('button');
    closeX.setAttribute('aria-label', 'Close dialog');
    closeX.textContent = '✕';
    Object.assign(closeX.style, {
        border: 'none',
        background: 'transparent',
        cursor: 'pointer',
        width: '32px',
        height: '28px',
        padding: '0',
        display: 'grid',
        placeItems: 'center',
        lineHeight: '0',
        fontSize: '14px'
    });

    header.append(htitle);
    header.append(closeX);
    dlg.appendChild(header);

    const content = document.createElement('div');
    content.style.padding = '8px 0';
    content.style.fontSize = '13px';
    content.style.flex = '1';
    content.textContent =
        'Your session has expired. Refill using your current session token, or sign in again if needed.';
    dlg.appendChild(content);

    const status = document.createElement('div');
    status.style.fontSize = '12px';
    status.style.minHeight = '16px';
    status.style.marginBottom = '8px';
    dlg.appendChild(status);

    // Password input for password-based refill
    const pwdRow = document.createElement('div');
    pwdRow.style.display = 'flex';
    pwdRow.style.gap = '8px';
    pwdRow.style.alignItems = 'center';
    pwdRow.style.marginBottom = '8px';

    const pwdInput = document.createElement('input');
    pwdInput.type = 'password';
    pwdInput.placeholder = 'Account password';
    Object.assign(pwdInput.style, {
        flex: '1',
        padding: '6px',
        borderRadius: '6px',
        border: '1px solid #ccc',
        boxSizing: 'border-box'
    });

    pwdRow.appendChild(pwdInput);
    dlg.appendChild(pwdRow);

    const btnRow = document.createElement('div');
    btnRow.style.display = 'flex';
    btnRow.style.justifyContent = 'flex-end';
    btnRow.style.gap = '8px';

    const reloadBtn = document.createElement('button');
    reloadBtn.textContent = 'Sign In Again';
    reloadBtn.style.padding = '6px 10px';

    const refillBtn = document.createElement('button');
    refillBtn.textContent = 'Refill Session';
    refillBtn.style.padding = '6px 10px';

    const closeBtn = document.createElement('button');
    closeBtn.textContent = 'Close';
    closeBtn.style.padding = '6px 10px';

    btnRow.append(closeBtn, refillBtn, reloadBtn);
    dlg.appendChild(btnRow);

    closeX.addEventListener('click', () => dlg.remove());
    closeBtn.addEventListener('click', () => dlg.remove());
    refillBtn.addEventListener('click', async () => {
        // When user clicks refill, don't attempt token-based refill automatically.
        // Instead prompt for password and only send a password-based refill when provided.
        const uname = (function () {
            const u = getCurrentUsernameForRequests();
            if (u && typeof u === 'string' && u.trim()) return u.trim();
            if (window.data && typeof window.data.username === 'string') return window.data.username.trim();
            return '';
        })();

        if (!uname) {
            status.textContent = 'No username available. Sign in again.';
            status.style.color = 'red';
            return;
        }

        const password = pwdInput && typeof pwdInput.value === 'string' ? pwdInput.value.trim() : '';

        // If no password provided yet, focus the input and ask the user to enter it.
        if (!password) {
            status.textContent = 'Enter your account password above and click Refill to submit.';
            status.style.color = '#c66';
            try {
                pwdInput.focus();
            } catch (e) {}
            return;
        }

        // Now send password-based refill request (do not rely on existing session token)
        refillBtn.disabled = true;
        refillBtn.textContent = 'Refilling...';
        status.textContent = '';

        try {
            const res = await fetch(zmcdserver, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ refillSession: true, username: uname, password })
            });

            let body = null;
            try {
                body = await res.json();
            } catch (e) {
                body = null;
            }

            if (!res.ok) {
                const serverMsg = (body && body.error) || body || res.statusText || 'unknown error';
                status.textContent = `Session refill failed: ${serverMsg} (HTTP ${res.status})`;
                status.style.color = 'red';
                console.error('Refill failed:', res.status, body);
                refillBtn.disabled = false;
                refillBtn.textContent = 'Refill Session';
                return;
            }

            if (!body || !body.success || !body.authToken) {
                const serverMsg = (body && body.error) || 'Invalid server response';
                status.textContent = `Session refill failed: ${serverMsg}`;
                status.style.color = 'red';
                console.error('Refill unexpected response:', body);
                refillBtn.disabled = false;
                refillBtn.textContent = 'Refill Session';
                return;
            }

            window.data = window.data || {};
            window.data.authToken = body.authToken;
            status.textContent = 'Session refilled. You can continue.';
            status.style.color = 'green';
            setTimeout(() => {
                try {
                    dlg.remove();
                } catch (e) {}
            }, 350);
        } catch (err) {
            console.error('Refill request error', err);
            status.textContent = 'Session refill failed. Sign in again.';
            status.style.color = 'red';
        }

        refillBtn.disabled = false;
        refillBtn.textContent = 'Refill Session';
    });
    reloadBtn.addEventListener('click', () => {
        rebuildhandler();
    });

    document.body.appendChild(dlg);
}

// Session-expired suppression removed. Previously set/checked a global
// `window._flowawaySuppressSessionExpiredUntil`; this logic is no longer
// required and has been removed.

function getCurrentUsernameForRequests() {
    var liveUsername = '';
    try {
        if (window.data && typeof window.data.username === 'string') {
            liveUsername = String(window.data.username || '').trim();
        } else if (typeof data !== 'undefined' && data && typeof data.username === 'string') {
            liveUsername = String(data.username || '').trim();
        }
    } catch (e) {}

    if (liveUsername && liveUsername !== username) {
        username = liveUsername;
    }

    return liveUsername || username;
}

async function filePost(data) {
    const headers = { 'Content-Type': 'application/json' };
    if (window.data && window.data.authToken) headers['Authorization'] = 'Bearer ' + window.data.authToken;
    var res = await fetch(SERVER, {
        method: 'POST',
        headers,
        body: JSON.stringify({
            username: getCurrentUsernameForRequests(),
            ...data
        })
    });
    let body = null;
    try {
        body = await res.json();
    } catch (e) {
        body = null;
    }
    if (body && (body.authToken || body.token)) {
        try {
            window.data = window.data || {};
            window.data.authToken = body.authToken || body.token;
        } catch (e) {}
    }
    if (res.status === 401 && !firstlogin) {
        try {
            showSessionExpiredDialog();
        } catch (e) {}
        return body || { error: 'unauthorized' };
    }
    firstlogin = false;
    return body;
}
async function zmcdpost(data) {
    const headers = { 'Content-Type': 'application/json' };
    if (window.data && window.data.authToken) headers['Authorization'] = 'Bearer ' + window.data.authToken;
    var res = await fetch(zmcdserver, {
        method: 'POST',
        headers,
        body: JSON.stringify({
            username: getCurrentUsernameForRequests(),
            ...data
        })
    });
    let body = null;
    try {
        body = await res.json();
    } catch (e) {
        body = null;
    }
    if (body && (body.authToken || body.token)) {
        try {
            window.data = window.data || {};
            window.data.authToken = body.authToken || body.token;
        } catch (e) {}
    }
    if (res.status === 401) {
        try {
            showSessionExpiredDialog();
        } catch (e) {}
        return body || { error: 'unauthorized' };
    }
    return body;
}
async function posttaskbuttons(data) {
    const headers = { 'Content-Type': 'application/json' };
    if (window.data && window.data.authToken) headers['Authorization'] = 'Bearer ' + window.data.authToken;
    var res = await fetch(zmcdserver, {
        method: 'POST',
        headers,
        body: JSON.stringify({
            username: getCurrentUsernameForRequests(),
            data: data,
            edittaskbuttons: true
        })
    });
    let body = null;
    try {
        body = await res.json();
    } catch (e) {
        body = null;
    }
    if (body && (body.authToken || body.token)) {
        try {
            window.data = window.data || {};
            window.data.authToken = body.authToken || body.token;
        } catch (e) {}
    }
    if (res.status === 401) {
        try {
            showSessionExpiredDialog();
        } catch (e) {}
        return body || { error: 'unauthorized' };
    }
    return body;
}
async function downloadPost(data) {
    var res = await fetch(downloadserver, {
        method: 'POST',
        headers: (function () {
            const h = { 'Content-Type': 'application/json' };
            if (window.data && window.data.authToken) h['Authorization'] = 'Bearer ' + window.data.authToken;
            return h;
        })(),
        body: JSON.stringify({
            username: getCurrentUsernameForRequests(),
            data: data,
            edittaskbuttons: true
        })
    });
    let body = null;
    try {
        body = await res.json();
    } catch (e) {
        body = null;
    }
    if (body && (body.authToken || body.token)) {
        try {
            window.data = window.data || {};
            window.data.authToken = body.authToken || body.token;
        } catch (e) {}
    }
    if (res.status === 401) {
        try {
            showSessionExpiredDialog();
        } catch (e) {}
        return body || { error: 'unauthorized' };
    }
    return body;
}
function annotateTreeWithPaths(tree, basePath = '') {
    var [name, children, meta = {}] = tree;

    var path = name === 'root' ? '' : basePath ? `${basePath}/${name}` : name;

    tree[2] = { ...meta, path };

    if (Array.isArray(children)) {
        for (const child of children) {
            annotateTreeWithPaths(child, path);
        }
    }
}
window.loadTree = async function () {
    if (window._flowawayLoadTreePromise) {
        return window._flowawayLoadTreePromise;
    }

    window._flowawayLoadTreePromise = (async () => {
        var data = await filePost({ initFE: true });
        treeData = data.tree;

        annotateTreeWithPaths(treeData); // ✅ ADD THIS LINE
    })();

    try {
        await window._flowawayLoadTreePromise;
    } finally {
        window._flowawayLoadTreePromise = null;
    }

    // render();
};

// --- Global picker helpers ---
function base64ToArrayBuffer(base64) {
    var binaryString = atob(base64);
    var len = binaryString.length;
    var bytes = new Uint8Array(len);
    for (let i = 0; i < len; i++) bytes[i] = binaryString.charCodeAt(i);
    return bytes.buffer;
}

// UTF-8 safe base64 -> string helper. Use this for text files (JS, txt, svg, etc.)
function base64ToUtf8(b64OrBuffer) {
    try {
        // If caller passed an ArrayBuffer or Uint8Array, decode directly
        if (b64OrBuffer && (b64OrBuffer instanceof ArrayBuffer || ArrayBuffer.isView(b64OrBuffer))) {
            var buf = b64OrBuffer instanceof ArrayBuffer ? b64OrBuffer : b64OrBuffer.buffer;
            return new TextDecoder('utf-8').decode(buf);
        }

        // Otherwise assume base64 string
        var buf = base64ToArrayBuffer(String(b64OrBuffer || ''));
        return new TextDecoder('utf-8').decode(buf);
    } catch (e) {
        try {
            // fallback to atob for environments without TextDecoder support
            if (typeof b64OrBuffer === 'string') return atob(b64OrBuffer);
        } catch (ee) {}
        return '';
    }
}

window._flowawayFileFetchInFlight = window._flowawayFileFetchInFlight || new Map();
window._flowawayFileFetchRecent = window._flowawayFileFetchRecent || new Map();
var FLOWAWAY_FILE_FETCH_CACHE_MS = 750;

async function fetchFileContentByPath(path) {
    if (!path) throw new Error('No path');
    var normalizedPath = String(path).trim();
    if (!normalizedPath) throw new Error('No path');

    var now = Date.now();
    var recentHit = window._flowawayFileFetchRecent.get(normalizedPath);
    if (recentHit && now - recentHit.ts <= FLOWAWAY_FILE_FETCH_CACHE_MS) {
        return recentHit.value;
    }

    var inFlight = window._flowawayFileFetchInFlight.get(normalizedPath);
    if (inFlight) {
        return inFlight;
    }

    var req = (async () => {
        var res = await filePost({
            requestFile: true,
            requestFileName: normalizedPath
        });

        // If server returned a simple base64 payload for small files
        if (res && typeof res.filecontent === 'string' && (!res.totalChunks || res.totalChunks <= 1)) {
            window._flowawayFileFetchRecent.set(normalizedPath, {
                ts: Date.now(),
                value: res.filecontent
            });
            return res.filecontent;
        }

        // If server indicates chunking, fetch all chunks and combine as ArrayBuffer
        if (res && typeof res.totalChunks === 'number' && res.totalChunks > 1) {
            var chunks = [];
            // first chunk
            if (typeof res.filecontent === 'string') chunks.push(base64ToArrayBuffer(res.filecontent));

            for (let i = 1; i < res.totalChunks; i++) {
                var part = await filePost({
                    requestFile: true,
                    requestFileName: normalizedPath,
                    chunkIndex: i
                });
                if (!part || typeof part.filecontent !== 'string')
                    throw new Error('Missing chunk ' + i + ' for ' + normalizedPath);
                chunks.push(base64ToArrayBuffer(part.filecontent));
            }

            // Combine into single ArrayBuffer
            var total = chunks.reduce((s, c) => s + (c.byteLength || 0), 0);
            var combined = new Uint8Array(total);
            var off = 0;
            for (const c of chunks) {
                var u = new Uint8Array(c);
                combined.set(u, off);
                off += u.byteLength;
            }
            var combinedBuffer = combined.buffer;
            window._flowawayFileFetchRecent.set(normalizedPath, {
                ts: Date.now(),
                value: combinedBuffer
            });
            return combinedBuffer;
        }

        throw new Error('Could not fetch file: ' + normalizedPath);
    })();

    window._flowawayFileFetchInFlight.set(normalizedPath, req);
    try {
        return await req;
    } finally {
        if (window._flowawayFileFetchInFlight.get(normalizedPath) === req) {
            window._flowawayFileFetchInFlight.delete(normalizedPath);
        }
    }
}
async function makeFlowawayFileHandle(name, path, filecontent = null) {
    await filePost({
        saveSnapshot: true,
        directions: [{ edit: true, contents: filecontent, path, replace: true }, { end: true }]
    });
    return {
        kind: 'file',
        name,
        path,
        async getFile() {
            var res = await fetchFileContentByPath(path);
            var buf =
                res instanceof ArrayBuffer || ArrayBuffer.isView(res) ? res : base64ToArrayBuffer(String(res || ''));
            var type = (function (n) {
                var ext = n.split('.').pop().toLowerCase();
                var m = {
                    txt: 'text/plain',
                    js: 'application/javascript',
                    json: 'application/json',
                    html: 'text/html'
                };
                return m[ext] || 'application/octet-stream';
            })(name);
            return new File([buf], name, { type });
        }
    };
}

function createPickerModal(tree, options = {}) {
    var { allowDirectory = false, multiple = false, save = false, suggestedName = '', filecontent = null } = options;
    var overlay = document.createElement('div');
    Object.assign(overlay.style, {
        position: 'fixed',
        inset: '0',
        background: 'rgba(0,0,0,0.4)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 100000
    });
    var box = document.createElement('div');
    Object.assign(box.style, {
        width: '700px',
        height: '500px',
        background: data.dark ? '#1e1e1e' : '#fff',
        color: data.dark ? '#eee' : '#000',
        borderRadius: '8px',
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden'
    });
    overlay.appendChild(box);
    var breadcrumb = document.createElement('div');
    breadcrumb.style.padding = '8px';
    box.appendChild(breadcrumb);
    var fileArea = document.createElement('div');
    Object.assign(fileArea.style, {
        flex: '1',
        overflow: 'auto',
        padding: '8px',
        borderTop: '1px solid #ddd'
    });
    box.appendChild(fileArea);
    var saveContainer = document.createElement('div');
    saveContainer.style.padding = '8px';
    box.appendChild(saveContainer);
    var bar = document.createElement('div');
    bar.style.padding = '8px';
    bar.style.display = 'flex';
    bar.style.justifyContent = 'flex-end';
    box.appendChild(bar);
    var cancelBtn = document.createElement('button');
    cancelBtn.textContent = 'Cancel';
    bar.appendChild(cancelBtn);
    var okBtn = document.createElement('button');
    okBtn.textContent = save ? 'Save' : 'Open';
    okBtn.style.marginLeft = '8px';
    bar.appendChild(okBtn);

    var currentPath = ['root'];
    var selection = [];
    var filenameInput = null;

    function render() {
        breadcrumb.innerHTML = '';
        currentPath.forEach((p, i) => {
            var span = document.createElement('span');
            span.textContent = i === 0 ? 'Home' : ' / ' + p;
            span.style.cursor = 'pointer';
            span.onclick = () => {
                currentPath = currentPath.slice(0, i + 1);
                render();
            };
            breadcrumb.appendChild(span);
        });
        fileArea.innerHTML = '';
        var node = JSON.parse(JSON.stringify(tree));
        for (let i = 1; i < currentPath.length; i++) {
            node = (node[1] || []).find((c) => c[0] === currentPath[i]);
            if (!node) return;
        }
        if (!node || !node[1]) return;
        node[1].forEach((item) => {
            var isDir = Array.isArray(item[1]);
            var div = document.createElement('div');
            div.style.padding = '6px';
            div.style.cursor = 'pointer';
            div.textContent = (isDir ? '📁 ' : '📄 ') + item[0];
            div.onclick = (e) => {
                var toggle = e.ctrlKey || e.metaKey;

                // If this is a directory and the picker does NOT allow directory selection,
                // don't treat single clicks as selecting the directory. Double-click will
                // still navigate into the directory (see ondblclick below).
                if (isDir && !allowDirectory) {
                    // Optionally provide a light hover/preview effect but do not add to selection
                    fileArea.querySelectorAll('div').forEach((d) => (d.style.background = ''));
                    div.style.background = '#f0f0f0';
                    return;
                }

                if (!toggle || !multiple) {
                    selection = [item];
                    fileArea.querySelectorAll('div').forEach((d) => (d.style.background = ''));
                    div.style.background = '#d0e6ff';
                } else {
                    var idx = selection.indexOf(item);
                    if (idx >= 0) {
                        selection.splice(idx, 1);
                        div.style.background = '';
                    } else {
                        selection.push(item);
                        div.style.background = '#d0e6ff';
                    }
                }
            };
            if (isDir)
                div.ondblclick = () => {
                    currentPath.push(item[0]);
                    render();
                };
            fileArea.appendChild(div);
        });
        // If this modal is a Save dialog, render filename input
        saveContainer.innerHTML = '';
        if (save) {
            var lbl = document.createElement('div');
            lbl.textContent = 'Filename:';
            lbl.style.marginBottom = '6px';
            saveContainer.appendChild(lbl);
            filenameInput = document.createElement('input');
            filenameInput.style.width = '100%';
            filenameInput.placeholder = 'filename.txt';
            filenameInput.value = suggestedName || '';
            saveContainer.appendChild(filenameInput);
        }
    }

    render();

    document.body.appendChild(overlay);

    return new Promise((resolve) => {
        cancelBtn.onclick = () => {
            overlay.remove();
            resolve(null);
        };
        okBtn.onclick = async () => {
            // Save flow: return a chosen full path string
            if (save) {
                // determine selected folder (prefer selected dir, otherwise currentPath)
                var folderPath = currentPath.slice(1).join('/');
                if (selection.length && Array.isArray(selection[0][1])) {
                    var sel = selection[0];
                    folderPath = sel[2] && sel[2].path ? sel[2].path : currentPath.slice(1).join('/');
                }
                var fname = ((filenameInput && filenameInput.value) || '').trim();
                if (!fname) {
                    notification('Enter filename');
                    return;
                }
                overlay.remove();
                var chosen = folderPath ? '/' + folderPath + '/' + fname : fname;
                var returnValue = {
                    path: chosen,
                    name: fname,
                    filecontent: filecontent
                };
                return resolve(returnValue);
            }

            overlay.remove();
            if (!selection.length) return resolve(null);
            // If directory-only requested, return selected folder node(s)
            if (allowDirectory) {
                var dirs = selection.filter((s) => Array.isArray(s[1]));
                if (multiple) return resolve(dirs);
                return resolve(dirs[0] || null);
            }
            // otherwise return file nodes
            var files = selection.filter((s) => !Array.isArray(s[1]));
            // map to handles with full path from annotated tree
            var handles = files.map((f) => {
                // f is [name, null, meta]
                var path = f[2] && f[2].path ? f[2].path : currentPath.slice(1).concat([f[0]]).join('/');
                return makeFlowawayFileHandle(f[0], path);
            });
            resolve(handles);
        };
    });
}

// Global functions
window.flowawayOpenFilePicker = async function (options = {}) {
    if (!window.treeData) await window.loadTree();
    var res = await createPickerModal(window.treeData, {
        allowDirectory: false,
        multiple: !!options.multiple
    });
    return res; // array of handles or null
};

window.flowawayDirectoryPicker = async function (options = {}) {
    if (!window.treeData) await window.loadTree();
    options.allowDirectory = true;
    console.log(options);
    var sel = await createPickerModal(window.treeData, options);
    // return folder node (the array structure)
    return sel; // may be null
};

window.flowawaySaveFilePicker = async function (options = {}, suggestedPath = '') {
    if (!window.treeData) await window.loadTree();
    // Use the picker modal with save input enabled for consistent UI
    var chosen = await createPickerModal(window.treeData, {
        allowDirectory: true,
        save: true,
        suggestedName: suggestedPath.split('/').pop() || '',
        filecontent: options.filecontent || null
    });
    console.log(chosen);
    return makeFlowawayFileHandle(chosen.name, chosen.path, chosen.filecontent);
};

// Helper function to hash script content (handles Unicode characters)
function hashScriptContent(text) {
    var hash = 0;
    for (let i = 0; i < text.length; i++) {
        var char = text.charCodeAt(i);
        hash = (hash << 5) - hash + char;
        hash = hash & hash; // Convert to 32-bit integer
    }
    return Math.abs(hash).toString(16);
}

function isProtectedAppGlobalName(name) {
    if (!name || typeof name !== 'string') return false;
    return (
        /Globals$/.test(name) || name === 'apps' || name === '_flowaway_handlers' || name === 'cmf' || name === 'cmfl1'
    );
}

// ----------------- DYNAMIC AP LOADER -----------------
window.apps = window.apps || [];
window._flowawayMissingFolders = window._flowawayMissingFolders || new Set();

async function getFolderListing(relPath) {
    try {
        window._flowawayMissingFolders.delete(relPath);
        var r = await filePost({ requestFile: true, requestFileName: relPath });
        if (r && r.kind === 'folder' && Array.isArray(r.files)) return r.files;
        if (r && (r.missing || r.code === 'ENOENT' || r.kind === 'missing' || r.error === 'ENOENT')) {
            window._flowawayMissingFolders.add(relPath);
            return null;
        }
    } catch (e) {
        console.error('getFolderListing error', e);
    }
    return null;
}

function normalizeAppFolders(folders) {
    var seen = new Set();
    var list = [];
    for (const folder of folders || []) {
        if (!Array.isArray(folder) || typeof folder[0] !== 'string') continue;
        var folderName = folder[0].trim();
        if (!folderName || folderName === '.DS_Store' || folderName.startsWith('.')) continue;
        var folderPath = folder[2] && folder[2].path ? folder[2].path : `apps/${folderName}`;
        var key = String(folderPath).toLowerCase();
        if (seen.has(key)) continue;
        seen.add(key);
        list.push(folder);
    }
    return list;
}

function isImageIconValue(value) {
    if (!value || typeof value !== 'string') return false;
    var normalized = value.trim().toLowerCase();
    if (!normalized) return false;
    if (normalized.startsWith('data:image/')) return true;
    normalized = normalized.split('?')[0].split('#')[0];
    return normalized.endsWith('.png') || normalized.endsWith('.svg');
}

function getIconMimeType(pathOrValue) {
    var normalized = (pathOrValue || '').trim().toLowerCase().split('?')[0].split('#')[0];
    if (normalized.endsWith('.svg')) return 'image/svg+xml';
    return 'image/png';
}

function toIconImageMarkupFromSource(iconSource) {
    if (!iconSource) return '';
    return `<img src="${iconSource}" style="width:1.8em;height:1.8em;max-width:100%;max-height:100%;object-fit:contain;display:block;margin:0 auto;"/>`;
}

function getPreferredAppIdentifier(app) {
    if (!app) return '';
    return app.entry || app.startbtnid || app.id || app.icon || '';
}

function appMatchesIdentifier(app, identifier) {
    if (!app || !identifier) return false;
    var id = String(identifier).trim();
    if (!id) return false;
    var candidates = [app.entry, app.startbtnid, app.id, app.icon]
        .filter((v) => typeof v !== 'undefined' && v !== null)
        .map((v) => String(v).trim())
        .filter(Boolean);
    return candidates.includes(id);
}

async function toIconImageMarkup(iconPathOrUrl, folderPath) {
    var iconSource = (iconPathOrUrl || '').trim();
    if (!iconSource) return '';

    if (iconSource.startsWith('data:image/')) {
        return toIconImageMarkupFromSource(iconSource);
    }

    if (iconSource.startsWith('http://') || iconSource.startsWith('https://') || iconSource.startsWith('/')) {
        return toIconImageMarkupFromSource(iconSource);
    }

    var normalizedPath = iconSource.replace(/^\.\//, '');
    if (!normalizedPath.startsWith('apps/')) {
        normalizedPath = `${folderPath}/${normalizedPath}`;
    }

    try {
        var iconB64 = await fetchFileContentByPath(normalizedPath);
        if (!iconB64) return '';
        var mimeType = getIconMimeType(normalizedPath);
        return toIconImageMarkupFromSource(`data:${mimeType};base64,${iconB64}`);
    } catch (e) {
        console.error('read icon image', e);
    }

    return '';
}

// Helper function to extract app data from an app folder
async function extractAppData(appFolder) {
    var folderName = appFolder[0];
    var folderPath = appFolder[2] && appFolder[2].path ? appFolder[2].path : `apps/${folderName}`;
    var files = await getFolderListing(folderPath);
    if (!files) {
        if (window._flowawayMissingFolders && window._flowawayMissingFolders.has(folderPath)) {
            var enoent = new Error(`Missing folder: ${folderPath}`);
            enoent.code = 'ENOENT';
            throw enoent;
        }
        return null;
    }

    // find files
    var jsFile = files.find((f) => f.name.toLowerCase().endsWith('.js'))?.relativePath || null;
    var entryObjectfile = files.find((f) => f.name.toLowerCase() === 'entry.json')?.relativePath || null;
    var iconFile =
        files.find(
            (f) =>
                f.name.toLowerCase().startsWith('icon') ||
                f.name.toLowerCase().endsWith('.png') ||
                f.name.toLowerCase().endsWith('.svg')
        )?.relativePath || null;

    var entryName = null;
    var label = folderName;
    var icon = null;
    var startbtnid = '';
    var globalvarobject = '';
    var appGlobalVarStrings = [];
    var allapparray = [];
    if (entryObjectfile) {
        try {
            var b64 = await fetchFileContentByPath(`${folderPath}/${entryObjectfile}`);
            var entryObj = JSON.parse(base64ToUtf8(b64));
            entryName = entryObj.name;
            label = entryObj.label;
            startbtnid = entryObj.startbtnid || '';
            globalvarobject = entryObj.globalvarobject || '';
            appGlobalVarStrings = entryObj.appGlobalVarStrings || [];
            allapparray = entryObj.allapparray || [];
        } catch (e) {
            console.error('read entry object', e);
        }
    }

    if (iconFile) {
        if (iconFile.toLowerCase().endsWith('.png') || iconFile.toLowerCase().endsWith('.svg')) {
            icon = (await toIconImageMarkup(`${folderPath}/${iconFile}`, folderPath)) || icon;
        } else {
            try {
                var b64 = await fetchFileContentByPath(`${folderPath}/${iconFile}`);
                var parsedIcon = base64ToUtf8(b64).trim();
                if (isImageIconValue(parsedIcon)) {
                    icon = (await toIconImageMarkup(parsedIcon, folderPath)) || icon;
                } else {
                    icon = parsedIcon || icon;
                }
            } catch (e) {
                console.error('read icon txt', e);
            }
        }
    }

    return {
        id: entryName || startbtnid || folderName,
        path: folderPath,
        jsFile,
        allapparray,
        entry: entryName || startbtnid || folderName,
        label,
        startbtnid,
        icon,
        scriptLoaded: false,
        globalvarobject,
        appGlobalVarStrings
    };
}
async function runbootscript() {
    var b64 = await fetchFileContentByPath(`.boot/gbenv.js`);
    var scriptText = base64ToUtf8(b64);
    var s = document.createElement('script');
    s.type = 'text/javascript';
    s.textContent = scriptText;
    document.body.appendChild(s);
}
async function runscriptapps() {
    var rootChildren = (window.treeData && window.treeData[1]) || [];
    var appsNode = rootChildren.find((c) => c[0] === '.noguiapps' && Array.isArray(c[1]));
    if (!appsNode || !Array.isArray(appsNode[1])) return;
    for (const file of appsNode[1]) {
        try {
            var b64 = await fetchFileContentByPath(`.noguiapps/${file[0]}`);
            var scriptText = base64ToUtf8(b64);
            var s = document.createElement('script');
            s.type = 'text/javascript';
            s.textContent = scriptText;
            document.body.appendChild(s);
        } catch (e) {
            flowawayError('runscriptapps', 'Failed to load non-GUI app script', e, {
                file: file && file[0]
            });
        }
    }
}
async function loadAppsFromTree() {
    if (loaded) return;
    loaded = true;
    window.apps = [];
    if (!window.treeData) await window.loadTree();
    try {
        try {
            await runbootscript();
        } catch (e) {
            console.error('runbootscript error', e);
        }
        try {
            await runscriptapps();
        } catch (e) {
            console.error('runscriptapps error', e);
        }
        var rootChildren = (window.treeData && window.treeData[1]) || [];
        var appsNode = rootChildren.find((c) => c[0] === 'apps' && Array.isArray(c[1]));
        if (!appsNode) return;
        var appFolders = normalizeAppFolders(appsNode[1]);
        for (const appFolder of appFolders) {
            try {
                const appData = await extractAppData(appFolder);
                if (appData) window.apps.push(appData);
            } catch (e) {
                flowawayError('loadAppsFromTree', 'Failed to parse app folder', e, {
                    folder: appFolder && appFolder[0]
                });
            }
        }

        // Sort apps alphabetically by label
        window.apps.sort((a, b) => a.label.localeCompare(b.label));

        // render
        await renderAppsGrid();
        // reapply task buttons now that apps may be present
        applyTaskButtons();
        purgeButtons();
        setTimeout(() => {
            var appUpdatedEvent = new CustomEvent('appUpdated', { detail: null });
            window.dispatchEvent(appUpdatedEvent);
            setTimeout(() => {
                var appUpdatedEvent = new CustomEvent('appUpdated', { detail: null });
                window.dispatchEvent(appUpdatedEvent);
                setTimeout(() => {
                    var appUpdatedEvent = new CustomEvent('appUpdated', { detail: null });
                    window.dispatchEvent(appUpdatedEvent);
                    setTimeout(() => {
                        var appUpdatedEvent = new CustomEvent('appUpdated', {
                            detail: null
                        });
                        window.dispatchEvent(appUpdatedEvent);
                    }, 5000);
                }, 5000);
            }, 5000);
        }, 5000);
        // Start polling for app changes
        startAppPolling();
    } catch (e) {
        flowawayError('loadAppsFromTree', 'loadAppsFromTree failed', e);
    }
}

async function renderAppsGrid() {
    // Load config and render pinned apps
    if (!window._startMenuConfig) await loadStartMenuConfig();
    await renderPinnedAppsGrid();
    // Also load all app scripts
    if (!window.apps) return;
    for (const app of window.apps) {
        try {
            if (!app.icon) {
                if (!app.scriptLoaded && app.jsFile) {
                    try {
                        var b64NoIcon = await fetchFileContentByPath(`${app.path}/${app.jsFile}`);
                        var scriptTextNoIcon = base64ToUtf8(b64NoIcon);
                        app._lastScriptHash = hashScriptContent(scriptTextNoIcon);
                        try {
                            if (app.entry && typeof window[app.entry] !== 'undefined') {
                                try {
                                    delete window[app.entry];
                                } catch (e) {}
                            }
                            if (
                                app.cmf &&
                                !isProtectedAppGlobalName(app.cmf) &&
                                typeof window[app.cmf] !== 'undefined'
                            ) {
                                try {
                                    delete window[app.cmf];
                                } catch (e) {}
                            }
                            if (app.appGlobalVarStrings && Array.isArray(app.appGlobalVarStrings)) {
                                for (const varName of app.appGlobalVarStrings) {
                                    if (isProtectedAppGlobalName(varName)) continue;
                                    if (typeof window[varName] !== 'undefined') {
                                        try {
                                            delete window[varName];
                                        } catch (e) {}
                                    }
                                }
                            }
                        } catch (e) {}
                        var beforeGlobalsNoIcon = new Set(Object.getOwnPropertyNames(window));
                        var sNoIcon = document.createElement('script');
                        sNoIcon.type = 'text/javascript';
                        sNoIcon.textContent = scriptTextNoIcon;
                        document.body.appendChild(sNoIcon);
                        app.scriptLoaded = true;
                        app._scriptElement = sNoIcon;
                        try {
                            app._addedGlobals = [];
                            var captureAddedNoIcon = () => {
                                try {
                                    var afterNoIcon = Object.getOwnPropertyNames(window);
                                    var newlyNoIcon = afterNoIcon.filter(
                                        (k) => !beforeGlobalsNoIcon.has(k) && !(app._addedGlobals || []).includes(k)
                                    );
                                    if (newlyNoIcon.length)
                                        app._addedGlobals = [
                                            ...new Set([...(app._addedGlobals || []), ...newlyNoIcon])
                                        ];
                                } catch (e) {}
                            };
                            captureAddedNoIcon();
                            setTimeout(captureAddedNoIcon, 120);
                            setTimeout(captureAddedNoIcon, 800);
                            setTimeout(captureAddedNoIcon, 2500);
                        } catch (e) {}
                    } catch (e) {
                        flowawayError('renderAppsGrid', 'Failed to load app script (no icon)', e, {
                            appId: app && app.id,
                            path: app && app.path
                        });
                    }
                }
                continue;
            }
            // Skip old rendering - handled by new renderPinnedAppsGrid/renderAllAppsGrid/renderRecentsGrid
            // Just load the app script
            if (!app.scriptLoaded && app.jsFile) {
                try {
                    var b64 = await fetchFileContentByPath(`${app.path}/${app.jsFile}`);
                    var scriptText = base64ToUtf8(b64);
                    // Store hash for future change detection
                    app._lastScriptHash = hashScriptContent(scriptText);
                    // Prefer removing globals created by previous script rather than deleting app metadata
                    try {
                        if (app.entry && typeof window[app.entry] !== 'undefined') {
                            try {
                                delete window[app.entry];
                            } catch (e) {}
                        }
                        if (app.cmf && !isProtectedAppGlobalName(app.cmf) && typeof window[app.cmf] !== 'undefined') {
                            try {
                                delete window[app.cmf];
                            } catch (e) {}
                        }
                        if (app.appGlobalVarStrings && Array.isArray(app.appGlobalVarStrings)) {
                            for (const varName of app.appGlobalVarStrings) {
                                if (isProtectedAppGlobalName(varName)) continue;
                                if (typeof window[varName] !== 'undefined') {
                                    try {
                                        delete window[varName];
                                    } catch (e) {}
                                }
                            }
                        }
                    } catch (e) {}
                    // snapshot globals before injection
                    var beforeGlobals = new Set(Object.getOwnPropertyNames(window));
                    var s = document.createElement('script');
                    s.type = 'text/javascript';
                    s.textContent = scriptText;
                    document.body.appendChild(s);
                    app.scriptLoaded = true;
                    app._scriptElement = s;
                    // record any globals the script introduced (best-effort)
                    try {
                        app._addedGlobals = [];
                        var captureAdded = () => {
                            try {
                                var after = Object.getOwnPropertyNames(window);
                                var newly = after.filter(
                                    (k) => !beforeGlobals.has(k) && !(app._addedGlobals || []).includes(k)
                                );
                                if (newly.length)
                                    app._addedGlobals = [...new Set([...(app._addedGlobals || []), ...newly])];
                            } catch (e) {}
                        };
                        // immediate capture and a few delayed captures to catch async initializers
                        captureAdded();
                        setTimeout(captureAdded, 120);
                        setTimeout(captureAdded, 800);
                        setTimeout(captureAdded, 2500);
                    } catch (e) {}
                } catch (e) {
                    flowawayError('renderAppsGrid', 'Failed to load app script', e, {
                        appId: app && app.id,
                        path: app && app.path
                    });
                }
            }
        } catch (e) {
            flowawayError('renderAppsGrid', 'Failed while loading app', e, {
                appId: app && app.id,
                path: app && app.path
            });
            continue;
        }
    }
}
async function launchApp(appId) {
    var app = (window.apps || []).find((a) => appMatchesIdentifier(a, appId));
    if (!app) {
        // fallback: try to call a global function named like the appId (or the id listed in entry)
        try {
            var globalFn = window[appId] || null;
            if (typeof globalFn === 'function') return globalFn();
        } catch (e) {}
        flowawayError('launchApp', 'App not found', null, { appId: appId });
        return;
    }

    if (!app.scriptLoaded && app.jsFile) {
        try {
            var b64 = await fetchFileContentByPath(`${app.path}/${app.jsFile}`);
            var scriptText = base64ToUtf8(b64);
            // Store hash for future change detection
            app._lastScriptHash = hashScriptContent(scriptText);
            // Remove any prior globals exposed by a previous version of this app
            try {
                if (app.entry && typeof window[app.entry] !== 'undefined') {
                    try {
                        delete window[app.entry];
                    } catch (e) {}
                }
                if (app.cmf && !isProtectedAppGlobalName(app.cmf) && typeof window[app.cmf] !== 'undefined') {
                    try {
                        delete window[app.cmf];
                    } catch (e) {}
                }
                if (app.appGlobalVarStrings && Array.isArray(app.appGlobalVarStrings)) {
                    for (const varName of app.appGlobalVarStrings) {
                        if (isProtectedAppGlobalName(varName)) continue;
                        if (typeof window[varName] !== 'undefined') {
                            try {
                                delete window[varName];
                            } catch (e) {}
                        }
                    }
                }
            } catch (e) {}
            // snapshot globals before injection
            var beforeGlobals = new Set(Object.getOwnPropertyNames(window));
            var s = document.createElement('script');
            s.type = 'text/javascript';
            s.textContent = scriptText;
            document.body.appendChild(s);
            app.scriptLoaded = true;
            app._scriptElement = s;
            // record any globals the script introduced (best-effort)
            try {
                app._addedGlobals = [];
                var captureAdded = () => {
                    try {
                        var after = Object.getOwnPropertyNames(window);
                        var newly = after.filter(
                            (k) => !beforeGlobals.has(k) && !(app._addedGlobals || []).includes(k)
                        );
                        if (newly.length) app._addedGlobals = [...new Set([...(app._addedGlobals || []), ...newly])];
                    } catch (e) {}
                };
                captureAdded();
                setTimeout(captureAdded, 120);
                setTimeout(captureAdded, 800);
                setTimeout(captureAdded, 2500);
            } catch (e) {}
        } catch (e) {
            flowawayError('launchApp', 'Failed to load app script', e, {
                appId: app && app.id,
                path: app && app.path
            });
        }
    }

    try {
        if (app.entry && typeof window[app.entry] === 'function') {
            window[app.entry]();
        } else if (typeof window[app.id] === 'function') {
            window[app.id]();
        } else {
            flowawayError('launchApp', 'No callable entry function for app', null, {
                appId: app && app.id,
                entry: app && app.entry
            });
            return;
        }
        // After the app varructs its UI, try to tag the new top-level window(s) with appId
        setTimeout(() => {
            try {
                var roots = Array.from(document.querySelectorAll('.app-root'));
                // find ones without app id yet
                var untagged = roots.filter((r) => !r.dataset || !r.dataset.appId);
                if (untagged.length) {
                    // tag the most recently added
                    var candidate = untagged[untagged.length - 1];
                    candidate.dataset.appId = getPreferredAppIdentifier(app);
                }
            } catch (e) {}
        }, 40);
        return;
    } catch (e) {
        flowawayError('launchApp', 'launchApp execution failed', e, {
            appId: app && app.id,
            entry: app && app.entry
        });
    }
}

// ===== LIVE APP POLLING =====
var appPollingActive = false;
var appPollingSocket = null;
var appPollingSocketBackoff = 0;
var appPollingTimer = null;
var appPollingInFlight = false;
var appPollingDirty = false;
var appPollingPendingFolders = new Set();
var appPollingSafetyInterval = null;
var appPollingReconnectTimer = null;
var APP_POLLING_SOCKET_MAX_BACKOFF = 60 * 1000; // max 60s
var APP_POLLING_DEBOUNCE = 1000;

function queueAppPollingHint(msg) {
    if (!msg || typeof msg !== 'object') return;

    if (Array.isArray(msg.changedApps)) {
        for (const appName of msg.changedApps) {
            var normalized = String(appName || '').trim();
            if (!normalized || normalized.startsWith('.')) continue;
            appPollingPendingFolders.add(normalized);
        }
    }
}

function collectAppPollingHint() {
    var changedApps = Array.from(appPollingPendingFolders);
    appPollingPendingFolders.clear();
    return { changedApps };
}

function refreshAppsUiAfterChanges() {
    try {
        loadAppsFromTree();
    } catch (e) {
        flowawayError('refreshAppsUiAfterChanges', 'loadAppsFromTree failed', e);
    }
    try {
        renderAppsGrid();
    } catch (e) {
        flowawayError('refreshAppsUiAfterChanges', 'renderAppsGrid failed', e);
    }
    try {
        applyTaskButtons();
    } catch (e) {
        flowawayError('refreshAppsUiAfterChanges', 'applyTaskButtons failed', e);
    }
    try {
        purgeButtons();
    } catch (e) {
        flowawayError('refreshAppsUiAfterChanges', 'purgeButtons failed', e);
    }
    setTimeout(() => {
        var appUpdatedEvent = new CustomEvent('appUpdated', { detail: null });
        window.dispatchEvent(appUpdatedEvent);
        setTimeout(() => {
            var appUpdatedEvent = new CustomEvent('appUpdated', { detail: null });
            window.dispatchEvent(appUpdatedEvent);
            setTimeout(() => {
                var appUpdatedEvent = new CustomEvent('appUpdated', { detail: null });
                window.dispatchEvent(appUpdatedEvent);
                setTimeout(() => {
                    var appUpdatedEvent = new CustomEvent('appUpdated', { detail: null });
                    window.dispatchEvent(appUpdatedEvent);
                }, 5000);
            }, 5000);
        }, 5000);
    }, 5000);
}

function scheduleAppPoll(reason = 'unknown') {
    clearTimeout(appPollingTimer);
    appPollingTimer = setTimeout(async () => {
        if (appPollingInFlight) {
            appPollingDirty = true;
            return;
        }
        appPollingInFlight = true;
        try {
            var hint = collectAppPollingHint();
            if (!hint.changedApps.length) {
                return;
            } else {
                await pollSpecificAppChanges(hint.changedApps);
            }
        } catch (e) {
            console.error('[APP POLLING] Scheduled poll error:', e);
        } finally {
            appPollingInFlight = false;
            if (appPollingDirty) {
                appPollingDirty = false;
                scheduleAppPoll('coalesced');
            }
        }
    }, APP_POLLING_DEBOUNCE);
}

function startAppPollingViaWebSocket() {
    if (typeof WebSocket === 'undefined') return false;
    if (
        appPollingSocket &&
        (appPollingSocket.readyState === WebSocket.OPEN || appPollingSocket.readyState === WebSocket.CONNECTING)
    ) {
        return true;
    }

    var appPollingURL = `${BASE}/server/appSocket`;
    appPollingSocket = new WebSocket(appPollingURL);

    appPollingSocket.onopen = () => {
        appPollingSocketBackoff = 0;
        if (appPollingReconnectTimer) {
            clearTimeout(appPollingReconnectTimer);
            appPollingReconnectTimer = null;
        }
        try {
            appPollingSocket.send(
                JSON.stringify({
                    subscribeToAppChanges: true,
                    username: data.username
                })
            );
        } catch (e) {}
    };

    appPollingSocket.onmessage = (ev) => {
        try {
            var msg = JSON.parse(ev.data);
            if (msg && msg.appChanges) {
                if (!Array.isArray(msg.changedApps) || msg.changedApps.length === 0) return;
                queueAppPollingHint(msg);
                scheduleAppPoll('ws');
            }
        } catch (e) {
            console.error('[APP POLLING] Error parsing WebSocket message:', e);
        }
    };

    appPollingSocket.onerror = (err) => {
        console.warn('[APP POLLING] WebSocket error', err);
    };

    appPollingSocket.onclose = (e) => {
        appPollingSocket = null;
        if (appPollingSocketBackoff < 10) appPollingSocketBackoff++;
        var delay = Math.min(appPollingSocketBackoff * 1000, APP_POLLING_SOCKET_MAX_BACKOFF);
        if (appPollingReconnectTimer) clearTimeout(appPollingReconnectTimer);
        appPollingReconnectTimer = setTimeout(() => {
            appPollingReconnectTimer = null;
            startAppPollingViaWebSocket();
        }, delay);
    };

    return true;
}

async function pollAppChanges(forceMetadataCheck = false, targetFolders = null) {
    if (!window.treeData) return;

    try {
        var scriptReloadedPaths = new Set();
        var rootChildren = (window.treeData && window.treeData[1]) || [];
        var appsNode = rootChildren.find((c) => c[0] === 'apps' && Array.isArray(c[1]));
        if (!appsNode) return;

        // Get current app folders from the file system
        var currentAppFolders = normalizeAppFolders(appsNode[1]);
        var targetFolderSet =
            Array.isArray(targetFolders) && targetFolders.length
                ? new Set(targetFolders.map((v) => String(v || '').trim()).filter(Boolean))
                : null;
        hasChanges = false;

        // First pass: detect structural changes only (new/deleted folders)
        var currentFolderNames = new Set(currentAppFolders.map((f) => f[0]));
        var knownFolderNames = new Set(
            window.apps.map((a) => {
                var path = a.path;
                return path.split('/').pop(); // Extract folder name from path
            })
        );

        // Check for new folders or deleted folders at folder level
        var hasStructuralChanges =
            currentFolderNames.size !== knownFolderNames.size ||
            Array.from(currentFolderNames).some((name) => !knownFolderNames.has(name));

        // Handle new and deleted apps (structural changes)
        if (hasStructuralChanges) {
            // Check for new apps
            for (const appFolder of currentAppFolders) {
                try {
                    var folderName = appFolder[0];
                    var expectedPath = appFolder[2] && appFolder[2].path ? appFolder[2].path : `apps/${folderName}`;

                    var existingApp = window.apps.find((a) => a.path === expectedPath);

                    if (!existingApp) {
                        var newAppData = await extractAppData(appFolder);
                        if (newAppData) {
                            window.apps.push(newAppData);
                            window.apps.sort((a, b) => a.label.localeCompare(b.label));
                            flowawayDebug('pollAppChanges', 'New app detected', {
                                label: newAppData.label,
                                path: newAppData.path
                            });
                            hasChanges = true;
                        }
                    }
                } catch (e) {
                    flowawayError('pollAppChanges', 'Failed while handling new app folder', e, {
                        folder: appFolder && appFolder[0]
                    });
                }
            }

            // Check for deleted apps
            var appsToDelete = [];
            for (let i = 0; i < window.apps.length; i++) {
                var app = window.apps[i];
                var stillExists = currentAppFolders.some((f) => {
                    var expectedPath = f[2] && f[2].path ? f[2].path : `apps/${f[0]}`;
                    return expectedPath === app.path;
                });

                if (!stillExists) {
                    appsToDelete.push(i);
                }
            }

            // Delete apps in reverse order to maintain indices
            for (let i = appsToDelete.length - 1; i >= 0; i--) {
                try {
                    var appIndex = appsToDelete[i];
                    var app = window.apps[appIndex];

                    flowawayDebug('pollAppChanges', 'App deleted', {
                        label: app && app.label,
                        path: app && app.path
                    });

                    // 0. Clean up global variables and functions
                    try {
                        // Only clear the entry point function if it exists
                        if (app.entry && window[app.entry]) {
                            try {
                                window[app.entry] = null;
                                delete window[app.entry];
                                if (app.cmf && !isProtectedAppGlobalName(app.cmf)) {
                                    delete window[app.cmf];
                                }
                                if (app.appGlobalVarStrings && Array.isArray(app.appGlobalVarStrings)) {
                                    for (const varName of app.appGlobalVarStrings) {
                                        if (isProtectedAppGlobalName(varName)) continue;
                                        if (typeof window[varName] !== 'undefined') {
                                            try {
                                                delete window[varName];
                                            } catch (e) {}
                                        }
                                    }
                                }
                                console.log(`[APP POLLING] Cleared entry function: ${app.entry}`);
                            } catch (e) {
                                console.warn(`[APP POLLING] Could not clear entry function ${app.entry}:`, e);
                            }
                        }
                    } catch (e) {
                        console.warn(`[APP POLLING] Error cleaning entry function for ${app.label}:`, e);
                    }

                    // 1. Remove script element from DOM if loaded
                    if (app._scriptElement) {
                        app._scriptElement.remove();
                    }

                    // 2. Remove from apps array
                    window.apps.splice(appIndex, 1);

                    // 3. Remove from apps grid
                    var appElement =
                        document.getElementById(app.startbtnid || app.id + 'app') ||
                        document.getElementById(app.id + 'app');
                    if (appElement) appElement.remove();

                    // 4. Remove taskbar button
                    var taskbarBtn = Array.from(taskbar.querySelectorAll('button')).find(
                        (btn) =>
                            (btn.dataset && appMatchesIdentifier(app, btn.dataset.appId)) ||
                            btn.textContent.includes(app.label)
                    );
                    if (taskbarBtn) taskbarBtn.remove();

                    // 5. Close all windows with matching appId
                    var appIdToMatch = getPreferredAppIdentifier(app);
                    var windowsToClose = Array.from(document.querySelectorAll('.app-root')).filter(
                        (root) => root.dataset && root.dataset.appId === appIdToMatch
                    );
                    for (const windowEl of windowsToClose) {
                        windowEl.remove();
                    }

                    hasChanges = true;
                } catch (e) {
                    flowawayError('pollAppChanges', 'Failed while deleting app', e, {
                        index: i
                    });
                }
            }
        }

        // Second pass: refresh metadata (entry.json/icon.txt) on change notifications
        if (forceMetadataCheck) {
            var foldersForMetadata = targetFolderSet
                ? currentAppFolders.filter((f) => targetFolderSet.has(String(f[0] || '').trim()))
                : currentAppFolders;

            for (const appFolder of foldersForMetadata) {
                try {
                    var folderName = appFolder[0];
                    var expectedPath = appFolder[2] && appFolder[2].path ? appFolder[2].path : `apps/${folderName}`;
                    var existingApp = window.apps.find((a) => a.path === expectedPath);
                    if (!existingApp) continue;

                    var newAppData = await extractAppData(appFolder);
                    if (!newAppData) continue;

                    var appModified = false;
                    var jsFileChanged = existingApp.jsFile !== newAppData.jsFile;
                    var entryChanged = existingApp.entry !== newAppData.entry;

                    if (entryChanged) {
                        console.log(
                            `[APP POLLING] ${existingApp.label}: entry changed from ${existingApp.entry} to ${newAppData.entry}`
                        );
                        appModified = true;
                    }
                    if (jsFileChanged) {
                        console.log(
                            `[APP POLLING] ${existingApp.label}: JS file changed from ${existingApp.jsFile} to ${newAppData.jsFile}`
                        );
                        appModified = true;
                    }
                    if (existingApp.icon !== newAppData.icon) {
                        console.log(`[APP POLLING] ${existingApp.label}: icon changed`);
                        appModified = true;
                    }
                    if (existingApp.label !== newAppData.label) {
                        console.log(`[APP POLLING] App label changed from ${existingApp.label} to ${newAppData.label}`);
                        appModified = true;
                    }
                    if (existingApp.startbtnid !== newAppData.startbtnid) {
                        appModified = true;
                    }
                    if (existingApp.globalvarobject !== newAppData.globalvarobject) {
                        appModified = true;
                    }
                    if (existingApp.cmf !== newAppData.cmf) {
                        appModified = true;
                    }
                    if (existingApp.cmfl1 !== newAppData.cmfl1) {
                        appModified = true;
                    }

                    if (appModified) {
                        // preserve old names so we can remove their globals safely after reload
                        var _oldEntry = existingApp.entry;
                        var _oldCmf = existingApp.cmf;
                        var _oldAppGlobalVarStrings = existingApp.appGlobalVarStrings;
                        var _oldId = existingApp.id;
                        var _oldStartbtnid = existingApp.startbtnid;
                        existingApp.entry = newAppData.entry;
                        existingApp.jsFile = newAppData.jsFile;
                        existingApp.icon = newAppData.icon;
                        existingApp.label = newAppData.label;
                        existingApp.startbtnid = newAppData.startbtnid;
                        existingApp.id = newAppData.id;
                        existingApp.globalvarobject = newAppData.globalvarobject;
                        existingApp.cmf = newAppData.cmf;
                        existingApp.cmfl1 = newAppData.cmfl1;
                        existingApp.appGlobalVarStrings = newAppData.appGlobalVarStrings;

                        // Update grid icon/label
                        var appGridElement =
                            document.getElementById(newAppData.startbtnid || newAppData.id + 'app') ||
                            document.getElementById(_oldStartbtnid || _oldId + 'app') ||
                            document.getElementById(existingApp.id + 'app');
                        if (appGridElement) {
                            appGridElement.innerHTML = `${existingApp.icon}<br><span style="font-size:14px;">${existingApp.label}</span>`;
                        }

                        // Reload script if JS file changed
                        if (jsFileChanged && existingApp.jsFile) {
                            try {
                                var b64 = await fetchFileContentByPath(`${existingApp.path}/${existingApp.jsFile}`);
                                var scriptText = base64ToUtf8(b64);
                                var currentHash = hashScriptContent(scriptText);
                                if (existingApp.scriptLoaded && existingApp._scriptElement) {
                                    existingApp._scriptElement.remove();
                                    existingApp.scriptLoaded = false;
                                }
                                // remove previous entry/cmf globals if they exist (use preserved names)
                                try {
                                    if (_oldEntry && typeof window[_oldEntry] !== 'undefined') {
                                        try {
                                            delete window[_oldEntry];
                                        } catch (e) {}
                                    }
                                    if (
                                        _oldCmf &&
                                        !isProtectedAppGlobalName(_oldCmf) &&
                                        typeof window[_oldCmf] !== 'undefined'
                                    ) {
                                        try {
                                            delete window[_oldCmf];
                                        } catch (e) {}
                                    }
                                    if (_oldAppGlobalVarStrings && Array.isArray(_oldAppGlobalVarStrings)) {
                                        for (const varName of _oldAppGlobalVarStrings) {
                                            if (isProtectedAppGlobalName(varName)) continue;
                                            if (typeof window[varName] !== 'undefined') {
                                                try {
                                                    delete window[varName];
                                                } catch (e) {}
                                            }
                                        }
                                    }
                                } catch (e) {}
                                var s = document.createElement('script');
                                s.type = 'text/javascript';
                                s.textContent = scriptText;
                                document.body.appendChild(s);
                                existingApp.scriptLoaded = true;
                                existingApp._scriptElement = s;
                                existingApp._lastScriptHash = currentHash;
                                scriptReloadedPaths.add(existingApp.path);
                                console.log(`[APP POLLING] Script reloaded for: ${existingApp.label}`);
                            } catch (e) {
                                console.error(`[APP POLLING] Failed to reload script for ${existingApp.label}:`, e);
                            }
                        }

                        hasChanges = true;
                    }
                } catch (e) {
                    flowawayError('pollAppChanges', 'Failed while refreshing app metadata', e, {
                        folder: appFolder && appFolder[0]
                    });
                }
            }
        }

        // Third pass: Check if scripts have changed for existing apps (on change notifications)
        if (forceMetadataCheck) {
            var appsForScriptCheck = targetFolderSet
                ? window.apps.filter((a) => targetFolderSet.has(String((a.path || '').split('/').pop() || '').trim()))
                : window.apps;

            for (const app of appsForScriptCheck) {
                try {
                    if (scriptReloadedPaths.has(app.path)) continue;
                    if (app.jsFile && app._lastScriptHash) {
                        try {
                            var b64 = await fetchFileContentByPath(`${app.path}/${app.jsFile}`);
                            var scriptText = base64ToUtf8(b64);
                            var currentHash = hashScriptContent(scriptText);

                            if (currentHash !== app._lastScriptHash) {
                                console.log(`[APP POLLING] ${app.label}: JS file content changed`);

                                if (app.scriptLoaded && app._scriptElement) {
                                    app._scriptElement.remove();
                                    app.scriptLoaded = false;
                                }

                                if (app.entry && window[app.entry]) {
                                    try {
                                        window[app.entry] = null;
                                        delete window[app.entry];
                                    } catch (e) {}
                                }

                                try {
                                    app._lastScriptHash = currentHash;
                                    // remove prior globals exposed by this app before re-injecting
                                    try {
                                        if (app.entry && typeof window[app.entry] !== 'undefined') {
                                            try {
                                                delete window[app.entry];
                                            } catch (e) {}
                                        }
                                        if (
                                            app.cmf &&
                                            !isProtectedAppGlobalName(app.cmf) &&
                                            typeof window[app.cmf] !== 'undefined'
                                        ) {
                                            try {
                                                delete window[app.cmf];
                                            } catch (e) {}
                                        }
                                        if (app.appGlobalVarStrings && Array.isArray(app.appGlobalVarStrings)) {
                                            for (const varName of app.appGlobalVarStrings) {
                                                if (isProtectedAppGlobalName(varName)) continue;
                                                if (typeof window[varName] !== 'undefined') {
                                                    try {
                                                        delete window[varName];
                                                    } catch (e) {}
                                                }
                                            }
                                        }
                                    } catch (e) {}
                                    var s = document.createElement('script');
                                    s.type = 'text/javascript';
                                    s.textContent = scriptText;
                                    document.body.appendChild(s);
                                    app.scriptLoaded = true;
                                    app._scriptElement = s;
                                    console.log(`[APP POLLING] Script reloaded for: ${app.label}`);
                                    hasChanges = true;
                                } catch (e) {
                                    console.error(`[APP POLLING] Failed to reload script for ${app.label}:`, e);
                                }
                            }
                        } catch (e) {
                            flowawayError('pollAppChanges', 'Failed to check script hash', e, {
                                appId: app && app.id,
                                label: app && app.label
                            });
                        }
                    }
                } catch (e) {
                    flowawayError('pollAppChanges', 'Failed while processing app script check', e, {
                        appId: app && app.id,
                        label: app && app.label
                    });
                }
            }
        }

        // If any changes detected, re-render and apply
        if (hasChanges && data) {
            refreshAppsUiAfterChanges();
        }
    } catch (e) {
        flowawayError('pollAppChanges', 'Error during polling', e);
    }
}

async function pollSpecificAppChanges(changedFolders = []) {
    if (!Array.isArray(changedFolders) || !changedFolders.length) return;

    try {
        var folderNames = [...new Set(changedFolders.map((v) => String(v || '').trim()).filter(Boolean))];
        var localHasChanges = false;
        var shouldFallback = false;
        var scriptReloadedPaths = new Set();

        for (const folderName of folderNames) {
            try {
                var expectedPath = `apps/${folderName}`;
                var existingApp = (window.apps || []).find(
                    (a) => a.path === expectedPath || (a.path || '').split('/').pop() === folderName
                );

                if (!existingApp) {
                    // If the folder still exists, this is likely a new app and we need fallback to add it.
                    // If it does not exist, this is likely a delete event for an already-removed app; skip fallback.
                    var folderStillExists = null;
                    try {
                        folderStillExists = await getFolderListing(expectedPath);
                    } catch (e) {
                        folderStillExists = null;
                    }
                    if (Array.isArray(folderStillExists)) {
                        shouldFallback = true;
                    }
                    continue;
                }

                var appFolder = [folderName, [], { path: existingApp.path || expectedPath }];
                var newAppData = null;
                try {
                    newAppData = await extractAppData(appFolder);
                } catch (e) {
                    var isEnoent = !!(e && (e.code === 'ENOENT' || String(e.message || '').includes('ENOENT')));
                    if (isEnoent) {
                        try {
                            if (existingApp._scriptElement) existingApp._scriptElement.remove();
                        } catch (ee) {}

                        try {
                            if (existingApp.entry && typeof window[existingApp.entry] !== 'undefined') {
                                try {
                                    delete window[existingApp.entry];
                                } catch (ee) {}
                            }
                            if (
                                existingApp.cmf &&
                                !isProtectedAppGlobalName(existingApp.cmf) &&
                                typeof window[existingApp.cmf] !== 'undefined'
                            ) {
                                try {
                                    delete window[existingApp.cmf];
                                } catch (ee) {}
                            }
                            if (existingApp.appGlobalVarStrings && Array.isArray(existingApp.appGlobalVarStrings)) {
                                for (const varName of existingApp.appGlobalVarStrings) {
                                    if (isProtectedAppGlobalName(varName)) continue;
                                    if (typeof window[varName] !== 'undefined') {
                                        try {
                                            delete window[varName];
                                        } catch (ee) {}
                                    }
                                }
                            }
                        } catch (ee) {}

                        var appIndexToDelete = (window.apps || []).findIndex(
                            (a) => a === existingApp || (a.path || '').split('/').pop() === folderName
                        );
                        if (appIndexToDelete >= 0) {
                            window.apps.splice(appIndexToDelete, 1);
                        }

                        try {
                            var appElementToDelete =
                                document.getElementById(existingApp.startbtnid || existingApp.id + 'app') ||
                                document.getElementById(existingApp.id + 'app');
                            if (appElementToDelete) appElementToDelete.remove();
                        } catch (ee) {}

                        try {
                            var taskbarBtnToDelete = Array.from(taskbar.querySelectorAll('button')).find(
                                (btn) =>
                                    (btn.dataset && appMatchesIdentifier(existingApp, btn.dataset.appId)) ||
                                    btn.textContent.includes(existingApp.label)
                            );
                            if (taskbarBtnToDelete) taskbarBtnToDelete.remove();
                        } catch (ee) {}

                        try {
                            var appIdToClose = getPreferredAppIdentifier(existingApp);
                            var windowsToClose = Array.from(document.querySelectorAll('.app-root')).filter(
                                (root) => root.dataset && root.dataset.appId === appIdToClose
                            );
                            for (const windowEl of windowsToClose) {
                                windowEl.remove();
                            }
                        } catch (ee) {}

                        localHasChanges = true;
                        continue;
                    }
                    throw e;
                }
                if (!newAppData) continue;

                var appModified = false;
                var jsFileChanged = existingApp.jsFile !== newAppData.jsFile;
                var entryChanged = existingApp.entry !== newAppData.entry;

                if (entryChanged) appModified = true;
                if (jsFileChanged) appModified = true;
                if (existingApp.icon !== newAppData.icon) appModified = true;
                if (existingApp.label !== newAppData.label) appModified = true;
                if (existingApp.startbtnid !== newAppData.startbtnid) appModified = true;
                if (existingApp.globalvarobject !== newAppData.globalvarobject) appModified = true;
                if (existingApp.cmf !== newAppData.cmf) appModified = true;
                if (existingApp.cmfl1 !== newAppData.cmfl1) appModified = true;

                if (appModified) {
                    var _oldEntry = existingApp.entry;
                    var _oldCmf = existingApp.cmf;
                    var _oldAppGlobalVarStrings = existingApp.appGlobalVarStrings;
                    var _oldId = existingApp.id;
                    var _oldStartbtnid = existingApp.startbtnid;

                    existingApp.entry = newAppData.entry;
                    existingApp.jsFile = newAppData.jsFile;
                    existingApp.icon = newAppData.icon;
                    existingApp.label = newAppData.label;
                    existingApp.startbtnid = newAppData.startbtnid;
                    existingApp.id = newAppData.id;
                    existingApp.globalvarobject = newAppData.globalvarobject;
                    existingApp.cmf = newAppData.cmf;
                    existingApp.cmfl1 = newAppData.cmfl1;
                    existingApp.appGlobalVarStrings = newAppData.appGlobalVarStrings;

                    var appGridElement =
                        document.getElementById(newAppData.startbtnid || newAppData.id + 'app') ||
                        document.getElementById(_oldStartbtnid || _oldId + 'app') ||
                        document.getElementById(existingApp.id + 'app');
                    if (appGridElement) {
                        appGridElement.innerHTML = `${existingApp.icon}<br><span style="font-size:14px;">${existingApp.label}</span>`;
                    }

                    if (jsFileChanged && existingApp.jsFile) {
                        try {
                            var b64 = await fetchFileContentByPath(`${existingApp.path}/${existingApp.jsFile}`);
                            var scriptText = base64ToUtf8(b64);
                            var currentHash = hashScriptContent(scriptText);
                            if (existingApp.scriptLoaded && existingApp._scriptElement) {
                                existingApp._scriptElement.remove();
                                existingApp.scriptLoaded = false;
                            }

                            try {
                                if (_oldEntry && typeof window[_oldEntry] !== 'undefined') {
                                    try {
                                        delete window[_oldEntry];
                                    } catch (e) {}
                                }
                                if (
                                    _oldCmf &&
                                    !isProtectedAppGlobalName(_oldCmf) &&
                                    typeof window[_oldCmf] !== 'undefined'
                                ) {
                                    try {
                                        delete window[_oldCmf];
                                    } catch (e) {}
                                }
                                if (_oldAppGlobalVarStrings && Array.isArray(_oldAppGlobalVarStrings)) {
                                    for (const varName of _oldAppGlobalVarStrings) {
                                        if (isProtectedAppGlobalName(varName)) continue;
                                        if (typeof window[varName] !== 'undefined') {
                                            try {
                                                delete window[varName];
                                            } catch (e) {}
                                        }
                                    }
                                }
                            } catch (e) {}

                            var s = document.createElement('script');
                            s.type = 'text/javascript';
                            s.textContent = scriptText;
                            document.body.appendChild(s);
                            existingApp.scriptLoaded = true;
                            existingApp._scriptElement = s;
                            existingApp._lastScriptHash = currentHash;
                            scriptReloadedPaths.add(existingApp.path);
                            localHasChanges = true;
                        } catch (e) {
                            console.error(`[APP POLLING] Failed to reload script for ${existingApp.label}:`, e);
                        }
                    }

                    localHasChanges = true;
                }

                if (!scriptReloadedPaths.has(existingApp.path) && existingApp.jsFile && existingApp._lastScriptHash) {
                    try {
                        var b64Current = await fetchFileContentByPath(`${existingApp.path}/${existingApp.jsFile}`);
                        var scriptTextCurrent = base64ToUtf8(b64Current);
                        var currentHashNow = hashScriptContent(scriptTextCurrent);

                        if (currentHashNow !== existingApp._lastScriptHash) {
                            if (existingApp.scriptLoaded && existingApp._scriptElement) {
                                existingApp._scriptElement.remove();
                                existingApp.scriptLoaded = false;
                            }

                            try {
                                if (existingApp.entry && typeof window[existingApp.entry] !== 'undefined') {
                                    try {
                                        delete window[existingApp.entry];
                                    } catch (e) {}
                                }
                                if (
                                    existingApp.cmf &&
                                    !isProtectedAppGlobalName(existingApp.cmf) &&
                                    typeof window[existingApp.cmf] !== 'undefined'
                                ) {
                                    try {
                                        delete window[existingApp.cmf];
                                    } catch (e) {}
                                }
                                if (existingApp.appGlobalVarStrings && Array.isArray(existingApp.appGlobalVarStrings)) {
                                    for (const varName of existingApp.appGlobalVarStrings) {
                                        if (isProtectedAppGlobalName(varName)) continue;
                                        if (typeof window[varName] !== 'undefined') {
                                            try {
                                                delete window[varName];
                                            } catch (e) {}
                                        }
                                    }
                                }
                            } catch (e) {}

                            var sCurrent = document.createElement('script');
                            sCurrent.type = 'text/javascript';
                            sCurrent.textContent = scriptTextCurrent;
                            document.body.appendChild(sCurrent);
                            existingApp.scriptLoaded = true;
                            existingApp._scriptElement = sCurrent;
                            existingApp._lastScriptHash = currentHashNow;
                            localHasChanges = true;
                        }
                    } catch (e) {
                        flowawayError('pollSpecificAppChanges', 'Failed to check script hash', e, {
                            folder: folderName,
                            appId: existingApp && existingApp.id
                        });
                    }
                }
            } catch (e) {
                flowawayError('pollSpecificAppChanges', 'Failed while processing changed app folder', e, {
                    folder: folderName
                });
            }
        }

        if (shouldFallback) {
            await window.loadTree();
            await pollAppChanges(true, folderNames);
            return;
        }

        if (localHasChanges && data) {
            refreshAppsUiAfterChanges();
        }
    } catch (e) {
        flowawayError('pollSpecificAppChanges', 'Targeted poll failed, falling back to full poll', e);
        await window.loadTree();
        await pollAppChanges(true, changedFolders);
    }
}
// appUpdated - ensure single binding
try {
    if (window._flowaway_handlers.onAppUpdated)
        window.removeEventListener('appUpdated', window._flowaway_handlers.onAppUpdated);
    window._flowaway_handlers.onAppUpdated = (e) => {
        purgeButtons();
    };
    window.addEventListener('appUpdated', window._flowaway_handlers.onAppUpdated);
} catch (e) {}
function startAppPolling() {
    if (appPollingActive) return;
    appPollingActive = true;

    var wsStarted = startAppPollingViaWebSocket();
    if (!wsStarted) {
        console.log('[APP POLLING] WebSocket unavailable; no fallback polling');
        return;
    }

    console.log('[APP POLLING] WebSocket polling enabled');
}

// Ensure loadAppsFromTree runs after initial tree load
var oldLoadTree = window.loadTree;
window.loadTree = async function () {
    await oldLoadTree();
    await loadAppsFromTree();
};
loadTree();
window.onlyloadTree = oldLoadTree;
// ----------------- END dynamic app loader -----------------

var username = typeof data !== 'undefined' && data && typeof data.username === 'string' ? data.username : '';

// fullscreen keyboard lock
// fullscreenchange - ensure single binding
try {
    if (window._flowaway_handlers.onFullscreenChange)
        document.removeEventListener('fullscreenchange', window._flowaway_handlers.onFullscreenChange);
    window._flowaway_handlers.onFullscreenChange = async () => {
        if (document.fullscreenElement) {
            if (navigator.keyboard && typeof navigator.keyboard.lock === 'function') {
                try {
                    await navigator.keyboard.lock(['Escape']);
                } catch (e) {}
            }
        } else {
            if (navigator.keyboard && typeof navigator.keyboard.unlock === 'function') {
                try {
                    navigator.keyboard.unlock();
                } catch (e) {}
            }
        }
    };
    document.addEventListener('fullscreenchange', window._flowaway_handlers.onFullscreenChange);
} catch (e) {}

window.removeOtherMenus = function (except) {
    try {
        // Remove any menus with the shared .app-menu class (used across apps)
        var menus = document.querySelectorAll('.app-menu');
        for (const m of menus) {
            try {
                if (except && m.dataset && m.dataset.appId === except) continue;
            } catch (e) {}
            try {
                m.remove();
            } catch (e) {}
        }
    } catch (e) {}
};

window.resolveAppFromEvent = function (evt, appOverride = null) {
    if (appOverride && typeof appOverride === 'object') return appOverride;
    try {
        var appId =
            evt && evt.target && evt.target.closest && evt.target.closest('[data-app-id], [data-appid]')
                ? evt.target.closest('[data-app-id], [data-appid]').dataset.appId ||
                  evt.target.closest('[data-app-id], [data-appid]').dataset.appid
                : '';

        if (!appId && evt && evt.target && evt.target.closest) {
            var taskBtn = evt.target.closest('button.taskbutton');
            if (taskBtn) {
                appId =
                    (taskBtn.dataset && taskBtn.dataset.appId) || (taskBtn.value && String(taskBtn.value).trim()) || '';
            }
        }

        if (!appId) return null;
        return (window.apps || []).find((a) => appMatchesIdentifier(a, appId)) || null;
    } catch (e) {
        return null;
    }
};

window.getAppInstances = function (app) {
    if (!app || !app.globalvarobject || !app.allapparray) return [];
    try {
        var appGlobalObj = window[app.globalvarobject];
        var list = appGlobalObj && appGlobalObj[app.allapparray];
        return Array.isArray(list) ? list : [];
    } catch (e) {
        return [];
    }
};

window.showUnifiedAppContextMenu = function (e, appOverride = null, needRemove = true) {
    if (!e) return;
    e.preventDefault();

    var app = window.resolveAppFromEvent(e, appOverride);
    if (!app) return;

    document.querySelectorAll('.app-menu').forEach((m) => m.remove());

    const menu = document.createElement('div');
    try {
        removeOtherMenus(app.id || app.entry || '');
    } catch (err) {}

    menu.className = 'app-menu';
    if (app && app.id) menu.dataset.appId = String(app.id);
    Object.assign(menu.style, {
        position: 'fixed',
        left: `${e.clientX}px`,
        border: '1px solid #ccc',
        borderRadius: '4px',
        boxShadow: '0 2px 6px rgba(0,0,0,0.2)',
        zIndex: 9999999,
        padding: '4px 0',
        minWidth: '160px',
        fontSize: '13px',
        visibility: 'hidden'
    });
    data.dark ? menu.classList.toggle('dark', true) : menu.classList.toggle('light', true);

    function withInstances(handler) {
        try {
            var instances = window.getAppInstances(app);
            handler(instances);
        } catch (err) {}
        menu.remove();
    }

    const closeAll = document.createElement('div');
    closeAll.textContent = 'Close all';
    closeAll.style.padding = '6px 10px';
    closeAll.style.cursor = 'pointer';
    closeAll.addEventListener('click', () => {
        withInstances((instances) => {
            const first = instances[0];
            if (first && typeof first.closeAll === 'function') {
                first.closeAll();
                return;
            }
            for (const instance of [...instances]) {
                if (instance && typeof instance.closeWindow === 'function') {
                    instance.closeWindow();
                }
            }
        });
    });
    menu.appendChild(closeAll);

    const hideAll = document.createElement('div');
    hideAll.textContent = 'Hide all';
    hideAll.style.padding = '6px 10px';
    hideAll.style.cursor = 'pointer';
    hideAll.addEventListener('click', () => {
        withInstances((instances) => {
            const first = instances[0];
            if (first && typeof first.hideAll === 'function') {
                first.hideAll();
                return;
            }
            for (const instance of instances) {
                if (instance && typeof instance.hideWindow === 'function') {
                    instance.hideWindow();
                } else if (instance && instance.rootElement) {
                    instance.rootElement.style.display = 'none';
                }
            }
        });
    });
    menu.appendChild(hideAll);

    const showAll = document.createElement('div');
    showAll.textContent = 'Show all';
    showAll.style.padding = '6px 10px';
    showAll.style.cursor = 'pointer';
    showAll.addEventListener('click', () => {
        withInstances((instances) => {
            const first = instances[0];
            if (first && typeof first.showAll === 'function') {
                first.showAll();
                return;
            }
            instances.sort((a, b) => a.rootElement.style.zIndex - b.rootElement.style.zIndex);
            for (const instance of instances) {
                if (instance && typeof instance.showWindow === 'function') {
                    instance.showWindow();
                } else if (instance && instance.rootElement) {
                    instance.rootElement.style.display = 'block';
                    bringToFront(instance.rootElement);
                }
            }
        });
    });
    menu.appendChild(showAll);

    const newWindow = document.createElement('div');
    newWindow.textContent = 'New window';
    newWindow.style.padding = '6px 10px';
    newWindow.style.cursor = 'pointer';
    newWindow.addEventListener('click', () => {
        withInstances((instances) => {
            const first = instances[0];
            if (first && typeof first.newWindow === 'function') {
                first.newWindow();
            } else {
                launchApp(getPreferredAppIdentifier(app));
            }
        });
    });
    menu.appendChild(newWindow);

    if (needRemove) {
        const remove = document.createElement('div');
        remove.textContent = 'Remove from taskbar';
        remove.style.padding = '6px 10px';
        remove.style.cursor = 'pointer';
        const contextMenuEvent = e;
        remove.addEventListener('click', () => {
            var btn =
                contextMenuEvent && contextMenuEvent.target && contextMenuEvent.target.closest
                    ? contextMenuEvent.target.closest('button.taskbutton')
                    : null;
            if (btn) {
                removeTaskButton(btn);
                try {
                    saveTaskButtons();
                    purgeButtons();
                } catch (err) {}
            }
            menu.remove();
        });
        menu.appendChild(remove);
    } else {
        const appId = getPreferredAppIdentifier(app);
        const existingBtn = document.querySelector(`button.taskbutton[data-app-id="${appId}"]`);

        if (existingBtn) {
            const remove = document.createElement('div');
            remove.textContent = 'Remove from taskbar';
            remove.style.padding = '6px 10px';
            remove.style.cursor = 'pointer';
            remove.addEventListener('click', function () {
                removeTaskButton(existingBtn);
                try {
                    saveTaskButtons();
                    purgeButtons();
                } catch (err) {}
                menu.remove();
            });
            menu.appendChild(remove);
        } else {
            const add = document.createElement('div');
            add.textContent = 'Add to taskbar';
            add.style.padding = '6px 10px';
            add.style.cursor = 'pointer';
            add.addEventListener('click', function () {
                const btn = addTaskButton(app.icon, () => launchApp(appId), 'cmf', '', appId);
                if (btn) btn.dataset.appId = appId;
                saveTaskButtons();
                purgeButtons();
                menu.remove();
            });
            menu.appendChild(add);
        }
    }

    const barrier = document.createElement('hr');
    menu.appendChild(barrier);

    const instances = window.getAppInstances(app);
    if (instances.length === 0) {
        const item = document.createElement('div');
        item.textContent = 'No open windows';
        item.style.padding = '6px 10px';
        menu.appendChild(item);
    } else {
        instances.forEach((instance, i) => {
            const item = document.createElement('div');
            item.textContent = instance.title || `${app.label || 'Window'} ${i + 1}`;
            Object.assign(item.style, {
                padding: '6px 10px',
                cursor: 'pointer',
                maxWidth: '185px',
                whiteSpace: 'nowrap',
                overflow: 'hidden',
                textOverflow: 'ellipsis'
            });

            item.addEventListener('click', () => {
                try {
                    if (instance && typeof instance.showWindow === 'function') {
                        instance.showWindow();
                    } else if (instance && instance.rootElement) {
                        instance.rootElement.style.display = 'block';
                        bringToFront(instance.rootElement);
                    }
                } catch (err) {}
                menu.remove();
            });

            menu.appendChild(item);
        });
    }

    document.body.appendChild(menu);

    requestAnimationFrame(() => {
        const menuHeight = menu.offsetHeight;
        let top = e.clientY - menuHeight;
        if (top < 0) top = 0;
        menu.style.top = `${top}px`;
        menu.style.visibility = 'visible';
    });

    window.addEventListener('click', () => menu.remove(), { once: true });
};

window.cmf = function (e, appOverride = null) {
    window.showUnifiedAppContextMenu(e, appOverride, true);
};

window.cmfl1 = function (e, appOverride = null) {
    window.showUnifiedAppContextMenu(e, appOverride, false);
};

function applyTaskButtons() {
    if (window.appsButtonsApplied) return;
    if (!window.apps || window.apps.length === 0) return;

    var taskbarReady = false;
    try {
        taskbarReady =
            typeof taskbar !== 'undefined' && !!taskbar && taskbar.isConnected && typeof addTaskButton === 'function';
    } catch (e) {
        taskbarReady = false;
    }

    if (!taskbarReady) {
        try {
            if (typeof loadSystemHelperScript === 'function') loadSystemHelperScript();
        } catch (e) {}

        try {
            window._flowaway_handlers = window._flowaway_handlers || {};
            if (!window._flowaway_handlers.applyTaskButtonsRetryTimer) {
                window._flowaway_handlers.applyTaskButtonsRetryTimer = setTimeout(() => {
                    try {
                        if (window._flowaway_handlers && window._flowaway_handlers.applyTaskButtonsRetryTimer) {
                            clearTimeout(window._flowaway_handlers.applyTaskButtonsRetryTimer);
                            delete window._flowaway_handlers.applyTaskButtonsRetryTimer;
                        }
                    } catch (e) {}
                    try {
                        applyTaskButtons();
                    } catch (e) {}
                }, 200);
            }
        } catch (e) {}
        return;
    }

    window.appsButtonsApplied = true;
    window._suppressTaskbarPersist = true;

    try {
        // Clear existing dynamic task buttons (keep system buttons in the first two slots)
        var existingTaskButtons = [...taskbar.querySelectorAll('button.taskbutton')];
        existingTaskButtons.splice(0, 2);
        existingTaskButtons.forEach((btn) => btn.remove());

        // Prefer dynamic apps discovered in /apps
        var savedTaskButtons = Array.isArray(data && data.taskbuttons) ? data.taskbuttons : [];
        var seenAppIds = new Set();
        for (const taskbutton of savedTaskButtons) {
            const app = (window.apps || []).find((a) => appMatchesIdentifier(a, taskbutton));
            if (app) {
                const appId = getPreferredAppIdentifier(app);
                if (seenAppIds.has(appId)) continue;
                seenAppIds.add(appId);
                const btn = addTaskButton(app.icon, () => launchApp(appId), 'cmf', '', appId);
                if (btn) btn.dataset.appId = appId;
            }
        }
        taskbuttons = [...taskbar.querySelectorAll('button')];
    } catch (e) {
        window.appsButtonsApplied = false;
        try {
            window._flowaway_handlers = window._flowaway_handlers || {};
            if (!window._flowaway_handlers.applyTaskButtonsRetryTimer) {
                window._flowaway_handlers.applyTaskButtonsRetryTimer = setTimeout(() => {
                    try {
                        if (window._flowaway_handlers && window._flowaway_handlers.applyTaskButtonsRetryTimer) {
                            clearTimeout(window._flowaway_handlers.applyTaskButtonsRetryTimer);
                            delete window._flowaway_handlers.applyTaskButtonsRetryTimer;
                        }
                    } catch (e) {}
                    try {
                        applyTaskButtons();
                    } catch (e) {}
                }, 200);
            }
        } catch (retryErr) {}
    } finally {
        window._suppressTaskbarPersist = false;
    }
}

function purgeButtons() {
    buttons = [...taskbar.querySelectorAll('button')];
    buttons.splice(0, 3);
    buttons.forEach((b) => {
        if (!b.dataset.appId) {
            b.dataset.appId = b.textContent;
        }
    });
    // Build a generic map from appId -> [buttons]
    window.appButtons = window.appButtons || {};
    window.appButtons = {};
    for (let i = 0; i < taskbuttons.length; i++) {
        let tb = taskbuttons[i];
        var id;
        try {
            id = tb.dataset.appId;
        } catch (e) {}
        if (!id) continue;
        window.appButtons[id] = window.appButtons[id] || [];
        window.appButtons[id].push(tb);
    }
}

function saveTaskButtons(silence = true) {
    var buttons = [...taskbar.querySelectorAll('button')];
    buttons.splice(0, 2);
    var postdata = [];
    for (const b of buttons) {
        if (b.dataset && b.dataset.appId) {
            postdata.push(b.dataset.appId);
        } else {
            // If no dataset, try to infer id from value or textContent
            var inferred = (b.value && String(b.value).trim()) || (b.textContent && String(b.textContent).trim());
            if (inferred) postdata.push(inferred);
        }
    }
    if (!silence) notification('taskbuttons saved!');
    posttaskbuttons(postdata);
}
function bringToFront(el) {
    if (!el) return;
    var appId = resolveWindowAppId(el);
    atTop = appId || '';
    el.style.zIndex = String(++zTop);
}

function resolveWindowAppId(el) {
    if (!el) return '';
    var appId = el.dataset && el.dataset.appId;
    if (!appId) appId = el.getAttribute && el.getAttribute('data-app-id');
    if (!appId && window.apps && Array.isArray(window.apps)) {
        for (const a of window.apps) {
            try {
                // Only use real identifier strings (entry function name, startbtnid) for class/id matching.
                // a.id and a.icon are icon content (emoji or HTML markup), not valid identifiers.
                var candidates = [a.entry, a.startbtnid].filter(function (c) {
                    return c && typeof c === 'string' && c.length < 64;
                });
                var matched = candidates.some(function (cid) {
                    return el.classList.contains(cid) || el.id === cid + 'app' || el.id === cid;
                });
                if (matched) {
                    appId = a.entry || a.startbtnid;
                    break;
                }
            } catch (e) {}
        }
    }
    if (!appId) {
        try {
            if (el.classList && el.classList.contains('browser')) appId = 'browser';
        } catch (e) {}
    }
    return appId || '';
}

function findAppByIdentifier(identifier) {
    if (!identifier || !window.apps || !Array.isArray(window.apps)) return null;
    for (const a of window.apps) {
        if (!a) continue;
        // Only match against true identifiers (entry function name, startbtnid).
        // Do NOT match a.id or a.icon — those contain icon HTML/emoji content, not identifiers.
        if (identifier === a.entry || identifier === a.startbtnid) {
            return a;
        }
    }
    return null;
}

function resolveWindowLabel(el) {
    var appId = resolveWindowAppId(el);
    var windowTitle = '';
    try {
        windowTitle = ((el && el.getAttribute && el.getAttribute('data-title')) || '').trim();
    } catch (e) {}
    if (windowTitle && windowTitle !== 'undefined' && windowTitle !== 'null') return windowTitle;

    var appMeta = findAppByIdentifier(appId);
    if (appMeta) {
        var appLabel = (appMeta.label || appMeta.name || '').trim();
        if (appLabel && appLabel !== 'undefined' && appLabel !== 'null') return appLabel;
    }
    if (appId && appId !== 'browser' && appId !== 'undefined' && appId !== 'null') return appId;
    return 'Window';
}

function getSwitchableWindows() {
    try {
        return Array.from(document.querySelectorAll('.app-root')).filter((el) => {
            if (!el || !el.isConnected) return false;
            var cs = window.getComputedStyle(el);
            if (!cs) return false;
            return cs.display !== 'none' && cs.visibility !== 'hidden';
        });
    } catch (e) {
        return [];
    }
}

function resolveFocusedWindowRoot(windows) {
    var active = null;
    try {
        active = document.activeElement;
    } catch (e) {
        active = null;
    }

    if (active) {
        try {
            if (typeof active.closest === 'function') {
                var candidate = active.closest('.app-root');
                if (candidate && (!windows || windows.indexOf(candidate) !== -1)) {
                    return candidate;
                }
            }
        } catch (e) {}
    }

    if (atTop && windows && windows.length) {
        for (var i = 0; i < windows.length; i++) {
            if (resolveWindowAppId(windows[i]) === atTop) return windows[i];
        }
    }

    return null;
}

var windowSwitchState = {
    active: false,
    mod: '',
    order: [],
    index: 0,
    lastTs: 0,
    pendingTarget: null,
    previewRoot: null,
    previewList: null
};

function ensureWindowSwitchPreview() {
    if (windowSwitchState.previewRoot && windowSwitchState.previewRoot.isConnected) return;

    var root = document.createElement('div');
    root.setAttribute('aria-hidden', 'true');
    Object.assign(root.style, {
        position: 'fixed',
        inset: '0',
        zIndex: '2147483646',
        display: 'none',
        alignItems: 'center',
        justifyContent: 'center',
        pointerEvents: 'none',
        background: 'rgba(0, 0, 0, 0.12)',
        backdropFilter: 'blur(2px)'
    });

    var panel = document.createElement('div');
    var systemDark = data.dark;
    Object.assign(panel.style, {
        minWidth: '520px',
        maxWidth: '88vw',
        maxHeight: '76vh',
        overflow: 'hidden',
        borderRadius: '14px',
        background: systemDark ? 'rgba(26,26,26,0.96)' : 'rgba(245,245,245,0.96)',
        color: systemDark ? '#fff' : '#111',
        border: systemDark ? '1px solid rgba(255,255,255,0.14)' : '1px solid rgba(0,0,0,0.1)',
        boxShadow: '0 14px 40px rgba(0,0,0,0.35)',
        padding: '12px',
        display: 'flex',
        flexDirection: 'column',
        gap: '10px',
        fontFamily: 'system-ui, -apple-system, sans-serif'
    });

    var title = document.createElement('div');
    title.textContent = 'Switch windows';
    title.style.fontSize = '13px';
    title.style.opacity = '0.75';
    title.style.padding = '0 6px';

    var list = document.createElement('div');
    Object.assign(list.style, {
        display: 'flex',
        flexDirection: 'row',
        gap: '10px',
        overflowX: 'auto',
        overflowY: 'hidden',
        maxWidth: '84vw',
        minHeight: '130px',
        padding: '2px'
    });

    panel.appendChild(title);
    panel.appendChild(list);
    root.appendChild(panel);
    document.body.appendChild(root);

    windowSwitchState.previewRoot = root;
    windowSwitchState.previewList = list;
}

function hideWindowSwitchPreview() {
    if (!windowSwitchState.previewRoot) return;
    windowSwitchState.previewRoot.style.display = 'none';
}

function renderWindowSwitchPreview(modLabel) {
    ensureWindowSwitchPreview();
    if (!windowSwitchState.previewRoot || !windowSwitchState.previewList) return;

    var list = windowSwitchState.previewList;
    var panel = list.parentElement;
    var systemDark = data.dark;
    if (panel) {
        panel.style.background = systemDark ? 'rgba(26,26,26,0.96)' : 'rgba(245,245,245,0.96)';
        panel.style.color = systemDark ? '#fff' : '#111';
        panel.style.border = systemDark ? '1px solid rgba(255,255,255,0.14)' : '1px solid rgba(0,0,0,0.1)';
    }
    list.innerHTML = '';
    var order = windowSwitchState.order || [];
    var selectedRow = null;

    for (var i = 0; i < order.length; i++) {
        var el = order[i];
        var appId = resolveWindowAppId(el);
        var appLabel = resolveWindowLabel(el);
        var active = i === windowSwitchState.index;

        var row = document.createElement('div');
        Object.assign(row.style, {
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'center',
            alignItems: 'center',
            gap: '10px',
            borderRadius: '10px',
            padding: '12px 14px',
            minWidth: '150px',
            maxWidth: '150px',
            minHeight: '110px',
            boxSizing: 'border-box',
            background: active
                ? systemDark
                    ? 'rgba(255,255,255,0.16)'
                    : 'rgba(0,0,0,0.12)'
                : systemDark
                ? 'rgba(255,255,255,0.05)'
                : 'rgba(0,0,0,0.04)',
            border: active
                ? systemDark
                    ? '1px solid rgba(255,255,255,0.28)'
                    : '1px solid rgba(0,0,0,0.24)'
                : systemDark
                ? '1px solid rgba(255,255,255,0.08)'
                : '1px solid rgba(0,0,0,0.08)'
        });

        var icon = document.createElement('div');
        var iconApp = findAppByIdentifier(appId);
        var iconValue = (iconApp && iconApp.icon) || '🗔';
        if (iconValue && iconValue.trim().startsWith('<')) {
            icon.innerHTML = iconValue;
        } else {
            icon.textContent = iconValue;
        }
        Object.assign(icon.style, {
            width: '28px',
            textAlign: 'center',
            fontSize: '24px',
            lineHeight: '1'
        });

        var text = document.createElement('div');
        text.textContent = appLabel;
        text.style.fontSize = '14px';
        text.style.fontWeight = active ? '600' : '500';
        text.style.textAlign = 'center';
        text.style.maxWidth = '100%';
        text.style.overflow = 'hidden';
        text.style.textOverflow = 'ellipsis';
        text.style.whiteSpace = 'nowrap';

        row.appendChild(icon);
        row.appendChild(text);
        list.appendChild(row);
        if (active) selectedRow = row;
    }

    if (selectedRow && selectedRow.scrollIntoView) {
        try {
            selectedRow.scrollIntoView({
                behavior: 'auto',
                block: 'nearest',
                inline: 'center'
            });
        } catch (e) {}
    }

    windowSwitchState.previewRoot.style.display = 'flex';
    windowSwitchState.previewRoot.setAttribute('data-mod', modLabel || '');
}

function commitWindowSwitchTarget() {
    var target = windowSwitchState.pendingTarget;
    if (!target || !target.isConnected) return;
    bringToFront(target);
    try {
        target.focus({ preventScroll: true });
    } catch (e) {
        try {
            target.focus();
        } catch (err) {}
    }
}

function resetWindowSwitchState() {
    hideWindowSwitchPreview();
    windowSwitchState.active = false;
    windowSwitchState.mod = '';
    windowSwitchState.order = [];
    windowSwitchState.index = 0;
    windowSwitchState.lastTs = 0;
    windowSwitchState.pendingTarget = null;
}

function cycleWindowFocus(reverse, modKey, options) {
    var windows = getSwitchableWindows();
    if (!windows || windows.length <= 1) return false;

    windows.sort(function (a, b) {
        var za = parseInt(a.style.zIndex) || 0;
        var zb = parseInt(b.style.zIndex) || 0;
        return zb - za;
    });

    var now = Date.now();
    var mod = modKey || '';
    var timedOut = now - windowSwitchState.lastTs > 1500;
    var shouldReset = !windowSwitchState.active || windowSwitchState.mod !== mod || timedOut;

    if (shouldReset) {
        windowSwitchState.active = true;
        windowSwitchState.mod = mod;
        windowSwitchState.order = windows.slice();
        var forcedFocusedWindow =
            options && options.forceCurrentWindow && windowSwitchState.order.indexOf(options.forceCurrentWindow) !== -1
                ? options.forceCurrentWindow
                : null;
        var focusedWindow = forcedFocusedWindow || resolveFocusedWindowRoot(windowSwitchState.order);
        var focusedIndex = focusedWindow ? windowSwitchState.order.indexOf(focusedWindow) : -1;
        windowSwitchState.index = focusedIndex >= 0 ? focusedIndex : 0;
    } else {
        windowSwitchState.order = windowSwitchState.order.filter(function (el) {
            return windows.indexOf(el) !== -1;
        });
        for (var i = 0; i < windows.length; i++) {
            if (windowSwitchState.order.indexOf(windows[i]) === -1) {
                windowSwitchState.order.push(windows[i]);
            }
        }
        if (!windowSwitchState.order.length) {
            windowSwitchState.order = windows.slice();
            windowSwitchState.index = 0;
        }
        if (windowSwitchState.index >= windowSwitchState.order.length) {
            windowSwitchState.index = 0;
        }
    }

    var count = windowSwitchState.order.length;
    if (count <= 1) return false;

    var step = reverse ? -1 : 1;
    windowSwitchState.index = (windowSwitchState.index + step + count) % count;
    var target = windowSwitchState.order[windowSwitchState.index];
    if (!target) return false;

    windowSwitchState.pendingTarget = target;
    windowSwitchState.lastTs = now;
    renderWindowSwitchPreview(mod);
    return true;
}

function syncWindowSwitchPreview(target, modKey) {
    if (!target || !target.isConnected) return false;

    var windows = getSwitchableWindows();
    if (!windows || windows.length <= 1) return false;

    windows.sort(function (a, b) {
        var za = parseInt(a.style.zIndex) || 0;
        var zb = parseInt(b.style.zIndex) || 0;
        return zb - za;
    });

    var index = windows.indexOf(target);
    if (index < 0) return false;

    var mod = modKey || windowSwitchState.mod || '';
    windowSwitchState.active = true;
    windowSwitchState.mod = mod;
    windowSwitchState.order = windows;
    windowSwitchState.index = index;
    windowSwitchState.pendingTarget = target;
    windowSwitchState.lastTs = Date.now();
    renderWindowSwitchPreview(mod);
    return true;
}

// keydown - single binding
try {
    if (window._flowaway_handlers.onKeydown) window.removeEventListener('keydown', window._flowaway_handlers.onKeydown);
    window._flowaway_handlers.onKeydown = function (e) {
        // Build normalized combo e.g. 'Ctrl+Shift+N'
        var parts = [];
        if (e.ctrlKey) parts.push('Ctrl');
        if (e.altKey) parts.push('Alt');
        if (e.shiftKey) parts.push('Shift');
        var keyPart = String(e.key).toUpperCase();
        parts.push(keyPart);
        var combo = parts.join('+');

        // Alt+Tab (and Ctrl+Tab fallback): cycle focused app window
        if ((e.altKey && e.key === 'Tab') || (e.ctrlKey && !e.altKey && e.key === 'Tab')) {
            e.preventDefault();
            cycleWindowFocus(!!e.shiftKey, e.altKey ? 'Alt' : 'Ctrl');
            return;
        }

        // Check user-defined shortcuts first
        if (data && data.shortcuts && data.shortcuts[combo]) {
            e.preventDefault();
            launchApp(data.shortcuts[combo]);
            return;
        }

        // Keyboard shortcuts: Brightness and Volume
        // Ctrl+Alt+ArrowUp / Ctrl+Alt+ArrowDown -> brightness +/-5
        if (e.ctrlKey && !e.shiftKey && e.altKey && (e.key === 'ArrowUp' || e.key === 'ArrowDown')) {
            e.preventDefault();
            var delta = e.key === 'ArrowUp' ? 5 : -5;
            data.brightness = Math.min(100, Math.max(0, (parseInt(data.brightness) || 0) + delta));
            document.documentElement.style.filter = `brightness(${data.brightness}%)`;
            try {
                zmcdpost({ changeBrightness: true, brightness: data.brightness });
            } catch (err) {}
            try {
                notification(`Brightness: ${data.brightness}%`);
            } catch (e) {}
            return;
        }

        // Ctrl+Shift+ArrowUp / Ctrl+Shift+ArrowDown -> volume +/-5
        if (e.ctrlKey && e.shiftKey && (e.key === 'ArrowUp' || e.key === 'ArrowDown')) {
            e.preventDefault();
            var delta = e.key === 'ArrowUp' ? 5 : -5;
            data.volume = Math.min(100, Math.max(0, (parseInt(data.volume) || 0) + delta));
            setAllMediaVolume(data.volume / 100);
            // inform other parts of UI
            window.dispatchEvent(new CustomEvent('system-volume', { detail: data.volume }));
            try {
                zmcdpost({ changeVolume: true, volume: data.volume });
            } catch (err) {}
            try {
                notification(`Volume: ${data.volume}%`);
            } catch (e) {}
            return;
        }

        // Default: Ctrl+N -> open new instance of focused app or a sensible default
        if (e.ctrlKey && keyPart === 'N') {
            e.preventDefault();
            var focusedApp = atTop || '';
            if (focusedApp && typeof launchApp === 'function') {
                // attempt to open another instance of focused app
                launchApp(focusedApp);
                return;
            }
            // fallback: first taskbutton or first discovered app
            var fallback =
                (data.taskbuttons && data.taskbuttons[0]) ||
                (window.apps && window.apps[0] && getPreferredAppIdentifier(window.apps[0]));
            if (fallback) launchApp(fallback);
            return;
        } else if (e.ctrlKey && e.shiftKey && keyPart === 'W') {
            // Close only the topmost app window for the focused app (atTop)
            e.preventDefault();
            e.stopPropagation();
            if (!atTop) return;
            try {
                var targetAppId = String(atTop || '').trim();
                if (!targetAppId) return;

                var roots = Array.from(document.querySelectorAll('.app-root'));
                var candidates = roots.filter((root) => root.dataset && root.dataset.appId === targetAppId);

                // Fallback for older windows not tagged with dataset app id
                if (!candidates.length) {
                    candidates = roots.filter((root) => root.classList && root.classList.contains(targetAppId));
                }

                if (!candidates.length) return;

                candidates.sort((a, b) => {
                    var za = parseInt(a.style.zIndex) || 0;
                    var zb = parseInt(b.style.zIndex) || 0;
                    return za - zb;
                });

                var top = candidates[candidates.length - 1];
                if (top) {
                    top.remove();
                    removeAllEventListenersForApp(targetAppId + top._goldenbodyId);
                }
            } catch (e) {
                console.error('close focused app window error', e);
            }
            return;
        }
    };
    window.addEventListener('keydown', window._flowaway_handlers.onKeydown);

    if (window._flowaway_handlers.onKeyup) window.removeEventListener('keyup', window._flowaway_handlers.onKeyup);
    window._flowaway_handlers.onKeyup = function (e) {
        if (e.key === 'Alt' || e.key === 'Control') {
            commitWindowSwitchTarget();
            resetWindowSwitchState();
        }
    };
    window.addEventListener('keyup', window._flowaway_handlers.onKeyup);

    if (window._flowaway_handlers.onBlur) window.removeEventListener('blur', window._flowaway_handlers.onBlur);
    window._flowaway_handlers.onBlur = function () {
        resetWindowSwitchState();
    };
    window.addEventListener('blur', window._flowaway_handlers.onBlur);

    if (window._flowaway_handlers.onVisibilityChange)
        document.removeEventListener('visibilitychange', window._flowaway_handlers.onVisibilityChange);
    window._flowaway_handlers.onVisibilityChange = function () {
        if (document.hidden) resetWindowSwitchState();
    };
    document.addEventListener('visibilitychange', window._flowaway_handlers.onVisibilityChange);
} catch (e) {}

function applyStyles() {
    try {
        var roots = document.querySelectorAll('.app-root');
        for (const r of roots) {
            r.classList.toggle('dark', data.dark);
            r.classList.toggle('light', !data.dark);
            try {
                r.dispatchEvent(new CustomEvent('styleapplied', {}));
            } catch (e) {}
        }
    } catch (e) {}

    // if(data.dark) {
    //   document.body.style.background = "#444";
    //   document.body.style.color = "white";
    // } else {
    //   document.body.style.background = "white";
    //   document.body.style.color = "black";
    // }
    startMenu.classList.toggle('dark', data.dark);
    startMenu.classList.toggle('light', !data.dark);
    taskbar.classList.toggle('dark', data.dark);
    taskbar.classList.toggle('light', !data.dark);
    for (var button of taskbuttons) {
        button.classList.toggle('dark', data.dark);
        button.classList.toggle('light', !data.dark);
    }
}
setTimeout(() => {
    applyStyles();
}, 100);

// Ensure apps are loaded shortly after startup (safe-guard if tree already present)
setTimeout(() => {
    try {
        loadAppsFromTree();
    } catch (e) {}
}, 200);
function mainRecurseFrames(doc) {
    if (!doc) return null;

    var frames = doc.querySelectorAll('iframe');

    for (const frame of frames) {
        const childDoc = frame.contentDocument;
        function setAllMediaVolume(newVolume) {
            // Ensure the volume is between 0.0 and 1.0
            newVolume = Math.min(Math.max(newVolume, 0.0), 1.0);

            // Select all audio and video elements
            var mediaElements = [];
            try {
                mediaElements = childDoc.querySelectorAll('audio, video');
            } catch (e) {}

            mediaElements.forEach((element) => {
                element.volume = newVolume;
            });
        }
        setAllMediaVolume(data.volume / 100);
        // Recurse into child document if accessible
        if (childDoc) {
            mainRecurseFrames(childDoc);
        }
    }

    return null;
}

document.documentElement.style.filter = `brightness(${data.brightness}%)`;
function setAllMediaVolume(newVolume) {
    // Ensure the volume is between 0.0 and 1.0
    newVolume = Math.min(Math.max(newVolume, 0.0), 1.0);

    // Select all audio and video elements
    var mediaElements = document.querySelectorAll('audio, video');

    mediaElements.forEach((element) => {
        element.volume = newVolume;
    });
}
try {
    if (window._flowaway_handlers.onSystemVolume)
        window.removeEventListener('system-volume', window._flowaway_handlers.onSystemVolume);
    window._flowaway_handlers.onSystemVolume = (e) => {
        setAllMediaVolume(e.detail / 100);
    };
    window.addEventListener('system-volume', window._flowaway_handlers.onSystemVolume);
} catch (e) {}
// 1. Create a new MutationObserver instance with a callback function
var observer = new MutationObserver((mutationsList, observer) => {
    if (mutationsList) {
        setAllMediaVolume(data.volume / 100);
        mainRecurseFrames(document);
        document.documentElement.style.filter = `brightness(${data.brightness}%)`;
    }
});

// 2. Select the target node you want to observe (e.g., the entire document body)
var targetNode = document.body;

// 3. Configure the observer with an options object
var config = {
    childList: true, // Observe direct children addition/removal
    attributes: true, // Observe attribute changes
    characterData: true, // Observe changes to text content
    subtree: true, // Observe changes in the entire subtree (children, grandchildren, etc.)
    attributeOldValue: true, // Record the old value of the attribute
    characterDataOldValue: true // Record the old value of the character data
};

// 4. Start observing the target node with the specified configuration
try {
    if (window._flowaway_handlers.observer) {
        try {
            window._flowaway_handlers.observer.disconnect();
        } catch (e) {}
    }
    window._flowaway_handlers.observer = observer;
    observer.observe(targetNode, config);
} catch (e) {
    try {
        observer.observe(targetNode, config);
    } catch (ee) {}
}

// To stop observing later:
// observer.disconnect();

setAllMediaVolume(parseInt(data.volume) / 100);
// helpers global
function getStringAfterChar(str, char) {
    var index = str.indexOf(char);
    if (index !== -1) {
        // Add 1 to the index to start after the character itself
        return str.substring(index + 1);
    } else {
        // Return the original string or handle the case where the character is not found
        return str;
    }
}

// Global notification helper: call notification("message") to show a temporary toast for 3s
function notification(message, options = {}) {
    try {
        if (!message && message !== 0) return;
        // Ensure a container exists
        var container = document.getElementById('global-notifications');
        if (!container) {
            container = document.createElement('div');
            container.id = 'global-notifications';
            Object.assign(container.style, {
                position: 'fixed',
                right: '20px',
                bottom: '20px',
                display: 'flex',
                flexDirection: 'column',
                gap: '8px',
                zIndex: 9999999,
                pointerEvents: 'none'
            });
            document.body.appendChild(container);
        }

        var toast = document.createElement('div');
        toast.textContent = String(message);
        Object.assign(toast.style, {
            background: 'rgba(0,0,0,0.8)',
            color: 'white',
            padding: '8px 12px',
            borderRadius: '8px',
            maxWidth: '320px',
            boxShadow: '0 6px 20px rgba(0,0,0,0.3)',
            opacity: '0',
            transform: 'translateY(6px)',
            transition: 'opacity 220ms ease, transform 220ms ease',
            pointerEvents: 'auto',
            fontSize: '13px',
            lineHeight: '1.2'
        });

        container.appendChild(toast);

        // Force layout then animate in
        requestAnimationFrame(() => {
            toast.style.opacity = '1';
            toast.style.transform = 'translateY(0)';
        });

        // Remove after 3s
        var dismissMs = options.dismissMs || 3000;
        setTimeout(() => {
            toast.style.opacity = '0';
            toast.style.transform = 'translateY(6px)';
            setTimeout(() => {
                try {
                    toast.remove();
                } catch (e) {}
                // remove container if empty
                if (container && container.children.length === 0) {
                    try {
                        container.remove();
                    } catch (e) {}
                }
            }, 260);
        }, dismissMs);
        return toast;
    } catch (e) {
        console.error('notify error', e);
    }
}
var style = document.createElement('style');
style.textContent = `

/* =========================================================
   🌞 LIGHT THEME (default)
========================================================= */
.app-root * {
  /* box-sizing: border-box; */
  font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial;
}
 .sim-url-input { flex:1; height:32px; border-radius:6px; border:1px solid rgba(0,0,0,0.12); padding:0 10px; font-size:14px; }
.sim-chrome-top {
  background: linear-gradient(#f6f7f8,#ededf0);
  height: 44px;
  display:flex;
  align-items:center;
  padding:0 8px;
  gap:8px;
}

.sim-chrome-tabs {
  display:flex;
  gap:2px;
  align-items:center;
  height:32px;
  scrollbar-width:none;
}
.sim-chrome-tabs::-webkit-scrollbar { display:none; }

.sim-tab {
  display:flex;
  align-items:center;
  gap:8px;
  padding:6px 10px;
  border-radius:6px;
  cursor:pointer;
  user-select:none;
  font-size:13px;
  color:#333;
  max-width:200px;
  min-width:185px;
  overflow:hidden;
  white-space:nowrap;
  text-overflow:ellipsis;
}

.sim-tab.active {
  background: rgba(0,0,0,0.06);
  box-shadow: inset 0 -1px 0 rgba(0,0,0,0.04);
}

.sim-tab .close {
  font-weight:700;
  color:#777;
  cursor:pointer;
  margin-left:auto;
}

.sim-address-row {
  display:flex;
  align-items:center;
  gap:8px;
  flex:1;
  margin: 0 8px;
}

.sim-open-btn,
.sim-fullscreen-btn,
.sim-netab-btn {
  height:28px;
  padding:0 12px;
  border-radius:12px;
  border:1px solid rgba(0,0,0,0.12);
  background:#fff;
  cursor:pointer;
  font-size:13px;
}

.sim-toolbar {
  display:flex;
  align-items:center;
  gap:8px;
  padding:8px;
  background:#fff;
  border-top:1px solid rgba(0,0,0,0.06);
}

.sim-iframe {
  width:100%;
  height:calc(100% - 84px);
  border:0;
  background:#fff;
}

.sim-status {
  font-size:12px;
  color:#666;
  margin-left:8px;
}

.appTopBar {
  background: #ccc
}

.panel {}







/* =========================================================
   ☀️ LIGHT THEME
========================================================= */

.panel.light {
  background: #ededf0;
  color: black;
}
.app-root.light {
  background: #eee;
  color: #222;
}

.app-root.light .sim-chrome-top {
  background: linear-gradient(#f6f7f8, #ededf0);
}

.app-root.light .sim-chrome-tabs {
  background: transparent;
}

.app-root.light .sim-tab {
  color: #333;
}

.app-root.light .sim-tab.active {
  background: rgba(0,0,0,0.06);
  box-shadow: inset 0 -1px 0 rgba(0,0,0,0.04);
}

.app-root.light .sim-tab .close {
  color: #777;
}

/* Address row */
.app-root.light .sim-address-row {
  background: transparent;
  margin: 0 8px;
}

/* URL / proxy inputs */
.app-root.light .sim-url-input,
.app-root.light .sim-proxy-input {
  background: #fff;
  color: #222;
  border: 1px solid rgba(0,0,0,0.12);
}

/* Buttons */
.app-root.light .sim-open-btn,
.app-root.light .sim-fullscreen-btn,
.app-root.light .sim-netab-btn {
  background: #fff;
  color: #222;
  border: 1px solid rgba(0,0,0,0.12);
}

/* Toolbar */
.app-root.light .sim-toolbar {
  background: #fff;
  border-top: 1px solid rgba(0,0,0,0.06);
}

/* Iframe area */
.app-root.light .sim-iframe {
  background: #fff;
}

/* Status text */
.app-root.light .sim-status {
  color: #666;
}

/* Top draggable bar */
.app-root.light .appTopBar {
  background: #ccc;
}

/* Window control buttons */
.app-root.light .btnMaxColor,
.app-root.light .btnMinColor {
  background: white;
  color: #000;
}

.app-root.light .misc {
  background: white;
  color: black;
}

.app-root.light .misc2 {
  background: black;
  color: #eee;
}

.app-menu.light {
  background: white;
  color: black;
}

/* =========================================================
   🌙 DARK THEME
========================================================= */
.panel.dark {
  background: #444;
  color: #fff;
}
.app-root.dark .sim-address-row {
  background: #222; margin: 0 8px;
}

/* Iframe background */
.app-root.dark .sim-iframe {
  background: #111; /* deep dark, matches content area */
}
.app-root.dark {
  background:#1e1e1e;
  color:#ddd;
}

.app-root.dark .sim-chrome-top {
  background: linear-gradient(#2a2a2a,#1f1f1f);
}

.app-root.dark .sim-tab {
  color:#ddd;
}

.app-root.dark .sim-tab.active {
  background: rgba(255,255,255,0.08);
}

.app-root.dark .sim-tab .close {
  color:rgba(251, 248, 248, 1);
}
  .app-root.dark .sim-url-input { flex:1; height:32px; background-color: "black"; border-radius:6px; border:1px solid rgba(0,0,0,0.12); padding:0 10px; font-size:14px; }
.app-root.dark .sim-url-input,
.app-root.dark .sim-proxy-input {
  background:#2a2a2a;
  color:#eee;
  border:1px solid rgba(255,255,255,0.15);
}

.app-root.dark .sim-open-btn,
.app-root.dark .sim-fullscreen-btn,
.app-root.dark .sim-netab-btn {
  background:#2a2a2a;
  color:#eee;
  border:1px solid rgba(255,255,255,0.15);
}

.app-root.dark .sim-toolbar {
  background:#1e1e1e;
  border-top:1px solid rgba(255,255,255,0.08);
}

.app-root.dark .sim-iframe {
  background:#111;
}

.app-root.dark .sim-status {
  color:#aaa;
}

.app-root.dark .app-menu {
  color: black;
}

.app-root.dark .btnMaxColor {
  color: white;
  background: black;
}

.app-root.dark .btnMinColor {
  color: white;
  background: black;
}

.app-root.dark .appTopBar {
  background: #444;
}

.app-root.dark .misc {
  background: black;
  color: white;
}

.app-root.dark .misc2 {
  background: #444;
  color: white;
}

.app-menu.dark {
  background: black;
  color: white;
}

/* =========================================================
   📱 Responsive
========================================================= */
@media (max-width: 600px) {
  .app-root {
    left:6px;
    right:6px;
    width:auto;
    height:480px;
  }
}










/* taskbar/system */
.taskbar {}
.taskbutton{}
.taskbar.light {
  background: lightgray;
  color: black;
}
.taskbutton.dark {
  background: #444;
  color: white;
}

.taskbutton.light {
  background: white;
  color: black;
}
.taskbar.dark {
  background: #222;
  color: white;
}


`;

document.head.appendChild(style);
var css = `

    .startMenu {
        position: fixed;
        bottom: 60px;
        left: 10px;
        width: 400px;
        height: 500px;
        border-radius: 6px;
        padding: 10px;
        overflow: hidden;
        display: none;
    }

    .startMenuBody {
      position: absolute;
      top: 88px;
      left: 10px;
      right: 10px;
      bottom: 74px;
      overflow-y: auto;
      -ms-overflow-style: none;
      scrollbar-width: none;
    }

    .startMenuBody::-webkit-scrollbar {
      display: none;
      width: 0;
      height: 0;
    }

    .startMenu h3 {
        margin-top: 0;
    }

    .apps {
        display: flex;
        flex-direction: column;
    }

    .app {
        padding: 8px;
        margin: 4px 0;
        border-radius: 4px;
        cursor: pointer;
        transition: 0.2s;
    }

    /* dark */
    .startMenu.dark {
       background: #1f1f1f;
       color: white;
    }
    .startMenu.dark .app {
      background: #333;
    }
    
    /* light */
    .startMenu.light {
       background: lightgray;
       color: black;
    }
    .startMenu.light .app {
      background: #f8f4f4ff;
    }

  .statusBar {
  position: absolute;
  /* position at the bottom of the start menu */
  bottom: 8px;
  left: 8px;
  right: 8px;

  display: flex;
  justify-content: space-between;
  align-items: center;

  font-size: 15px;
  padding: 10px 12px;
  border-radius: 6px;
  min-height: 42px;
}

#appsGrid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 8px;
}

.statusLeft,
.statusRight {
    display: flex;
    align-items: center;
    gap: 10px;
}

.statusRight span {
  font-size: 16px;
  font-weight: 600;
}

#signOutBtn {
  padding: 8px 12px;
  border-radius: 8px;
  border: none;
  cursor: pointer;
  background: #e53e3e;
  color: white;
  font-weight: 600;
}

.startMenu.dark .statusBar {
    background: #2a2a2a;
}

.startMenu.light .statusBar {
    background: #e6e6e6;
}

/* Start Menu Tabs */
.startMenuTabs {
  display: flex;
  gap: 4px;
  margin-bottom: 12px;
  border-bottom: 2px solid rgba(255,255,255,0.1);
}

.startMenuTab {
  padding: 8px 12px;
  border: none;
  background: transparent;
  color: inherit;
  cursor: pointer;
  border-bottom: 3px solid transparent;
  transition: 0.2s;
  font-weight: 500;
  font-size: 13px;
}

.startMenuTab.active {
  border-bottom-color: #4A90E2;
  color: #4A90E2;
}

.startMenu.dark .startMenuTab:hover {
  background: #333;
}

.startMenu.light .startMenuTab:hover {
  background: #f0f0f0;
}

/* Tab Content Sections */
.tabSection {
  display: none;
}

.tabSection.active {
  display: block;
}

/* App Grid Improvements */
.tabSection.active.grid-view {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 8px;
  align-content: start;
}

.tabSection.active.list-view {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.tabSection.list-view .app {
  padding: 10px;
  display: flex;
  align-items: center;
  gap: 8px;
}

.tabSection.grid-view .app {
  margin: 0;
  min-width: 0;
}

/* Dragging feedback */
.app {
  user-select: none;
}

.app.dragging {
  opacity: 0.5;
  background: rgba(255,255,255,0.2) !important;
}

.app.drag-over {
  border: 2px dashed #4A90E2;
  background: rgba(74, 144, 226, 0.1) !important;
}

.app:hover {
  transform: scale(1.05);
  box-shadow: 0 4px 12px rgba(0,0,0,0.3);
}

/* Context Menu */
.app-context-menu {
  position: fixed;
  z-index: 9999;
  background: #2a2a2a;
  color: white;
  border-radius: 6px;
  box-shadow: 0 4px 16px rgba(0,0,0,0.5);
  min-width: 180px;
}

.startMenu.light .app-context-menu {
  background: #f5f5f5;
  color: black;
  box-shadow: 0 4px 16px rgba(0,0,0,0.2);
}

.context-menu-item {
  padding: 10px 12px;
  cursor: pointer;
  border: none;
  background: transparent;
  color: inherit;
  width: 100%;
  text-align: left;
  font-size: 13px;
  transition: 0.1s;
}

.context-menu-item:hover {
  background: rgba(74, 144, 226, 0.2);
}

.context-menu-item.danger:hover {
  background: rgba(229, 62, 62, 0.2);
  color: #e53e3e;
}

.startMenu.light .context-menu-item:hover {
  background: rgba(74, 144, 226, 0.1);
}

`;
var styleTag = document.createElement('style');
styleTag.textContent = css;
document.head.appendChild(styleTag);

// ----------------- CREATE START BUTTON -----------------

// ============= START MENU CONFIG SYSTEM =============
window._startMenuConfig = null;

async function loadStartMenuConfig() {
    try {
        const configPath = 'startmenuAppConfig/startMenu-config.json';
        const configData = await fetchFileContentByPath(configPath);
        const configText = base64ToUtf8(configData);
        window._startMenuConfig = JSON.parse(configText);
        return window._startMenuConfig;
    } catch (e) {
        flowawayError('startMenu', 'Failed to load config, using defaults', e);
        window._startMenuConfig = {
            version: '1.0',
            pinnedApps: [],
            hiddenApps: [],
            appOrder: [],
            recents: [],
            maxRecents: 5,
            displayMode: 'grid',
            gridColumns: 4
        };
        return window._startMenuConfig;
    }
}

async function saveStartMenuConfig() {
    try {
        if (!window._startMenuConfig) return;
        const configJson = JSON.stringify(window._startMenuConfig, null, 2);
        await filePost({
            action: 'saveStartMenuConfig',
            configJson: configJson
        });
    } catch (e) {
        flowawayError('startMenu', 'Failed to save config', e);
    }
}

function addToRecents(appId) {
    if (!window._startMenuConfig) return;
    const recents = window._startMenuConfig.recents || [];
    const index = recents.indexOf(appId);
    if (index > -1) recents.splice(index, 1);
    recents.unshift(appId);
    if (recents.length > (window._startMenuConfig.maxRecents || 5)) {
        recents.pop();
    }
    window._startMenuConfig.recents = recents;
    saveStartMenuConfig();
}

function removeFromStartMenu(appId) {
    if (!window._startMenuConfig) return;
    const pinnedApps = window._startMenuConfig.pinnedApps || [];
    const index = pinnedApps.indexOf(appId);
    if (index > -1) {
        pinnedApps.splice(index, 1);
        window._startMenuConfig.pinnedApps = pinnedApps;
        saveStartMenuConfig();
        renderPinnedAppsGrid();
    }
}

// ============= CREATE START MENU -================
try {
    var existingStartMenu = document.getElementById('startMenu');
    if (existingStartMenu) existingStartMenu.remove();
} catch (e) {}
var startMenu = document.createElement('div');
startMenu.id = 'startMenu';
startMenu.className = 'startMenu';
startMenu.style.zIndex = 999;
startMenu.innerHTML = `

<h3 style="margin:0 0 10px 0; font-size:18px;">Start</h3>

<div class="startMenuTabs">
  <button class="startMenuTab active" data-tab="pinned">Pinned</button>
  <button class="startMenuTab" data-tab="recents">Recent</button>
  <button class="startMenuTab" data-tab="all">All Apps</button>
</div>

<div class="startMenuBody">
    <div id="appsGrid" class="tabSection active grid-view" data-tab="pinned"></div>
    <div id="recentsGrid" class="tabSection grid-view" data-tab="recents"></div>
    <div id="allAppsGrid" class="tabSection grid-view" data-tab="all"></div>
</div>

    <div class="statusBar">
    <div class="statusLeft">
        <span id="wifiStatus">📶</span>
        <button id="signOutBtn" style="margin-left:8px;padding:6px 8px;border-radius:6px;border:none;background:#e53e3e;color:white;font-weight:600;">Sign Out</button>
    </div>

    <div class="statusRight">
      <span id="batteryStatus">🔋 --%</span>
      <span id="timeStatus">--:--</span>
    </div>
</div>
`;

document.body.appendChild(startMenu);

// Load config on startup
(async () => {
    await loadStartMenuConfig();
    await loadAppsFromTree();
})();

// ============= TAB SWITCHING =============
window.tabButtons = startMenu.querySelectorAll('.startMenuTab');
window.tabSections = startMenu.querySelectorAll('.tabSection');

function switchTab(tabName) {
    if (!tabName) return;
    try {
        document.querySelectorAll('.app-context-menu, .app-menu').forEach(function (menuNode) {
            try {
                menuNode.remove();
            } catch (e) {}
        });
    } catch (e) {}
    // Hide all sections
    tabSections.forEach(function (section) {
        section.classList.remove('active');
        section.style.display = 'none';
    });
    // Deactivate all tabs
    tabButtons.forEach(function (btn) {
        btn.classList.remove('active');
    });

    // Show selected section
    var section = startMenu.querySelector(`.tabSection[data-tab="${tabName}"]`);
    if (section) {
        section.classList.add('active');
        section.style.display = section.classList.contains('list-view') ? 'flex' : 'grid';
    }

    // Activate selected tab
    var btn = startMenu.querySelector(`.startMenuTab[data-tab="${tabName}"]`);
    if (btn) btn.classList.add('active');

    // Render appropriate grid
    if (tabName === 'pinned') renderPinnedAppsGrid();
    else if (tabName === 'recents') renderRecentsGrid();
    else if (tabName === 'all') renderAllAppsGrid();
}

tabButtons.forEach((btn) => {
    btn.addEventListener('click', function (e) {
        e.preventDefault();
        e.stopPropagation();
        switchTab(this.dataset && this.dataset.tab);
    });
});

// ============= RENDER FUNCTIONS =============
async function renderPinnedAppsGrid() {
    const container = document.getElementById('appsGrid');
    if (!container) return;
    container.innerHTML = '';

    if (!window._startMenuConfig || !window.apps) return;

    const pinnedApps = window._startMenuConfig.pinnedApps || [];
    const appsMap = new Map(window.apps.map((app) => [getPreferredAppIdentifier(app), app]));

    for (const appId of pinnedApps) {
        const app = appsMap.get(appId);
        if (!app || !app.icon) continue;
        createAppTile(app, container, true);
    }
}

async function renderRecentsGrid() {
    const container = document.getElementById('recentsGrid');
    if (!container) return;
    container.innerHTML = '';

    if (!window._startMenuConfig || !window.apps) return;

    const recents = window._startMenuConfig.recents || [];
    const appsMap = new Map(window.apps.map((app) => [getPreferredAppIdentifier(app), app]));

    for (const appId of recents) {
        const app = appsMap.get(appId);
        if (!app || !app.icon) continue;
        createAppTile(app, container, false);
    }

    if (container.children.length === 0) {
        container.innerHTML = '<p style="text-align:center;opacity:0.6;font-size:13px;">No recent apps</p>';
    }
}

async function renderAllAppsGrid() {
    const container = document.getElementById('allAppsGrid');
    if (!container) return;
    container.innerHTML = '';

    if (!window.apps) return;

    for (const app of window.apps) {
        if (!app.icon) continue;
        createAppTile(app, container, false);
    }
}

function createAppTile(app, container, draggable) {
    const div = document.createElement('div');
    div.className = 'app';
    div.dataset.appId = getPreferredAppIdentifier(app);
    div.id = (app.startbtnid || app.id) + 'app';
    div.style.padding = '10px';
    div.style.borderRadius = '6px';
    div.style.textAlign = 'center';
    div.style.cursor = 'pointer';
    if (draggable) {
        div.draggable = true;
    }
    div.innerHTML = `${app.icon}<br><span style="font-size:11px;">${app.label}</span>`;

    // Drag events for reordering pinned apps
    if (draggable) {
        div.addEventListener('dragstart', (e) => {
            div.classList.add('dragging');
            e.dataTransfer.effectAllowed = 'move';
            e.dataTransfer.setData('appId', div.dataset.appId);
        });

        div.addEventListener('dragend', () => {
            div.classList.remove('dragging');
            document.querySelectorAll('.app.drag-over').forEach((el) => el.classList.remove('drag-over'));
        });

        div.addEventListener('dragover', (e) => {
            e.preventDefault();
            e.dataTransfer.dropEffect = 'move';
            div.classList.add('drag-over');
        });

        div.addEventListener('dragleave', () => {
            div.classList.remove('drag-over');
        });

        div.addEventListener('drop', async (e) => {
            e.preventDefault();
            div.classList.remove('drag-over');
            const appId = e.dataTransfer.getData('appId');
            const pinnedApps = window._startMenuConfig.pinnedApps || [];
            const fromIndex = pinnedApps.indexOf(appId);
            const toIndex = pinnedApps.indexOf(div.dataset.appId);
            if (fromIndex > -1 && toIndex > -1 && fromIndex !== toIndex) {
                pinnedApps.splice(fromIndex, 1);
                pinnedApps.splice(toIndex, 0, appId);
                window._startMenuConfig.pinnedApps = pinnedApps;
                await saveStartMenuConfig();
                renderPinnedAppsGrid();
            }
        });
    }

    function runAppPackageContextMenu(evt) {
        try {
            if (typeof window.cmfl1 === 'function') {
                window.cmfl1(evt, app);
            }
        } catch (err) {
            flowawayError('createAppTile', 'Failed to run app package context menu', err, {
                appId: app && app.id
            });
        }
    }

    // Context menu
    div.addEventListener('contextmenu', (e) => {
        e.preventDefault();
        runAppPackageContextMenu(e);
        showAppContextMenu(e.clientX, e.clientY, app, draggable);
    });

    // Click to launch
    div.addEventListener('click', () => {
        addToRecents(div.dataset.appId);
        launchApp(div.dataset.appId);
        startMenu.style.display = 'none';
    });

    container.appendChild(div);
}

function showAppContextMenu(x, y, app, canPin) {
    // Remove existing menu
    const existing = document.querySelector('.app-context-menu');
    if (existing) existing.remove();

    const menu = document.createElement('div');
    menu.className = 'app-context-menu';
    menu.style.left = x + 'px';
    menu.style.top = y + 'px';

    const appId = getPreferredAppIdentifier(app);
    const pinnedApps = window._startMenuConfig.pinnedApps || [];
    const isPinned = pinnedApps.includes(appId);

    let html = '';

    if (!canPin && !isPinned) {
        html += `<button class="context-menu-item" data-action="pin">📌 Pin to Start Menu</button>`;
    } else if (!canPin && isPinned) {
        html += `<button class="context-menu-item danger" data-action="unpin">📌 Unpin from Start Menu</button>`;
    }

    if (canPin) {
        html += `<button class="context-menu-item danger" data-action="remove">❌ Remove from Start Menu</button>`;
    }

    menu.innerHTML = html;
    document.body.appendChild(menu);

    // Attach handlers
    menu.querySelectorAll('.context-menu-item').forEach((item) => {
        item.addEventListener('click', async () => {
            const action = item.dataset.action;
            if (action === 'pin') {
                pinnedApps.push(appId);
                window._startMenuConfig.pinnedApps = pinnedApps;
                await saveStartMenuConfig();
                switchTab('pinned');
            } else if (action === 'unpin' || action === 'remove') {
                removeFromStartMenu(appId);
            }
            menu.remove();
        });
    });

    // Close on outside click
    setTimeout(() => {
        const closeHandler = (e) => {
            if (!menu.contains(e.target)) {
                menu.remove();
                document.removeEventListener('click', closeHandler);
            }
        };
        document.addEventListener('click', closeHandler);
    }, 0);
}

// Wire up sign out button (now inside the statusRight area) to call rebuildhandler
try {
    var sb = document.getElementById('signOutBtn');
    if (sb) {
        if (window._flowaway_handlers.onSignOut) sb.removeEventListener('click', window._flowaway_handlers.onSignOut);
        window._flowaway_handlers.onSignOut = () => {
            try {
                rebuildhandler();
            } catch (e) {
                console.error('rebuildhandler error', e);
            }
        };
        sb.addEventListener('click', window._flowaway_handlers.onSignOut);
    }
} catch (e) {
    console.error('signOut hookup error', e);
}

// -------- TIME --------
function updateTime() {
    var now = new Date();
    var time = now.toLocaleTimeString([], {
        hour: '2-digit',
        minute: '2-digit'
    });
    document.getElementById('timeStatus').textContent = time;
}

updateTime();
try {
    if (window._flowaway_handlers.timeIntervalId) clearInterval(window._flowaway_handlers.timeIntervalId);
    window._flowaway_handlers.timeIntervalId = setInterval(updateTime, 1000);
} catch (e) {
    window._flowaway_handlers.timeIntervalId = setInterval(updateTime, 1000);
}

// -------- BATTERY --------
if (navigator.getBattery) {
    navigator.getBattery().then((battery) => {
        function updateBattery() {
            var level = Math.round(battery.level * 100);
            var charging = battery.charging ? '⚡' : '';
            document.getElementById('batteryStatus').textContent = `🔋 ${level}% ${charging}`;
        }

        updateBattery();
        try {
            if (window._flowaway_handlers.battery && window._flowaway_handlers.battery.ref) {
                try {
                    window._flowaway_handlers.battery.ref.removeEventListener(
                        'levelchange',
                        window._flowaway_handlers.battery.levelHandler
                    );
                } catch (e) {}
                try {
                    window._flowaway_handlers.battery.ref.removeEventListener(
                        'chargingchange',
                        window._flowaway_handlers.battery.chargingHandler
                    );
                } catch (e) {}
            }
            window._flowaway_handlers.battery = {
                ref: battery,
                levelHandler: updateBattery,
                chargingHandler: updateBattery
            };
            battery.addEventListener('levelchange', window._flowaway_handlers.battery.levelHandler);
            battery.addEventListener('chargingchange', window._flowaway_handlers.battery.chargingHandler);
        } catch (e) {}
    });
} else {
    document.getElementById('batteryStatus').textContent = '🔋 N/A';
}
function updateWiFi() {
    var wifi = document.getElementById('wifiStatus');
    if (navigator.onLine) {
        wifi.textContent = '🛜';
        wifi.title = 'Online';
    } else {
        wifi.textContent = '❌🛜';
        wifi.title = 'Offline';
    }
}

updateWiFi();
try {
    if (window._flowaway_handlers.onOnline) window.removeEventListener('online', window._flowaway_handlers.onOnline);
    if (window._flowaway_handlers.onOffline) window.removeEventListener('offline', window._flowaway_handlers.onOffline);
    window._flowaway_handlers.onOnline = updateWiFi;
    window._flowaway_handlers.onOffline = updateWiFi;
    window.addEventListener('online', window._flowaway_handlers.onOnline);
    window.addEventListener('offline', window._flowaway_handlers.onOffline);
} catch (e) {}

// ----------------- TOGGLE START MENU -----------------
var starthandler = () => {
    startMenu.style.display = startMenu.style.display === 'block' ? 'none' : 'block';
    // Auto-switch to pinned tab when opening
    if (startMenu.style.display === 'block') {
        switchTab('pinned');
    }
};

// Note: App launching is now handled by createAppTile click handler
// which includes addToRecents and closes the menu

// ----------------- CLOSE MENU ON OUTSIDE CLICK -----------------
try {
    if (window._flowaway_handlers.onDocumentClick)
        document.removeEventListener('click', window._flowaway_handlers.onDocumentClick);
    window._flowaway_handlers.onDocumentClick = (e) => {
        var contextMenuRoot =
            e.target && e.target.closest
                ? e.target.closest(
                      '.app-context-menu, .app-menu, #custom-context-menu, [id*="context-menu"], [class*="context-menu"], [class*="contextmenu"], .misc'
                  )
                : null;
        if (contextMenuRoot) {
            return;
        }
        if (!startMenu.contains(e.target) && e.target !== document.getElementById('▶')) {
            startMenu.style.display = 'none';
        }
    };
    document.addEventListener('click', window._flowaway_handlers.onDocumentClick);
} catch (e) {}

// Do not pre-load specific app scripts here; apps are loaded from the user's `apps/` folder dynamically.
// Only load system helper script.
window._flowawaySystemHelperState = {
    started: false,
    loaded: false,
    promise: null
};
async function loadSystemHelperScript() {
    var helperState =
        window._flowawaySystemHelperState ||
        (window._flowawaySystemHelperState = {
            started: false,
            loaded: false,
            promise: null
        });
    if (helperState.loaded) return true;
    if (helperState.promise) return helperState.promise;

    helperState.started = true;
    helperState.promise = (async () => {
        var loaded = false;

        try {
            const headers = { 'Content-Type': 'application/json' };
            if (window.data && window.data.authToken) headers['Authorization'] = 'Bearer ' + window.data.authToken;

            const res = await fetch(SERVER, {
                method: 'POST',
                headers,
                body: JSON.stringify({
                    username: (window.data && window.data.username) || (data && data.username) || '',
                    requestFile: true,
                    requestFileName: 'systemfiles/goldenbody.js'
                })
            });

            let body = null;
            try {
                body = await res.json();
            } catch (e) {
                body = null;
            }

            if (res.ok && body && typeof body.filecontent === 'string') {
                var sysScript = document.createElement('script');
                sysScript.type = 'text/javascript';
                sysScript.textContent = base64ToUtf8(body.filecontent);
                document.body.appendChild(sysScript);
                loaded = true;
            }
        } catch (e) {
            console.warn('failed to load user goldenbody.js from VFS', e);
        }

        if (!loaded) {
            var fallbackScript = document.createElement('script');
            fallbackScript.src = 'systemfiles/goldenbody.js';
            document.body.appendChild(fallbackScript);
            loaded = true;
        }

        helperState.loaded = loaded;
        helperState.started = loaded;
        return loaded;
    })().finally(() => {
        helperState.promise = null;
    });

    return helperState.promise;
}

setTimeout(() => {
    loadSystemHelperScript();
    setTimeout(() => {
        var appUpdatedEvent = new CustomEvent('appUpdated', { detail: null });
        window.dispatchEvent(appUpdatedEvent);
        setTimeout(() => {
            var appUpdatedEvent = new CustomEvent('appUpdated', { detail: null });
            window.dispatchEvent(appUpdatedEvent);
            setTimeout(() => {
                var appUpdatedEvent = new CustomEvent('appUpdated', { detail: null });
                window.dispatchEvent(appUpdatedEvent);
                setTimeout(() => {
                    var appUpdatedEvent = new CustomEvent('appUpdated', { detail: null });
                    window.dispatchEvent(appUpdatedEvent);
                }, 5000);
            }, 5000);
        }, 5000);
    }, 5000);
}, 100);
// user warnings here, you can remove this in your own build if you want
notification(
    'this is the Dev version of the system, please visit https://study.mathvariables.xyz/learn.html for the stable version...'
);

// ----------------- Convenience file helpers -----------------
// These wrap the existing `filePost` API so apps can easily perform
// common VFS actions. Responses are the raw server responses; use
// `base64ToArrayBuffer()` above to convert base64 payloads when needed.

window.ReadFile = async function (relPath) {
    if (!relPath) throw new Error('No path');
    return await filePost({
        requestFile: true,
        requestFileName: String(relPath)
    });
};

window.WriteFile = async function (relPath, contents, options = {}) {
    if (!relPath) throw new Error('No path');
    // Use the saveSnapshot + directions API to perform edits
    if (options.buffer) {
        contents = arrayBufferToBase64(contents);
    }
    const directions = [
        {
            edit: true,
            path: String(relPath),
            contents: String(contents || ''),
            replace: !!options.replace
        },
        { end: true }
    ];
    return await filePost({ saveSnapshot: true, directions });
};

window.DeleteFile = async function (relPath) {
    if (!relPath) throw new Error('No path');
    const directions = [{ delete: true, path: String(relPath) }, { end: true }];
    return await filePost({ saveSnapshot: true, directions });
};

window.RenameFile = async function (relPath, newName) {
    if (!relPath) throw new Error('No path');
    if (!newName) throw new Error('No new name');
    const directions = [{ rename: true, path: String(relPath), newName: String(newName) }, { end: true }];
    return await filePost({ saveSnapshot: true, directions });
};

// clipboardItems: array of { path: 'root/dir/file', isCut: true|false }
window.PasteFile = async function (destinationRelPath, clipboardItems) {
    if (!destinationRelPath) throw new Error('No destination path');
    if (!Array.isArray(clipboardItems) || !clipboardItems.length) throw new Error('No clipboard items');
    const directions = [
        { copy: true, directions: clipboardItems },
        { paste: true, path: String(destinationRelPath) },
        { end: true }
    ];
    return await filePost({ saveSnapshot: true, directions });
};
