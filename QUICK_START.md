# Quick Start: Creating Your First App

## The Easy Way (Using the UI)

1. **Create an app file** - `myapp.js`:
```javascript
function myApp() {
  const window_div = document.createElement('div');
  window_div.style.cssText = 'position:fixed;top:100px;left:100px;width:300px;height:200px;background:lightblue;border:1px solid #333;padding:10px;border-radius:8px;';
  window_div.innerHTML = '<h2>My First App</h2><p>Hello from the app!</p>';
  document.body.appendChild(window_div);
  
  // Tag it with app ID for management
  window_div.dataset.appId = 'myApp';
}
```

2. **Open the start menu** - Click the start button in the taskbar

3. **Click the "+ Install" button** at the top of the Apps section

4. **Select "Upload File"** tab (if not already selected)

5. **Choose your `myapp.js` file** and click "Install"

6. **Done!** Your app appears in the Apps grid

## The Code Way (Programmatic Installation)

```javascript
// JavaScript code in browser console or your app

// Install from a file
const jsCode = `
function myApp() {
  console.log('App is running!');
  document.body.style.background = '#f0f0f0';
}
`;

const file = new File([jsCode], 'myapp.js', { type: 'text/javascript' });
await window.appInstaller.installFromFile(file, 'My Custom App');

// Install from URL
await window.appInstaller.installFromUrl(
  'https://example.com/my-awesome-app.js',
  'Remote App'
);
```

## Understanding the App Structure

When you install an app, the system:

1. **Creates a folder** in `apps/MyApp/`
2. **Stores your JavaScript file** as `myapp.js` (or original name)
3. **Creates metadata** in `app.txt`:
   ```
   myApp
   My First App
   ```

The metadata file has 3 lines:
- Line 1: Entry function name (must match a function in your app)
- Line 2: Display name (shown in grid)
- Line 3: Optional button ID (for styling)

## How Apps Are Launched

When you click an app in the start menu:

1. System loads your JavaScript file into a `<script>` tag
2. System calls your entry function (e.g., `myApp()`)
3. Your app can create UI, open windows, etc.

## Access System Features

Your apps can use these built-in functions:

### File Operations
```javascript
// Open a file picker dialog
const files = await window.flowawayOpenFilePicker();

// Open a folder picker dialog  
const folder = await window.flowawayDirectoryPicker();

// Save file dialog
const handle = await window.flowawaySaveFilePicker();
```

### Server Communication
```javascript
// Send data to server
const response = await filePost({ 
  myData: 'hello',
  customField: true 
});
```

### Access App List
```javascript
// Get all installed apps
console.log(window.apps);

// Find a specific app
const myApp = window.apps.find(a => a.label === 'My Custom App');
```

### File Tree
```javascript
// Get the file system tree
if (!window.treeData) {
  await window.loadTree();
}
console.log(window.treeData);
```

## Example: A Useful App

Here's a complete example that's actually useful:

**clockapp.js**
```javascript
function clockApp() {
  // Create window container
  const win = document.createElement('div');
  win.style.cssText = `
    position: fixed;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
    width: 300px;
    height: 150px;
    background: #2c3e50;
    color: white;
    border-radius: 10px;
    padding: 20px;
    text-align: center;
    font-family: monospace;
    box-shadow: 0 4px 6px rgba(0,0,0,0.3);
  `;
  
  const title = document.createElement('h3');
  title.textContent = '⏰ Clock';
  title.style.marginTop = '0';
  win.appendChild(title);
  
  const display = document.createElement('div');
  display.style.fontSize = '32px';
  display.style.marginBottom = '10px';
  win.appendChild(display);
  
  const closeBtn = document.createElement('button');
  closeBtn.textContent = 'Close';
  closeBtn.style.cssText = `
    padding: 8px 16px;
    background: #e74c3c;
    color: white;
    border: none;
    border-radius: 4px;
    cursor: pointer;
  `;
  closeBtn.onclick = () => win.remove();
  win.appendChild(closeBtn);
  
  document.body.appendChild(win);
  
  // Update time every second
  const updateTime = () => {
    const now = new Date();
    display.textContent = now.toLocaleTimeString();
  };
  
  updateTime();
  const interval = setInterval(updateTime, 1000);
  
  // Cleanup on close
  win.dataset.appId = 'clockApp';
  window.clockApp_teardown = () => {
    clearInterval(interval);
    if (win.parentNode) win.remove();
  };
}
```

**Metadata (app.txt)**
```
clockApp
Clock Widget
```

**Installation**
```javascript
const code = '... (paste the above code) ...';
const file = new File([code], 'clockapp.js');
await window.appInstaller.installFromFile(file, 'Clock Widget');
```

## Tips & Tricks

### Using Dark Theme
```javascript
function myApp() {
  const isDark = data.dark;
  if (isDark) {
    // Apply dark theme styles
  }
}
```

### Multiple Windows
Your app can open multiple windows:
```javascript
function myApp() {
  // Create window 1
  const win1 = document.createElement('div');
  // ... setup ...
  document.body.appendChild(win1);
  
  // Create window 2
  const win2 = document.createElement('div');
  // ... setup ...
  document.body.appendChild(win2);
}
```

### Hot Reload During Development
The system watches the `apps/` folder and automatically reloads changes:
1. Edit your `myapp.js` file
2. Save it to the `apps/MyApp/` folder
3. Wait 7 seconds - app automatically reloads!
4. No need to uninstall/reinstall

## Common Issues

### My app doesn't appear after installation
- Check the browser console for error messages (prefix: `[INSTALLER]`)
- Verify the `app.txt` file was created with correct entry function name
- Try refreshing the page

### My app crashes when launched
- Check browser console for errors (prefix: `[APP LAUNCHER]`)
- Verify your entry function is named correctly
- Check for missing semicolons or syntax errors

### My function is called but nothing happens
- Verify you're creating DOM elements and appending to `document.body`
- Check console for errors in your code
- Make sure styles aren't hidden off-screen

## Next Steps

- Read the full [APP_INSTALLATION_GUIDE.md](./APP_INSTALLATION_GUIDE.md) for API reference
- Check the [system.js](./public/system.js) for helper functions
- Join the community and share your apps!

Happy app building! 🚀
