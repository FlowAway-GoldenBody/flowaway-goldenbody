"use strict";

window.packageInstallerGlobals = window.packageInstallerGlobals || {};
window.packageInstallerGlobals._jsZipLoader = window.packageInstallerGlobals._jsZipLoader || (function () {
  if (window.fflate) {
    return Promise.resolve();
  }

  if (window.packageInstallerGlobals._jsZipLoader) {
    return window.packageInstallerGlobals._jsZipLoader;
  }

  const script = document.createElement('script');
  script.src = 'https://cdn.jsdelivr.net/npm/fflate@0.9.1/umd/index.min.js';
  script.crossOrigin = 'anonymous';
  script.async = true;

  const promise = new Promise((resolve, reject) => {
    script.onload = () => resolve();
    script.onerror = () => reject(new Error('Failed to load zip library from CDN'));
  });

  window.packageInstallerGlobals._jsZipLoader = promise;
  document.head.appendChild(script);
  return promise;
})();

window.packageInstallerGlobals.ensureJSZipLoaded = window.packageInstallerGlobals.ensureJSZipLoaded || async function () {
  await window.packageInstallerGlobals._jsZipLoader;
  if (typeof window.fflate === 'undefined') {
    throw new Error('Zip library not available after loading CDN script');
  }
};

window.packageInstallerGlobals.parseZipData = window.packageInstallerGlobals.parseZipData || async function (zipDataBytes) {
  await window.packageInstallerGlobals.ensureJSZipLoaded();

  if (!(zipDataBytes instanceof Uint8Array)) {
    if (zipDataBytes instanceof ArrayBuffer) {
      zipDataBytes = new Uint8Array(zipDataBytes);
    } else if (ArrayBuffer.isView(zipDataBytes)) {
      zipDataBytes = new Uint8Array(zipDataBytes.buffer, zipDataBytes.byteOffset, zipDataBytes.byteLength);
    } else {
      throw new Error('Invalid zip data type');
    }
  }

  const unzipResult = await new Promise((resolve, reject) => {
    try {
      window.fflate.unzip(zipDataBytes, (error, data) => {
        if (error) {
          reject(error);
        } else {
          resolve(data);
        }
      });
    } catch (error) {
      reject(error);
    }
  });

  const files = {};
  for (const [rawPath, content] of Object.entries(unzipResult || {})) {
    const normalizedPath = String(rawPath).replace(/\\/g, '/');
    const isDir = normalizedPath.endsWith('/');
    const bytes = content instanceof Uint8Array ? content : new Uint8Array(content || []);

    files[normalizedPath] = {
      dir: isDir,
      _data: bytes,
      async: async (type) => {
        if (isDir) {
          return new ArrayBuffer(0);
        }
        if (type === 'string' || type === 'text') {
          return new TextDecoder('utf-8').decode(bytes);
        }
        if (type === 'uint8array') {
          return bytes;
        }
        if (type === 'arraybuffer') {
          return bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength);
        }
        return bytes;
      },
      asText: async () => new TextDecoder('utf-8').decode(bytes),
      asUint8Array: async () => bytes,
      asArrayBuffer: async () => bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength),
    };
  }

  return {
    files,
    file: (path) => files[path] || null,
  };
};

window.packageInstallerGlobals.getMasterJsApiKey = window.packageInstallerGlobals.getMasterJsApiKey || async function () {
  try {
    const key = await window.protectedGlobals.ReadFile('systemfiles/userprofile/jsApiKey.txt', { text: true, direct: true });
    return String(key || '').trim();
  } catch (error) {
    return '';
  }
};

window.packageInstallerGlobals.ensureFolderExists = window.packageInstallerGlobals.ensureFolderExists || async function (path) {
  if (!path || path === '/') return;
  try {
    await window.protectedGlobals.WriteFolder(path);
  } catch (error) {
    // ignore if already exists or path cannot be created directly
  }
};

window.packageInstallerGlobals.readBinaryFile = window.packageInstallerGlobals.readBinaryFile || async function (filePath) {
  const payload = await window.protectedGlobals.ReadFile(filePath, { buffer: true, direct: true });

  if (payload instanceof ArrayBuffer) {
    return new Uint8Array(payload);
  }

  if (payload instanceof Uint8Array) {
    return payload;
  }

  if (ArrayBuffer.isView(payload)) {
    return new Uint8Array(payload.buffer, payload.byteOffset, payload.byteLength);
  }

  if (typeof Buffer !== 'undefined' && Buffer.isBuffer(payload)) {
    return new Uint8Array(payload);
  }

  if (payload && typeof payload.arrayBuffer === 'function') {
    return new Uint8Array(await payload.arrayBuffer());
  }

  if (typeof payload === 'string') {
    return new TextEncoder().encode(payload);
  }

  throw new Error('Unsupported binary payload returned from ReadFile');
};

