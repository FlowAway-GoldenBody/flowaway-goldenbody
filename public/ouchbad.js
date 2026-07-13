// Ensure this pre-init block runs only once even if the script is injected twice
window.protectedGlobals = window.protectedGlobals || {};
if (!document.body) {
  document.documentElement.appendChild(document.createElement('body'));
}
if (!window.protectedGlobals.__ouchbad_preinit_done) {
  window.protectedGlobals.__ouchbad_preinit_done = true;
  window.protectedGlobals.__ouchbad_BASE = window.origin;
  window.protectedGlobals.__ouchbad_goldenbodywebsite = window.protectedGlobals.__ouchbad_BASE + '/';
  window.protectedGlobals.__ouchbad_zmcdserver = `${window.protectedGlobals.__ouchbad_BASE}/server/zmcd`;
  window.protectedGlobals.__ouchbad_SERVER = `${window.protectedGlobals.__ouchbad_BASE}/server/fetchfiles/`;
  window.protectedGlobals.__ouchbad_downloadserver = `${window.protectedGlobals.__ouchbad_BASE}/server/download/`;
  let __ouchbad_openerOrigin = null;
  try {
    if (window.opener && window.opener.location && window.opener.location.origin) {
      __ouchbad_openerOrigin = window.opener.location.origin;
    }
  } catch (e) {
    __ouchbad_openerOrigin = null;
  }
  window.protectedGlobals.__ouchbad_baseOrigin = __ouchbad_openerOrigin || window.location.origin;
  window.protectedGlobals.__ouchbad_wsProtocol = window.protectedGlobals.__ouchbad_baseOrigin.startsWith('https') ? 'wss://' : 'ws://';
  window.protectedGlobals.__ouchbad_hostname = new URL(window.protectedGlobals.__ouchbad_baseOrigin).hostname;
}
window.protectedGlobals.filePost = async function (data) {
  const headers = { 'Content-Type': 'application/json' };
  if (window.protectedGlobals.data.authToken) headers.Authorization = 'Bearer ' + window.protectedGlobals.data.authToken;
  const res = await fetch(window.protectedGlobals.SERVER, {
    method: 'POST',
    headers,
    body: JSON.stringify({ username: window.protectedGlobals.data.username ? window.protectedGlobals.data.username : '', ...data }),
  });
  return res.text();
};
window.protectedGlobals.BASE = window.protectedGlobals.__ouchbad_BASE;
window.protectedGlobals.goldenbodywebsite = window.protectedGlobals.__ouchbad_goldenbodywebsite;
window.protectedGlobals.zmcdserver = window.protectedGlobals.__ouchbad_zmcdserver;
window.protectedGlobals.SERVER = window.protectedGlobals.__ouchbad_SERVER;
window.protectedGlobals.downloadserver = window.protectedGlobals.__ouchbad_downloadserver;
window.protectedGlobals.baseOrigin = window.protectedGlobals.__ouchbad_baseOrigin;
window.protectedGlobals.wsProtocol = window.protectedGlobals.__ouchbad_wsProtocol;
window.protectedGlobals.hostname = window.protectedGlobals.__ouchbad_hostname;
window.protectedGlobals.zmcdata = null;
window.protectedGlobals.firstlogin = false;

