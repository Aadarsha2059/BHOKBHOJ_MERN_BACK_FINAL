/**
 * Security Monitoring and Alerting Service
 * Monitors and alerts on suspicious security patterns:
 * - Multiple failed login attempts
 * - Unusual IP addresses
 * - Account lockouts
 * - Brute force attempts
 * - Suspicious API activity
 */

const AuditLog = require('../models/AuditLog');
const User = require('../models/User');
const { sendSuspiciousActivityAlert } = require('../utils/securityNotificationService');

// In-memory alert tracking (in production, use Redis for distributed systems)
const activeAlerts = new Map();
const alertHistory = [];

// Alert configuration
const ALERT_CONFIG = {
  // Failed login attempts threshold
  FAILED_LOGIN_THRESHOLD: 5,
  FAILED_LOGIN_WINDOW_MS: 15 * 60 * 1000, // 15 minutes

  // Multiple account lockouts from same IP
  MULTIPLE_LOCKOUTS_THRESHOLD: 3,
  MULTIPLE_LOCKOUTS_WINDOW_MS: 60 * 60 * 1000, // 1 hour

  // Unusual IP activity (different IPs in short time)
  UNUSUAL_IP_THRESHOLD: 5,
  UNUSUAL_IP_WINDOW_MS: 30 * 60 * 1000, // 30 minutes

  // API rate limit violations
  RATE_LIMIT_VIOLATION_THRESHOLD: 10,
  RATE_LIMIT_VIOLATION_WINDOW_MS: 5 * 60 * 1000, // 5 minutes

  // Alert cooldown (don't send same alert multiple times)
  ALERT_COOLDOWN_MS: 60 * 60 * 1000 // 1 hour
};

/**
 * Monitor failed login attempts and send alert if threshold exceeded
 */
const monitorFailedLogins = async (userId, ipAddress, userAgent = null) => {
  try {
    const since = new Date(Date.now() - ALERT_CONFIG.FAILED_LOGIN_WINDOW_MS);
    
    // Count failed login attempts in the time window
    const failedAttempts = await AuditLog.countDocuments({
      userId: userId,
      action: 'LOGIN',
      status: 'FAILURE',
      ipAddress: ipAddress,
      timestamp: { $gte: since }
    });

    // Check if threshold exceeded
    if (failedAttempts >= ALERT_CONFIG.FAILED_LOGIN_THRESHOLD) {
      const alertKey = `failed_login_${userId}_${ipAddress}`;
      
      // Check cooldown (don't spam alerts)
      if (!isAlertInCooldown(alertKey)) {
        const user = await User.findById(userId).select('email username fullname');
        
        if (user) {
          // Send email alert
          await sendSuspiciousActivityAlert(user, {
            type: 'Multiple Failed Login Attempts',
            ipAddress: ipAddress,
            location: 'Unknown Location',
            timestamp: new Date().toISOString(),
            description: `${failedAttempts} failed login attempts detected from IP ${ipAddress} in the last ${ALERT_CONFIG.FAILED_LOGIN_WINDOW_MS / 60000} minutes. If this wasn't you, please secure your account immediately.`
          });

          // Record alert
          recordAlert(alertKey, {
            type: 'MULTIPLE_FAILED_LOGINS',
            userId: userId.toString(),
            ipAddress: ipAddress,
            severity: 'HIGH',
            count: failedAttempts,
            description: `${failedAttempts} failed login attempts from IP ${ipAddress}`
          });
        }
      }

      return {
        suspicious: true,
        type: 'MULTIPLE_FAILED_LOGINS',
        count: failedAttempts,
        threshold: ALERT_CONFIG.FAILED_LOGIN_THRESHOLD
      };
    }

    return { suspicious: false, count: failedAttempts };
  } catch (error) {
    console.error('Error monitoring failed logins:', error);
    return { suspicious: false, error: error.message };
  }
};

/**
 * Monitor multiple account lockouts from same IP
 */
