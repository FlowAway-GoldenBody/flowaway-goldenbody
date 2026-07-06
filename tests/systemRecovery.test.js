const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
const os = require('os');

const {
  ensureBrokenAppsBackup,
  resetSystemApp,
  deleteUserApp,
  repairSystemFiles,
} = require('../src/server/systemRecovery');

test('ensureBrokenAppsBackup stores only the requested app in brokenApps', () => {
  const tmpRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'system-recovery-'));
  const userRoot = path.join(tmpRoot, 'user-root');
  const sampleRoot = path.join(tmpRoot, 'sample-root');
  const userAppsRoot = path.join(userRoot, 'systemfiles', 'runtime', 'apps');
  const sampleAppsRoot = path.join(sampleRoot, 'systemfiles', 'runtime', 'apps');
  const brokenAppsRoot = path.join(userRoot, 'systemfiles', 'runtime', 'brokenApps');

  fs.mkdirSync(path.join(userAppsRoot, 'browser'), { recursive: true });
  fs.mkdirSync(path.join(userAppsRoot, 'custom-app'), { recursive: true });
  fs.mkdirSync(path.join(sampleAppsRoot, 'browser'), { recursive: true });
  fs.mkdirSync(path.join(sampleAppsRoot, 'custom-app'), { recursive: true });

  fs.writeFileSync(path.join(userAppsRoot, 'browser', 'entry.json'), JSON.stringify({ functionname: 'browser', label: 'Browser' }));
  fs.writeFileSync(path.join(userAppsRoot, 'custom-app', 'entry.json'), JSON.stringify({ functionname: 'customapp', label: 'Custom App' }));
  fs.writeFileSync(path.join(sampleAppsRoot, 'browser', 'entry.json'), JSON.stringify({ functionname: 'browser', label: 'Browser' }));
  fs.writeFileSync(path.join(sampleAppsRoot, 'custom-app', 'entry.json'), JSON.stringify({ functionname: 'customapp', label: 'Custom App' }));

  fs.writeFileSync(path.join(userAppsRoot, 'browser', 'app.txt'), 'user-browser');
  fs.writeFileSync(path.join(userAppsRoot, 'custom-app', 'app.txt'), 'user-custom');
  fs.writeFileSync(path.join(sampleAppsRoot, 'browser', 'app.txt'), 'factory-browser');
  fs.writeFileSync(path.join(sampleAppsRoot, 'custom-app', 'app.txt'), 'factory-custom');

  ensureBrokenAppsBackup({
    userRoot,
    sampleRoot,
    appsRoot: userAppsRoot,
    sampleAppsRoot,
    brokenAppsRoot,
    appIdentifier: 'customapp'
  });

  assert.ok(fs.existsSync(path.join(brokenAppsRoot, 'custom-app')));
  assert.ok(!fs.existsSync(path.join(brokenAppsRoot, 'browser')));
  assert.equal(fs.readFileSync(path.join(brokenAppsRoot, 'custom-app', 'app.txt'), 'utf8'), 'user-custom');
});

test('resetSystemApp restores the backed-up user app instead of the sample app', () => {
  const tmpRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'system-recovery-'));
  const userRoot = path.join(tmpRoot, 'user-root');
  const sampleRoot = path.join(tmpRoot, 'sample-root');
  const userAppsRoot = path.join(userRoot, 'systemfiles', 'runtime', 'apps');
  const sampleAppsRoot = path.join(sampleRoot, 'systemfiles', 'runtime', 'apps');
  const brokenAppsRoot = path.join(userRoot, 'systemfiles', 'runtime', 'brokenApps');

  fs.mkdirSync(path.join(userAppsRoot, 'custom-app'), { recursive: true });
  fs.mkdirSync(path.join(sampleAppsRoot, 'custom-app'), { recursive: true });
  fs.mkdirSync(brokenAppsRoot, { recursive: true });

  fs.writeFileSync(path.join(userAppsRoot, 'custom-app', 'entry.json'), JSON.stringify({ functionname: 'customapp', label: 'Custom App' }));
  fs.writeFileSync(path.join(sampleAppsRoot, 'custom-app', 'entry.json'), JSON.stringify({ functionname: 'customapp', label: 'Custom App' }));
  fs.writeFileSync(path.join(userAppsRoot, 'custom-app', 'app.txt'), 'user-custom');
  fs.writeFileSync(path.join(sampleAppsRoot, 'custom-app', 'app.txt'), 'factory-custom');

  const backupResult = ensureBrokenAppsBackup({
    userRoot,
    sampleRoot,
    appsRoot: userAppsRoot,
    sampleAppsRoot,
    brokenAppsRoot,
    appIdentifier: 'customapp'
  });
  assert.equal(backupResult.length, 1);

  fs.writeFileSync(path.join(userAppsRoot, 'custom-app', 'app.txt'), 'changed-user-state');

  const result = resetSystemApp({
    userRoot,
    appsRoot: userAppsRoot,
    brokenAppsRoot,
    sampleRoot,
    sampleAppsRoot,
    appIdentifier: 'customapp'
  });

  assert.equal(result.success, true);
  assert.equal(fs.readFileSync(path.join(userAppsRoot, 'custom-app', 'app.txt'), 'utf8'), 'user-custom');
});

