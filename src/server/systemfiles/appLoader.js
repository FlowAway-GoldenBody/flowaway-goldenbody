(function () {
  if (window.protectedGlobals.AppLoaderAPIs && window.protectedGlobals.AppLoaderAPIs.__loaded) {
    return;
  }
  window.protectedGlobals.extractAppData = async function (appFolder) {
    var folderName = appFolder[0];
    var folderPath =
      appFolder[2] && appFolder[2].path
        ? appFolder[2].path
        : "apps/" + folderName;
    var files = await window.protectedGlobals.getFilesFromFolder(folderPath);
    if (!Array.isArray(files)) {
      throw new Error("Invalid folder listing for " + String(folderPath));
    }

    var jsFile =
      files.find(function (f) {
        return f.name.toLowerCase().endsWith(".js");
      })?.relativePath || null;

    var entryObjectfile =
      files.find(function (f) {
        return f.name.toLowerCase() === "entry.json";
      })?.relativePath || null;

    var iconFile =
      files.find(function (f) {
        var name = f.name.toLowerCase();
        return (
          name.startsWith("icon") ||
          name.endsWith(".png") ||
          name.endsWith(".svg")
        );
      })?.relativePath || null;

    var functionName = null;
    var label = folderName;
    var icon = null;
    var globalvarobjectstring = "";
    var allapparraystring = "";
    var openfilecapability = [];
    var cmf = "";
    var cmfl1 = "";

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
              globalvarobjectstring = entryObj.globalvarobjectstring || "";
              allapparraystring = entryObj.allapparraystring || "";
              openfilecapability = entryObj.openfilecapability || [];
              cmf = entryObj.cmf || "";
              cmfl1 = entryObj.cmfl1 || "";
            } else {
              window.protectedGlobals.throwError("extractAppData", "entry.json is not a valid object.", null, entryPath);
            }
          } catch (pe) {
            window.protectedGlobals.throwError("extractAppData", "Failed to parse entry.json.", pe, entryPath);
          }
        } else {
          window.protectedGlobals.throwError("extractAppData", "entry.json is empty or missing; using defaults.", null, entryPath);
        }
      } catch (e) {
        window.protectedGlobals.throwError("extractAppData", "Failed to read app entry metadata.", e, folderPath + "/" + entryObjectfile);
      }
    }

    if (iconFile) {
        try {
          var iconPath = folderPath + "/" + iconFile;
          var iconB64 = await fetchFileContentByPath(iconPath);
          var parsedIcon = window.protectedGlobals.base64ToUtf8(iconB64).trim();
          icon = parsedIcon || icon;
        } catch (e) {
          window.protectedGlobals.throwError("extractAppData", "Failed to read app icon metadata.", e, folderPath + "/" + iconFile);
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
