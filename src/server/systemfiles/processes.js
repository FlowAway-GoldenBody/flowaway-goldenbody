(function () {
  if (window.FlowawayProcess && window.FlowawayProcess.__loaded) {
    return;
  }

  var runtime = window.__processRuntime && typeof window.__processRuntime === "object"
    ? window.__processRuntime
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
    : (window.__processObjectsByPid && typeof window.__processObjectsByPid === "object" ? window.__processObjectsByPid : {});
  runtime.processes = Array.isArray(runtime.processes) ? runtime.processes : [];
  runtime.processRegistry = runtime.processRegistry && typeof runtime.processRegistry === "object"
    ? runtime.processRegistry
    : {};
  runtime.taskProcessCounter = Number(runtime.taskProcessCounter || window.__taskProcessCounter || 0);
  runtime.reusablePidPool = Array.isArray(runtime.reusablePidPool)
    ? runtime.reusablePidPool
    : (Array.isArray(window.__reusablePidPool) ? window.__reusablePidPool : []);
  runtime.taskProcessIdByIdentity = runtime.taskProcessIdByIdentity && typeof runtime.taskProcessIdByIdentity === "object"
    ? runtime.taskProcessIdByIdentity
    : (window.__taskProcessIdByIdentity && typeof window.__taskProcessIdByIdentity === "object" ? window.__taskProcessIdByIdentity : {});
  runtime.taskProcessObjectIdentity = runtime.taskProcessObjectIdentity instanceof WeakMap
    ? runtime.taskProcessObjectIdentity
    : (window.__taskProcessObjectIdentity instanceof WeakMap ? window.__taskProcessObjectIdentity : new WeakMap());
  runtime.taskProcessObjectIdentityCounter = Number(
    runtime.taskProcessObjectIdentityCounter || window.__taskProcessObjectIdentityCounter || 0,
  );
  runtime.processTrackerState = runtime.processTrackerState && typeof runtime.processTrackerState === "object"
    ? runtime.processTrackerState
    : {};
  runtime.timerProcessBindings = runtime.timerProcessBindings && typeof runtime.timerProcessBindings === "object"
    ? runtime.timerProcessBindings
    : {};
  runtime.rafProcessBindings = runtime.rafProcessBindings && typeof runtime.rafProcessBindings === "object"
    ? runtime.rafProcessBindings
    : {};
  runtime.observerProcessBindings = runtime.observerProcessBindings && typeof runtime.observerProcessBindings === "object"
    ? runtime.observerProcessBindings
    : {};
  runtime.timerHandleIdentity = runtime.timerHandleIdentity instanceof WeakMap
    ? runtime.timerHandleIdentity
    : new WeakMap();
  runtime.rafHandleIdentity = runtime.rafHandleIdentity instanceof WeakMap
    ? runtime.rafHandleIdentity
    : new WeakMap();
  runtime.observerHandleIdentity = runtime.observerHandleIdentity instanceof WeakMap
    ? runtime.observerHandleIdentity
    : new WeakMap();
  runtime.timerHandleCounter = Number(runtime.timerHandleCounter || 0);
  runtime.rafHandleCounter = Number(runtime.rafHandleCounter || 0);
  runtime.observerHandleCounter = Number(runtime.observerHandleCounter || 0);
  runtime.executionStack = Array.isArray(runtime.executionStack) ? runtime.executionStack : [];

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
    var current = Number(runtime.taskProcessCounter || window.__taskProcessCounter || 0);
    if (!Number.isFinite(current) || current < 0) current = 0;
    var maxKnown = getMaxKnownProcessPid();
    runtime.taskProcessCounter = Math.max(current, maxKnown);
    window.__taskProcessCounter = runtime.taskProcessCounter;
  }

  seedProcessCounterFromKnownPids();

  function getGoldenbodyIdFromInstance(instance) {
    if (!instance || typeof instance !== "object") return null;

    var direct = getFirstDefinedValue(
      instance.goldenbodyId,
      instance._goldenbodyId,
      instance.goldenbodyid,
      instance._goldenbodyid,
    );
    if (direct || direct === 0) return direct;

    var root = instance.rootElement;
    if (root && typeof root === "object") {
      var rootId = getFirstDefinedValue(
        root.goldenbodyId,
        root._goldenbodyId,
        root.dataset && root.dataset.goldenbodyId,
        root.dataset && root.dataset.goldenbodyid,
      );
      if (rootId || rootId === 0) return rootId;
    }

    return null;
  }

  function getObjectIdentityToken(instance) {
    if (!instance || typeof instance !== "object") return "";
    var wm = runtime.taskProcessObjectIdentity;
    if (!(wm instanceof WeakMap)) {
      wm = new WeakMap();
      runtime.taskProcessObjectIdentity = wm;
    }

    if (!wm.has(instance)) {
      runtime.taskProcessObjectIdentityCounter = Number(runtime.taskProcessObjectIdentityCounter || 0) + 1;
      wm.set(instance, "obj-" + String(runtime.taskProcessObjectIdentityCounter));
    }

    return String(wm.get(instance) || "");
  }

  function getInstanceIdentityKey(appId, instance, index) {
    var appPart = String(appId || "unknown-app");
    if (
      instance === null ||
      typeof instance === "undefined" ||
      typeof instance === "string" ||
      typeof instance === "number" ||
      typeof instance === "boolean" ||
      typeof instance === "bigint"
    ) {
      return appPart + "::primitive::" + String(instance) + "::" + String(index);
    }

    if (typeof instance === "object") {
      var goldenbodyId = getGoldenbodyIdFromInstance(instance);
      if (goldenbodyId || goldenbodyId === 0) {
        return appPart + "::goldenbody::" + String(goldenbodyId);
      }

      var appScoped = getFirstDefinedValue(
        instance.appInstanceId,
        instance.instanceId,
        instance.id,
        instance.name,
      );
      if (appScoped || appScoped === 0) {
        return appPart + "::appInstance::" + String(appScoped) + "::" + String(index);
      }

      var token = getObjectIdentityToken(instance);
      if (token) return appPart + "::object::" + token;
    }

    return appPart + "::index::" + String(index);
  }

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
        window.__taskProcessCounter = runtime.taskProcessCounter;
        window.__taskProcessIdByIdentity = runtime.taskProcessIdByIdentity;
        window.__reusablePidPool = reusablePool;
        if (seenIdentities && typeof seenIdentities === "object") {
          seenIdentities[identityKey] = true;
        }
        return reusedPid;
      }
    }

    var next = Number(runtime.taskProcessCounter || window.__taskProcessCounter || 0);
    if (!Number.isFinite(next) || next < 0) next = 0;

    do {
      next += 1;
    } while (known[String(next)]);

    runtime.taskProcessCounter = next;
    runtime.taskProcessIdByIdentity[identityKey] = next;
    window.__taskProcessCounter = runtime.taskProcessCounter;
    window.__taskProcessIdByIdentity = runtime.taskProcessIdByIdentity;
    window.__reusablePidPool = reusablePool;

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

    window.__taskProcessIdByIdentity = runtime.taskProcessIdByIdentity;
    window.__reusablePidPool = runtime.reusablePidPool;
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

  function getInternalSetTimeout() {
    return typeof window.__flowawayProcessNativeSetTimeout === "function"
      ? window.__flowawayProcessNativeSetTimeout
      : window.setTimeout;
  }

  function getInternalClearTimeout() {
    return typeof window.__flowawayProcessNativeClearTimeout === "function"
      ? window.__flowawayProcessNativeClearTimeout
      : window.clearTimeout;
  }

  function getInternalSetInterval() {
    return typeof window.__flowawayProcessNativeSetInterval === "function"
      ? window.__flowawayProcessNativeSetInterval
      : window.setInterval;
  }

  function getInternalClearInterval() {
    return typeof window.__flowawayProcessNativeClearInterval === "function"
      ? window.__flowawayProcessNativeClearInterval
      : window.clearInterval;
  }

  function getCurrentExecutingProcessPid() {
    var stack = Array.isArray(runtime.executionStack) ? runtime.executionStack : [];
    if (!stack.length) return null;
    var pid = normalizeProcessPid(stack[stack.length - 1]);
    return typeof pid === "number" && !Number.isNaN(pid) && pid > 0 ? pid : null;
  }

  function withExecutingProcess(pidValue, fn, thisArg, argsArray) {
    if (typeof fn !== "function") return;
    var pid = normalizeProcessPid(pidValue);
    var shouldPush = typeof pid === "number" && !Number.isNaN(pid) && pid > 0;
    if (!Array.isArray(runtime.executionStack)) runtime.executionStack = [];
    if (shouldPush) runtime.executionStack.push(pid);
    try {
      return fn.apply(thisArg, argsArray || []);
    } finally {
      if (shouldPush) runtime.executionStack.pop();
    }
  }

  function getClosestAppRootFromNode(node) {
    if (!node || typeof node !== "object") return null;
    if (typeof node.closest === "function") {
      try {
        var closest = node.closest(".app-root");
        if (closest) return closest;
      } catch (e) {}
    }
    var cur = node;
    while (cur && typeof cur === "object") {
      if (cur.classList && typeof cur.classList.contains === "function" && cur.classList.contains("app-root")) {
        return cur;
      }
      cur = cur.parentElement || cur.parentNode || null;
    }
    return null;
  }

  function getKnownAppIds() {
    var seen = {};
    var out = [];

    var apps = Array.isArray(window.apps) ? window.apps : [];
    for (var i = 0; i < apps.length; i++) {
      var app = apps[i] && typeof apps[i] === "object" ? apps[i] : {};
      var ids = [app.id, app.functionname, app.label, app.path];
      for (var j = 0; j < ids.length; j++) {
        var id = String(ids[j] || "").trim();
        if (!id || seen[id]) continue;
        seen[id] = true;
        out.push(id);
      }
    }

    var store = ensureProcessObjectsStore();
    var pids = Object.keys(store);
    for (var p = 0; p < pids.length; p++) {
      var proc = store[pids[p]];
      if (!proc || typeof proc !== "object") continue;
      var appId = String(proc.appId || "").trim();
      if (!appId || seen[appId]) continue;
      seen[appId] = true;
      out.push(appId);
    }

    return out;
  }

  function normalizeAppIdCandidate(rawAppId) {
    var appId = String(rawAppId || "").trim();
    if (!appId) return appId;

    var knownAppIds = getKnownAppIds();
    if (knownAppIds.indexOf(appId) !== -1) return appId;

    var best = "";
    for (var i = 0; i < knownAppIds.length; i++) {
      var candidate = String(knownAppIds[i] || "").trim();
      if (!candidate) continue;
      if (appId.indexOf(candidate) === 0 || candidate.indexOf(appId) === 0) {
        if (candidate.length > best.length) {
          best = candidate;
        }
      }
    }

    return best || appId;
  }

  function resolveMainProcessPidByOrigin(appId, appInstanceId, appRoot) {
    var normalizedAppId = normalizeAppIdCandidate(appId);
    var normalizedInstance = getFirstDefinedValue(
      appInstanceId,
      appRoot && appRoot.dataset && appRoot.dataset.appInstanceId,
      appRoot && appRoot.dataset && appRoot.dataset.goldenbodyId,
      appRoot && typeof appRoot.getAttribute === "function" ? appRoot.getAttribute("data-app-instance-id") : null,
      appRoot && typeof appRoot.getAttribute === "function" ? appRoot.getAttribute("data-goldenbody-id") : null,
      null,
    );
    var instanceKey = normalizedInstance === null || typeof normalizedInstance === "undefined"
      ? ""
      : String(normalizedInstance);
    var store = ensureProcessObjectsStore();
    var pids = Object.keys(store);
    var fallbackPid = null;

    for (var i = 0; i < pids.length; i++) {
      var candidate = getCanonicalProcessByPid(pids[i]);
      if (!candidate) continue;
      if (candidate.status === "terminated") continue;

      var candidateAppId = String(candidate.appId || "");
      var appMatches = false;
      if (normalizedAppId) {
        appMatches =
          candidateAppId === normalizedAppId ||
          String(normalizedAppId).indexOf(candidateAppId) === 0 ||
          String(candidateAppId).indexOf(normalizedAppId) === 0;
      } else {
        appMatches = !!candidate.hasWindow || candidate.type === "app" || candidate.type === "launch";
      }
      if (!appMatches) continue;

      var candidateInstance = getFirstDefinedValue(
        candidate.options && candidate.options.appInstanceId,
        candidate.options && candidate.options.goldenbodyId,
        candidate.execution && candidate.execution.origin && candidate.execution.origin.appInstanceId,
        Array.isArray(candidate.windowIds) && candidate.windowIds.length ? candidate.windowIds[0] : null,
        null,
      );
      var candidateInstanceKey = candidateInstance === null || typeof candidateInstance === "undefined"
        ? ""
        : String(candidateInstance);

      var isMainLike = !!candidate.hasWindow || candidate.type === "app" || candidate.type === "launch";
      if (!isMainLike) continue;

      if (instanceKey && candidateInstanceKey && instanceKey === candidateInstanceKey) {
        return candidate.pid;
      }

      if (!instanceKey && candidate.status === "running") {
        return candidate.pid;
      }

      if (fallbackPid === null) {
        fallbackPid = candidate.pid;
      }
    }

    return fallbackPid;
  }

  function detectProcessOrigin(context) {
    var ctx = context && typeof context === "object" ? context : {};
    var launchContext = window.__flowawayLaunchContext && typeof window.__flowawayLaunchContext === "object"
      ? window.__flowawayLaunchContext
      : {};
    var parentPid = getCurrentExecutingProcessPid();
    var parentProc = parentPid ? getCanonicalProcessByPid(parentPid) : null;

    var appId = getFirstDefinedValue(
      ctx.appId,
      launchContext.appId,
      parentProc && parentProc.appId,
      window.atTop,
      window._flowawayTopAppId,
      "system",
    );
    var appInstanceId = getFirstDefinedValue(
      ctx.appInstanceId,
      launchContext.appInstanceId,
      parentProc && parentProc.options && parentProc.options.appInstanceId,
      null,
    );

    var candidateNode =
      ctx.node ||
      ctx.target ||
      (typeof document !== "undefined" ? document.activeElement : null);
    var appRoot = getClosestAppRootFromNode(candidateNode);
    if (appRoot && typeof appRoot === "object") {
      var rootAppId = getFirstDefinedValue(
        appRoot.dataset && appRoot.dataset.appId,
        typeof appRoot.getAttribute === "function" ? appRoot.getAttribute("data-app-id") : null,
        null,
      );
      if (rootAppId) appId = rootAppId;

      var rootInstanceId = getFirstDefinedValue(
        appRoot.dataset && appRoot.dataset.appInstanceId,
        appRoot.dataset && appRoot.dataset.goldenbodyId,
        typeof appRoot.getAttribute === "function" ? appRoot.getAttribute("data-app-instance-id") : null,
        typeof appRoot.getAttribute === "function" ? appRoot.getAttribute("data-goldenbody-id") : null,
        null,
      );
      if (rootInstanceId || rootInstanceId === 0) appInstanceId = rootInstanceId;
    }

    if ((typeof parentPid !== "number" || Number.isNaN(parentPid) || parentPid <= 0) && (appId || appInstanceId || appRoot)) {
      var resolvedParentPid = resolveMainProcessPidByOrigin(appId, appInstanceId, appRoot);
      if (typeof resolvedParentPid === "number" && !Number.isNaN(resolvedParentPid) && resolvedParentPid > 0) {
        parentPid = resolvedParentPid;
        parentProc = getCanonicalProcessByPid(parentPid);
      }
    }

    appId = normalizeAppIdCandidate(appId);

    var listenerType = String(
      getFirstDefinedValue(
        ctx.listenerType,
        parentProc && parentProc.execution && parentProc.execution.origin && parentProc.execution.origin.listenerType,
        "api",
      ),
    );

    var stackTrace = "";
    try {
      var err = new Error();
      stackTrace = String(err && err.stack || "");
    } catch (e) {}

    return {
      parentPid: parentPid,
      origin: {
        appId: String(appId || "system"),
        appInstanceId: appInstanceId,
        listenerType: listenerType,
        stackTrace: stackTrace,
      },
    };
  }

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

  function buildAppEntryOptions(appMeta) {
    var app = appMeta && typeof appMeta === "object" ? appMeta : {};
    return uniqueStringList([
      app.functionname,
      app.globalvarobjectstring,
      app.id,
      app.path,
      app.label,
      app.icon,
      app.cmf,
    ]);
  }

  function matchesIdentifierFromOptions(options, identifier) {
    var id = String(identifier || "").trim().toLowerCase();
    if (!id) return false;
    var candidates = uniqueStringList(options).map(function (v) {
      return String(v || "").trim().toLowerCase();
    });
    return candidates.indexOf(id) !== -1;
  }

  function hasOpenWindowForAppIdentity(appIdentity) {
    var identity = String(appIdentity || "").trim();
    if (!identity) return false;
    try {
      var roots = Array.from(document.querySelectorAll(".app-root"));
      for (var i = 0; i < roots.length; i++) {
        var root = roots[i];
        if (!root || root.isConnected === false) continue;
        var dataAppId =
          (root.dataset && root.dataset.appId) ||
          (typeof root.getAttribute === "function" ? root.getAttribute("data-app-id") : "") ||
          "";
        if (matchesIdentifierFromOptions([dataAppId], identity)) return true;
        if (root.classList && root.classList.contains(identity)) return true;
      }
    } catch (e) {}
    return false;
  }

  function isLikelyConnectedAppInstance(instance) {
    if (!instance || typeof instance !== "object") return true;
    var root = instance.rootElement;
    if (!root || typeof root !== "object") return true;
    if (typeof root.isConnected === "boolean") return !!root.isConnected;
    return true;
  }

  function normalizeProcessEntryFromApp(appMeta) {
    var app = appMeta && typeof appMeta === "object" ? appMeta : {};
    var appIdRaw = app.id || app.functionname || app.label || app.path;
    var appId = String(appIdRaw || "unknown-app");
    var label = String(app.label || app.functionname || appId);
    var functionname = app.functionname || app.path || app.id || "";
    var globalVar = typeof app.globalvarobjectstring === "string" ? app.globalvarobjectstring : "";
    var updatedAt = Date.now();
    var sourceType = "missing";
    var instances = [];
    var status = "unknown";
    var allAppArrayKeys = [];
    var entryOptions = buildAppEntryOptions(app);

    if (typeof app.allapparraystring === "string") {
      var singleKey = String(app.allapparraystring || "").trim();
      if (singleKey) allAppArrayKeys.push(singleKey);
    } else if (Array.isArray(app.allapparraystring)) {
      for (var keyIndex = 0; keyIndex < app.allapparraystring.length; keyIndex++) {
        var rawKey = app.allapparraystring[keyIndex];
        if (typeof rawKey !== "string") continue;
        var normalizedKey = String(rawKey || "").trim();
        if (!normalizedKey) continue;
        if (allAppArrayKeys.indexOf(normalizedKey) === -1) {
          allAppArrayKeys.push(normalizedKey);
        }
      }
    }

    try {
      if (globalVar && window[globalVar] && allAppArrayKeys.length > 0) {
        var hostObject = window[globalVar];
        var matchedArrayKey = "";
        for (var arrayKeyIndex = 0; arrayKeyIndex < allAppArrayKeys.length; arrayKeyIndex++) {
          var candidateKey = allAppArrayKeys[arrayKeyIndex];
          if (Array.isArray(hostObject[candidateKey])) {
            matchedArrayKey = candidateKey;
            break;
          }
        }
        if (matchedArrayKey) {
          sourceType = "array";
          instances = hostObject[matchedArrayKey]
            .slice()
            .filter(function (instance) {
              return isLikelyConnectedAppInstance(instance);
            });
          try {
            hostObject[matchedArrayKey] = instances;
          } catch (e) {}
          status = instances.length > 0 ? "running" : "idle";
        }
      } else if (globalVar && typeof window[globalVar] === "function") {
        sourceType = "function";
        status = "unknown";
      } else if (globalVar && window[globalVar] && typeof window[globalVar] === "object") {
        sourceType = "object";
        instances = Object.keys(window[globalVar]);
        status = instances.length > 0 ? "running" : "idle";
      } else if (typeof app.functionname === "string" && typeof window[app.functionname] === "function") {
        sourceType = "function";
        status = "unknown";
        globalVar = app.functionname;
      }
    } catch (e) {
      sourceType = "missing";
      instances = [];
      status = "unknown";
    }

    return {
      appId: appId,
      label: label,
      functionname: functionname,
      globalVar: globalVar,
      sourceType: sourceType,
      instanceCount: Array.isArray(instances) ? instances.length : 0,
      instances: Array.isArray(instances) ? instances : [],
      status: status,
      updatedAt: updatedAt,
      entryOptions: entryOptions,
    };
  }

  function buildNormalizedInstanceRecords(appId, appLabel, instances, seenIdentities) {
    var list = Array.isArray(instances) ? instances : [];
    var records = [];

    for (var i = 0; i < list.length; i++) {
      var raw = list[i];
      var goldenbodyId = getGoldenbodyIdFromInstance(raw);
      var identityKey = getInstanceIdentityKey(appId, raw, i);
      var processId = allocateProcessId(identityKey, seenIdentities);
      var appInstanceId = i + 1;
      var title = "";

      if (
        raw === null ||
        typeof raw === "undefined" ||
        typeof raw === "string" ||
        typeof raw === "number" ||
        typeof raw === "boolean" ||
        typeof raw === "bigint"
      ) {
        title = String(raw);
        appInstanceId = i + 1;
      } else if (typeof raw === "object") {
        appInstanceId = getFirstDefinedValue(
          raw.appInstanceId,
          raw.instanceId,
          raw.id,
          goldenbodyId || goldenbodyId === 0 ? goldenbodyId : i + 1,
        );
        title = String(
          raw.title ||
            raw.label ||
            raw.name ||
            raw.processName ||
            (raw.rootElement && raw.rootElement.dataset && raw.rootElement.dataset.appId) ||
            appLabel ||
            appId ||
            "Instance",
        );
      }

      records.push({
        processId: processId,
        appInstanceId: appInstanceId,
        goldenbodyId: goldenbodyId,
        title: title || String(appLabel || appId || "Instance") + " #" + String(i + 1),
        label: title || String(appLabel || appId || "Instance") + " #" + String(i + 1),
        sourceIndex: i,
        identityKey: identityKey,
      });
    }

    return records;
  }

  function cleanupDeadProcessIds(seenIdentities) {
    var next = {};
    var keys = Object.keys(runtime.taskProcessIdByIdentity);
    for (var i = 0; i < keys.length; i++) {
      var key = keys[i];
      if (seenIdentities && seenIdentities[key]) {
        next[key] = runtime.taskProcessIdByIdentity[key];
      } else {
        releaseProcessId(runtime.taskProcessIdByIdentity[key]);
      }
    }
    runtime.taskProcessIdByIdentity = next;
    window.__taskProcessIdByIdentity = next;
  }

  function ensureProcessObjectsStore() {
    if (!runtime.processObjectsByPid || typeof runtime.processObjectsByPid !== "object") {
      runtime.processObjectsByPid = {};
    }
    window.__processObjectsByPid = runtime.processObjectsByPid;
    return runtime.processObjectsByPid;
  }

  function syncProcessObjectsWithRecords(processRecords) {
    var records = Array.isArray(processRecords) ? processRecords : [];
    var store = ensureProcessObjectsStore();
    var active = {};

    for (var i = 0; i < records.length; i++) {
      var record = records[i] && typeof records[i] === "object" ? records[i] : {};
      var pidValue = normalizeProcessPid(getFirstDefinedValue(record.pid, record.processId));
      if (pidValue === null || typeof pidValue === "undefined") continue;
      var pidKey = String(pidValue);
      active[pidKey] = true;

      var processObject = store[pidKey] && typeof store[pidKey] === "object" ? store[pidKey] : {};
      var canonical = ensureCanonicalProcessShape(
        {
          pid: pidValue,
          type: getFirstDefinedValue(record.type, record.processKind, record.sourceType, "process"),
          sourceType: record.sourceType,
          title: getFirstDefinedValue(record.title, record.label, record.appId, "Process"),
          label: getFirstDefinedValue(record.label, record.title, record.appId, "Process"),
          appId: record.appId,
          status: record.status,
          persistent: getFirstDefinedValue(record.persistent, false),
          hasWindow: getFirstDefinedValue(record.hasWindow, !!record.goldenbodyId),
          windowIds: getFirstDefinedValue(record.windowIds, record.goldenbodyId || record.goldenbodyId === 0 ? [String(record.goldenbodyId)] : []),
          created: getFirstDefinedValue(record.created, record.updatedAt, Date.now()),
          parentPid: getFirstDefinedValue(record.parentPid, processObject.parentPid, null),
          children: getFirstDefinedValue(record.children, processObject.children, []),
        },
        {
          existing: processObject,
          pid: pidValue,
          identityKey: "record::" + String(pidValue) + "::" + String(record.appId || "global"),
        },
      );

      canonical.options =
        canonical.options && typeof canonical.options === "object"
          ? canonical.options
          : {};
      canonical.options.appId = record.appId;
      canonical.options.appInstanceId = record.appInstanceId;
      canonical.options.goldenbodyId = record.goldenbodyId;
      canonical.options.sourceType = record.sourceType;
      canonical.options.status = record.status;
      canonical.options.updatedAt = record.updatedAt;
      canonical.options.label = record.label;
      canonical.options.appLabel = record.appLabel;
      canonical.options.appEntry = record.appEntry;
      canonical.options.persistent = canonical.persistent;
      canonical.options.type = canonical.type;
      canonical.kind = canonical.type;
      store[pidKey] = canonical;
    }

    var existingPids = Object.keys(store);
    for (var j = 0; j < existingPids.length; j++) {
      var existingPid = existingPids[j];
      if (active[existingPid]) continue;
      delete store[existingPid];
    }

    runtime.processObjectsByPid = store;
    window.__processObjectsByPid = store;
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
    var appId = String(input.appId || (window.__flowawayLaunchContext && window.__flowawayLaunchContext.appId) || "global");
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
    scheduleProcessTrackerRebuild("manual-start");
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
    var apps = Array.isArray(window.apps) ? window.apps : [];
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

    if (terminated) {
      releaseProcessId(pidValue);
      scheduleProcessTrackerRebuild("terminate");
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
    window.__processes = runtime.processes;

    var snapshot = window.__taskManagerSnapshot && typeof window.__taskManagerSnapshot === "object"
      ? window.__taskManagerSnapshot
      : null;
    if (snapshot && Array.isArray(snapshot.flat)) {
      snapshot.flat = snapshot.flat.filter(function (row) {
        if (!row || typeof row !== "object") return false;
        var rowPid = normalizeProcessPid(getFirstDefinedValue(row.pid, row.processId));
        return rowPid !== pid;
      });
      window.__taskManagerSnapshot = snapshot;
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

    var terminated = terminateProcess(pidValue, reason || "kill");
    if (proc && (proc.parentPid || proc.parentPid === 0)) {
      removeChildPidFromParent(proc.parentPid, pidValue);
    }
    removeTrackedBindingsForPid(pidValue);
    delete runtime.processObjectsByPid[String(pidValue)];
    removePidFromGlobalProcessLists(pidValue);

    if (terminated) {
      scheduleProcessTrackerRebuild("kill");
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
      scheduleProcessTrackerRebuild("status:" + status);
    }

    return updated;
  }

  function suspendProcess(pidValue) {
    var pid = normalizeProcessPid(pidValue);
    if (typeof pid !== "number" || Number.isNaN(pid) || pid <= 0) return false;
    var hasStatus = setProcessStatus(pid, "suspended");
    var hasBinding = suspendProcessBindings(pid);
    return hasStatus || hasBinding;
  }

  function resumeProcess(pidValue) {
    var pid = normalizeProcessPid(pidValue);
    if (typeof pid !== "number" || Number.isNaN(pid) || pid <= 0) return false;
    var hasBinding = resumeProcessBindings(pid);
    var hasStatus = setProcessStatus(pid, "running");
    return hasStatus || hasBinding;
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

    scheduleProcessTrackerRebuild("create-process");
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
    runtime.taskProcessIdByIdentity = {};
    runtime.reusablePidPool = [];
    runtime.processes = [];
    runtime.taskProcessCounter = 0;
    runtime.timerProcessBindings = {};
    runtime.rafProcessBindings = {};
    runtime.observerProcessBindings = {};
    runtime.executionStack = [];
    window.__processObjectsByPid = {};
    window.__taskProcessIdByIdentity = {};
    runtime.listeners = new Set();
    window.__reusablePidPool = [];
    window.__processes = [];
    window.__processRegistry = {};
    window.__taskProcessCounter = 0;
    scheduleProcessTrackerRebuild("dispose-all");
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
    window.__dynamicProcesses = registry;
    scheduleProcessTrackerRebuild("register-dynamic");
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
      window.__dynamicProcesses = registry;
      scheduleProcessTrackerRebuild("unregister-dynamic");
      return true;
    }
    return false;
  }

  function ensureProcessTrackerState() {
    runtime.processTrackerState = runtime.processTrackerState && typeof runtime.processTrackerState === "object"
      ? runtime.processTrackerState
      : {};
    var state = runtime.processTrackerState;
    if (!(state.proxyByTarget instanceof WeakMap)) state.proxyByTarget = new WeakMap();
    if (!(state.proxySet instanceof WeakSet)) state.proxySet = new WeakSet();
    state.lastArrayRefs = state.lastArrayRefs && typeof state.lastArrayRefs === "object" ? state.lastArrayRefs : {};
    return state;
  }

  function scheduleProcessTrackerRebuild(reason) {
    var state = ensureProcessTrackerState();
    var internalClearTimeout = getInternalClearTimeout();
    var internalSetTimeout = getInternalSetTimeout();
    if (state.syncTimer) {
      internalClearTimeout(state.syncTimer);
    }
    state.syncTimer = internalSetTimeout(function () {
      try {
        buildTaskManagerState();
      } catch (e) {
        if (window.console && typeof console.warn === "function") {
          console.warn("[FLOWAWAY][processTracker] scheduled rebuild failed", reason || "unknown", e);
        }
      }
    }, 35);
    window._flowaway_handlers = window._flowaway_handlers || {};
    window._flowaway_handlers.processTrackerSyncTimer = state.syncTimer;
  }

  function createTrackedAppInstancesProxy(targetArray, appIdentity) {
    var state = ensureProcessTrackerState();
    var existing = state.proxyByTarget.get(targetArray);
    if (existing) return existing;

    var proxy = new Proxy(targetArray, {
      set: function (target, prop, value, receiver) {
        var previousValue = target[prop];
        var hadProp = Object.prototype.hasOwnProperty.call(target, prop);
        var previousLength = target.length;
        var result = Reflect.set(target, prop, value, receiver);
        if (!result) return result;

        var nextValue = target[prop];
        var nextLength = target.length;
        var valueChanged = previousValue !== nextValue;
        var shapeChanged = !hadProp || previousLength !== nextLength;

        if (valueChanged || shapeChanged) {
          scheduleProcessTrackerRebuild("array-set:" + String(appIdentity || "unknown"));
        }
        return result;
      },
      deleteProperty: function (target, prop) {
        var result = Reflect.deleteProperty(target, prop);
        scheduleProcessTrackerRebuild("array-delete:" + String(appIdentity || "unknown"));
        return result;
      },
      defineProperty: function (target, prop, descriptor) {
        var result = Reflect.defineProperty(target, prop, descriptor);
        scheduleProcessTrackerRebuild("array-define:" + String(appIdentity || "unknown"));
        return result;
      },
    });

    state.proxyByTarget.set(targetArray, proxy);
    state.proxySet.add(proxy);
    return proxy;
  }

  function ensureTrackedAppInstanceArrays() {
    var state = ensureProcessTrackerState();
    var apps = Array.isArray(window.apps) ? window.apps : [];
    var seenKeys = {};
    var changed = false;

    for (var i = 0; i < apps.length; i++) {
      var app = apps[i] && typeof apps[i] === "object" ? apps[i] : {};
      var globalVar = typeof app.globalvarobjectstring === "string" ? app.globalvarobjectstring : "";
      var arrayKeys = [];
      if (typeof app.allapparraystring === "string") {
        var singleArrayKey = String(app.allapparraystring || "").trim();
        if (singleArrayKey) arrayKeys.push(singleArrayKey);
      } else if (Array.isArray(app.allapparraystring)) {
        for (var keyIndex = 0; keyIndex < app.allapparraystring.length; keyIndex++) {
          var keyValue = app.allapparraystring[keyIndex];
          if (typeof keyValue !== "string") continue;
          var normalizedArrayKey = String(keyValue || "").trim();
          if (!normalizedArrayKey) continue;
          if (arrayKeys.indexOf(normalizedArrayKey) === -1) arrayKeys.push(normalizedArrayKey);
        }
      }
      if (!globalVar || arrayKeys.length === 0) continue;

      var host = window[globalVar];
      if (!host || typeof host !== "object") continue;

      for (var arrayKeyIndex = 0; arrayKeyIndex < arrayKeys.length; arrayKeyIndex++) {
        var arrayKey = arrayKeys[arrayKeyIndex];
        var trackingKey =
          String(app.id || app.functionname || app.label || i) +
          "::" +
          globalVar +
          "::" +
          arrayKey;
        seenKeys[trackingKey] = true;

        var currentArray = host[arrayKey];
        if (state.lastArrayRefs[trackingKey] !== currentArray) {
          state.lastArrayRefs[trackingKey] = currentArray;
          changed = true;
        }

        if (!Array.isArray(currentArray)) continue;
        if (state.proxySet.has(currentArray)) continue;

        var proxy = createTrackedAppInstancesProxy(currentArray, trackingKey);
        if (host[arrayKey] !== proxy) {
          try {
            host[arrayKey] = proxy;
            changed = true;
          } catch (e) {}
        }
      }
    }

    var existingTrackingKeys = Object.keys(state.lastArrayRefs);
    for (var j = 0; j < existingTrackingKeys.length; j++) {
      var key = existingTrackingKeys[j];
      if (seenKeys[key]) continue;
      delete state.lastArrayRefs[key];
      changed = true;
    }

    return changed;
  }

  function ensureProcessTrackerRunning() {
    var state = ensureProcessTrackerState();
    var internalSetInterval = getInternalSetInterval();
    var changed = ensureTrackedAppInstanceArrays();
    if (changed) {
      scheduleProcessTrackerRebuild("tracker-start-or-refresh");
    }

    if (!state.fallbackTimer) {
      state.fallbackTimer = internalSetInterval(function () {
        try {
          if (ensureTrackedAppInstanceArrays()) {
            scheduleProcessTrackerRebuild("fallback-array-sync");
          }
        } catch (e) {}
      }, 1200);
      window._flowaway_handlers = window._flowaway_handlers || {};
      window._flowaway_handlers.processTrackerFallbackTimer = state.fallbackTimer;
    }
  }

  function buildProcessRecordsAndSeenIdentities() {
    var entries = [];
    var processRecords = [];
    var seenIdentities = {};
    var apps = Array.isArray(window.apps) ? window.apps : [];
    var dynamicProcs = runtime.dynamicProcesses && typeof runtime.dynamicProcesses === "object" ? runtime.dynamicProcesses : {};
    var launchProcs = runtime.launchRegistry && typeof runtime.launchRegistry === "object" ? runtime.launchRegistry : {};
    var appIdsWithInstanceRecords = {};

    for (var i = 0; i < apps.length; i++) {
      var entry;
      try {
        entry = normalizeProcessEntryFromApp(apps[i]);
      } catch (e) {
        entry = normalizeProcessEntryFromApp({
          id: "unknown-app-" + i,
          label: "Unknown App",
        });
      }

      entry.instanceRecords = buildNormalizedInstanceRecords(
        entry.appId,
        entry.label,
        entry.instances,
        seenIdentities,
      );
      entry.instanceCount = Array.isArray(entry.instanceRecords)
        ? entry.instanceRecords.length
        : Number(entry.instanceCount || 0);
      entries.push(entry);
      if (entry.instanceCount > 0) {
        appIdsWithInstanceRecords[entry.appId] = true;
      }

      for (var r = 0; r < entry.instanceRecords.length; r++) {
        processRecords.push(buildIndividualProcessRecord(entry, entry.instanceRecords[r]));
      }
    }

    for (var appId in launchProcs) {
      if (!Object.prototype.hasOwnProperty.call(launchProcs, appId)) continue;
      if (appIdsWithInstanceRecords[launchProcs[appId].appId]) continue;
      var launch = launchProcs[appId];
      if (!launch) continue;
      processRecords.push({
        pid: launch.pid,
        processId: launch.pid,
        appId: String(launch.appId || appId || "unknown-app"),
        appInstanceId: getFirstDefinedValue(launch.appInstanceId, 1),
        goldenbodyId: getFirstDefinedValue(launch.goldenbodyId, null),
        title: String(launch.label || launch.appId || "App Launch"),
        label: String(launch.label || launch.appId || "App Launch"),
        appLabel: String(launch.label || launch.appId || "unknown-app"),
        appEntry: String(launch.functionname || ""),
        appGlobalVar: String(launch.globalVar || ""),
        appSourceType: "launch",
        appStatus: String(launch.status || "running"),
        sourceType: "launch",
        status: String(launch.status || "running"),
        updatedAt: Number(launch.updatedAt || Date.now()),
        processKind: "launch",
        type: "launch",
        persistent: false,
        hasWindow: true,
        windowIds: [],
        parentPid: null,
        children: [],
        entryOptions: uniqueStringList([
          launch.functionname,
          launch.globalVar,
          launch.appId,
          launch.label,
        ]),
      });
    }

    for (var appKey in dynamicProcs) {
      if (!Object.prototype.hasOwnProperty.call(dynamicProcs, appKey)) continue;
      var procMap = dynamicProcs[appKey];
      var procList = [];
      for (var procName in procMap) {
        if (Object.prototype.hasOwnProperty.call(procMap, procName)) {
          procList.push(procName);
        }
      }
      if (procList.length > 0) {
        var dynamicEntry = {
          appId: appKey,
          label: appKey + " (dynamic)",
          entry: "",
          globalVar: "",
          entryOptions: uniqueStringList([appKey]),
          sourceType: "dynamic",
          instanceCount: procList.length,
          instances: procList,
          status: procList.length > 0 ? "running" : "idle",
          updatedAt: Date.now(),
          processKind: "dynamic",
        };
        dynamicEntry.instanceRecords = [];
        for (var d = 0; d < procList.length; d++) {
          var dynamicName = procList[d];
          var dynamicMeta = procMap[dynamicName] && typeof procMap[dynamicName] === "object"
            ? procMap[dynamicName]
            : {};
          var dynamicPid = normalizeProcessPid(
            getFirstDefinedValue(dynamicMeta.pid, dynamicMeta.processId),
          );
          if (typeof dynamicPid !== "number" || Number.isNaN(dynamicPid)) {
            dynamicPid = allocateProcessId(
              "dynamic::" + String(appKey) + "::" + String(dynamicName),
              null,
            );
            dynamicMeta.pid = dynamicPid;
            dynamicMeta.processId = dynamicPid;
            procMap[dynamicName] = dynamicMeta;
          }
          dynamicEntry.instanceRecords.push({
            processId: dynamicPid,
            pid: dynamicPid,
            appInstanceId: d + 1,
            goldenbodyId: null,
            title: String(dynamicMeta.title || dynamicMeta.label || dynamicName),
            label: String(dynamicMeta.label || dynamicMeta.title || dynamicName),
            persistent: !!getFirstDefinedValue(dynamicMeta.persistent, false),
            hasWindow: !!getFirstDefinedValue(dynamicMeta.hasWindow, false),
            windowIds: normalizeWindowIds(getFirstDefinedValue(dynamicMeta.windowIds, [])),
            parentPid: getFirstDefinedValue(dynamicMeta.parentPid, null),
            children: uniqueNumberList(getFirstDefinedValue(dynamicMeta.children, [])),
            sourceIndex: d,
            identityKey: "dynamic::" + String(appKey) + "::" + String(dynamicName),
          });
        }
        entries.push(dynamicEntry);
        for (var d = 0; d < dynamicEntry.instanceRecords.length; d++) {
          processRecords.push(
            buildIndividualProcessRecord(dynamicEntry, dynamicEntry.instanceRecords[d]),
          );
        }
      }
    }

    for (var manualKey in runtime.manualProcesses) {
      if (!Object.prototype.hasOwnProperty.call(runtime.manualProcesses, manualKey)) continue;
      var manual = runtime.manualProcesses[manualKey];
      if (!manual) continue;
      var manualCanonical = getCanonicalProcessByPid(manual.pid);
      processRecords.push({
        pid: manual.pid,
        processId: manual.pid,
        appId: String(manual.appId || "global"),
        appInstanceId: getFirstDefinedValue(manual.appInstanceId, null),
        goldenbodyId: getFirstDefinedValue(manual.goldenbodyId, null),
        title: String(manual.title || manual.label || manual.name || "Process"),
        label: String(manual.label || manual.title || manual.name || "Process"),
        appLabel: String(manual.appId || "global"),
        appEntry: String(manual.meta && manual.meta.entry || ""),
        appGlobalVar: String(manual.meta && manual.meta.globalVar || ""),
        appSourceType: "manual",
        appStatus: String(manual.status || "running"),
        sourceType: "manual",
        status: String(manual.status || "running"),
        updatedAt: Number(manual.updatedAt || Date.now()),
        processKind: "manual",
        type: String(getFirstDefinedValue(manual.processKind, manualCanonical && manualCanonical.type, "manual")),
        persistent: !!getFirstDefinedValue(manual.meta && manual.meta.persistent, manualCanonical && manualCanonical.persistent, false),
        hasWindow: !!getFirstDefinedValue(manual.meta && manual.meta.hasWindow, manualCanonical && manualCanonical.hasWindow, false),
        windowIds: normalizeWindowIds(getFirstDefinedValue(manual.meta && manual.meta.windowIds, manualCanonical && manualCanonical.windowIds, [])),
        parentPid: getFirstDefinedValue(manual.meta && manual.meta.parentPid, manualCanonical && manualCanonical.parentPid, null),
        children: uniqueNumberList(getFirstDefinedValue(manual.meta && manual.meta.children, manualCanonical && manualCanonical.children, [])),
        execution: buildExecutionShape(
          getFirstDefinedValue(manual.meta && manual.meta.execution, manualCanonical && manualCanonical.execution, {}),
          manualCanonical && manualCanonical.execution,
        ),
        entryOptions: uniqueStringList([
          manual.meta && manual.meta.entry,
          manual.meta && manual.meta.globalVar,
          manual.appId,
          manual.label,
        ]),
      });
    }

    return {
      entries: entries,
      records: processRecords,
      seenIdentities: seenIdentities,
    };
  }

  function getActiveAppIds() {
    var apps = Array.isArray(window.apps) ? window.apps : [];
    var active = {};
    for (var i = 0; i < apps.length; i++) {
      var app = apps[i] && typeof apps[i] === "object" ? apps[i] : {};
      var appId = String(app.id || app.functionname || app.label || app.path || "").trim();
      if (appId) active[appId] = true;
    }
    return active;
  }

  function pruneInactiveLaunchProcesses() {
    var active = getActiveAppIds();
    var keys = Object.keys(runtime.launchRegistry);
    var changed = false;
    for (var i = 0; i < keys.length; i++) {
      var key = keys[i];
      var record = runtime.launchRegistry[key];
      if (!record) continue;
      if (active[record.appId]) continue;
      releaseProcessId(record.pid);
      delete runtime.launchRegistry[key];
      delete runtime.processRegistry[key];
      changed = true;
    }
    return changed;
  }

  function buildTaskManagerSnapshotFromProcessRecords(processRecords, appEntriesContext) {
    var records = Array.isArray(processRecords) ? processRecords : [];
    var grouped = {};
    var flat = [];

    for (var i = 0; i < records.length; i++) {
      var record = records[i] && typeof records[i] === "object" ? records[i] : {};
      var appId = String(record.appId || "unknown-app");
      var pidValue = normalizeProcessPid(getFirstDefinedValue(record.pid, record.processId));
      if (pidValue === null || typeof pidValue === "undefined") continue;

      var status = String(record.status || record.appStatus || "unknown");
      var label = String(record.label || record.title || record.appLabel || appId + " instance");
      var title = String(record.title || label);
      var appLabel = String(record.appLabel || appId);
      var sourceType = String(record.sourceType || record.appSourceType || "unknown");
      var appEntry = String(record.appEntry || "");
      var appGlobalVar = String(record.appGlobalVar || "");
      var entryOptions = uniqueStringList(
        [].concat(
          Array.isArray(record.entryOptions) ? record.entryOptions : [],
          [appEntry, appGlobalVar, appId],
        ),
      );
      var updatedAt = Number(record.updatedAt || Date.now());

      var taskEntry = {
        pid: pidValue,
        processId: pidValue,
        appId: appId,
        appInstanceId: getFirstDefinedValue(record.appInstanceId, i + 1),
        goldenbodyId: getFirstDefinedValue(record.goldenbodyId, null),
        label: label,
        title: title,
        appLabel: appLabel,
        sourceType: sourceType,
        status: status,
        functionname: appEntry,
        globalVar: appGlobalVar,
        processKind: String(record.processKind || "app"),
        type: String(getFirstDefinedValue(record.type, record.processKind, record.sourceType, "app")),
        persistent: !!getFirstDefinedValue(record.persistent, false),
        hasWindow: !!getFirstDefinedValue(record.hasWindow, false),
        windowIds: normalizeWindowIds(getFirstDefinedValue(record.windowIds, [])),
        parentPid: getFirstDefinedValue(record.parentPid, null),
        children: uniqueNumberList(getFirstDefinedValue(record.children, [])),
        entryOptions: entryOptions,
        updatedAt: updatedAt,
        rowKey: [appId, String(pidValue), String(i)].join("::"),
      };

      flat.push(taskEntry);

      if (!grouped[appId]) {
        grouped[appId] = {
          appId: appId,
          label: appLabel,
          updatedAt: updatedAt,
          entries: [],
        };
      }

      var groupEntry = {
        appId: appId,
        label: appLabel,
        entry: appEntry,
        globalVar: appGlobalVar,
        sourceType: sourceType,
        instanceCount: 0,
        instances: [],
        instanceRecords: [],
        status: status,
        updatedAt: updatedAt,
        entryOptions: entryOptions,
      };
      groupEntry.instanceRecords.push({
        processId: pidValue,
        pid: pidValue,
        appInstanceId: getFirstDefinedValue(record.appInstanceId, i + 1),
        goldenbodyId: getFirstDefinedValue(record.goldenbodyId, null),
        title: title,
        label: label,
        sourceIndex: i,
        identityKey: appId + "::pid::" + String(pidValue),
      });
      groupEntry.instances.push(title);
      groupEntry.instanceCount = 1;
      grouped[appId].entries.push(groupEntry);
      grouped[appId].updatedAt = Math.max(grouped[appId].updatedAt, updatedAt);
    }

    var summary = {
      totalEntries: flat.length,
      totalInstances: flat.length,
      running: 0,
      idle: 0,
      unknown: 0,
    };

    for (var s = 0; s < flat.length; s++) {
      var flatStatus = String(flat[s].status || "unknown");
      if (flatStatus === "running") summary.running += 1;
      else if (flatStatus === "idle") summary.idle += 1;
      else summary.unknown += 1;
    }

    return {
      flat: flat,
      registry: grouped,
      summary: summary,
      updatedAt: Date.now(),
    };
  }

  function buildTaskManagerState() {
    ensureProcessTrackerRunning();
    pruneInactiveLaunchProcesses();
    var built = buildProcessRecordsAndSeenIdentities();
    var processRecords = built.records;

    cleanupDeadProcessIds(built.seenIdentities);
    runtime.processes = processRecords;
    window.__processes = processRecords;
    syncProcessObjectsWithRecords(processRecords);

    var snapshot = buildTaskManagerSnapshotFromProcessRecords(processRecords, built.entries);
    runtime.processRegistry = snapshot.registry;
    window.__processRegistry = snapshot.registry;
    window.__taskManagerSnapshot = snapshot;

    var listeners = runtime.listeners;
    if (listeners && listeners.size) {
      listeners.forEach(function (fn) {
        try {
          fn(safeClone(snapshot));
        } catch (e) {}
      });
    }
    return snapshot;
  }

  function getTaskManagerSnapshot() {
    buildTaskManagerState();
    var snapshot = window.__taskManagerSnapshot && typeof window.__taskManagerSnapshot === "object"
      ? window.__taskManagerSnapshot
      : buildTaskManagerSnapshotFromProcessRecords(
          Array.isArray(window.__processes) ? window.__processes : [],
          Array.isArray(window.apps)
            ? window.apps.map(function (appMeta) {
                return normalizeProcessEntryFromApp(appMeta);
              })
            : [],
        );
    return safeClone(snapshot);
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

  function getTimerHandleKey(handle) {
    if (handle === null || typeof handle === "undefined") return "";
    var type = typeof handle;
    if (type === "number" || type === "string" || type === "bigint") {
      return "primitive::" + String(handle);
    }
    if (type === "object" || type === "function") {
      if (!(runtime.timerHandleIdentity instanceof WeakMap)) {
        runtime.timerHandleIdentity = new WeakMap();
      }
      if (!runtime.timerHandleIdentity.has(handle)) {
        runtime.timerHandleCounter = Number(runtime.timerHandleCounter || 0) + 1;
        runtime.timerHandleIdentity.set(handle, "object::" + String(runtime.timerHandleCounter));
      }
      return String(runtime.timerHandleIdentity.get(handle) || "");
    }
    return "";
  }

  function getRafHandleKey(handle) {
    if (handle === null || typeof handle === "undefined") return "";
    var type = typeof handle;
    if (type === "number" || type === "string" || type === "bigint") {
      return "primitive::" + String(handle);
    }
    if (type === "object" || type === "function") {
      if (!(runtime.rafHandleIdentity instanceof WeakMap)) {
        runtime.rafHandleIdentity = new WeakMap();
      }
      if (!runtime.rafHandleIdentity.has(handle)) {
        runtime.rafHandleCounter = Number(runtime.rafHandleCounter || 0) + 1;
        runtime.rafHandleIdentity.set(handle, "object::" + String(runtime.rafHandleCounter));
      }
      return String(runtime.rafHandleIdentity.get(handle) || "");
    }
    return "";
  }

  function getObserverHandleKey(observer) {
    if (!observer || (typeof observer !== "object" && typeof observer !== "function")) return "";
    if (!(runtime.observerHandleIdentity instanceof WeakMap)) {
      runtime.observerHandleIdentity = new WeakMap();
    }
    if (!runtime.observerHandleIdentity.has(observer)) {
      runtime.observerHandleCounter = Number(runtime.observerHandleCounter || 0) + 1;
      runtime.observerHandleIdentity.set(observer, "observer::" + String(runtime.observerHandleCounter));
    }
    return String(runtime.observerHandleIdentity.get(observer) || "");
  }

  function unregisterTimerProcessByHandle(handle, reason) {
    var key = getTimerHandleKey(handle);
    if (!key) return false;
    var binding = runtime.timerProcessBindings && runtime.timerProcessBindings[key]
      ? runtime.timerProcessBindings[key]
      : null;
    if (!binding) return false;
    delete runtime.timerProcessBindings[key];
    var pidValue = normalizeProcessPid(binding.pid);
    if (typeof pidValue === "number" && !Number.isNaN(pidValue)) {
      killProcess(pidValue, reason || "timer-clear");
    }
    return true;
  }

  function unregisterRafProcessByHandle(handle, reason) {
    var key = getRafHandleKey(handle);
    if (!key) return false;
    var binding = runtime.rafProcessBindings && runtime.rafProcessBindings[key]
      ? runtime.rafProcessBindings[key]
      : null;
    if (!binding) return false;
    delete runtime.rafProcessBindings[key];
    var pidValue = normalizeProcessPid(binding.pid);
    if (typeof pidValue === "number" && !Number.isNaN(pidValue)) {
      killProcess(pidValue, reason || "raf-cancel");
    }
    return true;
  }

  function unregisterObserverProcessByHandle(observer, reason) {
    var key = getObserverHandleKey(observer);
    if (!key) return false;
    var binding = runtime.observerProcessBindings && runtime.observerProcessBindings[key]
      ? runtime.observerProcessBindings[key]
      : null;
    if (!binding) return false;
    delete runtime.observerProcessBindings[key];
    var pidValue = normalizeProcessPid(binding.pid);
    if (typeof pidValue === "number" && !Number.isNaN(pidValue)) {
      killProcess(pidValue, reason || "observer-disconnect");
    }
    return true;
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
  }

  function registerTimerProcess(kind, handle, delayMs, runFn, timerLabel) {
    var key = getTimerHandleKey(handle);
    if (!key) return null;
    if (!runtime.timerProcessBindings || typeof runtime.timerProcessBindings !== "object") {
      runtime.timerProcessBindings = {};
    }

    var delayValue = Number(delayMs || 0);
    if (!Number.isFinite(delayValue) || delayValue < 0) delayValue = 0;
    var callbackArgs = Array.isArray(arguments[5]) ? arguments[5] : [];
    var originState = detectProcessOrigin({ listenerType: "timer:" + String(kind || "unknown") });
    var appId = String(originState.origin.appId || "system");

    var created = createProcess({
      type: "timer",
      title: String(timerLabel || (kind === "interval" ? "Interval" : "Timeout") + " " + String(delayValue) + "ms"),
      appId: appId,
      status: "running",
      persistent: false,
      hasWindow: false,
      windowIds: [],
      parentPid: originState.parentPid,
      cleanup: function () {
        if (kind === "interval") {
          if (window.__flowawayProcessNativeClearInterval) {
            window.__flowawayProcessNativeClearInterval(handle);
          }
        } else if (window.__flowawayProcessNativeClearTimeout) {
          window.__flowawayProcessNativeClearTimeout(handle);
        }
      },
      run: typeof runFn === "function" ? runFn : noopProcessFn,
      handler: typeof runFn === "function" ? runFn : noopProcessFn,
      execution: {
        fn: typeof runFn === "function" ? runFn : noopProcessFn,
        args: callbackArgs,
        intervalId: kind === "interval" ? handle : null,
        ms: delayValue,
        origin: originState.origin,
      },
      options: {
        timerKind: kind,
        delayMs: delayValue,
      },
      key: "timer::" + kind + "::" + key,
    });

    runtime.timerProcessBindings[key] = {
      pid: created && created.pid,
      kind: kind,
      delayMs: delayValue,
      handleKey: key,
      handle: handle,
      callback: typeof runFn === "function" ? runFn : noopProcessFn,
      callbackArgs: callbackArgs,
      startedAt: Date.now(),
      remainingMs: delayValue,
      suspended: false,
      createdAt: Date.now(),
    };

    return created;
  }

  function registerRafProcess(handle, callback, callbackArgs) {
    var key = getRafHandleKey(handle);
    if (!key) return null;
    if (!runtime.rafProcessBindings || typeof runtime.rafProcessBindings !== "object") {
      runtime.rafProcessBindings = {};
    }

    var originState = detectProcessOrigin({ listenerType: "raf" });
    var created = createProcess({
      type: "animation",
      title: "requestAnimationFrame",
      appId: String(originState.origin.appId || "system"),
      status: "running",
      persistent: false,
      hasWindow: false,
      windowIds: [],
      parentPid: originState.parentPid,
      cleanup: function () {
        if (window.__flowawayProcessNativeCancelAnimationFrame) {
          window.__flowawayProcessNativeCancelAnimationFrame(handle);
        }
      },
      run: typeof callback === "function" ? callback : noopProcessFn,
      handler: typeof callback === "function" ? callback : noopProcessFn,
      execution: {
        fn: typeof callback === "function" ? callback : noopProcessFn,
        args: Array.isArray(callbackArgs) ? callbackArgs.slice() : [],
        rafId: handle,
        origin: originState.origin,
      },
      options: {
        timerKind: "raf",
      },
      key: "raf::" + key,
    });

    runtime.rafProcessBindings[key] = {
      pid: created && created.pid,
      kind: "raf",
      handleKey: key,
      handle: handle,
      callback: typeof callback === "function" ? callback : noopProcessFn,
      callbackArgs: Array.isArray(callbackArgs) ? callbackArgs.slice() : [],
      suspended: false,
      createdAt: Date.now(),
    };

    return created;
  }

  function ensureObserverProcessBinding(observer, callback) {
    var key = getObserverHandleKey(observer);
    if (!key) return null;
    if (!runtime.observerProcessBindings || typeof runtime.observerProcessBindings !== "object") {
      runtime.observerProcessBindings = {};
    }

    var existing = runtime.observerProcessBindings[key];
    if (existing) return existing;

    var originState = detectProcessOrigin({ listenerType: "mutation-observer" });
    var created = createProcess({
      type: "observer",
      title: "MutationObserver",
      appId: String(originState.origin.appId || "system"),
      status: "running",
      persistent: false,
      hasWindow: false,
      windowIds: [],
      parentPid: originState.parentPid,
      cleanup: function () {
        try {
          var nativeDisconnect = observer && observer.__flowawayObserverNativeDisconnect;
          if (typeof nativeDisconnect === "function") nativeDisconnect();
          else if (observer && typeof observer.disconnect === "function") observer.disconnect();
        } catch (e) {}
      },
      run: typeof callback === "function" ? callback : noopProcessFn,
      handler: typeof callback === "function" ? callback : noopProcessFn,
      execution: {
        fn: typeof callback === "function" ? callback : noopProcessFn,
        args: [],
        origin: originState.origin,
      },
      options: {
        timerKind: "observer",
      },
      key: "observer::" + key,
    });

    var binding = {
      pid: created && created.pid,
      kind: "observer",
      handleKey: key,
      observer: observer,
      callback: typeof callback === "function" ? callback : noopProcessFn,
      observedTargets: [],
      suspended: false,
      createdAt: Date.now(),
      _internalDisconnecting: false,
    };

    runtime.observerProcessBindings[key] = binding;
    return binding;
  }

  function suspendProcessBindings(pidValue) {
    var pid = normalizeProcessPid(pidValue);
    if (typeof pid !== "number" || Number.isNaN(pid) || pid <= 0) return false;
    var changed = false;

    var timerKeys = Object.keys(runtime.timerProcessBindings || {});
    for (var i = 0; i < timerKeys.length; i++) {
      var timerBinding = runtime.timerProcessBindings[timerKeys[i]];
      if (!timerBinding || normalizeProcessPid(timerBinding.pid) !== pid || timerBinding.suspended) continue;

      if (timerBinding.kind === "interval") {
        if (window.__flowawayProcessNativeClearInterval) {
          window.__flowawayProcessNativeClearInterval(timerBinding.handle);
        }
      } else {
        var elapsed = Date.now() - Number(timerBinding.startedAt || Date.now());
        var remaining = Number(timerBinding.delayMs || 0) - elapsed;
        timerBinding.remainingMs = remaining > 0 ? remaining : 0;
        if (window.__flowawayProcessNativeClearTimeout) {
          window.__flowawayProcessNativeClearTimeout(timerBinding.handle);
        }
      }
      timerBinding.suspended = true;
      changed = true;
    }

    var rafKeys = Object.keys(runtime.rafProcessBindings || {});
    for (var r = 0; r < rafKeys.length; r++) {
      var rafBinding = runtime.rafProcessBindings[rafKeys[r]];
      if (!rafBinding || normalizeProcessPid(rafBinding.pid) !== pid || rafBinding.suspended) continue;
      if (window.__flowawayProcessNativeCancelAnimationFrame) {
        window.__flowawayProcessNativeCancelAnimationFrame(rafBinding.handle);
      }
      rafBinding.suspended = true;
      changed = true;
    }

    var observerKeys = Object.keys(runtime.observerProcessBindings || {});
    for (var o = 0; o < observerKeys.length; o++) {
      var observerBinding = runtime.observerProcessBindings[observerKeys[o]];
      if (!observerBinding || normalizeProcessPid(observerBinding.pid) !== pid || observerBinding.suspended) continue;
      observerBinding._internalDisconnecting = true;
      try {
        if (observerBinding.observer && typeof observerBinding.observer.disconnect === "function") {
          observerBinding.observer.disconnect();
        }
      } catch (e) {}
      observerBinding._internalDisconnecting = false;
      observerBinding.suspended = true;
      changed = true;
    }

    return changed;
  }

  function resumeProcessBindings(pidValue) {
    var pid = normalizeProcessPid(pidValue);
    if (typeof pid !== "number" || Number.isNaN(pid) || pid <= 0) return false;
    var changed = false;

    var timerKeys = Object.keys(runtime.timerProcessBindings || {});
    for (var i = 0; i < timerKeys.length; i++) {
      var timerKey = timerKeys[i];
      var timerBinding = runtime.timerProcessBindings[timerKey];
      if (!timerBinding || normalizeProcessPid(timerBinding.pid) !== pid || !timerBinding.suspended) continue;

      var callback = timerBinding.callback;
      var callbackArgs = Array.isArray(timerBinding.callbackArgs) ? timerBinding.callbackArgs : [];
      var wrappedCallback = function () {
        var binding = runtime.timerProcessBindings[timerKey];
        if (!binding) return;
        var cbPid = normalizeProcessPid(binding.pid);
        withExecutingProcess(cbPid, callback, this, arguments);
        if (binding.kind === "timeout") {
          unregisterTimerProcessByHandle(binding.handle, "timer-timeout-complete");
        }
      };

      if (timerBinding.kind === "interval") {
        if (window.__flowawayProcessNativeSetInterval) {
          var nextIntervalHandle = window.__flowawayProcessNativeSetInterval.apply(window, [wrappedCallback, timerBinding.delayMs].concat(callbackArgs));
          var nextIntervalKey = getTimerHandleKey(nextIntervalHandle);
          delete runtime.timerProcessBindings[timerKey];
          timerBinding.handle = nextIntervalHandle;
          timerBinding.handleKey = nextIntervalKey;
          runtime.timerProcessBindings[nextIntervalKey] = timerBinding;
          timerBinding.startedAt = Date.now();
          timerBinding.suspended = false;
          changed = true;
        }
      } else if (window.__flowawayProcessNativeSetTimeout) {
        var nextMs = Number(timerBinding.remainingMs);
        if (!Number.isFinite(nextMs) || nextMs < 0) nextMs = 0;
        var nextTimeoutHandle = window.__flowawayProcessNativeSetTimeout.apply(window, [wrappedCallback, nextMs].concat(callbackArgs));
        var nextTimeoutKey = getTimerHandleKey(nextTimeoutHandle);
        delete runtime.timerProcessBindings[timerKey];
        timerBinding.handle = nextTimeoutHandle;
        timerBinding.handleKey = nextTimeoutKey;
        runtime.timerProcessBindings[nextTimeoutKey] = timerBinding;
        timerBinding.startedAt = Date.now();
        timerBinding.suspended = false;
        changed = true;
      }
    }

    var rafKeys = Object.keys(runtime.rafProcessBindings || {});
    for (var r = 0; r < rafKeys.length; r++) {
      var rafKey = rafKeys[r];
      var rafBinding = runtime.rafProcessBindings[rafKey];
      if (!rafBinding || normalizeProcessPid(rafBinding.pid) !== pid || !rafBinding.suspended) continue;
      if (!window.__flowawayProcessNativeRequestAnimationFrame) continue;

      var rafCallback = rafBinding.callback;
      var nextRafHandle = window.__flowawayProcessNativeRequestAnimationFrame(function () {
        var binding = runtime.rafProcessBindings[rafKey];
        if (!binding) return;
        var cbPid = normalizeProcessPid(binding.pid);
        withExecutingProcess(cbPid, rafCallback, this, arguments);
        unregisterRafProcessByHandle(binding.handle, "raf-complete");
      });
      var nextRafKey = getRafHandleKey(nextRafHandle);
      delete runtime.rafProcessBindings[rafKey];
      rafBinding.handle = nextRafHandle;
      rafBinding.handleKey = nextRafKey;
      runtime.rafProcessBindings[nextRafKey] = rafBinding;
      rafBinding.suspended = false;
      changed = true;
    }

    var observerKeys = Object.keys(runtime.observerProcessBindings || {});
    for (var o = 0; o < observerKeys.length; o++) {
      var observerBinding = runtime.observerProcessBindings[observerKeys[o]];
      if (!observerBinding || normalizeProcessPid(observerBinding.pid) !== pid || !observerBinding.suspended) continue;
      var observed = Array.isArray(observerBinding.observedTargets) ? observerBinding.observedTargets : [];
      for (var x = 0; x < observed.length; x++) {
        var rec = observed[x] && typeof observed[x] === "object" ? observed[x] : null;
        if (!rec || !rec.target) continue;
        try {
          observerBinding.observer.observe(rec.target, rec.options || {});
        } catch (e) {}
      }
      observerBinding.suspended = false;
      changed = true;
    }

    return changed;
  }

  function wrapTimerProcessApis() {
    if (window.__flowawayProcessTimerApisWrapped) return;

    var nativeSetTimeout = typeof window.__flowawayProcessNativeSetTimeout === "function"
      ? window.__flowawayProcessNativeSetTimeout
      : window.setTimeout;
    var nativeSetInterval = typeof window.__flowawayProcessNativeSetInterval === "function"
      ? window.__flowawayProcessNativeSetInterval
      : window.setInterval;
    var nativeClearTimeout = typeof window.__flowawayProcessNativeClearTimeout === "function"
      ? window.__flowawayProcessNativeClearTimeout
      : window.clearTimeout;
    var nativeClearInterval = typeof window.__flowawayProcessNativeClearInterval === "function"
      ? window.__flowawayProcessNativeClearInterval
      : window.clearInterval;

    if (
      typeof nativeSetTimeout !== "function" ||
      typeof nativeSetInterval !== "function" ||
      typeof nativeClearTimeout !== "function" ||
      typeof nativeClearInterval !== "function"
    ) {
      return;
    }

    window.__flowawayProcessNativeSetTimeout = nativeSetTimeout;
    window.__flowawayProcessNativeSetInterval = nativeSetInterval;
    window.__flowawayProcessNativeClearTimeout = nativeClearTimeout;
    window.__flowawayProcessNativeClearInterval = nativeClearInterval;

    window.setTimeout = function (callback, delay) {
      var args = Array.prototype.slice.call(arguments, 2);
      var delayMs = Number(delay || 0);
      if (!Number.isFinite(delayMs) || delayMs < 0) delayMs = 0;

      var handle;
      var wrappedCallback = callback;
      if (typeof callback === "function") {
        wrappedCallback = function () {
          var binding = runtime.timerProcessBindings[getTimerHandleKey(handle)];
          var pid = binding ? normalizeProcessPid(binding.pid) : null;
          try {
            return withExecutingProcess(pid, callback, this, arguments);
          } finally {
            unregisterTimerProcessByHandle(handle, "timer-timeout-complete");
          }
        };
      }

      handle = nativeSetTimeout.apply(window, [wrappedCallback, delay].concat(args));
      registerTimerProcess(
        "timeout",
        handle,
        delayMs,
        typeof callback === "function" ? callback : noopProcessFn,
        "Timeout " + String(delayMs) + "ms",
        args,
      );
      return handle;
    };

    window.setInterval = function (callback, delay) {
      var args = Array.prototype.slice.call(arguments, 2);
      var handle;
      var wrappedCallback = callback;
      if (typeof callback === "function") {
        wrappedCallback = function () {
          var binding = runtime.timerProcessBindings[getTimerHandleKey(handle)];
          var pid = binding ? normalizeProcessPid(binding.pid) : null;
          return withExecutingProcess(pid, callback, this, arguments);
        };
      }
      handle = nativeSetInterval.apply(window, [wrappedCallback, delay].concat(args));
      var delayMs = Number(delay || 0);
      if (!Number.isFinite(delayMs) || delayMs < 0) delayMs = 0;
      registerTimerProcess(
        "interval",
        handle,
        delayMs,
        typeof callback === "function" ? callback : noopProcessFn,
        "Interval " + String(delayMs) + "ms",
        args,
      );
      return handle;
    };

    window.clearTimeout = function (handle) {
      nativeClearTimeout(handle);
      unregisterTimerProcessByHandle(handle, "timer-clear-timeout");
    };

    window.clearInterval = function (handle) {
      nativeClearInterval(handle);
      unregisterTimerProcessByHandle(handle, "timer-clear-interval");
    };

    window.__flowawayProcessTimerApisWrapped = true;
  }

  function wrapAnimationFrameProcessApis() {
    if (window.__flowawayProcessRafApisWrapped) return;

    var nativeRequestAnimationFrame = typeof window.__flowawayProcessNativeRequestAnimationFrame === "function"
      ? window.__flowawayProcessNativeRequestAnimationFrame
      : window.requestAnimationFrame;
    var nativeCancelAnimationFrame = typeof window.__flowawayProcessNativeCancelAnimationFrame === "function"
      ? window.__flowawayProcessNativeCancelAnimationFrame
      : window.cancelAnimationFrame;

    if (typeof nativeRequestAnimationFrame !== "function" || typeof nativeCancelAnimationFrame !== "function") {
      return;
    }

    window.__flowawayProcessNativeRequestAnimationFrame = nativeRequestAnimationFrame;
    window.__flowawayProcessNativeCancelAnimationFrame = nativeCancelAnimationFrame;

    window.requestAnimationFrame = function (callback) {
      var args = Array.prototype.slice.call(arguments, 1);
      var handle;
      var wrapped = callback;
      if (typeof callback === "function") {
        wrapped = function () {
          var binding = runtime.rafProcessBindings[getRafHandleKey(handle)];
          var pid = binding ? normalizeProcessPid(binding.pid) : null;
          try {
            return withExecutingProcess(pid, callback, this, arguments);
          } finally {
            unregisterRafProcessByHandle(handle, "raf-complete");
          }
        };
      }
      handle = nativeRequestAnimationFrame.call(window, wrapped);
      registerRafProcess(handle, typeof callback === "function" ? callback : noopProcessFn, args);
      return handle;
    };

    window.cancelAnimationFrame = function (handle) {
      nativeCancelAnimationFrame.call(window, handle);
      unregisterRafProcessByHandle(handle, "raf-cancel");
    };

    window.__flowawayProcessRafApisWrapped = true;
  }

  function wrapMutationObserverProcessApi() {
    if (window.__flowawayProcessMutationObserverWrapped) return;

    var NativeMutationObserver = typeof window.__flowawayProcessNativeMutationObserver === "function"
      ? window.__flowawayProcessNativeMutationObserver
      : window.MutationObserver;

    if (typeof NativeMutationObserver !== "function") {
      return;
    }

    window.__flowawayProcessNativeMutationObserver = NativeMutationObserver;

    function WrappedMutationObserver(callback) {
      var observer;
      var binding;
      var wrappedCallback = function () {
        var pid = binding ? normalizeProcessPid(binding.pid) : null;
        return withExecutingProcess(pid, callback, this, arguments);
      };

      observer = new NativeMutationObserver(wrappedCallback);
      binding = ensureObserverProcessBinding(observer, typeof callback === "function" ? callback : noopProcessFn);

      var nativeObserve = typeof observer.observe === "function" ? observer.observe.bind(observer) : null;
      var nativeDisconnect = typeof observer.disconnect === "function" ? observer.disconnect.bind(observer) : null;
      if (nativeDisconnect) {
        try {
          observer.__flowawayObserverNativeDisconnect = nativeDisconnect;
        } catch (e) {}
      }

      if (nativeObserve) {
        observer.observe = function (target, options) {
          var activeBinding = ensureObserverProcessBinding(observer, typeof callback === "function" ? callback : noopProcessFn);
          activeBinding.observedTargets = Array.isArray(activeBinding.observedTargets)
            ? activeBinding.observedTargets
            : [];

          var existingIndex = -1;
          for (var i = 0; i < activeBinding.observedTargets.length; i++) {
            if (activeBinding.observedTargets[i] && activeBinding.observedTargets[i].target === target) {
              existingIndex = i;
              break;
            }
          }

          var rec = {
            target: target,
            options: options && typeof options === "object" ? Object.assign({}, options) : {},
          };
          if (existingIndex >= 0) activeBinding.observedTargets[existingIndex] = rec;
          else activeBinding.observedTargets.push(rec);

          var proc = getCanonicalProcessByPid(activeBinding.pid);
          if (proc) proc.status = "running";

          return nativeObserve(target, options);
        };
      }

      if (nativeDisconnect) {
        observer.disconnect = function () {
          var activeBinding = runtime.observerProcessBindings[getObserverHandleKey(observer)];
          var shouldTerminate = !(activeBinding && activeBinding._internalDisconnecting);
          var result = nativeDisconnect();
          if (shouldTerminate) {
            unregisterObserverProcessByHandle(observer, "observer-disconnect");
          }
          return result;
        };
      }

      return observer;
    }

    WrappedMutationObserver.prototype = NativeMutationObserver.prototype;
    try {
      Object.setPrototypeOf(WrappedMutationObserver, NativeMutationObserver);
    } catch (e) {}

    window.MutationObserver = WrappedMutationObserver;
    window.__flowawayProcessMutationObserverWrapped = true;
  }

  function registerTerminalProcessCommands() {
    if (window.__flowawayRuntimeTerminalProcessCommandsRegistered) return true;
    if (typeof window.registerTerminalAppCommand !== "function") return false;

    var processPs = window.registerTerminalAppCommand({
      name: "ps",
      description: "List current processes.",
      usage: "ps [json]",
      sourceApp: "processes",
      handler: function (context, args) {
        var listOut = typeof list === "function" ? list() : [];
        if (String(args && args[0] || "").toLowerCase() === "json") {
          return listOut;
        }
        if (!listOut.length) {
          return "ps: no processes";
        }
        for (var i = 0; i < listOut.length; i++) {
          var row = listOut[i] && typeof listOut[i] === "object" ? listOut[i] : {};
          var line = [
            String(getFirstDefinedValue(row.pid, row.processId, "?")),
            String(getFirstDefinedValue(row.status, "unknown")),
            String(getFirstDefinedValue(row.type, row.processKind, row.sourceType, "process")),
            String(getFirstDefinedValue(row.appId, "global")),
            String(getFirstDefinedValue(row.persistent, false) ? "persistent" : "volatile"),
            String(getFirstDefinedValue(row.title, row.label, "Process")),
          ].join("\t");
          if (context && typeof context.writeLine === "function") {
            context.writeLine(line);
          }
        }
        return;
      },
    }, { force: true });

    var processKill = window.registerTerminalAppCommand({
      name: "kill",
      description: "Kill a process by pid.",
      usage: "kill <pid>",
      sourceApp: "processes",
      handler: function (context, args) {
        var target = String(args && args[0] || "").trim();
        if (!target) return "kill: missing pid";
        var pid = Number(target);
        if (!Number.isFinite(pid)) return "kill: pid must be numeric";
        var ok = killProcess(pid, "terminal-kill");
        return ok ? "kill: terminated " + String(pid) : "kill: no matching process for pid " + String(pid);
      },
    }, { force: true });

    var processSuspend = window.registerTerminalAppCommand({
      name: "suspend",
      description: "Suspend a process by pid.",
      usage: "suspend <pid>",
      sourceApp: "processes",
      handler: function (context, args) {
        var target = String(args && args[0] || "").trim();
        if (!target) return "suspend: missing pid";
        var pid = Number(target);
        if (!Number.isFinite(pid)) return "suspend: pid must be numeric";
        var ok = suspendProcess(pid);
        return ok ? "suspend: suspended " + String(pid) : "suspend: no matching process for pid " + String(pid);
      },
    }, { force: true });

    var processResume = window.registerTerminalAppCommand({
      name: "resume",
      description: "Resume a process by pid.",
      usage: "resume <pid>",
      sourceApp: "processes",
      handler: function (context, args) {
        var target = String(args && args[0] || "").trim();
        if (!target) return "resume: missing pid";
        var pid = Number(target);
        if (!Number.isFinite(pid)) return "resume: pid must be numeric";
        var ok = resumeProcess(pid);
        return ok ? "resume: resumed " + String(pid) : "resume: no matching process for pid " + String(pid);
      },
    }, { force: true });

    var ok =
      processPs && processPs.ok !== false &&
      processKill && processKill.ok !== false &&
      processSuspend && processSuspend.ok !== false &&
      processResume && processResume.ok !== false;

    if (ok) {
      window.__flowawayRuntimeTerminalProcessCommandsRegistered = true;
      if (window._flowaway_handlers && window._flowaway_handlers.processTerminalCommandRegisterTimer) {
        getInternalClearInterval()(window._flowaway_handlers.processTerminalCommandRegisterTimer);
        delete window._flowaway_handlers.processTerminalCommandRegisterTimer;
      }
    }

    return ok;
  }

  function ensureTerminalProcessCommandsRegistration() {
    if (registerTerminalProcessCommands()) return;
    if (window._flowaway_handlers && window._flowaway_handlers.processTerminalCommandRegisterTimer) {
      return;
    }
    window._flowaway_handlers = window._flowaway_handlers || {};
    window._flowaway_handlers.processTerminalCommandRegisterTimer = getInternalSetInterval()(function () {
      registerTerminalProcessCommands();
    }, 1200);
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

  function loadTreeWrapper() {
    var oldLoadTree = window.loadTree;
    if (window.__flowawayProcessLoadTreeWrapped && oldLoadTree === window.__flowawayProcessLoadTreeWrapped) {
      return;
    }

    var wrapped = async function () {
      if (typeof oldLoadTree === "function") {
        await oldLoadTree();
      }
      try {
        buildTaskManagerState();
        ensureProcessTrackerRunning();
      } catch (e) {}
    };

    window.__flowawayProcessLoadTreeWrapped = wrapped;
    window.loadTree = wrapped;
    window.onlyloadTree = oldLoadTree;
  }

  function wrapLaunchApp() {
    var originalLaunchApp = window.launchApp;
    if (typeof originalLaunchApp !== "function") return;
    if (window.__flowawayProcessLaunchAppWrapped === originalLaunchApp) return;

    var wrappedLaunchApp = async function (appId) {
      var result = await originalLaunchApp.apply(this, arguments);
      try {
        var app = (Array.isArray(window.apps) ? window.apps : []).find(function (item) {
          if (!item) return false;
          var candidates = [item.id, item.functionname, item.label, item.path]
            .filter(Boolean)
            .map(function (value) {
              return String(value);
            });
          return candidates.indexOf(String(appId)) !== -1;
        });
        if (app) {
          registerAppLaunch(app, {
            instanceKey: String(appId || app.id || app.functionname || "launch"),
          });
        }
      } catch (e) {}
      return result;
    };

    window.__flowawayProcessLaunchAppWrapped = originalLaunchApp;
    window.launchApp = wrappedLaunchApp;
  }

  function bindAppUpdatedRefresh() {
    if (window.__flowawayProcessAppUpdatedBound) return;
    window.__flowawayProcessAppUpdatedBound = true;
    try {
      window.addEventListener("appUpdated", function () {
        try {
          buildTaskManagerState();
        } catch (e) {}
      });
    } catch (e) {}
  }

  function cleanupLegacyProcessTimers() {
    try {
      var internalClearInterval = getInternalClearInterval();
      var internalClearTimeout = getInternalClearTimeout();
      if (window._flowaway_handlers && window._flowaway_handlers.processTrackerFallbackTimer) {
        internalClearInterval(window._flowaway_handlers.processTrackerFallbackTimer);
        delete window._flowaway_handlers.processTrackerFallbackTimer;
      }
      if (window._flowaway_handlers && window._flowaway_handlers.processTrackerSyncTimer) {
        internalClearTimeout(window._flowaway_handlers.processTrackerSyncTimer);
        delete window._flowaway_handlers.processTrackerSyncTimer;
      }
      if (window._flowaway_handlers && window._flowaway_handlers.processTerminalCommandRegisterTimer) {
        internalClearInterval(window._flowaway_handlers.processTerminalCommandRegisterTimer);
        delete window._flowaway_handlers.processTerminalCommandRegisterTimer;
      }
      if (window._flowawayProcessTrackerState) {
        var legacy = window._flowawayProcessTrackerState;
        if (legacy.syncTimer) internalClearTimeout(legacy.syncTimer);
        if (legacy.fallbackTimer) internalClearInterval(legacy.fallbackTimer);
      }
    } catch (e) {}
  }

  function demoGuiAppIntervalTracking() {
    var root = typeof document !== "undefined" ? document.querySelector(".app-root") : null;
    var tick = 0;
    var handle = setInterval(function () {
      tick += 1;
      return tick;
    }, 1000);
    return {
      api: "setInterval",
      scope: "gui",
      rootFound: !!root,
      handle: handle,
      stop: function () {
        clearInterval(handle);
      },
    };
  }

  function demoBackgroundIntervalTracking() {
    var count = 0;
    var handle = setInterval(function () {
      count += 1;
      return count;
    }, 1500);
    return {
      api: "setInterval",
      scope: "background",
      handle: handle,
      stop: function () {
        clearInterval(handle);
      },
    };
  }

  function demoRafTracking() {
    var handle = requestAnimationFrame(function () {});
    return {
      api: "requestAnimationFrame",
      handle: handle,
      cancel: function () {
        cancelAnimationFrame(handle);
      },
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
  runtime.ensureProcessTrackerRunning = ensureProcessTrackerRunning;
  runtime.cleanupLegacyProcessTimers = cleanupLegacyProcessTimers;
  runtime.demoGuiAppIntervalTracking = demoGuiAppIntervalTracking;
  runtime.demoBackgroundIntervalTracking = demoBackgroundIntervalTracking;
  runtime.demoRafTracking = demoRafTracking;
  runtime.__loaded = true;

  window.__processRuntime = runtime;
  window.FlowawayProcess = runtime;
  if (!window.process || typeof window.process !== "object") {
    window.process = runtime;
  }

  window.registerDynamicProcess = registerDynamicProcess;
  window.unregisterDynamicProcess = unregisterDynamicProcess;
  window.createProcess = createProcess;
  window.getProcess = getProcess;
  window.getProcessesByApp = getProcessesByApp;
  window.killProcess = killProcess;
  window.suspendProcess = suspendProcess;
  window.resumeProcess = resumeProcess;
  window.rebuildTaskManagerSnapshot = buildTaskManagerState;
  window.getTaskManagerSnapshot = getTaskManagerSnapshot;
  window.buildTaskManagerState = buildTaskManagerState;
  window.demoGuiAppIntervalTracking = demoGuiAppIntervalTracking;
  window.demoBackgroundIntervalTracking = demoBackgroundIntervalTracking;
  window.demoRafTracking = demoRafTracking;

  cleanupLegacyProcessTimers();
  wrapTimerProcessApis();
  wrapAnimationFrameProcessApis();
  wrapMutationObserverProcessApi();
  loadTreeWrapper();
  wrapLaunchApp();
  bindAppUpdatedRefresh();
  ensureTerminalProcessCommandsRegistration();
  buildTaskManagerState();
})();
