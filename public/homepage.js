var BASE = window.origin.slice(0, -5);
var goldenbodywebsite = window.origin + "/";
var zmcdserver = `${BASE}:8082/server/zmcd`;
var SERVER = `${BASE}:8083`;


var zmcdata;
var data;
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
        data = zmcdata
        // SAME behavior as before
        setTimeout(() => {   let a = document.createElement('script');
  a.src = `${goldenbodywebsite}flowaway.js`;
  document.body.appendChild(a); box.remove(); document.body.style.background = 'white';   document.body.style.color = "#000000ff";
}, 300);
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