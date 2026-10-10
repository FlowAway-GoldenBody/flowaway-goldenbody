"use strict";

(async function () {
  if (!window.protectedGlobals) return;

  const DESKTOP_DIR = "/desktop";
  const LAYER_ID = "desktop-shortcuts-layer";
  const MENU_ID = "desktop-shortcut-context-menu";

  const GRID_COLUMNS = 12;
  const GRID_ROWS = 6;
  const MAX_SHORTCUTS = GRID_COLUMNS * GRID_ROWS;
  const SHORTCUT_WIDTH = 84;
  const SHORTCUT_HEIGHT = 96;

  window.protectedGlobals.shortcuts = Array.isArray(window.protectedGlobals.shortcuts) ? window.protectedGlobals.shortcuts : [];

  function safeNumber(value, fallback = 0) {
    const num = Number(value);
    return Number.isFinite(num) ? num : fallback;
  }

  function clamp(value, min, max) {
    return Math.min(Math.max(value, min), max);
  }

  function normalizeShortcutPath(value) {
    return String(value || "").replace(/\\/g, "/").trim();
  }

  function getDesktopBounds() {
    const taskbarHeight = Number(window.protectedGlobals.currentTaskbarHeight || window.protectedGlobals.taskbar?.offsetHeight || 60);
    const taskbarOnTop = !!(window.protectedGlobals.data && window.protectedGlobals.data.taskbarOnTop);

    return {
      taskbarHeight,
      top: taskbarOnTop ? taskbarHeight : 0,
      bottom: taskbarOnTop ? 0 : taskbarHeight,
      width: window.innerWidth,
      height: Math.max(200, window.innerHeight - taskbarHeight),
    };
  }

  function normalizeShortcutPosition(value) {
    const num = Number(value);
    return Number.isFinite(num) ? clamp(num, 0, 100) : 0;
  }

  function getShortcutGridSlots() {
    const slots = [];

    for (let row = 0; row < GRID_ROWS; row++) {
      for (let col = 0; col < GRID_COLUMNS; col++) {
        slots.push({
          x: ((col + 0.5) / GRID_COLUMNS) * 100,
          y: ((row + 0.5) / GRID_ROWS) * 100,
          row,
          col,
        });
      }
    }

    return slots;
  }

  function getGridSlotIndexForPoint(xPct, yPct) {
    const currentX = normalizeShortcutPosition(xPct);
    const currentY = normalizeShortcutPosition(yPct);
    const slots = getShortcutGridSlots();

    let bestIndex = 0;
    let bestDistance = Number.POSITIVE_INFINITY;

    for (let i = 0; i < slots.length; i++) {
      const slot = slots[i];
      const distance = Math.hypot(currentX - slot.x, currentY - slot.y);

      if (distance < bestDistance) {
        bestDistance = distance;
        bestIndex = i;
      }
    }

    return bestIndex;
  }

  function getShortcutIdentityIds(shortcut) {
    if (!shortcut || !shortcut.id) return [];
    return [shortcut.id];
  }

  function normalizeShortcut(raw) {
    if (!raw || typeof raw !== "object") return null;

    const path = normalizeShortcutPath(raw.path);
    const type = String(raw.type || "").toLowerCase();

    let finalType = type;

    if (!["app", "file", "folder"].includes(finalType)) {
      if (raw.appId || path.indexOf("/systemfiles/runtime/apps/") === 0) {
        finalType = "app";
      } else if (path.endsWith("/")) {
        finalType = "folder";
      } else {
        finalType = path.includes(".") ? "file" : "folder";
      }
    }

    const label = String(raw.label || raw.appId || "").trim();
    const item = {
      id: String(raw.id || raw.appId || path || label || `shortcut-${crypto.randomUUID()}`).trim() || `shortcut-${crypto.randomUUID()}`,
      type: finalType,
      label,
      path,
      appId: String(raw.appId || raw.id || "").trim(),
      name: String(raw.name || label).trim(),
      x: safeNumber(raw.x, 24),
      y: safeNumber(raw.y, 24),
      fileName: String(raw.fileName || "").trim(),
    };

    if (finalType !== "app") {
      item.appId = "";
    } else if (!item.appId) {
      item.appId = item.id;
    }

    if (!item.path && finalType !== "app") return null;

    item.x = clamp(normalizeShortcutPosition(item.x), 0, 100);
    item.y = clamp(normalizeShortcutPosition(item.y), 0, 100);

    return item;
  }

  function findExistingShortcutMatch(entry) {
    const candidate = normalizeShortcut(entry);
    if (!candidate) return null;

    const candidateIds = new Set(getShortcutIdentityIds(candidate));

    return (window.protectedGlobals.shortcuts || []).find((existing) => {
      const normalized = normalizeShortcut(existing);
      return normalized && getShortcutIdentityIds(normalized).some((id) => candidateIds.has(id));
    });
  }

  function getNextShortcutPosition(existingItems = [], requestedIndex = 0, requestedX = null, requestedY = null) {
    const occupied = new Set();

    for (const entry of existingItems) {
      if (!entry) continue;
      const normalized = normalizeShortcut(entry) || entry;
      occupied.add(getGridSlotIndexForPoint(normalized.x, normalized.y));
    }

    const freePositions = getShortcutGridSlots().filter((slot, index) => !occupied.has(index));

    if (!freePositions.length) return null;

    const numericIndex = Number(requestedIndex);
    const targetIndex = Number.isFinite(numericIndex) ? Math.max(0, Math.min(Math.floor(numericIndex), freePositions.length - 1)) : 0;

    const requestedPosX = Number(requestedX);
    const requestedPosY = Number(requestedY);

    if (Number.isFinite(requestedPosX) && Number.isFinite(requestedPosY)) {
      let nearest = freePositions[targetIndex] || freePositions[0];
      let nearestDistance = Number.POSITIVE_INFINITY;

      for (const slot of freePositions) {
        const distance = Math.hypot(requestedPosX - slot.x, requestedPosY - slot.y);
        if (distance < nearestDistance) {
          nearestDistance = distance;
          nearest = slot;
        }
      }

      return nearest;
    }

    return freePositions[targetIndex] || freePositions[0];
  }


  function getShortcutThemePalette() {
    return {
      text: "#f8fafc",
      label: "rgb(88, 88, 88)",
      iconBg: "rgba(15, 23, 42, 0.46)",
      iconBorder: "rgba(255,255,255,0.12)",
      iconShadow: "rgba(0,0,0,0.18)",
    };
  }

  function applyShortcutThemeToNode(itemNode, labelNode, iconNode) {
    const palette = getShortcutThemePalette();

    if (itemNode) {
      itemNode.style.color = palette.label;
      itemNode.style.textShadow = "0 1px 2px rgba(0,0,0,0.16)";
    }

    if (labelNode) labelNode.style.color = palette.label;

    if (iconNode) {
      iconNode.style.color = palette.text;
      iconNode.style.background = palette.iconBg;
      iconNode.style.border = `1px solid ${palette.iconBorder}`;
      iconNode.style.boxShadow = `0 8px 18px ${palette.iconShadow}`;
    }
  }

  function renderShortcutIcon(shortcut) {
    const palette = getShortcutThemePalette();
    const iconWrap = document.createElement("div");

    iconWrap.className = "desktop-shortcut-icon";

    Object.assign(iconWrap.style, {
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      width: "42px",
      height: "42px",
      borderRadius: "12px",
      background: palette.iconBg,
      backdropFilter: "blur(8px)",
      border: `1px solid ${palette.iconBorder}`,
      boxShadow: `0 8px 18px ${palette.iconShadow}`,
      color: palette.text,
      fontWeight: "700",
      fontSize: "18px",
      userSelect: "none",
    });

    if (shortcut.type === "app") {
      const app = (window.protectedGlobals.apps || []).find((candidate) => candidate.id === shortcut.appId);

      if (app && app.icon) {
        if (app.pngEnabled) {
          const img = document.createElement("img");
          img.src = `data:image/png;base64,${app.icon}`;
          img.alt = shortcut.label;
          img.draggable = false;
          img.addEventListener("dragstart", (ev) => ev.preventDefault());

          Object.assign(img.style, {
            width: "32px",
            height: "32px",
            objectFit: "contain",
            borderRadius: "8px",
            userSelect: "none",
            webkitUserDrag: "none",
            pointerEvents: "none",
          });

          iconWrap.appendChild(img);
          return iconWrap;
        }

        const rawIcon = app.icon;

        if (!rawIcon) {
          iconWrap.textContent = (shortcut.label || "A").slice(0, 3).toUpperCase();
          return iconWrap;
        }

        const frag = document.createElement("div");
        frag.innerHTML = rawIcon;

        frag.querySelectorAll("img,svg").forEach((node) => {
          node.draggable = false;
          node.addEventListener("dragstart", (ev) => ev.preventDefault());
          node.style.pointerEvents = "none";
          node.setAttribute("aria-hidden", "true");
        });

        Object.assign(frag.style, {
          width: "32px",
          height: "32px",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          userSelect: "none",
          pointerEvents: "none",
        });

        iconWrap.appendChild(frag);
        return iconWrap;
      }

      iconWrap.textContent = (shortcut.label || "A").slice(0, 3).toUpperCase();
      return iconWrap;
    }

    if (shortcut.type === "folder") {
      const svg = (window.protectedGlobals.fileIconSet && window.protectedGlobals.fileIconSet.folder) || "";
      const frag = document.createElement("div");

      frag.style.color = palette.text;
      frag.innerHTML = svg;

      frag.querySelectorAll("img,svg").forEach((node) => {
        node.draggable = false;
        node.addEventListener("dragstart", (ev) => ev.preventDefault());
        node.style.pointerEvents = "none";
        node.setAttribute("aria-hidden", "true");
      });

      Object.assign(frag.style, {
        width: "36px",
        height: "36px",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        pointerEvents: "none",
      });

      iconWrap.appendChild(frag);
      return iconWrap;
    }

    const svgFile = (window.protectedGlobals.fileIconSet && window.protectedGlobals.fileIconSet.file) || "";
    const fragFile = document.createElement("div");

    fragFile.style.color = palette.text;
    fragFile.innerHTML = svgFile;

    Object.assign(fragFile.style, {
      width: "36px",
      height: "36px",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      pointerEvents: "none",
    });

    fragFile.querySelectorAll("img,svg").forEach((node) => {
      node.style.pointerEvents = "none";
      node.draggable = false;
      node.setAttribute("aria-hidden", "true");
    });

    iconWrap.appendChild(fragFile);
    return iconWrap;
  }

  function getShortcutDeletePath(shortcut) {
    const fileName = String(shortcut.fileName || `shortcut-${crypto.randomUUID()}.json`).trim();
    return `${DESKTOP_DIR}/${fileName}`;
  }

  async function saveShortcutEntry(entry) {
    const shortcut = normalizeShortcut(entry);
    if (!shortcut) return null;

    const globalEntries = (window.protectedGlobals.shortcuts || []).map((item) => normalizeShortcut(item)).filter(Boolean);
    const existingIndex = globalEntries.findIndex((item) => item.id === shortcut.id);
    const previousShortcut = existingIndex !== -1 ? globalEntries[existingIndex] : null;
    const previousFileName = previousShortcut && previousShortcut.fileName ? previousShortcut.fileName : "";
    const preferredFileName = String(shortcut.fileName || previousFileName || `shortcut-${crypto.randomUUID()}.json`).trim() || `shortcut-${crypto.randomUUID()}.json`;

    const duplicateFileName = globalEntries.some((item) => item.id !== shortcut.id && item.fileName && item.fileName === preferredFileName);
    const fileName = duplicateFileName ? `shortcut-${crypto.randomUUID()}.json` : preferredFileName;

    shortcut.fileName = fileName;
    shortcut.id = shortcut.id || shortcut.appId || shortcut.label || shortcut.path || `shortcut-${crypto.randomUUID()}`;

    const occupiedSlotIndex = getGridSlotIndexForPoint(shortcut.x, shortcut.y);
    const collidingEntries = globalEntries.filter((item) => item.id !== shortcut.id && getGridSlotIndexForPoint(item.x, item.y) === occupiedSlotIndex);

    if (collidingEntries.length) {
      const updatedPosition = findNearestOpenSlotForPosition(
        shortcut.x,
        shortcut.y,
        getShortcutIdentityIds(shortcut),
        new Set(globalEntries.filter((item) => item.id !== shortcut.id).map((item) => getGridSlotIndexForPoint(item.x, item.y))),
      );

      if (updatedPosition) {
        shortcut.x = updatedPosition.x;
        shortcut.y = updatedPosition.y;
      }
    }

    const filePath = `${DESKTOP_DIR}/${fileName}`;
    const toWrite = { ...shortcut };

    if (toWrite.type !== "app") delete toWrite.appId;

    if (previousFileName && previousFileName !== fileName) {
      await window.protectedGlobals.DeleteFile(`${DESKTOP_DIR}/${previousFileName}`).catch(() => {});
    }

    await window.protectedGlobals.WriteFile(filePath, JSON.stringify(toWrite, null, 2), {
      text: true,
      replace: true,
    });

    const currentIndex = (window.protectedGlobals.shortcuts || []).findIndex((item) => item?.id === shortcut.id);

    if (currentIndex !== -1) {
      window.protectedGlobals.shortcuts[currentIndex] = shortcut;
    } else {
      window.protectedGlobals.shortcuts.push(shortcut);
    }

    updateShortcutLabelDom(shortcut);
    syncShortcutSelectionVisualState();
    renderDesktopShortcuts();
    return shortcut;
  }

  async function deleteShortcutById(shortcutId) {
    const target = (window.protectedGlobals.shortcuts || []).find((item) => item?.id === shortcutId);

    if (!target) return false;

    const filePath = getShortcutDeletePath(target);
    await window.protectedGlobals.DeleteFile(filePath).catch(() => {});

    const targetIds = new Set(getShortcutIdentityIds(target));
    const remainingSelection = (getDesktopShortcutSelection() || []).filter((id) => !targetIds.has(id));
    setDesktopShortcutSelection(remainingSelection);

    window.protectedGlobals.shortcuts = (window.protectedGlobals.shortcuts || []).filter((item) => item?.id !== target.id);

    const existingNode = Array.from(document.querySelectorAll(".desktop-shortcut-item")).find((node) => {
      if (!node || !node.dataset || !node.dataset.shortcutId) return false;
      return node.dataset.shortcutId === shortcutId || node.dataset.shortcutId === target.id;
    });

    if (existingNode) existingNode.remove();

    syncShortcutSelectionVisualState();
    return true;
  }

  function getShortcutLabel(shortcut) {
    if (shortcut.type === "app") {
      const app = (window.protectedGlobals.apps || []).find((c) => c.id === shortcut.appId);
      const customLabel = String(shortcut.label || shortcut.name || "").trim();

      if (customLabel) return customLabel;
      return (app && app.label) || "App";
    }

    return shortcut.label || shortcut.name || "Shortcut";
  }

  function getShortcutDisplayLabel(shortcut, fallback = "Shortcut") {
    const fullLabel = String(getShortcutLabel(shortcut) || fallback).trim() || fallback;
    return fullLabel.length > 25 ? `${fullLabel.slice(0, 25)}...` : fullLabel;
  }

  function isProtectedSensitiveFilePath(filePath) {
    const normalized = String(filePath || "").replace(/\\/g, "/").trim();
    const safePath = normalized.startsWith("/") ? normalized : `/${normalized}`;

    if (safePath === "/systemfiles/userprofile/jsApiKey.txt") return true;
    return /^\/systemfiles\/runtime\/apps\/[^/]+\/jskey\.txt$/i.test(safePath);
  }

  function getOpenWithApps(filePath) {
    const fileName = String(filePath || "").split("/").pop() || "";
    const ext = fileName.includes(".") ? fileName.slice(fileName.lastIndexOf(".")).toLowerCase() : "";

    return (window.protectedGlobals.apps || [])
      .filter(Boolean)
      .filter((app) => {
        const capability = Array.isArray(app.openfileCapability)
          ? app.openfileCapability
          : String(app.openfileCapability || "")
              .split(",")
              .map((part) => part.trim().toLowerCase())
              .filter(Boolean);

        if (!capability.length) return false;
        if (capability.includes("*")) return true;
        if (!ext) return false;

        return capability.includes(ext);
      })
      .filter((app) => {
        if (isProtectedSensitiveFilePath(filePath)) return app.requestAdminPerm === true;
        return true;
      })
      .map((app) => ({
        id: app.id || app.functionName || app.label,
        label: app.label || app.functionName || app.id || "App",
        functionName: app.functionName || app.id,
      }))
      .filter((app) => app.functionName);
  }

  function beginShortcutRename(shortcut) {
    const itemNode = Array.from(document.querySelectorAll(".desktop-shortcut-item")).find(
      (node) => node.dataset.shortcutId === shortcut.id,
    );

    if (!itemNode) return;

    const labelNode = itemNode.querySelector(".desktop-shortcut-label");
    if (!labelNode) return;

    const oldValue = getShortcutLabel(shortcut) || "Shortcut";
    const input = document.createElement("input");

    input.type = "text";
    input.value = oldValue;

    Object.assign(input.style, {
      width: "72px",
      fontSize: "11px",
      textAlign: "center",
      border: "1px solid rgba(15, 23, 42, 0.2)",
      borderRadius: "6px",
      padding: "2px 4px",
      lineHeight: "1.2",
      background: "rgba(255,255,255,0.9)",
      color: "#111827",
      outline: "none",
      boxSizing: "border-box",
    });

    let finished = false;

    const finishRename = () => {
      if (finished) return;
      finished = true;

      const nextValue = input.value.trim() || oldValue;
      const nextLabel = document.createElement("div");

      nextLabel.className = "desktop-shortcut-label";
      nextLabel.title = nextValue;
      nextLabel.textContent = getShortcutDisplayLabel({ ...shortcut, label: nextValue, name: nextValue });

      Object.assign(nextLabel.style, {
        fontSize: "11px",
        lineHeight: "1.2",
        textAlign: "center",
        width: "72px",
        minHeight: "26px",
        maxWidth: "72px",
        wordBreak: "break-word",
        overflowWrap: "anywhere",
        color: getShortcutThemePalette().label,
      });

      shortcut.label = nextValue;
      shortcut.name = nextValue;

      const match = (window.protectedGlobals.shortcuts || []).find((candidate) => candidate.id === shortcut.id);

      if (match) {
        match.label = nextValue;
        match.name = nextValue;
        match.fileName = match.fileName || shortcut.fileName || `shortcut-${crypto.randomUUID()}.json`;
      }

      input.replaceWith(nextLabel);
      updateShortcutLabelDom(shortcut);
      saveShortcutEntry(shortcut).catch(() => {});
    };

    input.addEventListener("blur", finishRename, { once: true });
    input.addEventListener("keydown", (event) => {
      if (event.key === "Enter") {
        event.preventDefault();
        finishRename();
      }

      if (event.key === "Escape") {
        event.preventDefault();

        if (!finished) {
          finished = true;
          input.replaceWith(labelNode);
        }
      }
    });

    itemNode.replaceChild(input, labelNode);
    input.focus();
    input.select();
  }

  function getDesktopShortcutSelection() {
    return Array.isArray(window.protectedGlobals.desktopShortcutSelection) ? window.protectedGlobals.desktopShortcutSelection : [];
  }

  function setDesktopShortcutSelection(ids) {
    window.protectedGlobals.desktopShortcutSelection = Array.isArray(ids) ? ids.filter(Boolean) : [];
  }

  function toggleDesktopShortcutSelection(targetId) {
    if (!targetId) return;

    const selected = getDesktopShortcutSelection();
    const alreadySelected = selected.includes(targetId);
    const nextSelected = alreadySelected ? selected.filter((id) => id !== targetId) : [...selected, targetId];

    setDesktopShortcutSelection(nextSelected);
  }

  function getSelectedShortcutEntries() {
    const selectedIds = getDesktopShortcutSelection();
    if (!selectedIds.length) return [];

    return (window.protectedGlobals.shortcuts || [])
      .map((shortcut) => normalizeShortcut(shortcut))
      .filter(Boolean)
      .filter((shortcut) => selectedIds.includes(shortcut.id));
  }

  function syncShortcutSelectionVisualState() {
    const selectedIds = new Set(getDesktopShortcutSelection());

    document.querySelectorAll(".desktop-shortcut-item").forEach((node) => {
      const selected = selectedIds.has(node.dataset.shortcutId);
      node.style.border = selected ? "1px solid rgba(59,130,246,0.75)" : "1px solid transparent";
      node.style.background = selected ? "rgba(96,165,250,0.14)" : "transparent";
    });
  }

  function updateShortcutLabelDom(shortcut) {
    const itemNode = Array.from(document.querySelectorAll(".desktop-shortcut-item")).find(
      (node) => node.dataset.shortcutId === shortcut.id,
    );

    if (!itemNode) return;

    const labelNode = itemNode.querySelector(".desktop-shortcut-label");
    if (!labelNode) return;

    const nextLabel = getShortcutLabel(shortcut) || "Shortcut";
    labelNode.title = nextLabel;
    labelNode.textContent = getShortcutDisplayLabel(shortcut);
  }

  function findNearestOpenSlotForPosition(targetX, targetY, ignoredIds = [], occupiedOverride = null) {
    const currentX = normalizeShortcutPosition(targetX);
    const currentY = normalizeShortcutPosition(targetY);
    const slots = getShortcutGridSlots();
    const occupied = occupiedOverride ? new Set(occupiedOverride) : new Set();

    if (!occupiedOverride) {
      for (const shortcut of window.protectedGlobals.shortcuts || []) {
        const normalized = normalizeShortcut(shortcut);
        if (!normalized) continue;
        if (getShortcutIdentityIds(normalized).some((id) => ignoredIds.includes(id))) continue;
        occupied.add(getGridSlotIndexForPoint(normalized.x, normalized.y));
      }
    }

    let best = null;
    let bestDistance = Number.POSITIVE_INFINITY;

    for (let i = 0; i < slots.length; i++) {
      if (occupied.has(i)) continue;

      const slot = slots[i];
      const slotDistance = Math.hypot(currentX - slot.x, currentY - slot.y);

      if (slotDistance < bestDistance) {
        bestDistance = slotDistance;
        best = slot;
      }
    }

    return best;
  }

  function createShortcutMenu(e, shortcut) {
    const existingMenu = document.getElementById(MENU_ID);
    if (existingMenu) existingMenu.remove();

    const selectedEntries = getSelectedShortcutEntries();
    const effectiveShortcut = selectedEntries.length > 1 ? selectedEntries[0] : shortcut;
    const selectedIds = selectedEntries.length > 1 ? selectedEntries.map((entry) => entry.id) : [shortcut.id];
    const menu = document.createElement("div");

    const closeMenu = () => {
      const activeMenu = document.getElementById(MENU_ID);
      if (activeMenu && activeMenu === menu) menu.remove();
      document.removeEventListener("pointerdown", pointerDownHandler);
    };

    const pointerDownHandler = (evt) => {
      if (!menu.contains(evt.target)) closeMenu();
    };

    menu.id = MENU_ID;

    Object.assign(menu.style, {
      position: "fixed",
      left: `${e.clientX}px`,
      top: `${e.clientY}px`,
      zIndex: 100003,
      minWidth: "180px",
      padding: "6px",
      borderRadius: "8px",
      background: window.protectedGlobals.data.dark ? "#1a1a1a" : "#ffffff",
      color: window.protectedGlobals.data.dark ? "#ffffff" : "#111111",
      border: window.protectedGlobals.data.dark ? "1px solid rgba(255,255,255,0.12)" : "1px solid rgba(0,0,0,0.12)",
      boxShadow: "0 10px 24px rgba(0,0,0,0.25)",
      fontFamily: "system-ui, -apple-system, sans-serif",
      fontSize: "13px",
    });

    const addItem = (label, action) => {
      const row = document.createElement("div");
      row.textContent = label;

      Object.assign(row.style, {
        padding: "6px 8px",
        cursor: "pointer",
        borderRadius: "6px",
        userSelect: "none",
      });

      row.addEventListener("mouseenter", () => {
        row.style.background = window.protectedGlobals.data.dark ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.05)";
      });

      row.addEventListener("mouseleave", () => {
        row.style.background = "transparent";
      });

      row.addEventListener("click", async () => {
        closeMenu();
        await action();
      });

      menu.appendChild(row);
    };

    if (selectedEntries.length > 1) {
      addItem("Show in File Explorer", () => {
        selectedEntries.forEach((entry) => {
          const targetPath = normalizeShortcutPath(entry.path) || "/";
          window.fileExplorer(targetPath);
        });
      });

      addItem("Remove Shortcuts", async () => {
        await Promise.all(selectedIds.map((id) => deleteShortcutById(id).catch(() => {})));
      });

      document.body.appendChild(menu);

      const menuRect = menu.getBoundingClientRect();
      const maxX = window.innerWidth - menuRect.width - 8;
      const maxY = window.innerHeight - menuRect.height - 8;

      menu.style.left = `${clamp(e.clientX, 8, maxX)}px`;
      menu.style.top = `${clamp(e.clientY, 8, maxY)}px`;
      document.addEventListener("pointerdown", pointerDownHandler);

      return;
    }

    if (effectiveShortcut.type === "app") {
      addItem("Open", async () => {
        const appId = effectiveShortcut.appId || effectiveShortcut.id;

        try {
          const app = window.protectedGlobals.apps.find((candidate) => candidate.id === appId);
          if (!app.headless) await window.protectedGlobals.launchApp(appId);
          else alert(`"${app.label}" is a background service app and cannot be launched directly.`);
        } catch (err) {
          console.warn("Failed to open desktop shortcut app", err);
        }
      });
    }

    addItem("Rename Shortcut", () => {
      beginShortcutRename(effectiveShortcut);
    });

    if (effectiveShortcut.path) {
      addItem("Show In File Explorer", () => {
        const targetPath = normalizeShortcutPath(effectiveShortcut.path) || "/";
        window.fileExplorer(targetPath);
      });

      addItem("Copy Path", async () => {
        const targetPath = normalizeShortcutPath(effectiveShortcut.path) || "/";

        try {
          navigator.clipboard.writeText(targetPath);
          return;
        } catch (err) {}

        try {
          const temp = document.createElement("textarea");
          temp.value = targetPath;
          temp.setAttribute("readonly", "");
          temp.style.position = "fixed";
          temp.style.opacity = "0";

          document.body.appendChild(temp);
          temp.select();
          document.execCommand("copy");
          temp.remove();
        } catch (err) {
          console.warn("Failed to copy shortcut path", err);
        }
      });
    }

    if (effectiveShortcut.type === "file" && effectiveShortcut.path) {
      const openWithApps = getOpenWithApps(effectiveShortcut.path);

      if (openWithApps.length) {
        const openWithRow = document.createElement("div");
        openWithRow.textContent = "Open with";

        Object.assign(openWithRow.style, {
          padding: "6px 8px",
          borderRadius: "6px",
          cursor: "pointer",
          userSelect: "none",
          position: "relative",
        });

        openWithRow.addEventListener("mouseenter", () => {
          openWithRow.style.background = window.protectedGlobals.data.dark ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.05)";
        });

        openWithRow.addEventListener("mouseleave", () => {
          openWithRow.style.background = "transparent";
        });

        const submenu = document.createElement("div");

        Object.assign(submenu.style, {
          position: "absolute",
          left: "calc(100% + 6px)",
          top: "0",
          minWidth: "170px",
          padding: "6px",
          borderRadius: "8px",
          background: window.protectedGlobals.data.dark ? "#1a1a1a" : "#ffffff",
          color: window.protectedGlobals.data.dark ? "#ffffff" : "#111111",
          border: window.protectedGlobals.data.dark ? "1px solid rgba(255,255,255,0.12)" : "1px solid rgba(0,0,0,0.12)",
          boxShadow: "0 10px 24px rgba(0,0,0,0.25)",
          display: "none",
          zIndex: 100004,
        });

        const placeSubmenu = () => {
          const rowRect = openWithRow.getBoundingClientRect();
          const rightOverflow = rowRect.right + 180 > window.innerWidth - 12;
          submenu.style.left = rightOverflow ? "-176px" : "calc(100% + 6px)";
        };

        let submenuShowTimer = null;
        let submenuHideTimer = null;

        const clearSubmenuTimers = () => {
          if (submenuShowTimer) clearTimeout(submenuShowTimer);
          if (submenuHideTimer) clearTimeout(submenuHideTimer);
          submenuShowTimer = null;
          submenuHideTimer = null;
        };

        const showSubmenu = () => {
          clearSubmenuTimers();
          submenuShowTimer = setTimeout(() => {
            submenu.style.display = "block";
          }, 120);
        };

        const hideSubmenu = () => {
          clearSubmenuTimers();
          submenuHideTimer = setTimeout(() => {
            submenu.style.display = "none";
          }, 180);
        };

        for (const app of openWithApps) {
          const appRow = document.createElement("div");
          appRow.textContent = app.label;

          Object.assign(appRow.style, {
            padding: "6px 8px",
            borderRadius: "6px",
            cursor: "pointer",
            userSelect: "none",
          });

          appRow.addEventListener("mouseenter", () => {
            appRow.style.background = window.protectedGlobals.data.dark ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.05)";
          });

          appRow.addEventListener("mouseleave", () => {
            appRow.style.background = "transparent";
          });

          appRow.addEventListener("click", async () => {
            closeMenu();

            const verify = await window.protectedGlobals.ReadFile("/systemfiles/userprofile/jsApiKey.txt", {
              text: true,
              direct: true,
            });

            window[app.functionName](effectiveShortcut.path, verify);
          });

          submenu.appendChild(appRow);
        }

        openWithRow.addEventListener("mouseenter", () => {
          placeSubmenu();
          showSubmenu();
        });

        openWithRow.addEventListener("mouseleave", () => {
          hideSubmenu();
        });

        submenu.addEventListener("mouseenter", () => {
          clearSubmenuTimers();
          submenu.style.display = "block";
        });

        submenu.addEventListener("mouseleave", () => {
          hideSubmenu();
        });

        openWithRow.appendChild(submenu);
        menu.appendChild(openWithRow);
      }
    }

    addItem("Remove Shortcut", async () => {
      await deleteShortcutById(effectiveShortcut.id).catch(() => {});
    });

    document.body.appendChild(menu);

    const menuRect = menu.getBoundingClientRect();
    const maxX = window.innerWidth - menuRect.width - 8;
    const maxY = window.innerHeight - menuRect.height - 8;

    menu.style.left = `${clamp(e.clientX, 8, maxX)}px`;
    menu.style.top = `${clamp(e.clientY, 8, maxY)}px`;

    document.addEventListener("pointerdown", pointerDownHandler);
  }

  function renderDesktopShortcuts() {
    if (!window.protectedGlobals.data) return;

    let layer = document.getElementById(LAYER_ID);

    if (!layer) {
      layer = document.createElement("div");
      layer.id = LAYER_ID;

      Object.assign(layer.style, {
        position: "fixed",
        left: "0",
        top: "0",
        width: "100vw",
        height: "100vh",
        pointerEvents: "none",
        zIndex: "0",
        overflow: "hidden",
      });

      document.body.appendChild(layer);
    }

    const bounds = getDesktopBounds();
    layer.style.top = `${bounds.top}px`;
    layer.style.bottom = `${bounds.bottom}px`;
    layer.style.left = "0";
    layer.style.right = "0";
    layer.style.width = "100vw";
    layer.style.height = `${bounds.height}px`;

    const items = (window.protectedGlobals.shortcuts || []).slice(0, MAX_SHORTCUTS);
    while (layer.firstChild) layer.removeChild(layer.firstChild);

    for (const shortcut of items) {
      const normalized = normalizeShortcut(shortcut);
      if (!normalized) continue;

      const item = document.createElement("div");
      item.className = "desktop-shortcut-item";
      item.dataset.shortcutId = normalized.id;

      const xPct = normalizeShortcutPosition(normalized.x);
      const yPct = normalizeShortcutPosition(normalized.y);
      const selected = getDesktopShortcutSelection().includes(normalized.id);

      Object.assign(item.style, {
        position: "absolute",
        left: `${xPct}%`,
        top: `${yPct}%`,
        width: `${SHORTCUT_WIDTH}px`,
        height: `${SHORTCUT_HEIGHT}px`,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "flex-start",
        gap: "4px",
        pointerEvents: "auto",
        cursor: "pointer",
        userSelect: "none",
        color: getShortcutThemePalette().label,
        textShadow: "0 1px 2px rgba(0,0,0,0.18)",
        transform: "translate(-50%, -50%)",
        padding: "6px 4px 4px",
        borderRadius: "10px",
        border: selected ? "1px solid rgba(59,130,246,0.75)" : "1px solid transparent",
        background: selected ? "rgba(96,165,250,0.14)" : "transparent",
        boxSizing: "border-box",
      });

      const iconNode = renderShortcutIcon(normalized);
      iconNode.style.marginTop = "0";
      item.appendChild(iconNode);

      const label = document.createElement("div");
      label.className = "desktop-shortcut-label";
      label.title = getShortcutLabel(normalized) || "";
      label.textContent = getShortcutDisplayLabel(normalized);

      Object.assign(label.style, {
        fontSize: "11px",
        lineHeight: "1.2",
        textAlign: "center",
        width: "72px",
        minHeight: "26px",
        maxWidth: "72px",
        wordBreak: "break-word",
        overflowWrap: "anywhere",
        color: getShortcutThemePalette().label,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
      });

      item.appendChild(label);
      applyShortcutThemeToNode(item, label, iconNode);

      item.addEventListener("contextmenu", (e) => {
        e.preventDefault();
        e.stopPropagation();

        const selected = getDesktopShortcutSelection();
        if (!selected.includes(normalized.id)) {
          setDesktopShortcutSelection([normalized.id]);
          window.protectedGlobals.desktopShortcutSelectionAnchor = normalized.id;
          syncShortcutSelectionVisualState();
        }

        createShortcutMenu(e, normalized);
      });

      item.addEventListener("dblclick", async () => {
        if (normalized.type === "app") {
          try {
            const app = window.protectedGlobals.apps.find((candidate) => candidate.id === normalized.appId);
            if (!app.headless) await window.protectedGlobals.launchApp(normalized.appId);
            else alert(`"${app.label}" is a background service app and cannot be launched directly.`);
          } catch (err) {
            console.warn("Failed to launch app shortcut", err);
          }
          return;
        }

        if ((normalized.type === "folder" || normalized.type === "file") && normalized.path) {
          window.fileExplorer(normalized.type === "file" ? normalized.path.split("/").slice(0, -1).join("/") || "/" : normalized.path);
        }
      });

      item.addEventListener("pointerdown", (e) => {
        if (e.button !== 0) return;

        if (e.ctrlKey || e.metaKey || e.shiftKey) {
          toggleDesktopShortcutSelection(normalized.id);
          window.protectedGlobals.desktopShortcutSelectionAnchor = normalized.id;
          syncShortcutSelectionVisualState();
          return;
        }

        setDesktopShortcutSelection([normalized.id]);
        syncShortcutSelectionVisualState();
        window.protectedGlobals.desktopShortcutSelectionAnchor = normalized.id;

        const startX = e.clientX;
        const startY = e.clientY;
        let started = false;
        const threshold = 8;

        const getPointerDesktopPercent = (clientX, clientY) => {
          const currentBounds = getDesktopBounds();
          const desktopY = clientY - currentBounds.top;

          return {
            x: clamp((clientX / Math.max(1, currentBounds.width)) * 100, 0, 100),
            y: clamp((desktopY / Math.max(1, currentBounds.height)) * 100, 0, 100),
          };
        };

        const drag = (moveEvent) => {
          const dx = moveEvent.clientX - startX;
          const dy = moveEvent.clientY - startY;

          if (!started) {
            if (Math.hypot(dx, dy) < threshold) return;
            started = true;

            try {
              item.setPointerCapture && item.setPointerCapture(e.pointerId);
            } catch (err) {}
          }

          const pointer = getPointerDesktopPercent(moveEvent.clientX, moveEvent.clientY);
          item.style.left = `${pointer.x}%`;
          item.style.top = `${pointer.y}%`;

          normalized.x = pointer.x;
          normalized.y = pointer.y;
        };

        const stop = async () => {
          document.removeEventListener("pointermove", drag);
          document.removeEventListener("pointerup", stop);
          document.removeEventListener("pointercancel", stop);

          try {
            item.releasePointerCapture && item.releasePointerCapture(e.pointerId);
          } catch (err) {}

          if (!started) return;

          const ignoredIds = getShortcutIdentityIds(normalized);
          const finalSlot = findNearestOpenSlotForPosition(normalized.x, normalized.y, ignoredIds);

          if (finalSlot) {
            normalized.x = finalSlot.x;
            normalized.y = finalSlot.y;
            item.style.left = `${finalSlot.x}%`;
            item.style.top = `${finalSlot.y}%`;
          }

          const match = (window.protectedGlobals.shortcuts || []).find((candidate) => candidate?.id === normalized.id);
          if (match) {
            match.x = normalized.x;
            match.y = normalized.y;
          }

          await saveShortcutEntry(normalized).catch(() => {});
        };

        document.addEventListener("pointermove", drag);
        document.addEventListener("pointercancel", stop);
        document.addEventListener("pointerup", stop, { once: true });
      });

      layer.appendChild(item);
    }
  }

  async function loadDesktopShortcuts() {
    try {
      const entries = await window.protectedGlobals.ReadFolder(DESKTOP_DIR).catch(() => []);
      const names = [];

      if (Array.isArray(entries)) {
        for (const e of entries) {
          if (!e) continue;

          if (typeof e === "string") {
            names.push(e);
            continue;
          }

          if (Array.isArray(e) && typeof e[0] === "string") {
            names.push(e[0]);
            continue;
          }

          if (typeof e === "object") {
            if (typeof e.name === "string") {
              names.push(e.name);
            } else if (typeof e.path === "string") {
              names.push(e.path.split("/").pop());
            }
          }
        }
      }

      const shortcutResults = await Promise.all(
        names.map(async (fileName) => {
          if (!fileName || !String(fileName).toLowerCase().endsWith(".json")) return null;

          const content = await window.protectedGlobals
            .ReadFile(`${DESKTOP_DIR}/${fileName}`, {
              text: true,
              direct: true,
            })
            .catch(() => null);

          if (!content) return null;

          try {
            const parsed = JSON.parse(content);
            const normalized = normalizeShortcut(parsed);
            if (!normalized) return null;

            normalized.fileName = fileName;
            return normalized;
          } catch (err) {
            console.warn("Failed to parse desktop shortcut JSON", fileName, err);
            return null;
          }
        }),
      );

      const dedupedShortcuts = [];
      const occupiedSlots = new Set();
      const seenIds = new Set();
      const seenFileNames = new Set();

      for (const shortcut of shortcutResults.filter(Boolean)) {
        if (seenIds.has(shortcut.id)) continue;
        if (shortcut.fileName && seenFileNames.has(shortcut.fileName)) continue;

        seenIds.add(shortcut.id);
        if (shortcut.fileName) seenFileNames.add(shortcut.fileName);

        const targetSlot = getGridSlotIndexForPoint(shortcut.x, shortcut.y);

        if (occupiedSlots.has(targetSlot)) {
          const fallbackPosition = findNearestOpenSlotForPosition(shortcut.x, shortcut.y, getShortcutIdentityIds(shortcut));
          if (fallbackPosition) {
            shortcut.x = fallbackPosition.x;
            shortcut.y = fallbackPosition.y;
          }
        }

        occupiedSlots.add(getGridSlotIndexForPoint(shortcut.x, shortcut.y));
        dedupedShortcuts.push(shortcut);
      }

      window.protectedGlobals.shortcuts = dedupedShortcuts.slice(0, MAX_SHORTCUTS);
    } catch (err) {
      alert("Could not load desktop shortcuts");
      window.protectedGlobals.shortcuts = [];
    }
  }

  window.protectedGlobals.createDesktopShortcut = async function (entry) {
    const shortcut = normalizeShortcut(entry);
    if (!shortcut) return null;

    const existingShortcut = findExistingShortcutMatch(shortcut);
    if (existingShortcut) {
      alert("A shortcut for this item already exists on the desktop.");
      return existingShortcut;
    }

    if ((window.protectedGlobals.shortcuts || []).length >= MAX_SHORTCUTS) {
      alert(`Shortcut limit reached: ${MAX_SHORTCUTS} total slots in the 12x6 desktop grid.`);
      return null;
    }

    const pos = getNextShortcutPosition(window.protectedGlobals.shortcuts || [], 0);
    if (!pos) {
      alert(`Shortcut limit reached: ${MAX_SHORTCUTS} total slots in the 12x6 desktop grid.`);
      return null;
    }

    shortcut.x = pos.x;
    shortcut.y = pos.y;
    shortcut.fileName = shortcut.fileName || `shortcut-${crypto.randomUUID()}.json`;

    return saveShortcutEntry(shortcut);
  };

  window.protectedGlobals.createDesktopShortcutForApp = async function (appMeta) {
    if (!appMeta || !appMeta.id) return null;

    const appId = appMeta.id;
    const existing = (window.protectedGlobals.shortcuts || []).find((shortcut) => shortcut.type === "app" && shortcut.appId === appId);

    if (existing) {
      alert("A desktop shortcut for this app already exists.");
      return existing;
    }

    return window.protectedGlobals.createDesktopShortcut({
      id: `${appId}`,
      appId,
      type: "app",
      label: appMeta.label || appId,
      name: appMeta.label || appId,
      path: appMeta.path || `/systemfiles/runtime/apps/${appMeta.folderName || appId}`,
    });
  };

  window.protectedGlobals.removeShortcutsForApp = async function (appId) {
    const matches = (window.protectedGlobals.shortcuts || []).filter((shortcut) => shortcut.type === "app" && shortcut.appId === appId);

    for (const match of matches) {
      await deleteShortcutById(match.id).catch(() => {});
    }

    return true;
  };

  window.protectedGlobals.updateDesktopShortcutLayerPosition = function updateDesktopShortcutLayerPosition() {
    const layer = document.getElementById(LAYER_ID);
    if (!layer) return;

    const { top, bottom, height } = getDesktopBounds();
    layer.style.top = `${top}px`;
    layer.style.bottom = `${bottom}px`;
    layer.style.height = `${height}px`;
  };

  window.addEventListener("resize", () => {
    window.protectedGlobals.updateDesktopShortcutLayerPosition();
  });

  document.addEventListener("pointerdown", (event) => {
    if (event.target && event.target.closest && event.target.closest(".desktop-shortcut-item")) return;

    if (getDesktopShortcutSelection().length > 0) {
      setDesktopShortcutSelection([]);
      syncShortcutSelectionVisualState();
    }
  });

  if (document.readyState === "loading") {
    document.addEventListener(
      "DOMContentLoaded",
      async () => {
        await loadDesktopShortcuts();
        renderDesktopShortcuts();
      },
      { once: true },
    );
  } else {
    await loadDesktopShortcuts();
    renderDesktopShortcuts();
  }
})();