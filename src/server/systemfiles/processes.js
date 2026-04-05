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
    if (!Object.prototype.hasOwnProperty.call(runtime.taskProcessIdByIdentity, identityKey)) {
      runtime.taskProcessCounter = Number(runtime.taskProcessCounter || 0) + 1;
      runtime.taskProcessIdByIdentity[identityKey] = runtime.taskProcessCounter;
    }

    if (seenIdentities && typeof seenIdentities === "object") {
      seenIdentities[identityKey] = true;
    }

    return Number(runtime.taskProcessIdByIdentity[identityKey] || 0);
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
          instances = hostObject[matchedArrayKey].slice();
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
      store[pidKey] = processObject;

      processObject.id = pidValue;
      processObject.pid = pidValue;
      processObject.name = String(
        record.title || record.label || processObject.name || record.appId || "Process",
      );
      processObject.kind = String(record.processKind || record.sourceType || "process");
      processObject.options =
        processObject.options && typeof processObject.options === "object"
          ? processObject.options
          : {};
      processObject.options.appId = record.appId;
      processObject.options.appInstanceId = record.appInstanceId;
      processObject.options.goldenbodyId = record.goldenbodyId;
      processObject.options.sourceType = record.sourceType;
      processObject.options.status = record.status;
      processObject.options.updatedAt = record.updatedAt;
      processObject.options.label = record.label;
      processObject.options.appLabel = record.appLabel;
      processObject.options.appEntry = record.appEntry;
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
        return terminateProcess(pid, reason || "manual-terminate");
      },
      stop: function (reason) {
        return terminateProcess(pid, reason || "manual-stop");
      },
      update: function (patch) {
        if (!patch || typeof patch !== "object") return handle;
        record.meta = Object.assign({}, record.meta || {}, patch);
        record.updatedAt = Date.now();
        return handle;
      },
    };

    record.handle = handle;
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

      var base =
        (appMeta && (appMeta.functionname || appMeta.id)) ||
        (appMeta && (appMeta.label || appMeta.path)) ||
        "";
      var gid =
        (instance && (typeof instance._goldenbodyId !== "undefined" ? instance._goldenbodyId : null)) ||
        (instance && (typeof instance.goldenbodyId !== "undefined" ? instance.goldenbodyId : null)) ||
        (instance && (typeof instance._goldenbodyid !== "undefined" ? instance._goldenbodyid : null));
      if (base && (gid || gid === 0) && typeof window.removeAllEventListenersForApp === "function") {
        try {
          window.removeAllEventListenersForApp(String(base) + String(gid));
        } catch (e) {}
      }
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
      scheduleProcessTrackerRebuild("terminate");
    }

    return terminated;
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
    window.__processObjectsByPid = {};
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
      delete registry[appId][processName];
      if (!Object.keys(registry[appId]).length) {
        delete registry[appId];
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
    if (state.syncTimer) {
      clearTimeout(state.syncTimer);
    }
    state.syncTimer = setTimeout(function () {
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
    var changed = ensureTrackedAppInstanceArrays();
    if (changed) {
      scheduleProcessTrackerRebuild("tracker-start-or-refresh");
    }

    if (!state.fallbackTimer) {
      state.fallbackTimer = setInterval(function () {
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
      if (window._flowaway_handlers && window._flowaway_handlers.processTrackerFallbackTimer) {
        clearInterval(window._flowaway_handlers.processTrackerFallbackTimer);
        delete window._flowaway_handlers.processTrackerFallbackTimer;
      }
      if (window._flowaway_handlers && window._flowaway_handlers.processTrackerSyncTimer) {
        clearTimeout(window._flowaway_handlers.processTrackerSyncTimer);
        delete window._flowaway_handlers.processTrackerSyncTimer;
      }
      if (window._flowawayProcessTrackerState) {
        var legacy = window._flowawayProcessTrackerState;
        if (legacy.syncTimer) clearTimeout(legacy.syncTimer);
        if (legacy.fallbackTimer) clearInterval(legacy.fallbackTimer);
      }
    } catch (e) {}
  }

  runtime.start = start;
  runtime.register = register;
  runtime.list = list;
  runtime.snapshot = getTaskManagerSnapshot;
  runtime.watch = watch;
  runtime.registerAppLaunch = registerAppLaunch;
  runtime.registerDynamicProcess = registerDynamicProcess;
  runtime.unregisterDynamicProcess = unregisterDynamicProcess;
  runtime.terminate = terminateProcess;
  runtime.disposeAll = disposeAll;
  runtime.buildTaskManagerState = buildTaskManagerState;
  runtime.getTaskManagerSnapshot = getTaskManagerSnapshot;
  runtime.ensureProcessTrackerRunning = ensureProcessTrackerRunning;
  runtime.cleanupLegacyProcessTimers = cleanupLegacyProcessTimers;
  runtime.__loaded = true;

  window.__processRuntime = runtime;
  window.FlowawayProcess = runtime;
  if (!window.process || typeof window.process !== "object") {
    window.process = runtime;
  }

  window.registerDynamicProcess = registerDynamicProcess;
  window.unregisterDynamicProcess = unregisterDynamicProcess;
  window.rebuildTaskManagerSnapshot = buildTaskManagerState;
  window.getTaskManagerSnapshot = getTaskManagerSnapshot;
  window.buildTaskManagerState = buildTaskManagerState;

  cleanupLegacyProcessTimers();
  loadTreeWrapper();
  wrapLaunchApp();
  bindAppUpdatedRefresh();
  buildTaskManagerState();
})();
