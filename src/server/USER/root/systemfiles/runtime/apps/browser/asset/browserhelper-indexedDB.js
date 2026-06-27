window.browserGlobals.clearIndexedDbForSite = async function (siteOrigin) {
    window.protectedGlobals.DeleteFile(`/systemfiles/runtime/apps/browser/${window.browserGlobals.getCurProfileName()}/localstorage/indexedDB/${siteOrigin}.json`);
};
window.browserGlobals.updateIndexedDbStore = async function (profileName) {
    let directory = await window.protectedGlobals.ReadFolder(`/systemfiles/runtime/apps/browser/${profileName}/localstorage/indexedDB`);
    if (!directory) {
        await window.protectedGlobals.WriteFolder(`/systemfiles/runtime/apps/browser/${profileName}/localstorage/indexedDB`);
    }
    for (const browser of window.browserGlobals.allBrowsers) {
        for (const tab of browser.tabs) {
            const siteOrigin = window.browserGlobals.mainWebsite(tab.iframe.contentWindow.location.href);
            // ...
        }
    }
};
