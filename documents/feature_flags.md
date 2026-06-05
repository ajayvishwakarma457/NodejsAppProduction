# Feature Flags Integration Guide

This document describes the design and configuration of runtime **Feature Flags** (supporting **Unleash** and **LaunchDarkly** patterns) inside the application.

---

## 1. Architectural Strategy

Feature flags allow teams to toggle application features dynamically at runtime without redeploying code. They facilitate:
- **Trunk-based development**: Merging code safely behind disabled toggles.
- **Canary releases**: Enabling beta functionality strictly for internal testers or a subset of users.
- **Circuit breakers**: Disabling failing system features instantly without rollback pipelines.

---

## 2. Directory Layout

The feature flag architecture is integrated via:

```
src/
├── config/
│   └── container.js          # Registers FeatureFlagService inside the DI Container
├── services/
│   └── featureFlagService.js # Core unified service mapping Unleash client / local overrides
└── controllers/
    └── v1/
        └── featureFlagDemoController.js # Demo controller demonstrating flag-based branch logic
```

---

## 3. Configuration & Overrides

### A. Enterprise Backends Config (Unleash)
Define these properties in your production container environment to initialize the Unleash SDK:
- `UNLEASH_URL`: `https://unleash-server.domain.com/api` (Server API endpoint)
- `UNLEASH_TOKEN`: `your-authorization-token` (SDK authentication key)

### B. Local Environment Overrides
For local development, integration pipelines, and offline setups, you can override any toggle configuration using environment variables formatted as:
`FEATURE_<NAME_IN_CAPITALS_UNDERSCORE>`

For example:
- `FEATURE_ENABLE_BETA_FEATURES=true`
- `FEATURE_PROMO_DISCOUNT_CODE=false`

---

## 4. Usage in Controllers

Resolve the service class using the DI container, and evaluate flags dynamically:
```javascript
const featureFlagService = container.resolve('featureFlagService');

// evaluates toggle boolean
const isBetaEnabled = featureFlagService.isEnabled('enable-beta-features', {
  userId: req.user.id,
  email: req.user.email
});
```
