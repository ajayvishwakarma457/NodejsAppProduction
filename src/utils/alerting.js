'use strict';

const axios = require('axios');
const logger = require('./logger');

/**
 * AlertingService — Production-grade alerting integration
 *
 * Supports:
 *  - PagerDuty  (Events API v2)
 *  - OpsGenie   (Alert API v2)
 *
 * Both channels are optional. The service activates only when
 * the corresponding API key env vars are set. If neither is
 * configured the service runs in no-op mode so the app never
 * crashes due to missing alerting credentials.
 *
 * Usage:
 *  const alerting = require('./alerting');
 *  await alerting.critical('Database connection lost', { host, port });
 *  await alerting.warning('High memory usage', { heapUsed });
 *  await alerting.resolve('Database connection lost');
 */

class AlertingService {
  constructor() {
    // ── PagerDuty ─────────────────────────────────────────────────────────────
    this.pagerdutyKey = process.env.PAGERDUTY_INTEGRATION_KEY || null;
    this.pagerdutyUrl = 'https://events.pagerduty.com/v2/enqueue';

    // ── OpsGenie ──────────────────────────────────────────────────────────────
    this.opsgenieKey  = process.env.OPSGENIE_API_KEY || null;
    this.opsgenieUrl  = 'https://api.opsgenie.com/v2/alerts';

    // ── Shared ────────────────────────────────────────────────────────────────
    this.appName = process.env.APP_NAME    || 'nodejs-production-platform';
    this.env     = process.env.NODE_ENV    || 'development';
    this.enabled = !!(this.pagerdutyKey || this.opsgenieKey);

    if (this.enabled) {
      const active = [
        this.pagerdutyKey && 'PagerDuty',
        this.opsgenieKey  && 'OpsGenie',
      ].filter(Boolean).join(', ');
      logger.info(`[Alerting] Service initialized — channels: ${active}`);
    } else {
      logger.warn('[Alerting] No API keys set — running in no-op mode. Set PAGERDUTY_INTEGRATION_KEY or OPSGENIE_API_KEY to enable.');
    }
  }

  // ─── Public API ─────────────────────────────────────────────────────────────

  /**
   * Send a CRITICAL alert (pages on-call engineer immediately).
   * @param {string} summary   - Short human-readable description
   * @param {Object} details   - Extra key/value metadata
   * @param {string} [dedupKey] - Deduplication key (defaults to summary hash)
   */
  async critical(summary, details = {}, dedupKey = null) {
    return this._send({ severity: 'critical', summary, details, dedupKey });
  }

  /**
   * Send a WARNING alert (creates ticket, may not page immediately).
   * @param {string} summary
   * @param {Object} details
   * @param {string} [dedupKey]
   */
  async warning(summary, details = {}, dedupKey = null) {
    return this._send({ severity: 'warning', summary, details, dedupKey });
  }

  /**
   * Resolve a previously fired alert.
   * @param {string} dedupKey - Must match the key used when the alert was sent
   */
  async resolve(dedupKey) {
    return this._resolve(dedupKey);
  }

  /**
   * Send an INFO-level event (no page, just enriches the timeline).
   * @param {string} summary
   * @param {Object} details
   */
  async info(summary, details = {}) {
    return this._send({ severity: 'info', summary, details });
  }

  // ─── Private Helpers ────────────────────────────────────────────────────────

  /**
   * Generate a stable dedup key from a summary string.
   * @private
   */
  _dedupKey(summary) {
    return `${this.appName}-${summary}`
      .toLowerCase()
      .replace(/[^a-z0-9-]/g, '-')
      .replace(/-+/g, '-')
      .slice(0, 255);
  }

  /**
   * Dispatch alert to all configured channels in parallel.
   * @private
   */
  async _send({ severity, summary, details, dedupKey }) {
    if (!this.enabled) return;

    const key    = dedupKey || this._dedupKey(summary);
    const source = `${this.appName} [${this.env}]`;

    const results = await Promise.allSettled([
      this._sendPagerDuty({ severity, summary, details, dedupKey: key, source }),
      this._sendOpsGenie({ severity, summary, details, dedupKey: key }),
    ]);

    results.forEach((r, i) => {
      if (r.status === 'rejected') {
        const channel = i === 0 ? 'PagerDuty' : 'OpsGenie';
        logger.error(`[Alerting] ${channel} dispatch failed: ${r.reason?.message}`);
      }
    });
  }

