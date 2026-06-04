# Streaming Large Files in Node.js

This document describes the implementation of memory-efficient streaming for uploading and downloading large files in the Node.js production application.

## 1. Streaming Upload (`POST /api/v1/uploads/stream-upload`)
For uploading large files, loading the entire file buffer into RAM (as standard Multer memory storage does) can lead to Out-Of-Memory (OOM) crashes under heavy load. To prevent this, we parse the incoming request stream directly and write chunks to disk as they arrive.

- **Parser**: We use `busboy` to dynamically intercept the file streaming context directly from the HTTP request stream (`req.pipe(busboy)`).
- **Direct Pipe**: When a file field is encountered, its readable stream is piped directly to a local write stream using `file.pipe(fs.createWriteStream(path))`.
- **Validation**: File mime-types are validated on-the-fly, allowing only JPEG, PNG, GIF, WebP, PDF, and MP4.

---

## 2. Streaming Download with HTTP Range Support (`GET /api/v1/uploads/stream-download/:filename`)
When serving large media files (like `.mp4` videos or heavy `.pdf` booklets), loading the file into memory and sending it in a single response blocks event loop cycles and ruins client-side seekability.

By utilizing HTTP Range requests:
- Clients (like browser video players) can request a specific byte subset of the file, e.g., `Range: bytes=0-999`.
- The server responds with `206 Partial Content`, sending only the requested bytes using `fs.createReadStream(filePath, { start, end }).pipe(res)`.
- It sets standard headers including `Content-Range`, `Accept-Ranges`, and `Content-Length`.

---

## 3. Usage & Testing

### Stream Upload
```bash
curl -X POST http://localhost:5000/api/v1/uploads/stream-upload \
  -H "Authorization: Bearer <JWT_ACCESS_TOKEN>" \
  -F "file=@large-file.mp4;type=video/mp4"
```
**Response**:
```json
{
  "status": "success",
  "message": "File streamed and uploaded successfully to local disk",
  "file": {
    "originalName": "large-file.mp4",
    "filename": "stream-1780581239335-624915409.mp4",
    "mimetype": "video/mp4",
    "path": "/uploads/stream-1780581239335-624915409.mp4",
    "size": 10485760
  }
}
```

### Range-based Stream Download
To request the first 10 bytes:
```bash
curl -i -X GET http://localhost:5000/api/v1/uploads/stream-download/stream-1780581239335-624915409.mp4 \
  -H "Authorization: Bearer <JWT_ACCESS_TOKEN>" \
  -H "Range: bytes=0-9"
```
**Response Headers**:
```http
HTTP/1.1 206 Partial Content
Content-Range: bytes 0-9/10485760
Accept-Ranges: bytes
Content-Length: 10
Content-Type: video/mp4
```
