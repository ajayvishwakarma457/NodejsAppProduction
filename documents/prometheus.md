# Prometheus Metrics + Grafana Dashboards

This document covers the **complete implementation** of production-grade metrics collection using `prom-client`, Prometheus, and Grafana in our Node.js application.

---

## 1. What Is Prometheus + Grafana?

| Tool | Role |
|---|---|
| **prom-client** | Node.js library that collects metrics and exposes them at `/metrics` |
| **Prometheus** | Time-series database that scrapes `/metrics` at regular intervals |
| **Grafana** | Visualization layer — dashboards, charts, alerting on top of Prometheus |

### How They Connect

```
┌──────────────────────────────────────────────────────┐
│               Node.js App  (:5000)                   │
│  ┌────────────────┐   ┌──────────────────────────┐  │
│  │  prom-client   │──▶│  GET /metrics (text/plain)│  │
│  │  (registry)    │   └──────────────────────────┘  │
│  └────────────────┘                                  │
└───────────────────────────┬──────────────────────────┘
                            │  scrapes every 10 seconds
                            ▼
              ┌─────────────────────────┐
              │   Prometheus  (:9090)   │
              │   time-series storage   │
              └────────────┬────────────┘
                           │  PromQL queries
                           ▼
              ┌─────────────────────────┐
              │    Grafana  (:3001)     │
              │  dashboards + alerting  │
              └─────────────────────────┘
```

---

## 2. Metric Types

| Type | Description | Example |
|---|---|---|
| **Counter** | Monotonically increasing number, never resets | Total HTTP requests |
| **Gauge** | Goes up and down freely | Active WebSocket connections |
| **Histogram** | Groups observations into configurable buckets | Request duration |
| **Summary** | Like histogram but calculates quantiles client-side | — |

---

## 3. Metrics Implemented

### Custom Application Metrics

| Metric | Type | Labels | Purpose |
|---|---|---|---|
| `http_requests_total` | Counter | `method`, `route`, `status_code` | Total HTTP request count |
| `http_request_duration_seconds` | Histogram | `method`, `route`, `status_code` | Request latency distribution |
| `active_connections` | Gauge | `type` (websocket / ws) | Live real-time connections |
| `db_operations_total` | Counter | `operation`, `collection`, `status` | MongoDB query tracking |

### Default Process Metrics (auto-collected)

| Metric | Description |
|---|---|
| `process_cpu_user_seconds_total` | CPU time in user space |
| `process_cpu_system_seconds_total` | CPU time in kernel space |
| `nodejs_heap_size_used_bytes` | V8 heap memory used |
| `nodejs_heap_size_total_bytes` | V8 heap memory total |
| `nodejs_external_memory_bytes` | C++ addon memory |
| `nodejs_active_handles_total` | Active async handles |
| `nodejs_active_requests_total` | Active async requests |
| `nodejs_gc_duration_seconds` | Garbage collection duration |
| `nodejs_eventloop_lag_seconds` | Event loop lag |

---

## 4. Implementation Files

### A. Metrics Registry — `src/utils/metrics.js`

Creates the `prom-client` registry, collects default metrics, and defines all custom counters, histograms, and gauges.

```javascript
const promClient = require('prom-client');

// Custom registry
const register = new promClient.Registry();

// Auto-collect CPU, memory, GC, event loop metrics
promClient.collectDefaultMetrics({ register });

// Counter — total HTTP requests by method/route/status
const httpRequestsTotal = new promClient.Counter({
  name: 'http_requests_total',
  help: 'Total number of HTTP requests processed',
  labelNames: ['method', 'route', 'status_code'],
});

// Histogram — request latency distribution
const httpRequestDurationSeconds = new promClient.Histogram({
  name: 'http_request_duration_seconds',
  help: 'Duration of HTTP requests in seconds',
  labelNames: ['method', 'route', 'status_code'],
  buckets: [0.05, 0.1, 0.25, 0.5, 1, 2.5, 5, 10],
});

// Gauge — live WebSocket and ws clients
const activeConnections = new promClient.Gauge({
  name: 'active_connections',
  help: 'Number of currently active real-time connections',
  labelNames: ['type'],
});

// Counter — MongoDB operations
const dbOperationsTotal = new promClient.Counter({
  name: 'db_operations_total',
  help: 'Total number of database operations executed',
  labelNames: ['operation', 'collection', 'status'],
});

// /metrics endpoint handler
const metricsEndpoint = async (req, res) => {
  res.set('Content-Type', register.contentType);
  res.end(await register.metrics());
};

module.exports = {
  register, httpRequestsTotal, httpRequestDurationSeconds,
  activeConnections, dbOperationsTotal, metricsEndpoint,
};
```

