const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const AdmZip = require('adm-zip');
const { refreshUserUsage } = require('./storageQuota');

function readJsonSafe(filePath) {
  try {
    return JSON.parse(fs.readFileSync(filePath, 'utf8'));
  } catch (e) {
    return null;
  }
}
function pathInside(base, candidate) {
  const relative = path.relative(base, candidate);

  return (
    relative !== '' &&
    !relative.startsWith(`..${path.sep}`) &&
    !path.isAbsolute(relative)
  );
}

function copyDirRecursive(srcDir, dstDir) {
  if (!srcDir || !fs.existsSync(srcDir)) return;

  const resolvedSrcDir = path.resolve(srcDir);
  const resolvedDstDir = path.resolve(dstDir);
  if (resolvedSrcDir === resolvedDstDir) return;

  if (fs.existsSync(dstDir)) {
    fs.rmSync(dstDir, { recursive: true, force: true });
  }

  fs.mkdirSync(dstDir, { recursive: true });
  const entries = fs.readdirSync(srcDir, { withFileTypes: true });
  for (const entry of entries) {
    const srcPath = path.join(srcDir, entry.name);
    const dstPath = path.join(dstDir, entry.name);

    if (entry.isDirectory()) {
      copyDirRecursive(srcPath, dstPath);
    } else if (entry.isFile()) {
      fs.mkdirSync(path.dirname(dstPath), { recursive: true });
      fs.copyFileSync(srcPath, dstPath);
    }
  }
}

function appRequestsAdminPerm(appDirPath) {
  const entryJsonPath = path.join(appDirPath, 'entry.json');
  const entry = fs.existsSync(entryJsonPath) ? readJsonSafe(entryJsonPath) : null;
  return Boolean(entry && entry.requestAdminPerm);
}

function syncAppJsKey(appDirPath, masterKey) {
  const jsKeyPath = path.join(appDirPath, 'jsKey.txt');
  if (masterKey) {
    fs.writeFileSync(jsKeyPath, masterKey, 'utf8');
  } else if (fs.existsSync(jsKeyPath)) {
    fs.rmSync(jsKeyPath, { force: true });
  }
}

function normalizeValue(value) {
  return String(value || '').trim().toLowerCase();
}

function collectSystemAppDefinitions(appsRoot) {
  if (!appsRoot || !fs.existsSync(appsRoot)) return [];

  const entries = fs.readdirSync(appsRoot, { withFileTypes: true });
  const definitions = [];

  for (const entry of entries) {
    if (!entry.isDirectory() || entry.name.startsWith('.')) continue;

    const appDirPath = path.join(appsRoot, entry.name);
    const entryPath = path.join(appDirPath, 'entry.json');
    const entryData = fs.existsSync(entryPath) ? readJsonSafe(entryPath) : null;
    const functionName = entryData && typeof entryData === 'object' && entryData.functionName
      ? String(entryData.functionName)
      : '';
    const label = entryData && typeof entryData === 'object' && entryData.label
      ? String(entryData.label)
      : entry.name;

    definitions.push({
      id: functionName || entry.name,
      label,
      folderName: entry.name,
      appDirPath,
      entryPath,
    });
  }

  return definitions;
}

function findMatchingAppDefinition(definitions, appIdentifier) {
  if (!definitions.length || !appIdentifier) return null;
  const normalizedInput = typeof appIdentifier === 'object'
    ? [appIdentifier.id, appIdentifier.functionName, appIdentifier.label, appIdentifier.folderName]
    : [appIdentifier];

  for (const candidate of normalizedInput) {
    if (!candidate) continue;
    const normalizedCandidate = normalizeValue(candidate);
    const match = definitions.find((definition) => {
      const values = [definition.id, definition.label, definition.folderName];
      return values.some((value) => normalizeValue(value) === normalizedCandidate);
    });
    if (match) return match;
  }

  return null;
}

