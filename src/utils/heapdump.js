const fs = require('fs');
const path = require('path');
const v8 = require('v8');
const logger = require('./logger');

const SNAPSHOT_DIR = path.join(__dirname, '../../scratch/heapsnaps');

const writeHeapSnapshot = () => {
  return new Promise((resolve, reject) => {
    try {
      // 1. Ensure target directory exists
      if (!fs.existsSync(SNAPSHOT_DIR)) {
        fs.mkdirSync(SNAPSHOT_DIR, { recursive: true });
      }

      const filename = `snapshot-${Date.now()}.heapsnapshot`;
      const filepath = path.join(SNAPSHOT_DIR, filename);

      logger.info(`[Heapdump] Starting native V8 heap snapshot generation...`);
      
      // 2. Get heap snapshot stream and write to file
      const snapshotStream = v8.getHeapSnapshot();
      const fileStream = fs.createWriteStream(filepath);

      snapshotStream.pipe(fileStream);

      fileStream.on('finish', () => {
        logger.info(`[Heapdump] Heap snapshot written successfully to: ${filepath}`);
        resolve({ filename, filepath });
      });

      fileStream.on('error', (err) => {
        logger.error(`[Heapdump] File stream write failure: ${err.message}`);
        reject(err);
      });
    } catch (err) {
      logger.error(`[Heapdump] Snapshot initialization failed: ${err.message}`);
      reject(err);
    }
  });
};

module.exports = {
  writeHeapSnapshot,
  SNAPSHOT_DIR,
};
