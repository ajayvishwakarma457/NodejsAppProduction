const { NodeSDK } = require('@opentelemetry/sdk-node');
const { getNodeAutoInstrumentations } = require('@opentelemetry/auto-instrumentations-node');
const { ConsoleSpanExporter, SimpleSpanProcessor } = require('@opentelemetry/sdk-trace-node');
const logger = require('./logger');

let sdk = null;

const initOTel = () => {
  if (sdk) {
    return sdk;
  }

  logger.info('[OpenTelemetry] Initializing Node SDK with Auto Instrumentations...');

  // Configure Console exporter for local trace verification
  const traceExporter = new ConsoleSpanExporter();
  const spanProcessor = new SimpleSpanProcessor(traceExporter);

  sdk = new NodeSDK({
    serviceName: 'production-platform',
    traceExporter,
    spanProcessor,
    instrumentations: [
      getNodeAutoInstrumentations({
        // Disable heavy/noisy default instrumentations if needed
        '@opentelemetry/instrumentation-fs': { enabled: false },
      }),
    ],
  });

  try {
    sdk.start();
    logger.info('[OpenTelemetry] SDK started successfully and listening.');
  } catch (err) {
    logger.error(`[OpenTelemetry] SDK failed to start: ${err.message}`);
  }

  // Graceful shutdown on process termination
  process.on('SIGTERM', () => {
    sdk.shutdown()
      .then(() => logger.info('[OpenTelemetry] SDK shut down cleanly.'))
      .catch((err) => logger.error(`[OpenTelemetry] Error shutting down SDK: ${err.message}`));
  });

  return sdk;
};

module.exports = {
  initOTel,
};
