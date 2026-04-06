const fs = require('fs');
const path = require('path');
const puppeteer = require('puppeteer');

function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

(async () => {
  const browser = await puppeteer.launch({ headless: 'new', args: ['--no-sandbox'] });
  try {
    const page = await browser.newPage();
    await page.goto('about:blank');

    const source = fs.readFileSync(path.join(__dirname, 'src/server/systemfiles/processes.js'), 'utf8');
    await page.evaluate(source);

    const result = await page.evaluate(async () => {
      function sleep(ms) {
        return new Promise((resolve) => setTimeout(resolve, ms));
      }

      window.apps = [];
      window.__flowawayLaunchContext = { appId: 'test-app', appInstanceId: '42' };

      const mainProcess = window.FlowawayProcess.createProcess({
        type: 'app',
        title: 'Test App Main',
        appId: 'test-app',
        status: 'running',
        hasWindow: true,
        appInstanceId: '42',
        options: { appInstanceId: '42' },
        key: 'test::main',
      });

      const onWinClick = function () {};
      const onDocKeydown = function () {};
      const onScopedResize = function () {};

      window.addEventListener('click', onWinClick);
      document.addEventListener('keydown', onDocKeydown, { capture: true });
      window.addEventListener('test-app42', 'resize', onScopedResize);

      const intervalHandle = window.setInterval(function () {}, 777);

      const observer = new window.MutationObserver(function () {});
      observer.observe(document.body, { childList: true });

      await sleep(25);

      const snapshotBeforeCleanup = window.FlowawayProcess.list();
      const byTitle = {};
      for (var i = 0; i < snapshotBeforeCleanup.length; i++) {
        var row = snapshotBeforeCleanup[i];
        byTitle[row.title] = row;
      }

      const listenerWindow = byTitle['Listener click (window)'];
      const listenerDoc = byTitle['Listener keydown (document)'];
      const listenerScoped = byTitle['Listener resize (window)'];
      const intervalProc = snapshotBeforeCleanup.find((p) => /^Interval 777ms$/.test(String(p.title || '')));
      const observerProc = byTitle['MutationObserver'];

      const records = {
        mainPid: mainProcess && mainProcess.pid,
        listenerWindow,
        listenerDoc,
        listenerScoped,
        intervalProc,
        observerProc,
      };

      window.removeEventListener('click', onWinClick);
      document.removeEventListener('keydown', onDocKeydown, true);
      window.removeEventListener('test-app42', 'resize', onScopedResize);
      window.clearInterval(intervalHandle);
      observer.disconnect();

      const onceHandler = function () {};
      window.addEventListener('gb-once', onceHandler, { once: true });
      window.dispatchEvent(new Event('gb-once'));

      const ac = new AbortController();
      const signalHandler = function () {};
      document.addEventListener('gb-abort', signalHandler, { signal: ac.signal });
      ac.abort();

      await sleep(25);
      const snapshotAfterCleanup = window.FlowawayProcess.list();

      function hasTitle(title) {
        return snapshotAfterCleanup.some((row) => String(row && row.title || '') === title);
      }

      return {
        records,
        cleanupState: {
          hasWindowListener: hasTitle('Listener click (window)'),
          hasDocumentListener: hasTitle('Listener keydown (document)'),
          hasScopedListener: hasTitle('Listener resize (window)'),
          hasInterval: hasTitle('Interval 777ms'),
          hasObserver: hasTitle('MutationObserver'),
          hasOnceListener: hasTitle('Listener gb-once (window)'),
          hasAbortListener: hasTitle('Listener gb-abort (document)'),
        },
      };
    });

    const mainPid = Number(result.records.mainPid || 0);
    assert(mainPid > 0, 'Main process was not created');

    assert(result.records.listenerWindow, 'Window listener process not recorded');
    assert(result.records.listenerDoc, 'Document listener process not recorded');
    assert(result.records.listenerScoped, 'Scoped window listener process not recorded');
    assert(result.records.intervalProc, 'Interval process not recorded');
    assert(result.records.observerProc, 'Observer process not recorded');

    assert(Number(result.records.listenerWindow.parentPid) === mainPid, 'Window listener parentPid did not link to app main process');
    assert(Number(result.records.listenerDoc.parentPid) === mainPid, 'Document listener parentPid did not link to app main process');
    assert(Number(result.records.listenerScoped.parentPid) === mainPid, 'Scoped listener parentPid did not link to app main process');
    assert(Number(result.records.intervalProc.parentPid) === mainPid, 'Interval parentPid did not link to app main process');
    assert(Number(result.records.observerProc.parentPid) === mainPid, 'Observer parentPid did not link to app main process');

    assert(result.cleanupState.hasWindowListener === false, 'Window listener cleanup failed');
    assert(result.cleanupState.hasDocumentListener === false, 'Document listener cleanup failed');
    assert(result.cleanupState.hasScopedListener === false, 'Scoped listener cleanup failed');
    assert(result.cleanupState.hasInterval === false, 'Interval cleanup failed');
    assert(result.cleanupState.hasObserver === false, 'Observer cleanup failed');
    assert(result.cleanupState.hasOnceListener === false, 'Once listener cleanup failed');
    assert(result.cleanupState.hasAbortListener === false, 'AbortSignal listener cleanup failed');

    console.log('PASS headless process tracking checks');
    process.exit(0);
  } catch (error) {
    console.error('FAIL headless process tracking checks');
    console.error(error && error.stack ? error.stack : error);
    process.exit(2);
  } finally {
    await browser.close();
  }
})();
