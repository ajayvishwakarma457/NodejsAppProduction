'use strict';

const logger = require('../utils/logger');
let unleash = null;

// Initialize Unleash client dynamically if credentials are provided
if (process.env.UNLEASH_URL && process.env.UNLEASH_TOKEN) {
  try {
    const { initialize } = require('unleash-client');
    unleash = initialize({
      url: process.env.UNLEASH_URL,
      appName: process.env.APP_NAME || 'nodejs-production-platform',
      customHeaders: {
        Authorization: process.env.UNLEASH_TOKEN,
      },
    });
    logger.info('[Feature Flags] Unleash Client initialized successfully');
  } catch (err) {
    logger.error(`[Feature Flags] Failed to initialize Unleash Client: ${err.message}`);
  }
}

/**
 * Service to manage runtime feature flag evaluations.
 * Supports Unleash SDK integration and local overrides fallback.
 */
class FeatureFlagService {
  constructor({ loggerInstance } = {}) {
    this.logger = loggerInstance || logger;
  }

  /**
   * Evaluates if a feature is enabled.
   * @param {string} flagName Name of the feature flag toggle.
   * @param {object} context Evaluation context containing userId, session metadata, etc.
   * @returns {boolean} True if the feature flag is enabled.
   */
  isEnabled(flagName, context = {}) {
    // 1. Check if Unleash client is active
    if (unleash) {
      const isUnleashEnabled = unleash.isEnabled(flagName, context);
      this.logger.debug(`[Feature Flags] Unleash evaluated ${flagName} -> ${isUnleashEnabled}`);
      return isUnleashEnabled;
    }

    // 2. Fall back to local environment overrides configuration
    const envVarName = `FEATURE_${flagName.toUpperCase().replace(/[-.]/g, '_')}`;
    const localConfigValue = process.env[envVarName];

    if (localConfigValue !== undefined) {
      const isLocalEnabled = localConfigValue === 'true';
      this.logger.debug(`[Feature Flags] Local env override evaluated ${flagName} (${envVarName}) -> ${isLocalEnabled}`);
      return isLocalEnabled;
    }

    // 3. Fallback default configurations
    const defaultFlags = {
      'enable-beta-features': false,
      'new-dashboard-layout': false,
      'promo-discount-code': true
    };

    const isDefaultEnabled = defaultFlags[flagName] || false;
    this.logger.debug(`[Feature Flags] Default evaluated ${flagName} -> ${isDefaultEnabled}`);
    return isDefaultEnabled;
  }
}

module.exports = FeatureFlagService;
