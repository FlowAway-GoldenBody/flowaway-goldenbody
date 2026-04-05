(function () {
  if (window.FlowawayAppLoader && window.FlowawayAppLoader.__loaded) {
    return;
  }

  function getRequiredFunction(name) {
    var fn = window[name];
    if (typeof fn !== "function") {
      throw new Error("FlowawayAppLoader missing required function: " + name);
    }
    return fn;
  }

  function isImageIconValue(value) {
    if (!value || typeof value !== "string") return false;
    var normalized = value.trim().toLowerCase();
    if (!normalized) return false;
    if (normalized.startsWith("data:image/")) return true;
    normalized = normalized.split("?")[0].split("#")[0];
    return normalized.endsWith(".png") || normalized.endsWith(".svg");
  }

  function getIconMimeType(pathOrValue) {
    var normalized = (pathOrValue || "")
      .trim()
      .toLowerCase()
      .split("?")[0]
      .split("#")[0];
    if (normalized.endsWith(".svg")) return "image/svg+xml";
    return "image/png";
  }

  function toIconImageMarkupFromSource(iconSource) {
    if (!iconSource) return "";
    return '<img src="' + iconSource + '" style="width:1.8em;height:1.8em;max-width:100%;max-height:100%;object-fit:contain;display:block;margin:0 auto;"/>';
  }

  async function toIconImageMarkup(iconPathOrUrl, folderPath) {
    var iconSource = (iconPathOrUrl || "").trim();
    if (!iconSource) return "";

    if (iconSource.startsWith("data:image/")) {
      return toIconImageMarkupFromSource(iconSource);
    }

    if (
      iconSource.startsWith("http://") ||
      iconSource.startsWith("https://") ||
      iconSource.startsWith("/")
    ) {
      return toIconImageMarkupFromSource(iconSource);
    }

    var normalizedPath = iconSource.replace(/^\.\//, "");
    if (!normalizedPath.startsWith("apps/")) {
      normalizedPath = String(folderPath || "") + "/" + normalizedPath;
    }

    var fetchFileContentByPath = getRequiredFunction("fetchFileContentByPath");
    var iconB64 = await fetchFileContentByPath(normalizedPath);
    if (!iconB64) return "";
    var mimeType = getIconMimeType(normalizedPath);
    return toIconImageMarkupFromSource("data:" + mimeType + ";base64," + iconB64);
  }

  async function extractAppData(appFolder) {
    var getFolderListing = getRequiredFunction("getFolderListing");
    var fetchFileContentByPath = getRequiredFunction("fetchFileContentByPath");
    var decodeFileTextStrict = getRequiredFunction("decodeFileTextStrict");
    var base64ToUtf8 = getRequiredFunction("base64ToUtf8");

    var folderName = appFolder[0];
    var folderPath =
      appFolder[2] && appFolder[2].path
        ? appFolder[2].path
        : "apps/" + folderName;
    var files = await getFolderListing(folderPath);
    if (!files) {
      if (
        window._flowawayMissingFolders &&
        window._flowawayMissingFolders.has(folderPath)
      ) {
        var enoent = new Error("Missing folder: " + folderPath);
        enoent.code = "ENOENT";
        throw enoent;
      }
      return null;
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
        var b64 = await fetchFileContentByPath(entryPath);
        var entryText = decodeFileTextStrict(b64, entryPath, { allowEmpty: true });
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
              flowawayError("extractAppData", "entry.json is not a valid object.", null, entryPath);
            }
          } catch (pe) {
            flowawayError("extractAppData", "Failed to parse entry.json.", pe, entryPath);
          }
        } else {
          flowawayError("extractAppData", "entry.json is empty or missing; using defaults.", null, entryPath);
        }
      } catch (e) {
        flowawayError("extractAppData", "Failed to read app entry metadata.", e, folderPath + "/" + entryObjectfile);
      }
    }

    if (iconFile) {
      if (
        iconFile.toLowerCase().endsWith(".png") ||
        iconFile.toLowerCase().endsWith(".svg")
      ) {
        icon = (await toIconImageMarkup(folderPath + "/" + iconFile, folderPath)) || icon;
      } else {
        try {
          var iconPath = folderPath + "/" + iconFile;
          var iconB64 = await fetchFileContentByPath(iconPath);
          var parsedIcon = base64ToUtf8(iconB64).trim();
          if (isImageIconValue(parsedIcon)) {
            icon = (await toIconImageMarkup(parsedIcon, folderPath)) || icon;
          } else {
            icon = parsedIcon || icon;
          }
        } catch (e) {
          flowawayError("extractAppData", "Failed to read app icon metadata.", e, folderPath + "/" + iconFile);
        }
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

  window.FlowawayAppLoader = {
    isImageIconValue: isImageIconValue,
    getIconMimeType: getIconMimeType,
    toIconImageMarkupFromSource: toIconImageMarkupFromSource,
    toIconImageMarkup: toIconImageMarkup,
    extractAppData: extractAppData,
    __loaded: true,
  };
})();
