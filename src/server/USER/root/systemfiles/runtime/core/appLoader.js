(function () {
  if (window.protectedGlobals.AppLoaderAPIs && window.protectedGlobals.AppLoaderAPIs.__loaded) {
    return;
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


    var functionName = null;
    var label = folderName;
    var icon = null;
    var globalvarobjectstring = "";
    var allapparraystring = "";
    var openfilecapability = [];
    var cmf = "";
    var cmfl1 = "";
    var hasUseJsField = false;
    var useJsKeyValidation = false;
    let jsFile = null;
    let iconFile = null;
    if (entryObjectfile) {
      var entryPath = folderPath + "/" + entryObjectfile;
      var fetchFileContentByPath = window.protectedGlobals.fetchFileContentByPath;
      var b64 = await fetchFileContentByPath(entryPath);
      var entryText = window.protectedGlobals.decodeFileTextStrict(b64, entryPath, { allowEmpty: true });
      if (entryText && entryText.trim()) {
        var entryObj = JSON.parse(entryText);
        if (entryObj && typeof entryObj === "object") {
          functionName = entryObj.functionname;
          label = entryObj.label || label;
          hasUseJsField = Object.prototype.hasOwnProperty.call(entryObj, "usejs");
          useJsKeyValidation = entryObj.usejs === true;
          globalvarobjectstring = entryObj.globalvarobjectstring || "";
          allapparraystring = entryObj.allapparraystring || "";
          openfilecapability = entryObj.openfilecapability || [];
          cmf = entryObj.cmf || "";
          cmfl1 = entryObj.cmfl1 || "";
          jsFile = entryObj.jsFile || files.find(function (f) {
            return f.name.toLowerCase().endsWith(".js");
          })?.relativePath || "";
          iconFile = entryObj.iconFile || files.find(function (f) {
            return f.name.toLowerCase().endsWith(".png") || f.name.toLowerCase().endsWith(".jpg") || f.name.toLowerCase().endsWith(".jpeg") || f.name.toLowerCase().endsWith(".svg");
          })?.relativePath || "";
        } else {
          throw new Error("entry.json is not a valid object for " + String(folderName));
        }
      } else {
        throw new Error("entry.json is empty or missing for " + String(folderName));
      }
    }

    if (!hasUseJsField || !useJsKeyValidation) {
      jsFile = "";
    }

    if (useJsKeyValidation && jsFile) {
      var appKeyFile = files.find(function (f) {
        return f.name.toLowerCase() === "jskey.txt";
      });
      if (!appKeyFile) {
        throw new Error("App integrity check failed: jsKey.txt missing from " + String(folderName));
      }
      var appKeyPath = folderPath + "/" + appKeyFile.relativePath;
      var appKeyB64 = await window.protectedGlobals.fetchFileContentByPath(appKeyPath);
      var appKey = window.protectedGlobals.base64ToUtf8(appKeyB64).trim();
      var masterKeyB64 = await window.protectedGlobals.fetchFileContentByPath("systemfiles/userprofile/jsApiKey.txt");
      var masterKey = window.protectedGlobals.base64ToUtf8(masterKeyB64).trim();
      if (appKey !== masterKey) {
        throw new Error("App integrity check failed: key mismatch for " + String(folderName));
      }
    }

    if (iconFile) {
      console.log("Found icon file for app " + folderName + ": " + iconFile); 
      var iconPath = folderPath + "/" + iconFile;
      var iconB64 = await fetchFileContentByPath(iconPath);
      var parsedIcon = window.protectedGlobals.base64ToUtf8(iconB64).trim();
      icon = parsedIcon || icon;
    }

    return {
      id: functionName || folderName,
      path: folderPath,
      jsFile: jsFile,
      allapparraystring: allapparraystring,
      functionname: functionName || folderName,
      label: label,
      icon: icon,
      scriptLoaded: false,
      globalvarobjectstring: globalvarobjectstring,
      cmf: cmf,
      cmfl1: cmfl1,
      openfilecapability: openfilecapability,
    };
  }

  window.protectedGlobals.AppLoaderAPIs = {
    extractAppData: window.protectedGlobals.extractAppData,
    __loaded: true,
  };
})();
