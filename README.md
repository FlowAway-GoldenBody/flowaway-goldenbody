## WHAT THIS IS
flowaway goldenbody is an OS-like webpage built with vanilla js and a node server. 

## DEVELOPER DOCS
This is copied directly from the dev docs in the settings app
<h2>App Developer Docs</h2>
<h3>App package layout</h3>
<p>
    Apps live under <code>/systemfiles/runtime/apps/&lt;app-folder&gt;</code>. Every app must include an
    <code>entry.json</code> file and an executable JS file named by <code>jsFile</code>.
</p>
<h3><code>entry.json</code> fields</h3>
<ul>
    <li><code>id</code> - unique app identifier.</li>
    <li><code>jsFile</code> - entry script file relative to the app folder.</li>
    <li><code>label</code> - display name for the app.</li>
    <li><code>iconFile</code> - icon asset path relative to the app folder.</li>
    <li><code>pngEnabled</code> - boolean flag to render <code>iconFile</code> as a PNG image.</li>
    <li>
        <code>startupPos</code> - (Iframe Apps Only) optional object controlling the initial window placement/size. Use
        <code>{ x, y, width, height }</code> to position and size the window when the app is first launched (each
        property is optional). For example,
        <code>"startupPos": { "x": 120, "y": 90, "width": 800, "height": 520 }</code> will open the app at those
        coordinates and dimensions. If omitted, the runtime chooses a sensible default or cascades windows.
    </li>
    <li>
        <code>requestAdminPerm</code> - <code>true</code> for full admin mode, <code>false</code> for sandboxed iframe
        mode.
    </li>
    <li>
        <code>openfileCapability</code> - optional list of VFS file/folder patterns or capabilities used by File
        Explorer to determine if a file extension can be opened by this app. (extension is the .something behind a
        file), (VFS aka. cloud storage)
    </li>
    <li><code>enableDebugging</code> - boolean flag to enable debugging features for the app.</li>
    <li><code>cmd</code> or <code>commands</code> - array of command objects for the app.</li>
    <li><code>headless</code> - boolean flag to indicate if the app runs in headless mode (no UI).</li>
    <li><code>functionName</code> - name of the globally exported launch function. (admin app only)</li>
    <li><code>globalVarObjectString</code> - name of the global object for app instances. (admin app only)</li>
    <li>
        <code>allAppArrayString</code> - array name under the global object for tracking instances. (admin app only)
    </li>
    <li><code>cmf</code> and <code>cmfl1</code> - app button context menu hooks. (admin app only)</li>
</ul>
<p>
    These icon fields are used by start menu, taskbar, and runtime window rendering logic in <code>startMenu.js</code>,
    <code>goldenbody.js</code>, and <code>runtimeWindowSystem.js</code>. They determine whether the icon is rendered as
    text or PNG.
</p>
<h3>Entry file example</h3>
<pre><code>{ "id": "myApp", "label": "My App", "jsFile": "script.js", "iconFile": "icon.png", "pngEnabled": true, "requestAdminPerm": false, "openfileCapability": [".txt", ".md"], "enableDebugging": true, "headless": false } </code></pre>
<h3>App types and permissions</h3>
<h4>Sandboxed iframe apps</h4>
<p>
    When <code>requestAdminPerm</code> is <code>false</code>, the app runs inside a sandboxed iframe using
    <code>untrustedIframePatch.js</code>. That iframe has:
</p>
<ul>
    <li><code>sandbox="allow-scripts allow-pointer-lock"</code></li>
    <li>
        No direct access to DOM APIs like file inputs, localStorage, sessionStorage, IndexedDB, caches, or fullscreen
        exit APIs.
    </li>
    <li>Only the exposed runtime API surface available through <code>window.__goldenbodyAPI</code>.</li>
</ul>
<h4>How <code>requestAdminPerm</code> works</h4>
<p>
    An app with <code>requestAdminPerm: true</code> is treated as an admin-style app only when the runtime can verify a
    matching key.
</p>
<p>The loader reads:</p>
<ul>
    <li><code>&lt;app-folder&gt;/jsKey.txt</code></li>
    <li><code>systemfiles/userprofile/jsApiKey.txt</code></li>
</ul>
<p>
    Only if both exist and match will the runtime load the app script directly with full privileges. If the key is
    missing or invalid, the app is skipped or replaced by a placeholder launcher.
</p>
<p>
    This means admin apps are developer-mode apps: they can behave like system apps, but they still need a user-supplied
    API key to run. (system apps has those keys too, but they are written when ur acc is created)
</p>
<h4>Admin app strategy</h4>
<p>Admin apps should be designed differently from iframe apps:</p>
<ul>
    <li>They can access the runtime directly once verified.</li>
    <li>They are not limited by the sandboxed APIs.</li>
    <li>
        They still must be installed under <code>/systemfiles/runtime/apps/&lt;folder&gt;</code> with a matching
        <code>jsKey.txt</code>.
    </li>
