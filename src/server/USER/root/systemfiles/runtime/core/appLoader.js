"use strict";

(function () {
  if (window.protectedGlobals.AppLoaderAPIs && window.protectedGlobals.AppLoaderAPIs.__loaded) {
    return;
  }

  async function getVerification(path) {
    let result = await window.protectedGlobals.ReadFile(path, { text: true, direct: true });
    let userKey = await window.protectedGlobals.ReadFile("systemfiles/userprofile/jsApiKey.txt", { text: true, direct: true });
    if (result === userKey) return true;
    else return false;
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







    function createPlaceholderFunction(entryObj) {
      window[entryObj.functionName] = function () {
        console.warn("App integrity check failed: jsKey.txt does not match master key for " + String(folderName));
        window.protectedGlobals.notification(`unable to start app "${entryObj.label}" because of JS key check error, if you believe this is a mistake, use the fix account feature of the login page. (CODE: JSKEYMISMATCH)`);
      }
    }
    async function createIframeContainerAppFunction(entryObj) {
      let scriptText = await window.protectedGlobals.ReadFile(entryObj.jsFile, { text: true, direct: true });
      window[entryObj.functionName] = function (path, posX = 50, posY = 50) {
        if (posX == 50 && posY == 50) {
          let pos = window.protectedGlobals.getNextWindowXY();
          posX = pos.x;
          posY = pos.y;
        }
        var root = window.protectedGlobals.apptools.createRoot(entryObj.functionName, posX, posY);
        var topbar = window.protectedGlobals.apptools.createtitlebar(root);
        // create an iframe that fills the whole window;
        let iframe = document.createElement("iframe");
        iframe.style.top = "0";
        iframe.style.left = "0";
        iframe.style.width = "100%";
        iframe.style.height = "100%";
        iframe.style.border = "none";
        iframe.srcdoc = `<html><head><script>${scriptText}</script><script>window.addEventListener('contextmenu', (e) => {e.preventDefault();}</script></head><body></body></html>`;
        iframe.sandbox = "allow-scripts allow-pointer-lock";
        root.appendChild(iframe);
        var instance = window.protectedGlobals.apptools.api.createAppInstance({
          rootElement: root,
          title: entryObj.label,
          btnMax: topbar ? topbar.querySelector(".btnMaxColor") : null,
        });

        window.protectedGlobals.apptools.api.trackInstance(instance, entryObj.functionName);
        return instance;
      }
    }

    var functionName = null;
    var label = folderName;
    var icon = null;
    var globalVarObjectString = "";
    var allAppArrayString = "";
    var openfileCapability = [];
    var cmf = "";
    var cmfl1 = "";
    let jsFile = null;
    let iconFile = null;



    var entryText = await window.protectedGlobals.ReadFile(folderPath + "/" + entryObjectfile, { text: true, direct: true });
    var entryObj = JSON.parse(entryText);
    let verify = await getVerification(folderPath + '/jsKey.txt');
    iconFile = entryObj.iconFile || "";
    label = entryObj.label || label;


    if (verify) {
      functionName = entryObj.functionName;
      globalVarObjectString = entryObj.globalVarObjectString || "";
      allAppArrayString = entryObj.allAppArrayString || "";
      cmf = entryObj.cmf || "";
      cmfl1 = entryObj.cmfl1 || "";
      jsFile = entryObj.jsFile || "";
    } else if (entryObj.requestAdminPerm) {
      createPlaceholderFunction();
    } else {
      entryObj.globalVarObjectString = globalVarObjectString;
      entryObj.allAppArrayString = allAppArrayString;
      entryObj.functionName = functionName;
      globalVarObjectString = generateNamespace();
      allAppArrayString = generateNamespace();
      functionName = generateNamespace();
      openfileCapability = entryObj.openfileCapability || [];
      createIframeContainerAppFunction(entryObj);
    }






    console.log("Found icon file for app " + folderName + ": " + iconFile); 
    if (!entryObj.headless) {
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
      id: functionName || folderName,
      path: folderPath,
      jsFile: jsFile,
      allAppArrayString: allAppArrayString,
      functionName: functionName || folderName,
      label: label,
      icon: icon,
      scriptLoaded: false,
      globalVarObjectString: globalVarObjectString,
      cmf: cmf,
      cmfl1: cmfl1,
      svgEnabled: !!entryObj.svgEnabled,
      pngEnabled: !!entryObj.pngEnabled,
      nonTextIcon: !!entryObj.nonTextIcon,
      openfileCapability: openfileCapability,
    };
    window.protectedGlobals.initAppRuntimeState(pkg);
    return pkg;
  }

  window.protectedGlobals.AppLoaderAPIs = {
    extractAppData: window.protectedGlobals.extractAppData,
    __loaded: true,
  };
})();
