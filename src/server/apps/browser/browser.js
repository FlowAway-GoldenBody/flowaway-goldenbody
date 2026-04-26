//browser global vars
window.browserGlobals = {};
window.browserGlobals.nhjd = 1;
window.browserGlobals.tmp = {};
window.browserGlobals.vfsScriptPath = "/systemfiles/runtime/apps/browser/asset/fileSystemRelatedStuff.js";
// this need async fn idk y
(async () => {
window.browserGlobals.vfstxt = await window.protectedGlobals.ReadFile(window.browserGlobals.vfsScriptPath, {text: true}).then(res => res && res.filecontent ? res.filecontent : "").catch(e => "");
window.browserGlobals.frontendFilePickerStuffJS = await window.protectedGlobals.ReadFile("/systemfiles/runtime/apps/browser/asset/frontendFilePickerStuff.js", {text: true}).then(res => res && res.filecontent ? res.filecontent : "").catch(e => "");
window.browserGlobals.iframePatch = await window.protectedGlobals.ReadFile("/systemfiles/runtime/apps/browser/asset/iframeRewrites.js", {text: true}).then(res => res && res.filecontent ? res.filecontent : "").catch(e => "");
})();
window.browserGlobals.cookiesPath =
  "/systemfiles/runtime/apps/browser/profile/localstorage/cookies.json";
window.browserGlobals.indexedDbPath =
  "/systemfiles/runtime/apps/browser/profile/localstorage/indexeddb.json";
window.browserGlobals.browserCss = `
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
`;
window.browserGlobals.injectCss = function () {
  const style = document.createElement("style");
  style.textContent = window.browserGlobals.browserCss;
  document.body.appendChild(style);
};
window.browserGlobals.injectCss();
window.browserGlobals.__globalAddTab = function (url, index, opener) {
  let t = window.browserGlobals.allBrowsers[index].addTab(url, "New Tab");
  for (const tab of window.browserGlobals.allBrowsers[index].tabs) {
    if (tab.id == t) {
      t = tab;
      break;
    }
  }
  t.iframe.contentWindow.opener = opener;
  return t.iframe.contentWindow;
};
window.browserGlobals.allBrowsers = [];
window.browserGlobals.goldenbodyId = 0;
window.browserGlobals.goldenbodyOrderId = 0;
window.browserGlobals.reusableGoldenbodyIds = [];
window.browserGlobals.proxyurl = window.origin + "/";
window.browserGlobals.dragstartwindow = null;
window.browserGlobals.__moveTabListenerAdded = false;
window.browserGlobals.tabisDragging = false;
window.browserGlobals.draggedtab = 0;
window.browserGlobals.__localFileUrlMap =
  window.browserGlobals.__localFileUrlMap || new Map();
window.browserGlobals.__localFilePathToBlobMap =
  window.browserGlobals.__localFilePathToBlobMap || new Map();
window.browserGlobals.profileUserIdPath =
  "/systemfiles/runtime/apps/browser/profile/userID.txt";
window.browserGlobals.profileSettingsPath =
  "/systemfiles/runtime/apps/browser/profile/settings.json";
window.browserGlobals.profileState = {
  siteSettings: [],
  enableURLSync: true,
  lazyloading: true,
  siteZoom: {},
};

window.browserGlobals.safeDecodeBase64Text = function (v) {
  try {
    return atob(String(v || ""));
  } catch (e) {
    return "";
  }
};

window.browserGlobals.looksLikeSessionId = function (value) {
  const s = String(value || "").trim();
  return /^[A-Za-z0-9._-]{8,}$/.test(s);
};

window.browserGlobals.decodeMaybeBase64 = function (raw) {
  const s = String(raw || "").trim();
  if (!s) return "";
  if (s[0] === "{" || s[0] === "[") return s;
  const looksLikeBase64 =
    /^[A-Za-z0-9+/]+={0,2}$/.test(s) && s.length % 4 === 0;
  if (!looksLikeBase64) return s;
  const decoded = window.browserGlobals.safeDecodeBase64Text(s);
  if (!decoded) return s;
  const trimmed = decoded.trim();
  if (!trimmed) return s;
  if (trimmed[0] === "{" || trimmed[0] === "[") return trimmed;
  if (window.browserGlobals.looksLikeSessionId(trimmed)) return trimmed;

  let printable = 0;
  for (let i = 0; i < decoded.length; i++) {
    const code = decoded.charCodeAt(i);
    if (
      code === 9 ||
      code === 10 ||
      code === 13 ||
      (code >= 32 && code <= 126)
    ) {
      printable++;
    }
  }
  const printableRatio = decoded.length ? printable / decoded.length : 0;
  if (printableRatio >= 0.95) return trimmed;

  return s;
};

window.browserGlobals.sleep = function (ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
};

window.browserGlobals.allocateBrowserGoldenbodyId = function () {
  if (window.browserGlobals.reusableGoldenbodyIds.length > 0) {
    return window.browserGlobals.reusableGoldenbodyIds.pop();
  }
  window.browserGlobals.goldenbodyId++;
  return window.browserGlobals.goldenbodyId;
};

window.browserGlobals.releaseBrowserGoldenbodyId = function (root) {
  if (!root || root._goldenbodyIdReleased) return;
  const id = Number(root._goldenbodyId);
  if (!Number.isFinite(id)) return;
  root._goldenbodyIdReleased = true;
  if (window.browserGlobals.reusableGoldenbodyIds.indexOf(id) === -1) {
    window.browserGlobals.reusableGoldenbodyIds.push(id);
  }
};

window.browserGlobals.readProfileTextFileMeta = async function (
  filePath,
  options = {},
) {
  const attempts = Math.max(1, Number(options.attempts || 1));
  const retryDelayMs = Math.max(0, Number(options.retryDelayMs || 0));
  let lastError = null;

  for (let attempt = 0; attempt < attempts; attempt++) {
    try {
      if (typeof window.protectedGlobals.ReadFile === "function") {
        const res = await window.protectedGlobals.ReadFile(filePath);
        if (
          !res ||
          res.missing ||
          res.code === "ENOENT" ||
          res.kind === "missing"
        ) {
          if (attempt + 1 < attempts) {
            if (retryDelayMs > 0)
              await window.browserGlobals.sleep(retryDelayMs);
            continue;
          }
          return { text: "", missing: true, error: null };
        }
        if (typeof res === "string") {
          return {
            text: window.browserGlobals.decodeMaybeBase64(res),
            missing: false,
            error: null,
          };
        }
        if (typeof res.filecontent === "string") {
          return {
            text: window.browserGlobals.decodeMaybeBase64(res.filecontent),
            missing: false,
            error: null,
          };
        }
        return { text: "", missing: false, error: null };
      }

      if (typeof readFile === "function") {
        const value = readFile(filePath);
        return {
          text: window.browserGlobals.decodeMaybeBase64(value),
          missing: false,
          error: null,
        };
      }

      return {
        text: "",
        missing: false,
        error: new Error("No file reader available"),
      };
    } catch (e) {
      lastError = e;
      if (attempt + 1 < attempts) {
        if (retryDelayMs > 0) await window.browserGlobals.sleep(retryDelayMs);
        continue;
      }
    }
  }

  return {
    text: "",
    missing: false,
    error: lastError || new Error("Failed to read file"),
  };
};

window.browserGlobals.readProfileTextFile = async function (filePath) {
  const result = await window.browserGlobals.readProfileTextFileMeta(filePath, {
    attempts: 3,
    retryDelayMs: 120,
  });
  return result.text || "";
};

window.browserGlobals.defaultBrowserProfile = function () {
  return {
    siteSettings: [],
    enableURLSync: true,
    lazyloading: true,
    siteZoom: {},
    // themeMode: 'auto' | 'manual' ; when 'auto' use global `window.protectedGlobals.data.dark`
    themeMode: "auto",
    // when themeMode !== 'auto', this boolean indicates dark (true) or light (false)
    dark: false,
  };
};

window.browserGlobals.repairBrowserProfile = function (parsed) {
  if (!parsed || typeof parsed !== "object")
    return window.browserGlobals.defaultBrowserProfile();
  const normalizedSiteZoom = {};
  if (parsed.siteZoom && typeof parsed.siteZoom === "object") {
    for (const key of Object.keys(parsed.siteZoom)) {
      const value = Number(parsed.siteZoom[key]);
      if (Number.isFinite(value)) {
        normalizedSiteZoom[key] = Math.max(
          25,
          Math.min(500, Math.round(value)),
        );
      }
    }
  }
  return {
    siteSettings: Array.isArray(parsed.siteSettings) ? parsed.siteSettings : [],
    enableURLSync:
      typeof parsed.enableURLSync === "boolean" ? parsed.enableURLSync : true,
    lazyloading:
      typeof parsed.lazyloading === "boolean" ? parsed.lazyloading : true,
    siteZoom: normalizedSiteZoom,
    themeMode: typeof parsed.themeMode === "string" ? parsed.themeMode : "auto",
    dark: typeof parsed.dark === "boolean" ? parsed.dark : false,
  };
};

window.browserGlobals.readBrowserProfile = async function () {
  try {
    const profileRead = await window.browserGlobals.readProfileTextFileMeta(
      window.browserGlobals.profileSettingsPath,
      {
        attempts: 4,
        retryDelayMs: 120,
      },
    );
    const raw = profileRead.text;
    if (!raw) return window.browserGlobals.defaultBrowserProfile();
    const parsed = JSON.parse(raw);
    return window.browserGlobals.repairBrowserProfile(parsed);
  } catch (e) {
    return window.browserGlobals.defaultBrowserProfile();
  }
};

window.browserGlobals.writeBrowserProfile = async function (
  profile,
  options = {},
) {
  const payload = {
    siteSettings: Array.isArray(profile?.siteSettings)
      ? profile.siteSettings
      : [],
    enableURLSync: !!profile?.enableURLSync,
    lazyloading: !!profile?.lazyloading,
    siteZoom:
      profile?.siteZoom && typeof profile.siteZoom === "object"
        ? profile.siteZoom
        : {},
    themeMode:
      typeof profile?.themeMode === "string" ? profile.themeMode : "auto",
    dark: typeof profile?.dark === "boolean" ? profile.dark : false,
  };

  if (!options.force) {
    try {
      const existingRead = await window.browserGlobals.readProfileTextFileMeta(
        window.browserGlobals.profileSettingsPath,
        {
          attempts: 3,
          retryDelayMs: 100,
        },
      );
      const existingRaw = existingRead.text;
      if (existingRaw) {
        const existing = window.browserGlobals.repairBrowserProfile(
          JSON.parse(existingRaw),
        );
      }
    } catch (e) {
      // ignore parse/read guard failures and continue with write
    }
  }
  const content = btoa(JSON.stringify(payload, null, 2));
  if (typeof window.protectedGlobals.WriteFile === "function") {
    await window.protectedGlobals.WriteFile(
      window.browserGlobals.profileSettingsPath,
      content,
    );
    return true;
  }
  if (typeof window.protectedGlobals.filePost === "function") {
    await window.protectedGlobals.filePost({
      saveSnapshot: true,
      directions: [
        {
          edit: true,
          path: window.browserGlobals.profileSettingsPath,
          contents: content,
          replace: true,
        },
        { end: true },
      ],
    });
    return true;
  }
  return false;
};

window.browserGlobals.writeBrowserUserId = async function (id) {
  const encoded = btoa(String(id || ""));
  if (typeof window.protectedGlobals.WriteFile === "function") {
    await window.protectedGlobals.WriteFile(
      window.browserGlobals.profileUserIdPath,
      encoded,
    );
    return;
  }
  if (typeof window.protectedGlobals.filePost === "function") {
    await window.protectedGlobals.filePost({
      saveSnapshot: true,
      directions: [
        {
          edit: true,
          path: window.browserGlobals.profileUserIdPath,
          contents: encoded,
          replace: true,
        },
        { end: true },
      ],
    });
  }
};

window.browserGlobals.readCookiesStore = async function () {
  let rawCookieStore = "";
  try {
    const fileRes = await window.protectedGlobals.ReadFile(
      window.browserGlobals.cookiesPath,
    );
    rawCookieStore = fileRes && fileRes.filecontent ? fileRes.filecontent : "";
  } catch (e) {
    rawCookieStore = "";
  }

  if (!rawCookieStore) {
    rawCookieStore = btoa("{}");
    await window.protectedGlobals.WriteFile(
      window.browserGlobals.cookiesPath,
      rawCookieStore,
    );
  }

  try {
    const decoded = window.browserGlobals.decodeMaybeBase64(rawCookieStore);
    return JSON.parse(decoded || "{}");
  } catch (e) {
    return {};
  }
};

window.browserGlobals.writeCookiesStore = async function (cookies) {
  const serialized = JSON.stringify(cookies || {});
  await window.protectedGlobals.WriteFile(
    window.browserGlobals.cookiesPath,
    btoa(serialized),
  );
};

window.browserGlobals.clearCookiesForSite = async function (site) {
  const cookies = await window.browserGlobals.readCookiesStore();
  const key = String(site || "").trim();
  if (!key) return;
  delete cookies[key];
  await window.browserGlobals.writeCookiesStore(cookies);
};

window.browserGlobals.clearAllCookies = async function () {
  await window.browserGlobals.writeCookiesStore({});
};

window.browserGlobals.siteToOriginKey = function (site) {
  let normalizedSite = String(site || "").trim();

  try {
    normalizedSite = window.browserGlobals.unshuffleURL(normalizedSite);
  } catch (e) {}

  try {
    normalizedSite = window.browserGlobals.mainWebsite(normalizedSite);
  } catch (e) {}

  try {
    return new URL(normalizedSite).origin;
  } catch (e) {
    return normalizedSite;
  }
};

window.browserGlobals.readIndexedDbStore = async function () {
  let raw = "";
  try {
    const fileRes = await window.protectedGlobals.ReadFile(
      window.browserGlobals.indexedDbPath,
    );
    raw = fileRes && fileRes.filecontent ? fileRes.filecontent : "";
  } catch (e) {
    raw = "";
  }

  if (!raw) {
    raw = btoa(JSON.stringify({ origins: {} }));
    await window.protectedGlobals.WriteFile(
      window.browserGlobals.indexedDbPath,
      raw,
    );
  }

  try {
    const decoded = window.browserGlobals.decodeMaybeBase64(raw);
    const parsed = JSON.parse(decoded || "{}");
    if (!parsed || !parsed.origins) {
      return { origins: {} };
    }
    return parsed;
  } catch (e) {
    return { origins: {} };
  }
};

