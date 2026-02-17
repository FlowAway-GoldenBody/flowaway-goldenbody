//browser global vars
  window.allBrowsers = [];
  window.browserId = 0;
  window.id = data.id;
  window.proxyurl = window.origin + '/';
  window.dragstartwindow = null;
  window.__vfsMessageListenerAdded = false;
  window.tabisDragging = false;
  window.draggedtab = 0;
// browser global functions
  window.mainWebsite = function(string) {
    let s = '';
    let anti_numtots = 0;
    for (let i = 0; i < string.length; i++) {
      if(string[i] === '/') anti_numtots++;
      if (string[i] === "?" || string[i] === '&' || anti_numtots === 3) {
        s += string[i];
        return s;
      } else {
        s += string[i];
      }
    }
    return s;
  }

window.browser = function (
    preloadlink = null,
    preloadsize = 100,
    posX = 20,
    posY = 20,
  ) {
    let status;
async function updateSiteSettings(iframe, content) {
    data.enableURLSync = content.enableURLSync;
    data.lazyloading = content.lazyloading;
    if(content.lazyloading) allBrowsers.forEach(b => b.tabs.forEach(t => t.iframe.loading = 'lazy')); else allBrowsers.forEach(b => b.tabs.forEach(t => t.iframe.loading = ''));
    content.updateSiteSettings = true;
    content.url = mainWebsite(unshuffleURL(iframe.src));
    await zmcdpost(content);
    iframe.sandbox = content.newSandbox;
    data.siteSettings = await zmcdpost({requestSiteSettings: true});
    data.siteSettings = data.siteSettings.siteSettings;
}
function createPermInput(iframe, url) {
    url = mainWebsite(url);

  let sandbox = `
    allow-forms
    allow-modals
    allow-orientation-lock
    allow-pointer-lock
    allow-presentation
    allow-same-origin
    allow-scripts
  `.trim();

  let fullscreen = true;
  let addTheSite = true;
    let siteSettings = data.siteSettings;
    for(const site of siteSettings) {
        if(url === site[0]) {
            sandbox = site[1];
            addTheSite = false;
        }
    }
iframe.sandbox = sandbox;
        return {sandbox, addTheSite};
}
function openPermissionsUI(url, iframe, anchorRect = null) {
  const perms = createPermInput(iframe, url) || {
    sandbox: "",
  };

  // --- Cleanup old UI
  document.getElementById("perm-ui")?.remove();

  // --- Overlay (click outside to close)
  const overlay = document.createElement("div");
  overlay.style.cssText = `
    position:fixed;
    inset:0;
    z-index:999999;
  `;
  overlay.onclick = () => overlay.remove();

  // --- Floating panel
  const panel = document.createElement("div");
  panel.id = "perm-ui";
  panel.onclick = e => e.stopPropagation();
  panel.className = 'panel';
  panel.classList.toggle('dark', data.dark);
  panel.classList.toggle('light', !data.dark);
  panel.style.cssText = `
    position:fixed;
    width:320px;
    border-radius:10px;
    box-shadow:0 20px 60px rgba(0,0,0,.6);
    padding:14px;
    font-family:system-ui;
    font-size:13px;
    max-height:400px;
    overflow:auto;
  `;

  if (anchorRect) {
    panel.style.left = anchorRect.left + "px";
    panel.style.top = (anchorRect.bottom + 6) + "px";
  } else {
    panel.style.left = "50%";
    panel.style.top = "50%";
    panel.style.transform = "translate(-50%,-50%)";
  }

  overlay.appendChild(panel);
  document.body.appendChild(overlay);

  // --- Helpers
  const sandboxSet = new Set(
    perms.sandbox?.split(" ").map(v => v.trim()).filter(Boolean)
  );

  function section(title) {
    const d = document.createElement("div");
    d.style.marginBottom = "10px";
    d.innerHTML = `<div style="font-weight:600;margin-bottom:6px">${title}</div>`;
    panel.appendChild(d);
    return d;
  }

  function checkbox(parent, label, checked, disabled = false) {
    const row = document.createElement("label");
    row.style.cssText = "display:flex;align-items:center;gap:6px;margin-bottom:4px;opacity:" + (disabled ? 0.5 : 1);
    const cb = document.createElement("input");
    cb.type = "checkbox";
    cb.checked = checked;
    cb.disabled = disabled;
    row.append(cb, document.createTextNode(label));
    parent.appendChild(row);
    return cb;
  }

  // ===============================
  // FULLSCREEN
  // ===============================
  let website = mainWebsite(unshuffleURL(iframe.src));
  let secure = website.startsWith('https://') ? 'Connection is Secure' : 'Not Secure';
  if(website.startsWith('goldenbody://')) secure = 'You are viewing a secure official goldenbody webpage'
  section(website);
  section(secure);
  if(!data.enableURLSync)
  section("Only user-initiated navigations get new permissions. To disable this, open sync perms below.")
  // perms
  const syncpermsSec = section("Sync Perms");
  let syncperms = checkbox(syncpermsSec, 'sync perms', data.enableURLSync);
  const info = document.createElement("div");
  info.style.cssText = `
    margin-top:6px;
    font-size:11px;
    color:#aaa;
  `;
  info.textContent =
    "This is only for people with privacy needs, may cause bugs when many redirects happens at 1 time";
  syncpermsSec.appendChild(info);
  let lazyloadingsect = section("Performance");
  let lazyloading = checkbox(lazyloadingsect, 'Lazy Loading', data.lazyloading);



  // ===============================
  // SANDBOX
  // ===============================
  const sandboxSec = section("Site Settings");
  const SANDBOX_LIST = [
    "allow-forms",
    "allow-modals",
    "allow-orientation-lock",
    "allow-pointer-lock",
    "allow-presentation",
    "allow-scripts",
    "allow-same-origin" // LOCKED
  ];

  const sandboxCheckboxes = {};

  for (const perm of SANDBOX_LIST) {
    const locked = perm === "allow-same-origin";
    sandboxCheckboxes[perm] = checkbox(
      sandboxSec,
      perm + (locked ? " (locked)" : ""),
      sandboxSet.has(perm),
      locked
    );
  }

  // Warning
  const warn = document.createElement("div");
  warn.style.cssText = `
    margin-top:6px;
    font-size:11px;
    color:#aaa;
  `;
  warn.textContent =
    "allow-same-origin cannot be changed.";
  sandboxSec.appendChild(warn);

  // ===============================
  // ACTIONS
  // ===============================
  const actions = document.createElement("div");
  actions.style.cssText = `
    display:flex;
    justify-content:flex-end;
    gap:8px;
    margin-top:12px;
  `;

  const cancel = document.createElement("button");
  cancel.textContent = "Cancel";
  cancel.onclick = () => overlay.remove();

  const apply = document.createElement("button");
  apply.textContent = "Apply";
  apply.style.background = "#4c8bf5";
  apply.style.color = "#fff";

  apply.onclick = () => {
    // ===== LOGIC HOOK (YOU IMPLEMENT) =====
    status.innerText = "reload this page to apply your updated settings!";
    setTimeout(() => (status.innerText = ""), 2000);

    const newSandbox = Object.entries(sandboxCheckboxes)
      .filter(([_, cb]) => cb.checked)
      .map(([k]) => k)
      .join(" ");



      updateSiteSettings(iframe, {
        newSandbox: newSandbox,
        addTheSite: perms.addTheSite,
        enableURLSync: syncperms.checked,
        lazyloading: lazyloading.checked,
      });

    overlay.remove();
  };

  actions.append(cancel, apply);
  panel.appendChild(actions);
}
    function unshuffleURL(url) {
      if (url === goldenbodywebsite + "newtab.html") {
        return "goldenbody://newtab/";
      }
      else if (url === goldenbodywebsite + "ai.html") {
        return "goldenbody://ai/";
      }
      url = url.split('/');
      if(url) {
        if(typeof url === 'string') {
            return url;
        }
      }
      url.splice(0, 4);
      let newUrl = '';
      for(let i = 0; i < url.length; i++) {
        if(i !== 0) {
            if(i === 1) newUrl += '//' + url[i];
            else if(i === 2) newUrl += url[i];
            else newUrl += '/' + url[i];
        }
        else {
          newUrl += url[i];
        }
      }
      return newUrl;
    }

    var checkInterval = null;
    var activatedTab = 0;
    let isMaximized = false;
    let _isMinimized = false;
    if (posX < 0) {
      posX = 0;
    }
    if (posY < 0) {
      posY = 0;
    }
    atTop = "browser";
    const chromeWindow = (function createChromeLikeUI() {
      // --- Create root container ---
      var root = document.createElement("div");
       root.__vfsMessageListenerAdded = false;
      root.className = "sim-chrome-root";
      Object.assign(root.style, {
        position: "fixed",
        top: posY + "px",
        left: posX + "px",
        width: "1000px",
        height: "640px",
        boxShadow: "0 12px 40px rgba(0,0,0,0.35)",
        borderRadius: "10px",
        overflow: "hidden",
      });
      bringToFront(root);
      browserId++;
      root._goldenbodyId = browserId;
      root.tabIndex = "0";
      root.addEventListener('styleapplied', () => {
        for(const tab of tabs) {
            tab.iframe.contentWindow.postMessage({__goldenbodyChangeTheme__: true, dark: data.dark});
        }
      })
      root.addEventListener("keydown", (e) => {
        // e.target is the element that actually has focus

        // Only trigger for Shift + T
        if (e.ctrlKey && e.key === "t") {
          e.preventDefault();

          addTab("goldenbody://newtab/", "New Tab");
        }
      });
      root.classList.add('browser');
      // --- Top area ---
      const top = document.createElement("div");
      top.className = "sim-chrome-top";
      top.style.justifyContent = "space-between";
      root.appendChild(top);

      top.addEventListener("click", function () {
        bringToFront(root);
      });
      var topBar = false;
      if (!topBar) {
        topBar = document.createElement("div");
        topBar.className = "appTopBar";
        topBar.style.display = "flex";
        topBar.style.justifyContent = "flex-end";
        topBar.style.alignItems = "center";
        topBar.style.padding = "2px";
        topBar.style.cursor = "move";
        topBar.style.flexShrink = "0";
      }

      var btnMin = document.createElement("button");
      btnMin.innerText = "‎    –    ‎";
      btnMin.title = "Minimize";
      btnMin.className = 'btnMinColor';
      topBar.appendChild(btnMin);

      var btnMax = document.createElement("button");
      btnMax.className = 'btnMaxColor';
      btnMax.innerText = "‎     □    ‎ ";
      btnMax.title = "Maximize/Restore";
      topBar.appendChild(btnMax);

      var btnClose = document.createElement("button");
      btnClose.innerText = "‎     x    ‎ ";
      btnClose.title = "Close";
      btnClose.style.color = "white";
      btnClose.style.backgroundColor = "red";
      topBar.appendChild(btnClose);

      [topBar, btnMin, btnMax, btnClose].forEach((el) => {
        el.style.margin = "0 2px";
        el.style.border = "none";
        el.style.padding = "2px 5px";
        el.style.fontSize = "14px";
        el.style.cursor = "pointer";
      });

      function getBounds() {
        if (
          root.style.width === "100%" &&
          root.style.height === `calc(100% - 60px)`
        ) {
          return {
            left: "20px",
            top: "20px",
            width: "1000px",
            height: "640px",
            position: root.style.position || "fixed",
          };
        }
        return {
          left: root.style.left,
          top: root.style.top,
          width: root.style.width,
          height: root.style.height,
          position: root.style.position || "fixed",
        };
      }
      var savedBounds = getBounds();

      function applyBounds(b) {
        root.style.position = "absolute";
        root.style.left = b.left;
        root.style.top = b.top;
        root.style.width = b.width;
        root.style.height = b.height;
      }

      // MINIMIZE
      btnMin.addEventListener("click", function () {
        if (!isMaximized) savedBounds = getBounds();
        root.style.display = "none";
        _isMinimized = true;
      });

      // MAXIMIZE / RESTORE
      btnMax.addEventListener("click", function () {
        if (!isMaximized) {
          savedBounds = getBounds();
          root.style.position = "absolute";
          root.style.left = "0";
          root.style.top = "0";
          root.style.width = "100%";
          // leave space for restart button (assume 50px)
          root.style.height = `calc(100% - 60px)`;
          btnMax.textContent = "‎     ⧉    ‎ "; // restore symbol
          isMaximized = true;
          // alert('mximized');
          isMinimized = false;
        } else {
          applyBounds(savedBounds);
          btnMax.textContent = "‎     □    ‎ ";
          // alert('restored');
          isMaximized = false;
        }
      });

      // CLOSE
      btnClose.addEventListener("click", function () {
        root.remove();
        root = null;

        // Remove from allBrowsers
        const index = allBrowsers.indexOf(chromeWindow);
        if (index !== -1) {
          allBrowsers.splice(index, 1);
        }
        window.removeEventListener("message", messageHandler);
        window.removeEventListener("pointerup", onpointerupAnywhere);

        _browserCalled = false;
      });
      function closeWindow() {
        root.remove();
        root = null;

        // Remove from allBrowsers
        const index = allBrowsers.indexOf(chromeWindow);
        if (index !== -1) {
          allBrowsers.splice(index, 1);
        }
        window.removeEventListener("message", messageHandler);
        window.removeEventListener("pointerup", onpointerupAnywhere);

        _browserCalled = false;
      }

      const tabsRow = document.createElement("div");
      tabsRow.className = "sim-chrome-tabs";
      tabsRow.style.flex = "0 1 auto";
      tabsRow.style.minWidth = "0px";
      tabsRow.style.overflowX = "auto";
      tabsRow.style.whiteSpace = "nowrap";

      // new tab button
      const newTabBtn = document.createElement("button");
      newTabBtn.className = "sim-open-btn";
      newTabBtn.innerText = "+";
      newTabBtn.title = "New tab";
      Object.assign(newTabBtn.style, {
        width: "28px",
        padding: "6px",
        fontSize: "16px",
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        flexShrink: "0",
      });

      // address row
      const addressRow = document.createElement("div");
      addressRow.className = "sim-address-row";
      root.appendChild(addressRow);

      const urlInput = document.createElement("input");
      urlInput.className = "sim-url-input";
      urlInput.type = "text";
      urlInput.placeholder = "Enter URL (e.g. https://example.com)";
      urlInput.autocapitalize = "off";
      urlInput.autocomplete = "off";
      urlInput.spellcheck = false;
      addressRow.appendChild(urlInput);

      const openBtn = document.createElement("button");
      openBtn.className = "sim-open-btn";
      openBtn.innerText = "Open";
      addressRow.appendChild(openBtn);

      var sitesettingsbtn = document.createElement("button");
      sitesettingsbtn.textContent = "⚙";
      sitesettingsbtn.className = "sim-open-btn";
      sitesettingsbtn.style.fontSize = "20px";
      sitesettingsbtn.style.justifyContent = "center";

      addressRow.prepend(sitesettingsbtn);

      var reloadBtn = document.createElement("button");
      reloadBtn.textContent = "⟳";
      reloadBtn.className = "sim-open-btn";
      reloadBtn.style.fontSize = "20px";
      reloadBtn.style.justifyContent = "center";
      reloadBtn.style.alignItems = "center";
      addressRow.prepend(reloadBtn);

      var forwardBtn = document.createElement("button");
      forwardBtn.textContent = "→";
      forwardBtn.className = "sim-open-btn";
      addressRow.prepend(forwardBtn);

      var backBtn = document.createElement("button");
      backBtn.textContent = "←";
      backBtn.className = "sim-open-btn";
      addressRow.prepend(backBtn);

      var clear = document.createElement("button");
      clear.textContent = "🗑";
      clear.title = "delete browsing data";
      clear.className = "sim-open-btn";
      clear.onclick = function () {
        fetch(zmcdserver, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ username: data.username, needID: true }),
        })
          .then((res) => res.json())
          .then((result) => {
            console.log("id now:", result);
            id = result.id;
          });
        status.innerText = "site data cleared! please close all browser windows!";
        setTimeout(() => (status.innerText = ""), 2000);
      };
      addressRow.appendChild(clear);

      status = document.createElement("div");
      status.className = "sim-status";
      status.style.flex = "0 0 auto";
      status.innerText = "";

      const resizeDiv = document.createElement("div");
      resizeDiv.style.backgroundColor = "gray"; // visible
      resizeDiv.style.position = "absolute";
      resizeDiv.style.width = "5%";
      resizeDiv.style.height = "3%";
      resizeDiv.style.left = "85%";
      resizeDiv.style.top = "10%";
      resizeDiv.style.zIndex = "9999";
      resizeDiv.style.display = "none";

      addressRow.prepend(resizeDiv);

      root.addEventListener("pointerdown", function () {
        resizeDiv.style.display = "none";
      });

      let previousn = activatedTab.resizeP;
      setInterval(() => {
        if (previousn === activatedTab.resizeP) {
          resizeDiv.style.display = "none";
        }
        previousn = activatedTab.resizeP;
      }, 3000 * nhjd);
      // ⟳ ⋮
      // iframes
      var iframes = [];

      const leftGroup = document.createElement("div");
      leftGroup.style.display = "flex";
      leftGroup.style.alignItems = "center";
      leftGroup.className = "leftgroup";
      leftGroup.style.gap = "0px";
      leftGroup.style.flex = "1";
      leftGroup.style.minWidth = "0";
      leftGroup.appendChild(tabsRow);
      leftGroup.appendChild(status);

      top.appendChild(leftGroup);
      top.appendChild(topBar);
      document.body.appendChild(root);

      let tabs = [];
      let activeTabId = null;
      let tabCounter = 0;

      // with this:
      tabsRow.style.display = "flex";
      tabsRow.style.flex = "1 1 0"; // <-- grow and be the thing that shrinks
      tabsRow.style.minWidth = "0"; // <-- required for flex children to actually shrink container
      tabsRow.style.flexWrap = "nowrap";
      tabsRow.style.overflowX = "auto";
      tabsRow.style.overflowY = "hidden";
      leftGroup.style.flex = "1 1 auto";
      leftGroup.style.minWidth = "0";
      tabisDragging = false;

      let dragid = "";
      let dragindex = 0;
      const onpointerupAnywhere = (ev, notontab) => {
        if (!tabisDragging) return;

        // Check if pointerup happened on a tab
        let targetTab;
        try {
          targetTab = ev.target.closest(".sim-tab");
        } catch (e) {}
        try {
          let tabbarHit = false;
          let targetBrowser = null;

          for (const b of allBrowsers) {
            if (
              b.rootElement.querySelector(".sim-chrome-top").contains(ev.target)
            ) {
              tabbarHit = true;
              targetBrowser = b;
              break;
            }
          }
          if (tabbarHit) {
            // Determine the element under the cursor
            const dropTarget = document.elementFromPoint(
              ev.clientX,
              ev.clientY,
            );

            // Detect which window the cursor is over
            let targetBrowser = null;

            for (const b of allBrowsers) {
              if (b.rootElement.contains(dropTarget)) {
                targetBrowser = b;
                break;
              }
            }
            // If dropped in the same window: do nothing
            if (targetBrowser === dragstartwindow) {
              // reset drag state
              tabisDragging = false;
              dragMoved = false;
              draggedtab = null;
              return;
            }

            // If dropped in another window
            if (targetBrowser) {
              targetBrowser.addTab(draggedtab.url, "", draggedtab.resizeP);
              dragstartwindow.closeTab(draggedtab.id);
              tabisDragging = false;
              dragMoved = false;
              draggedtab = null;
              return;
            }

            tabisDragging = false;
            dragMoved = false;
            draggedtab = null;

            return;
          }
        } catch (e) {}
        if (!targetTab || targetTab.id !== dragid) {
          // pointerup happened somewhere else
          browser(
            dragstartwindow.tabs[dragindex].url,
            draggedtab.resizeP,
            ev.clientX - 100,
            ev.clientY - 20,
          ); // your custom function
          // console.log(root);
          dragstartwindow.closeTab(draggedtab.id);
        }

        tabisDragging = false;
        dragMoved = false;
        draggedtab = null;
      };
      function messageHandler(event) {
        const data = event.data;
        if (data?.type === "iframe-pointerup") {
          // console.log("pointerup from iframe:");
          // console.log("Coordinates:", data.x, data.y);
          // console.log("Button pressed:", data.button);

          // You can reconstruct a pseudo-event:
          const e = {
            clientX: data.x,
            clientY: data.y,
            pageX: data.pageX,
            pageY: data.pageY,
            button: data.button,
            buttons: data.buttons,
            altKey: data.altKey,
            ctrlKey: data.ctrlKey,
            shiftKey: data.shiftKey,
            metaKey: data.metaKey,
          };
          onpointerupAnywhere(e, true);
          // Use pseudoEvent however you want
          let pointerup = new MouseEvent("pointerup", e);
          document.dispatchEvent(pointerup);
          window.dispatchEvent(pointerup);
          let pointerdown = new MouseEvent("pointerdown", e);
          document.dispatchEvent(pointerdown);
          window.dispatchEvent(pointerdown);
          let CLICK = new MouseEvent("click", e);
          document.dispatchEvent(CLICK);
          window.dispatchEvent(CLICK);
        }
      }
      window.addEventListener("message", messageHandler);
      window.addEventListener("pointerup", onpointerupAnywhere);
      let renderInterval = setInterval(() => {
        if(!root) {clearInterval(renderInterval); console.warn('interval cleared, root missing!')};
        renderTabs();
      }, 10000);
      function renderTabs() {
        var ids = 0;
        while (tabsRow.firstChild) tabsRow.removeChild(tabsRow.firstChild);
        leftGroup.appendChild(newTabBtn);

        // tabs
        tabs.forEach((t) => {
          const el = document.createElement("div");
          // inside renderTabs(), after creating el
          el.style.flex = "0 0 auto";
          el.id = "id-" + ids;
          ids++;
          el.draggable = true;
          el.name = "tabs";
          el.style.minWidth = "13.5%"; // or 150–185px if you want a bigger minimum
          el.style.maxWidth = "13.5%";
          el.style.overflow = "hidden";
          el.style.display = "flex";
          el.style.whiteSpace = "nowrap";
          el.tabIndex = "0";

          el.setAttribute("draggable", "true");
          let temptab = 0;
          function countChild(parent, targetElement) {
            const children = parent.children;
            let count = 0;

            for (let i = 0; i < children.length; i++) {
              if (children[i] === targetElement) {
                break; // Stop counting when you reach the target element
              }
              count++;
            }

            return count;
          }
          function moveTabInArray(tabs, fromIndex, toIndex) {
            if (fromIndex === -1 || toIndex === -1 || fromIndex === toIndex)
              return tabs;

            const [moved] = tabs.splice(fromIndex, 1);

            // After removing an earlier element, the target index shifts down by 1
            if (fromIndex < toIndex) toIndex--;

            tabs.splice(toIndex, 0, moved);
            return tabs;
          }
          el.addEventListener("pointerup", function () {
            root.focus();
          });
          el.addEventListener("pointerdown", (ev) => {
            if (ev.target.classList.contains("close")) return;
            activateTab(t.id);
          });
          el.addEventListener("pointerup", function () {
            bringToFront(root);
          });
          el.addEventListener("dragstart", () => {
            dragstartwindow = chromeWindow;
            tabisDragging = true;
            dragMoved = false;
            dragindex = countChild(tabsRow, el);
            draggedtab = tabs[dragindex];
            dragid = el.id;
          });

          el.addEventListener("pointermove", () => {
            if (tabisDragging) dragMoved = true;
          });

          el.addEventListener("pointerup", (e) => {
            if (
              tabisDragging &&
              dragMoved &&
              dragstartwindow === chromeWindow
            ) {
              const draggedelement = root.querySelector(`#${dragid}`);
              if (!draggedelement || draggedelement === el) return;

              // Determine if dragging right
              const isDraggingRight =
                draggedelement.compareDocumentPosition(el) &
                Node.DOCUMENT_POSITION_FOLLOWING;

              // Compute new index BEFORE inserting
              let newIndex = countChild(tabsRow, el);
              if (isDraggingRight) newIndex++; // insert after target

              // Update array first
              tabs = moveTabInArray(tabs, dragindex, newIndex);

              // Then update DOM
              tabsRow.insertBefore(
                draggedelement,
                isDraggingRight ? el.nextSibling : el,
              );
            }
            if (
              tabisDragging &&
              dragMoved &&
              dragstartwindow !== chromeWindow
            ) {
              onpointerupAnywhere(e);
            }

            tabisDragging = false;
            draggedtab = null;

            dragMoved = false;
          });

          const title = el.querySelector(".sim-tab-title");
          if (title) title.style.textOverflow = "ellipsis";
          el.className = "sim-tab" + (t.id === activeTabId ? " active" : "");
          el.title = t.title || "Untitled";
          el.innerHTML = `<span style='display: inline-block;overflow: hidden;white-space: nowrap; text-overflow: ellipsis;' class='sim-tab-title'>${t.title || "Untitled"}</span>
                    <span class='close' title='Close tab'>&times;</span>`;
          // close handler
          el.querySelector(".close").addEventListener("click", (ev) => {
            ev.stopPropagation();
            closeTab(t.id);
          });
          tabsRow.appendChild(el);
          tabsRow.appendChild(newTabBtn);
        });
        // reorder tabs
      }
      window.addEventListener("message", function (e) {
        if (e.data.type === "FROM_IFRAME") {
          addTab(e.data.message, "New Tab");
        }
        else if(e.data.__goldenbodynewWindow__ && root === allBrowsers[e.data.allbrowserindex].rootElement) {
          addTab(e.data.url, "New Tab");
        }
      });
      //render tab end----------------------------------------------------------

      function addTab(url, title, resizeP = preloadsize) {

        const id = "tab-" + ++tabCounter;
        const iframe = document.createElement("iframe");
        if(data.lazyloading) iframe.loading = "lazy";
        iframe.onload = () => {
          try {
            // Try to access its document
            const doc = iframe.contentDocument || iframe.contentWindow.document;
            // let script = document.createElement('script');
            // script.textContent = `
            // const nativePostMessage = window.postMessage;
            // window.postMessage = function(msg, target) {
            //   nativePostMessage.call(window, msg, target);
            // };
            // `;
            // doc.appendChild(sc)
            // If site unreachable, doc will often be null
            if (!doc || doc.body.innerHTML.trim() === "") {
              console.log("Site unreachable or failed to load.");
            } else {
              console.log("Loaded successfully.");
            }
          } catch (e) {
            // Cross-origin frame loaded, but we can’t read its contents.
            console.log(
              "Loaded, but cannot access due to cross-origin restrictions.",
            );
          }
        };
        iframe.addEventListener("load", function () {
            if (!iframe.contentWindow.eruda) {
                const script = iframe.contentDocument.createElement("script");
                script.src = "https://cdn.jsdelivr.net/npm/eruda";
                script.onload = () => {
                  iframe.contentWindow.eruda.init();
                  iframe.contentWindow.eruda.get("entryBtn").hide();
                };
                iframe.contentDocument.head.appendChild(script);
              }
          tab.iframe.contentWindow.postMessage(
            {
              message: "GOLDENBODY_id",
              website: goldenbodywebsite,
              value: data.id,
              dark: data.dark
            },
            "*",
          );
          function handleresize(e, tab) {
            try {
              if (e.ctrlKey && (e.key === "=" || e.key === "+")) {
                e.preventDefault();
                tab.resizeP += 5;
                if (tab.resizeP > 500) tab.resizeP = 500;
                resizeDiv.style.display = "block";
                let resizescript = document.createElement("script");
                resizescript.textContent = `document.body.style.zoom = ${tab.resizeP} + '%' || '100%'; // shrink page inside iframe`;
                tab.iframe.contentDocument.head.appendChild(resizescript);
              } else if (e.ctrlKey && e.key === "-") {
                e.preventDefault();
                tab.resizeP -= 5;
                if (tab.resizeP < 25) tab.resizeP = 25;
                resizeDiv.style.display = "block";
                let resizescript = document.createElement("script");
                resizescript.textContent = `document.body.style.zoom = ${tab.resizeP} + '%' || '100%'; // shrink page inside iframe`;
                tab.iframe.contentDocument.head.appendChild(resizescript);
              } else {
                resizeDiv.style.display = "none";
              }
            } catch (e) {}
          }
          function handleresizel1(e) {
            handleresize(e, tab);
          }

          tab.iframe.contentWindow.addEventListener("keydown", handleresizel1);
          root.addEventListener("keydown", handleresizel1);
          urlInput.value = unshuffleURL(iframe.contentWindow.location.href);
          let resizescript = document.createElement("script");
          resizescript.textContent = `document.body.style.zoom = ${tab.resizeP} + '%' || '100%'; // shrink page inside iframe`;
          tab.iframe.contentDocument.head.appendChild(resizescript);
          // let sfc = tab.iframe.contentDocument.createElement("script");
          // sfc.src = goldenbodywebsite + "sfc__o.js";
          // tab.iframe.contentDocument.head.prepend(sfc);
          var script = tab.iframe.contentDocument.createElement("script");
          script.textContent = `setInterval(function(){var _goldenbody = document.getElementsByTagName('a'); for(let i = 0; i < _goldenbody.length; i++) {_goldenbody[i].target="_self";} },2000*${nhjd}); function callParent(url) {
  window.parent.postMessage(
    { type: "FROM_IFRAME", message: url },
    "*"
  );
}

`;
          tab.iframe.contentDocument.head.appendChild(script);
        });
        iframe.addEventListener("load", function onLoad() {
          const doc = iframe.contentDocument;
          const win = iframe.contentWindow;

          // Skip if unloaded or invalid
          if (!doc || !win) return;

          // Remove old handler if exists
          win.removeEventListener("keydown", win.erudaKeyHandler);

          // Define new handler
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

          // Attach handler
          win.addEventListener("keydown", win.erudaKeyHandler);
        });
        const titleInterval = setInterval(() => {
          try {
            if (!iframe || !iframe.contentDocument) {
              clearInterval(titleInterval);
              console.warn("Interval cleared: iframe is gone");
              return;
            }
            tab.url = unshuffleURL(iframe.contentWindow.location.href);
            if (
              iframe.contentDocument.readyState === "complete" &&
              !tab.donotm
            ) {
              const docTitle = iframe.contentDocument.title || "Untitled";
              tab.title = docTitle;
            } else {
              tab.title = "Loading...";
            }
          } catch (e) {
            clearInterval(titleInterval);
            console.warn("Interval cleared due to error:", e);
          }
          if (previousTabTitle !== tab.title) renderTabs();
          previousTabTitle = tab.title;
        }, 1000 * nhjd);


        createPermInput(iframe, url);
        iframe.tabIndex = "0";
        iframe.className = "sim-iframe";
        iframe.onload = function () {
          // Get the document inside the iframe
          const iframeDocument =
            iframe.contentDocument || iframe.contentWindow.document;
          iframe.contentWindow.addEventListener("keydown", function (e) {
            if (e.ctrlKey && e.key === "n") {
              e.preventDefault();
              if (atTop == "browser" || atTop == "") {
                browser();
              }
            } else if (
              e.ctrlKey &&
              e.shiftKey &&
              e.key === "W" &&
              atTop == "browser"
            ) {
              let allIds = [];
              for (let i = 0; i < allBrowsers.length; i++) {
                allIds.push(allBrowsers[i].rootElement._goldenbodyId);
              }
              let maxId = Math.max(...allIds);
              for (let i = 0; i < allBrowsers.length; i++) {
                if (allBrowsers[i].rootElement._goldenbodyId == maxId) {
                  allBrowsers[i].rootElement.remove();
                  allBrowsers[i].rootElement = null;
                  allBrowsers.splice(i, 1);
                }
              }
            } else if (e.ctrlKey && e.key === "t") {
              e.preventDefault();

              addTab("goldenbody://newtab/", "New Tab");
            }
          });

          // Create a reusable custom context menu
          const menu = iframeDocument.createElement("div");
          menu.style.all = "unset";

          menu.id = "custom-context-menu";
          menu.style.display = "block"; // <-- important!

          menu.style.position = "fixed";
          menu.style.background = "#222";
          menu.style.color = "#fff";
          menu.style.padding = "8px 0";
          menu.style.borderRadius = "6px";
          menu.style.boxShadow = "0 2px 10px rgba(0,0,0,0.3)";
          menu.style.fontFamily = "sans-serif";
          menu.style.fontSize = "14px";
          menu.style.display = "none";
          menu.style.zIndex = "9999";
          iframeDocument.body.appendChild(menu);

          // window.addEventListener("pointerdown", function () {
          //   menu.style.display = "none";
          // });
          // Function to show the menu
          function showMenu(x, y, linkElement, isA) {
            if (isA) {
              menu.innerHTML = ""; // clear old items

              // Create menu items (same as before)

              const openItem = iframeDocument.createElement("div");
              openItem.style.all = "unset";

              openItem.textContent = "Open link in new tabㅤㅤㅤㅤㅤ";
              openItem.style.display = "block"; // <-- important!
              openItem.style.textAlign = "left";

              openItem.style.padding = "6px 16px";
              openItem.style.cursor = "pointer";
              openItem.onmouseenter = () =>
                (openItem.style.background = "#444");
              openItem.style.font = "Arial";
              openItem.onmouseleave = () =>
                (openItem.style.background = "none");
              openItem.onclick = () => {
                addTab(linkElement.href, "New Tab");
                hideMenu();
              };
              menu.appendChild(openItem);

              const openItem2 = iframeDocument.createElement("div");
              openItem2.style.all = "unset";

              openItem2.textContent = "Open link in new windowㅤㅤㅤㅤㅤ";
              openItem2.style.display = "block"; // <-- important!
              openItem2.style.textAlign = "left";

              openItem2.style.padding = "6px 16px";
              openItem2.style.cursor = "pointer";
              openItem2.onmouseenter = () =>
                (openItem2.style.background = "#444");
              openItem2.style.font = "Arial";
              openItem2.onmouseleave = () =>
                (openItem2.style.background = "none");
              openItem2.onclick = () => {
                browser(linkElement.href);
                hideMenu();
              };
              menu.appendChild(openItem2);

              const copyItem = iframeDocument.createElement("div");
              copyItem.style.all = "unset";
              copyItem.style.display = "block"; // <-- important!
              copyItem.style.textAlign = "left";

              copyItem.textContent = "Copy link address";
              copyItem.style.padding = "6px 16px";
              copyItem.style.cursor = "pointer";
              copyItem.style.font = "Arial";
              copyItem.onmouseenter = () =>
                (copyItem.style.background = "#444");
              copyItem.onmouseleave = () =>
                (copyItem.style.background = "none");
              copyItem.onclick = async () => {
                await navigator.clipboard.writeText(linkElement.href);
                hideMenu();
              };
              menu.appendChild(copyItem);

              const inspect = iframeDocument.createElement("div");
              inspect.style.all = "unset";
              inspect.style.display = "block"; // <-- important!
              inspect.style.textAlign = "left";

              inspect.textContent = "inspect ㅤㅤㅤㅤㅤㅤㅤㅤCtrl+Shift+I";
              inspect.style.padding = "6px 16px";
              inspect.style.font = "Arial";
              inspect.style.cursor = "pointer";
              inspect.onmouseenter = () => (inspect.style.background = "#444");
              inspect.onmouseleave = () => (inspect.style.background = "none");
              inspect.onclick = () => {
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
                }
                win.eruda[win._goldenbodyIns ? "hide" : "show"]();
                win._goldenbodyIns = !win._goldenbodyIns;

                hideMenu();
              };
              menu.appendChild(inspect);
              // Temporarily show the menu off-screen to measure its size
              menu.style.left = "-9999px";
              menu.style.top = "-9999px";
              menu.style.display = "block";
              const menuRect = menu.getBoundingClientRect();

              // Determine iframe/document boundaries
              const viewportWidth = iframeDocument.documentElement.clientWidth;
              const viewportHeight =
                iframeDocument.documentElement.clientHeight;

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
            } else {
              menu.innerHTML = "";
              menu.style.display = "block";
              const openItem = iframeDocument.createElement("div");
              openItem.style.all = "unset";
              openItem.style.display = "block"; // <-- important!

              openItem.textContent = "Backㅤㅤㅤㅤㅤㅤㅤㅤㅤㅤㅤ";
              openItem.style.padding = "6px 16px";
              openItem.style.textAlign = "left";

              openItem.style.font = "Arial";
              openItem.style.cursor = "pointer";
              openItem.onmouseenter = () =>
                (openItem.style.background = "#444");
              openItem.onmouseleave = () =>
                (openItem.style.background = "none");
              openItem.onclick = () => {
                iframe.contentWindow.history.back();
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
                iframe.contentWindow.history.forward();
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
                iframe.contentWindow.location.reload();
                hideMenu();
              };
              menu.appendChild(reload);
              const inspect = iframeDocument.createElement("div");
              inspect.style.all = "unset";
              inspect.style.display = "block"; // <-- important!

              inspect.style.textAlign = "left";

              inspect.textContent = "inspect ㅤㅤㅤㅤㅤㅤㅤㅤCtrl+Shift+I";
              inspect.style.padding = "6px 16px";
              inspect.style.font = "Arial";
              inspect.style.cursor = "pointer";
              inspect.onmouseenter = () => (inspect.style.background = "#444");
              inspect.onmouseleave = () => (inspect.style.background = "none");
              inspect.onclick = () => {
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
                }
                win.eruda[win._goldenbodyIns ? "hide" : "show"]();
                win._goldenbodyIns = !win._goldenbodyIns;

                hideMenu();
              };
              menu.appendChild(inspect);

              // Temporarily show the menu off-screen to measure its size
              menu.style.left = "-9999px";
              menu.style.top = "-9999px";
              menu.style.display = "block";
              const menuRect = menu.getBoundingClientRect();

              // Determine iframe/document boundaries
              const viewportWidth = iframeDocument.documentElement.clientWidth;
              const viewportHeight =
                iframeDocument.documentElement.clientHeight;

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
          }
          console.log("keydown handler attached");
          root.addEventListener("keydown", (e) => {
            if (e.ctrlKey && e.shiftKey && e.key.toLowerCase() === "i") {
              console.log("fired!");
            }
          });

          // Hide the menu
          function hideMenu() {
            menu.style.display = "none";
          }

          // Listen for right-clicks inside the iframe

          iframe.contentWindow.addEventListener("contextmenu", function (e) {
            // Check if the element or document already has a handler
            const hasInlineHandler = e.target.oncontextmenu !== null;

            // If some other handler already called preventDefault, skip
            if (hasInlineHandler && e.defaultPrevented) {
              return; // Let the site's menu show or browser default
            }

            e.preventDefault();
            e.stopPropagation();
            const clickedElement = e.target;
            const linkElement = clickedElement.closest("a");

            if (linkElement && linkElement.href) {
              console.log("Right-clicked on a link:", linkElement.href);
              showMenu(e.clientX, e.clientY, linkElement, true);
            } else {
              showMenu(e.clientX, e.clientY, null, false);
              console.log("Right-clicked on a non-link element.");
            }
          });

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
          // 1. Make treeData global
          // ----------------------------
            let sentreqframe;




          loadTree();




          let fullPath;
          // Fetch file content from backend
async function fetchFileContent(username, fileFullPath) {
  if (!fileFullPath) throw new Error("No file path provided");

  const res = await fetch(SERVER, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      requestFile: true,
      requestFileName: fileFullPath, // send path relative to root
      username,
    }),
  });

  const data = await res.json();

  if (data.kind === 'folder') {
    throw new Error(`Expected a file but got a folder at ${fileFullPath}`);
  }

  // For large files, fetch all chunks and combine directly as ArrayBuffer
  if (data.totalChunks && data.totalChunks > 1) {
    // Return chunk metadata and first-chunk payload (base64) to caller so
    // caller can stream chunks instead of allocating a single huge buffer.
    return data; // { filecontent, fileSize, totalChunks }
  }

  // For small files, still return base64 from single request
  return data.filecontent;
}


          function base64ToArrayBuffer(base64) {
            const binaryString = atob(base64);
            const len = binaryString.length;
            const bytes = new Uint8Array(len);
            for (let i = 0; i < len; i++) {
              bytes[i] = binaryString.charCodeAt(i);
            }
            return bytes.buffer;
          }
          function getMimeType(filename) {
            const ext = filename.split(".").pop().toLowerCase();

            const mimeMap = {
              // Images
              png: "image/png",
              jpg: "image/jpeg",
              jpeg: "image/jpeg",
              gif: "image/gif",
              webp: "image/webp",
              svg: "image/svg+xml",
              bmp: "image/bmp",
              ico: "image/x-icon",

              // Audio
              mp3: "audio/mpeg",
              wav: "audio/wav",
              ogg: "audio/ogg",
              m4a: "audio/mp4",

              // Video
              mp4: "video/mp4",
              webm: "video/webm",
              ogv: "video/ogg",

              // Text
              txt: "text/plain",
              html: "text/html",
              css: "text/css",
              js: "application/javascript",
              json: "application/json",
              xml: "application/xml",

              // Archives
              zip: "application/zip",
              rar: "application/vnd.rar",
              gz: "application/gzip",

              // PDF
              pdf: "application/pdf",
            };

            return mimeMap[ext] || "application/octet-stream";
          }

          // Send file to iframe
