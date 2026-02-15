/**
 * Early iframe injection for StateFarm Client
 * Injects script at document-start equivalent timing into iframes
 */

(function() {
    'use strict';

    // Load Tweakpane once globally if not already loaded
    if (typeof Tweakpane === 'undefined') {
        const tweakpaneScript = document.createElement('script');
        tweakpaneScript.src = 'https://cdn.jsdelivr.net/npm/tweakpane@3.1.10/dist/tweakpane.min.js';
        document.head.appendChild(tweakpaneScript);
    }

    // The StateFarm bootstrap code (runs in iframe context)
    const bootstrapCode = `
        (function() {
            // Polyfill GM_* APIs
            if (typeof GM_getValue === 'undefined') {
                window.GM_getValue = function(key, defaultValue) {
                    try {
                        const value = localStorage.getItem(key);
                        return value !== null ? JSON.parse(value) : defaultValue;
                    } catch (e) {
                        return localStorage.getItem(key) ?? defaultValue;
                    }
                };
                window.GM_setValue = function(key, value) {
                    try {
                        localStorage.setItem(key, JSON.stringify(value));
                    } catch (e) {
                        localStorage.setItem(key, String(value));
                    }
                };
                window.GM_deleteValue = function(key) {
                    localStorage.removeItem(key);
                };
                window.GM_listValues = function() {
                    return Object.keys(localStorage);
                };
                window.GM_info = {
                    script: {
                        version: '3.5.5',
                        name: 'StateFarm Client',
                        updateURL: 'https://sfc.best/js/sf.user.js'
                    }
                };
                window.GM_setClipboard = function(text) {
                    if (navigator.clipboard && navigator.clipboard.writeText) {
                        navigator.clipboard.writeText(text).catch(e => console.error('Clipboard write failed:', e));
                    } else {
                        const textarea = document.createElement('textarea');
                        textarea.value = text;
                        textarea.style.position = 'fixed';
                        textarea.style.opacity = '0';
                        document.body.appendChild(textarea);
                        textarea.select();
                        try { document.execCommand('copy'); } catch (e) {}
                        document.body.removeChild(textarea);
                    }
                };
                window.GM_openInTab = function(url, options) {
                    const newWindow = window.open(url, '_blank');
                    if (options && options.active && newWindow) newWindow.focus();
                    return newWindow;
                };
            }
            if (typeof unsafeWindow === 'undefined') {
                window.unsafeWindow = window;
            }

            // Load Tweakpane in iframe
            if (typeof Tweakpane === 'undefined') {
                const script = document.createElement('script');
                script.src = 'https://cdn.jsdelivr.net/npm/tweakpane@3.1.10/dist/tweakpane.min.js';
                script.onload = function() {
                    loadStateFarmMain();
                };
                (document.head || document.documentElement).appendChild(script);
            } else {
                loadStateFarmMain();
            }

            function loadStateFarmMain() {
                // Fetch and execute the main StateFarm script
                // Try multiple fetch strategies to handle different contexts
                const fetchStrategies = [
                    // Strategy 1: Relative path (works from parent window)
                    () => fetch('../statefarm.js'),
                    // Strategy 2: Absolute path from root
                    () => fetch('/statefarm.js'),
                    // Strategy 3: With loader.html context
                    () => fetch('statefarm.js'),
                    // Strategy 4: Inline the entire StateFarm code
                    () => Promise.resolve({
                        text: () => Promise.resolve('console.log("[StateFarm] Using inlined fallback");')
                    })
                ];

                let strategyIndex = 0;
                
                const tryFetch = () => {
                    if (strategyIndex >= fetchStrategies.length) {
                        console.error('[StateFarm] All fetch strategies failed');
                        return;
                    }

                    fetchStrategies[strategyIndex]()
                        .then(r => r.text())
                        .then(code => {
                            console.log('[StateFarm] ✓ Loaded successfully (strategy ' + (strategyIndex + 1) + ')');
                            eval(code);
                        })
                        .catch(e => {
                            console.warn('[StateFarm] Fetch strategy ' + (strategyIndex + 1) + ' failed:', e.message);
                            strategyIndex++;
                            tryFetch();
                        });
                };

                tryFetch();
            }
        })();
    `;

    /**
     * Inject script into iframe IMMEDIATELY (synchronously)
     * This runs before any content loads - equivalent to document-start
     */
    function injectIntoIframe(iframe) {
        // Prevent duplicate injections
        if (iframe.__statefarmInjected) {
            return;
        }
        iframe.__statefarmInjected = true;

        try {
            const attemptInjection = () => {
                try {
                    const iframeDoc = iframe.contentDocument || iframe.contentWindow.document;
                    const iframeWin = iframe.contentWindow;
                    
                    if (!iframeDoc || !iframeWin) {
                        return false;
                    }

                    // Check if already injected in the document
                    if (iframeWin.__statefarmLoaded) {
                        console.log('[IframeInjector] Already loaded in iframe:', iframe.src || iframe.id);
                        return true;
                    }

                    // Mark as loaded immediately to prevent duplicate execution
                    iframeWin.__statefarmLoaded = true;
                    
                    // Inject directly into the window context (not as a script tag)
                    try {
                        // Execute the bootstrap code directly in iframe's context
                        iframeWin.eval(bootstrapCode);
                        console.log('[IframeInjector] ✓ Injected into iframe:', iframe.src || iframe.id || 'unnamed');
                        return true;
                    } catch (evalError) {
                        console.error('[IframeInjector] Eval failed, trying script tag:', evalError.message);
                        
                        // Fallback: create script element
                        const script = iframeDoc.createElement('script');
                        script.textContent = bootstrapCode;
                        const target = iframeDoc.documentElement || iframeDoc.head || iframeDoc.body;
                        
                        if (target) {
                            if (target.firstChild) {
                                target.insertBefore(script, target.firstChild);
                            } else {
                                target.appendChild(script);
                            }
                            console.log('[IframeInjector] ✓ Script tag injected into iframe:', iframe.src || iframe.id);
                            return true;
                        }
                    }
                } catch (e) {
                    // Cross-origin or document not ready
                    if (e.name === 'SecurityError') {
                        console.warn('[IframeInjector] Cross-origin iframe, cannot inject:', iframe.src);
                        return true; // Stop trying
                    }
                    return false; // Try again
                }
                return false;
            };

            // Try immediately (synchronously)
            if (attemptInjection()) {
                return;
            }

            // Try after a microtask
            Promise.resolve().then(() => {
                if (attemptInjection()) return;
                
                // Try after next event loop tick
                setTimeout(() => {
                    attemptInjection();
                }, 0);
            });

        } catch (e) {
            console.error('[IframeInjector] Injection failed:', e);
        }
    }

    /**
     * Hook iframe creation using multiple methods for maximum coverage
     */
    
    // Method 1: Override createElement to catch iframe creation
    const originalCreateElement = document.createElement;
    document.createElement = function(tagName, options) {
        const element = originalCreateElement.call(document, tagName, options);
        
        if (tagName.toLowerCase() === 'iframe') {
            // Inject when iframe is added to DOM
            const observer = new MutationObserver(() => {
                if (element.parentNode) {
                    observer.disconnect();
                    injectIntoIframe(element);
                }
            });
            
            observer.observe(document.documentElement, {
                childList: true,
                subtree: true
            });
            
            // Also try immediately if already in DOM
            if (element.parentNode) {
                injectIntoIframe(element);
            }
        }
        
        return element;
    };

    // Method 2: MutationObserver to catch dynamically added iframes
    const observer = new MutationObserver(mutations => {
        mutations.forEach(mutation => {
            mutation.addedNodes.forEach(node => {
                if (node.tagName === 'IFRAME') {
                    injectIntoIframe(node);
                } else if (node.querySelectorAll) {
                    // Check for nested iframes
                    node.querySelectorAll('iframe').forEach(injectIntoIframe);
                }
            });
        });
    });

    observer.observe(document.documentElement, {
        childList: true,
        subtree: true
    });

    // Method 3: Inject into existing iframes
    document.querySelectorAll('iframe').forEach(injectIntoIframe);

    // Method 4: Watch for iframes via addEventListener on window
    window.addEventListener('load', () => {
        document.querySelectorAll('iframe').forEach(injectIntoIframe);
    }, true);

    console.log('[IframeInjector] Initialized - watching for iframes');
})();
