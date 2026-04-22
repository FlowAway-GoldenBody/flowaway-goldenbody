(function () {
  window.protectedGlobals = window.protectedGlobals || {};
  if (window.protectedGlobals.FlowawayProcess && window.protectedGlobals.FlowawayProcess.__loaded) {
    return;
  }

  var runtime = window.protectedGlobals.__processRuntime && typeof window.protectedGlobals.__processRuntime === "object"
    ? window.protectedGlobals.__processRuntime
    : {};

  runtime.__loaded = false;
  runtime.listeners = runtime.listeners instanceof Set ? runtime.listeners : new Set();
  runtime.manualProcesses = runtime.manualProcesses && typeof runtime.manualProcesses === "object"
    ? runtime.manualProcesses
    : {};
  runtime.launchRegistry = runtime.launchRegistry && typeof runtime.launchRegistry === "object"
    ? runtime.launchRegistry
    : {};
  runtime.dynamicProcesses = runtime.dynamicProcesses && typeof runtime.dynamicProcesses === "object"
    ? runtime.dynamicProcesses
    : {};
  runtime.processObjectsByPid = runtime.processObjectsByPid && typeof runtime.processObjectsByPid === "object"
    ? runtime.processObjectsByPid
    : (window.protectedGlobals.__processObjectsByPid && typeof window.protectedGlobals.__processObjectsByPid === "object" ? window.protectedGlobals.__processObjectsByPid : {});
  runtime.processes = Array.isArray(runtime.processes) ? runtime.processes : [];
  runtime.processRegistry = runtime.processRegistry && typeof runtime.processRegistry === "object"
    ? runtime.processRegistry
    : {};
  runtime.taskProcessCounter = Number(runtime.taskProcessCounter || window.protectedGlobals.__taskProcessCounter || 0);
  runtime.reusablePidPool = Array.isArray(runtime.reusablePidPool)
    ? runtime.reusablePidPool
    : (Array.isArray(window.protectedGlobals.__reusablePidPool) ? window.protectedGlobals.__reusablePidPool : []);
  runtime.taskProcessIdByIdentity = runtime.taskProcessIdByIdentity && typeof runtime.taskProcessIdByIdentity === "object"
    ? runtime.taskProcessIdByIdentity
    : (window.protectedGlobals.__taskProcessIdByIdentity && typeof window.protectedGlobals.__taskProcessIdByIdentity === "object" ? window.protectedGlobals.__taskProcessIdByIdentity : {});
  runtime.taskProcessObjectIdentity = runtime.taskProcessObjectIdentity instanceof WeakMap
    ? runtime.taskProcessObjectIdentity
    : (window.protectedGlobals.__taskProcessObjectIdentity instanceof WeakMap ? window.protectedGlobals.__taskProcessObjectIdentity : new WeakMap());
  runtime.taskProcessObjectIdentityCounter = Number(
    runtime.taskProcessObjectIdentityCounter || window.protectedGlobals.__taskProcessObjectIdentityCounter || 0,
  );
  runtime.timerProcessBindings = runtime.timerProcessBindings && typeof runtime.timerProcessBindings === "object"
    ? runtime.timerProcessBindings
    : {};
  runtime.rafProcessBindings = runtime.rafProcessBindings && typeof runtime.rafProcessBindings === "object"
    ? runtime.rafProcessBindings
    : {};
  runtime.observerProcessBindings = runtime.observerProcessBindings && typeof runtime.observerProcessBindings === "object"
    ? runtime.observerProcessBindings
    : {};
  runtime.listenerProcessBindings = runtime.listenerProcessBindings && typeof runtime.listenerProcessBindings === "object"
    ? runtime.listenerProcessBindings
    : {};
  runtime.iframeProcessBindings = runtime.iframeProcessBindings && typeof runtime.iframeProcessBindings === "object"
    ? runtime.iframeProcessBindings
    : {};
  runtime.iframeHookedElements = runtime.iframeHookedElements instanceof WeakSet
    ? runtime.iframeHookedElements
    : new WeakSet();
  runtime.iframeBindingByElement = runtime.iframeBindingByElement instanceof WeakMap
    ? runtime.iframeBindingByElement
    : new WeakMap();
  runtime.iframeHookObserver = runtime.iframeHookObserver || null;
  runtime.serviceWorkerProcessBindings = runtime.serviceWorkerProcessBindings && typeof runtime.serviceWorkerProcessBindings === "object"
    ? runtime.serviceWorkerProcessBindings
    : {};
  runtime.workerProcessBindings = runtime.workerProcessBindings && typeof runtime.workerProcessBindings === "object"
    ? runtime.workerProcessBindings
    : {};
  runtime.workerInstances = runtime.workerInstances instanceof WeakMap
    ? runtime.workerInstances
    : new WeakMap();
  runtime.hookStatus = runtime.hookStatus && typeof runtime.hookStatus === "object"
    ? runtime.hookStatus
    : {};
  runtime.hookStatus.iframe = runtime.hookStatus.iframe && typeof runtime.hookStatus.iframe === "object"
    ? runtime.hookStatus.iframe
    : { hookable: false, reason: "not-initialized", hooked: false, hookedCount: 0, observed: false };
  runtime.hookStatus.serviceWorker = runtime.hookStatus.serviceWorker && typeof runtime.hookStatus.serviceWorker === "object"
    ? runtime.hookStatus.serviceWorker
    : { hookable: false, reason: "not-initialized", hooked: false };
  runtime._nativeServiceWorkerRegister = typeof runtime._nativeServiceWorkerRegister === "function"
    ? runtime._nativeServiceWorkerRegister
    : null;
  runtime._nativeWorkerConstructor = typeof runtime._nativeWorkerConstructor === "function"
    ? runtime._nativeWorkerConstructor
    : null;

  function getFirstDefinedValue() {
    for (var i = 0; i < arguments.length; i++) {
      if (arguments[i] !== null && typeof arguments[i] !== "undefined") {
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

    var identityMap = runtime.taskProcessIdByIdentity && typeof runtime.taskProcessIdByIdentity === "object"
      ? runtime.taskProcessIdByIdentity
      : {};
    var identityKeys = Object.keys(identityMap);
    for (var i = 0; i < identityKeys.length; i++) {
      markPid(identityMap[identityKeys[i]]);
    }

    var processes = Array.isArray(runtime.processes) ? runtime.processes : [];
    for (var p = 0; p < processes.length; p++) {
      var record = processes[p] && typeof processes[p] === "object" ? processes[p] : null;
      if (!record) continue;
      markPid(getFirstDefinedValue(record.pid, record.processId, record.id));
    }

    var store = runtime.processObjectsByPid && typeof runtime.processObjectsByPid === "object"
      ? runtime.processObjectsByPid
      : {};
    var storeKeys = Object.keys(store);
    for (var s = 0; s < storeKeys.length; s++) {
      markPid(storeKeys[s]);
      var stored = store[storeKeys[s]];
      if (stored && typeof stored === "object") {
        markPid(getFirstDefinedValue(stored.pid, stored.processId, stored.id));
      }
    }

    var launches = runtime.launchRegistry && typeof runtime.launchRegistry === "object"
      ? runtime.launchRegistry
      : {};
    var launchKeys = Object.keys(launches);
    for (var l = 0; l < launchKeys.length; l++) {
      var launch = launches[launchKeys[l]];
      if (launch && typeof launch === "object") {
        markPid(getFirstDefinedValue(launch.pid, launch.processId));
      }
    }

    var manuals = runtime.manualProcesses && typeof runtime.manualProcesses === "object"
      ? runtime.manualProcesses
      : {};
    var manualKeys = Object.keys(manuals);
    for (var m = 0; m < manualKeys.length; m++) {
      var manual = manuals[manualKeys[m]];
      if (manual && typeof manual === "object") {
        markPid(getFirstDefinedValue(manual.pid, manual.processId));
      }
    }

    var dynamicRoots = runtime.dynamicProcesses && typeof runtime.dynamicProcesses === "object"
      ? runtime.dynamicProcesses
      : {};
    var rootKeys = Object.keys(dynamicRoots);
    for (var r = 0; r < rootKeys.length; r++) {
      var procMap = dynamicRoots[rootKeys[r]];
      if (!procMap || typeof procMap !== "object") continue;
      var procKeys = Object.keys(procMap);
      for (var d = 0; d < procKeys.length; d++) {
        var dynamicMeta = procMap[procKeys[d]];
        if (dynamicMeta && typeof dynamicMeta === "object") {
          markPid(getFirstDefinedValue(dynamicMeta.pid, dynamicMeta.processId));
        }
      }
    }

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

  function uniqueStringList(values) {
    var list = Array.isArray(values) ? values : [];
    var seen = {};
    var out = [];
    for (var i = 0; i < list.length; i++) {
      var value = String(list[i] || "").trim();
      if (!value) continue;
      var key = value.toLowerCase();
      if (seen[key]) continue;
      seen[key] = true;
      out.push(value);
    }
    return out;
  }

  function uniqueNumberList(values) {
    var list = Array.isArray(values) ? values : [];
    var seen = {};
    var out = [];
    for (var i = 0; i < list.length; i++) {
      var numeric = normalizeProcessPid(list[i]);
      if (typeof numeric !== "number" || Number.isNaN(numeric)) continue;
      var key = String(numeric);
      if (seen[key]) continue;
      seen[key] = true;
      out.push(numeric);
    }
    return out;
  }

  function normalizeWindowIds(value) {
    if (!Array.isArray(value)) return [];
    var out = [];
    var seen = {};
    for (var i = 0; i < value.length; i++) {
      var id = String(value[i] || "").trim();
      if (!id) continue;
      if (seen[id]) continue;
      seen[id] = true;
      out.push(id);
    }
    return out;
  }

  function noopProcessFn() {}

  function buildExecutionShape(inputExecution, existingExecution) {
    var input = inputExecution && typeof inputExecution === "object" ? inputExecution : {};
    var existing = existingExecution && typeof existingExecution === "object" ? existingExecution : {};
    var originInput = input.origin && typeof input.origin === "object" ? input.origin : {};
    var originExisting = existing.origin && typeof existing.origin === "object" ? existing.origin : {};

    return {
      fn: typeof input.fn === "function" ? input.fn : (typeof existing.fn === "function" ? existing.fn : noopProcessFn),
      args: Array.isArray(input.args) ? input.args.slice() : (Array.isArray(existing.args) ? existing.args.slice() : []),
      intervalId: getFirstDefinedValue(input.intervalId, existing.intervalId, null),
      rafId: getFirstDefinedValue(input.rafId, existing.rafId, null),
      ms: Number(getFirstDefinedValue(input.ms, existing.ms, 0)) || 0,
      origin: {
        appId: String(getFirstDefinedValue(originInput.appId, originExisting.appId, "system")),
        appInstanceId: getFirstDefinedValue(originInput.appInstanceId, originExisting.appInstanceId, null),
        listenerType: String(getFirstDefinedValue(originInput.listenerType, originExisting.listenerType, "api")),
        stackTrace: String(getFirstDefinedValue(originInput.stackTrace, originExisting.stackTrace, "")),
      },
    };
  }

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

    var createdValue = Number(getFirstDefinedValue(input.created, input.createdAt, existing.created, existing.createdAt, Date.now()));
    if (!Number.isFinite(createdValue) || createdValue <= 0) createdValue = Date.now();

    var statusValue = String(getFirstDefinedValue(input.status, existing.status, "running"));
    var persistentValue = !!getFirstDefinedValue(input.persistent, existing.persistent, false);
    var windowIdsValue = normalizeWindowIds(
      getFirstDefinedValue(input.windowIds, existing.windowIds, []),
    );
    var hasWindowValue = !!getFirstDefinedValue(
      input.hasWindow,
      existing.hasWindow,
      windowIdsValue.length > 0,
      typeValue === "app" || typeValue === "launch",
    );

    var cleanupFn = typeof input.cleanup === "function"
      ? input.cleanup
      : typeof input.stop === "function"
        ? input.stop
        : typeof existing.cleanup === "function"
          ? existing.cleanup
          : typeof existing.stop === "function"
            ? existing.stop
            : noopProcessFn;

    var runFn = typeof input.run === "function"
      ? input.run
      : typeof existing.run === "function"
        ? existing.run
        : noopProcessFn;

    var handlerFn = typeof input.handler === "function"
      ? input.handler
      : typeof existing.handler === "function"
        ? existing.handler
        : runFn;

    var parentPidValue = normalizeProcessPid(
      getFirstDefinedValue(input.parentPid, existing.parentPid, null),
    );
    var childrenValue = uniqueNumberList(
      getFirstDefinedValue(input.children, existing.children, []),
    );

    return {
      pid: pidValue,
      processId: pidValue,
      id: pidValue,
      type: typeValue,
      processKind: typeValue,
      sourceType: String(getFirstDefinedValue(input.sourceType, existing.sourceType, typeValue)),
      title: titleValue,
      name: titleValue,
      label: String(getFirstDefinedValue(input.label, existing.label, titleValue)),
      appId: appIdValue,
      status: statusValue,
      persistent: persistentValue,
      hasWindow: hasWindowValue,
      windowIds: windowIdsValue,
      created: createdValue,
      createdAt: createdValue,
      cleanup: cleanupFn,
      run: runFn,
      handler: handlerFn,
      stop: cleanupFn,
      parentPid: parentPidValue,
      children: childrenValue,
      options: Object.assign(
        {},
        existing.options && typeof existing.options === "object" ? existing.options : {},
        input.options && typeof input.options === "object" ? input.options : {},
      ),
      execution: buildExecutionShape(
        getFirstDefinedValue(input.execution, existing.execution, {}),
        existing.execution,
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

  function removeChildPidFromParent(parentPidValue, childPidValue) {
    var parent = getCanonicalProcessByPid(parentPidValue);
    var childPid = normalizeProcessPid(childPidValue);
    if (!parent || typeof childPid !== "number" || Number.isNaN(childPid)) return;
    var nextChildren = uniqueNumberList(parent.children).filter(function (pid) {
      return pid !== childPid;
    });
    parent.children = nextChildren;
  }

  function attachChildPidToParent(parentPidValue, childPidValue) {
    var parent = getCanonicalProcessByPid(parentPidValue);
    var childPid = normalizeProcessPid(childPidValue);
    if (!parent || typeof childPid !== "number" || Number.isNaN(childPid)) return;
    var nextChildren = uniqueNumberList([].concat(parent.children || [], [childPid]));
    parent.children = nextChildren;
  }

  function ensureProcessObjectsStore() {
    if (!runtime.processObjectsByPid || typeof runtime.processObjectsByPid !== "object") {
      runtime.processObjectsByPid = {};
    }
    window.protectedGlobals.__processObjectsByPid = runtime.processObjectsByPid;
    return runtime.processObjectsByPid;
  }

  function buildIndividualProcessRecord(entry, instanceRecord) {
    var e = entry && typeof entry === "object" ? entry : {};
    var instance = instanceRecord && typeof instanceRecord === "object" ? instanceRecord : {};
    var pidValue = normalizeProcessPid(getFirstDefinedValue(instance.processId, instance.pid));
    var updatedAt = Number(e.updatedAt || Date.now());
    var existingProcessObject = runtime.processObjectsByPid && runtime.processObjectsByPid[String(pidValue)]
      ? runtime.processObjectsByPid[String(pidValue)]
      : null;
    var title = String(
      instance.title ||
        instance.label ||
        e.label ||
        e.appId ||
        "Instance",
    );

    return {
      pid: pidValue,
      processId: pidValue,
      appId: String(e.appId || "unknown-app"),
      appInstanceId: getFirstDefinedValue(instance.appInstanceId, instance.instanceId, instance.sourceIndex),
      goldenbodyId: getFirstDefinedValue(instance.goldenbodyId, null),
      title: title,
      label: String(instance.label || title),
      appLabel: String(e.label || e.appLabel || e.appId || "unknown-app"),
      appEntry: String(e.entry || ""),
      appGlobalVar: String(e.globalVar || ""),
      appSourceType: String(e.sourceType || "unknown"),
      appStatus: String(e.status || "unknown"),
      sourceType: String(e.sourceType || "unknown"),
      status: String(e.status || "unknown"),
      updatedAt: updatedAt,
      processKind: String(e.processKind || "app"),
      type: String(
        getFirstDefinedValue(
          existingProcessObject && existingProcessObject.type,
          e.processKind,
          e.sourceType,
          "app",
        ),
      ),
      persistent: !!getFirstDefinedValue(
        instance.persistent,
        existingProcessObject && existingProcessObject.persistent,
        false,
      ),
      hasWindow: !!getFirstDefinedValue(
        instance.hasWindow,
        existingProcessObject && existingProcessObject.hasWindow,
        true,
      ),
      windowIds: normalizeWindowIds(
        getFirstDefinedValue(
          instance.windowIds,
          existingProcessObject && existingProcessObject.windowIds,
          instance.goldenbodyId || instance.goldenbodyId === 0 ? [String(instance.goldenbodyId)] : [],
        ),
      ),
      parentPid: getFirstDefinedValue(
        instance.parentPid,
        existingProcessObject && existingProcessObject.parentPid,
        null,
      ),
      children: uniqueNumberList(
        getFirstDefinedValue(
          instance.children,
          existingProcessObject && existingProcessObject.children,
          [],
        ),
      ),
      entryOptions: uniqueStringList(
        [].concat(
          Array.isArray(e.entryOptions) ? e.entryOptions : [],
          [e.entry, e.globalVar, e.appId, e.label],
        ),
      ),
    };
  }

  function buildAppLaunchRecord(appMeta, extraMeta) {
    var app = appMeta && typeof appMeta === "object" ? appMeta : {};
    var extra = extraMeta && typeof extraMeta === "object" ? extraMeta : {};
    var appId = String(app.id || app.functionname || app.label || app.path || "unknown-app");
    var label = String(app.label || app.functionname || appId);
    var functionname = String(app.functionname || app.path || app.id || "");
    var globalVar = typeof app.globalvarobjectstring === "string" ? app.globalvarobjectstring : "";
    var stableKey = [appId, functionname, globalVar, String(extra.instanceKey || extra.rootId || "launch")].join("::");
    var existing = runtime.launchRegistry[stableKey];
    if (!existing) {
      existing = {
        key: stableKey,
        pid: allocateProcessId("launch::" + stableKey, null),
        appId: appId,
        label: label,
        functionname: functionname,
        globalVar: globalVar,
        sourceType: "launch",
        status: "running",
        appInstanceId: getFirstDefinedValue(extra.appInstanceId, extra.rootId, 1),
        goldenbodyId: getFirstDefinedValue(extra.goldenbodyId, null),
        updatedAt: Date.now(),
        meta: {},
      };
      runtime.launchRegistry[stableKey] = existing;
    }

    existing.appId = appId;
    existing.label = label;
    existing.functionname = functionname;
    existing.globalVar = globalVar;
    existing.sourceType = "launch";
    existing.status = extra.status || "running";
    existing.appInstanceId = getFirstDefinedValue(extra.appInstanceId, existing.appInstanceId, 1);
    existing.goldenbodyId = getFirstDefinedValue(extra.goldenbodyId, existing.goldenbodyId, null);
    existing.updatedAt = Date.now();
    existing.meta = Object.assign({}, existing.meta || {}, extra);
    runtime.processRegistry[stableKey] = existing;
    return existing;
  }

  function registerManualProcess(meta) {
    var input = meta && typeof meta === "object" ? meta : {};
    var appId = String(input.appId || (window.protectedGlobals._launchContext && window.protectedGlobals._launchContext.appId) || "global");
    var name = String(input.name || input.processName || input.label || input.title || appId + " process");
    var key = String(input.key || [appId, name, input.group || "manual"].join("::"));
    var existing = runtime.manualProcesses[key];
    if (existing && !input.replace) {
      existing.updatedAt = Date.now();
      existing.meta = Object.assign({}, existing.meta || {}, input);
      return existing.handle;
    }

    var pid = allocateProcessId("manual::" + key, null);
    var record = {
      key: key,
      pid: pid,
      processId: pid,
      appId: appId,
      label: name,
      title: String(input.title || name),
      status: "running",
      sourceType: "manual",
      processKind: "manual",
      appInstanceId: getFirstDefinedValue(input.appInstanceId, null),
      goldenbodyId: getFirstDefinedValue(input.goldenbodyId, null),
      createdAt: Date.now(),
      updatedAt: Date.now(),
      stop: typeof input.stop === "function" ? input.stop : null,
      meta: Object.assign({}, input),
    };

    var handle = {
      id: pid,
      pid: pid,
      appId: appId,
      key: key,
      name: name,
      status: "running",
      meta: record.meta,
      terminate: function (reason) {
        return killProcess(pid, reason || "manual-terminate");
      },
      stop: function (reason) {
        return killProcess(pid, reason || "manual-stop");
      },
      update: function (patch) {
        if (!patch || typeof patch !== "object") return handle;
        record.meta = Object.assign({}, record.meta || {}, patch);
        record.updatedAt = Date.now();
        return handle;
      },
    };

    record.handle = handle;
    var canonical = ensureCanonicalProcessShape(
      {
        pid: pid,
        type: "manual",
        title: String(record.title || name),
        appId: appId,
        status: String(record.status || "running"),
        persistent: !!getFirstDefinedValue(input.persistent, false),
        hasWindow: !!getFirstDefinedValue(input.hasWindow, false),
        windowIds: getFirstDefinedValue(input.windowIds, []),
        created: Number(record.createdAt || Date.now()),
        cleanup: typeof record.stop === "function" ? record.stop : noopProcessFn,
        run: typeof input.run === "function" ? input.run : noopProcessFn,
        parentPid: getFirstDefinedValue(input.parentPid, null),
        children: getFirstDefinedValue(input.children, []),
      },
      {
        existing: runtime.processObjectsByPid[String(pid)] || {},
        pid: pid,
        identityKey: "manual::" + String(key),
      },
    );
    runtime.processObjectsByPid[String(pid)] = canonical;
    if (canonical.parentPid || canonical.parentPid === 0) {
      attachChildPidToParent(canonical.parentPid, canonical.pid);
    }
    runtime.manualProcesses[key] = record;
    runtime.processRegistry[key] = record;
    return handle;
  }

  function getAppArrayKeys(app) {
    var keys = [];
    if (!app || typeof app !== "object") return keys;

    if (typeof app.allapparraystring === "string") {
      var singleKey = String(app.allapparraystring || "").trim();
      if (singleKey) keys.push(singleKey);
    } else if (Array.isArray(app.allapparraystring)) {
      for (var i = 0; i < app.allapparraystring.length; i++) {
        var keyValue = app.allapparraystring[i];
        if (typeof keyValue !== "string") continue;
        var normalizedKey = String(keyValue || "").trim();
        if (!normalizedKey) continue;
        if (keys.indexOf(normalizedKey) === -1) keys.push(normalizedKey);
      }
    }

    return keys;
  }

  function closeLiveAppInstance(instance, appMeta) {
    if (!instance || typeof instance !== "object") return false;

    if (typeof instance.closeWindow === "function") {
      try {
        instance.closeWindow();
        return true;
      } catch (e) {}
    }

    if (typeof instance.close === "function") {
      try {
        instance.close();
        return true;
      } catch (e) {}
    }

    if (instance.rootElement && typeof instance.rootElement.remove === "function") {
      try {
        instance.rootElement.remove();
      } catch (e) {}

      return true;
    }

    return false;
  }

  function terminateLiveAppInstance(pidValue) {
    var apps = Array.isArray(window.protectedGlobals.apps) ? window.protectedGlobals.apps : [];
    var pidKey = String(pidValue);

    for (var i = 0; i < apps.length; i++) {
      var app = apps[i] && typeof apps[i] === "object" ? apps[i] : {};
      var globalVar = typeof app.globalvarobjectstring === "string" ? app.globalvarobjectstring : "";
      var arrayKeys = getAppArrayKeys(app);
      if (!globalVar || !arrayKeys.length) continue;

      var host = window[globalVar];
      if (!host || typeof host !== "object") continue;

      for (var k = 0; k < arrayKeys.length; k++) {
        var arrayKey = arrayKeys[k];
        var list = host[arrayKey];
        if (!Array.isArray(list)) continue;

        for (var j = 0; j < list.length; j++) {
          var instance = list[j] && typeof list[j] === "object" ? list[j] : null;
          if (!instance) continue;

          var currentPid =
            (typeof instance.pid !== "undefined" && instance.pid !== null ? instance.pid : null);
          if (currentPid === null || typeof currentPid === "undefined") {
            currentPid =
              (typeof instance.processId !== "undefined" && instance.processId !== null ? instance.processId : null);
          }
          if (currentPid === null || typeof currentPid === "undefined") {
            currentPid =
              (typeof instance.id !== "undefined" && instance.id !== null ? instance.id : null);
          }
          if (currentPid === null || String(currentPid) !== pidKey) continue;

          var closed = closeLiveAppInstance(instance, app);
          if (!closed) continue;

          try {
            var removedRoot = instance.rootElement || null;
            host[arrayKey] = list.filter(function (item) {
              if (!item || typeof item !== "object") return true;
              if (item === instance) return false;
              if (removedRoot && item.rootElement === removedRoot) return false;
              if (item.rootElement && item.rootElement.isConnected === false) return false;
              return true;
            });
          } catch (e) {}

          return true;
        }
      }
    }

    return false;
  }

  function terminateRecord(record, reason) {
    if (!record || typeof record !== "object") return false;
    try {
      if (typeof record.stop === "function") {
        record.stop(reason || "terminate");
      } else if (record.handle && typeof record.handle.stop === "function") {
        record.handle.stop(reason || "terminate");
      }
    } catch (e) {}
    record.status = "terminated";
    record.updatedAt = Date.now();
    return true;
  }

  function terminateProcess(target, reason) {
    if (target === null || typeof target === "undefined") return false;
    var terminated = false;
    var pidValue = normalizeProcessPid(target);
    if (typeof pidValue !== "number" || Number.isNaN(pidValue)) {
      return false;
    }
    var pidKey = pidValue === null || typeof pidValue === "undefined" ? "" : String(pidValue);

    if (pidKey && runtime.processObjectsByPid[pidKey]) {
      var processObject = runtime.processObjectsByPid[pidKey];
      if (processObject && typeof processObject.stop === "function") {
        try {
          processObject.stop(reason || "terminate");
          terminated = true;
        } catch (e) {}
      } else if (processObject && processObject.handle && typeof processObject.handle.stop === "function") {
        try {
          processObject.handle.stop(reason || "terminate");
          terminated = true;
        } catch (e) {}
      }
      delete runtime.processObjectsByPid[pidKey];
    }

    var manualKeys = Object.keys(runtime.manualProcesses);
    for (var i = 0; i < manualKeys.length; i++) {
      var manual = runtime.manualProcesses[manualKeys[i]];
      if (!manual) continue;
      if (pidKey && String(manual.pid) === pidKey) {
        terminateRecord(manual, reason);
        delete runtime.manualProcesses[manualKeys[i]];
        delete runtime.processRegistry[manualKeys[i]];
        terminated = true;
      }
    }

    var launchKeys = Object.keys(runtime.launchRegistry);
    for (var j = 0; j < launchKeys.length; j++) {
      var launch = runtime.launchRegistry[launchKeys[j]];
      if (!launch) continue;
      var matchesPid = pidKey && String(launch.pid) === pidKey;
      if (matchesPid) {
        terminateRecord(launch, reason);
        delete runtime.launchRegistry[launchKeys[j]];
        delete runtime.processRegistry[launchKeys[j]];
        terminated = true;
      }
    }

    var dynamicApps = Object.keys(runtime.dynamicProcesses);
    for (var a = 0; a < dynamicApps.length; a++) {
      var appId = dynamicApps[a];
      var procMap = runtime.dynamicProcesses[appId];
      for (var procName in procMap) {
        if (!Object.prototype.hasOwnProperty.call(procMap, procName)) continue;
        var dynamicMeta = procMap[procName] && typeof procMap[procName] === "object" ? procMap[procName] : {};
        var dynamicPid = normalizeProcessPid(
          getFirstDefinedValue(dynamicMeta.pid, dynamicMeta.processId),
        );
        if (String(dynamicPid) !== pidKey) continue;
        delete procMap[procName];
        terminated = true;
      }
      if (!Object.keys(procMap).length) {
        delete runtime.dynamicProcesses[appId];
      }
    }

    if (!terminated) {
      terminated = terminateLiveAppInstance(pidValue);
    }

    return terminated;
  }

  function removePidFromGlobalProcessLists(pidValue) {
    var pid = normalizeProcessPid(pidValue);
    if (typeof pid !== "number" || Number.isNaN(pid)) return;
    runtime.processes = (Array.isArray(runtime.processes) ? runtime.processes : []).filter(function (record) {
      if (!record || typeof record !== "object") return false;
      var recordPid = normalizeProcessPid(getFirstDefinedValue(record.pid, record.processId));
      return recordPid !== pid;
    });
    window.protectedGlobals.__processes = runtime.processes;

    var snapshot = window.protectedGlobals.__taskManagerSnapshot && typeof window.protectedGlobals.__taskManagerSnapshot === "object"
      ? window.protectedGlobals.__taskManagerSnapshot
      : null;
    if (snapshot && Array.isArray(snapshot.flat)) {
      snapshot.flat = snapshot.flat.filter(function (row) {
        if (!row || typeof row !== "object") return false;
        var rowPid = normalizeProcessPid(getFirstDefinedValue(row.pid, row.processId));
        return rowPid !== pid;
      });
      window.protectedGlobals.__taskManagerSnapshot = snapshot;
    }
  }

  function runProcessCleanup(processObject, reason) {
    if (!processObject || typeof processObject !== "object") return;
    if (processObject.__cleanupCalled) return;
    processObject.__cleanupCalled = true;
    try {
      if (typeof processObject.cleanup === "function") {
        processObject.cleanup(reason || "kill");
      }
    } catch (e) {}
  }

  function getProcessHookStatus() {
    return {
      iframe: Object.assign({}, runtime.hookStatus && runtime.hookStatus.iframe ? runtime.hookStatus.iframe : {}),
      serviceWorker: Object.assign({}, runtime.hookStatus && runtime.hookStatus.serviceWorker ? runtime.hookStatus.serviceWorker : {}),
    };
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

  function setServiceWorkerHookStatus(hookable, reason, extra) {
    var next = Object.assign(
      {},
      runtime.hookStatus && runtime.hookStatus.serviceWorker ? runtime.hookStatus.serviceWorker : {},
      extra && typeof extra === "object" ? extra : {},
      {
        hookable: !!hookable,
        reason: String(reason || "unknown"),
      },
    );
    runtime.hookStatus.serviceWorker = next;
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
    if (iframe && typeof iframe.closest === "function") {
      try {
        root = iframe.closest(".app-window-root");
      } catch (e) {
        root = null;
      }
    }
    if (root && root.dataset && root.dataset.appId) {
      appId = String(root.dataset.appId);
    }

    var src = "";
    try {
      src = String(getFirstDefinedValue(iframe && iframe.getAttribute && iframe.getAttribute("src"), iframe && iframe.src, ""));
    } catch (e) {
      src = "";
    }

    var title = String(
      getFirstDefinedValue(
        iframe && iframe.getAttribute && iframe.getAttribute("title"),
        iframe && iframe.title,
        src ? "Iframe: " + src : "Iframe",
      ),
    );

    return {
      appId: appId,
      title: title,
      src: src,
      windowId: String(getFirstDefinedValue(
        iframe && iframe.id,
        iframe && iframe.name,
        src,
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
        existingProc.title = existingMeta.title;
        existingProc.label = existingMeta.title;
        existingProc.appId = existingMeta.appId;
        existingProc.hasWindow = true;
        existingProc.windowIds = normalizeWindowIds([existingMeta.windowId]);
        existingProc.status = "running";
      }
      return true;
    }

    if (runtime.iframeHookedElements.has(iframe)) {
      runtime.iframeHookedElements.delete(iframe);
    }
    runtime.iframeHookedElements.add(iframe);

    var contextMeta = getIframeContextMeta(iframe);
    var createdProcess = createProcess({
      type: "iframe",
      title: contextMeta.title,
      appId: contextMeta.appId,
      status: "running",
      persistent: false,
      hasWindow: true,
      windowIds: [contextMeta.windowId],
      cleanup: noopProcessFn,
      options: {
        iframeSrc: contextMeta.src,
        iframeWindowId: contextMeta.windowId,
      },
      key: "iframe::" + contextMeta.windowId + "::" + String(Date.now()) + "::" + String(Math.random().toString(36).slice(2, 8)),
    });

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
    if (typeof iframe.addEventListener === "function") {
      iframe.addEventListener("load", onLoad);
    }
    binding.cleanupListener = function () {
      if (typeof iframe.removeEventListener === "function") {
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

    if (typeof binding.cleanupListener === "function") {
      binding.cleanupListener(reasonTag || "iframe-remove-cleanup");
      return true;
    }
    return false;
  }

  function scanAndHookIframes() {
    if (!document || typeof document.querySelectorAll !== "function") {
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
    var NativeObserver = typeof window.MutationObserver === "function" ? window.MutationObserver : null;
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
              if (typeof node.querySelectorAll === "function") {
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
              if (typeof removedNode.querySelectorAll === "function") {
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
    if (!observeTarget || typeof runtime.iframeHookObserver.observe !== "function") {
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

  function getServiceWorkerHookability() {
    if (!window || !window.navigator) {
      return { hookable: false, reason: "navigator-unavailable" };
    }

    var swContainer;
    try {
      swContainer = window.navigator.serviceWorker;
    } catch (e) {
      return {
        hookable: false,
        reason: "service-worker-access-denied",
        error: String(e && (e.message || e) || "service-worker-access-error"),
      };
    }

    if (!swContainer || typeof swContainer !== "object") {
      return { hookable: false, reason: "service-worker-unavailable" };
    }

    var nativeRegister;
    try {
      nativeRegister = swContainer.register;
    } catch (e) {
      return {
        hookable: false,
        reason: "register-access-denied",
        error: String(e && (e.message || e) || "register-access-error"),
      };
    }

    if (typeof nativeRegister !== "function") {
      return { hookable: false, reason: "register-not-function" };
    }

    var desc = Object.getOwnPropertyDescriptor(swContainer, "register");
    if (!desc) {
      if (!Object.isExtensible(swContainer)) {
        return {
          hookable: false,
          reason: "register-not-overridable-nonextensible",
        };
      }
      return {
        hookable: true,
        reason: "register-overridable-via-own-property",
        nativeRegister: nativeRegister,
        container: swContainer,
      };
    }

    if (desc.writable || desc.configurable || typeof desc.set === "function") {
      return {
        hookable: true,
        reason: "register-overridable",
        nativeRegister: nativeRegister,
        container: swContainer,
      };
    }

    return { hookable: false, reason: "register-readonly" };
  }

  function installServiceWorkerRegisterHook() {
    var hookability = getServiceWorkerHookability();
    if (!hookability.hookable) {
      setServiceWorkerHookStatus(false, hookability.reason, {
        hooked: false,
        error: hookability.error || null,
      });
      return false;
    }

    var swContainer = hookability.container;
    var nativeRegister = hookability.nativeRegister;
    if (typeof nativeRegister !== "function" || !swContainer) {
      setServiceWorkerHookStatus(false, "register-native-missing", { hooked: false });
      return false;
    }

    if (runtime._nativeServiceWorkerRegister === nativeRegister && swContainer.register !== nativeRegister) {
      setServiceWorkerHookStatus(true, "register-hook-already-installed", { hooked: true });
      return true;
    }

    runtime._nativeServiceWorkerRegister = nativeRegister;
    swContainer.register = function () {
      var scriptURL = arguments.length > 0 ? arguments[0] : null;
      var options = arguments.length > 1 ? arguments[1] : null;
      var scriptText = scriptURL === null || typeof scriptURL === "undefined" ? "unknown" : String(scriptURL);
      var appId = String(getFirstDefinedValue(window.protectedGlobals.atTop, window.protectedGlobals.topAppId, "service-worker"));
      var createdProcess = createProcess({
        type: "service-worker",
        title: "Service Worker: " + scriptText,
        appId: appId,
        status: "running",
        persistent: true,
        hasWindow: false,
        windowIds: [],
        cleanup: noopProcessFn,
        options: {
          scriptURL: scriptText,
          fromRegister: true,
        },
        key: "service-worker::" + scriptText + "::" + String(Date.now()) + "::" + String(Math.random().toString(36).slice(2, 8)),
      });
      runtime.hookStatus.serviceWorker.lastRegistration = {
        scriptURL: scriptText,
        hasOptions: !!(options && typeof options === "object"),
        pid: createdProcess && createdProcess.pid ? createdProcess.pid : null,
        at: Date.now(),
      };

      var registrationResult = nativeRegister.apply(swContainer, arguments);
      if (createdProcess && createdProcess.pid) {
        runtime.serviceWorkerProcessBindings[String(createdProcess.pid)] = {
          pid: createdProcess.pid,
          scriptURL: scriptText,
          appId: appId,
          registration: null,
        };
      }

      if (registrationResult && typeof registrationResult.then === "function" && createdProcess && createdProcess.pid) {
        registrationResult.then(function (registration) {
          var proc = getCanonicalProcessByPid(createdProcess.pid);
          if (!proc) return;
          if (registration && registration.scope) {
            proc.options = proc.options && typeof proc.options === "object" ? proc.options : {};
            proc.options.scope = String(registration.scope);
          }
          if (createdProcess.pid && runtime.serviceWorkerProcessBindings[String(createdProcess.pid)]) {
            runtime.serviceWorkerProcessBindings[String(createdProcess.pid)].registration = registration;
          }
        }).catch(function () {
          setProcessStatus(createdProcess.pid, "failed");
        });
      }

      return registrationResult;
    };

    setServiceWorkerHookStatus(true, hookability.reason, {
      hooked: true,
    });
    return true;
  }

  function installWorkerConstructorHook() {
    if (!window || typeof window.Worker !== "function") {
      return false;
    }

    var nativeWorker = window.Worker;
    if (runtime._nativeWorkerConstructor === nativeWorker) {
      return true;
    }

    runtime._nativeWorkerConstructor = nativeWorker;

    window.Worker = function () {
      var scriptURL = arguments.length > 0 ? arguments[0] : null;
      var options = arguments.length > 1 ? arguments[1] : null;
      var scriptText = scriptURL === null || typeof scriptURL === "undefined" ? "unknown" : String(scriptURL);

      var workerInstance = 1 === arguments.length
        ? new nativeWorker(scriptURL)
        : new nativeWorker(scriptURL, options);

      var appId = String(getFirstDefinedValue(window.protectedGlobals.atTop, window.protectedGlobals.topAppId, "worker"));
      var createdProcess = createProcess({
        type: "worker",
        title: "Worker: " + scriptText,
        appId: appId,
        status: "running",
        persistent: false,
        hasWindow: false,
        windowIds: [],
        cleanup: noopProcessFn,
        options: {
          scriptURL: scriptText,
          hasOptions: !!(options && typeof options === "object"),
        },
        key: "worker::" + scriptText + "::" + String(Date.now()) + "::" + String(Math.random().toString(36).slice(2, 8)),
      });

      if (createdProcess && createdProcess.pid) {
        var bindingKey = "worker::" + String(createdProcess.pid) + "::" + String(Math.random().toString(36).slice(2, 8));
        runtime.workerProcessBindings[bindingKey] = {
          key: bindingKey,
          pid: createdProcess.pid,
          instance: workerInstance,
        };
      }

      return workerInstance;
    };

    return true;
  }

  function installProcessHooks() {
    scanAndHookIframes();
    installIframeHookObserver();
    installServiceWorkerRegisterHook();
    installWorkerConstructorHook();
    window.protectedGlobals.__processHookStatus = getProcessHookStatus();
  }

  function removeTrackedBindingsForPid(pidValue) {
    var pid = normalizeProcessPid(pidValue);
    if (typeof pid !== "number" || Number.isNaN(pid) || pid <= 0) return;

    var timerKeys = Object.keys(runtime.timerProcessBindings || {});
    for (var i = 0; i < timerKeys.length; i++) {
      var timerBinding = runtime.timerProcessBindings[timerKeys[i]];
      if (!timerBinding || normalizeProcessPid(timerBinding.pid) !== pid) continue;
      delete runtime.timerProcessBindings[timerKeys[i]];
    }

    var rafKeys = Object.keys(runtime.rafProcessBindings || {});
    for (var r = 0; r < rafKeys.length; r++) {
      var rafBinding = runtime.rafProcessBindings[rafKeys[r]];
      if (!rafBinding || normalizeProcessPid(rafBinding.pid) !== pid) continue;
      delete runtime.rafProcessBindings[rafKeys[r]];
    }

    var observerKeys = Object.keys(runtime.observerProcessBindings || {});
    for (var o = 0; o < observerKeys.length; o++) {
      var observerBinding = runtime.observerProcessBindings[observerKeys[o]];
      if (!observerBinding || normalizeProcessPid(observerBinding.pid) !== pid) continue;
      delete runtime.observerProcessBindings[observerKeys[o]];
    }

    var listenerKeys = Object.keys(runtime.listenerProcessBindings || {});
    for (var l = 0; l < listenerKeys.length; l++) {
      var listenerBinding = runtime.listenerProcessBindings[listenerKeys[l]];
      if (!listenerBinding || normalizeProcessPid(listenerBinding.pid) !== pid) continue;
      if (typeof listenerBinding.cleanupListener === "function") {
        listenerBinding.cleanupListener("pid-remove");
      } else {
        delete runtime.listenerProcessBindings[listenerKeys[l]];
      }
    }

    var iframeKeys = Object.keys(runtime.iframeProcessBindings || {});
    for (var f = 0; f < iframeKeys.length; f++) {
      var iframeBinding = runtime.iframeProcessBindings[iframeKeys[f]];
      if (!iframeBinding || normalizeProcessPid(iframeBinding.pid) !== pid) continue;
      if (iframeBinding.iframe) {
        try {
          iframeBinding.iframe.src = "about:blank";
        } catch (e) {}
      }
      if (typeof iframeBinding.cleanupListener === "function") {
        iframeBinding.cleanupListener("pid-remove");
      } else {
        delete runtime.iframeProcessBindings[iframeKeys[f]];
      }
    }

    if (runtime.serviceWorkerProcessBindings && runtime.serviceWorkerProcessBindings[String(pid)]) {
      var swBinding = runtime.serviceWorkerProcessBindings[String(pid)];
      if (swBinding && swBinding.registration && typeof swBinding.registration.unregister === "function") {
        try {
          swBinding.registration.unregister();
        } catch (e) {}
      }
      delete runtime.serviceWorkerProcessBindings[String(pid)];
    }

    var workerKeys = Object.keys(runtime.workerProcessBindings || {});
    for (var w = 0; w < workerKeys.length; w++) {
      var workerBinding = runtime.workerProcessBindings[workerKeys[w]];
      if (!workerBinding || normalizeProcessPid(workerBinding.pid) !== pid) continue;
      if (workerBinding.instance && typeof workerBinding.instance.terminate === "function") {
        try {
          workerBinding.instance.terminate();
        } catch (e) {}
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
    if (proc && Array.isArray(proc.children) && proc.children.length) {
      var childPids = uniqueNumberList(proc.children);
      for (var i = 0; i < childPids.length; i++) {
        var childPid = childPids[i];
        var childProcess = getCanonicalProcessByPid(childPid);
        if (!childProcess) continue;
        if (childProcess.persistent === true) continue;
        killProcess(childPid, reason || "parent-kill", visited);
      }
    }

    if (proc) {
      runProcessCleanup(proc, reason || "kill");
    }

    if (proc && (proc.parentPid || proc.parentPid === 0)) {
      removeChildPidFromParent(proc.parentPid, pidValue);
    }
    removeTrackedBindingsForPid(pidValue);
    var terminated = terminateProcess(pidValue, reason || "kill");
    delete runtime.processObjectsByPid[String(pidValue)];
    removePidFromGlobalProcessLists(pidValue);
    if (terminated) {
      releaseProcessId(pidValue);
    }

    return terminated;
  }

  function setProcessStatus(pidValue, statusValue) {
    var pid = normalizeProcessPid(pidValue);
    if (typeof pid !== "number" || Number.isNaN(pid) || pid <= 0) return false;
    var status = String(statusValue || "unknown");
    var updated = false;

    var canonical = getCanonicalProcessByPid(pid);
    if (canonical) {
      canonical.status = status;
      updated = true;
    }

    var manualKeys = Object.keys(runtime.manualProcesses);
    for (var i = 0; i < manualKeys.length; i++) {
      var manual = runtime.manualProcesses[manualKeys[i]];
      if (!manual) continue;
      if (normalizeProcessPid(manual.pid) !== pid) continue;
      manual.status = status;
      manual.updatedAt = Date.now();
      updated = true;
    }

    var launchKeys = Object.keys(runtime.launchRegistry);
    for (var j = 0; j < launchKeys.length; j++) {
      var launch = runtime.launchRegistry[launchKeys[j]];
      if (!launch) continue;
      if (normalizeProcessPid(launch.pid) !== pid) continue;
      launch.status = status;
      launch.updatedAt = Date.now();
      updated = true;
    }

    var dynamicApps = Object.keys(runtime.dynamicProcesses);
    for (var a = 0; a < dynamicApps.length; a++) {
      var appId = dynamicApps[a];
      var procMap = runtime.dynamicProcesses[appId];
      for (var procName in procMap) {
        if (!Object.prototype.hasOwnProperty.call(procMap, procName)) continue;
        var dynamicMeta = procMap[procName] && typeof procMap[procName] === "object" ? procMap[procName] : {};
        var dynamicPid = normalizeProcessPid(getFirstDefinedValue(dynamicMeta.pid, dynamicMeta.processId));
        if (dynamicPid !== pid) continue;
        dynamicMeta.status = status;
        dynamicMeta.updatedAt = Date.now();
        procMap[procName] = dynamicMeta;
        updated = true;
      }
    }

    if (updated) {
      return true;
    }

    return updated;
  }

  function suspendProcess(pidValue) {
    var pid = normalizeProcessPid(pidValue);
    if (typeof pid !== "number" || Number.isNaN(pid) || pid <= 0) return false;
    return setProcessStatus(pid, "suspended");
  }

  function resumeProcess(pidValue) {
    var pid = normalizeProcessPid(pidValue);
    if (typeof pid !== "number" || Number.isNaN(pid) || pid <= 0) return false;
    return setProcessStatus(pid, "running");
  }

  function getProcess(pidValue) {
    var processObject = getCanonicalProcessByPid(pidValue);
    return processObject || null;
  }

  function getProcessesByApp(appIdValue) {
    var appId = String(appIdValue || "").trim();
    if (!appId) return [];
    var store = ensureProcessObjectsStore();
    var pids = Object.keys(store);
    var out = [];
    for (var i = 0; i < pids.length; i++) {
      var processObject = getCanonicalProcessByPid(pids[i]);
      if (!processObject) continue;
      if (String(processObject.appId || "") !== appId) continue;
      out.push(processObject);
    }
    return out;
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
      appInstanceId: getFirstDefinedValue(input.appInstanceId, null),
      goldenbodyId: getFirstDefinedValue(input.goldenbodyId, null),
      createdAt: Number(canonical.created || Date.now()),
      updatedAt: Date.now(),
      stop: canonical.cleanup,
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
    runtime.manualProcesses[manualKey] = manualRecord;
    runtime.processRegistry[manualKey] = manualRecord;

    if (canonical.parentPid || canonical.parentPid === 0) {
      attachChildPidToParent(canonical.parentPid, canonical.pid);
    }

    return canonical;
  }

  function disposeAll(reason) {
    var manualKeys = Object.keys(runtime.manualProcesses);
    for (var i = 0; i < manualKeys.length; i++) {
      terminateRecord(runtime.manualProcesses[manualKeys[i]], reason || "dispose-all");
    }
    runtime.manualProcesses = {};
    runtime.launchRegistry = {};
    runtime.dynamicProcesses = {};
    runtime.processRegistry = {};
    runtime.processObjectsByPid = {};
    if (runtime.iframeHookObserver && typeof runtime.iframeHookObserver.disconnect === "function") {
      runtime.iframeHookObserver.disconnect();
    }
    runtime.iframeHookObserver = null;
    runtime.iframeHookedElements = new WeakSet();
    runtime.iframeBindingByElement = new WeakMap();
    runtime.iframeProcessBindings = {};
    runtime.serviceWorkerProcessBindings = {};
    runtime.workerProcessBindings = {};
    runtime.workerInstances = new WeakMap();
    runtime.timerProcessBindings = {};
    runtime.rafProcessBindings = {};
    runtime.observerProcessBindings = {};
    runtime.listenerProcessBindings = {};
    if (runtime._nativeServiceWorkerRegister && window.navigator && window.navigator.serviceWorker) {
      window.navigator.serviceWorker.register = runtime._nativeServiceWorkerRegister;
    }
    runtime._nativeServiceWorkerRegister = null;
    if (runtime._nativeWorkerConstructor && window) {
      window.Worker = runtime._nativeWorkerConstructor;
    }
    runtime._nativeWorkerConstructor = null;
    runtime.hookStatus = {
      iframe: { hookable: false, reason: "disposed", hooked: false, hookedCount: 0, observed: false },
      serviceWorker: { hookable: false, reason: "disposed", hooked: false },
    };
    runtime.taskProcessIdByIdentity = {};
    runtime.reusablePidPool = [];
    runtime.processes = [];
    runtime.taskProcessCounter = 0;
    window.protectedGlobals.__processObjectsByPid = {};
    window.protectedGlobals.__taskProcessIdByIdentity = {};
    runtime.listeners = new Set();
    window.protectedGlobals.__reusablePidPool = [];
    window.protectedGlobals.__processes = [];
    window.protectedGlobals.__processRegistry = {};
    window.protectedGlobals.__taskProcessCounter = 0;
    window.protectedGlobals.__processHookStatus = getProcessHookStatus();
  }

  function registerDynamicProcess(appId, processName, metadata) {
    var registry = runtime.dynamicProcesses && typeof runtime.dynamicProcesses === "object"
      ? runtime.dynamicProcesses
      : {};
    if (!registry[appId]) {
      registry[appId] = {};
    }
    var meta = metadata && typeof metadata === "object" ? Object.assign({}, metadata) : {};
    var pidValue = normalizeProcessPid(getFirstDefinedValue(meta.pid, meta.processId));
    if (typeof pidValue !== "number" || Number.isNaN(pidValue)) {
      pidValue = allocateProcessId("dynamic::" + String(appId) + "::" + String(processName), null);
    }
    meta.pid = pidValue;
    meta.processId = pidValue;
    meta.registered = Number(meta.registered || Date.now());
    registry[appId][processName] = meta;
    runtime.dynamicProcesses = registry;
    window.protectedGlobals.__dynamicProcesses = registry;
    return registry[appId][processName];
  }

  function unregisterDynamicProcess(appId, processName) {
    var registry = runtime.dynamicProcesses && typeof runtime.dynamicProcesses === "object"
      ? runtime.dynamicProcesses
      : {};
    if (registry[appId] && registry[appId][processName]) {
      var existingMeta = registry[appId][processName] && typeof registry[appId][processName] === "object"
        ? registry[appId][processName]
        : {};
      var existingPid = normalizeProcessPid(
        getFirstDefinedValue(existingMeta.pid, existingMeta.processId),
      );
      delete registry[appId][processName];
      if (!Object.keys(registry[appId]).length) {
        delete registry[appId];
      }
      if (typeof existingPid === "number" && !Number.isNaN(existingPid)) {
        releaseProcessId(existingPid);
      }
      runtime.dynamicProcesses = registry;
      window.protectedGlobals.__dynamicProcesses = registry;
      return true;
    }
    return false;
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

      var appId = String(processObject.appId || "global");
      var status = String(processObject.status || "unknown");
      var title = String(processObject.title || processObject.label || appId + " process");
      var label = String(processObject.label || title);
      var updatedAt = Number(getFirstDefinedValue(processObject.updatedAt, processObject.createdAt, processObject.created, Date.now()));

      flat.push({
        pid: pidValue,
        processId: pidValue,
        appId: appId,
        appInstanceId: getFirstDefinedValue(processObject.options && processObject.options.appInstanceId, processObject.options && processObject.options.goldenbodyId, null),
        goldenbodyId: getFirstDefinedValue(processObject.options && processObject.options.goldenbodyId, null),
        label: label,
        title: title,
        appLabel: String(processObject.options && processObject.options.appLabel || appId),
        sourceType: String(processObject.sourceType || processObject.type || "process"),
        status: status,
        functionname: String(processObject.options && processObject.options.entry || ""),
        globalVar: String(processObject.options && processObject.options.globalVar || ""),
        processKind: String(processObject.processKind || processObject.type || "process"),
        type: String(processObject.type || processObject.processKind || "process"),
        persistent: !!processObject.persistent,
        hasWindow: !!processObject.hasWindow,
        windowIds: normalizeWindowIds(processObject.windowIds),
        parentPid: getFirstDefinedValue(processObject.parentPid, null),
        children: uniqueNumberList(processObject.children),
        entryOptions: uniqueStringList(processObject.options && processObject.options.entryOptions),
        updatedAt: updatedAt,
        rowKey: [appId, String(pidValue), String(i)].join("::"),
      });

      if (!registry[appId]) {
        registry[appId] = {
          appId: appId,
          label: String(processObject.options && processObject.options.appLabel || appId),
          updatedAt: updatedAt,
          entries: [],
        };
      }

      registry[appId].entries.push({
        appId: appId,
        label: label,
        entry: String(processObject.options && processObject.options.entry || ""),
        globalVar: String(processObject.options && processObject.options.globalVar || ""),
        sourceType: String(processObject.sourceType || processObject.type || "process"),
        instanceCount: 1,
        instances: [title],
        instanceRecords: [{
          processId: pidValue,
          pid: pidValue,
          appInstanceId: getFirstDefinedValue(processObject.options && processObject.options.appInstanceId, null),
          goldenbodyId: getFirstDefinedValue(processObject.options && processObject.options.goldenbodyId, null),
          title: title,
          label: label,
          sourceIndex: i,
          identityKey: [appId, String(pidValue), "process"].join("::"),
        }],
        status: status,
        updatedAt: updatedAt,
        entryOptions: uniqueStringList(processObject.options && processObject.options.entryOptions),
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
        idle: flat.filter(function (row) { return String(row.status || "") === "idle"; }).length,
        unknown: flat.filter(function (row) { return String(row.status || "") !== "running" && String(row.status || "") !== "idle"; }).length,
      },
      updatedAt: Date.now(),
    };

    var listeners = runtime.listeners;
    if (listeners && listeners.size) {
      listeners.forEach(function (fn) {
        try {
          fn(safeClone(window.protectedGlobals.__taskManagerSnapshot));
        } catch (e) {}
      });
    }
    return window.protectedGlobals.__taskManagerSnapshot;
  }

  function getTaskManagerSnapshot() {
    buildTaskManagerState();
    return safeClone(window.protectedGlobals.__taskManagerSnapshot);
  }

  function registerAppLaunch(appMeta, extraMeta) {
    var record = buildAppLaunchRecord(appMeta, extraMeta);
    buildTaskManagerState();
    return record;
  }

  function start(meta) {
    return registerManualProcess(meta);
  }

  function register(meta) {
    return registerManualProcess(meta);
  }


  function list() {
    var snapshot = getTaskManagerSnapshot();
    return Array.isArray(snapshot.flat) ? snapshot.flat.slice() : [];
  }

  function watch(fn) {
    if (typeof fn !== "function") return function () {};
    runtime.listeners.add(fn);
    return function () {
      runtime.listeners.delete(fn);
    };
  }

  runtime.start = start;
  runtime.register = register;
  runtime.list = list;
  runtime.snapshot = getTaskManagerSnapshot;
  runtime.watch = watch;
  runtime.createProcess = createProcess;
  runtime.getProcess = getProcess;
  runtime.getProcessesByApp = getProcessesByApp;
  runtime.killProcess = killProcess;
  runtime.suspendProcess = suspendProcess;
  runtime.resumeProcess = resumeProcess;
  runtime.registerAppLaunch = registerAppLaunch;
  runtime.registerDynamicProcess = registerDynamicProcess;
  runtime.unregisterDynamicProcess = unregisterDynamicProcess;
  runtime.terminate = killProcess;
  runtime.disposeAll = disposeAll;
  runtime.buildTaskManagerState = buildTaskManagerState;
  runtime.getTaskManagerSnapshot = getTaskManagerSnapshot;
  runtime.getProcessHookStatus = getProcessHookStatus;
  runtime.getServiceWorkerHookability = getServiceWorkerHookability;
  runtime.__loaded = true;

  window.protectedGlobals.__processRuntime = runtime;
  window.protectedGlobals.FlowawayProcess = runtime;
  if (!window.protectedGlobals.process || typeof window.protectedGlobals.process !== "object") {
    window.protectedGlobals.process = runtime;
  }

  window.protectedGlobals.registerDynamicProcess = registerDynamicProcess;
  window.protectedGlobals.unregisterDynamicProcess = unregisterDynamicProcess;
  window.protectedGlobals.createProcess = createProcess;
  window.protectedGlobals.getProcess = getProcess;
  window.protectedGlobals.getProcessesByApp = getProcessesByApp;
  window.protectedGlobals.killProcess = killProcess;
  window.protectedGlobals.suspendProcess = suspendProcess;
  window.protectedGlobals.resumeProcess = resumeProcess;
  window.protectedGlobals.getTaskManagerSnapshot = getTaskManagerSnapshot;
  window.protectedGlobals.buildTaskManagerState = buildTaskManagerState;
  window.protectedGlobals.getProcessHookStatus = getProcessHookStatus;
  window.protectedGlobals.getServiceWorkerHookability = getServiceWorkerHookability;
  installProcessHooks();
  buildTaskManagerState();
})();
