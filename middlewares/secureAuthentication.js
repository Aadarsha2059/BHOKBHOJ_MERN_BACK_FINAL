const IPBlockService = require('../services/ipBlockService');

// ==========================================
// IP-BASED SECURITY: Secure Authentication
// ==========================================

const secureAuthentication = async (req, res, next) => {
  try {
    const ip = req.ip || req.connection.remoteAddress || req.headers['x-forwarded-for']?.split(',')[0] || 'Unknown';
    
    // ✅ IP-BASED SECURITY: Check if IP is blocked
    if (IPBlockService.isBlocked(ip)) {
      const remainingMinutes = IPBlockService.getRemainingBlockTime(ip);
      const attemptCount = IPBlockService.getAttemptCount(ip);
      return res.status(403).json({
        success: false,
        message: `Access temporarily blocked due to multiple failed attempts. Please try again in ${remainingMinutes} minute(s).`,
        ipBlocked: true,
        remainingMinutes: remainingMinutes,
        ipAttempts: attemptCount,
        blockedIP: ip
      });
    }
    
    req.clientIP = ip;
    next();
  } catch (error) {
    console.error('Secure authentication error:', error);
    return res.status(500).json({
      success: false,
      message: 'Server error during authentication check'
    });
  }
};

const recordFailedAttempt = async (req, endpoint = '/api/auth/login') => {
  try {
    const ip = req.clientIP || req.ip || req.connection.remoteAddress || req.headers['x-forwarded-for']?.split(',')[0] || 'Unknown';
    await IPBlockService.recordAttempt(ip, endpoint);
  } catch (error) {
    console.error('Error recording failed attempt:', error);
  }
};

const clearFailedAttempts = (req) => {
  try {
    const ip = req.clientIP || req.ip || req.connection.remoteAddress || req.headers['x-forwarded-for']?.split(',')[0] || 'Unknown';
    IPBlockService.clearAttempts(ip);
  } catch (error) {
    console.error('Error clearing failed attempts:', error);
  }
};

module.exports = {
  secureAuthentication,
  recordFailedAttempt,
  clearFailedAttempts
};
