// ==================================================
// NoSQL Database CRUD (MongoDB + Mongoose ODM Mockup)
// ==================================================

/**
 * Note: This script is an educational mockup showing how Mongoose
 * operates in production. In a live system, you would run 'npm i mongoose'
 * and connect to a running MongoDB instance.
 */

let mongoose;
try {
  mongoose = require('mongoose');
} catch (e) {
  // Mock fallback to allow demo execution without mongoose installed
  mongoose = {
    Schema: class {
      constructor(def) { this.def = def; }
    },
    model: (name, schema) => ({
      create: async (data) => data,
      find: async (query) => [],
      findOne: async (query) => null,
      findOneAndUpdate: async (query, update, options) => null,
      deleteOne: async (query) => null
    })
  };
}

// 1. Database Connection
async function connectToDatabase() {
  const MONGO_URI = process.env.MONGO_URI || "mongodb://localhost:27017/prod_db";
  
  try {
    // In production, configure connection options for stability
    await mongoose.connect(MONGO_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true
    });
    console.log("  Successfully connected to MongoDB.");
  } catch (error) {
    console.error("  MongoDB connection error:", error.message);
  }
}

// 2. Schema Definition with Mongoose
const postSchema = new mongoose.Schema({
  title: { type: String, required: true },
  content: String,
  createdAt: { type: Date, default: Date.now }
});

const userSchema = new mongoose.Schema({
  name: { type: String, required: true },
  email: { 
    type: String, 
    required: true, 
    unique: true, 
    index: true // Creates a database index on email
  },
  posts: [postSchema] // Embedded sub-documents (common NoSQL pattern)
});

// Compile schemas into Models
const User = mongoose.model('User', userSchema);

// 3. CRUD Demonstration Flow (Theoretical Execution)
async function runMockCrud() {
  console.log("\x1b[35m=== NoSQL CRUD Operations (Mongoose Patterns) ===\x1b[0m\n");
  console.log("  // --- A. Create (INSERT equivalent) ---");
  console.log(`  const newUser = await User.create({
    name: "Alice",
    email: "alice@example.com",
    posts: [{ title: "First Mongo Post", content: "MongoDB is schema-less!" }]
  });`);

  console.log("\n  // --- B. Read (SELECT equivalent) ---");
  console.log(`  const users = await User.find({ name: "Alice" });`);
  console.log(`  const singleUser = await User.findOne({ email: "alice@example.com" });`);

  console.log("\n  // --- C. Update (UPDATE equivalent) ---");
  console.log(`  const updatedUser = await User.findOneAndUpdate(
    { email: "alice@example.com" },
    { $set: { name: "Alice Smith" } },
    { new: true } // Returns the modified document
  );`);

  console.log("\n  // --- D. Delete (DELETE equivalent) ---");
  console.log(`  await User.deleteOne({ email: "alice@example.com" });`);
  console.log("\n  (Mongoose connects schemas directly to collections, enabling easy ODM mappings)");
}

runMockCrud();