window.browserGlobals.writeIndexedDbStore = async function (payload) {
  const serialized = JSON.stringify(
    payload && payload.origins ? payload : { origins: {} },
  );
  await window.protectedGlobals.WriteFile(
    window.browserGlobals.indexedDbPath,
    btoa(serialized),
  );
};

window.browserGlobals.clearIndexedDbForSite = async function (site) {
  const originKey = window.browserGlobals.siteToOriginKey(site);
  if (!originKey) return;
  const store = await window.browserGlobals.readIndexedDbStore();
  if (!store.origins) {
    store.origins = {};
  }
  delete store.origins[originKey];
  await window.browserGlobals.writeIndexedDbStore(store);
};

window.browserGlobals.clearAllIndexedDb = async function () {
  await window.browserGlobals.writeIndexedDbStore({ origins: {} });
};

window.browserGlobals.requestNewBrowserSessionId = async function () {
  const candidates = ["/server/newsession", "/newsession"];
  let lastError = null;
  for (const endpoint of candidates) {
    try {
      const res = await fetch(endpoint);
      if (!res.ok) {
        lastError = new Error(
          `Failed to create new browser session (${endpoint})`,
        );
        continue;
      }
      const id = (await res.text()).trim();
      if (id) return id;
      lastError = new Error(`Empty browser session id (${endpoint})`);
    } catch (e) {
      lastError = e;
    }
  }
  throw lastError || new Error("Failed to create new browser session");
};

window.browserGlobals.profile = window.browserGlobals.defaultBrowserProfile();
window.browserGlobals.profileState = window.browserGlobals.repairBrowserProfile(
  window.browserGlobals.profile,
);
window.browserGlobals.id = "";
window.browserGlobals.profileReadyPromise = (async () => {
  const loadedProfile = await window.browserGlobals.readBrowserProfile();
  window.browserGlobals.profile = loadedProfile;
  window.browserGlobals.profileState =
    window.browserGlobals.repairBrowserProfile(window.browserGlobals.profile);
  // Determine effective browser theme setting
  try {
    const pm =
      window.browserGlobals.profile && window.browserGlobals.profile.themeMode
        ? window.browserGlobals.profile.themeMode
        : "auto";
    if (pm === "auto") {
      window.browserGlobals.dark = !!(
        window.protectedGlobals.data && window.protectedGlobals.data.dark
      );
    } else {
      window.browserGlobals.dark = !!window.browserGlobals.profile.dark;
    }
  } catch (e) {
    window.browserGlobals.dark = !!(
      window.protectedGlobals.data && window.protectedGlobals.data.dark
    );
  }

  const idRead = await window.browserGlobals.readProfileTextFileMeta(
    window.browserGlobals.profileUserIdPath,
    {
      attempts: 5,
      retryDelayMs: 150,
    },
  );
  const persistedId = String(idRead.text || "").trim();
  if (persistedId) {
    window.browserGlobals.id = persistedId;
    return;
  }

  if (idRead.error) {
    return;
  }

  // One more confirmation pass before generating/writing a new session id.
  // This avoids replacing an existing id when the first read was transiently empty.
  const idReadConfirm = await window.browserGlobals.readProfileTextFileMeta(
    window.browserGlobals.profileUserIdPath,
    {
      attempts: 6,
      retryDelayMs: 220,
    },
  );
  const confirmedId = String(idReadConfirm.text || "").trim();
  if (confirmedId) {
    window.browserGlobals.id = confirmedId;
    return;
  }
  if (idReadConfirm.error) {
    return;
  }
  const id = await window.browserGlobals.requestNewBrowserSessionId();
  window.browserGlobals.id = id;
  await window.browserGlobals.writeBrowserUserId(id);
})().catch(() => {});

