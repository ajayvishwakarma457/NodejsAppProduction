# Image Processing with Sharp

This document details the implementation of server-side image processing, optimization, and formatting using the high-performance `sharp` library in our Node.js production application.

## 1. Objective
Raw user uploads of high-resolution images waste storage and bandwith. This feature intercepts image uploads in memory and optimizes them to produce:
1. **Thumbnail representation**: Optimized to exactly `150x150` pixels with a `cover` crop configuration.
2. **Standard large view**: Scaled down to fit within a `800px` boundary (without expanding smaller images).
3. **Format conversion**: Both files are converted to `.webp` format using appropriate compression settings (quality 80 for thumbnails, 85 for standard size) to significantly reduce payload size.

---

## 2. API Design & Endpoint

- **Endpoint**: `POST /api/v1/uploads/optimize-image`
- **Method**: `POST`
- **Headers**:
  - `Authorization: Bearer <JWT_ACCESS_TOKEN>`
- **Body**: multipart/form-data field name `file`.

### Implementation: [imageController.js](file:///Users/spakcomm-ajay/Documents/Roadmap/NodejsAppProduction/src/controllers/v1/imageController.js)
```javascript
const sharp = require('sharp');

// Inside optimizeImage:
const [thumbMeta, largeMeta] = await Promise.all([
  // 1. Thumbnail: 150x150, crop, convert to webp (quality 80)
  sharp(req.file.buffer)
    .resize(150, 150, { fit: 'cover' })
    .toFormat('webp')
    .webp({ quality: 80 })
    .toFile(thumbPath),

  // 2. Large preview: max width 800px, fit inside, convert to webp (quality 85)
  sharp(req.file.buffer)
    .resize(800, null, { fit: 'inside', withoutEnlargement: true })
    .toFormat('webp')
    .webp({ quality: 85 })
    .toFile(largePath),
]);
```

---

## 3. Testing with cURL
```bash
curl -X POST http://localhost:5000/api/v1/uploads/optimize-image \
  -H "Authorization: Bearer <JWT_ACCESS_TOKEN>" \
  -F "file=@landscape.png;type=image/png"
```

### Expected Response
```json
{
  "status": "success",
  "message": "Image successfully processed and saved",
  "images": {
    "originalName": "landscape.png",
    "thumbnail": {
      "filename": "thumb-1780581380594-657727863.webp",
      "width": 150,
      "height": 150,
      "size": 3354,
      "path": "/uploads/thumb-1780581380594-657727863.webp"
    },
    "large": {
      "filename": "large-1780581380594-657727863.webp",
      "width": 800,
      "height": 189,
      "size": 18508,
      "path": "/uploads/large-1780581380594-657727863.webp"
    }
  }
}
```
Observe that the generated images are stored in `public/uploads/` in high-compression WebP format.
