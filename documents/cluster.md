# Node.js Cluster Module

This document explains the architectural design, setup procedures, and code configurations for using the native **Node.js Cluster module** to scale microservices horizontally across multiple CPU cores.

---

## 1. Architectural Concepts

By default, Node.js executes in a single thread, utilizing a single CPU core. On multi-core servers, this means that some CPU cores will sit idle while the thread handling traffic becomes saturated.

The native **Cluster module** addresses this limitations:

* **Primary (Master) Process**: Orchestrates worker processes. It reads the server's CPU core configuration (`os.cpus().length`) and calls `cluster.fork()` to spin up worker instances. It monitors worker health, listening to the `exit` event to automatically fork replacements if a worker crashes (self-healing).
* **Worker Process**: Individual child processes running the actual application logic (connecting to database, spawning HTTP/WS listeners, handling background jobs).
* **Port Sharing**: The master process creates a network socket listening on the specified port. It then distributes incoming TCP connections to worker processes using a Round-Robin load-balancing algorithm (standard on Unix systems).

```
                      [ Client Requests ]
                               |
                               v
                     [ Primary Socket listener ]
                               | (Round-Robin Distribution)
          +--------------------+--------------------+
          | (IPC)              | (IPC)              | (IPC)
          v                    v                    v
  [ Worker 1 (CPU 0) ]  [ Worker 2 (CPU 1) ]  [ Worker 3 (CPU 2) ]
```

---

## 2. Code Implementation (`src/server.js`)

We integrated the Cluster module directly into `src/server.js`. It runs in Cluster mode when `CLUSTER_MODE=true` is enabled in `.env`:

```javascript
const cluster = require('cluster');
const os = require('os');

if (process.env.CLUSTER_MODE === 'true' && (cluster.isPrimary || cluster.isMaster)) {
  const numCPUs = os.cpus().length;
  logger.info(`[Cluster Master] Primary process ${process.pid} is running. Forking ${numCPUs} workers...`);

  // Fork workers matching CPU count
  for (let i = 0; i < numCPUs; i++) {
    cluster.fork();
  }

  // Self-Healing: Listen for dying workers and restart them
  cluster.on('exit', (worker, code, signal) => {
    logger.warn(`[Cluster Master] Worker process ${worker.process.pid} exited. Re-forking worker...`);
    cluster.fork();
  });
} else {
  // If CLUSTER_MODE=false or inside a Worker child process, run the HTTP server
  startServer();
}
```

---

## 3. Configuration & Startup

To run in Cluster Mode, update your environment configuration:

1. Add the toggle switch to your `.env` file:
   ```env
   CLUSTER_MODE=true
   ```
2. Start the server:
   ```bash
   npm start
   ```

---

## 4. Verification & Testing

Verify cluster process management, worker forks, and automatic crashed worker restoration:
```bash
npm test tests/integration/cluster.test.js
```
