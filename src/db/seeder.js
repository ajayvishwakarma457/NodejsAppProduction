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
    // Connect to database
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
