// ==========================================
// 5. CommonJS (CJS) Module Example
// ==========================================

console.log("\x1b[35m=== 5A. CommonJS (require / module.exports) ===\x1b[0m\n");

// Local module definition inline
const mathCJS = {
  add: (a, b) => a + b,
  subtract: (a, b) => a - b
};

// Exporting
module.exports = mathCJS;

console.log("  In CommonJS, module.exports = mathCJS has been defined.");
console.log("  We require modules synchronously: const fs = require('fs');");
console.log("  CJS is the traditional module format in Node.js.");
