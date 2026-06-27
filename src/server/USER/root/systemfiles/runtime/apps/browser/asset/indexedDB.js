// Object.defineProperty(patchedTab.iframe.contentWindow, 'indexedDB', {
//     get: () => {
//         return {

//         }
//     },

// })
delete patchedTab.iframe.contentWindow.indexedDB; // Remove the original indexedDB property to allow for patching