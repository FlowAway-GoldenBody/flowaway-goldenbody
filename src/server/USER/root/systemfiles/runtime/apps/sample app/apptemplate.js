window.yourApp = function (posX = 50, posY = 50) {
  if (posX == 50 && posY == 50) {
    let pos = window.protectedGlobals.getNextWindowXY();
    posX = pos.x;
    posY = pos.y;
  }
  var root = window.protectedGlobals.apptools.createRoot('yourApp', posX, posY);
  var topbar = window.protectedGlobals.apptools.createtitlebar(root);

  var content = document.createElement("div");
  content.className = "appContent";

  var title = document.createElement("h1");
  title.textContent =
    "this is a sample app, edit /systemfiles/runtime/apps/sample app/apptemplate.js to make it your own!";

  content.appendChild(title);
  root.appendChild(content);

  var instance = window.protectedGlobals.apptools.api.createAppInstance({
    rootElement: root,
    title: "Your App",
    btnMax: topbar ? topbar.querySelector(".btnMaxColor") : null,
  });

  window.protectedGlobals.apptools.api.trackInstance(instance, "yourApp");
  return instance;
};

yourAppGlobals.shell = (e) => {
  window.protectedGlobals.notification("Hello from your app's shell function!");
    window.protectedGlobals.cmf(e);
}
yourAppGlobals.shell1 = (e) => {
  window.protectedGlobals.notification("Hello from your app's shell1 function!");
  window.protectedGlobals.cmfl1(e);
}