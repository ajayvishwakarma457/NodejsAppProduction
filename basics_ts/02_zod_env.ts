// ==========================================
// 2. Type-Safe Environment Variables with Zod
// ==========================================

console.log("\x1b[35m=== 2. Type-Safe environment variables with Zod ===\x1b[0m\n");

import { z } from 'zod';
import * as dotenv from 'dotenv';
import * as path from 'path';

// Load variables
dotenv.config({ path: path.join(__dirname, '..', '.env') });

// Define validation schema using Zod
const envSchema = z.object({
  PORT: z.string().transform((val) => parseInt(val, 10)), // parses string to number
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  DATABASE_URL: z.string().url().or(z.string().regex(/^file:/)), // matches urls or file paths
  DB_HOST: z.string().default('localhost'),
  DB_USER: z.string().min(1, "DB_USER cannot be empty"),
  DB_PASS: z.string().min(6, "DB_PASS must be at least 6 characters long")
});

// Parse process.env with schema validation
function validateEnv() {
  try {
    const parsedEnv = envSchema.parse(process.env);
    console.log("  \x1b[32m✔ Environment variables are valid!\x1b[0m");
    console.log(`  Parsed PORT (Type: ${typeof parsedEnv.PORT}):`, parsedEnv.PORT);
    console.log("  Parsed NODE_ENV:", parsedEnv.NODE_ENV);
    console.log("  Parsed DATABASE_URL:", parsedEnv.DATABASE_URL);
    return parsedEnv;
  } catch (error) {
    if (error instanceof z.ZodError) {
      console.error("  \x1b[31m✖ Environment validation failed!\x1b[0m");
      error.issues.forEach((err) => {
        console.error(`    Field: "${err.path.join('.')}" -> Error: ${err.message}`);
      });
    } else {
      console.error("  Unexpected validation error:", error);
    }
    process.exit(1);
  }
}

const env = validateEnv();
export default env;
