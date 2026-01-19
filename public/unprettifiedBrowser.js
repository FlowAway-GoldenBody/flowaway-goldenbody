try {
function launchFG(data, iframeData = null) {
  let savedScrollX = 0;
let savedScrollY = 0;

window.addEventListener('scroll', () => {
    window.scrollTo(savedScrollX, savedScrollY);
});

savedScrollX = window.scrollX;
savedScrollY = window.scrollY;

  let tabisDragging = false;
  let draggedtab = 0;
  // body restrictions
  let bodyStyle = document.createElement('style');
  bodyStyle.textContent = 
  `body {
    overflow: hidden;
  }`;
  document.body.appendChild(bodyStyle);
  // content
  window.addEventListener("beforeunload", function (event) {
    // Check if there are unsaved changes or other reasons to warn the user
    event.preventDefault();
    if (userHasUnsavedChanges) {
        event.preventDefault(); // Standard way
        // For older browsers
        event.returnValue = ''; // Setting returnValue to an empty string (or any truthy value)
    }
    // If no unsaved changes, do nothing and the page unloads normally.
});
  const style = document.createElement('style');
  style.textContent = `
    .sim-chrome-root * { box-sizing: border-box; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial; }
    .sim-chrome-top { background: linear-gradient(#f6f7f8,#ededf0); height: 44px; display:flex; align-items:center; padding:0 8px; gap:8px; }
    .sim-chrome-tabs { display:flex; gap:2px;
				ms-overflow-style: none; scrollbar-width: none; align-items:center; padding:0; height: 32px; }
				.sim-chrome-tabs::-webkit-scrollbar {
				display:none;
				}
    .sim-tab { display:flex; align-items:center; gap:8px; padding:6px 10px; background:transparent; border-radius:6px; cursor:pointer; user-select:none; font-size:13px; color:#333; max-width:200px;
min-width:185px; overflow:hidden; white-space:nowrap; text-overflow:ellipsis;}
    .sim-tab.active { background: rgba(0,0,0,0.06); box-shadow: inset 0 -1px 0 rgba(0,0,0,0.04); }
    .sim-tab .close { font-weight:700; color:#777; cursor:pointer; padding-left:6px; margin-left: auto;}
    .sim-address-row { display:flex; align-items:center; gap:8px; flex:1; margin: 0 8px; }
    .sim-url-input { flex:1; height:32px; border-radius:6px; border:1px solid rgba(0,0,0,0.12); padding:0 10px; font-size:14px; }
 .sim-proxy-input { flex:0.1; size:10; height:32px; border-radius:6px; border:1px solid rgba(0,0,0,0.12); padding:0 10px; font-size:14px; }
    .sim-open-btn, .sim-fullscreen-btn, .sim-netab-btn { height:28px; padding:0 12px; border-radius:12px; border:1px solid rgba(0,0,0,0.12); background:#fff; cursor:pointer; font-size:13px; }
    .sim-toolbar { display:flex; align-items:center; gap:8px; padding:8px; background: #fff; border-top: 1px solid rgba(0,0,0,0.06); }
    .sim-iframe { width:100%; height: calc(100% - 84px); border:0; background:#fff; padding:10}
    .sim-status { font-size:12px; color:#666; margin-left:8px; }
    /* Tiny responsive */
    @media (max-width: 600px) {
      .sim-chrome-root { left:6px; right:6px; width:auto; height:480px; }
    }
  `;
  document.head.appendChild(style);
    var proxyurl = goldenbodywebsite;
  window.addEventListener('contextmenu', function(e) {
    e.preventDefault();
  });
  window.addEventListener('keydown', function(e) {
    if(e.ctrlKey && e.key === 'n') {
            e.preventDefault();
    if(atTop == 'browser' || atTop == '') {
      browser();
    }
    }
    else if(e.ctrlKey && e.shiftKey && e.key === 'W' && atTop == 'browser') {
      let allIds = [];
      for(let i = 0; i < allBrowsers.length; i++) {
        allIds.push(allBrowsers[i].rootElement._goldenbodyId);
      }
      let maxId = Math.max(...allIds);
      for(let i = 0; i < allBrowsers.length; i++) {
        if(allBrowsers[i].rootElement._goldenbodyId == maxId) {
            allBrowsers[i].rootElement.remove();
            allBrowsers[i].rootElement = null;
            allBrowsers.splice(i, 1);
        }
      }
    }
  });

var allBrowsers = [];
var browserId = 0;
var atTop = '';
var id = data[2];
let zTop = 10;

function bringToFront(el) {
  if (!el) return;
  el.style.zIndex = String(++zTop);
}
function save() {
    console.log([username, password, id])
}






function browser(preloadlink = null, preloadsize = 100, posX = 20, posY = 20) {
  function unshuffleURL(url) {
    if(url === goldenbodywebsite + 'newtab.html') {
      return 'goldenbody://newtab/';
    }

    return url.slice(55, url.length);
  }

function mainWebsite(string) {
let afterString = '';
let i = 0
if (string.startsWith('https://')) {
    afterString = 'https://';
    i = 8;
}
else if (string.startsWith('http://')) {
    afterString = 'http://';
    i = 7;
}
else {
    console.error('invalid link: make sure it starts with either http:// or https://');
    return;
}
for(; i < string.length; i++) {
    if(string[i] == '/') {
    afterString += string[i];
    return afterString;
    }
    else {
    afterString += string[i]
    }
}
return afterString;
}

  var listeners = [];
  let isMaximized = false;
  if(posX < 0) {
    posX = 0;
  }
  if(posY < 0) {
    posY = 0;
  }
  atTop = 'browser';
  var checkInterval = null;

  var activatedTab = 0;

isMaximized = false;

const chromeWindow = (function createChromeLikeUI() {
  // --- Create root container ---
  var root = document.createElement('div');
  root.className = 'sim-chrome-root';
  Object.assign(root.style, {
    position: 'fixed',
    top: posY + 'px',
    left: posX + 'px',
    width: '1000px',
    height: '640px',
    boxShadow: '0 12px 40px rgba(0,0,0,0.35)',
    borderRadius: '10px',
    overflow: 'hidden',
    background: '#ffffff'
  });
bringToFront(root);
var donotm = false;
browserId++;
root._goldenbodyId = browserId;
root.tabIndex = '0';
//what ifs
root.addEventListener('keydown', e => {
  // e.target is the element that actually has focus

  // Only trigger for Shift + T
  if (e.ctrlKey && e.key === 't') {
          e.preventDefault();

    addTab('goldenbody://newtab/', 'New Tab');
  }
});
var _isMinimized;


  // --- Top area ---
  const top = document.createElement('div');
  top.className = 'sim-chrome-top';
top.style.justifyContent = 'space-between';
  root.appendChild(top);

top.addEventListener('click', function () { bringToFront(root);
});

     var topBar = false;
if (!topBar) {
    topBar = document.createElement('div');
    topBar.className = 'browserTopBar';
    topBar.style.display = 'flex';
    topBar.style.justifyContent = 'flex-end';
    topBar.style.alignItems = 'center';
    topBar.style.padding = '2px';
    topBar.style.background = '#ccc';
    topBar.style.cursor = 'move';
    topBar.style.flexShrink = '0';
}


var btnMin = document.createElement('button');
btnMin.innerText = '‎    –    ‎' ;
btnMin.title = 'Minimize';
topBar.appendChild(btnMin);

var btnMax = document.createElement('button');
btnMax.innerText = '‎     □    ‎ ';
btnMax.title = 'Maximize/Restore';
topBar.appendChild(btnMax);

var btnClose = document.createElement('button');
btnClose.innerText = '‎     x    ‎ ';
btnClose.title = 'Close';
btnClose.style.color = 'white';
btnClose.style.backgroundColor = 'red';
topBar.appendChild(btnClose);

[topBar, btnMin, btnMax, btnClose].forEach(el => {
    el.style.margin = '0 2px';
    el.style.border = 'none';
    el.style.padding = '2px 5px';
    el.style.fontSize = '14px';
    el.style.cursor = 'pointer';
});
 
function getBounds() {
  return {
    left: root.style.left,
    top: root.style.top,
    width: root.style.width,
    height: root.style.height,
    position: root.style.position || 'fixed'
  };
}
var savedBounds = getBounds();

function getPos() {
  return {
    left: root.style.left,
    top: root.style.top,
    position: root.style.position || 'fixed'
  }
}
var savedpos = getPos();

function applyPos(b) {
  root.style.left = b.left;
  root.style.top = b.top;
}

function applyBounds(b) {
  if(b.width === '100%' && b.height === '100%') {
  root.style.left = b.left;
  root.style.top = b.top;
  root.style.width = '1000px';
  root.style.height = '640px';
  return;
}
  root.style.position = 'absolute';
  root.style.left = b.left;
  root.style.top = b.top;
  root.style.width = b.width;
  root.style.height = b.height;
}

// MINIMIZE
btnMin.addEventListener('click', function () {
  if(!isMaximized)
    savedBounds = getBounds();
root.style.display = 'none';
    _isMinimized = true;
// alert('minimized');
});

// MAXIMIZE / RESTORE
btnMax.addEventListener('click', function () {
  if (!isMaximized) {
    savedBounds = getBounds();
    root.style.position = 'absolute';
    root.style.left = '0';
    root.style.top = '0';
    root.style.width = '100%';
    // leave space for restart button (assume 50px)
    root.style.height = `calc(100% - 60px)`;
    btnMax.textContent = '‎     ⧉    ‎ '; // restore symbol
    isMaximized = true;
// alert('mximized');
    isMinimized = false;
  } else {
applyBounds(savedBounds);
    btnMax.textContent = '‎     □    ‎ ';
// alert('restored');
    isMaximized = false;
  }
});

// CLOSE
btnClose.addEventListener('click', function () {
  root.remove();
  root = null;

  // Remove from allBrowsers
  const index = allBrowsers.indexOf(chromeWindow);
  if (index !== -1) {
    allBrowsers.splice(index, 1);
  }

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

  _browserCalled = false;
} 
 
  const tabsRow = document.createElement('div');
  tabsRow.className = 'sim-chrome-tabs';
tabsRow.style.flex = '0 1 auto';
tabsRow.style.minWidth = '0px';
tabsRow.style.overflowX = 'auto';
tabsRow.style.whiteSpace = 'nowrap';
 


 
  // new tab button
  const newTabBtn = document.createElement('button');
  newTabBtn.className = 'sim-open-btn';
  newTabBtn.innerText = '+';
  newTabBtn.title = 'New tab';
  Object.assign(newTabBtn.style, {width:'28px', padding:'6px', fontSize:'16px', display:'inline-flex', alignItems:'center', justifyContent:'center', flexShrink:'0'});
  

  // address row
 const addressRow = document.createElement('div');
  addressRow.className = 'sim-address-row';
  root.appendChild(addressRow);



  const urlInput = document.createElement('input');
  urlInput.className = 'sim-url-input';
  urlInput.type = 'text';
  urlInput.placeholder = 'Enter URL (e.g. https://example.com)';
  urlInput.autocapitalize = 'off';
  urlInput.autocomplete = 'off';
  urlInput.spellcheck = false;
  addressRow.appendChild(urlInput);

  const openBtn = document.createElement('button');
  openBtn.className = 'sim-open-btn';
  openBtn.innerText = 'Open';
  addressRow.appendChild(openBtn);



var reloadBtn = document.createElement('button');
reloadBtn.textContent = '⟳';
reloadBtn.className = 'sim-open-btn';
reloadBtn.style.fontSize = '20px';
reloadBtn.style.justifyContent = 'center';
reloadBtn.style.alignItems = 'center';
addressRow.prepend(reloadBtn);

var forwardBtn = document.createElement('button');
forwardBtn.textContent = '->';
forwardBtn.className = 'sim-open-btn';
addressRow.prepend(forwardBtn);

var backBtn = document.createElement('button');
backBtn.textContent = '<-';
backBtn.className = 'sim-open-btn';
addressRow.prepend(backBtn);

  const fullscreenBtn = document.createElement('button');
  fullscreenBtn.className = 'sim-open-btn';
  fullscreenBtn.innerText = '⤢';
  fullscreenBtn.title = 'Toggle fullscreen';
  addressRow.prepend(fullscreenBtn);

  const status = document.createElement('div');
  status.className = 'sim-status';
status.style.flex = '0 0 auto';
  status.innerText = '';

let isshow = false;
const resizeDiv = document.createElement('div');
resizeDiv.style.backgroundColor = 'gray'; // visible
resizeDiv.style.position = 'absolute';
resizeDiv.style.width = '5%';
resizeDiv.style.height = '3%';
resizeDiv.style.left = '85%';
resizeDiv.style.top = '10%';
resizeDiv.style.zIndex = '9999';
resizeDiv.style.display = 'none';

addressRow.prepend(resizeDiv);
// setInterval(() => {
//   console.log(tabs);
// }, 10000);

root.addEventListener('mousedown', function() {
  resizeDiv.style.display = 'none';
  isshow = false;
});

let previousn = activatedTab.resizeP;
setInterval(() => {
  if(previousn === activatedTab.resizeP) {
    resizeDiv.style.display = 'none';
  }
  previousn = activatedTab.resizeP
}, 3000);
// ⟳ ⋮
  // iframes
  var iframes = [];

  
const leftGroup = document.createElement('div');
leftGroup.style.display = 'flex';
leftGroup.style.alignItems = 'center';
leftGroup.style.gap = '0px';
leftGroup.style.flex = '1';
leftGroup.style.minWidth = '0';
leftGroup.appendChild(tabsRow);
leftGroup.appendChild(status);

top.appendChild(leftGroup);
top.appendChild(topBar);
  document.body.appendChild(root);

  let tabwidth = 0;
  let tabs = [];
  let activeTabId = null;
  let tabCounter = 0;

// replace this:
tabsRow.style.flex = '0 1 auto';

// with this:
tabsRow.style.display = 'flex';
tabsRow.style.flex = '1 1 0';     // <-- grow and be the thing that shrinks
tabsRow.style.minWidth = '0';     // <-- required for flex children to actually shrink container
tabsRow.style.flexWrap = 'nowrap';
tabsRow.style.overflowX = 'auto';
tabsRow.style.overflowY = 'hidden';
leftGroup.style.flex = '1 1 auto';
leftGroup.style.minWidth = '0';
tabisDragging = false;
   let dragid = '';
  let dragindex = 0;

  function renderTabs() {
             var ids = 0;
    while (tabsRow.firstChild) tabsRow.removeChild(tabsRow.firstChild);
    leftGroup.appendChild(newTabBtn);

    // tabs
    tabs.forEach(t => {

      const el = document.createElement('div');
// inside renderTabs(), after creating el
el.style.flex = '0 0 auto';
el.id = 'id-' + ids;
ids++;
el.draggable = true;
el.name = 'tabs';
el.style.minWidth = '13.5%';   // or 150–185px if you want a bigger minimum
el.style.maxWidth = '13.5%';
el.style.overflow = 'hidden';
el.style.display = 'flex';
el.style.whiteSpace = 'nowrap';
el.tabIndex = '0';
el.onmousedown = function() {
  urlInput.focus();
};
el.setAttribute('draggable', 'true');
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
  if (fromIndex === -1 || toIndex === -1 || fromIndex === toIndex) return tabs;

  const [moved] = tabs.splice(fromIndex, 1);

  // After removing an earlier element, the target index shifts down by 1
  if (fromIndex < toIndex) toIndex--;

  tabs.splice(toIndex, 0, moved);
  debugger
  return tabs;
}
el.addEventListener('mousedown', (ev) => {
if (ev.target.classList.contains('close')) return;
  activateTab(t.id);
});
el.addEventListener('mouseup', function(){
        bringToFront(root);
});
el.addEventListener('dragstart', () => {
  tabisDragging = true;
  dragMoved = false;
  dragindex = countChild(tabsRow, el);
    draggedtab = tabs[dragindex];
  dragid = el.id;    
const onMouseUpAnywhere = (ev, notontab) => {
    if (!tabisDragging) return;

    const draggedelement = root.querySelector(`#${dragid}`);

    // Check if mouseup happened on a tab
    let targetTab;
    try {
    targetTab = ev.target.closest('.sim-tab');
    }
    catch(e) {
    }
    try {
    if(ev.target.className === 'sim-chrome-tabs' || ev.target.classList.contains('sim-tab') || ev.target.classList.contains('sim-tab-title') || ev.target.classList.contains('close') || ev.target.classList.contains('sim-open-btn')) {
      for(let i = 0; i < allBrowsers.length; i++) {
        let node = ev.target;
let parentWithId = null;

while (node) {
    if (node._goldenbodyId) {
        parentWithId = node;
        break;
    }
    node = node.parentElement;
}
if(parentWithId === root) {
            tabisDragging = false;
    dragMoved = false;
        draggedtab = null;

    window.removeEventListener('mouseup', onMouseUpAnywhere);
    return;

}
try{        if((allBrowsers[i].rootElement._goldenbodyId === parentWithId._goldenbodyId)) {
          allBrowsers[i].addTab(draggedtab.url, '', draggedtab.resizeP);
        }}catch(e){}
      }
              closeTab(draggedtab.id);

          tabisDragging = false;
    dragMoved = false;
        draggedtab = null;

    window.removeEventListener('mouseup', onMouseUpAnywhere);
    return;
    }
  }
  catch(e) {
  }
    if ((!targetTab || targetTab.id !== dragid)) {
      // Mouseup happened somewhere else
    browser(tabs[dragindex].url, draggedtab.resizeP, ev.clientX - 100, ev.clientY - 20); // your custom function
      closeTab(draggedtab.id);
    }

    tabisDragging = false;
    dragMoved = false;
        draggedtab = null;
    window.removeEventListener('mouseup', onMouseUpAnywhere);
  };
  window.addEventListener('mouseup', onMouseUpAnywhere);
//   for(let i = 0; i < tabs.length; i++) {
//   tabs[i].iframe.contentWindow.addEventListener('mouseup', onMouseUpAnywhere);
// }
window.addEventListener("message", (event) => {
    const data = event.data;
    if (data?.type === "iframe-mouseup") {

        console.log("Mouseup from iframe:");
        console.log("Coordinates:", data.x, data.y);
        console.log("Button pressed:", data.button);

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
        onMouseUpAnywhere(e, true);
        // Use pseudoEvent however you want
    }
});

});

el.addEventListener('mousemove', () => {
  if (tabisDragging) dragMoved = true;
});

el.addEventListener('mouseup', () => {
  if (tabisDragging && dragMoved) {
    const draggedelement = root.querySelector(`#${dragid}`);
    if (!draggedelement || draggedelement === el) return;

    // Determine if dragging right
    const isDraggingRight =
      draggedelement.compareDocumentPosition(el) & Node.DOCUMENT_POSITION_FOLLOWING;

    // Compute new index BEFORE inserting
    let newIndex = countChild(tabsRow, el);
    if (isDraggingRight) newIndex++; // insert after target

    // Update array first
    tabs = moveTabInArray(tabs, dragindex, newIndex);

    // Then update DOM
    tabsRow.insertBefore(
      draggedelement,
      isDraggingRight ? el.nextSibling : el
    );
  }

  tabisDragging = false;
      draggedtab = null;

  dragMoved = false;
});

const title = el.querySelector('.sim-tab-title');
if (title) title.style.textOverflow = 'ellipsis';
      el.className = 'sim-tab' + (t.id === activeTabId ? ' active' : '');
      el.title = t.title || 'Untitled';
      // let displayUrl = '';
      // for(let i = 0; i < t.url.length; i++) {
      //   if(i == 17) {
      //     displayUrl += '...';
      //     break;
      //   }
      //   displayUrl += t.url[i];
      // }
      el.innerHTML = `<span style='display: inline-block;overflow: hidden;white-space: nowrap; text-overflow: ellipsis;' class='sim-tab-title'>${t.title || 'Untitled'}</span>
                      <span class='close' title='Close tab'>&times;</span>`;
      // close handler
      el.querySelector('.close').addEventListener('click', (ev) => {
        ev.stopPropagation();
        closeTab(t.id);
      });
      tabsRow.appendChild(el);
						tabsRow.appendChild(newTabBtn);
    });
    // reorder tabs

  }
  window.addEventListener('message', function(e) {
    if(e.data.type === 'FROM_IFRAME') {
    addTab(e.data.message, 'New Tab');
    }
  });
//render tab end----------------------------------------------------------

  function addTab(url, title, resizeP = preloadsize) {
  const id = 'tab-' + (++tabCounter);
  const iframe = document.createElement('iframe');
  iframe.addEventListener('load', function() {
      tab.iframe.contentWindow.postMessage(
    { message: "GOLDENBODY_id", website: goldenbodywebsite, value: data[2] },
    "*"
  );
      function handleresize(e, tab) {
  if (e.ctrlKey && (e.key === '=' || e.key === '+')) {
    e.preventDefault();
        isshow = true;
    tab.resizeP += 5;
    if (tab.resizeP > 500) tab.resizeP = 500;
    resizeDiv.style.display = 'block';
  }
  else if (e.ctrlKey && e.key === '-') {
    e.preventDefault();
        isshow = true;
    tab.resizeP -= 5;
    if (tab.resizeP < 25) tab.resizeP = 25;
    resizeDiv.style.display = 'block';
  }
  else {
        isshow = false;
    resizeDiv.style.display = 'none';
  }
              let resizescript = document.createElement('script');
  resizescript.textContent = `document.body.style.zoom = ${tab.resizeP} + '%' || '100%'; // shrink page inside iframe`;
          tab.iframe.contentDocument.head.appendChild(resizescript);
  }
    function handleresizel1(e) {
    handleresize(e, tab);
  }

            tab.iframe.contentWindow.addEventListener('keydown', handleresizel1);
root.addEventListener('keydown', handleresizel1);
urlInput.value = unshuffleURL(iframe.contentWindow.location.href);
              let resizescript = document.createElement('script');
  resizescript.textContent = `document.body.style.zoom = ${tab.resizeP} + '%' || '100%'; // shrink page inside iframe`;
          tab.iframe.contentDocument.head.appendChild(resizescript);

              var script = tab.iframe.contentDocument.createElement('script');
        script.textContent = `setInterval(function(){var _goldenbody = document.getElementsByTagName('a'); for(let i = 0; i < _goldenbody.length; i++) {_goldenbody[i].target="_self";}},250); function callParent(url) {
    window.parent.postMessage(
      { type: "FROM_IFRAME", message: url },
      "*"
    );
  }

    window.showOpenFilePicker = function(){alert('this feature is during construction, please use the drop files for now!');};
`;
        tab.iframe.contentDocument.head.appendChild(script);

  });
  iframe.addEventListener('load', function onLoad() {
  const doc = iframe.contentDocument;
  const win = iframe.contentWindow;
  
  // Skip if unloaded or invalid
  if (!doc || !win) return;
    
  // Remove old handler if exists
  win.removeEventListener('keydown', win.erudaKeyHandler);

  // Define new handler
  win.erudaKeyHandler = function(e) {
    if (e.ctrlKey && e.shiftKey && e.key.toLowerCase() === 'i') {
      if (!win.eruda) {
          iframe.contentWindow._goldenbodyIns = true;

        const script = doc.createElement('script');
        script.src = 'https://cdn.jsdelivr.net/npm/eruda';
        script.onload = () => {
          win.eruda.init();
          win.eruda.get('entryBtn').hide();
          win.eruda.show();
        };
        doc.head.appendChild(script);
      } else {
try{        // toggle show/hide
        if (!win._goldenbodyIns) {
                    win.eruda.show();

          win._goldenbodyIns = true;
        } else {
                    win.eruda.hide();

          win._goldenbodyIns = false;
        }
      }
    catch(e) {console.error(e)}
      }
    }
  };

  // Attach handler
  win.addEventListener('keydown', win.erudaKeyHandler);
});


function injectPatch(iframe) {
  try {
    const doc = iframe.contentDocument;

    // Create a patch script
    const script = doc.createElement('script');
    script.textContent = `
      // Override window.self === window.top check
      // Object.defineProperty(window, 'top', {
      //   get: () => window.self,
      //   configurable: true
      // });

      // // Optional: override function or variable used in the check
      // window.isTopWindow = () => false;
    `;

    // Prepend to <head> or <html> to ensure it runs first
    if (doc.head) {
      doc.head.prepend(script);
    } else {
      doc.documentElement.prepend(script);
    }
  } catch (e) {
    console.warn('Cannot inject script into iframe:', e);
  }
}

// Run ASAP
iframe.addEventListener('load', () => injectPatch(iframe));


  // setInterval(() => {
  //         try {
  //   if(iframe.contentDocument.readyState === 'complete') {
  //     const docTitle = tab.iframe.contentDocument && tab.iframe.contentDocument.title;
  //     if(!donotm)
  //     tab.title = docTitle
  //   }
  //   else {
  //     tab.title = 'Loading...';
  //   }
  // }
  // catch(e){}

  // }, 1000);
  const titleInterval = setInterval(() => {
  try {
    if (!iframe || !iframe.contentDocument) {
      clearInterval(titleInterval);
      console.warn('Interval cleared: iframe is gone');
      return;
    }
    tab.url = unshuffleURL(iframe.contentWindow.location.href);
    if (iframe.contentDocument.readyState === 'complete') {
      const docTitle = iframe.contentDocument.title || 'Untitled';
      if (!donotm)
        tab.title = docTitle;
    } else {
      tab.title = 'Loading...';
    }
    
  } catch (e) {
    clearInterval(titleInterval);
    console.warn('Interval cleared due to error:', e);
  }
        if(previousTabTitle !== tab.title)
renderTabs();
      previousTabTitle = tab.title;

}, 1000);

  iframe.tabIndex = '0';
  iframe.className = 'sim-iframe';
  iframe.allow = `
    accelerometer; 
    autoplay; 
    camera; 
    clipboard-read; 
    clipboard-write; 
    cross-origin-isolated; 
    display-capture; 
    encrypted-media; 
    fullscreen; 
    geolocation; 
    gyroscope; 
    magnetometer; 
    microphone; 
    midi; 
    payment; 
    picture-in-picture; 
    publickey-credentials-get; 
    screen-wake-lock; 
    serial; 
    sync-xhr; 
    usb; 
    web-share; 
    xr-spatial-tracking; 
    idle-detection; 
`;
iframe.allowFullscreen = true;
  iframe.sandbox = 'allow-forms allow-modals allow-orientation-lock allow-pointer-lock allow-presentation allow-same-origin allow-scripts';
iframe.onload = function() {
  // Get the document inside the iframe
  const iframeDocument = iframe.contentDocument || iframe.contentWindow.document;
  iframe.contentWindow.addEventListener('keydown', function(e){
        if(e.ctrlKey && e.key === 'n') {
            e.preventDefault();
    if(atTop == 'browser' || atTop == '') {
      browser();
    }
    }
    else if(e.ctrlKey && e.shiftKey && e.key === 'W' && atTop == 'browser') {
      let allIds = [];
      for(let i = 0; i < allBrowsers.length; i++) {
        allIds.push(allBrowsers[i].rootElement._goldenbodyId);
      }
      let maxId = Math.max(...allIds);
      for(let i = 0; i < allBrowsers.length; i++) {
        if(allBrowsers[i].rootElement._goldenbodyId == maxId) {
            allBrowsers[i].rootElement.remove();
            allBrowsers[i].rootElement = null;
            allBrowsers.splice(i, 1);
        }
      }
    }
  else if (e.ctrlKey && e.key === 't') {
          e.preventDefault();

    addTab('goldenbody://newtab/', 'New Tab');
  }


  });
  let doc = iframeDocument;
  // may need to fix shell shockers {
  // const base = doc.createElement('base');
  // base.href = proxyurl + '/' + data[2] + '/' + url;



  // Insert into <head> (or create one if missing)
  // if (doc.head) {
  //   doc.head.prepend(base);
  // } else {
  //   const head = doc.createElement('head');
  //   head.appendChild(base);
  //   doc.documentElement.prepend(head);
  // }
  //}
  // Now, add the event listener to the iframe's document
// Assume iframe is already defined

  // Create a reusable custom context menu
  const menu = iframeDocument.createElement('div');
    menu.style.all = 'unset';

  menu.id = 'custom-context-menu';
  menu.style.display = 'block'; // <-- important!

  menu.style.position = 'fixed';
  menu.style.background = '#222';
  menu.style.color = '#fff';
  menu.style.padding = '8px 0';
  menu.style.borderRadius = '6px';
  menu.style.boxShadow = '0 2px 10px rgba(0,0,0,0.3)';
  menu.style.fontFamily = 'sans-serif';
  menu.style.fontSize = '14px';
  menu.style.display = 'none';
  menu.style.zIndex = '9999';
  iframeDocument.body.appendChild(menu);
  
window.addEventListener('mousedown', function() {
  menu.style.display = 'none';
});
  // Function to show the menu
function showMenu(x, y, linkElement, isA) {
if(isA) {
  menu.innerHTML = ''; // clear old items

  // Create menu items (same as before)

  const openItem = iframeDocument.createElement('div');
      openItem.style.all = 'unset';

  openItem.textContent = 'Open link in new tabㅤㅤㅤㅤㅤ';
  openItem.style.display = 'block'; // <-- important!
openItem.style.textAlign = 'left';

  openItem.style.padding = '6px 16px';
  openItem.style.cursor = 'pointer';
  openItem.onmouseenter = () => (openItem.style.background = '#444');
    openItem.style.font = 'Arial';
  openItem.onmouseleave = () => (openItem.style.background = 'none');
  openItem.onclick = () => {
    addTab(linkElement.href, 'New Tab');
    hideMenu();
  };
  menu.appendChild(openItem);

  const openItem2 = iframeDocument.createElement('div');
      openItem2.style.all = 'unset';

  openItem2.textContent = 'Open link in new windowㅤㅤㅤㅤㅤ';
  openItem2.style.display = 'block'; // <-- important!
openItem2.style.textAlign = 'left';

  openItem2.style.padding = '6px 16px';
  openItem2.style.cursor = 'pointer';
  openItem2.onmouseenter = () => (openItem2.style.background = '#444');
    openItem2.style.font = 'Arial';
  openItem2.onmouseleave = () => (openItem2.style.background = 'none');
  openItem2.onclick = () => {
    browser(linkElement.href);
    hideMenu();
  };
  menu.appendChild(openItem2);

  const copyItem = iframeDocument.createElement('div');
      copyItem.style.all = 'unset';
copyItem.style.display = 'block'; // <-- important!
copyItem.style.textAlign = 'left';

  copyItem.textContent = 'Copy link address';
  copyItem.style.padding = '6px 16px';
  copyItem.style.cursor = 'pointer';
    copyItem.style.font = 'Arial';
  copyItem.onmouseenter = () => (copyItem.style.background = '#444');
  copyItem.onmouseleave = () => (copyItem.style.background = 'none');
  copyItem.onclick = async () => {
    await navigator.clipboard.writeText(linkElement.href);
    hideMenu();
  };
  menu.appendChild(copyItem);

    const inspect = iframeDocument.createElement('div');
        inspect.style.all = 'unset';
inspect.style.display = 'block'; // <-- important!
inspect.style.textAlign = 'left';

  inspect.textContent = 'inspect ㅤㅤㅤㅤㅤㅤㅤㅤCtrl+Shift+I';
  inspect.style.padding = '6px 16px';
    inspect.style.font = 'Arial';
  inspect.style.cursor = 'pointer';
  inspect.onmouseenter = () => (inspect.style.background = '#444');
  inspect.onmouseleave = () => (inspect.style.background = 'none');
  inspect.onclick = () => {
    const win = tab.iframe.contentWindow;
    const doc = tab.iframe.contentDocument;
    if (!win) return;
      if (!win.eruda) {
          tab.iframe.contentWindow._goldenbodyIns = true;

        const script = doc.createElement('script');
        script.src = 'https://cdn.jsdelivr.net/npm/eruda';
        script.onload = () => {
          win.eruda.init();
          win.eruda.get('entryBtn').hide();
          win.eruda.show();
        };
        doc.head.appendChild(script);
      }
    win.eruda[win._goldenbodyIns ? 'hide' : 'show']();
        win._goldenbodyIns = !win._goldenbodyIns;

        hideMenu();
  };
  menu.appendChild(inspect);
  // Temporarily show the menu off-screen to measure its size
  menu.style.left = '-9999px';
  menu.style.top = '-9999px';
  menu.style.display = 'block';
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
else {
  menu.innerHTML = '';
  menu.style.display = 'block';
  const openItem = iframeDocument.createElement('div');
      openItem.style.all = 'unset';
openItem.style.display = 'block'; // <-- important!

  openItem.textContent = 'Backㅤㅤㅤㅤㅤㅤㅤㅤㅤㅤㅤ';
  openItem.style.padding = '6px 16px';
  openItem.style.textAlign = 'left';

    openItem.style.font = 'Arial';
  openItem.style.cursor = 'pointer';
  openItem.onmouseenter = () => (openItem.style.background = '#444');
  openItem.onmouseleave = () => (openItem.style.background = 'none');
  openItem.onclick = () => {
    iframe.contentWindow.history.back();
    hideMenu();
  };
  menu.appendChild(openItem);
  const forward = iframeDocument.createElement('div');
      forward.style.all = 'unset';
forward.style.display = 'block'; // <-- important!
forward.style.textAlign = 'left';

  forward.textContent = 'Forward';
  forward.style.font = 'Arial';
  forward.style.padding = '6px 16px';
  forward.style.cursor = 'pointer';
  forward.onmouseenter = () => (forward.style.background = '#444');
  forward.onmouseleave = () => (forward.style.background = 'none');
  forward.onclick = () => {
    iframe.contentWindow.history.forward();
    hideMenu();
  };
  menu.appendChild(forward);
  const reload = iframeDocument.createElement('div');
      reload.style.all = 'unset';
 reload.style.display = 'block'; // <-- important!
reload.style.textAlign = 'left';


  reload.textContent = 'Reload';
  reload.style.padding = '6px 16px';
    reload.style.font = 'Arial';
  reload.style.cursor = 'pointer';
  reload.onmouseenter = () => (reload.style.background = '#444');
  reload.onmouseleave = () => (reload.style.background = 'none');
  reload.onclick = () => {
    iframe.contentWindow.location.reload();
    hideMenu();
  };
  menu.appendChild(reload);
  const inspect = iframeDocument.createElement('div');
      inspect.style.all = 'unset';
inspect.style.display = 'block'; // <-- important!

inspect.style.textAlign = 'left';

  inspect.textContent = 'inspect ㅤㅤㅤㅤㅤㅤㅤㅤCtrl+Shift+I';
  inspect.style.padding = '6px 16px';
    inspect.style.font = 'Arial';
  inspect.style.cursor = 'pointer';
  inspect.onmouseenter = () => (inspect.style.background = '#444');
  inspect.onmouseleave = () => (inspect.style.background = 'none');
  inspect.onclick = () => {
    const win = tab.iframe.contentWindow;
    const doc = tab.iframe.contentDocument;
    if (!win) return;
      if (!win.eruda) {
          tab.iframe.contentWindow._goldenbodyIns = true;

        const script = doc.createElement('script');
        script.src = 'https://cdn.jsdelivr.net/npm/eruda';
        script.onload = () => {
          win.eruda.init();
          win.eruda.get('entryBtn').hide();
          win.eruda.show();
        };
        doc.head.appendChild(script);
      }
    win.eruda[win._goldenbodyIns ? 'hide' : 'show']();
        win._goldenbodyIns = !win._goldenbodyIns;


    hideMenu();
  };
  menu.appendChild(inspect);

  // Temporarily show the menu off-screen to measure its size
  menu.style.left = '-9999px';
  menu.style.top = '-9999px';
  menu.style.display = 'block';
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
}
console.log('keydown handler attached');
root.addEventListener('keydown', (e) => {
  if (e.ctrlKey && e.shiftKey && e.key.toLowerCase() === 'i') {
    console.log('fired!');
  }
});


  // Hide the menu
  function hideMenu() {
    menu.style.display = 'none';
  }

  // Listen for right-clicks inside the iframe
  
  iframe.contentWindow.addEventListener('contextmenu', function(e) {
        // Check if the element or document already has a handler
    const hasInlineHandler = e.target.oncontextmenu !== null;
    
    // If some other handler already called preventDefault, skip
    if (hasInlineHandler && e.defaultPrevented) {
        return; // Let the site's menu show or browser default
    }

    e.preventDefault();
    e.stopPropagation();
    const clickedElement = e.target;
    const linkElement = clickedElement.closest('a');

    if (linkElement && linkElement.href) {
      console.log('Right-clicked on a link:', linkElement.href);
      showMenu(e.pageX, e.pageY, linkElement, true);
    } else {
      showMenu(e.pageX, e.pageY, null, false);
      console.log('Right-clicked on a non-link element.');
    }
  });
//   setInterval(() => {
//     try{
//     let childframes = iframeDocument.getElementsByTagName('iframe');
// for(let i = 0; i < childframes.length; i++) {
// childframes[i].contentWindow.addEventListener('contextmenu', function (e) {
    // const hasInlineHandler = e.target.oncontextmenu !== null;
    // if (hasInlineHandler || e.defaultPrevented) return;

    // e.preventDefault();
    // e.stopPropagation();


    // const clickedElement = e.target;
    // const linkElement = clickedElement.closest('a');

    // if (linkElement && linkElement.href) {
    //   console.log('Right-clicked on a link:', linkElement.href);
    //   showMenu(x, y, linkElement, true);
    // } else {
    //   showMenu(x, y, null, false);
    //   console.log('Right-clicked on a non-link element.');
    // }
//     } catch(e){}
//   }, 1000);
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








function recurseFrames(doc) {
  if (!doc) return;

  // do something for this document (attach context menu, log, etc.)
  const frames = doc.querySelectorAll('iframe');

  for (const frame of frames) {
    try {
      // Wait for the iframe to load (so its contentDocument exists)
        try {
      const win = frame.contentWindow;
  frame.contentDocument.addEventListener('keydown', function(){document.activeElement.focus();});

            frame.contentDocument.addEventListener('click', hideMenu);
            if(!frame.contentWindow.onMouseUp) {
              frame.contentWindow.onMouseUp = function (ev) {
    window.top.postMessage(
        {
            type: "iframe-mouseup",
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
        "*"
    );
};
            }
            if(!win.contextMenuHandler) {
            win.contextMenuHandler = function(e){
                const hasInlineHandler = e.target.oncontextmenu !== null;
    if (hasInlineHandler || e.defaultPrevented) return;
    e.preventDefault();
    e.stopPropagation();


  // Attach handler
 const { x, y } = getAbsoluteMousePosition(e, frame.contentDocument);

    const clickedElement = e.target;
    const linkElement = clickedElement.closest('a');

    if (linkElement && linkElement.href) {
      console.log('Right-clicked on a link:', linkElement.href);
      showMenu(x, y, linkElement, true);
    } else {
      showMenu(x, y, null, false);
      console.log('Right-clicked on a non-link element.');
    }


          }
        }

      const mwin = tab.iframe.contentWindow;
      win.tabIndex = '0';
      if(!win.suberudaKeyHandler) {
          win.erudaKeyHandler = function(e) {
    if (e.ctrlKey && e.shiftKey && e.key.toLowerCase() === 'i') {
      if (!win.eruda) {
          iframe.contentWindow._goldenbodyIns = true;

        const script = doc.createElement('script');
        script.src = 'https://cdn.jsdelivr.net/npm/eruda';
        script.onload = () => {
          win.eruda.init();
          win.eruda.get('entryBtn').hide();
          win.eruda.show();
        };
        doc.head.appendChild(script);
      } else {
try{        // toggle show/hide
        if (!win._goldenbodyIns) {
                    win.eruda.show();

          win._goldenbodyIns = true;
        } else {
                    win.eruda.hide();

          win._goldenbodyIns = false;
        }
      }
    catch(e) {console.error(e)}
      }
    }
  };


      win.suberudaKeyHandler = function(e) {
        console.log('eruda eky handajfiohsdif');
    if (e.ctrlKey && e.shiftKey && e.key.toLowerCase() === 'i') {
      
      if(frame.contentWindow.parent !== window) {document.activeElement.contentDocument.body.focus();}
      return;
    }
    else if ((e.ctrlKey && (e.key === '+' || e.key === '=')) || (e.ctrlKey && e.key === '-')) {
            if(frame.contentWindow.parent !== window) {document.activeElement.contentDocument.body.focus()}

      // handleresize(e, tab);
      return;
    }

  };
}
function attatch() {
              frame.contentWindow.removeEventListener("mouseup", frame.contentWindow.onMouseUp);
            frame.contentWindow.addEventListener("mouseup", frame.contentWindow.onMouseUp);
    win.removeEventListener('keydown', win.suberudaKeyHandler);

                win.addEventListener('keydown', win.suberudaKeyHandler);
                                          frame.contentWindow.removeEventListener('contextmenu', win.contextMenuHandler);

                          frame.contentWindow.addEventListener('contextmenu', win.contextMenuHandler);
}
attatch();
//   // get all iframes in this document
        } catch (e) {
          // console.warn('Cannot access nested frame:', frame.src);
          // console.error(e);
        }

      // If already loaded, go in immediately
      if (frame.contentDocument && frame.contentDocument.readyState === 'complete') {
        recurseFrames(frame.contentDocument);
      }
    } catch (err) {
      console.warn('Blocked or cross-origin iframe:', frame.src);
    }
  }
}
const recurseInterval = setInterval(() => {
  try {
    if (!iframe || !iframe.contentDocument) {
      clearInterval(recurseInterval);
      console.warn('Recurse interval cleared: iframe missing');
      return;
    }

    recurseFrames(window.document);
  } catch (e) {
    clearInterval(recurseInterval);
    console.warn('Recurse interval cleared due to error:', e);
  }
}, 2000);
  // const observer = new MutationObserver((mutations) => {
  //   console.log('Iframe content changed:', mutations);
  //   recurseFrames(iframe.contentDocument);
  // });
  //   observer.observe(iframe.contentDocument.body, {
  //   childList: true, // detect added/removed nodes
  //   subtree: true,   // detect changes in all descendants
  // });
// Start from the top-level document
recurseFrames(iframe.contentDocument);

  // Hide the menu when clicking elsewhere
  iframeDocument.addEventListener('click', hideMenu);
};
if (proxyurl != '') {
  iframe.src = a(url, proxyurl);
}
else {
 iframe.src = url;
}
  iframe.style.display = 'none'; 
  root.appendChild(iframe);
  const tab = { id, url, title, iframe, resizeP };
    let previousTabTitle = tab.title;

      donotm = true;
                tab.title = 'Loading...';
setTimeout(function(){donotm = false;}, 5000);

  tabs.push(tab);
  activateTab(id);
  renderTabs();
  document.addEventListener('keyup', function (e) {
    if(!root.contains(document.activeElement)) return;
  if (e.ctrlKey && e.shiftKey && e.key.toLowerCase() === 'i') {
    e.preventDefault();
    e.stopPropagation();

    const win = tab.iframe.contentWindow;
    const doc = tab.iframe.contentDocument;
    if (!win) return;
      if (!win.eruda) {
          tab.iframe.contentWindow._goldenbodyIns = true;

        const script = doc.createElement('script');
        script.src = 'https://cdn.jsdelivr.net/npm/eruda';
        script.onload = () => {
          win.eruda.init();
          win.eruda.get('entryBtn').hide();
          win.eruda.show();
        };
        doc.head.appendChild(script);
      }
    win.eruda[win._goldenbodyIns ? 'hide' : 'show']();
        win._goldenbodyIns = !win._goldenbodyIns;

  }
});

  return id;
}

if(preloadlink) {
  addTab(preloadlink, 'New Tab');
}

function activateTab(id) {
try {
  clearInterval(checkInterval);
  donotm = false;
  }
catch(a){}
  const tab = tabs.find(t => t.id === id);
  if (!tab) return;
  // function handleresize(e, tab) {
  // if (e.ctrlKey && (e.key === '=' || e.key === '+')) {
  //   e.preventDefault();
  //       isshow = true;
  //   tab.resizeP += 5;
  //   if (tab.resizeP > 500) tab.resizeP = 500;
  //   resizeDiv.style.display = 'block';
  // }
  // else if (e.ctrlKey && e.key === '-') {
  //   e.preventDefault();
  //       isshow = true;
  //   tab.resizeP -= 5;
  //   if (tab.resizeP < 25) tab.resizeP = 25;
  //   resizeDiv.style.display = 'block';
  // }
  // else {
  //       isshow = false;
  //   resizeDiv.style.display = 'none';
  // }
  //             let resizescript = document.createElement('script');
  // resizescript.textContent = `document.body.style.zoom = ${tab.resizeP} + '%' || '100%'; // shrink page inside iframe`;
  //         tab.iframe.contentDocument.head.appendChild(resizescript);
  // }
  // let beforetime = new Date().getTime();
  // function handleresizel1(e) {
  //   let afterTime = new Date().getTime();
  //   if (afterTime-beforetime < 100) return;
  //   handleresize(e, tab);
  // }
  // tab.iframe.contentWindow.removeEventListener('keydown', handleresizel1);
  // root.removeEventListener('keydown', handleresizel1);
  // root.addEventListener('keydown', handleresizel1);
  tab.iframe.contentWindow.addEventListener('keydown', function(e) {
  if (e.ctrlKey && e.key === 'w') {
    if(tab.iframe.style.display !== 'none') {
      closeTab(id);
    }
  }
  });
  root.addEventListener('keydown', function(e) {
  if (e.ctrlKey && e.key === 'w') {
    if(tab.iframe.style.display !== 'none') {
      closeTab(id);
    }
  }
  });

  root.focus();
  // Hide all iframes, show only active
  tabs.forEach(t => t.iframe.style.display = 'none');
  tab.iframe.style.display = "block";
  backBtn.onclick = function() {
    tab.iframe.contentWindow.history.back();
  };
  forwardBtn.onclick = function() {
    tab.iframe.contentWindow.history.forward();
  };
  reloadBtn.onclick = function() {
    if (reloadBtn.textContent === 'x') {
      donotm = false;
      tab.iframe.contentWindow.stop();
    }
    else{
      tab.iframe.contentWindow.location.reload();
    }
  };
  activeTabId = id;
  urlInput.value = unshuffleURL(tab.iframe.contentWindow.location.href);
  let previousUrl = unshuffleURL(tab.iframe.contentWindow.location.href);
  let previousTabTitle = tab.title;


  // Inject custom styles
checkInterval = setInterval(() => {
  if(allBrowsers.length == 0) {clearInterval(checkInterval);}
try{ 
resizeDiv.innerText = tab.resizeP+'%';
        activatedTab = tab;
        const currentUrl = unshuffleURL(tab.iframe.contentWindow.location.href);
        if (currentUrl !== previousUrl) {
        urlInput.value = currentUrl;
            // Update the previous URL for the next check
        previousUrl = currentUrl;
        }

      if (tab.iframe.contentDocument.readyState !== "complete" || donotm) {
        reloadBtn.textContent = 'x';

        tab.title = 'Loading...';
      }
      else {
        reloadBtn.textContent = '⟳';
      try {
    if(tab.iframe.contentDocument.readyState === 'complete') {
      const docTitle = tab.iframe.contentDocument && tab.iframe.contentDocument.title;
      if(!donotm)
      tab.title = docTitle
    }
  }
  catch(e){}
      }
      if(previousTabTitle !== tab.title)
renderTabs();
      previousTabTitle = tab.title;

  } catch(e){ console.error(e); clearInterval(checkInterval);}
  }, 250);
  renderTabs();
}

function closeTab(id) {
  const idx = tabs.findIndex(t => t.id === id);
  if (idx === -1) return;

  const removingActive = tabs[idx].id === activeTabId;
  tabs[idx].iframe.remove(); 
  tabs.splice(idx, 1);

  if (removingActive) {
    if (tabs.length) activateTab(tabs[Math.max(0, idx - 1)].id);
    else closeWindow();//addTab('goldenbody://newtab/', 'New Tab');
  } else {
    renderTabs();
  }
}
if(!preloadlink)
    addTab('goldenbody://newtab/', 'New Tab');

 

  // --- Open button behavior ---
  function normalizeUrl(input) {
if(input[input.length - 1] != '/')
input += '/';

if(input[0] + input[1] + input[2] + input[3] + input[4] + input[5] + input[6] + input[7] != 'https://' && input[0] + input[1] + input[2] + input[3] + input[4] + input[5] + input[6] != 'http://' && !input.startsWith('goldenbody://'))
      return 'https://' + input;
else
return input;
}

  function openUrlInActiveTab(rawUrl) {
  const url = normalizeUrl(rawUrl);
  const tabIndex = tabs.findIndex(t => t.id === activeTabId);
  if (tabIndex === -1) return;

  tabs[tabIndex].url = url;

  const tab = tabs[tabIndex];
  donotm = true;
                tab.title = 'Loading...';
setTimeout(function(){donotm = false;}, 5000);
if (tabs[tabIndex].iframe) {
if (!url.startsWith('goldenbody://')) {
  try {
    tabs[tabIndex].iframe.contentWindow.location.href = a(url, proxyurl);
  }
  catch(e) {
    console.error(e);
    tabs[tabIndex].src = a(url, proxyurl);
  }
}
else {
  try {
    tabs[tabIndex].iframe.contentWindow.location.href = a(url, proxyurl);
  }
  catch(e) {
    console.error(e);
    tabs[tabIndex].src = a(url, proxyurl);
  }

  }
}

  urlInput.value = url;
  status.innerText = `Loaded: ${url}`;
  setTimeout(() => status.innerText = '', 3000);
}

  openBtn.addEventListener('click', () => openUrlInActiveTab(urlInput.value));
  urlInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') openUrlInActiveTab(urlInput.value);
  });


  // new tab
  newTabBtn.addEventListener('click', () => {
    const id = addTab('goldenbody://newtab/', 'New Tab');
    activateTab(id);
    urlInput.focus();
  });

  // fullscreen
  let isFullscreen = false;
  async function enterFullscreen() {
    if (root.requestFullscreen) await root.requestFullscreen();
    else if (root.webkitRequestFullscreen) await root.webkitRequestFullscreen();
    isFullscreen = true;
    fullscreenBtn.innerText = '⤡';
  }
  async function exitFullscreen() {
    if (document.exitFullscreen) await document.exitFullscreen();
    else if (document.webkitExitFullscreen) await document.webkitExitFullscreen();
    isFullscreen = false;
    fullscreenBtn.innerText = '⤢';
  }
  fullscreenBtn.addEventListener('click', () => {
    if (!isFullscreen) enterFullscreen(); else exitFullscreen();
  });

  // drag to move window
		var currentX;
var currentY;

  (function makeDraggable() {
		
    let dragging = false, startX=0, startY=0, origLeft=0, origTop=0;
    top.addEventListener('mousedown', (ev) => {
      if (ev.target.closest('.sim-tab') || ev.target === newTabBtn || ev.target === urlInput || ev.target === openBtn) return;
      dragging = true;
      startX = ev.clientX; startY = ev.clientY;
      origLeft = root.offsetLeft;
origTop = root.offsetTop;

      document.body.style.userSelect = 'none';
						currentX = ev.clientX;
						currentY = ev.clientY;
    });
    window.addEventListener('mousemove', (ev) => {
				if(!dragging) {startX = 0; startY = 0; return;}
		
						if(ev.clientX - currentX > 1 && dragging || ev.clientY - currentY > 1 && dragging) {
              applyBounds(savedBounds);
              if(isMaximized) {
                              root.style.left = ev.clientX - root.clientWidth/2+ 'px';
                              origLeft = ev.clientX - root.clientWidth/2;
btnMax.textContent = '‎     □    ‎ ';
// alert('restored');
    isMaximized = false;


              }
}

      if (!dragging) return;
      const dx = ev.clientX - startX, dy = ev.clientY - startY;
      root.style.left = (origLeft + dx) + 'px';
      if(origTop + dy > 0)
      root.style.top = (origTop + dy) + 'px';
      else
      root.style.top = '0px';
    });
    window.addEventListener('mouseup', () => {
            dragging = false;
      document.body.style.userSelect = '';
    
						

    });
  })();
let resizing;
function resize() {
  const el = root;
  const BW = 8;                      // fatter edge = easier to grab
  const minW = 450, minH = 350;

  // ensure positioned & has top/left so we can move edges
  if (!el.style.position) el.style.position = 'fixed';
  if (!el.style.top)  el.style.top  = '20px';
  if (!el.style.left) el.style.left = '20px';

  // state
  let active = null; // {dir,sx,sy,sw,sh,sl,st}
  let dir = '';

  // helper: are we on an edge?
  const hitTest = (e) => {
    const r = el.getBoundingClientRect();
    const x = e.clientX, y = e.clientY;
    const onL = x >= r.left  && x <= r.left + BW;
    const onR = x <= r.right && x >= r.right - BW;
    const onT = y >= r.top   && y <= r.top + BW;
    const onB = y <= r.bottom&& y >= r.bottom - BW;

    if (onT && onL) return 'nw';
    if (onT && onR) return 'ne';
    if (onB && onL) return 'sw';
    if (onB && onR) return 'se';
    if (onL) return 'w';
    if (onR) return 'e';
    if (onT) return 'n';
    if (onB) return 's';
    return '';
  };
  // cursor feedback
  el.addEventListener('pointermove', (e) => {
    if (active) return;  // don't flicker while resizing
    const d = hitTest(e);
    el.style.cursor =
      d === 'nw' || d === 'se' ? 'nwse-resize' :
      d === 'ne' || d === 'sw' ? 'nesw-resize' :
      d === 'n'  || d === 's'  ? 'ns-resize'   :
      d === 'e'  || d === 'w'  ? 'ew-resize'   : 'default';
  });

  // start resize
  el.addEventListener('pointerdown', (e) => {
    dir = hitTest(e);
    if (!dir) return;
    resizing = true;
    e.preventDefault();
    el.setPointerCapture(e.pointerId);          // <- keep events!
    const r = el.getBoundingClientRect();
    active = { dir, sx: e.clientX, sy: e.clientY, sw: r.width, sh: r.height, sl: r.left, st: r.top };

    // stop iframe from eating events
    el.querySelectorAll('iframe').forEach(f => { f._oldPE = f.style.pointerEvents; f.style.pointerEvents = 'none'; });

    // clear maximized state
    // try { btnMax.textContent = '‎     □    ‎ '; } catch {}
    // try { isMaximized = false; } catch {}

    document.body.style.userSelect = 'none';
    document.body.style.cursor = getCursorForDir(dir);
    el.style.willChange = 'width, height, left, top';
  }, { passive: false });
  let draginterval;
  // drag
  el.addEventListener('pointermove', (e) => {
    // if(resizing) {
    // draginterval = setInterval(() => {
    //   if(el.style.top < 0)
    //   el.style.top = '0px';
    // }, 10);}
    if (!active) return;
    const dx = e.clientX - active.sx;
    const dy = e.clientY - active.sy;
    						if(dx > 1 && resizing || dy > 1 && resizing) {
applyBounds(getBounds());
btnMax.textContent = '‎     □    ‎ ';
// alert('restored');
    isMaximized = false;
}

    // east / south
    if (active.dir.includes('e')) el.style.width  = Math.max(minW, active.sw + dx) + 'px';
    if (active.dir.includes('s')) el.style.height = Math.max(minH, active.sh + dy) + 'px';

    // west / north (move edge)
    if (active.dir.includes('w')) {
      const w = Math.max(minW, active.sw - dx);
      el.style.width = w + 'px';
      el.style.left  = (active.sl + dx) + 'px';
    }
if (active.dir.includes('n')) {
  const newTop = active.st + dy;
  if (newTop >= 0) {
    const h = Math.max(minH, active.sh - dy);
    el.style.height = h + 'px';
    el.style.top = newTop + 'px';
  } else {
    el.style.top = '0px';
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
  document.body.style.userSelect = '';
  document.body.style.cursor = '';
  el.style.cursor = 'default'; // <— add this
  el.style.willChange = '';
  el.querySelectorAll('iframe').forEach(f => {
    f.style.pointerEvents = f._oldPE || '';
    delete f._oldPE;
  });
}
  el.addEventListener('pointerup', end);
  el.addEventListener('pointercancel', end);

  // better touch behavior
  el.style.touchAction = 'none';

  function getCursorForDir(d) {
    if (d === 'nw' || d === 'se') return 'nwse-resize';
    if (d === 'ne' || d === 'sw') return 'nesw-resize';
    if (d === 'n'  || d === 's')  return 'ns-resize';
    if (d === 'e'  || d === 'w')  return 'ew-resize';
    return 'default';
  }
}
resize();
  

  return {
  rootElement: root,
  iframes,
  urlInput,
  openBtn,
  fullscreenBtn,
  activatedTab,
  addTab,
  activateTab,
  closeTab,
  openUrl: openUrlInActiveTab,
  enterFullscreen,
  exitFullscreen,
  btnMax,

  
  get isMaximized() { return isMaximized; },
  set isMaximized(v) { isMaximized = !!v; },

  get isMinimized() { return isMinimized; },
  set isMinimized(v) { isMinimized = !!v; },

  addAndOpen: function (url) { 
    const id = addTab(url); 
    activateTab(id); 
  },

  get tabs() { return tabs; }
};
})();
setInterval(function () {
if(typeof activatedTab.title == 'string' && typeof activatedTab.title != '')chromeWindow.title = activatedTab.title;else chromeWindow.title = 'undefined';}, 1000);
chromeWindow.rootElement.setAttribute('data-title', chromeWindow.title);
allBrowsers.push(chromeWindow); // Add to global tracking

function a(url, proxyurl) {
 function encodeUV(str) {
  return encodeURIComponent(
    str.split('').map((ch,i)=>
      (i%2 ? String.fromCharCode(ch.charCodeAt(0)^2) : ch)
    ).join('')
  );
}

function encodeRammerHead(str, proxylink) {
  if(str === 'goldenbody://newtab/') {
    return goldenbodywebsite + 'newtab.html';
  }
    return proxylink + id + '/' + url;
}
function encodeScramjet(url, proxylink) {
    return proxylink + 'scramjet/' + url;
}


 return encodeRammerHead(url, proxyurl);

// => hvtrs8%2F-wuw%2Chgrm-uaps%2Ccmm
}
}


// Create the taskbar
var taskbar = document.createElement('div');
taskbar.id = 'taskbar';
taskbar.style.position = 'fixed';
taskbar.style.zIndex = 9999;
taskbar.style.bottom = '0';
taskbar.style.left = '0';
taskbar.style.width = '100%';
taskbar.style.height = '60px';
taskbar.style.background = '#222';
taskbar.style.display = 'flex';
taskbar.style.alignItems = 'center';
taskbar.style.paddingLeft = '50px'; // 50px empty space on left
taskbar.style.boxSizing = 'border-box';
document.body.appendChild(taskbar);

//fullscreen 
function _fullscreen() {
document.documentElement.requestFullscreen();
_isfullscreen = true;
}
function addTaskButton(name, onclickFunc) {
    var btn = document.createElement('button');
    btn.innerText = name;
    btn.value = name; 
btn.id = name;
    btn.style.padding = '3px';
    btn.style.marginRight = '5px';
    btn.style.border = 'none';
    btn.style.borderRadius = '3px';
    btn.style.cursor = 'pointer';
    btn.style.background = '#444';
    btn.style.color = '#fff';
    btn.style.height = '40px'; // slightly smaller than 60px taskbar
btn.style.display = 'flex';
btn.style.alignItems = 'center';
btn.style.justifyContent = 'center';

btn.style.minWidth = '60px';   
btn.style.fontSize = '30px';         // Ensures 
   
    btn.addEventListener('click', () => {
        console.log('Task clicked:', btn.value);
     onclickFunc();
       
    });
    taskbar.appendChild(btn);
}

// addTaskButton('save', saveState);
// addTaskButton('return', zmxyLoader);
addTaskButton('⤢', _fullscreen);
addTaskButton('🌐', browser);


const browserButton = [...taskbar.querySelectorAll('button')].find(btn => btn.innerText === '🌐');

browserButton.addEventListener('contextmenu', function (e) {
  e.preventDefault();

  // Remove existing menus
  document.querySelectorAll('.browser-menu').forEach(m => m.remove());

  const menu = document.createElement('div');
  menu.className = 'browser-menu';
  Object.assign(menu.style, {
    position: 'fixed',
    top: `0px`,
    left: `${e.clientX}px`,
    background: '#fff',
    border: '1px solid #ccc',
    borderRadius: '4px',
    boxShadow: '0 2px 6px rgba(0,0,0,0.2)',
    zIndex: 9999999,
    padding: '4px 0',
    minWidth: '160px',
    fontSize: '13px',
    visibility: 'hidden', // so layout isn't disrupted before positioning
  });

requestAnimationFrame(() => {
  const menuHeight = menu.offsetHeight;
  const fixedTop = e.clientY - menuHeight;

  menu.style.top = `${fixedTop}px`;
  menu.style.visibility = 'visible';
});
  let closeAllitem = document.createElement('div');
  closeAllitem.textContent = 'close all';
  closeAllitem.style.padding = '6px 10px';
  closeAllitem.style.cursor = 'pointer';
  closeAllitem.addEventListener('click', function() {for(let i = 0; i < allBrowsers.length; i++) {
  allBrowsers[i].rootElement.remove();
  allBrowsers[i].rootElement = null;
  // Remove from allBrowsers

  }
allBrowsers = [];});
  menu.appendChild(closeAllitem);
  if (allBrowsers.length === 0) {
    const item = document.createElement('div');
    item.textContent = 'No open windows';
    item.style.padding = '6px 10px';
    menu.appendChild(item);
  } else {
    allBrowsers.forEach((instance, i) => {
      const item = document.createElement('div');
      item.textContent = instance.title || 'Loading...';
      item.style.padding = '6px 10px';
      item.style.cursor = 'pointer';
      item.style.maxWidth = '185px';
      item.style.maxHeight = '15px';
      item.style.overflow = 'hidden';
    item.addEventListener('click', () => {
    // Bring to front
    bringToFront(instance.rootElement);

    // Unminimize if needed
    const el = instance.rootElement;
    if (el.style.display = 'none') {
      el.style.display = 'block';
// alert('running unminimized');
// instance.btnMax.textContent= '‎     □    ‎ ';
// instance._isMininized = false;
        // instance.isMaximized = false;
instance._isMinimized = false;
        if (typeof instance.savedBounds === 'object') {
       instance.isMaximized = false;
          instance.btnMax.textContent= '‎     □    ‎ ';
// alert('savedBounds is object');
instance._isMinimized = false;
        } else {
    //    instance.isMaximized = false;
    //    instance.btnMax.textContent= '‎     □    ‎ ';
// alert('savedbounds is not');

        } 
      instance. _isMinimized = false;
    }
    menu.remove();
    });
      menu.appendChild(item);
    });
  }

  document.body.appendChild(menu);

 
  window.addEventListener('click', () => menu.remove(), { once: true });
		});
	






  //-----------------------------//-----------------------------//-----------------------------//-----------------------------//-----------------------------//-----------------------------
  // let alttabmenu = document.createElement('div');
  // Object.assign(alttabmenu.style, {
  //   position: 'absolute',
  //   width: '100%',
  //   height: '500px',
  //   top: '500px',
  //   left: '0px',
  //   display: 'block'
  // });
  // for(let bwindow of allBrowsers) {
  //   let el = document.createElement('div');
  //   el.style.width = '100%';
  //   el.style.height = '30px';
  //   let content = document.createElement('p');
  //   content.textContent = bwindow.title;
  //   el.appendChild(content);
  //   document.body.appendChild(el);    
  // }
	// window.addEventListener('keydown', function(e) {
  //   if(e.ctrlKey) {
  //     e.preventDefault();
  //     alttabmenu.style.display = 'block';
  //   }
  //   else {
  //     alttabmenu.style.display = 'none';
  //   }
  // });
}
// end FG
}
catch(e) { 
alert(e);
}
// }