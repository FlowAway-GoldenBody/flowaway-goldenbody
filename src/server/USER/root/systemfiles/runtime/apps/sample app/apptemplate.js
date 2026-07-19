"use strict";
window.yourApp = function () {
  const appId = "Your App";
  let pos = window.protectedGlobals.getNextWindowXY();
  const instance = window.protectedGlobals.apptools.api.createAppInstance({ appId, posX: pos.x, posY: pos.y });
  window.protectedGlobals.apptools.api.trackInstance(instance, appId);
};