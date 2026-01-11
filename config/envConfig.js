require('dotenv').config();

/**
 * Environment Variable Configuration with Validation
 * Strict management of environment variables using dotenv with validation
 * ensures sensitive configuration data remains secure.
 * Production credentials are stored securely and never exposed in the application code.
 */

/**
 * Default fallback values for environment variables
 * These are used when environment variables are not set
 */
const DEFAULT_CONFIG = {
  // Email Configuration Defaults
  EMAIL_HOST: 'smtp.gmail.com',
  EMAIL_PORT: 587,
  EMAIL_SECURE: false,
  EMAIL_FROM: 'noreply@bhokbhoj.com',
  
  // Client/Base URLs Defaults
  CLIENT_URL: 'http://localhost:3000',
  BASE_URL: 'http://localhost:5050',
  
  // CORS Allowed Origins Defaults
  CORS_ALLOWED_ORIGINS: [
    'http://localhost:3000',
    'https://localhost:3000',
    'http://localhost:5173',
    'https://localhost:5173'
  ],
  
  // Server Configuration Defaults
  PORT: 5050,
  NODE_ENV: 'development'
};

/**
 * Validate email configuration
 */
const validateEmailConfig = (emailHost, emailPort, emailSecure) => {
  const errors = [];
  
  if (emailHost && typeof emailHost !== 'string') {
    errors.push('EMAIL_HOST must be a string');
  }
  
  if (emailPort) {
    const port = parseInt(emailPort, 10);
    if (isNaN(port) || port < 1 || port > 65535) {
      errors.push('EMAIL_PORT must be a valid port number (1-65535)');
    }
  }
  
  if (emailSecure !== undefined && typeof emailSecure !== 'boolean' && emailSecure !== 'true' && emailSecure !== 'false') {
    errors.push('EMAIL_SECURE must be a boolean (true/false)');
  }
  
  return {
    valid: errors.length === 0,
    errors
  };
};

/**
 * Validate URL format
 */
const validateURL = (url, varName) => {
  if (!url) return { valid: true }; // Optional field
  
  try {
    const urlObj = new URL(url);
    return {
      valid: true,
      protocol: urlObj.protocol,
      host: urlObj.host
    };
  } catch (error) {
    return {
      valid: false,
      error: `${varName} must be a valid URL format (e.g., http://localhost:3000)`
    };
  }
};

/**
 * Parse CORS allowed origins from environment variable
 * Supports comma-separated string or array in JSON format
 */
const parseCORSOrigins = (envValue) => {
  if (!envValue) {
    return DEFAULT_CONFIG.CORS_ALLOWED_ORIGINS;
  }
  
  try {
    // Try parsing as JSON array first
    if (envValue.trim().startsWith('[')) {
      const parsed = JSON.parse(envValue);
      if (Array.isArray(parsed)) {
        return parsed;
      }
    }
    
    // Parse as comma-separated string
    const origins = envValue.split(',').map(origin => origin.trim()).filter(Boolean);
    return origins.length > 0 ? origins : DEFAULT_CONFIG.CORS_ALLOWED_ORIGINS;
  } catch (error) {
    console.warn(`⚠️  Failed to parse CORS_ALLOWED_ORIGINS: ${error.message}. Using defaults.`);
    return DEFAULT_CONFIG.CORS_ALLOWED_ORIGINS;
  }
};

/**
 * Get and validate environment configuration
 */
