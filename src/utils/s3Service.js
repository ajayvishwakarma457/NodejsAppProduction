const { S3Client, PutObjectCommand } = require('@aws-sdk/client-s3');
const path = require('path');
const fs = require('fs');

const AWS_ACCESS_KEY_ID = process.env.AWS_ACCESS_KEY_ID || 'mock-access-key-id';
const AWS_SECRET_ACCESS_KEY = process.env.AWS_SECRET_ACCESS_KEY || 'mock-secret-access-key';
const AWS_REGION = process.env.AWS_REGION || 'us-east-1';
const AWS_S3_BUCKET = process.env.AWS_S3_BUCKET || 'production-roadmap-bucket';

let s3Client = null;
const isMock = AWS_ACCESS_KEY_ID === 'mock-access-key-id';

if (!isMock) {
  s3Client = new S3Client({
    region: AWS_REGION,
    credentials: {
      accessKeyId: AWS_ACCESS_KEY_ID,
      secretAccessKey: AWS_SECRET_ACCESS_KEY,
    },
  });
}

/**
 * Uploads a file buffer to S3 (or saves locally if mock keys are detected)
 * @param {Object} fileMulterObj - Multer file object (from memory storage)
 * @returns {Promise<Object>} Object containing location, key, originalName, and mimetype
 */
async function uploadToS3(fileMulterObj) {
  const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
  const ext = path.extname(fileMulterObj.originalname);
  const key = `uploads/${fileMulterObj.fieldname}-${uniqueSuffix}${ext}`;

  if (isMock) {
    // Local fallback: save the buffer to public/uploads
    const uploadDir = path.join(__dirname, '../../public/uploads');
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    const localFilePath = path.join(uploadDir, path.basename(key));
    await fs.promises.writeFile(localFilePath, fileMulterObj.buffer);

    const mockUrl = `https://${AWS_S3_BUCKET}.s3.${AWS_REGION}.amazonaws.com/${key}`;
    return {
      location: mockUrl,
      key: key,
      originalName: fileMulterObj.originalname,
      mimetype: fileMulterObj.mimetype,
      size: fileMulterObj.size,
      storageType: 'mock-s3-local-fallback',
    };
  }

  // Real S3 upload
  const command = new PutObjectCommand({
    Bucket: AWS_S3_BUCKET,
    Key: key,
    Body: fileMulterObj.buffer,
    ContentType: fileMulterObj.mimetype,
  });

  await s3Client.send(command);

  const location = `https://${AWS_S3_BUCKET}.s3.${AWS_REGION}.amazonaws.com/${key}`;
  return {
    location,
    key,
    originalName: fileMulterObj.originalname,
    mimetype: fileMulterObj.mimetype,
    size: fileMulterObj.size,
    storageType: 'aws-s3',
  };
}

module.exports = {
  uploadToS3,
  isMock,
};
