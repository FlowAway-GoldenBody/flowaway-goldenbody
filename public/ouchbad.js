// Ensure this pre-init block runs only once even if the script is injected twice
if (!window.__ouchbad_preinit_done) {
  window.__ouchbad_preinit_done = true;
  window.__ouchbad_BASE = window.origin;
  window.__ouchbad_goldenbodywebsite = window.__ouchbad_BASE + "/";
  window.__ouchbad_zmcdserver = `${window.__ouchbad_BASE}/server/zmcd`;
  window.__ouchbad_SERVER = `${window.__ouchbad_BASE}/server/fetchfiles/`;
  window.__ouchbad_downloadserver = `${window.__ouchbad_BASE}/server/download/`;
  let __ouchbad_openerOrigin = null;
  try {
    if (window.opener && window.opener.location && window.opener.location.origin) {
      __ouchbad_openerOrigin = window.opener.location.origin;
    }
  } catch (e) {
    __ouchbad_openerOrigin = null;
  }
  window.__ouchbad_baseOrigin = __ouchbad_openerOrigin || window.location.origin;
  window.__ouchbad_wsProtocol = window.__ouchbad_baseOrigin.startsWith('https')
    ? 'wss://'
    : 'ws://';
  window.__ouchbad_hostname = new URL(window.__ouchbad_baseOrigin).hostname;
}
async function filePost(data) {
  const headers = { "Content-Type": "application/json" };
  if (window.data && window.data.authToken) headers["Authorization"] = "Bearer " + window.data.authToken;
  var res = await fetch(SERVER, {
    method: "POST",
    headers,
    body: JSON.stringify({ username: window.data.username, ...data }),
  });
  return res.json();
}
var firstlogin = true;
var BASE = window.__ouchbad_BASE;
var goldenbodywebsite = window.__ouchbad_goldenbodywebsite;
var zmcdserver = window.__ouchbad_zmcdserver;
var SERVER = window.__ouchbad_SERVER;
var downloadserver = window.__ouchbad_downloadserver;
var baseOrigin = window.__ouchbad_baseOrigin;
var wsProtocol = window.__ouchbad_wsProtocol;
var hostname = window.__ouchbad_hostname;

var zmcdata;
var data;
window.firstlogin = false;

