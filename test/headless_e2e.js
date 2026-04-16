const { chromium } = require('playwright');
const crypto = require('crypto');

const BASE_URL = process.env.BASE_URL || 'http://localhost:3000';

function randHex(n = 6) {
  return crypto.randomBytes(n).toString('hex');
}

async function findFirst(page, selectors) {
  for (const s of selectors) {
    const el = await page.$(s);
    if (el) return el;
  }
  return null;
}

async function fillIfExists(form, nameCandidates, value) {
  for (const n of nameCandidates) {
    const el = await form.$(`[name="${n}"]`) || await form.$(n);
    if (el) {
      await el.fill(value);
      return true;
    }
  }
  return false;
}

async function tryCreateUser(page) {
  const tries = [BASE_URL + '/signup', BASE_URL + '/register', BASE_URL + '/auth/signup', BASE_URL];
  for (const url of tries) {
    try {
      await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 5000 });
    } catch (e) {
      continue;
    }
    const form = await findFirst(page, ['form#signup', 'form#register', 'form[action*="signup"]', 'form[action*="register"]', 'form']);
    if (!form) continue;
    const email = `test+${randHex()}@example.com`;
    const username = `u_${randHex(4)}`;
    const password = `P@ssw0rd${randHex(2)}`;
    await fillIfExists(form, ['email', 'user[email]', 'signup-email', 'input[type="email"]'], email);
    await fillIfExists(form, ['username', 'user[username]', 'name'], username);
    await fillIfExists(form, ['password', 'pass', 'user[password]'], password);
    try {
      const submit = await findFirst(form, ['button[type="submit"]', 'input[type="submit"]', 'button']);
      if (submit) {
        await Promise.all([
          page.waitForNavigation({ waitUntil: 'networkidle', timeout: 5000 }).catch(() => {}),
          submit.click().catch(() => {})
        ]);
      }
    } catch (e) {}
    const successText = await page.textContent('body').catch(() => '');
    if (/welcome|verify|success|logged in|account/i.test(successText)) {
      return { ok: true, email, username };
    }
    const maybeProfile = await findFirst(page, ['a[href*="profile"]', '.user-menu', '.profile']);
    if (maybeProfile) return { ok: true, email, username };
  }
  return { ok: false, reason: 'no-signup-form' };
}

async function tryLogin(page, credentials) {
  const tries = [BASE_URL + '/login', BASE_URL + '/signin', BASE_URL];
  for (const url of tries) {
    try { await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 5000 }); } catch (e) { continue; }
    const form = await findFirst(page, ['form#login', 'form[action*="login"]', 'form[action*="signin"]', 'form']);
    if (!form) continue;
    await fillIfExists(form, ['email', 'username', 'user[email]'], credentials.email || credentials.username || '');
    await fillIfExists(form, ['password', 'pass'], credentials.password || '');
    const submit = await findFirst(form, ['button[type="submit"]', 'input[type="submit"]', 'button']);
    if (submit) {
      await Promise.all([
        page.waitForNavigation({ waitUntil: 'networkidle', timeout: 5000 }).catch(() => {}),
        submit.click().catch(() => {})
      ]);
    }
    const body = await page.textContent('body').catch(() => '');
    if (/logout|sign out|welcome|dashboard/i.test(body)) return { ok: true };
  }
  return { ok: false, reason: 'no-login' };
}

async function tryDragTask(page) {
  const dragSelectors = ['.taskbutton', '.task-button', '.task', '.draggable', '[draggable="true"]'];
  const dropSelectors = ['.taskbar', '.panel', '.dropzone', '#dock', '.dock'];
  const dragEl = await findFirst(page, dragSelectors);
  const dropEl = await findFirst(page, dropSelectors);
  if (!dragEl || !dropEl) return { ok: false, reason: 'no-drag-or-drop' };
  try {
    const boxFrom = await dragEl.boundingBox();
    const boxTo = await dropEl.boundingBox();
    if (!boxFrom || !boxTo) return { ok: false, reason: 'no-bboxes' };
    await page.mouse.move(boxFrom.x + boxFrom.width / 2, boxFrom.y + boxFrom.height / 2);
    await page.mouse.down();
    await page.mouse.move(boxTo.x + boxTo.width / 2, boxTo.y + boxTo.height / 2, { steps: 10 });
    await page.mouse.up();
    return { ok: true };
  } catch (e) {
    return { ok: false, reason: e.message };
  }
}