(() => {
  document.body.style.background = '#0f0f0f';
  document.body.style.color = '#fff';
  document.body.style.fontFamily = 'Arial, sans-serif';

  const box = document.createElement('div');
  box.style.width = '360px';
  box.style.margin = '100px auto';
  box.style.padding = '20px';
  box.style.background = '#1b1b1b';
  box.style.borderRadius = '10px';
  box.style.boxShadow = '0 0 20px rgba(0,0,0,.6)';
  box.style.display = 'flex';
  box.style.flexDirection = 'column';
  box.style.alignItems = 'center';

  box.innerHTML = `
    <h2 style="text-align:center;margin-bottom:10px">Login</h2>

    <input id="zmc-user" placeholder="Username" style="width:100%;padding:8px;margin:6px 0;box-sizing:border-box;">
    <input id="zmc-pass" type="password" placeholder="Password" style="width:100%;padding:8px;margin:6px 0;box-sizing:border-box;">

    <button id="zmc-login" style="width:100%;margin-top:10px">Login</button>
    <button id="zmc-register" style="width:100%;margin-top:6px">Create Account</button>

    <div id="zmc-msg" style="margin-top:10px;font-size:14px;text-align:center"></div>

    <div style="margin-top:18px;width:100%;padding-top:12px;border-top:1px solid #333;">
      <h3 style="margin:0 0 8px;text-align:center">Account Repair</h3>
      <select id="recovery-app-select" style="width:100%;padding:8px;margin:6px 0;box-sizing:border-box;display:block">
        <option value="" disabled selected>Enter recovery credentials to load system apps</option>
      </select>
      <button id="recovery-reset" style="width:100%;margin-top:6px">Reset selected system app</button>
      <select id="recovery-delete-app-select" style="width:100%;padding:8px;margin:6px 0;box-sizing:border-box;display:block">
        <option value="" disabled selected>Enter recovery credentials to load non-system apps</option>
      </select>
      <button id="recovery-delete-app" style="width:100%;margin-top:6px">Delete selected non-system app</button>
      <button id="recovery-repair-system" style="width:100%;margin-top:6px">Repair system files</button>
      <button id="recovery-jskeys" style="width:100%;margin-top:6px">Restore all JS keys</button>
      <button id="recovery-delete" style="width:100%;margin-top:6px">Delete account</button>
      <div id="recovery-msg" style="margin-top:10px;font-size:14px;text-align:center"></div>
    </div>
  `;

  document.body.innerHTML = '';
  document.body.appendChild(box);

  const msg = document.getElementById('zmc-msg');
  const recoveryMsg = document.getElementById('recovery-msg');
  const recoveryAppSelect = document.getElementById('recovery-app-select');
  const recoveryDeleteAppSelect = document.getElementById('recovery-delete-app-select');
  const recoveryUserInput = document.getElementById('zmc-user');
  const recoveryPassInput = document.getElementById('zmc-pass');

  function resetSelectPlaceholder(select, message) {
    select.innerHTML = `<option value="" disabled selected>${message}</option>`;
    select.style.display = 'block';
    select.disabled = true;
  }

  function populateSelect(select, items, emptyMessage) {
    if (!items || !items.length) {
      resetSelectPlaceholder(select, emptyMessage);
      return;
    }
    select.innerHTML = items.map((app) => `<option value="${app.id}">${app.label} (${app.folderName})</option>`).join('');
    select.style.display = 'block';
    select.disabled = false;
  }

  resetSelectPlaceholder(recoveryAppSelect, 'Enter recovery username/password to load system apps');
  resetSelectPlaceholder(recoveryDeleteAppSelect, 'Enter recovery username/password to load non-system apps');

  const recoveryServerUrl = (() => {
    const baseUrl = new URL(window.protectedGlobals.__ouchbad_BASE);
    return `${baseUrl.origin}/server/systemRecovery`;
  })();
  window.protectedGlobals.recoveryserver = recoveryServerUrl;

  async function sendRecoveryRequest(action, extraPayload) {
    const username = document.getElementById('zmc-user').value;
    const password = document.getElementById('zmc-pass').value;

    if (!username || !password) {
      recoveryMsg.textContent = 'Fill recovery username and password';
      recoveryMsg.style.color = 'red';
      return null;
    }

    const payload = {
      username,
      password,
      action,
      ...extraPayload,
    };

    try {
      const res = await fetch(window.protectedGlobals.recoveryserver, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      return await res.json();
    } catch (err) {
      console.error(err);
      return { error: 'Server error' };
    }
  }

  async function ensureRecoveryCatalog(forceReload = false) {
    if (!forceReload && !recoveryAppSelect.disabled && !recoveryDeleteAppSelect.disabled) return;
    resetSelectPlaceholder(recoveryAppSelect, 'Loading available system apps...');
    resetSelectPlaceholder(recoveryDeleteAppSelect, 'Loading available non-system apps...');
    const result = await sendRecoveryRequest('list');
    if (!result || result.error) {
      recoveryMsg.textContent = result && result.error ? result.error : 'Unable to load recovery options';
      recoveryMsg.style.color = 'red';
      resetSelectPlaceholder(recoveryAppSelect, 'Unable to load system apps');
      resetSelectPlaceholder(recoveryDeleteAppSelect, 'Unable to load non-system apps');
      return;
    }

    populateSelect(recoveryAppSelect, result.systemApps, 'No system apps found');
    populateSelect(recoveryDeleteAppSelect, result.nonSystemApps, 'No non-system apps found');
    if (result.systemApps.length || result.nonSystemApps.length) {
      recoveryMsg.textContent = '';
    }
  }
  function startUp() {
    setTimeout(async () => {
      const a = document.createElement('script');
      const res = await window.protectedGlobals.filePost({ requestFile: true, requestFileName: 'systemfiles/runtime/core/flowaway.js', text: true });
      a.textContent = res;
      document.body.appendChild(a);
      box.remove();
    });
  }

  function send(needNewAcc) {
    const username = document.getElementById('zmc-user').value;
    const password = document.getElementById('zmc-pass').value;

    if (!username || !password) {
      msg.textContent = 'Fill all fields';
      msg.style.color = 'red';
      return;
    }

    if (username.length > 20 || username.length < 3) {
      msg.textContent = 'username is 3 to 20 characters';
      msg.style.color = 'red';
      return;
    }
    if (username.includes(' ')) {
      msg.textContent = 'username cannot contain spaces';
      msg.style.color = 'red';
      return;
    }
    if (password.length > 20 || password.length < 3) {
      msg.textContent = 'password is 3 to 20 characters';
      msg.style.color = 'red';
      return;
    }

    const payload = {
      username,
      password,
      id: '',
      needNewAcc,
    };

    fetch(window.protectedGlobals.zmcdserver, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    })
      .then((res) => res.json())
      .then((result) => {
        window.protectedGlobals.zmcdata = result;

        if (typeof window.protectedGlobals.zmcdata === 'string' && window.protectedGlobals.zmcdata.startsWith('error:')) {
          msg.textContent = window.protectedGlobals.zmcdata;
          msg.style.color = 'red';
          return;
        }

        msg.textContent = 'Success!';
        msg.style.color = 'lime';
        window.protectedGlobals.data = window.protectedGlobals.zmcdata;
        if (!window.protectedGlobals.firstlogin && String(window.protectedGlobals.data.username ? window.protectedGlobals.data.username : '').startsWith('183')) {
          window.protectedGlobals.firstlogin = true;
        }
        setTimeout(() => {
          window.protectedGlobals.isRebuilding = false;
        }, 5000);
        startUp();
      })
      .catch((err) => {
        console.error(err);
        msg.textContent = 'Server error, try create acc first before login!';
        msg.style.color = 'red';
      });
  }

  document.getElementById('zmc-login').onclick = () => send(false);
  document.getElementById('zmc-register').onclick = () => send(true);

  const tryLoadRecoveryCatalog = async () => {
    if (recoveryUserInput.value.trim() && recoveryPassInput.value.trim()) {
      recoveryMsg.textContent = 'Loading available apps...';
      recoveryMsg.style.color = '#ffd166';
      await ensureRecoveryCatalog(true);
      if (!recoveryAppSelect.disabled) {
        recoveryMsg.textContent = '';
      }
    } else {
      updateRecoverySelectPlaceholder('Enter recovery username/password to load apps');
    }
  };

  recoveryUserInput.addEventListener('input', tryLoadRecoveryCatalog);
  recoveryPassInput.addEventListener('input', tryLoadRecoveryCatalog);

  document.getElementById('recovery-delete').onclick = async () => {
    recoveryMsg.textContent = 'Sending recovery request...';
    recoveryMsg.style.color = '#ffd166';
    const result = await sendRecoveryRequest('deleteAccount');
    if (result && result.success) {
      recoveryMsg.textContent = 'Account deleted.';
      recoveryMsg.style.color = 'lime';
    } else {
      recoveryMsg.textContent = result && result.error ? result.error : 'Failed to delete account';
      recoveryMsg.style.color = 'red';
    }
  };

  document.getElementById('recovery-jskeys').onclick = async () => {
    recoveryMsg.textContent = 'Restoring JS keys...';
    recoveryMsg.style.color = '#ffd166';
    const result = await sendRecoveryRequest('restoreSystemJsKeys');
    if (result && result.success) {
      recoveryMsg.textContent = `Restored ${result.restoredCount || 0} system app JS keys.`;
      recoveryMsg.style.color = 'lime';
    } else {
      recoveryMsg.textContent = result && result.error ? result.error : 'Failed to restore JS keys';
      recoveryMsg.style.color = 'red';
    }
  };

  document.getElementById('recovery-reset').onclick = async () => {
    if (!recoveryAppSelect.value) {
      recoveryMsg.textContent = 'No system app selected';
      recoveryMsg.style.color = 'red';
      return;
    }
    const selectedAppId = recoveryAppSelect.value;
    recoveryMsg.textContent = 'Resetting system app...';
    recoveryMsg.style.color = '#ffd166';
    const result = await sendRecoveryRequest('resetSystemApp', { appIdentifier: selectedAppId });
    if (result && result.success) {
      recoveryMsg.textContent = `${result.app && result.app.label ? result.app.label : selectedAppId} was reset.`;
      recoveryMsg.style.color = 'lime';
    } else {
      recoveryMsg.textContent = result && result.error ? result.error : 'Failed to reset system app';
      recoveryMsg.style.color = 'red';
    }
  };

  document.getElementById('recovery-delete-app').onclick = async () => {
    if (!recoveryDeleteAppSelect.value) {
      recoveryMsg.textContent = 'No non-system app selected';
      recoveryMsg.style.color = 'red';
      return;
    }
    const selectedAppId = recoveryDeleteAppSelect.value;
    recoveryMsg.textContent = 'Deleting selected app...';
    recoveryMsg.style.color = '#ffd166';
    const result = await sendRecoveryRequest('deleteUserApp', { appIdentifier: selectedAppId });
    if (result && result.success) {
      recoveryMsg.textContent = `${result.app && result.app.label ? result.app.label : selectedAppId} was deleted.`;
      recoveryMsg.style.color = 'lime';
      await ensureRecoveryCatalog(true);
    } else {
      recoveryMsg.textContent = result && result.error ? result.error : 'Failed to delete app';
      recoveryMsg.style.color = 'red';
    }
  };

  document.getElementById('recovery-repair-system').onclick = async () => {
    recoveryMsg.textContent = 'Repairing system files...';
    recoveryMsg.style.color = '#ffd166';
    const result = await sendRecoveryRequest('repairSystemFiles');
    if (result && result.success) {
      recoveryMsg.textContent = 'System files repaired.';
      recoveryMsg.style.color = 'lime';
    } else {
      recoveryMsg.textContent = result && result.error ? result.error : 'Failed to repair system files';
      recoveryMsg.style.color = 'red';
    }
  };

  recoveryUserInput.addEventListener('input', tryLoadRecoveryCatalog);
  recoveryPassInput.addEventListener('input', tryLoadRecoveryCatalog);
})();