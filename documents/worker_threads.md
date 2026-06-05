# Worker Threads (for CPU-bound tasks)

This document explains the architectural design, setup procedures, and code integrations for using the native **Node.js Worker Threads** module to offload CPU-bound calculations from the main event loop.

---

## 1. Architectural Concepts

Node.js executes JavaScript on a single thread. When a CPU-bound operation (e.g., recursive mathematical calculations, cryptographic routines, or heavy image parsing) runs on that thread, it blocks the entire event loop. Consequently, all other incoming HTTP requests will experience severe latency spikes or timeout completely.

The native **`worker_threads`** module resolves this limitation:

* **Main Thread**: Receives incoming request parameters, instantiates a separate `Worker` instance loading our task file, and sets up event listeners.
* **Worker Thread**: Spawns as a separate operating system thread running an isolated V8 engine instance. It performs the intensive computation without blocking the event loop.
* **IPC Channel**: The worker and main threads exchange data through standard message passing APIs (`postMessage` and event listeners).

```
[ HTTP Requests ] ---> [ Main Express Event Loop ] -- (offload) --> [ Worker Thread (CPU-bound task) ]
                                |                                                 |
                       (Remains Responsive)                              (Computes Fibonacci)
                                |                                                 |
[ HTTP Response ] <--- [ Main Express Event Loop ] <--- (postMessage) ------------+
```

---

## 2. Code Implementation

We implemented a CPU-bound Fibonacci calculator offloaded to a child thread.

### A. Worker Thread Script (`src/workers/heavyCpu.worker.js`)
Executes the heavy computation and posts results back:

```javascript
const { parentPort, workerData } = require('worker_threads');

function fibonacci(n) {
  if (n <= 1) return n;
  return fibonacci(n - 1) + fibonacci(n - 2);
}

const { number } = workerData;
const result = fibonacci(number);
parentPort.postMessage({ success: true, result });
```

### B. Promise-Based Runner Utility (`src/utils/workerRunner.js`)
Wraps the worker instantiation, message processing, and thread exit events:

```javascript
const { Worker } = require('worker_threads');
const path = require('path');

const runHeavyCpuTask = (number) => {
  return new Promise((resolve, reject) => {
    const worker = new Worker(path.join(__dirname, '../workers/heavyCpu.worker.js'), {
      workerData: { number },
    });

    worker.on('message', (message) => {
      if (message.success) resolve(message.result);
      else reject(new Error(message.error));
    });
    worker.on('error', reject);
    worker.on('exit', (code) => {
      if (code !== 0) reject(new Error(`Worker stopped with code ${code}`));
    });
  });
};
```

---

## 3. Endpoints & Route Mappings

We exposed the CPU-bound task trigger at `/api/v1/jobs/heavy-cpu`:

* **POST `/api/v1/jobs/heavy-cpu`**:
  * Body payload: `{ "number": 40 }`
  * Offloads the computation to a worker thread and returns the calculated Fibonacci output.

---

## 4. Verification & Testing

Verify that worker threads execute successfully and resolve correctly:
```bash
npm test tests/integration/workerThreads.test.js
```
