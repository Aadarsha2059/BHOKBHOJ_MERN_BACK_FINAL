/**
 * Environment Variable Protection Implementation
 * Actual implementation from BhokBhoj/final
 * 
 * Strict management of environment variables using dotenv with validation
 * ensures sensitive configuration data remains secure.
 * Production credentials are stored securely and never exposed in application code.
 */

require('dotenv').config();

// Default fallback values when environment variables are not set
const DEFAULT_CONFIG = {
  EMAIL_HOST: 'smtp.gmail.com',
  EMAIL_PORT: 587,
  EMAIL_SECURE: false,
  EMAIL_FROM: 'noreply@bhokbhoj.com',
  CLIENT_URL: 'http://localhost:3000',
  BASE_URL: 'http://localhost:5050',
  CORS_ALLOWED_ORIGINS: [
    'http://localhost:3000',
    'https://localhost:3000',
    'http://localhost:5173',
    'https://localhost:5173'
  ],
  PORT: 5050,
  NODE_ENV: 'development'
};

// Email configuration with validation
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
  return { valid: errors.length === 0, errors };
};

// URL validation
const validateURL = (url, varName) => {
  if (!url) return { valid: true };
  try {
    new URL(url);
    return { valid: true };
  } catch {
    return { valid: false, error: `${varName} must be a valid URL format` };
  }
};

// Parse CORS origins from environment variable
const parseCORSOrigins = (envValue) => {
  if (!envValue) return DEFAULT_CONFIG.CORS_ALLOWED_ORIGINS;
  try {
    if (envValue.trim().startsWith('[')) {
      const parsed = JSON.parse(envValue);
      if (Array.isArray(parsed)) return parsed.filter(Boolean);
    }
    const origins = envValue.split(',').map(o => o.trim()).filter(Boolean);
    return origins.length > 0 ? origins : DEFAULT_CONFIG.CORS_ALLOWED_ORIGINS;
  } catch {
    return DEFAULT_CONFIG.CORS_ALLOWED_ORIGINS;
  }
};

// Get and validate environment configuration
const getEnvConfig = () => {
  const errors = [];
  const warnings = [];
  
  const EMAIL_HOST = process.env.EMAIL_HOST || DEFAULT_CONFIG.EMAIL_HOST;
  const EMAIL_PORT = process.env.EMAIL_PORT ? parseInt(process.env.EMAIL_PORT, 10) : DEFAULT_CONFIG.EMAIL_PORT;
  const EMAIL_SECURE = process.env.EMAIL_SECURE === 'true' || process.env.EMAIL_SECURE === true;
  const EMAIL_USER = process.env.EMAIL_USER || null;
  const EMAIL_PASS = process.env.EMAIL_PASS || null;
  const EMAIL_FROM = process.env.EMAIL_FROM || DEFAULT_CONFIG.EMAIL_FROM;
  
  const emailValidation = validateEmailConfig(EMAIL_HOST, EMAIL_PORT, EMAIL_SECURE);
  if (!emailValidation.valid) {
    errors.push(...emailValidation.errors);
  }
  
  const CLIENT_URL = process.env.CLIENT_URL || DEFAULT_CONFIG.CLIENT_URL;
  const BASE_URL = process.env.BASE_URL || DEFAULT_CONFIG.BASE_URL;
  
  const clientUrlValidation = validateURL(CLIENT_URL, 'CLIENT_URL');
  if (!clientUrlValidation.valid) warnings.push(clientUrlValidation.error);
  
  const baseUrlValidation = validateURL(BASE_URL, 'BASE_URL');
  if (!baseUrlValidation.valid) warnings.push(baseUrlValidation.error);
  
  const CORS_ALLOWED_ORIGINS_ENV = process.env.CORS_ALLOWED_ORIGINS || null;
  let CORS_ALLOWED_ORIGINS = CORS_ALLOWED_ORIGINS_ENV ? parseCORSOrigins(CORS_ALLOWED_ORIGINS_ENV) : DEFAULT_CONFIG.CORS_ALLOWED_ORIGINS;
  
  if (CLIENT_URL && !CORS_ALLOWED_ORIGINS.includes(CLIENT_URL)) {
    CORS_ALLOWED_ORIGINS.push(CLIENT_URL);
  }
  
  if (CLIENT_URL.startsWith('http://') && !CORS_ALLOWED_ORIGINS.includes(CLIENT_URL.replace('http://', 'https://'))) {
    CORS_ALLOWED_ORIGINS.push(CLIENT_URL.replace('http://', 'https://'));
  }
  
  const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : DEFAULT_CONFIG.PORT;
  const NODE_ENV = process.env.NODE_ENV || DEFAULT_CONFIG.NODE_ENV;
  
  if (!EMAIL_USER || !EMAIL_PASS) {
    warnings.push('EMAIL_USER and EMAIL_PASS are not set. Email functionality will use Ethereal Email (testing only).');
  }
  
  return {
    email: { host: EMAIL_HOST, port: EMAIL_PORT, secure: EMAIL_SECURE, user: EMAIL_USER, pass: EMAIL_PASS, from: EMAIL_FROM },
    urls: { clientUrl: CLIENT_URL, baseUrl: BASE_URL },
    cors: { allowedOrigins: CORS_ALLOWED_ORIGINS.filter(Boolean) },
    server: { port: PORT, nodeEnv: NODE_ENV },
    validation: { valid: errors.length === 0, errors, warnings }
  };
};

const envConfig = getEnvConfig();

module.exports = { envConfig, DEFAULT_CONFIG, validateEmailConfig, validateURL };
