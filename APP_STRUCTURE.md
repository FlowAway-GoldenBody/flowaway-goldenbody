# App Structure Documentation

This document describes the standard structure and conventions for creating apps in the Rammerhead desktop environment.

## Directory Structure

Each app should have the following structure:

```
appName/
├── appName.js          # Main app implementation
├── entry.json          # App metadata and configuration
├── icon.txt            # App icon emoji or encoded image
└── [other resources]   # CSS, data files, etc.
```

## Entry.json Configuration

The `entry.json` file defines metadata and integration points for an app. All fields are required.

### Fields

| Field | Type | Description |
|-------|------|-------------|
| `name` | string | Internal app identifier (matches app directory name, no spaces). Used in selectors and class names. |
| `label` | string | Human-readable app name displayed in UI (e.g., "File Explorer", "Terminal"). |
| `startbtnid` | string | DOM element ID for the start menu button that launches this app. Convention: `{name}app`. |
| `cmf` | string | Name of the main context menu function (e.g., `fileExplorerContextMenu`). This handles right-click menus and app management. |
| `cmfl1` | string | Name of the L1 (level 1) context menu handler function. Typically calls `cmf` with `needRemove=false`. Convention: `{cmf}HandlerL1` or `{cmf}contextmenuhandlerL1`. |
| `globalvarobject` | string | Name of the global object storing app state (e.g., `explorerGlobals`, `terminalGlobals`). Convention: `{name}Globals`. |
| `allapparray` | string | Property name within `globalvarobject` that stores array of all running instances. Convention: `all{Name}s` (e.g., `allExplorers`, `allTerminals`). |
| `appGlobalVarStrings` | array | List of all properties that should be preserved in the global object. Used for state persistence and cleanup. Typically includes: buttons array, menu reference, instances array, instance counter ID, and any app-specific persistent data. |

### Example

```json
{
  "name": "fileExplorer",
  "label": "File Explorer",
  "startbtnid": "explorerapp",
  "cmf": "fileExplorerContextMenu",
  "cmfl1": "fileExplorercontextmenuhandlerL1",
  "globalvarobject": "explorerGlobals",
  "allapparray": "allExplorers",
  "appGlobalVarStrings": [
    "explorerButtons",
    "explorermenu",
    "allExplorers",
    "explorerId",
    "clipboard"
  ]
}
```

## Global Variables Pattern

Apps should initialize a global object at the start to manage state:

```javascript
window.appNameGlobals = {};
appNameGlobals.allAppNames = [];     // Array of all instances
appNameGlobals.appNameId = 0;        // Counter for unique instance IDs
appNameGlobals.appNameButtons = []; // Taskbar buttons
appNameGlobals.appNameMenu = null;   // Context menu reference
// ... other app-specific state
```

### Instance Counter

Each app instance gets a unique ID:

```javascript
appNameGlobals.appNameId++;
root._appNameId = appNameGlobals.appNameId;  // or _goldenbodyId for compatibility
```

This ID is crucial for:
- Distinguishing between multiple instances of the same app
- Scoping event listeners and data to individual instances
- Managing window state and focus

## Root Element and Dataset

Every app creates a root container element with standardized attributes:

```javascript
const root = document.createElement("div");
root.className = "app-root";
root.dataset.appId = "fileExplorer";  // From entry.json 'name' field
root._goldenbodyId = explorerGlobals.explorerId;  // Unique instance ID
root.classList.add("fileExplorer");   // App name for styling
```

### Dataset Attributes

| Attribute | Value | Purpose |
|-----------|-------|---------|
| `data-appId` | app name | Identifies app type for styling, filtering, and routing |
| `data-title` | window title | Current window title (updated dynamically) |
| `data-fs-item` | "true" | (fileExplorer only) Marks elements as file system items for click handling |
| `data-index` | number | (fileExplorer only) Index of item in current view for multi-select |
| `data-isFolder` | boolean | (fileExplorer only) Whether item is folder or file |

## Event Listeners

Apps should implement standardized event listeners on the root element:

### Click Event Listener

Handles click events at the app instance level:

```javascript
// After window initialization, add a click listener on root
root.addEventListener("click", (e) => {
  // App-specific click handler can be implemented here
  // Examples:
  // - fileExplorer: Deselect items when clicking outside
  // - textEditor: Handle focus/unfocus behavior
  // - Terminal: Handle input focus
});
```

