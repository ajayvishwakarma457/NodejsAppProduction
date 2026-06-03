// ==========================================
// 2. Environment Variables with dotenv
// ==========================================

console.log("\x1b[35m=== 2. Environment Variables (dotenv) ===\x1b[0m\n");

// Load variables from .env file into process.env
const path = require('path');
const dotenv = require('dotenv');

// We configure dotenv and point it to the .env in the root
dotenv.config({ path: path.join(__dirname, '..', '.env') });

console.log("  Dotenv initialized and variables loaded.");
console.log(`  PORT: ${process.env.PORT}`);
console.log(`  NODE_ENV: ${process.env.NODE_ENV}`);
console.log(`  DB_HOST: ${process.env.DB_HOST}`);
console.log(`  DB_USER: ${process.env.DB_USER}`);
console.log(`  DB_PASS: ${process.env.DB_PASS ? '***** (Hidden for Security)' : 'Not defined'}`);
