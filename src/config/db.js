const mongoose = require('mongoose');
const { dbOperationsTotal } = require('../utils/metrics');

// Track all Mongoose operations via global plugin
const metricsPlugin = (schema, options) => {
  const ops = ['find', 'findOne', 'findOneAndUpdate', 'findOneAndDelete', 'updateOne', 'updateMany', 'deleteOne', 'deleteMany', 'save', 'countDocuments', 'estimatedDocumentCount'];

  ops.forEach((op) => {
    schema.pre(op, function () {
      this._metricsStart = Date.now();
    });

    schema.post(op, function () {
      const collection = this.collection?.name || 'unknown';
      dbOperationsTotal.inc({ operation: op, collection, status: 'success' });
    });

    schema.post(op, function (err, doc, next) {
      if (err) {
        const collection = this.collection?.name || 'unknown';
        dbOperationsTotal.inc({ operation: op, collection, status: 'error' });
        if (next) next(err);
      }
    });
  });
};

mongoose.plugin(metricsPlugin);

const connectDB = async () => {
  try {
    const conn = await mongoose.connect(process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/production_roadmap', {
      maxPoolSize: parseInt(process.env.MONGO_MAX_POOL_SIZE || '50', 10),
      minPoolSize: parseInt(process.env.MONGO_MIN_POOL_SIZE || '5', 10),
      socketTimeoutMS: 30000, // Close idle sockets after 30 seconds
      serverSelectionTimeoutMS: 5000, // Timeout after 5 seconds if MongoDB is down
    });
    console.log(`MongoDB Connected: ${conn.connection.host}`);
  } catch (error) {
    console.error(`Error connecting to MongoDB: ${error.message}`);
    process.exit(1);
  }
};

module.exports = connectDB;
