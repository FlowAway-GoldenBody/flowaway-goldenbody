         // ----------------------------
        // 1. Make treeData global
        // ----------------------------
        let sentreqframe;

        window.protectedGlobals.onlyloadTree();

        let fullPath;
        function getSessionAuthHeaders() {
          const headers = { "Content-Type": "application/json" };
          const token =
            window.protectedGlobals.data &&
            typeof window.protectedGlobals.data.authToken === "string"
              ? window.protectedGlobals.data.authToken.trim()
              : "";
          if (token) headers.Authorization = "Bearer " + token;
          return headers;
        }
        // Fetch file content from backend
        async function fetchFileContent(username, fileFullPath) {
          if (!fileFullPath) throw new Error("No file path provided");

          const res = await fetch(window.protectedGlobals.SERVER, {
            method: "POST",
            headers: getSessionAuthHeaders(),
            body: JSON.stringify({
              requestFile: true,
              requestFileName: fileFullPath, // send path relative to root
              username,
            }),
          });

          const data = await res.json();

          if (data.kind === "folder") {
            throw new Error(
              `Expected a file but got a folder at ${fileFullPath}`,
            );
          }

          // For large files, fetch all chunks and combine directly as ArrayBuffer
          if (data.totalChunks && data.totalChunks > 1) {
            // Return chunk metadata and first-chunk payload (base64) to caller so
            // caller can stream chunks instead of allocating a single huge buffer.
            return data; // { filecontent, fileSize, totalChunks }
          }

          // For small files, still return base64 from single request
          return data.filecontent;
        }

        function base64ToArrayBuffer(base64) {
          const binaryString = atob(base64);
          const len = binaryString.length;
          const bytes = new Uint8Array(len);
          for (let i = 0; i < len; i++) {
            bytes[i] = binaryString.charCodeAt(i);
          }
          return bytes.buffer;
        }
        function getMimeType(filename) {
          const ext = filename.split(".").pop().toLowerCase();

          const mimeMap = {
            // Images
            png: "image/png",
            jpg: "image/jpeg",
            jpeg: "image/jpeg",
            gif: "image/gif",
            webp: "image/webp",
            svg: "image/svg+xml",
            bmp: "image/bmp",
            ico: "image/x-icon",

            // Audio
            mp3: "audio/mpeg",
            wav: "audio/wav",
            ogg: "audio/ogg",
            m4a: "audio/mp4",

            // Video
            mp4: "video/mp4",
            webm: "video/webm",
            ogv: "video/ogg",

            // Text
            txt: "text/plain",
            html: "text/html",
            css: "text/css",
            js: "application/javascript",
            json: "application/json",
            xml: "application/xml",

            // Archives
            zip: "application/zip",
            rar: "application/vnd.rar",
            gz: "application/gzip",

            // PDF
            pdf: "application/pdf",
          };

          return mimeMap[ext] || "application/octet-stream";
        }

        // Send file to iframe
        async function sendFileNodeToIframe(
          username,
          node,
          iframe,
          lastOne = false,
        ) {
          let currentPath = [...pickerCurrentPath];
          currentPath.splice(0, 1);
          const fullPath =
            node[2].path || currentPath.join("/") + "/" + node[0];
          const result = await fetchFileContent(username, fullPath);

          // If server returned chunk metadata for a large file, stream chunks
          const isChunked =
            result &&
            typeof result === "object" &&
            result.totalChunks &&
            result.totalChunks > 1;
          // Handle both base64 strings and ArrayBuffers (small-file fast path)
          const buffer =
            !isChunked && typeof result === "string"
              ? base64ToArrayBuffer(result)
              : !isChunked
                ? result
                : null;
          const type = getMimeType(node[0]);
          // Compute a webkitRelativePath-like relative path for the file so the
          // injector can reconstruct directory structure (remove picker base)
          const fileParts = (fullPath || "").split("/").filter(Boolean);
          const origPicker = Array.from(pickerCurrentPath || []);
          const pickerBase = origPicker.slice(1); // drop leading 'root'
          // remove matching leading segments
          let relParts = Array.from(fileParts);
          for (let i = 0; i < pickerBase.length; i++) {
            if (relParts.length && relParts[0] === pickerBase[i])
              relParts.shift();
            else break;
          }
          const webkitRelativePath = relParts.join("/") || node[0];

          // Send in chunks if large to avoid postMessage size limits
          // Use larger chunks to reduce number of messages, add delays between sends
          const MAX_MESSAGE_SIZE = 50 * 1024 * 1024; // 50MB per message (reduced from 100MB)
          if (isChunked) {
            const CHUNK_SIZE = 10 * 1024 * 1024; // server chunk size
            const totalChunks = result.totalChunks;

            for (let i = 0; i < totalChunks; i++) {
              // obtain chunk: first chunk provided inline as base64, others fetched
              let chunkBuf;
              if (i === 0) {
                chunkBuf = base64ToArrayBuffer(result.filecontent);
              } else {
                const r = await fetch(window.protectedGlobals.SERVER, {
                  method: "POST",
                  headers: getSessionAuthHeaders(),
                  body: JSON.stringify({
                    requestFile: true,
                    requestFileName: fullPath,
                    chunkIndex: i,
                    username,
                  }),
                });
                const chunkData = await r.json();
                chunkBuf = base64ToArrayBuffer(chunkData.filecontent);
              }

              await new Promise((resolve) => {
                iframe.contentWindow.postMessage(
                  {
                    __VFS__: true,
                    kind: "file",
                    name: node[0],
                    type,
                    buffer: chunkBuf,
                    path: fullPath,
                    webkitRelativePath,
                    chunkIndex: i,
                    totalChunks,
                    lastOne: i === totalChunks - 1 && lastOne,
                  },
                  "*",
                  [chunkBuf],
                );
                setTimeout(resolve, 10);
              });
            }
          } else {
            if (buffer && buffer.byteLength > MAX_MESSAGE_SIZE) {
              const chunkSize = MAX_MESSAGE_SIZE;
              const totalChunks = Math.ceil(buffer.byteLength / chunkSize);
              for (let i = 0; i < totalChunks; i++) {
                const start = i * chunkSize;
                const end = Math.min(start + chunkSize, buffer.byteLength);
                const chunk = buffer.slice(start, end);
                await new Promise((resolve) => {
                  iframe.contentWindow.postMessage(
                    {
                      __VFS__: true,
                      kind: "file",
                      name: node[0],
                      type,
                      buffer: chunk,
                      path: fullPath,
                      webkitRelativePath,
                      chunkIndex: i,
                      totalChunks,
                      lastOne: i === totalChunks - 1 && lastOne,
                    },
                    "*",
                    [chunk],
                  );
                  setTimeout(resolve, 10);
                });
              }
            } else {
              iframe.contentWindow.postMessage(
                {
                  __VFS__: true,
                  kind: "file",
                  name: node[0],
                  type,
                  buffer,
                  path: fullPath,
                  webkitRelativePath,
                  lastOne: lastOne,
                },
                "*",
                [buffer],
              );
            }
          }
        }

        async function sendFolderNodeToIframe(
          username,
          folderNode,
          iframe,
          lastOne = false,
        ) {
          const filesToSend = [];

          function walk(node, prefix = "") {
            const [name, children] = node;

            // If node has a precomputed path use it; otherwise build from prefix
            let nodePath;
            if (node && node[2] && node[2].path) {
              nodePath = node[2].path;
            } else {
              nodePath = prefix ? prefix + "/" + name : name;
              console.warn(
                "VFS: computed missing node.path for",
                name,
                "->",
                nodePath,
              );
            }

            if (children === null) {
              filesToSend.push({
                name,
                fullPath: nodePath,
              });
              return;
            }

            if (Array.isArray(children)) {
              const nextPrefix = nodePath;
              for (const child of children) {
                walk(child, nextPrefix);
              }
            }
          }

          walk(folderNode);
          let fileIndex = 0;
          // 2️⃣ Fetch + send each file with throttling to prevent packet loss
          for (const file of filesToSend) {
            fileIndex++;
            const result = await fetchFileContent(username, file.fullPath);
            const isChunked =
              result &&
              typeof result === "object" &&
              result.totalChunks &&
              result.totalChunks > 1;
            const buffer =
              !isChunked && typeof result === "string"
                ? base64ToArrayBuffer(result)
                : !isChunked
                  ? result
                  : null;
            const type = getMimeType(file.name);
            let fileParts = file.fullPath.split("/");
            let origpickercurrentpath = Array.from(pickerCurrentPath);
            pickerCurrentPath.splice(0, 1);
            let pickerparts = pickerCurrentPath;
            pickerCurrentPath = origpickercurrentpath;
            for (let j = 0; j < pickerparts.length; j++) {
              if (fileParts[0] === pickerparts[j]) {
                fileParts.splice(0, 1);
              }
            }
            file.fullPath = "";
            let first = true;
            for (let j = 0; j < fileParts.length; j++) {
              if (first) {
                first = false;
                file.fullPath += fileParts[j];
              } else {
                file.fullPath += "/" + fileParts[j];
              }
            }

            if (isChunked) {
              const totalChunks = result.totalChunks;
              for (let ci = 0; ci < totalChunks; ci++) {
                let chunkBuf;
                if (ci === 0)
                  chunkBuf = base64ToArrayBuffer(result.filecontent);
                else {
                  const r = await fetch(window.protectedGlobals.SERVER, {
                    method: "POST",
                    headers: getSessionAuthHeaders(),
                    body: JSON.stringify({
                      requestFile: true,
                      requestFileName: file.fullPath,
                      chunkIndex: ci,
                      username,
                    }),
                  });
                  const cd = await r.json();
                  chunkBuf = base64ToArrayBuffer(cd.filecontent);
                }
                await new Promise((resolve) => {
                  iframe.contentWindow.postMessage(
                    {
                      __VFS__: true,
                      kind: "file",
                      name: file.name,
                      type,
                      buffer: chunkBuf,
                      webkitRelativePath: file.fullPath,
                      fileIndex: fileIndex - 1,
                      totalFiles: filesToSend.length,
                      chunkIndex: ci,
                      totalChunks,
                      lastOne:
                        fileIndex == filesToSend.length &&
                        ci === totalChunks - 1 &&
                        lastOne,
                    },
                    "*",
                    [chunkBuf],
                  );
                  setTimeout(resolve, 10);
                });
              }
            } else {
              // Add delay between messages to prevent packet loss
              await new Promise((resolve) => {
                iframe.contentWindow.postMessage(
                  {
                    __VFS__: true,
                    kind: "file",
                    name: file.name,
                    type,
                    buffer,
                    webkitRelativePath: file.fullPath,
                    fileIndex: fileIndex - 1,
                    totalFiles: filesToSend.length,
                    lastOne: fileIndex == filesToSend.length && lastOne,
                  },
                  "*",
                  [buffer],
                );
                setTimeout(resolve, 10);
              });
            }
          }
        }

        // ----------------------------
        // 3. Custom picker overlay
        // ----------------------------
        let pickerOverlay = null;
        let pickerSelection = [];
        let pickerCurrentPath = ["root"];
        let pickerTree = null;

        function getPickerTheme() {
          if (browserGlobals.dark) {
            return {
              panelBg: "#1f1f1f",
              panelText: "#e8e8e8",
              border: "#3a3a3a",
              muted: "#a8a8a8",
              inputBg: "#121212",
              inputText: "#f2f2f2",
              buttonBg: "#2a2a2a",
              buttonText: "#e8e8e8",
              selectedBg: "#2f5f9f",
              hoverBg: "#2a2a2a",
            };
          }
          return {
            panelBg: "#ffffff",
            panelText: "#111111",
            border: "#d0d7de",
            muted: "#666666",
            inputBg: "#ffffff",
            inputText: "#111111",
            buttonBg: "#f3f4f6",
            buttonText: "#111111",
            selectedBg: "#d0e6ff",
            hoverBg: "#f4f7ff",
          };
        }

        function stylePickerButton(button, theme, isPrimary = false) {
          Object.assign(button.style, {
            borderRadius: "6px",
            border: isPrimary
              ? "1px solid #4c8bf5"
              : `1px solid ${theme.border}`,
            padding: "6px 12px",
            cursor: "pointer",
            background: isPrimary ? "#4c8bf5" : theme.buttonBg,
            color: isPrimary ? "#ffffff" : theme.buttonText,
          });
        }

        function stylePickerDialogBox(
          box,
          theme,
          width = "60%",
          height = "60%",
        ) {
          Object.assign(box.style, {
            position: "fixed",
            zIndex: "1000000",
            left: "20%",
            top: "10%",
            width: width,
            height: height,
            minWidth: "420px",
            minHeight: "320px",
            maxWidth: "100vw",
            maxHeight: "100vh",
            borderRadius: "8px",
            resize: "both",
            background: theme.panelBg,
            color: theme.panelText,
            border: `1px solid ${theme.border}`,
            display: "flex",
            flexDirection: "column",
            overflow: "hidden",
            boxSizing: "border-box",
            boxShadow: "0 20px 60px rgba(0,0,0,.45)",
          });
        }

        function makePickerDialogDraggable(box, dragHandle) {
          if (!box || !dragHandle) return;
          dragHandle.style.cursor = "move";
          dragHandle.style.userSelect = "none";
          dragHandle.style.touchAction = "none";

          let dragging = false;
          let startX = 0;
          let startY = 0;
          let originLeft = 0;
          let originTop = 0;

          const move = (ev) => {
            if (!dragging) return;
            const dx = ev.clientX - startX;
            const dy = ev.clientY - startY;
            const rect = box.getBoundingClientRect();
            const maxLeft = Math.max(0, window.innerWidth - rect.width);
            const maxTop = Math.max(0, window.innerHeight - rect.height);
            const nextLeft = Math.min(maxLeft, Math.max(0, originLeft + dx));
            const nextTop = Math.min(maxTop, Math.max(0, originTop + dy));
            box.style.left = nextLeft + "px";
            box.style.top = nextTop + "px";
          };

          const up = () => {
            if (!dragging) return;
            dragging = false;
            document.removeEventListener("pointermove", move);
            document.removeEventListener("pointerup", up);
          };

          dragHandle.addEventListener("pointerdown", (ev) => {
            if (ev.button !== 0) return;
            if (
              ev.target?.closest?.(
                "button, input, select, textarea, a, [role='button']",
              )
            )
              return;
            ev.preventDefault();
            const rect = box.getBoundingClientRect();
            box.style.transform = "";
            box.style.left = rect.left + "px";
            box.style.top = rect.top + "px";
            box.style.position = "fixed";
            startX = ev.clientX;
            startY = ev.clientY;
            originLeft = rect.left;
            originTop = rect.top;
            dragging = true;
            document.addEventListener("pointermove", move);
            document.addEventListener("pointerup", up);
          });
        }

 window.browserGlobals.showOpenFilePicker = function () {
          if (!window.protectedGlobals.treeData) {
            window.protectedGlobals.onlyloadTree();
          }

          pickerTree = JSON.parse(
            JSON.stringify(window.protectedGlobals.treeData),
          );
          pickerCurrentPath = ["root"];
          pickerSelection = [];

          // Create overlay if it doesn't exist
          if (!pickerOverlay) {
            const theme = getPickerTheme();
            pickerOverlay = document.createElement("div");
            document.body.appendChild(pickerOverlay);

            const pickerBox = document.createElement("div");
            pickerBox.className = "pickerBox";
            pickerBox.style.resize = "both";
            stylePickerDialogBox(pickerBox, theme);
            pickerOverlay.appendChild(pickerBox);
            root.tabIndex = "0";

            const titleBar = document.createElement("div");
            titleBar.textContent = "Open File or Folder";
            Object.assign(titleBar.style, {
              padding: "8px 10px",
              fontWeight: "600",
              borderBottom: `1px solid ${theme.border}`,
            });
            pickerBox.appendChild(titleBar);
            makePickerDialogDraggable(pickerBox, titleBar);

            const breadcrumbDiv = document.createElement("div");
            Object.assign(breadcrumbDiv.style, {
              padding: "6px 10px",
              borderBottom: `1px solid ${theme.border}`,
            });
            pickerBox.appendChild(breadcrumbDiv);

            const fileArea = document.createElement("div");
            fileArea.style.flex = "1";
            fileArea.style.overflowY = "auto";
            fileArea.style.background = theme.panelBg;
            pickerBox.appendChild(fileArea);

            const btnBar = document.createElement("div");
            btnBar.style.padding = "8px";
            btnBar.style.display = "flex";
            btnBar.style.gap = "8px";
            btnBar.style.justifyContent = "flex-end";
            btnBar.style.borderTop = `1px solid ${theme.border}`;
            pickerBox.appendChild(btnBar);

            const btnCancel = document.createElement("button");
            btnCancel.textContent = "Cancel";
            stylePickerButton(btnCancel, theme, false);
            btnBar.appendChild(btnCancel);

            const btnOpen = document.createElement("button");
            btnOpen.textContent = "Open";
            stylePickerButton(btnOpen, theme, true);
            btnBar.appendChild(btnOpen);

            function renderPicker() {
              breadcrumbDiv.innerHTML = "";
              pickerCurrentPath.forEach((p, i) => {
                const span = document.createElement("span");
                span.textContent = i === 0 ? "Home" : " / " + p;
                span.style.cursor = "pointer";
                span.onclick = () => {
                  pickerCurrentPath = pickerCurrentPath.slice(0, i + 1);
                  renderPicker();
                };
                breadcrumbDiv.appendChild(span);
              });

              fileArea.innerHTML = "";
              let node = pickerTree;
              for (let i = 1; i < pickerCurrentPath.length; i++) {
                node = node[1].find((c) => c[0] === pickerCurrentPath[i]);
              }
              if (!node || !node[1]) return;

              node[1].forEach((item) => {
                const div = document.createElement("div");
                div.textContent =
                  (Array.isArray(item[1]) ? "📁 " : "📄 ") + item[0];
                div.style.padding = "6px 10px";
                div.style.cursor = "pointer";
                div.style.borderBottom = `1px solid ${theme.border}`;
                div.onclick = (e) => {
                  const isToggle = e.ctrlKey || e.metaKey;

                  if (!isToggle) {
                    // single select
                    pickerSelection = [item];
                    fileArea
                      .querySelectorAll("div")
                      .forEach((d) => (d.style.background = ""));
                    div.style.background = theme.selectedBg;
                  } else {
                    // toggle select
                    const idx = pickerSelection.indexOf(item);
                    if (idx >= 0) {
                      pickerSelection.splice(idx, 1);
                      div.style.background = "";
                    } else {
                      pickerSelection.push(item);
                      div.style.background = theme.selectedBg;
                    }
                  }
                };
                div.onmouseenter = () => {
                  if (pickerSelection.includes(item)) return;
                  div.style.background = theme.hoverBg;
                };
                div.onmouseleave = () => {
                  if (pickerSelection.includes(item)) return;
                  div.style.background = "";
                };

                if (Array.isArray(item[1])) {
                  div.ondblclick = () => {
                    pickerCurrentPath.push(item[0]);
                    renderPicker();
                  };
                }
                fileArea.appendChild(div);
              });
            }

            renderPicker();

            // Cancel / Open buttons
            let resolvePicker;
            pickerOverlay.resolvePicker = null;

            pickerOverlay.resolvePicker = null; // define it at the start

            btnCancel.onclick = () => {
              if (pickerOverlay.resolvePicker) {
                pickerOverlay.resolvePicker([]); // resolve promise with empty selection
                pickerOverlay.resolvePicker = null;
              }
              try {
                if (sentreqframe && sentreqframe.contentWindow) {
                  sentreqframe.contentWindow.postMessage(
                    { __VFS__: true, kind: "pickerCancelled" },
                    "*",
                  );
                }
              } catch (e) {}
              pickerOverlay.remove();
              pickerOverlay = null;
              pickerSelection = null;
            };
            btnOpen.onclick = async () => {
              const selections = [...pickerSelection]; // snapshot immediately
              const targetFrame = sentreqframe; // snapshot iframe

              if (!selections.length)
                return window.protectedGlobals.notification(
                  "Select a file or folder",
                );
              if (!targetFrame) {
                console.warn("No iframe found");
                return;
              }

              // remove picker
              if (pickerOverlay.resolvePicker) {
                pickerOverlay.resolvePicker(selections);
                pickerOverlay.resolvePicker = null;
              }
              pickerOverlay.remove();
              pickerOverlay = null;
              pickerSelection = [];

              // send all selections
              let i = 0;
              for (const sel of selections) {
                i++;
                if (Array.isArray(sel[1])) {
                  if (i == selections.length) {
                    await sendFolderNodeToIframe(
                      username,
                      sel,
                      targetFrame,
                      true,
                    );
                    continue;
                  }
                  await sendFolderNodeToIframe(username, sel, targetFrame);
                } else {
                  if (i == selections.length) {
                    await sendFileNodeToIframe(
                      username,
                      sel,
                      targetFrame,
                      true,
                    );
                    continue;
                  }
                  await sendFileNodeToIframe(username, sel, targetFrame);
                }
              }
            };
          } else {
            pickerOverlay.remove();
            pickerOverlay = null;
            return openCustomPickerUI();
          }

          return new Promise((res) => (pickerOverlay.resolvePicker = res));
        }

        // ----------------------------
        // 3b. Custom save-as overlay
        // ----------------------------
        let post = window.protectedGlobals.filePost;
        function openCustomSaveUI(suggestedName) {
          if (!window.protectedGlobals.treeData) {
            window.protectedGlobals.onlyloadTree();
          }

          const theme = getPickerTheme();

          const savePickerTree = JSON.parse(
            JSON.stringify(window.protectedGlobals.treeData || {}),
          );
          let savePickerCurrentPath = ["root"];
          let savePickerSelection = [];

          const overlay = document.createElement("div");
          document.body.appendChild(overlay);

          const box = document.createElement("div");
          stylePickerDialogBox(box, theme);
          overlay.appendChild(box);

          const titleBar = document.createElement("div");
          titleBar.textContent = "Save File";
          Object.assign(titleBar.style, {
            padding: "8px 10px",
            fontWeight: "600",
            borderBottom: `1px solid ${theme.border}`,
          });
          box.appendChild(titleBar);
          makePickerDialogDraggable(box, titleBar);

          const breadcrumb = document.createElement("div");
          Object.assign(breadcrumb.style, {
            padding: "6px 10px",
            borderBottom: `1px solid ${theme.border}`,
          });
          box.appendChild(breadcrumb);
          const fileArea = document.createElement("div");
          fileArea.style.flex = "1";
          fileArea.style.overflowY = "auto";
          fileArea.style.background = theme.panelBg;
          box.appendChild(fileArea);

          const row = document.createElement("div");
          row.style.padding = "8px";
          row.style.display = "flex";
          row.style.gap = "8px";
          row.style.borderTop = `1px solid ${theme.border}`;
          box.appendChild(row);
          const nameInput = document.createElement("input");
          Object.assign(nameInput.style, {
            flex: "1",
            padding: "6px",
            borderRadius: "6px",
            border: `1px solid ${theme.border}`,
            background: theme.inputBg,
            color: theme.inputText,
          });
          nameInput.placeholder = "filename.txt";
          nameInput.value = suggestedName || "";
          row.appendChild(nameInput);

          const btnBar = document.createElement("div");
          btnBar.style.padding = "6px";
          btnBar.style.display = "flex";
          btnBar.style.gap = "8px";
          btnBar.style.justifyContent = "flex-end";
          btnBar.style.borderTop = `1px solid ${theme.border}`;
          box.appendChild(btnBar);
          const btnCancel = document.createElement("button");
          btnCancel.textContent = "Cancel";
          stylePickerButton(btnCancel, theme, false);
          btnBar.appendChild(btnCancel);
          const btnSave = document.createElement("button");
          btnSave.textContent = "Save";
          stylePickerButton(btnSave, theme, true);
          btnBar.appendChild(btnSave);

          function render() {
            breadcrumb.innerHTML = "";
            savePickerCurrentPath.forEach((p, i) => {
              const s = document.createElement("span");
              s.textContent = i === 0 ? "Home" : " / " + p;
              s.style.cursor = "pointer";
              s.onclick = () => {
                savePickerCurrentPath = savePickerCurrentPath.slice(0, i + 1);
                render();
              };
              breadcrumb.appendChild(s);
            });
            fileArea.innerHTML = "";
            let node = savePickerTree;
            for (let i = 1; i < savePickerCurrentPath.length; i++) {
              if (!node || !node[1]) break;
              node = node[1].find((c) => c[0] === savePickerCurrentPath[i]);
            }
            if (!node || !node[1]) return;
            node[1].forEach((item) => {
              const div = document.createElement("div");
              div.textContent =
                (Array.isArray(item[1]) ? "📁 " : "📄 ") + item[0];
              div.style.padding = "6px";
              div.style.cursor = "pointer";
              div.style.borderBottom = `1px solid ${theme.border}`;
              div.onclick = (e) => {
                const isToggle = e.ctrlKey || e.metaKey;
                if (!isToggle) {
                  savePickerSelection = [item];
                  fileArea
                    .querySelectorAll("div")
                    .forEach((d) => (d.style.background = ""));
                  div.style.background = theme.selectedBg;
                } else {
                  const idx = savePickerSelection.indexOf(item);
                  if (idx >= 0) {
                    savePickerSelection.splice(idx, 1);
                    div.style.background = "";
                  } else {
                    savePickerSelection.push(item);
                    div.style.background = theme.selectedBg;
                  }
                }
              };
              div.onmouseenter = () => {
                if (savePickerSelection.includes(item)) return;
                div.style.background = theme.hoverBg;
              };
              div.onmouseleave = () => {
                if (savePickerSelection.includes(item)) return;
                div.style.background = "";
              };
              if (Array.isArray(item[1]))
                div.ondblclick = () => {
                  savePickerCurrentPath.push(item[0]);
                  render();
                };
              fileArea.appendChild(div);
            });
          }

          render();

          btnCancel.onclick = () => {
            try {
              if (sentreqframe && sentreqframe.contentWindow) {
                sentreqframe.contentWindow.postMessage(
                  { __VFS__: true, kind: "saveTarget", path: null },
                  "*",
                );
              }
            } catch (e) {}
            overlay.remove();
          };

          btnSave.onclick = () => {
            const selections = [...savePickerSelection];
            const basePath = savePickerCurrentPath.slice(1).join("/");
            const fname = (nameInput.value || "").trim();
            if (!fname) {
              window.protectedGlobals.notification("Enter a filename");
              return;
            }
            let chosen;
            if (!selections.length)
              chosen = basePath ? basePath + "/" + fname : fname;
            else {
              const sel = selections[0];
              const isFolder = Array.isArray(sel[1]);
              if (isFolder) chosen = (basePath ? basePath + "/" : "") + fname;
              else
                window.protectedGlobals.notification(
                  "Select a folder to save into",
                );
            }

            // send response to requesting iframe
            try {
              if (sentreqframe && sentreqframe.contentWindow) {
                sentreqframe.contentWindow.postMessage(
                  { __VFS__: true, kind: "saveTarget", path: chosen },
                  "*",
                );
              }
            } catch (e) {}

            overlay.remove();
          };
        }

        // ----------------------------
        // 3c. Custom directory picker overlay
        // ----------------------------
        function openCustomDirectoryPickerUI() {
          if (!window.protectedGlobals.treeData) {
            window.protectedGlobals.onlyloadTree();
          }

          const theme = getPickerTheme();

          const dirPickerTree = JSON.parse(
            JSON.stringify(window.protectedGlobals.treeData || {}),
          );
          let dirPickerCurrentPath = ["root"];
          let dirPickerSelectionPaths = [];

          const overlay = document.createElement("div");
          document.body.appendChild(overlay);

          const box = document.createElement("div");
          stylePickerDialogBox(box, theme);
          overlay.appendChild(box);

          const titleBar = document.createElement("div");
          titleBar.textContent = "Select Directory";
          Object.assign(titleBar.style, {
            padding: "8px 10px",
            fontWeight: "600",
            borderBottom: `1px solid ${theme.border}`,
          });
          box.appendChild(titleBar);
          makePickerDialogDraggable(box, titleBar);

          const breadcrumb = document.createElement("div");
          Object.assign(breadcrumb.style, {
            padding: "6px 10px",
            borderBottom: `1px solid ${theme.border}`,
          });
          box.appendChild(breadcrumb);
          const fileArea = document.createElement("div");
          fileArea.style.flex = "1";
          fileArea.style.overflowY = "auto";
          fileArea.style.background = theme.panelBg;
          box.appendChild(fileArea);

          const infoRow = document.createElement("div");
          infoRow.style.padding = "6px";
          infoRow.style.fontSize = "12px";
          infoRow.style.color = theme.muted;
          infoRow.style.borderTop = `1px solid ${theme.border}`;
          infoRow.textContent = "Select a folder";
          box.appendChild(infoRow);

          const btnBar = document.createElement("div");
          btnBar.style.padding = "6px";
          btnBar.style.display = "flex";
          btnBar.style.gap = "8px";
          btnBar.style.justifyContent = "flex-end";
          btnBar.style.borderTop = `1px solid ${theme.border}`;
          box.appendChild(btnBar);
          const btnCancel = document.createElement("button");
          btnCancel.textContent = "Cancel";
          stylePickerButton(btnCancel, theme, false);
          btnBar.appendChild(btnCancel);
          const btnOpen = document.createElement("button");
          btnOpen.textContent = "Select";
          stylePickerButton(btnOpen, theme, true);
          btnBar.appendChild(btnOpen);

          function render() {
            breadcrumb.innerHTML = "";
            dirPickerCurrentPath.forEach((p, i) => {
              const s = document.createElement("span");
              s.textContent = i === 0 ? "Home" : " / " + p;
              s.style.cursor = "pointer";
              s.onclick = () => {
                dirPickerCurrentPath = dirPickerCurrentPath.slice(0, i + 1);
                render();
              };
              breadcrumb.appendChild(s);
            });
            fileArea.innerHTML = "";
            let node = dirPickerTree;
            for (let i = 1; i < dirPickerCurrentPath.length; i++) {
              if (!node || !node[1]) break;
              node = node[1].find((c) => c[0] === dirPickerCurrentPath[i]);
            }
            if (!node || !node[1]) return;
            node[1].forEach((item) => {
              const isFolder = Array.isArray(item[1]);
              const currentBasePath = dirPickerCurrentPath.slice(1).join("/");
              const itemPath = currentBasePath
                ? currentBasePath + "/" + item[0]
                : item[0];
              const div = document.createElement("div");
              div.textContent = (isFolder ? "📁 " : "📄 ") + item[0];
              div.style.padding = "6px";
              div.style.cursor = "pointer";
              div.style.borderBottom = `1px solid ${theme.border}`;
              div.onclick = (e) => {
                // Only allow selecting folders
                if (isFolder) {
                  const isToggle = e.ctrlKey || e.metaKey;
                  if (!isToggle) {
                    dirPickerSelectionPaths = [itemPath];
                    fileArea
                      .querySelectorAll("div")
                      .forEach((d) => (d.style.background = ""));
                    div.style.background = theme.selectedBg;
                  } else {
                    const idx = dirPickerSelectionPaths.indexOf(itemPath);
                    if (idx >= 0) {
                      dirPickerSelectionPaths.splice(idx, 1);
                      div.style.background = "";
                    } else {
                      dirPickerSelectionPaths.push(itemPath);
                      div.style.background = theme.selectedBg;
                    }
                  }
                }
              };
              div.onmouseenter = () => {
                if (!isFolder || dirPickerSelectionPaths.includes(itemPath))
                  return;
                div.style.background = theme.hoverBg;
              };
              div.onmouseleave = () => {
                if (!isFolder || dirPickerSelectionPaths.includes(itemPath))
                  return;
                div.style.background = "";
              };
              if (isFolder && dirPickerSelectionPaths.includes(itemPath)) {
                div.style.background = theme.selectedBg;
              }
              if (isFolder) {
                div.ondblclick = () => {
                  dirPickerCurrentPath.push(item[0]);
                  render();
                };
              }
              fileArea.appendChild(div);
            });
          }

          render();

          btnCancel.onclick = () => {
            try {
              if (sentreqframe && sentreqframe.contentWindow) {
                sentreqframe.contentWindow.postMessage(
                  {
                    __VFS__: true,
                    kind: "directoryTarget",
                    path: null,
                    treeNode: null,
                  },
                  "*",
                );
              }
            } catch (e) {}
            overlay.remove();
          };

          btnOpen.onclick = () => {
            const basePath = dirPickerCurrentPath.slice(1).join("/") || "root";
            let chosen =
              dirPickerSelectionPaths.length > 0
                ? dirPickerSelectionPaths[0]
                : basePath;

            // Find the actual tree node for the selected path
            let selectedNode = dirPickerTree;
            const pathParts = chosen
              .split("/")
              .filter((p) => p && p !== "root");
            for (const part of pathParts) {
              if (!selectedNode || !selectedNode[1]) break;
              selectedNode = selectedNode[1].find((c) => c[0] === part);
            }

            if (!selectedNode) {
              window.protectedGlobals.notification(
                "Selected directory not found",
              );
              return;
            }

            // --- NEW: recursively gather files in the directory ---
            function collectFiles(node, currentPath) {
              const files = [];
              if (!node || !Array.isArray(node[1])) return files;
              for (const item of node[1]) {
                const [name, child] = item;
                const itemPath = currentPath ? currentPath + "/" + name : name;
                if (Array.isArray(child)) {
                  // folder → recurse
                  files.push(...collectFiles(item, itemPath));
                } else {
                  // file → add as base64 string (or empty placeholder if contents not loaded)
                  files.push({ path: itemPath, contents: child || "" });
                }
              }
              return files;
            }

            const filesToSend = collectFiles(selectedNode, chosen);

            // send directory info
            if (sentreqframe && sentreqframe.contentWindow) {
              sentreqframe.contentWindow.postMessage(
                {
                  __VFS__: true,
                  kind: "directoryTarget",
                  path: chosen,
                  treeNode: selectedNode,
                },
                "*",
              );

              // send each file as fileData
              for (const f of filesToSend) {
                const buffer =
                  f.contents instanceof ArrayBuffer
                    ? f.contents
                    : new TextEncoder().encode(f.contents).buffer; // convert string to ArrayBuffer

                sentreqframe.contentWindow.postMessage(
                  {
                    __VFS__: true,
                    kind: "fileData",
                    path: f.path,
                    name: f.path.split("/").pop(),
                    type: "text/plain",
                    buffer,
                  },
                  "*",
                );
              }
            }

            overlay.remove();
          };
        }

