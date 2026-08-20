// Worker script for terminal test: lists allowed subtree and writes messages
(async ()=>{
	try {
		const base = (typeof self._appScope === 'string' && self._appScope) ? self._appScope : 'unrestricted';
		// derive directory if base looks like a file
		let dir = (base && base !== 'unrestricted') ? base : '/';
		if (dir && dir.indexOf('.') !== -1 && dir.indexOf('/') !== -1) {
			dir = dir.split('/').slice(0, -1).join('/') || '/';
		}
		await api.writeline('Worker starting. scope: ' + String(base));
		const listing = await api.readFolder(dir || '/');
		await api.writeline('Folder listing for ' + dir + ': ' + JSON.stringify(listing));
		// try creating a temp file under the subtree if allowed
		const testPath = (dir === '/' ? '' : (dir + '/')) + 'worker-test-' + Date.now() + '.txt';
		try {
			await api.writeFile(testPath, 'worker wrote at ' + new Date().toISOString(), { text: true });
			await api.writeline('Wrote test file: ' + testPath);
		} catch (e) {
			await api.writeline('Failed to write test file: ' + String(e));
		}
		await api.writeline('Worker done.');
		// signal done
	} catch (err) {
		try { await api.writeline('Worker error: ' + String(err)); } catch (e) {}
	}
})();