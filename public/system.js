  // taskbar
  let taskbuttons;
<<<<<<< HEAD
=======
  async function posttaskbuttons(data) {
    const res = await fetch(zmcdserver, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        username: username,
        data: data,
        edittaskbuttons: true,
      }),
    });
    return res.json();
  }
  function save() {
    let taskbuttons = [...taskbar.querySelectorAll("button")];
    let postdata = [];
    for (const b of taskbuttons) {
      if (b.textContent === "🌐") {
        postdata.push("browser");
      } else if (b.textContent === "🗂") {
        postdata.push("fileExplorer");
      } else if (b.textContent === "⚙") {
        postdata.push("settings");
      }
    }
    posttaskbuttons(postdata);
  }
>>>>>>> 55215956420d290fa708c947255db92dc23a9933
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
  let iconid = 0;
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
<<<<<<< HEAD
  addTaskButton("💾", saveTaskButtons);
  addTaskButton("▶", starthandler);
  applyTaskButtons();
=======
  addTaskButton("💾", save);
  addTaskButton("▶", starthandler);
  for (const taskbutton of data.taskbuttons) {
    if (taskbutton === "browser") addTaskButton("🌐", browser);
    else if (taskbutton === "fileExplorer") addTaskButton("🗂", fileExplorer);
    else if (taskbutton === "settings") addTaskButton("⚙", settings);
  }
  taskbuttons = [...taskbar.querySelectorAll("button")];
  function purgeButtons() {
    explorerButtons = [];
    browserButtons = [];
    settingsButtons = [];
  for (let i = 0; i < taskbuttons.length; i++) {
    if (taskbuttons[i].textContent === "🌐") {
      browserButtons.push(taskbuttons[i]);
    } else if (taskbuttons[i].textContent === "🗂") {
      explorerButtons.push(taskbuttons[i]);
    } else if (taskbuttons[i].textContent === "⚙") {
      settingsButtons.push(taskbuttons[i]);
    }
  }
  }
>>>>>>> 55215956420d290fa708c947255db92dc23a9933
  purgeButtons();

