(function () {
  if (window.protectedGlobals.AppLoaderAPIs && window.protectedGlobals.AppLoaderAPIs.__loaded) {
    return;
  }
  window.protectedGlobals.extractAppData = async function (appFolder) {
    var reportNonFatal = function (scope, message, error, meta) {
      try {
        window.protectedGlobals.throwError(scope, message, error, meta);
      } catch (reportError) {
        try {
          console.error("[non-fatal] " + String(scope || "unknown") + ": " + String(message || ""), error || reportError, meta || null);
        } catch (e) {}
      }
    };
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
      try {
        var entryPath = folderPath + "/" + entryObjectfile;
        var fetchFileContentByPath = window.protectedGlobals.fetchFileContentByPath;
        var b64 = await fetchFileContentByPath(entryPath);
        var entryText = window.protectedGlobals.decodeFileTextStrict(b64, entryPath, { allowEmpty: true });
        if (entryText && entryText.trim()) {
          try {
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
              reportNonFatal("extractAppData", "entry.json is not a valid object.", null, entryPath);
            }
          } catch (pe) {
            reportNonFatal("extractAppData", "Failed to parse entry.json.", pe, entryPath);
          }
        } else {
          reportNonFatal("extractAppData", "entry.json is empty or missing; using defaults.", null, entryPath);
        }
      } catch (e) {
        reportNonFatal("extractAppData", "Failed to read app entry metadata.", e, folderPath + "/" + entryObjectfile);
      }
    }

    if (!hasUseJsField || !useJsKeyValidation) {
      jsFile = "";
    }

    if (useJsKeyValidation && jsFile) {
      try {
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
      } catch (e) {
        reportNonFatal("extractAppData", "App key verification failed. JS disabled for app " + String(folderName), e, folderPath);
        jsFile = "";
      }
    }

    if (iconFile) {
      console.log("Found icon file for app " + folderName + ": " + iconFile); 
        try {
          var iconPath = folderPath + "/" + iconFile;
          var iconB64 = await fetchFileContentByPath(iconPath);
          var parsedIcon = window.protectedGlobals.base64ToUtf8(iconB64).trim();
          icon = parsedIcon || icon;
        } catch (e) {
          reportNonFatal("extractAppData", "Failed to read app icon metadata.", e, folderPath + "/" + iconFile);
        }
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
