"use strict";
// required variables.
window.protectedGlobals.windowControlSvgs = {
  minimize:
    '<svg viewBox="0 0 24 24" width="14" height="14" aria-hidden="true" focusable="false" style="display:block;margin:auto" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="5" y1="12" x2="19" y2="12"></line></svg>',
  maximize:
    '<svg viewBox="0 0 24 24" width="14" height="14" aria-hidden="true" focusable="false" style="display:block;margin:auto" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="5" y="5" width="14" height="14" rx="1" ry="1"></rect></svg>',
  restore:
    '<svg viewBox="0 0 24 24" width="14" height="14" aria-hidden="true" focusable="false" style="display:block;margin:auto" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="9" y="9" width="10" height="10" rx="1" ry="1"></rect><path d="M15 9V5H5v10h4"></path></svg>',
  close:
    '<svg viewBox="0 0 24 24" width="14" height="14" aria-hidden="true" focusable="false" style="display:block;margin:auto" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="6" y1="6" x2="18" y2="18"></line><line x1="18" y1="6" x2="6" y2="18"></line></svg>',
};
window.protectedGlobals.fileIconSet = {
  folder: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" class="size-6"> <!-- folder body --> <path d="M3 7a2.5 2.5 0 0 1 2.5-2.5h4.2c.6 0 1.2.2 1.6.6l1.2 1.1c.2.2.5.3.8.3h5.2A2.5 2.5 0 0 1 21 9v8.5A2.5 2.5 0 0 1 18.5 20h-13A2.5 2.5 0 0 1 3 17.5V7Z" fill="#FDCB22" stroke="currentColor" stroke-width="0.8" stroke-linejoin="round" /> <!-- subtle fold highlight (not a cut, just visual depth) --> <path d="M3 11.2H21" stroke="#000000" stroke-opacity="0.35" stroke-width="1" stroke-linecap="round" /> </svg>`,
  file: `<path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" /><path d="M14 2v6h6" />`,
};
window.protectedGlobals.savedScrollX = 0;
window.protectedGlobals.savedScrollY = 0;
window.protectedGlobals.nhjd = 1;
window.protectedGlobals.systemAPIs = window.protectedGlobals.systemAPIs || {};
window.protectedGlobals.USER_PROFILE_PATH = "systemfiles/userprofile/profile.json";
window.protectedGlobals.__incomingData = window.protectedGlobals.data;
window.protectedGlobals.data = window.protectedGlobals.__incomingData;
window.protectedGlobals.loaded = false;
window.protectedGlobals.APP_VERSION = "this app is not versioned";
window.protectedGlobals.hasChanges = false;
window.protectedGlobals.atTop = "";
window.protectedGlobals.zTop = 10;