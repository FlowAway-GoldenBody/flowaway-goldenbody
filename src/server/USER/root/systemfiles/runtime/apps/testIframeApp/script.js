"use strict";

const api = window.__goldenbodyAPI || window.protectedGlobals;
const hasRename = typeof window.protectedGlobals?.RenameFile === 'function';
const state = {
  openFileHandle: null,
  saveFileHandle: null,
  folderHandle: null,
  createdFilePath: null,
  createdFolderPath: null,
  renamedFilePath: null,
  renamedFolderPath: null,
};

const logArea = document.createElement('div');
const addLog = (message, type = 'info') => {
  const row = document.createElement('div');
  row.textContent = message;
  row.style.marginBottom = '8px';
  row.style.whiteSpace = 'pre-wrap';
  row.style.color = type === 'error' ? '#ff8080' : type === 'success' ? '#a8ff9b' : '#e8e8e8';
  logArea.appendChild(row);
  logArea.scrollTop = logArea.scrollHeight;
};

const getPathDisplay = (handle) => {
  if (!handle) return '<none>';
  console.log('getPathDisplay handle:', handle);
  if (typeof handle === 'object' && handle.path) return `${handle.path}${handle.key ? ' (key)' : ''}`;
  return String(handle);
};

const createButton = (label, onClick) => {
  const btn = document.createElement('button');
  btn.textContent = label;
  btn.style.padding = '10px 14px';
  btn.style.borderRadius = '10px';
  btn.style.border = '1px solid #4f5d75';
  btn.style.background = '#1f1f38';
  btn.style.color = '#f5f5ff';
  btn.style.cursor = 'pointer';
  btn.style.margin = '4px';
  btn.addEventListener('click', onClick);
  return btn;
};

const normalizeHandle = (pathOrHandle) => {
  if (!pathOrHandle) return null;
  if (typeof pathOrHandle === 'object' && typeof pathOrHandle.path === 'string') return pathOrHandle;
  if (typeof pathOrHandle === 'string') return { path: pathOrHandle };
  return null;
};

const safeApi = {
  readFile: async (...args) => api.readFile(...args),
  writeFile: async (...args) => api.writeFile(...args),
  readFolder: async (...args) => api.readFolder(...args),
  writeFolder: async (...args) => api.writeFolder(...args),
  deleteFile: async (...args) => api.deleteFile(...args),
  deleteFolder: async (...args) => api.deleteFolder(...args),
  showOpenFilePicker: async (...args) => api.showOpenFilePicker(...args),
  showSaveFilePicker: async (...args) => api.showSaveFilePicker(...args),
  showDirectoryPicker: async (...args) => api.showDirectoryPicker(...args),
};

const renameEntry = async (path, newName) => {
  if (hasRename) {
    return window.protectedGlobals.RenameFile(path, newName);
  }
  throw new Error('Rename API is not available in this environment');
};

