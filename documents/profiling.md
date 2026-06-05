# Profiling Node.js (Clinic.js & 0x Flame Graphs)

This document explains the concepts, usage patterns, execution steps, and diagnostics for profiling our microservices application using **Clinic.js** and **0x** CPU flame graphs.

---

## 1. Architectural Concepts

When diagnosing CPU bottlenecks, slow asynchronous flow setups, or event loop blocking issues, standard debugging logs are insufficient. We need runtime profiling:

* **Flame Graphs**: A visualization of hierarchical stack traces. The horizontal axis represents the call stack profile, while the width of each bar represents CPU time spent executing that function. The color maps to heat (red/orange indicates deep, busy call paths).
* **Clinic Doctor**: Captures health metrics (CPU, memory, event loop delay, active handles) and runs heuristics to diagnose bottlenecks.
* **Clinic Bubbleprof**: Visualizes asynchronous state transitions, highlighting delays inside database operations, I/O requests, or third-party connections.
* **0x (Clinic Flame)**: Generates highly detailed interactive CPU flame graphs based on system V8 engine kernel sampling profiles.

---

## 2. Profiling Configuration & Commands

We configured profiling shortcut commands directly inside `package.json`:

* **`npm run profile:doctor`**: Runs Clinic Doctor to diagnose general symptoms.
* **`npm run profile:flame`**: Runs Clinic Flame (powered by 0x) to profile CPU execution call stacks.
* **`npm run profile:bubbleprof`**: Runs Clinic Bubbleprof to profile asynchronous network/I/O latency.
* **`npm run profile:0x`**: Runs raw 0x to capture CPU call stack snapshots.

---

## 3. Step-by-Step Profiling Guide

To profile and optimize a CPU-bound endpoint (like our worker thread or heavy loops):

### Step 1: Start the profiler
Start the server wrapped in the Clinic Flame container:
```bash
npm run profile:flame
```

### Step 2: Generate load traffic
While the profiler gathers data, generate load on the target endpoint (e.g. hitting `/api/v1/jobs/heavy-cpu` with 1,000 requests using a benchmarking tool like `autocannon` or `k6`):
```bash
npx autocannon -c 10 -d 10 -m POST -b '{"number": 20}' http://localhost:5000/api/v1/jobs/heavy-cpu
```

### Step 3: Terminate and view results
1. Stop the running server by pressing `Ctrl + C` in the profiling terminal.
2. Clinic will process the captured V8 trace log and compile an interactive HTML report.
3. The report will automatically open in your browser (saved as an `.html` file inside the root workspace folder).

---

## 4. Reading 0x Flame Graphs

When analyzing the HTML Flame Graph:

1. **Width is Time**: Look for wide blocks (bars) at the top of the stack. A wide block means that function (and its synchronous children) occupied the CPU for a large percentage of the profiling run.
2. **Color is Heat**: Red/Orange blocks indicate that the function is actively executing synchronous CPU work (blocking). Blue/Light-green blocks indicate idle or asynchronous operations.
3. **Optimizing**: Zoom into hot functions. If they are custom business logic routines (like unoptimized search loops or encryption), they can be refactored to use Worker Threads or cache lookups to keep the event loop unblocked.