function getRecoveryPaths(options = {}) {
  const userRoot = options.userRoot || '';
  const sampleRoot = options.sampleRoot || '';
  const appsRoot = options.appsRoot || path.join(userRoot, 'systemfiles', 'runtime', 'apps');
  const sampleAppsRoot = options.sampleAppsRoot || path.join(sampleRoot, 'systemfiles', 'runtime', 'apps');
  const brokenAppsRoot = options.brokenAppsRoot || path.join(userRoot, 'systemfiles', 'runtime', 'brokenApps');

  return {
    userRoot,
    sampleRoot,
    appsRoot,
    sampleAppsRoot,
    brokenAppsRoot,
  };
}





function splitRecoveryAppDefinitions(options = {}) {
  const { userRoot, sampleRoot, appsRoot, sampleAppsRoot } = getRecoveryPaths(options);
  const userAppsRoot = appsRoot || path.join(userRoot, 'systemfiles', 'runtime', 'apps');
  const sampleAppsRootResolved = sampleAppsRoot || path.join(sampleRoot, 'systemfiles', 'runtime', 'apps');
  const userDefinitions = collectSystemAppDefinitions(userAppsRoot);
  const sampleDefinitions = collectSystemAppDefinitions(sampleAppsRootResolved);
  const sampleIds = new Set(sampleDefinitions.map((definition) => normalizeValue(definition.id)));
  const sampleFolderNames = new Set(sampleDefinitions.map((definition) => normalizeValue(definition.folderName)));

  const systemApps = [];
  const nonSystemApps = [];

  for (const definition of userDefinitions) {
    const normalizedId = normalizeValue(definition.id);
    const normalizedFolderName = normalizeValue(definition.folderName);
    if (sampleIds.has(normalizedId) || sampleFolderNames.has(normalizedFolderName)) {
      systemApps.push(definition);
    } else {
      nonSystemApps.push(definition);
    }
  }

  return { systemApps, nonSystemApps };
}

function getRecoveryCatalog(options = {}) {
  const { userRoot, sampleRoot, appsRoot, sampleAppsRoot } = getRecoveryPaths(options);
  const userAppsRoot = appsRoot || path.join(userRoot, 'systemfiles', 'runtime', 'apps');
  const sampleAppsRootResolved = sampleAppsRoot || path.join(sampleRoot, 'systemfiles', 'runtime', 'apps');

  const sampleDefinitions = collectSystemAppDefinitions(sampleAppsRootResolved);
  const userDefinitions = collectSystemAppDefinitions(userAppsRoot);

  const userDefinitionsByKey = new Map();
  for (const definition of userDefinitions) {
    userDefinitionsByKey.set(normalizeValue(definition.folderName), definition);
    userDefinitionsByKey.set(normalizeValue(definition.id), definition);
  }

  const systemApps = sampleDefinitions.map((definition) => {
    const normalizedId = normalizeValue(definition.id);
    const normalizedFolderName = normalizeValue(definition.folderName);
    return userDefinitionsByKey.get(normalizedFolderName)
      || userDefinitionsByKey.get(normalizedId)
      || definition;
  });

  return systemApps.map((definition) => ({
    id: definition.id,
    label: definition.label,
    folderName: definition.folderName,
  }));
}

function getNonSystemRecoveryCatalog(options = {}) {
  const { nonSystemApps } = splitRecoveryAppDefinitions(options);
  return nonSystemApps.map((definition) => ({
    id: definition.id,
    label: definition.label,
    folderName: definition.folderName,
  }));
}

