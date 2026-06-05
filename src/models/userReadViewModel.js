const mongoose = require('mongoose');

const userReadViewSchema = new mongoose.Schema(
  {
    _id: {
      type: String,
      required: [true, 'Read view ID must match the aggregateId'],
    },
    name: {
      type: String,
      required: true,
    },
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
    },
    role: {
      type: String,
      default: 'user',
    },
    status: {
      type: String,
      default: 'active',
    },
    version: {
      type: Number,
      required: true,
    },
    isDeleted: {
      type: Boolean,
      default: false,
    },
    lastUpdated: {
      type: Date,
      default: Date.now,
    },
  },
  {
    collection: 'user_read_views',
    timestamps: false,
    toJSON: {
      virtuals: true,
      transform: (doc, ret) => {
        ret.id = ret._id;
        delete ret._id;
        delete ret.__v;
      },
    },
  }
);

const UserReadView = mongoose.model('UserReadView', userReadViewSchema);

module.exports = UserReadView;
