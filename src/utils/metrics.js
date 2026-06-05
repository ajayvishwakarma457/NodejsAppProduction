const promClient = require('prom-client');

// Create a custom registry
const register = new promClient.Registry();

// Add default system/process metrics to our custom registry
promClient.collectDefaultMetrics({ register });

// Define Custom Metrics
const httpRequestsTotal = new promClient.Counter({
  name: 'http_requests_total',
  help: 'Total number of HTTP requests processed',
  labelNames: ['method', 'route', 'status_code'],
});

const httpRequestDurationSeconds = new promClient.Histogram({
  name: 'http_request_duration_seconds',
  help: 'Duration of HTTP requests in seconds',
  labelNames: ['method', 'route', 'status_code'],
  buckets: [0.05, 0.1, 0.25, 0.5, 1, 2.5, 5, 10], // standard buckets in seconds
});

const activeConnections = new promClient.Gauge({
  name: 'active_connections',
  help: 'Number of currently active real-time connections',
  labelNames: ['type'], // 'websocket' or 'ws' or 'grpc'
});

const dbOperationsTotal = new promClient.Counter({
  name: 'db_operations_total',
  help: 'Total number of database operations executed',
  labelNames: ['operation', 'collection', 'status'], // operation: find, save, update; status: success, error
});

const syntheticProbeSuccess = new promClient.Gauge({
  name: 'synthetic_probe_success',
  help: 'Uptime probe result (1 = success, 0 = failure)',
  labelNames: ['target', 'status_code'],
});

const syntheticProbeDurationSeconds = new promClient.Histogram({
  name: 'synthetic_probe_duration_seconds',
  help: 'Duration of the synthetic uptime probe check in seconds',
  labelNames: ['target'],
  buckets: [0.05, 0.1, 0.25, 0.5, 1, 2.5, 5],
});

// Register custom metrics
register.registerMetric(httpRequestsTotal);
register.registerMetric(httpRequestDurationSeconds);
register.registerMetric(activeConnections);
register.registerMetric(dbOperationsTotal);
register.registerMetric(syntheticProbeSuccess);
register.registerMetric(syntheticProbeDurationSeconds);

// Middleware/Endpoint handlers
const metricsEndpoint = async (req, res) => {
  try {
    res.set('Content-Type', register.contentType);
    res.end(await register.metrics());
  } catch (err) {
    res.status(500).end(err);
  }
};

module.exports = {
  register,
  httpRequestsTotal,
  httpRequestDurationSeconds,
  activeConnections,
  dbOperationsTotal,
  syntheticProbeSuccess,
  syntheticProbeDurationSeconds,
  metricsEndpoint,
};
