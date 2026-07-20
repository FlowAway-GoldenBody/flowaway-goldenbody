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
      <p>Sandboxed apps should call <code>window.__goldenbodyAPI</code>. Every method returns a promise, so await it in async code.</p>
      <ul>
        <li><code>readFile(pathOrHandle, options)</code> - read a file from the VFS. The first argument can be a plain string path or a picker result object like <code>{ path, key }</code>.</li>
        <li><code>writeFile(pathOrHandle, content, options)</code> - write text or binary data to a file.</li>
        <li><code>readFolder(pathOrHandle, options)</code> - list the children of a folder. If <code>options.detail === true</code>, the runtime returns objects with <code>path</code> and <code>type</code>.</li>
        <li><code>writeFolder(pathOrHandle, options)</code> - create a folder.</li>
        <li><code>deleteFile(pathOrHandle, options)</code> - delete a file.</li>
        <li><code>deleteFolder(pathOrHandle, options)</code> - delete a folder.</li>
        <li><code>renameFile(pathOrHandle, newName, options)</code> - rename a file.</li>
        <li><code>renameFolder(pathOrHandle, newName, options)</code> - rename a folder.</li>
        <li><code>pasteFile(destinationOrHandle, clipboardItems, options)</code> - paste a file payload into a destination folder.</li>
        <li><code>pasteFolder(destinationOrHandle, clipboardItems, options)</code> - paste a folder payload into a destination folder.</li>
        <li><code>folderExists(pathOrHandle, options)</code> - resolve <code>true</code> if the target exists and is a folder.</li>
        <li><code>fileExists(pathOrHandle, options)</code> - resolve <code>true</code> if the target exists and is a file.</li>
        <li><code>showOpenFilePicker(options)</code> - return a picker handle object describing the selected file or folder.</li>
        <li><code>showSaveFilePicker(options)</code> - return a picker handle object for a destination file.</li>
        <li><code>showDirectoryPicker(options)</code> - return a picker handle object for a destination directory.</li>
        <li><code>setInstanceTitle(title)</code> - set the instance title of your current instance.</li>
        <li><code>message(message, toInstance)</code> - send an instance message. Use <code>*</code> or <code>all</code> to broadcast.</li>
        <li><code>getCurInstanceNum()</code> - return the index of the current instance.</li>
        <li><code>getLiveInstanceIndex()</code> - return the number of live instances for your app.</li>
        <li><code>getTheme()</code> - return <code>dark</code> or <code>light</code>.</li>
      </ul>
      <p>These methods send a message to the host frame and return a promise.</p>
      <h4>How handles work</h4>
      <p>A handle in this platform is not a browser <code>FileSystemHandle</code> and it is not a special object you need to open or close. It is a small runtime record shaped like:</p>
      <pre><code>{ path: '/some/path.txt', key: 'uuid-key' }</code></pre>
      <p>The <code>path</code> field tells the runtime which VFS path to use. The <code>key</code> field is the permission token that was created when the user picked that file or folder. You keep this object and pass it back to later FS calls whenever you want to keep using the same picked target.</p>
      <p>There are two common patterns:</p>
      <ol>
        <li><strong>Plain path</strong>: use a normal string such as <code>/root/demo/notes.txt</code> when the target is already known and you are not using a picker token. This is the simplest pattern for paths you already know.</li>
        <li><strong>Handle object</strong>: use the object returned by <code>showOpenFilePicker</code>, <code>showSaveFilePicker</code>, or <code>showDirectoryPicker</code> when you want to keep editing the same picked target after the picker closes. The runtime uses the saved <code>path</code> plus the saved <code>key</code> for future calls. This is the pattern you want for writes and edits to a picked file or folder.</li>
      </ol>
      <h4>How to use each FS API</h4>
      <ul>
        <li><strong>readFile(input, options)</strong> - read a file. The first argument can be a plain string path or a handle object. Example: <code>await window.__goldenbodyAPI.readFile('/root/demo/notes.txt', { text: true })</code>. Result: a string when <code>{ text: true }</code> is used, or raw file bytes when you omit that option.</li>
        <li><strong>writeFile(input, content, options)</strong> - write text or binary content to a file. Example with a plain path: <code>await window.__goldenbodyAPI.writeFile('/root/demo/notes.txt', 'hello', { text: true })</code>. Result: <code>undefined</code>. Example with a handle: <code>await window.__goldenbodyAPI.writeFile(savedFileHandle, 'updated', { text: true })</code>. Result: <code>undefined</code>.</li>
        <li><strong>writeFolder(input, options)</strong> - create a folder. Example: <code>await window.__goldenbodyAPI.writeFolder('/root/demo/new-folder')</code>. Result: <code>undefined</code>. If you have a picked folder handle, you can reuse it: <code>await window.__goldenbodyAPI.writeFolder(folderHandle)</code>.</li>
        <li><strong>readFolder(input, options)</strong> - list children of a folder. Example without a handle: <code>await window.__goldenbodyAPI.readFolder('/root/demo')</code>. Result: an array of names, such as <code>['notes.txt', 'subfolder']</code>. Example with detail: <code>await window.__goldenbodyAPI.readFolder('/root/demo', { detail: true })</code>. Result: an array of objects like <code>[{ path: '/root/demo/notes.txt', type: 'file' }]</code>.</li>
        <li><strong>deleteFile(input, options)</strong> - delete a file. Example: <code>await window.__goldenbodyAPI.deleteFile('/root/demo/notes.txt')</code>. Result: <code>undefined</code>.</li>
        <li><strong>deleteFolder(input, options)</strong> - delete a folder. Example: <code>await window.__goldenbodyAPI.deleteFolder('/root/demo/old-folder')</code>. Result: <code>undefined</code>.</li>
        <li><strong>renameFile(input, newName, options)</strong> - rename a file. Example: <code>await window.__goldenbodyAPI.renameFile('/root/demo/notes.txt', 'draft.txt')</code>. Result: <code>undefined</code>.</li>
        <li><strong>renameFolder(input, newName, options)</strong> - rename a folder. Example: <code>await window.__goldenbodyAPI.renameFolder('/root/demo/old-folder', 'new-folder')</code>. Result: <code>undefined</code>.</li>
        <li><strong>pasteFile(destination, clipboardItems, options)</strong> - copy or move a file payload into a destination folder. Example: <code>await window.__goldenbodyAPI.pasteFile('/root/demo', [{ path: '/root/demo/template.txt', kind: 'file' }])</code>. Result: <code>undefined</code>.</li>
        <li><strong>pasteFolder(destination, clipboardItems, options)</strong> - copy or move a folder payload. Example: <code>await window.__goldenbodyAPI.pasteFolder('/root/demo', [{ path: '/root/demo/template-folder', kind: 'directory' }])</code>. Result: <code>undefined</code>.</li>
        <li><strong>folderExists(input, options)</strong> - check whether the target exists and is a folder. Example: <code>await window.__goldenbodyAPI.folderExists('/root/demo')</code>. Result: <code>true</code> or <code>false</code>.</li>
        <li><strong>fileExists(input, options)</strong> - check whether the target exists and is a file. Example: <code>await window.__goldenbodyAPI.fileExists('/root/demo/notes.txt')</code>. Result: <code>true</code> or <code>false</code>.</li>
      </ul>
      <h4>How to write a file inside a folder you picked</h4>
      <p>First pick a directory. Then build a child path inside that directory and reuse the same <code>key</code> from the folder handle.</p>
      <pre><code>const folderHandle = await window.__goldenbodyAPI.showDirectoryPicker();
