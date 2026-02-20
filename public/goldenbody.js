  // taskbar
  var taskbuttons;
  // Create the taskbar
  var taskbar = document.createElement("div");
  taskbar.className = 'taskbar';
  taskbar.id = "taskbar";
  taskbar.style.position = "fixed";
  taskbar.style.zIndex = 9999;
  taskbar.style.bottom = "0";
  taskbar.style.left = "0";
  taskbar.style.width = "100%";
  taskbar.style.height = "60px";
  taskbar.style.display = "flex";
  taskbar.style.alignItems = "center";
  taskbar.style.paddingLeft = "50px"; // 50px empty space on left
  taskbar.style.boxSizing = "border-box";
  document.body.appendChild(taskbar);

  //fullscreen
  function _fullscreen() {
    document.documentElement.requestFullscreen();
    _isfullscreen = true;
  }
  var iconid = 0;
  function addTaskButton(name, onclickFunc) {
    var btn = document.createElement("button");
    btn.innerText = name;
    btn.value = name;
    if (name !== "▶") {
      btn.id = name + "-" + iconid;
      iconid++;
    } else btn.id = name;
    btn.style.padding = "3px";
    btn.style.marginRight = "5px";
    btn.style.border = "none";
    btn.className = 'taskbutton';
    btn.style.borderRadius = "3px";
    btn.style.cursor = "pointer";
    btn.style.height = "40px"; // slightly smaller than 60px taskbar
    btn.style.display = "flex";
    btn.style.alignItems = "center";
    btn.style.justifyContent = "center";

    btn.style.minWidth = "60px";
    btn.style.fontSize = "30px"; // Ensures

    btn.addEventListener("click", () => {
      console.log("Task clicked:", btn.value);
      onclickFunc();
    });
    taskbar.appendChild(btn);
    taskbuttons = [...taskbar.querySelectorAll("button")];
    setTimeout(() => {
      applyStyles();
    }, 100);
    return btn;
  }

  function prependTaskButton(name, onclickFunc) {
    var btn = document.createElement("button");
    btn.innerText = name;
    btn.value = name;
    btn.id = name;
    btn.style.padding = "3px";
    btn.style.marginRight = "5px";
    btn.style.border = "none";
    btn.style.borderRadius = "3px";
    btn.style.cursor = "pointer";
    btn.style.height = "40px"; // slightly smaller than 60px taskbar
    btn.style.display = "flex";
    btn.style.alignItems = "center";
    btn.style.justifyContent = "center";

    btn.style.minWidth = "60px";
    btn.style.fontSize = "30px"; // Ensures

    btn.addEventListener("click", () => {
      console.log("Task clicked:", btn.value);
      onclickFunc();
    });
    taskbar.prepend(btn);
    applyStyles();
  }
  addTaskButton("⤢", _fullscreen);
  addTaskButton("💾", saveTaskButtons);
  addTaskButton("▶", starthandler);
  applyTaskButtons();
  purgeButtons();

