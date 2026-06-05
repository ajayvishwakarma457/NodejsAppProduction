'use strict';

const crypto = require('crypto');

/**
 * Service to manage stateless consistent-hashing A/B testing user allocations.
 */
class AbTestingService {
  constructor({ logger } = {}) {
    this.logger = logger || require('../utils/logger');
  }

  /**
   * Assigns a user to an experiment variant consistently based on hashing.
   * @param {string} userId Unique identifier of the user/visitor.
   * @param {string} experimentId Unique identifier of the experiment.
   * @param {Array} variations Array of variants with weights, e.g., [{ name: 'control', weight: 50 }]
   * @returns {string} Assigned variant name.
   */
  getVariant(userId, experimentId, variations = []) {
    if (!userId || !experimentId) {
      throw new Error('User ID and Experiment ID are required for variant assignment');
    }

    const activeVariations = variations.length > 0 ? variations : [
      { name: 'control', weight: 50 },
      { name: 'treatment', weight: 50 }
    ];

    // Total weight checking
    const totalWeight = activeVariations.reduce((sum, v) => sum + v.weight, 0);
    if (totalWeight !== 100) {
      throw new Error('Total variations weights sum must equal exactly 100');
    }

    // 1. Consistent hash hashing: sha256(userId + experimentId)
    const hash = crypto
      .createHash('sha256')
      .update(`${userId}:${experimentId}`)
      .digest('hex');

    // 2. Map hex digest value to bucket range (0-99)
    const bucket = parseInt(hash.substring(0, 8), 16) % 100;

    // 3. Select variant according to weight buckets
    let accumulatedWeight = 0;
    for (const variant of activeVariations) {
      accumulatedWeight += variant.weight;
      if (bucket < accumulatedWeight) {
        this.logger.debug(`[A/B Testing] Bucketed user ${userId} in ${experimentId} -> ${variant.name} (Bucket: ${bucket})`);
        return variant.name;
      }
    }

    return activeVariations[0].name; // Default fallback
  }
}

module.exports = AbTestingService;