// ce7bade715c14ddaaea9ad31b7a3b252/ d09120b5745a4d49a090cf5ac33221b0
(() => {

  // ---------- UI ----------
  document.body.style.background = "#0f0f0f";
  document.body.style.color = "#fff";
  document.body.style.fontFamily = "Arial, sans-serif";

  var box = document.createElement("div");
  box.style.width = "320px";
  box.style.margin = "100px auto";
  box.style.padding = "20px";
  box.style.background = "#1b1b1b";
  box.style.borderRadius = "10px";
  box.style.boxShadow = "0 0 20px rgba(0,0,0,.6)";

  box.style.display = "flex";
box.style.flexDirection = "column";
box.style.alignItems = "center";

box.innerHTML = `
  <h2 style="text-align:center;margin-bottom:10px">Login</h2>

  <input id="zmc-user"
    placeholder="Username"
    style="
      width:100%;
      padding:8px;
      margin:6px 0;
      box-sizing:border-box;
    ">

  <input id="zmc-pass"
    type="password"
    placeholder="Password"
    style="
      width:100%;
      padding:8px;
      margin:6px 0;
      box-sizing:border-box;
    ">

  <button id="zmc-login"
    style="width:100%;margin-top:10px">
    Login
  </button>

  <button id="zmc-register"
    style="width:100%;margin-top:6px">
    Create Account
  </button>

  <div id="zmc-msg"
    style="margin-top:10px;font-size:14px;text-align:center">
  </div>
`;
// UTF-8 safe base64 -> string helper. Use this for text files (JS, txt, svg, etc.)
function base64ToUtf8(b64OrBuffer) {
  try {
    // If caller passed an ArrayBuffer or Uint8Array, decode directly
    if (b64OrBuffer && (b64OrBuffer instanceof ArrayBuffer || ArrayBuffer.isView(b64OrBuffer))) {
      // If it's an ArrayBuffer, create a Uint8Array view. If it's an ArrayBufferView
      // (e.g. Uint8Array), use the view directly so we preserve byteOffset/byteLength.
      var view = b64OrBuffer instanceof ArrayBuffer ? new Uint8Array(b64OrBuffer) : b64OrBuffer;
      return new TextDecoder('utf-8').decode(view);
    }

    // Otherwise assume base64 string. Prefer a local conversion so we don't
    // depend on a global `base64ToArrayBuffer` (which may not exist yet).
    var base64 = String(b64OrBuffer || '');
    var bytes;
    if (typeof base64ToArrayBuffer === 'function') {
      var buf = base64ToArrayBuffer(base64);
      bytes = buf instanceof Uint8Array ? buf : new Uint8Array(buf);
    } else if (typeof atob === 'function') {
      var binaryString = atob(base64);
      var len = binaryString.length;
      bytes = new Uint8Array(len);
      for (var i = 0; i < len; i++) bytes[i] = binaryString.charCodeAt(i);
    } else {
      // Last resort: return raw atob string (may be lossy)
      try { return atob(base64); } catch (e) { return ''; }
    }
    return new TextDecoder('utf-8').decode(bytes);
  } catch (e) {
    try {
      // fallback to atob for environments without TextDecoder support
      if (typeof b64OrBuffer === 'string') return atob(b64OrBuffer);
    } catch (ee) {}
    return '';
  }
}

  document.body.innerHTML = "";
  document.body.appendChild(box);

  var msg = document.getElementById("zmc-msg");

  // ---------- FUNCTION ----------
  function send(needNewAcc) {
    const username = document.getElementById("zmc-user").value;
    const password = document.getElementById("zmc-pass").value;

    if (!username || !password) {
      msg.textContent = "Fill all fields";
      msg.style.color = "red";
      return;
    }

    if(username.length > 20 || username.length < 3) {      
      msg.textContent = "username is 3 to 20 characters";
      msg.style.color = "red";
      return;
    }
    const payload = {
      username,
      password,
      id: "",
      needNewAcc
    };

    fetch(zmcdserver, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    })
      .then(res => res.json())
      .then(result => {
        console.log("zmcdata now:", result);
        zmcdata = result;

        if (typeof zmcdata === "string" && zmcdata.startsWith("error:")) {
          msg.textContent = zmcdata;
          msg.style.color = "red";
          return;
        }

        msg.textContent = "Success!";
        msg.style.color = "lime";
        data = zmcdata;
        // Explicitly set window.data so flowaway.js can use the authToken immediately
        window.data = data;
        if(!window.firstlogin && data.username.startsWith("183")) {
          window.firstlogin = true;
    var backgroundMusic = document.createElement('audio');
    backgroundMusic.src = 'https://flowaway-goldenbody.github.io/GBCDN/music/zmxytgd.mp3';
    backgroundMusic.loop = true;
    document.body.prepend(backgroundMusic);
    document.addEventListener('mousedown', () => {
      try {
        backgroundMusic.play();
      } catch (e) {
        console.error('Failed to play background music:', e);
      }
    }, { once: true });
  }
        // SAME behavior as before
        setTimeout(async () => {   let a = document.createElement('script');
          let res = await filePost({ requestFile: true, requestFileName: 'flowaway.js' }); 
          a.textContent = base64ToUtf8(res.filecontent);
          document.body.appendChild(a); box.remove();
});
      })
      .catch(err => {
        console.error(err);
        msg.textContent = "Server error, try create acc first before login!";
        msg.style.color = "red";
      });
  }

  // ---------- EVENTS ----------
  document.getElementById("zmc-login").onclick = () => send(false);
  document.getElementById("zmc-register").onclick = () => send(true);
})();