</ul>
<p>
    If you want to build a full system-style app, use <code>requestAdminPerm: true</code> and make sure your
    <code>jsKey.txt</code> is valid.
</p>
<h4>Admin app entry example</h4>
<pre><code>{ "id": "myAdminApp", "label": "My Admin App", "jsFile": "app.js", "iconFile": "icon.png", "pngEnabled": true, "requestAdminPerm": true, "functionName": "myAdminAppLauncher", "globalVarObjectString": "myAdminAppGlobals", "allAppArrayString": "instances", "cmf": "", "cmfl1": "", "headless": false } </code></pre>
<h3>Permissions and app settings</h3>
<p>
    The Settings app stores <code>window.protectedGlobals.appPerms</code> in
    <code>/systemfiles/userprofile/appPermissions.json</code>. For sandboxed apps this controls:
</p>
<ul>
    <li><code>storage</code> - allow, deny, or ask for write access.</li>
    <li><code>notification</code> - allow, deny, or ask for notifications.</li>
    <li><code>launchApp</code> - allow, deny, or ask for launching other apps.</li>
</ul>
<p>
    Admin apps with valid keys are trusted differently, because they are expected to run with user-level privilege when
    the key is verified.
</p>
<h3>App launch arguments &amp; iframe behavior</h3>
<p>
    The iframe launcher created in <code>appLoader.js</code> (see <code>createIframeContainerAppFunction</code>)
    registers a global function named by <code>entryObj.functionName</code>. Its signature is:
</p>
<pre><code>window[entryObj.functionName] = async function(path, verify, argObj, posX = 50, posY = 50) { ... }</code></pre>
<p>
    Pass structured input via <code>argObj</code>. The loader injects <code>window.__args</code>,
    <code>window.__path__</code>, and <code>window.__filehandle__</code> into the iframe so your app can read them at
    startup. Example:
</p>
<pre><code>// launch an app and pass args await __goldenbodyAPI.launchApp('myApp', [{ view: 'recent', id: 42 }]);

// inside iframe script
const args = window.__args; // { view: 'recent', id: 42 }
</code></pre>
<h3>Background worker apps</h3>
<p>
    To make an app run a worker in the background, provide <code>headlessJsFile</code>. The loader in
    <code>appLoader.js</code> will start the worker automatically once the app is discovered, and it stores it in
    <code>window.protectedGlobals.workers[entryObj.id]</code>.
</p>
<pre><code>{ "id": "watcherApp", "label": "Watcher App", "headless": true, "headlessJsFile": "headlessWorker.js", "iconFile": "icon.txt", "jsFile": "script.js" }</code></pre>
<p>
    The background worker is created with
    <code>new Worker(url, { name: entryObj.headlessJsFile, source: entryObj.id })</code>, so it can live independently
    from the iframe. This pattern is used for long-running helper workers, polling loops, or OS-like background
    services.
</p>
<pre><code>(async () =&gt; { await api.writeline('Worker booted'); self.addEventListener('message', async (event) =&gt; { const data = event.data || {}; if (data.type === 'onkill') { await api.writeline('shutting down'); self.close(); } });

while (true) {
await api.writeline('heartbeat');
await new Promise((resolve) => setTimeout(resolve, 5000));
}
})();</code></pre>
<h3>Admin app GUI framework</h3>
<p>
    Admin apps can build their window looks through <code>window.protectedGlobals.apptools</code>, which is initialized
    by <code>initapptools.js</code>. The usual flow is:
</p>
<ol>
    <li>Create an app instance with <code>window.protectedGlobals.apptools.api.createAppInstance({...})</code>.</li>
    <li>Attach a title bar with <code>window.protectedGlobals.apptools.createtitlebar(root)</code>.</li>
    <li>
        Register the instance with <code>window.protectedGlobals.apptools.api.trackInstance(instance, appId)</code> so
        maximize/minimize/show/hide/close state is tracked by the runtime.
    </li>
</ol>
<pre><code> "use strict";

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
<p>
    For admin apps, <code>appLoader.js</code> validates the app entry object and only injects the script after the
    runtime confirms that the app folder has a matching <code>jsKey.txt</code> and
    <code>systemfiles/userprofile/jsApiKey.txt</code>.
</p>
<h2>CLI / Runtime Worker API</h2>
<p>
    The following section covers the terminal, CLI commands, and worker runtime. This is separate from the normal iframe
    app API.
</p>
<h3>Custom commands in <code>entry.json</code></h3>
<p>
    App commands are declared in the <code>cmd</code> array or the <code>commands</code> array. The runtime normalizes
    them to lowercase letters only and strips anything else, so a name like <code>WorkerTest</code> becomes
    <code>workertest</code>. The terminal command runner reads those entries and launches the matching script as a
    worker.
