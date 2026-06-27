Object.defineProperty(patchedTab.iframe.contentWindow, 'indexedDB', {
    get: () => {
        return {
            
        }
    },

})