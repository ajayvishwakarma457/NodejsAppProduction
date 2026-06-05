'use strict';

const container = require('../../config/container');
const { register } = require('../../utils/metrics');
const promClient = require('prom-client');

// Register experiment allocation counter directly in the prometheus registry
let abTestAllocations;
try {
  abTestAllocations = new promClient.Counter({
    name: 'ab_test_allocations_total',
    help: 'Total allocations of A/B test variants',
    labelNames: ['experiment_id', 'variant'],
    registers: [register]
  });
} catch (err) {
  // If already registered during hot reloads or test runs, retrieve it
  abTestAllocations = register.getSingleMetric('ab_test_allocations_total');
}

const abTestingDemoController = {
  // GET /api/v1/ab-test/pricing
  getPricingPlan: (req, res) => {
    const abTestingService = container.resolve('abTestingService');
    const userId = req.headers['x-user-id'] || req.query.userId || 'visitor-anonymous';

    // Pricing experiment configuration: 50% Control ($9.99), 50% Treatment ($14.99)
    const variations = [
      { name: 'control', weight: 50 },
      { name: 'treatment', weight: 50 }
    ];

    const variant = abTestingService.getVariant(userId, 'pricing-experiment', variations);

    // Track variant assignment metrics
    if (abTestAllocations) {
      abTestAllocations.inc({ experiment_id: 'pricing-experiment', variant });
    }

    if (variant === 'treatment') {
      return res.status(200).json({
        status: 'success',
        experimentId: 'pricing-experiment',
        variant,
        pricing: {
          plan: 'Premium Pro',
          price: 14.99,
          currency: 'USD',
          billing: 'monthly'
        },
        features: ['basic-features', 'unlimited-collaborators', 'priority-email-support']
      });
    }

    // Default control plan
    res.status(200).json({
      status: 'success',
      experimentId: 'pricing-experiment',
      variant,
      pricing: {
        plan: 'Premium Pro',
        price: 9.99,
        currency: 'USD',
        billing: 'monthly'
      },
      features: ['basic-features', 'unlimited-collaborators']
    });
  }
};

module.exports = abTestingDemoController;