</p>
<pre><code>{ "id": "demoApp", "label": "Demo App", "jsFile": "script.js", "iconFile": "icon.txt", "cmd": [ { "name": "workerTest", "src": "workerTest.js", "receive_onkill_handler": true }, { "name": "doThing", "src": "doThing.js" } ] }</code></pre>
<p>This is the same pattern used by <code>testIframeApp/entry.json</code>. The terminal app supports invoking it as:</p>
<pre><code>demoApp workerTest --mode=fast --count=3 # or workerTest </code></pre>
<p>
    When the command is backed by a JS file, the runtime reads the file, creates a worker, passes the argument object as
    <code>self.args</code> / <code>self._startArgs</code>, and then calls the worker with a runtime
    <code>start</code> message. The arguments are parsed from the terminal command line as JSON or key/value pairs when
    possible.
</p>
<p>
    <code>receive_onkill_handler</code> tells the runtime to treat <code>onkill</code> as graceful shutdown logic and
    wait for the worker to handle it before terminating the process. If you omit it, the runtime terminates more
    aggressively.
</p>
<h3>Runtime worker API (commands)</h3>
<p>Two new runtime APIs are available to worker scripts:</p>
<h4><code>api.cwd()</code></h4>
<p>
    Returns an object with two string properties: <code>relative</code> and <code>full</code>. Use
    <code>relative</code> when showing paths to the user (preserves app-relative view). Use <code>full</code> when
    resolving or writing files in the VFS.
</p>
<pre
    style="
        white-space: pre-wrap;
        background: #f6f6f6;
        padding: 8px;
        border-radius: 6px;
        font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, monospace;
    "
>
const cwd = api.cwd(); // cwd.relative -> './data' (user-facing) // cwd.full -> '/systemfiles/runtime/apps/myapp/data' (absolute VFS path)</pre
>
<h4><code>api.prompt(message, options)</code> (prefill + multiline)</h4>
<p>Workers can prompt the user inline via the terminal. The <code>options</code> object supports:</p>
<ul>
    <li><code>prefill</code> - a string that will be placed into the terminal input for inline editing.</li>
    <li>
        <code>multiline</code> - boolean; when <code>true</code> the prompt is intended for multi-line text (Shift+Enter
        inserts newlines).
    </li>
</ul>
<pre
    style="
        white-space: pre-wrap;
        background: #f6f6f6;
        padding: 8px;
        border-radius: 6px;
        font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, monospace;
    "
>
const edited = await api.prompt('Edit file contents', { prefill: existingText, multiline: true }); // 'edited' contains the final string the user submitted.</pre
>
<p>
    Note: the runtime preserves the original argument string shown to the user (relative paths) while resolving absolute
    paths internally. Do not rely on the worker receiving an <code>appRoot</code> value; the runtime supplies cwd info
    only.
</p>
<h3>Worker API reference</h3>
<p>
    Workers receive a runtime API object named <code>self.api</code> and a few helper globals. The exact implementation
    is created in the terminal worker bootstrap and mirrors the same protections used by the sandboxed iframe patches.
</p>
<ul>
    <li>
        <code>self.args</code> and <code>self._startArgs</code> - the startup argument object/array passed when the
        worker is spawned.
    </li>
    <li><code>self.api.readFile(path, options)</code> - read a file from the VFS.</li>
    <li><code>self.api.writeFile(path, content, options)</code> - write text or binary content.</li>
    <li><code>self.api.readFolder(path, options)</code> - read folder entries.</li>
    <li><code>self.api.writeFolder(path, options)</code> - create a folder.</li>
    <li><code>self.api.fileExists(path)</code> and <code>self.api.folderExists(path)</code> - existence checks.</li>
    <li><code>self.api.deleteFile(path)</code>, <code>self.api.deleteFolder(path)</code> - delete paths.</li>
    <li>
        <code>self.api.renameFile(path, newName)</code> and <code>self.api.renameFolder(path, newName)</code> - rename
        paths.
    </li>
    <li>
        <code>self.api.pasteFile(destination, clipboardItems, options)</code> and
        <code>self.api.pasteFolder(destination, clipboardItems, options)</code> - copy or move items.
    </li>
    <li><code>self.api.launchApp(appId, args)</code> - launch another app from the worker.</li>
    <li>
        <code>self.api.writeline(...args)</code> - print a terminal-style line, including optional text color, size, and
        font.
    </li>
    <li>
        <code>self.api.prompt(message, options)</code> - show a prompt and await the response through
        <code>promptResponse</code>.
    </li>
    <li><code>self.api.getStartArgs()</code> - return the original startup arguments object.</li>
</ul>
<h4>Using the line handle</h4>
<p>
    <code>self.api.writeline()</code> returns a handle object you can update in place instead of writing a completely
    new line. The handle exposes <code>.update(...args)</code> and <code>.rewriteLine(...args)</code>, and it also keeps
    the original DOM element at <code>.element</code>.
