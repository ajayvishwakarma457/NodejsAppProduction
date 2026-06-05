const { SecretsManagerClient, GetSecretValueCommand } = require('@aws-sdk/client-secrets-manager');
const logger = require('../utils/logger');

/**
 * Dynamically loads secrets from AWS Secrets Manager or HashiCorp Vault
 * and injects them into process.env at runtime.
 */
const loadSecrets = async () => {
  const provider = process.env.SECRETS_PROVIDER || 'local';
  
  if (provider === 'local') {
    logger.info('[Secrets Manager] Loading configurations from local .env environment');
    return;
  }

  if (provider === 'aws') {
    const secretId = process.env.AWS_SECRET_ID;
    if (!secretId) {
      logger.warn('[Secrets Manager] SECRETS_PROVIDER set to "aws" but AWS_SECRET_ID is missing. Falling back to local env.');
      return;
    }

    try {
      logger.info(`[Secrets Manager] Fetching secrets from AWS Secrets Manager (Secret ID: ${secretId})...`);
      const client = new SecretsManagerClient({ region: process.env.AWS_REGION || 'us-east-1' });
      const response = await client.send(new GetSecretValueCommand({ SecretId: secretId }));
      
      if (response.SecretString) {
        const secrets = JSON.parse(response.SecretString);
        Object.keys(secrets).forEach((key) => {
          process.env[key] = secrets[key];
        });
        logger.info('[Secrets Manager] Successfully injected AWS secrets into runtime process.env');
      }
    } catch (err) {
      logger.error(`[Secrets Manager] Failed to load secrets from AWS Secrets Manager: ${err.message}`);
      if (process.env.NODE_ENV === 'production') {
        throw new Error(`Critical: Secrets provider failed in production: ${err.message}`);
      }
    }
    return;
  }

  if (provider === 'vault') {
    const vaultUrl = process.env.VAULT_ADDR;
    const vaultToken = process.env.VAULT_TOKEN;
    const secretPath = process.env.VAULT_SECRET_PATH || 'secret/data/app';

    if (!vaultUrl || !vaultToken) {
      logger.warn('[Secrets Manager] SECRETS_PROVIDER set to "vault" but VAULT_ADDR or VAULT_TOKEN is missing. Falling back to local env.');
      return;
    }

    try {
      logger.info(`[Secrets Manager] Fetching secrets from HashiCorp Vault (Endpoint: ${vaultUrl}/${secretPath})...`);
      // HashiCorp Vault KV Secrets Engine v2 utilizes REST API v1 endpoint paths
      const response = await fetch(`${vaultUrl}/v1/${secretPath}`, {
        method: 'GET',
        headers: {
          'X-Vault-Token': vaultToken,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error(`Vault returned HTTP status ${response.status}`);
      }

      const body = await response.json();
      // Vault KV v2 wraps secret fields in 'data.data' payload format
      const secrets = body.data && body.data.data ? body.data.data : body.data;
      if (secrets) {
        Object.keys(secrets).forEach((key) => {
          process.env[key] = secrets[key];
        });
        logger.info('[Secrets Manager] Successfully injected HashiCorp Vault secrets into runtime process.env');
      }
    } catch (err) {
      logger.error(`[Secrets Manager] Failed to load secrets from HashiCorp Vault: ${err.message}`);
      if (process.env.NODE_ENV === 'production') {
        throw new Error(`Critical: Secrets provider failed in production: ${err.message}`);
      }
    }
  }
};

module.exports = loadSecrets;
