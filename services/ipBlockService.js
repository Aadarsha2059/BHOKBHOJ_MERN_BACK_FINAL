/**
 * IP Blocking Service
 * Tracks and manages IP-based access controls to prevent brute force attacks
 * and suspicious activities from malicious IP addresses
 */

const AuditLog = require('../models/AuditLog');

// In-memory store for IP blocking (in production, use Redis for distributed systems)
const ipAttempts = new Map();
const blockedIPs = new Map();

// Configuration
const MAX_ATTEMPTS = 5; // Maximum failed attempts before blocking
const BLOCK_DURATION = 15 * 60 * 1000; // 15 minutes in milliseconds
const ATTEMPT_WINDOW = 60 * 60 * 1000; // 1 hour window for tracking attempts

/**
 * Check if an IP address is currently blocked
 * @param {string} ip - IP address to check
 * @returns {boolean} - True if IP is blocked
 */
const isBlocked = (ip) => {
  if (!ip) return false;
  
  const blockInfo = blockedIPs.get(ip);
  if (!blockInfo) return false;
  
  // Check if block has expired
  if (Date.now() > blockInfo.expiresAt) {
    blockedIPs.delete(ip);
    ipAttempts.delete(ip);
    return false;
  }
  
  return true;
};

/**
 * Record a failed authentication attempt from an IP
 * @param {string} ip - IP address
 * @param {string} endpoint - Endpoint where attempt was made
 */
const recordAttempt = async (ip, endpoint = '/api/auth/login') => {
  if (!ip) return;
  
  const now = Date.now();
  const attempts = ipAttempts.get(ip) || [];
  
  // Filter out attempts outside the time window
  const recentAttempts = attempts.filter(
    attempt => now - attempt.timestamp < ATTEMPT_WINDOW
  );
  
  // Add new attempt
  recentAttempts.push({
    timestamp: now,
    endpoint: endpoint
  });
  
  ipAttempts.set(ip, recentAttempts);
  
  // Check if IP should be blocked
  if (recentAttempts.length >= MAX_ATTEMPTS) {
    blockIP(ip);
    
    // Log security event
    try {
      await AuditLog.createLog({
        action: 'IP_BLOCKED',
        actionCategory: 'SECURITY',
        status: 'SUCCESS',
        ipAddress: ip,
        description: `IP address ${ip} blocked due to ${recentAttempts.length} failed authentication attempts`,
        isSuspicious: true,
        endpoint: endpoint
      });
    } catch (error) {
      console.error('Error logging IP block:', error);
    }
  }
};

/**
 * Block an IP address for the configured duration
 * @param {string} ip - IP address to block
 */
const blockIP = (ip) => {
  blockedIPs.set(ip, {
    blockedAt: Date.now(),
    expiresAt: Date.now() + BLOCK_DURATION,
    attempts: ipAttempts.get(ip)?.length || 0
  });
  
  console.warn(`🚫 IP ${ip} blocked for ${BLOCK_DURATION / 60000} minutes due to multiple failed attempts`);
};

/**
 * Clear failed attempts for an IP (called on successful authentication)
 * @param {string} ip - IP address
 */
const clearAttempts = (ip) => {
  if (!ip) return;
  
  ipAttempts.delete(ip);
  blockedIPs.delete(ip);
};

/**
 * Get remaining block time for an IP in minutes
 * @param {string} ip - IP address
 * @returns {number} - Remaining minutes, or 0 if not blocked
 */
const getRemainingBlockTime = (ip) => {
  if (!ip) return 0;
  
  const blockInfo = blockedIPs.get(ip);
  if (!blockInfo) return 0;
  
  const remaining = blockInfo.expiresAt - Date.now();
  if (remaining <= 0) {
    blockedIPs.delete(ip);
    return 0;
  }
  
  return Math.ceil(remaining / (1000 * 60));
};

/**
 * Get failed attempt count for an IP
 * @param {string} ip - IP address
 * @returns {number} - Number of failed attempts
 */
const getAttemptCount = (ip) => {
  if (!ip) return 0;
  
  const attempts = ipAttempts.get(ip) || [];
  const now = Date.now();
  
  // Filter to only recent attempts
  const recentAttempts = attempts.filter(
    attempt => now - attempt.timestamp < ATTEMPT_WINDOW
  );
  
  return recentAttempts.length;
};

/**
 * Cleanup expired blocks and old attempts (run periodically)
 */
const cleanup = () => {
  const now = Date.now();
  
  // Cleanup expired blocks
  for (const [ip, blockInfo] of blockedIPs.entries()) {
    if (now > blockInfo.expiresAt) {
      blockedIPs.delete(ip);
      ipAttempts.delete(ip);
    }
  }
  
  // Cleanup old attempts outside time window
  for (const [ip, attempts] of ipAttempts.entries()) {
    const recentAttempts = attempts.filter(
      attempt => now - attempt.timestamp < ATTEMPT_WINDOW
    );
    
    if (recentAttempts.length === 0) {
      ipAttempts.delete(ip);
    } else {
      ipAttempts.set(ip, recentAttempts);
    }
  }
};

// Run cleanup every 5 minutes
setInterval(cleanup, 5 * 60 * 1000);

module.exports = {
  isBlocked,
  recordAttempt,
  clearAttempts,
  getRemainingBlockTime,
  getAttemptCount,
  blockIP,
  cleanup
};