</p>
<pre><code>const status = await api.writeline('Downloading...', '#ffcc66', 14, 'ui-monospace, SFMono-Regular, Menlo, Monaco, monospace'); status.update('Downloading... 25%', '#3ddc97', 14); await new Promise((resolve) =&gt; setTimeout(resolve, 1000)); status.rewriteLine('Downloading... 100%', '#3ddc97', 16, 'ui-monospace, SFMono-Regular, Menlo, Monaco, monospace');</code></pre>
<p>
    The first argument can be a string and the optional arguments are the same as terminal styling:
    <code>(text, color, size, font)</code>. This is the easiest way to make progress indicators or status rows that
    update live without spamming the terminal output.
</p>
<p>
    Workers also see a guarded network surface: <code>fetch</code>, <code>XMLHttpRequest</code>, and
    <code>WebSocket</code> are replaced so they fail when the runtime blocks network access. The runtime relays the
    current Wi-Fi/user network policy via <code>networkToggle</code> / <code>allowNetwork</code> and the worker updates
    its local policy from the broadcast state.
</p>
<p>
    Incoming runtime messages include <code>start</code>, <code>networkToggle</code>, <code>allowNetwork</code>,
    <code>onkill</code>, <code>promptResponse</code>, and <code>apiResult</code>. Outgoing messages can use
    <code>postMessage({ type: 'log' })</code>, <code>postMessage({ type: 'done' })</code>,
    <code>postMessage({ type: 'api' })</code>, and the terminal line helpers to render output or request file actions.
</p>
<h3>Headless app fields</h3>
<ul>
    <li><code>functionName</code> - globally exported launch function that the runtime calls.</li>
    <li><code>globalVarObjectString</code> - name of the global object for app instances.</li>
    <li><code>allAppArrayString</code> - array name under the global object for tracking instances.</li>
    <li><code>cmf</code> and <code>cmfl1</code> - app btn contextmenu hooks. (i personally think its useless)</li>
    <li>
        <code>headless</code> - if you have this on, the app will only run in the background, it will be ignored if you
        have the <code>icon</code> entry in the json file.
    </li>
</ul>
<h2>Iframe App API</h2>
<h3>Iframe API reference</h3>
<p>
    Sandboxed apps should call <code>window.__goldenbodyAPI</code>. Every method returns a promise, so await it in async
    code.
</p>
<ul>
    <li>
        <code>readFile(pathOrHandle, options)</code> - read a file from the VFS. The first argument can be a plain
        string path or a picker result object like <code>{ path, key }</code>.
    </li>
    <li><code>writeFile(pathOrHandle, content, options)</code> - write text or binary data to a file.</li>
    <li>
        <code>readFolder(pathOrHandle, options)</code> - list the children of a folder. If
        <code>options.detail === true</code>, the runtime returns objects with <code>path</code> and <code>type</code>.
    </li>
    <li><code>writeFolder(pathOrHandle, options)</code> - create a folder.</li>
    <li><code>deleteFile(pathOrHandle, options)</code> - delete a file.</li>
    <li><code>deleteFolder(pathOrHandle, options)</code> - delete a folder.</li>
    <li><code>renameFile(pathOrHandle, newName, options)</code> - rename a file.</li>
    <li><code>renameFolder(pathOrHandle, newName, options)</code> - rename a folder.</li>
    <li>
        <code>pasteFile(destinationOrHandle, clipboardItems, options)</code> - paste a file payload into a destination
        folder.
    </li>
    <li>
        <code>pasteFolder(destinationOrHandle, clipboardItems, options)</code> - paste a folder payload into a
        destination folder.
    </li>
    <li>
        <code>folderExists(pathOrHandle, options)</code> - resolve <code>true</code> if the target exists and is a
        folder.
    </li>
    <li>
        <code>fileExists(pathOrHandle, options)</code> - resolve <code>true</code> if the target exists and is a file.
    </li>
    <li>
        <code>showOpenFilePicker(options)</code> - return a picker handle object describing the selected file or folder.
    </li>
    <li><code>showSaveFilePicker(options)</code> - return a picker handle object for a destination file.</li>
    <li><code>showDirectoryPicker(options)</code> - return a picker handle object for a destination directory.</li>
    <li>
        <code
            >getBounds() { return { left: root.offsetLeft, top: root.offsetTop, width: root.offsetWidth, height:
            root.offsetHeight }; }</code
        >
        - return the bounds of the current instance window.
    </li>
    <li>
        <code>setBounds(bounds = { left, top, width, height, maximize, minimize })</code> - set the bounds of the
        current instance window. You may pass a single object with named properties. For convenience some runtimes also
        accept positional arguments as <code>setBounds(left, top, width, height, maximize, minimize)</code>. The
        <code>maximize</code> and <code>minimize</code> flags are optional booleans; <code>minimize</code> also supports
        <code>false</code> to explicitly restore from a minimized state.
    </li>
