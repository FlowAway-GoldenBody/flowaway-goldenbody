var checkerinterval = null;
var patchinterval = null;
var patchwindowtimeout = null;
window.test = () =>{};
var stopIframePatchWatcher = () => {
  if (patchinterval) {
    clearInterval(patchinterval);
    patchinterval = null;
  }
  if (patchwindowtimeout) {
    clearTimeout(patchwindowtimeout);
    patchwindowtimeout = null;
  }
};
var startIframePatchWatcher = (durationMs = 2500) => {
  if (!patchinterval) {
    patchinterval = setInterval(() => {
      if (!iframe || !iframe.isConnected) {
        stopIframePatchWatcher();
        return;
      }
      try {
        iframePatches();
      } catch (e) {}
    }, 50);
  }
  if (patchwindowtimeout) clearTimeout(patchwindowtimeout);
  patchwindowtimeout = setTimeout(() => {
    stopIframePatchWatcher();
  }, durationMs);
};

var tryPatchNow = () => {
  try {
    iframePatches();
  } catch (e) {}
};

var ensurePatchedSoon = (durationMs = 2500) => {
  tryPatchNow();
  if (iframe.__gbPatchedDocument) return;
  startIframePatchWatcher(durationMs);
};

var attachNavigationArm = () => {
  try {
    const win = iframe.contentWindow;
    if (!win || win.__gbPatchArmAttached) return;
    win.__gbPatchArmAttached = true;
    win.addEventListener(
      "beforeunload",
      () => {
        iframe.__gbPatchedDocument = null;
        startIframePatchWatcher(5000);
      },
      { once: true },
    );
  } catch (e) {}
};

ensurePatchedSoon(3000);
attachNavigationArm();
iframe.addEventListener("load", () => {
  iframe.__gbPatchedDocument = null;
  ensurePatchedSoon(3000);
  attachNavigationArm();
});
iframe.addEventListener("pointerenter", () => {
  ensurePatchedSoon(1200);
});
iframe.addEventListener("focus", () => {
  ensurePatchedSoon(1200);
});
iframe.addEventListener(
  "contextmenu",
  () => {
    ensurePatchedSoon(1200);
  },
  true,
);
var stopPatchIntegrityChecker = () => {
  if (checkerinterval) {
    clearInterval(checkerinterval);
    checkerinterval = null;
  }
};

var startPatchIntegrityChecker = () => {
  if (checkerinterval) return;
  checkerinterval = setInterval(() => {
    if (!iframe || !iframe.isConnected) {
      stopPatchIntegrityChecker();
      return;
    }

    let currentDocument = null;
    let menuNode = null;
    let hasContextHandler = false;
    try {
      currentDocument =
        iframe?.contentDocument || iframe?.contentWindow?.document;
      menuNode = currentDocument?.getElementById("custom-context-menu");
      hasContextHandler = !!iframe.contentWindow?.__gbContextMenuHandler;
    } catch (e) {}

    const patchLooksAlive =
      !!currentDocument &&
      iframe.__gbPatchedDocument === currentDocument &&
      !!menuNode &&
      menuNode.isConnected &&
      hasContextHandler;

    if (patchLooksAlive) {
      try {
        recurseFrames(currentDocument);
      } catch (e) {}
      return;
    }

    iframe.__gbPatchedDocument = null;
    try {
      iframePatches();
    } catch (e) {}
  }, 1500);
};