const getEnvConfig = () => {
  const errors = [];
  const warnings = [];
  
  // Email Configuration with defaults
  const EMAIL_HOST = process.env.EMAIL_HOST || DEFAULT_CONFIG.EMAIL_HOST;
  const EMAIL_PORT = process.env.EMAIL_PORT ? parseInt(process.env.EMAIL_PORT, 10) : DEFAULT_CONFIG.EMAIL_PORT;
  const EMAIL_SECURE = process.env.EMAIL_SECURE === 'true' || process.env.EMAIL_SECURE === true;
  const EMAIL_USER = process.env.EMAIL_USER || null;
  const EMAIL_PASS = process.env.EMAIL_PASS || null;
  const EMAIL_FROM = process.env.EMAIL_FROM || DEFAULT_CONFIG.EMAIL_FROM;
  
  // Validate email configuration
  const emailValidation = validateEmailConfig(EMAIL_HOST, EMAIL_PORT, EMAIL_SECURE);
  if (!emailValidation.valid) {
    errors.push(...emailValidation.errors);
  }
  
  // Client/Base URLs with defaults
  const CLIENT_URL = process.env.CLIENT_URL || DEFAULT_CONFIG.CLIENT_URL;
  const BASE_URL = process.env.BASE_URL || DEFAULT_CONFIG.BASE_URL;
  
  // Validate URLs
  const clientUrlValidation = validateURL(CLIENT_URL, 'CLIENT_URL');
  if (!clientUrlValidation.valid) {
    warnings.push(clientUrlValidation.error);
  }
  
  const baseUrlValidation = validateURL(BASE_URL, 'BASE_URL');
  if (!baseUrlValidation.valid) {
    warnings.push(baseUrlValidation.error);
  }
  
  // CORS Allowed Origins
  const CORS_ALLOWED_ORIGINS_ENV = process.env.CORS_ALLOWED_ORIGINS || null;
  const CORS_ALLOWED_ORIGINS = CORS_ALLOWED_ORIGINS_ENV 
    ? parseCORSOrigins(CORS_ALLOWED_ORIGINS_ENV)
    : DEFAULT_CONFIG.CORS_ALLOWED_ORIGINS;
  
  // Add CLIENT_URL to CORS origins if not already present
  if (CLIENT_URL && !CORS_ALLOWED_ORIGINS.includes(CLIENT_URL)) {
    CORS_ALLOWED_ORIGINS.push(CLIENT_URL);
  }
  
  // Add HTTPS version of CLIENT_URL if HTTP is provided
  if (CLIENT_URL.startsWith('http://') && !CORS_ALLOWED_ORIGINS.includes(CLIENT_URL.replace('http://', 'https://'))) {
    CORS_ALLOWED_ORIGINS.push(CLIENT_URL.replace('http://', 'https://'));
  }
  
  // Server Configuration
  const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : DEFAULT_CONFIG.PORT;
  const NODE_ENV = process.env.NODE_ENV || DEFAULT_CONFIG.NODE_ENV;
  
  // Warnings for missing optional but recommended variables
  if (!EMAIL_USER || !EMAIL_PASS) {
    warnings.push('EMAIL_USER and EMAIL_PASS are not set. Email functionality will use Ethereal Email (testing only).');
  }
  
  return {
    // Email Configuration
    email: {
      host: EMAIL_HOST,
      port: EMAIL_PORT,
      secure: EMAIL_SECURE,
      user: EMAIL_USER,
      pass: EMAIL_PASS,
      from: EMAIL_FROM
    },
    
    // Client/Base URLs
    urls: {
      clientUrl: CLIENT_URL,
      baseUrl: BASE_URL
    },
    
    // CORS Configuration
    cors: {
      allowedOrigins: CORS_ALLOWED_ORIGINS.filter(Boolean) // Remove any null/undefined values
    },
    
    // Server Configuration
    server: {
      port: PORT,
      nodeEnv: NODE_ENV
    },
    
    // Validation Results
    validation: {
      valid: errors.length === 0,
      errors,
      warnings
    }
  };
};

/**
 * Get environment variable with fallback
 * This function safely retrieves environment variables with type conversion
 */
const getEnv = (key, defaultValue = null, type = 'string') => {
  const value = process.env[key];
  
  if (!value && defaultValue === null) {
    return null;
  }
  
  if (!value) {
    return defaultValue;
  }
  
  // Type conversion
  switch (type) {
    case 'number':
      const num = parseInt(value, 10);
      return isNaN(num) ? defaultValue : num;
    case 'boolean':
      return value === 'true' || value === true;
    case 'array':
      try {
        if (value.trim().startsWith('[')) {
          return JSON.parse(value);
        }
        return value.split(',').map(item => item.trim()).filter(Boolean);
      } catch {
        return defaultValue || [];
      }
    default:
      return value;
  }
};

/**
 * Validate required environment variables
 */
const validateRequired = (requiredVars) => {
  const missing = [];
  
  requiredVars.forEach(varName => {
    if (!process.env[varName]) {
      missing.push(varName);
    }
  });
  
  return {
    valid: missing.length === 0,
    missing
  };
};

// Initialize and export configuration
const envConfig = getEnvConfig();

module.exports = {
  envConfig,
  getEnv,
  validateRequired,
  DEFAULT_CONFIG
};
