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
  











    let lobby = {};

  async function renderzm() {
    playMusic("/systemfiles/runtime/apps/zm/assets/main.mp3").catch((e) => {
      console.error("Failed to play music", e);
    });

    // helpers
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

    async function drawButton(x, y, width, height, imgPath, hoverImgPath = null, onClick = () => {}, zIndex = 0, options = {}) {
      const button = {
        id: nextDrawableId++,
        type: "button",
        x,
        y,
        width,
        height,
        zIndex,
        parent: null,
        children: [],
        disableAccess: false,
        img: null,
        hoverImg: null,
        imgLoaded: false,
        hoverImgLoaded: false,
        isHover: false,
          hoverEffect: true,
        visible: true,
        onClick,
        // optional hover handlers supplied via options.onhover or options.onHover
        onHover: typeof (options && (options.onhover || options.onHover)) === 'function' ? (options.onhover || options.onHover) : null,
        onHoverEnd: typeof (options && (options.onhoverEnd || options.onHoverEnd)) === 'function' ? (options.onhoverEnd || options.onHoverEnd) : null,
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
          if (this.children && this.children.length) this.children.forEach((c) => c.setVisible(value));
          renderScene();
        },
        setX(value) {
          this.x = value;
          renderScene();
        },
        setY(value) {
          this.y = value;
          renderScene();
        },
        setW(value) {
          this.width = value;
          renderScene();
        },
        setH(value) {
          this.height = value;
          renderScene();
        },
        setDisableAccess(value) {
          this.disableAccess = !!value;
          if (this.disableAccess && this.isHover) this.isHover = false;
          renderScene();
        },
          setHoverEffect(value) {
            this.hoverEffect = !!value;
            if (!this.hoverEffect && this.isHover) {
              this.isHover = false;
              renderScene();
            }
          },
          setOnHover(handler) {
            this.onHover = typeof handler === 'function' ? handler : null;
          },
          setOnHoverEnd(handler) {
            this.onHoverEnd = typeof handler === 'function' ? handler : null;
          },
        remove() {
          if (this.children && this.children.length) this.children.slice().forEach((c) => c.remove());
          const btnIdx = buttons.indexOf(this);
          if (btnIdx !== -1) buttons.splice(btnIdx, 1);
          const drawIdx = drawables.indexOf(this);
          if (drawIdx !== -1) drawables.splice(drawIdx, 1);
          if (this.parent && this.parent.children) {
            const pidx = this.parent.children.indexOf(this);
            if (pidx !== -1) this.parent.children.splice(pidx, 1);
          }
          renderScene();
        },
        addChild(child) {
          if (!this.children.includes(child)) {
            this.children.push(child);
            child.parent = this;
            renderScene();
          }
        },
        removeChild(child) {
          const idx = this.children.indexOf(child);
          if (idx !== -1) {
            this.children.splice(idx, 1);
            child.parent = null;
            renderScene();
          }
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
        bringToFrontRel() {
          if (this.parent && this.parent.children && this.parent.children.length) {
            const siblingMax = this.parent.children.reduce((m, c) => Math.max(m, c.zIndex), -Infinity);
            this.zIndex = siblingMax + 1;
          } else {
            this.zIndex = getMaxZIndex() + 1;
          }
          sortDrawables();
          renderScene();
        },
        async setImage(path) {
          try {
            const bytes = await window.protectedGlobals.ReadFile(path, { buffer: true, direct: true });
            const blob = new Blob([bytes], { type: "image/png" });
            const img = new Image();
            img.src = URL.createObjectURL(blob);
            await new Promise((resolve, reject) => {
              img.onload = resolve;
              img.onerror = reject;
            });
            this.img = img;
            this.loaded = true;
            renderScene();
            return this;
          } catch (err) {
            console.error("image.setImage failed:", path, err);
            throw err;
          }
        },
        sendToBack() {
          this.zIndex = getMinZIndex() - 1;
          sortDrawables();
          renderScene();
        },
        async setImage(path) {
          try {
            const bytes = await window.protectedGlobals.ReadFile(path, { buffer: true, direct: true });
            const blob = new Blob([bytes], { type: "image/png" });
            const img = new Image();
            img.src = URL.createObjectURL(blob);
            await new Promise((resolve, reject) => {
              img.onload = () => resolve();
              img.onerror = reject;
            });
            this.img = img;
            this.imgLoaded = true;
            renderScene();
            return this;
          } catch (err) {
            console.error("setImage failed:", path, err);
            throw err;
          }
        },
        async setHoverImage(path) {
          try {
            const bytes = await window.protectedGlobals.ReadFile(path, { buffer: true, direct: true });
            const blob = new Blob([bytes], { type: "image/png" });
            const img = new Image();
            img.src = URL.createObjectURL(blob);
            await new Promise((resolve, reject) => {
              img.onload = () => resolve();
              img.onerror = reject;
            });
            this.hoverImg = img;
            this.hoverImgLoaded = true;
            renderScene();
            return this;
          } catch (err) {
            console.error("setHoverImage failed:", path, err);
            throw err;
          }
        },
        sendToBackRel() {
          if (this.parent && this.parent.children && this.parent.children.length) {
            const siblingMin = this.parent.children.reduce((m, c) => Math.min(m, c.zIndex), Infinity);
            this.zIndex = siblingMin - 1;
          } else {
            this.zIndex = getMinZIndex() - 1;
          }
          sortDrawables();
          renderScene();
        },
      };

      async function loadButtonImage(path, targetKey) {
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
        type: "image",
        x,
        y,
        width,
        height,
        zIndex,
        parent: null,
        children: [],
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
          if (this.children && this.children.length) this.children.forEach((c) => c.setVisible(value));
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
        bringToFrontRel() {
          if (this.parent && this.parent.children && this.parent.children.length) {
            const siblingMax = this.parent.children.reduce((m, c) => Math.max(m, c.zIndex), -Infinity);
            this.zIndex = siblingMax + 1;
          } else {
            this.zIndex = getMaxZIndex() + 1;
          }
          sortDrawables();
          renderScene();
        },
        sendToBack() {
          this.zIndex = getMinZIndex() - 1;
          sortDrawables();
          renderScene();
        },
        sendToBackRel() {
          if (this.parent && this.parent.children && this.parent.children.length) {
            const siblingMin = this.parent.children.reduce((m, c) => Math.min(m, c.zIndex), Infinity);
            this.zIndex = siblingMin - 1;
          } else {
            this.zIndex = getMinZIndex() - 1;
          }
          sortDrawables();
          renderScene();
        },
        remove() {
          if (this.children && this.children.length) this.children.slice().forEach((c) => c.remove());
          const index = images.indexOf(this);
          if (index !== -1) images.splice(index, 1);
          const drawIndex = drawables.indexOf(this);
          if (drawIndex !== -1) drawables.splice(drawIndex, 1);
          if (this.parent && this.parent.children) {
            const pidx = this.parent.children.indexOf(this);
            if (pidx !== -1) this.parent.children.splice(pidx, 1);
          }
          renderScene();
        },
        addChild(child) {
          if (!this.children.includes(child)) {
            this.children.push(child);
            child.parent = this;
            renderScene();
          }
        },
        removeChild(child) {
          const idx = this.children.indexOf(child);
          if (idx !== -1) {
            this.children.splice(idx, 1);
            child.parent = null;
            renderScene();
          }
        },
      };

      async function loadImageAsset(path) {
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
      }

      images.push(image);
      drawables.push(image);
      sortDrawables();
      loadImageAsset(imgPath);
      renderScene();
      return image;
    }

    function buildRenderList() {
      function isChild(d) {
        return !!d.parent;
      }

      const roots = drawables.filter((d) => !isChild(d)).slice();
      roots.sort((a, b) => (a.zIndex !== b.zIndex ? a.zIndex - b.zIndex : a.id - b.id));
      const list = [];
      function traverse(node) {
        list.push(node);
        if (!node.children || !node.children.length) return;
        const children = node.children.slice().sort((a, b) => (a.zIndex !== b.zIndex ? a.zIndex - b.zIndex : a.id - b.id));
        for (const c of children) traverse(c);
      }
      for (const r of roots) traverse(r);
      return list;
    }

    function renderScene() {
      const { width, height } = resizeCanvas();
      ctx.clearRect(0, 0, width, height);
      const list = buildRenderList();
      list.forEach((drawable) => drawable.render());
    }

    canvas.addEventListener("pointermove", (event) => {
      const pos = deviceToUserCoords(event.clientX, event.clientY);
      let needsRender = false;
      buttons.forEach((button) => {
        if (!button.visible || button.disableAccess) {
          if (button.isHover) {
            button.isHover = false;
            // call hover end handler if present
            try { if (typeof button.onHoverEnd === 'function') button.onHoverEnd(event); } catch (e) { console.error('onHoverEnd handler failed', e); }
            needsRender = true;
          }
          return;
        }
        if (!button.hoverEffect) {
          if (button.isHover) {
            button.isHover = false;
            try { if (typeof button.onHoverEnd === 'function') button.onHoverEnd(event); } catch (e) { console.error('onHoverEnd handler failed', e); }
            needsRender = true;
          }
          return;
        }
        const hovering = button.contains(pos.x, pos.y);
        if (hovering !== button.isHover) {
          button.isHover = hovering;
          // call hover handlers on transition
          try {
            if (hovering) {
              if (typeof button.onHover === 'function') button.onHover(event);
              canvas.style.cursor = 'pointer';
            } else {
              if (typeof button.onHoverEnd === 'function') button.onHoverEnd(event);
              canvas.style.cursor = 'default';
            }
          } catch (e) { console.error('hover handler failed', e); }
          needsRender = true;
        }
      });
      if (needsRender) {
        renderScene();
      }
    });

    canvas.addEventListener("pointerup", (event) => {
      const pos = deviceToUserCoords(event.clientX, event.clientY);
      const list = buildRenderList();
      // iterate from topmost to bottommost
      for (let i = list.length - 1; i >= 0; --i) {
        const d = list[i];
        if (!d.visible) continue;
        if (d.type === "button") {
          if (d.disableAccess) continue;
          if (d.contains(pos.x, pos.y)) {
            d.onClick(event);
            break;
          }
        }
      }
    });


















    let mainpageui = {};
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = "high";
    lobby.mainimg = await drawImage(0, 0, 1, 1, "/systemfiles/runtime/apps/zm/assets/zm.png", -1);
    function disableOtherToolbarBtns(btn) {
      // disable all buttons in the toolbar except btn, which now it includes xdksbtn and dqcdbtn
      if (btn === lobby.xdksbtn) {
        if (lobby.dqcdbtn) lobby.dqcdbtn.setDisableAccess(true);
      } else if (btn === lobby.dqcdbtn) {
        if (lobby.xdksbtn) lobby.xdksbtn.setDisableAccess(true);
      }
    }
    function enableOtherToolbarBtns(btn) {
      // enable all buttons in the toolbar except btn
      if (btn === lobby.xdksbtn) {
        if (lobby.dqcdbtn) lobby.dqcdbtn.setDisableAccess(false);
      } else if (btn === lobby.dqcdbtn) {
        if (lobby.xdksbtn) lobby.xdksbtn.setDisableAccess(false);
      }
    }
    function hideAllLobbyUI() {
      // show all ui in lobby
      Object.values(lobby).forEach((element) => {
        if (element.setVisible) {
          element.setVisible(false);
        }
      });
    }
    function showAllLobbyUI() {
      // show all ui in lobby
      Object.values(lobby).forEach((element) => {
        if (element.setVisible) {
          element.setVisible(true);
        }
      });
    }
    // xdks
    mainpageui.xdksoverlay = null;
    let rebuildbtn = null;
    async function showxdksUI() {
      if (mainpageui.xdksoverlay) return;
      disableOtherToolbarBtns(lobby.xdksbtn);
      // Implementation for showing xdks UI
      hideAllLobbyUI();
      mainpageui.xdksoverlay = await drawImage(0, 0, 1, 1, "/systemfiles/runtime/apps/zm/assets/blackbackground.png", 1);
      rebuildbtn = await drawButton(0.675, 0.016, 0.107, 0.075, "/systemfiles/runtime/apps/zm/assets/xdks(fhzcd).png", "/systemfiles/runtime/apps/zm/assets/xdks(fhzcd)(hover).png", () => {
        mainpageui.xdksoverlay.remove();
        // rebuildbtn.remove();
        showAllLobbyUI();
        mainpageui.xdksoverlay = null;
        enableOtherToolbarBtns(lobby.xdksbtn);
      }, 20);
      mainpageui.xdksoverlay.addChild(rebuildbtn);
      // draw the start button at the middle of the x of the screen, the y is the same as rebuild, it will be wider than the rebuild one
      let startbtn = await drawButton(0.5 - 0.125 / 2, 0.018, 0.125, 0.075, "/systemfiles/runtime/apps/zm/assets/xdks(start).png", "/systemfiles/runtime/apps/zm/assets/xdks(start)(hover).png", async () => {
        if (!clicked[0] && !clicked[1]) {
          alert("Please select at least one character");
        }
        else if (!clicked[0] && clicked[1]) {
          alert("Please select player 1");
        }
        else {
          if (clickedPayload[0] && clickedPayload[1]) clickedPayload.push("2 characters zmcd");
          if (clickedPayload[0] === clickedPayload[1]) clickedPayload.pop(); clickedPayload.pop();
          let res = await generateZMCD(clickedPayload);
          lobby.dqcdbtn.onClick({addcd: true, payload: res.content});
        }
      });
      mainpageui.xdksoverlay.addChild(startbtn);


      // render game character selections
      let baseCoordinates = {
        x: 0,
        y: 0.13,
        w: 0.2,
        h: 1-0.13
      }
      let dx = 0.2;
      let clicked = [];
      let clickedPayload = [];
      window.test = clickedPayload; // enable debugging
      let player1Image = null;
      let player2Image = null;
      for (let i = 1; i <= 5; i++) {
        let charbtn = await drawButton(baseCoordinates.x + (i-1)*dx, baseCoordinates.y, baseCoordinates.w, baseCoordinates.h, `/systemfiles/runtime/apps/zm/assets/xdks(${i}).png`, `/systemfiles/runtime/apps/zm/assets/xdks(${i})(hover).png`, async () => {
            // if two slots already occupied and this button is not one of them, ignore
            if (((clicked[0] && clicked[1]) && clicked[0] !== charbtn && clicked[1] !== charbtn) || i === 5) return;
            // disable hover visuals while toggling
            charbtn.setHoverEffect(false);
            const hoverPath = `/systemfiles/runtime/apps/zm/assets/xdks(${i})(hover).png`;
            const normalPath = `/systemfiles/runtime/apps/zm/assets/xdks(${i}).png`;
            if(!clicked[0] && `${i}-2P` !== clickedPayload[0] && `${i}-2P` !== clickedPayload[1]) {
              debugger;
              clicked[0] = charbtn;
              await charbtn.setImage(hoverPath);
              if (player1Image) player1Image.remove();
              player1Image = await drawImage(charbtn.x+0.07, 0.15+0.689, 0.081, 0.079, "/systemfiles/runtime/apps/zm/assets/1P.png", 2);
              mainpageui.xdksoverlay.addChild(player1Image);
              clickedPayload.push(`${i}-1P`);
            } else if (clicked[0] === charbtn) {
              if (player1Image) {
                player1Image.remove();
                player1Image = null;
                // remove i from clickedPayload if it exists
                const index = clickedPayload.indexOf(`${i}-1P`);
                if (index !== -1) {
                  clickedPayload.splice(index, 1);
                }
              }
              await charbtn.setImage(normalPath);
              charbtn.setHoverEffect(true); 
              clicked[0] = null;
            } else if (clicked[1] === charbtn) {
              if (player2Image) {
                player2Image.remove();
                player2Image = null;
              }
              await charbtn.setImage(normalPath);
              charbtn.setHoverEffect(true); 
              clicked[1] = null;
              // remove i from clickedPayload if it exists
              const index = clickedPayload.indexOf(`${i}-2P`);
              if (index !== -1) {
                clickedPayload.splice(index, 1);
              }
            } else if (!clicked[1] && `${i}-1P` !== clickedPayload[0] && `${i}-1P` !== clickedPayload[1]) {
              clicked[1] = charbtn;
              await charbtn.setImage(hoverPath);
              if (player2Image) player2Image.remove();
              player2Image = await drawImage(charbtn.x+0.07, 0.15+0.689, 0.081, 0.079, "/systemfiles/runtime/apps/zm/assets/2P.png", 2);
              mainpageui.xdksoverlay.addChild(player2Image);
              clickedPayload.push(`${i}-2P`);
            }
        });
        mainpageui.xdksoverlay.addChild(charbtn);
      }
    }
    lobby.xdksbtn = await drawButton(0.795,0.71,0.105,0.057,"/systemfiles/runtime/apps/zm/assets/xdks.png","/systemfiles/runtime/apps/zm/assets/xdks1.png", () => {
      showxdksUI();
    });

    lobby.mainimg.addChild(lobby.xdksbtn);





    // dqcd
    mainpageui.dqcdui = null;
    lobby.dqcdbtn = await drawButton(0.793,0.63,0.112,0.058,"/systemfiles/runtime/apps/zm/assets/dqcd.png","/systemfiles/runtime/apps/zm/assets/dqcd1.png", async (options = {}) => {
      if (mainpageui.dqcdui) {return;}
      disableOtherToolbarBtns(lobby.dqcdbtn);
      mainpageui.dqcdui = await drawImage(0.2,0.15,0.63,0.72,"/systemfiles/runtime/apps/zm/assets/dqcdUI2.png");
    lobby.dqcdbtn.addChild(mainpageui.dqcdui);
      if (options.addcd) {mainpageui.dqcdui.parent.parent.bringToFrontRel();}
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
          if (options.addcd) {
            allcd[`cd${i}`].btn.onClick = async () => {
              await window.protectedGlobals.WriteFile(`/systemfiles/runtime/apps/zm/data/cd#(${i}).json`, btoa(JSON.stringify(options.payload)));
              closeBtn.onClick();
              rebuildbtn.onClick();
              enterGame(JSON.parse(await window.protectedGlobals.ReadFile(`/systemfiles/runtime/apps/zm/data/cd#(${i}).json`, { text: true, direct: true })), i);
            }
          }
          else {
            allcd[`cd${i}`].btn.onClick = async () => {
              enterGame(JSON.parse(await window.protectedGlobals.ReadFile(`/systemfiles/runtime/apps/zm/data/cd#(${i}).json`, { text: true, direct: true })), i);
              closeBtn.onClick();
            }
          }
          mainpageui.dqcdui.addChild(allcd[`cd${i}`].btn);

          // Use the raw filesystem path for FileExists/ReadFile (do not percent-encode)
          const cdJsonPath = `/systemfiles/runtime/apps/zm/data/cd#(${i}).json`;
          let cdlabel = null;
          let cdlabel2 = null;
          // ident
          if (await window.protectedGlobals.ReadFile(cdJsonPath, { text: true, direct: true })) {
            let cdData = JSON.parse(await window.protectedGlobals.ReadFile(cdJsonPath, { text: true, direct: true }));
            let additionalOffset1 = 0;
            let additionalWidth = 0;
            if (cdData.player1 === 2) {additionalOffset1 = 0.017; additionalWidth = 0.032/2 + 0.003;}
            cdlabel = allcd[`cd${i}`].text = await drawImage(
              baseX + pos.dx + 0.056,
              baseY + pos.dy + 0.034,
              0.05 + additionalWidth,
              0.045,
              `/systemfiles/runtime/apps/zm/assets/dqcdtxt(${cdData.player1}).png`, 10
            );
            allcd[`cd${i}`].btn.addChild(cdlabel);
            cdlabel.bringToFront();
            additionalWidth = 0;
            if (cdData.player2 === 2) {additionalWidth = 0.032/2 + 0.003;}
            if (cdData.player2) {
              cdlabel2 = allcd[`cd${i}`].text2 = await drawImage(
                baseX + pos.dx + 0.056 + 0.053 + additionalOffset1,
                baseY + pos.dy + 0.034,
                0.05 + additionalWidth,
                0.045,
                `/systemfiles/runtime/apps/zm/assets/dqcdtxt(${cdData.player2}).png`, 10
              );
              allcd[`cd${i}`].btn.addChild(cdlabel2);
              cdlabel2.bringToFront();
            }
          } else {
            cdlabel = allcd[`cd${i}`].text = await drawImage(
              baseX + pos.dx + 0.056,
              baseY + pos.dy + 0.034,
              0.068,
              0.05,
              `/systemfiles/runtime/apps/zm/assets/dqcd-0cd.png`
            );
          allcd[`cd${i}`].btn.addChild(cdlabel);
          cdlabel.bringToFront();
          }

          const numImgPath = `/systemfiles/runtime/apps/zm/assets/cd#(${i}).png`;
          let num = allcd[`cd${i}`].number = await drawImage(
            baseX + pos.dx + 0.015,
            baseY + pos.dy + 0.023,
            0.03,
            0.065,
            numImgPath, 10
          );
          num.bringToFront();
          allcd[`cd${i}`].btn.addChild(num);
        }
      let closeBtn = await drawButton(0.767,0.787,0.04,0.063,"/systemfiles/runtime/apps/zm/assets/dqcdX.png","/systemfiles/runtime/apps/zm/assets/dqcdXHover.png", () => {
        mainpageui.dqcdui.remove();
        mainpageui.dqcdui = null;
        enableOtherToolbarBtns(lobby.dqcdbtn);
        // closeBtn.remove();
        // closeBtn = null;
        // for (let i = 1; i <= 6; i++) {
        //   const cd = allcd[`cd${i}`];
        //   if (!cd) continue;
        //   if (cd.btn) {
        //     cd.btn.remove();
        //     cd.btn = null;
        //   }
        //   if (cd.text) {
        //     cd.text.remove();
        //     cd.text = null;
        //   }
        //   if (cd.number) {
        //     cd.number.remove();
        //     cd.number = null;
        //   }
        // }
      }, 1);
      mainpageui.dqcdui.addChild(closeBtn);
    });
    lobby.mainimg.addChild(lobby.dqcdbtn);



  let curminimap = null;
  async function enterGame(zmcd, cdIndex) {
    lobby.mainimg.setVisible(false);
    eval(await window.protectedGlobals.ReadFile("/systemfiles/runtime/apps/zm/inGame.js", { text: true, direct: true }), cdIndex);
    continueInGame(zmcd, cdIndex);
  }

















    const observer = new ResizeObserver(renderScene);
    observer.observe(root);
  }
  renderzm();

  async function generateZMCD(payload) {
    let data = {};
    // sort payload based on player number, so that the order is always player1 then player2 if both exist, this is to make sure that the same selection will always generate the same zmcd even if the order of selection is different
    payload.sort((a, b) => {
      const aNum = parseInt(a[2]);
      const bNum = parseInt(b[2]);
      if (aNum === bNum) {
        if (a.includes("2P")) return 1;
        if (b.includes("2P")) return -1;
        return 0;
      }
      return aNum - bNum;
    });
    if (payload[2] === "2 characters zmcd") {
      data.player1 = parseInt(payload[0]);
      data.player2 = parseInt(payload[1]);
    } else {
      data.player1 = parseInt(payload[0]);
    }
    data.curLevel = {overworld: 1};
    return { ok: true, content: data };
  }










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
