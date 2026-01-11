require('dotenv').config();

/**
 * CORS Configuration for BhokBhoj/final
 * Strict Cross-Origin Resource Sharing policies restrict resource access to authorized domains only
 * Uses environment variables with secure fallbacks
 */

/**
 * Default CORS allowed origins 
 */
const DEFAULT_CORS_ORIGINS = [
  'http://localhost:3000',
  'https://localhost:3000',
  'http://localhost:5173',
  'https://localhost:5173',
  'http://127.0.0.1:3000',
  'https://127.0.0.1:3000',
  'http://127.0.0.1:5173',
  'https://127.0.0.1:5173'
];

/**
 * Parse CORS origins from environment variables
 * Supports CORS_ORIGIN or CORS_ALLOWED_ORIGINS (comma-separated string or JSON array format)
 */
const parseCORSFromEnv = () => {
  // Support both CORS_ORIGIN and CORS_ALLOWED_ORIGINS
  const envValue = process.env.CORS_ORIGIN || process.env.CORS_ALLOWED_ORIGINS;
  if (!envValue) {
    return [];
  }
  
  try {
    if (envValue.trim().startsWith('[')) {
      const parsed = JSON.parse(envValue);
      if (Array.isArray(parsed)) {
        return parsed.filter(Boolean);
      }
    }
    const origins = envValue.split(',').map(o => o.trim()).filter(Boolean);
    return origins;
  } catch (error) {
    console.warn('Failed to parse CORS origins from env:', error.message);
    return [];
  }
};

/**
 * CORS Allowed Origins Configuration
 * Combines default origins with environment variables
 */
const CORS_ALLOWED_ORIGINS = [
  ...DEFAULT_CORS_ORIGINS,
  ...parseCORSFromEnv(),
  process.env.CLIENT_URL,
  process.env.FRONTEND_URL,
  process.env.PRODUCTION_FRONTEND_URL,
  process.env.CORS_ALLOWED_ORIGIN_1,
  process.env.CORS_ALLOWED_ORIGIN_2,
  process.env.CORS_ALLOWED_ORIGIN_3
].filter(Boolean);

// Remove duplicates
const uniqueCORSOrigins = [...new Set(CORS_ALLOWED_ORIGINS)];

/**
 * CORS Configuration Object
 * This configuration is used by the CORS middleware
 */
const corsConfig = {
    CORS_ALLOWED_ORIGINS: uniqueCORSOrigins,
    
    // Additional CORS settings
    credentials: true,              // Allow cookies and authorization headers
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    allowedHeaders: [
        'Content-Type',
        'Authorization',
        'X-Requested-With',
        'X-CSRF-Token',
        'Accept',
        'Origin',
        'User-Agent'
    ],
    exposedHeaders: ['Content-Range', 'X-Content-Range'],
    maxAge: 86400,                  // Cache preflight requests for 24 hours
    optionsSuccessStatus: 200
};

module.exports = corsConfig;
