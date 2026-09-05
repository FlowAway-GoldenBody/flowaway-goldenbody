(async () => {
  try {
    const args = (self._startArgs && typeof self._startArgs === 'object') ? self._startArgs : (Array.isArray(self._startArgs) ? self._startArgs : []);
    // support both object { path: '/x' } and array ['/path'] styles
    let rawPath = '';
    if (Array.isArray(args) && args.length) rawPath = String(args[0] || '');
    else if (args && typeof args === 'object') rawPath = String(args.path || args.file || args.target || '');
    rawPath = String(rawPath || '').trim();
    if (!rawPath) {
      try { await self.api.writeline('writefile: missing path argument'); } catch (e) {}
      return;
    }

    // resolve '.' and '..' relative to worker cwd (support ../file.txt etc)
    const normalizeCloudPath = (pathValue) => {
      if (pathValue === undefined || pathValue === null) return '/';
      const value = String(pathValue).replace(/\\/g, '/').trim();
      if (!value) return '/';
      const parts = [];
      for (const part of value.split('/')) {
        if (!part || part === '.') continue;
        if (part === '..') {
          if (parts.length) parts.pop();
          continue;
        }
        parts.push(part);
      }
      return '/' + parts.join('/');
    };

    const joinAndNormalize = (base, rel) => {
      try {
        const baseNorm = normalizeCloudPath(base || '/');
        const baseParts = baseNorm === '/' ? [] : baseNorm.slice(1).split('/');
        const relParts = String(rel || '').replace(/\\/g, '/').split('/');
        const out = baseParts.slice();
        for (const part of relParts) {
          if (!part || part === '.') continue;
          if (part === '..') {
            if (out.length) out.pop();
            continue;
          }
          out.push(part);
        }
        return '/' + out.join('/');
      } catch (e) {
        return normalizeCloudPath(rel.startsWith('/') ? rel : '/' + rel);
      }
    };

    let path = '';
    try {
      const cwdInfo = (typeof self.api.cwd === 'function') ? await self.api.cwd() : { full: '/' };
      const base = cwdInfo && cwdInfo.full ? String(cwdInfo.full) : '/';
      if (rawPath.startsWith('/')) path = normalizeCloudPath(rawPath);
      else path = joinAndNormalize(base, rawPath);
    } catch (e) {
      path = normalizeCloudPath(rawPath.startsWith('/') ? rawPath : '/' + rawPath);
    }

    // Attempt read existing content
    let exists = false;
    try { exists = await self.api.fileExists(path); } catch (e) { exists = false; }
    let content = '';
    if (exists) {
      try { content = await self.api.readFile(path, { text: true, direct: true }); } catch (e) { content = ''; }
    } else {
      // create an empty file first so editor has something
      try { await self.api.writeFile(path, '', { replace: true }); } catch (e) { /* ignore */ }
    }

    // Use the worker prompt API to ask the user to edit the file inline in the terminal.
    try {
      // display the original argument (relative or absolute) to the user
      const displayArg = rawPath || path;
      const message = `Edit file: ${displayArg}`;
      const result = await self.api.prompt(message, { prefill: String(content || ''), multiline: true });
      // If the user provided a value, write it back
      const newContent = result === undefined || result === null ? '' : String(result);
      try {
        await self.api.writeFile(path, newContent, { replace: true });
        await self.api.writeline('Saved ' + displayArg);
      } catch (writeErr) {
        await self.api.writeline('Failed to save ' + displayArg + ': ' + String(writeErr && writeErr.message ? writeErr.message : writeErr));
      }
      finally {
        self.close();
      }
    } catch (err) {
      try { await self.api.writeline('writefile command failed: ' + String(err && err.message ? err.message : err)); } catch (e) {}
    }
  } catch (err) {
    try { await self.api.writeline('writefile command error: ' + String(err && err.message ? err.message : err)); } catch (e) {}
  } finally {
    try { await self.api.writeline('writefile: done'); } catch (e) {}
  }
})();