async function sendFileNodeToIframe(username, node, iframe, lastOne=false) {
    let currentPath = [...pickerCurrentPath];
    currentPath.splice(0, 1);
  const fullPath = node[2].path || currentPath.join('/') + '/' + node[0];
  const result = await fetchFileContent(username, fullPath);

  // If server returned chunk metadata for a large file, stream chunks
  const isChunked = result && typeof result === 'object' && result.totalChunks && result.totalChunks > 1;
  // Handle both base64 strings and ArrayBuffers (small-file fast path)
  const buffer = !isChunked && typeof result === 'string' ? base64ToArrayBuffer(result) : (!isChunked ? result : null);
  const type = getMimeType(node[0]);
  // Compute a webkitRelativePath-like relative path for the file so the
  // injector can reconstruct directory structure (remove picker base)
  const fileParts = (fullPath || '').split('/').filter(Boolean);
  const origPicker = Array.from(pickerCurrentPath || []);
  const pickerBase = origPicker.slice(1); // drop leading 'root'
  // remove matching leading segments
  let relParts = Array.from(fileParts);
  for (let i = 0; i < pickerBase.length; i++) {
    if (relParts.length && relParts[0] === pickerBase[i]) relParts.shift();
    else break;
  }
  const webkitRelativePath = relParts.join('/') || node[0];

  // Send in chunks if large to avoid postMessage size limits
  // Use larger chunks to reduce number of messages, add delays between sends
  const MAX_MESSAGE_SIZE = 50 * 1024 * 1024; // 50MB per message (reduced from 100MB)
  if (isChunked) {
    const CHUNK_SIZE = 10 * 1024 * 1024; // server chunk size
    const totalChunks = result.totalChunks;

    for (let i = 0; i < totalChunks; i++) {
      // obtain chunk: first chunk provided inline as base64, others fetched
      let chunkBuf;
      if (i === 0) {
        chunkBuf = base64ToArrayBuffer(result.filecontent);
      } else {
        const r = await fetch(SERVER, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ requestFile: true, requestFileName: fullPath, chunkIndex: i, username }),
        });
        const chunkData = await r.json();
        chunkBuf = base64ToArrayBuffer(chunkData.filecontent);
      }

      await new Promise(resolve => {
        iframe.contentWindow.postMessage({
          __VFS__: true,
          kind: 'file',
          name: node[0],
          type,
          buffer: chunkBuf,
          path: fullPath,
          webkitRelativePath,
          chunkIndex: i,
          totalChunks,
          lastOne: (i === totalChunks - 1) && lastOne,
        }, '*', [chunkBuf]);
        setTimeout(resolve, 10);
      });
    }
  } else {
    if (buffer && buffer.byteLength > MAX_MESSAGE_SIZE) {
      const chunkSize = MAX_MESSAGE_SIZE;
      const totalChunks = Math.ceil(buffer.byteLength / chunkSize);
      for (let i = 0; i < totalChunks; i++) {
        const start = i * chunkSize;
        const end = Math.min(start + chunkSize, buffer.byteLength);
        const chunk = buffer.slice(start, end);
        await new Promise(resolve => {
          iframe.contentWindow.postMessage({ __VFS__: true, kind: 'file', name: node[0], type, buffer: chunk, path: fullPath, webkitRelativePath, chunkIndex: i, totalChunks, lastOne: (i === totalChunks - 1) && lastOne }, '*', [chunk]);
          setTimeout(resolve, 10);
        });
      }
    } else {
      iframe.contentWindow.postMessage({ __VFS__: true, kind: 'file', name: node[0], type, buffer, path: fullPath, webkitRelativePath, lastOne: lastOne }, '*', [buffer]);
    }
  }
}

