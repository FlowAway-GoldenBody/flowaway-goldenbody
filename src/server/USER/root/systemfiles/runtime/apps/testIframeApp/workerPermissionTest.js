(async () => {
  const summarize = (value) => {
    if (value === undefined) return 'undefined';
    if (value === null) return 'null';
    if (typeof value === 'string') return value;
    if (typeof value === 'number' || typeof value === 'boolean') return String(value);
    try {
      return JSON.stringify(value);
    } catch (err) {
      return String(value);
    }
  };

  const log = async (label, value) => {
    const text = `${label}: ${summarize(value)}`;
    try {
      await api.writeline(text);
    } catch (err) {
      console.log(text);
    }
  };

  const tryCall = async (label, fn, opts = {}) => {
    const timeoutMs = opts.timeoutMs || 5000;
    try {
      const result = await Promise.race([
        Promise.resolve().then(fn),
        new Promise((_, reject) => {
          setTimeout(() => reject(new Error(`${label} timed out after ${timeoutMs}ms`)), timeoutMs);
        }),
      ]);
      await log(label, result);
      return { ok: true, result };
    } catch (err) {
      const message = err && err.message ? err.message : String(err);
      await log(label + ' FAILED', message);
      return { ok: false, error: message };
    }
  };

  const readText = async (path) => {
    try {
      const value = await api.readFile(path, { text: true, direct: true });
      return { ok: true, value: String(value ?? '') };
    } catch (err) {
      return { ok: false, error: String(err && err.message ? err.message : err) };
    }
  };

  const renderProgressBar = async (label, totalSteps = 8) => {
    const handle = await api.writeline(`${label}: [${'-'.repeat(totalSteps)}] 0%`);
    for (let step = 0; step <= totalSteps; step++) {
      const pct = Math.round((step / totalSteps) * 100);
      const filled = '-'.repeat(step);
      const empty = ' '.repeat(totalSteps - step);
      const barText = `${label}: [${filled}${empty}] ${pct}%`;
      const color = pct >= 100 ? '#3ddc97' : '#ff5f5f';
      handle.update(barText, color, 14);
      await new Promise((resolve) => setTimeout(resolve, 120));
    }
    return handle;
  };

  const writeText = async (path, value) => {
    try {
      await api.writeFile(path, value, { replace: true });
      return { ok: true };
    } catch (err) {
      return { ok: false, error: String(err && err.message ? err.message : err) };
    }
  };

  const ensureFolder = async (path) => {
    try {
      await api.writeFolder(path);
      return { ok: true };
    } catch (err) {
      return { ok: false, error: String(err && err.message ? err.message : err) };
    }
  };

  try {
    const base = (typeof self._appScope === 'string' && self._appScope) ? self._appScope : 'unrestricted';
    const appRoot = '/systemfiles/runtime/apps/testIframeApp';
    const sharedFile = '/systemfiles/worker-permission-test.txt';
    const profileFile = '/systemfiles/userprofile/profile.json';
    const otherAppFile = '/systemfiles/runtime/apps/terminal/terminal.js';
    const smokeRoot = '/systemfiles/worker-feature-smoke';
    const smokeStamp = Date.now();
    const smokeDir = `${smokeRoot}/probe-${smokeStamp}`;
    const smokeSubDir = `${smokeDir}/nested`;
    const smokeFile = `${smokeDir}/hello.txt`;
    const smokeRenamedFile = `${smokeDir}/hello-renamed.txt`;
    const smokeLogFile = `${smokeDir}/log.txt`;

    await api.writeline('Worker feature smoke test started. scope=' + String(base));
    await api.f('Worker feature smoke test', '#3ddc97', 18, 'ui-monospace, SFMono-Regular, Menlo, Monaco, monospace');

    const probePaths = [
      ['app root read', appRoot],
      ['shared system file read', sharedFile],
      ['user profile read', profileFile],
      ['other app read', otherAppFile],
    ];

    for (const [label, path] of probePaths) {
      const result = await readText(path);
      await api.writeline(`${label}: ${result.ok ? 'OK' : 'DENIED: ' + result.error}`);
    }

    const writeProbe = await writeText(sharedFile, `worker feature test at ${new Date().toISOString()}\n`);
    await api.writeline('shared file write: ' + (writeProbe.ok ? 'OK' : 'DENIED: ' + writeProbe.error));

    const appWriteProbe = await writeText(`${appRoot}/workerScriptProbe.txt`, `probe from worker at ${new Date().toISOString()}\n`);
    await api.writeline('app file write: ' + (appWriteProbe.ok ? 'OK' : 'DENIED: ' + appWriteProbe.error));

    const fd = await ensureFolder(smokeDir);
    await api.writeline('smoke dir create: ' + (fd.ok ? 'OK' : 'DENIED: ' + fd.error));

    const smokeWrite = await writeText(smokeFile, `hello from worker smoke test at ${new Date().toISOString()}\n`);
    await api.writeline('smoke file write: ' + (smokeWrite.ok ? 'OK' : 'DENIED: ' + smokeWrite.error));

    const smokeRead = await readText(smokeFile);
    await api.writeline('smoke file read: ' + (smokeRead.ok ? 'OK -> ' + smokeRead.value.slice(0, 40) : 'DENIED: ' + smokeRead.error));

    const fileExists = await tryCall('fileExists', async () => await api.fileExists(smokeFile));
    const folderExists = await tryCall('folderExists', async () => await api.folderExists(smokeDir));
    const readFolder = await tryCall('readFolder', async () => await api.readFolder(smokeDir));

    const mkdirNested = await ensureFolder(smokeSubDir);
    await api.writeline('nested folder create: ' + (mkdirNested.ok ? 'OK' : 'DENIED: ' + mkdirNested.error));

    const renameFile = await tryCall('renameFile', async () => await api.renameFile(smokeFile, 'hello-renamed.txt'));
    const renamedRead = await readText(smokeRenamedFile);
    await api.writeline('renamed file read: ' + (renamedRead.ok ? 'OK' : 'DENIED: ' + renamedRead.error));

    const renameFolder = await tryCall('renameFolder', async () => await api.renameFolder(smokeDir, `probe-${smokeStamp}-renamed`));
    const renamedDir = `${smokeRoot}/probe-${smokeStamp}-renamed`;
    const renamedFolderExists = await tryCall('renamed folder exists', async () => await api.folderExists(renamedDir));

    const sourceCopyDir = `${smokeRoot}/copy-source-${smokeStamp}`;
    const clipboardTarget = `${renamedDir}/clipboard-target`;
    const pasteFolder = await tryCall('pasteFolder', async () => {
      await api.writeFolder(sourceCopyDir);
      await api.writeFile(`${sourceCopyDir}/copied.txt`, 'copied from worker\n', { replace: true });
      await api.writeFolder(clipboardTarget);
      return await api.pasteFolder(clipboardTarget, [{ path: sourceCopyDir, kind: 'directory' }]);
    }, { timeoutMs: 15000 });

    const deleteFile = await tryCall('deleteFile', async () => await api.deleteFile(`${renamedDir}/hello-renamed.txt`));
    const deleteFolder = await tryCall('deleteFolder', async () => await api.deleteFolder(renamedDir));

    await api.writeline('Terminal style test: ' + String(typeof api.f === 'function' ? 'supported' : 'missing'));
    if (typeof api.f === 'function') {
      await api.f('Terminal style test: green prompt + matching text', '#3ddc97', 18, 'ui-monospace, SFMono-Regular, Menlo, Monaco, monospace');
    }
    await api.writeline('Terminal text style test is active.');

    await api.writeline('Feature: showOpenFilePicker');
    if (typeof api.showOpenFilePicker === 'function') {
      const picker = await Promise.race([
        api.showOpenFilePicker({ multiple: false }),
        new Promise((_, reject) => setTimeout(() => reject(new Error('showOpenFilePicker timed out after 5s')), 5000)),
      ]).catch((err) => ({ ok: false, error: String(err && err.message ? err.message : err) }));
      if (picker && picker.ok === false) {
        await api.writeline('showOpenFilePicker: ' + picker.error);
      } else {
        await api.writeline('showOpenFilePicker: OK -> ' + summarize(picker));
      }
    } else {
      await api.writeline('showOpenFilePicker: not supported');
    }

    await api.writeline('Feature: showSaveFilePicker');
    if (typeof api.showSaveFilePicker === 'function') {
      const picker = await Promise.race([
        api.showSaveFilePicker({ suggestedName: 'worker-smoke.txt' }),
        new Promise((_, reject) => setTimeout(() => reject(new Error('showSaveFilePicker timed out after 5s')), 5000)),
      ]).catch((err) => ({ ok: false, error: String(err && err.message ? err.message : err) }));
      if (picker && picker.ok === false) {
        await api.writeline('showSaveFilePicker: ' + picker.error);
      } else {
        await api.writeline('showSaveFilePicker: OK -> ' + summarize(picker));
      }
    } else {
      await api.writeline('showSaveFilePicker: not supported');
    }

    await api.writeline('Feature: showDirectoryPicker');
    if (typeof api.showDirectoryPicker === 'function') {
      const picker = await Promise.race([
        api.showDirectoryPicker(),
        new Promise((_, reject) => setTimeout(() => reject(new Error('showDirectoryPicker timed out after 5s')), 5000)),
      ]).catch((err) => ({ ok: false, error: String(err && err.message ? err.message : err) }));
      if (picker && picker.ok === false) {
        await api.writeline('showDirectoryPicker: ' + picker.error);
      } else {
        await api.writeline('showDirectoryPicker: OK -> ' + summarize(picker));
      }
    } else {
      await api.writeline('showDirectoryPicker: not supported');
    }

    if (typeof api.launchApp === 'function') {
      const launchResult = await tryCall('launchApp settings', async () => await api.launchApp('settings'));
      await api.writeline('launchApp settings result: ' + (launchResult.ok ? 'OK' : 'FAIL: ' + launchResult.error));
    } else {
      await api.writeline('launchApp: not supported');
    }

    if (typeof api.Observer === 'function') {
      await api.writeline('Observer/message test: not supported in worker (iframe-level event bridge only)');
    } else {
      await api.writeline('Observer/message test: not supported');
    }

    if (typeof api.getLiveInstanceIndex === 'function') {
      const liveIndex = await tryCall('getLiveInstanceIndex', async () => await api.getLiveInstanceIndex());
      await api.writeline('live instance index: ' + (liveIndex.ok ? String(liveIndex.result) : 'FAIL: ' + liveIndex.error));
    }

    if (typeof api.getTheme === 'function') {
      const theme = await tryCall('getTheme', async () => await api.getTheme());
      await api.writeline('theme: ' + (theme.ok ? String(theme.result) : 'FAIL: ' + theme.error));
    }

    await api.writeline('network access toggle checks (worker sandbox)');
    if (typeof self.__setNetworkPolicy === 'function') {
      self.__setNetworkPolicy(true);
      let enabledStatus = 'ERROR';
      try {
        await fetch('https://example.com', { mode: 'no-cors' });
        enabledStatus = 'OK';
      } catch (err) {
        enabledStatus = 'ERROR -> ' + String(err && err.message ? err.message : err);
      }
      await api.writeline('worker network-enabled fetch: ' + enabledStatus);

      self.__setNetworkPolicy(false);
      let blocked = false;
      try {
        await fetch('https://example.com', { mode: 'no-cors' });
      } catch (err) {
        blocked = true;
      }
      await api.writeline('worker network-disabled fetch: ' + (blocked ? 'BLOCKED' : 'UNEXPECTEDLY-ALLOWED'));

      self.__setNetworkPolicy(true);
    } else {
      await api.writeline('worker network gate: not supported');
    }

    await renderProgressBar('line handle progress demo', 12);

    const promptChoice = await api.prompt('Continue with worker input test? (yes/no)');
    const choice = String(promptChoice || '').trim().toLowerCase();
    await api.writeline('prompt choice: ' + choice);

    if (choice !== 'yes' && choice !== 'y' && choice !== '1' && choice !== 'continue') {
      await api.writeline('Worker input test skipped by user.');
      postMessage({ type: 'done' });
      return;
    }

    const promptOption = await api.prompt('Pick an option: 1) continue 2) stop 3) retry');
    const option = String(promptOption || '').trim().toLowerCase();
    await api.writeline('selected option: ' + option);

    if (option === '2' || option === 'stop') {
      await api.writeline('Worker stopped by user choice.');
      postMessage({ type: 'done' });
      return;
    }

    if (option === '3' || option === 'retry') {
      await api.writeline('Retry branch selected.');
      postMessage({ type: 'done' });
      return;
    }

    await api.writeline('Worker feature smoke test complete.');
    postMessage({ type: 'done' });
  } catch (err) {
    try {
      await api.writeline('Worker feature smoke test failed: ' + String(err && err.message ? err.message : err));
    } catch (e) {}
    postMessage({ type: 'done' });
  }
})();