---

### B. HTTP Middleware — `src/middlewares/v1/metricsMiddleware.js`

Intercepts every HTTP request on the `res.on('finish')` event to measure latency and count requests. Uses `req.route.path` for route labelling — this groups `/users/123` and `/users/456` both as `/api/v1/users/:id`, preventing **cardinality explosion** in the database.

```javascript
const { httpRequestsTotal, httpRequestDurationSeconds } = require('../../utils/metrics');

const metricsMiddleware = (req, res, next) => {
  if (req.path === '/metrics') return next(); // skip self-monitoring

  const start = process.hrtime();

  res.on('finish', () => {
    const [sec, ns] = process.hrtime(start);
    const durationSeconds = sec + ns / 1e9;

    // Use route template, not raw path (avoids high cardinality)
    let route = 'not_found';
    if (req.route) {
      route = req.baseUrl
        ? req.baseUrl + (req.route.path === '/' ? '' : req.route.path)
        : req.route.path;
    } else if (res.statusCode !== 404) {
      route = req.baseUrl ? req.baseUrl + req.path : req.path;
    }

    const labels = { method: req.method, route, status_code: res.statusCode.toString() };

    httpRequestsTotal.inc(labels);
    httpRequestDurationSeconds.observe(labels, durationSeconds);
  });

  next();
};

module.exports = metricsMiddleware;
```

---

### C. App Integration — `src/app.js`

```javascript
const { metricsEndpoint } = require('./utils/metrics');
const metricsMiddleware = require('./middlewares/v1/metricsMiddleware');

// Register before rate limiter so /metrics is always accessible
app.use(metricsMiddleware);
app.get('/metrics', metricsEndpoint);
```

---

### D. MongoDB Tracking — `src/config/db.js`

A global Mongoose plugin registers `pre`/`post` hooks on all query types and increments `db_operations_total` automatically on every database call.

```javascript
const { dbOperationsTotal } = require('../utils/metrics');

const metricsPlugin = (schema) => {
  const ops = ['find', 'findOne', 'findOneAndUpdate', 'save', 'updateOne', 'deleteOne', ...];

  ops.forEach((op) => {
    schema.post(op, function () {
      dbOperationsTotal.inc({ operation: op, collection: this.collection?.name, status: 'success' });
    });
  });
};

mongoose.plugin(metricsPlugin); // applied to ALL models globally
```

---

### E. WebSocket Tracking — `src/utils/socketService.js` + `wsService.js`

```javascript
// socketService.js — Socket.io connections
chatNamespace.on('connection', (socket) => {
  activeConnections.inc({ type: 'websocket' });
  socket.on('disconnect', () => activeConnections.dec({ type: 'websocket' }));
});

// wsService.js — raw ws connections
wss.on('connection', (ws) => {
  activeConnections.inc({ type: 'ws' });
  ws.on('close', () => activeConnections.dec({ type: 'ws' }));
});
```

---

## 5. Infrastructure Setup

### File Structure

```
monitoring/
├── docker-compose.monitoring.yml      ← Prometheus + Grafana containers
├── prometheus.yml                     ← Scrape config
└── grafana/
    └── provisioning/
        ├── datasources/
        │   └── prometheus.yml         ← Auto-wires Prometheus as data source
        └── dashboards/
            ├── dashboard.yml          ← Dashboard provider config
            └── nodejs-dashboard.json ← Pre-built 8-panel dashboard
```

