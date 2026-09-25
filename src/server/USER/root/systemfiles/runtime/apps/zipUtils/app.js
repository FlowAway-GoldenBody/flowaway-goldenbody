"use strict";

const api = window.__goldenbodyAPI;

const state = {
    busy: false
};

/* =========================================================
   BASIC HELPERS
========================================================= */

function el(tag, props = {}, children = []) {
    const node = document.createElement(tag);

    for (const [key, value] of Object.entries(props)) {
        if (key === "style") {
            Object.assign(node.style, value);
        } else if (key === "className") {
            node.className = value;
        } else if (key === "textContent") {
            node.textContent = value;
        } else if (key.startsWith("on") && typeof value === "function") {
            node.addEventListener(
                key.substring(2).toLowerCase(),
                value
            );
        } else {
            node[key] = value;
        }
    }

    for (const child of children) {
        if (child) node.appendChild(child);
    }

    return node;
}

function basename(path) {
    return String(path)
        .split("/")
        .filter(Boolean)
        .pop() || "";
}

function dirname(path) {
    const parts = String(path)
        .split("/")
        .filter(Boolean);

    parts.pop();

    return "/" + parts.join("/");
}

function joinPath(...parts) {
    return parts
        .join("/")
        .replace(/\/+/g, "/")
        .replace(/^\.\//, "");
}

function normalizeArchivePath(path) {
    let p = String(path || "")
        .replace(/\\/g, "/");

    p = p.replace(/^\/+/, "");

    const parts = [];

    for (const part of p.split("/")) {
        if (!part || part === ".") {
            continue;
        }

        if (part === "..") {
            if (parts.length) {
                parts.pop();
            }

            continue;
        }

        parts.push(part);
    }

    return parts.join("/");
}

function formatBytes(bytes) {
    if (bytes < 1024) {
        return `${bytes} B`;
    }

    const units = ["KB", "MB", "GB", "TB"];

    let value = bytes;
    let unit = -1;

    while (
        value >= 1024 &&
        unit < units.length - 1
    ) {
        value /= 1024;
        unit++;
    }

    return `${value.toFixed(value >= 100 ? 0 : 1)} ${units[unit]}`;
}

function setStatus(message, type = "normal") {
    api.setInstanceTitle(message);
    status.textContent = message;

    if (type === "error") {
        status.style.color = "#ff6b6b";
    } else if (type === "success") {
        status.style.color = "#4ade80";
    } else {
        status.style.color = "#b9c2d0";
    }
}

function waitForUI() {
    return new Promise(resolve => setTimeout(resolve, 0));
}

/* =========================================================
   CRC32
========================================================= */

const CRC_TABLE = new Uint32Array(256);

(function buildCRC32Table() {
    for (let i = 0; i < 256; i++) {
        let c = i;

        for (let j = 0; j < 8; j++) {
            c = (c & 1)
                ? (0xedb88320 ^ (c >>> 1))
                : (c >>> 1);
        }

        CRC_TABLE[i] = c >>> 0;
    }
})();

function crc32(bytes) {
    let crc = 0xffffffff;

    for (let i = 0; i < bytes.length; i++) {
        crc =
            CRC_TABLE[(crc ^ bytes[i]) & 0xff] ^
            (crc >>> 8);
    }

    return (crc ^ 0xffffffff) >>> 0;
}

/* =========================================================
   BINARY HELPERS
========================================================= */

function u16(value) {
    const buffer = new Uint8Array(2);
    const view = new DataView(buffer.buffer);

    view.setUint16(0, value, true);

    return buffer;
}

function u32(value) {
    const buffer = new Uint8Array(4);
    const view = new DataView(buffer.buffer);

    view.setUint32(0, value >>> 0, true);

    return buffer;
}

function concatBytes(...arrays) {
    let total = 0;

    for (const array of arrays) {
        total += array.length;
    }

    const result = new Uint8Array(total);

    let offset = 0;

    for (const array of arrays) {
        result.set(array, offset);
        offset += array.length;
    }

    return result;
}

function textBytes(text) {
    return new TextEncoder().encode(text);
}

function decodeUTF8(bytes) {
    return new TextDecoder("utf-8", {
        fatal: false
    }).decode(bytes);
}

/* =========================================================
   ZIP STRUCTURES
========================================================= */

function createLocalHeader(nameBytes, crc, size) {
    return concatBytes(
        u32(0x04034b50),
        u16(20),
        u16(0),
        u16(0),
        u16(0),
        u16(0),
        u32(crc),
        u32(size),
        u32(size),
        u16(nameBytes.length),
        u16(0),
        nameBytes
    );
}

function createCentralHeader(
    nameBytes,
    crc,
    size,
    offset
) {
    return concatBytes(
        u32(0x02014b50),
        u16(20),
        u16(20),
        u16(0),
        u16(0),
        u16(0),
        u16(0),
        u32(crc),
        u32(size),
        u32(size),
        u16(nameBytes.length),
        u16(0),
        u16(0),
        u16(0),
        u16(0),
        u32(0),
        u32(offset),
        nameBytes
    );
}

function createEndRecord(
    entryCount,
    centralSize,
    centralOffset
) {
    return concatBytes(
        u32(0x06054b50),
        u16(0),
        u16(0),
        u16(entryCount),
        u16(entryCount),
        u32(centralSize),
        u32(centralOffset),
        u16(0)
    );
}

/* =========================================================
   FILE COLLECTION
========================================================= */

async function collectFolderFiles(folderHandle, relativePath = "") {
    const results = [];

    const entries = await api.readFolder(folderHandle, {
        detail: true
    });

    for (const entry of entries) {
        const name = entry.name || entry.path.split("/").pop();

        // THIS is the important part:
        const childPath = folderHandle.path + "/" + name;

        const childHandle = {
            path: childPath,
            key: folderHandle.key
        };

        const archivePath = relativePath
            ? relativePath + "/" + name
            : name;

        const isDirectory =
            entry.type === "folder" ||
            entry.type === "directory";

        if (isDirectory) {
            results.push({
                type: "directory",
                name: archivePath + "/"
            });

            const children = await collectFolderFiles(
                childHandle,
                archivePath
            );

            results.push(...children);
        } else {
            // Read the actual child using the constructed handle.
            results.push({
                type: "file",
                name: archivePath,
                handle: childHandle
            });
        }
    }

    return results;
}


/* =========================================================
   CREATE ZIP
========================================================= */

async function createZip(sourceHandle, sourceType) {
    const localParts = [];
    const centralParts = [];

    let offset = 0;
    let entryCount = 0;

    if (sourceType === "folder") {
        setStatus("Scanning folder...");

        const entries = await api.readFolder(sourceHandle, {
            detail: true
        });

        async function addFolderContents(
            folderHandle,
            relativePath = ""
        ) {
            const children = await api.readFolder(folderHandle, {
                detail: true
            });

            for (const entry of children) {
                const name =
                    entry.name ||
                    entry.path.split("/").filter(Boolean).pop();

                if (!name) {
                    continue;
                }

                /*
                 * IMPORTANT:
                 * Build the actual VFS path from the picker
                 * handle's path.
                 */
                const childPath =
                    folderHandle.path + "/" + name;

                /*
                 * Keep the original permission key.
                 */
                const childHandle = {
                    path: childPath,
                    key: folderHandle.key
                };

                const archivePath = relativePath
                    ? relativePath + "/" + name
                    : name;

                const isDirectory =
                    entry.type === "folder" ||
                    entry.type === "directory";

                if (isDirectory) {
                    /*
                     * Add an explicit directory entry.
                     */
                    const directoryName =
                        archivePath.endsWith("/")
                            ? archivePath
                            : archivePath + "/";

                    const nameBytes =
                        textBytes(directoryName);

                    const header =
                        createLocalHeader(
                            nameBytes,
                            0,
                            0
                        );

                    const centralHeader =
                        createCentralHeader(
                            nameBytes,
                            0,
                            0,
                            offset
                        );

                    localParts.push(header);
                    centralParts.push(centralHeader);

                    offset += header.length;
                    entryCount++;

                    await addFolderContents(
                        childHandle,
                        archivePath
                    );

                    continue;
                }

                /*
                 * THIS is the important fix.
                 *
                 * The file is read using:
                 *
                 * folderHandle.path + "/" + name
                 *
                 * with the folder's permission key.
                 */
                setStatus(
                    `Reading ${archivePath}...`
                );

                const fileResult =
                    await api.readFile(
                        childHandle,
                        {
                            buffer: true
                        }
                    );

                const data =
                    new Uint8Array(
                        fileResult.filecontent ||
                        fileResult
                    );

                const checksum =
                    crc32(data);

                const nameBytes =
                    textBytes(archivePath);

                const localHeader =
                    createLocalHeader(
                        nameBytes,
                        checksum,
                        data.length
                    );

                const centralHeader =
                    createCentralHeader(
                        nameBytes,
                        checksum,
                        data.length,
                        offset
                    );

                localParts.push(
                    localHeader,
                    data
                );

                centralParts.push(
                    centralHeader
                );

                offset +=
                    localHeader.length +
                    data.length;

                entryCount++;
            }
        }

        /*
         * Start from the ORIGINAL picker handle.
         *
         * Do not use entry.path as the base.
         */
        await addFolderContents(
            sourceHandle,
            ""
        );
    } else {
        /*
         * Single-file ZIP.
         */
        const name =
            basename(sourceHandle.path);

        setStatus(
            `Reading ${name}...`
        );

        const fileResult =
            await api.readFile(
                sourceHandle,
                {
                    buffer: true
                }
            );

        const data =
            new Uint8Array(
                fileResult.filecontent ||
                fileResult
            );

        const checksum =
            crc32(data);

        const nameBytes =
            textBytes(name);

        const localHeader =
            createLocalHeader(
                nameBytes,
                checksum,
                data.length
            );

        const centralHeader =
            createCentralHeader(
                nameBytes,
                checksum,
                data.length,
                offset
            );

        localParts.push(
            localHeader,
            data
        );

        centralParts.push(
            centralHeader
        );

        offset +=
            localHeader.length +
            data.length;

        entryCount = 1;
    }

    if (entryCount === 0) {
        throw new Error(
            "The selected folder is empty."
        );
    }

    const centralDirectory =
        concatBytes(
            ...centralParts
        );

    const centralOffset =
        offset;

    const endRecord =
        createEndRecord(
            centralParts.length,
            centralDirectory.length,
            centralOffset
        );

    const zipBytes =
        concatBytes(
            ...localParts,
            centralDirectory,
            endRecord
        );

    let suggestedName =
        basename(sourceHandle.path);

    if (!/\.zip$/i.test(suggestedName)) {
        suggestedName += ".zip";
    }

    setStatus(
        "Choose where to save the ZIP..."
    );

    const saveHandle =
        await api.showSaveFilePicker({
            suggestedName
        });

    if (!saveHandle) {
        throw new Error(
            "No destination file was selected."
        );
    }

    await api.writeFile(
        saveHandle,
        zipBytes.buffer,
        {
            replace: true
        }
    );

    return {
        entries: entryCount,
        bytes: zipBytes.byteLength
    };
}


/* =========================================================
   ZIP FILE PICKER
========================================================= */

async function zipFile() {
    if (state.busy) {
        return;
    }

    state.busy = true;
    updateButtons();

    try {
        /*
         * IMPORTANT:
         * This function ONLY calls showOpenFilePicker().
         * It never attempts the directory picker.
         */
        setStatus("Choose a file to ZIP...");

        const fileHandle =
            await api.showOpenFilePicker();

        if (!fileHandle) {
            throw new Error(
                "No file was selected."
            );
        }

        const result =
            await createZip(
                fileHandle,
                "file"
            );

        setStatus(
            `ZIP created successfully - ` +
            `${result.entries} file, ` +
            `${formatBytes(result.bytes)}.`,
            "success"
        );
    } catch (error) {
        console.error(error);

        setStatus(
            error?.message ||
            String(error),
            "error"
        );
    } finally {
        state.busy = false;
        updateButtons();
    }
}

/* =========================================================
   ZIP FOLDER PICKER
========================================================= */

async function zipFolder() {
    if (state.busy) {
        return;
    }

    state.busy = true;
    updateButtons();

    try {
        /*
         * IMPORTANT:
         * This function ONLY calls showDirectoryPicker().
         * It never attempts the file picker.
         */
        setStatus("Choose a folder to ZIP...");

        const folderHandle =
            await api.showDirectoryPicker();

        if (!folderHandle) {
            throw new Error(
                "No folder was selected."
            );
        }

        const result =
            await createZip(
                folderHandle,
                "folder"
            );

        setStatus(
            `ZIP created successfully - ` +
            `${result.entries} entries, ` +
            `${formatBytes(result.bytes)}.`,
            "success"
        );
    } catch (error) {
        console.error(error);

        setStatus(
            error?.message ||
            String(error),
            "error"
        );
    } finally {
        state.busy = false;
        updateButtons();
    }
}

/* =========================================================
   ZIP READER
========================================================= */

function findEndOfCentralDirectory(bytes) {
    const minimumSize = 22;
    const maximumComment = 0xffff;

    const start = Math.max(
        0,
        bytes.length -
        minimumSize -
        maximumComment
    );

    for (
        let i = bytes.length - minimumSize;
        i >= start;
        i--
    ) {
        if (
            bytes[i] === 0x50 &&
            bytes[i + 1] === 0x4b &&
            bytes[i + 2] === 0x05 &&
            bytes[i + 3] === 0x06
        ) {
            return i;
        }
    }

    return -1;
}

function parseZipCentralDirectory(bytes) {
    const eocd =
        findEndOfCentralDirectory(bytes);

    if (eocd < 0) {
        throw new Error(
            "This does not appear to be a valid ZIP file."
        );
    }

    const view =
        new DataView(
            bytes.buffer,
            bytes.byteOffset,
            bytes.byteLength
        );

    const count =
        view.getUint16(
            eocd + 10,
            true
        );

    const centralSize =
        view.getUint32(
            eocd + 12,
            true
        );

    const centralOffset =
        view.getUint32(
            eocd + 16,
            true
        );

    if (
        count === 0xffff ||
        centralSize === 0xffffffff ||
        centralOffset === 0xffffffff
    ) {
        throw new Error(
            "ZIP64 archives are not supported."
        );
    }

    const entries = [];

    let position = centralOffset;

    for (let i = 0; i < count; i++) {
        if (
            view.getUint32(
                position,
                true
            ) !== 0x02014b50
        ) {
            throw new Error(
                "Invalid ZIP central directory."
            );
        }

        const flags =
            view.getUint16(
                position + 8,
                true
            );

        const compression =
            view.getUint16(
                position + 10,
                true
            );

        const crc =
            view.getUint32(
                position + 16,
                true
            );

        const compressedSize =
            view.getUint32(
                position + 20,
                true
            );

        const uncompressedSize =
            view.getUint32(
                position + 24,
                true
            );

        const nameLength =
            view.getUint16(
                position + 28,
                true
            );

        const extraLength =
            view.getUint16(
                position + 30,
                true
            );

        const commentLength =
            view.getUint16(
                position + 32,
                true
            );

        const localOffset =
            view.getUint32(
                position + 42,
                true
            );

        const nameStart =
            position + 46;

        const nameBytes =
            bytes.slice(
                nameStart,
                nameStart + nameLength
            );

        const name =
            decodeUTF8(nameBytes);

        entries.push({
            name,
            flags,
            compression,
            crc,
            compressedSize,
            uncompressedSize,
            localOffset
        });

        position +=
            46 +
            nameLength +
            extraLength +
            commentLength;
    }

    return entries;
}

/* =========================================================
   EXTRACT ZIP ENTRY
========================================================= */

async function extractZipEntry(
    bytes,
    entry
) {
    const view =
        new DataView(
            bytes.buffer,
            bytes.byteOffset,
            bytes.byteLength
        );

    const offset =
        entry.localOffset;

    if (
        view.getUint32(
            offset,
            true
        ) !== 0x04034b50
    ) {
        throw new Error(
            `Invalid local header for ${entry.name}`
        );
    }

    const nameLength =
        view.getUint16(
            offset + 26,
            true
        );

    const extraLength =
        view.getUint16(
            offset + 28,
            true
        );

    const dataStart =
        offset +
        30 +
        nameLength +
        extraLength;

    const compressed =
        bytes.slice(
            dataStart,
            dataStart +
            entry.compressedSize
        );

    // Stored ZIP entry.
    if (entry.compression === 0) {
        return compressed;
    }

    // DEFLATE ZIP entry.
    if (entry.compression === 8) {
        if (
            !("DecompressionStream" in window)
        ) {
            throw new Error(
                "This runtime does not support DEFLATE extraction."
            );
        }

        const stream =
            new Blob([compressed])
                .stream()
                .pipeThrough(
                    new DecompressionStream(
                        "deflate-raw"
                    )
                );

        const buffer =
            await new Response(
                stream
            ).arrayBuffer();

        return new Uint8Array(buffer);
    }

    throw new Error(
        `Unsupported compression method ` +
        `${entry.compression} in ${entry.name}`
    );
}

/* =========================================================
   FOLDER CREATION FOR EXTRACTION
========================================================= */

async function ensureFolder(
    path,
    key
) {
    if (!path) {
        return;
    }

    const parts =
        path
            .split("/")
            .filter(Boolean);

    let current = "";

    for (const part of parts) {
        current += "/" + part;

        const handle = {
            path: current,
            key
        };

        const exists =
            await api.folderExists(
                handle
            );

        if (!exists) {
            await api.writeFolder(
                handle
            );
        }
    }
}

/* =========================================================
   EXTRACT ZIP
========================================================= */

async function extractZip(
    zipHandle,
    destinationHandle
) {
    setStatus(
        "Reading ZIP archive..."
    );

    const result =
        await api.readFile(
            zipHandle,
            {
                buffer: true
            }
        );

    const bytes =
        new Uint8Array(
            result.filecontent || result
        );

    const entries =
        parseZipCentralDirectory(
            bytes
        );

    if (!entries.length) {
        throw new Error(
            "The ZIP archive contains no entries."
        );
    }

    let processed = 0;

    for (const entry of entries) {
        const safeName =
            normalizeArchivePath(
                entry.name
            );

        if (!safeName) {
            continue;
        }

        processed++;

        setStatus(
            `Extracting ${processed}/${entries.length}: ${safeName}`
        );

        const isDirectory =
            entry.name.endsWith("/") ||
            safeName.endsWith("/");

        if (isDirectory) {
            await ensureFolder(
                joinPath(
                    destinationHandle.path,
                    safeName
                ),
                destinationHandle.key
            );

            continue;
        }

        const parent =
            dirname(safeName);

        if (
            parent &&
            parent !== "/"
        ) {
            await ensureFolder(
                joinPath(
                    destinationHandle.path,
                    parent
                ),
                destinationHandle.key
            );
        }

        const data =
            await extractZipEntry(
                bytes,
                entry
            );

        const outputPath =
            joinPath(
                destinationHandle.path,
                safeName
            );

        await api.writeFile(
            {
                path: outputPath,
                key: destinationHandle.key
            },
            data.buffer,
            {
                replace: true
            }
        );

        await waitForUI();
    }

    return {
        entries: processed
    };
}

/* =========================================================
   EXTRACT BUTTON
========================================================= */

async function unzipFile() {
    if (state.busy) {
        return;
    }

    state.busy = true;
    updateButtons();

    try {
        setStatus(
            "Choose a ZIP file..."
        );

        let zipHandle =
            window.userPickedFileHandle;

        if (
            !zipHandle ||
            !/\.zip$/i.test(
                zipHandle.path
            )
        ) {
            zipHandle =
                await api.showOpenFilePicker();
        }

        if (!zipHandle) {
            throw new Error(
                "No ZIP file was selected."
            );
        }

        if (
            !/\.zip$/i.test(
                zipHandle.path
            )
        ) {
            throw new Error(
                "Please select a .zip file."
            );
        }

        setStatus(
            "Choose where to extract the ZIP..."
        );

        const destination =
            await api.showDirectoryPicker();

        if (!destination) {
            throw new Error(
                "No destination folder was selected."
            );
        }

        const result =
            await extractZip(
                zipHandle,
                destination
            );

        setStatus(
            `Extracted ${result.entries} entries successfully.`,
            "success"
        );
    } catch (error) {
        console.error(error);

        setStatus(
            error?.message ||
            String(error),
            "error"
        );
    } finally {
        state.busy = false;
        updateButtons();
    }
}

/* =========================================================
   BUTTON STATE
========================================================= */

function updateButtons() {
    const buttons = [
        zipFileButton,
        zipFolderButton,
        unzipButton
    ];

    for (const button of buttons) {
        button.disabled = state.busy;

        button.style.opacity =
            state.busy ? "0.5" : "1";

        button.style.cursor =
            state.busy
                ? "default"
                : "pointer";
    }
}

/* =========================================================
   UI
========================================================= */

const root =
    document.createElement("div");

Object.assign(
    root.style,
    {
        boxSizing: "border-box",
        width: "100%",
        height: "100vh",
        padding: "28px",
        fontFamily:
            "Inter, system-ui, -apple-system, " +
            "BlinkMacSystemFont, \"Segoe UI\", sans-serif",
        background: "#111827",
        color: "#f3f4f6",
        overflow: "auto"
    }
);

const title =
    el(
        "div",
        {
            textContent: "ZIP Utility",
            style: {
                fontSize: "28px",
                fontWeight: "700",
                marginBottom: "6px"
            }
        }
    );

const subtitle =
    el(
        "div",
        {
            textContent:
                "Zip files and folders, or extract ZIP archives.",
            style: {
                color: "#9ca3af",
                fontSize: "14px",
                marginBottom: "24px"
            }
        }
    );

const card =
    el(
        "div",
        {
            style: {
                maxWidth: "680px",
                background: "#1f2937",
                border: "1px solid #374151",
                borderRadius: "14px",
                padding: "22px",
                boxSizing: "border-box"
            }
        }
    );

const sectionTitle =
    el(
        "div",
        {
            textContent: "Create ZIP",
            style: {
                fontSize: "16px",
                fontWeight: "600",
                marginBottom: "12px"
            }
        }
    );

const zipButtons =
    el(
        "div",
        {
            style: {
                display: "grid",
                gridTemplateColumns:
                    "1fr 1fr",
                gap: "12px",
                marginBottom: "22px"
            }
        }
    );

const zipFileButton =
    el(
        "button",
        {
            textContent: "ZIP File",
            style: {
                padding: "15px",
                border: "0",
                borderRadius: "9px",
                background: "#2563eb",
                color: "white",
                fontSize: "14px",
                fontWeight: "600"
            },
            onclick: zipFile
        }
    );

const zipFolderButton =
    el(
        "button",
        {
            textContent: "ZIP Folder",
            style: {
                padding: "15px",
                border: "0",
                borderRadius: "9px",
                background: "#7c3aed",
                color: "white",
                fontSize: "14px",
                fontWeight: "600"
            },
            onclick: zipFolder
        }
    );

zipButtons.appendChild(
    zipFileButton
);

zipButtons.appendChild(
    zipFolderButton
);

const extractTitle =
    el(
        "div",
        {
            textContent: "Extract ZIP",
            style: {
                fontSize: "16px",
                fontWeight: "600",
                marginBottom: "12px"
            }
        }
    );

const unzipButton =
    el(
        "button",
        {
            textContent: "Extract ZIP",
            style: {
                width: "100%",
                padding: "15px",
                border:
                    "1px solid #4b5563",
                borderRadius: "9px",
                background: "#374151",
                color: "white",
                fontSize: "14px",
                fontWeight: "600"
            },
            onclick: unzipFile
        }
    );

const statusBox =
    el(
        "div",
        {
            style: {
                marginTop: "20px",
                padding: "14px",
                borderRadius: "8px",
                background: "#111827",
                border:
                    "1px solid #374151",
                minHeight: "22px",
                fontSize: "13px"
            }
        }
    );

const status =
    el(
        "div",
        {
            textContent: "Ready.",
            style: {
                color: "#b9c2d0",
                wordBreak: "break-word"
            }
        }
    );

statusBox.appendChild(status);

const info =
    el(
        "div",
        {
            style: {
                marginTop: "18px",
                color: "#9ca3af",
                fontSize: "12px",
                lineHeight: "1.6"
            }
        }
    );

info.textContent =
    "ZIP creation uses standard ZIP store entries. " +
    "Extraction supports stored and DEFLATE ZIP entries. " +
    "ZIP64 archives are not supported.";

card.appendChild(sectionTitle);
card.appendChild(zipButtons);
card.appendChild(extractTitle);
card.appendChild(unzipButton);
card.appendChild(statusBox);
card.appendChild(info);

root.appendChild(title);
root.appendChild(subtitle);
root.appendChild(card);

document.body.style.margin = "0";
document.body.style.padding = "0";

document.body.appendChild(root);

updateButtons();

/* =========================================================
   FILE EXPLORER OPEN-WITH SUPPORT
========================================================= */

(async function handleOpenedFile() {
    try {
        if (
            window.userPickedFileHandle &&
            /\.zip$/i.test(
                window.userPickedFileHandle.path
            )
        ) {
            setStatus(
                "ZIP file opened from File Explorer. " +
                "Click Extract ZIP to choose a destination."
            );
        }
    } catch (error) {
        console.error(error);
    }
})();