function repairSystemFiles(options = {}) {
  const { userRoot, sampleRoot } = getRecoveryPaths(options);
  const sampleCoreDirs = [
    path.join(sampleRoot, 'systemfiles', 'runtime', 'core'),
    path.join(sampleRoot, 'core'),
  ];
  const sampleHelpersDirs = [
    path.join(sampleRoot, 'systemfiles', 'runtime', 'helpers'),
    path.join(sampleRoot, 'helpers'),
  ];
  const userCoreDirs = [
    path.join(userRoot, 'systemfiles', 'runtime', 'core'),
    path.join(userRoot, 'core'),
  ];
  const userHelpersDirs = [
    path.join(userRoot, 'systemfiles', 'runtime', 'helpers'),
    path.join(userRoot, 'helpers'),
  ];

  const sourceCore = sampleCoreDirs.find((dir) => fs.existsSync(dir));
  const sourceHelpers = sampleHelpersDirs.find((dir) => fs.existsSync(dir));
  const targetCore = userCoreDirs[0];
  const targetHelpers = userHelpersDirs[0];
  const legacyTargetCore = userCoreDirs[1];
  const legacyTargetHelpers = userHelpersDirs[1];

  const destCore = fs.existsSync(targetCore) || !fs.existsSync(legacyTargetCore) ? targetCore : legacyTargetCore;
  const destHelpers = fs.existsSync(targetHelpers) || !fs.existsSync(legacyTargetHelpers) ? targetHelpers : legacyTargetHelpers;

  if (!sourceCore && !sourceHelpers) {
    return { success: false, error: 'sample system files unavailable' };
  }

  const backupEntries = [];
  if (fs.existsSync(destCore)) backupEntries.push({ path: destCore, rootName: 'core' });
  if (fs.existsSync(destHelpers)) backupEntries.push({ path: destHelpers, rootName: 'helpers' });
  const backupDownload = backupEntries.length
    ? createDirectoryBackupZip(backupEntries, `systemfiles-repair-backup-${Date.now()}.zip`)
    : null;

  if (fs.existsSync(targetCore)) {
    fs.rmSync(targetCore, { recursive: true, force: true });
  }
  if (fs.existsSync(targetHelpers)) {
    fs.rmSync(targetHelpers, { recursive: true, force: true });
  }
  if (fs.existsSync(legacyTargetCore)) {
    fs.rmSync(legacyTargetCore, { recursive: true, force: true });
  }
  if (fs.existsSync(legacyTargetHelpers)) {
    fs.rmSync(legacyTargetHelpers, { recursive: true, force: true });
  }

  if (sourceCore) {
    copyDirRecursive(sourceCore, destCore);
  }
  if (sourceHelpers) {
    copyDirRecursive(sourceHelpers, destHelpers);
  }

  refreshUserUsage(path.basename(path.dirname(userRoot)), userRoot).catch(() => {});

  return {
    success: true,
    repaired: ['core', 'helpers'],
    ...(backupDownload || {}),
  };
}

function createDirectoryBackupZip(entries, backupFileName = 'backup.zip') {
  const zip = new AdmZip();
  const sourceEntries = Array.isArray(entries) ? entries : [entries];

  for (const entry of sourceEntries) {
    if (!entry || !entry.path || !fs.existsSync(entry.path)) continue;
    const zipRootName = entry.rootName || path.basename(entry.path);
    zip.addLocalFolder(entry.path, zipRootName);
  }

  const zipEntries = zip.getEntries();
  if (!zipEntries || !zipEntries.length) return null;

  return {
    backupFileName,
    backupData: zip.toBuffer().toString('base64'),
    backupMimeType: 'application/zip',
  };
}