const buildUI = () => {
  document.body.style.background = '#101020';
  document.body.style.color = '#f0f0f0';
  document.body.style.fontFamily = 'system-ui, sans-serif';
  document.body.style.padding = '24px';
  document.body.style.margin = '0';

  const header = document.createElement('div');
  header.innerHTML = '<h1 style="margin:0 0 10px 0;color:#c8d6ff;">Sandbox File Picker Test</h1>' +
    '<div style="margin-bottom:18px;color:#b8c7ff;max-width:800px;line-height:1.5;">Use the buttons to exercise all three pickers and the folder APIs. Pick a folder first, then create files and folders inside it. Results appear below.</div>';
  document.body.appendChild(header);

  const controls = document.createElement('div');
  controls.style.display = 'flex';
  controls.style.flexWrap = 'wrap';
  controls.style.gap = '8px';
  document.body.appendChild(controls);

  const status = document.createElement('div');
  status.style.margin = '16px 0 18px 0';
  status.style.color = '#d0d6ff';
  document.body.appendChild(status);

  const updateStatus = () => {
    status.innerHTML = `Open file: <strong>${getPathDisplay(state.openFileHandle)}</strong> | ` +
      `Save file: <strong>${getPathDisplay(state.saveFileHandle)}</strong> | ` +
      `Folder: <strong>${getPathDisplay(state.folderHandle)}</strong> | ` +
      `Created file: <strong>${state.createdFilePath || '<none>'}</strong> | ` +
      `Created folder: <strong>${state.createdFolderPath || '<none>'}</strong>`;
  };

  const btnOpenFile = createButton('Pick Open File', async () => {
    try {
      addLog('Opening open-file picker...');
      const result = await safeApi.showOpenFilePicker({ multiple: false });
      state.openFileHandle = normalizeHandle(result);
      addLog(`Selected open file: ${getPathDisplay(state.openFileHandle)}`);
      updateStatus();
    } catch (err) {
      addLog(`Open file picker failed: ${err.message}`, 'error');
    }
  });

  const btnSaveFile = createButton('Pick Save File', async () => {
    try {
      addLog('Opening save-file picker...');
      const result = await safeApi.showSaveFilePicker({ suggestedName: 'test-write.txt' });
      state.saveFileHandle = normalizeHandle(result);
      addLog(`Selected save file path: ${getPathDisplay(state.saveFileHandle)}`);
      updateStatus();
    } catch (err) {
      addLog(`Save file picker failed: ${err.message}`, 'error');
    }
  });

  const btnPickFolder = createButton('Pick Folder', async () => {
    try {
      addLog('Opening directory picker...');
      const result = await safeApi.showDirectoryPicker();
      state.folderHandle = normalizeHandle(result);
      addLog(`Selected folder: ${getPathDisplay(state.folderHandle)}`);
      updateStatus();
    } catch (err) {
      addLog(`Directory picker failed: ${err.message}`, 'error');
    }
  });

  const btnReadSelectedFile = createButton('Read Selected File', async () => {
    try {
      const handle = state.openFileHandle || state.saveFileHandle;
      if (!handle) throw new Error('Pick a file first');
      const content = await safeApi.readFile(handle, { text: true });
      addLog(`Read file ${getPathDisplay(handle)}:\n${String(content).slice(0, 1000)}`);
    } catch (err) {
      addLog(`Read selected file failed: ${err.message}`, 'error');
    }
  });

  const btnWriteSelectedFile = createButton('Write Selected File', async () => {
    try {
      const handle = state.openFileHandle || state.saveFileHandle;
      if (!handle) throw new Error('Pick a file first');
      await safeApi.writeFile(handle, `write test ${new Date().toISOString()}`, { text: true });
      addLog(`Wrote to file ${getPathDisplay(handle)}`, 'success');
    } catch (err) {
      addLog(`Write selected file failed: ${err.message}`, 'error');
    }
  });

  const btnReadFolder = createButton('Read Folder Contents', async () => {
    try {
      if (!state.folderHandle) throw new Error('Pick a folder first');
      const contents = await safeApi.readFolder({ path: state.folderHandle.path, key: state.folderHandle.key });
      addLog(`Folder contents for ${state.folderHandle.path}: ${JSON.stringify(contents || [], null, 2)}`);
    } catch (err) {
      addLog(`Read folder failed: ${err.message}`, 'error');
    }
  });

  const btnWriteInFolder = createButton('Write File in Folder', async () => {
    try {
      if (!state.folderHandle) throw new Error('Pick a folder first');
      const filename = `test-file-${Date.now()}.txt`;
      const filePath = `${state.folderHandle.path}/${filename}`;
      await safeApi.writeFile({ path: filePath, key: state.folderHandle.key }, `hello from test file ${new Date().toISOString()}`, { text: true });
      state.createdFilePath = filePath;
      addLog(`Wrote file in folder: ${filePath}`, 'success');
      updateStatus();
    } catch (err) {
      addLog(`Write file in folder failed: ${err.message}`, 'error');
    }
  });

  const btnWriteFolder = createButton('Create Folder in Folder', async () => {
    try {
      if (!state.folderHandle) throw new Error('Pick a folder first');
      const folderName = `test-folder-${Date.now()}`;
      const folderPath = `${state.folderHandle.path}/${folderName}`;
      await safeApi.writeFolder({ path: folderPath, key: state.folderHandle.key });
      state.createdFolderPath = folderPath;
      addLog(`Created folder in folder: ${folderPath}`, 'success');
      updateStatus();
    } catch (err) {
      addLog(`Create folder failed: ${err.message}`, 'error');
    }
  });

  const btnRenameFile = createButton('Rename Created File', async () => {
    try {
      const currentPath = state.renamedFilePath || state.createdFilePath;
      if (!currentPath) throw new Error('Create a file first');
      if (!hasRename) throw new Error('Rename API missing');
      const newName = `renamed-${currentPath.split('/').pop()}`;
      await renameEntry(currentPath, newName);
      state.renamedFilePath = `${currentPath.split('/').slice(0, -1).join('/')}/${newName}`;
      addLog(`Renamed file to ${state.renamedFilePath}`, 'success');
      updateStatus();
    } catch (err) {
      addLog(`Rename file failed: ${err.message}`, 'error');
    }
  });

  const btnRenameFolder = createButton('Rename Created Folder', async () => {
    try {
      const currentPath = state.renamedFolderPath || state.createdFolderPath;
      if (!currentPath) throw new Error('Create a folder first');
      if (!hasRename) throw new Error('Rename API missing');
      const newName = `renamed-${currentPath.split('/').pop()}`;
      await renameEntry(currentPath, newName);
      state.renamedFolderPath = `${currentPath.split('/').slice(0, -1).join('/')}/${newName}`;
      addLog(`Renamed folder to ${state.renamedFolderPath}`, 'success');
      updateStatus();
    } catch (err) {
      addLog(`Rename folder failed: ${err.message}`, 'error');
    }
  });

  const btnAddEntryInCreatedFolder = createButton('Add File+Folder in Created Folder', async () => {
    try {
      const targetFolder = state.renamedFolderPath || state.createdFolderPath;
      if (!targetFolder) throw new Error('Create a folder first');
      const childFile = `${targetFolder}/child-file-${Date.now()}.txt`;
      const childFolder = `${targetFolder}/child-folder-${Date.now()}`;
      await safeApi.writeFile({ path: childFile, key: state.folderHandle?.key }, `child file content ${new Date().toISOString()}`, { text: true });
      await safeApi.writeFolder({ path: childFolder, key: state.folderHandle?.key });
      addLog(`Created child file ${childFile} and child folder ${childFolder}`, 'success');
    } catch (err) {
      addLog(`Add entries failed: ${err.message}`, 'error');
    }
  });

  const btnDeleteCreatedFile = createButton('Delete Created File', async () => {
    try {
      const pathToDelete = state.renamedFilePath || state.createdFilePath;
      if (!pathToDelete) throw new Error('No created file to delete');
      await safeApi.deleteFile({ path: pathToDelete, key: state.folderHandle?.key });
      addLog(`Deleted file ${pathToDelete}`, 'success');
      state.createdFilePath = null;
      state.renamedFilePath = null;
      updateStatus();
    } catch (err) {
      addLog(`Delete file failed: ${err.message}`, 'error');
    }
  });

  const btnDeleteCreatedFolder = createButton('Delete Created Folder', async () => {
    try {
      const pathToDelete = state.renamedFolderPath || state.createdFolderPath;
      if (!pathToDelete) throw new Error('No created folder to delete');
      await safeApi.deleteFolder({ path: pathToDelete, key: state.folderHandle?.key });
      addLog(`Deleted folder ${pathToDelete}`, 'success');
      state.createdFolderPath = null;
      state.renamedFolderPath = null;
      updateStatus();
    } catch (err) {
      addLog(`Delete folder failed: ${err.message}`, 'error');
    }
  });

  const btnClear = createButton('Clear Log', () => {
    logArea.innerHTML = '';
    addLog('Log cleared.');
  });

  [btnOpenFile, btnSaveFile, btnPickFolder, btnReadSelectedFile, btnWriteSelectedFile, btnReadFolder, btnWriteInFolder, btnWriteFolder, btnRenameFile, btnRenameFolder, btnAddEntryInCreatedFolder, btnDeleteCreatedFile, btnDeleteCreatedFolder, btnClear].forEach((btn) => controls.appendChild(btn));

  logArea.style.background = '#141432';
  logArea.style.border = '1px solid #333857';
  logArea.style.borderRadius = '12px';
  logArea.style.padding = '16px';
  logArea.style.maxHeight = '400px';
  logArea.style.overflowY = 'auto';
  logArea.style.fontFamily = 'monospace';
  logArea.style.fontSize = '13px';
  logArea.style.lineHeight = '1.4';
  document.body.appendChild(logArea);

  addLog('Test UI ready. Pick a folder and run the folder tests, then use the file pickers as needed.');
  if (!hasRename) addLog('Rename is not available in this environment; rename buttons may fail.', 'error');
  updateStatus();
};

buildUI();