### `prometheus.yml` — Scrape Config

```yaml
scrape_configs:
  - job_name: 'nodejs-app'
    static_configs:
      - targets: ['host.docker.internal:5000']   # Mac: host machine from Docker
    metrics_path: '/metrics'
    scrape_interval: 10s
```

### `docker-compose.monitoring.yml`

```yaml
services:
  prometheus:
    image: prom/prometheus:latest
    ports: ["9090:9090"]
    volumes:
      - ./prometheus.yml:/etc/prometheus/prometheus.yml:ro

  grafana:
    image: grafana/grafana:latest
    ports: ["3001:3000"]
    environment:
      - GF_SECURITY_ADMIN_USER=admin
      - GF_SECURITY_ADMIN_PASSWORD=admin123
    volumes:
      - ./grafana/provisioning:/etc/grafana/provisioning:ro
    depends_on: [prometheus]
```

---

## 6. Running the Stack

```bash
# 1. Start Prometheus + Grafana containers
npm run monitoring:start

# 2. Start your Node.js app
npm start

# 3. Stop monitoring stack
npm run monitoring:stop

# 4. View container logs
npm run monitoring:logs
```

---

## 7. URLs

| Service | URL | Credentials |
|---|---|---|
| Node.js raw metrics | http://localhost:5000/metrics | None |
| Prometheus UI | http://localhost:9090 | None |
| Prometheus targets | http://localhost:9090/targets | None |
| Grafana dashboard | http://localhost:3001 | `admin` / `admin123` |

> In Grafana, navigate to **Dashboards → NodeJS → Node.js Production Dashboard** to see the pre-built dashboard.

---

## 8. Grafana Dashboard Panels

The pre-built dashboard (`nodejs-dashboard.json`) auto-provisions with 8 panels:

| # | Panel | Query |
|---|---|---|
| 1 | 📊 Request Rate by Route | `sum(rate(http_requests_total[1m])) by (route, method)` |
| 2 | 📈 Requests by Status Code | `sum(increase(http_requests_total[5m])) by (status_code)` |
| 3 | ⏱ Latency p50/p95/p99 | `histogram_quantile(0.95, sum(rate(http_request_duration_seconds_bucket[5m])) by (le, route))` |
| 4 | 🧠 Memory Usage | `nodejs_heap_size_used_bytes` vs `nodejs_heap_size_total_bytes` |
| 5 | 💻 CPU Usage | `rate(process_cpu_user_seconds_total[1m])` |
| 6 | 🔗 Active Connections | `active_connections{type="websocket"}` |
| 7 | 🔄 Active Handles | `nodejs_active_handles_total` |
| 8 | 🗑 GC Duration | `rate(nodejs_gc_duration_seconds_sum[1m])` |

---

## 9. Useful PromQL Queries

```promql
# Total request rate (all routes)
sum(rate(http_requests_total[1m]))

# Error rate (4xx + 5xx)
sum(rate(http_requests_total{status_code=~"[45].."}[5m]))

# p95 latency across all routes
histogram_quantile(0.95, sum(rate(http_request_duration_seconds_bucket[5m])) by (le))

# Heap usage percentage
nodejs_heap_size_used_bytes / nodejs_heap_size_total_bytes * 100

# MongoDB operations per second by collection
sum(rate(db_operations_total[1m])) by (collection, operation)

# Active Socket.io connections
active_connections{type="websocket"}
```

---

## 10. Test

```bash
# Run integration test
npm test tests/integration/prometheus.test.js

# Manual endpoint check
curl http://localhost:5000/metrics
```

The integration test (`tests/integration/prometheus.test.js`) verifies:
- `/metrics` returns `200` with `text/plain` content type
- All custom metric names are present in the output
- HTTP request tracking increments correctly after an API call