async function sendFolderNodeToIframe(username, folderNode, iframe, lastOne = false) {
  const filesToSend = [];

function walk(node, prefix = '') {
  const [name, children] = node;

  // If node has a precomputed path use it; otherwise build from prefix
  let nodePath;
  if (node && node[2] && node[2].path) {
    nodePath = node[2].path;
  } else {
    nodePath = (prefix ? (prefix + '/' + name) : name);
    console.warn('VFS: computed missing node.path for', name, '->', nodePath);
  }

  if (children === null) {
    filesToSend.push({
      name,
      fullPath: nodePath
    });
    return;
  }

  if (Array.isArray(children)) {
    const nextPrefix = nodePath;
    for (const child of children) {
      walk(child, nextPrefix);
    }
  }
}

  walk(folderNode);
let fileIndex = 0;
  // 2️⃣ Fetch + send each file with throttling to prevent packet loss
  for (const file of filesToSend) {
    fileIndex++;
    const result = await fetchFileContent(username, file.fullPath);
    const isChunked = result && typeof result === 'object' && result.totalChunks && result.totalChunks > 1;
    const buffer = !isChunked && typeof result === 'string' ? base64ToArrayBuffer(result) : (!isChunked ? result : null);
    const type = getMimeType(file.name);
    let fileParts = file.fullPath.split('/');
    let origpickercurrentpath = Array.from(pickerCurrentPath);
    pickerCurrentPath.splice(0, 1);
    let pickerparts = pickerCurrentPath;
    pickerCurrentPath = origpickercurrentpath;
    for(let j = 0; j < pickerparts.length; j++) {
      if(fileParts[0] === pickerparts[j]) {
        fileParts.splice(0, 1);
      }
    }
    file.fullPath = '';
    let first = true;
    for(let j = 0; j < fileParts.length; j++) {
      if(first) {first = false; file.fullPath += fileParts[j];} else{file.fullPath += '/' + fileParts[j];}
    }
    
    if (isChunked) {
      const totalChunks = result.totalChunks;
      for (let ci = 0; ci < totalChunks; ci++) {
        let chunkBuf;
        if (ci === 0) chunkBuf = base64ToArrayBuffer(result.filecontent);
        else {
          const r = await fetch(SERVER, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ requestFile: true, requestFileName: file.fullPath, chunkIndex: ci, username }) });
          const cd = await r.json();
          chunkBuf = base64ToArrayBuffer(cd.filecontent);
        }
        await new Promise(resolve => {
          iframe.contentWindow.postMessage({ __VFS__: true, kind: 'file', name: file.name, type, buffer: chunkBuf, webkitRelativePath: file.fullPath, fileIndex: fileIndex - 1, totalFiles: filesToSend.length, chunkIndex: ci, totalChunks, lastOne: (fileIndex == filesToSend.length) && (ci === totalChunks - 1) && lastOne }, '*', [chunkBuf]);
          setTimeout(resolve, 10);
        });
      }
    } else {
      // Add delay between messages to prevent packet loss
      await new Promise(resolve => {
        iframe.contentWindow.postMessage({ __VFS__: true, kind: 'file', name: file.name, type, buffer, webkitRelativePath: file.fullPath, fileIndex: fileIndex - 1, totalFiles: filesToSend.length, lastOne: (fileIndex == filesToSend.length) && lastOne }, '*', [buffer]);
        setTimeout(resolve, 10);
      });
    }
  }
}


          // ----------------------------
          // 3. Custom picker overlay
          // ----------------------------
          let pickerOverlay = null;