const childFilePath = folderHandle.path + '/notes.txt';
await window.__goldenbodyAPI.writeFile(
  { path: childFilePath, key: folderHandle.key },
  'hello from the picked folder',
  { text: true }
);
</code></pre>
      <p>The important detail is that the folder handle object is not the file itself. It describes a directory, and you create the real file path by appending the file name to that directory path.</p>
      <h4>How to modify a file you picked</h4>
      <p>If you want to edit a file the user picked, keep the picker result and reuse it for later read/write calls.</p>
      <pre><code>const pickedFile = await window.__goldenbodyAPI.showOpenFilePicker();
const currentText = await window.__goldenbodyAPI.readFile(pickedFile, { text: true });
await window.__goldenbodyAPI.writeFile(
  pickedFile,
  currentText + '\n\nappended by the app',
  { text: true }
);
</code></pre>
      <p>The same handle object can be passed to <code>readFile</code>, <code>writeFile</code>, <code>deleteFile</code>, and the other file APIs. You do not need to re-pick the file for each operation as long as you keep the object around.</p>
      <h4>Picker results</h4>
      <p>Results from external pickers include:</p>
      <pre><code>{ kind: 'file' | 'directory', path, key, name }</code></pre>
      <p>If the picker path is not authorized with a valid key, writes do not go to the external path.</p>
      <h4>Using a directory picked with showDirectoryPicker</h4>
      <p>When you call <code>showDirectoryPicker</code>, the returned object is a folder handle that can be reused for all subsequent operations against that folder. The important part is that you keep the returned object and use it as the first argument whenever you want to operate inside that directory.</p>
      <pre><code>const folderHandle = await window.__goldenbodyAPI.showDirectoryPicker();