</ul>
<pre
    style="
        white-space: pre-wrap;
        background: #f6f6f6;
        padding: 8px;
        border-radius: 6px;
        font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, monospace;
    "
>
// object form await window.__goldenbodyAPI.setBounds({ left: 120, top: 90, width: 900, height: 640 });

// object form: maximize
await window.__goldenbodyAPI.setBounds({ maximize: true });

// minimize: true will minimize the window, false will restore it
await window.__goldenbodyAPI.setBounds({ minimize: true });

// other fields are ignored if you use maximize or minimize, if you use both maximize and minimize, maximize takes precedence
</pre>
<ul>
    <li><code>setInstanceTitle(title)</code> - set the instance title of your current instance.</li>
    <li>
        <code>message(message, toInstance)</code> - send an instance message. Use <code>*</code> or <code>all</code> to
        broadcast.
    </li>
    <li><code>getCurInstanceNum()</code> - return the index of the current instance.</li>
    <li><code>getLiveInstanceIndex()</code> - return the number of live instances for your app.</li>
    <li><code>getInstanceTitle(instanceIndex)</code> - return the title of the specified instance.</li>
    <li><code>launchApp(appId, [arg1, arg2, ..., argN])</code> - launch another app from the iframe.</li>
    <li><code>getTheme()</code> - return <code>dark</code> or <code>light</code>.</li>
    <li>
        <code>Observer()</code> - observe postmessages with the specified type. For example:
        <code>let themeObserver = new __goldenbodyAPI.Observer((e) =&gt; console.log(e.darkTheme), 'themechange');</code
        >.
    </li>
    <li><code>observer.disconnect()</code> - stop observing a previously created observer.</li>
</ul>
<p>These methods send a message to the host frame and return a promise.</p>
<h3>Quick FS API Introduction</h3>
<p>
    This section teaches the full VFS surface available to app authors. Read it end-to-end if you haven't written apps
    here before — it covers the primitives, picker handles, permissions, common pitfalls, and concrete examples.
</p>
<h4>What you can do</h4>
<p>
    The runtime exposes a promise-based VFS on <code>window.__goldenbodyAPI</code> for sandboxed apps and on
    <code>self.api</code> for workers. Admin apps can call <code>window.protectedGlobals.*</code> directly when
    verified. The core FS operations are:
</p>
<ul>
    <li><code>readFile(pathOrHandle, options)</code></li>
    <li><code>readFolder(pathOrHandle, options)</code></li>
    <li><code>writeFile(pathOrHandle, contents, options)</code></li>
    <li><code>writeFolder(pathOrHandle, options)</code></li>
    <li><code>deleteFile(pathOrHandle)</code>, <code>deleteFolder(pathOrHandle)</code></li>
    <li><code>renameFile(pathOrHandle, newName)</code>, <code>renameFolder(pathOrHandle, newName)</code></li>
    <li>
        <code>pasteFile(destination, clipboardItems, options)</code>,
        <code>pasteFolder(destination, clipboardItems, options)</code>
    </li>
    <li><code>fileExists(pathOrHandle)</code>, <code>folderExists(pathOrHandle)</code></li>
    <li>
        Picker helpers: <code>showOpenFilePicker()</code>, <code>showSaveFilePicker()</code>,
        <code>showDirectoryPicker()</code>
    </li>
</ul>
<h4>Workers vs Iframes vs Admin apps</h4>
<p>
    - Sandbox iframe apps: call <code>window.__goldenbodyAPI.*</code> (promises).<br />- Workers: call
    <code>self.api.*</code>.<br />- Admin apps (verified with keys): may call
    <code>window.protectedGlobals.*</code> directly.
</p>
<h4>Paths vs Handles (picker results)</h4>
<p>
    Every file/folder argument can be either a plain VFS string like <code>/root/path/file.txt</code> or a handle object
    produced by the runtime pickers. A handle is shaped like:
</p>
<pre><code>{ kind: 'file'|'directory', path: '/root/whatever', key: 'uuid-permission-key', name: 'prettyname.txt' }</code></pre>
<p>
    Use strings for simple read-only operations against known paths. Use handles when you need persistent write
    permission to a user-selected target — keep the handle object and pass it back to subsequent calls.
</p>
<h4>How handles work</h4>
<p>
    A handle in this platform is not a browser <code>FileSystemHandle</code> and it is not a special object you need to
    open or close. It is a small runtime record shaped like:
</p>
<pre><code>{ path: '/some/path.txt', key: 'uuid-key' }</code></pre>
<p>
    The <code>path</code> field tells the runtime which VFS path to use. The <code>key</code> field is the permission
    token created when the user picked that file or folder. You keep this object and pass it back to later FS calls
    whenever you want to keep using the same picked target.
