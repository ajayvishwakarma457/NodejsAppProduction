// ==========================================
// 3. Error Handling: Try/Catch, Error-First Callbacks
// ==========================================

console.log("\x1b[35m=== 3. Error Handling in Node.js ===\x1b[0m\n");

// --- A. Try/Catch (Synchronous / Async-Await) ---
console.log("\x1b[36m--- A. Try/Catch Block ---\x1b[0m");
try {
  const obj = {};
  console.log(obj.nonExistent.property); // Will throw TypeError
} catch (error) {
  console.log("  Caught Error:", error.name, "-", error.message);
}

// --- B. Error-First Callback Pattern ---
console.log("\n\x1b[36m--- B. Error-First Callbacks ---\x1b[0m");
const fs = require('fs');

// The callback receives (err, result) - standard Node.js convention
fs.readFile('non-existent-file.txt', 'utf8', (err, data) => {
  if (err) {
    console.log("  Callback Error Handler:");
    console.log("    Error Code:", err.code);
    console.log("    Error Message:", err.message);
    runProcessErrorHandlers();
    return;
  }
  console.log("  File Content:", data);
});

// --- C. uncaughtException and unhandledRejection ---
function runProcessErrorHandlers() {
  console.log("\n\x1b[36m--- C. Process Error Listeners ---\x1b[0m");
  console.log("  In production, register global listeners for unexpected crashes:");
  
  console.log(`
    process.on('uncaughtException', (err) => {
      console.error('There was an uncaught error', err);
      process.exit(1); // mandatory cleanup & exit
    });

    process.on('unhandledRejection', (reason, promise) => {
      console.error('Unhandled Rejection at:', promise, 'reason:', reason);
    });
  `);
}
