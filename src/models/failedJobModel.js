const mongoose = require('mongoose');

const failedJobSchema = new mongoose.Schema({
  jobId: {
    type: String,
    required: true,
    unique: true,
  },
  queueName: {
    type: String,
    required: true,
  },
  name: {
    type: String,
    required: true,
  },
  data: {
    type: mongoose.Schema.Types.Mixed,
  },
  failedReason: {
    type: String,
  },
  attemptsMade: {
    type: Number,
  },
  failedAt: {
    type: Date,
    default: Date.now,
  },
});

const FailedJob = mongoose.model('FailedJob', failedJobSchema);

module.exports = FailedJob;