window.addEventListener(
            "browser" + root._goldenbodyId,
            "message",
            (e) => {
              try {
                // Allow `saveFile` messages to be processed even when the browser root
                // doesn't have focus. Previously the OR made the whole condition true
                // whenever a saveFile arrived, causing the handler to return early.
                const isSaveFile =
                  e.data?.__VFS__ && e.data.kind === "saveFile";
                if (
                  (!root || !root.contains(document.activeElement)) &&
                  !isSaveFile
                )
                  return;
              } catch (e) {
                return;
              }
              if (e.data?.__VFS__ && e.data.kind === "requestPicker") {
                openCustomPickerUI();
                debugger;
                sentreqframe = recurseFrames(document, e);
              }
              if (e.data?.__VFS__ && e.data.kind === "requestSavePicker") {
                // open save-as UI and record requesting frame
                openCustomSaveUI(e.data.suggestedName);
                sentreqframe = recurseFrames(document, e);
              }
              if (e.data?.__VFS__ && e.data.kind === "requestDirectoryPicker") {
                // open directory picker UI and record requesting frame
                openCustomDirectoryPickerUI();
                sentreqframe = recurseFrames(document, e);
              }
              if (e.data?.__VFS__ && e.data.kind === "saveFile") {
                try {
                  // Robust save handling that mirrors file-manager upload behaviour.
                  const MAX_INLINE_BASE64 = 250 * 1024 * 1024; // 250MB
                  const CHUNK_SIZE = 10 * 1024 * 1024; // 10MB

                  // pendingSaves stores { chunks: [ArrayBuffer], bytes: number, source: MessageEvent.source }
                  root.__pendingSaves = root.__pendingSaves || {};

                  const incomingPath = e.data.path || e.data.name || "unnamed";
                  const fullPath = incomingPath.startsWith("root/")
                    ? incomingPath
                    : "root/" + incomingPath;

                  // Ensure entry
                  if (!root.__pendingSaves[fullPath]) {
                    root.__pendingSaves[fullPath] = {
                      chunks: [],
                      bytes: 0,
                      source: e.source,
                    };
                  }

                  const entry = root.__pendingSaves[fullPath];
                  // Accept either raw ArrayBuffer in `buffer` or base64 string in `base64`.
                  if (e.data.buffer) {
                    // Normalize to ArrayBuffer
                    const ab =
                      e.data.buffer instanceof ArrayBuffer
                        ? e.data.buffer
                        : e.data.buffer.buffer;
                    entry.chunks.push(ab);
                    entry.bytes += ab.byteLength || 0;
                    // Acknowledge receipt of this chunk so the writer can apply backpressure
                    try {
                      if (e.data._chunkId && e.source && e.source.postMessage) {
                        e.source.postMessage(
                          {
                            __VFS__: true,
                            kind: "chunkAck",
                            _chunkId: e.data._chunkId,
                            path: fullPath,
                          },
                          "*",
                        );
                      }
                    } catch (err) {
                      console.warn("failed to send chunkAck", err);
                    }
                  } else if (e.data.base64) {
                    // convert base64 to ArrayBuffer and store
                    const binary = atob(e.data.base64);
                    const len = binary.length;
                    const bytes = new Uint8Array(len);
                    for (let i = 0; i < len; i++)
                      bytes[i] = binary.charCodeAt(i);
                    entry.chunks.push(bytes.buffer);
                    entry.bytes += bytes.byteLength;
                  }

                  const finalize = !!e.data.lastOne;

                  if (!finalize) {
                    // waiting for more data
                    return;
                  }

                  // Assemble full ArrayBuffer
                  let totalBytes = entry.bytes;

                  // Debug: if totalBytes is zero but chunks exist, compute a fallback
                  if (
                    (!totalBytes || totalBytes === 0) &&
                    entry.chunks &&
                    entry.chunks.length
                  ) {
                    try {
                      const computed = entry.chunks.reduce((sum, c) => {
                        try {
                          return (
                            sum +
                            ((c &&
                              (c.byteLength ||
                                (c.byteLength === 0
                                  ? 0
                                  : new Uint8Array(c).byteLength))) ||
                              0)
                          );
                        } catch (e) {
                          return sum;
                        }
                      }, 0);
                      if (computed > 0) {
                        console.warn(
                          "VFS: computed totalBytes fallback",
                          fullPath,
                          computed,
                          "from",
                          entry.chunks.length,
                          "chunks",
                        );
                        totalBytes = computed;
                      }
                    } catch (err) {
                      console.warn(
                        "VFS: failed computing fallback totalBytes for",
                        fullPath,
                        err,
                      );
                    }
                  }

                  let combined;
                  if (entry.chunks.length === 1) {
                    combined = entry.chunks[0];
                  } else {
                    combined = new Uint8Array(totalBytes);
                    let offset = 0;
                    for (const c of entry.chunks) {
                      const arr = new Uint8Array(c);
                      combined.set(arr, offset);
                      offset += arr.length;
                    }
                    combined = combined.buffer;
                  }

                  // Helper to convert ArrayBuffer slice to base64
                  function arrayBufferToBase64(buffer) {
                    let binary = "";
                    const bytes = new Uint8Array(buffer);
                    const chunk = 0x8000;
                    for (let i = 0; i < bytes.length; i += chunk) {
                      const sub = bytes.subarray(i, i + chunk);
                      binary += String.fromCharCode.apply(null, sub);
                    }
                    return btoa(binary);
                  }

                  (async () => {
                    try {
                      if (totalBytes <= MAX_INLINE_BASE64) {
                        const base64 = arrayBufferToBase64(combined);
                        await post({
                          saveSnapshot: true,
                          directions: [
                            {
                              edit: true,
                              path: fullPath,
                              contents: base64,
                              replace: true,
                            },
                            { end: true },
                          ],
                        });
                      } else {
                        // Large file: chunk it with the same buffered strategy
                        const total = Math.ceil(totalBytes / CHUNK_SIZE);

                        // ensure file placeholder
                        await post({
                          saveSnapshot: true,
                          directions: [
                            { addFile: true, path: fullPath, replace: true },
                            { end: true },
                          ],
                        });

                        // Optionally check existing parts (skip for now)

                        // Check which parts already exist on server (resume support)
                        let presentParts = [];
                        try {
                          const chk = await post({
                            saveSnapshot: true,
                            directions: [
                              { checkParts: true, path: fullPath },
                              { end: true },
                            ],
                          });
                          presentParts =
                            (chk &&
                              chk.result &&
                              chk.result.checkParts &&
                              chk.result.checkParts[fullPath]) ||
                            [];
                        } catch (e) {
                          presentParts = [];
                        }

                        const presentSet = new Set(presentParts);

                        const MAX_CHUNK_RETRIES = 3;
                        const CHUNK_RETRY_BASE_MS = 500;

                        function sleep(ms) {
                          return new Promise((r) => setTimeout(r, ms));
                        }

                        async function uploadChunkWithRetries(
                          path,
                          chunkBase64,
                          index,
                          total,
                        ) {
                          let attempts = 0;
                          while (true) {
                            try {
                              await post({
                                saveSnapshot: true,
                                directions: [
                                  {
                                    edit: true,
                                    path,
                                    chunk: chunkBase64,
                                    index,
                                    total,
                                  },
                                  { end: true },
                                ],
                              });
                              return;
                            } catch (err) {
                              attempts++;
                              if (attempts > MAX_CHUNK_RETRIES) throw err;
                              const backoff =
                                CHUNK_RETRY_BASE_MS * Math.pow(2, attempts - 1);
                              await sleep(backoff);
                            }
                          }
                        }

                        let uploadedCount = presentSet.size;
                        for (let i = 0; i < total; i++) {
                          if (presentSet.has(i)) continue; // already uploaded
                          const start = i * CHUNK_SIZE;
                          const end = Math.min(totalBytes, start + CHUNK_SIZE);
                          const slice = combined.slice(start, end);
                          const chunkBase64 = arrayBufferToBase64(slice);
                          try {
                            await uploadChunkWithRetries(
                              fullPath,
                              chunkBase64,
                              i,
                              total,
                            );
                            uploadedCount++;
                          } catch (err) {
                            console.error(
                              `Failed to upload chunk ${i} for ${fullPath}:`,
                              err,
                            );
                            throw err;
                          }
                        }

                        // finalize
                        await post({
                          saveSnapshot: true,
                          directions: [
                            { edit: true, path: fullPath, finalize: true },
                            { end: true },
                          ],
                        });
                      }

                      // ACK back to source
                      try {
                        e.source.postMessage(
                          {
                            __VFS__: true,
                            kind: "saved",
                            path: incomingPath,
                            ok: true,
                          },
                          "*",
                        );
                      } catch (err) {}
                    } catch (err) {
                      console.error("saveFile handling error", err);
                      try {
                        e.source.postMessage(
                          {
                            __VFS__: true,
                            kind: "saved",
                            path: incomingPath,
                            ok: false,
                            error: (err && err.message) || String(err),
                          },
                          "*",
                        );
                      } catch (err) {}
                    } finally {
                      // cleanup
                      delete root.__pendingSaves[fullPath];
                    }
                  })();
                } catch (err) {
                  console.error("saveFile outer error", err);
                }
              }
            },
          );