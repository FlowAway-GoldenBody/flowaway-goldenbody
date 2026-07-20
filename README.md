## WHAT THIS IS
flowaway goldenbody is an OS-like webpage built with vanilla js and a node server. 

## EXAMPLE IMAGE
![goldenbody](https://media.discordapp.net/attachments/1398365819863302267/1528472440332877884/Screenshot_2026-07-19_at_2.30.05_PM.png?ex=6a5e6c63&is=6a5d1ae3&hm=3f7b34b1ee1ebf7d4e3cafd8788cdbe35a8fc586a1ca34f194f58814a73d8459&=&format=webp&quality=lossless&width=1852&height=1204)
## EXAMPLE IMAGE 2
![goldenbody2](https://media.discordapp.net/attachments/1398365819863302267/1528472439930097694/Screenshot_2026-07-19_at_2.28.32_PM.png?ex=6a5e6c63&is=6a5d1ae3&hm=613fda87f2397e7d9e6b780022253c9837d481add198265df3209be533b27a88&=&format=webp&quality=lossless&width=1852&height=1204)


## DEVELOPER DOCS
This is copied directly from the dev docs in the settings app
      <h2>App Developer Docs</h2>
      <p>This environment supports two app styles:</p>
      <ul>
        <li><strong>Sandboxed iframe apps</strong> using <code>requestAdminPerm: false</code>.</li>
        <li><strong>Admin apps</strong> using <code>requestAdminPerm: true</code> and a user-provided key.</li>
      </ul>
      <h3>App package layout</h3>
      <p>Apps live under <code>/systemfiles/runtime/apps/&lt;app-folder&gt;</code>. Every app must include an <code>entry.json</code> file and an executable JS file named by <code>jsFile</code>.</p>
      <h3><code>entry.json</code> fields</h3>
      <ul>
        <li><code>id</code> - unique app identifier.</li>
        <li><code>jsFile</code> - entry script file relative to the app folder.</li>
        <li><code>label</code> - display name for the app.</li>
        <li><code>iconFile</code> - icon asset path relative to the app folder.</li>
        <li><code>nonTextIcon</code> - boolean flag that tells the runtime the icon is not plain text. Use this for binary or complex icon rendering.</li>
        <li><code>svgEnabled</code> - boolean flag to render <code>iconFile</code> as SVG markup.</li>
        <li><code>pngEnabled</code> - boolean flag to render <code>iconFile</code> as a base64 PNG image.</li>
        <li><code>requestAdminPerm</code> - <code>true</code> for full admin mode, <code>false</code> for sandboxed iframe mode.</li>
        <li><code>openfileCapability</code> - optional list of VFS file/folder patterns or capabilities used by File Explorer to determine if a file extension can be opened by this app. (extension is the .something behind a file), (VFS aka. cloud storage)</li>
        <li><code>enableDebugging</code> - boolean flag to enable debugging features for the app.</li>
      </ul>
      <p>These icon fields are used by start menu, taskbar, and runtime window rendering logic in <code>startMenu.js</code>, <code>goldenbody.js</code>, and <code>runtimeWindowSystem.js</code>. They determine whether the icon is rendered as text, SVG, or PNG.</p>
      <p>If <code>requestAdminPerm</code> is <code>true</code>, these extra fields are required:</p>
      <ul>
        <li><code>functionName</code> - globally exported launch function that the runtime calls.</li>
        <li><code>globalVarObjectString</code> - name of the global object for app instances.</li>
        <li><code>allAppArrayString</code> - array name under the global object for tracking instances.</li>
        <li><code>cmf</code> and <code>cmfl1</code> - app btn contextmenu hooks. (i personally think its useless)</li>
        <li><code>headless</code> - if you have this on, the app will only run in the background, it will be ignored if you have the <code>icon</code> entry in the json file.</li>
      </ul>
      <h3>How <code>requestAdminPerm</code> works</h3>
      <p>An app with <code>requestAdminPerm: true</code> is treated as an admin-style app only when the runtime can verify a matching key.</p>
      <p>The loader reads:</p>
      <ul>
        <li><code>&lt;app-folder&gt;/jsKey.txt</code></li>
        <li><code>systemfiles/userprofile/jsApiKey.txt</code></li>
      </ul>
      <p>Only if both exist and match will the runtime load the app script directly with full privileges. If the key is missing or invalid, the app is skipped or replaced by a placeholder launcher.</p>
      <p>This means admin apps are developer-mode apps: they can behave like system apps, but they still need a user-supplied API key to run. (system apps has those keys too, but they are written when ur acc is created)</p>
      <h3>Sandboxed iframe apps</h3>
      <p>When <code>requestAdminPerm</code> is <code>false</code>, the app runs inside a sandboxed iframe using <code>untrustedIframePatch.js</code>. That iframe has:</p>
      <ul>
        <li><code>sandbox="allow-scripts allow-pointer-lock"</code></li>
        <li>No direct access to DOM APIs like file inputs, localStorage, sessionStorage, IndexedDB, caches, or fullscreen exit APIs. (EXPERIMENTAL, aka not done)</li>
        <li>Only the exposed runtime API surface available through <code>window.__goldenbodyAPI</code>.</li>
      </ul>
      <h3>Iframe API reference</h3>
      <p>Sandboxed apps should call <code>window.__goldenbodyAPI</code>.</p>
      <ul>
        <li><code>readFile(pathOrHandle, options): return [Buffer || ReadableStream || String]</code></li>
        <li><code>writeFile(pathOrHandle, content, options): return [undefined]</code></li>
        <li><code>readFolder(pathOrHandle, options): options.detailed ? return [Array of Objects] : return [Array of Strings]</code></li>
        <li><code>writeFolder(pathOrHandle, options): return [undefined]</code></li>
        <li><code>deleteFile(pathOrHandle, options): return [undefined]</code></li>
        <li><code>deleteFolder(pathOrHandle, options): return [undefined]</code></li>
        <li><code>showOpenFilePicker(options): return [Object] /* {kind: 'file', path: [String], key: [UUID: String], name: [String]} */</code></li>
        <li><code>showSaveFilePicker(options): return [Object] /* {kind: 'file', path: [String], key: [UUID: String], name: [String]} */</code></li>
        <li><code>showDirectoryPicker(options): return [Object] /* {kind: 'directory', path: [String], key: [UUID: String], name: [String]} */</code></li>
        <li><code>setInstanceTitle(title): return [undefined] /* set the instance title of your cur instance */</code></li>
        <li><code>message(message, toInstance): return [undefined] /* it sends a message to instances of ur app, toInstance is where you put instance index, see next 2 funcs, or '*' to send to all instances of ur app */</code></li>
        <li><code>getCurInstanceNum(): return [int] /* returns a number that tells you the instance index of your current instance, aka if you are the 1st one the user opened u get 1 second u get 2. */</code></li>
        <li><code>getLiveInstanceIndex(): return [int] /* returns a number that tells you how many instances of your app is opened */</code></li>
        <li><code>getTheme(): return 'dark' || 'light'</code></li>
      </ul>
      <p>These methods send a message to the host frame and return a promise.</p>
      <h4>Path handles</h4>
      <p>Most file APIs accept either a string path or an object like:</p>
      <pre><code>{ path: '/some/path.txt', key: 'uuid-key' }</code></pre>
      <p>The <code>key</code> is only used when the path came from an external picker result. For example, a file picked by <code>showSaveFilePicker</code> or <code>showDirectoryPicker</code> returns a handle with a key that authorizes writes.</p>
      <h4>Picker results</h4>
      <p>Results from external pickers include:</p>
      <pre><code>{ kind: 'file' | 'directory', path, key, name }</code></pre>
      <p>If the picker path is not authorized with a valid key, writes do not go to the external path.</p>
      <h3>Example sandbox code</h3>
      <pre><code>const fileHandle = await window.__goldenbodyAPI.showSaveFilePicker({ suggestedName: 'hello.txt' });
await window.__goldenbodyAPI.writeFile(fileHandle, 'hello world', { text: true });
const contents = await window.__goldenbodyAPI.readFile(fileHandle, { text: true });
console.log(contents);
</code></pre>
      <pre><code>const folderHandle = await window.__goldenbodyAPI.showDirectoryPicker();
const folderContents = await window.__goldenbodyAPI.readFolder(folderHandle);
console.log(folderContents);
</code></pre>
      <h3>Admin app strategy</h3>
      <p>Admin apps should be designed differently from iframe apps:</p>
      <ul>
        <li>They can access the runtime directly once verified.</li>
        <li>They are not limited by the sandboxed APIs.</li>
        <li>They still must be installed under <code>/systemfiles/runtime/apps/&lt;folder&gt;</code> with a matching <code>jsKey.txt</code>.</li>
      </ul>
      <p>If you want to build a full system-style app, use <code>requestAdminPerm: true</code> and make sure your <code>jsKey.txt</code> is valid.</p>
      <h3>Admin app GUI framework</h3>
      <p>Admin apps can build their window looks through <code>window.protectedGlobals.apptools</code>, which is initialized by <code>initapptools.js</code>. The usual flow is:</p>
      <ol>
        <li>Create an app instance with <code>window.protectedGlobals.apptools.api.createAppInstance({...})</code>.</li>
        <li>Attach a title bar with <code>window.protectedGlobals.apptools.createtitlebar(root)</code>.</li>
        <li>Register the instance with <code>window.protectedGlobals.apptools.api.trackInstance(instance, appId)</code> so maximize/minimize/show/hide/close state is tracked by the runtime.</li>
      </ol>
      <pre><code>
"use strict";

window.myadminapp = () => {
  // necessary for the runtime to track this app instance
  const appId = "myAdminApp";
  let pos = window.protectedGlobals.getNextWindowXY();
  const instance = window.protectedGlobals.apptools.api.createAppInstance({ appId, posX: pos.x, posY: pos.y });
  window.protectedGlobals.apptools.api.trackInstance(instance, appId);

  // vars u prob need
  let appwindow = instance.rootElement;
  let dragTarget = instance.titlebarElement;
};
</code></pre>
      <p>For admin apps, <code>appLoader.js</code> validates the app entry object and only injects the script after the runtime confirms that the app folder has a matching <code>jsKey.txt</code> and <code>systemfiles/userprofile/jsApiKey.txt</code>.</p>
      <h3>Permissions and app settings</h3>
      <p>The Settings app stores <code>window.protectedGlobals.appPerms</code> in <code>/systemfiles/userprofile/appPermissions.json</code>. For sandboxed apps this controls:</p>
      <ul>
        <li><code>storage</code> - allow, deny, or ask for write access.</li>
        <li><code>notification</code> - allow, deny, or ask for notifications.</li>
      </ul>
      <p>Admin apps with valid keys are trusted differently, because they are expected to run with user-level privilege when the key is verified.</p>
      <h3>Entry file example</h3>
      <pre><code>{
  "id": "myApp",
  "label": "My App",
  "jsFile": "script.js",
  "iconFile": "icon.svg",
  "requestAdminPerm": false,
  "nonTextIcon": true, /* important */
  "svgEnabled": true, /* important */
  "pngEnabled": false, /* important */
  "openfileCapability": ["*.txt", "*.md"],
  "enableDebugging": true
}
</code></pre>
      <p>For admin apps, include the launcher hooks and optionally a <code>headless</code> flag:</p>
      <pre><code>{
  "id": "myAdminApp",
  "label": "My Admin App",
  "jsFile": "app.js",
  "iconFile": "icon.svg",
  "requestAdminPerm": true,
  "functionName": "myAdminAppLauncher",
  "globalVarObjectString": "myAdminAppGlobals",
  "allAppArrayString": "instances",
  "cmf": "",
  "cmfl1": "",
  "headless": false
}
</code></pre>
      <h3>Bottom line</h3>
      <p>There are no hidden files or directories anywhere in cloud storage. You can edit <code>systemfiles</code> to change how the client behaves. If you break it, you can restore the system tree from the login page and remove broken non-system apps there. A copy of broken files will also be stored in your cloud storage.</p>

## QUICK DEV & RUN

- Requirements: Node.js (v16+ recommended). IDK if bun works...
- Install libraries/dependencies the server needs via npm install:

```bash
npm install
```

- THE BACKEND IS BASED ON ""aka (copied from)"" RAMMERHEAD SINCE THE PURPOSE OF THIS THING USED TO BE A PROXY:
- Configure Rammerhead `src/config.js` to override defaults.
- Run server:

```bash
node src/server.js
```

- you can also run with: 
```bash
npm start
```

- If you want external access, `cloudflared` is a good option to host it.

- Just so yall know you can run this server in about 10 minutes after you get a new rpi or any device including an android phone. If you need longer than that there must be some stuff u did wrong!

-!!!IMPORTANT!!! if you are hosting on termux change config.js to this
`const enableWorkers = false;` on line 7 of config.js

## CONTACT

For project-related questions: a1462978843@outlook.com, alt email: playminecraft183@outlook.com