"use strict";
const createLine = (text) => {
  const row = document.createElement('div');
  row.textContent = text;
  row.style.marginBottom = '10px';
  row.style.lineHeight = '1.4';
  return row;
};
const log = (label, value) => {
  const row = createLine(`${label}: ${typeof value === 'object' ? JSON.stringify(value, null, 2) : String(value)}`);
  row.style.whiteSpace = 'pre-wrap';
  document.body.appendChild(row);
};
const errorLog = (err) => {
  const row = createLine(`ERROR: ${err && err.message ? err.message : String(err)}`);
  row.style.color = '#ff6666';
  document.body.appendChild(row);
};

const normalizePathDisplay = (path) => {
  if (path && typeof path === 'object') return `${path.path} (key=${Boolean(path.key)})`;
  return String(path);
};

(async () => {
  document.body.style.background = '#101020';
  document.body.style.color = '#f0f0f0';
  document.body.style.fontFamily = 'system-ui, sans-serif';
  document.body.style.padding = '20px';
  document.body.style.whiteSpace = 'pre-wrap';

  log('Test', 'Starting testIframeApp writeFile handle verification');

  try {
    const api = window.__goldenbodyAPI || window.protectedGlobals;
    let fileobj = api.getUserSelectedFile ? api.getUserSelectedFile() : null;

    let pathHandle = fileobj && fileobj.path ? fileobj.path : null;

    if (!pathHandle) {
      log('Info', 'No launch path provided by appLoader. Requesting open file picker instead.');
      const pickResult = await (api.showOpenFilePicker ? api.showOpenFilePicker({ multiple: false }) : null);
      if (!pickResult || !pickResult.path) {
        log('Result', 'No file selected. Cannot verify file handle write behavior.');
        return;
      }
      pathHandle = { path: pickResult.path, key: pickResult.key };
      log('Picked path', normalizePathDisplay(pathHandle));
    } else {
      log('Launch path', normalizePathDisplay(pathHandle));
    }

    log('Path object type', typeof pathHandle);
    log('Path string', normalizePathDisplay(pathHandle));

    const initialContent = await api.readFile(pathHandle, { text: true });
    log('Initial content preview', initialContent ? initialContent.slice(0, 200) : '<empty>');

    const marker = `\n\n-- FILE HANDLE WRITE TEST ${new Date().toISOString()} --`;
    const newContent = String(initialContent || '') + marker;

    await api.writeFile(pathHandle, newContent, { text: true });
    log('Write', 'writeFile completed successfully');

    const updatedContent = await api.readFile(pathHandle, { text: true });
    const markerFound = updatedContent.endsWith(marker);
    log('Marker found after write', markerFound);
    log('Updated preview', updatedContent.slice(-Math.min(updatedContent.length, 220)));

    if (markerFound) {
      await api.writeFile(pathHandle, initialContent, { text: true });
      log('Restore', 'Original content restored to file');
    } else {
      log('Warning', 'Marker was not found after write; file handle write may not have worked as expected.');
    }
  } catch (err) {
    errorLog(err);
  }
})();