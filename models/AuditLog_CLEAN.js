const mongoose = require('mongoose');

const auditLogSchema = new mongoose.Schema({
  // Core Action Fields
  action: { 
    type: String, 
    required: true 
  },
  actionCategory: { 
    type: String, 
    enum: ['AUTHENTICATION', 'SECURITY', 'DATA_ACCESS', 'SYSTEM'],
    required: true 
  },
  status: { 
    type: String, 
    enum: ['SUCCESS', 'FAILURE'],
    required: true 
  },
  
  // Security & Tracking
  isSuspicious: { 
    type: Boolean, 
    default: false 
  },
  ipAddress: { 
    type: String, 
    required: true 
  },
  sessionId: { 
    type: String, 
    default: null 
  },
  
  // Timestamp
  timestamp: { 
    type: Date, 
    default: Date.now 
  }
}, { 
  timestamps: true,
  collection: 'audit_logs'
});

// High-performance querying for security audits
auditLogSchema.index({ timestamp: -1, isSuspicious: 1 });

// Helper method to create audit log
auditLogSchema.statics.createLog = async function(logData) {
  try {
    const log = new this(logData);
    await log.save();
    return log;
  } catch (error) {
    console.error('Error creating audit log:', error);
    return null;
  }
};

module.exports = mongoose.model('AuditLog', auditLogSchema);

