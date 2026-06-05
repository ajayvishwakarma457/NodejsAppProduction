const loadSecrets = require('../../src/config/secrets');
const { SecretsManagerClient } = require('@aws-sdk/client-secrets-manager');

// Mock Winston Logger
jest.mock('../../src/utils/logger', () => ({
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn()
}));

// Mock AWS Secrets Manager Client
jest.mock('@aws-sdk/client-secrets-manager', () => {
  const mSend = jest.fn();
  return {
    SecretsManagerClient: jest.fn().mockImplementation(() => ({
      send: mSend
    })),
    GetSecretValueCommand: jest.fn().mockImplementation((args) => args),
    mSend
  };
});

describe('Secrets Manager Loader', () => {
  let originalEnv;

  beforeEach(() => {
    jest.clearAllMocks();
    originalEnv = { ...process.env };
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  it('should skip fetching and load local env when provider is local', async () => {
    process.env.SECRETS_PROVIDER = 'local';
    await loadSecrets();
    expect(SecretsManagerClient).not.toHaveBeenCalled();
  });

  it('should load secrets from AWS Secrets Manager when provider is aws', async () => {
    process.env.SECRETS_PROVIDER = 'aws';
    process.env.AWS_SECRET_ID = 'test-secret-id';
    process.env.AWS_REGION = 'us-east-1';

    const mockSecretsString = JSON.stringify({
      DATABASE_URL: 'mongodb://mock-aws-db:27017',
      JWT_SECRET: 'aws-secret-key'
    });

    const { mSend } = require('@aws-sdk/client-secrets-manager');
    mSend.mockResolvedValueOnce({ SecretString: mockSecretsString });

    await loadSecrets();

    expect(mSend).toHaveBeenCalled();
    expect(process.env.DATABASE_URL).toBe('mongodb://mock-aws-db:27017');
    expect(process.env.JWT_SECRET).toBe('aws-secret-key');
  });

  it('should load secrets from HashiCorp Vault when provider is vault', async () => {
    process.env.SECRETS_PROVIDER = 'vault';
    process.env.VAULT_ADDR = 'http://127.0.0.1:8200';
    process.env.VAULT_TOKEN = 'test-vault-token';
    process.env.VAULT_SECRET_PATH = 'secret/data/test';

    const mockResponse = {
      data: {
        data: {
          DATABASE_URL: 'mongodb://mock-vault-db:27017',
          JWT_SECRET: 'vault-secret-key'
        }
      }
    };

    global.fetch = jest.fn().mockResolvedValueOnce({
      ok: true,
      json: jest.fn().mockResolvedValueOnce(mockResponse)
    });

    await loadSecrets();

    expect(global.fetch).toHaveBeenCalledWith(
      'http://127.0.0.1:8200/v1/secret/data/test',
      expect.objectContaining({
        headers: {
          'X-Vault-Token': 'test-vault-token',
          'Content-Type': 'application/json'
        }
      })
    );

    expect(process.env.DATABASE_URL).toBe('mongodb://mock-vault-db:27017');
    expect(process.env.JWT_SECRET).toBe('vault-secret-key');
  });
});
