# Start Menu Architecture Diagram

## System Overview

```
┌─────────────────────────────────────────────────────────────┐
│                    Browser (Client-Side)                   │
│                                                             │
│  ┌───────────────────────────────────────────────────────┐ │
│  │          START MENU UI (flowaway.js)                │ │
│  │                                                     │ │
│  │  ┌──────────────────────────────────────────────┐  │ │
│  │  │ Tabs: [Pinned] [Recent] [All Apps]         │  │ │
│  │  └──────────────────────────────────────────────┘  │ │
│  │                                                     │ │
│  │  ┌──────────────────────────────────────────────┐  │ │
│  │  │ Grid View (4 columns)                       │  │ │
│  │  │ ┌─────────────────────────────────────────┐ │  │ │
│  │  │ │ App Tile (draggable, clickable, etc)   │ │  │ │
│  │  │ │ • Click → Launch + addToRecents()      │ │  │ │
│  │  │ │ • Drag → Reorder + saveConfig()        │ │  │ │
│  │  │ │ • RightClick → showContextMenu()       │ │  │ │
│  │  │ └─────────────────────────────────────────┘ │  │ │
│  │  └──────────────────────────────────────────────┘  │ │
│  │                                                     │ │
│  │  Context Menu (On Right-Click)                     │ │
│  │  ├─ 📌 Pin to Start Menu                         │ │
│  │  └─ ❌ Remove from Start Menu                     │ │
│  │                                                     │ │
│  └───────────────────────────────────────────────────────┘ │
│                                                             │
│  ┌───────────────────────────────────────────────────────┐ │
│  │ Core Functions                                        │ │
│  ├─ loadStartMenuConfig()    → Load JSON from VFS      │ │
│  ├─ saveStartMenuConfig()    → Save JSON to server     │ │
│  ├─ renderPinnedAppsGrid()   → Render pinned apps      │ │
│  ├─ renderRecentsGrid()      → Render recent apps      │ │
│  ├─ renderAllAppsGrid()      → Render all apps         │ │
│  ├─ createAppTile()          → Create single tile      │ │
│  ├─ addToRecents()           → Track app usage         │ │
│  └─ showAppContextMenu()     → Show right-click menu   │ │
│                                                             │
└─────────────────────────────────────────────────────────────┘
                           ↓
                    (HTTP POST)
                           ↓
┌─────────────────────────────────────────────────────────────┐
│               Node.js Server (Backend)                      │
│                                                             │
│  ┌───────────────────────────────────────────────────────┐ │
│  │          Fetch Files Handler                        │ │
│  │          (src/server/fetchfiles.js)                │ │
│  │                                                     │ │
│  │  if (data.action === 'saveStartMenuConfig')        │ │
│  │      └─ Parse JSON                                 │ │
│  │      └─ Validate user auth                         │ │
│  │      └─ Write to user's file system                │ │
│  │      └─ Return success                             │ │
│  │                                                     │ │
│  └───────────────────────────────────────────────────────┘ │
│                                                             │
└─────────────────────────────────────────────────────────────┘
                           ↓
┌─────────────────────────────────────────────────────────────┐
│            File System (Persistent Storage)                │
│                                                             │
│  /users/<username>/root/                                  │
│  └─ startmenuAppConfig/                                         │
│     └─ startMenu-config.json                             │
│        {                                                  │
│          "pinnedApps": ["browser", "terminal"],          │
│          "recents": ["textEditor", "fileExplorer"],      │
│          ...                                             │
│        }                                                  │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

## Data Flow Sequence Diagrams

### Scenario 1: Pin an App

```
User Right-Clicks App
        │
        ↓
showAppContextMenu()
        │
        ├→ Create menu UI
        └→ Add click handlers
        │
    User Clicks "Pin to Start Menu"
        │
        ↓
Click Handler Executes
        │
        ├→ Get app ID
        ├→ Update window._startMenuConfig.pinnedApps
        └→ Call saveStartMenuConfig()
        │
        ↓
saveStartMenuConfig()
        │
        ├→ Stringify JSON
        └→ POST to server (action: 'saveStartMenuConfig')
        │
        ↓
Server Handler
        │
        ├→ Authenticate user
        ├→ Extract config JSON
        ├→ Write to /apps/startMenu-config.json
        └→ Return success
        │
        ↓
Client Receives Response
        │
        └→ renderPinnedAppsGrid() [refresh display]
```

### Scenario 2: Reorder Apps (Drag-Drop)

```
User Drags App Icon
        │
        ↓
dragstart Event
        │
        └→ Store appId in dataTransfer
        │
    User Hovers Over Target
        │
        ↓
dragover Event
        │
        ├→ Add .drag-over class (blue border)
        └→ Set dropEffect = 'move'
        │
    User Drops on Target
        │
        ↓
drop Event
        │
        ├→ Get dragged appId from dataTransfer
        ├→ Get target appId from element
        ├→ Find indices in pinnedApps array
        ├→ Splice and reorder array
        ├→ Update window._startMenuConfig
        └→ Call saveStartMenuConfig()
        │
        ↓
Server Saves New Order
        │
        └→ Config file updated with new order
```

### Scenario 3: Launch App (Track in Recents)

```
User Clicks App Tile
        │
        ↓
Click Handler Executes
        │
        ├→ Call addToRecents(appId)
        │   │
        │   ├→ Get recents array
        │   ├→ Remove appId if exists
        │   ├→ Insert at front [0]
        │   ├→ Keep max 5 items
        │   └→ Call saveStartMenuConfig()
        │
        ├→ Call launchApp(appId)
        │   └→ Open the app window
        │
        └→ Close start menu
```

## State Management

```
window._startMenuConfig Object
│
├─ pinnedApps: string[]
│  └─ Order determined by array index
│
├─ recents: string[]
│  └─ [0] = most recent, [4] = oldest
│
├─ hiddenApps: string[]
│  └─ Reserved for future use
│
├─ maxRecents: number
│  └─ Default: 5
│
├─ displayMode: string
│  └─ 'grid' | 'list'
│
└─ gridColumns: number
   └─ Default: 4
```

## CSS Cascade

```
Global Styles
        ↓
.startMenu (container)
        ├─ .startMenuTabs
        │  ├─ .startMenuTab
        │  └─ .startMenuTab.active
        │
        ├─ .startMenuBody
        │  └─ .tabSection [id="appsGrid"|"recentsGrid"|"allAppsGrid"]
        │     ├─ .app (grid item)
        │     │  ├─ .app.dragging (opacity: 0.5)
        │     │  └─ .app.drag-over (dashed border)
        │     └─ .app:hover (scale: 1.05)
        │
        └─ .statusBar
           ├─ .statusLeft
           └─ .statusRight

.app-context-menu (fixed position)
   └─ .context-menu-item
      └─ .context-menu-item.danger
```

## Event Handlers Hierarchy

```
startMenu
├─ Tab Buttons
│  └─ click → switchTab(tabName)
│
├─ App Grid
│  └─ .app (delegated via createAppTile)
│     ├─ click → addToRecents() + launchApp()
│     ├─ contextmenu → showAppContextMenu()
│     ├─ dragstart → Store appId, add .dragging
│     ├─ dragover → Add .drag-over
│     ├─ dragleave → Remove .drag-over
│     └─ drop → Reorder + saveConfig()
│
└─ Context Menu
   └─ .context-menu-item
      └─ click → pinApp() | unpinApp()

document
└─ click (outside menu checks)
   └─ Close context menu if clicked outside
```

---

This architecture ensures a real, responsive start menu that feels like a native OS experience!
