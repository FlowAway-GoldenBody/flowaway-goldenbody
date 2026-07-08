const fs = require('fs');
const path = require('path');
const http = require('http');

function readJsonSafe(filePath) {
  try {
    return JSON.parse(fs.readFileSync(filePath, 'utf8'));
  } catch (e) {
    return null;
  }
}

function copyDirRecursive(srcDir, dstDir) {
  if (!srcDir || !fs.existsSync(srcDir)) return;
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

function getVersionedBackupPath(basePath) {
  if (!fs.existsSync(basePath)) return basePath;
  const timestamp = Date.now();
  let versionedPath = `${basePath}-${timestamp}`;
  let counter = 0;
  while (fs.existsSync(versionedPath)) {
    counter++;
    versionedPath = `${basePath}-${timestamp}-${counter}`;
  }
  return versionedPath;
}

function findLatestVersionedBackup(basePath) {
  if (fs.existsSync(basePath)) return basePath;
  const dir = path.dirname(basePath);
  const basename = path.basename(basePath);
  if (!fs.existsSync(dir)) return null;
  const entries = fs.readdirSync(dir).filter((name) => name.startsWith(`${basename}-`));
  if (!entries.length) return null;
  entries.sort().reverse();
  return path.join(dir, entries[0]);
}

function ensureBrokenAppsBackup(options = {}) {
  const { userRoot, appsRoot, sampleAppsRoot, brokenAppsRoot, sampleRoot } = getRecoveryPaths(options);
  const sourceAppsRoot = appsRoot || path.join(userRoot, 'systemfiles', 'runtime', 'apps');
  const targetBrokenAppsRoot = brokenAppsRoot || path.join(userRoot, 'systemfiles', 'runtime', 'brokenApps');

  if (!sourceAppsRoot || !fs.existsSync(sourceAppsRoot)) return [];

  const versionedBrokenAppsRoot = getVersionedBackupPath(targetBrokenAppsRoot);
  fs.mkdirSync(versionedBrokenAppsRoot, { recursive: true });
  const definitions = collectSystemAppDefinitions(sourceAppsRoot);
  const targetDefinitions = [];
  const requestedApp = options.appIdentifier;

  const backupDefinition = (definition) => {
    const backupAppDir = path.join(versionedBrokenAppsRoot, definition.folderName);
    copyDirRecursive(definition.appDirPath, backupAppDir);
    targetDefinitions.push(definition);
  };

  if (requestedApp) {
    const matchingDefinition = findMatchingAppDefinition(definitions, requestedApp);
    if (matchingDefinition) backupDefinition(matchingDefinition);
    return targetDefinitions;
  }

  for (const definition of definitions) {
    backupDefinition(definition);
  }

  if (!targetDefinitions.length && sampleRoot && sampleAppsRoot && fs.existsSync(sampleAppsRoot)) {
    const sampleDefinitions = collectSystemAppDefinitions(sampleAppsRoot);
    for (const definition of sampleDefinitions) {
      backupDefinition(definition);
    }
  }

  return targetDefinitions;
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
  const { systemApps } = splitRecoveryAppDefinitions(options);
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

function ensureBrokenSystemBackup(options = {}) {
  const { userRoot } = getRecoveryPaths(options);
  const brokenSystemRoot = path.join(userRoot, 'systemfiles', 'runtime', 'brokenSystem');
  const versionedBrokenSystemRoot = getVersionedBackupPath(brokenSystemRoot);
  fs.mkdirSync(versionedBrokenSystemRoot, { recursive: true });

  const userCoreDirs = [
    path.join(userRoot, 'systemfiles', 'runtime', 'core'),
    path.join(userRoot, 'core'),
  ];
  const userHelpersDirs = [
    path.join(userRoot, 'systemfiles', 'runtime', 'helpers'),
    path.join(userRoot, 'helpers'),
  ];

  const coreSource = userCoreDirs.find((dir) => fs.existsSync(dir));
  const helpersSource = userHelpersDirs.find((dir) => fs.existsSync(dir));

  if (coreSource) {
    copyDirRecursive(coreSource, path.join(versionedBrokenSystemRoot, 'core'));
  }
  if (helpersSource) {
    copyDirRecursive(helpersSource, path.join(versionedBrokenSystemRoot, 'helpers'));
  }

  return versionedBrokenSystemRoot;
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

  ensureBrokenSystemBackup(options);

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

  return { success: true, repaired: ['core', 'helpers'] };
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
    const targetAppDir = path.join(targetAppsRoot, definition.folderName);
    if (!fs.existsSync(targetAppDir)) continue;
    fs.writeFileSync(path.join(targetAppDir, 'jsKey.txt'), masterKey);
    restoredApps.push({ id: definition.id, label: definition.label, folderName: definition.folderName });
  }

  return { restoredCount: restoredApps.length, apps: restoredApps };
}

function resetSystemApp(options = {}) {
  const { userRoot, appsRoot, brokenAppsRoot, sampleRoot, sampleAppsRoot } = getRecoveryPaths(options);
  const targetAppsRoot = appsRoot || path.join(userRoot, 'systemfiles', 'runtime', 'apps');
  const backupRoot = brokenAppsRoot || path.join(userRoot, 'systemfiles', 'runtime', 'brokenApps');
  const fallbackAppsRoot = sampleAppsRoot || path.join(sampleRoot, 'systemfiles', 'runtime', 'apps');

  if (!targetAppsRoot || !fs.existsSync(targetAppsRoot)) {
    return { success: false, error: 'user apps directory is missing' };
  }

  const { systemApps } = splitRecoveryAppDefinitions(options);
  const match = findMatchingAppDefinition(systemApps, options.appIdentifier);
  if (!match) {
    return { success: false, error: 'unable to locate matching system app' };
  }

  const targetAppDir = path.join(targetAppsRoot, match.folderName);
  const backupAppDir = path.join(backupRoot, match.folderName);
  const latestBackupRoot = findLatestVersionedBackup(backupRoot);
  const latestBackupAppDir = latestBackupRoot ? path.join(latestBackupRoot, match.folderName) : null;
  fs.mkdirSync(path.dirname(targetAppDir), { recursive: true });

  let sourceBackupDir = null;
  if (fs.existsSync(backupAppDir)) {
    sourceBackupDir = backupAppDir;
  } else if (latestBackupAppDir && fs.existsSync(latestBackupAppDir)) {
    sourceBackupDir = latestBackupAppDir;
  }

  if (!sourceBackupDir) {
    ensureBrokenAppsBackup({
      userRoot,
      appsRoot: targetAppsRoot,
      sampleAppsRoot: fallbackAppsRoot,
      brokenAppsRoot: backupRoot,
      appIdentifier: match.id,
    });
    sourceBackupDir = latestBackupAppDir || backupAppDir;
  }

  fs.rmSync(targetAppDir, { recursive: true, force: true });
  if (sourceBackupDir && fs.existsSync(sourceBackupDir)) {
    copyDirRecursive(sourceBackupDir, targetAppDir);
  } else if (fallbackAppsRoot && fs.existsSync(path.join(fallbackAppsRoot, match.folderName))) {
    copyDirRecursive(path.join(fallbackAppsRoot, match.folderName), targetAppDir);
  } else {
    copyDirRecursive(match.appDirPath, targetAppDir);
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

function getUserPaths(username) {
  const safeUsername = String(username || '').trim();
  const baseDir = path.resolve(__dirname, 'zmcdfiles');
  const userDir = path.join(baseDir, safeUsername);
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
    const userPaths = getUserPaths(username);
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

let recoveryServer = null;
function startSystemRecoveryServer(port = 8085, host = '0.0.0.0') {
  if (recoveryServer) return recoveryServer;
  recoveryServer = http.createServer((req, res) => handleSystemRecoveryRequest(req, res));
  recoveryServer.listen(port, host, () => {
    console.log(`[systemRecovery] listening on ${host}:${port}`);
  });
  return recoveryServer;
}

module.exports = {
  collectSystemAppDefinitions,
  ensureBrokenAppsBackup,
  collectSystemAppDefinitions,
  ensureBrokenAppsBackup,
  getRecoveryCatalog,
  getNonSystemRecoveryCatalog,
  restoreSystemAppJsKeys,
  resetSystemApp,
  deleteUserApp,
  repairSystemFiles,
  ensureBrokenSystemBackup,
  startSystemRecoveryServer,
  handleSystemRecoveryRequest,
};
