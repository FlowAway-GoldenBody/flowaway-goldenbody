const fs = require('fs');
const path = require('path');
const puppeteer = require('puppeteer');

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

(async () => {
  const browser = await puppeteer.launch({ headless: 'new', args: ['--no-sandbox'] });
  try {
    const page = await browser.newPage();
    await page.goto('about:blank');

    const source = fs.readFileSync(path.join(process.cwd(), 'src/server/systemfiles/processes.js'), 'utf8');
    await page.evaluate(source);

    const result = await page.evaluate(async () => {
      function sleep(ms) {
        return new Promise((resolve) => setTimeout(resolve, ms));
      }

      window.apps = [];
      window.__flowawayLaunchContext = { appId: 'test-app', appInstanceId: '42' };

      const main = window.FlowawayProcess.createProcess({
        type: 'app',
        title: 'Main',
        appId: 'test-app',
        key: 'test::main',
      });

      const onWin = function () {};
      const onDoc = function () {};
      const onInt = function () {};
      const onTimeout = function () {};

      window.addEventListener('click', onWin);
      document.addEventListener('keydown', onDoc);
      const intervalId = setInterval(onInt, 777);
      setTimeout(onTimeout, 100);

      const observer = new MutationObserver(function () {});
      observer.observe(document.body, { childList: true, subtree: true });
      await sleep(20);

      const before = window.FlowawayProcess.list();
      function byTitle(title) {
        return before.find((p) => String((p && p.title) || '') === title);
      }

      const listenerWindow = byTitle('Listener click (window)');
      const listenerDoc = byTitle('Listener keydown (document)');
      const intervalProc = byTitle('Interval 777ms');
      const timeoutProc = byTitle('Timeout 100ms');
      const observerProc = byTitle('MutationObserver');

      const preListenerWindowHasHandler = !!(listenerWindow && window.FlowawayProcess.getProcess(listenerWindow.pid) && window.FlowawayProcess.getProcess(listenerWindow.pid).handler);
      const preListenerDocHasHandler = !!(listenerDoc && window.FlowawayProcess.getProcess(listenerDoc.pid) && window.FlowawayProcess.getProcess(listenerDoc.pid).handler);
      const preIntervalHasHandler = !!(intervalProc && window.FlowawayProcess.getProcess(intervalProc.pid) && window.FlowawayProcess.getProcess(intervalProc.pid).handler);
      const preObserverHasHandler = !!(observerProc && window.FlowawayProcess.getProcess(observerProc.pid) && window.FlowawayProcess.getProcess(observerProc.pid).handler);

      window.removeEventListener('click', onWin);
      document.removeEventListener('keydown', onDoc);
      clearInterval(intervalId);
      observer.disconnect();
      await sleep(160);

      const after = window.FlowawayProcess.list();
      const seen = new Set();
      let hasDuplicatePid = false;
      for (let i = 0; i < after.length; i++) {
        const p = after[i];
        if (!p || typeof p !== 'object') continue;
        const pid = Number(p.pid ?? p.processId ?? p.id);
        if (!Number.isFinite(pid) || pid <= 0) continue;
        if (seen.has(pid)) {
          hasDuplicatePid = true;
          break;
        }
        seen.add(pid);
      }

      function hasPid(pid) {
        return after.some((p) => Number((p && (p.pid ?? p.processId ?? p.id)) || 0) === Number(pid));
      }

      return {
        mainPid: main && main.pid,
        listenerWindowPid: listenerWindow && listenerWindow.pid,
        listenerDocPid: listenerDoc && listenerDoc.pid,
        intervalPid: intervalProc && intervalProc.pid,
        timeoutPid: timeoutProc && timeoutProc.pid,
        observerPid: observerProc && observerProc.pid,
        listenerWindowHasHandler: preListenerWindowHasHandler,
        listenerDocHasHandler: preListenerDocHasHandler,
        intervalHasHandler: preIntervalHasHandler,
        observerHasHandler: preObserverHasHandler,
        aliveAfterUnregister: {
          win: listenerWindow ? hasPid(listenerWindow.pid) : false,
          doc: listenerDoc ? hasPid(listenerDoc.pid) : false,
          interval: intervalProc ? hasPid(intervalProc.pid) : false,
          observer: observerProc ? hasPid(observerProc.pid) : false,
        },
        timeoutGoneAfterComplete: timeoutProc ? !hasPid(timeoutProc.pid) : false,
        hasDuplicatePid,
      };
    });

    assert(result.mainPid > 0, 'Main process missing');
    assert(result.listenerWindowPid > 0, 'Window listener process missing');
    assert(result.listenerDocPid > 0, 'Document listener process missing');
    assert(result.intervalPid > 0, 'Interval process missing');
    assert(result.timeoutPid > 0, 'Timeout process missing');
    assert(result.observerPid > 0, 'Observer process missing');

    assert(result.listenerWindowHasHandler, 'Window listener handler missing');
    assert(result.listenerDocHasHandler, 'Document listener handler missing');
    assert(result.intervalHasHandler, 'Interval handler missing');
    assert(result.observerHasHandler, 'Observer handler missing');

    assert(!result.aliveAfterUnregister.win, 'Window listener process still present after removeEventListener');
    assert(!result.aliveAfterUnregister.doc, 'Document listener process still present after removeEventListener');
    assert(!result.aliveAfterUnregister.interval, 'Interval process still present after clearInterval');
    assert(!result.aliveAfterUnregister.observer, 'Observer process still present after disconnect');
    assert(result.timeoutGoneAfterComplete, 'Timeout process still present after completion');

    assert(!result.hasDuplicatePid, 'Duplicate PID detected');
    console.log('PASS updated headless persistence+pid checks');
  } catch (error) {
    console.error('FAIL updated headless persistence+pid checks');
    console.error(error && error.stack ? error.stack : error);
    process.exitCode = 2;
  } finally {
    await browser.close();
  }
})();
