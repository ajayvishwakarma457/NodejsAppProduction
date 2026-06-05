# Memory Leak Detection

This document explains the architectural design, tools, and practices implemented to detect and debug memory leaks in our Node.js microservices.

---

## 1. Architectural Concepts

A memory leak occurs when memory allocated by a program is not released back to the operating system or pool, usually because objects are still referenced in code (by global variables, event listeners, cached arrays, closures, etc.) when they are no longer needed.

To detect memory leaks:
* **Native V8 Heap Snapshots**: Captures a snapshot of the current allocation state of the V8 JavaScript heap. By taking snapshots at different times (e.g. before, during, and after a load test), developers can compare them to find growing objects.
* **Chrome DevTools Inspect Protocol**: A built-in Node.js debugging service (`node --inspect`) that exposes V8 debugging capabilities over WebSockets.

---

## 2. Heap Snapshot Generation

We implemented native dynamic heap snapshot generation in the codebase using Node.js's standard `v8` module. This provides cross-platform stability without requiring binary compilation (unlike `heapdump` library).

### A. Generator Utility (`src/utils/heapdump.js`)
Pipes the V8 heap snapshot stream directly into a write stream inside the project workspace directory:

```javascript
const v8 = require('v8');
const fs = require('fs');

const writeHeapSnapshot = () => {
  return new Promise((resolve, reject) => {
    const filepath = path.join(SNAPSHOT_DIR, `snapshot-${Date.now()}.heapsnapshot`);
    const snapshotStream = v8.getHeapSnapshot();
    const fileStream = fs.createWriteStream(filepath);

    snapshotStream.pipe(fileStream);
    fileStream.on('finish', () => resolve({ filepath }));
    fileStream.on('error', reject);
  });
};
```

### B. REST Endpoint Mappings
Authorized users can trigger heap dumps at runtime:

* **POST `/api/v1/jobs/heapdump`**:
  * Triggers the snapshot write routine and returns JSON with the filename and file path of the `.heapsnapshot` output.

---

## 3. Chrome DevTools Heap Profiling (`node --inspect`)

To inspect memory leaks and CPU profiling in real-time, execute the following steps:

### Step 1: Start the application in debugging mode
Start the Node process with the inspect flag:
```bash
node --inspect src/server.js
```
* Or debug during development: `node --inspect-brk src/server.js` (breaks on the first line of code execution).

### Step 2: Open Chrome DevTools
1. Open Google Chrome.
2. Navigate to `chrome://inspect`.
3. Under **Remote Target**, locate your Node app instance and click **Inspect**.

### Step 3: Capture and Compare Snapshots
1. In the DevTools drawer, select the **Memory** tab.
2. Select **Heap snapshot** and click **Take snapshot** (this is Snapshot 1).
3. Send high volume HTTP requests to trigger suspect routes (e.g. using `autocannon` or `k6`).
4. Click **Take snapshot** again (Snapshot 2).
5. Switch the perspective dropdown from **Summary** to **Comparison** to see which classes/objects grew in size. Locate constructors with high `# Delta` values.

---

## 4. Verification & Testing

Verify that heap snapshots write cleanly to target directories:
```bash
npm test tests/integration/memoryLeaks.test.js
```
