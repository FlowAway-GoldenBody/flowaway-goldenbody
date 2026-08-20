(async () => {
  const readText = async (path) => {
    try {
      const value = await api.readFile(path, { text: true, direct: true });
      return { ok: true, value: String(value ?? '') };
    } catch (err) {
      return { ok: false, error: String(err && err.message ? err.message : err) };
    }
  };

  const writeText = async (path, value) => {
    try {
      await api.writeFile(path, value, { replace: true });
      return { ok: true };
    } catch (err) {
      return { ok: false, error: String(err && err.message ? err.message : err) };
    }
  };

  try {
    const base = (typeof self._appScope === 'string' && self._appScope) ? self._appScope : 'unrestricted';
    await api.writeline('Worker permission test started. scope=' + String(base));

    const appRoot = '/systemfiles/runtime/apps/testIframeApp';
    const sharedFile = '/systemfiles/worker-permission-test.txt';
    const profileFile = '/systemfiles/userprofile/profile.json';
    const otherAppFile = '/systemfiles/runtime/apps/terminal/terminal.js';

    const probes = [
      ['app root read', appRoot],
      ['shared system file read', sharedFile],
      ['profile block read', profileFile],
      ['other app read', otherAppFile],
    ];

    for (const [label, path] of probes) {
      const res = await readText(path);
      await api.writeline(label + ': ' + (res.ok ? 'OK' : 'DENIED: ' + res.error));
    }

    const writeProbe = await writeText(sharedFile, `worker test at ${new Date().toISOString()}\n`);
    await api.writeline('shared file write: ' + (writeProbe.ok ? 'OK' : 'DENIED: ' + writeProbe.error));

    const appendProbe = await writeText(appRoot + '/workerScriptProbe.txt', `probe from worker at ${new Date().toISOString()}\n`);
    await api.writeline('app file write: ' + (appendProbe.ok ? 'OK' : 'DENIED: ' + appendProbe.error));

    try {
      const res = await readText(profileFile);
      await api.writeline('blocked profile file read result: ' + (res.ok ? 'UNEXPECTED-ACCESS' : 'BLOCKED'));
    } catch (err) {
      await api.writeline('blocked profile file read threw: ' + String(err));
    }

    await api.writeline('Worker permission test complete.');
    postMessage({ type: 'done' });
  } catch (err) {
    try {
      await api.writeline('Worker permission test failed: ' + String(err && err.message ? err.message : err));
    } catch (e) {}
    postMessage({ type: 'done' });
  }
})();
