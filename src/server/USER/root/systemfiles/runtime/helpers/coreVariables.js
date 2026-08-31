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
  file: `<svg xmlns="http://www.w3.org/2000/svg"
     viewBox="0 0 90 90"
     fill="currentColor">
  <path d="M77.474 17.28L61.526 1.332C60.668.473 59.525 0 58.311 0H15.742c-2.508 0-4.548 2.04-4.548 4.548v80.904c0 2.508 2.04 4.548 4.548 4.548h58.516c2.508 0 4.549-2.04 4.549-4.548V20.496c0-1.215-.474-2.358-1.333-3.216zM61.073 5.121l12.611 12.612H62.35c-.704 0-1.276-.573-1.276-1.277V5.121zM74.258 87H15.742c-.854 0-1.548-.694-1.548-1.548V4.548C14.194 3.694 14.888 3 15.742 3h42.332v13.456c0 2.358 1.918 4.277 4.276 4.277h13.457v64.719C75.807 86.306 75.112 87 74.258 87z"/>
  <path d="M68.193 33.319H41.808a1.5 1.5 0 010-3h26.385a1.5 1.5 0 010 3z"/>
  <path d="M34.456 33.319H21.807a1.5 1.5 0 010-3h12.649a1.5 1.5 0 010 3z"/>
  <path d="M42.298 20.733H21.807a1.5 1.5 0 010-3h20.491a1.5 1.5 0 010 3z"/>
  <path d="M68.193 44.319H21.807a1.5 1.5 0 010-3h46.386a1.5 1.5 0 010 3z"/>
  <path d="M48.191 55.319H21.807a1.5 1.5 0 010-3h26.384a1.5 1.5 0 010 3z"/>
  <path d="M68.193 55.319H55.544a1.5 1.5 0 010-3h12.649a1.5 1.5 0 010 3z"/>
  <path d="M68.193 66.319H21.807a1.5 1.5 0 010-3h46.386a1.5 1.5 0 010 3z"/>
  <path d="M68.193 77.319H55.544a1.5 1.5 0 010-3h12.649a1.5 1.5 0 010 3z"/>
</svg>`,
};
window.protectedGlobals.appVerify = "syfamr";
window.protectedGlobals.savedScrollX = 0;
window.protectedGlobals.savedScrollY = 0;
window.protectedGlobals.nhjd = 1;
window.protectedGlobals.systemAPIs = window.protectedGlobals.systemAPIs || {};
window.protectedGlobals.USER_PROFILE_PATH = "systemfiles/userprofile/profile.json";
window.protectedGlobals.APP_VERSION = "this app is not versioned";
window.protectedGlobals.hasChanges = false;
window.protectedGlobals.atTop = "";
window.protectedGlobals.zTop = 10;