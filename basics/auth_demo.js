// ==========================================
// Basic Auth: bcryptjs & jsonwebtoken
// ==========================================

console.log("\x1b[35m=== Password Hashing & JWT Authentication Demo ===\x1b[0m\n");

const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

// Secret key for signing JWTs
const JWT_SECRET = process.env.JWT_SECRET || "my_super_secret_signing_key";

async function run() {
  // --- A. Password Hashing with bcrypt ---
  console.log("\x1b[36m--- A. Password Hashing (bcryptjs) ---\x1b[0m");
  
  const plainPassword = "userSuperSecurePassword123";
  console.log("  Plaintext Password:", plainPassword);
  
  // Generating a salt (10 rounds is standard in production)
  const salt = await bcrypt.genSalt(10);
  const hashedPassword = await bcrypt.hash(plainPassword, salt);
  console.log("  Salt generated:", salt);
  console.log("  Hashed Password (stored in DB):", hashedPassword);
  
  // Verifying password (correct)
  const isMatchCorrect = await bcrypt.compare(plainPassword, hashedPassword);
  console.log("  Comparing correct password match:", isMatchCorrect); // true
  
  // Verifying password (incorrect)
  const isMatchIncorrect = await bcrypt.compare("wrongPassword", hashedPassword);
  console.log("  Comparing incorrect password match:", isMatchIncorrect); // false
  console.log("");

  // --- B. JSON Web Tokens (JWT) ---
  console.log("\x1b[36m--- B. JSON Web Tokens (JWT) ---\x1b[0m");
  
  const userPayload = {
    id: 42,
    username: "alice_dev",
    role: "admin"
  };
  console.log("  Payload to sign:", userPayload);

  // 1. Sign JWT (Expires in 2 seconds for this demo)
  const token = jwt.sign(userPayload, JWT_SECRET, { expiresIn: '2s' });
  console.log("  Signed JWT Token:\n ", token);
  console.log("");

  // 2. Verify and decode JWT
  try {
    console.log("  Verifying token immediately...");
    const decoded = jwt.verify(token, JWT_SECRET);
    console.log("  Decoded payload successfully:", decoded);
    console.log(`    User ID: ${decoded.id}, Role: ${decoded.role}`);
  } catch (err) {
    console.error("  Token verification failed:", err.message);
  }
  console.log("");

  // 3. Testing Expiration
  console.log("  Waiting 3 seconds for token to expire...");
  await new Promise((resolve) => setTimeout(resolve, 3000));

  try {
    console.log("  Verifying token after wait time...");
    jwt.verify(token, JWT_SECRET);
  } catch (err) {
    console.log("  Expected error caught!");
    console.log("    Error Name:", err.name);      // TokenExpiredError
    console.log("    Error Message:", err.message);  // jwt expired
  }
}

run();
