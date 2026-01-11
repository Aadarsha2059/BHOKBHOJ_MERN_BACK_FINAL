const mongoose = require('mongoose');

/**
 * Device Model
 * Tracks user devices for browser fingerprinting and security monitoring
 */
const DeviceSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  deviceId: {
    type: String,
    required: true,
    unique: true,
    index: true
  },
  browserName: {
    type: String,
    default: 'Unknown'
  },
  browserVersion: {
    type: String,
    default: 'Unknown'
  },
  osName: {
    type: String,
    default: 'Unknown'
  },
  osVersion: {
    type: String,
    default: null
  },
  deviceType: {
    type: String,
    enum: ['desktop', 'mobile', 'tablet', 'unknown'],
    default: 'unknown'
  },
  userAgent: {
    type: String,
    default: null
  },
  ipAddress: {
    type: String,
    required: true,
    index: true
  },
  isActive: {
    type: Boolean,
    default: true
  },
  lastActiveAt: {
    type: Date,
    default: Date.now,
    index: true
  },
  firstSeenAt: {
    type: Date,
    default: Date.now
  },
  loginAttempts: {
    type: Number,
    default: 0
  },
  isTrusted: {
    type: Boolean,
    default: false
  },
  location: {
    country: String,
    city: String,
    region: String
  },
  fingerprint: {
    type: String,
    index: true
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Index for efficient queries
DeviceSchema.index({ userId: 1, isActive: 1 });
DeviceSchema.index({ userId: 1, lastActiveAt: -1 });
DeviceSchema.index({ deviceId: 1, userId: 1 }, { unique: true });

// Virtual for formatted browser info
DeviceSchema.virtual('browserInfo').get(function() {
  return `${this.browserName} ${this.browserVersion}`;
});

// Virtual for formatted OS info
DeviceSchema.virtual('osInfo').get(function() {
  return this.osVersion ? `${this.osName} ${this.osVersion}` : this.osName;
});

// Method to update last active timestamp
DeviceSchema.methods.updateLastActive = function() {
  this.lastActiveAt = new Date();
  return this.save();
};

// Method to deactivate device
DeviceSchema.methods.deactivate = function() {
  this.isActive = false;
  this.lastActiveAt = new Date();
  return this.save();
};

// Method to increment login attempts
DeviceSchema.methods.incrementLoginAttempts = function() {
  this.loginAttempts += 1;
  this.lastActiveAt = new Date();
  return this.save();
};

// Method to reset login attempts
DeviceSchema.methods.resetLoginAttempts = function() {
  this.loginAttempts = 0;
  return this.save();
};

const Device = mongoose.model('Device', DeviceSchema);

module.exports = Device;