</p>
<p>
    <strong>Important:</strong> this is a custom runtime capability object, not a native browser filesystem handle. A
    picked directory handle does not become a special “directory context” object that automatically applies to every
    child file. For child-file operations inside a picked folder, you still build a child path with the same key, such
    as <code>{ path: folderHandle.path + '/notes.txt', key: folderHandle.key }</code>.
</p>
<p>There are two common patterns:</p>
<ol>
    <li>
        <strong>Plain path</strong>: use a normal string such as <code>/root/demo/notes.txt</code> when the target is
        already known and you are not using a picker token. This is the simplest pattern for paths you already know.
    </li>
    <li>
        <strong>Handle object</strong>: use the object returned by <code>showOpenFilePicker</code>,
        <code>showSaveFilePicker</code>, or <code>showDirectoryPicker</code> when you want to keep editing the same
        picked target after the picker closes. The runtime uses the saved <code>path</code> plus the saved
        <code>key</code> for future calls. This is the pattern you want for writes and edits to a picked file or folder.
        For a picked folder, you must usually append the child file name to <code>folderHandle.path</code> and reuse
        <code>folderHandle.key</code>.
    </li>
</ol>
<h4>ReadFile (options and patterns)</h4>
<p>Signature: <code>readFile(pathOrHandle, options)</code>. Options (mutually exclusive):</p>
<ul>
    <li><code>{ text: true }</code> — returns the file as UTF-8 text (string).</li>
    <li><code>{ buffer: true }</code> — returns an ArrayBuffer.</li>
    <li><code>{ stream: true }</code> — returns a ReadableStream for incremental reads.</li>
    <li><code>{ direct: true }</code> — return raw response value (used internally).</li>
