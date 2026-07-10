"use strict";

(function () {
  let knownAppId = [];
  let knownAppGlobals = [];
  let knownAppFuncs = [];
  if (window.protectedGlobals.AppLoaderAPIs && window.protectedGlobals.AppLoaderAPIs.__loaded) {
    return;
  }
  function checkEntryObject(entryObj) {
    if (!entryObj.id) return false;
    if (knownAppId.includes(entryObj.id)) {console.error(`Identifier ${entryObj.id} is already declared`); return false;}
    else knownAppId.push(entryObj.id);

    if (!entryObj.jsFile) return false;
    if (!entryObj.label && !entryObj.headless) return false;
    if (!entryObj.iconFile) return false;

    if (entryObj.requestAdminPerm) {
      if (!entryObj.allAppArrayString) return false;

      if (!entryObj.functionName) return false;
      if (knownAppFuncs.includes(entryObj.functionName)) {console.error(`Identifier ${entryObj.functionName} is already declared`); return false;}
      else knownAppFuncs.push(entryObj.functionName);
      
      if (!entryObj.globalVarObjectString) return false;
      if (knownAppGlobals.includes(entryObj.globalVarObjectString)) {console.error(`Identifier ${entryObj.globalVarObjectString} is already declared`); return false;}
      else knownAppGlobals.push(entryObj.globalVarObjectString);
    }
    
    return true;
  }
  async function getVerification(path) {
    let result = await window.protectedGlobals.ReadFile(path, { text: true, direct: true });
    let userKey = await window.protectedGlobals.ReadFile("systemfiles/userprofile/jsApiKey.txt", { text: true, direct: true });
    if (result === userKey) return true;
    else return false;
  }
  function generateNamespace() {
    return crypto.randomUUID();
  }


  async function loadAppScript(pkg) {
    if (!pkg || !pkg.jsFile || pkg.scriptLoaded || !pkg.requestAdminPerm) return false;

    var jsKeyOk = true;
    try {
      var appKey = String(await window.protectedGlobals.ReadFile(`${pkg.path}/jsKey.txt`, { text: true, direct: true }) || "").trim();
      var masterKey = String(await window.protectedGlobals.ReadFile("systemfiles/userprofile/jsApiKey.txt", { text: true, direct: true }) || "").trim();
      jsKeyOk = !!appKey && !!masterKey && appKey === masterKey;
    } catch (e) {
      jsKeyOk = false;
    }

    if (!jsKeyOk) {
      console.warn("Skipping app script due to missing/invalid jskey", pkg && pkg.id, pkg && pkg.path);
      return false;
    }

    var scriptText = String(await window.protectedGlobals.ReadFile(`${pkg.path}/${pkg.jsFile}`, { text: true, direct: true }) || "");
    if (!String(scriptText || "").trim()) {
      console.warn("App script is empty; skipping load", { appId: pkg && pkg.id, path: pkg && pkg.path, jsFile: pkg && pkg.jsFile });
      return false;
    }

    pkg._lastScriptHash = window.protectedGlobals.hashScriptContent(scriptText);
    try {
      var globalVarObjectString = pkg.globalVarObjectString;
      if (pkg.functionName) delete window[pkg.functionName];
      if (
        pkg.cmf &&
        globalVarObjectString &&
        window[globalVarObjectString] &&
        !window.protectedGlobals.isProtectedAppGlobalName(pkg.cmf)
      ) {
        delete window[globalVarObjectString][pkg.cmf];
      }
    } catch (e) {}

    var scriptEl = document.createElement("script");
    scriptEl.type = "text/javascript";
    scriptEl.textContent = scriptText;
    document.body.appendChild(scriptEl);
    pkg.scriptLoaded = true;
    pkg._scriptElement = scriptEl;
    return true;
  }









  window.protectedGlobals.extractAppData = async function (appFolder) {
    
    var folderName = appFolder[0];
    var folderPath =
      appFolder[2] && appFolder[2].path
        ? appFolder[2].path
        : "systemfiles/runtime/apps/" + folderName;
    var files = await window.protectedGlobals.getFilesFromFolder(folderPath);
    if (!Array.isArray(files)) {
      throw new Error("Invalid folder listing for " + String(folderPath));
    }

    var entryObjectfile =
      files.find(function (f) {
        return f.name.toLowerCase() === "entry.json";
      })?.relativePath || null;







    function createPlaceholderFunction() {
      let entryObj = getEntryObj();
      window[entryObj.functionName] = function () {
        console.warn("App integrity check failed: jsKey.txt does not match master key for " + String(folderName));
        window.protectedGlobals.notification(`unable to start app "${entryObj.label}" because of JS key check error, if you believe this is a mistake, use the fix account feature of the login page. (CODE: JSKEYMISMATCH)`);
      }
    }
    async function createIframeContainerAppFunction() {
      let entryObj = getEntryObj();
      let scriptText = await window.protectedGlobals.ReadFile(folderPath + '/' + entryObj.jsFile, { text: true, direct: true });
      let untrustedIframePatch = await window.protectedGlobals.ReadFile('systemfiles/runtime/core/untrustedIframePatch.js', { text: true, direct: true });
      window[entryObj.functionName] = function (path, posX = 50, posY = 50) {
        entryObj = getPkg();
        if (posX == 50 && posY == 50) {
          let pos = window.protectedGlobals.getNextWindowXY();
          posX = pos.x;
          posY = pos.y;
        }
        var root = window.protectedGlobals.apptools.createRoot(entryObj.id, posX, posY);
        var topbar = window.protectedGlobals.apptools.createtitlebar(root);
        // create an iframe that fills the whole window;
        let iframe = document.createElement("iframe");
        iframe.style.top = "0";
        iframe.style.left = "0";
        iframe.style.width = "100%";
        iframe.style.height = "100%";
        iframe.style.border = "none";
        let instanceNum = window[entryObj.globalVarObjectString][entryObj.allAppArrayString].length;
        let html = `<html><head><script>window.curInstanceNum = ${instanceNum};window.addEventListener('contextmenu', (e) => {e.preventDefault();});</script></head><body style="margin: 0; padding: 0;"><script>${untrustedIframePatch}</script><script>${scriptText}</script></body></html>`;
        const blob = new Blob([html], { type: "text/html" });
        iframe.src = URL.createObjectURL(blob);
        iframe.sandbox = "allow-scripts allow-pointer-lock";
        let appObj;
        window.protectedGlobals.apps.forEach(app => {
          if (app.id === entryObj.id) {
            app.allIframe.push(iframe);
            appObj = app;
          }
        });
        root.appendChild(iframe);
        window.addEventListener(appObj.id + root.goldenbodyId, 'message', (e) => {
          if (e.source !== iframe.contentWindow) {
            return;
          }
          window.dispatchEvent(new CustomEvent("translatedmessage", { detail: {data: e.data, from: appObj.folderName, source: e.source, appName: appObj.folderName} }));
          if (e.data.setInstanceTitle) {
            instance.title = e.data.title || instance.title;
          } else if (e.data.instanceMessage) {
            let toInstance = e.data.toInstance;
            let fromInstance = instance.instanceNum;
            let message = e.data.message;
            if (toInstance === "*" || toInstance === "all") {
              window[appObj.globalVarObjectString][appObj.allAppArrayString].forEach(inst => {
                if (inst.instanceNum !== fromInstance) {
                  inst.iframe.contentWindow.postMessage({instanceMessage: true, message: message, fromInstance: fromInstance}, '*');
                }
              });
            } else {
              let targetInstance = window[appObj.globalVarObjectString][appObj.allAppArrayString].find(inst => inst.instanceNum === toInstance);
              if (targetInstance) {
                targetInstance.iframe.contentWindow.postMessage({instanceMessage: true, message: message, fromInstance: fromInstance}, '*');
              }
            }
          } else if (e.data.getLiveInstanceIndex) {
            let liveInstanceIndex = window[appObj.globalVarObjectString][appObj.allAppArrayString].length;
            iframe.contentWindow.postMessage({liveInstanceIndex: liveInstanceIndex, requestId: e.data.requestId}, '*');
          }
        });
        var instance = window.protectedGlobals.apptools.api.createAppInstance({
          rootElement: root,
          title: entryObj.label,
          btnMax: topbar ? topbar.querySelector(".btnMaxColor") : null,
        });
        instance.iframe = iframe;
        instance.instanceNum = instanceNum;
        let origClose = instance.closeWindow;
        instance.closeWindow = function () {
          origClose();
          appObj.allIframe.splice(appObj.allIframe.indexOf(iframe), 1);
        };
        window.protectedGlobals.apptools.api.trackInstance(instance, entryObj.functionName);
        return instance;
      }
    }

    var functionName = null;
    let id = null;
    var label = folderName;
    var icon = null;
    var globalVarObjectString = "";
    var allAppArrayString = "";
    var openfileCapability = [];
    var cmf = "";
    var cmfl1 = "";
    let jsFile = null;
    let iconFile = null;
    let allIframe = [];

    var entryText = await window.protectedGlobals.ReadFile(folderPath + "/" + entryObjectfile, { text: true, direct: true });
    var entryObj = JSON.parse(entryText);
    if (!checkEntryObject(entryObj)) {
      throw new Error("Invalid entry.json for app " + folderName);
    }
    id = entryObj.id;
    let verify = await getVerification(folderPath + '/jsKey.txt');
    iconFile = entryObj.iconFile || null;
    label = entryObj.label || label;
    openfileCapability = entryObj.openfileCapability || [];
    let getEntryObj = () => {
      return entryObj;
    };
    if (entryObj.requestAdminPerm && verify) {
      functionName = entryObj.functionName;
      globalVarObjectString = entryObj.globalVarObjectString || "";
      allAppArrayString = entryObj.allAppArrayString || "";
      cmf = entryObj.cmf || "";
      cmfl1 = entryObj.cmfl1 || "";
      jsFile = entryObj.jsFile || "";
    } else if (entryObj.requestAdminPerm) {
      functionName = generateNamespace();
      entryObj.functionName = functionName;
      createPlaceholderFunction();
    } else {
      allIframe = [];
      globalVarObjectString = generateNamespace();
      allAppArrayString = generateNamespace();
      functionName = generateNamespace();
      entryObj.globalVarObjectString = globalVarObjectString;
      entryObj.allAppArrayString = allAppArrayString;
      entryObj.functionName = functionName;
      jsFile = entryObj.jsFile || "";
      createIframeContainerAppFunction(entryObj);
    }






    console.log("Found icon file for app " + folderName + ": " + iconFile); 
    if (!entryObj.headless || !iconFile) {
      var iconPath = folderPath + "/" + iconFile;
      if (!entryObj.nonTextIcon) {
        var parsedIcon = String(await window.protectedGlobals.ReadFile(iconPath, { text: true, direct: true }) || "").trim();
        icon = parsedIcon || icon;
      } else if (entryObj.svgEnabled) {
        var parsedIcon = String(await window.protectedGlobals.ReadFile(iconPath, { text: true, direct: true }) || "").trim();
        icon = parsedIcon || icon;
      } else if (entryObj.pngEnabled) {
        var parsedIcon = String(await window.protectedGlobals.ReadFile(iconPath, { direct: true }) || "").trim();
        icon = parsedIcon || icon;
      }
    }


    let pkg = {
      folderName: folderName,
      entryObjectfile: entryObjectfile,
      allIframe: allIframe,
      id: id,
      path: folderPath,
      jsFile: jsFile,
      allAppArrayString: allAppArrayString,
      functionName: functionName || folderName,
      label: label,
      icon: icon,
      scriptLoaded: false,
      globalVarObjectString: globalVarObjectString,
      requestAdminPerm: entryObj.requestAdminPerm,
      cmf: cmf,
      cmfl1: cmfl1,
      svgEnabled: !!entryObj.svgEnabled,
      pngEnabled: !!entryObj.pngEnabled,
      nonTextIcon: !!entryObj.nonTextIcon,
      openfileCapability: openfileCapability,
    };
    let getPkg = () => {
      return pkg;
    };
    window.protectedGlobals.initAppRuntimeState(pkg);
    await loadAppScript(pkg);
    return pkg;
  }

  window.protectedGlobals.AppLoaderAPIs = {
    extractAppData: window.protectedGlobals.extractAppData,
    __loaded: true,
  };
})();
