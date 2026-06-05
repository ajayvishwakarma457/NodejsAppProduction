const opentelemetry = require('@opentelemetry/api');
const { initOTel } = require('../../src/utils/otel');

describe('OpenTelemetry Integration Tests', () => {
  let sdkInstance;

  beforeAll(() => {
    // Initialize OTel SDK inside test context
    sdkInstance = initOTel();
  });

  afterAll(async () => {
    // Shutdown SDK to release console exporters
    if (sdkInstance) {
      await sdkInstance.shutdown();
    }
  });

  test('should initialize OpenTelemetry API context and capture spans successfully', () => {
    const tracer = opentelemetry.trace.getTracer('test-tracer');
    
    // Create manual span to verify OTel tracer behaves correctly
    const span = tracer.startSpan('test-operation');
    
    expect(span.isRecording()).toBe(true);
    
    span.setAttribute('test.attribute', 'test-value');
    span.end();
    
    expect(span.isRecording()).toBe(false);
  });
});