  /**
   * Resolve alert on all configured channels.
   * @private
   */
  async _resolve(dedupKey) {
    if (!this.enabled) return;

    const results = await Promise.allSettled([
      this._resolvePagerDuty(dedupKey),
      this._resolveOpsGenie(dedupKey),
    ]);

    results.forEach((r, i) => {
      if (r.status === 'rejected') {
        const channel = i === 0 ? 'PagerDuty' : 'OpsGenie';
        logger.error(`[Alerting] ${channel} resolve failed: ${r.reason?.message}`);
      }
    });
  }

  // ─── PagerDuty ──────────────────────────────────────────────────────────────

  /**
   * Send alert via PagerDuty Events API v2.
   * Docs: https://developer.pagerduty.com/docs/events-api-v2/trigger-events
   * @private
   */
  async _sendPagerDuty({ severity, summary, details, dedupKey, source }) {
    if (!this.pagerdutyKey) return;

    const payload = {
      routing_key:  this.pagerdutyKey,
      event_action: 'trigger',
      dedup_key:    dedupKey,
      payload: {
        summary,
        source,
        severity,                                   // critical | warning | error | info
        timestamp: new Date().toISOString(),
        custom_details: {
          ...details,
          app:         this.appName,
          environment: this.env,
        },
      },
      client:     this.appName,
      client_url: process.env.APP_URL || 'http://localhost:5000',
    };

    const res = await axios.post(this.pagerdutyUrl, payload, {
      headers: { 'Content-Type': 'application/json' },
      timeout: 5000,
    });

    logger.info(`[Alerting] PagerDuty alert sent — dedup_key: ${dedupKey}, status: ${res.data?.status}`);
    return res.data;
  }

  /**
   * Resolve a PagerDuty alert.
   * @private
   */
  async _resolvePagerDuty(dedupKey) {
    if (!this.pagerdutyKey) return;

    const payload = {
      routing_key:  this.pagerdutyKey,
      event_action: 'resolve',
      dedup_key:    dedupKey,
    };

    const res = await axios.post(this.pagerdutyUrl, payload, {
      headers: { 'Content-Type': 'application/json' },
      timeout: 5000,
    });

    logger.info(`[Alerting] PagerDuty alert resolved — dedup_key: ${dedupKey}`);
    return res.data;
  }

  // ─── OpsGenie ───────────────────────────────────────────────────────────────

  /**
   * Map severity string to OpsGenie priority field.
   * OpsGenie uses P1–P5 instead of severity words.
   * @private
   */
  _opsGeniePriority(severity) {
    const map = { critical: 'P1', error: 'P2', warning: 'P3', info: 'P5' };
    return map[severity] || 'P3';
  }

  /**
   * Send alert via OpsGenie Alert API v2.
   * Docs: https://docs.opsgenie.com/docs/alert-api
   * @private
   */
  async _sendOpsGenie({ severity, summary, details, dedupKey }) {
    if (!this.opsgenieKey) return;

    const payload = {
      message:     summary.slice(0, 130),           // OpsGenie max: 130 chars
      alias:       dedupKey,                        // alias = dedup key in OpsGenie
      description: JSON.stringify(details, null, 2),
      source:      this.appName,
      priority:    this._opsGeniePriority(severity),
      tags:        [this.appName, this.env, severity],
      details: {
        ...Object.fromEntries(
          Object.entries(details).map(([k, v]) => [k, String(v)])
        ),
        app:         this.appName,
        environment: this.env,
        severity,
      },
    };

    const res = await axios.post(this.opsgenieUrl, payload, {
      headers: {
        'Content-Type':  'application/json',
        'Authorization': `GenieKey ${this.opsgenieKey}`,
      },
      timeout: 5000,
    });

    logger.info(`[Alerting] OpsGenie alert sent — alias: ${dedupKey}, requestId: ${res.data?.requestId}`);
    return res.data;
  }

  /**
   * Close an OpsGenie alert by alias.
   * Docs: https://docs.opsgenie.com/docs/alert-api#close-alert
   * @private
   */
  async _resolveOpsGenie(dedupKey) {
    if (!this.opsgenieKey) return;

    const res = await axios.post(
      `${this.opsgenieUrl}/${encodeURIComponent(dedupKey)}/close`,
      { source: this.appName, note: 'Auto-resolved by application' },
      {
        params:  { identifierType: 'alias' },
        headers: {
          'Content-Type':  'application/json',
          'Authorization': `GenieKey ${this.opsgenieKey}`,
        },
        timeout: 5000,
      }
    );

    logger.info(`[Alerting] OpsGenie alert closed — alias: ${dedupKey}`);
    return res.data;
  }
}

// Export a singleton so all modules share the same instance
module.exports = new AlertingService();
