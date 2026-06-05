'use strict';

const AbTestingService = require('../../src/services/abTestingService');

describe('A/B Testing Service Tests', () => {
  it('should assign variants consistently for the same user and experiment', () => {
    const service = new AbTestingService();
    const userId1 = 'user_123456';
    const experimentId = 'pricing-experiment';

    const variantFirst = service.getVariant(userId1, experimentId);
    const variantSecond = service.getVariant(userId1, experimentId);

    expect(variantFirst).toBeDefined();
    expect(variantFirst).toBe(variantSecond); // Must be consistent
  });

  it('should support dynamic variations weights configuration and error validations', () => {
    const service = new AbTestingService();

    // Sum is not equal to 100
    const invalidVariations = [
      { name: 'control', weight: 40 },
      { name: 'treatment', weight: 40 }
    ];

    expect(() => {
      service.getVariant('user1', 'exp1', invalidVariations);
    }).toThrow('Total variations weights sum must equal exactly 100');
  });

  it('should distribute users approximately evenly according to variations weights', () => {
    const service = new AbTestingService();
    const experimentId = 'split-test';
    const variations = [
      { name: 'control', weight: 50 },
      { name: 'treatment', weight: 50 }
    ];

    const allocations = { control: 0, treatment: 0 };

    // Bucketing 100 users
    for (let i = 0; i < 100; i++) {
      const userId = `user_${i}`;
      const variant = service.getVariant(userId, experimentId, variations);
      allocations[variant]++;
    }

    // Verify both variations receive users (statistically expected)
    expect(allocations.control).toBeGreaterThan(30);
    expect(allocations.treatment).toBeGreaterThan(30);
    expect(allocations.control + allocations.treatment).toBe(100);
  });
});
