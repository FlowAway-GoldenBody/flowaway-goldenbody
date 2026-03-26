# Start Menu - Quick Start Guide

## What's New?

Your start menu is now **three in one**! Here's what you can do:

### The Three Views

```
┌─────────────────────────────────┐
│  Start Menu                     │
├─────────────────────────────────┤
│ [PINNED] [RECENT] [ALL APPS]   │  ← Click tabs to switch
├─────────────────────────────────┤
│                                 │
│  📌 Browser   📌 Terminal       │  ← Draggable icons (Pinned tab)
│                                 │
│  🔄 Add apps via right-click   │
│                                 │
├─────────────────────────────────┤
│ 🛜  [Sign Out]    🔋 ⏰        │
└─────────────────────────────────┘
```

### Features at a Glance

#### 1. Pinned Apps Tab
- Your favorite apps that you've specifically pinned
- **Drag** apps to reorder them
- **Right-click** → "Remove from Start Menu" to unpin
- Each time you reorder, it's automatically saved

#### 2. Recent Apps Tab  
- Auto-populates with your 5 most recently launched apps
- Appears in order of most recent first
- Empty when you first start
- Track your workflow at a glance

#### 3. All Apps Tab
- Complete list of all available applications
- **Right-click** → "Pin to Start Menu" to add favorites
- Great for discovering and organizing apps

### Example Workflow

1. **First time using it?**
   - Go to "All Apps" tab
   - Find an app you like
   - Right-click → "Pin to Start Menu"
   - App moves to "Pinned" tab
   - Drag it to your preferred position

2. **After using apps:**
   - Check "Recent" tab to see what you've used
   - Pin frequently used ones
   - Your pinned order is remembered forever

3. **Organizing your start menu:**
   - Switch to "Pinned" tab
   - Drag apps to arrange them
   - Context: Drag updates saved instantly
   - Open menu anytime - your layout is preserved

### Right-Click Context Menu

```
When you right-click an app:

From "All Apps" or "Recent":
├─ 📌 Pin to Start Menu

From "Pinned":
└─ ❌ Remove from Start Menu
```

### Visual Feedback

- **Hovering**: Apps scale up slightly
- **Dragging**: Icon becomes semi-transparent
- **Drag over target**: Blue dashed border appears
- **Dark/Light theme**: Adapts to your system theme

## Where's the Config?

All your preferences are saved in:
```
/apps/startMenu-config.json
```

This file tracks:
- Which apps are pinned
- The order of pinned apps
- Your 5 recent apps
- Your display preferences

**Don't edit manually** - the system updates it automatically as you interact with the menu.

## Tips & Tricks

✅ **Do This:**
- Organize pinned apps by frequency of use
- Check Recent tab to see your usage patterns
- Right-click to quickly manage your favorites

❌ **Avoid This:**
- Manually editing the config JSON (let the UI do it)
- Opening the menu without checking Recent for a quick launch

## Realistic Features

This start menu now behaves like a real OS:
- ✓ Persistent configuration
- ✓ Recents tracking
- ✓ Drag-and-drop reordering  
- ✓ Context menus
- ✓ Quick access to all apps
- ✓ Visual feedback on interactions
- ✓ Modern, clean interface

---

**Pro Tip**: Pin your 5-7 most-used apps for instant access. Use All Apps when you need something less frequent!
