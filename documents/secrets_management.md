# Secrets Management Guide

This document describes the design and integration of secure runtime secrets fetching using **AWS Secrets Manager** and **HashiCorp Vault**.

---

## 1. Architectural Strategy

Rather than storing secrets in plain-text `.env` files inside production environments or container layers, the application supports **dynamic secrets injection at startup**.

During server initialization, [src/config/secrets.js](file:///Users/spakcomm-ajay/Documents/Roadmap/NodejsAppProduction/src/config/secrets.js) evaluates the `SECRETS_PROVIDER` flag to dynamically fetch production credentials (database strings, API keys, private credentials) directly into memory (`process.env`), keeping them away from disk writes.

---

## 2. Configuration Parameters

Inject the following variables into your production environment to configure the secrets provider:

| Variable | Description | Example / Required values |
| :--- | :--- | :--- |
| `SECRETS_PROVIDER` | Defines the provider backend | `aws` \| `vault` \| `local` (default) |
| **AWS Settings** | | |
| `AWS_SECRET_ID` | Secret Identifier/ARN in AWS | `production/app/secrets` |
| `AWS_REGION` | Target AWS region | `us-east-1` |
| **Vault Settings** | | |
| `VAULT_ADDR` | Host address of HashiCorp Vault server | `http://vault.internal.net:8200` |
| `VAULT_TOKEN` | Auth token for credentials fetching | `hvs.MTky...` |
| `VAULT_SECRET_PATH` | Path of the KV Secret | `secret/data/production-app` |

---

## 3. Integration Implementations

### A. AWS Secrets Manager Integration
Uses the official `@aws-sdk/client-secrets-manager` library:
- Connects using standard IAM execution roles assigned to EC2/ECS/Fargate tasks (no explicit access keys needed).
- Fetches JSON payload via `GetSecretValueCommand` and parses them into `process.env` properties.

### B. HashiCorp Vault Integration
Integrates with HashiCorp Vault's KV Secrets Engine v2:
- Performs an HTTP request directly to Vault's HTTP REST API `/v1/<path>`.
- Passes authentication keys via the `X-Vault-Token` request header.
- Unwraps standard KV v2 `data.data` response formats and maps them into environment variables.
