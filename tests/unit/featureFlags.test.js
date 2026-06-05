'use strict';

const FeatureFlagService = require('../../src/services/featureFlagService');

describe('Feature Flags Service Tests', () => {
  let originalEnv;

  beforeEach(() => {
    originalEnv = { ...process.env };
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  it('should return default flag configuration values when no override is present', () => {
    const service = new FeatureFlagService();
    expect(service.isEnabled('enable-beta-features')).toBe(false);
    expect(service.isEnabled('promo-discount-code')).toBe(true);
    expect(service.isEnabled('non-existent-flag')).toBe(false);
  });

  it('should respect environment variable overrides when present', () => {
    process.env.FEATURE_ENABLE_BETA_FEATURES = 'true';
    process.env.FEATURE_PROMO_DISCOUNT_CODE = 'false';

    const service = new FeatureFlagService();
    expect(service.isEnabled('enable-beta-features')).toBe(true);
    expect(service.isEnabled('promo-discount-code')).toBe(false);
  });
});
