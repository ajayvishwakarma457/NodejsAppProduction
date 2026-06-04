# Database Seeding with Mongoose

This document describes how to seed the database with mock/initial data for development and testing.

---

## 1. Seeder Configuration

We created a database seeding script in [src/db/seeder.js](file:///Users/spakcomm-ajay/Documents/Roadmap/NodejsAppProduction/src/db/seeder.js). The script cleans up pre-existing user and token collections, and inserts fresh mock users representing standard users, moderators, and admins.

### Seeder Script Implementation
```javascript
const path = require('path');
const dotenv = require('dotenv');
const mongoose = require('mongoose');

// Load environment variables from .env in root
dotenv.config({ path: path.join(__dirname, '../..', '.env') });

const User = require('../models/userModel');
const ApiKey = require('../models/apiKeyModel');
const RefreshToken = require('../models/refreshTokenModel');

const seedUsers = [
  {
    name: 'Admin User',
    email: 'admin@example.com',
    password: 'AdminPassword123',
    role: 'admin',
  },
  {
    name: 'Moderator User',
    email: 'moderator@example.com',
    password: 'ModPassword123',
    role: 'moderator',
  },
  {
    name: 'Regular User',
    email: 'user@example.com',
    password: 'UserPassword123',
    role: 'user',
  },
];

const seedDB = async () => {
  try {
    const mongoUri = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/production_roadmap';
    await mongoose.connect(mongoUri);
    console.log('MongoDB connection established for seeding.');

    // Clear existing data
    console.log('Clearing existing collections...');
    await User.deleteMany({});
    await ApiKey.deleteMany({});
    await RefreshToken.deleteMany({});
    console.log('Collections cleared.');

    // Seed new users
    console.log('Inserting seed users...');
    // We use create() so that the passwords run through the pre-save bcrypt hook
    await User.create(seedUsers);
    console.log('Users successfully seeded.');

    console.log('Database seeding completed successfully! 🌱');
    process.exit(0);
  } catch (error) {
    console.error('Error seeding database:', error);
    process.exit(1);
  }
};

seedDB();
```

---

## 2. Command Usage

We added the database seeding script to [package.json](file:///Users/spakcomm-ajay/Documents/Roadmap/NodejsAppProduction/package.json):

```json
"scripts": {
  "db:seed": "node src/db/seeder.js"
}
```

To run the database seeder:
```bash
npm run db:seed
```

---

## 3. Verification

Running the seeder script yields the following console output:
```bash
> nodejs-production-roadmap@1.0.0 db:seed
> node src/db/seeder.js

MongoDB connection established for seeding.
Clearing existing collections...
Collections cleared.
Inserting seed users...
Users successfully seeded.
Database seeding completed successfully! 🌱
```
All seeded passwords (`AdminPassword123`, `ModPassword123`, `UserPassword123`) run through Mongoose's `pre('save')` encryption hook and are stored securely as hashed values in the database.