function resetSystemFiles(options = {}) {
  const { userRoot, sampleRoot } = getRecoveryPaths(options);
  const userSystemFiles = path.join(userRoot, 'systemfiles');

  if (!sampleRoot) {
    return { success: false, error: 'sample root unavailable' };
  }

  const sampleSystemFiles = path.join(sampleRoot, 'systemfiles');
  if (!fs.existsSync(sampleSystemFiles)) {
    return { success: false, error: 'sample system files unavailable' };
  }

  let backupDownload = null;

  try {
    if (fs.existsSync(userSystemFiles)) {
      backupDownload = createDirectoryBackupZip(
        [{ path: userSystemFiles, rootName: 'systemfiles' }],
        `systemfiles-backup-${Date.now()}.zip`,
      );
    }

    // copy sample systemfiles into place
    copyDirRecursive(sampleSystemFiles, userSystemFiles);

    // generate a new random master key (do NOT use sample key)
    const masterKey = crypto.randomBytes(16).toString('hex');
    const userProfileDir = path.join(userRoot, 'systemfiles', 'userprofile');
    fs.mkdirSync(userProfileDir, { recursive: true });
    fs.writeFileSync(path.join(userProfileDir, 'jsApiKey.txt'), masterKey, 'utf8');

    // propagate key to apps that request admin permission
    const appsRoot = path.join(userSystemFiles, 'runtime', 'apps');
    if (fs.existsSync(appsRoot)) {
      const entries = fs.readdirSync(appsRoot, { withFileTypes: true });
      for (const entry of entries) {
        if (!entry.isDirectory()) continue;
        const appDir = path.join(appsRoot, entry.name);
        try {
          if (appRequestsAdminPerm(appDir)) {
            syncAppJsKey(appDir, masterKey);
          }
        } catch (e) {
          // ignore per-app errors
        }
      }
    }

    refreshUserUsage(path.basename(path.dirname(userRoot)), userRoot).catch(() => {});

    return {
      success: true,
      ...(backupDownload || {}),
    };
  } catch (err) {
    return { success: false, error: String(err && err.message ? err.message : err) };
  }
}

function deleteUserApp(options = {}) {
  const { userRoot, appsRoot } = getRecoveryPaths(options);
  const targetAppsRoot = appsRoot || path.join(userRoot, 'systemfiles', 'runtime', 'apps');
  const { nonSystemApps } = splitRecoveryAppDefinitions(options);
  const match = findMatchingAppDefinition(nonSystemApps, options.appIdentifier);

  if (!match) {
    return { success: false, error: 'unable to locate matching non-system app' };
  }

  const targetAppDir = path.join(targetAppsRoot, match.folderName);
  if (fs.existsSync(targetAppDir)) {
    fs.rmSync(targetAppDir, { recursive: true, force: true });
  }

  return {
    success: true,
    app: {
      id: match.id,
      label: match.label,
      folderName: match.folderName,
    },
  };
}

function restoreSystemAppJsKeys(options = {}) {
  const { userRoot, sampleRoot, appsRoot, sampleAppsRoot } = getRecoveryPaths(options);
  const targetAppsRoot = appsRoot || path.join(userRoot, 'systemfiles', 'runtime', 'apps');
  const sourceAppsRoot = sampleAppsRoot || path.join(sampleRoot, 'systemfiles', 'runtime', 'apps');
  const masterKeyPath = path.join(userRoot, 'systemfiles', 'userprofile', 'jsApiKey.txt');
  const masterKey = options.masterKey || (fs.existsSync(masterKeyPath) ? fs.readFileSync(masterKeyPath, 'utf8').trim() : '');

  if (!sourceAppsRoot || !fs.existsSync(sourceAppsRoot)) return { restoredCount: 0, apps: [] };

  const restoredApps = [];
  const definitions = collectSystemAppDefinitions(sourceAppsRoot);

  for (const definition of definitions) {
    if (!appRequestsAdminPerm(definition.appDirPath)) continue;
    const targetAppDir = path.join(targetAppsRoot, definition.folderName);
    if (!fs.existsSync(targetAppDir)) continue;
    syncAppJsKey(targetAppDir, masterKey);
    restoredApps.push({ id: definition.id, label: definition.label, folderName: definition.folderName });
  }

  return { restoredCount: restoredApps.length, apps: restoredApps };
}