const monitorMultipleLockouts = async (ipAddress) => {
  try {
    const since = new Date(Date.now() - ALERT_CONFIG.MULTIPLE_LOCKOUTS_WINDOW_MS);
    
    // Count account lockouts from this IP
    const lockouts = await AuditLog.countDocuments({
      action: 'ACCOUNT_LOCKED',
      status: 'SUCCESS',
      ipAddress: ipAddress,
      timestamp: { $gte: since }
    });

    if (lockouts >= ALERT_CONFIG.MULTIPLE_LOCKOUTS_THRESHOLD) {
      const alertKey = `multiple_lockouts_${ipAddress}`;
      
      if (!isAlertInCooldown(alertKey)) {
        // This is a system-level alert (no specific user)
        console.warn('\n🚨 🚨 🚨 SECURITY ALERT: MULTIPLE ACCOUNT LOCKOUTS 🚨 🚨 🚨');
        console.warn('═══════════════════════════════════════════════════════════════');
        console.warn('Type: Multiple Account Lockouts');
        console.warn('IP Address:', ipAddress);
        console.warn('Lockouts:', lockouts);
        console.warn('Time Window:', ALERT_CONFIG.MULTIPLE_LOCKOUTS_WINDOW_MS / 60000, 'minutes');
        console.warn('Description: Possible brute force attack targeting multiple accounts');
        console.warn('═══════════════════════════════════════════════════════════════\n');

        recordAlert(alertKey, {
          type: 'MULTIPLE_ACCOUNT_LOCKOUTS',
          ipAddress: ipAddress,
          severity: 'CRITICAL',
          count: lockouts,
          description: `${lockouts} account lockouts from IP ${ipAddress} - Possible brute force attack`
        });
      }

      return {
        suspicious: true,
        type: 'MULTIPLE_ACCOUNT_LOCKOUTS',
        count: lockouts,
        threshold: ALERT_CONFIG.MULTIPLE_LOCKOUTS_THRESHOLD
      };
    }

    return { suspicious: false, count: lockouts };
  } catch (error) {
    console.error('Error monitoring multiple lockouts:', error);
    return { suspicious: false, error: error.message };
  }
};

/**
 * Monitor unusual IP activity (user accessing from multiple IPs in short time)
 */
const monitorUnusualIPActivity = async (userId, ipAddress) => {
  try {
    const since = new Date(Date.now() - ALERT_CONFIG.UNUSUAL_IP_WINDOW_MS);
    
    // Get unique IP addresses for this user in the time window
    const uniqueIPs = await AuditLog.distinct('ipAddress', {
      userId: userId,
      timestamp: { $gte: since },
      ipAddress: { $exists: true, $ne: null }
    });

    if (uniqueIPs.length >= ALERT_CONFIG.UNUSUAL_IP_THRESHOLD) {
      const alertKey = `unusual_ip_${userId}`;
      
      if (!isAlertInCooldown(alertKey)) {
        const user = await User.findById(userId).select('email username fullname');
        
        if (user) {
          await sendSuspiciousActivityAlert(user, {
            type: 'Unusual Login Activity - Multiple IP Addresses',
            ipAddress: ipAddress,
            location: 'Unknown Location',
            timestamp: new Date().toISOString(),
            description: `Your account was accessed from ${uniqueIPs.length} different IP addresses in the last ${ALERT_CONFIG.UNUSUAL_IP_WINDOW_MS / 60000} minutes. If this wasn't you, please secure your account immediately.`
          });

          recordAlert(alertKey, {
            type: 'UNUSUAL_IP_ACTIVITY',
            userId: userId.toString(),
            ipAddress: ipAddress,
            severity: 'HIGH',
            count: uniqueIPs.length,
            uniqueIPs: uniqueIPs,
            description: `Account accessed from ${uniqueIPs.length} different IPs`
          });
        }
      }

      return {
        suspicious: true,
        type: 'UNUSUAL_IP_ACTIVITY',
        count: uniqueIPs.length,
        uniqueIPs: uniqueIPs,
        threshold: ALERT_CONFIG.UNUSUAL_IP_THRESHOLD
      };
    }

    return { suspicious: false, count: uniqueIPs.length };
  } catch (error) {
    console.error('Error monitoring unusual IP activity:', error);
    return { suspicious: false, error: error.message };
  }
};

/**
 * Monitor rate limit violations
 */
const monitorRateLimitViolations = async (ipAddress, endpoint) => {
  try {
    const since = new Date(Date.now() - ALERT_CONFIG.RATE_LIMIT_VIOLATION_WINDOW_MS);
    
    // Count rate limit violations (status 429)
    const violations = await AuditLog.countDocuments({
      ipAddress: ipAddress,
      statusCode: 429,
      endpoint: endpoint || { $exists: true },
      timestamp: { $gte: since }
    });

    if (violations >= ALERT_CONFIG.RATE_LIMIT_VIOLATION_THRESHOLD) {
      const alertKey = `rate_limit_${ipAddress}_${endpoint || 'all'}`;
      
      if (!isAlertInCooldown(alertKey)) {
        console.warn('\n🚨 🚨 🚨 SECURITY ALERT: RATE LIMIT VIOLATIONS 🚨 🚨 🚨');
        console.warn('═══════════════════════════════════════════════════════════════');
        console.warn('Type: Rate Limit Violations');
        console.warn('IP Address:', ipAddress);
        console.warn('Endpoint:', endpoint || 'Multiple');
        console.warn('Violations:', violations);
        console.warn('Time Window:', ALERT_CONFIG.RATE_LIMIT_VIOLATION_WINDOW_MS / 60000, 'minutes');
        console.warn('Description: Possible DDoS or automated attack');
        console.warn('═══════════════════════════════════════════════════════════════\n');

        recordAlert(alertKey, {
          type: 'RATE_LIMIT_VIOLATIONS',
          ipAddress: ipAddress,
          endpoint: endpoint,
          severity: 'HIGH',
          count: violations,
          description: `${violations} rate limit violations from IP ${ipAddress} - Possible automated attack`
        });
      }

      return {
        suspicious: true,
        type: 'RATE_LIMIT_VIOLATIONS',
        count: violations,
        threshold: ALERT_CONFIG.RATE_LIMIT_VIOLATION_THRESHOLD
      };
    }

    return { suspicious: false, count: violations };
  } catch (error) {
    console.error('Error monitoring rate limit violations:', error);
    return { suspicious: false, error: error.message };
  }
};

