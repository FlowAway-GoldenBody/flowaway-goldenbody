#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

const ROOT_DIR = path.resolve(__dirname, '..');
const USER_TEMPLATE_PATH = path.join(__dirname, 'USER', 'root');
const ZMCDFILES_DIR = path.join(__dirname, 'zmcdfiles');


function readTextFile(filePath) {
  try {
    return fs.readFileSync(filePath, 'utf8');
  } catch {
    return null;
  }
}

function isDirectory(filePath) {
  try {
    return fs.statSync(filePath).isDirectory();
  } catch {
    return false;
  }
}

function getSystemAppNames() {
  const templateAppsPath = path.join(USER_TEMPLATE_PATH, 'systemfiles', 'runtime', 'apps');
  if (!isDirectory(templateAppsPath)) {
    console.error('System app template directory not found:', templateAppsPath);
    return [];
  }

  return fs.readdirSync(templateAppsPath, { withFileTypes: true })
    .filter((entry) => {
      if (!entry.isDirectory() || entry.name.startsWith('.')) return false;
      const lowerName = entry.name.toLowerCase();
      if (lowerName.startsWith('sample') || lowerName.includes('sample')) return false;
      return true;
    })
    .map((entry) => entry.name);
}

function syncUserSystemKeys() {
  const systemAppNames = getSystemAppNames();
  if (!systemAppNames.length) {
    console.error('No system apps found to sync. Exiting.');
    process.exit(1);
  }

  if (!isDirectory(ZMCDFILES_DIR)) {
    console.error('zmcdfiles directory not found:', ZMCDFILES_DIR);
    process.exit(1);
  }

  const userDirs = fs.readdirSync(ZMCDFILES_DIR, { withFileTypes: true })
    .filter((entry) => entry.isDirectory() && !entry.name.startsWith('.'))
    .map((entry) => entry.name);

  for (const username of userDirs) {
    const userRoot = path.join(ZMCDFILES_DIR, username, 'root');
    const userProfilePath = path.join(userRoot, 'systemfiles', 'userprofile');
    const jsApiKeyPath = path.join(userProfilePath, 'jsApiKey.txt');
    const userKey = readTextFile(jsApiKeyPath);

    if (!userKey) {
      console.log(`Skipping user ${username}: missing jsApiKey.txt`);
      continue;
    }

    const userAppsPath = path.join(userRoot, 'systemfiles', 'runtime', 'apps');
    if (!isDirectory(userAppsPath)) {
      console.log(`Skipping user ${username}: runtime/apps directory missing`);
      continue;
    }

    const normalizedKey = userKey.trim();
    if (!normalizedKey) {
      console.log(`Skipping user ${username}: jsApiKey.txt is empty`);
      continue;
    }

    for (const appName of systemAppNames) {
      const userAppDir = path.join(userAppsPath, appName);
      if (!isDirectory(userAppDir)) {
        continue;
      }

      const appKeyPath = path.join(userAppDir, 'jsKey.txt');
      try {
        fs.writeFileSync(appKeyPath, normalizedKey);
        console.log(`Wrote jsKey.txt for user ${username} app ${appName}`);
      } catch (err) {
        console.error(`Failed to write jsKey.txt for ${username}/${appName}:`, err.message || err);
      }
    }
  }
}

syncUserSystemKeys();
