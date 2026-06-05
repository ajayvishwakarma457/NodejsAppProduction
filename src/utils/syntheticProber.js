'use strict';

const axios = require('axios');
const logger = require('./logger');
const { syntheticProbeSuccess, syntheticProbeDurationSeconds } = require('./metrics');

class SyntheticProber {
  constructor() {
    this.intervalMs = parseInt(process.env.SYNTHETIC_PROBE_INTERVAL_MS || '30000', 10);
    this.targets = (process.env.SYNTHETIC_PROBE_TARGETS || 'http://localhost:5000/health')
      .split(',')
      .map(t => t.trim());
    this.timer = null;
    this.running = false;
  }

  /**
   * Start the synthetic monitoring prober loop
   */
  start() {
    if (this.running) return;
    this.running = true;
    logger.info(`[Synthetic Prober] Starting synthetic prober with interval ${this.intervalMs}ms on targets: ${this.targets.join(', ')}`);
    
    // Run initial probe immediately, then schedule
    this.probe();
    this.timer = setInterval(() => this.probe(), this.intervalMs);
  }

  /**
   * Stop the synthetic monitoring loop
   */
  stop() {
    if (!this.running) return;
    this.running = false;
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }
    logger.info('[Synthetic Prober] Stopped synthetic prober.');
  }

  /**
   * Execute probes on all registered targets
   */
  async probe() {
    const promises = this.targets.map(async (target) => {
      const startTime = process.hrtime();
      let statusCode = '0';
      let success = 0;

      try {
        const response = await axios.get(target, {
          timeout: 5000,
          headers: { 'User-Agent': 'SyntheticUptimeProber/1.0' },
        });
        
        statusCode = String(response.status);
        if (response.status >= 200 && response.status < 300) {
          success = 1;
        }
      } catch (error) {
        if (error.response) {
          statusCode = String(error.response.status);
        } else if (error.code) {
          statusCode = error.code; // e.g. ECONNREFUSED
        } else {
          statusCode = 'UNKNOWN';
        }
        logger.error(`[Synthetic Prober] Probe failed for target ${target}: ${error.message}`);
      } finally {
        const diff = process.hrtime(startTime);
        const durationSeconds = diff[0] + diff[1] / 1e9;

        // Record metrics
        syntheticProbeSuccess.set({ target, status_code: statusCode }, success);
        syntheticProbeDurationSeconds.observe({ target }, durationSeconds);

        logger.debug(`[Synthetic Prober] Probe target: ${target} | success: ${success} | duration: ${durationSeconds.toFixed(4)}s | statusCode: ${statusCode}`);
      }
    });

    await Promise.allSettled(promises);
  }
}

module.exports = new SyntheticProber();
