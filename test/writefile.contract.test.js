const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");

function loadWriteFileImpl() {
  const sourcePath = path.join(
    __dirname,
    "..",
    "src/server/USER/root/systemfiles/runtime/core/runtimeCore.js",
  );
  const source = fs.readFileSync(sourcePath, "utf8");
  const match = source.match(
    /window\.protectedGlobals\.WriteFile = async function \(relPath, contents, options = \{ replace: true \}\) \{[\s\S]*?\n\};/,
  );
  assert.ok(match, "Could not locate WriteFile implementation");
  return match[0];
}

test("WriteFile keeps the 3-argument contract and returns the server payload", async () => {
  let capturedRequest = null;
  const stubbed = {
    data: { authToken: "abc123" },
    firstlogin: false,
    SERVER: "https://example.test/files",
    getCurrentUsernameForRequests() {
      return "alice";
    },
    queueOnlyLoadTreeRefresh() {},
    showSessionExpiredDialog() {},
  };
  const sandbox = {
    window: { protectedGlobals: stubbed },
    TextEncoder,
    ArrayBuffer,
    Uint8Array,
    Blob,
    fetch: async (url, options) => {
      capturedRequest = { url, options };
      return {
        status: 200,
        headers: {
          get(name) {
            return name === "content-type" ? "application/json" : null;
          },
        },
        json: async () => ({ success: true, echoed: true }),
      };
    },
  };
  vm.createContext(sandbox);
  vm.runInContext(loadWriteFileImpl(), sandbox);

  const result = await sandbox.window.protectedGlobals.WriteFile(
    "root/hello.txt",
    "hello world",
    { replace: false },
  );

  assert.deepEqual(result, { success: true, echoed: true });
  assert.equal(capturedRequest.options.method, "POST");
  assert.equal(capturedRequest.options.headers["X-File-Path"], "hello.txt");
  assert.equal(capturedRequest.options.headers["X-File-Replace"], "false");
  assert.equal(capturedRequest.options.headers["Authorization"], "Bearer abc123");
});

test("WriteFile transmits Blob contents as raw bytes", async () => {
  let capturedBody = null;
  const stubbed = {
    data: {},
    firstlogin: false,
    SERVER: "https://example.test/files",
    getCurrentUsernameForRequests() {
      return "alice";
    },
    queueOnlyLoadTreeRefresh() {},
    showSessionExpiredDialog() {},
  };
  const sandbox = {
    window: { protectedGlobals: stubbed },
    TextEncoder,
    ArrayBuffer,
    Uint8Array,
    Blob,
    fetch: async (_url, options) => {
      capturedBody = options.body;
      return {
        status: 200,
        headers: {
          get(name) {
            return name === "content-type" ? "application/json" : null;
          },
        },
        json: async () => ({ success: true }),
      };
    },
  };
  vm.createContext(sandbox);
  vm.runInContext(loadWriteFileImpl(), sandbox);

  const payload = new Uint8Array([0, 1, 2, 3]);
  const blob = new Blob([payload]);
  await sandbox.window.protectedGlobals.WriteFile("/binary.bin", blob, { replace: true });

  assert.ok(capturedBody instanceof Uint8Array || capturedBody instanceof ArrayBuffer);
  const bytes = capturedBody instanceof Uint8Array
    ? capturedBody
    : new Uint8Array(capturedBody);
  assert.deepEqual(Array.from(bytes), [0, 1, 2, 3]);
});