window.packageInstallerGlobals.sanitizeFolderName = window.packageInstallerGlobals.sanitizeFolderName || function (value) {
  const baseName = String(value || '').trim();
  const safeName = baseName
    .replace(/[<>:"/\\|?*\x00-\x1f]+/g, '-')
    .replace(/\s+/g, ' ')
    .replace(/^[.\s-]+|[.\s-]+$/g, '');
  return safeName || 'app-package';
};

window.packageInstallerGlobals.readZipEntryText = window.packageInstallerGlobals.readZipEntryText || async function (entryFile, timeoutMs = 1500) {
  if (!entryFile) {
    throw new Error('Zip entry is not provided');
  }

  const attempts = [
    { type: 'string' },
    { type: 'uint8array' },
    { type: 'arraybuffer' },
  ];

  const normalizeTextResult = (result) => {
    if (result instanceof ArrayBuffer || (typeof Buffer !== 'undefined' && result instanceof Buffer)) {
      const buf = result instanceof ArrayBuffer ? new Uint8Array(result) : new Uint8Array(result.buffer || result);
      return new TextDecoder('utf-8').decode(buf);
    }
    if (result instanceof Uint8Array) {
      return new TextDecoder('utf-8').decode(result);
    }
    if (ArrayBuffer.isView(result)) {
      return new TextDecoder('utf-8').decode(result);
    }
    if (typeof result === 'string') {
      return result;
    }
    if (result && typeof result === 'object' && typeof result.toString === 'function') {
      return String(result);
    }
    return '';
  };

  const extractPayloadFromData = () => {
    const data = entryFile && entryFile._data;
    if (!data) {
      return '';
    }

    const candidates = [
      data.uncompressedContent,
      data.compressedContent,
      data.content,
      data.buffer,
      data.binary,
      data._data,
      data,
    ];

    for (const candidate of candidates) {
      if (!candidate) continue;
      const normalized = normalizeTextResult(candidate);
      if (normalized) {
        return normalized;
      }
    }

    return '';
  };

  let lastError = null;
  for (const attempt of attempts) {
    try {
      let promise = null;

      try {
        if (typeof entryFile.async === 'function') {
          try { promise = entryFile.async(attempt.type); } catch (e) { /* swallow */ }
          if (!promise) {
            try { promise = entryFile.async.call(entryFile, attempt.type); } catch (e) { /* swallow */ }
          }
        }
      } catch (e) {
        // ignored
      }

      if (!promise && typeof entryFile.asText === 'function' && attempt.type === 'string') {
        try { promise = entryFile.asText(); } catch (e) { /* swallow */ }
      }

      if (!promise && typeof entryFile.asUint8Array === 'function' && attempt.type === 'uint8array') {
        try { promise = entryFile.asUint8Array(); } catch (e) { /* swallow */ }
      }

      if (!promise && typeof entryFile.asArrayBuffer === 'function' && attempt.type === 'arraybuffer') {
        try { promise = entryFile.asArrayBuffer(); } catch (e) { /* swallow */ }
      }

      if (!promise && typeof entryFile.nodeStream === 'function') {
        try {
          const stream = entryFile.nodeStream();
          promise = new Promise((resolve, reject) => {
            const chunks = [];
            stream.on('data', (c) => chunks.push(c));
            stream.on('end', () => resolve(Buffer.concat(chunks).toString('utf8')));
            stream.on('error', reject);
          });
        } catch (e) { /* swallow */ }
      }

      if (!promise) {
        const fallbackText = extractPayloadFromData();
        if (fallbackText) {
          return fallbackText;
        }
        throw new Error('No readable method found on zip entry');
      }

      const result = await Promise.race([
        promise,
        new Promise((_, reject) => setTimeout(() => reject(new Error('Zip entry read timed out')), Math.max(500, timeoutMs))),
      ]);

      const normalized = normalizeTextResult(result);
      if (normalized) {
        return normalized;
      }
    } catch (error) {
      console.warn('packageInstaller: read attempt failed', error && error.message);
      lastError = error;
    }
  }

  const fallbackText = extractPayloadFromData();
  if (fallbackText) {
    return fallbackText;
  }

  throw lastError || new Error('Unable to read zip entry text');
};

window.packageInstallerGlobals.getPackageMetadata = window.packageInstallerGlobals.getPackageMetadata || async function (zipData) {
  const archiveFiles = Object.keys(zipData.files || {}).filter((entryPath) => !zipData.files[entryPath].dir);
  const entryJsonPath = archiveFiles.find((entryPath) => String(entryPath).split('/').pop().toLowerCase() === 'entry.json');

  if (!entryJsonPath) {
    throw new Error('Package is missing entry.json');
  }

  const entryFile = (typeof zipData.file === 'function' ? zipData.file(entryJsonPath) : null) || zipData.files[entryJsonPath];
  const canReadEntry = !!entryFile && (
    typeof entryFile.async === 'function' ||
    typeof entryFile.asText === 'function' ||
    typeof entryFile.asUint8Array === 'function' ||
    typeof entryFile.asArrayBuffer === 'function' ||
    typeof entryFile.nodeStream === 'function' ||
    !!entryFile._data
  );

  if (!canReadEntry) {
    throw new Error('Unable to read entry.json from package');
  }

  let rawText = '';
  try {
    rawText = await window.packageInstallerGlobals.readZipEntryText(entryFile, 10000);
  } catch (error) {
    throw new Error(`Unable to read entry.json from package: ${error.message}`);
  }

  let entryData;
  try {
    entryData = JSON.parse(rawText);
  } catch (error) {
    throw new Error('entry.json is not valid JSON');
  }

  const label = typeof entryData?.label === 'string' ? entryData.label.trim() : '';
  if (!label) {
    throw new Error('entry.json is missing a valid label property');
  }

  const entryDir = String(entryJsonPath).split('/').slice(0, -1).join('/');
  return {
    entryJsonPath,
    entryJsonDir: entryDir,
    folderName: window.packageInstallerGlobals.sanitizeFolderName(label),
    label,
    entryData,
  };
};

window.packageInstaller = function (path = undefined, posX = 50, posY = 50) {
  if (posX == 50 && posY == 50) {
    let pos = window.protectedGlobals.getNextWindowXY();
    posX = pos.x;
    posY = pos.y;
  }
  let root = window.protectedGlobals.apptools.createRoot('packageInstaller', posX, posY);
  let topbar = window.protectedGlobals.apptools.createtitlebar(root);

  // Helper functions
  function escapeHtml(text) {
    const map = {
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&#039;'
    };
    return text.replace(/[&<>"']/g, m => map[m]);
  }

  function applySystemTheme(container) {
    const updateTheme = () => {
      const dark = !!(window.protectedGlobals.data && window.protectedGlobals.data.dark);
      const colors = {
        '--app-bg': dark ? '#121212' : '#ffffff',
        '--panel-bg': dark ? '#1f1f1f' : '#fafafa',
        '--panel-border': dark ? '#3a3a3a' : '#d0d0d0',
        '--text-color': dark ? '#f1f1f1' : '#111111',
        '--muted-color': dark ? '#c4c4c4' : '#666666',
        '--row-hover': dark ? '#2a2a2a' : '#f0f0f0',
        '--row-selected': dark ? '#2d3a52' : '#e7f3ff',
        '--warning-bg': dark ? '#3a2f00' : '#fff4ce',
        '--warning-border': dark ? '#b08900' : '#ffb900'
      };
      for (const key in colors) {
        container.style.setProperty(key, colors[key]);
      }
      container.style.color = colors['--text-color'];
      container.style.backgroundColor = colors['--app-bg'];
    };

    updateTheme();
    if (root && root.addEventListener) {
      root.addEventListener('styleapplied', updateTheme);
    }
  }

  async function selectFileFromCloudStorage(container) {
    // This function is no longer needed as showUploadInterface handles cloud storage directly
  }

  async function installPackage(zipData, folderName, statusDiv, packageMetadata) {
    const baseFolder = `/systemfiles/runtime/apps/${folderName}`;
    const exists = await window.protectedGlobals.FolderExists(baseFolder).catch(() => false);
    if (exists) {
      window.protectedGlobals.notification({
        title: 'Installation Failed',
        message: `A folder named "${folderName}" already exists in /systemfiles/runtime/apps`,
        type: 'error'
      });
      throw new Error(`Folder "${folderName}" already exists`);
    }

    statusDiv.textContent = 'Extracting and installing files...';

    await window.packageInstallerGlobals.ensureFolderExists(baseFolder);
    const createdFolders = new Set([baseFolder]);

    const archiveFiles = Object.keys(zipData.files || {}).filter((entryPath) => !zipData.files[entryPath].dir);
    const packageRootDir = packageMetadata && packageMetadata.entryJsonDir ? packageMetadata.entryJsonDir : '';

    for (const filePath of archiveFiles) {
      const file = zipData.files[filePath];
      const normalizedPath = String(filePath).replace(/\\/g, '/');

      let relativePath = normalizedPath;
      if (packageRootDir) {
        const packageRootPrefix = `${packageRootDir}/`;
        if (normalizedPath === packageRootDir) {
          continue;
        }
        if (normalizedPath.startsWith(packageRootPrefix)) {
          relativePath = normalizedPath.slice(packageRootPrefix.length);
        }
      }

      if (!relativePath) continue;

      const fullPath = `${baseFolder}/${relativePath}`;
      const folderPath = fullPath.substring(0, fullPath.lastIndexOf('/')) || baseFolder;
      if (!createdFolders.has(folderPath)) {
        await window.packageInstallerGlobals.ensureFolderExists(folderPath);
        createdFolders.add(folderPath);
      }

      const fileContent = await file.async('arraybuffer');
      await window.protectedGlobals.WriteFile(fullPath, fileContent, { buffer: true });
    }

    const useJsApi = Boolean(packageMetadata?.entryData && packageMetadata.entryData.usejs === true);
    if (useJsApi) {
      const masterKey = await window.packageInstallerGlobals.getMasterJsApiKey();
      if (masterKey) {
        await window.protectedGlobals.WriteFile(`${baseFolder}/jsKey.txt`, masterKey, { text: true });
      }
    }

    statusDiv.textContent = 'Installation complete!';
    statusDiv.style.color = '#107c10';
  }

  function showConfirmationDialog(container, zipData, folderName, packageMetadata) {
    const requiresJsApi = Boolean(packageMetadata?.entryData && packageMetadata.entryData.usejs === true);

    if (!requiresJsApi) {
      container.innerHTML = `
        <div style="display: flex; flex-direction: column; gap: 15px;">
          <h3>Installing Package</h3>
          <div style="background-color: var(--panel-bg); padding: 12px; border-radius: 4px; border: 1px solid var(--panel-border);">
            <p style="margin: 0; font-size: 14px; color: var(--text-color);"><strong>Package:</strong> ${escapeHtml(folderName)}</p>
            <p style="margin: 8px 0 0 0; font-size: 13px; color: var(--muted-color);">This package does not request JS API access, so it will install without writing a JS key.</p>
          </div>
          <div id="installStatus" style="font-size: 14px; color: var(--muted-color); min-height: 20px;">Installing...</div>
        </div>
      `;

      const statusDiv = container.querySelector('#installStatus');
      installPackage(zipData, folderName, statusDiv, packageMetadata)
        .catch((error) => {
          statusDiv.textContent = `Installation error: ${error.message}`;
          statusDiv.style.color = '#d13438';
        });
      return;
    }

    const html = `
      <div style="display: flex; flex-direction: column; gap: 15px;">
        <h3>Confirm Installation</h3>
        
        <div style="background-color: var(--warning-bg); border-left: 4px solid var(--warning-border); padding: 12px; border-radius: 4px;">
          <strong style="color: var(--text-color);">⚠️ Security Warning</strong>
          <p style="margin: 8px 0 0 0; font-size: 13px; color: var(--text-color);">
            By continuing, you understand that malicious apps can run malware on your account and steal personal information from you. Only install packages from trusted sources.
          </p>
        </div>
        
        <div style="background-color: var(--panel-bg); padding: 12px; border-radius: 4px; border: 1px solid var(--panel-border);">
          <p style="margin: 0; font-size: 14px; color: var(--text-color);"><strong>Package:</strong> ${escapeHtml(folderName)}</p>
        </div>
        
        <label style="display: flex; align-items: center; gap: 8px; font-size: 14px; cursor: pointer; color: var(--text-color);">
          <input type="checkbox" id="confirmCheckbox" style="cursor: pointer;">
          <span>I understand the risks and want to continue</span>
        </label>
        
        <div style="display: flex; gap: 10px;">
          <button id="cancelBtn" style="
            padding: 8px 16px;
            background-color: var(--panel-bg);
            color: var(--text-color);
            border: 1px solid var(--panel-border);
            border-radius: 4px;
            cursor: pointer;
            font-size: 14px;
          ">Cancel</button>
          
          <button id="continueBtn" disabled style="
            padding: 8px 16px;
            background-color: #0078d4;
            color: white;
            border: none;
            border-radius: 4px;
            cursor: not-allowed;
            font-size: 14px;
            opacity: 0.5;
          ">Continue</button>
        </div>
        
        <div id="installStatus" style="font-size: 14px; color: var(--muted-color); min-height: 20px;"></div>
      </div>
    `;
    
    container.innerHTML = html;
    
    const checkbox = container.querySelector('#confirmCheckbox');
    const continueBtn = container.querySelector('#continueBtn');
    const cancelBtn = container.querySelector('#cancelBtn');
    const statusDiv = container.querySelector('#installStatus');
    
    checkbox.addEventListener('change', () => {
      continueBtn.disabled = !checkbox.checked;
      continueBtn.style.opacity = checkbox.checked ? '1' : '0.5';
      continueBtn.style.cursor = checkbox.checked ? 'pointer' : 'not-allowed';
    });
    
    cancelBtn.addEventListener('click', () => {
      container.innerHTML = '';
      showUploadInterface(container);
    });
    
    continueBtn.addEventListener('click', async () => {
      try {
        continueBtn.disabled = true;
        statusDiv.textContent = 'Installing...';
        
        await installPackage(zipData, folderName, statusDiv, packageMetadata);
        
        continueBtn.style.display = 'none';
        cancelBtn.textContent = 'Close';
      } catch (error) {
        statusDiv.textContent = `Installation error: ${error.message}`;
        statusDiv.style.color = '#d13438';
        continueBtn.disabled = false;
      }
    });
  }

  async function processUploadedFile(file, container) {
    try {
      const arrayBuffer = await file.arrayBuffer();
      const zipData = new Uint8Array(arrayBuffer);
      
      const unzippedFiles = await window.packageInstallerGlobals.parseZipData(zipData);
      
      const packageMetadata = await window.packageInstallerGlobals.getPackageMetadata(unzippedFiles);
      showConfirmationDialog(container, unzippedFiles, packageMetadata.folderName, packageMetadata);
    } catch (error) {
      const statusEl = container.querySelector('#status');
      if (statusEl) {
        statusEl.textContent = `Error processing file: ${error.message}`;
        statusEl.style.color = '#d13438';
      }
      const retryButton = container.querySelector('#selectBtn');
      if (retryButton) {
        retryButton.disabled = false;
        retryButton.style.opacity = '1';
        retryButton.style.cursor = 'pointer';
      }
    }
  }

  function showUploadInterface(container) {
    const html = `
      <div style="display: flex; flex-direction: column; gap: 15px; height: 100%;">
        <div>
          <h3 style="margin: 0 0 5px 0;">Select Package</h3>
          <div id="breadcrumb" style="font-size: 12px; color: var(--muted-color); margin-bottom: 10px;">
            <span id="currentPath" style="word-break: break-all;"></span>
          </div>
        </div>
        
        <div id="fileList" style="
          flex: 1;
          border: 1px solid var(--panel-border);
          border-radius: 4px;
          overflow-y: auto;
          background-color: var(--panel-bg);
        "></div>
        
        <div id="status" style="font-size: 13px; color: var(--muted-color); min-height: 20px;"></div>
        
        <div style="display: flex; gap: 10px;">
          <button id="cancelBtn" style="
            padding: 8px 16px;
            background-color: var(--panel-bg);
            color: var(--text-color);
            border: 1px solid var(--panel-border);
            border-radius: 4px;
            cursor: pointer;
            font-size: 14px;
          ">Cancel</button>
          
          <button id="selectBtn" disabled style="
            padding: 8px 16px;
            background-color: #0078d4;
            color: white;
            border: none;
            border-radius: 4px;
            cursor: not-allowed;
            font-size: 14px;
            opacity: 0.5;
          ">Select Package</button>
        </div>
      </div>
    `;
    
    container.innerHTML = html;
    
    const fileListDiv = container.querySelector('#fileList');
    const statusDiv = container.querySelector('#status');
    const selectBtn = container.querySelector('#selectBtn');
    const cancelBtn = container.querySelector('#cancelBtn');
    const currentPathSpan = container.querySelector('#currentPath');
    
    let currentPath = '';
    let selectedFile = null;
    
    function normalizeDirPath(dirPath) {
      if (!dirPath || dirPath === '/') return '';
      return dirPath;
    }

    function buildItemPath(dirPath, name) {
      if (!dirPath) return `/${name}`;
      return `${dirPath}/${name}`;
    }

    async function loadFiles(dirPath) {
      try {
        dirPath = normalizeDirPath(dirPath);
        currentPath = dirPath;
        currentPathSpan.textContent = dirPath || '(Root)';
        statusDiv.textContent = 'Loading...';
        fileListDiv.innerHTML = '';
        selectedFile = null;
        selectBtn.disabled = true;
        selectBtn.style.opacity = '0.5';
        
        await window.protectedGlobals.onlyloadTree();
        const treeNode = window.protectedGlobals.findNodeByPath(dirPath);
        const entries = Array.isArray(treeNode && treeNode[1]) ? treeNode[1].map((node) => ({
          name: String(node && node[0] ? node[0] : ''),
          node,
        })) : [];
        const files = Array.isArray(entries) ? entries : [];

        const showBackButton = Boolean(dirPath);
        if (showBackButton) {
          const backBtn = document.createElement('div');
          backBtn.style.cssText = `
            padding: 10px 15px;
            border-bottom: 1px solid var(--panel-border);
            cursor: pointer;
            background-color: var(--panel-bg);
            display: flex;
            align-items: center;
            gap: 10px;
            transition: background-color 0.2s;
          `;
          backBtn.innerHTML = `<span style="font-size: 16px;">📤</span><span style="font-size: 13px; font-weight: 500;">Back</span>`;
          backBtn.addEventListener('mouseover', () => backBtn.style.backgroundColor = 'var(--row-hover)');
          backBtn.addEventListener('mouseout', () => backBtn.style.backgroundColor = 'var(--panel-bg)');
          backBtn.addEventListener('click', () => {
            const parentPath = dirPath.split('/').filter(p => p).slice(0, -1).join('/');
            loadFiles(parentPath ? `/${parentPath}` : '');
          });
          fileListDiv.appendChild(backBtn);
        }

        if (files.length === 0) {
          const emptyText = document.createElement('div');
          emptyText.style.cssText = 'padding: 15px; color: #999; text-align: center;';
          emptyText.textContent = 'No items found';
          fileListDiv.appendChild(emptyText);
          statusDiv.textContent = '';
          return;
        }
        
        for (const entry of files) {
          const entryNode = entry?.node;
          const name = typeof entry === 'string' ? entry : String(entry?.name || entry?.path || entry);
          const normalizedName = name || '';
          const isZip = normalizedName.toLowerCase().endsWith('.zip');
          const isFolder = Array.isArray(entryNode && entryNode[1]);
          
          const fileRow = document.createElement('div');
          fileRow.style.cssText = `
            padding: 10px 15px;
            border-bottom: 1px solid var(--panel-border);
            cursor: ${(isZip || isFolder) ? 'pointer' : 'default'};
            background-color: var(--panel-bg);
            display: flex;
            align-items: center;
            gap: 10px;
            opacity: ${(isZip || isFolder) ? '1' : '0.5'};
            transition: background-color 0.15s;
          `;
          
          const icon = isFolder ? '📁' : (isZip ? '📦' : '📄');
          fileRow.innerHTML = `<span style="font-size: 16px;">${icon}</span><span style="font-size: 13px;">${escapeHtml(normalizedName)}</span>`;
          
          if (isFolder) {
            fileRow.addEventListener('mouseover', () => fileRow.style.backgroundColor = 'var(--row-hover)');
            fileRow.addEventListener('mouseout', () => fileRow.style.backgroundColor = 'var(--panel-bg)');
            fileRow.addEventListener('click', () => {
              const nextPath = buildItemPath(dirPath, normalizedName);
              loadFiles(nextPath);
            });
            fileRow.addEventListener('dblclick', () => {
              const nextPath = buildItemPath(dirPath, normalizedName);
              loadFiles(nextPath);
            });
          } else if (isZip) {
            fileRow.addEventListener('mouseover', () => fileRow.style.backgroundColor = 'var(--row-hover)');
            fileRow.addEventListener('mouseout', () => fileRow.style.backgroundColor = selectedFile?.path === buildItemPath(dirPath, normalizedName) ? 'var(--row-selected)' : 'var(--panel-bg)');
            fileRow.addEventListener('click', () => {
              document.querySelectorAll('#fileList > div').forEach(el => {
                el.style.backgroundColor = 'var(--panel-bg)';
              });
              fileRow.style.backgroundColor = 'var(--row-selected)';
              const fullPath = buildItemPath(dirPath, normalizedName);
              selectedFile = { name: normalizedName, path: fullPath };
              if (selectBtn) {
                selectBtn.disabled = false;
                selectBtn.style.opacity = '1';
                selectBtn.style.cursor = 'pointer';
              }
            });
            fileRow.addEventListener('dblclick', async () => {
              document.querySelectorAll('#fileList > div').forEach(el => {
                el.style.backgroundColor = 'var(--panel-bg)';
              });
              fileRow.style.backgroundColor = 'var(--row-selected)';
              const fullPath = buildItemPath(dirPath, normalizedName);
              selectedFile = { name: normalizedName, path: fullPath };
              if (selectBtn) {
                selectBtn.disabled = false;
                selectBtn.style.opacity = '1';
                selectBtn.style.cursor = 'pointer';
              }
              statusDiv.textContent = 'Reading file...';
              try {
                const fileBytes = await window.packageInstallerGlobals.readBinaryFile(fullPath);
                const file = new File([fileBytes], normalizedName, { type: 'application/zip' });
                await processUploadedFile(file, container);
              } catch (error) {
                statusDiv.textContent = `Error: ${error.message}`;
                statusDiv.style.color = '#d13438';
              }
            });
          }
          
          fileListDiv.appendChild(fileRow);
        }
        
        statusDiv.textContent = '';
      } catch (error) {
        statusDiv.textContent = `Error: ${error.message}`;
        statusDiv.style.color = '#d13438';
        fileListDiv.innerHTML = '';
      }
    }
    
    loadFiles('');
    
    selectBtn.addEventListener('click', async () => {
      if (selectedFile) {
        try {
          statusDiv.textContent = 'Reading file...';
          const fileBytes = await window.packageInstallerGlobals.readBinaryFile(selectedFile.path);
          const file = new File([fileBytes], selectedFile.name, { type: 'application/zip' });
          await processUploadedFile(file, container);
        } catch (error) {
          statusDiv.textContent = `Error: ${error.message}`;
          statusDiv.style.color = '#d13438';
        }
      }
    });
    
    cancelBtn.addEventListener('click', () => {
      container.innerHTML = '';
    });
  }

  async function installFromPath(container) {
    try {
      const html = `
        <div style="display: flex; flex-direction: column; gap: 15px;">
          <h3>Install App Package</h3>
          <p id="status" style="font-size: 14px; color: #666;">Reading file from path...</p>
        </div>
      `;
      container.innerHTML = html;
      
      const zipBytes = await window.packageInstallerGlobals.readBinaryFile(path);
      if (!zipBytes || !zipBytes.length) {
        throw new Error('Failed to read file from path');
      }
      
      const unzippedFiles = await window.packageInstallerGlobals.parseZipData(zipBytes);
      
      const packageMetadata = await window.packageInstallerGlobals.getPackageMetadata(unzippedFiles);
      showConfirmationDialog(container, unzippedFiles, packageMetadata.folderName, packageMetadata);
    } catch (error) {
      container.querySelector('#status').textContent = `Error: ${error.message}`;
      container.querySelector('#status').style.color = '#d13438';
    }
  }

  // Initialize UI
  const container = document.createElement('div');
  container.style.cssText = 'padding: 20px; font-family: Arial, sans-serif; min-width: 420px;';
  root.appendChild(container);
  applySystemTheme(container);

  if (path === undefined) {
    showUploadInterface(container);
  } else {
    installFromPath(container);
  }

  let instance = window.protectedGlobals.apptools.api.createAppInstance({
    rootElement: root,
    title: "Package Installer",
    btnMax: topbar ? topbar.querySelector(".btnMaxColor") : null,
  });
  window.protectedGlobals.apptools.api.trackInstance(instance, "packageInstaller");
  return instance;
};