test('deleteUserApp removes only non-system apps', () => {
  const tmpRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'system-recovery-'));
  const userRoot = path.join(tmpRoot, 'user-root');
  const sampleRoot = path.join(tmpRoot, 'sample-root');
  const userAppsRoot = path.join(userRoot, 'systemfiles', 'runtime', 'apps');
  const sampleAppsRoot = path.join(sampleRoot, 'systemfiles', 'runtime', 'apps');

  fs.mkdirSync(path.join(userAppsRoot, 'browser'), { recursive: true });
  fs.mkdirSync(path.join(userAppsRoot, 'custom-app'), { recursive: true });
  fs.mkdirSync(path.join(sampleAppsRoot, 'browser'), { recursive: true });

  fs.writeFileSync(path.join(userAppsRoot, 'browser', 'entry.json'), JSON.stringify({ functionname: 'browser', label: 'Browser' }));
  fs.writeFileSync(path.join(userAppsRoot, 'custom-app', 'entry.json'), JSON.stringify({ functionname: 'customapp', label: 'Custom App' }));
  fs.writeFileSync(path.join(sampleAppsRoot, 'browser', 'entry.json'), JSON.stringify({ functionname: 'browser', label: 'Browser' }));

  const result = deleteUserApp({
    userRoot,
    appsRoot: userAppsRoot,
    sampleRoot,
    sampleAppsRoot,
    appIdentifier: 'customapp',
  });

  assert.equal(result.success, true);
  assert.ok(fs.existsSync(path.join(userAppsRoot, 'browser')));
  assert.ok(!fs.existsSync(path.join(userAppsRoot, 'custom-app')));
});

test('repairSystemFiles backs up original core and helpers before restoring sample files', () => {
  const tmpRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'system-recovery-'));
  const userRoot = path.join(tmpRoot, 'user-root');
  const sampleRoot = path.join(tmpRoot, 'sample-root');

  fs.mkdirSync(path.join(userRoot, 'core'), { recursive: true });
  fs.mkdirSync(path.join(userRoot, 'helpers'), { recursive: true });
  fs.mkdirSync(path.join(sampleRoot, 'core'), { recursive: true });
  fs.mkdirSync(path.join(sampleRoot, 'helpers'), { recursive: true });

  fs.writeFileSync(path.join(userRoot, 'core', 'user.txt'), 'user-core');
  fs.writeFileSync(path.join(userRoot, 'helpers', 'user.txt'), 'user-helpers');
  fs.writeFileSync(path.join(sampleRoot, 'core', 'sample.txt'), 'sample-core');
  fs.writeFileSync(path.join(sampleRoot, 'helpers', 'sample.txt'), 'sample-helpers');

  const result = repairSystemFiles({ userRoot, sampleRoot });

  assert.equal(result.success, true);
  assert.equal(fs.readFileSync(path.join(userRoot, 'core', 'sample.txt'), 'utf8'), 'sample-core');
  assert.equal(fs.readFileSync(path.join(userRoot, 'helpers', 'sample.txt'), 'utf8'), 'sample-helpers');
  assert.equal(fs.readFileSync(path.join(userRoot, 'systemfiles', 'runtime', 'brokenSystem', 'core', 'user.txt'), 'utf8'), 'user-core');
  assert.equal(fs.readFileSync(path.join(userRoot, 'systemfiles', 'runtime', 'brokenSystem', 'helpers', 'user.txt'), 'utf8'), 'user-helpers');
});
