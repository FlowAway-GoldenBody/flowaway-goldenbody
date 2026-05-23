window.zm = function (posX, posY) {
  var root = window.protectedGlobals.apptools.createRoot('zm', posX, posY);
  var topbar = window.protectedGlobals.apptools.createtitlebar(root);














  // a container for everything other than the titlebar, so that when we implement maximize functionality it doesn't affect the titlebar
  let canvas = document.createElement('canvas');
  canvas.style.width = "100%";
  canvas.style.height = "calc(100% - 30px)"; // 30px is the height of the titlebar, this is a bit hacky but it works for now 
  root.appendChild(canvas);

















  var instance = window.protectedGlobals.apptools.api.createAppInstance({
    rootElement: root,
    title: "ZM",
    btnMax: topbar ? topbar.querySelector(".btnMaxColor") : null,
  });

  window.protectedGlobals.apptools.api.trackInstance(instance, "zm");
  return instance;
};