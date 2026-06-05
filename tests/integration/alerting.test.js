let axios;
jest.mock('axios');

// Ensure alerting keys are NOT set so we test both modes
const ORIGINAL_ENV = { ...process.env };

describe('AlertingService', () => {
  beforeEach(() => {
    jest.resetModules();
    axios = require('axios');
    jest.clearAllMocks();
    // Clear env so service starts in no-op mode by default
    delete process.env.PAGERDUTY_INTEGRATION_KEY;
    delete process.env.OPSGENIE_API_KEY;
  });

  afterAll(() => {
    process.env = ORIGINAL_ENV;
  });

  // ─── No-op mode (no API keys set) ───────────────────────────────────────────

  test('loads without throwing when no API keys are set', () => {
    expect(() => require('../../src/utils/alerting')).not.toThrow();
  });

  test('is disabled (no-op) when no API keys are set', () => {
    const alerting = require('../../src/utils/alerting');
    expect(alerting.enabled).toBe(false);
  });

  test('critical() resolves without calling axios when disabled', async () => {
    const alerting = require('../../src/utils/alerting');
    await expect(alerting.critical('Test alert', { foo: 'bar' })).resolves.toBeUndefined();
    expect(axios.post).not.toHaveBeenCalled();
  });

  test('warning() resolves without calling axios when disabled', async () => {
    const alerting = require('../../src/utils/alerting');
    await expect(alerting.warning('Memory high', { used: '90%' })).resolves.toBeUndefined();
    expect(axios.post).not.toHaveBeenCalled();
  });

  test('resolve() resolves without calling axios when disabled', async () => {
    const alerting = require('../../src/utils/alerting');
    await expect(alerting.resolve('some-dedup-key')).resolves.toBeUndefined();
    expect(axios.post).not.toHaveBeenCalled();
  });

  // ─── PagerDuty mode ──────────────────────────────────────────────────────────

  describe('with PagerDuty key configured', () => {
    beforeEach(() => {
      process.env.PAGERDUTY_INTEGRATION_KEY = 'test-pd-key';
      process.env.APP_NAME = 'test-app';
      axios.post.mockResolvedValue({ data: { status: 'success', message: 'Event processed' } });
    });

    test('is enabled when PAGERDUTY_INTEGRATION_KEY is set', () => {
      const alerting = require('../../src/utils/alerting');
      expect(alerting.enabled).toBe(true);
    });

    test('critical() calls PagerDuty Events API with correct payload', async () => {
      const alerting = require('../../src/utils/alerting');
      await alerting.critical('DB connection failed', { host: 'localhost' });

      expect(axios.post).toHaveBeenCalledWith(
        'https://events.pagerduty.com/v2/enqueue',
        expect.objectContaining({
          routing_key: 'test-pd-key',
          event_action: 'trigger',
          payload: expect.objectContaining({
            severity: 'critical',
            summary: 'DB connection failed',
            custom_details: expect.objectContaining({ host: 'localhost' }),
          }),
        }),
        expect.objectContaining({ timeout: 5000 })
      );
    });

    test('warning() sends with severity: warning', async () => {
      const alerting = require('../../src/utils/alerting');
      await alerting.warning('High latency detected', { p95: '3s' });

      expect(axios.post).toHaveBeenCalledWith(
        'https://events.pagerduty.com/v2/enqueue',
        expect.objectContaining({
          payload: expect.objectContaining({ severity: 'warning' }),
        }),
        expect.anything()
      );
    });

    test('resolve() sends event_action: resolve to PagerDuty', async () => {
      const alerting = require('../../src/utils/alerting');
      await alerting.resolve('my-dedup-key');

      expect(axios.post).toHaveBeenCalledWith(
        'https://events.pagerduty.com/v2/enqueue',
        expect.objectContaining({
          routing_key: 'test-pd-key',
          event_action: 'resolve',
          dedup_key: 'my-dedup-key',
        }),
        expect.anything()
      );
    });

    test('dedup key is auto-generated from summary when not provided', async () => {
      const alerting = require('../../src/utils/alerting');
      await alerting.critical('My service is down');

      const callArgs = axios.post.mock.calls[0][1];
      expect(callArgs.dedup_key).toBeTruthy();
      expect(typeof callArgs.dedup_key).toBe('string');
      expect(callArgs.dedup_key).toMatch(/^[a-z0-9-]+$/); // only lowercase + hyphens
    });
  });

  // ─── OpsGenie mode ───────────────────────────────────────────────────────────

  describe('with OpsGenie key configured', () => {
    beforeEach(() => {
      process.env.OPSGENIE_API_KEY = 'test-og-key';
      process.env.APP_NAME = 'test-app';
      axios.post.mockResolvedValue({ data: { requestId: 'req-123', took: 0.1, result: 'Request will be processed' } });
    });

    test('is enabled when OPSGENIE_API_KEY is set', () => {
      const alerting = require('../../src/utils/alerting');
      expect(alerting.enabled).toBe(true);
    });

    test('critical() calls OpsGenie API with P1 priority', async () => {
      const alerting = require('../../src/utils/alerting');
      await alerting.critical('Production DB down', { db: 'mongo' });

      expect(axios.post).toHaveBeenCalledWith(
        'https://api.opsgenie.com/v2/alerts',
        expect.objectContaining({ priority: 'P1' }),
        expect.objectContaining({
          headers: expect.objectContaining({ Authorization: 'GenieKey test-og-key' }),
        })
      );
    });

    test('warning() calls OpsGenie API with P3 priority', async () => {
      const alerting = require('../../src/utils/alerting');
      await alerting.warning('High memory usage', { heap: '85%' });

      expect(axios.post).toHaveBeenCalledWith(
        'https://api.opsgenie.com/v2/alerts',
        expect.objectContaining({ priority: 'P3' }),
        expect.anything()
      );
    });

    test('resolve() calls OpsGenie close endpoint with alias', async () => {
      const alerting = require('../../src/utils/alerting');
      await alerting.resolve('test-alert-key');

      expect(axios.post).toHaveBeenCalledWith(
        expect.stringContaining('/close'),
        expect.objectContaining({ source: expect.any(String) }),
        expect.objectContaining({ params: { identifierType: 'alias' } })
      );
    });

    test('OpsGenie message is capped at 130 characters', async () => {
      const alerting = require('../../src/utils/alerting');
      const longSummary = 'A'.repeat(200);
      await alerting.critical(longSummary);

      const callArgs = axios.post.mock.calls[0][1];
      expect(callArgs.message.length).toBeLessThanOrEqual(130);
    });
  });

  // ─── Resilience ──────────────────────────────────────────────────────────────

  describe('resilience', () => {
    beforeEach(() => {
      process.env.PAGERDUTY_INTEGRATION_KEY = 'test-pd-key';
      process.env.OPSGENIE_API_KEY = 'test-og-key';
    });

    test('does not throw when both channels fail (uses Promise.allSettled)', async () => {
      axios.post.mockRejectedValue(new Error('Network error'));
      const alerting = require('../../src/utils/alerting');
      // Should not throw — failures are caught internally
      await expect(alerting.critical('Something broke')).resolves.toBeUndefined();
    });

    test('still sends to OpsGenie if PagerDuty fails', async () => {
      axios.post
        .mockRejectedValueOnce(new Error('PD failed'))          // PagerDuty fails
        .mockResolvedValueOnce({ data: { requestId: 'ok' } }); // OpsGenie succeeds

      const alerting = require('../../src/utils/alerting');
      await alerting.critical('Partial failure test');

      // axios.post was called twice (one per channel)
      expect(axios.post).toHaveBeenCalledTimes(2);
    });
  });
});
