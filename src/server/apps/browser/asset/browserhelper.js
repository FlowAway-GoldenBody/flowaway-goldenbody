window.browserGlobals._writeQueue = [];
window.browserGlobals._writing = false;
window.browserGlobals.erudaCDN = "https://cdn.jsdelivr.net/npm/eruda";
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
  .app-root.dark .sim-url-input { flex:1; height:32px; background-color: black; border-radius:6px; border:1px solid rgba(0,0,0,0.12); padding:0 10px; font-size:14px; }
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

window.browserGlobals.readIndexedDbStore = async function () {
  let raw = "";
  raw = await window.protectedGlobals.ReadFile(window.browserGlobals.indexedDbPath, { text: true, direct: true });
  return JSON.parse(raw);
};

window.browserGlobals.writeIndexedDbStore = async function (payload) {
  const serialized = JSON.stringify(
    payload && payload.origins ? payload : { origins: {} },
  );
  await window.browserGlobals.writeFileOrdered(
    window.browserGlobals.indexedDbPath,
    btoa(serialized),
  );
};

window.browserGlobals.clearIndexedDbForSite = async function (site) {
  if (!site) return;
  const store = await window.browserGlobals.readIndexedDbStore();
  if (!store.origins) {
    store.origins = {};
  }
  delete store.origins[site];
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





async function loadCookies() {
try {
  const res = await window.protectedGlobals.ReadFile(
    window.browserGlobals.cookiesPath,
    { text: true }
  );
  const raw = res && res.filecontent ? res.filecontent : "";
  const decoded = window.browserGlobals.decodeMaybeBase64(raw);
  window.browserGlobals.cookies = JSON.parse(decoded || "{}") || {};
} catch {
  window.browserGlobals.cookies = {};

}
}
loadCookies();
window.browserGlobals.convertCookiesForBrowserUse = function (object) {
  if (!object || typeof object !== "object") return "";

  let cookieString = "";
  for (const key of Object.keys(object)) {
    if (cookieString) cookieString += "; ";
    cookieString += `${key}=${object[key]}`;
  }
  return cookieString;
};
window.browserGlobals.convertlooseCookieStringToObject = function (cookieString) {
  if (!cookieString || typeof cookieString !== "string") return {};

  const parts = cookieString.split(";").map(p => p.trim()).filter(Boolean);
  if (parts.length === 0) return {};

  // First part = actual cookie
  const nameValue = parts[0];
  const eqIndex = nameValue.indexOf("=");

  if (eqIndex === -1) return {};

  const name = nameValue.slice(0, eqIndex).trim();
  const value = nameValue.slice(eqIndex + 1).trim();

  if (!name) return {};

  // Look for expires attribute only (ignore everything else)
  let expires = null;

  for (let i = 1; i < parts.length; i++) {
    const part = parts[i];
    const idx = part.indexOf("=");

    if (idx === -1) continue;

    const key = part.slice(0, idx).trim().toLowerCase();
    if (key === "expires") {
      expires = part.slice(idx + 1).trim();
      break;
    }
  }

  // If expired → signal deletion
  if (expires) {
    const expDate = new Date(expires);
    if (!isNaN(expDate) && expDate < new Date()) {
      return { [name]: undefined };
    }
  }

  // Normal cookie
  return { [name]: value };
};

window.browserGlobals.getCookiesForSite = function (site) {
  const cookies = window.browserGlobals.cookies;
  const siteCookies = cookies[site];

  if (!siteCookies || typeof siteCookies !== "object") return "";

  return window.browserGlobals.convertCookiesForBrowserUse(siteCookies);
};
window.browserGlobals.setCookiesForSite = function (site, cookieString) {
  const cookies = window.browserGlobals.cookies;

  if (!cookies[site] || typeof cookies[site] !== "object") {
    cookies[site] = {};
  }

  const storagecookies =
    window.browserGlobals.convertlooseCookieStringToObject(cookieString);

for (const [key, value] of Object.entries(storagecookies)) {
  if (value === undefined) {
    delete cookies[site][key];
  } else {
    cookies[site][key] = value;
  }
}

  return window.browserGlobals.writeFileOrdered(
    window.browserGlobals.cookiesPath,
    btoa(JSON.stringify(cookies))
  );
};


async function loadLocalStorage() {
try {
  const res = await window.protectedGlobals.ReadFile(
    window.browserGlobals.localStoragePath,
    { text: true }
  );
  const raw = res && res.filecontent ? res.filecontent : "";
  const decoded = window.browserGlobals.decodeMaybeBase64(raw);
  window.browserGlobals.localStorageStore = JSON.parse(decoded || "{}") || {};
} catch {
  window.browserGlobals.localStorageStore = {};
}
}
loadLocalStorage();
window.browserGlobals.getLocalStorageForSite = function (site) {
  const store = window.browserGlobals.localStorageStore;

  if (!store[site] || typeof store[site] !== "object") {
    return {};
  }

  return store[site];
};
window.browserGlobals.setLocalStorageForSite = function (site, dataObject) {
  const store = window.browserGlobals.localStorageStore;

  if (!store[site] || typeof store[site] !== "object") {
    store[site] = {};
  }

  if (!dataObject || typeof dataObject !== "object") return;

  for (const [key, value] of Object.entries(dataObject)) {
    store[site][key] = value;
  }

  return window.browserGlobals.writeFileOrdered(
    window.browserGlobals.localStoragePath,
    btoa(JSON.stringify(store))
  );
};
window.browserGlobals.removeLocalStorageItem = function (site, key) {
  const store = window.browserGlobals.localStorageStore;

  if (!store[site] || typeof store[site] !== "object") return;

  delete store[site][key];

  return window.browserGlobals.writeFileOrdered(
    window.browserGlobals.localStoragePath,
    btoa(JSON.stringify(window.browserGlobals.localStorageStore))
  );
};
window.browserGlobals.clearCookiesForSite = function (url) {
  const site = window.browserGlobals.mainWebsite(
    window.browserGlobals.unshuffleURL(url)
  );

  if (!window.browserGlobals.cookies) {
    window.browserGlobals.cookies = {};
  }

  window.browserGlobals.cookies[site] = {};

  return window.browserGlobals.writeFileOrdered(
    window.browserGlobals.cookiesPath,
    btoa(JSON.stringify(window.browserGlobals.cookies))
  );
};
window.browserGlobals.clearLocalStorageForSite = function (url) {
  const site = window.browserGlobals.mainWebsite(
    window.browserGlobals.unshuffleURL(url)
  );

  if (!window.browserGlobals.localStorageStore) {
    window.browserGlobals.localStorageStore = {};
  }

  window.browserGlobals.localStorageStore[site] = {};

  return window.browserGlobals.writeFileOrdered(
    window.browserGlobals.localStoragePath,
    btoa(JSON.stringify(window.browserGlobals.localStorageStore))
  );
};


window.browserGlobals.writeFileOrdered = function (...args) {
  return new Promise((resolve, reject) => {
    window.browserGlobals._writeQueue.push({ args, resolve, reject });

    if (!window.browserGlobals._writing) {
      window.browserGlobals.processNextWrite();
    }
  });
};
window.browserGlobals.processNextWrite = async function () {
  const job = window.browserGlobals._writeQueue.shift();

  if (!job) {
    window.browserGlobals._writing = false;
    return;
  }

  window.browserGlobals._writing = true;

  try {
    const result = await window.protectedGlobals.WriteFile(...job.args);
    job.resolve(result);
  } catch (err) {
    job.reject(err);
  }

  window.browserGlobals.processNextWrite();
}
window.browserGlobals.clearAllCookies = async function () {
  window.browserGlobals.cookies = {};
  await window.browserGlobals.writeFileOrdered(
    window.browserGlobals.cookiesPath,
    btoa(JSON.stringify(window.browserGlobals.cookies))
  );
};
window.browserGlobals.clearAllLocalStorage = async function () {
  window.browserGlobals.localStorageStore = {};
  await window.browserGlobals.writeFileOrdered(
    window.browserGlobals.localStoragePath,
    btoa(JSON.stringify(window.browserGlobals.localStorageStore))
  );
};