const fs = require('fs');
const path = require('path');
const sharp = require('sharp');
const AppError = require('../../utils/AppError');

const uploadDir = path.join(__dirname, '../../../public/uploads');

const ImageController = {
  // POST /api/v1/uploads/optimize-image
  optimizeImage: async (req, res, next) => {
    try {
      if (!req.file) {
        return next(new AppError('Please provide an image file to process', 400));
      }

      // Check format
      const allowedFormats = ['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'image/tiff'];
      if (!allowedFormats.includes(req.file.mimetype)) {
        return next(new AppError('Only images (JPEG, PNG, WebP, GIF, TIFF) are allowed for processing.', 400));
      }

      if (!fs.existsSync(uploadDir)) {
        fs.mkdirSync(uploadDir, { recursive: true });
      }

      const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
      const thumbFilename = `thumb-${uniqueSuffix}.webp`;
      const largeFilename = `large-${uniqueSuffix}.webp`;

      const thumbPath = path.join(uploadDir, thumbFilename);
      const largePath = path.join(uploadDir, largeFilename);

      // Perform Sharp operations in parallel
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

      res.status(201).json({
        status: 'success',
        message: 'Image successfully processed and saved',
        images: {
          originalName: req.file.originalname,
          thumbnail: {
            filename: thumbFilename,
            width: thumbMeta.width,
            height: thumbMeta.height,
            size: thumbMeta.size,
            path: `/uploads/${thumbFilename}`,
          },
          large: {
            filename: largeFilename,
            width: largeMeta.width,
            height: largeMeta.height,
            size: largeMeta.size,
            path: `/uploads/${largeFilename}`,
          },
        },
      });
    } catch (err) {
      next(err);
    }
  },
};

module.exports = ImageController;
