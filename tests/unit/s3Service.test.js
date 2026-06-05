const fs = require('fs');
const { S3Client, PutObjectCommand } = require('@aws-sdk/client-s3');

// Mock the file system and AWS S3 SDK modules
jest.mock('fs', () => ({
  existsSync: jest.fn(),
  mkdirSync: jest.fn(),
  promises: {
    writeFile: jest.fn(),
  },
}));

jest.mock('@aws-sdk/client-s3', () => {
  const mockSend = jest.fn();
  return {
    S3Client: jest.fn().mockImplementation(() => ({
      send: mockSend,
    })),
    PutObjectCommand: jest.fn(),
  };
});

describe('s3Service Unit Tests with jest.mock', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    jest.clearAllMocks();
    jest.resetModules(); // clears module cache so env variables can be re-evaluated
    process.env = { ...originalEnv };
  });

  afterAll(() => {
    process.env = originalEnv;
  });

  test('should save file locally when S3 is in mock mode', async () => {
    process.env.AWS_ACCESS_KEY_ID = 'mock-access-key-id';
    
    // Require service and mock dependencies inside the test to get fresh module scope
    const s3Service = require('../../src/utils/s3Service');
    const localFs = require('fs');

    const mockFile = {
      originalname: 'test-image.png',
      fieldname: 'avatar',
      buffer: Buffer.from('dummy-binary-data'),
      mimetype: 'image/png',
      size: 1234,
    };

    localFs.existsSync.mockReturnValue(false); // Simulating directory doesn't exist
    localFs.promises.writeFile.mockResolvedValue(undefined); // Simulate successful file write

    const result = await s3Service.uploadToS3(mockFile);

    // Assert local filesystem calls were made
    expect(localFs.existsSync).toHaveBeenCalled();
    expect(localFs.mkdirSync).toHaveBeenCalledWith(expect.any(String), { recursive: true });
    expect(localFs.promises.writeFile).toHaveBeenCalledWith(
      expect.stringContaining('.png'),
      mockFile.buffer
    );

    // Check the returned metadata structure
    expect(result.storageType).toBe('mock-s3-local-fallback');
    expect(result.originalName).toBe('test-image.png');
    expect(result.location).toContain('production-roadmap-bucket.s3');
  });

  test('should initialize S3Client and call send command in real mode', async () => {
    process.env.AWS_ACCESS_KEY_ID = 'real-key-id';
    process.env.AWS_SECRET_ACCESS_KEY = 'real-secret';
    process.env.AWS_REGION = 'us-east-1';
    process.env.AWS_S3_BUCKET = 'production-roadmap-bucket';

    const s3Service = require('../../src/utils/s3Service');
    const { S3Client: MockedS3Client, PutObjectCommand: MockedPutObjectCommand } = require('@aws-sdk/client-s3');

    const mockFile = {
      originalname: 'profile.jpg',
      fieldname: 'photo',
      buffer: Buffer.from('image-buffer-data'),
      mimetype: 'image/jpeg',
      size: 5678,
    };

    const dummySend = jest.fn().mockResolvedValue({ $metadata: { httpStatusCode: 200 } });
    MockedS3Client.mockImplementation(() => ({
      send: dummySend,
    }));

    const result = await s3Service.uploadToS3(mockFile);

    // Verify put command was called with correct parameters
    expect(MockedPutObjectCommand).toHaveBeenCalledWith(
      expect.objectContaining({
        Bucket: 'production-roadmap-bucket',
        Body: mockFile.buffer,
        ContentType: 'image/jpeg',
      })
    );

    // Check returned values
    expect(result.storageType).toBe('aws-s3');
    expect(result.location).toContain('production-roadmap-bucket.s3.us-east-1.amazonaws.com/uploads/');
  });
});