window.browserGlobals.subWebsite = function (url) {
  url = url.split("?");
  url = url[0].split("#");
  return url[0];
};
window.browserGlobals.unshuffleURL = function (url) {
  if (!url) return "";
  if (url === window.protectedGlobals.goldenbodywebsite + "flowerfeast.html") {
    return "goldenbody://newtab/";
  } else if (
    url ===
    window.protectedGlobals.goldenbodywebsite + "singlesdaylosesingle.html"
  ) {
    return "goldenbody://app-store/";
  }

  try {
    if (typeof url === "string" && url.startsWith("blob:")) {
      const mapped = window.browserGlobals.__localFileUrlMap.get(url);
      if (mapped) return `file://${mapped}`;

      const withoutHash = url.split("#")[0];
      const mappedNoHash =
        window.browserGlobals.__localFileUrlMap.get(withoutHash);
      if (mappedNoHash) return `file://${mappedNoHash}`;
    }
  } catch (e) {}

  if (typeof url === "string" && url.startsWith("file://")) {
    let localPath = url.replace(/^file:\/\//i, "");
    try {
      localPath = decodeURIComponent(localPath);
    } catch (e) {}
    localPath = localPath.replace(/\/{2,}/g, "/");
    localPath = localPath.replace(/^\/+/, "");
    return `file://${localPath}`;
  }

  if (!url.includes(window.protectedGlobals.BASE)) {
    return url;
  }
  url = url.split("/");
  if (url) {
    if (typeof url === "string") {
      return url;
    }
  }
  url.splice(0, 4);
  let newUrl = "";
  for (let i = 0; i < url.length; i++) {
    if (i !== 0) {
      if (i === 1) newUrl += "//" + url[i];
      else if (i === 2) newUrl += url[i];
      else newUrl += "/" + url[i];
    } else {
      newUrl += url[i];
    }
  }
  return newUrl;
};
// browser global functions
window.browserGlobals.mainWebsite = function (string) {
  let s = "";
  let anti_numtots = 0;
  for (let i = 0; i < string.length; i++) {
    if (string[i] === "/") anti_numtots++;
    if (string[i] === "?" || string[i] === "&" || anti_numtots === 3) {
      s += string[i];
      return s;
    } else {
      s += string[i];
    }
  }
  return s;
};

window.browser = function (
  preloadlink = null,
  preloadsize = 100,
  posX = 20,
  posY = 20,
) {
  function showConfirmDialog(title, message) {
    return new Promise((resolve) => {
      document.getElementById("confirm-dialog")?.remove();

      const dialog = document.createElement("div");
      dialog.id = "confirm-dialog";
      dialog.className = "panel";
      dialog.classList.toggle("dark", browserGlobals.dark);
      dialog.classList.toggle("light", !browserGlobals.dark);
      dialog.style.cssText =
        "position:fixed;left:50%;top:50%;transform:translate(-50%,-50%);z-index:999999;width:380px;border-radius:10px;box-shadow:0 20px 60px rgba(0,0,0,.6);padding:20px;font-family:system-ui;font-size:14px;";

      let resolved = false;
      function closeConfirmDialog(result) {
        if (resolved) return;
        resolved = true;
        try {
          document.removeEventListener(
            "pointerdown",
            onOutsidePointerDown,
            true,
          );
        } catch (e) {}
        try {
          document.removeEventListener("keydown", onEscKeyDown, true);
        } catch (e) {}
        dialog.remove();
        resolve(result);
      }

      function onOutsidePointerDown(event) {
        if (!dialog.contains(event.target)) {
          closeConfirmDialog(false);
        }
      }

      function onEscKeyDown(event) {
        if (event.key === "Escape") {
          event.preventDefault();
          closeConfirmDialog(false);
        }
      }

      const titleEl = document.createElement("div");
      titleEl.style.cssText =
        "font-weight:600;margin-bottom:12px;font-size:16px;";
      titleEl.textContent = title;
      dialog.appendChild(titleEl);

      const msgEl = document.createElement("div");
      msgEl.style.cssText = `font-size:14px;color:#${browserGlobals.dark ? "ccc" : "666"};margin-bottom:20px;line-height:1.5;`;
      msgEl.textContent = message;
      dialog.appendChild(msgEl);

      const btnRow = document.createElement("div");
      btnRow.style.cssText = "display:flex;justify-content:flex-end;gap:8px;";

      const btnCancel = document.createElement("button");
      btnCancel.textContent = "Cancel";
      btnCancel.style.cssText =
        "padding:8px 16px;border-radius:6px;border:1px solid #ccc;background:#f5f5f5;cursor:pointer;font-size:14px;";
      btnCancel.onmouseenter = () => (btnCancel.style.background = "#e8e8e8");
      btnCancel.onmouseleave = () => (btnCancel.style.background = "#f5f5f5");
      btnCancel.onclick = () => closeConfirmDialog(false);

      const btnConfirm = document.createElement("button");
      btnConfirm.textContent = "Continue";
      btnConfirm.style.cssText =
        "padding:8px 16px;border-radius:6px;border:none;background:#4c8bf5;color:#fff;cursor:pointer;font-size:14px;";
      btnConfirm.onmouseenter = () => (btnConfirm.style.background = "#3a75d4");
      btnConfirm.onmouseleave = () => (btnConfirm.style.background = "#4c8bf5");
      btnConfirm.onclick = () => closeConfirmDialog(true);

      btnRow.appendChild(btnCancel);
      btnRow.appendChild(btnConfirm);
      dialog.appendChild(btnRow);

      document.body.appendChild(dialog);

      setTimeout(() => {
        if (!resolved) {
          document.addEventListener("pointerdown", onOutsidePointerDown, true);
          document.addEventListener("keydown", onEscKeyDown, true);
        }
      }, 0);

      btnConfirm.focus();
    });
  }
  function normalizePreloadLink(value) {
    const input = String(value || "").trim();
    if (!input) return "";
    if (
      input.startsWith("file://") ||
      input.startsWith("http://") ||
      input.startsWith("https://") ||
      input.startsWith("goldenbody://") ||
      input.startsWith("javascript:")
    ) {
      return input;
    }
    if (
      input.startsWith("root/") ||
      input.startsWith("/") ||
      input.startsWith("./") ||
      input.startsWith("../") ||
      /[\\/]/.test(input) ||
      /\.[a-z0-9]{1,10}([?#].*)?$/i.test(input)
    ) {
      return `file://${input.replace(/^\/+/, "")}`;
    }
    return input;
  }

  let username = window.protectedGlobals.getCurrentUsernameForRequests();
  async function updateSiteSettings(iframe, content) {
    if (window.browserGlobals.profileReadyPromise) {
      await window.browserGlobals.profileReadyPromise;
    }

    window.browserGlobals.profileState.enableURLSync = !!content.enableURLSync;
    window.browserGlobals.profileState.lazyloading = !!content.lazyloading;
    if (content.lazyloading)
      window.browserGlobals.allBrowsers.forEach((b) =>
        b.tabs.forEach((t) => (t.iframe.loading = "lazy")),
      );
    else
      window.browserGlobals.allBrowsers.forEach((b) =>
        b.tabs.forEach((t) => (t.iframe.loading = "")),
      );

    const currentUrl = window.browserGlobals.mainWebsite(
      browserGlobals.unshuffleURL(iframe.src),
    );
    const profile =
      browserGlobals.profile || window.browserGlobals.defaultBrowserProfile();
    const list = Array.isArray(profile.siteSettings)
      ? profile.siteSettings
      : [];
    let updated = false;
    for (let i = 0; i < list.length; i++) {
      if (Array.isArray(list[i]) && list[i][0] === currentUrl) {
        list[i][1] = content.newSandbox;
        updated = true;
      }
    }
    if (!updated && content.addTheSite) {
      list.push([currentUrl, content.newSandbox]);
    }
    profile.siteSettings = list;
    profile.enableURLSync = !!content.enableURLSync;
    profile.lazyloading = !!content.lazyloading;
    browserGlobals.profile = profile;
    browserGlobals.profileState.siteSettings = profile.siteSettings;
    browserGlobals.profileState.enableURLSync = profile.enableURLSync;
    browserGlobals.profileState.lazyloading = profile.lazyloading;
    browserGlobals.profileState.siteZoom =
      profile.siteZoom && typeof profile.siteZoom === "object"
        ? profile.siteZoom
        : {};
    await window.browserGlobals.writeBrowserProfile(profile);

    iframe.sandbox = content.newSandbox;
  }
  function createPermInput(iframe, url) {
    url = browserGlobals.mainWebsite(url);

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
    let siteSettings = window.browserGlobals.profileState.siteSettings;
    for (const site of siteSettings) {
      if (url === site[0]) {
        sandbox = site[1];
        addTheSite = false;
      }
    }
    iframe.sandbox = sandbox;
    return { sandbox, addTheSite };
  }
  function openPermissionsUI(url, iframe, anchorRect = null) {
    const perms = createPermInput(iframe, url) || {
      sandbox: "",
    };

    // --- Cleanup old UI
    document.getElementById("perm-ui")?.remove();

    // --- Floating panel
    const panel = document.createElement("div");
    panel.id = "perm-ui";
    panel.className = "panel";
    panel.classList.toggle("dark", browserGlobals.dark);
    panel.classList.toggle("light", !browserGlobals.dark);
    panel.style.cssText = `
    position:fixed;
    z-index:999999;
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
      panel.style.top = anchorRect.bottom + 6 + "px";
    } else {
      panel.style.left = "50%";
      panel.style.top = "50%";
      panel.style.transform = "translate(-50%,-50%)";
    }

    document.body.appendChild(panel);

    let closed = false;
    function closePermissionsPanel() {
      if (closed) return;
      closed = true;
      try {
        document.removeEventListener("pointerdown", onOutsidePointerDown, true);
      } catch (e) {}
      panel.remove();
    }

    function onOutsidePointerDown(event) {
      if (!panel.contains(event.target)) {
        closePermissionsPanel();
      }
    }

    setTimeout(() => {
      if (!closed) {
        document.addEventListener("pointerdown", onOutsidePointerDown, true);
      }
    }, 0);

    // --- Helpers
    const sandboxSet = new Set(
      perms.sandbox
        ?.split(" ")
        .map((v) => v.trim())
        .filter(Boolean),
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
      row.style.cssText =
        "display:flex;align-items:center;gap:6px;margin-bottom:4px;opacity:" +
        (disabled ? 0.5 : 1);
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
    let website = browserGlobals.mainWebsite(
      browserGlobals.unshuffleURL(iframe.src),
    );
    let secure = website.startsWith("https://")
      ? "Connection to this site is Secure"
      : "Connection to this site is Not Secure";
    if (website.startsWith("goldenbody://"))
      secure = "You are viewing a secure official goldenbody webpage";
    section(website);
    section(secure);
    if (!browserGlobals.profileState.enableURLSync)
      section(
        "Only user-initiated navigations get new permissions. To disable this, open sync perms below.",
      );
    // perms
    const syncpermsSec = section("Sync Perms");
    let syncperms = checkbox(
      syncpermsSec,
      "sync perms",
      browserGlobals.profileState.enableURLSync,
    );
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
    let lazyloading = checkbox(
      lazyloadingsect,
      "Lazy Loading",
      browserGlobals.profileState.lazyloading,
    );

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
      "allow-same-origin", // LOCKED
    ];

    const sandboxCheckboxes = {};

    for (const perm of SANDBOX_LIST) {
      const locked = perm === "allow-same-origin";
      sandboxCheckboxes[perm] = checkbox(
        sandboxSec,
        perm + (locked ? " (locked)" : ""),
        sandboxSet.has(perm),
        locked,
      );
    }

    // Warning
    const warn = document.createElement("div");
    warn.style.cssText = `
    margin-top:6px;
    font-size:11px;
    color:#aaa;
  `;
    warn.textContent = "allow-same-origin cannot be changed.";
    sandboxSec.appendChild(warn);

    // ===============================
    // SITE DATA
    // ===============================
    const siteDataSec = section("Site Data");
    const siteDataTabs = document.createElement("div");
    siteDataTabs.style.display = "flex";
    siteDataTabs.style.gap = "6px";
    siteDataTabs.style.marginBottom = "8px";

    const siteDataTabCookies = document.createElement("button");
    siteDataTabCookies.textContent = "Cookies";
    const siteDataTabIndexedDb = document.createElement("button");
    siteDataTabIndexedDb.textContent = "IndexedDB";

    const siteDataDesc = document.createElement("div");
    siteDataDesc.style.fontSize = "12px";
    siteDataDesc.style.opacity = "0.9";
    siteDataDesc.style.marginBottom = "8px";

    const siteDataClearBtn = document.createElement("button");
    siteDataClearBtn.style.background = "#8b1f1f";
    siteDataClearBtn.style.color = "#fff";

    function setSiteDataTabVisual(button, active) {
      button.style.border =
        "1px solid " + (active ? "#4c8bf5" : "rgba(127,127,127,.45)");
      button.style.borderRadius = "6px";
      button.style.padding = "5px 10px";
      button.style.cursor = "pointer";
      button.style.background = active ? "#4c8bf5" : "transparent";
      button.style.color = active ? "#fff" : "inherit";
    }

    let activeSiteDataTab = "cookies";
    function renderSiteDataTab() {
      const isCookies = activeSiteDataTab === "cookies";
      setSiteDataTabVisual(siteDataTabCookies, isCookies);
      setSiteDataTabVisual(siteDataTabIndexedDb, !isCookies);
      if (isCookies) {
        siteDataDesc.textContent = "Delete cookies only for this site.";
        siteDataClearBtn.textContent = "Clear site cookies";
      } else {
        siteDataDesc.textContent =
          "Delete IndexedDB databases only for this site.";
        siteDataClearBtn.textContent = "Clear site IndexedDB";
      }
    }

    siteDataTabCookies.onclick = () => {
      activeSiteDataTab = "cookies";
      renderSiteDataTab();
    };
    siteDataTabIndexedDb.onclick = () => {
      activeSiteDataTab = "indexeddb";
      renderSiteDataTab();
    };

    siteDataClearBtn.onclick = async () => {
      if (activeSiteDataTab === "cookies") {
        const shouldClearCookies = await showConfirmDialog(
          "Clear site cookies",
          `This will remove cookies for ${website}. Continue?`,
        );
        if (!shouldClearCookies) return;
        await window.browserGlobals.clearCookiesForSite(website);
        window.protectedGlobals.notification("cookies cleared for this site");
        return;
      }

      const shouldClearIndexedDb = await showConfirmDialog(
        "Clear site IndexedDB",
        `This will remove IndexedDB for ${website}. Continue?`,
      );
      if (!shouldClearIndexedDb) return;
      await window.browserGlobals.clearIndexedDbForSite(website);
      window.protectedGlobals.notification("indexeddb cleared for this site");
    };

    siteDataTabs.append(siteDataTabCookies, siteDataTabIndexedDb);
    siteDataSec.append(siteDataTabs, siteDataDesc, siteDataClearBtn);
    renderSiteDataTab();

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
    cancel.onclick = () => closePermissionsPanel();

    const apply = document.createElement("button");
    apply.textContent = "Apply";
    apply.style.background = "#4c8bf5";
    apply.style.color = "#fff";

    apply.onclick = () => {
      // ===== LOGIC HOOK (YOU IMPLEMENT) =====
      window.protectedGlobals.notification(
        "reload this page to apply your updated settings!",
      );

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

      closePermissionsPanel();
    };

    actions.append(cancel, apply);
    panel.appendChild(actions);
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
  window.protectedGlobals.atTop = "browser";
  let windowTitleInterval;
  const chromeWindow = (function createChromeLikeUI() {
    // --- Create root container ---
    var root = document.createElement("div");
    root.__moveTabListenerAdded = false;
    root.className = "app-root app-window-root";
    root.dataset.appId = "browser";
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
    window.protectedGlobals.bringToFront(root);
    root._goldenbodyId = window.browserGlobals.allocateBrowserGoldenbodyId();
    window.browserGlobals.goldenbodyOrderId++;
    root._goldenbodyOrderId = window.browserGlobals.goldenbodyOrderId;
    root.tabIndex = "0";
    // Respect per-app ignore flag; compute effective browser dark mode
    // If a window has `data-theme-manual` set to 'true', flowaway.window.protectedGlobals.applyStyles
    // will avoid changing its theme classes. Initialize based on profile.
    try {
      const pm =
        window.browserGlobals.profile && window.browserGlobals.profile.themeMode
          ? window.browserGlobals.profile.themeMode
          : "auto";
      if (pm === "manual") {
        root.dataset.themeManual = "true";
        // ensure this root reflects the pinned theme
        try {
          root.classList.toggle("dark", !!window.browserGlobals.dark);
          root.classList.toggle("light", !window.browserGlobals.dark);
        } catch (e) {}
      } else {
        root.dataset.themeManual = "false";
      }
    } catch (e) {
      root.dataset.themeManual = root.dataset.themeManual || "false";
    }
    root.addEventListener("styleapplied", () => {
      // If user preference is 'auto' then mirror global `window.protectedGlobals.data.dark`, otherwise use stored profile value
      try {
        const pm =
          window.browserGlobals.profile &&
          window.browserGlobals.profile.themeMode
            ? window.browserGlobals.profile.themeMode
            : "auto";
        if (pm === "auto") {
          window.browserGlobals.dark = !!(
            window.protectedGlobals.data && window.protectedGlobals.data.dark
          );
        } else {
          window.browserGlobals.dark = !!window.browserGlobals.profile.dark;
        }
      } catch (e) {
        window.browserGlobals.dark = !!(
          window.protectedGlobals.data && window.protectedGlobals.data.dark
        );
      }

      for (const tab of tabs) {
        tab.iframe.contentWindow.postMessage({
          __goldenbodyChangeTheme__: true,
          dark: window.browserGlobals.dark,
        });
      }
    });
    root.__gbShortcutDedupe = { sig: "", ts: 0 };
    function runBrowserShortcut(key, eventLike = null) {
      const normalized = String(key || "").toLowerCase();
      if (normalized !== "t" && normalized !== "n") return false;

      const now = Date.now();
      const sig = `${normalized}:1`;
      if (
        root.__gbShortcutDedupe &&
        root.__gbShortcutDedupe.sig === sig &&
        now - root.__gbShortcutDedupe.ts < 180
      ) {
        if (eventLike && typeof eventLike.preventDefault === "function") {
          eventLike.preventDefault();
        }
        return true;
      }
      root.__gbShortcutDedupe = { sig, ts: now };

      if (eventLike && typeof eventLike.preventDefault === "function") {
        eventLike.preventDefault();
      }
      if (normalized === "t") {
        addTab("goldenbody://newtab/", "New Tab");
        return true;
      }
      console.log("Running browser shortcut for new window");
      browser();
      return true;
    }

    function cycleBrowserTabs(reverse = false) {
      if (!Array.isArray(tabs) || tabs.length < 2) return false;
      const currentIndex = tabs.findIndex((tab) => tab.id === activeTabId);
      if (currentIndex < 0) return false;
      const delta = reverse ? -1 : 1;
      const nextIndex = (currentIndex + delta + tabs.length) % tabs.length;
      const nextTab = tabs[nextIndex];
      if (!nextTab) return false;
      activateTab(nextTab.id);
      return true;
    }

    function closeActiveBrowserTab() {
      if (!Array.isArray(tabs) || !tabs.length) return false;
      const active = tabs.find((tab) => tab.id === activeTabId) || activatedTab;
      if (!active || !active.id) return false;
      closeTab(active.id);
      return true;
    }

    function runBrowserCtrlShortcut(e) {
      if (!e) return false;
      if (e.__gbBrowserCtrlHandled) return true;

      const keyRaw = String(e.key || "");
      const key = keyRaw.toLowerCase();
      const isCtrlLike = !!(e.ctrlKey || e.metaKey);
      if (!isCtrlLike) return false;

      if (e.altKey && (key === "arrowright" || key === "arrowleft")) {
        e.preventDefault();
        if (typeof e.stopPropagation === "function") e.stopPropagation();
        e.__gbBrowserCtrlHandled = true;
        cycleBrowserTabs(key === "arrowleft");
        return true;
      }

      if (e.altKey) return false;

      if (key === "w") {
        e.preventDefault();
        if (typeof e.stopPropagation === "function") e.stopPropagation();
        e.__gbBrowserCtrlHandled = true;
        closeActiveBrowserTab();
        return true;
      }

      if (key === "t" || key === "n") {
        const handled = runBrowserShortcut(key, e);
        if (handled) {
          if (typeof e.stopPropagation === "function") e.stopPropagation();
          e.__gbBrowserCtrlHandled = true;
        }
        return handled;
      }

      return false;
    }

    root.addEventListener("keydown", (e) => {
      runBrowserCtrlShortcut(e);
    });

    function getActiveBrowserTab() {
      return tabs.find((tab) => tab.id === activeTabId) || activatedTab || null;
    }

    function dispatchShortcutToActiveBrowserTab(eventInit) {
      const tab = getActiveBrowserTab();
      const target = tab && tab.iframe && tab.iframe.contentWindow;
      if (!target) return false;
      try {
        target.dispatchEvent(
          new KeyboardEvent("keydown", {
            bubbles: true,
            cancelable: true,
            composed: true,
            ...eventInit,
          }),
        );
        return true;
      } catch (e) {
        return false;
      }
    }

    function showBrowserActionsMenu(anchorEl) {
      if (!anchorEl) return;

      document.getElementById("browser-actions-menu")?.remove();

      const menu = document.createElement("div");
      menu.id = "browser-actions-menu";
      menu.style.position = "fixed";
      menu.style.zIndex = "2147483647";
      menu.style.minWidth = "220px";
      menu.style.padding = "6px 0";
      menu.style.borderRadius = "8px";
      menu.style.boxShadow = "0 10px 30px rgba(0,0,0,0.35)";
      menu.style.background = browserGlobals.dark ? "#1f1f1f" : "#ffffff";
      menu.style.color = browserGlobals.dark ? "#f5f5f5" : "#222";
      menu.style.border = browserGlobals.dark
        ? "1px solid #444"
        : "1px solid #d0d0d0";
      const closeMenu = () => {
        menu.remove();
        window.removeEventListener("click", closeMenu);
        window.removeEventListener("keydown", onEsc);
      };

      const addItem = (label, handler, disabled = false) => {
        const item = document.createElement("div");
        item.textContent = label;
        item.style.padding = "7px 12px";
        item.style.cursor = disabled ? "not-allowed" : "pointer";
        item.style.userSelect = "none";
        item.style.opacity = disabled ? "0.45" : "1";
        item.addEventListener("mouseenter", () => {
          if (!disabled)
            item.style.background = browserGlobals.dark ? "#333" : "#eef4ff";
        });
        item.addEventListener("mouseleave", () => {
          item.style.background = "transparent";
        });
        item.addEventListener("click", (e) => {
          e.preventDefault();
          e.stopPropagation();
          if (disabled) return;
          closeMenu();
          handler();
        });
        menu.appendChild(item);
      };

      const activeTab = getActiveBrowserTab();
      const hasActiveTab = !!(activeTab && activeTab.iframe);
      addItem("New tab", () => runBrowserShortcut("t"));
      addItem("New window", () => runBrowserShortcut("n"));
      addItem(
        "Close tab",
        () => {
          if (activeTab) closeTab(activeTab.id);
        },
        !hasActiveTab,
      );
      addItem(
        "Reload tab",
        () => {
          if (typeof reloadBtn.onclick === "function") reloadBtn.onclick();
          else if (
            activeTab &&
            activeTab.iframe &&
            activeTab.iframe.contentWindow
          ) {
            let tmp = browserGlobals.unshuffleURL(activeTab.iframe.src);
            if (looksLikeLocalFilePath(tmp)) {
              openUrlInActiveTab(tmp);
            } else {
              activeTab.iframe.contentWindow.location.reload();
            }
          }
        },
        !hasActiveTab,
      );
      addItem(
        "Zoom in",
        () => {
          dispatchShortcutToActiveBrowserTab({ key: "+", ctrlKey: true });
        },
        !hasActiveTab,
      );
      addItem(
        "Zoom out",
        () => {
          dispatchShortcutToActiveBrowserTab({ key: "-", ctrlKey: true });
        },
        !hasActiveTab,
      );
      addItem(
        "Open DevTools",
        () => {
          dispatchShortcutToActiveBrowserTab({
            key: "i",
            ctrlKey: true,
            shiftKey: true,
          });
        },
        !hasActiveTab,
      );
      addItem("Delete browsing data", () => {
        clearBrowsingData();
      });

      menu.appendChild(document.createElement("hr"));

      const rect = anchorEl.getBoundingClientRect();
      menu.style.left = `${Math.min(window.innerWidth - 240, rect.right - 220)}px`;
      menu.style.top = `${Math.min(window.innerHeight - 260, rect.bottom + 6)}px`;
      document.body.appendChild(menu);

      const onEsc = (e) => {
        if (e.key === "Escape") closeMenu();
      };
      requestAnimationFrame(() => {
        window.addEventListener("click", closeMenu, { once: true });
        window.addEventListener("keydown", onEsc, { once: true });
      });
    }

    root.addEventListener("click", (e) => {
      // App-specific click handler can be implemented here
      window.protectedGlobals.bringToFront(root);
    });
    document.addEventListener("browser" + root._goldenbodyId, "click", (e) => {
      // Scoped listener for browser app cleanup
    });
    root.classList.add("browser");
    // --- Top area ---
    const top = document.createElement("div");
    top.className = "sim-chrome-top";
    top.style.justifyContent = "space-between";
    root.appendChild(top);

    top.addEventListener("click", function () {
      window.protectedGlobals.bringToFront(root);
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
      topBar.style.position = "static";
      topBar.style.top = "";
      topBar.style.right = "";
      topBar.style.marginLeft = "auto";
    }

    var btnMin = document.createElement("button");
    btnMin.title = "Minimize";
    btnMin.className = "btnMinColor";
    topBar.appendChild(btnMin);

    var btnMax = document.createElement("button");
    btnMax.className = "btnMaxColor";
    btnMax.title = "Maximize/Restore";
    topBar.appendChild(btnMax);

    var btnClose = document.createElement("button");
    btnClose.title = "Close";
    btnClose.style.color = "white";
    btnClose.style.backgroundColor = "red";
    topBar.appendChild(btnClose);

    [topBar, btnMin, btnMax, btnClose].forEach((el) => {
      el.style.margin = "0 2px";
      el.style.border = "none";
      el.style.padding = "4px 6px";
      el.style.fontSize = "14px";
      el.style.cursor = "pointer";
    });
    const applyWindowControlIcon =
      window.protectedGlobals.applyWindowControlIcon || function () {};
    const setWindowMaximizeIcon =
      window.protectedGlobals.setWindowMaximizeIcon || function () {};
    applyWindowControlIcon(btnMin, "minimize");
    setWindowMaximizeIcon(btnMax, false);
    applyWindowControlIcon(btnClose, "close");

    function getBounds() {
      return {
        left: root.style.left,
        top: root.style.top,
        width: root.style.width,
        height: root.style.height,
        position: root.style.position || "fixed",
      };
    }
    var savedBounds = getBounds();
    let resizePulseInterval = null;
    let renderInterval = null;

    function applyBounds(b) {
      root.style.position = "absolute";
      root.style.left = b.left;
      root.style.top = b.top;
      root.style.width = b.width;
      root.style.height = b.height;
    }

    function maximizeWindow() {
      savedBounds = getBounds();
      root.style.position = "absolute";
      root.style.left = "0";
      root.style.top = "0";
      root.style.width = "100%";
      root.style.height = !window.protectedGlobals.data.autohidetaskbar
        ? `calc(100% - 60px)`
        : "100%";
      root.style.borderRadius = "0px";
      isMaximized = true;
      _isMinimized = false;
      setWindowMaximizeIcon(btnMax, true);
    }

    function restoreWindow(useOriginalBounds = true) {
      if (useOriginalBounds && savedBounds) {
        applyBounds(savedBounds);
      }
      root.style.borderRadius = "10px";
      isMaximized = false;
      _isMinimized = false;
      setWindowMaximizeIcon(btnMax, false);
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
        maximizeWindow();
      } else {
        restoreWindow(true);
      }
    });

    // CLOSE
    btnClose.addEventListener("click", closeWindow);
    function closeWindow() {
      try {
        if (resizePulseInterval) {
          clearInterval(resizePulseInterval);
          resizePulseInterval = null;
        }
      } catch (e) {}
      try {
        if (renderInterval) {
          clearInterval(renderInterval);
          renderInterval = null;
        }
      } catch (e) {}
      try {
        if (windowTitleInterval) {
          clearInterval(windowTitleInterval);
          windowTitleInterval = null;
        }
      } catch (e) {}

      root.remove();

      // Remove from browserGlobals.allBrowsers
      const index = window.browserGlobals.allBrowsers.indexOf(chromeWindow);
      if (index !== -1) {
        window.browserGlobals.allBrowsers.splice(index, 1);
      }
      window.removeEventListener("message", messageHandler);
      window.removeEventListener("pointerup", onpointerupAnywhere);
      // Clean up all event listeners added by this app
      window.protectedGlobals.removeAllEventListenersForApp(
        root.dataset.appId + root._goldenbodyId,
      );
      window.browserGlobals.releaseBrowserGoldenbodyId(root);
      root = null;
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
    urlInput.placeholder =
      "Enter URL (e.g. https://example.com, goldenbody://newtab/, goldenbody://app-store/)";
    urlInput.autocapitalize = "off";
    urlInput.autocomplete = "off";
    urlInput.spellcheck = false;
    addressRow.appendChild(urlInput);
    const applyAddressIconButtonStyle = (button) => {
      Object.assign(button.style, {
        minWidth: "34px",
        padding: "0 12px",
        fontSize: "16px",
      });
    };

    const addressIconSvg = {
      settings:
        '<svg viewBox="0 0 24 24" width="16" height="16" aria-hidden="true" focusable="false" style="display:block;margin:auto" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="3"></circle><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 1 1-4 0v-.09a1.65 1.65 0 0 0-1-1.51 1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.6 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 1 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 8.92 4.6H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 1 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9c.16.5.65.85 1.19.85H21a2 2 0 1 1 0 4h-.41c-.54 0-1.03.35-1.19.85z"></path></svg>',
      reload:
        '<svg viewBox="0 0 24 24" width="16" height="16" aria-hidden="true" focusable="false" style="display:block;margin:auto" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"> <!-- circular arc (stops earlier to leave a gap) --> <path d="M19.5 12a7.5 7.5 0 1 1-2.2-5.3"/> <!-- arrow --> <polyline points="20 4 20 9 15 9"/> </svg>',
      forward:
        '<svg viewBox="0 0 24 24" width="16" height="16" aria-hidden="true" focusable="false" style="display:block;margin:auto" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="5" y1="12" x2="19" y2="12"></line><polyline points="12 5 19 12 12 19"></polyline></svg>',
      back: '<svg viewBox="0 0 24 24" width="16" height="16" aria-hidden="true" focusable="false" style="display:block;margin:auto" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="19" y1="12" x2="5" y2="12"></line><polyline points="12 19 5 12 12 5"></polyline></svg>',
      clear:
        '<svg viewBox="0 0 24 24" width="16" height="16" aria-hidden="true" focusable="false" style="display:block;margin:auto" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"></path><path d="M10 11v6"></path><path d="M14 11v6"></path><path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"></path></svg>',
      download:
        '<svg viewBox="0 0 24 24" width="16" height="16" aria-hidden="true" focusable="false" style="display:block;margin:auto" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>',
      theme:
        '<svg viewBox="0 0 24 24" width="16" height="16" aria-hidden="true" focusable="false" style="display:block;margin:auto" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="3"></circle><line x1="12" y1="1" x2="12" y2="4"></line><line x1="12" y1="20" x2="12" y2="23"></line><line x1="1" y1="12" x2="4" y2="12"></line><line x1="20" y1="12" x2="23" y2="12"></line><line x1="4.2" y1="4.2" x2="6.3" y2="6.3"></line><line x1="17.7" y1="17.7" x2="19.8" y2="19.8"></line><line x1="4.2" y1="19.8" x2="6.3" y2="17.7"></line><line x1="17.7" y1="6.3" x2="19.8" y2="4.2"></line></svg>',
      stop_loading:
        '<svg viewBox="0 0 24 24" width="16" height="16" aria-hidden="true" focusable="false" style="display:block;margin:auto" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>',
    };

    const setAddressButtonIcon = (button, iconName) => {
      button.innerHTML = addressIconSvg[iconName] || "";
    };

    const openBtn = document.createElement("button");
    openBtn.className = "sim-open-btn";
    openBtn.title = "open url";
    setAddressButtonIcon(openBtn, "forward");
    addressRow.appendChild(openBtn);

    var sitesettingsbtn = document.createElement("button");
    sitesettingsbtn.title = "Site Settings";
    setAddressButtonIcon(sitesettingsbtn, "settings");
    sitesettingsbtn.className = "sim-open-btn";
    applyAddressIconButtonStyle(sitesettingsbtn);

    addressRow.prepend(sitesettingsbtn);

    var reloadBtn = document.createElement("button");
    reloadBtn.title = "Reload";
    reloadBtn.className = "sim-open-btn";
    applyAddressIconButtonStyle(reloadBtn);
    setAddressButtonIcon(reloadBtn, "reload");
    reloadBtn.dataset.mode = "reload";
    addressRow.prepend(reloadBtn);

    var forwardBtn = document.createElement("button");
    forwardBtn.title = "Forward";
    setAddressButtonIcon(forwardBtn, "forward");
    forwardBtn.className = "sim-open-btn";
    applyAddressIconButtonStyle(forwardBtn);
    addressRow.prepend(forwardBtn);

    var backBtn = document.createElement("button");
    backBtn.title = "Back";
    setAddressButtonIcon(backBtn, "back");
    backBtn.className = "sim-open-btn";
    applyAddressIconButtonStyle(backBtn);
    addressRow.prepend(backBtn);

    var clear = document.createElement("button");
    setAddressButtonIcon(clear, "clear");
    clear.title = "delete browsing data";
    clear.className = "sim-open-btn";
    applyAddressIconButtonStyle(clear);

    function openDownloadUI(anchorPoint = null) {
      document.getElementById("download-ui")?.remove();

      const panel = document.createElement("div");
      panel.id = "download-ui";
      panel.className = "panel";
      panel.classList.toggle("dark", browserGlobals.dark);
      panel.classList.toggle("light", !browserGlobals.dark);
      panel.style.cssText =
        "position:fixed;z-index:999999;width:420px;border-radius:10px;box-shadow:0 20px 60px rgba(0,0,0,.6);padding:14px;font-family:system-ui;font-size:13px;";

      let closed = false;

      function cleanup() {
        if (closed) return;
        closed = true;
        try {
          panel.remove();
        } catch (e) {}
        try {
          document.removeEventListener("pointermove", onPointerMove);
        } catch (e) {}
        try {
          document.removeEventListener("pointerup", onPointerUp);
        } catch (e) {}
        try {
          document.removeEventListener(
            "pointerdown",
            onOutsidePointerDown,
            true,
          );
        } catch (e) {}
      }

      function onOutsidePointerDown(event) {
        if (!panel.contains(event.target)) {
          cleanup();
        }
      }

      const title = document.createElement("div");
      title.style.cssText = "font-weight:600;margin-bottom:8px;cursor:grab";
      title.textContent = "Download URL";
      panel.appendChild(title);

      const label = document.createElement("div");
      label.style.cssText = "font-size:12px;color:#888;margin-bottom:6px";
      label.textContent = "Enter URL to download";
      panel.appendChild(label);

      const input = document.createElement("input");
      input.type = "text";
      input.placeholder = "https://example.com/file.png";
      input.style.cssText =
        "width:100%;padding:8px;margin-bottom:8px;border-radius:6px;border:1px solid #ccc";
      try {
        input.value =
          activatedTab && activatedTab.iframe && activatedTab.iframe.src
            ? browserGlobals.unshuffleURL(activatedTab.iframe.src)
            : "";
      } catch (e) {}
      panel.appendChild(input);

      const computeName = (u) => {
        try {
          const parsed = new URL(u);
          let n = parsed.pathname.split("/").pop() || "";
          if (!n || n === "/")
            n =
              parsed.searchParams.get("filename") ||
              parsed.searchParams.get("file") ||
              "";
          if (!n) n = "download";
          return n.split("?")[0];
        } catch (e) {
          return "download";
        }
      };

      const info = document.createElement("div");
      info.style.cssText = "font-size:12px;color:#666;margin-bottom:8px";
      info.textContent = "Filename: " + computeName(input.value || "");
      panel.appendChild(info);
      input.oninput = () => {
        info.textContent = "Filename: " + computeName(input.value || "");
      };

      const btnRow = document.createElement("div");
      btnRow.style.cssText =
        "display:flex;justify-content:flex-end;gap:8px;margin-top:6px";
      const btnCancel = document.createElement("button");
      btnCancel.textContent = "Cancel";
      btnCancel.onclick = () => cleanup();
      const btnDownload = document.createElement("button");
      btnDownload.textContent = "Download";
      btnDownload.style.background = "#4c8bf5";
      btnDownload.style.color = "#fff";
      btnDownload.onclick = async () => {
        const url = (input.value || "").trim();
        if (!url) return window.protectedGlobals.notification("Enter a URL");
        const filename = computeName(url);
        try {
          if (typeof window.protectedGlobals.downloadPost === "function") {
            await window.protectedGlobals.downloadPost({ href: url, filename });
            window.protectedGlobals.notification("Download request sent");
          } else {
            window.protectedGlobals.notification("downloadPost not available");
          }
        } catch (e) {
          console.error("downloadPost error", e);
          window.protectedGlobals.notification("Download failed to start");
        }
        cleanup();
      };
      btnRow.appendChild(btnCancel);
      btnRow.appendChild(btnDownload);
      panel.appendChild(btnRow);

      let isDragging = false;
      let startX = 0;
      let startY = 0;
      let origLeft = 0;
      let origTop = 0;
      function onPointerMove(e) {
        if (!isDragging) return;
        const dx = e.clientX - startX;
        const dy = e.clientY - startY;
        panel.style.left = origLeft + dx + "px";
        panel.style.top = origTop + dy + "px";
        panel.style.transform = "";
      }
      function onPointerUp() {
        if (!isDragging) return;
        isDragging = false;
        title.style.cursor = "grab";
        try {
          document.removeEventListener("pointermove", onPointerMove);
        } catch (e) {}
        try {
          document.removeEventListener("pointerup", onPointerUp);
        } catch (e) {}
      }
      title.addEventListener("pointerdown", (ev) => {
        ev.preventDefault();
        isDragging = true;
        startX = ev.clientX;
        startY = ev.clientY;
        const r = panel.getBoundingClientRect();
        origLeft = r.left;
        origTop = r.top;
        title.style.cursor = "grabbing";
        document.addEventListener("pointermove", onPointerMove);
        document.addEventListener("pointerup", onPointerUp);
      });

      document.body.appendChild(panel);

      setTimeout(() => {
        if (!closed) {
          document.addEventListener("pointerdown", onOutsidePointerDown, true);
        }
      }, 0);

      if (
        anchorPoint &&
        typeof anchorPoint.x === "number" &&
        typeof anchorPoint.y === "number"
      ) {
        const rect = panel.getBoundingClientRect();
        const viewportW =
          window.innerWidth || document.documentElement.clientWidth || 0;
        const viewportH =
          window.innerHeight || document.documentElement.clientHeight || 0;
        let left = anchorPoint.x - rect.width;
        let top = anchorPoint.y;
        left = Math.max(0, Math.min(left, Math.max(0, viewportW - rect.width)));
        top = Math.max(0, Math.min(top, Math.max(0, viewportH - rect.height)));
        panel.style.left = left + "px";
        panel.style.top = top + "px";
        panel.style.transform = "";
      } else {
        panel.style.left = "50%";
        panel.style.top = "50%";
        panel.style.transform = "translate(-50%,-50%)";
      }
    }

    var downloadBtn = document.createElement("button");
    downloadBtn.title = "Download URL";
    downloadBtn.className = "sim-open-btn";
    applyAddressIconButtonStyle(downloadBtn);
    setAddressButtonIcon(downloadBtn, "download");
    downloadBtn.onclick = function (e) {
      const buttonRect = downloadBtn.getBoundingClientRect();
      const x = buttonRect.right || 0;
      const y = buttonRect.top || 0;
      openDownloadUI({ x, y });
    };

    function openThemeUI(anchorPoint = null) {
      document.getElementById("theme-ui")?.remove();

      let closed = false;
      function cleanup() {
        if (closed) return;
        closed = true;
        try {
          panel.remove();
        } catch (e) {}
        try {
          document.removeEventListener(
            "pointerdown",
            onOutsidePointerDown,
            true,
          );
        } catch (e) {}
        try {
          document.removeEventListener("pointermove", onPointerMoveTheme);
        } catch (e) {}
        try {
          document.removeEventListener("pointerup", onPointerUpTheme);
        } catch (e) {}
      }

      const panel = document.createElement("div");
      panel.id = "theme-ui";
      panel.className = "panel";
      panel.classList.toggle("dark", browserGlobals.dark);
      panel.classList.toggle("light", !browserGlobals.dark);
      panel.style.cssText =
        "position:fixed;z-index:999999;width:320px;border-radius:10px;box-shadow:0 20px 60px rgba(0,0,0,.6);padding:14px;font-family:system-ui;font-size:13px;";

      function onOutsidePointerDown(event) {
        if (!panel.contains(event.target)) {
          cleanup();
        }
      }

      const title = document.createElement("div");
      title.style.cssText = "font-weight:600;margin-bottom:8px;cursor:grab";
      title.textContent = "Change Theme";
      panel.appendChild(title);

      const desc = document.createElement("div");
      desc.style.cssText = "font-size:12px;color:#888;margin-bottom:8px";
      desc.textContent =
        "Choose theme for this browser app (light/dark/default).";
      panel.appendChild(desc);

      const form = document.createElement("div");
      form.style.cssText = "display:flex;flex-direction:column;gap:8px;";

      function radioOption(value, label, checked) {
        const row = document.createElement("label");
        row.style.cssText = "display:flex;align-items:center;gap:8px;";
        const r = document.createElement("input");
        r.type = "radio";
        r.name = "gb-theme-mode";
        r.value = value;
        r.checked = !!checked;
        row.appendChild(r);
        row.appendChild(document.createTextNode(label));
        return row;
      }

      const currentMode =
        browserGlobals.profile && browserGlobals.profile.themeMode
          ? browserGlobals.profile.themeMode
          : "auto";
      const manualDark = !!(
        browserGlobals.profile && browserGlobals.profile.dark
      );

      form.appendChild(
        radioOption(
          "auto",
          "Default (system preference)",
          currentMode === "auto",
        ),
      );
      form.appendChild(
        radioOption("light", "Light", currentMode === "manual" && !manualDark),
      );
      form.appendChild(
        radioOption("dark", "Dark", currentMode === "manual" && manualDark),
      );

      // No per-window ignore checkbox — manual theme selection will pin
      // theme for all browser windows by setting `data-theme-manual` on roots.

      panel.appendChild(form);

      const actions = document.createElement("div");
      actions.style.cssText =
        "display:flex;justify-content:flex-end;gap:8px;margin-top:12px;";
      const btnCancel = document.createElement("button");
      btnCancel.textContent = "Cancel";
      btnCancel.onclick = () => cleanup();
      const btnApply = document.createElement("button");
      btnApply.textContent = "Apply";
      btnApply.style.background = "#4c8bf5";
      btnApply.style.color = "#fff";
      btnApply.onclick = async () => {
        const chosen =
          Array.from(
            panel.querySelectorAll('input[name="gb-theme-mode"]'),
          ).find((i) => i.checked)?.value || "auto";
        try {
          browserGlobals.profile = browserGlobals.profile || {};
          if (chosen === "auto") {
            browserGlobals.profile.themeMode = "auto";
          } else {
            browserGlobals.profile.themeMode = "manual";
            browserGlobals.profile.dark = chosen === "dark";
          }
          await window.browserGlobals.writeBrowserProfile(
            browserGlobals.profile,
            { force: true },
          );
        } catch (e) {}
        // update effective dark
        try {
          if (
            browserGlobals.profile &&
            browserGlobals.profile.themeMode === "auto"
          ) {
            browserGlobals.dark = !!(
              window.protectedGlobals.data && window.protectedGlobals.data.dark
            );
          } else {
            browserGlobals.dark = !!(
              browserGlobals.profile && browserGlobals.profile.dark
            );
          }
        } catch (e) {
          browserGlobals.dark = !!(
            window.protectedGlobals.data && window.protectedGlobals.data.dark
          );
        }

        // If manual, pin theme on all browser roots so `window.protectedGlobals.applyStyles` won't
        // override them. If auto, remove the pin so `window.protectedGlobals.applyStyles` manages them.
        try {
          const allRoots = document.querySelectorAll(
            '.app-window-root[data-app-id="browser"]',
          );
          for (const rr of allRoots) {
            if (
              browserGlobals.profile &&
              browserGlobals.profile.themeMode === "manual"
            ) {
              rr.dataset.themeManual = "true";
              rr.classList.toggle("dark", browserGlobals.dark);
              rr.classList.toggle("light", !browserGlobals.dark);
            } else {
              try {
                delete rr.dataset.themeManual;
              } catch (e) {
                rr.dataset.themeManual = "false";
              }
              // Ensure the root reflects the effective (global) theme immediately
              try {
                rr.classList.toggle("dark", !!browserGlobals.dark);
                rr.classList.toggle("light", !browserGlobals.dark);
              } catch (e) {}
            }
          }
        } catch (e) {}

        // Dispatch styleapplied to notify apps
        try {
          allRoots = [];
          browserGlobals.allBrowsers.forEach((b) => {
            try {
              const r = b.rootElement;
              if (r) allRoots.push(r);
            } catch (e) {}
          });
          for (const r of allRoots) {
            try {
              r.dispatchEvent(new CustomEvent("styleapplied", {}));
            } catch (e) {}
          }
        } catch (e) {}

        cleanup();
      };
      actions.append(btnCancel, btnApply);
      panel.appendChild(actions);

      let isDragging = false;
      let startX = 0;
      let startY = 0;
      let origLeft = 0;
      let origTop = 0;
      function onPointerMoveTheme(e) {
        if (!isDragging) return;
        const dx = e.clientX - startX;
        const dy = e.clientY - startY;
        panel.style.left = origLeft + dx + "px";
        panel.style.top = origTop + dy + "px";
        panel.style.transform = "";
      }
      function onPointerUpTheme() {
        if (!isDragging) return;
        isDragging = false;
        title.style.cursor = "grab";
        try {
          document.removeEventListener("pointermove", onPointerMoveTheme);
        } catch (e) {}
        try {
          document.removeEventListener("pointerup", onPointerUpTheme);
        } catch (e) {}
      }
      title.addEventListener("pointerdown", (ev) => {
        ev.preventDefault();
        isDragging = true;
        startX = ev.clientX;
        startY = ev.clientY;
        const r = panel.getBoundingClientRect();
        origLeft = r.left;
        origTop = r.top;
        title.style.cursor = "grabbing";
        document.addEventListener("pointermove", onPointerMoveTheme);
        document.addEventListener("pointerup", onPointerUpTheme);
      });

      document.body.appendChild(panel);

      setTimeout(() => {
        if (!closed) {
          document.addEventListener("pointerdown", onOutsidePointerDown, true);
        }
      }, 0);

      if (
        anchorPoint &&
        typeof anchorPoint.x === "number" &&
        typeof anchorPoint.y === "number"
      ) {
        const rect = panel.getBoundingClientRect();
        const viewportW =
          window.innerWidth || document.documentElement.clientWidth || 0;
        const viewportH =
          window.innerHeight || document.documentElement.clientHeight || 0;
        let left = anchorPoint.x - rect.width;
        let top = anchorPoint.y;
        left = Math.max(0, Math.min(left, Math.max(0, viewportW - rect.width)));
        top = Math.max(0, Math.min(top, Math.max(0, viewportH - rect.height)));
        panel.style.left = left + "px";
        panel.style.top = top + "px";
        panel.style.transform = "";
      } else {
        panel.style.left = "50%";
        panel.style.top = "50%";
        panel.style.transform = "translate(-50%,-50%)";
      }
    }

    async function clearBrowsingData() {
      const confirmClear = await showConfirmDialog(
        "Clear site data",
        "This will reset site settings and clear your browsing data. Continue?",
      );
      if (!confirmClear) return;

      const id = await window.browserGlobals.requestNewBrowserSessionId();
      window.browserGlobals.id = id;
      await window.browserGlobals.writeBrowserUserId(id);
      window.browserGlobals.profile = {
        siteSettings: [],
        enableURLSync: true,
        lazyloading: true,
        siteZoom: {},
      };
      await window.browserGlobals.writeBrowserProfile(
        window.browserGlobals.profile,
        { force: true },
      );
      window.browserGlobals.profileState.siteSettings = [];
      window.browserGlobals.profileState.enableURLSync = true;
      window.browserGlobals.profileState.lazyloading = true;
      window.browserGlobals.profileState.siteZoom = {};
      await window.browserGlobals.clearAllCookies();
      await window.browserGlobals.clearAllIndexedDb();
      window.protectedGlobals.notification(
        "site data cleared! please close all browser windows!",
      );
    }
    clear.onclick = clearBrowsingData;

    addressRow.appendChild(downloadBtn);
    // Theme button
    var themeBtn = document.createElement("button");
    themeBtn.className = "sim-open-btn";
    themeBtn.title = "Theme";
    setAddressButtonIcon(themeBtn, "theme");
    applyAddressIconButtonStyle(themeBtn);
    themeBtn.onclick = function (e) {
      const r = themeBtn.getBoundingClientRect();
      openThemeUI({ x: r.right, y: r.top + r.height });
    };
    addressRow.appendChild(themeBtn);
    const browserActionsBtn = document.createElement("button");
    browserActionsBtn.className = "sim-open-btn";
    browserActionsBtn.title = "More browser actions";
    browserActionsBtn.textContent = "⋯";
    applyAddressIconButtonStyle(browserActionsBtn);
    browserActionsBtn.style.fontSize = "18px";
    browserActionsBtn.style.fontWeight = "700";
    browserActionsBtn.addEventListener("click", (e) => {
      e.preventDefault();
      e.stopPropagation();
      showBrowserActionsMenu(browserActionsBtn);
    });
    addressRow.appendChild(browserActionsBtn);

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
    resizePulseInterval = setInterval(() => {
      if (!activatedTab) return;
      if (previousn === activatedTab.resizeP) {
        resizeDiv.style.display = "none";
      }
      previousn = activatedTab.resizeP;
    }, 3000 * window.browserGlobals.nhjd);
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
    browserGlobals.tabisDragging = false;

    let dragid = "";
    let dragindex = 0;
    let nativeTabDrag = false;
    let dragoverReordered = false;
    let crossWindowTransferHandled = false;
    const resetTabDragState = () => {
      browserGlobals.tabisDragging = false;
      dragMoved = false;
      browserGlobals.draggedtab = null;
      dragid = "";
      dragindex = 0;
      nativeTabDrag = false;
      dragoverReordered = false;
      crossWindowTransferHandled = false;
    };
    const onpointerupAnywhere = (ev, notontab) => {
      const eventTarget =
        ev?.target ||
        (typeof ev?.clientX === "number" && typeof ev?.clientY === "number"
          ? document.elementFromPoint(ev.clientX, ev.clientY)
          : null);
      if (!eventTarget && !notontab) return;
      console.log("pointerup anywhere:", eventTarget, "notontab?", notontab);
      if (!browserGlobals.tabisDragging) return;
      if (!browserGlobals.dragstartwindow || !browserGlobals.draggedtab) {
        resetTabDragState();
        return;
      }

      // Check if pointerup happened on a tab
      let targetTab;
      try {
        targetTab = eventTarget?.closest(".sim-tab");
      } catch (e) {}
      try {
        let tabbarHit = false;
        let targetBrowser = null;

        for (const b of browserGlobals.allBrowsers) {
          if (
            b.rootElement.querySelector(".sim-chrome-top").contains(eventTarget)
          ) {
            tabbarHit = true;
            targetBrowser = b;
            break;
          }
        }
        if (tabbarHit) {
          // Determine the element under the cursor
          const dropTarget =
            document.elementFromPoint(ev.clientX, ev.clientY) || eventTarget;

          // Detect which window the cursor is over
          let targetBrowser = null;

          for (const b of browserGlobals.allBrowsers) {
            if (b.rootElement.contains(dropTarget)) {
              targetBrowser = b;
              break;
            }
          }
          // If dropped in the same window: do nothing
          if (targetBrowser === browserGlobals.dragstartwindow) {
            // reset drag state
            resetTabDragState();
            return;
          }

          // If dropped in another window
          if (targetBrowser) {
            if (crossWindowTransferHandled) {
              resetTabDragState();
              return;
            }
            crossWindowTransferHandled = true;
            targetBrowser.addTab(
              browserGlobals.draggedtab.url,
              "",
              browserGlobals.draggedtab.resizeP,
            );
            browserGlobals.dragstartwindow.closeTab(
              browserGlobals.draggedtab.id,
            );
            resetTabDragState();
            return;
          }

          resetTabDragState();
          return;
        }
      } catch (e) {}
      if (!targetTab || targetTab.id !== dragid) {
        // pointerup happened somewhere else
        if (crossWindowTransferHandled) {
          resetTabDragState();
          return;
        }
        crossWindowTransferHandled = true;
        browser(
          browserGlobals.dragstartwindow.tabs[dragindex].url,
          browserGlobals.draggedtab.resizeP,
          ev.clientX - 100,
          ev.clientY - 20,
        ); // your custom function
        // console.log(root);
        browserGlobals.dragstartwindow.closeTab(browserGlobals.draggedtab.id);
      }

      resetTabDragState();
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
    renderInterval = setInterval(() => {
      if (!browserGlobals.allBrowsers.some((b) => b.rootElement === root)) {
        clearInterval(renderInterval);
        console.warn("interval cleared, root missing!");
      }
      renderTabs();
    }, 10000);
    function renderTabs() {
      if (browserGlobals.tabisDragging || nativeTabDrag) return;
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
          if (activeTabId !== t.id) activateTab(t.id);
        });
        el.addEventListener("pointerup", function () {
          window.protectedGlobals.bringToFront(root);
        });
        el.addEventListener("dragstart", (ev) => {
          browserGlobals.dragstartwindow = chromeWindow;
          browserGlobals.tabisDragging = true;
          nativeTabDrag = true;
          dragoverReordered = false;
          dragMoved = false;
          dragindex = countChild(tabsRow, el);
          console.log("dragindex:", dragindex);
          browserGlobals.draggedtab = tabs[dragindex];
          dragid = el.id;
          try {
            if (ev.dataTransfer) {
              ev.dataTransfer.effectAllowed = "move";
              ev.dataTransfer.setData("text/plain", dragid);
            }
          } catch (e) {}
        });

        el.addEventListener("dragover", (e) => {
          if (
            !(
              browserGlobals.tabisDragging &&
              browserGlobals.dragstartwindow === chromeWindow
            )
          )
            return;
          e.preventDefault();
          dragMoved = true;
          dragoverReordered = true;

          const draggedelement = root.querySelector(`#${dragid}`);
          if (!draggedelement || draggedelement === el) return;

          const isDraggingRight =
            draggedelement.compareDocumentPosition(el) &
            Node.DOCUMENT_POSITION_FOLLOWING;

          let newIndex = countChild(tabsRow, el);
          if (isDraggingRight) newIndex++;

          tabs = moveTabInArray(tabs, dragindex, newIndex);
          tabsRow.insertBefore(
            draggedelement,
            isDraggingRight ? el.nextSibling : el,
          );
          dragindex = countChild(tabsRow, draggedelement);
        });

        el.addEventListener("dragend", (e) => {
          if (!browserGlobals.tabisDragging) return;
          onpointerupAnywhere({
            clientX: e.clientX,
            clientY: e.clientY,
            target: document.elementFromPoint(e.clientX, e.clientY) || e.target,
          });
          resetTabDragState();
          renderTabs();
        });

        el.addEventListener("pointermove", () => {
          if (browserGlobals.tabisDragging) dragMoved = true;
        });

        el.addEventListener("pointerup", (e) => {
          if (nativeTabDrag) {
            return;
          }
          if (
            browserGlobals.tabisDragging &&
            dragMoved &&
            browserGlobals.dragstartwindow === chromeWindow
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
            browserGlobals.tabisDragging &&
            dragMoved &&
            browserGlobals.dragstartwindow !== chromeWindow
          ) {
            onpointerupAnywhere(e);
          }

          resetTabDragState();
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
    window.addEventListener(
      "browser" + root._goldenbodyId,
      "message",
      function (e) {
        if (e.data.type === "FROM_IFRAME") {
          addTab(e.data.message, "New Tab");
        } else if (
          e.data.__goldenbodynewWindow__ &&
          root ===
            browserGlobals.allBrowsers[e.data.allbrowserindex].rootElement
        ) {
          addTab(e.data.url, "New Tab");
        }
      },
    );
    //render tab end----------------------------------------------------------

    function addTab(url, title, resizeP = preloadsize) {
      const id = "tab-" + ++tabCounter;
      const iframe = document.createElement("iframe");
      if (browserGlobals.profileState.lazyloading) iframe.loading = "lazy";
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
        let eggpatch = document.createElement("script");
        eggpatch.textContent = `console.log("%c[EggPatcher] %cWebSocket patcher initialized","color: magenta; font-weight: bold","color: white"),(()=>{class e extends WebSocket{constructor(e,o){let c=window.top.origin.split("/")[2],t=String(e);t.includes(c)&&(t=t.replace(c,window.location.host)),t.includes("egs")&&t.includes(window.location.hostname.split('.')[1])&&(t=t.replace(window.location.hostname.split('.')[1]+'.'+window.location.hostname.split('.')[2],"shellshock.io")),t.includes("ser")&&(t="wss://shellshock.io/services/"),t.includes("matchmaker")&&(t="wss://shellshock.io/matchmaker/"),console.log(\`%c[WS Connect] %cConnecting to: \${t}\`,"color: cyan; font-weight: bold","color: white"),super(t,o),this.addEventListener("open",(()=>{console.log(\`%c[WS Open] %cSuccessfully connected to \${this.url}\`,"color: green; font-weight: bold","color: white")})),this.addEventListener("error",(e=>{console.error(\`[WS Error] Connection failed to \${this.url}\`,e)}))}}window.WebSocket=e})();`;
        iframe.contentDocument.body.appendChild(eggpatch);

        let themeOverride = document.createElement("script");
        themeOverride.textContent = `
          (function(){
            try{
              window.__originalMatchMedia = window.__originalMatchMedia || window.matchMedia.bind(window);
              function readTopDark(){
                try{
                  if(window.top && window.top.protectedGlobals && window.top.browserGlobals && typeof window.top.browserGlobals.dark !== 'undefined') return !!window.top.browserGlobals.dark;
                }catch(e){}
                try{
                  if(window.top && window.top.protectedGlobals && window.top.protectedGlobals.data && typeof window.top.protectedGlobals.data.dark !== 'undefined') return !!window.top.protectedGlobals.data.dark;
                }catch(e){}
                return null;
              }
              var last = readTopDark();
              var original = window.__originalMatchMedia;
              function createMQ(matches){
                var listeners = [];
                var obj = {
                  media: '(prefers-color-scheme: dark)',
                  matches: !!matches,
                  addListener: function(cb){ if(typeof cb==='function') listeners.push(cb); },
                  removeListener: function(cb){ listeners = listeners.filter(function(l){return l!==cb}); },
                  addEventListener: function(ev, cb){ if(ev==='change' && typeof cb==='function') listeners.push(cb); },
                  removeEventListener: function(ev, cb){ if(ev==='change') listeners = listeners.filter(function(l){return l!==cb}); },
                  dispatchEvent: function(e){ listeners.forEach(function(cb){try{cb(e);}catch(e){}}); return true; }
                };
                obj._notify = function(){
                  var ev = {matches: obj.matches, media: obj.media};
                  listeners.slice().forEach(function(cb){ try{ cb(ev); }catch(e){} });
                };
                return obj;
              }
              var mqInstance = createMQ(last === null ? original('(prefers-color-scheme: dark)').matches : last);
              window.matchMedia = function(media){
                if(media === '(prefers-color-scheme: dark)') return mqInstance;
                return original(media);
              };
              setInterval(function(){
                var cur = readTopDark();
                if(cur === null) return;
                cur = !!cur;
                if(cur !== mqInstance.matches){
                  mqInstance.matches = cur;
                  mqInstance._notify();
                }
              }, 500);
            }catch(e){}
          })();
          `;
        iframe.contentDocument.body.appendChild(themeOverride);
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
            website: window.protectedGlobals.goldenbodywebsite,
            value: browserGlobals.id,
            dark: browserGlobals.dark,
          },
          "*",
        );
        function getSiteZoomKeyForTab(tab) {
          try {
            const current = String(
              tab.iframe.contentWindow.location &&
                tab.iframe.contentWindow.location.href
                ? tab.iframe.contentWindow.location.href
                : tab.url || "",
            );
            const unshuffled = browserGlobals.unshuffleURL(current);
            try {
              const u = new URL(unshuffled);
              return (u.protocol + "//" + u.host).toLowerCase();
            } catch (e) {
              return browserGlobals.mainWebsite(unshuffled).toLowerCase();
            }
          } catch (e) {
            return "";
          }
        }

        function applyZoomToTab(tab) {
          let resizescript = document.createElement("script");
          resizescript.textContent = `document.body.style.zoom = ${tab.resizeP} + '%' || '100%'; // shrink page inside iframe`;
          tab.iframe.contentDocument.head.appendChild(resizescript);
        }

        function persistSiteZoomForTab(tab) {
          const key = getSiteZoomKeyForTab(tab);
          if (!key) return;
          const profile =
            window.browserGlobals.profile ||
            window.browserGlobals.defaultBrowserProfile();
          if (!profile.siteZoom || typeof profile.siteZoom !== "object") {
            profile.siteZoom = {};
          }
          profile.siteZoom[key] = tab.resizeP;
          window.browserGlobals.profile = profile;
          window.browserGlobals.profileState.siteZoom = profile.siteZoom;
          try {
            if (window.browserGlobals.__siteZoomPersistTimer) {
              clearTimeout(window.browserGlobals.__siteZoomPersistTimer);
            }
            window.browserGlobals.__siteZoomPersistTimer = setTimeout(() => {
              window.browserGlobals
                .writeBrowserProfile(profile)
                .catch(() => {});
            }, 220);
          } catch (e) {}
        }

        function loadSiteZoomForTab(tab) {
          const key = getSiteZoomKeyForTab(tab);
          if (!key) return;
          const profile =
            window.browserGlobals.profile ||
            window.browserGlobals.defaultBrowserProfile();
          const siteZoom =
            profile.siteZoom && typeof profile.siteZoom === "object"
              ? profile.siteZoom
              : {};
          const z = Number(siteZoom[key]);
          if (Number.isFinite(z)) {
            tab.resizeP = Math.max(25, Math.min(500, Math.round(z)));
          } else {
            tab.resizeP = 100;
          }
        }

        loadSiteZoomForTab(tab);
        function handleresize(e, tab) {
          try {
            if (e.ctrlKey && (e.key === "=" || e.key === "+")) {
              e.preventDefault();
              tab.resizeP += 5;
              if (tab.resizeP > 500) tab.resizeP = 500;
              resizeDiv.style.display = "block";
              applyZoomToTab(tab);
              persistSiteZoomForTab(tab);
            } else if (e.ctrlKey && e.key === "-") {
              e.preventDefault();
              tab.resizeP -= 5;
              if (tab.resizeP < 25) tab.resizeP = 25;
              resizeDiv.style.display = "block";
              applyZoomToTab(tab);
              persistSiteZoomForTab(tab);
            } else {
              resizeDiv.style.display = "none";
            }
          } catch (e) {}
        }
        function handleresizel1(e) {
          handleresize(e, tab);
        }

        try {
          if (tab.__onResizeKeydown && tab.__resizeKeyTarget) {
            tab.__resizeKeyTarget.removeEventListener(
              "keydown",
              tab.__onResizeKeydown,
            );
          }
        } catch (e) {}
        tab.__onResizeKeydown = handleresizel1;
        tab.__resizeKeyTarget = tab.iframe.contentWindow;
        tab.__resizeKeyTarget.addEventListener(
          "keydown",
          tab.__onResizeKeydown,
        );
        if (!tab.iframe.style.display === "none")
          urlInput.value = browserGlobals.unshuffleURL(
            iframe.contentWindow.location.href,
          );
        applyZoomToTab(tab);
        // let sfc = tab.iframe.contentDocument.createElement("script");
        // sfc.src = window.protectedGlobals.goldenbodywebsite + "sfc__o.js";
        // tab.iframe.contentDocument.head.prepend(sfc);
        let linkinterval = setInterval(function () {
          try {
            if (!iframe || !iframe.contentDocument || !tabs.includes(tab))
              clearInterval(linkinterval);
            var links = iframe.contentDocument.getElementsByTagName("a");

            for (let i = 0; i < links.length; i++) {
              if (links[i].target !== "_blank") {
                links[i].target = "_self";
              }
              if (!links[i].href.includes(browserGlobals.id)) {
                if (links[i].href.startsWith("http")) {
                  links[i].href = a(links[i].href, browserGlobals.proxyurl);
                }
              }
              links[i].onclick = (e) => {
                if (e.metaKey) {
                  e.preventDefault();
                  const url = browserGlobals.unshuffleURL(links[i].href);

                  iframe.contentWindow.open(url, "_blank");
                  console.log(links[i].href);
                } else if (links[i].target == "_blank") {
                  e.preventDefault();
                  iframe.contentWindow.open(
                    browserGlobals.unshuffleURL(links[i].href),
                    links[i].target || "_self",
                  );
                }
              };
            }
          } catch (e) {}
        }, 2000 * browserGlobals.nhjd);
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
          tab.url = browserGlobals.unshuffleURL(
            iframe.contentWindow.location.href,
          );
          if (iframe.contentDocument.readyState === "complete" && !tab.donotm) {
            const docTitle =
              iframe.contentDocument.title ||
              iframe.contentDocument.querySelector("title")?.childNodes[0]
                ?.nodeValue ||
              window.browserGlobals.unshuffleURL(
                iframe.contentWindow.location.href,
              ) ||
              "Untitled";
            tab.title = docTitle;
          } else {
            tab.title = "Loading...";
          }
        } catch (e) {
          console.warn("Interval cleared due to error:", e);
        }
        if (previousTabTitle !== tab.title) renderTabs();
        previousTabTitle = tab.title;
      }, 1000 * browserGlobals.nhjd);

      createPermInput(iframe, url);
      if (browserGlobals.profileReadyPromise) {
        browserGlobals.profileReadyPromise
          .then(() => {
            try {
              createPermInput(
                iframe,
                browserGlobals.unshuffleURL(
                  iframe.contentWindow.location.href || url,
                ),
              );
            } catch (e) {
              try {
                createPermInput(iframe, url);
              } catch (ee) {}
            }
          })
          .catch(() => {});
      }
      iframe.tabIndex = "0";
      iframe.className = "sim-iframe";
      eval(browserGlobals.iframePatch);

      if (browserGlobals.proxyurl != "") {
        iframe.src = a(url, browserGlobals.proxyurl);
      } else {
        iframe.src = url;
      }
      iframe.style.display = "none";
      root.appendChild(iframe);
      let loadedurl = url;
      let donotm = false;
      const tab = {
        id,
        url,
        title,
        iframe,
        resizeP,
        loadedurl,
        donotm,
        history: {
          stack: [url],
          index: 0,
          current: url,
          currentCanonical: null,
          suppressNextRecord: false,
        },
      };
      tab.history.currentCanonical = canonicalHistoryUrl(url);
      const onIframeKeydown = function (e) {
        if (runBrowserCtrlShortcut(e)) {
          root.focus();
        }
      };
      tab.iframe.contentWindow.addEventListener("keydown", onIframeKeydown);
      tab.__onIframeKeydown = onIframeKeydown;
      tab.__stopIframePatchWatcher = stopIframePatchWatcher;
      tab.__stopPatchIntegrityChecker = stopPatchIntegrityChecker;

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
          let tmp = browserGlobals.unshuffleURL(
            tab.iframe.contentWindow.location.href,
          );
          if (looksLikeLocalFilePath(tmp)) {
            openUrlInActiveTab(tmp);
          } else {
            tab.iframe.contentWindow.location.reload();
          }
        }
      }
      root.addEventListener("keydown", handleReload);
      tab.__onRootKeydown = handleReload;

      let previousTabTitle = tab.title;

      tab.title = "Loading...";

      tabs.push(tab);
      activateTab(id);
      renderTabs();
      const onDocumentKeyup = function (e) {
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
          if (!win || tab.iframe.style.display === "none") return;
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
      };
      document.addEventListener(
        "browser" + root._goldenbodyId,
        "keyup",
        onDocumentKeyup,
      );
      tab.__onDocumentKeyup = onDocumentKeyup;

      return id;
    }
    window.addEventListener(
      "browser" + root._goldenbodyId,
      "keydown",
      function (e) {
        try {
          if (
            document.activeElement !== root &&
            !root.contains(document.activeElement)
          )
            return;
        } catch (e) {
          return;
        }
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
      },
    );

    function canonicalHistoryUrl(url) {
      if (!url) return "";
      const raw = String(url);
      const hashIndex = raw.indexOf("#");
      const queryIndex = raw.indexOf("?");
      let splitIndex = raw.length;

      if (queryIndex !== -1 && queryIndex < splitIndex) {
        splitIndex = queryIndex;
      }
      if (hashIndex !== -1 && hashIndex < splitIndex) {
        splitIndex = hashIndex;
      }

      let head = raw.slice(0, splitIndex);
      const tail = raw.slice(splitIndex);

      if (head.length > 1) {
        head = head.replace(/\/+$/, "");
      }

      return head + tail;
    }

    function historyRecord(tab, url) {
      if (!tab || !tab.history || !url) return;
      const canonical = canonicalHistoryUrl(url);
      if (tab.history.suppressNextRecord) {
        tab.history.suppressNextRecord = false;
        if (
          Array.isArray(tab.history.stack) &&
          tab.history.index >= 0 &&
          tab.history.index < tab.history.stack.length
        ) {
          const currentStackUrl = tab.history.stack[tab.history.index];
          tab.history.current = currentStackUrl;
          tab.history.currentCanonical = canonicalHistoryUrl(currentStackUrl);
          return;
        }
        tab.history.current = url;
        tab.history.currentCanonical = canonical;
        return;
      }
      if (
        Array.isArray(tab.history.stack) &&
        tab.history.index >= 0 &&
        tab.history.index < tab.history.stack.length
      ) {
        const currentStackCanonical = canonicalHistoryUrl(
          tab.history.stack[tab.history.index],
        );
        if (currentStackCanonical === canonical) {
          tab.history.current = url;
          tab.history.currentCanonical = canonical;
          return;
        }
      }
      if (tab.history.currentCanonical === canonical) return;

      if (tab.history.index < tab.history.stack.length - 1) {
        tab.history.stack = tab.history.stack.slice(0, tab.history.index + 1);
      }
      tab.history.stack.push(url);
      tab.history.index = tab.history.stack.length - 1;
      tab.history.current = url;
      tab.history.currentCanonical = canonical;
    }

    async function historyNavigate(tab, direction) {
      if (!tab || !tab.history) return;
      const nextIndex = tab.history.index + direction;
      if (nextIndex < 0 || nextIndex >= tab.history.stack.length) return;

      const targetUrl = tab.history.stack[nextIndex];
      tab.history.index = nextIndex;
      tab.history.current = targetUrl;
      tab.history.currentCanonical = canonicalHistoryUrl(targetUrl);
      tab.history.suppressNextRecord = true;

      tab.url = targetUrl;
      tab.loadedurl = targetUrl;
      tab.title = "Loading...";

      try {
        createPermInput(tab.iframe, targetUrl);
      } catch (e) {}
      if (String(targetUrl).startsWith("file://")) {
        try {
          cleanupLocalFileNav(tab);
          const localPath = normalizeLocalFilePath(targetUrl);
          let blobUrl = browserGlobals.__localFilePathToBlobMap.get(localPath);
          if (!blobUrl) {
            const localNav = await resolveLocalFileNavigation(localPath);
            blobUrl = localNav.iframeSrc;
            tab.__localFileNav = localNav;
          } else {
            tab.__localFileNav = {
              iframeSrc: blobUrl,
              historyUrl: `file://${localPath}`,
              displayUrl: `file://${localPath}`,
              blobUrl,
              isLocal: true,
            };
          }
          tab.iframe.src = blobUrl;
          urlInput.value = `file://${localPath}`;
          return;
        } catch (e) {
          tab.history.suppressNextRecord = false;
          window.protectedGlobals.notification(
            "Unable to open file from history",
          );
          return;
        }
      }
      try {
        tab.iframe.contentWindow.location.href = a(
          targetUrl,
          browserGlobals.proxyurl,
        );
      } catch (e) {
        tab.history.suppressNextRecord = false;
      }
    }

    function activateTab(id) {
      try {
        clearInterval(checkInterval);
      } catch (a) {}
      const tab = tabs.find((t) => t.id === id);
      if (!tab) return;
      tab.iframe.focus();
      // Hide all iframes, show only active
      tabs.forEach((t) => (t.iframe.style.display = "none"));
      tab.iframe.style.display = "block";
      backBtn.onclick = function () {
        historyNavigate(tab, -1);
      };
      forwardBtn.onclick = function () {
        historyNavigate(tab, 1);
      };
      reloadBtn.onclick = function () {
        if (reloadBtn.dataset.mode === "stop") {
          tab.iframe.contentWindow.stop();
        } else {
          let tmp = browserGlobals.unshuffleURL(
            tab.iframe.contentWindow.location.href,
          );
          if (looksLikeLocalFilePath(tmp)) {
            openUrlInActiveTab(tmp);
          } else {
            tab.iframe.contentWindow.location.reload();
          }
        }
      };
      sitesettingsbtn.onclick = () => {
        openPermissionsUI(
          browserGlobals.unshuffleURL(tab.iframe.contentWindow.location.href),
          tab.iframe,
          sitesettingsbtn.getBoundingClientRect(),
        );
      };
      activeTabId = id;
      urlInput.value = browserGlobals.unshuffleURL(
        tab.iframe.contentWindow.location.href,
      );
      let previousUrl = canonicalHistoryUrl(
        browserGlobals.unshuffleURL(tab.iframe.contentWindow.location.href),
      );
      let previousTabTitle = tab.title;
      let previousUrlMain = browserGlobals.unshuffleURL(
        tab.iframe.contentWindow.location.href,
      );

      // Inject custom styles
      checkInterval = setInterval(() => {
        try {
          if (
            browserGlobals.allBrowsers.length == 0 ||
            !tab.iframe.contentDocument
          ) {
            clearInterval(checkInterval);
          }
        } catch (e) {
          clearInterval(checkInterval);
        }
        try {
          const currentUrl = browserGlobals.unshuffleURL(
            tab.iframe.contentWindow.location.href,
          );
          const currentCanonical = canonicalHistoryUrl(currentUrl);
          if (currentCanonical !== previousUrl) {
            historyRecord(tab, currentUrl);
            previousUrl = currentCanonical;
            urlInput.value = currentUrl;
          }
          if (
            currentUrl !== previousUrlMain &&
            (currentUrl.startsWith("http") ||
              currentUrl.startsWith("goldenbody") ||
              currentUrl.startsWith("goldenbody://"))
          ) {
            if (
              browserGlobals.mainWebsite(currentUrl) !==
                browserGlobals.mainWebsite(previousUrlMain) &&
              currentUrl !== "about:blank" &&
              previousUrl !== ""
            )
              if (browserGlobals.profileState.enableURLSync)
                openUrlInActiveTab(currentUrl);
            previousUrlMain = currentUrl;
          }
          resizeDiv.innerText = tab.resizeP + "%";
          activatedTab = tab;
          if (tab.iframe.contentDocument.readyState !== "complete") {
            setAddressButtonIcon(reloadBtn, "stop_loading");
            reloadBtn.dataset.mode = "stop";

            tab.title = "Loading...";
          } else {
            setAddressButtonIcon(reloadBtn, "reload");
            reloadBtn.dataset.mode = "reload";
            // try {
            //   if (tab.iframe.contentDocument.readyState === "complete") {
            //     const docTitle =
            //       tab.iframe.contentDocument.title || tab.iframe.contentDocument.querySelector('title').childNodes[0].nodeValue  || tab.iframe.contentWindow.location.href || "Untitled";
            //     tab.title = docTitle;
            //   }
            // } catch (e) {}
          }
          if (previousTabTitle !== tab.title) renderTabs();
          previousTabTitle = tab.title;
        } catch (e) {
          console.error(e);
        }
      }, 250 * browserGlobals.nhjd);
      renderTabs();
    }

    function closeTab(id) {
      const idx = tabs.findIndex((t) => t.id === id);
      if (idx === -1) return;

      const removingActive = tabs[idx].id === activeTabId;
      try {
        tabs[idx].__stopIframePatchWatcher?.();
      } catch (e) {}
      try {
        tabs[idx].__stopPatchIntegrityChecker?.();
      } catch (e) {}
      try {
        if (tabs[idx].__onIframeKeydown) {
          tabs[idx].iframe.contentWindow.removeEventListener(
            "keydown",
            tabs[idx].__onIframeKeydown,
          );
        }
      } catch (e) {}
      try {
        if (tabs[idx].__onRootKeydown) {
          root.removeEventListener("keydown", tabs[idx].__onRootKeydown);
        }
      } catch (e) {}
      try {
        if (tabs[idx].__onResizeKeydown && tabs[idx].__resizeKeyTarget) {
          tabs[idx].__resizeKeyTarget.removeEventListener(
            "keydown",
            tabs[idx].__onResizeKeydown,
          );
        }
      } catch (e) {}
      try {
        if (tabs[idx].__onDocumentKeyup) {
          document.removeEventListener("keyup", tabs[idx].__onDocumentKeyup);
        }
      } catch (e) {}
      cleanupLocalFileNav(tabs[idx]);
      tabs[idx].iframe.src = "about:blank";
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
    function normalizeLocalFilePath(path) {
      let normalized = String(path || "").trim();
      if (!normalized) return "";
      normalized = normalized.replace(/^file:\/\//i, "");
      normalized = normalized.replace(/^\/+/, "");
      normalized = normalized.replace(/^root\//i, "");
      return normalized;
    }

    function looksLikeLocalFilePath(value) {
      if (!value.startsWith("file://")) return false;
      return true;
    }

    function mimeFromPath(path) {
      const name = String(path || "").toLowerCase();
      const ext = name.includes(".") ? name.slice(name.lastIndexOf(".")) : "";
      const mimeByExt = {
        ".html": "text/html",
        ".htm": "text/html",
        ".aspx": "text/html;charset=utf-8",
        ".asp": "text/html;charset=utf-8",
        ".php": "text/html;charset=utf-8",
        ".jsp": "text/html;charset=utf-8",
        ".cgi": "text/html;charset=utf-8",
        ".txt": "text/plain",
        ".md": "text/markdown",
        ".js": "application/javascript",
        ".mjs": "application/javascript",
        ".json": "application/json",
        ".css": "text/css",
        ".xml": "application/xml",
        ".svg": "image/svg+xml",
        ".png": "image/png",
        ".jpg": "image/jpeg",
        ".jpeg": "image/jpeg",
        ".gif": "image/gif",
        ".webp": "image/webp",
        ".bmp": "image/bmp",
        ".ico": "image/x-icon",
        ".pdf": "application/pdf",
        ".mp4": "video/mp4",
        ".webm": "video/webm",
        ".ogg": "video/ogg",
        ".mp3": "audio/mpeg",
        ".wav": "audio/wav",
        ".flac": "audio/flac",
      };
      return mimeByExt[ext] || "application/octet-stream";
    }

    function base64ToBlobUrl(base64, mimeType) {
      const raw = String(base64 || "");
      const clean = raw.replace(/\s+/g, "");
      const binary = atob(clean);
      const bytes = new Uint8Array(binary.length);
      for (let i = 0; i < binary.length; i++) {
        bytes[i] = binary.charCodeAt(i);
      }
      const blob = new Blob([bytes], {
        type: mimeType || "application/octet-stream",
      });
      return URL.createObjectURL(blob);
    }

    async function resolveLocalFileNavigation(inputPath, options = null) {
      const normalizedPath = normalizeLocalFilePath(inputPath);
      if (!normalizedPath) throw new Error("Missing file path");
      if (typeof window.protectedGlobals.filePost !== "function") {
        throw new Error("File service unavailable");
      }

      const response = await window.protectedGlobals.filePost({
        requestFile: true,
        requestFileName: normalizedPath,
      });

      if (!response || response.missing || response.code === "ENOENT") {
        throw new Error("File not found");
      }
      if (response.kind === "folder") {
        throw new Error("Path points to a folder");
      }

      const base64 = String(response.filecontent || "");
      const ext = normalizedPath.includes(".")
        ? normalizedPath.slice(normalizedPath.lastIndexOf(".")).toLowerCase()
        : "";

      if (ext === ".url") {
        const text = window.browserGlobals.decodeMaybeBase64(base64);
        const direct = text.trim();
        const match = text.match(/^\s*URL\s*=\s*(\S+)/im);
        const targetUrl = (match && match[1] ? match[1] : direct).trim();
        if (targetUrl && /^https?:\/\//i.test(targetUrl)) {
          return {
            iframeSrc: targetUrl,
            historyUrl: targetUrl,
            displayUrl: targetUrl,
            isLocal: false,
          };
        }
      }

      const mime = mimeFromPath(normalizedPath);
      const htmlLikeExts = new Set([
        ".html",
        ".htm",
        ".aspx",
        ".asp",
        ".php",
        ".jsp",
        ".cgi",
      ]);

      let blobUrl = "";

      blobUrl = base64ToBlobUrl(base64, mime);
      try {
        browserGlobals.__localFileUrlMap.set(blobUrl, normalizedPath);
        browserGlobals.__localFilePathToBlobMap.set(normalizedPath, blobUrl);
      } catch (e) {}
      return {
        iframeSrc: blobUrl,
        historyUrl: `file://${normalizedPath}`,
        displayUrl: `file://${normalizedPath}`,
        blobUrl,
        isLocal: true,
      };
    }

    function cleanupLocalFileNav(tab) {
      try {
        if (tab && tab.__localFileNav && tab.__localFileNav.blobUrl) {
          const mappedPath = browserGlobals.__localFileUrlMap.get(
            tab.__localFileNav.blobUrl,
          );
          try {
            browserGlobals.__localFileUrlMap.delete(tab.__localFileNav.blobUrl);
          } catch (e) {}
          try {
            if (mappedPath) {
              browserGlobals.__localFilePathToBlobMap.delete(mappedPath);
            }
          } catch (e) {}
          URL.revokeObjectURL(tab.__localFileNav.blobUrl);
        }
      } catch (e) {}
      if (tab) tab.__localFileNav = null;
    }

    async function openUrlInActiveTab(rawUrl, options = null) {
      const tabIndex = tabs.findIndex((t) => t.id === activeTabId);
      if (tabIndex === -1) return;
      const tab = tabs[tabIndex];
      const input = String(rawUrl || "").trim();
      if (!input) {
        window.protectedGlobals.notification("Enter a URL or file path");
        return;
      }

      if (looksLikeLocalFilePath(input)) {
        try {
          cleanupLocalFileNav(tab);
          const localNav = await resolveLocalFileNavigation(input, options);
          tab.__localFileNav = localNav;
          tab.url = localNav.historyUrl;
          tab.loadedurl = localNav.historyUrl;
          tab.title = "Loading...";
          tab.history.suppressNextRecord = false;
          if (tab.history.index < tab.history.stack.length - 1) {
            tab.history.stack = tab.history.stack.slice(
              0,
              tab.history.index + 1,
            );
          }
          tab.history.stack.push(localNav.historyUrl);
          tab.history.index = tab.history.stack.length - 1;
          tab.history.current = localNav.historyUrl;
          tab.history.currentCanonical = canonicalHistoryUrl(
            localNav.historyUrl,
          );
          tab.history.suppressNextRecord = true;
          tabs[tabIndex].iframe.src = localNav.iframeSrc;
          urlInput.value = localNav.displayUrl;
          return;
        } catch (err) {
          window.protectedGlobals.notification(
            `Unable to open file: ${String(err && err.message ? err.message : err)}`,
          );
          return;
        }
      }

      cleanupLocalFileNav(tab);

      let candidate = input;
      const urlCheck = isUrl(candidate);
      if (typeof urlCheck === "string") {
        candidate = urlCheck;
      }

      if (candidate.startsWith("javascript:")) {
        let scriptcontent = "";
        for (let i = 11; i < candidate.length; i++) {
          scriptcontent += candidate[i];
        }
        let script = document.createElement("script");
        script.textContent = scriptcontent;
        tab.iframe.contentDocument.body.appendChild(script);
        urlInput.value = browserGlobals.unshuffleURL(
          tab.iframe.contentWindow.location.href,
        );
        return;
      }

      let url = "";
      try {
        url = new URL(candidate).href;
      } catch (e) {
        // Edge case: allow relative entries in the URL bar.
        try {
          const currentBase = browserGlobals.unshuffleURL(
            tab.iframe.contentWindow.location.href,
          );
          url = new URL(candidate, currentBase).href;
        } catch (e2) {
          return;
        }
      }

      // Manual URL-bar navigations should become a fresh history point,
      // including after a prior back/forward operation.
      const canonical = canonicalHistoryUrl(url);
      const prevHistorySnapshot = {
        stack: Array.from(tab.history.stack || []),
        index: tab.history.index,
        current: tab.history.current,
        currentCanonical: tab.history.currentCanonical,
        suppressNextRecord: tab.history.suppressNextRecord,
      };
      const didCreateHistoryEntry = tab.history.currentCanonical !== canonical;

      tab.history.suppressNextRecord = false;
      if (didCreateHistoryEntry) {
        if (tab.history.index < tab.history.stack.length - 1) {
          tab.history.stack = tab.history.stack.slice(0, tab.history.index + 1);
        }
        tab.history.stack.push(url);
        tab.history.index = tab.history.stack.length - 1;
        tab.history.current = url;
        tab.history.currentCanonical = canonical;
      }
      // Prevent duplicate push when poller observes this same navigation.
      // Important: only do this when a new history entry was created, otherwise
      // stale suppression can swallow the next real navigation.
      tab.history.suppressNextRecord = didCreateHistoryEntry;

      tab.url = url;
      tab.loadedurl = url;
      tab.title = "Loading...";
      if (tabs[tabIndex].iframe) {
        createPermInput(tab.iframe, url);
        try {
          tabs[tabIndex].iframe.src = a(url, browserGlobals.proxyurl);
        } catch (e) {
          tab.history.stack = prevHistorySnapshot.stack;
          tab.history.index = prevHistorySnapshot.index;
          tab.history.current = prevHistorySnapshot.current;
          tab.history.currentCanonical = prevHistorySnapshot.currentCanonical;
          tab.history.suppressNextRecord =
            prevHistorySnapshot.suppressNextRecord;
          window.protectedGlobals.notification("Navigation failed");
          return;
        }
      }

      urlInput.value = url;
    }

    openBtn.addEventListener("click", () => {
      openUrlInActiveTab(urlInput.value);
    });
    urlInput.addEventListener("keydown", (e) => {
      if (e.key === "Enter") openUrlInActiveTab(urlInput.value);
    });

    if (preloadlink) {
      const id = addTab("goldenbody://newtab/", "New Tab");
      activateTab(id);
      openUrlInActiveTab(normalizePreloadLink(preloadlink));
    }

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
        origTop = 0,
        targetel = null;
      let thresholdCrossed = false;
      let DRAG_THRESHOLD = window.protectedGlobals.data.DRAG_THRESHOLD || 15; // pixels required to trigger drag behavior

      top.addEventListener("pointerdown", (ev) => {
        DRAG_THRESHOLD =
          Number(window.protectedGlobals.data.DRAG_THRESHOLD) || DRAG_THRESHOLD;
        targetel = ev.target;
      });

      top.addEventListener("mousedown", (ev) => {
        if (
          ev.target?.closest?.(".sim-tab") ||
          ev.target === newTabBtn ||
          ev.target === urlInput ||
          ev.target === openBtn ||
          targetel?.closest?.(".sim-tab")
        )
          return;
        dragging = true;
        thresholdCrossed = false;
        startX = ev.clientX;
        startY = ev.clientY;
        origLeft = root.offsetLeft;
        origTop = root.offsetTop;
        document.body.style.userSelect = "none";
        currentX = ev.clientX;
        currentY = ev.clientY;
      });

      window.addEventListener(
        "browser" + root._goldenbodyId,
        "mousemove",
        (ev) => {
          if (!dragging) return;

          // Calculate distance dragged from initial mousedown
          const dragDistance = Math.sqrt(
            Math.pow(ev.clientX - startX, 2) + Math.pow(ev.clientY - startY, 2),
          );

          // Only trigger the restore and drag behavior after crossing threshold
          if (!thresholdCrossed && dragDistance >= DRAG_THRESHOLD) {
            thresholdCrossed = true;
            // Restore window if it was maximized
            applyBounds(savedBounds);
            if (isMaximized) {
              restoreWindow(false);
              root.style.left = ev.clientX - root.clientWidth / 2 + "px";
              origLeft = ev.clientX - root.clientWidth / 2;
            }
          }

          if (!thresholdCrossed) return; // Don't move window until threshold crossed

          const dx = ev.clientX - startX;
          const dy = ev.clientY - startY;
          root.style.left = origLeft + dx + "px";
          root.style.top = Math.max(0, origTop + dy) + "px";
        },
      );

      window.addEventListener("browser" + root._goldenbodyId, "mouseup", () => {
        dragging = false;
        thresholdCrossed = false;
        document.body.style.userSelect = "";
        targetel = null;
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
            startedMaximized: isMaximized,
            restoredFromMax: false,
          };

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
        if (
          active.startedMaximized &&
          !active.restoredFromMax &&
          (Math.abs(e.clientX - active.sx) > 1 ||
            Math.abs(e.clientY - active.sy) > 1)
        ) {
          applyBounds(getBounds());
          restoreWindow(false);
          console.log(savedBounds);
          const rr = el.getBoundingClientRect();
          active.sx = e.clientX;
          active.sy = e.clientY;
          active.sw = rr.width;
          active.sh = rr.height;
          active.sl = rr.left;
          active.st = rr.top;
          active.restoredFromMax = true;
        }
        const dx = e.clientX - active.sx;
        const dy = e.clientY - active.sy;

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
        savedBounds = getBounds();
      });

      // end
      function end() {
        clearInterval(draginterval);
        if (!active) return;
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
      closeWindow,
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

      showWindow: function () {
        root.style.display = "block";
        isMinimized = false;
        window.protectedGlobals.bringToFront(root);
      },

      hideWindow: function () {
        if (!isMaximized) this.savedBounds = getBounds();
        root.style.display = "none";
        isMinimized = true;
      },
    };
  })();
  windowTitleInterval = setInterval(function () {
    var nextTitle = "";
    try {
      nextTitle = String((activatedTab && activatedTab.title) || "").trim();
    } catch (e) {
      nextTitle = "";
    }
    if (!nextTitle || nextTitle === "undefined" || nextTitle === "null") {
      nextTitle = "Untitled";
    }
    chromeWindow.title = nextTitle;
    try {
      chromeWindow.rootElement.setAttribute("data-title", nextTitle);
    } catch (e) {}
  }, 1000 * browserGlobals.nhjd);
  chromeWindow.rootElement.setAttribute("data-title", "Untitled");
  chromeWindow.closeAll = function () {
    for (const instance of [...browserGlobals.allBrowsers]) {
      if (instance && typeof instance.closeWindow === "function") {
        instance.closeWindow();
      }
    }
    browserGlobals.allBrowsers = [];
  };
  chromeWindow.hideAll = function () {
    for (const instance of browserGlobals.allBrowsers) {
      if (instance && typeof instance.hideWindow === "function") {
        instance.hideWindow();
      }
    }
  };
  chromeWindow.showAll = function () {
    browserGlobals.allBrowsers.sort(
      (a, b) => a.rootElement.style.zIndex - b.rootElement.style.zIndex,
    );
    for (const instance of browserGlobals.allBrowsers) {
      if (instance && typeof instance.showWindow === "function") {
        instance.showWindow();
      }
    }
  };
  chromeWindow.newWindow = function () {
    browser();
  };
  chromeWindow.showall = chromeWindow.showAll;
  chromeWindow.hideall = chromeWindow.hideAll;
  chromeWindow.closeall = chromeWindow.closeAll;
  chromeWindow.newwindow = chromeWindow.newWindow;
  browserGlobals.allBrowsers.push(chromeWindow); // Add to global tracking
  window.protectedGlobals.applyStyles();

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
      if (
        str.startsWith("data:") ||
        str.startsWith("blob:") ||
        str.startsWith("about:") ||
        str.startsWith("file://")
      ) {
        return str;
      }
      if (str === "goldenbody://newtab/" || str === "goldenbody://newtab") {
        return window.protectedGlobals.goldenbodywebsite + "flowerfeast.html";
      } else if (
        str === "goldenbody://app-store/" ||
        str === "goldenbody://app-store"
      ) {
        return (
          window.protectedGlobals.goldenbodywebsite +
          "singlesdaylosesingle.html"
        );
      }
      return proxylink + browserGlobals.id + "/" + url;
    }
    function encodeScramjet(url, proxylink) {
      return proxylink + "scramjet/" + url;
    }

    return encodeRammerHead(url, proxyurl);

    // => hvtrs8%2F-wuw%2Chgrm-uaps%2Ccmm
  }
};