let pickerSelection = [];
          let pickerCurrentPath = ["root"];
          let pickerTree = null;

          function openCustomPickerUI() {
            if (!window.treeData) {window.loadTree();}

            pickerTree = JSON.parse(JSON.stringify(window.treeData));
            pickerCurrentPath = ["root"];
            pickerSelection = [];

            // Create overlay if it doesn't exist
            if (!pickerOverlay) {
              pickerOverlay = document.createElement("div");
              Object.assign(pickerOverlay.style, {
                position: "fixed",
                top: "0",
                left: "0",
                right: "0",
                bottom: "0",
                background: "rgba(0,0,0,0.4)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                zIndex: 9999,
              });
              document.body.appendChild(pickerOverlay);

              const pickerBox = document.createElement("div");
              pickerBox.className = 'pickerBox';
              Object.assign(pickerBox.style, {
                width: "600px",
                height: "400px",
                borderRadius: "8px",
                background: data.dark ? '#222' : '#fff',
                display: "flex",
                flexDirection: "column",
                overflow: "hidden",
              });
              pickerOverlay.appendChild(pickerBox);
              root.tabIndex = '0';

              const breadcrumbDiv = document.createElement("div");
              breadcrumbDiv.style.padding = "4px";
              pickerBox.appendChild(breadcrumbDiv);

              const fileArea = document.createElement("div");
              fileArea.style.flex = "1";
              fileArea.style.overflowY = "auto";
              fileArea.style.borderTop = "1px solid #ccc";
              pickerBox.appendChild(fileArea);

              const btnBar = document.createElement("div");
              btnBar.style.padding = "4px";
              btnBar.style.display = "flex";
              btnBar.style.justifyContent = "flex-end";
              pickerBox.appendChild(btnBar);

              const btnCancel = document.createElement("button");
              btnCancel.textContent = "Cancel";
              btnBar.appendChild(btnCancel);

              const btnOpen = document.createElement("button");
              btnOpen.textContent = "Open";
              btnBar.appendChild(btnOpen);

              function renderPicker() {
                breadcrumbDiv.innerHTML = "";
                pickerCurrentPath.forEach((p, i) => {
                  const span = document.createElement("span");
                  span.textContent = i === 0 ? "Home" : " / " + p;
                  span.style.cursor = "pointer";
                  span.onclick = () => {
                    pickerCurrentPath = pickerCurrentPath.slice(0, i + 1);
                    renderPicker();
                  };
                  breadcrumbDiv.appendChild(span);
                });

                fileArea.innerHTML = "";
                let node = pickerTree;
                for (let i = 1; i < pickerCurrentPath.length; i++) {
                  node = node[1].find((c) => c[0] === pickerCurrentPath[i]);
                }
                if (!node || !node[1]) return;

                node[1].forEach((item) => {
                  const div = document.createElement("div");
                  div.textContent =
                    (Array.isArray(item[1]) ? "📁 " : "📄 ") + item[0];
                  div.style.padding = "4px";
                  div.style.cursor = "pointer";
div.onclick = (e) => {
  const isToggle = e.ctrlKey || e.metaKey;

  if (!isToggle) {
    // single select
    pickerSelection = [item];
    fileArea.querySelectorAll("div")
      .forEach(d => (d.style.background = ""));
    div.style.background = "#d0e6ff";
  } else {
    // toggle select
    const idx = pickerSelection.indexOf(item);
    if (idx >= 0) {
      pickerSelection.splice(idx, 1);
      div.style.background = "";
    } else {
      pickerSelection.push(item);
      div.style.background = "#d0e6ff";
    }
  }
};

                  if (Array.isArray(item[1])) {
                    div.ondblclick = () => {
                      pickerCurrentPath.push(item[0]);
                      renderPicker();
                    };
                  }
                  fileArea.appendChild(div);
                });
              }

              renderPicker();

              // Cancel / Open buttons
              let resolvePicker;
              pickerOverlay.resolvePicker = null;

              pickerOverlay.resolvePicker = null; // define it at the start

              btnCancel.onclick = () => {
                if (pickerOverlay.resolvePicker) {
                  pickerOverlay.resolvePicker([]); // resolve promise with empty selection
                  pickerOverlay.resolvePicker = null;
                }
                pickerOverlay.remove();
                pickerOverlay = null;
                pickerSelection = null;
              };
btnOpen.onclick = async () => {
  const selections = [...pickerSelection]; // snapshot immediately
  const targetFrame = sentreqframe;        // snapshot iframe

  if (!selections.length) return notification("Select a file or folder");
  if (!targetFrame) {
    console.warn("No iframe found");
    return;
  }

  // remove picker
  if (pickerOverlay.resolvePicker) {
    pickerOverlay.resolvePicker(selections);
    pickerOverlay.resolvePicker = null;
  }
  pickerOverlay.remove();
  pickerOverlay = null;
  pickerSelection = [];

  // send all selections
  let i = 0;
  for (const sel of selections) {
    i++;
    if (Array.isArray(sel[1])) {
      if(i == selections.length) {await sendFolderNodeToIframe(username, sel, targetFrame, true); continue;}
      await sendFolderNodeToIframe(username, sel, targetFrame);
    } else {
      if(i == selections.length) {await sendFileNodeToIframe(username, sel, targetFrame, true); continue;}
      await sendFileNodeToIframe(username, sel, targetFrame);
    }
  }
};

            } else {
              pickerOverlay.style.display = "flex";
            }

            return new Promise((res) => (pickerOverlay.resolvePicker = res));
          }

          // ----------------------------
          // 3b. Custom save-as overlay
          // ----------------------------
          let post = filePost;
          function openCustomSaveUI() {
            if (!window.treeData) { window.loadTree(); }

            const savePickerTree = JSON.parse(JSON.stringify(window.treeData || {}));
            let savePickerCurrentPath = ["root"];
            let savePickerSelection = [];

            const overlay = document.createElement('div');
            Object.assign(overlay.style, {
              position: 'fixed', top: '0', left: '0', right: '0', bottom: '0',
              background: 'rgba(0,0,0,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999
            });
            document.body.appendChild(overlay);

            const box = document.createElement('div');
            Object.assign(box.style, { width: '600px', height: '460px', borderRadius: '8px', background: data.dark ? '#222' : '#fff', display: 'flex', flexDirection: 'column', overflow: 'hidden' });
            overlay.appendChild(box);

            const breadcrumb = document.createElement('div'); breadcrumb.style.padding = '6px'; box.appendChild(breadcrumb);
            const fileArea = document.createElement('div'); fileArea.style.flex = '1'; fileArea.style.overflowY = 'auto'; fileArea.style.borderTop = '1px solid #ccc'; box.appendChild(fileArea);

            const row = document.createElement('div'); row.style.padding = '8px'; row.style.display = 'flex'; row.style.gap = '8px'; box.appendChild(row);
            const nameInput = document.createElement('input'); Object.assign(nameInput.style, {flex: '1', padding: '6px'}); nameInput.placeholder = 'filename.txt'; row.appendChild(nameInput);

            const btnBar = document.createElement('div'); btnBar.style.padding = '6px'; btnBar.style.display = 'flex'; btnBar.style.justifyContent = 'flex-end'; box.appendChild(btnBar);
            const btnCancel = document.createElement('button'); btnCancel.textContent = 'Cancel'; btnBar.appendChild(btnCancel);
            const btnSave = document.createElement('button'); btnSave.textContent = 'Save'; btnBar.appendChild(btnSave);

            function render() {
              breadcrumb.innerHTML = '';
              savePickerCurrentPath.forEach((p, i) => { const s = document.createElement('span'); s.textContent = i===0 ? 'Home' : ' / ' + p; s.style.cursor = 'pointer'; s.onclick = () => { savePickerCurrentPath = savePickerCurrentPath.slice(0, i+1); render(); }; breadcrumb.appendChild(s); });
              fileArea.innerHTML = '';
              let node = savePickerTree;
              for (let i = 1; i < savePickerCurrentPath.length; i++) { if (!node || !node[1]) break; node = node[1].find(c=>c[0]===savePickerCurrentPath[i]); }
              if (!node || !node[1]) return;
              node[1].forEach(item => {
                const div = document.createElement('div'); div.textContent = (Array.isArray(item[1]) ? '📁 ' : '📄 ') + item[0]; div.style.padding = '6px'; div.style.cursor='pointer';
                div.onclick = (e) => { const isToggle = e.ctrlKey || e.metaKey; if (!isToggle) { savePickerSelection = [item]; fileArea.querySelectorAll('div').forEach(d=>d.style.background=''); div.style.background='#d0e6ff'; } else { const idx = savePickerSelection.indexOf(item); if (idx>=0){ savePickerSelection.splice(idx,1); div.style.background=''; } else { savePickerSelection.push(item); div.style.background='#d0e6ff'; } } };
                if (Array.isArray(item[1])) div.ondblclick = () => { savePickerCurrentPath.push(item[0]); render(); };
                fileArea.appendChild(div);
              });
            }

            render();

            btnCancel.onclick = () => { overlay.remove(); };

            btnSave.onclick = () => {
              const selections = [...savePickerSelection];
              const basePath = savePickerCurrentPath.slice(1).join('/');
              const fname = (nameInput.value || '').trim();
              if (!fname) { notification('Enter a filename'); return; }
              let chosen;
              if (!selections.length) chosen = basePath ? (basePath + '/' + fname) : fname;
              else {
                const sel = selections[0];
                const isFolder = Array.isArray(sel[1]);
                if (isFolder) chosen = (basePath ? basePath + '/' : '') + fname;
                else notification('Select a folder to save into');
              }

              // send response to requesting iframe
              try {
                if (sentreqframe && sentreqframe.contentWindow) {
                  sentreqframe.contentWindow.postMessage({ __VFS__: true, kind: 'saveTarget', path: chosen }, '*');
                }
              } catch (e) {}

              overlay.remove();
            };
          }

          // ----------------------------
          // 3c. Custom directory picker overlay
          // ----------------------------
          function openCustomDirectoryPickerUI() {
            if (!window.treeData) { window.loadTree(); }

            const dirPickerTree = JSON.parse(JSON.stringify(window.treeData || {}));
            let dirPickerCurrentPath = ["root"];
            let dirPickerSelection = [];

            const overlay = document.createElement('div');
            Object.assign(overlay.style, {
              position: 'fixed', top: '0', left: '0', right: '0', bottom: '0',
              background: 'rgba(0,0,0,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999
            });
            document.body.appendChild(overlay);

            const box = document.createElement('div');
            Object.assign(box.style, { width: '600px', height: '420px', borderRadius: '8px', background: data.dark ? '#222' : '#fff', display: 'flex', flexDirection: 'column', overflow: 'hidden' });
            overlay.appendChild(box);

            const breadcrumb = document.createElement('div'); breadcrumb.style.padding = '6px'; box.appendChild(breadcrumb);
            const fileArea = document.createElement('div'); fileArea.style.flex = '1'; fileArea.style.overflowY = 'auto'; fileArea.style.borderTop = '1px solid #ccc'; box.appendChild(fileArea);
            
            const infoRow = document.createElement('div'); infoRow.style.padding = '6px'; infoRow.style.fontSize = '12px'; infoRow.style.color = '#666'; infoRow.textContent = 'Select a folder'; box.appendChild(infoRow);

            const btnBar = document.createElement('div'); btnBar.style.padding = '6px'; btnBar.style.display = 'flex'; btnBar.style.justifyContent = 'flex-end'; box.appendChild(btnBar);
            const btnCancel = document.createElement('button'); btnCancel.textContent = 'Cancel'; btnBar.appendChild(btnCancel);
            const btnOpen = document.createElement('button'); btnOpen.textContent = 'Select'; btnBar.appendChild(btnOpen);

            function render() {
              breadcrumb.innerHTML = '';
              dirPickerCurrentPath.forEach((p, i) => { const s = document.createElement('span'); s.textContent = i===0 ? 'Home' : ' / ' + p; s.style.cursor = 'pointer'; s.onclick = () => { dirPickerCurrentPath = dirPickerCurrentPath.slice(0, i+1); render(); }; breadcrumb.appendChild(s); });
              fileArea.innerHTML = '';
              let node = dirPickerTree;
              for (let i = 1; i < dirPickerCurrentPath.length; i++) { if (!node || !node[1]) break; node = node[1].find(c=>c[0]===dirPickerCurrentPath[i]); }
              if (!node || !node[1]) return;
              node[1].forEach(item => {
                const isFolder = Array.isArray(item[1]);
                const div = document.createElement('div'); 
                div.textContent = (isFolder ? '📁 ' : '📄 ') + item[0]; 
                div.style.padding = '6px'; 
                div.style.cursor='pointer';
                div.onclick = (e) => { 
                  // Only allow selecting folders
                  if (isFolder) {
                    const isToggle = e.ctrlKey || e.metaKey;
                    if (!isToggle) { 
                      dirPickerSelection = [item]; 
                      fileArea.querySelectorAll('div').forEach(d=>d.style.background=''); 
                      div.style.background='#d0e6ff'; 
                    } else { 
                      const idx = dirPickerSelection.indexOf(item); 
                      if (idx>=0){ 
                        dirPickerSelection.splice(idx,1); 
                        div.style.background=''; 
                      } else { 
                        dirPickerSelection.push(item); 
                        div.style.background='#d0e6ff'; 
                      } 
                    } 
                  }
                };
                if (isFolder) {
                  div.ondblclick = () => { dirPickerCurrentPath.push(item[0]); render(); };
                }
                fileArea.appendChild(div);
              });
            }

            render();

            btnCancel.onclick = () => { overlay.remove(); };

btnOpen.onclick = () => {
  const basePath = dirPickerCurrentPath.slice(1).join('/') || 'root';
  let chosen;

  if (dirPickerSelection.length > 0) {
    const sel = dirPickerSelection[0];
    if (Array.isArray(sel[1])) {
      chosen = (basePath !== 'root' ? basePath + '/' : '') + sel[0];
    } else {
      notification('Please select a directory');
      return;
    }
  } else {
    chosen = basePath;
  }

  // Find the actual tree node for the selected path
  let selectedNode = dirPickerTree;
  const pathParts = chosen.split('/').filter(p => p && p !== 'root');
  for (const part of pathParts) {
    if (!selectedNode || !selectedNode[1]) break;
    selectedNode = selectedNode[1].find(c => c[0] === part);
  }

  if (!selectedNode) {
    notification('Selected directory not found');
    return;
  }

  // --- NEW: recursively gather files in the directory ---
  function collectFiles(node, currentPath) {
    const files = [];
    if (!node || !Array.isArray(node[1])) return files;
    for (const item of node[1]) {
      const [name, child] = item;
      const itemPath = currentPath ? currentPath + '/' + name : name;
      if (Array.isArray(child)) {
        // folder → recurse
        files.push(...collectFiles(item, itemPath));
      } else {
        // file → add as base64 string (or empty placeholder if contents not loaded)
        files.push({ path: itemPath, contents: child || '' });
      }
    }
    return files;
  }

const filesToSend = collectFiles(selectedNode, chosen);

// send directory info
if (sentreqframe && sentreqframe.contentWindow) {
  sentreqframe.contentWindow.postMessage({
    __VFS__: true,
    kind: 'directoryTarget',
    path: chosen,
    treeNode: selectedNode
  }, '*');

  // send each file as fileData
  for (const f of filesToSend) {
    const buffer = f.contents instanceof ArrayBuffer 
      ? f.contents 
      : new TextEncoder().encode(f.contents).buffer; // convert string to ArrayBuffer

    sentreqframe.contentWindow.postMessage({
      __VFS__: true,
      kind: 'fileData',
      path: f.path,
      name: f.path.split('/').pop(),
      type: 'text/plain',
      buffer
    }, '*');
  }
}

  overlay.remove();
};

          }

          // ----------------------------
          // 4. Listen for iframe requests
          // ----------------------------

          if (!root.__vfsMessageListenerAdded) {
            root.__vfsMessageListenerAdded = true;
        root.addEventListener("keydown", function (e) {
          if (e.ctrlKey && e.key === "w") {
            for(const tab of tabs) {
              if (tab.iframe.style.display !== "none") {
                closeTab(tab.id);
              }
            }
          }
        });
        root.focus();
            window.addEventListener("message", (e) => {
              try {
                // Allow `saveFile` messages to be processed even when the browser root
                // doesn't have focus. Previously the OR made the whole condition true
                // whenever a saveFile arrived, causing the handler to return early.
                const isSaveFile = (e.data?.__VFS__ && e.data.kind === "saveFile");
                if ((!root || !root.contains(document.activeElement)) && !isSaveFile) return;
              } catch (e) { return; }
              if (e.data?.__VFS__ && e.data.kind === "requestPicker") {
                openCustomPickerUI();
                sentreqframe = recurseFrames(document, e);
              }
              if (e.data?.__VFS__ && e.data.kind === "requestSavePicker") {
                // open save-as UI and record requesting frame
                openCustomSaveUI();
                sentreqframe = recurseFrames(document, e);
              }
              if (e.data?.__VFS__ && e.data.kind === "requestDirectoryPicker") {
                // open directory picker UI and record requesting frame
                openCustomDirectoryPickerUI();
                sentreqframe = recurseFrames(document, e);
              }
              if (e.data?.__VFS__ && e.data.kind === "saveFile") {
                try {
                  // Robust save handling that mirrors fileExplorer upload behaviour.
                  const MAX_INLINE_BASE64 = 250 * 1024 * 1024; // 250MB
                  const CHUNK_SIZE = 10 * 1024 * 1024; // 10MB

                  // pendingSaves stores { chunks: [ArrayBuffer], bytes: number, source: MessageEvent.source }
                  root.__pendingSaves = root.__pendingSaves || {};

                  const incomingPath = e.data.path || e.data.name || 'unnamed';
                  const fullPath = incomingPath.startsWith('root/') ? incomingPath : ('root/' + incomingPath);

                  // Ensure entry
                  if (!root.__pendingSaves[fullPath]) {
                    root.__pendingSaves[fullPath] = { chunks: [], bytes: 0, source: e.source };
                  }

                  const entry = root.__pendingSaves[fullPath];
                  // Accept either raw ArrayBuffer in `buffer` or base64 string in `base64`.
                  if (e.data.buffer) {
                    // Normalize to ArrayBuffer
                    const ab = e.data.buffer instanceof ArrayBuffer ? e.data.buffer : e.data.buffer.buffer;
                    entry.chunks.push(ab);
                    entry.bytes += (ab.byteLength || 0);
                    // Acknowledge receipt of this chunk so the writer can apply backpressure
                    try {
                      if (e.data._chunkId && e.source && e.source.postMessage) {
                        e.source.postMessage({ __VFS__: true, kind: 'chunkAck', _chunkId: e.data._chunkId, path: fullPath }, '*');
                      }
                    } catch (err) {
                      console.warn('failed to send chunkAck', err);
                    }
                  } else if (e.data.base64) {
                    // convert base64 to ArrayBuffer and store
                    const binary = atob(e.data.base64);
                    const len = binary.length;
                    const bytes = new Uint8Array(len);
                    for (let i = 0; i < len; i++) bytes[i] = binary.charCodeAt(i);
                    entry.chunks.push(bytes.buffer);
                    entry.bytes += bytes.byteLength;
                  }

                  const finalize = !!e.data.lastOne;

                  if (!finalize) {
                    // waiting for more data
                    return;
                  }

                  // Assemble full ArrayBuffer
                  let totalBytes = entry.bytes;

                  // Debug: if totalBytes is zero but chunks exist, compute a fallback
                  if ((!totalBytes || totalBytes === 0) && entry.chunks && entry.chunks.length) {
                    try {
                      const computed = entry.chunks.reduce((sum, c) => {
                        try { return sum + (c && (c.byteLength || (c.byteLength === 0 ? 0 : new Uint8Array(c).byteLength)) || 0); } catch (e) { return sum; }
                      }, 0);
                      if (computed > 0) {
                        console.warn('VFS: computed totalBytes fallback', fullPath, computed, 'from', entry.chunks.length, 'chunks');
                        totalBytes = computed;
                      }
                    } catch (err) {
                      console.warn('VFS: failed computing fallback totalBytes for', fullPath, err);
                    }
                  }

                  let combined;
                  if (entry.chunks.length === 1) {
                    combined = entry.chunks[0];
                  } else {
                    combined = new Uint8Array(totalBytes);
                    let offset = 0;
                    for (const c of entry.chunks) {
                      const arr = new Uint8Array(c);
                      combined.set(arr, offset);
                      offset += arr.length;
                    }
                    combined = combined.buffer;
                  }

                  // Helper to convert ArrayBuffer slice to base64
                  function arrayBufferToBase64(buffer) {
                    let binary = '';
                    const bytes = new Uint8Array(buffer);
                    const chunk = 0x8000;
                    for (let i = 0; i < bytes.length; i += chunk) {
                      const sub = bytes.subarray(i, i + chunk);
                      binary += String.fromCharCode.apply(null, sub);
                    }
                    return btoa(binary);
                  }

                  (async () => {
                    try {
                      if (totalBytes <= MAX_INLINE_BASE64) {
                        const base64 = arrayBufferToBase64(combined);
                        await post({ saveSnapshot: true, directions: [{ edit: true, path: fullPath, contents: base64, replace:true}, { end: true }] });
                      } else {
                        // Large file: chunk it similarly to fileExplorer
                        const total = Math.ceil(totalBytes / CHUNK_SIZE);

                        // ensure file placeholder
                        await post({ saveSnapshot: true, directions: [{ addFile: true, path: fullPath, replace: true }, { end: true }] });

                        // Optionally check existing parts (skip for now)

                        // Check which parts already exist on server (resume support)
                        let presentParts = [];
                        try {
                          const chk = await post({ saveSnapshot: true, directions: [{ checkParts: true, path: fullPath }, { end: true }] });
                          presentParts = (chk && chk.result && chk.result.checkParts && chk.result.checkParts[fullPath]) || [];
                        } catch (e) {
                          presentParts = [];
                        }

                        const presentSet = new Set(presentParts);

                        const MAX_CHUNK_RETRIES = 3;
                        const CHUNK_RETRY_BASE_MS = 500;

                        function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

                        async function uploadChunkWithRetries(path, chunkBase64, index, total) {
                          let attempts = 0;
                          while (true) {
                            try {
                              await post({ saveSnapshot: true, directions: [{ edit: true, path, chunk: chunkBase64, index, total}, { end: true }] });
                              return;
                            } catch (err) {
                              attempts++;
                              if (attempts > MAX_CHUNK_RETRIES) throw err;
                              const backoff = CHUNK_RETRY_BASE_MS * Math.pow(2, attempts - 1);
                              await sleep(backoff);
                            }
                          }
                        }

                        let uploadedCount = presentSet.size;
                        for (let i = 0; i < total; i++) {
                          if (presentSet.has(i)) continue; // already uploaded
                          const start = i * CHUNK_SIZE;
                          const end = Math.min(totalBytes, start + CHUNK_SIZE);
                          const slice = combined.slice(start, end);
                          const chunkBase64 = arrayBufferToBase64(slice);
                          try {
                            await uploadChunkWithRetries(fullPath, chunkBase64, i, total);
                            uploadedCount++;
                          } catch (err) {
                            console.error(`Failed to upload chunk ${i} for ${fullPath}:`, err);
                            throw err;
                          }
                        }

                        // finalize
                        await post({ saveSnapshot: true, directions: [{ edit: true, path: fullPath, finalize: true }, { end: true }] });
                      }

                      // ACK back to source
                      try {
                        e.source.postMessage({ __VFS__: true, kind: 'saved', path: incomingPath, ok: true }, '*');
                      } catch (err) {}
                    } catch (err) {
                      console.error('saveFile handling error', err);
                      try { e.source.postMessage({ __VFS__: true, kind: 'saved', path: incomingPath, ok: false, error: (err && err.message) || String(err) }, '*'); } catch (err) {}
                    } finally {
                      // cleanup
                      delete root.__pendingSaves[fullPath];
                    }
                  })();
                } catch (err) {
                  console.error('saveFile outer error', err);
                }
              }
            });
          }

          // ----------------------------
          // 5. Inject override into iframe
          // ----------------------------
          const script = document.createElement("script");
          script.id = 'VFS';
          script.textContent = `(() => {
  console.log('VFS injector active');

          // Provide synthetic FileSystemHandle classes so libraries that use instanceof
          // checks (e.g., FileSystemObserver) accept our synthetic handles.
          function FileSystemHandle() {}
          function FileSystemFileHandle() { FileSystemHandle.call(this); }
          FileSystemFileHandle.prototype = Object.create(FileSystemHandle.prototype);
          FileSystemFileHandle.prototype.constructor = FileSystemFileHandle;
          function FileSystemDirectoryHandle() { FileSystemHandle.call(this); }
          FileSystemDirectoryHandle.prototype = Object.create(FileSystemHandle.prototype);
          FileSystemDirectoryHandle.prototype.constructor = FileSystemDirectoryHandle;

          // Polyfill common methods on prototypes so returned handles behave like
          // native FileSystemHandle objects.


FileSystemFileHandle.prototype.createWritable = async function () {
  const path = this.path;
  const name = this.name;

  // Delegate to native handle if present
  try {
    if (this._file && (this._file.handle || this._file.fileHandle)) {
      const h = this._file.handle || this._file.fileHandle;
      if (h.createWritable) return await h.createWritable();
    }
  } catch {}

  if (!path) {
    const remote = await window.showSaveFilePicker({ suggestedName: name });
    return await remote.createWritable();
  }

  let closed = false;
  let pendingWrites = [];

  // ✅ REAL WritableStream with proper async handling
  const stream = new WritableStream({
    async write(chunk) {
      if (closed) return;

      let buffer;

      if (chunk instanceof Blob) {
        buffer = await chunk.arrayBuffer();
      } else if (typeof chunk === 'string') {
        buffer = new TextEncoder().encode(chunk).buffer;
      } else if (chunk instanceof ArrayBuffer) {
        buffer = chunk;
      } else if (ArrayBuffer.isView(chunk)) {
        buffer = chunk.buffer;
      } else {
        buffer = new Uint8Array(chunk).buffer;
      }

      // Return a promise that resolves when the message is sent
      return new Promise((resolve) => {
        window.top.postMessage(
          { __VFS__: true, kind: 'saveFile', path, name, buffer },
          '*'
        );
        // Resolve immediately after posting (message queued)
        resolve();
      });
    },

    async close() {
      closed = true;
      // Give a small delay to ensure previous writes are processed
      await new Promise(r => setTimeout(r, 10));
      window.top.postMessage(
        { __VFS__: true, kind: 'saveFile', path, name, lastOne: true },
        '*'
      );
    },

    async abort(reason) {
      closed = true;
      window.top.postMessage(
        { __VFS__: true, kind: 'saveFileAbort', path, name, reason },
        '*'
      );
    }
  });

  // 🔧 Patch native-like methods ONTO the stream
  stream.write = async function (chunk) {
    const writer = stream.getWriter();
    try {
      await writer.write(chunk);
    } finally {
      writer.releaseLock();
    }
  };

  stream.close = async function () {
    const writer = stream.getWriter();
    try {
      await writer.close();
    } finally {
      writer.releaseLock();
    }
  };

  stream.abort = async function (reason) {
    const writer = stream.getWriter();
    try {
      await writer.abort(reason);
    } finally {
      writer.releaseLock();
    }
  };

  return stream;
};


          FileSystemFileHandle.prototype.queryPermission = async function () { return 'granted'; };
          FileSystemFileHandle.prototype.requestPermission = async function () { return 'granted'; };
          FileSystemFileHandle.prototype.isSameEntry = async function (other) {
            try { return !!(other && (other.path || other.name) && (this.path === other.path || this.name === other.name)); } catch (e) { return false; }
          };

          FileSystemDirectoryHandle.prototype.isSameEntry = async function (other) {
            try { return !!(other && (other.path || other.name) && (this.path === other.path || this.name === other.name)); } catch (e) { return false; }
          };

function makeFileHandle(file) {
  const h = new FileSystemFileHandle();

  h.kind = 'file';
  h.name = file.name;

  // Non-standard, VFS-only (informational)
  h.path = file.fullPath || file.webkitRelativePath || file.name;

  // Internal backing file
  h._file = file;

  // Required by File System Access consumers
  h.getFile = async function () {
    return this._file;
  };

  return h;
}

          // Shim FileSystemObserver so sites that call new FileSystemObserver(...).observe(handle)
          // with our synthetic handles won't throw a TypeError. When a synthetic handle is
          // observed we forward an observe request to the top frame so the host can watch
          // the underlying path if desired.
          (function installFSObserverShim() {
            const NativeFSObserver = window.FileSystemObserver;
            function isSyntheticHandle(h) {
              return !!(h && (h.path || h.name) && typeof h.getFile === 'function');
            }

            class FileSystemObserverShim {
              constructor(cb) {
                this.cb = cb;
                this._native = NativeFSObserver ? new NativeFSObserver(cb) : null;
                this._regs = new Map();
              }
              observe(handle) {
                if (isSyntheticHandle(handle)) {
                  const path = handle.path || handle.name || '/';
                  this._regs.set(handle, path);
                  try { window.top.postMessage({ __VFS__: true, kind: 'observePath', path }, '*'); } catch(e){}
                  return;
                }
                if (this._native) return this._native.observe(handle);
                throw new TypeError('Failed to execute "observe" on "FileSystemObserver": parameter 1 is not of type "FileSystemHandle"');
              }
              unobserve(handle) {
                if (this._regs.has(handle)) {
                  const path = this._regs.get(handle);
                  this._regs.delete(handle);
                  try { window.top.postMessage({ __VFS__: true, kind: 'unobservePath', path }, '*'); } catch(e){}
                  return;
                }
                if (this._native) return this._native.unobserve(handle);
              }
            }

            try {
              window.FileSystemObserver = FileSystemObserverShim;
            } catch (e) {}
          })();

  let injectedFiles = [];
  let activeInput = null;
  let pickerMode = null; // 'input' | 'picker'
  let allFilesReceived = false;
  let fileChunks = {}; // store chunks by path: { path: [buffer1, buffer2, ...] }

  function normalizeMimeType(type) {
    if (!type) return 'application/octet-stream';
    if (typeof type === 'string') return type;
    if (type.type) return type.type;
    return 'application/octet-stream';
  }

  function injectIntoActiveInput() {
    if (!activeInput) return;

    const dt = new DataTransfer();
    for (const file of injectedFiles) {
      dt.items.add(file);
    }

    Object.defineProperty(activeInput, 'files', {
      configurable: true,
      get: () => dt.files
    });

    activeInput.dispatchEvent(new Event('change', { bubbles: true }));

    // cleanup
    injectedFiles = [];
    activeInput = null;
    pickerMode = null;
    allFilesReceived = false;
  }

  function waitUntilFiles() {
    return new Promise(resolve => {
      const i = setInterval(() => {
        if (allFilesReceived) {
          clearInterval(i);
          resolve();
        }
      }, 10);
    });
  }

  // 📨 Receive files
  window.addEventListener('message', e => {
    const d = e.data;
    if (!d || d.__VFS__ !== true) return;

    if (d.kind === 'file') {
      // Handle chunked file messages
        if (d.totalChunks && d.totalChunks > 1) {
          const pathKey = d.path || d.name;
          if (!fileChunks[pathKey]) {
            // use fill(null) to avoid sparse-array holes so .every() checks work
            fileChunks[pathKey] = {
              chunks: new Array(d.totalChunks).fill(null),
              metadata: {
                name: d.name,
                type: d.type,
                path: d.path,
                webkitRelativePath: d.webkitRelativePath
              }
            };
          }

          // Store chunk at correct index
          fileChunks[pathKey].chunks[d.chunkIndex] = d.buffer;

          // Check if all chunks received (no null left)
          const allChunksReceived = fileChunks[pathKey].chunks.every(c => c !== null);

          if (allChunksReceived) {
            // Combine chunks into single buffer
            const validChunks = fileChunks[pathKey].chunks; // no nulls remain

            const totalBytes = validChunks.reduce((sum, chunk) => sum + (chunk?.byteLength || 0), 0);
            const combinedBuffer = new Uint8Array(totalBytes);
            let offset = 0;
            for (const chunk of validChunks) {
              if (chunk && chunk.byteLength > 0) {
                combinedBuffer.set(new Uint8Array(chunk), offset);
                offset += chunk.byteLength;
              }
            }

            const metadata = fileChunks[pathKey].metadata;
            const file = new File([combinedBuffer.buffer], metadata.name, {
              type: normalizeMimeType(metadata.type)
            });

            if (metadata.webkitRelativePath) {
              Object.defineProperty(file, 'webkitRelativePath', {
                value: metadata.webkitRelativePath
              });
            }

            const rawPath = (metadata.path || metadata.webkitRelativePath || metadata.name) || metadata.name;
            const normPath = (typeof rawPath === 'string' && rawPath.startsWith('/')) ? rawPath.slice(1) : rawPath;
            file.fullPath = normPath;

            const syntheticHandle = {
              kind: 'file',
              name: metadata.name,
              path: normPath
            };

            try { file.handle = syntheticHandle; file.fileHandle = syntheticHandle; } catch (e) {}

            injectedFiles.push(file);
            delete fileChunks[pathKey];

            // Check if this is the last file
            if (d.lastOne) {
              if (pickerMode === 'input') {
                injectIntoActiveInput();
              } else if (pickerMode === 'picker') {
                allFilesReceived = true;
              }
            }
          }
          return;
        }
      
      // Handle non-chunked files (original path)
      const file = new File([d.buffer], d.name, {
        type: normalizeMimeType(d.type)
      });

      if (d.webkitRelativePath) {
        Object.defineProperty(file, 'webkitRelativePath', {
          value: d.webkitRelativePath
        });
      }

      const rawPath = (d.path || d.webkitRelativePath || d.name) || d.name;
      const normPath = (typeof rawPath === 'string' && rawPath.startsWith('/')) ? rawPath.slice(1) : rawPath;
      file.fullPath = normPath;

      const syntheticHandle = {
        kind: 'file',
        name: d.name,
        path: normPath
      };

      try { file.handle = syntheticHandle; file.fileHandle = syntheticHandle; } catch (e) {}

      injectedFiles.push(file);
      
      // Check if this is the last file
      if (d.lastOne) {
        if (pickerMode === 'input') {
          injectIntoActiveInput();
        } else if (pickerMode === 'picker') {
          allFilesReceived = true;
        }
      }
    }
  });

  // 📂 showOpenFilePicker
  window.showOpenFilePicker = async () => {
    pickerMode = 'picker';
    allFilesReceived = false;
    injectedFiles = [];

    window.top.postMessage(
      { __VFS__: true, kind: 'requestPicker' },
      '*'
    );

    await waitUntilFiles();

    const files = injectedFiles.slice();
    injectedFiles = [];
    allFilesReceived = false;
    pickerMode = null;

    return files.map(file => makeFileHandle(file));
  };


// 💾 showSaveFilePicker (fixed)
let pendingSaveResolvers = [];

window.addEventListener('message', e => {
  const d = e.data;
  if (!d || d.__VFS__ !== true) return;

  if (d.kind === 'saveTarget') {
    const next = pendingSaveResolvers.shift();
    if (!next) return;

    // user canceled
    if (!d.path) {
      next.reject(
        new DOMException('The user aborted a request.', 'AbortError')
      );
      return;
    }

    next.resolve(d.path);
  }
});

window.showSaveFilePicker = async (options = {}) => {
  return new Promise((resolve, reject) => {
    pendingSaveResolvers.push({ resolve, reject });

    window.top.postMessage(
      {
        __VFS__: true,
        kind: 'requestSavePicker',
        suggestedName: options.suggestedName || null,
        types: options.types || null
      },
      '*'
    );
  }).then(path => {
    const h = new FileSystemFileHandle();
    h.kind = 'file';
    h.path = path;
    h.name = path.split('/').pop() || options.suggestedName || 'untitled';

    return h;
  });
};


  // � showDirectoryPicker
  let pendingDirectoryResolvers = [];
  window.addEventListener('message', e => {
    const d = e.data;
    if (!d || d.__VFS__ !== true) return;
    if (d.kind === 'directoryTarget') {
      for (const r of pendingDirectoryResolvers) try { r(d.path, d.treeNode); } catch(e){}
      pendingDirectoryResolvers = [];
    }
  });

  window.showDirectoryPicker = async (options) => {
    return new Promise((resolve) => {
      pendingDirectoryResolvers.push((path, treeNode) => {
        const h = new FileSystemDirectoryHandle();
        h.name = path.split('/').pop() || 'root';
        h.kind = 'directory';
        h.path = path;
        h._treeNode = treeNode; // store for entries() iteration
        
        // entries() method to iterate over directory contents
        h.entries = async function* () {
          if (!this._treeNode || !Array.isArray(this._treeNode[1])) return;
          for (const child of this._treeNode[1]) {
            const name = child[0];
            const isFolder = Array.isArray(child[1]);
            if (isFolder) {
const dirHandle = new FileSystemDirectoryHandle();
dirHandle.name = name;
dirHandle.kind = 'directory';
dirHandle.path = (this.path ? this.path + '/' : '') + name;
dirHandle._treeNode = child;

// attach ALL directory methods
dirHandle.entries = this.entries;
dirHandle.values = this.values;
dirHandle.keys = this.keys;
dirHandle.getDirectoryHandle = this.getDirectoryHandle;
dirHandle.getFileHandle = this.getFileHandle;
dirHandle.isSameEntry = this.isSameEntry;

yield [name, dirHandle];

            } else {
              const fileHandle = new FileSystemFileHandle();
              fileHandle.name = name;
              fileHandle.kind = 'file';
              fileHandle.path = (this.path ? this.path + '/' : '') + name;
              yield [name, fileHandle];
            }
          }
        };

        // values() method
        h.values = async function* () {
          for await (const [, handle] of this.entries()) {
            yield handle;
          }
        };

        // keys() method
        h.keys = async function* () {
          for await (const [name] of this.entries()) {
            yield name;
          }
        };

        // getDirectoryHandle(name) method
        h.getDirectoryHandle = async function(name, options = {}) {
          if (!this._treeNode || !Array.isArray(this._treeNode[1])) {
            throw new DOMException(\`\${this.name} is not a directory\`, 'NotADirectoryError');
          }
          let child = this._treeNode[1].find(c => c[0] === name);
          if (!child) {
            if (options && options.create) {
              // Create a new in-memory directory node so subsequent operations
              // (entries, getFileHandle, etc.) can operate on it.
              const newNode = [name, []];
              if (!Array.isArray(this._treeNode[1])) this._treeNode[1] = [];
              this._treeNode[1].push(newNode);
              child = newNode;
            } else {
              throw new DOMException(\`A directory with the name "\${name}" was not found.\`, 'NotFoundError');
            }
          }
          if (!Array.isArray(child[1])) {
            throw new DOMException(\`"\${name}" is not a directory\`, 'TypeMismatchError');
          }
          const dirHandle = new FileSystemDirectoryHandle();
          dirHandle.name = name;
          dirHandle.kind = 'directory';
          dirHandle.path = this.path + '/' + name;
          dirHandle._treeNode = child;
          dirHandle.entries = this.entries;
          dirHandle.values = this.values;
          dirHandle.keys = this.keys;
          dirHandle.getDirectoryHandle = this.getDirectoryHandle;
          dirHandle.getFileHandle = this.getFileHandle;
          dirHandle.isSameEntry = this.isSameEntry;
          return dirHandle;
        };

        // getFileHandle(name) method
        h.getFileHandle = async function(name, options = {}) {
          if (!this._treeNode || !Array.isArray(this._treeNode[1])) {
            throw new DOMException(\`\${this.name} is not a directory\`, 'NotADirectoryError');
          }
          const child = this._treeNode[1].find(c => c[0] === name);
          if (!child) {
            // Allow creation of new files when requested. We don't mutate the
            // host tree here; instead return a handle pointing at the intended
            // path so \`createWritable()\` will route writes through the VFS.
            if (options && options.create) {
              const fileHandle = new FileSystemFileHandle();
              fileHandle.name = name;
              fileHandle.kind = 'file';
              fileHandle.path = this.path + '/' + name;
              return fileHandle;
            }
            throw new DOMException(\`A file with the name "\${name}" was not found.\`, 'NotFoundError');
          }
          if (Array.isArray(child[1])) {
            throw new DOMException(\`"\${name}" is not a file\`, 'TypeMismatchError');
          }
          const fileHandle = new FileSystemFileHandle();
          fileHandle.name = name;
          fileHandle.kind = 'file';
          fileHandle.path = this.path + '/' + name;
          return fileHandle;
        };

        resolve(h);
      });
      window.top.postMessage({ __VFS__: true, kind: 'requestDirectoryPicker' }, '*');
    });
  };
let pendingFileRequests = new Map();

window.addEventListener('message', e => {
  const d = e.data;
  if (!d || d.__VFS__ !== true) return;

  if (d.kind === 'fileData') {
    const req = pendingFileRequests.get(d.path);
    if (!req) return;

    pendingFileRequests.delete(d.path);

    const file = new File(
      [d.buffer],
      d.name,
      { type: d.type || 'application/octet-stream' }
    );

    file.fullPath = d.path;
    req.resolve(file);
  }
});

// ---- now override getFile ----
FileSystemFileHandle.prototype.getFile = async function () {
  if (this._file) return this._file;

  if (!this.path) {
    throw new Error('File not available');
  }

  const file = await new Promise((resolve, reject) => {
    pendingFileRequests.set(this.path, { resolve, reject });

    window.top.postMessage(
      {
        __VFS__: true,
        kind: 'requestFile',
        path: this.path,
        name: this.name
      },
      '*'
    );

    setTimeout(() => {
      if (pendingFileRequests.has(this.path)) {
        pendingFileRequests.delete(this.path);
        debugger;
        reject(new Error('File request timed out'));
      }
    }, 3000);
  });

  this._file = file;
  return file;
};


  // �📎 <input type="file">
  document.addEventListener(
    'click',
    e => {
      const input = e.target;
      if (!(input instanceof HTMLInputElement)) return;
      if (input.type !== 'file') return;

      e.preventDefault();
      e.stopImmediatePropagation();

      activeInput = input;
      pickerMode = 'input';

      window.top.postMessage(
        {
          __VFS__: true,
          kind: 'requestPicker',
          allowMultiple: input.multiple,
          allowDirectory: input.hasAttribute('webkitdirectory')
        },
        '*'
      );
    },
    true
  );


// override window.open
window.open = function(url, location) {
let w = window;

while (w.parent !== w.top) {
  w = w.parent;
}

const layer1Window = w;
const layer1Iframe = w.frameElement;
let allbrowserindex = 0;
// console.log(layer1Iframe); // ✅ the first iframe under the main page
for(let i = 0; i < window.top.allBrowsers.length; i++) {
    if(window.top.allBrowsers[i].rootElement.contains(layer1Iframe)) allbrowserindex = i; 
}
  if(location === '_parent') {
    console.error('this flag is banned "_parent"');
    window.top.postMessage({
       __goldenbodynewWindow__: true,
       url: url,
       allbrowserindex: allbrowserindex
    });
  }
  else if(location === '_self') {
    window.location = url;
  }
  else if(location === '_blank') {
    window.top.postMessage({
       __goldenbodynewWindow__: true,
       url: url,
       allbrowserindex: allbrowserindex
    });
  }
  else if(location === '_top') {
    console.error('this flag is banned "_top"');
    window.top.postMessage({
       __goldenbodynewWindow__: true,
       url: url,
       allbrowserindex: allbrowserindex
    });
  }
  else {
    window.top.postMessage({
       __goldenbodynewWindow__: true,
       url: url,
       allbrowserindex: allbrowserindex
    });
    }
}
})();


`;
          function injectIntoIframe(frame) {
            try {
              frame.contentDocument.documentElement.appendChild(script.cloneNode(true));
            } catch {}
          }
          function uninjectIntoFrame(frame) {
            try {
              frame.contentDocument.getElementById('VFS').remove();
            } catch {}
          }
          let mediaInterval;
          function recurseFrames(doc, event = null) {
            if (!doc) return;

            // do something for this document (attach context menu, log, etc.)
            const frames = doc.querySelectorAll("iframe");

            for (const frame of frames) {
              try {
                if(event) {
                  if(event.source == iframe.contentWindow) {return iframe}
                  if(event.source == frame.contentWindow) {
                    return frame;
                  }
                }
                if (frame.style.display === "none") continue;

                // Wait for the iframe to load (so its contentDocument exists)
                try {
                  const win = frame.contentWindow;
                            var script = frame.contentDocument.createElement("script");
          script.textContent = `setInterval(function(){var _goldenbody = document.getElementsByTagName('a'); for(let i = 0; i < _goldenbody.length; i++) {_goldenbody[i].target="_self";} },2000*${nhjd}); function callParent(url) {
  window.parent.postMessage(
    { type: "FROM_IFRAME", message: url },
    "*"
  );
}

`;
          frame.contentDocument.head.appendChild(script);
                  // showOpenFilePicker()
                  if (frame.contentDocument?.readyState === "complete") {
                    if(!frame.contentDocument.getElementById('VFS'))
                    injectIntoIframe(frame);
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
                  frame.contentDocument.addEventListener(
                    "keydown",
                    function () {
                      document.activeElement.focus();
                    },
                  );

                  frame.contentDocument.addEventListener("click", hideMenu);
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
                      const hasInlineHandler = e.target.oncontextmenu !== null;
                      if (hasInlineHandler || e.defaultPrevented) return;
                      e.preventDefault();
                      e.stopPropagation();

                      // Attach handler
                      const { x, y } = getAbsoluteMousePosition(
                        e,
                        frame.contentDocument,
                      );

                      const clickedElement = e.target;
                      const linkElement = clickedElement.closest("a");

                      if (linkElement && linkElement.href) {
                        console.log(
                          "Right-clicked on a link:",
                          linkElement.href,
                        );
                        showMenu(x, y, linkElement, true);
                      } else {
                        showMenu(x, y, null, false);
                        console.log("Right-clicked on a non-link element.");
                      }
                    };
                  }

                  const mwin = tab.iframe.contentWindow;
                  win.tabIndex = "0";
                  if (!win.suberudaKeyHandler) {
                    win.erudaKeyHandler = function (e) {
                      if (
                        e.ctrlKey &&
                        e.shiftKey &&
                        e.key.toLowerCase() === "i"
                      ) {
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
                      if (
                        e.ctrlKey &&
                        e.shiftKey &&
                        e.key.toLowerCase() === "i"
                      ) {
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
                    win.removeEventListener("keydown", win.suberudaKeyHandler);

                    win.addEventListener("keydown", win.suberudaKeyHandler);
                    frame.contentWindow.removeEventListener(
                      "contextmenu",
                      win.contextMenuHandler,
                    );

                    frame.contentWindow.addEventListener(
                      "contextmenu",
                      win.contextMenuHandler,
                    );
                  }
                  attatch();
                  //   // get all iframes in this document
                } catch (e) {
                  // console.warn('Cannot access nested frame:', frame.src);
                  // console.error(e);
                }

                // If already loaded, go in immediately
                if (
                  frame.contentDocument &&
                  frame.contentDocument.readyState === "complete"
                ) {
                    const found = recurseFrames(frame.contentDocument, event);
                    if (found) return found; // propagate match
                }
              } catch (err) {
                console.warn("Blocked or cross-origin iframe:", frame.src);
              }
            }
          }
          const recurseInterval = setInterval(() => {
            try {
              if (!iframe || !iframe.contentDocument) {
                clearInterval(recurseInterval);
                console.warn("Recurse interval cleared: iframe missing");
                return;
              }

              recurseFrames(root);
            } catch (e) {
              clearInterval(recurseInterval);
              console.warn("Recurse interval cleared due to error:", e);
            }
          }, 2000 * nhjd);

          // Start from the top-level document
          setTimeout(() => {
          recurseFrames(iframe.contentDocument);
          recurseFrames(root);
          }, 100);


          // Hide the menu when clicking elsewhere
          iframeDocument.addEventListener("click", hideMenu);
        };
        if (proxyurl != "") {
          iframe.src = a(url, proxyurl);
        } else {
          iframe.src = url;
        }
        iframe.style.display = "none";
        root.appendChild(iframe);
        let loadedurl = url;
        let donotm = false;
        const tab = { id, url, title, iframe, resizeP, loadedurl, donotm };
        tab.iframe.contentWindow.addEventListener("keydown", function (e) {
          if (e.ctrlKey && e.key === "w") {
            if (tab.iframe.style.display !== "none") {
              closeTab(tab.id);
            }
          }
        });

        if (preloadsize !== 100) {
          preloadsize = 100;
        }
        function handleReload(e) {
          if (
            e.ctrlKey &&
            e.key === "r" &&
            (document.activeElement === root ||
              document.activeElement === tab.iframe) &&
            tab.iframe.style.display === "block"
          ) {
            e.preventDefault();
            tab.iframe.contentWindow.location.reload();
          }
        }
        root.addEventListener("keydown", handleReload);

        let previousTabTitle = tab.title;

        tab.title = "Loading...";

        tabs.push(tab);
        activateTab(id);
        renderTabs();
        document.addEventListener("keyup", function (e) {
          try {
            if (!root.contains(document.activeElement)) return;
          } catch (e) {
            return;
          }
          if (e.ctrlKey && e.shiftKey && e.key.toLowerCase() === "i") {
            e.preventDefault();
            e.stopPropagation();

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
            }
            win.eruda[win._goldenbodyIns ? "hide" : "show"]();
            win._goldenbodyIns = !win._goldenbodyIns;
          }
        });

        return id;
      }

      if (preloadlink) {
        addTab(preloadlink, "New Tab");
      }
      window.addEventListener("keydown", function (e) {
try{        if (
          document.activeElement !== root &&
          !root.contains(document.activeElement)
        )
          return;
      } catch(e) {return;}
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
      });
      function activateTab(id) {
        try {
          clearInterval(checkInterval);
        } catch (a) {}
        const tab = tabs.find((t) => t.id === id);
        if (!tab) return;

        // Hide all iframes, show only active
        tabs.forEach((t) => (t.iframe.style.display = "none"));
        tab.iframe.style.display = "block";
        backBtn.onclick = function () {
          tab.iframe.contentWindow.history.back();
        };
        forwardBtn.onclick = function () {
          tab.iframe.contentWindow.history.forward();
        };
        reloadBtn.onclick = function () {
          if (reloadBtn.textContent === "x") {
            tab.iframe.contentWindow.stop();
          } else {
            tab.iframe.contentWindow.location.reload();
          }
        };
        sitesettingsbtn.onclick = () => {
            openPermissionsUI(unshuffleURL(tab.iframe.src), tab.iframe, sitesettingsbtn.getBoundingClientRect());
        }
        activeTabId = id;
        urlInput.value = unshuffleURL(tab.iframe.contentWindow.location.href);
        let previousUrl = unshuffleURL(tab.iframe.contentWindow.location.href);
        let previousTabTitle = tab.title;

        // Inject custom styles
        checkInterval = setInterval(() => {
          if (allBrowsers.length == 0) {
            clearInterval(checkInterval);
          }
          try {
            let currentUrl = unshuffleURL(
              tab.iframe.contentWindow.location.href,
            );
            if (currentUrl !== previousUrl) {
              previousUrl = currentUrl;
              urlInput.value = currentUrl;
              if(data.enableURLSync)
              openUrlInActiveTab(currentUrl);
            }
            resizeDiv.innerText = tab.resizeP + "%";
            activatedTab = tab;
            if (tab.iframe.contentDocument.readyState !== "complete") {
              reloadBtn.textContent = "x";

              tab.title = "Loading...";
            } else {
              reloadBtn.textContent = "⟳";
              try {
                if (tab.iframe.contentDocument.readyState === "complete") {
                  const docTitle =
                    tab.iframe.contentDocument &&
                    tab.iframe.contentDocument.title;
                  tab.title = docTitle;
                }
              } catch (e) {}
            }
            if (previousTabTitle !== tab.title) renderTabs();
            previousTabTitle = tab.title;
          } catch (e) {
            console.error(e);
            clearInterval(checkInterval);
          }
        }, 250 * nhjd);
        renderTabs();
      }

      function closeTab(id) {
        const idx = tabs.findIndex((t) => t.id === id);
        if (idx === -1) return;

        const removingActive = tabs[idx].id === activeTabId;
        tabs[idx].iframe.remove();
        tabs.splice(idx, 1);

        if (removingActive) {
          if (tabs.length) activateTab(tabs[Math.max(0, idx - 1)].id);
          else closeWindow(); //addTab('goldenbody://newtab/', 'New Tab');
        } else {
          renderTabs();
        }
      }
      if (!preloadlink) addTab("goldenbody://newtab/", "New Tab");

      // --- Open button behavior ---
      function normalizeUrl(input) {
        if (input[input.length - 1] != "/") input += "/";

        if (
          input[0] +
            input[1] +
            input[2] +
            input[3] +
            input[4] +
            input[5] +
            input[6] +
            input[7] !=
            "https://" &&
          input[0] +
            input[1] +
            input[2] +
            input[3] +
            input[4] +
            input[5] +
            input[6] !=
            "http://" &&
          !input.startsWith("goldenbody://")
        )
          return "https://" + input;
        else return input;
      }
      function isUrl(string) {
        try {
          new URL(string);
          return true;
        } catch (e) {
          // If scheme is missing, try prepending 'https://'
          try {
            string = `https://${string}`;
            new URL(string);
            return string;
          } catch (e) {
            return false;
          }
        }
      }
      function openUrlInActiveTab(rawUrl) {
        const tabIndex = tabs.findIndex((t) => t.id === activeTabId);
        let url = "";
        if (tabIndex === -1) return;
        const tab = tabs[tabIndex];
        if (typeof isUrl(rawUrl) === "string") rawUrl = isUrl(rawUrl);
        if (rawUrl.startsWith("javascript:")) {
          let scriptcontent = "";
          for (let i = 11; i < rawUrl.length; i++) {
            scriptcontent += rawUrl[i];
          }
          let script = document.createElement("script");
          script.textContent = scriptcontent;
          tab.iframe.contentDocument.body.appendChild(script);
          urlInput.value = unshuffleURL(tab.iframe.contentWindow.location.href);
          return;
        }
        url = new URL(rawUrl).href;
        tab.url = url;
        tab.loadedurl = url;
        tab.title = "Loading...";
        if (tabs[tabIndex].iframe) {
        createPermInput(tab.iframe, url);
          if (!url.startsWith("goldenbody://")) {
              tabs[tabIndex].iframe.src = a(
                url,
                proxyurl,
              );
              tabs[tabIndex].iframe.contentWindow.location = a(
                url,
                proxyurl,
              );
          } else {
              tabs[tabIndex].iframe.src = a(
                url,
                proxyurl,
              );
          }
        }

        urlInput.value = url;
        // status.innerText = `Loaded: ${url}`;
        setTimeout(() => (status.innerText = ""), 3000);
      }

      openBtn.addEventListener("click", () =>
        openUrlInActiveTab(urlInput.value),
      );
      urlInput.addEventListener("keydown", (e) => {
        if (e.key === "Enter") openUrlInActiveTab(urlInput.value);
      });

      // new tab
      newTabBtn.addEventListener("click", () => {
        const id = addTab("goldenbody://newtab/", "New Tab");
        activateTab(id);
        // urlInput.focus();
      });

      // drag to move window
      var currentX;
      var currentY;

      (function makeDraggable() {
        let dragging = false,
          startX = 0,
          startY = 0,
          origLeft = 0,
          origTop = 0;
        top.addEventListener("pointerdown", (ev) => {
          if (
            ev.target.closest(".sim-tab") ||
            ev.target === newTabBtn ||
            ev.target === urlInput ||
            ev.target === openBtn
          )
            return;
          dragging = true;
          startX = ev.clientX;
          startY = ev.clientY;
          origLeft = root.offsetLeft;
          origTop = root.offsetTop;

          document.body.style.userSelect = "none";
          currentX = ev.clientX;
          currentY = ev.clientY;
        });
        window.addEventListener("pointermove", (ev) => {
          if (!dragging) {
            startX = 0;
            startY = 0;
            return;
          }

          if (
            ((ev.clientX - currentX < -1 || ev.clientX - currentX > 1) && dragging) ||
            ((ev.clientY - currentY < -1 || ev.clientY - currentY > 1) && dragging)
          ) {
            applyBounds(savedBounds);
            if (isMaximized) {
              root.style.left = ev.clientX - root.clientWidth / 2 + "px";
              origLeft = ev.clientX - root.clientWidth / 2;
              btnMax.textContent = "‎     □    ‎ ";
              // alert('restored');
              isMaximized = false;
            }
          }

          if (!dragging) return;
          const dx = ev.clientX - startX,
            dy = ev.clientY - startY;
          root.style.left = origLeft + dx + "px";
          if (origTop + dy > 0) root.style.top = origTop + dy + "px";
          else root.style.top = "0px";
        });
        window.addEventListener("pointerup", () => {
          dragging = false;
          document.body.style.userSelect = "";
        });
      })();
      let resizing;
      function resize() {
        const el = root;
        const BW = 8; // fatter edge = easier to grab
        const minW = 450,
          minH = 350;

        // ensure positioned & has top/left so we can move edges
        if (!el.style.position) el.style.position = "fixed";
        if (!el.style.top) el.style.top = "20px";
        if (!el.style.left) el.style.left = "20px";

        // state
        let active = null; // {dir,sx,sy,sw,sh,sl,st}
        let dir = "";

        // helper: are we on an edge?
        const hitTest = (e) => {
          const r = el.getBoundingClientRect();
          const x = e.clientX,
            y = e.clientY;
          const onL = x >= r.left && x <= r.left + BW;
          const onR = x <= r.right && x >= r.right - BW;
          const onT = y >= r.top && y <= r.top + BW;
          const onB = y <= r.bottom && y >= r.bottom - BW;

          if (onT && onL) return "nw";
          if (onT && onR) return "ne";
          if (onB && onL) return "sw";
          if (onB && onR) return "se";
          if (onL) return "w";
          if (onR) return "e";
          if (onT) return "n";
          if (onB) return "s";
          return "";
        };
        // cursor feedback
        el.addEventListener("pointermove", (e) => {
          if (active) return; // don't flicker while resizing
          const d = hitTest(e);
          el.style.cursor =
            d === "nw" || d === "se"
              ? "nwse-resize"
              : d === "ne" || d === "sw"
                ? "nesw-resize"
                : d === "n" || d === "s"
                  ? "ns-resize"
                  : d === "e" || d === "w"
                    ? "ew-resize"
                    : "default";
        });

        // start resize
        el.addEventListener(
          "pointerdown",
          (e) => {
            dir = hitTest(e);
            if (!dir) return;
            resizing = true;
            e.preventDefault();
            el.setPointerCapture(e.pointerId); // <- keep events!
            const r = el.getBoundingClientRect();
            active = {
              dir,
              sx: e.clientX,
              sy: e.clientY,
              sw: r.width,
              sh: r.height,
              sl: r.left,
              st: r.top,
            };

            // stop iframe from eating events
            el.querySelectorAll("iframe").forEach((f) => {
              f._oldPE = f.style.pointerEvents;
              f.style.pointerEvents = "none";
            });

            document.body.style.userSelect = "none";
            document.body.style.cursor = getCursorForDir(dir);
            el.style.willChange = "width, height, left, top";
          },
          { passive: false },
        );
        let draginterval;
        // drag
        el.addEventListener("pointermove", (e) => {
          if (!active) return;
          const dx = e.clientX - active.sx;
          const dy = e.clientY - active.sy;
          if ((dx > 1 && resizing) || (dy > 1 && resizing)) {
            applyBounds(getBounds());
            btnMax.textContent = "‎     □    ‎ ";
            // alert('restored');
            isMaximized = false;
          }

          // east / south
          if (active.dir.includes("e"))
            el.style.width = Math.max(minW, active.sw + dx) + "px";
          if (active.dir.includes("s"))
            el.style.height = Math.max(minH, active.sh + dy) + "px";

          // west / north (move edge)
          if (active.dir.includes("w")) {
            const w = Math.max(minW, active.sw - dx);
            el.style.width = w + "px";
            el.style.left = active.sl + dx + "px";
          }
          if (active.dir.includes("n")) {
            const newTop = active.st + dy;
            if (newTop >= 0) {
              const h = Math.max(minH, active.sh - dy);
              el.style.height = h + "px";
              el.style.top = newTop + "px";
            } else {
              el.style.top = "0px";
            }
          }
        });

        // end
        function end() {
          clearInterval(draginterval);
          if (!active) return;
          savedBounds = getBounds();
          active = null;
          resizing = false;
          document.body.style.userSelect = "";
          document.body.style.cursor = "";
          el.style.cursor = "default"; // <— add this
          el.style.willChange = "";
          el.querySelectorAll("iframe").forEach((f) => {
            f.style.pointerEvents = f._oldPE || "";
            delete f._oldPE;
          });
        }
        el.addEventListener("pointerup", end);
        el.addEventListener("pointercancel", end);

        // better touch behavior
        el.style.touchAction = "none";

        function getCursorForDir(d) {
          if (d === "nw" || d === "se") return "nwse-resize";
          if (d === "ne" || d === "sw") return "nesw-resize";
          if (d === "n" || d === "s") return "ns-resize";
          if (d === "e" || d === "w") return "ew-resize";
          return "default";
        }
      }
      resize();

      return {
        rootElement: root,
        iframes,
        urlInput,
        openBtn,
        activatedTab,
        addTab,
        activateTab,
        closeTab,
        openUrl: openUrlInActiveTab,
        getBounds,
        applyBounds,
        btnMax,

        get isMaximized() {
          return isMaximized;
        },
        set isMaximized(v) {
          isMaximized = !!v;
        },

        get isMinimized() {
          return isMinimized;
        },
        set isMinimized(v) {
          isMinimized = !!v;
        },

        addAndOpen: function (url) {
          const id = addTab(url);
          activateTab(id);
        },

        get tabs() {
          return tabs;
        },
      };
    })();
    setInterval(function () {
      if (
        typeof activatedTab.title == "string" &&
        typeof activatedTab.title != ""
      )
        chromeWindow.title = activatedTab.title;
      else chromeWindow.title = "undefined";
    }, 1000 * nhjd);
    chromeWindow.rootElement.setAttribute("data-title", chromeWindow.title);
    allBrowsers.push(chromeWindow); // Add to global tracking
          applyStyles();

    function a(url, proxyurl) {
      function encodeUV(str) {
        return encodeURIComponent(
          str
            .split("")
            .map((ch, i) =>
              i % 2 ? String.fromCharCode(ch.charCodeAt(0) ^ 2) : ch,
            )
            .join(""),
        );
      }

      function encodeRammerHead(str, proxylink) {
        if (str === "goldenbody://newtab/" || str === "goldenbody://newtab") {
          return goldenbodywebsite + "newtab.html";
        }
        else if (str === "goldenbody://ai/" || str === "goldenbody://ai") {
          return goldenbodywebsite + "ai.html";
        }
        return proxylink + id + "/" + url;
      }
      function encodeScramjet(url, proxylink) {
        return proxylink + "scramjet/" + url;
      }

      return encodeRammerHead(url, proxyurl);

      // => hvtrs8%2F-wuw%2Chgrm-uaps%2Ccmm
    }
  }









  // app stuff
  window.browsermenu = null;
  window.browserButtons = [];
  window.browsermenuhandler = function(e, needremove = true) {
    e.preventDefault();

    // Remove existing menus
    document.querySelectorAll(".app-menu").forEach((m) => m.remove());

    const menu = document.createElement("div");
    window.browsermenu = menu;
    try {
      removeotherMenus('browser');
    } catch (e) {}
    menu.className = "app-menu";
    Object.assign(menu.style, {
      position: "fixed",
      top: `0px`,
      left: `${e.clientX}px`,
      border: "1px solid #ccc",
      borderRadius: "4px",
      boxShadow: "0 2px 6px rgba(0,0,0,0.2)",
      zIndex: 9999999,
      padding: "4px 0",
      minWidth: "160px",
      fontSize: "13px",
      visibility: "hidden", // so layout isn't disrupted before positioning
    });
      data.dark ? menu.classList.toggle('dark', true) : menu.classList.toggle('light', true);

    requestAnimationFrame(() => {
      const menuHeight = menu.offsetHeight;
      const fixedTop = e.clientY - menuHeight;

      menu.style.top = `${fixedTop}px`;
      menu.style.visibility = "visible";
    });
    let closeAllitem = document.createElement("div");
    closeAllitem.textContent = "close all";
    closeAllitem.style.padding = "6px 10px";
    closeAllitem.style.cursor = "pointer";
    closeAllitem.addEventListener("click", function () {
      for (let i = 0; i < allBrowsers.length; i++) {
        allBrowsers[i].rootElement.remove();
        allBrowsers[i].rootElement = null;
        // Remove from allBrowsers
      }
      allBrowsers = [];
    });
    menu.appendChild(closeAllitem);
    /*
     */
    let hideAll = document.createElement("div");
    hideAll.textContent = "hide all";
    hideAll.style.padding = "6px 10px";
    hideAll.style.cursor = "pointer";
    hideAll.addEventListener("click", function () {
      for (let i = 0; i < allBrowsers.length; i++) {
        let instance = allBrowsers[i];
        if (!instance.isMaximized) instance.savedBounds = instance.getBounds();
        instance.rootElement.style.display = "none";
        instance._isMinimized = true;
      }
    });
    menu.appendChild(hideAll);

    let showAll = document.createElement("div");
    showAll.textContent = "show all";
    showAll.style.padding = "6px 10px";
    showAll.style.cursor = "pointer";
    showAll.addEventListener("click", function () {
      for (let i = 0; i < allBrowsers.length; i++) {
        let instance = allBrowsers[i];
        instance.rootElement.style.display = "block";
        instance._isMinimized = false;
        instance.isMaximized = false;
        instance.btnMax.textContent = "‎     □    ‎ ";
        instance._isMinimized = false;
        instance._isMinimized = false;
        bringToFront(instance.rootElement);
      }
    });
    menu.appendChild(showAll);
    let opennew = document.createElement("div");
    opennew.textContent = "new window";
    opennew.style.padding = "6px 10px";
    opennew.style.cursor = "pointer";
    opennew.addEventListener("click", function () {
      browser();
    });
    menu.appendChild(opennew);
    if (needremove) {
      let remove = document.createElement("div");
      remove.textContent = "remove from taskbar";
      remove.style.padding = "6px 10px";
      remove.style.cursor = "pointer";
      remove.addEventListener("click", function () {
        saveTaskButtons();
        for (let i = taskbuttons.length; i > 0; i--) {
          i--;
          let index = parseInt(getStringAfterChar(e.target.id, "-"));
          if (
            index === parseInt(getStringAfterChar(taskbuttons[i].id, "-")) &&
            taskbuttons[i].id.startsWith("🌐")
          ) {
            taskbuttons[i].remove();
            iconid = 0;
            let newtb = [];
            for (const a of taskbuttons) {
              a.id = Array.from(a.id)[0] + "-" + iconid;
              iconid++;
              if (Array.from(a.id)[0] !== "▶") {
                newtb.push(a);
              } else {
                a.id = Array.from(a.id)[0];
                newtb.push(a);
                iconid--;
              }
            }
            break;
          }
          i++;
        }
      });
      menu.appendChild(remove);
    } else {
      let remove = document.createElement("div");
      remove.textContent = "add to taskbar";
      remove.style.padding = "6px 10px";
      remove.style.cursor = "pointer";
      remove.addEventListener("click", function () {
        addTaskButton("🌐", browser);
        saveTaskButtons();
        purgeButtons();
        for (const browserButton of browserButtons) {
          browserButton.addEventListener("contextmenu", browsermenuhandler);
        }
      });
      menu.appendChild(remove);
    }
    const barrier = document.createElement("hr");
    menu.appendChild(barrier);

    if (allBrowsers.length === 0) {
      const item = document.createElement("div");
      item.textContent = "No open windows";
      item.style.padding = "6px 10px";
      menu.appendChild(item);
    } else {
      allBrowsers.forEach((instance, i) => {
        const item = document.createElement("div");
        item.textContent = instance.title || "Untitled";
        Object.assign(item.style, {
            padding: "6px 10px",
            cursor: "pointer",
            maxWidth: "185px",

            whiteSpace: "nowrap",      // ⬅️ prevent wrapping
            overflow: "hidden",        // ⬅️ hide overflow
            textOverflow: "ellipsis",  // ⬅️ show …
        });
        item.addEventListener("click", () => {
          // Bring to front
          bringToFront(instance.rootElement);

          // Unminimize if needed
          const el = instance.rootElement;
          if (el.style.display === "none") {
            el.style.display = "block";
            instance._isMinimized = false;
            instance.isMaximized = false;
            instance.btnMax.textContent = "‎     □    ‎ ";
            instance._isMinimized = false;
            instance._isMinimized = false;
          }
          menu.remove();
        });
        menu.appendChild(item);
      });
    }

    document.body.appendChild(menu);
    window.addEventListener("click", () => menu.remove(), { once: true });
  }

  window.addEventListener("appUpdated", function (e) {
  var babtn = document.getElementById("browserapp");
  babtn.addEventListener("contextmenu",   function bhl1(e) {
    browsermenuhandler(e, (needremove = false));
  });
  });
