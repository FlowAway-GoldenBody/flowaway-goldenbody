(() => {
    window.protectedGlobals.smh = {
        runSMH: (path) => {
            runsmhfile(path);
        }
    };
    runsmhfile = async (path) => {
        let smhcontent = await window.protectedGlobals.ReadFile(path, {text: true, direct: true});
        let metapath = path.split("/");
        metapath.pop();
        metapath.push("entry.json");
        let appMeta = await window.protectedGlobals.ReadFile(metapath.join("/"), {text: true, direct: true});
        // create a new app runtime for the smh file
        appMeta = JSON.parse(appMeta);
        window.protectedGlobals.apps.push({
            functionname: appMeta.functionname,
            label: appMeta.label,
            globalvarobjectstring: appMeta.globalvarobjectstring,
            usejs: false,
            smhpath: appMeta.smhpath,
            iconFile: appMeta.iconFile,
            openfilecapability: appMeta.openfilecapability,
            cmf: appMeta.cmf,
            cmfl1: appMeta.cmfl1
        });
        let appRuntime = new window.protectedGlobals.AppRuntime(appMeta.functionname);        
    };
})();