async function iframePatches() {
  // Get the document inside the iframe
  const iframeDocument =
    iframe?.contentDocument || iframe?.contentWindow?.document;
  if (!iframeDocument || !iframe?.contentWindow) return;
  startPatchIntegrityChecker();
  if (iframe.__gbPatchedDocument === iframeDocument) return;
  const iframeWindow = iframe.contentWindow;
  let eggpatch2 = document.createElement("script");
  eggpatch2.textContent = `
              const nativeURL = window.URL;
              function URLShim(url = '', base) {
                let normalizedUrl = url == null ? '' : String(url);
                const hasBase = arguments.length > 1;

                if (hasBase) {
                  const normalizedBase = base == null ? '' : String(base);
                  return new nativeURL(normalizedUrl, normalizedBase || window.location.href);
                }
                else {
                normalizedUrl = window.location.href;
                }
                return new nativeURL(normalizedUrl || window.location.href);
              }

              Object.setPrototypeOf(URLShim, nativeURL);
              URLShim.prototype = nativeURL.prototype;
              window.URL = URLShim;
          `;
  iframe.contentDocument.body.appendChild(eggpatch2);
  if (iframeWindow.__gbBrowserShortcutHandler) {
    iframeWindow.removeEventListener(
      "keydown",
      iframeWindow.__gbBrowserShortcutHandler,
    );
  }
  iframeWindow.__gbBrowserShortcutHandler = function (e) {
    if (runBrowserCtrlShortcut(e)) {
      root.focus();
      return;
    }

    var switcherMode =
      (window.windowSwitchState &&
        window.windowSwitchState.active &&
        window.windowSwitchState.mod) ||
      "";
    var wantsCycle =
      (e.altKey && e.key === "Tab") || (e.key === "Tab" && !!switcherMode);
    if (wantsCycle) {
      e.preventDefault();
      root.focus();
      return;
    }

    if (
      e.ctrlKey &&
      e.shiftKey &&
      e.key === "W" &&
      window.protectedGlobals.atTop == "browser"
    ) {
      let allIds = [];
      for (let i = 0; i < browserGlobals.allBrowsers.length; i++) {
        allIds.push(
          browserGlobals.allBrowsers[i].rootElement._goldenbodyOrderId,
        );
      }
      let maxId = Math.max(...allIds);
      for (let i = 0; i < browserGlobals.allBrowsers.length; i++) {
        if (
          browserGlobals.allBrowsers[i].rootElement._goldenbodyOrderId == maxId
        ) {
          const closingRoot = browserGlobals.allBrowsers[i].rootElement;
          closingRoot.remove();
          window.protectedGlobals.removeAllEventListenersForApp(
            closingRoot.dataset.appId + closingRoot._goldenbodyId,
          );
          window.browserGlobals.releaseBrowserGoldenbodyId(closingRoot);
          window.browserGlobals.allBrowsers[i].rootElement = null;
          window.browserGlobals.allBrowsers.splice(i, 1);
        }
      }
    }
  };
  iframeWindow.addEventListener(
    "keydown",
    iframeWindow.__gbBrowserShortcutHandler,
  );

  // Create a reusable custom context menu
  const menu = iframeDocument.createElement("div");
  menu.style.all = "unset";

  menu.id = "custom-context-menu";
  menu.style.display = "block"; // <-- important!

  menu.style.position = "fixed";
  menu.style.background = "#222";
  menu.style.color = "#fff";
  menu.style.minWidth = "15vw";
  menu.style.padding = "8px 0";
  menu.style.borderRadius = "6px";
  menu.style.boxShadow = "0 2px 10px rgba(0,0,0,0.3)";
  menu.style.fontFamily = "sans-serif";
  menu.style.fontSize = "14px";
  menu.style.display = "none";
  menu.style.zIndex = "2147483646"; // maximum z-index to ensure it appears on top
  iframeDocument.body.appendChild(menu);

  // window.addEventListener("pointerdown", function () {
  //   menu.style.display = "none";
  // });
  function normalizeContextMenuUrl(url) {
    if (!url || typeof url !== "string") return "";
    try {
      console.log(browserGlobals.unshuffleURL(url));
      return browserGlobals.unshuffleURL(url);
    } catch (e) {
      return url;
    }
  }

  function contextMenuFilename(url, fallback = "download") {
    const normalized = normalizeContextMenuUrl(url);
    try {
      const parsed = new URL(
        normalized,
        iframe.contentWindow?.location?.href || undefined,
      );
      const name = decodeURIComponent(
        (parsed.pathname || "").split("/").pop() || "",
      );
      if (name) return name;
    } catch (e) {}

    const stripped = String(normalized).split("?")[0].split("#")[0];
    const fallbackName = stripped.split("/").pop();
    return fallbackName || fallback;
  }

  function getContextMenuData(e) {
    const clickedElement = e && e.target ? e.target : null;
    const linkElement = clickedElement?.closest
      ? clickedElement.closest("a[href]")
      : null;
    const imageElement = clickedElement?.closest
      ? clickedElement.closest("img[src]")
      : null;
    const eventView =
      (e && e.view) || clickedElement?.ownerDocument?.defaultView || null;
    const isSubFrame = !!(eventView && eventView !== iframe.contentWindow);

    let frameUrl = "";
    if (isSubFrame) {
      try {
        frameUrl = eventView.location.href || "";
      } catch (err) {
        try {
          frameUrl = eventView.frameElement?.src || "";
        } catch (innerErr) {}
      }
    }

    return {
      clickedElement,
      linkElement,
      imageElement,
      frameView: isSubFrame ? eventView : null,
      frameUrl,
      isDownload: !!(linkElement && linkElement.download),
    };
  }

  function addContextMenuItem(label, onClick) {
    const item = iframeDocument.createElement("div");
    item.style.all = "unset";
    item.style.display = "block";
    item.style.textAlign = "left";
    item.textContent = label;
    item.style.padding = "6px 16px";
    item.style.font = "Arial";
    item.style.cursor = "pointer";
    item.onmouseenter = () => (item.style.background = "#444");
    item.onmouseleave = () => (item.style.background = "none");
    item.onclick = async () => {
      try {
        await onClick();
      } catch (e) {
        console.error(e);
      }
      hideMenu();
    };
    menu.appendChild(item);
    return item;
  }

  function addInspectContextMenuItem() {
    addContextMenuItem(
      "inspect\xA0\xA0\xA0\xA0\xA0\xA0\xA0\xA0\xA0\xA0\xA0\xA0\xA0\xA0\xA0\xA0\xA0\xA0\xA0\xA0\xA0\xA0\xA0\xA0Ctrl+Shift+I",
      () => {
        const win = tab.iframe.contentWindow;
        const doc = tab.iframe.contentDocument;
        if (!win) return;
        if (!win.eruda) {
          tab.iframe.contentWindow._goldenbodyIns = true;

          const script = doc.createElement("script");
          script.src = "https://cdn.jsdelivr.net/npm/eruda";
          script.onload = () => {
            win.eruda.init();
            win.eruda.get("entryBtn").hide();
            win.eruda.show();
          };
          doc.head.appendChild(script);
          return;
        }
        win.eruda[win._goldenbodyIns ? "hide" : "show"]();
        win._goldenbodyIns = !win._goldenbodyIns;
      },
    );
  }

  // Function to show the menu
  function showMenu(x, y, contextData = {}) {
    menu.innerHTML = "";
    menu.style.display = "block";

    const linkElement = contextData.linkElement || null;
    const imageElement = contextData.imageElement || null;
    const frameView = contextData.frameView || null;
    const frameUrl = contextData.frameUrl || "";

    const hasLink = !!(linkElement && linkElement.href);
    const hasImage = !!(imageElement && imageElement.src);
    const hasFrame = !!(frameView && frameUrl);

    if (hasLink || hasImage || hasFrame) {
      if (hasLink) {
        const linkUrl = normalizeContextMenuUrl(linkElement.href);
        addContextMenuItem("Open link in new tabㅤㅤㅤㅤ ㅤ", () => {
          addTab(linkUrl, "New Tab");
        });
        addContextMenuItem("Open link in new windowㅤㅤㅤㅤㅤ", () => {
          browser(linkUrl);
        });
        addContextMenuItem("Copy link address", async () => {
          await navigator.clipboard.writeText(linkUrl);
        });
        addContextMenuItem("Download linkㅤㅤㅤㅤㅤ", () => {
          window.protectedGlobals.downloadPost({
            href: linkUrl,
            filename: contextMenuFilename(linkElement.href, "download"),
          });
        });
      }

      if (hasImage) {
        const imageUrl = normalizeContextMenuUrl(imageElement.src);
        addContextMenuItem("Open image in new tab", () => {
          addTab(imageUrl, "Image");
        });
        addContextMenuItem("Open image in new window", () => {
          browser(imageUrl);
        });
        addContextMenuItem("Copy image address", async () => {
          await navigator.clipboard.writeText(imageUrl);
        });
        addContextMenuItem("Download image", () => {
          window.protectedGlobals.downloadPost({
            href: imageUrl,
            filename: contextMenuFilename(imageElement.src, "image"),
          });
        });
      }

      if (hasFrame) {
        const normalizedFrameUrl = normalizeContextMenuUrl(frameUrl);
        addContextMenuItem("Open frame in new tab", () => {
          addTab(normalizedFrameUrl, "Frame");
        });
        addContextMenuItem("Open frame in new window", () => {
          browser(normalizedFrameUrl);
        });
        addContextMenuItem("Copy frame URL", async () => {
          await navigator.clipboard.writeText(normalizedFrameUrl);
        });
        addContextMenuItem("Reload frame", () => {
          try {
            frameView.location.reload();
          } catch (e) {
            try {
              if (frameView.frameElement) {
                frameView.frameElement.src = frameView.frameElement.src;
              }
            } catch (innerErr) {}
          }
        });
      }

      addInspectContextMenuItem();
    } else {
      const openItem = iframeDocument.createElement("div");
      openItem.style.all = "unset";
      openItem.style.display = "block"; // <-- important!

      openItem.textContent = "Backㅤㅤㅤㅤㅤㅤㅤㅤㅤㅤㅤ";
      openItem.style.padding = "6px 16px";
      openItem.style.textAlign = "left";

      openItem.style.font = "Arial";
      openItem.style.cursor = "pointer";
      openItem.onmouseenter = () => (openItem.style.background = "#444");
      openItem.onmouseleave = () => (openItem.style.background = "none");
      openItem.onclick = () => {
        historyNavigate(tab, -1);
        hideMenu();
      };
      menu.appendChild(openItem);
      const forward = iframeDocument.createElement("div");
      forward.style.all = "unset";
      forward.style.display = "block"; // <-- important!
      forward.style.textAlign = "left";

      forward.textContent = "Forward";
      forward.style.font = "Arial";
      forward.style.padding = "6px 16px";
      forward.style.cursor = "pointer";
      forward.onmouseenter = () => (forward.style.background = "#444");
      forward.onmouseleave = () => (forward.style.background = "none");
      forward.onclick = () => {
        historyNavigate(tab, 1);
        hideMenu();
      };
      menu.appendChild(forward);
      const reload = iframeDocument.createElement("div");
      reload.style.all = "unset";
      reload.style.display = "block"; // <-- important!
      reload.style.textAlign = "left";

      reload.textContent = "Reload";
      reload.style.padding = "6px 16px";
      reload.style.font = "Arial";
      reload.style.cursor = "pointer";
      reload.onmouseenter = () => (reload.style.background = "#444");
      reload.onmouseleave = () => (reload.style.background = "none");
      reload.onclick = () => {
        let tmp = browserGlobals.unshuffleURL(
          iframe.contentWindow.location.href,
        );
        if (looksLikeLocalFilePath(tmp)) {
          openUrlInActiveTab(tmp);
        } else {
          iframe.contentWindow.location.reload();
        }
        hideMenu();
      };
      menu.appendChild(reload);
      addInspectContextMenuItem();
    }

    // Temporarily show the menu off-screen to measure its size
    menu.style.left = "-9999px";
    menu.style.top = "-9999px";
    menu.style.display = "block";
    const menuRect = menu.getBoundingClientRect();

    // Determine iframe/document boundaries
    const viewportWidth = iframeDocument.documentElement.clientWidth;
    const viewportHeight = iframeDocument.documentElement.clientHeight;

    let finalX = x;
    let finalY = y;

    // Flip horizontally if the menu would go off the right edge
    if (x + menuRect.width > viewportWidth) {
      finalX = x - menuRect.width;
    }

    // Flip vertically if the menu would go off the bottom edge
    if (y + menuRect.height > viewportHeight) {
      finalY = y - menuRect.height;
    }

    // Apply final position
    menu.style.left = `${Math.max(0, finalX)}px`;
    menu.style.top = `${Math.max(0, finalY)}px`;
  }
  // Hide the menu
  function hideMenu() {
    menu.style.display = "none";
  }

  // Listen for right-clicks inside the iframe
  if (!iframe.contentWindow.__gbContextMenuHandler) {
    iframe.contentWindow.__gbContextMenuHandler = function (e) {
      e.preventDefault();
      e.stopPropagation();
      const contextData = getContextMenuData(e);
      showMenu(e.clientX, e.clientY, contextData);

      if (contextData.linkElement && contextData.linkElement.href) {
        console.log("Right-clicked on a link:", contextData.linkElement.href);
      } else if (contextData.imageElement && contextData.imageElement.src) {
        console.log("Right-clicked on an image:", contextData.imageElement.src);
      } else if (contextData.frameUrl) {
        console.log("Right-clicked inside a frame:", contextData.frameUrl);
      } else {
        console.log("Right-clicked on a non-link element.");
      }
    };
  }
  iframe.contentWindow.removeEventListener(
    "contextmenu",
    iframe.contentWindow.__gbContextMenuHandler,
    true,
  );
  iframe.contentWindow.addEventListener(
    "contextmenu",
    iframe.contentWindow.__gbContextMenuHandler,
    true,
  );
  iframeDocument.removeEventListener(
    "contextmenu",
    iframe.contentWindow.__gbContextMenuHandler,
    true,
  );
  iframeDocument.addEventListener(
    "contextmenu",
    iframe.contentWindow.__gbContextMenuHandler,
    true,
  );

  function getAbsoluteMousePosition(e) {
    // e is the MouseEvent in any iframe
    const topWin = tab.iframe.contentWindow;
    const rect = topWin.document.body.getBoundingClientRect();
    let x = e.clientX;
    let y = e.clientY;
    let win = e.view;

    // Walk up the iframe chain
    while (win && win !== topWin) {
      const frame = win.frameElement;
      if (!frame) break;
      const frameRect = frame.getBoundingClientRect();
      x += frameRect.left;
      y += frameRect.top;
      win = win.parent;
    }

    return { x, y };
  }

  // ----------------------------
  // 4. Listen for iframe requests/inject script
  // ----------------------------
  eval(window.browserGlobals.frontendFilePickerStuffJS);
  if (!root.__moveTabListenerAdded) {
    root.__moveTabListenerAdded = true;
    root.addEventListener("keydown", function (e) {
      if (e.defaultPrevented || e.__gbBrowserCtrlHandled) return;
      runBrowserCtrlShortcut(e);
    });
    root.focus();
  }
  // ----------------------------
  // **Inject override into iframe
  // ----------------------------

  const observedDocs = new WeakSet();
  const observedRoots = new WeakSet();
  const trackedFrames = new WeakSet();

  function installDOMIframeHooks(rootNode) {
    const win = rootNode?.defaultView || rootNode?.ownerDocument?.defaultView;
    if (!win || win.__gbIframeDomHooksInstalled) return;
    win.__gbIframeDomHooksInstalled = true;

    try {
      const docProto = win.Document && win.Document.prototype;
      if (docProto && !docProto.__gbCreateElementIframeWrapped) {
        docProto.__gbCreateElementIframeWrapped = true;
        const nativeCreateElement = docProto.createElement;
        docProto.createElement = function (tagName, options) {
          const created = nativeCreateElement.call(this, tagName, options);
          try {
            if (String(tagName || "").toLowerCase() === "iframe" && created) {
              watchFrame(created, this);
            }
          } catch (e) {}
          return created;
        };
      }
    } catch (e) {}

    try {
      const nodeProto = win.Node && win.Node.prototype;
      if (nodeProto && !nodeProto.__gbIframeNodeOpsWrapped) {
        nodeProto.__gbIframeNodeOpsWrapped = true;

        const nativeAppendChild = nodeProto.appendChild;
        nodeProto.appendChild = function (child) {
          const ret = nativeAppendChild.call(this, child);
          try {
            scanNodeForFrames(child, this.getRootNode?.() || this);
          } catch (e) {}
          return ret;
        };

        const nativeInsertBefore = nodeProto.insertBefore;
        nodeProto.insertBefore = function (newNode, referenceNode) {
          const ret = nativeInsertBefore.call(this, newNode, referenceNode);
          try {
            scanNodeForFrames(newNode, this.getRootNode?.() || this);
          } catch (e) {}
          return ret;
        };

        const nativeReplaceChild = nodeProto.replaceChild;
        nodeProto.replaceChild = function (newChild, oldChild) {
          const ret = nativeReplaceChild.call(this, newChild, oldChild);
          try {
            scanNodeForFrames(newChild, this.getRootNode?.() || this);
          } catch (e) {}
          return ret;
        };
      }
    } catch (e) {}

    try {
      const elemProto = win.Element && win.Element.prototype;
      if (elemProto && !elemProto.__gbIframeAppendOpsWrapped) {
        elemProto.__gbIframeAppendOpsWrapped = true;

        const nativeAppend = elemProto.append;
        if (nativeAppend) {
          elemProto.append = function (...nodes) {
            const ret = nativeAppend.apply(this, nodes);
            for (const node of nodes) {
              try {
                scanNodeForFrames(node, this.getRootNode?.() || this);
              } catch (e) {}
            }
            return ret;
          };
        }

        const nativePrepend = elemProto.prepend;
        if (nativePrepend) {
          elemProto.prepend = function (...nodes) {
            const ret = nativePrepend.apply(this, nodes);
            for (const node of nodes) {
              try {
                scanNodeForFrames(node, this.getRootNode?.() || this);
              } catch (e) {}
            }
            return ret;
          };
        }

        const nativeAttachShadow = elemProto.attachShadow;
        if (nativeAttachShadow && !elemProto.__gbAttachShadowWrapped) {
          elemProto.__gbAttachShadowWrapped = true;
          elemProto.attachShadow = function (init) {
            const sr = nativeAttachShadow.call(this, init);
            try {
              observeDocumentFrames(sr);
              recurseFrames(sr);
            } catch (e) {}
            return sr;
          };
        }
      }
    } catch (e) {}
  }

  function scanNodeForFrames(node, parentRoot) {
    if (!node) return;

    if (node.nodeType === 1 && node.tagName === "IFRAME") {
      watchFrame(node, parentRoot);
    }

    if (typeof node.querySelectorAll === "function") {
      const nestedFrames = node.querySelectorAll("iframe");
      for (const nestedFrame of nestedFrames) {
        watchFrame(nestedFrame, parentRoot);
      }

      const possibleHosts = node.querySelectorAll("*");
      for (const host of possibleHosts) {
        if (host && host.shadowRoot) {
          observeDocumentFrames(host.shadowRoot);
        }
      }
    }

    if (node.shadowRoot) {
      observeDocumentFrames(node.shadowRoot);
    }
  }

  function observeDocumentFrames(doc) {
    if (!doc || observedRoots.has(doc)) return;
    observedRoots.add(doc);
    if (doc.nodeType === 9) observedDocs.add(doc);
    installDOMIframeHooks(doc);
  }

  function watchFrame(frame, parentDoc = null) {
    if (!frame || trackedFrames.has(frame)) return;
    trackedFrames.add(frame);

    frame.addEventListener("load", function onFrameLoad() {
      try {
        if (parentDoc) recurseFrames(parentDoc);
        recurseFrames(frame.contentDocument || frame.contentWindow?.document);
      } catch (e) {}
    });

    try {
      const readyDoc = frame.contentDocument || frame.contentWindow?.document;
      if (readyDoc) {
        recurseFrames(readyDoc);

        if (readyDoc.readyState !== "complete") {
          const onReady = () => {
            try {
              recurseFrames(readyDoc);
            } catch (e) {}
          };
          readyDoc.addEventListener("readystatechange", onReady, {
            once: true,
          });
          readyDoc.addEventListener("DOMContentLoaded", onReady, {
            once: true,
          });
        }
      }
    } catch (e) {}
  }

  function recurseFrames(doc, event = null) {
    if (!doc) return;
    observeDocumentFrames(doc);

    // do something for this document (attach context menu, log, etc.)
    const frames = doc.querySelectorAll("iframe");

    if (doc.nodeType === 1 && doc.shadowRoot) {
      recurseFrames(doc.shadowRoot, event);
    }
    if (typeof doc.querySelectorAll === "function") {
      const hosts = doc.querySelectorAll("*");
      for (const host of hosts) {
        if (host && host.shadowRoot) {
          recurseFrames(host.shadowRoot, event);
        }
      }
    }

    for (const frame of frames) {
      try {
        watchFrame(frame, doc);
        if (event) {
          if (event.source == iframe.contentWindow) {
            return iframe;
          }
          if (event.source == frame.contentWindow) {
            return frame;
          }
        }
        // Wait for the iframe to load (so its contentDocument exists)
        try {
          const win = frame.contentWindow;
          const frameDoc = frame.contentDocument || win?.document;
          if (!win || !frameDoc) continue;
          async function tmp() {
            const frameWin = frame.contentWindow;
            const frameDocCurrent = frame.contentDocument || frameWin?.document;
            if (
              !frameWin ||
              !frameDocCurrent ||
              frameDocCurrent.__gbCookieHookInstalled
            )
              return;
            let vfsScriptText = browserGlobals.vfstxt;
            if (vfsScriptText || !frameWin.__gbCookieHookInstalled) {
              eval(vfsScriptText);
            }
            // override window.open
            frameWin.open = function (url, location) {
              let w = frameWin;

              while (w.parent !== w.top) {
                w = w.parent;
              }

              const layer1Window = w;
              const layer1Iframe = w.frameElement;
              let allbrowserindex = 0;
              // console.log(layer1Iframe); // ✅ the first iframe under the main page
              for (
                let i = 0;
                i < window.browserGlobals.allBrowsers.length;
                i++
              ) {
                if (
                  window.browserGlobals.allBrowsers[i].rootElement.contains(
                    layer1Iframe,
                  )
                )
                  allbrowserindex = i;
              }

              if (url == "") url = "about:blank";
              console.log(url);
              if (!url.startsWith("http") && !url.startsWith("about:")) {
                if (document.getElementsByTagName("base").length > 0) {
                  url =
                    window.browserGlobals
                      .mainWebsite(
                        document.getElementsByTagName("base")[0].href,
                      )
                      .slice(0, -1) + url;
                } else if (!url.startsWith("http")) {
                  url =
                    window.browserGlobals
                      .mainWebsite(
                        window.browserGlobals.unshuffleURL(
                          window.location.href,
                        ),
                      )
                      .slice(0, -1) + url;
                } else {
                  url =
                    window.browserGlobals
                      .mainWebsite(
                        window.browserGlobals.unshuffleURL(
                          window.location.href,
                        ),
                      )
                      .slice(0, -1) + url;
                }
              }
              if (location === "_parent") {
                console.error('this flag is banned "_parent"');
                frameWin.location = url;
              } else if (location === "_self") {
                frameWin.location = url;
              } else if (location === "_blank") {
                return window.browserGlobals.__globalAddTab(
                  url,
                  allbrowserindex,
                  window,
                );
              } else if (location === "_top") {
                frameWin.location = url;
              } else {
                return window.browserGlobals.__globalAddTab(
                  url,
                  allbrowserindex,
                  window,
                );
              }
            };
            frameDocCurrent.__gbCookieHookInstalled = true;
            let cookieWriteQueue = Promise.resolve();

            function queuedWriteFile(path, data) {
              cookieWriteQueue = cookieWriteQueue
                .then(() => window.top.protectedGlobals.WriteFile(path, data))
                .catch((err) => {
                  console.error("Write failed:", err);
                });
              return cookieWriteQueue;
            }

            const readFile = window.top.protectedGlobals.ReadFile;
            const initialRes = await readFile(browserGlobals.cookiesPath);
            let rawCookieStore =
              initialRes && initialRes.filecontent
                ? initialRes.filecontent
                : "";

            if (!rawCookieStore) {
              rawCookieStore = btoa("{}");
              await window.top.protectedGlobals.WriteFile(
                browserGlobals.cookiesPath,
                rawCookieStore,
              );
            }

            let cookies = {};
            try {
              const decoded =
                window.browserGlobals.decodeMaybeBase64(rawCookieStore);
              cookies = JSON.parse(decoded || "{}");
            } catch (e) {
              cookies = {};
            }

            frameWin.Object.defineProperty(frameDocCurrent, "cookie", {
              configurable: true,
              get: function () {
                const site = window.browserGlobals.mainWebsite(
                  window.browserGlobals.unshuffleURL(frameWin.location.href),
                );
                const jar = cookies[site] || {};
                return Object.entries(jar)
                  .map(([k, v]) => `${k}=${v}`)
                  .join("; ");
              },
              set: function (newValue) {
                const site = window.browserGlobals.mainWebsite(
                  window.browserGlobals.unshuffleURL(frameWin.location.href),
                );
                if (!cookies[site]) cookies[site] = {};

                const parts = String(newValue).split(";");
                for (const part of parts) {
                  const trimmed = part.trim();
                  if (!trimmed.includes("=")) continue;

                  const [k, ...v] = trimmed.split("=");
                  if (!k) continue;

                  const key = k.trim().toLowerCase();
                  if (
                    [
                      "path",
                      "expires",
                      "domain",
                      "secure",
                      "samesite",
                      "max-age",
                    ].includes(key)
                  ) {
                    continue;
                  }

                  cookies[site][key] = v.join("=").trim();
                }

                const serialized = JSON.stringify(cookies);
                queuedWriteFile(browserGlobals.cookiesPath, btoa(serialized));
              },
            });
          }
          tmp();
          if (!win.__gbWindowSwitchForwardKeydown) {
            win.__gbWindowSwitchForwardKeydown = function (e) {
              var keyRaw = String(e.key || "");
              var key = keyRaw.toLowerCase();
              var isCtrlLike = !!(e.ctrlKey || e.metaKey);
              var isBrowserShortcutKey =
                key === "w" ||
                key === "t" ||
                key === "n" ||
                ((key === "arrowleft" || key === "arrowright") && !!e.altKey);
              if (isCtrlLike && isBrowserShortcutKey) {
                e.preventDefault();
                if (typeof e.stopPropagation === "function") {
                  e.stopPropagation();
                }
                try {
                  root.dispatchEvent(
                    new KeyboardEvent("keydown", {
                      key: keyRaw || e.key,
                      code: e.code,
                      ctrlKey: !!e.ctrlKey,
                      metaKey: !!e.metaKey,
                      altKey: !!e.altKey,
                      shiftKey: !!e.shiftKey,
                      bubbles: true,
                      cancelable: true,
                    }),
                  );
                } catch (err) {}
                return;
              }

              var switcherMode =
                (window.windowSwitchState &&
                  window.windowSwitchState.active &&
                  window.windowSwitchState.mod) ||
                "";
              var wantsCycle =
                (e.altKey && e.key === "Tab") ||
                (e.key === "Tab" && !!switcherMode);
              if (wantsCycle) {
                e.preventDefault();
                var dispatchAlt = e.altKey || switcherMode === "Alt";
                var dispatchCtrl = e.ctrlKey || switcherMode === "Ctrl";
                var handledDirectly = false;
                try {
                  if (typeof window.cycleWindowFocus === "function") {
                    handledDirectly =
                      window.cycleWindowFocus(
                        !!e.shiftKey,
                        dispatchAlt ? "Alt" : "Ctrl",
                      ) === true;
                  }
                } catch (err) {}
                if (handledDirectly) return;
                try {
                  window.dispatchEvent(
                    new KeyboardEvent("keydown", {
                      key: "Tab",
                      code: "Tab",
                      altKey: !!dispatchAlt,
                      ctrlKey: !!dispatchCtrl,
                      shiftKey: !!e.shiftKey,
                      bubbles: true,
                      cancelable: true,
                    }),
                  );
                } catch (err) {}
              }
            };
          }
          if (!win.__gbWindowSwitchForwardKeyup) {
            win.__gbWindowSwitchForwardKeyup = function (e) {
              if (e.key !== "Alt" && e.key !== "Control") return;
              try {
                if (
                  typeof window.commitWindowSwitchTarget === "function" &&
                  typeof window.resetWindowSwitchState === "function"
                ) {
                  window.commitWindowSwitchTarget();
                  window.resetWindowSwitchState();
                  return;
                }
              } catch (err) {}
              try {
                window.dispatchEvent(
                  new KeyboardEvent("keyup", {
                    key: e.key,
                    code: e.code,
                    altKey: !!e.altKey,
                    ctrlKey: !!e.ctrlKey,
                    shiftKey: !!e.shiftKey,
                    bubbles: true,
                    cancelable: true,
                  }),
                );
              } catch (err) {}
            };
          }
          if (!frameDoc.getElementById("_gb_a_setter")) {
            var script = frameDoc.createElement("script");
            script.id = "_gb_a_setter";
            script.textContent = `function callParent(url) {
  window.parent.postMessage(
    { type: "FROM_IFRAME", message: url },
    "*"
  );
}

`;
            frameDoc.head?.appendChild(script);
          }

          if (!frameDoc.__gbEarlyPatchHook) {
            frameDoc.__gbEarlyPatchHook = true;
            const retryPatch = () => {
              try {
                recurseFrames(frameDoc, event);
              } catch (e) {}
              if (frameDoc.readyState === "complete") {
                try {
                  frameDoc.removeEventListener("readystatechange", retryPatch);
                } catch (e) {}
              }
            };
            frameDoc.addEventListener("DOMContentLoaded", retryPatch, {
              once: true,
            });
            frameDoc.addEventListener("readystatechange", retryPatch);
          }

          win.removeEventListener("keydown", handleReload);
          win.addEventListener("keydown", handleReload);
          if (!win.handleArrows) {
            win.handleArrows = function (e) {
              if (document.activeElement !== frame) return;
              if (e.ctrlKey && e.altKey) {
                e.preventDefault();
                if (e.key === "ArrowRight") {
                  for (let i = 0; i < tabs.length; i++) {
                    if (tabs[i].id === activatedTab.id) {
                      activateTab(tabs[i + 1].id);
                      break;
                    }
                  }
                } else if (e.key === "ArrowLeft") {
                  let lastindex = 0;
                  for (let i = 0; i < tabs.length; i++) {
                    let currentIndex = i;
                    if (tabs[i].id === activatedTab.id) {
                      activateTab(tabs[lastindex].id);
                      break;
                    }
                    lastindex = currentIndex;
                  }
                }
              }
            };
          }
          frameDoc.addEventListener("keydown", function () {
            document.activeElement.focus();
          });
          frameDoc.addEventListener("click", hideMenu);
          if (!frame.contentWindow.onpointerup) {
            frame.contentWindow.onpointerup = function (ev) {
              window.top.postMessage(
                {
                  type: "iframe-pointerup",
                  x: ev.clientX,
                  y: ev.clientY,
                  pageX: ev.pageX,
                  pageY: ev.pageY,
                  button: ev.button,
                  buttons: ev.buttons,
                  altKey: ev.altKey,
                  ctrlKey: ev.ctrlKey,
                  shiftKey: ev.shiftKey,
                  metaKey: ev.metaKey,
                },
                "*",
              );
            };
          }
          if (!win.contextMenuHandler) {
            win.contextMenuHandler = function (e) {
              e.preventDefault();
              e.stopPropagation();

              // Attach handler
              const { x, y } = getAbsoluteMousePosition(e, frameDoc);
              const contextData = getContextMenuData(e);

              showMenu(x, y, contextData);

              if (contextData.linkElement && contextData.linkElement.href) {
                console.log(
                  "Right-clicked on a link:",
                  contextData.linkElement.href,
                );
              } else if (
                contextData.imageElement &&
                contextData.imageElement.src
              ) {
                console.log(
                  "Right-clicked on an image:",
                  contextData.imageElement.src,
                );
              } else if (contextData.frameUrl) {
                console.log(
                  "Right-clicked inside a frame:",
                  contextData.frameUrl,
                );
              } else {
                console.log("Right-clicked on a non-link element.");
              }
            };
          }

          const mwin = tab.iframe.contentWindow;
          win.tabIndex = "0";
          if (!win.suberudaKeyHandler) {
            win.erudaKeyHandler = function (e) {
              if (e.ctrlKey && e.shiftKey && e.key.toLowerCase() === "i") {
                if (!win.eruda) {
                  iframe.contentWindow._goldenbodyIns = true;

                  const script = doc.createElement("script");
                  script.src = "https://cdn.jsdelivr.net/npm/eruda";
                  script.onload = () => {
                    win.eruda.init();
                    win.eruda.get("entryBtn").hide();
                    win.eruda.show();
                  };
                  doc.head.appendChild(script);
                } else {
                  try {
                    // toggle show/hide
                    if (!win._goldenbodyIns) {
                      win.eruda.show();

                      win._goldenbodyIns = true;
                    } else {
                      win.eruda.hide();

                      win._goldenbodyIns = false;
                    }
                  } catch (e) {
                    console.error(e);
                  }
                }
              }
            };

            win.suberudaKeyHandler = function (e) {
              if (e.ctrlKey && e.shiftKey && e.key.toLowerCase() === "i") {
                if (frame.contentWindow.parent !== window) {
                  document.activeElement.contentDocument.body.focus();
                }
                return;
              } else if (
                (e.ctrlKey && (e.key === "+" || e.key === "=")) ||
                (e.ctrlKey && e.key === "-")
              ) {
                if (frame.contentWindow.parent !== window) {
                  document.activeElement.contentDocument.body.focus();
                }

                // handleresize(e, tab);
                return;
              }
            };
          }
          function attatch() {
            frame.contentWindow.removeEventListener(
              "keydown",
              frame.contentWindow.handleArrows,
            );
            frame.contentWindow.addEventListener(
              "keydown",
              frame.contentWindow.handleArrows,
            );
            frame.contentWindow.removeEventListener(
              "pointerup",
              frame.contentWindow.onpointerup,
            );
            frame.contentWindow.addEventListener(
              "pointerup",
              frame.contentWindow.onpointerup,
            );
            win.removeEventListener(
              "keydown",
              win.__gbWindowSwitchForwardKeydown,
            );
            win.addEventListener("keydown", win.__gbWindowSwitchForwardKeydown);
            win.removeEventListener("keyup", win.__gbWindowSwitchForwardKeyup);
            win.addEventListener("keyup", win.__gbWindowSwitchForwardKeyup);
            win.removeEventListener("keydown", win.suberudaKeyHandler);

            win.addEventListener("keydown", win.suberudaKeyHandler);
            frame.contentWindow.removeEventListener(
              "contextmenu",
              win.contextMenuHandler,
              true,
            );

            frame.contentWindow.addEventListener(
              "contextmenu",
              win.contextMenuHandler,
              true,
            );
          }
          attatch();
          //   // get all iframes in this document
        } catch (e) {
          // console.warn('Cannot access nested frame:', frame.src);
          // console.error(e);
        }

        // If already loaded, go in immediately
        if (frame.contentDocument || frame.contentWindow?.document) {
          const found = recurseFrames(
            frame.contentDocument || frame.contentWindow?.document,
            event,
          );
          if (found) return found; // propagate match
        }
      } catch (err) {
        console.warn("Blocked or cross-origin iframe:", frame.src);
      }
    }
  }

  // Start from the top-level document
  recurseFrames(iframe.contentDocument);
  recurseFrames(root);

  // Hide the menu when clicking elsewhere
  iframeDocument.addEventListener("click", hideMenu);
  iframe.__gbPatchedDocument = iframeDocument;
}