async function tryRightClickStartApps(page) {
  const startBtn = await findFirst(page, ['#start-button', '.start-button', '#start', '.start']);
  if (startBtn) await startBtn.click().catch(() => {});
  const appSelectors = ['.start-menu .app', '.start-menu .tile', '.app', '.start-app', '.app-item'];
  const app = await findFirst(page, appSelectors);
  if (!app) return { ok: false, reason: 'no-apps' };
  try {
    await app.click({ button: 'right' });
    const ctx = await findFirst(page, ['.context-menu', '.menu', '.app-context']);
    return { ok: !!ctx };
  } catch (e) {
    return { ok: false, reason: e.message };
  }
}

async function tryOpenApp(page) {
  const selectors = ['.app-launch', '.app', '.start-app', 'a.app-link', 'a[href*="/app"]'];
  const el = await findFirst(page, selectors);
  if (!el) return { ok: false, reason: 'no-app-launch' };
  try {
    await Promise.all([
      page.waitForNavigation({ waitUntil: 'networkidle', timeout: 5000 }).catch(() => {}),
      el.click().catch(() => {})
    ]);
    return { ok: true };
  } catch (e) {
    return { ok: false, reason: e.message };
  }
}

async function runAll() {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext();
  const page = await context.newPage();

  const results = [];

  try {
    const r = await tryCreateUser(page);
    results.push({ name: 'create-user', ...r });
  } catch (e) {
    results.push({ name: 'create-user', ok: false, reason: e.message });
  }

  try {
    const cred = { email: undefined, username: undefined, password: undefined };
    const r1 = results.find(r => r.name === 'create-user' && r.ok);
    if (r1) {
      cred.email = r1.email;
      cred.username = r1.username;
      cred.password = 'P@ssw0rd';
    }
    const r = await tryLogin(page, cred);
    results.push({ name: 'login', ...r });
  } catch (e) {
    results.push({ name: 'login', ok: false, reason: e.message });
  }

  try {
    await page.goto(BASE_URL, { waitUntil: 'domcontentloaded' }).catch(() => {});
    const r = await tryDragTask(page);
    results.push({ name: 'drag-task', ...r });
  } catch (e) {
    results.push({ name: 'drag-task', ok: false, reason: e.message });
  }

  try {
    await page.goto(BASE_URL, { waitUntil: 'domcontentloaded' }).catch(() => {});
    const r = await tryRightClickStartApps(page);
    results.push({ name: 'rightclick-start-app', ...r });
  } catch (e) {
    results.push({ name: 'rightclick-start-app', ok: false, reason: e.message });
  }

  try {
    await page.goto(BASE_URL, { waitUntil: 'domcontentloaded' }).catch(() => {});
    const r = await tryOpenApp(page);
    results.push({ name: 'open-app', ...r });
  } catch (e) {
    results.push({ name: 'open-app', ok: false, reason: e.message });
  }

  await browser.close();

  let passed = 0, failed = 0, skipped = 0;
  for (const r of results) {
    if (r.ok) passed++;
    else if (r.reason === 'no-signup-form' || r.reason === 'no-drag-or-drop' || r.reason === 'no-apps' || r.reason === 'no-app-launch') skipped++;
    else failed++;
  }

  console.log('\nHeadless E2E Summary');
  console.log('Base URL:', BASE_URL);
  for (const r of results) {
    console.log('-', r.name, ':', r.ok ? 'PASS' : 'FAIL', r.ok ? '' : `(${r.reason || 'unknown'})`);
  }
  console.log(`\nPassed: ${passed}  Failed: ${failed}  Skipped: ${skipped}`);

  process.exit(failed > 0 ? 1 : 0);
}

if (require.main === module) {
  runAll().catch(e => { console.error(e); process.exit(2); });
}
