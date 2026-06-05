'use strict';

const container = require('../../config/container');

const featureFlagDemoController = {
  // GET /api/v1/feature-flags/demo
  checkDemoFeatures: (req, res) => {
    const featureFlagService = container.resolve('featureFlagService');
    const userId = req.headers['x-user-id'] || 'anonymous-user';
    const isBetaEnabled = featureFlagService.isEnabled('enable-beta-features', { userId });

    if (isBetaEnabled) {
      return res.status(200).json({
        status: 'success',
        activeLayout: 'BETA_LAYOUT_2.0',
        featuresExposed: ['enhanced-security', 'realtime-sync', 'di-container-injections'],
        message: 'Welcome to the beta release platform.'
      });
    }

    res.status(200).json({
      status: 'success',
      activeLayout: 'CLASSIC_LAYOUT_1.0',
      featuresExposed: ['standard-crud'],
      message: 'Running standard stable distribution.'
    });
  }
};

module.exports = featureFlagDemoController;
