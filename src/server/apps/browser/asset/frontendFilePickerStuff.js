         // ----------------------------
        // 1. Make treeData global
        // ----------------------------
        let sentreqframe = null;

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

          const data = await window.protectedGlobals.filePost({
            requestFile: true,
            requestFileName: fileFullPath,
            username,
          });

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

        function deliverVfsPayload(targetFrame, payload) {
          if (!targetFrame) return;
          if (targetFrame.__gbReceiveVfsPayload) {
            targetFrame.__gbReceiveVfsPayload(payload);
          }
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
                const chunkData = await window.protectedGlobals.filePost({
                  requestFile: true,
                  requestFileName: fullPath,
                  chunkIndex: i,
                  username,
                });
                chunkBuf = base64ToArrayBuffer(chunkData.filecontent);
              }

              await new Promise((resolve) => {
                deliverVfsPayload(iframe.contentWindow, {
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
                });
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
                  deliverVfsPayload(iframe.contentWindow, {
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
                  });
                  setTimeout(resolve, 10);
                });
              }
            } else {
              deliverVfsPayload(iframe.contentWindow, {
                __VFS__: true,
                kind: "file",
                name: node[0],
                type,
                buffer,
                path: fullPath,
                webkitRelativePath,
                lastOne: lastOne,
              });
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
                  const cd = await window.protectedGlobals.filePost({
                    requestFile: true,
                    requestFileName: file.fullPath,
                    chunkIndex: ci,
                    username,
                  });
                  chunkBuf = base64ToArrayBuffer(cd.filecontent);
                }
                await new Promise((resolve) => {
                  deliverVfsPayload(iframe.contentWindow, {
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
                  });
                  setTimeout(resolve, 10);
                });
              }
            } else {
              // Add delay between messages to prevent packet loss
              await new Promise((resolve) => {
                deliverVfsPayload(iframe.contentWindow, {
                  __VFS__: true,
                  kind: "file",
                  name: file.name,
                  type,
                  buffer,
                  webkitRelativePath: file.fullPath,
                  fileIndex: fileIndex - 1,
                  totalFiles: filesToSend.length,
                  lastOne: fileIndex == filesToSend.length && lastOne,
                });
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

         window.browserGlobals.showOpenFilePicker = function (frameWin) {
                  sentreqframe = resolveRequestFrame(frameWin) || sentreqframe;
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
              if (sentreqframe && sentreqframe.__gbReceiveVfsPayload) {
                sentreqframe.__gbReceiveVfsPayload({
                  __VFS__: true,
                  kind: "pickerCancelled",
                });
              }
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
            return window.browserGlobals.showOpenFilePicker(frameWin);
          }

          return new Promise((res) => (pickerOverlay.resolvePicker = res));
        }

        // ----------------------------
        // 3b. Custom save-as overlay
        // ----------------------------
        let post = window.protectedGlobals.filePost;
        function openCustomSaveUI(frameWin, suggestedName) {
          sentreqframe = frameWin || sentreqframe;
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
            deliverVfsPayload(sentreqframe && sentreqframe.contentWindow, {
              __VFS__: true,
              kind: "saveTarget",
              path: null,
            });
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
            deliverVfsPayload(sentreqframe && sentreqframe.contentWindow, {
              __VFS__: true,
              kind: "saveTarget",
              path: chosen,
            });

            overlay.remove();
          };
        }

        // ----------------------------
        // 3c. Custom directory picker overlay
        // ----------------------------
        function openCustomDirectoryPickerUI(frameWin) {
          sentreqframe = frameWin || sentreqframe;
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
            deliverVfsPayload(sentreqframe && sentreqframe.contentWindow, {
              __VFS__: true,
              kind: "directoryTarget",
              path: null,
              treeNode: null,
            });
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
              deliverVfsPayload(sentreqframe.contentWindow, {
                __VFS__: true,
                kind: "directoryTarget",
                path: chosen,
                treeNode: selectedNode,
              });

              // send each file as fileData
              for (const f of filesToSend) {
                const buffer =
                  f.contents instanceof ArrayBuffer
                    ? f.contents
                    : new TextEncoder().encode(f.contents).buffer; // convert string to ArrayBuffer

                deliverVfsPayload(sentreqframe.contentWindow, {
                  __VFS__: true,
                  kind: "fileData",
                  path: f.path,
                  name: f.path.split("/").pop(),
                  type: "text/plain",
                  buffer,
                });
              }
            }

            overlay.remove();
          };
        }

        function resolveRequestFrame(frameWinArg) {
          if (!frameWinArg) return null;
          try {
            const eventLike = { source: frameWinArg };
            const found = recurseFrames(document, eventLike);
            if (found) return found;
          } catch (e) {}
          try {
            return frameWinArg.frameElement || null;
          } catch (e) {
            return null;
          }
        }

        window.browserGlobals.showSaveFilePicker = function (frameWinArg, options = {}) {
          sentreqframe = resolveRequestFrame(frameWinArg);
          openCustomSaveUI(sentreqframe, options.suggestedName);
        };

        window.browserGlobals.showDirectoryPicker = function (frameWinArg) {
          sentreqframe = resolveRequestFrame(frameWinArg);
          openCustomDirectoryPickerUI(sentreqframe);
        };

        window.browserGlobals.requestFileForFrame = async function (frameWinArg, request = {}) {
          sentreqframe = resolveRequestFrame(frameWinArg);
          const targetWindow = sentreqframe && sentreqframe.contentWindow;
          if (!targetWindow) return;

          const requestedPath = request.path;
          const requestedName = request.name || (requestedPath ? requestedPath.split("/").pop() : "file");
          const fileResult = await fetchFileContent(username, requestedPath);

          let fileBuffer = null;
          if (typeof fileResult === "string") {
            fileBuffer = base64ToArrayBuffer(fileResult);
          } else if (fileResult && fileResult.totalChunks && fileResult.totalChunks > 1) {
            const chunks = [];
            for (let i = 0; i < fileResult.totalChunks; i++) {
              if (i === 0) {
                chunks.push(base64ToArrayBuffer(fileResult.filecontent));
                continue;
              }
              const chunkData = await window.protectedGlobals.filePost({
                requestFile: true,
                requestFileName: requestedPath,
                chunkIndex: i,
                username,
              });
              chunks.push(base64ToArrayBuffer(chunkData.filecontent));
            }
            const totalBytes = chunks.reduce((sum, chunk) => sum + (chunk ? chunk.byteLength : 0), 0);
            const merged = new Uint8Array(totalBytes);
            let offset = 0;
            for (const chunk of chunks) {
              const view = new Uint8Array(chunk);
              merged.set(view, offset);
              offset += view.byteLength;
            }
            fileBuffer = merged.buffer;
          } else {
            fileBuffer = fileResult;
          }

          deliverVfsPayload(targetWindow, {
            __VFS__: true,
            kind: "fileData",
            path: requestedPath,
            name: requestedName,
            type: getMimeType(requestedName),
            buffer: fileBuffer,
          });
        };

