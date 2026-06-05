# Load Testing & Benchmarking (k6, Artillery, autocannon)

This document explains the concepts, configurations, and commands for load-testing our microservices infrastructure to ensure stability, low latency, and high concurrency resilience.

---

## 1. Architectural Concepts

Load testing simulates multiple virtual users querying our APIs simultaneously. This determines:

* **Throughput (Requests/sec)**: How many queries our services resolve per second.
* **Latency Percentiles**: Tracks response duration distributions. We prioritize the 95th (`p95`) and 99th (`p99`) percentiles to find worst-case lag.
* **Errors & Failure Rate**: Ensures rate limiters, session stores, and database query streams don't throw connection timeouts under stress.
* **System Saturation**: Finds out where systems bottleneck (CPU throttling, RAM exhaustion, DB socket pool lockups).

---

## 2. Load Testing Tools & Configurations

We configured stress scripts for three distinct load test runners:

### A. k6 (`tests/load/k6-script.js`)
k6 is a Go-native high-performance runner exposing JavaScript scripting. It supports ramping stages and Service Level Agreement (SLA) threshold validations:

```javascript
export const options = {
  stages: [
    { duration: '5s', target: 20 },  // Ramp-up to 20 virtual users
    { duration: '10s', target: 20 }, // Maintain 20 virtual users
    { duration: '5s', target: 0 },   // Ramp-down
  ],
  thresholds: {
    http_req_failed: ['rate<0.01'],   // Reject run if error rate >= 1%
    http_req_duration: ['p(95)<300'], // Reject run if p95 latency >= 300ms
  },
};
```

### B. Artillery (`tests/load/artillery-config.yml`)
Artillery uses YAML files to define user flows, scenario execution rates, and payload injections:

```yaml
config:
  target: "http://localhost:5000"
  phases:
    - duration: 10
      arrivalRate: 5
      rampTo: 15
scenarios:
  - name: "CPU-Bound Calculation"
    flow:
      - post:
          url: "/api/v1/jobs/heavy-cpu"
          json:
            number: 10
```

### C. autocannon
A lightweight HTTP benchmarking tool generating high load directly from the shell.

---

## 3. Running Load Tests

To run the load-testing suites, first start the target server (e.g., `npm start` or in cluster/single process modes), then execute the desired runner target:

* **autocannon benchmark**:
  ```bash
  npm run load:autocannon
  ```
  *(Sends 50 concurrent connections for 5 seconds to the CPU-bound heavy calculation endpoint)*

* **Artillery scenario runs**:
  ```bash
  npm run load:artillery
  ```

* **k6 load test**:
  1. Download k6 CLI (on macOS: `brew install k6`).
  2. Execute test command:
     ```bash
     npm run load:k6
     ```

---

## 4. Reading Test Reports

When analyzing test outputs:

1. **Request Rate**: Higher requests/sec indicates efficient routing/non-blocking loops.
2. **p95/p99 latency**: If latency rises exponentially while throughput plateaus, it indicates system saturation.
3. **HTTP 4xx/5xx counts**: Check if rate limiters (which return HTTP 429) or memory overloads (returning HTTP 502/503) triggered errors.