function resetSystemApp(options = {}) {
  const { userRoot, appsRoot, sampleRoot, sampleAppsRoot } = getRecoveryPaths(options);
  const targetAppsRoot = appsRoot || path.join(userRoot, 'systemfiles', 'runtime', 'apps');
  const fallbackAppsRoot = sampleAppsRoot || path.join(sampleRoot, 'systemfiles', 'runtime', 'apps');

  if (!targetAppsRoot || !fs.existsSync(targetAppsRoot)) {
    return { success: false, error: 'user apps directory is missing' };
  }

  const { systemApps } = splitRecoveryAppDefinitions(options);
  let match = findMatchingAppDefinition(systemApps, options.appIdentifier);

  if (!match && fallbackAppsRoot && fs.existsSync(fallbackAppsRoot)) {
    const fallbackDefinitions = collectSystemAppDefinitions(fallbackAppsRoot);
    match = findMatchingAppDefinition(fallbackDefinitions, options.appIdentifier);
  }

  if (!match) {
    return { success: false, error: 'unable to locate matching system app' };
  }

  const targetAppDir = path.join(targetAppsRoot, match.folderName);
  fs.mkdirSync(path.dirname(targetAppDir), { recursive: true });

  let backupDownload = null;
  if (fs.existsSync(targetAppDir)) {
    backupDownload = createDirectoryBackupZip(
      [{ path: targetAppDir, rootName: match.folderName || 'app' }],
      `${match.folderName || 'app'}-backup-${Date.now()}.zip`,
    );
  }

  const fallbackSourceAppDir = fallbackAppsRoot && fs.existsSync(path.join(fallbackAppsRoot, match.folderName))
    ? path.join(fallbackAppsRoot, match.folderName)
    : null;
  const alternateSourceAppDir = match.appDirPath && path.resolve(match.appDirPath) !== path.resolve(targetAppDir)
    ? match.appDirPath
    : null;
  const sourceAppDir = fallbackSourceAppDir || alternateSourceAppDir;

  if (!sourceAppDir) {
    return { success: false, error: 'no reset source available' };
  }

  fs.rmSync(targetAppDir, { recursive: true, force: true });
  copyDirRecursive(sourceAppDir, targetAppDir);

  const masterKeyPath = path.join(userRoot, 'systemfiles', 'userprofile', 'jsApiKey.txt');
  const masterKey = fs.existsSync(masterKeyPath) ? fs.readFileSync(masterKeyPath, 'utf8').trim() : '';
  if (appRequestsAdminPerm(targetAppDir)) {
    syncAppJsKey(targetAppDir, masterKey);
  }

  refreshUserUsage(path.basename(path.dirname(userRoot)), userRoot).catch(() => {});

  return {
    success: true,
    app: {
      id: match.id,
      label: match.label,
      folderName: match.folderName,
    },
    ...(backupDownload || {}),
  };
}

function validateUsername(username) {
  return typeof username === 'string' &&
    /^[A-Za-z0-9_-]{1,64}$/.test(username);
}

function getUserPaths(username) {
  if (!validateUsername(username)) {
    throw new Error('invalid username');
  }
  const safeUsername = String(username || '').trim();

  const baseDir = path.resolve(__dirname, 'zmcdfiles');
  const userDir = path.resolve(baseDir, username);

  if (!pathInside(baseDir, userDir)) {
    throw new Error('path escape');
  }

  const userRoot = path.join(userDir, 'root');
  const authFile = path.join(userDir, `${safeUsername}.txt`);
  return { safeUsername, userDir, userRoot, authFile };
}

function readAuthRecord(userPaths) {
  if (!userPaths || !userPaths.authFile || !fs.existsSync(userPaths.authFile)) return null;
  const raw = readJsonSafe(userPaths.authFile);
  if (!raw || typeof raw !== 'object') return null;
  return raw;
}

function parseJsonBody(req) {
  return new Promise((resolve) => {
    let body = '';
    req.on('data', (chunk) => {
      body += chunk;
      if (body.length > 1e6) {
        req.socket.destroy();
      }
    });
    req.on('end', () => {
      try {
        resolve(body ? JSON.parse(body) : {});
      } catch (e) {
        resolve({});
      }
    });
  });
}