/**
 * Check if alert is in cooldown period
 */
const isAlertInCooldown = (alertKey) => {
  const alert = activeAlerts.get(alertKey);
  if (!alert) return false;
  
  const timeSinceLastAlert = Date.now() - alert.lastAlertTime;
  return timeSinceLastAlert < ALERT_CONFIG.ALERT_COOLDOWN_MS;
};

/**
 * Record an alert
 */
const recordAlert = (alertKey, alertData) => {
  const alert = {
    ...alertData,
    timestamp: new Date(),
    lastAlertTime: Date.now()
  };

  activeAlerts.set(alertKey, alert);
  alertHistory.push(alert);

  // Keep only last 1000 alerts in history
  if (alertHistory.length > 1000) {
    alertHistory.shift();
  }

  // Log to audit log
  AuditLog.createLog({
    action: 'SECURITY_ALERT',
    actionCategory: 'SECURITY',
    status: 'SUCCESS',
    ipAddress: alertData.ipAddress || 'N/A',
    description: alertData.description || 'Security alert triggered',
    isSuspicious: true,
    endpoint: alertData.endpoint || 'N/A'
  }).catch(err => {
    console.error('Error logging security alert:', err);
  });
};

/**
 * Get recent security alerts
 */
const getRecentAlerts = (hours = 24, limit = 50) => {
  const since = Date.now() - (hours * 60 * 60 * 1000);
  
  return alertHistory
    .filter(alert => alert.timestamp.getTime() >= since)
    .sort((a, b) => b.timestamp - a.timestamp)
    .slice(0, limit);
};

/**
 * Get alert statistics
 */
const getAlertStatistics = (hours = 24) => {
  const since = Date.now() - (hours * 60 * 60 * 1000);
  const recentAlerts = alertHistory.filter(alert => alert.timestamp.getTime() >= since);

  const stats = {
    total: recentAlerts.length,
    byType: {},
    bySeverity: {
      CRITICAL: 0,
      HIGH: 0,
      MEDIUM: 0,
      LOW: 0
    },
    byIP: {},
    topIPs: []
  };

  recentAlerts.forEach(alert => {
    // Count by type
    stats.byType[alert.type] = (stats.byType[alert.type] || 0) + 1;
    
    // Count by severity
    if (alert.severity && stats.bySeverity[alert.severity] !== undefined) {
      stats.bySeverity[alert.severity]++;
    }
    
    // Count by IP
    if (alert.ipAddress) {
      stats.byIP[alert.ipAddress] = (stats.byIP[alert.ipAddress] || 0) + 1;
    }
  });

  // Get top IPs
  stats.topIPs = Object.entries(stats.byIP)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10)
    .map(([ip, count]) => ({ ip, count }));

  return stats;
};

/**
 * Cleanup old alerts
 */
const cleanupOldAlerts = () => {
  const cutoffTime = Date.now() - (7 * 24 * 60 * 60 * 1000); // 7 days
  
  // Remove old active alerts
  for (const [key, alert] of activeAlerts.entries()) {
    if (alert.timestamp.getTime() < cutoffTime) {
      activeAlerts.delete(key);
    }
  }
  
  // Remove old history
  const initialLength = alertHistory.length;
  while (alertHistory.length > 0 && alertHistory[0].timestamp.getTime() < cutoffTime) {
    alertHistory.shift();
  }
  
  const removed = initialLength - alertHistory.length;
  if (removed > 0) {
    console.log(`Cleaned up ${removed} old security alerts`);
  }
};

// Run cleanup every hour
setInterval(cleanupOldAlerts, 60 * 60 * 1000);

module.exports = {
  monitorFailedLogins,
  monitorMultipleLockouts,
  monitorUnusualIPActivity,
  monitorRateLimitViolations,
  getRecentAlerts,
  getAlertStatistics,
  ALERT_CONFIG
};
