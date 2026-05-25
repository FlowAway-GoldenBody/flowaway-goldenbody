window.zm = function (posX, posY) {
  var root = window.protectedGlobals.apptools.createRoot('zm', posX, posY);
  var topbar = window.protectedGlobals.apptools.createtitlebar(root);













  async function renderzm() {
  // a container for everything other than the titlebar, so that when we implement maximize functionality it doesn't affect the titlebar
  let canvas = document.createElement('canvas');
  canvas.style.width = "100%";
  canvas.style.height = "calc(100% - 30px)"; // 30px is the height of the titlebar, this is a bit hacky but it works for now 
  root.appendChild(canvas);
  const ctx = canvas.getContext('2d');
  const img = new Image();
  img.onload = function() {
    // Clear the canvas before drawing the new image
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    // Draw the image on the canvas, scaling it to fit the canvas size
    ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
  };
  const bytes = new Uint8Array(await window.protectedGlobals.ReadFile("/systemfiles/runtime/apps/zm/zm.jpg", {buffer: true}));
  img.src = URL.createObjectURL(new Blob([bytes], { type: 'image/jpeg' }));
}
















  var instance = window.protectedGlobals.apptools.api.createAppInstance({
    rootElement: root,
    title: "ZM",
    btnMax: topbar ? topbar.querySelector(".btnMaxColor") : null,
  });

  window.protectedGlobals.apptools.api.trackInstance(instance, "zm");
  return instance;
};