## WHAT THIS IS
Rammerhead / Flowaway (a.k.a. goldenbody) is an OS-like web interface built with vanilla JavaScript and a small Node.js server. It is intentionally lightweight and framework-free on the client.

## MIGRATION NOTES (MAR 2026)

- **Naming convention**: avoid scattering globals on `window`. Expose a single object per app instead. The project now expects per-app globals under an app-scoped object such as `window.<yourAppName>globals`. Example:

```js
// recommended pattern
window.myappglobals = window.myappglobals || {};
window.myappglobals.init = function() { /* start */ };
window.myappglobals.cleanup = function() { /* tidy up */ };
```

- **Why**: this keeps the global namespace compact and makes automatic cleanup and discovery (by the runtime) reliable.

## LISTENER & INTERVAL GUIDELINES

- **Track resources you create**: attach arrays or a single `_teardown` object to your app root so you can remove listeners and clear timers when the app/window closes. Example pattern:

```js
// attach on init
const root = chromeWindow.rootElement;
root._teardown = root._teardown || { intervals: [], listeners: [] };
root._teardown.intervals.push(setInterval(...));
root._teardown.listeners.push({ el: someEl, event: 'click', handler });
someEl.addEventListener('click', handler);

// then on cleanup
(root._teardown.intervals || []).forEach(clearInterval);
(root._teardown.listeners || []).forEach(({el,event,handler}) => el.removeEventListener(event, handler));
```

- **Avoid stacking**: do not call `setInterval` or `addEventListener` repeatedly without clearing/removing the previous handles. When the app/window is closed, ensure teardown runs and clears stored handles. The runtime now tracks per-window intervals in many places, but your app should also be defensive.

- **One-shot guards for multi-event flows**: where an action can be triggered by multiple event types (e.g., both `pointerup` and `dragend`), use a one-shot guard (boolean flag) to ensure the transfer or cleanup only happens once.

## RECENT UPDATES (MAR 2026)

- Switcher UI now uses OS-style wording (`Switch windows`) and prefers window titles for labels (avoids displaying `undefined`).
- Detached browser windows are tagged so they appear in the switcher correctly.
- Fixed tab-drag duplication: cross-window tab transfers are now guarded to prevent double-handling.
- Reduced interval stacking by tracking and clearing per-window intervals during window teardown.

## QUICK DEV & RUN

- Requirements: Node.js (v16+ recommended).
- Install and build:

```bash
npm install
npm run build
```

- Configure `src/config.js` or create a local `config.js` to override defaults.
- Run server:

```bash
node src/server.js
```

- If you want external access during development, `cloudflared` is a convenient option for a quick tunnel.

## PROJECT NOTES & CONTRIBUTING

- The codebase is actively developed; expect frequent changes. Small, focused PRs are easiest to review.
- When adding apps, follow the `window.<yourAppName>globals` pattern and implement a `cleanup` method to avoid leaks.

## CONTACT

For project-related questions: a1462978843@outlook.com