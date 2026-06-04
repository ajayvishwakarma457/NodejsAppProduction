const mongoose = require('mongoose');

const apiKeySchema = new mongoose.Schema(
  {
    hashedKey: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    name: {
      type: String,
      required: [true, 'Please provide a name for this API key'],
      trim: true,
    },
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    expiresAt: {
      type: Date,
    },
  },
  {
    timestamps: true,
  }
);

// Compound index to ensure uniqueness of API key names per user
apiKeySchema.index({ user: 1, name: 1 }, { unique: true });

const ApiKey = mongoose.model('ApiKey', apiKeySchema);

module.exports = ApiKey;
