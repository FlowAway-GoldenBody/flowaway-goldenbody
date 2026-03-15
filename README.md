## WHAT THIS IS
flowaway goldenbody is an OS-like web interface built with vanilla JavaScript and a Node.js server. 

## EXAMPLE IMAGE
![goldenbody](https://s6.imgcdn.dev/Yv9K0u.png)

## MIGRATION NOTES (MAR 2026)

- **Naming convention**: avoid scattering globals on `window`. Expose a single object per app instead. The project now expects per-app globals under an app-scoped object such as `window.<yourAppName>globals`. Example:

```js
// recommended pattern
window.myappglobals = {};
window.myfunc = () => {...}
window.myappglobals.contextMenuhandler = () => {...}
```

- **Avoid stacking**: do not call `setInterval` or `addEventListener` repeatedly without clearing/removing the previous handles. When the app/window is closed, ensure teardown runs and clears stored handles. The runtime now tracks per-window intervals in many places, but your app should also be defensive.

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

## CONTACT

For project-related questions: a1462978843@outlook.com