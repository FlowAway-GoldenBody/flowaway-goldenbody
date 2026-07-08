const assert = require('assert');
const fs = require('fs');
const path = require('path');
const vm = require('vm');

async function runScenario() {
  const scriptPath = path.join(
    __dirname,
    '..',
    'src/server/USER/root/systemfiles/runtime/apps/browser/asset/indexedDB.js'
  );
  const script = fs.readFileSync(scriptPath, 'utf8');
  const writes = [];

  const context = {
    console,
    URL,
    Event,
    EventTarget,
    DOMException,
    setTimeout,
    clearTimeout,
    btoa: (value) => Buffer.from(value, 'binary').toString('base64'),
    atob: (value) => Buffer.from(value, 'base64').toString('binary'),
    frameWin: {
      location: { href: 'https://example.com/' },
      ArrayBuffer,
      Uint8Array,
      crypto: { randomUUID: () => 'test-uuid' }
    },
    window: {
      browserGlobals: {
        unshuffleURL: (url) => url,
        getCurProfileName: () => 'test-profile'
      },
      protectedGlobals: {
        ReadFile: async (filePath) => {
          if (filePath.endsWith('/metadata.json')) return '';
          throw new Error(`Unexpected read: ${filePath}`);
        },
        ReadFolder: async (dirPath) => {
          if (dirPath.endsWith('/indexedDB/example.com')) return [];
          if (dirPath.endsWith('/indexedDB/example.com/test-db')) return [];
          return [];
        },
        WriteFile: async (filePath, data) => {
          writes.push({ filePath, data });
        },
        DeleteFile: async () => {},
        DeleteFolder: async () => {}
      }
    }
  };

  context.global = context;
  context.globalThis = context;

  vm.createContext(context);
  vm.runInContext(script, context, { filename: scriptPath });

  const idb = context.frameWin.indexedDB;
  const request = idb.open('test-db', 1);

  const db = await new Promise((resolve, reject) => {
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });

  const transaction = db.transaction('users', 'readwrite');
  const store = transaction.objectStore('users');

  const completed = new Promise((resolve) => {
    transaction.oncomplete = () => resolve();
  });

  store.put({ hello: 'world' }, 'abc');
  transaction.commit();
  await completed;

  const writesForKey = writes.filter((entry) => entry.filePath.endsWith('/users/abc.json'));
  assert.strictEqual(writesForKey.length, 1, `expected a single persisted write, saw ${writesForKey.length}`);
}

runScenario()
  .then(() => console.log('indexedDB regression test passed'))
  .catch((err) => {
    console.error(err);
    process.exitCode = 1;
  });
