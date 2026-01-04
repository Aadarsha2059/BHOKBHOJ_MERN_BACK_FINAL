/**
 * Rate Limiting Middleware for White Box Testing
 * Limits requests per IP address to prevent brute force attacks
 * Provides detailed rate limit information in response headers (visible in Burp Suite)
 */

// In-memory store for rate limiting (in production, use Redis)
const rateLimitStore = new Map();

// Rate limit configuration
const RATE_LIMITS = {
  '/api/auth/register': {
    windowMs: 15 * 60 * 1000, // 15 minutes
    maxRequests: 5, // 5 requests per 15 minutes
    message: 'Too many registration attempts. Please try again later.'
  },
  '/api/auth/login': {
    windowMs: 15 * 60 * 1000, // 15 minutes
    maxRequests: 10, // 10 requests per 15 minutes
    message: 'Too many login attempts. Please try again later.'
  },
  '/api/auth/verify-otp': {
    windowMs: 5 * 60 * 1000, // 5 minutes
    maxRequests: 10, // 10 OTP verification attempts per 5 minutes
    message: 'Too many OTP verification attempts. Please try again later.'
  }
};

/**
 * Get client IP address
 */
function getClientIP(req) {
  return req.ip || 
         req.connection.remoteAddress || 
         req.socket.remoteAddress ||
         (req.connection.socket ? req.connection.socket.remoteAddress : null) ||
         'unknown';
}

/**
 * Clean up expired entries from rate limit store
 */
function cleanupExpiredEntries() {
  const now = Date.now();
  for (const [key, data] of rateLimitStore.entries()) {
    if (data.resetTime < now) {
      rateLimitStore.delete(key);
    }
  }
}

// Clean up expired entries every 5 minutes
setInterval(cleanupExpiredEntries, 5 * 60 * 1000);

/**
 * Rate limiting middleware
 */
const rateLimiter = (req, res, next) => {
  // Skip rate limiting for OPTIONS requests
  if (req.method === 'OPTIONS') {
    return next();
  }

  const path = req.originalUrl.split('?')[0]; // Remove query string
  const config = RATE_LIMITS[path];

  // If no rate limit configured for this path, skip
  if (!config) {
    return next();
  }

  const clientIP = getClientIP(req);
  const key = `${clientIP}:${path}`;
  const now = Date.now();

  // Get or create rate limit data
  let rateLimitData = rateLimitStore.get(key);

  if (!rateLimitData || rateLimitData.resetTime < now) {
    // First request or window expired, create new entry
    rateLimitData = {
      count: 1,
      resetTime: now + config.windowMs,
      firstRequest: now
    };
    rateLimitStore.set(key, rateLimitData);
  } else {
    // Increment request count
    rateLimitData.count++;
  }

  // Calculate remaining time until reset
  const remainingTime = Math.ceil((rateLimitData.resetTime - now) / 1000); // in seconds
  const remainingRequests = Math.max(0, config.maxRequests - rateLimitData.count);

  // Set rate limit headers (visible in Burp Suite)
  res.setHeader('X-RateLimit-Limit', config.maxRequests);
  res.setHeader('X-RateLimit-Remaining', remainingRequests);
  res.setHeader('X-RateLimit-Reset', new Date(rateLimitData.resetTime).toISOString());
  res.setHeader('X-RateLimit-Window', `${config.windowMs / 1000} seconds`);

  // Check if rate limit exceeded
  if (rateLimitData.count > config.maxRequests) {
    console.log('\n🚨 🚨 🚨 RATE LIMIT EXCEEDED 🚨 🚨 🚨');
    console.log('═══════════════════════════════════════════════════════════════');
    console.log('📍 Endpoint:', req.method, req.originalUrl);
    console.log('🌐 Origin:', req.headers.origin || 'N/A');
    console.log('👤 IP Address:', clientIP);
    console.log('📊 Request Count:', rateLimitData.count, '/', config.maxRequests);
    console.log('⏰ Window:', config.windowMs / 1000, 'seconds');
    console.log('🕐 Reset Time:', new Date(rateLimitData.resetTime).toISOString());
    console.log('⏳ Remaining Time:', remainingTime, 'seconds');
    console.log('═══════════════════════════════════════════════════════════════');
    console.log('💡 This rate limit violation is visible in Burp Suite response');
    console.log('💡 Check response headers: X-RateLimit-*');
    console.log('🚨 🚨 🚨 🚨 🚨 🚨 🚨 🚨 🚨 🚨 🚨 🚨 🚨 🚨 🚨 🚨 🚨 🚨 🚨 🚨\n');

    return res.status(429).json({
      success: false,
      message: config.message,
      rateLimit: {
        limit: config.maxRequests,
        remaining: 0,
        resetTime: new Date(rateLimitData.resetTime).toISOString(),
        resetInSeconds: remainingTime,
        windowMs: config.windowMs,
        currentCount: rateLimitData.count,
        clientIP: clientIP,
        endpoint: `${req.method} ${req.originalUrl}`,
        note: 'Rate limit exceeded. This response is for white box security testing. Rate limit information is available in response headers (X-RateLimit-*).'
      }
    });
  }

  // Log rate limit status (for white box testing visibility)
  if (process.env.NODE_ENV !== 'production') {
    console.log(`\n📊 Rate Limit Status: ${path}`);
    console.log('   IP:', clientIP);
    console.log('   Requests:', rateLimitData.count, '/', config.maxRequests);
    console.log('   Remaining:', remainingRequests);
    console.log('   Reset in:', remainingTime, 'seconds\n');
  }

  next();
};

module.exports = rateLimiter;