**Important**: The listener should be on `root`, not `document`, to scope interactions to the specific app instance.

### Custom Events

Apps can dispatch custom events for inter-app communication:

```javascript
// Dispatch event when app state changes
const event = new Event(root.dataset.appId + root._goldenbodyId);
root.dispatchEvent(event);
```

### Window-level Listeners

For dragging, resizing, and other window-level interactions:

```javascript
// Use window listeners for cross-app interactions
window.addEventListener("mousemove", (e) => {
  if (!dragging) return;
  // Handle dragging logic
});
```

## Context Menu (Right-click Handler)

Apps must implement a context menu function for the taskbar right-click:

```javascript
appNameGlobals.appNameContextMenu = function (e, needRemove = true) {
  e.preventDefault();
  
  // Remove any existing menus
  document.querySelectorAll(".app-menu").forEach((m) => m.remove());
  
  const menu = document.createElement("div");
  menu.className = "app-menu";
  // ... menu items including:
  // - Close all instances
  // - Hide all instances
  // - Show all instances
  // - New window
  // - Remove/Add from taskbar
  // - List all open windows
};

// L1 handler (used from taskbar)
appNameGlobals.appNamecontextmenuhandlerL1 = function (e) {
  appNameGlobals.appNameContextMenu(e, false);  // needRemove = false
};
```

### Menu Item Conventions

- **Close all**: Remove all instances and clear the instances array
- **Hide all**: Set `display: "none"` on all root elements
- **Show all**: Set `display: "block"` and bring to front
- **New window**: Create new instance with `appName(50, 50)` (x, y position)
- **Remove from taskbar**: Call `removeTaskButton()` and `saveTaskButtons()`
- **Add to taskbar**: Call `addTaskButton(icon, constructor, contextMenu, globalObject)`
- **Window list**: Show all open instances, click to bring to front

## Window Management

### Maximization and Restoration

```javascript
let isMaximized = false;
let savedBounds = {
  left: root.style.left,
  top: root.style.top,
  width: root.style.width,
  height: root.style.height,
};

function getBounds() {
  return {
    left: root.style.left,
    top: root.style.top,
    width: root.style.width,
    height: root.style.height,
  };
}

function applyBounds(bounds) {
  root.style.left = bounds.left;
  root.style.top = bounds.top;
  root.style.width = bounds.width;
  root.style.height = bounds.height;
}

function maximizeWindow() {
  savedBounds = getBounds();
  root.style.left = "0";
  root.style.top = "0";
  root.style.width = "100%";
  root.style.height = !data.autohidetaskbar ? `calc(100% - 60px)` : "100%";
  isMaximized = true;
}

function restoreWindow(useOriginalBounds = true) {
  if (useOriginalBounds && savedBounds) {
    applyBounds(savedBounds);
  }
  isMaximized = false;
}
```

### Minimization

```javascript
btnMin.addEventListener("click", () => {
  savedBounds = getBounds();
  root.style.display = "none";
  _isMinimized = true;
});
```

## Draggable and Resizable Implementation

```javascript
function makeDraggableResizable(el, topBar, btnMax) {
  // Dragging logic
  topBar.addEventListener("mousedown", (ev) => {
    dragging = true;
    startX = ev.clientX;
    // ... setup drag state
  });
  
  window.addEventListener("mousemove", (ev) => {
    if (!dragging) return;
    // ... update position
  });
  
  window.addEventListener("mouseup", () => {
    dragging = false;
  });
  
  // Resizing logic using pointer events
  el.addEventListener("pointermove", (e) => {
    // ... resize cursor logic
  });
  
  el.addEventListener("pointerdown", (e) => {
    // ... start resize
  });
  
  el.addEventListener("pointermove", (e) => {
    if (!active) return;
    // ... perform resize
  });
  
  el.addEventListener("pointerup", () => {
    // ... cleanup
  });
}
```

## Return Value

Each app should return an object with instance metadata:

```javascript
return {
  rootElement: root,
  btnMax,
  _isMinimized,
  isMaximized,
  getBounds,
  applyBounds,
  appNameId: appNameGlobals.appNameId,
  // App-specific properties
};
```

## Instance Tracking

After initialization, store the instance in the global array:

