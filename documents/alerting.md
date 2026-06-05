# Alerting Integration: PagerDuty & OpsGenie

This document explains the alerting system implemented in the application, including the centralized `AlertingService` (supporting both PagerDuty and OpsGenie), global error integration, and infrastructure-level alerts using Prometheus Alertmanager.

---

## 1. central Alerting Service

The unified alerting engine is implemented in [alerting.js](file:///Users/spakcomm-ajay/Documents/Roadmap/NodejsAppProduction/src/utils/alerting.js). It supports dispatching critical application alerts concurrently to both PagerDuty and OpsGenie when the respective keys are configured.

### Key Features
- **Concurrent Delivery:** Dispatches alerts to both PagerDuty and OpsGenie in parallel using `Promise.allSettled`.
- **Environment Gated:** Active only in production environments (when `NODE_ENV === 'production'`) or when explicitly forced for testing/debugging.
- **Fail-Safe Operation:** Runs in a fail-open mode. If alerting itself fails, it logs the error but does not interrupt user request execution or throw exceptions.
- **De-duplication Keys:** Supports specifying custom dedup keys to prevent alert fatigue.

---

## 2. Integration Architecture

```
                 [ Incoming HTTP Request ]
                            │
                            ▼
                  [ Application Router ]
                            │
              (Error or Unhandled Exception)
                            │
                            ▼
                [ Global Error Middleware ]
                            │
            ┌───────────────┴───────────────┐
            ▼                               ▼
     [ Logs Recorded ]           [ AlertingService ]
     (Winston / Loki)               │ (Async send)
                                    ├──────────────────────────┐
                                    ▼                          ▼
                              [ PagerDuty ]              [ OpsGenie ]
                            (Events API v2)            (Alert API v2)
```

---

## 3. Configuration & Environment Variables

To activate alerting in your environment, add the following variables to your `.env` file:

```bash
# Alerting Integration Keys
PAGERDUTY_INTEGRATION_KEY=your_pagerduty_integration_key
OPSGENIE_API_KEY=your_opsgenie_api_key

# Metadata
APP_NAME=NodejsAppProduction
APP_URL=https://production.yourdomain.com
```

If these keys are not set, the service defaults to a safe, log-only mode:
```
[AlertingService] Alerting keys not configured. Alert logged to console only.
```

---

## 4. Manual API Usage

You can trigger alerts manually anywhere in your code:

```javascript
const alerting = require('./utils/alerting');

// Trigger a critical incident
await alerting.triggerAlert({
  summary: 'Database connection pool exhausted',
  severity: 'critical',
  source: 'database-client',
  details: {
    poolSize: 50,
    activeConnections: 50,
    waitingRequests: 120
  },
  dedupKey: 'db-pool-exhausted'
});
```

---

## 5. Automated Infrastructure Alerts (Prometheus Alertmanager)

In addition to application-level code alerts, infrastructure-level alerts are configured using Prometheus rules and routed via Alertmanager.

### Files Created:
1. **[alert-rules.yml](file:///Users/spakcomm-ajay/Documents/Roadmap/NodejsAppProduction/monitoring/alert-rules.yml):** Contains Prometheus alerting rules for:
   - High HTTP Error Rate (`nodejs_http_errors_total`)
   - High Latency (`nodejs_http_response_time_seconds`)
   - High Memory Usage (`nodejs_heap_used_bytes` / `nodejs_heap_total_bytes`)
   - Event Loop Lag (`nodejs_eventloop_lag_seconds`)
   - Instance Down (`up == 0`)
2. **[alertmanager.yml](file:///Users/spakcomm-ajay/Documents/Roadmap/NodejsAppProduction/monitoring/alertmanager.yml):** Alertmanager route rules pointing critical events to PagerDuty and warnings to OpsGenie.
3. **[docker-compose.monitoring.yml](file:///Users/spakcomm-ajay/Documents/Roadmap/NodejsAppProduction/monitoring/docker-compose.monitoring.yml):** Integrates the `alertmanager` service alongside Prometheus, Loki, and Grafana.

---

## 6. Verifying & Running Tests

You can run the integration tests to verify the routing logic, payload formatting, and priority mappings:

```bash
npm test tests/integration/alerting.test.js
```
