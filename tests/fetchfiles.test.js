const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const os = require('node:os');
const path = require('node:path');

const { writeEditPayload } = require('../src/server/fetchfiles');

test('writeEditPayload appends when replace is false', async () => {
  const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'fetchfiles-test-'));
  const filePath = path.join(tempDir, 'note.txt');

  await fs.writeFile(filePath, 'alpha');
  await writeEditPayload(filePath, Buffer.from('beta'), { replace: false });

  const contents = await fs.readFile(filePath, 'utf8');
  assert.equal(contents, 'alphabeta');

  await fs.rm(tempDir, { recursive: true, force: true });
});
