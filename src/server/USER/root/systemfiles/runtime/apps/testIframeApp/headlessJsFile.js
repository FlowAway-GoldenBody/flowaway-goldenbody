(() => {
  const api = globalThis.__goldenbodyAPI;
  const report = { passes: [], fails: [] };

  const check = async (label, fn, timeoutMs = 2500) => {
    try {
      await Promise.race([
        Promise.resolve().then(fn),
        new Promise((_, reject) => {
          setTimeout(() => reject(new Error(`${label} timed out after ${timeoutMs}ms`)), timeoutMs);
        }),
      ]);
      report.passes.push(label);
    } catch (error) {
      report.fails.push({
        label,
        message: error && error.message ? error.message : String(error),
      });
    }
  };

  const emitSummary = () => {
    const payload = { type: 'worker-smoke-result', result: report };
    if (globalThis.parent && typeof globalThis.parent.postMessage === 'function') {
      globalThis.parent.postMessage(payload, '*');
    }
    if (typeof globalThis.postMessage === 'function' && globalThis !== globalThis.window) {
      globalThis.postMessage(payload);
    }
    console.log(JSON.stringify(report, null, 2));
  };

  (async () => {
    if (!api || typeof api !== 'object') {
      report.fails.push({ label: 'api-availability', message: 'window.__goldenbodyAPI is missing' });
      emitSummary();
      return;
    }

    await check('readFile-plain-path', async () => {
      const result = await api.readFile('/root/worker-smoke/test.txt', { text: true });
      if (result !== undefined && typeof result !== 'string') {
        throw new Error('readFile should return a string or undefined');
      }
    });

    await check('writeFile-plain-path', async () => {
      await api.writeFile('/root/worker-smoke/test.txt', 'worker smoke test', { text: true });
    });

    await check('writeFolder', async () => {
      await api.writeFolder('/root/worker-smoke/subdir');
    });

    await check('readFolder', async () => {
      const listing = await api.readFolder('/root/worker-smoke');
      if (!Array.isArray(listing)) {
        throw new Error('readFolder should return an array');
      }
    });

    await check('fileExists', async () => {
      const exists = await api.fileExists('/root/worker-smoke/test.txt');
      if (typeof exists !== 'boolean') {
        throw new Error('fileExists should return a boolean');
      }
    });

    await check('folderExists', async () => {
      const exists = await api.folderExists('/root/worker-smoke/subdir');
      if (typeof exists !== 'boolean') {
        throw new Error('folderExists should return a boolean');
      }
    });

    await check('renameFile', async () => {
      await api.renameFile('/root/worker-smoke/test.txt', 'test-renamed.txt');
    });

    await check('renameFolder', async () => {
      await api.renameFolder('/root/worker-smoke/subdir', 'subdir-renamed');
    });

    await check('readFile-renamed', async () => {
      const result = await api.readFile('/root/worker-smoke/test-renamed.txt', { text: true });
      if (typeof result !== 'string' && result !== undefined) {
        throw new Error('renamed file read returned unexpected result');
      }
    });

    await check('pasteFolder', async () => {
      await api.writeFolder('/root/worker-smoke/clipboard-target');
      await api.pasteFolder('/root/worker-smoke/clipboard-target', [{ path: '/root/worker-smoke/subdir-renamed', kind: 'directory' }]);
    });

    await check('deleteFile', async () => {
      await api.deleteFile('/root/worker-smoke/test-renamed.txt');
    });

    await check('deleteFolder', async () => {
      await api.deleteFolder('/root/worker-smoke/subdir-renamed');
    });

    await check('showOpenFilePicker', async () => {
      const result = await Promise.race([
        api.showOpenFilePicker({ multiple: false }),
        new Promise((_, reject) => setTimeout(() => reject(new Error('showOpenFilePicker timeout')), 1200)),
      ]);
      if (result !== undefined && (!result || typeof result !== 'object')) {
        throw new Error('showOpenFilePicker result was malformed');
      }
    });

    await check('showSaveFilePicker', async () => {
      const result = await Promise.race([
        api.showSaveFilePicker({ suggestedName: 'worker-smoke.txt' }),
        new Promise((_, reject) => setTimeout(() => reject(new Error('showSaveFilePicker timeout')), 1200)),
      ]);
      if (result !== undefined && (!result || typeof result !== 'object')) {
        throw new Error('showSaveFilePicker result was malformed');
      }
    });

    await check('showDirectoryPicker', async () => {
      const result = await Promise.race([
        api.showDirectoryPicker(),
        new Promise((_, reject) => setTimeout(() => reject(new Error('showDirectoryPicker timeout')), 1200)),
      ]);
      if (result !== undefined && (!result || typeof result !== 'object')) {
        throw new Error('showDirectoryPicker result was malformed');
      }
    });

    await check('launchApp', async () => {
      await api.launchApp('settings');
    });

    await check('message-and-observer', async () => {
      let observed = false;
      const observer = new api.Observer((event) => {
        if (event && event.type === 'worker-smoke' && event.verify === 'syfamr') {
          observed = true;
        }
      }, 'worker-smoke');
      api.message('hello from worker smoke test', '*');
      globalThis.dispatchEvent(new MessageEvent('message', {
        data: {
          type: 'worker-smoke',
          verify: 'syfamr',
          channel: '*',
          payload: 'hello from worker smoke test',
        },
      }));
      await new Promise((resolve) => setTimeout(resolve, 100));
      observer.disconnect();
      if (!observed) {
        throw new Error('Observer callback never fired');
      }
    });

    await check('live-instance-index', async () => {
      const index = await api.getLiveInstanceIndex();
      if (typeof index !== 'number') {
        throw new Error('getLiveInstanceIndex should return a number');
      }
    });

    await check('theme', async () => {
      const theme = await api.getTheme();
      if (typeof theme !== 'string') {
        throw new Error('getTheme should return a string');
      }
    });

    await check('network-toggle', async () => {
      globalThis.dispatchEvent(new MessageEvent('message', {
        data: { allowNetwork: false, verify: 'syfamr' },
      }));
      try {
        await fetch('https://example.com');
      } catch (error) {
        // expected when the network gate is disabled
        console.error('fetch failed as expected when network is disabled:', error);
      }
      globalThis.dispatchEvent(new MessageEvent('message', {
        data: { allowNetwork: true, verify: 'syfamr' },
      }));
      if (typeof globalThis.fetch !== 'function') {
        throw new Error('fetch override should exist on the worker global');
      }
    });

    await check('alert-proxy', async () => {
      if (typeof globalThis.alert !== 'function') {
        throw new Error('alert proxy is missing');
      }
      globalThis.alert('worker smoke test');
    });

    emitSummary();
  })().catch((error) => {
    report.fails.push({ label: 'unhandled-worker-smoke-error', message: error && error.message ? error.message : String(error) });
    emitSummary();
  });
})();