// read the folder contents
const listing = await window.__goldenbodyAPI.readFolder(folderHandle, { detail: true });
console.log(listing);

// check whether a child exists
const childExists = await window.__goldenbodyAPI.fileExists({ path: folderHandle.path + '/notes.txt', key: folderHandle.key });
console.log(childExists);

// write a new file inside that picked folder
await window.__goldenbodyAPI.writeFile(
  { path: folderHandle.path + '/notes.txt', key: folderHandle.key },
  'created via picked folder handle',
  { text: true }
);

// rename an existing child inside that folder
await window.__goldenbodyAPI.renameFile(
  { path: folderHandle.path + '/notes.txt', key: folderHandle.key },
  'renamed.txt'
);

// delete a child inside that folder
await window.__goldenbodyAPI.deleteFile({ path: folderHandle.path + '/renamed.txt', key: folderHandle.key });
</code></pre>
      <p>You can also use the same handle for a directory-level operation such as creating a subfolder, listing children, or checking whether the directory itself exists.</p>
      <pre><code>const folderHandle = await window.__goldenbodyAPI.showDirectoryPicker();
const exists = await window.__goldenbodyAPI.folderExists(folderHandle);
if (!exists) {
  await window.__goldenbodyAPI.writeFolder(folderHandle);
}
const children = await window.__goldenbodyAPI.readFolder(folderHandle);
console.log(children);
</code></pre>
      <h4>Common examples</h4>
      <pre><code>const saveHandle = await window.__goldenbodyAPI.showSaveFilePicker({ suggestedName: 'hello.txt' });
await window.__goldenbodyAPI.writeFile(saveHandle, 'hello world', { text: true });
const contents = await window.__goldenbodyAPI.readFile(saveHandle, { text: true });
console.log(contents);
</code></pre>
      <pre><code>const folderHandle = await window.__goldenbodyAPI.showDirectoryPicker();
const folderExists = await window.__goldenbodyAPI.folderExists(folderHandle);
if (!folderExists) {
  await window.__goldenbodyAPI.writeFolder(folderHandle);
}
const listing = await window.__goldenbodyAPI.readFolder(folderHandle, { detail: true });
console.log(listing);
await window.__goldenbodyAPI.renameFolder(folderHandle, 'new-name');
</code></pre>
      <pre><code>const targetFolder = '/root/demo';
const clipboardItems = [{ path: '/root/demo/template.txt', kind: 'file' }];
await window.__goldenbodyAPI.pasteFile(targetFolder, clipboardItems);
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