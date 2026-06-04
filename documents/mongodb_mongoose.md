# MongoDB & Mongoose ODM Database Setup

This project uses **MongoDB** as its primary document-oriented database, integrated via **Mongoose ODM** (Object Document Mapper) for schema definition, model validation, and type-safe database queries.

---

## Installation

To switch the database layer to MongoDB, we installed the official `mongoose` package:

```bash
npm install mongoose
```

---

## 1. Database Connection Configuration

The database connection is set up under `src/config/db.js` using `mongoose.connect()`.

```javascript
const mongoose = require('mongoose');

const connectDB = async () => {
  try {
    const conn = await mongoose.connect(process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/production_roadmap');
    console.log(`MongoDB Connected: ${conn.connection.host}`);
  } catch (error) {
    console.error(`Error connecting to MongoDB: ${error.message}`);
    process.exit(1);
  }
};

module.exports = connectDB;
```

---

## 2. Defining the User Schema & Model

The model is defined in [src/models/userModel.js](file:///Users/spakcomm-ajay/Documents/Roadmap/NodejsAppProduction/src/models/userModel.js). Mongoose handles validation at the database schema level.

```javascript
const mongoose = require('mongoose');

const userSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Please provide a name'],
      trim: true,
    },
    email: {
      type: String,
      required: [true, 'Please provide an email'],
      unique: true,
      lowercase: true,
      trim: true,
    },
  },
  {
    timestamps: true, // Automatically manages createdAt and updatedAt fields
    toJSON: {
      virtuals: true,
      transform: (doc, ret) => {
        ret.id = ret._id.toString();
        delete ret._id;
        delete ret.__v;
      },
    },
    toObject: {
      virtuals: true,
      transform: (doc, ret) => {
        ret.id = ret._id.toString();
        delete ret._id;
        delete ret.__v;
      },
    },
  }
);

const User = mongoose.model('User', userSchema);
module.exports = User;
```

### Key Schema Features:
* **`timestamps`**: Automatically injects and handles `createdAt` and `updatedAt` date fields on every document.
* **Transform Option**: A custom `transform` is configured on both `toJSON` and `toObject` serialization to project the internal `_id` field as a clean `id` string and hide MongoDB internals (`__v` version key).

---

## 3. Server Startup Integration

In [src/server.js](file:///Users/spakcomm-ajay/Documents/Roadmap/NodejsAppProduction/src/server.js), the server startup is wrapped in an async function to ensure the database connection is fully established before the HTTP server starts listening:

```javascript
const connectDB = require('./config/db');
const app = require('./app');

const startServer = async () => {
  // Await Database connection before running app
  await connectDB();

  app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
  });
};

startServer();
```

---

## 4. Input Validations for ObjectIds

Since MongoDB identifies documents using 24-character hexadecimal `ObjectId` strings rather than numeric IDs, Zod and Express-validator schemas have been updated to target hex string patterns:

### Zod Validation Schema
```javascript
const userIdParamSchema = z.string().regex(/^[0-9a-fA-F]{24}$/, { 
  message: "User ID must be a valid 24-character MongoDB ObjectId hex string" 
});
```

### Express-Validator Schema
```javascript
param('id')
  .trim()
  .isMongoId().withMessage('User ID must be a valid MongoDB ObjectId')
```

---

## Environment Variables
Configure your database URI in the [.env](file:///Users/spakcomm-ajay/Documents/Roadmap/NodejsAppProduction/.env) file:

```env
MONGODB_URI=mongodb://127.0.0.1:27017/production_roadmap
```
