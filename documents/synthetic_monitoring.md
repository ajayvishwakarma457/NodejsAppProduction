# Synthetic Monitoring and Uptime Checks

This document details the synthetic monitoring, uptime checks, and service health check implementations for the application.

---

## 1. Overview

Synthetic monitoring uses automated active probers to test key workflows and check endpoint availability. In this system:
1. A **Central Health Check Endpoint** (`/health`) reports deep status verification of dependencies (Database, Cache) and system resource utilization.
2. A **Synthetic Uptime Prober** background service checks registered targets at configurable intervals and reports metrics (uptime and probe latency) directly to Prometheus.

```
       [ Prometheus Pull Scraper ]
                    │
                    ▼ (Scrapes /metrics)
          [ Express Application ] ────(Read Metrics)────┐
                    ▲                                   │
                    │ (Ping HTTP GET)                   ▼
         [ Synthetic Uptime Prober ] ──────────► [ prom-client ]
                    │                                   ▲
                    ▼                                   │
         [ Downstream Target URL ] ─────────────────────┘
         (e.g., /health endpoint)
```

---

## 2. Central Health Check Endpoint

Exposed directly on the Express app at `/health`, this endpoint verifies database and cache connectivity, bypassing rate limiters and session serialization to support high-frequency polling from load balancers (e.g. AWS ALB, NGINX) or external uptime services.

### Payload Structure
On successful status (HTTP `200`):
```json
{
  "status": "healthy",
  "timestamp": "2026-06-05T12:00:00.000Z",
  "uptime": 124.52,
  "services": {
    "database": {
      "status": "connected",
      "healthy": true
    },
    "cache": {
      "status": "ready",
      "healthy": true
    }
  },
  "system": {
    "memory": {
      "rss": "85.23 MB",
      "heapUsed": "42.11 MB"
    }
  }
}
```

*If any critical dependency is down (e.g. Mongoose state is disconnected or Redis status is not ready), the endpoint returns **HTTP `503 Service Unavailable`** with the details of the failure.*

---

## 3. Uptime Prober Utility

Located at [syntheticProber.js](file:///Users/spakcomm-ajay/Documents/Roadmap/NodejsAppProduction/src/utils/syntheticProber.js), the prober runs as an interval loop inside the application master process.

### Environment Configurations

Configure these variables inside your `.env` file to customize the prober:

```bash
# Enable the synthetic prober loop on server start
SYNTHETIC_PROBER_ENABLED=true

# Request interval in milliseconds
SYNTHETIC_PROBE_INTERVAL_MS=30000

# Targets to probe (comma-separated list)
SYNTHETIC_PROBE_TARGETS=http://localhost:5000/health,http://localhost:5000/api-docs
```

---

## 4. Exposed Prometheus Metrics

The prober records and exports two custom metrics to the Prometheus scraper:

1. **`synthetic_probe_success`** (Gauge): Tracks whether the last probe succeeded (returns `1` for success status codes `2xx`, and `0` for failures/network timeouts).
   - Labels: `target`, `status_code`
2. **`synthetic_probe_duration_seconds`** (Histogram): Measures response times of the probed targets to monitor performance degradation.
   - Labels: `target`
   - Buckets: `[0.05, 0.1, 0.25, 0.5, 1.0, 2.5, 5.0]`

---

## 5. Verification & Tests

To run the automated integration tests verifying endpoint response shapes and metric reporting:

```bash
npm test tests/integration/synthetic.test.js
```
