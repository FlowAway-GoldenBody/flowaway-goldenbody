window.zmGlobals = {};
window.zmGlobals.allzmInstances = [];
window.zm = function (posX, posY) {
  if (window.protectedGlobals.data.username !== "183115428") {alert('Access Denied'); return;}
  var root = window.protectedGlobals.apptools.createRoot("zm", posX, posY);
  var topbar = window.protectedGlobals.apptools.createtitlebar(root);

  var instance = window.protectedGlobals.apptools.api.createAppInstance({
    rootElement: root,
    title: "ZM",
    btnMax: topbar ? topbar.querySelector(".btnMaxColor") : null,
  });
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

  async function playSoundEffect(path) {
    let bytes = await window.protectedGlobals.ReadFile(path, { buffer: true, direct: true });
    let blob = new Blob([bytes], { type: "audio/mpeg" });
    let url = URL.createObjectURL(blob);
    let audio = new Audio(url);
    audio.play();
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

    const imageCache = new Map();
    async function loadCachedImage(path) {
      if (imageCache.has(path)) {
        return imageCache.get(path);
      }

const loadPromise = (async () => {
  let lastError;

  for (let attempt = 1; attempt <= 3; attempt++) {
    let objectUrl;

    try {
      const bytes = await window.protectedGlobals.ReadFile(path, {
        buffer: true,
        direct: true,
      });

      if (!bytes || bytes.byteLength === 0) {
        throw new Error("File is empty");
      }

      const blob = new Blob([bytes], { type: "image/png" });

      if (blob.size === 0) {
        throw new Error("Blob is empty");
      }

      const img = new Image();

      objectUrl = URL.createObjectURL(blob);
      img.src = objectUrl;

      await new Promise((resolve, reject) => {
        img.onload = resolve;
        img.onerror = () => reject(new Error("Failed to load image"));
      });

      URL.revokeObjectURL(objectUrl);
      return img;
    } catch (err) {
      if (objectUrl) {
        URL.revokeObjectURL(objectUrl);
      }

      lastError = err;

      if (attempt < 3) {
        await new Promise(resolve => setTimeout(resolve, 200));
      }
    }
  }

  throw lastError;
})();

      imageCache.set(path, loadPromise);
      try {
        return await loadPromise;
      } catch (err) {
        imageCache.delete(path);
        throw err;
      }
    }

    // font loading cache & helper
    const fontCache = new Map();
    async function loadCachedFont(path, familyName) {
      if (fontCache.has(path)) {
        return fontCache.get(path);
      }

      const loadPromise = (async () => {
        const bytes = await window.protectedGlobals.ReadFile(path, { buffer: true, direct: true });
        const blob = new Blob([bytes], { type: "font/ttf" });
        const url = URL.createObjectURL(blob);

        // derive a family name if not provided
        let family = familyName;
        if (!family) {
          try {
            const parts = path.split("/");
            family = parts[parts.length - 1].replace(/\.[^.]+$/, "");
            // make it safe for CSS
            family = `filefont-${family.replace(/[^a-zA-Z0-9_-]/g, "_")}`;
          } catch (e) {
            family = `filefont-${Date.now()}`;
          }
        }

        try {
          const ff = new FontFace(family, `url(${url})`);
          await ff.load();
          document.fonts.add(ff);
          return family;
        } catch (err) {
          console.error("Failed to load font", path, err);
          // fall back to provided familyName or null
          return familyName || null;
        }
      })();

      fontCache.set(path, loadPromise);
      try {
        return await loadPromise;
      } catch (err) {
        fontCache.delete(path);
        throw err;
      }
    }

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

    function getAbsoluteCoords(drawable) {
      // Calculate absolute coordinates accounting for parent positioning
      if (!drawable.parent || drawable.useAbsolute) {
        return { x: drawable.x, y: drawable.y, width: drawable.width, height: drawable.height };
      }
      // Relative positioning: calculate based on parent bounds
      const parentRect = drawable.parent.getRect();
      const logical = getLogicalSize();
      const parentNormX = parentRect.x / logical.width;
      const parentNormY = 1 - (parentRect.y + parentRect.height) / logical.height;
      const parentNormW = parentRect.width / logical.width;
      const parentNormH = parentRect.height / logical.height;

      return {
        x: parentNormX + drawable.relx * parentNormW,
        y: parentNormY + drawable.rely * parentNormH,
        width: drawable.relw * parentNormW,
        height: drawable.relh * parentNormH
      };
    }

    function getChildrenBounds(drawable) {
      if (!drawable.children || drawable.children.length === 0) {
        return null;
      }
      let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
      for (const child of drawable.children) {
        const childRect = child.getRect();
        minX = Math.min(minX, childRect.x);
        minY = Math.min(minY, childRect.y);
        maxX = Math.max(maxX, childRect.x + childRect.width);
        maxY = Math.max(maxY, childRect.y + childRect.height);
      }
      const logical = getLogicalSize();
      return {
        x: minX / logical.width,
        y: 1 - maxY / logical.height,
        width: (maxX - minX) / logical.width,
        height: (maxY - minY) / logical.height
      };
    }

    let drawText = async function drawText(text, fontSize = 16, color = "black", font = "Arial", alignment = "left", zIndex = 0, options = {}) {
      const opts = options || {};
      const requestedFamily = font || "Arial";
      const textObj = {
        id: nextDrawableId++,
        type: "text",
        text,
        fontSize,
        color,
        font: requestedFamily,
        fallback: opts.fallback || "Arial",
        requireParent: !opts.noParent,
        // font scaling options:
        // - if opts.relative === true or fontSize <= 1, fontSize is treated as fraction of logical height
        // - if opts.scaleWithCanvas === true, fontSize is scaled proportionally from a base height
        relative: !!opts.relative,
        scaleWithCanvas: !!opts.scaleWithCanvas,
        baseHeight: opts.baseHeight || 800,
        minFontPx: typeof opts.minFontPx === 'number' ? opts.minFontPx : 8,
        maxFontPx: typeof opts.maxFontPx === 'number' ? opts.maxFontPx : 512,
        alignment,
        zIndex,
        parent: null,
        useAbsolute: true,
        x: opts.x || 0,
        y: opts.y || 0,
        relx: opts.relx || 0,
        rely: opts.rely || 0,
        relw: opts.relw || 0.5,
        relh: opts.relh || 0.2,
        width: 0,
        height: 0,
        visible: true,
        contains(normalX, normalY) {
          const coords = getAbsoluteCoords(this);
          return (
            normalX >= coords.x &&
            normalX <= coords.x + coords.width &&
            normalY >= coords.y &&
            normalY <= coords.y + coords.height
          );
        },
        getRect() {
          const coords = this.useAbsolute ? { x: this.x, y: this.y, width: this.width, height: this.height } : getAbsoluteCoords(this);
          return normalToCanvasRect(coords.x, coords.y, coords.width, coords.height);
        },
        setPosition(x, y) {
          this.x = x;
          this.y = y;
          renderScene();
        },
        render() {
          if (!this.visible) return;
          const logical = getLogicalSize();
          const coords = this.useAbsolute ? { x: this.x, y: this.y, width: this.width, height: this.height } : getAbsoluteCoords(this);

          // determine effective font px size
          let fontPx;
          if (this.relative || this.fontSize <= 1) {
            // treat fontSize as fraction of logical height
            fontPx = Math.round(this.fontSize * logical.height);
          } else if (this.scaleWithCanvas) {
            // scale proportionally from baseHeight
            fontPx = Math.round(this.fontSize * (logical.height / this.baseHeight));
          } else {
            fontPx = Math.round(this.fontSize);
          }
          fontPx = Math.max(this.minFontPx, Math.min(this.maxFontPx, fontPx));

          ctx.font = `${fontPx}px "${this.font}", ${this.fallback}`;
          ctx.fillStyle = this.color;
          ctx.textBaseline = "top";
          ctx.textAlign = this.alignment;
          const canvasX = coords.x * logical.width;
          const canvasY = (1 - coords.y) * logical.height - fontPx;
          ctx.fillText(this.text, canvasX, canvasY, coords.width * logical.width);
          // Update measured dimensions
          const metrics = ctx.measureText(this.text);
          this.width = metrics.width / logical.width;
          this.height = fontPx / logical.height;
        },
        setText(newText) {
          this.text = newText;
          renderScene();
          return this;
        },
        setFont(size, family) {
          this.fontSize = size;
          this.font = family;
          renderScene();
          return this;
        },
        remove() {
          if (this.children && this.children.length) this.children.slice().forEach((c) => c.remove());
          const idx = drawables.indexOf(this);
          if (idx !== -1) drawables.splice(idx, 1);
          if (this.parent && this.parent.children) {
            const pidx = this.parent.children.indexOf(this);
            if (pidx !== -1) this.parent.children.splice(pidx, 1);
          }
          renderScene();
        },
        setColor(newColor) {
          this.color = newColor;
          renderScene();
          return this;
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
        setRelativePos(relx, rely, relw, relh) {
          this.relx = relx;
          this.rely = rely;
          this.relw = relw;
          this.relh = relh;
          this.useAbsolute = false;
          renderScene();
          return this;
        },
      };

      // if a font path is provided, load it and set the family
      if (opts.fontPath) {
        try {
          const family = await loadCachedFont(opts.fontPath, opts.fontFamily || null);
          textObj.font = family || requestedFamily;
        } catch (e) {
          console.error("Failed to load custom font", opts.fontPath, e);
          textObj.font = requestedFamily;
        }
      } else {
        textObj.font = requestedFamily;
      }

      drawables.push(textObj);
      sortDrawables();
      renderScene();
      return textObj;
    }

      // load the tip font
  drawText(
        "",
        undefined,
        "orange",
        undefined,
        "left",
        0,
        { fontPath: "/systemfiles/runtime/apps/zm/assets/infoFont.ttf", fontFamily: "" }
    );
  drawText(
        "",
        undefined,
        "orange",
        undefined,
        "left",
        0,
        { fontPath: "/systemfiles/runtime/apps/zm/assets/thinFont.ttf", fontFamily: "-" }
    );
  drawImage(
    0,0,0,0,"/systemfiles/runtime/apps/zm/assets/saveFailed.png"
  );
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
        requireParent: !(options && options.noParent),
        children: [],
        useAbsolute: true,
        relx: options.relx || 0,
        rely: options.rely || 0,
        relw: options.relw || width,
        relh: options.relh || height,
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
          const coords = getAbsoluteCoords(this);
          return (
            normalX >= coords.x &&
            normalX <= coords.x + coords.width &&
            normalY >= coords.y &&
            normalY <= coords.y + coords.height
          );
        },
        getRect() {
          const coords = this.useAbsolute ? { x: this.x, y: this.y, width: this.width, height: this.height } : getAbsoluteCoords(this);
          return normalToCanvasRect(coords.x, coords.y, coords.width, coords.height);
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
            setTimeout(() => {
              renderScene();
            }, 1);
          }
        },
        removeChild(child) {
          const idx = this.children.indexOf(child);
          if (idx !== -1) {
            this.children.splice(idx, 1);
            child.parent = null;
            renderScene();
          }
          return this;
        },
        setRelativePos(relx, rely, relw, relh) {
          this.relx = relx;
          this.rely = rely;
          this.relw = relw;
          this.relh = relh;
          this.useAbsolute = false;
          renderScene();
          return this;
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
        async setImage(path) {
          try {
            this.img = await loadCachedImage(path);
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
            this.hoverImg = await loadCachedImage(path);
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
          const img = await loadCachedImage(path);
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

    async function drawImage(x, y, width, height, imgPath, zIndex = 0, options = {}) {
      const image = {
        id: nextDrawableId++,
        type: "image",
        x,
        y,
        width,
        height,
        zIndex,
        parent: null,
        requireParent: !(options && options.noParent),
        children: [],
        useAbsolute: true,
        relx: options.relx || 0,
        rely: options.rely || 0,
        relw: options.relw || width,
        relh: options.relh || height,
        img: null,
        loaded: false,
        visible: true,
        getRect() {
          const coords = this.useAbsolute ? { x: this.x, y: this.y, width: this.width, height: this.height } : getAbsoluteCoords(this);
          return normalToCanvasRect(coords.x, coords.y, coords.width, coords.height);
        },
        render() {
          if (!this.loaded || !this.visible) return;
          const rect = this.getRect();
          ctx.drawImage(this.img, rect.x, rect.y, rect.width, rect.height);
        },
        contains(normalX, normalY) {
          const coords = this.useAbsolute ? { x: this.x, y: this.y, width: this.width, height: this.height } : getAbsoluteCoords(this);
          return (
            normalX >= coords.x &&
            normalX <= coords.x + coords.width &&
            normalY >= coords.y &&
            normalY <= coords.y + coords.height
          );
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
            setTimeout(() => {
              renderScene();
            }, 1);
          }
          return this;
        },
        removeChild(child) {
          const idx = this.children.indexOf(child);
          if (idx !== -1) {
            this.children.splice(idx, 1);
            child.parent = null;
            renderScene();
          }
          return this;
        },
        setRelativePos(relx, rely, relw, relh) {
          this.relx = relx;
          this.rely = rely;
          this.relw = relw;
          this.relh = relh;
          this.useAbsolute = false;
          renderScene();
          return this;
        },
      };

      async function loadImageAsset(path) {
          image.img = await loadCachedImage(path);
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

      // Only include root drawables that do NOT require a parent.
      const roots = drawables.filter((d) => !isChild(d) && !d.requireParent).slice();
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
        // ignore buttons that require a parent but don't have one
        if (button.requireParent && !button.parent) {
          if (button.isHover) {
            button.isHover = false;
            try { if (typeof button.onHoverEnd === 'function') button.onHoverEnd(event); } catch (e) { console.error('onHoverEnd handler failed', e); }
            needsRender = true;
          }
          return;
        }
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
            canvas.style.cursor = 'default';
            break;
          }
        }
      }
    });


















    let mainpageui = {};
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = "high";
    lobby.mainimg = await drawImage(0, 0, 1, 1, "/systemfiles/runtime/apps/zm/assets/zm.png", -1, { noParent: true });
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
      mainpageui.xdksoverlay = await drawImage(0, 0, 1, 1, "/systemfiles/runtime/apps/zm/assets/blackbackground.png", 1, {noParent: true});
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
          if (clickedPayload[0] === clickedPayload[1]) clickedPayload.pop();
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
      playSoundEffect("/systemfiles/runtime/apps/zm/assets/4_SD_xz.mp3");
      showxdksUI();
    });

    lobby.mainimg.addChild(lobby.xdksbtn);





    // dqcd
    mainpageui.dqcdui = null;
    lobby.dqcdbtn = await drawButton(0.793,0.63,0.112,0.058,"/systemfiles/runtime/apps/zm/assets/dqcd.png","/systemfiles/runtime/apps/zm/assets/dqcd1.png", async (options = {}) => {
      playSoundEffect("/systemfiles/runtime/apps/zm/assets/4_SD_xz.mp3");
      if (mainpageui.dqcdui) {return;}
      disableOtherToolbarBtns(lobby.dqcdbtn);
      mainpageui.dqcdui = await drawImage(0.2,0.15,0.63,0.72,"/systemfiles/runtime/apps/zm/assets/dqcdUI2.png");
    lobby.dqcdbtn.addChild(mainpageui.dqcdui);
      if (options.addcd) {mainpageui.dqcdui.parent.parent.bringToFrontRel();}
      let closeBtn = await drawButton(0.77,0.775,0.04,0.063,"/systemfiles/runtime/apps/zm/assets/dqcdX.png","/systemfiles/runtime/apps/zm/assets/dqcdXHover.png", () => {
        mainpageui.dqcdui.remove();
        mainpageui.dqcdui = null;
        enableOtherToolbarBtns(lobby.dqcdbtn);
      }, 1);
      mainpageui.dqcdui.addChild(closeBtn);
      let ht = 0.267;
      let vt = -0.132;
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
        const baseY = 0.53; // Adjusted base Y position for the first CD
        const cdW = 0.254;    // Width of each CD
        const cdH = 0.112;    // Height of each CD

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
    });
    lobby.mainimg.addChild(lobby.dqcdbtn);



  let curminimap = null;
  async function enterGame(zmcd, cdIndex) {
    lobby.mainimg.setVisible(false);
    eval(await window.protectedGlobals.ReadFile("/systemfiles/runtime/apps/zm/inGame.js", { text: true, direct: true }), cdIndex);
    continueInGame(zmcd, cdIndex);
  }
  (async () => {
  eval(await window.protectedGlobals.ReadFile("/systemfiles/runtime/apps/zm/displayItemTooltip.js", { text: true, direct: true }));
  })();
















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
    data.lhValue = 11000; // 1852823430;
    data.bagzbsaveobject = [
      {
        name: "ptdyyc",
        player: 1,
        qhLevel: 6,
        remakeLevel: 4,
        defense2: 0.98,
        gainHPfromEntity: 0.3,
        attack: 8, HP: 1111, MP: 1111, defense: 1111, level: 15, ROC: 2.5, wx: [true, true, false, false, false], CHC: 0.11, MISS: 0.22, HPHeal: 1111, MPHeal: 1111
      },
      {
        name: "ptdyyc",
        player: 1,
        attack: 8,
        qhLevel: 7,
        remakeLevel: 5
      },      {
        name: "ptdyyc",
        player: 1,
        attack: 8
      },      {
        name: "ptdyyc",
        player: 1,
        attack: 8
      },      {
        name: "ptdyyc",
        player: 1,
        attack: 8
      },      {
        name: "ptdyyc",
        player: 1,
        attack: 8
      },      {
        name: "ptdyyc",
        player: 1,
        attack: 8
      },      {
        name: "ptdyyc",
        player: 1,
        attack: 8
      },      {
        name: "ptdyyc",
        player: 1,
        attack: 8
      },      {
        name: "ptdyyc",
        player: 1,
        attack: 8
      },      {
        name: "ptdyyc",
        player: 1,
        attack: 8
      },      {
        name: "ptdyyc",
        player: 1,
        attack: 8
      },      {
        name: "ptdyyc",
        player: 1,
        attack: 8
      },      {
        name: "ptdyyc",
        player: 1,
        attack: 8
      },      {
        name: "ptdyyc",
        player: 1,
        attack: 8
      },      {
        name: "ptdyyc",
        player: 1,
        attack: 8
      },      {
        name: "ptdyyc",
        player: 1,
        attack: 8
      },      {
        name: "ptdyyc",
        player: 1,
        attack: 8
      },      {
        name: "ptdyyc",
        player: 1,
        attack: 8
      },      {
        name: "ptdyyc",
        player: 1,
        attack: 8
      },      {
        name: "ptdyyc",
        player: 1,
        attack: 8
      },      {
        name: "ptdyyc",
        player: 1,
        attack: 8
      },      {
        name: "ptdyyc",
        player: 1,
        attack: 8
      },      {
        name: "ptdyyc",
        player: 1,
        attack: 8
      },      {
        name: "ptdyyc",
        player: 1,
        attack: 8
      },      {
        name: "ptdyyc",
        player: 1,
        attack: 8
      },      {
        name: "ptdyyc",
        player: 1,
        attack: 8
      },      {
        name: "ptdyyc",
        player: 1,
        attack: 8
      },      {
        name: "ptdyyc",
        player: 1,
        attack: 8
      },      {
        name: "ptdyyc",
        player: 1,
        attack: 8
      },      {
        name: "ptdyyc",
        player: 1,
        attack: 8
      },      {
        name: "ptdyyc",
        player: 1,
        attack: 8
      },      {
        name: "ptdyyc",
        player: 1,
        attack: 8
      },      {
        name: "ptdyyc",
        player: 1,
        attack: 8
      },      {
        name: "ptdyyc",
        player: 1,
        attack: 8
      },      {
        name: "ptdyyc",
        player: 1,
        attack: 8
      },      {
        name: "ptdyyc",
        player: 1,
        attack: 8
      },      {
        name: "ptdyyc",
        player: 1,
        attack: 8
      },      {
        name: "ptdyyc",
        player: 1,
        attack: 8
      },      {
        name: "ptdyyc",
        player: 1,
        attack: 8
      },      {
        name: "ptdyyc",
        player: 1,
        attack: 8
      },      {
        name: "ptdyyc",
        player: 1,
        attack: 8
      },      {
        name: "ptdyyc",
        player: 1,
        attack: 8
      },      {
        name: "ptdyyc",
        player: 1,
        attack: 8
      },      {
        name: "ptdyyc",
        player: 1,
        attack: 8
      },      {
        name: "ptdyyc",
        player: 1,
        attack: 8
      },      {
        name: "ptdyyc",
        player: 1,
        attack: 8
      },     
            {
        name: "ptdyyc",
        player: 1,
        qhLevel: 6,
        remakeLevel: 4,
        defense2: 0.98,
        gainHPfromEntity: 0.3,
        attack: 8, HP: 1111, MP: 1111, defense: 1111, level: 15, ROC: 2.5, wx: [true, true, false, false, false], CHC: 0.11, MISS: 0.22, HPHeal: 1111, MPHeal: 1111
      }, 
      {
        name: "ptdyyc",
        player: 1,
        attack: 8
      },      {
        name: "ptdyyc",
        player: 1,
        attack: 8
      },      {
        name: "ptdyyc",
        player: 1,
        attack: 8
      },      {
        name: "ptdyyc",
        player: 1,
        attack: 8
      },













      {
        name: "ptdyyc",
        player: 2,
        qhLevel: 6,
        remakeLevel: 4,
        defense2: 0.98,
        gainHPfromEntity: 0.3,
        attack: 8, HP: 1111, MP: 1111, defense: 1111, level: 15, ROC: 2.5, wx: [true, true, false, false, false], CHC: 0.11, MISS: 0.22, HPHeal: 1111, MPHeal: 1111
      },
      {
        name: "ptdyyc",
        player: 2,
        attack: 8,
        qhLevel: 7,
        remakeLevel: 5
      },      {
        name: "ptdyyc",
        player: 2,
        attack: 8,
        qhLevel: 0,
        remakeLevel: 1
      },{
        name: "ptdyyc",
        player: 2,
        attack: 8,
        qhLevel: 0,
        remakeLevel: 1
      },{
        name: "ptdyyc",
        player: 2,
        attack: 8,
        qhLevel: 0,
        remakeLevel: 1
      },{
        name: "ptdyyc",
        player: 2,
        attack: 8,
        qhLevel: 0,
        remakeLevel: 1
      },{
        name: "ptdyyc",
        player: 2,
        attack: 8,
        qhLevel: 0,
        remakeLevel: 1
      },{
        name: "ptdyyc",
        player: 2,
        attack: 8,
        qhLevel: 0,
        remakeLevel: 1
      },{
        name: "ptdyyc",
        player: 2,
        attack: 8,
        qhLevel: 0,
        remakeLevel: 1
      },{
        name: "ptdyyc",
        player: 2,
        attack: 8,
        qhLevel: 0,
        remakeLevel: 1
      },{
        name: "ptdyyc",
        player: 2,
        attack: 8,
        qhLevel: 0,
        remakeLevel: 1
      },{
        name: "ptdyyc",
        player: 2,
        attack: 8,
        qhLevel: 0,
        remakeLevel: 1
      },{
        name: "ptdyyc",
        player: 2,
        attack: 8,
        qhLevel: 0,
        remakeLevel: 1
      },{
        name: "ptdyyc",
        player: 2,
        attack: 8,
        qhLevel: 0,
        remakeLevel: 1
      },{
        name: "ptdyyc",
        player: 2,
        attack: 8,
        qhLevel: 0,
        remakeLevel: 1
      },{
        name: "ptdyyc",
        player: 2,
        attack: 8,
        qhLevel: 0,
        remakeLevel: 1
      },{
        name: "ptdyyc",
        player: 2,
        attack: 8,
        qhLevel: 0,
        remakeLevel: 1
      },{
        name: "ptdyyc",
        player: 2,
        attack: 8,
        qhLevel: 0,
        remakeLevel: 1
      },{
        name: "ptdyyc",
        player: 2,
        attack: 8,
        qhLevel: 0,
        remakeLevel: 1
      },{
        name: "ptdyyc",
        player: 2,
        attack: 8,
        qhLevel: 0,
        remakeLevel: 1
      },{
        name: "ptdyyc",
        player: 2,
        attack: 8,
        qhLevel: 0,
        remakeLevel: 1
      },{
        name: "ptdyyc",
        player: 2,
        attack: 8,
        qhLevel: 0,
        remakeLevel: 1
      },{
        name: "ptdyyc",
        player: 2,
        attack: 8,
        qhLevel: 0,
        remakeLevel: 1
      },{
        name: "ptdyyc",
        player: 2,
        attack: 8,
        qhLevel: 0,
        remakeLevel: 1
      },{
        name: "ptdyyc",
        player: 2,
        attack: 8,
        qhLevel: 0,
        remakeLevel: 1
      },{
        name: "ptdyyc",
        player: 2,
        attack: 8,
        qhLevel: 0,
        remakeLevel: 1
      },{
        name: "ptdyyc",
        player: 2,
        attack: 8,
        qhLevel: 0,
        remakeLevel: 1
      },{
        name: "ptdyyc",
        player: 2,
        attack: 8,
        qhLevel: 0,
        remakeLevel: 1
      },{
        name: "ptdyyc",
        player: 2,
        attack: 8,
        qhLevel: 0,
        remakeLevel: 1
      },{
        name: "ptdyyc",
        player: 2,
        attack: 8,
        qhLevel: 0,
        remakeLevel: 1
      },{
        name: "ptdyyc",
        player: 2,
        attack: 8,
        qhLevel: 0,
        remakeLevel: 1
      },{
        name: "ptdyyc",
        player: 2,
        attack: 8,
        qhLevel: 0,
        remakeLevel: 1
      },{
        name: "ptdyyc",
        player: 2,
        attack: 8,
        qhLevel: 0,
        remakeLevel: 1
      },{
        name: "ptdyyc",
        player: 2,
        attack: 8,
        qhLevel: 0,
        remakeLevel: 1
      },{
        name: "ptdyyc",
        player: 2,
        attack: 8,
        qhLevel: 0,
        remakeLevel: 1
      },{
        name: "ptdyyc",
        player: 2,
        attack: 8,
        qhLevel: 0,
        remakeLevel: 1
      },{
        name: "ptdyyc",
        player: 2,
        attack: 8,
        qhLevel: 0,
        remakeLevel: 1
      },{
        name: "ptdyyc",
        player: 2,
        attack: 8,
        qhLevel: 0,
        remakeLevel: 1
      },{
        name: "ptdyyc",
        player: 2,
        attack: 8,
        qhLevel: 0,
        remakeLevel: 1
      },{
        name: "ptdyyc",
        player: 2,
        attack: 8,
        qhLevel: 0,
        remakeLevel: 1
      },{
        name: "ptdyyc",
        player: 2,
        attack: 8,
        qhLevel: 0,
        remakeLevel: 1
      },{
        name: "ptdyyc",
        player: 2,
        attack: 8,
        qhLevel: 0,
        remakeLevel: 1
      },{
        name: "ptdyyc",
        player: 2,
        attack: 8,
        qhLevel: 0,
        remakeLevel: 1
      },{
        name: "ptdyyc",
        player: 2,
        attack: 8,
        qhLevel: 0,
        remakeLevel: 1
      },{
        name: "ptdyyc",
        player: 2,
        attack: 8,
        qhLevel: 0,
        remakeLevel: 1
      },{
        name: "ptdyyc",
        player: 2,
        attack: 8,
        qhLevel: 0,
        remakeLevel: 1
      },{
        name: "ptdyyc",
        player: 2,
        attack: 8,
        qhLevel: 0,
        remakeLevel: 1
      },{
        name: "ptdyyc",
        player: 2,
        attack: 8,
        qhLevel: 0,
        remakeLevel: 1
      },{
        name: "ptdyyc",
        player: 2,
        attack: 8,
        qhLevel: 0,
        remakeLevel: 1
      },{
        name: "ptdyyc",
        player: 2,
        attack: 8,
        qhLevel: 0,
        remakeLevel: 1
      },{
        name: "ptdyyc",
        player: 2,
        attack: 8,
        qhLevel: 0,
        remakeLevel: 1
      }
    ];
    data.bagdjsaveobject = [
      {
        name: "1qhs",
        player: 1,
        cnt: 8
      },
     {
        name: "2qhs",
        player: 1,
        cnt: 5
      },      {
        name: "1qhs",
        player: 2,
        cnt: 80
      },
     {
        name: "2qhs",
        player: 2,
        cnt: 50
      }
    ];
    data.bagszsaveobject = [];
    data.bagjssaveobject = [];
    return { ok: true, content: data };
  }











  window.protectedGlobals.apptools.api.trackInstance(instance, "zm");
  let origclose = instance.closeWindow;
  instance.closeWindow = () => {
    stopAllMusic();
    console.log('stopped');
    origclose();
  };
  return instance;
};
