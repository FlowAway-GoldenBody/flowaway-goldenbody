window.packageInstallerGlobals = window.packageInstallerGlobals || {};
window.packageInstallerGlobals._jsZipLoader = window.packageInstallerGlobals._jsZipLoader || (function () {
  if (window.JSZip) {
    return Promise.resolve();
  }

  if (window.packageInstallerGlobals._jsZipLoader) {
    return window.packageInstallerGlobals._jsZipLoader;
  }

  const script = document.createElement('script');
  script.src = 'https://cdnjs.cloudflare.com/ajax/libs/jszip/3.10.1/jszip.min.js';
  script.crossOrigin = 'anonymous';
  script.async = true;

  const promise = new Promise((resolve, reject) => {
    script.onload = () => resolve();
    script.onerror = () => reject(new Error('Failed to load JSZip from CDN'));
  });

  window.packageInstallerGlobals._jsZipLoader = promise;
  document.head.appendChild(script);
  return promise;
})();

window.packageInstallerGlobals.ensureJSZipLoaded = window.packageInstallerGlobals.ensureJSZipLoaded || async function () {
  await window.packageInstallerGlobals._jsZipLoader;
  if (typeof JSZip === 'undefined') {
    throw new Error('JSZip library not available after loading CDN script');
  }
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

window.packageInstallerGlobals.sanitizeFolderName = window.packageInstallerGlobals.sanitizeFolderName || function (value) {
  const baseName = String(value || '').trim();
  const safeName = baseName
    .replace(/[<>:"/\\|?*\x00-\x1f]+/g, '-')
    .replace(/\s+/g, ' ')
    .replace(/^[.\s-]+|[.\s-]+$/g, '');
  return safeName || 'app-package';
};

window.packageInstallerGlobals.getPackageMetadata = window.packageInstallerGlobals.getPackageMetadata || async function (zipData) {
  const archiveFiles = Object.keys(zipData.files || {}).filter((entryPath) => !zipData.files[entryPath].dir);
  const entryJsonPath = archiveFiles.find((entryPath) => String(entryPath).split('/').pop().toLowerCase() === 'entry.json');

  if (!entryJsonPath) {
    throw new Error('Package is missing entry.json');
  }

  const entryFile = zipData.files[entryJsonPath];
  let rawText = '';
  try {
    rawText = await entryFile.async('string');
  } catch (error) {
    throw new Error('Unable to read entry.json from package');
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

    const masterKey = await window.packageInstallerGlobals.getMasterJsApiKey();
    if (masterKey) {
      await window.protectedGlobals.WriteFile(`${baseFolder}/jsKey.txt`, masterKey, { text: true });
    }

    statusDiv.textContent = 'Installation complete!';
    statusDiv.style.color = '#107c10';
  }

  function showConfirmationDialog(container, zipData, folderName, packageMetadata) {
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
      
      await window.packageInstallerGlobals.ensureJSZipLoaded();
      const zip = new JSZip();
      const unzippedFiles = await zip.loadAsync(zipData);
      
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
    
    async function loadFiles(dirPath) {
      try {
        currentPath = dirPath;
        currentPathSpan.textContent = dirPath || '(Root)';
        statusDiv.textContent = 'Loading...';
        fileListDiv.innerHTML = '';
        selectedFile = null;
        selectBtn.disabled = true;
        selectBtn.style.opacity = '0.5';
        
        const entries = await window.protectedGlobals.ReadFolder(dirPath || '/');
        const files = Array.isArray(entries) ? entries : [];
        
        if (files.length === 0) {
          fileListDiv.innerHTML = '<div style="padding: 15px; color: #999; text-align: center;">No items found</div>';
          statusDiv.textContent = '';
          return;
        }
        
        // Add back button if not in root
        if (dirPath && dirPath !== '/') {
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
            loadFiles(parentPath || '/');
          });
          fileListDiv.appendChild(backBtn);
        }
        
        for (const entry of files) {
          const name = typeof entry === 'string' ? entry : String(entry?.name || entry?.path || entry);
          const normalizedName = name || '';
          const isZip = normalizedName.toLowerCase().endsWith('.zip');
          let isFolder = false;
          
          if (!isZip) {
            try {
              const maybeFolderPath = (dirPath && dirPath !== '/' ? dirPath + '/' : '/') + normalizedName;
              const nested = await window.protectedGlobals.ReadFolder(maybeFolderPath);
              isFolder = Array.isArray(nested);
            } catch (e) {
              isFolder = false;
            }
          }
          
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
              const nextPath = (dirPath && dirPath !== '/' ? dirPath + '/' : '/') + normalizedName;
              loadFiles(nextPath);
            });
            fileRow.addEventListener('dblclick', () => {
              const nextPath = (dirPath && dirPath !== '/' ? dirPath + '/' : '/') + normalizedName;
              loadFiles(nextPath);
            });
          } else if (isZip) {
            fileRow.addEventListener('mouseover', () => fileRow.style.backgroundColor = 'var(--row-hover)');
            fileRow.addEventListener('mouseout', () => fileRow.style.backgroundColor = selectedFile?.path === ((dirPath && dirPath !== '/' ? dirPath + '/' : '/') + normalizedName) ? 'var(--row-selected)' : 'var(--panel-bg)');
            fileRow.addEventListener('click', () => {
              document.querySelectorAll('#fileList > div').forEach(el => {
                el.style.backgroundColor = 'var(--panel-bg)';
              });
              fileRow.style.backgroundColor = 'var(--row-selected)';
              const fullPath = (dirPath && dirPath !== '/' ? dirPath + '/' : '/') + normalizedName;
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
              const fullPath = (dirPath && dirPath !== '/' ? dirPath + '/' : '/') + normalizedName;
              selectedFile = { name: normalizedName, path: fullPath };
              if (selectBtn) {
                selectBtn.disabled = false;
                selectBtn.style.opacity = '1';
                selectBtn.style.cursor = 'pointer';
              }
              statusDiv.textContent = 'Reading file...';
              try {
                const fileContent = await window.protectedGlobals.ReadFile(fullPath, { buffer: true });
                const file = new File([fileContent], normalizedName, { type: 'application/zip' });
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
          const fileContent = await window.protectedGlobals.ReadFile(selectedFile.path, { buffer: true });
          const file = new File([fileContent], selectedFile.name, { type: 'application/zip' });
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
      
      const arrayBuffer = await window.protectedGlobals.ReadFile(path, { buffer: true });
      if (!arrayBuffer) {
        throw new Error('Failed to read file from path');
      }
      const zipData = new Uint8Array(arrayBuffer);
      
      await window.packageInstallerGlobals.ensureJSZipLoaded();
      const zip = new JSZip();
      const unzippedFiles = await zip.loadAsync(zipData);
      
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