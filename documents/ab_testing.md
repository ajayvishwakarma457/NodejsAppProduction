# A/B Testing Infrastructure Guide

This guide details the implementation of a stateless, consistent-hashing **A/B Testing (Split Testing) Infrastructure** inside our application.

---

## 1. Architectural Strategy

A/B testing evaluates variant performance by distributing users into test groups. Traditional solutions rely on stateful databases, introducing queries latency.

Our framework uses **stateless consistent hashing**:
1. It hashes the unique user identifier combined with the experiment key using `sha256`.
2. It translates the hash value into a consistent bucket coordinate (`0-99`).
3. Users are assigned to variants corresponding to bucket boundaries.

This ensures **absolute consistency** (a user always sees the same variant across sessions) with **zero latency** and **no database hits**.

---

## 2. Directory Layout

The split testing system is integrated via:

```
src/
├── config/
│   └── container.js          # Registers AbTestingService inside the DI Container
├── services/
│   └── abTestingService.js   # Consistent hashing bucketing service logic
├── controllers/
│   └── v1/
│       └── abTestingDemoController.js # Toggles price variants and increments metrics
└── routes/
    └── v1/
        └── abTestingDemoRoutes.js # Routes requests to the split-testing demo controller
```

---

## 3. Allocation Tracking Metrics

Variant exposures must be tracked to calculate conversions. The framework integrates with **Prometheus** via `prom-client` directly in [src/controllers/v1/abTestingDemoController.js](file:///Users/spakcomm-ajay/Documents/Roadmap/NodejsAppProduction/src/controllers/v1/abTestingDemoController.js):

- **Counter registered**: `ab_test_allocations_total` (labels: `experiment_id`, `variant`).
- Scraping this metric over time exposes how many users are exposed to `control` vs `treatment`, which can be cross-correlated with payment success logs to evaluate conversions.

---

## 4. Usage in Controllers

Define variations with weights summing to exactly 100, and query allocation:

```javascript
const abTestingService = container.resolve('abTestingService');

const variations = [
  { name: 'control', weight: 50 },
  { name: 'treatment', weight: 50 }
];

const variant = abTestingService.getVariant(userId, 'pricing-experiment', variations);
```
