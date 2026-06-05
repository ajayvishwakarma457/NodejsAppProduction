# Loki — Centralized Log Aggregation

This document covers the complete implementation of **Grafana Loki** as the log aggregation backend for our Node.js production platform. Loki collects all Winston-structured logs and makes them queryable in Grafana alongside Prometheus metrics.

---

## 1. What Is Loki?

Loki is a horizontally scalable, **log aggregation system** by Grafana Labs. Unlike Elasticsearch (ELK), Loki does **not** index the full content of logs — it only indexes **labels** (metadata tags). The actual log lines are stored compressed. This makes it:

- **Lightweight** — runs on very little memory compared to Elasticsearch
- **Cheap** — no expensive full-text indexing
- **Grafana-native** — logs and metrics live in the same UI

### Architecture in this project

```
Winston Logger (Node.js)
        │
        │  HTTP push (every batch)
        ▼
  Loki  (:3100)         ← stores compressed log chunks
        │
        │  LogQL queries
        ▼
  Grafana (:3001)       ← visualizes logs + metrics together
```

---

## 2. How Logs Flow

```
app.logger.info('User logged in', { userId, ip })
        │
        ├─── Console transport    → terminal output
        ├─── File transport       → logs/combined.log
        └─── LokiTransport        → POST http://localhost:3100/loki/api/v1/push
                                         labels: { app, env, level }
                                         line:   { message, correlationId, ... }
```

---

## 3. Implementation Files

### A. Winston Logger — `src/utils/logger.js`

The `LokiTransport` is added **conditionally** — it only activates when `LOKI_HOST` is set in the environment. This means the app runs normally in tests and development without requiring a running Loki instance.

```javascript
if (process.env.LOKI_HOST) {
  const LokiTransport = require('winston-loki');

  transports.push(new LokiTransport({
    host: process.env.LOKI_HOST,           // http://localhost:3100
    labels: {
      app: process.env.APP_NAME || 'nodejs-production-platform',
      env: process.env.NODE_ENV || 'development',
    },
    json: true,                            // send structured JSON logs
    replaceTimestamp: false,               // keep Winston's own timestamp
    onConnectionError: (err) => {
      console.error('[Loki] Connection error:', err.message);
      // Non-fatal — app keeps running, logs go to console + file only
    },
  }));
}
```

**Key design decision:** The `onConnectionError` callback makes the Loki transport **fail-open** — if Loki goes down, the application continues running and logs are written to console and file as usual.

---

### B. Environment Variables — `.env`

```env
# Loki log shipping
LOKI_HOST=http://localhost:3100
APP_NAME=nodejs-production-platform
```

Set `LOKI_HOST` to enable log shipping. Unset it to skip Loki entirely (e.g., in CI/CD pipelines).

---

### C. Loki Server Config — `monitoring/loki-config.yml`

```yaml
auth_enabled: false

server:
  http_listen_port: 3100

schema_config:
  configs:
    - from: 2020-10-24
      store: tsdb
      object_store: filesystem
      schema: v13
      index:
        prefix: index_
        period: 24h

limits_config:
  allow_structured_metadata: true
  ingestion_rate_mb: 16
```

---

### D. Docker Compose — `monitoring/docker-compose.monitoring.yml`

Loki is added as a service alongside Prometheus and Grafana:

```yaml
loki:
  image: grafana/loki:latest
  container_name: nodejs_loki
  ports:
    - "3100:3100"
  volumes:
    - ./loki-config.yml:/etc/loki/local-config.yaml:ro
    - loki_data:/tmp/loki
  command: -config.file=/etc/loki/local-config.yaml
```

---

### E. Grafana Datasource — `monitoring/grafana/provisioning/datasources/prometheus.yml`

Loki is auto-provisioned as a Grafana data source on container start:

```yaml
datasources:
  - name: Prometheus
    type: prometheus
    url: http://prometheus:9090
    isDefault: true

  - name: Loki
    type: loki
    url: http://loki:3100
    jsonData:
      maxLines: 1000
```

---

## 4. Running the Full Stack

```bash
# Step 1 — Start Loki + Prometheus + Grafana
npm run monitoring:start

# Step 2 — Start Node.js app (logs will be shipped to Loki automatically)
npm start

# Step 3 — Stop everything
npm run monitoring:stop
```

---

## 5. URLs

| Service | URL | Credentials |
|---|---|---|
| **Node.js App** | http://localhost:5000 | — |
| **Loki API** | http://localhost:3100 | None |
| **Loki ready check** | http://localhost:3100/ready | None |
| **Prometheus** | http://localhost:9090 | None |
| **Grafana** | http://localhost:3001 | `admin` / `admin123` |

---

## 6. Querying Logs in Grafana (LogQL)

Navigate to **Grafana → Explore → Select datasource: Loki**

### Basic Queries

```logql
# All logs from the app
{app="nodejs-production-platform"}

# Only error logs
{app="nodejs-production-platform", level="error"}

# Only HTTP request logs
{app="nodejs-production-platform"} |= "http"

# Filter by correlation ID
{app="nodejs-production-platform"} |= "CID: abc-123"

# Parse JSON and filter by status code
{app="nodejs-production-platform"} | json | status_code="500"
```

### Metric Queries over Logs

```logql
# Error rate over time
rate({app="nodejs-production-platform", level="error"}[5m])

# Total log volume by level
sum by (level) (count_over_time({app="nodejs-production-platform"}[1m]))

# Log lines matching "MongoDB" in the last hour
count_over_time({app="nodejs-production-platform"} |= "MongoDB" [1h])
```

---

## 7. Log Labels

Every log line shipped to Loki carries these labels (used for fast filtering):

| Label | Value | Source |
|---|---|---|
| `app` | `nodejs-production-platform` | `APP_NAME` env var |
| `env` | `development` / `production` | `NODE_ENV` env var |
| `level` | `info` / `error` / `warn` / `debug` / `http` | Winston log level |

The actual log **content** (message, correlationId, stack traces, userId, etc.) is stored as the log line body and searched with `|=` or `| json` filters.

---

## 8. Integration with Correlation IDs

Since our Winston logger automatically injects `correlationId` from `AsyncLocalStorage`, every log line in Loki carries the request's correlation ID. This means you can trace a complete request across all log lines:

```logql
# Find all logs for a specific request
{app="nodejs-production-platform"} |= "CID: <your-correlation-id>"
```

This connects directly with our **OpenTelemetry traces** — the same correlation ID can be used to find both the trace span and all associated log lines.

---

## 9. Test

```bash
# Run Loki integration tests
npm test tests/integration/loki.test.js

# Run all tests (84 passing)
npm test
```

The integration tests verify:
- `winston-loki` package is importable
- Logger loads gracefully without Loki running
- All standard log methods exist (`info`, `error`, `warn`, `debug`, `http`)
- `LokiTransport` is correctly constructed with proper labels
