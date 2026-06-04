# AWS S3 / Cloudflare R2 / MinIO Integration

This document outlines the implementation details for file uploads to AWS S3 using the official AWS SDK v3 (`@aws-sdk/client-s3`) in combination with Multer memory storage. It also details the built-in local fallback mechanism for standalone offline development.

## 1. Features
- **Multer Memory Storage**: Files are temporarily loaded into memory as buffers instead of writing to disk before upload.
- **AWS SDK v3 Integration**: Uses the modern `@aws-sdk/client-s3` package, employing the `PutObjectCommand` API for standard file uploading.
- **Local Fallback / Mock Mode**: If `AWS_ACCESS_KEY_ID` is set to `mock-access-key-id` (default in development), files are saved locally to `public/uploads` while returning a simulated S3 bucket URL, enabling seamless local testing without actual AWS accounts.
- **File Validation & Safety**: Restricts uploaded files to safe formats (JPEG, PNG, GIF, WebP, PDF) and enforces a 5MB size limit.
- **JWT Authorization Protected**: Only authenticated users are allowed to upload files.

---

## 2. Configuration (`.env`)

Add the following configuration lines to your `.env` file:

```env
# AWS S3 Config
AWS_ACCESS_KEY_ID=mock-access-key-id
AWS_SECRET_ACCESS_KEY=mock-secret-access-key
AWS_REGION=us-east-1
AWS_S3_BUCKET=production-roadmap-bucket
```

To connect to a live AWS account, replace `AWS_ACCESS_KEY_ID` and `AWS_SECRET_ACCESS_KEY` with your IAM credentials.

---

## 3. Implementation Details

### Utility Service: [s3Service.js](file:///Users/spakcomm-ajay/Documents/Roadmap/NodejsAppProduction/src/utils/s3Service.js)
Manages the instantiation of the `S3Client` and checks whether it should run in Mock Mode.

```javascript
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

async function uploadToS3(fileMulterObj) {
  const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
  const ext = path.extname(fileMulterObj.originalname);
  const key = `uploads/${fileMulterObj.fieldname}-${uniqueSuffix}${ext}`;

  if (isMock) {
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
```

---

## 4. Verification & Endpoint Testing

### Endpoint Details
- **URL**: `POST /api/v1/uploads/s3`
- **Headers**:
  - `Authorization: Bearer <JWT_ACCESS_TOKEN>`
- **Body**: Form-data with field key `file`.

### Test using cURL
1. Authenticate to obtain a valid access token.
2. Send an upload request with a PDF:
   ```bash
   curl -X POST http://localhost:5000/api/v1/uploads/s3 \
     -H "Authorization: Bearer <YOUR_ACCESS_TOKEN>" \
     -F "file=@your_document.pdf;type=application/pdf"
   ```

### Expected Response
```json
{
  "status": "success",
  "message": "File successfully uploaded (local S3 fallback mock)",
  "file": {
    "location": "https://production-roadmap-bucket.s3.us-east-1.amazonaws.com/uploads/file-1780580788514-856933118.pdf",
    "key": "uploads/file-1780580788514-856933118.pdf",
    "originalName": "your_document.pdf",
    "mimetype": "application/pdf",
    "size": 18,
    "storageType": "mock-s3-local-fallback"
  }
}
```
