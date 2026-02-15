# StateFarm Client - Plain JS Version

This version has been rewritten to work **without a userscript manager** (like Tampermonkey or Violentmonkey). It uses standard browser APIs and can be loaded via console injection, bookmarklet, or browser extension.

## What Changed

- **Removed userscript metadata**: No more `@grant`, `@require`, `@match` headers
- **Replaced GM_* APIs**: Now uses `localStorage` for persistence and standard browser APIs
- **Tweakpane loading**: Must be loaded separately from CDN or bundled
- **No automatic injection**: You need to manually load it (see methods below)

## Installation Methods

### Method 1: Console Injection (Quickest)

1. Open Shell Shockers or any supported site
2. Press **F12** to open DevTools
3. Go to the **Console** tab
4. Paste this code and press Enter:

```javascript
(function() {
    if (typeof Tweakpane !== 'undefined') {
        loadStateFarm();
        return;
    }
    
    const script = document.createElement('script');
    script.src = 'https://cdn.jsdelivr.net/npm/tweakpane@3.1.10/dist/tweakpane.min.js';
    script.onload = loadStateFarm;
    document.head.appendChild(script);
    
    function loadStateFarm() {
        fetch('http://localhost:8080/statefarm.js') // Update this URL
            .then(r => r.text())
            .then(code => eval(code))
            .catch(e => console.error('Load failed:', e));
    }
})();
```

### Method 2: Bookmarklet

1. Create a new bookmark
2. Set the URL to:

```javascript
javascript:(function(){if(typeof Tweakpane==='undefined'){var s=document.createElement('script');s.src='https://cdn.jsdelivr.net/npm/tweakpane@3.1.10/dist/tweakpane.min.js';s.onload=function(){loadSF()};document.head.appendChild(s)}else{loadSF()}function loadSF(){fetch('http://localhost:8080/statefarm.js').then(r=>r.text()).then(c=>eval(c))}})();
```

3. Click the bookmark when on a Shell Shockers page

### Method 3: Browser Extension (Most Reliable)

Create a simple Chrome/Firefox extension:

**manifest.json:**
```json
{
  "manifest_version": 3,
  "name": "StateFarm Client Loader",
  "version": "1.0",
  "permissions": ["storage"],
  "host_permissions": ["*://*.shellshock.io/*", "*://*.shellshockers.io/*"],
  "content_scripts": [{
    "matches": ["*://*.shellshock.io/*", "*://*.shellshockers.io/*"],
    "js": ["inject.js"],
    "run_at": "document_start"
  }],
  "web_accessible_resources": [{
    "resources": ["tweakpane.min.js", "statefarm.js"],
    "matches": ["<all_urls>"]
  }]
}
```

**inject.js:**
```javascript
const script1 = document.createElement('script');
script1.src = chrome.runtime.getURL('tweakpane.min.js');
document.head.appendChild(script1);

script1.onload = () => {
    const script2 = document.createElement('script');
    script2.src = chrome.runtime.getURL('statefarm.js');
    document.head.appendChild(script2);
};
```

### Method 4: Local Development Server

For testing or local use:

```bash
# Start a simple HTTP server
python3 -m http.server 8080

# Or with Node.js
npx http-server -p 8080

# Or with PHP
php -S localhost:8080
```

Then use Method 1 or 2 with `http://localhost:8080/statefarm.js`

## Quick Start

1. **Clone or download** this repository
2. **Start a local server** in the project directory:
   ```bash
   python3 -m http.server 8080
   ```
3. **Open** `http://localhost:8080/loader.html` for interactive loader
4. **OR** open Shell Shockers and use console injection method

## Features Preserved

All original features work as before:
- ✅ Aimbot (silent/visible)
- ✅ ESP, tracers, chams
- ✅ Account management & botting
- ✅ Chat tools & automation
- ✅ Theming & customization
- ✅ Persistent config (via localStorage)

## Important Notes

### Storage Differences
- **Old**: GM_getValue/GM_setValue (isolated storage)
- **New**: localStorage (shared with the website)
- **Impact**: Settings are now tied to the specific domain you're on

### Clipboard Access
- May require HTTPS or user gesture on some browsers
- Falls back to `document.execCommand('copy')` if needed

### Security Considerations
- **Same as before**: This is a cheat script - use at your own risk
- **New risk**: localStorage is accessible to the website's own scripts
- **Recommendation**: Only use on trusted domains

## Troubleshooting

**"Tweakpane is not defined"**
- Make sure Tweakpane loads first (check Network tab in DevTools)
- Try loading from CDN directly in console first

**"Failed to fetch statefarm.js"**
- Check if your local server is running
- Verify the URL matches your server address
- Check CORS headers if hosting remotely

**Script loads but UI doesn't appear**
- Open DevTools Console and check for errors
- Make sure you're on a supported Shell Shockers site
- Try pressing the configured hotkey (default: H)

**Settings don't persist**
- Check localStorage isn't disabled in browser settings
- Verify you're on the same domain (settings are domain-specific)
- Try clearing localStorage and reload: `localStorage.clear()`

## Development

To modify the script:

1. Edit `statefarm.js`
2. Refresh the page and re-inject
3. Check Console for errors
4. Settings persist in localStorage automatically

## License

GPL-3.0 (same as original)

## Credits

Original StateFarm Client by:
- Hydroflame521
- enbyte
- notfood
- 1ust
- OakSwingZZZ
- Seq
- de_Neuublue

Plain JS adaptation: 2026