// Use MutationObserver to attach contextmenu listeners to taskbar/start buttons for browser
try {
  function attachBrowserContext(btn) {
    try {
      if (!btn || !(btn instanceof HTMLElement)) return;
      if (btn.dataset && btn.dataset.browserContextBound) return;
      const aid = (btn.dataset && btn.dataset.appId) || btn.id || '';
      if (!(String(aid) === '🌐' || String(aid) === 'browser')) return;
      btn.addEventListener('contextmenu', browsermenuhandler);
      if (btn.dataset) btn.dataset.browserContextBound = '1';
      browserButtons.push(btn);
    } catch (e) {}
  }

  try {
    const existing = (typeof taskbar !== 'undefined' && taskbar) ? taskbar.querySelectorAll('button') : document.querySelectorAll('button');
    for (const b of existing) attachBrowserContext(b);
  } catch (e) {}

  const observerTarget = (typeof taskbar !== 'undefined' && taskbar) ? taskbar : document.body;
  const mo = new MutationObserver((mutations) => {
    for (const m of mutations) {
      for (const n of m.addedNodes) {
        if (!(n instanceof HTMLElement)) continue;
        if (n.matches && n.matches('button')) attachBrowserContext(n);
        else {
          try { n.querySelectorAll && n.querySelectorAll('button') && n.querySelectorAll('button').forEach(attachBrowserContext); } catch (e) {}
        }
      }
    }
  });
  mo.observe(observerTarget, { childList: true, subtree: true });
} catch (e) {
  console.error('failed to attach browser context handlers', e);
}

// === Terminal command ideas for Browser ===
// Commands follow format: <app> <command> <args>
// Example usage and purpose (apps listen for 'terminalCommand'):
// browser open <url>               -> open URL in a new tab (or active tab)
// browser newtab                   -> open a new tab (goldenbody://newtab/)
// browser close-tab <tabId|index>  -> close the specified tab
// browser reload [tabId]           -> reload specified or active tab
// browser find <query>             -> find text in active page (send message to iframe)
// browser permissions <url>        -> open permissions UI for a site
// browser proxy <on|off|url>       -> toggle or set proxy for this browser instance
// Notes: browser instances should listen for 'terminalCommand' and check
// event.detail.app === 'browser' to respond. Commands may target an active
// browser window if terminal detail includes terminalId -> resolve mapping.
