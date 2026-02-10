# Dynamic App Installation & Loading Guide

## Overview

The FlowAway OS now includes a complete **app installation system** with enhanced dynamic script loading capabilities. Users can install apps directly from the UI without manually creating folder structures.

## Features Added

### 1. **App Installer (`window.appInstaller`)**
A comprehensive system for managing app installations with the following methods:

#### `installFromFile(file, appName)`
- Installs an app from a File object
- Supports `.js` and `.zip` files (ZIP support requires JSZip library)
- Automatically creates app folder structure
- Generates metadata file (`app.txt`) with app name and entry point

**Usage:**
```javascript
const file = document.getElementById('fileInput').files[0];
await window.appInstaller.installFromFile(file, 'MyApp');
```

#### `installFromUrl(url, appName)`
- Downloads and installs an app from a URL
- Automatically derives app name from URL if not provided
- Validates HTTP response before processing

**Usage:**
```javascript
await window.appInstaller.installFromUrl('https://example.com/app.js', 'RemoteApp');
```

#### `uninstallApp(appId)`
- Removes an installed app and its files
- Automatically reloads the app tree

**Usage:**
```javascript
await window.appInstaller.uninstallApp(appId);
```

### 2. **Installation UI Modal (`window.showAppInstaller()`)**
A user-friendly modal dialog with two tabs:

- **Upload File Tab**: Upload `.js` or `.zip` files from your device
- **From URL Tab**: Install apps by providing a direct URL

Features:
- Real-time installation status feedback
- Error messages with details
- Theme-aware (respects dark/light mode)
- Tab-based interface for easy switching
- Cancel and close functionality

### 3. **Enhanced Dynamic Script Loading**
Improved script loading in `renderAppsGrid()` and `launchApp()`:

- **Data attributes** on script elements for tracking app metadata
- **Global capture system** that records new globals introduced by app scripts
- **Error tracking** with `app.loadError` property
- **Detailed logging** with `[APP LOADER]` and `[APP LAUNCHER]` prefixes
- **Timeout-based capture** (0ms, 120ms, 800ms, 2500ms) to catch async initializers

### 4. **Install Button in Start Menu**
- Blue "+ Install" button added to the Apps section of the start menu
- Click to open the installation modal
- Blends seamlessly with the UI theme

## App Structure

When you install an app, the system creates a folder in `apps/`:

```
apps/
└── MyApp/
    ├── app.txt (metadata)
    └── myapp.js (main script file)
```

### app.txt Format
```
EntryPointFunctionName
Display Name
button-id-optional
```

Example:
```
myAppInit
My Awesome App
myAppStartBtn
```

## App Development Guidelines

### Entry Point
Define a function with the same name as the entry point specified in `app.txt`:

```javascript
function myAppInit() {
  console.log('App started!');
  // Create UI, windows, etc.
}
```

### Teardown Hooks (Optional)
Apps can define teardown functions to clean up when reloaded:

- `{entryName}_teardown()`
- `{entryName}Teardown()`
- `{entryName}_destroy()`
- `{entryName}Destroy()`
- `{entryName}_unload()`
- `{entryName}Unload()`

Example:
```javascript
function myAppInit_teardown() {
  // Clean up resources
  console.log('Cleaning up...');
}
```

### Access to OS APIs
Apps have access to:
- `window.apps` - Array of installed apps
- `window.treeData` - File system tree
- `filePost()` - Server communication
- `flowawayOpenFilePicker()` - File selection
- `flowawayDirectoryPicker()` - Folder selection
- `flowawaySaveFilePicker()` - Save dialog

## Console Logging

The system uses prefixed console logs for debugging:

- `[INSTALLER]` - Installation operations
- `[APP LOADER]` - Script loading during grid render
- `[APP LAUNCHER]` - Script loading during app launch
- `[APP POLLING]` - Live app file system monitoring

## Example: Creating an App

### 1. Create `myapp.js`
```javascript
function myApp() {
  const root = document.createElement('div');
  root.textContent = 'Hello from my app!';
  document.body.appendChild(root);
  console.log('My app is running!');
}

function myApp_teardown() {
  // Optional: Clean up when app is unloaded
  const root = document.querySelector('[data-app="myApp"]');
  if (root) root.remove();
}
```

### 2. Create metadata file
Name: `app.txt`
Content:
```
myApp
My App
```

### 3. Install
Use the UI: Click "+ Install" button, select `myapp.js`

Or programmatically:
```javascript
const file = new File([jsCode], 'myapp.js');
await window.appInstaller.installFromFile(file, 'myApp');
```

## Live App Polling

The system continuously monitors the `apps/` folder every 7 seconds:

- **New apps** are automatically detected and added
- **Modified apps** are reloaded (old globals cleaned, script re-executed)
- **Deleted apps** are removed from the UI and unloaded

This enables hot-reloading during development!

## API Reference

### Global Functions

#### `window.appInstaller.installFromFile(file, appName)`
- **Parameters:**
  - `file` (File): File object from input
  - `appName` (string, optional): Display name
- **Returns:** Promise
- **Throws:** Error if installation fails

#### `window.appInstaller.installFromUrl(url, appName)`
- **Parameters:**
  - `url` (string): Full URL to app file
  - `appName` (string, optional): Display name
- **Returns:** Promise
- **Throws:** Error if download/installation fails

#### `window.appInstaller.uninstallApp(appId)`
- **Parameters:**
  - `appId` (string): App icon/ID identifier
- **Returns:** Promise
- **Throws:** Error if uninstall fails

#### `window.showAppInstaller()`
- **Parameters:** None
- **Returns:** void
- **Effect:** Opens the installation modal UI

### App Object Structure

```javascript
{
  id: string,           // Icon or unique ID
  path: string,         // File system path (e.g., "apps/MyApp")
  jsFile: string,       // Main script file path
  entry: string,        // Entry function name
  label: string,        // Display name
  icon: string|html,    // Icon (emoji or <img> tag)
  startbtnid: string,   // Optional button ID
  scriptLoaded: boolean,// Has script been loaded?
  loadError: string,    // Error message if load failed
  _scriptElement: DOM,  // Script DOM element
  _addedGlobals: array  // Global variables added by script
}
```

## Error Handling

The system includes comprehensive error handling:

- **Network errors** when downloading from URLs
- **File parsing errors** with detailed messages
- **Installation conflicts** (duplicate app names)
- **Script loading failures** with error tracking

All errors are logged to console with appropriate prefix and displayed in the UI when available.

## Performance Notes

- Scripts are loaded on-demand (when grid renders or app launches)
- Global capture uses staggered timeouts to minimize performance impact
- App polling runs at 7-second intervals (configurable via `setInterval`)
- Installation operations are queued to prevent race conditions

## Compatibility

- Modern browsers (ES6+)
- Requires `filePost()` server endpoint for file operations
- Works with the testcafe-hammerhead proxy system
- Compatible with both light and dark themes

## Troubleshooting

### App not appearing after installation
- Check browser console for `[INSTALLER]` logs
- Verify the `app.txt` metadata file was created
- Restart the app or wait for next poll cycle (7 seconds)

### Script not loading
- Check `[APP LOADER]` logs in console
- Verify script syntax is valid JavaScript
- Check the `app.loadError` property on the app object

### Uninstall fails
- Check server logs for file system errors
- Verify file system permissions
- Check `[INSTALLER]` console logs

## Future Enhancements

- [ ] ZIP file extraction support (requires JSZip)
- [ ] App store/marketplace integration
- [ ] App signing and verification
- [ ] Dependency management for apps
- [ ] App settings/preferences UI
- [ ] App permissions system
