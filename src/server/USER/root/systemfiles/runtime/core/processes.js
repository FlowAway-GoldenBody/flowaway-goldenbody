"use strict";
(function () {
  if (window.protectedGlobals.__runtimeCoreWorkerHookInstalled || !window.Worker) return;

  const NativeWorker = window.Worker;
  window.protectedGlobals.__nativeWorkerConstructor = NativeWorker;
  const buildWorkerBootstrap = function (scriptURL) {
    const sourceUrl = scriptURL == null ? "" : String(scriptURL);
    const sourceLiteral = JSON.stringify(sourceUrl);
    return [
      "(function () {",
      "  const notifyHost = function (eventName) {",
      "    try { postMessage({ type: '___worker_event__', event: eventName, ts: Date.now() }); } catch (err) {}",
      "  };",
      "  const nativeClose = typeof self.close === 'function' ? self.close.bind(self) : null;",
      "  const nativeTerminate = typeof self.terminate === 'function' ? self.terminate.bind(self) : null;",
      "  if (nativeClose) {",
      "    self.close = function () {",
      "      notifyHost('self.close');",
      "      return nativeClose.apply(this, arguments);",
      "    };",
      "  }",
      "  if (nativeTerminate) {",
      "    self.terminate = function () {",
      "      notifyHost('self.terminate');",
      "      return nativeTerminate.apply(this, arguments);",
      "    };",
      "  }",
      "  const __sourceUrl = " + sourceLiteral + ";",
      "  if (__sourceUrl) {",
      "    fetch(__sourceUrl).then(function (response) { return response.text(); }).then(function (code) {",
      "      try { (0, eval)(code); } catch (error) { setTimeout(function () { throw error; }, 0); }",
      "    }).catch(function (error) { setTimeout(function () { throw error; }, 0); });",
      "  }",
      "})();",
    ].join("\n");
  };

  window.Worker = function WrappedWorker() {
    const scriptURL = arguments.length > 0 ? arguments[0] : null;
    const options = arguments.length > 1 ? arguments[1] : null;
    const wrappedURL = scriptURL && typeof scriptURL === 'string'
      ? URL.createObjectURL(new Blob([buildWorkerBootstrap(scriptURL)], { type: 'text/javascript' }))
      : scriptURL;

    const worker = arguments.length > 1
      ? new NativeWorker(wrappedURL, options)
      : new NativeWorker(wrappedURL);

    const nativeTerminate = typeof worker.terminate === 'function' ? worker.terminate.bind(worker) : null;
    if (nativeTerminate) {
      worker.terminate = function () {
        if (worker.__TerminationGuard) {
          return nativeTerminate.apply(this, arguments);
        }
        worker.__TerminationGuard = true;
        try {
          if (window.protectedGlobals && typeof window.protectedGlobals.onWorkerTerminate === 'function') {
            window.protectedGlobals.onWorkerTerminate(worker, arguments);
          }
        } catch (err) {}
        const result = nativeTerminate.apply(this, arguments);
        worker.__TerminationGuard = false;
        return result;
      };
    }

    worker.addEventListener('message', function (event) {
      if (!event || !event.data || event.data.type !== '___worker_event__') return;
      try {
        if (window.protectedGlobals && typeof window.protectedGlobals.onWorkerEvent === 'function') {
          window.protectedGlobals.onWorkerEvent(worker, event.data);
        }
      } catch (err) {}
    });

    return worker;
  };

  window.Worker.prototype = NativeWorker.prototype;
  window.protectedGlobals.__runtimeCoreWorkerHookInstalled = true;
})();
(function () {
  window.protectedGlobals = window.protectedGlobals || {};
  if (window.protectedGlobals.FlowawayProcess && window.protectedGlobals.FlowawayProcess.__loaded) {
    return;
  }

  var runtime = {};

  runtime.__loaded = false;
  runtime.processObjectsByPid = {};
  runtime.processes = [];
  runtime.processRegistry = {};
  runtime.taskProcessCounter = 0;
  runtime.reusablePidPool = [];
  runtime.taskProcessIdByIdentity = {};
  runtime.taskProcessObjectIdentity = new WeakMap();
  runtime.taskProcessObjectIdentityCounter = 0;
  runtime.iframeProcessBindings = {};
  runtime.iframeHookedElements = new WeakSet();
  runtime.iframeBindingByElement = new WeakMap();
  runtime.iframeHookObserver = null;
  runtime.workerProcessBindings = {};
  runtime.workerInstances = new WeakMap();
  runtime.hookStatus = {};
  runtime.hookStatus.iframe = { hookable: false, reason: "not-initialized", hooked: false, hookedCount: 0, observed: false };
  runtime._nativeWorkerConstructor = null;

  function getFirstDefinedValue() {
    for (var i = 0; i < arguments.length; i++) {
        if (arguments[i] !== null && typeof arguments[i] !== "undefined" && arguments[i] !== "") {
        return arguments[i];
      }
    }
    return null;
  }

  function safeClone(value) {
    try {
      return JSON.parse(JSON.stringify(value));
    } catch (e) {
      return value && typeof value === "object" ? Object.assign({}, value) : value;
    }
  }

  function normalizeProcessPid(value) {
    if (value === null || typeof value === "undefined") return null;
    if (typeof value === "number" && !Number.isNaN(value)) return value;
    if (typeof value === "bigint") return Number(value);
    var numeric = Number(value);
    if (!Number.isNaN(numeric)) return numeric;
    return null;
  }

  function collectKnownProcessPids() {
    var known = {};

    function markPid(pidValue) {
      var pid = normalizeProcessPid(pidValue);
      if (typeof pid !== "number" || Number.isNaN(pid) || pid <= 0) return;
      known[String(pid)] = true;
    }

    var identityMap = runtime.taskProcessIdByIdentity || {};
     var identityKeys = Object.keys(identityMap);
     for (var i = 0; i < identityKeys.length; i++) {
       markPid(identityMap[identityKeys[i]]);
     }
     var processes = Array.isArray(runtime.processes) ? runtime.processes : [];
     for (var p = 0; p < processes.length; p++) {
       var record = processes[p] || null;
       if (!record) continue;
       markPid(getFirstDefinedValue(record.pid, record.processId, record.id));
     }
 
     var store = runtime.processObjectsByPid || {};
     var storeKeys = Object.keys(store);
     for (var s = 0; s < storeKeys.length; s++) {
      markPid(storeKeys[s]);
      var stored = store[storeKeys[s]];
      if (stored && typeof stored === "object") {
        markPid(getFirstDefinedValue(stored.pid, stored.processId, stored.id));
      }
    }

    // launch/manual/dynamic registries removed — no additional pids to scan

    return known;
  }

  function getMaxKnownProcessPid() {
    var known = collectKnownProcessPids();
    var keys = Object.keys(known);
    var maxPid = 0;
    for (var i = 0; i < keys.length; i++) {
      var pid = normalizeProcessPid(keys[i]);
      if (typeof pid === "number" && !Number.isNaN(pid) && pid > maxPid) {
        maxPid = pid;
      }
    }
    return maxPid;
  }

  function seedProcessCounterFromKnownPids() {
    var current = Number(runtime.taskProcessCounter || window.protectedGlobals.__taskProcessCounter || 0);
    if (!Number.isFinite(current) || current < 0) current = 0;
    var maxKnown = getMaxKnownProcessPid();
    runtime.taskProcessCounter = Math.max(current, maxKnown);
    window.protectedGlobals.__taskProcessCounter = runtime.taskProcessCounter;
  }

  seedProcessCounterFromKnownPids();

  function allocateProcessId(identityKey, seenIdentities) {
    var currentPid = normalizeProcessPid(runtime.taskProcessIdByIdentity[identityKey]);
    if (typeof currentPid === "number" && !Number.isNaN(currentPid) && currentPid > 0) {
      if (seenIdentities && typeof seenIdentities === "object") {
        seenIdentities[identityKey] = true;
      }
      return currentPid;
    }

    var known = collectKnownProcessPids();
    var reusablePool = Array.isArray(runtime.reusablePidPool) ? runtime.reusablePidPool : [];
    if (reusablePool.length) {
      reusablePool.sort(function (a, b) {
        return Number(a) - Number(b);
      });
      while (reusablePool.length) {
        var reusedPid = normalizeProcessPid(reusablePool.shift());
        if (typeof reusedPid !== "number" || Number.isNaN(reusedPid) || reusedPid <= 0) {
          continue;
        }
        if (known[String(reusedPid)]) {
          continue;
        }
        runtime.taskProcessIdByIdentity[identityKey] = reusedPid;
        runtime.taskProcessCounter = Math.max(Number(runtime.taskProcessCounter || 0), reusedPid);
        window.protectedGlobals.__taskProcessCounter = runtime.taskProcessCounter;
        window.protectedGlobals.__taskProcessIdByIdentity = runtime.taskProcessIdByIdentity;
        window.protectedGlobals.__reusablePidPool = reusablePool;
        if (seenIdentities && typeof seenIdentities === "object") {
          seenIdentities[identityKey] = true;
        }
        return reusedPid;
      }
    }

    var next = Number(runtime.taskProcessCounter || window.protectedGlobals.__taskProcessCounter || 0);
    if (!Number.isFinite(next) || next < 0) next = 0;

    do {
      next += 1;
    } while (known[String(next)]);

    runtime.taskProcessCounter = next;
    runtime.taskProcessIdByIdentity[identityKey] = next;
    window.protectedGlobals.__taskProcessCounter = runtime.taskProcessCounter;
    window.protectedGlobals.__taskProcessIdByIdentity = runtime.taskProcessIdByIdentity;
    window.protectedGlobals.__reusablePidPool = reusablePool;

    if (seenIdentities && typeof seenIdentities === "object") {
      seenIdentities[identityKey] = true;
    }

    return Number(next || 0);
  }

  function releaseProcessId(pidValue) {
    var pid = normalizeProcessPid(pidValue);
    if (typeof pid !== "number" || Number.isNaN(pid) || pid <= 0) return;

    var identityKeys = Object.keys(runtime.taskProcessIdByIdentity);
    for (var i = 0; i < identityKeys.length; i++) {
      var key = identityKeys[i];
      if (Number(runtime.taskProcessIdByIdentity[key]) === pid) {
        delete runtime.taskProcessIdByIdentity[key];
      }
    }

    runtime.reusablePidPool = Array.isArray(runtime.reusablePidPool) ? runtime.reusablePidPool : [];
    if (runtime.reusablePidPool.indexOf(pid) === -1) {
      runtime.reusablePidPool.push(pid);
      runtime.reusablePidPool.sort(function (a, b) {
        return Number(a) - Number(b);
      });
    }

    window.protectedGlobals.__taskProcessIdByIdentity = runtime.taskProcessIdByIdentity;
    window.protectedGlobals.__reusablePidPool = runtime.reusablePidPool;
  }

  function noopProcessFn() {}

  function ensureCanonicalProcessShape(config, options) {
    var input = config && typeof config === "object" ? config : {};
    var opts = options && typeof options === "object" ? options : {};
    var existing = opts.existing && typeof opts.existing === "object" ? opts.existing : {};

    var pidValue = normalizeProcessPid(
      getFirstDefinedValue(input.pid, input.processId, existing.pid, existing.processId, opts.pid),
    );
    if (typeof pidValue !== "number" || Number.isNaN(pidValue) || pidValue <= 0) {
      var identityKey = String(
        opts.identityKey ||
          input.identityKey ||
          ["process", input.appId || existing.appId || "global", input.title || existing.title || Date.now()].join("::"),
      );
      pidValue = allocateProcessId(identityKey, null);
    }

    var typeValue = String(
      getFirstDefinedValue(input.type, input.processKind, input.sourceType, existing.type, existing.processKind, "process"),
    );
    var appIdValue = String(getFirstDefinedValue(input.appId, existing.appId, "global"));
    var titleValue = String(
      getFirstDefinedValue(input.title, input.label, input.name, existing.title, existing.label, appIdValue + " process"),
    );
    var labelValue = String(getFirstDefinedValue(input.label, input.title, existing.label, existing.title, titleValue));
    var statusValue = String(getFirstDefinedValue(input.status, existing.status, "running"));
    var sourceValue = String(getFirstDefinedValue(input.source, existing.source, input.options && input.options.source, existing.options && existing.options.source, ""));
    var processWindow = getFirstDefinedValue(input.window, existing.window, input.targetWindow, existing.targetWindow, input.instance, existing.instance, null);
    var targetWindowValue = getFirstDefinedValue(input.targetWindow, existing.targetWindow, processWindow, null);
    var instanceValue = getFirstDefinedValue(input.instance, existing.instance, processWindow, null);
    var windowTypeValue = String(getFirstDefinedValue(input.windowType, existing.windowType, typeValue, "process"));

    var createdValue = Number(getFirstDefinedValue(input.created, input.createdAt, existing.created, existing.createdAt, Date.now()));
    if (!Number.isFinite(createdValue) || createdValue <= 0) createdValue = Date.now();

    var cleanupFn = (input.cleanup)
      ? input.cleanup
      : (input.stop)
        ? input.stop
        : (existing.cleanup)
          ? existing.cleanup
          : (existing.stop)
            ? existing.stop
            : noopProcessFn;

    return {
      pid: pidValue,
      processId: pidValue,
      id: pidValue,
      type: typeValue,
      processKind: typeValue,
      appId: appIdValue,
      appLabel: String(getFirstDefinedValue(input.appLabel, existing.appLabel, "")),
      label: labelValue,
      title: titleValue,
      name: titleValue,
      status: statusValue,
      source: sourceValue,
      window: processWindow && typeof processWindow === "object" ? processWindow : null,
      targetWindow: targetWindowValue && typeof targetWindowValue === "object" ? targetWindowValue : null,
      instance: instanceValue && typeof instanceValue === "object" ? instanceValue : null,
      windowType: windowTypeValue,
      created: createdValue,
      createdAt: createdValue,
      cleanup: cleanupFn,
      stop: cleanupFn,
      options: Object.assign(
        {},
        existing.options && typeof existing.options === "object" ? existing.options : {},
        input.options && typeof input.options === "object" ? input.options : {},
      ),
    };
  }

  function getCanonicalProcessByPid(pidValue) {
    var pid = normalizeProcessPid(pidValue);
    if (typeof pid !== "number" || Number.isNaN(pid) || pid <= 0) return null;
    var store = ensureProcessObjectsStore();
    var existing = store[String(pid)];
    if (!existing || typeof existing !== "object") return null;
    var canonical = ensureCanonicalProcessShape(existing, {
      existing: existing,
      pid: pid,
      identityKey: "canonical::" + String(pid),
    });
    store[String(pid)] = canonical;
    return canonical;
  }

  function ensureProcessObjectsStore() {
    if (!runtime.processObjectsByPid || typeof runtime.processObjectsByPid !== "object") {
      runtime.processObjectsByPid = {};
    }
    window.protectedGlobals.__processObjectsByPid = runtime.processObjectsByPid;
    return runtime.processObjectsByPid;
  }

  function terminateRecord(record, reason) {
    if (!record || typeof record !== "object") return false;
    if ((record.stop)) {
      record.stop(reason || "terminate");
    } else if (record.handle && (record.handle.stop)) {
      record.handle.stop(reason || "terminate");
    }
    record.status = "terminated";
    record.updatedAt = Date.now();
    return true;
  }

  function terminateProcess(target, reason) {
    if (target === null || typeof target === "undefined") return false;
    var pidValue = normalizeProcessPid(target);
    if (typeof pidValue !== "number" || Number.isNaN(pidValue)) return false;
    var pidKey = String(pidValue);

    var processObject = runtime.processObjectsByPid && runtime.processObjectsByPid[pidKey];
    if (processObject) {
      if (processObject.stop) processObject.stop(reason || "terminate");
      delete runtime.processObjectsByPid[pidKey];
      return true;
    }
    return false;
  }

  function filterPidFromProcessList(list, pidValue) {
    if (!Array.isArray(list)) return [];

    return list.filter(function (record) {
      if (!record || typeof record !== "object") return false;
      var recordPid = normalizeProcessPid(getFirstDefinedValue(record.pid, record.processId, record.id));
      return recordPid !== pidValue;
    });
  }

  function removePidFromGlobalProcessLists(pidValue) {
    var pid = normalizeProcessPid(pidValue);
    if (typeof pid !== "number" || Number.isNaN(pid) || pid <= 0) return;

    runtime.processes = filterPidFromProcessList(runtime.processes, pid);

    if (window.protectedGlobals && Array.isArray(window.protectedGlobals.__processes)) {
      window.protectedGlobals.__processes = filterPidFromProcessList(window.protectedGlobals.__processes, pid);
    } else {
      window.protectedGlobals.__processes = runtime.processes.slice();
    }

    var snapshot = window.protectedGlobals.__taskManagerSnapshot && typeof window.protectedGlobals.__taskManagerSnapshot === "object"
      ? window.protectedGlobals.__taskManagerSnapshot
      : null;
    if (snapshot && Array.isArray(snapshot.flat)) {
      snapshot.flat = filterPidFromProcessList(snapshot.flat, pid);
      snapshot.summary = Object.assign({}, snapshot.summary || {}, {
        totalEntries: snapshot.flat.length,
        totalInstances: snapshot.flat.length,
        running: snapshot.flat.filter(function (row) {
          return String(row && row.status || "") === "running";
        }).length,
      });
      snapshot.updatedAt = Date.now();
      window.protectedGlobals.__taskManagerSnapshot = snapshot;
    }

    window.protectedGlobals.__processes = runtime.processes.slice();
    window.protectedGlobals.__processRegistry = runtime.processRegistry || {};
  }

  function runProcessCleanup(processObject, reason) {
    if (!processObject || typeof processObject !== "object") return;
    if (processObject.__cleanupCalled) return;
    processObject.__cleanupCalled = true;
    if ((processObject.cleanup)) {
      processObject.cleanup(reason || "kill");
    }
  }

  function getProcessHookStatus() {
    return {
      iframe: Object.assign({}, runtime.hookStatus && runtime.hookStatus.iframe ? runtime.hookStatus.iframe : {}),
    };
  }

  function attachProcessWindow(processObject, targetWindow, kind) {
    if (!processObject || typeof processObject !== "object") return processObject;
    var resolvedTarget = targetWindow && typeof targetWindow === "object" ? targetWindow : null;
    var windowKind = typeof kind === "string" && kind ? kind : "process";
    if (resolvedTarget) {
      processObject.window = resolvedTarget;
      processObject.targetWindow = resolvedTarget;
      processObject.instance = resolvedTarget;
      processObject.windowType = windowKind;
    } else {
      processObject.window = null;
      processObject.targetWindow = null;
      processObject.instance = null;
      processObject.windowType = windowKind;
    }
    return processObject;
  }

  function setIframeHookStatus(hookable, reason, extra) {
    var next = Object.assign(
      {},
      runtime.hookStatus && runtime.hookStatus.iframe ? runtime.hookStatus.iframe : {},
      extra && typeof extra === "object" ? extra : {},
      {
        hookable: !!hookable,
        reason: String(reason || "unknown"),
      },
    );
    runtime.hookStatus.iframe = next;
    window.protectedGlobals.__processHookStatus = getProcessHookStatus();
  }

  

  function getIframeContextMeta(iframe) {
    var appId = String(
      getFirstDefinedValue(
        window.protectedGlobals.atTop,
        window.protectedGlobals.topAppId,
        "iframe",
      ),
    );
    var root = null;
    if (iframe && (iframe.closest)) {
      root = iframe.closest(".app-window-root");
    }
    if (root && root.dataset && root.dataset.appId) {
      appId = String(root.dataset.appId);
    }


    var title = "Iframe";

    return {
      appId: appId,
      title: title,
      windowId: String(getFirstDefinedValue(
        iframe && iframe.id,
        iframe && iframe.name,
        "iframe-window",
      )),
    };
  }

  function hookIframeWindow(iframe, reasonTag) {
    if (!iframe || !iframe.tagName || String(iframe.tagName).toLowerCase() !== "iframe") return false;
    var frameWindow;
    try {
      frameWindow = iframe.contentWindow;
    } catch (e) {
      setIframeHookStatus(true, "iframe-access-denied", {
        hooked: false,
        lastError: String(e && (e.message || e) || "iframe-content-window-blocked"),
      });
      return false;
    }
    if (!frameWindow || frameWindow === window) {
      setIframeHookStatus(true, "iframe-window-unavailable", { hooked: false });
      return false;
    }

    try {
      var frameGlobals = frameWindow.protectedGlobals && typeof frameWindow.protectedGlobals === "object"
        ? frameWindow.protectedGlobals
        : {};
      frameWindow.protectedGlobals = frameGlobals;
      frameGlobals.__processRuntime = runtime;
      frameGlobals.FlowawayProcess = runtime;
      if (!frameWindow.process || typeof frameWindow.process !== "object") {
        frameWindow.process = runtime;
      }
      var currentCount = Object.keys(runtime.iframeProcessBindings || {}).length;
      setIframeHookStatus(true, "iframe-hooked", {
        hooked: true,
        hookedCount: currentCount,
        lastHookReason: String(reasonTag || "scan"),
      });
      return true;
    } catch (e) {
      setIframeHookStatus(true, "iframe-hook-failed", {
        hooked: false,
        lastError: String(e && (e.message || e) || "iframe-hook-unknown-error"),
      });
      return false;
    }
  }

  function ensureIframeTracked(iframe) {
    if (!iframe || !iframe.tagName || String(iframe.tagName).toLowerCase() !== "iframe") return false;
    var existingBinding = runtime.iframeBindingByElement && runtime.iframeBindingByElement.get(iframe);
    if (existingBinding && existingBinding.pid) {
      hookIframeWindow(iframe, "recheck");
      var existingProc = getCanonicalProcessByPid(existingBinding.pid);
      if (existingProc) {
        var existingMeta = getIframeContextMeta(iframe);
        try {
          attachProcessWindow(existingProc, iframe.contentWindow, "iframe");
        } catch (e) {}
        existingProc.title = existingMeta.title;
        existingProc.label = existingMeta.title;
        existingProc.appId = existingMeta.appId;
        existingProc.status = "running";
      }
      return true;
    }

    if (runtime.iframeHookedElements.has(iframe)) {
      runtime.iframeHookedElements.delete(iframe);
    }
    runtime.iframeHookedElements.add(iframe);

    var contextMeta = getIframeContextMeta(iframe);
    var iframeWindow = null;
    try {
      iframeWindow = iframe.contentWindow;
    } catch (e) {
      iframeWindow = null;
    }
    var createdProcess = createProcess({
      type: "iframe",
      title: contextMeta.title,
      appId: contextMeta.appId,
      status: "running",
      persistent: false,
      hasWindow: true,
      window: iframeWindow,
      targetWindow: iframeWindow,
      instance: iframeWindow,
      windowType: "iframe",
      windowIds: [contextMeta.windowId],
      cleanup: noopProcessFn,
      options: {
        iframeWindowId: contextMeta.windowId,
      },
      key: "iframe::" + contextMeta.windowId + "::" + String(Date.now()) + "::" + String(Math.random().toString(36).slice(2, 8)),
    });

    if (createdProcess) {
      attachProcessWindow(createdProcess, iframeWindow, "iframe");
    }

    var bindingKey = "iframe::" + String(Date.now()) + "::" + String(Math.random().toString(36).slice(2, 8));
    var binding = {
      key: bindingKey,
      iframe: iframe,
      pid: createdProcess && createdProcess.pid ? createdProcess.pid : null,
      cleanupListener: null,
    };

    var onLoad = function () {
      hookIframeWindow(iframe, "load");
    };
    if ((iframe.addEventListener)) {
      iframe.addEventListener("load", onLoad);
    }
    binding.cleanupListener = function () {
      if ((iframe.removeEventListener)) {
        iframe.removeEventListener("load", onLoad);
      }
      delete runtime.iframeProcessBindings[bindingKey];
      if (runtime.iframeBindingByElement) {
        runtime.iframeBindingByElement.delete(iframe);
      }
      runtime.iframeHookedElements.delete(iframe);
    };
    runtime.iframeProcessBindings[bindingKey] = binding;
    if (runtime.iframeBindingByElement) {
      runtime.iframeBindingByElement.set(iframe, binding);
    }

    hookIframeWindow(iframe, "scan");
    return true;
  }

  function untrackIframeElement(iframe, reasonTag) {
    if (!iframe || !runtime.iframeBindingByElement) return false;
    var binding = runtime.iframeBindingByElement.get(iframe);
    if (!binding) return false;

    var pid = normalizeProcessPid(binding.pid);
    if (typeof pid === "number" && !Number.isNaN(pid) && pid > 0) {
      killProcess(pid, String(reasonTag || "iframe-removed"));
      return true;
    }

    if ((binding.cleanupListener)) {
      binding.cleanupListener(reasonTag || "iframe-remove-cleanup");
      return true;
    }
    return false;
  }

  function scanAndHookIframes() {
    if (!document || !(document.querySelectorAll)) {
      setIframeHookStatus(false, "document-query-selector-unavailable", { observed: false });
      return false;
    }
    var iframes = document.querySelectorAll("iframe");
    setIframeHookStatus(true, iframes.length ? "iframe-scan-ready" : "iframe-scan-empty", { observed: !!runtime.iframeHookObserver });
    for (var i = 0; i < iframes.length; i++) {
      ensureIframeTracked(iframes[i]);
    }
    return true;
  }

  function installIframeHookObserver() {
    var NativeObserver = (window.MutationObserver) ? window.MutationObserver : null;
    if (!NativeObserver) {
      setIframeHookStatus(false, "mutation-observer-unavailable", { observed: false });
      return false;
    }

    if (!runtime.iframeHookObserver) {
      runtime.iframeHookObserver = new NativeObserver(function (mutationList) {
        for (var i = 0; i < mutationList.length; i++) {
          var mutation = mutationList[i];
          if (!mutation) continue;

          if (mutation.addedNodes && mutation.addedNodes.length) {
            for (var j = 0; j < mutation.addedNodes.length; j++) {
              var node = mutation.addedNodes[j];
              if (!node || node.nodeType !== 1) continue;
              if (node.tagName && String(node.tagName).toLowerCase() === "iframe") {
                ensureIframeTracked(node);
                continue;
              }
              if ((node.querySelectorAll)) {
                var nested = node.querySelectorAll("iframe");
                for (var k = 0; k < nested.length; k++) {
                  ensureIframeTracked(nested[k]);
                }
              }
            }
          }

          if (mutation.removedNodes && mutation.removedNodes.length) {
            for (var r = 0; r < mutation.removedNodes.length; r++) {
              var removedNode = mutation.removedNodes[r];
              if (!removedNode || removedNode.nodeType !== 1) continue;
              if (removedNode.tagName && String(removedNode.tagName).toLowerCase() === "iframe") {
                untrackIframeElement(removedNode, "iframe-removed");
                continue;
              }
              if ((removedNode.querySelectorAll)) {
                var removedNested = removedNode.querySelectorAll("iframe");
                for (var q = 0; q < removedNested.length; q++) {
                  untrackIframeElement(removedNested[q], "iframe-removed");
                }
              }
            }
          }
        }
      });
    }

    var observeTarget = document.documentElement || document.body;
    if (!observeTarget || !(runtime.iframeHookObserver.observe)) {
      setIframeHookStatus(true, "observer-target-unavailable", { observed: false });
      return false;
    }

    runtime.iframeHookObserver.observe(observeTarget, {
      childList: true,
      subtree: true,
    });
    setIframeHookStatus(true, "observer-attached", { observed: true });
    return true;
  }


  function installWorkerConstructorHook() {
    if (!window || !(window.Worker)) {
      return false;
    }

    var nativeWorker = window.Worker;
    if (runtime._nativeWorkerConstructor === nativeWorker) {
      return true;
    }

    runtime._nativeWorkerConstructor = nativeWorker;

    function clearWorkerProcessEntry(workerInstance, reason) {
      if (!workerInstance || workerInstance.__ProcessCleared) {
        return false;
      }

      var pidValue = normalizeProcessPid(workerInstance.__Pid);
      if (typeof pidValue !== "number" || Number.isNaN(pidValue) || pidValue <= 0) {
        workerInstance.__ProcessCleared = true;
        return false;
      }

      workerInstance.__ProcessCleared = true;
      if (window.protectedGlobals && typeof window.protectedGlobals.killProcess === "function") {
        window.protectedGlobals.killProcess(pidValue, reason || "worker-exit");
      } else if (window.protectedGlobals && window.protectedGlobals.FlowawayProcess && typeof window.protectedGlobals.FlowawayProcess.killProcess === "function") {
        window.protectedGlobals.FlowawayProcess.killProcess(pidValue, reason || "worker-exit");
      }

      return true;
    }

    window.Worker = function () {
      var scriptURL = arguments.length > 0 ? arguments[0] : null;
      var options = arguments.length > 1 ? arguments[1] : null;
      var scriptText = scriptURL === null || typeof scriptURL === "undefined" ? "unknown" : String(scriptURL);
      var appId = String(getFirstDefinedValue(window.protectedGlobals.atTop, window.protectedGlobals.topAppId, "worker"));
      var workerName = "";
      if (options && typeof options === "object") {
        var inputName = options.name;
        if (inputName !== null && typeof inputName !== "undefined") {
          workerName = String(inputName).trim();
        }
      }
      if (!workerName) {
        workerName = "Worker Process";
      }

      var workerInstance = 1 === arguments.length
        ? new nativeWorker(scriptURL)
        : new nativeWorker(scriptURL, options);

      var createdProcess = createProcess({
        type: "worker",
        title: workerName,
        label: workerName,
        name: workerName,
        appId: appId,
        status: "running",
        persistent: false,
        hasWindow: true,
        window: workerInstance,
        targetWindow: workerInstance,
        instance: workerInstance,
        windowType: "worker",
        windowIds: [],
        cleanup: noopProcessFn,
        options: {
          scriptURL: scriptText,
          url: scriptText,
          name: workerName,
          hasOptions: !!(options && typeof options === "object"),
          source: String((options && options.source) || ""),
        },
        key: "worker::" + workerName + "::" + String(Date.now()) + "::" + String(Math.random().toString(36).slice(2, 8)),
      });

      if (createdProcess) {
        attachProcessWindow(createdProcess, workerInstance, "worker");
      }

      if (createdProcess && createdProcess.pid) {
        workerInstance.__Pid = createdProcess.pid;
        workerInstance.__ProcessCleared = false;

        var bindingKey = "worker::" + String(createdProcess.pid) + "::" + String(Math.random().toString(36).slice(2, 8));
        runtime.workerProcessBindings[bindingKey] = {
          key: bindingKey,
          pid: createdProcess.pid,
          instance: workerInstance,
        };

        var processMessageHandler = function (event) {
          if (!event || !event.data || typeof event.data !== "object") return;
          var data = event.data;
          if (data.type === "___worker_event__") {
            if (data.event === "self.close" || data.event === "self.terminate") {
              clearWorkerProcessEntry(workerInstance, data.event);
            }
            return;
          }
          if (data.type === "done" || data.type === "exit" || data.type === "terminate") {
            clearWorkerProcessEntry(workerInstance, data.type);
          }
        };

        workerInstance.addEventListener("message", processMessageHandler);
        workerInstance.addEventListener("error", function () {
          clearWorkerProcessEntry(workerInstance, "worker-error");
        });

        var nativeWorkerTerminate = typeof workerInstance.terminate === "function"
          ? workerInstance.terminate.bind(workerInstance)
          : null;
        if (nativeWorkerTerminate) {
          workerInstance.terminate = function () {
            var result;
            try {
              result = nativeWorkerTerminate.apply(this, arguments);
            } finally {
              clearWorkerProcessEntry(workerInstance, "terminate");
            }
            return result;
          };
        }

        var nativeWorkerClose = typeof workerInstance.close === "function"
          ? workerInstance.close.bind(workerInstance)
          : null;
        if (nativeWorkerClose) {
          workerInstance.close = function () {
            var result;
            try {
              result = nativeWorkerClose.apply(this, arguments);
            } finally {
              clearWorkerProcessEntry(workerInstance, "close");
            }
            return result;
          };
        }
      }

      return workerInstance;
    };

    return true;
  }

  function installProcessHooks() {
    scanAndHookIframes();
    installIframeHookObserver();
    installWorkerConstructorHook();
    window.protectedGlobals.__processHookStatus = getProcessHookStatus();
  }

  function removeTrackedBindingsForPid(pidValue) {
    var pid = normalizeProcessPid(pidValue);
    if (typeof pid !== "number" || Number.isNaN(pid) || pid <= 0) return;

    var iframeKeys = Object.keys(runtime.iframeProcessBindings || {});
    for (var f = 0; f < iframeKeys.length; f++) {
      var iframeBinding = runtime.iframeProcessBindings[iframeKeys[f]];
      if (!iframeBinding || normalizeProcessPid(iframeBinding.pid) !== pid) continue;
      if (iframeBinding.iframe) {
        iframeBinding.iframe.src = "about:blank";
      }
      if ((iframeBinding.cleanupListener)) {
        iframeBinding.cleanupListener("pid-remove");
      } else {
        delete runtime.iframeProcessBindings[iframeKeys[f]];
      }
    }

    // service workers are not tracked in this simplified runtime

    var workerKeys = Object.keys(runtime.workerProcessBindings || {});
    for (var w = 0; w < workerKeys.length; w++) {
      var workerBinding = runtime.workerProcessBindings[workerKeys[w]];
      if (!workerBinding || normalizeProcessPid(workerBinding.pid) !== pid) continue;
      if (workerBinding.instance && (workerBinding.instance.terminate)) {
        workerBinding.instance.terminate();
      }
      delete runtime.workerProcessBindings[workerKeys[w]];
    }
  }

  function killProcess(target, reason, visitedSet) {
    var pidValue = normalizeProcessPid(target);
    if (typeof pidValue !== "number" || Number.isNaN(pidValue) || pidValue <= 0) {
      return false;
    }

    var visited = visitedSet instanceof Set ? visitedSet : new Set();
    if (visited.has(pidValue)) return false;
    visited.add(pidValue);

    var proc = getCanonicalProcessByPid(pidValue);

    if (proc) {
      runProcessCleanup(proc, reason || "kill");
    }

    removeTrackedBindingsForPid(pidValue);
    var terminated = terminateProcess(pidValue, reason || "kill");
    delete runtime.processObjectsByPid[String(pidValue)];
    removePidFromGlobalProcessLists(pidValue);
    buildTaskManagerState();
    if (terminated) {
      releaseProcessId(pidValue);
    }

    return terminated;
  }

  function getProcess(pidValue) {
    var processObject = getCanonicalProcessByPid(pidValue);
    return processObject || null;
  }

  function createProcess(config) {
    var input = config && typeof config === "object" ? config : {};
    var appId = String(getFirstDefinedValue(input.appId, "global"));
    var title = String(getFirstDefinedValue(input.title, input.label, input.name, appId + " process"));
    var identity = String(
      getFirstDefinedValue(
        input.identityKey,
        input.key,
        ["contract", appId, title, Date.now(), Math.random().toString(36).slice(2, 8)].join("::"),
      ),
    );

    var canonical = ensureCanonicalProcessShape(input, {
      existing: runtime.processObjectsByPid && runtime.processObjectsByPid[String(input.pid)]
        ? runtime.processObjectsByPid[String(input.pid)]
        : null,
      identityKey: "contract::" + identity,
    });

    ensureProcessObjectsStore();
    runtime.processObjectsByPid[String(canonical.pid)] = canonical;

    var manualKey = String(getFirstDefinedValue(input.key, "contract::" + String(canonical.pid)));
    var processWindow = getFirstDefinedValue(input.window, input.targetWindow, input.instance, null);
    if (processWindow && typeof processWindow === "object") {
      attachProcessWindow(canonical, processWindow, String(getFirstDefinedValue(input.windowType, canonical.type, "process")));
    }

    var manualRecord = {
      key: manualKey,
      pid: canonical.pid,
      processId: canonical.pid,
      appId: canonical.appId,
      label: canonical.label,
      title: canonical.title,
      status: canonical.status,
      sourceType: "manual",
      processKind: canonical.type,
      createdAt: Number(canonical.created || Date.now()),
      updatedAt: Date.now(),
      stop: canonical.cleanup,
      window: canonical.window || null,
      targetWindow: canonical.targetWindow || null,
      instance: canonical.instance || null,
      windowType: canonical.windowType || canonical.type || "process",
      meta: Object.assign({}, input),
    };

    var handle = {
      id: canonical.pid,
      pid: canonical.pid,
      appId: canonical.appId,
      key: manualKey,
      name: canonical.title,
      status: canonical.status,
      meta: manualRecord.meta,
      terminate: function (killReason) {
        return killProcess(canonical.pid, killReason || "manual-terminate");
      },
      stop: function (killReason) {
        return killProcess(canonical.pid, killReason || "manual-stop");
      },
      update: function (patch) {
        if (!patch || typeof patch !== "object") return handle;
        manualRecord.meta = Object.assign({}, manualRecord.meta || {}, patch);
        manualRecord.updatedAt = Date.now();
        return handle;
      },
    };

    manualRecord.handle = handle;
    runtime.processRegistry[manualKey] = manualRecord;
    runtime.processes = Array.isArray(runtime.processes) ? runtime.processes : [];
    if (!runtime.processes.some(function (entry) {
      return entry && typeof entry === "object" && normalizeProcessPid(getFirstDefinedValue(entry.pid, entry.processId, entry.id)) === canonical.pid;
    })) {
      runtime.processes.push(manualRecord);
    }
    if (!window.protectedGlobals || !Array.isArray(window.protectedGlobals.__processes)) {
      window.protectedGlobals.__processes = [];
    }
    if (!window.protectedGlobals.__processes.some(function (entry) {
      return entry && typeof entry === "object" && normalizeProcessPid(getFirstDefinedValue(entry.pid, entry.processId, entry.id)) === canonical.pid;
    })) {
      window.protectedGlobals.__processes.push(manualRecord);
    }
    buildTaskManagerState();
    return canonical;
  }

  function disposeAll(reason) {
    var pids = runtime.processObjectsByPid ? Object.keys(runtime.processObjectsByPid) : [];
    for (var i = 0; i < pids.length; i++) {
      try {
        var rec = runtime.processObjectsByPid[pids[i]];
        if (rec) terminateRecord(rec, reason || "dispose-all");
      } catch (e) {}
    }
    runtime.processObjectsByPid = {};
    runtime.processRegistry = {};
    if (runtime.iframeHookObserver && (runtime.iframeHookObserver.disconnect)) {
      runtime.iframeHookObserver.disconnect();
    }
    runtime.iframeHookObserver = null;
    runtime.iframeHookedElements = new WeakSet();
    runtime.iframeBindingByElement = new WeakMap();
    runtime.iframeProcessBindings = {};
    runtime.workerProcessBindings = {};
    runtime.workerInstances = new WeakMap();
    if (runtime._nativeWorkerConstructor && window) {
      window.Worker = runtime._nativeWorkerConstructor;
    }
    runtime._nativeWorkerConstructor = null;
    runtime.hookStatus = {
      iframe: { hookable: false, reason: "disposed", hooked: false, hookedCount: 0, observed: false },
    };
    runtime.taskProcessIdByIdentity = {};
    runtime.reusablePidPool = [];
    runtime.processes = [];
    runtime.taskProcessCounter = 0;
    window.protectedGlobals.__processObjectsByPid = {};
    window.protectedGlobals.__taskProcessIdByIdentity = {};
    window.protectedGlobals.__reusablePidPool = [];
    window.protectedGlobals.__processes = [];
    window.protectedGlobals.__processRegistry = {};
    window.protectedGlobals.__taskProcessCounter = 0;
    window.protectedGlobals.__processHookStatus = getProcessHookStatus();
  }


  function buildTaskManagerState() {
    var store = ensureProcessObjectsStore();
    var pids = Object.keys(store);
    var flat = [];
    var registry = {};

    pids.sort(function (a, b) {
      return Number(a) - Number(b);
    });

    for (var i = 0; i < pids.length; i++) {
      var processObject = getCanonicalProcessByPid(pids[i]);
      if (!processObject) continue;
      var pidValue = normalizeProcessPid(getFirstDefinedValue(processObject.pid, processObject.processId));
      if (typeof pidValue !== "number" || Number.isNaN(pidValue) || pidValue <= 0) continue;

      var title = String(processObject.title || processObject.label || "process");
      var updatedAt = Number(getFirstDefinedValue(processObject.updatedAt, processObject.createdAt, processObject.created, Date.now()));
      var kind = String(processObject.processKind || processObject.type || "process");
      var typeVal = String(processObject.type || processObject.processKind || "process");
      var opts = processObject.options && typeof processObject.options === 'object' ? processObject.options : {};
      var sourceVal = String(getFirstDefinedValue(processObject.source, opts.source, window.protectedGlobals.atTop + " (Inferred)", "") || "");
      // Infer appId from explicit appId or fallback to atTop/global
      var appIdVal = String(getFirstDefinedValue(processObject.appId, window && window.protectedGlobals && window.protectedGlobals.atTop + " (Inferred)", "global"));
      var urlVal = String(getFirstDefinedValue(opts.scriptURL, opts.url, sourceVal, "") || "");

      flat.push({
        pid: pidValue,
        processId: pidValue,
        title: title,
        name: title,
        appId: appIdVal,
        appLabel: String(processObject.appLabel || ""),
        processKind: kind,
        type: typeVal,
        sourceType: typeVal,
        source: sourceVal,
        url: urlVal,
        window: processObject.window || null,
        targetWindow: processObject.targetWindow || null,
        instance: processObject.instance || null,
        windowType: processObject.windowType || typeVal || "process",
        updatedAt: updatedAt,
        rowKey: [String(pidValue), String(i)].join("::"),
      });

      var appId = String(processObject.appId || appIdVal || "global");
      if (!registry[appId]) {
        registry[appId] = {
          appId: appId,
          updatedAt: updatedAt,
          entries: [],
        };
      }

      registry[appId].entries.push({
        appId: appId,
        label: title,
        name: title,
        sourceType: typeVal,
        source: sourceVal,
        url: urlVal,
        instanceCount: 1,
        instances: [title],
        instanceRecords: [{ processId: pidValue, pid: pidValue, title: title }],
        updatedAt: updatedAt,
      });

      registry[appId].updatedAt = Math.max(Number(registry[appId].updatedAt || 0), updatedAt);
    }

    runtime.processes = flat;
    runtime.processRegistry = registry;
    window.protectedGlobals.__processes = flat;
    window.protectedGlobals.__processRegistry = registry;
    window.protectedGlobals.__taskManagerSnapshot = {
      flat: flat,
      registry: registry,
      summary: {
        totalEntries: flat.length,
        totalInstances: flat.length,
        running: flat.filter(function (row) { return String(row.status || "") === "running"; }).length,
      },
      updatedAt: Date.now(),
    };

    return window.protectedGlobals.__taskManagerSnapshot;
  }

  function getTaskManagerSnapshot() {
    buildTaskManagerState();
    return safeClone(window.protectedGlobals.__taskManagerSnapshot);
  }



  function list() {
    var snapshot = getTaskManagerSnapshot();
    return Array.isArray(snapshot.flat) ? snapshot.flat.slice() : [];
  }


  runtime.list = list;
  runtime.snapshot = getTaskManagerSnapshot;
  runtime.createProcess = createProcess;
  runtime.getProcess = getProcess;
  runtime.killProcess = killProcess;
  runtime.terminate = killProcess;
  runtime.disposeAll = disposeAll;
  runtime.buildTaskManagerState = buildTaskManagerState;
  runtime.getTaskManagerSnapshot = getTaskManagerSnapshot;
  runtime.getProcessHookStatus = getProcessHookStatus;
  runtime.__loaded = true;

  window.protectedGlobals.__processRuntime = runtime;
  window.protectedGlobals.FlowawayProcess = runtime;
  if (!window.protectedGlobals.process || typeof window.protectedGlobals.process !== "object") {
    window.protectedGlobals.process = runtime;
  }

  window.protectedGlobals.createProcess = createProcess;
  window.protectedGlobals.getProcess = getProcess;
  window.protectedGlobals.killProcess = killProcess;
  window.protectedGlobals.getTaskManagerSnapshot = getTaskManagerSnapshot;
  window.protectedGlobals.buildTaskManagerState = buildTaskManagerState;
  window.protectedGlobals.getProcessHookStatus = getProcessHookStatus;
  installProcessHooks();
  buildTaskManagerState();
})();