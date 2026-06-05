const { Worker } = require('worker_threads');
const path = require('path');
const logger = require('./logger');

/**
 * Executes heavy CPU computation inside a separate Worker Thread
 * @param {number} number - The input number for Fibonacci calculation
 * @returns {Promise<number>}
 */
const runHeavyCpuTask = (number) => {
  return new Promise((resolve, reject) => {
    const workerPath = path.join(__dirname, '../workers/heavyCpu.worker.js');
    logger.info(`[Worker Manager] Spawning CPU Worker Thread for input: ${number}`);
    
    const worker = new Worker(workerPath, {
      workerData: { number },
    });

    worker.on('message', (message) => {
      if (message.success) {
        resolve(message.result);
      } else {
        reject(new Error(message.error));
      }
    });

    worker.on('error', (err) => {
      logger.error(`[Worker Manager] Worker Thread encountered error: ${err.message}`);
      reject(err);
    });

    worker.on('exit', (code) => {
      if (code !== 0) {
        logger.error(`[Worker Manager] Worker Thread stopped with exit code: ${code}`);
        reject(new Error(`Worker Thread stopped with exit code ${code}`));
      } else {
        logger.info('[Worker Manager] Worker Thread completed execution cleanly.');
      }
    });
  });
};

module.exports = runHeavyCpuTask;
