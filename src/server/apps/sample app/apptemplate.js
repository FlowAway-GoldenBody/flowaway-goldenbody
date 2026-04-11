window.yourApp = function () {
  var root = window.apptools.createRoot();
  var topbar = window.apptools.createtitlebar(root);

  var content = document.createElement("div");
  content.className = "appContent";

  var title = document.createElement("h1");
  title.textContent =
    "this is a sample app, edit /apps/sample app/apptemplate.js to make it your own!";

  content.appendChild(title);
  root.appendChild(content);

  var instance = window.apptools.api.createAppInstance({
    rootElement: root,
    title: "Your App",
    btnMax: topbar ? topbar.querySelector(".btnMaxColor") : null,
  });

  window.apptools.api.trackInstance(instance, "yourApp");
  return instance;
};