</ul>
<p>Example (simple):</p>
<pre><code>const { fileSize, filecontent } = await window.__goldenbodyAPI.readFile('/root/doc.txt', { text: true }); console.log('size', fileSize, 'contents', filecontent);</code></pre>
<p>Example (streaming large files):</p>
<pre><code>const stream = await window.__goldenbodyAPI.readFile('/root/big.bin', { stream: true }); const reader = stream.getReader(); let received = 0; while (true) { const { done, value } = await reader.read(); if (done) break; received += value.byteLength; // process chunk } console.log('received', received);</code></pre>
<h4>WriteFile (options, chunking, and retries)</h4>
<p>Signature: <code>writeFile(pathOrHandle, contents, options)</code>. Important options:</p>
<ul>
    <li><code>{ replace: true|false }</code> — whether to replace the target (default true for first chunk).</li>
    <li>
        <code>{ stream: true }</code> — caller supplies a ReadableStream or Blob; runtime will convert to bytes and
        upload.
    </li>
    <li><code>{ retrytimeout: ms }</code> — per-chunk timeout used for retries (default set by runtime).</li>
    <li><code>{ password: '...' }</code> — forwarded for server-side protected writes when supported.</li>
</ul>
<p>The runtime uploads large files in ~10MB chunks with robust retry logic. Example:</p>
<pre><code>// small text write await window.__goldenbodyAPI.writeFile('/root/notes.txt', 'hello world', { replace: true });

// write using a picked handle
await window.__goldenbodyAPI.writeFile(savedHandle, fileBytes, { replace: true });</code></pre>
<h4>ReadFolder (listing details)</h4>
<p>
    Signature: <code>readFolder(pathOrHandle, { detail: false, directoryDetail: false })</code>. When
    <code>detail: true</code> the runtime returns entries with <code>{ path, type }</code>. Example:
</p>
<pre><code>const names = await window.__goldenbodyAPI.readFolder('/root/projects'); const detailed = await window.__goldenbodyAPI.readFolder('/root/projects', { detail: true });</code></pre>
<h4>WriteFolder / Create folder</h4>
<p>Signature: <code>writeFolder(pathOrHandle, options)</code>. Use to create a new folder. Example:</p>
<pre><code>await window.__goldenbodyAPI.writeFolder('/root/projects/new-app'); // or with a picked folder handle (reuses permission) await window.__goldenbodyAPI.writeFolder(folderHandle);</code></pre>
<h4>Exists, Delete, Rename</h4>
<ul>
    <li><code>fileExists(pathOrHandle)</code> / <code>folderExists(pathOrHandle)</code> — resolves boolean.</li>
    <li><code>deleteFile(pathOrHandle)</code>, <code>deleteFolder(pathOrHandle)</code> — remove targets.</li>
    <li>
        <code>renameFile(pathOrHandle, newName)</code>, <code>renameFolder(pathOrHandle, newName)</code> — rename
        entries.
    </li>
</ul>
<h4>PasteFile / PasteFolder</h4>
<p>
    These APIs are used to copy or move clipboard-style payloads into a destination folder. The
    <code>clipboardItems</code> array contains objects like
    <code>{ path: '/root/source/thing.txt', kind: 'file' }</code>. Example:
</p>
<pre><code>await window.__goldenbodyAPI.pasteFile('/root/dest', [{ path: '/root/source/template.txt', kind: 'file' }]); // use options: { move: true } to move instead of copy await window.__goldenbodyAPI.pasteFolder(destHandle, items, { move: false });</code></pre>
<h4>Permission note</h4>
<p>
    Read-like operations such as <code>readFile</code>, <code>readFolder</code>, <code>fileExists</code>, and
    <code>folderExists</code> do not require the write permission gate. Write-like operations that change files,
    folders, or storage usage, such as <code>writeFile</code>, <code>deleteFile</code>, <code>renameFile</code>, and
    similar actions, are checked against the saved permission key for the picked target.
</p>
<h4>Pickers and the handle lifecycle</h4>
<p>Picker helpers return handle objects you should store when you want continued permission to write. Typical flow:</p>
<pre><code>// pick a file to open const handle = await window.__goldenbodyAPI.showOpenFilePicker(); const text = await window.__goldenbodyAPI.readFile(handle, { text: true });

// keep 'handle' to write later without re-picking
await window.__goldenbodyAPI.writeFile(handle, updatedText, { replace: true });</code></pre>
<h4>Picker results</h4>
<p>Results from external pickers include:</p>
<pre><code>{ kind: 'file' | 'directory', path, key, name }</code></pre>
<p>If the picker path is not authorized with a valid key, writes do not go to the external path.</p>
<h4>How to write a file inside a folder you picked</h4>
<p>
    First pick a directory. Then build a child path inside that directory and reuse the same <code>key</code> from the
    folder handle.
</p>
<pre><code>const folderHandle = await window.__goldenbodyAPI.showDirectoryPicker(); const childFilePath = folderHandle.path + '/notes.txt';

await window.__goldenbodyAPI.writeFile(
{ path: childFilePath, key: folderHandle.key },
'hello from the picked folder',
{ text: true }
);
</code></pre>
<p>
    The important detail is that the folder handle object is not the file itself and it is not a native directory
    context object. It describes a directory, and you create the real child file path by appending the file name to that
    directory path while reusing the same <code>key</code> from the folder handle. In other words, a picked directory is
    effectively a saved <code>{ path, key }</code> pair, not a live browser directory handle.
</p>
<h4>How to modify a file you picked</h4>
<p>If you want to edit a file the user picked, keep the picker result and reuse it for later read/write calls.</p>
<pre><code>const pickedFile = await window.__goldenbodyAPI.showOpenFilePicker(); const currentText = await window.__goldenbodyAPI.readFile(pickedFile, { text: true });

await window.__goldenbodyAPI.writeFile(
pickedFile,
currentText + '\n\nappended by the app',
{ text: true }
);
</code></pre>
<p>
    The same handle object can be passed to <code>readFile</code>, <code>writeFile</code>, <code>deleteFile</code>, and
    the other file APIs. You do not need to re-pick the file for each operation as long as you keep the object around.
</p>
<h4>Using a directory picked with showDirectoryPicker</h4>
<p>
    When you call <code>showDirectoryPicker</code>, the returned object is a folder handle that can be reused for all
    subsequent operations against that folder. The important part is that you keep the returned object and use it as the
    first argument whenever you want to operate inside that directory.
</p>
<pre><code>const folderHandle = await window.__goldenbodyAPI.showDirectoryPicker();

// read the folder contents
const listing = await window.__goldenbodyAPI.readFolder(folderHandle, { detail: true });
console.log(listing);

// check whether a child exists
const childExists = await window.__goldenbodyAPI.fileExists({
path: folderHandle.path + '/notes.txt',
key: folderHandle.key
});
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
await window.__goldenbodyAPI.deleteFile({
path: folderHandle.path + '/renamed.txt',
key: folderHandle.key
});
</code></pre>
<p>
    You can also use the same handle for a directory-level operation such as creating a subfolder, listing children, or
    checking whether the directory itself exists.
</p>
<pre><code>const folderHandle = await window.__goldenbodyAPI.showDirectoryPicker(); const exists = await window.__goldenbodyAPI.folderExists(folderHandle);

if (!exists) {
await window.__goldenbodyAPI.writeFolder(folderHandle);
}

const children = await window.__goldenbodyAPI.readFolder(folderHandle);
console.log(children);
</code></pre>
<h4>File Explorer "Open with" (immediate handle from explorer)</h4>
<p>
    When a user chooses "Open with" from the File Explorer (rather than using the runtime pickers), the runtime injects
    an immediate handle into sandboxed iframe apps so the app can operate on the opened file without showing a picker.
    The iframe patch sets two helpers for this flow:
</p>
<ul>
    <li><code>window.__path__</code> - the VFS path of the file the user opened.</li>
    <li><code>window.__filehandle__</code> - an internal permission key string for that file.</li>
    <li>
        <code>window.userPickedFileHandle</code> - a convenience <code>{ path, key }</code> handle created from the
        above values (available inside the iframe after load).
    </li>
</ul>
<p>Because this is a runtime-provided handle (not a picker promise), you can use it directly. Example:</p>
<pre><code>// read the file that the user opened via Explorer if (window.userPickedFileHandle) { const text = await window.__goldenbodyAPI.readFile( window.userPickedFileHandle, { text: true } ); console.log('opened file contents:', text); }

// write back to the same file
if (window.userPickedFileHandle) {
await window.__goldenbodyAPI.writeFile(
window.userPickedFileHandle,
'updated content',
{ text: true }
);
}

// if you need the raw path or key you can also inspect:
// window.path (string) and window.filehandle (permission key)
</code></pre>
<h3>/__public — shared space</h3>
<p>
    The runtime exposes a special shared path prefix <code>/__public</code>. Sandboxed apps and workers are allowed to
    access paths under <code>/__public</code> without a picker key (the runtime treats <code>/__public</code> as an
    application-visible shared area). Use it for non-sensitive shared assets, caches, or inter-app data; avoid storing
    secrets or personal data there.
</p>
<h3>Common examples</h3>
<pre><code>const saveHandle = await window.__goldenbodyAPI.showSaveFilePicker({ suggestedName: 'hello.txt' });

await window.__goldenbodyAPI.writeFile(
saveHandle,
'hello world',
{ text: true }
);

const contents = await window.__goldenbodyAPI.readFile(
saveHandle,
{ text: true }
);

console.log(contents);
</code></pre>
<pre><code>const folderHandle = await window.__goldenbodyAPI.showDirectoryPicker(); const folderExists = await window.__goldenbodyAPI.folderExists(folderHandle);

if (!folderExists) {
await window.__goldenbodyAPI.writeFolder(folderHandle);
}

const listing = await window.__goldenbodyAPI.readFolder(
folderHandle,
{ detail: true }
);

console.log(listing);

await window.__goldenbodyAPI.renameFolder(folderHandle, 'new-name');
</code></pre>
<pre><code>const targetFolder = '/root/demo'; const clipboardItems = [ { path: '/root/demo/template.txt', kind: 'file' } ];

await window.__goldenbodyAPI.pasteFile(
targetFolder,
clipboardItems
);
</code></pre>
<h3>Error handling, retries, and best practices</h3>
<ul>
    <li>Read and write APIs throw on permanent errors; catch and show friendly messages.</li>
    <li>For large files prefer streaming reads and let the runtime handle chunked uploads when writing.</li>
    <li>Keep picker handles if you need persistent permission; treat the handle as your token.</li>
    <li>
        When writing into a picked folder, append the child filename to <code>folderHandle.path</code> and reuse
        <code>folderHandle.key</code>.
    </li>
</ul>
<h3>Quick checklist for first app</h3>
<ol>
    <li>Decide whether you need write access. If yes, call a picker and keep the returned handle.</li>
    <li>Use <code>readFile</code> to load templates or existing data.</li>
    <li>Use <code>writeFile</code> to save changes; prefer small writes or rely on runtime chunking for big files.</li>
    <li>Test the app as sandboxed first; convert to admin mode only when you understand key management.</li>
</ol>
<p>
    All of the examples above use the same API surface the runtime provides to workers and iframes — use the variant for
    your execution context (<code>self.api</code> in workers, <code>window.__goldenbodyAPI</code> in iframes, or
    <code>window.protectedGlobals</code> in admin apps).
</p>
<h3>Bottom line</h3>
<p>
    There are no hidden files or directories anywhere in cloud storage. You can edit <code>systemfiles</code> to change
    how the client behaves. If you break it, you can restore the system tree from the login page and remove broken
    non-system apps there. A copy of broken files will also be stored in your cloud storage.
</p>
## QUICK DEV & RUN

- Requirements: Node.js (latest recommended, v24+). IDK if bun works... prob not.
- Install libraries/dependencies the server (aka. the rammerhead server) needs via npm install:

```bash
npm install
```

- Because of how the proxy is set up, the 1st time you start the server you need to run
```bash
npm run build
```

- Run server:

```bash
node src/server.js
```

- you can also run with: 
```bash
npm start
```


- THE BACKEND IS BASED ON ""aka (copied from)"" RAMMERHEAD SINCE THE PURPOSE OF THIS THING USED TO BE A PROXY:
- Configure Rammerhead `src/config.js` to override defaults.


- If you want external access, `cloudflared` is a good option to host it.

- Just so yall know you can run this server in about 10 minutes after you get a new rpi or any device including an android phone. If you need longer than that there must be some stuff u did wrong!

-!!!IMPORTANT!!! if you are hosting on termux change config.js to this
`const enableWorkers = false;` on line 7 of config.js

## CONTACT

For project-related questions: a1462978843@outlook.com, alt email: playminecraft183@outlook.com