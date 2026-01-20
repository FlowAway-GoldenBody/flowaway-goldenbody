# READ THIS:

**A web-based operating system that provides a full desktop and browser experience inside the browser — designed for restricted or managed environments.**

FlowAway GoldenBody delivers a real OS-like environment (windows, taskbar, file system, settings, and a powerful embedded browser) entirely as a web application, without requiring local installation.

---

## What this is

This project is a **web-based OS platform** that runs fully in the browser and includes:

- A windowed desktop environment (taskbar, start menu, settings)
- A persistent file explorer backed by a server (not fake local state)
- A highly controlled, fully featured browser runtime
- Multi-window and multi-tab support
- Programmatic control over browser behavior (including DevTools)

It is **not** just an iframe wrapper or a simple VNC-style interface. The browser and OS environment are explicitly managed by the platform itself.

---

## Who this is for

This project is primarily intended for:

- Users on **restricted or managed devices** (e.g. Chromebooks, locked-down systems)
- Developers interested in **advanced browser runtimes and UI platforms**
- Experimental or educational environments where local software installation is not possible

This is an **early-stage, power-user project**, meaning expect bugs 4 now.

---

## Key Features

### Desktop / OS
- Windowed desktop UI with taskbar and start menu
- Drag, resize, snap, and move windows
- Settings application (near complete)

### Embedded Browser Runtime
- Fully functional browser inside the OS
- Multi-tab support with:
  - Drag & reorder
  - Detach to new window
  - Drag out / move between windows
- Custom `window.open` implementation
- Same-origin proxy to eliminate iframe and sandbox limitations
- Fixes for nested iframe issues common in browser-in-browser setups

### File System and showOpenFilePicker/file input support
- File explorer with backend-backed persistence
- Upload files and entire directories
- Saved state across sessions
- Integrated authentication and user storage

---

## Security & Session Model (Important)

### Session Isolation
- Each user session is isolated
- There is **no mechanism to discover or access other users’ sessions**
- Cross-user access is not possible by default

### Session IDs
- A session ID grants **full access** to its associated environment
- This is equivalent to sharing browser cookies or a local browser profile
- **Session IDs must be treated like passwords and never shared**

This project is intended for **trusted environments** and does not attempt to provide enterprise-grade multi-tenant security at this stage.

---

## What this is NOT

-  Not malware
-  Not a keylogger
-  Not exploiting browser vulnerabilities
-  Not bypassing OS-level security controls
-  Not designed for hostile multi-tenant public use

All functionality operates within standard web platform capabilities.

---

## Current Status

- Actively developed for ~5 months
- Early alpha
- Core OS, browser runtime, and file system are functional
- Looking for early contributors

---

## Installing and running

We recommends you to have at least **node v16** to be installed. Once you installed nodejs, clone the repo, then run `npm install` and `npm run build`.

After, configure your settings in [src/config.js](src/config.js). If you wish to consistently pull updates from this repo without the hassle of merging, create `config.js` in the root folder so they override the configs in `src/`.

Finally run the following to start the server: `node src/server.js`

## Discord server

For any user-help issue related questions, especially pertaining to goldenbody, please ask them here: [hydrosphere](https://discord.gg/9puv3rp9Tx).
