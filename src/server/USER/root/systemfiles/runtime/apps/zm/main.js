window.zm = function (posX, posY) {
  var root = window.protectedGlobals.apptools.createRoot("zm", posX, posY);
  var topbar = window.protectedGlobals.apptools.createtitlebar(root);

  let curMusic = null;
  async function playMusic(path) {
    curMusic?.pause();
    curMusic = null;
    let bytes = await window.protectedGlobals.ReadFile(path, { buffer: true, direct: true });
    let blob = new Blob([bytes], { type: "audio/mpeg" });
    let url = URL.createObjectURL(blob);
    let audio = new Audio(url);
    // make it replay when it ends
    audio.loop = true;
    audio.play();
    curMusic = audio;
    return audio;
  }

  function stopAllMusic() {
    curMusic.pause();
    curMusic.currentTime = 0;
    curMusic = null;
  }

  async function renderzm() {
    playMusic("/systemfiles/runtime/apps/zm/assets/main.mp3").catch((e) => {
      console.error("Failed to play music", e);
    });
    let canvas = document.createElement("canvas");
    root.appendChild(canvas);

    const ctx = canvas.getContext("2d");



    canvas.onmousedown = (e) => {
      // show the relative coordinates of the canvas, of the click in the console, so dont use e.clientX and e.clientY directly, convert them to canvas coordinates first
      const rect = canvas.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;
      let userCoords = canvasToUserCoords(x, y);
      console.log("Canvas click at:", userCoords.x, userCoords.y);
    };
    function getLogicalSize() {
      return {
        width: root.clientWidth,
        height: root.clientHeight - 30,
      };
    }

    function clearCanvas() {
      const { width, height } = getLogicalSize();
      ctx.clearRect(0, 0, width, height);
    }

    function resizeCanvas() {
      const { width, height } = getLogicalSize();

      canvas.width = width * devicePixelRatio;
      canvas.height = height * devicePixelRatio;

      canvas.style.width = width + "px";
      canvas.style.height = height + "px";

      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.scale(devicePixelRatio, devicePixelRatio);

      return { width, height };
    }

    function deviceToUserCoords(x, y) {
      const rect = canvas.getBoundingClientRect();
      return {
        x: (x - rect.left) / rect.width,
        y: 1 - (y - rect.top) / rect.height,
      };
    }

    function userToDeviceCoords(x, y) {
      const rect = canvas.getBoundingClientRect();
      return {
        x: rect.left + x * rect.width,
        y: rect.top + rect.height * (1 - y),
      };
    }

    function canvasToUserCoords(x, y) {
      const { width, height } = getLogicalSize();
      return {
        x: x / width,
        y: 1 - y / height,
      };
    }

    function normalToCanvasRect(x, y, width, height) {
      const logical = getLogicalSize();
      return {
        x: x * logical.width,
        y: (1 - y) * logical.height - height * logical.height,
        width: width * logical.width,
        height: height * logical.height,
      };
    }

    const buttons = [];
    const images = [];
    const drawables = [];
    let nextDrawableId = 0;

    function getMaxZIndex() {
      return drawables.reduce((max, drawable) => Math.max(max, drawable.zIndex), 0);
    }

    function getMinZIndex() {
      return drawables.reduce((min, drawable) => Math.min(min, drawable.zIndex), 0);
    }

    function sortDrawables() {
      drawables.sort((a, b) => {
        if (a.zIndex !== b.zIndex) return a.zIndex - b.zIndex;
        return a.id - b.id;
      });
    }

    async function drawButton(x, y, width, height, imgPath, hoverImgPath = null, onClick = () => {}, zIndex = 0) {
      const button = {
        id: nextDrawableId++,
        x,
        y,
        width,
        height,
        zIndex,
        img: null,
        hoverImg: null,
        imgLoaded: false,
        hoverImgLoaded: false,
        isHover: false,
        visible: true,
        onClick,
        contains(normalX, normalY) {
          return (
            normalX >= this.x &&
            normalX <= this.x + this.width &&
            normalY >= this.y &&
            normalY <= this.y + this.height
          );
        },
        getRect() {
          return normalToCanvasRect(this.x, this.y, this.width, this.height);
        },
        render() {
          if (!this.visible) return;
          const rect = this.getRect();
          if (this.isHover && this.hoverImgLoaded) {
            ctx.drawImage(this.hoverImg, rect.x, rect.y, rect.width, rect.height);
          } else if (this.imgLoaded) {
            ctx.drawImage(this.img, rect.x, rect.y, rect.width, rect.height);
          } else {
            ctx.fillStyle = "rgba(0, 0, 0, 0.3)";
            ctx.fillRect(rect.x, rect.y, rect.width, rect.height);
          }
        },
        setVisible(value) {
          this.visible = value;
          renderScene();
        },
        remove() {
          const btnIdx = buttons.indexOf(this);
          if (btnIdx !== -1) {
            buttons.splice(btnIdx, 1);
          }
          const drawIdx = drawables.indexOf(this);
          if (drawIdx !== -1) {
            drawables.splice(drawIdx, 1);
          }
          renderScene();
        },
        setZIndex(value) {
          this.zIndex = value;
          sortDrawables();
          renderScene();
        },
        bringToFront() {
          this.zIndex = getMaxZIndex() + 1;
          sortDrawables();
          renderScene();
        },
        sendToBack() {
          this.zIndex = getMinZIndex() - 1;
          sortDrawables();
          renderScene();
        },
      };

      async function loadButtonImage(path, targetKey) {
        try {
          const bytes = await window.protectedGlobals.ReadFile(path, { buffer: true, direct: true });
          const blob = new Blob([bytes], { type: "image/png" });
          const img = new Image();
          img.src = URL.createObjectURL(blob);
          await new Promise((resolve, reject) => {
            img.onload = resolve;
            img.onerror = reject;
          });
          button[targetKey] = img;
          button[targetKey + "Loaded"] = true;
          renderScene();
        } catch (err) {
          console.error("Button image failed to load:", path, err);
        }
      }

      buttons.push(button);
      drawables.push(button);
      sortDrawables();
      loadButtonImage(imgPath, "img");
      if (hoverImgPath) {
        loadButtonImage(hoverImgPath, "hoverImg");
      }

      renderScene();
      return button;
    }

    async function drawImage(x, y, width, height, imgPath, zIndex = 0) {
      const image = {
        id: nextDrawableId++,
        x,
        y,
        width,
        height,
        zIndex,
        img: null,
        loaded: false,
        visible: true,
        getRect() {
          return normalToCanvasRect(this.x, this.y, this.width, this.height);
        },
        render() {
          if (!this.loaded || !this.visible) return;
          const rect = this.getRect();
          ctx.drawImage(this.img, rect.x, rect.y, rect.width, rect.height);
        },
        setPosition(newX, newY) {
          this.x = newX;
          this.y = newY;
          renderScene();
        },
        setSize(newWidth, newHeight) {
          this.width = newWidth;
          this.height = newHeight;
          renderScene();
        },
        setVisible(value) {
          this.visible = value;
          renderScene();
        },
        setZIndex(value) {
          this.zIndex = value;
          sortDrawables();
          renderScene();
        },
        bringToFront() {
          this.zIndex = getMaxZIndex() + 1;
          sortDrawables();
          renderScene();
        },
        sendToBack() {
          this.zIndex = getMinZIndex() - 1;
          sortDrawables();
          renderScene();
        },
        remove() {
          const index = images.indexOf(this);
          if (index !== -1) {
            images.splice(index, 1);
          }
          const drawIndex = drawables.indexOf(this);
          if (drawIndex !== -1) {
            drawables.splice(drawIndex, 1);
          }
          renderScene();
        },
      };

      async function loadImageAsset(path) {
        try {
          const bytes = await window.protectedGlobals.ReadFile(path, { buffer: true, direct: true });
          const blob = new Blob([bytes], { type: "image/png" });
          const img = new Image();
          img.src = URL.createObjectURL(blob);
          await new Promise((resolve, reject) => {
            img.onload = resolve;
            img.onerror = reject;
          });
          image.img = img;
          image.loaded = true;
          renderScene();
        } catch (err) {
          console.error("Image failed to load:", path, err);
        }
      }

      images.push(image);
      drawables.push(image);
      sortDrawables();
      loadImageAsset(imgPath);
      renderScene();
      return image;
    }

    function renderScene() {
      const { width, height } = resizeCanvas();
      ctx.clearRect(0, 0, width, height);
      if (imageLoaded) {
        ctx.drawImage(mainimg, 0, 0, width, height);
      }
      drawables.forEach((drawable) => drawable.render());
    }

    canvas.addEventListener("pointermove", (event) => {
      const pos = deviceToUserCoords(event.clientX, event.clientY);
      let needsRender = false;
      buttons.forEach((button) => {
        const hovering = button.contains(pos.x, pos.y);
        if (hovering !== button.isHover) {
          button.isHover = hovering;
          needsRender = true;
        }
      });
      if (needsRender) {
        renderScene();
      }
    });

    canvas.addEventListener("pointerdown", (event) => {
      const pos = deviceToUserCoords(event.clientX, event.clientY);
      buttons.forEach((button) => {
        if (button.contains(pos.x, pos.y)) {
          button.onClick(event);
        }
      });
    });

    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = "high";
    let mainimg = new Image();
    let imageLoaded = false;
    mainimg.onload = () => {
      imageLoaded = true;
      renderScene();
    };
    let bytes = await window.protectedGlobals.ReadFile("/systemfiles/runtime/apps/zm/assets/zm.png", { buffer: true, direct: true });
    mainimg.src = URL.createObjectURL(new Blob([bytes], { type: "image/png" }));
    mainimg.onerror = (e) => {
      console.error("Image failed to load", e);
    };
    let dqcdui = null;
    drawButton(0.792,0.63,0.12,0.057,"/systemfiles/runtime/apps/zm/assets/dqcd.png","/systemfiles/runtime/apps/zm/assets/dqcd1.png", async () => {
      if (dqcdui) return;
      dqcdui = await drawImage(0.2,0.15,0.63,0.72,"/systemfiles/runtime/apps/zm/assets/dqcdUI2.png");
      let ht = 0.264;
      let vt = -0.142;
      let allcd = {
        cd1: {},
          cd2: {},
          cd3: {},
          cd4: {},
          cd5: {},
          cd6: {}
      };
      // allcd.cd1.btn = await drawButton(0.245,0.527,0.249,0.116,"/systemfiles/runtime/apps/zm/assets/cd.png","/systemfiles/runtime/apps/zm/assets/cdHover.png");
      // allcd.cd1.text = await drawImage(0.301,0.561,0.068,0.05,"/systemfiles/runtime/apps/zm/assets/dqcd-0cd.png");
      // allcd.cd1.number = await drawImage(0.26,0.55,0.037,0.074,"/systemfiles/runtime/apps/zm/assets/cd#(1).png");
        // Render 6 CDs in a row, filenames: cd1.png ... cd6.png
        // ht and vt are the horizontal and vertical transformations between each CD
        const baseX = 0.245; // Adjusted base X position for the first CD
        const baseY = 0.527; // Adjusted base Y position for the first CD
        const cdW = 0.253;    // Width of each CD
        const cdH = 0.125;    // Height of each CD

        const positions = [
          { dx: 0, dy: 0 },
          { dx: ht, dy: 0 },
          { dx: 0, dy: vt },
          { dx: ht, dy: vt },
          { dx: 0, dy: 2 * vt },
          { dx: ht, dy: 2 * vt },
        ];

        for (let i = 1; i <= 6; ++i) {
          const pos = positions[i - 1];
          allcd[`cd${i}`].btn = await drawButton(
            baseX + pos.dx,
            baseY + pos.dy,
            cdW,
            cdH,
            `/systemfiles/runtime/apps/zm/assets/cd.png`,
            `/systemfiles/runtime/apps/zm/assets/cdHover.png`
          );
          allcd[`cd${i}`].text = await drawImage(
            baseX + pos.dx + 0.056,
            baseY + pos.dy + 0.034,
            0.068,
            0.05,
            `/systemfiles/runtime/apps/zm/assets/dqcd-0cd.png`
          );
          allcd[`cd${i}`].number = await drawImage(
            baseX + pos.dx + 0.015,
            baseY + pos.dy + 0.023,
            0.03,
            0.065,
            `/systemfiles/runtime/apps/zm/assets/cd#(${i}).png`
          );
        }
      let closeBtn = await drawButton(0.767,0.787,0.04,0.063,"/systemfiles/runtime/apps/zm/assets/dqcdX.png","/systemfiles/runtime/apps/zm/assets/dqcdXHover.png", () => {
        dqcdui.remove();
        dqcdui = null;
        closeBtn.remove();
        closeBtn = null;
        for (let i = 1; i <= 6; i++) {
          const cd = allcd[`cd${i}`];
          if (!cd) continue;
          if (cd.btn) {
            cd.btn.remove();
            cd.btn = null;
          }
          if (cd.text) {
            cd.text.remove();
            cd.text = null;
          }
          if (cd.number) {
            cd.number.remove();
            cd.number = null;
          }
        }
      }, 1);
    });
    const observer = new ResizeObserver(renderScene);
    observer.observe(root);
  }
  renderzm();

  var instance = window.protectedGlobals.apptools.api.createAppInstance({
    rootElement: root,
    title: "ZM",
    btnMax: topbar ? topbar.querySelector(".btnMaxColor") : null,
  });

  window.protectedGlobals.apptools.api.trackInstance(instance, "zm");
  let origclose = instance.closeWindow;
  instance.closeWindow = () => {
    stopAllMusic();
    origclose();
  };
  return instance;
};