```javascript
appNameGlobals.allAppNames.push({
  rootElement: root,
  btnMax,
  _isMinimized,
  isMaximized,
  getBounds,
  applyBounds,
  appNameId: appNameGlobals.appNameId,
  // ... any other tracking data
});
```

## Styling

### CSS Classes

- `.app-root` - Main app window container
- `.[appName]` - App-specific styling class (matches `dataset.appId`)
- `.appTopBar` - Top bar with window controls
- `.app-menu` - Context menu styling
- `.dark` / `.light` - Theme classes

### Key Styles

```css
.app-root {
  position: fixed;
  box-shadow: 0 12px 40px rgba(0,0,0,0.35);
  border-radius: 10px;
  overflow: hidden;
  display: flex;
  flex-direction: column;
  font-family: sans-serif;
  z-index: 1000;
}
```

## Initialization Pattern

Standard app initialization sequence:

1. Create global object
2. Initialize app function
3. Increment instance counter
4. Create and style root element
5. Set `dataset.appId` and `_goldenbodyId`
6. Append to document
7. Create UI elements (topbar, content, etc.)
8. Add event listeners (drag, resize, click, etc.)
9. Implement context menu
10. Push to instances array
11. Apply styles
12. Return instance object

## Best Practices

1. **Instance Scoping**: Always scope state to individual instances. Use `root._appNameId` to distinguish between multiple windows.

2. **Event Delegation**: Use event listeners on `root` for app-specific interactions, not on `document`.

3. **Cleanup**: Implement proper cleanup in close handlers to remove DOM elements and clear references.

4. **Z-Index Management**: Use the `bringToFront()` utility to manage window stacking order.

5. **Bounds Persistence**: Save and restore window bounds when maximizing/restoring/dragging.

6. **Global Object Usage**: Only store truly global state in the global object. Instance-specific data should be on the root element or in closure scope.

7. **Consistent Naming**: Follow conventions for global objects, functions, and array names to keep code readable and maintainable.

8. **Error Handling**: Wrap operations that access app state in try-catch to prevent one window from breaking others.

9. **Keyboard Shortcuts**: Implement keyboard listeners for common operations (Ctrl+S for save, Ctrl+N for new, etc.).

10. **Theme Support**: Listen to theme changes and update UI accordingly. Dispatch `styleapplied` event when changes occur.

## Example App Integration

Here's a minimal example showing all key components:

**entry.json:**
```json
{
  "name": "myapp",
  "label": "My App",
  "startbtnid": "myapp",
  "cmf": "myappContextMenu",
  "cmfl1": "myappcontextmenuhandlerL1",
  "globalvarobject": "myappGlobals",
  "allapparray": "allMyapps",
  "appGlobalVarStrings": ["myappButtons", "myappMenu", "allMyapps", "myappId"]
}
```

**myapp.js:**
```javascript
window.myappGlobals = {};
myappGlobals.allMyapps = [];
myappGlobals.myappId = 0;
myappGlobals.myappButtons = [];
myappGlobals.myappMenu = null;

myapp = function (posX = 50, posY = 50) {
  let isMaximized = false;
  let _isMinimized = false;
  
  const root = document.createElement("div");
  root.className = "app-root";
  root.dataset.appId = "myapp";
  Object.assign(root.style, {
    position: "fixed",
    top: posY + "px",
    left: posX + "px",
    width: "800px",
    height: "600px",
    boxShadow: "0 12px 40px rgba(0,0,0,0.35)",
    borderRadius: "10px",
  });
  
  root.classList.add("myapp");
  bringToFront(root);
  document.body.appendChild(root);
  
  myappGlobals.myappId++;
  root._goldenbodyId = myappGlobals.myappId;
  
  // ... create UI elements ...
  
  // Click listener
  root.addEventListener("click", (e) => {
    // App-specific click handling
  });
  
  myappGlobals.allMyapps.push({
    rootElement: root,
    _isMinimized,
    isMaximized,
    myappId: myappGlobals.myappId,
  });
  
  return {
    rootElement: root,
    _isMinimized,
    isMaximized,
    myappId: myappGlobals.myappId,
  };
};

myappGlobals.myappContextMenu = function (e, needRemove = true) {
  // ... context menu implementation ...
};

myappGlobals.myappcontextmenuhandlerL1 = function (e) {
  myappGlobals.myappContextMenu(e, false);
};
```

This structure ensures consistency across all apps in the Rammerhead environment and makes it easier for developers to create new apps.
