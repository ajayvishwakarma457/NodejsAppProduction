const { parentPort, workerData } = require('worker_threads');

/**
 * CPU-heavy recursive Fibonacci algorithm
 */
function fibonacci(n) {
  if (n <= 1) return n;
  return fibonacci(n - 1) + fibonacci(n - 2);
}

try {
  const { number } = workerData;
  
  if (number === undefined || typeof number !== 'number' || number < 0) {
    throw new Error('Worker execution requires a valid non-negative "number" argument');
  }

  const result = fibonacci(number);
  parentPort.postMessage({ success: true, result });
} catch (err) {
  parentPort.postMessage({ success: false, error: err.message });
}
