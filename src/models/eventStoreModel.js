const mongoose = require('mongoose');

const eventStoreSchema = new mongoose.Schema(
  {
    aggregateId: {
      type: String,
      required: [true, 'Aggregate ID is required'],
      index: true,
    },
    aggregateType: {
      type: String,
      required: [true, 'Aggregate type is required'],
      default: 'User',
    },
    eventType: {
      type: String,
      required: [true, 'Event type is required'],
    },
    eventData: {
      type: mongoose.Schema.Types.Mixed,
      required: [true, 'Event data payload is required'],
    },
    version: {
      type: Number,
      required: [true, 'Event version is required'],
    },
    timestamp: {
      type: Date,
      default: Date.now,
    },
  },
  {
    collection: 'event_store',
  }
);

// Enforce unique combination of aggregateId + version to guarantee optimistic concurrency control
eventStoreSchema.index({ aggregateId: 1, version: 1 }, { unique: true });

const EventStore = mongoose.model('EventStore', eventStoreSchema);

module.exports = EventStore;
