# OpenTelemetry (Distributed Tracing)

This document details the configuration design, bootstrapping processes, and instrumentation strategies for using **OpenTelemetry** to enable distributed tracing in our Node.js microservices.

---

## 1. Architectural Concepts

Distributed tracing tracks the lifecycle of requests as they flow across multiple services, databases, and message queues:

* **Spans**: The fundamental unit of work (e.g. executing an HTTP endpoint, running a MongoDB query, writing to Redis). Spans contain names, timestamps, parent IDs, and custom attributes.
* **Trace**: A collection of spans that form a directed acyclic graph representing a single request's end-to-end execution path.
* **Auto-Instrumentation**: OpenTelemetry dynamically patches Node's runtime `require` calls to wrap client drivers (Express, Mongoose, ioredis, amqplib, kafkajs) in span-tracing wrappers, requiring zero manual span coding.
* **Trace Propagation**: W3C Trace Context headers (like `traceparent`) are automatically injected and extracted across network boundaries, linking microservice spans into a single unified trace.

```
[API Gateway] -- (traceparent) --> [User Service] -- (traceparent) --> [Notification Service]
   | (Span A)                         | (Span B)                           | (Span C)
   +----------------------------------+------------------------------------+
                                      |
                           (Exported trace log)
                                      v
                               [Jaeger / OTel]
```

---

## 2. Bootstrapping OTel SDK (`src/utils/otel.js`)

Because auto-instrumentation relies on intercepting module loading, the OpenTelemetry Node SDK must start *before* any other dependencies are imported.

We created the bootstrapper script:

```javascript
const { NodeSDK } = require('@opentelemetry/sdk-node');
const { getNodeAutoInstrumentations } = require('@opentelemetry/auto-instrumentations-node');
const { ConsoleSpanExporter, SimpleSpanProcessor } = require('@opentelemetry/sdk-trace-node');

const sdk = new NodeSDK({
  serviceName: 'production-platform',
  traceExporter: new ConsoleSpanExporter(), // Prints traces locally to console
  spanProcessor: new SimpleSpanProcessor(new ConsoleSpanExporter()),
  instrumentations: [
    getNodeAutoInstrumentations({
      '@opentelemetry/instrumentation-fs': { enabled: false } // Avoid noisy file access logs
    })
  ]
});

sdk.start();
```

---

## 3. Server Integration

We load the bootstrapper on line 1 of **[src/server.js](file:///Users/spakcomm-ajay/Documents/Roadmap/NodejsAppProduction/src/server.js)** to guarantee proper interception:

```javascript
// Initialize OpenTelemetry distributed tracing SDK before any other module loads
const { initOTel } = require('./utils/otel');
initOTel();

const path = require('path');
// ...
```

---

## 4. Verification & Testing

Verify that the SDK starts correctly and records active span contexts:
```bash
npm test tests/integration/opentelemetry.test.js
```
