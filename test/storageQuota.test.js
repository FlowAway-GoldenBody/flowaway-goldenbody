const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const fsp = require('node:fs/promises');
const os = require('node:os');
const path = require('node:path');
const { getUserUsage, refreshUserUsage, invalidateUserUsage } = require('../src/server/storageQuota');

test('getUserUsage reflects filesystem mutations after explicit refresh', async () => {
  const tempRoot = await fsp.mkdtemp(path.join(os.tmpdir(), 'quota-test-'));
  const userRoot = path.join(tempRoot, 'root');
  const username = 'quota-user';

  try {
    await fsp.mkdir(userRoot, { recursive: true });
    await fsp.writeFile(path.join(userRoot, 'file.txt'), 'hello');

    assert.equal(await getUserUsage(username, userRoot), 5);

    await fsp.writeFile(path.join(userRoot, 'another.txt'), 'world!');
    await refreshUserUsage(username, userRoot);
    assert.equal(await getUserUsage(username, userRoot), 11);

    await fsp.unlink(path.join(userRoot, 'another.txt'));
    await refreshUserUsage(username, userRoot);
    assert.equal(await getUserUsage(username, userRoot), 5);
  } finally {
    invalidateUserUsage(username);
    await fsp.rm(tempRoot, { recursive: true, force: true });
  }
});
