window.unzip = async function (path = "") {
    if (!path) return;
    await window.protectedGlobals.unzip(path);
    window.explorerGlobals.allExplorers.forEach((explorer) => {
        explorer.rootElement.dispatchEvent(new Event("loadtree"));
    });
};