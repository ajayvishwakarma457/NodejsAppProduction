const fs = require('fs');
const path = require('path');
const Busboy = require('busboy');
const AppError = require('../../utils/AppError');

const uploadDir = path.join(__dirname, '../../../public/uploads');

const StreamController = {
  // POST /api/v1/uploads/stream-upload
  streamUpload: (req, res, next) => {
    let busboy;
    try {
      busboy = Busboy({ headers: req.headers });
    } catch (err) {
      return next(new AppError('Invalid multipart headers', 400));
    }

    let fileUploadPromise = null;
    let uploadedFileDetails = null;

    busboy.on('file', (name, file, info) => {
      const { filename, mimeType } = info;
      
      // Basic type validation (images and pdfs)
      const allowedMimeTypes = [
        'image/jpeg',
        'image/png',
        'image/gif',
        'image/webp',
        'application/pdf',
        'video/mp4', // Allow video to demonstrate streaming range downloads nicely
      ];

      if (!allowedMimeTypes.includes(mimeType)) {
        // Resume stream to discard data
        file.resume();
        return next(new AppError('Invalid file type. Only images, PDF, and MP4 are allowed.', 400));
      }

      const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
      const ext = path.extname(filename);
      const safeFilename = `stream-${uniqueSuffix}${ext}`;
      const saveTo = path.join(uploadDir, safeFilename);

      if (!fs.existsSync(uploadDir)) {
        fs.mkdirSync(uploadDir, { recursive: true });
      }

      const writeStream = fs.createWriteStream(saveTo);
      
      fileUploadPromise = new Promise((resolve, reject) => {
        file.pipe(writeStream);
        
        writeStream.on('finish', () => {
          uploadedFileDetails = {
            originalName: filename,
            filename: safeFilename,
            mimetype: mimeType,
            path: `/uploads/${safeFilename}`,
          };
          resolve();
        });

        writeStream.on('error', (err) => {
          reject(err);
        });
      });
    });

    busboy.on('finish', async () => {
      try {
        if (!fileUploadPromise) {
          return next(new AppError('No file detected in upload stream', 400));
        }
        await fileUploadPromise;

        // Get file size from disk
        const stats = await fs.promises.stat(path.join(uploadDir, uploadedFileDetails.filename));
        uploadedFileDetails.size = stats.size;

        res.status(201).json({
          status: 'success',
          message: 'File streamed and uploaded successfully to local disk',
          file: uploadedFileDetails,
        });
      } catch (err) {
        next(err);
      }
    });

    busboy.on('error', (err) => {
      next(err);
    });

    req.pipe(busboy);
  },

  // GET /api/v1/uploads/stream-download/:filename
  streamDownload: async (req, res, next) => {
    try {
      const { filename } = req.params;
      const filePath = path.join(uploadDir, filename);

      // Check file existence safely
      try {
        await fs.promises.access(filePath, fs.constants.F_OK);
      } catch {
        return next(new AppError('File not found', 404));
      }

      const stats = await fs.promises.stat(filePath);
      const fileSize = stats.size;
      const range = req.headers.range;

      if (range) {
        // Parse range header: e.g. "bytes=32324-" or "bytes=32324-45345"
        const parts = range.replace(/bytes=/, '').split('-');
        const start = parseInt(parts[0], 10);
        const end = parts[1] ? parseInt(parts[1], 10) : fileSize - 1;

        if (isNaN(start) || start >= fileSize || end >= fileSize || start > end) {
          res.setHeader('Content-Range', `bytes */${fileSize}`);
          return next(new AppError('Requested range not satisfiable', 416));
        }

        const chunksize = (end - start) + 1;
        const fileStream = fs.createReadStream(filePath, { start, end });

        res.writeHead(206, {
          'Content-Range': `bytes ${start}-${end}/${fileSize}`,
          'Accept-Ranges': 'bytes',
          'Content-Length': chunksize,
          'Content-Type': getMimetypeByExtension(filePath),
        });

        fileStream.pipe(res);
      } else {
        res.writeHead(200, {
          'Content-Length': fileSize,
          'Content-Type': getMimetypeByExtension(filePath),
        });
        fs.createReadStream(filePath).pipe(res);
      }
    } catch (err) {
      next(err);
    }
  },
};

function getMimetypeByExtension(filePath) {
  const ext = path.extname(filePath).toLowerCase();
  switch (ext) {
    case '.pdf': return 'application/pdf';
    case '.png': return 'image/png';
    case '.jpg':
    case '.jpeg': return 'image/jpeg';
    case '.gif': return 'image/gif';
    case '.webp': return 'image/webp';
    case '.mp4': return 'video/mp4';
    default: return 'application/octet-stream';
  }
}

module.exports = StreamController;