function deleteAccountDirectory(userPaths) {
  if (!userPaths || !userPaths.userDir) return false;
  try {
    if (fs.existsSync(userPaths.userDir)) {
      fs.rmSync(userPaths.userDir, { recursive: true, force: true });
    }
    return true;
  } catch (e) {
    return false;
  }
}

function handleSystemRecoveryRequest(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    res.writeHead(204);
    res.end();
    return;
  }

  const requestPath = new URL(req.url || '/', 'http://127.0.0.1').pathname;
  if (
    requestPath !== '/' &&
    requestPath !== '/server/systemRecovery' &&
    requestPath !== '/server/systemRecovery/'
  ) {
    res.writeHead(404);
    res.end(JSON.stringify({ error: 'not found' }));
    return;
  }

  parseJsonBody(req).then((payload) => {
    const username = String(payload.username || '').trim();
    const password = String(payload.password || '').trim();
    const action = String(payload.action || payload.systemRecoveryAction || '').trim();
    let userPaths;

    try {
        userPaths = getUserPaths(username);
    } catch (e) {
        res.writeHead(400, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'invalid username' }));
        return;
    }

    const authRecord = readAuthRecord(userPaths);

    if (!authRecord || !authRecord.password || password !== authRecord.password) {
      res.writeHead(401);
      res.end(JSON.stringify({ error: 'incorrect username or password' }));
      return;
    }

    const userRoot = userPaths.userRoot;
    const systemFilesRoot = path.join(userRoot, 'systemfiles');
    const appsRoot = path.join(systemFilesRoot, 'runtime', 'apps');
    const sampleRoot = path.resolve(__dirname, 'USER', 'root');
    const sampleAppsRoot = path.join(sampleRoot, 'systemfiles', 'runtime', 'apps');
    const brokenAppsRoot = path.join(systemFilesRoot, 'runtime', 'brokenApps');

    if (action === 'list') {
      const systemApps = getRecoveryCatalog({
        userRoot,
        appsRoot,
        sampleRoot,
        sampleAppsRoot,
        brokenAppsRoot,
      });
      const nonSystemApps = getNonSystemRecoveryCatalog({
        userRoot,
        appsRoot,
        sampleRoot,
        sampleAppsRoot,
        brokenAppsRoot,
      });
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ success: true, systemApps, nonSystemApps }));
      return;
    }

    if (action === 'restoreSystemJsKeys') {
      const result = restoreSystemAppJsKeys({
        userRoot,
        appsRoot,
        sampleRoot,
        sampleAppsRoot,
      });
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ success: true, ...result }));
      return;
    }

    if (action === 'repairSystemFiles') {
      const result = repairSystemFiles({
        userRoot,
        sampleRoot,
      });
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify(result));
      return;
    }

    if (action === 'resetSystemFiles' || action === 'reset/systemfiles') {
      const result = resetSystemFiles({
        userRoot,
        sampleRoot,
      });
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify(result));
      return;
    }

    if (action === 'resetSystemApp') {
      const result = resetSystemApp({
        userRoot,
        appsRoot,
        brokenAppsRoot,
        sampleRoot,
        sampleAppsRoot,
        appIdentifier: payload.appIdentifier || payload.appId || payload.app || '',
      });
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify(result));
      return;
    }

    if (action === 'deleteUserApp') {
      const result = deleteUserApp({
        userRoot,
        appsRoot,
        sampleRoot,
        sampleAppsRoot,
        appIdentifier: payload.appIdentifier || payload.appId || payload.app || '',
      });
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify(result));
      return;
    }

    if (action === 'deleteAccount') {
      const deleted = deleteAccountDirectory(userPaths);
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ success: deleted, deleted }));
      return;
    }

    res.writeHead(400, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: 'unknown recovery action' }));
  });
}


module.exports = {
  handleSystemRecoveryRequest
};