window.browserGlobals.handleVfsSaveFile = function (sourceWindow, data) {
  if (!data || data.__VFS__ !== true) return Promise.resolve();
  if (data.kind !== "saveFile" && data.kind !== "saveFileAbort") {
    return Promise.resolve();
  }

  const MAX_INLINE_BASE64 = 250 * 1024 * 1024;
  const CHUNK_SIZE = 10 * 1024 * 1024;

  const rootRef = window;
  rootRef.__pendingSaves = rootRef.__pendingSaves || {};

  const incomingPath = data.path || data.name || "unnamed";
  const fullPath = incomingPath.startsWith("root/")
    ? incomingPath
    : "root/" + incomingPath;

  if (!rootRef.__pendingSaves[fullPath]) {
    rootRef.__pendingSaves[fullPath] = {
      chunks: [],
      source: sourceWindow,
      queue: Promise.resolve(),
      finalizing: false,
      aborted: false,
    };
  }

  const entry = rootRef.__pendingSaves[fullPath];
  if (sourceWindow) entry.source = sourceWindow;

  function normalizeToUint8Array(input) {
    try {
      if (!input) return null;
      if (
        input instanceof ArrayBuffer ||
        Object.prototype.toString.call(input) === "[object ArrayBuffer]"
      ) {
        return new Uint8Array(input);
      }
      if (ArrayBuffer.isView(input)) {
        return new Uint8Array(input.buffer, input.byteOffset, input.byteLength);
      }
      return null;
    } catch (err) {
      return null;
    }
  }

  function toBase64(uint8) {
    let binary = "";
    const chunkSize = 0x8000;
    for (let i = 0; i < uint8.length; i += chunkSize) {
      const sub = uint8.subarray(i, i + chunkSize);
      binary += String.fromCharCode(...sub);
    }
    return btoa(binary);
  }

  async function run() {
    try {
      if (entry.aborted) return;
      if (data.kind === "saveFileAbort") {
        entry.aborted = true;
        entry.chunks = [];
        delete rootRef.__pendingSaves[fullPath];
        return;
      }

      if (entry.finalizing) return;

      let chunk = null;
      if (data.buffer) {
        chunk = normalizeToUint8Array(data.buffer);
      } else if (data.base64) {
        try {
          const binary = atob(data.base64);
          const len = binary.length;
          const bytes = new Uint8Array(len);
          for (let i = 0; i < len; i++) {
            bytes[i] = binary.charCodeAt(i);
          }
          chunk = bytes;
        } catch (err) {
          console.warn("Invalid base64 chunk");
        }
      }

      if (chunk && chunk.byteLength > 0) {
        entry.chunks.push(chunk);
      } else if (data.buffer || data.base64) {
        console.warn("Skipped invalid chunk", data);
      }

      if (!data.lastOne) return;

      entry.finalizing = true;

      const validChunks = entry.chunks.filter((c) => c && c.byteLength > 0);
      if (validChunks.length === 0) {
        throw new Error("No valid chunks received");
      }

      const totalBytes = validChunks.reduce((sum, c) => sum + c.byteLength, 0);

      let combined;
      if (validChunks.length === 1) {
        combined = validChunks[0];
      } else {
        combined = new Uint8Array(totalBytes);
        let offset = 0;
        for (const c of validChunks) {
          combined.set(c, offset);
          offset += c.byteLength;
        }
      }

      if (totalBytes <= MAX_INLINE_BASE64) {
        const base64 = toBase64(combined);
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
        const total = Math.ceil(totalBytes / CHUNK_SIZE);
        await post({
          saveSnapshot: true,
          directions: [
            { addFile: true, path: fullPath, replace: true },
            { end: true },
          ],
        });

        let presentSet = new Set();
        try {
          const chk = await post({
            saveSnapshot: true,
            directions: [
              { checkParts: true, path: fullPath },
              { end: true },
            ],
          });
          const present = chk?.result?.checkParts?.[fullPath] || [];
          presentSet = new Set(present);
        } catch (err) {}

        const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

        async function uploadChunk(path, base64, index, total) {
          let attempts = 0;
          while (attempts < 3) {
            try {
              await post({
                saveSnapshot: true,
                directions: [
                  { edit: true, path, chunk: base64, index, total },
                  { end: true },
                ],
              });
              return;
            } catch (err) {
              attempts++;
              await sleep(500 * Math.pow(2, attempts));
            }
          }
          throw new Error("Chunk upload failed: " + index);
        }

        for (let i = 0; i < total; i++) {
          if (presentSet.has(i)) continue;
          const start = i * CHUNK_SIZE;
          const end = Math.min(totalBytes, start + CHUNK_SIZE);
          const slice = combined.subarray(start, end);
          const base64 = toBase64(slice);
          await uploadChunk(fullPath, base64, i, total);
        }

        await post({
          saveSnapshot: true,
          directions: [
            { edit: true, path: fullPath, finalize: true },
            { end: true },
          ],
        });
      }

      deliverVfsPayload(entry.source, {
        __VFS__: true,
        kind: "saved",
        path: incomingPath,
        ok: true,
      });
    } catch (err) {
      console.error("saveFile handling error", err);
      deliverVfsPayload(entry.source, {
        __VFS__: true,
        kind: "saved",
        path: incomingPath,
        ok: false,
        error: err?.message || String(err),
      });
    } finally {
      if (entry.finalizing || entry.aborted) {
        delete rootRef.__pendingSaves[fullPath];
      }
    }
  }

  entry.queue = entry.queue.then(run, run);
  return entry.queue;
};