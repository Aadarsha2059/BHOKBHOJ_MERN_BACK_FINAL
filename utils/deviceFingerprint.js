const UAParser = require('ua-parser-js');
const { v4: uuidv4 } = require('uuid');
const crypto = require('crypto');

/**
 * Device Fingerprinting Utility
 * Extracts device and browser information from request headers
 */

/**
 * Generate a unique device ID (UUID v4)
 * @returns {string} Device ID
 */
const generateDeviceId = () => {
  return uuidv4();
};

/**
 * Create a device fingerprint hash from various identifiers
 * @param {Object} deviceInfo - Device information object
 * @returns {string} Fingerprint hash
 */
const createFingerprint = (deviceInfo) => {
  const data = [
    deviceInfo.userAgent || '',
    deviceInfo.browserName || '',
    deviceInfo.browserVersion || '',
    deviceInfo.osName || '',
    deviceInfo.osVersion || '',
    deviceInfo.deviceType || '',
    deviceInfo.ipAddress || ''
  ].join('|');

  return crypto.createHash('sha256').update(data).digest('hex');
};

/**
 * Extract device information from request
 * @param {Object} req - Express request object
 * @returns {Object} Device information
 */
const extractDeviceInfo = (req) => {
  const userAgent = req.get('user-agent') || req.headers['user-agent'] || '';
  const parser = new UAParser(userAgent);
  const result = parser.getResult();

  // Extract IP address
  const ipAddress = req.ip 
    || req.connection?.remoteAddress 
    || req.socket?.remoteAddress 
    || req.headers['x-forwarded-for']?.split(',')[0]?.trim()
    || req.headers['x-real-ip']
    || 'Unknown';

  // Determine device type
  let deviceType = 'unknown';
  if (result.device?.type) {
    deviceType = result.device.type.toLowerCase();
  } else if (result.device?.vendor) {
    deviceType = 'mobile';
  } else if (/tablet/i.test(userAgent)) {
    deviceType = 'tablet';
  } else if (/mobile/i.test(userAgent)) {
    deviceType = 'mobile';
  } else {
    deviceType = 'desktop';
  }

  const deviceInfo = {
    userAgent: userAgent,
    browserName: result.browser?.name || 'Unknown',
    browserVersion: result.browser?.version || '0.0.0.0',
    osName: result.os?.name || 'Unknown',
    osVersion: result.os?.version || null,
    deviceType: deviceType,
    ipAddress: ipAddress,
    cpu: result.cpu?.architecture || null,
    engine: result.engine?.name || null
  };

  // Create fingerprint
  deviceInfo.fingerprint = createFingerprint(deviceInfo);

  return deviceInfo;
};

/**
 * Get formatted browser version string (e.g., "Edge 132.0.0.0")
 * @param {Object} deviceInfo - Device information object
 * @returns {string} Formatted browser version
 */
const getFormattedBrowserVersion = (deviceInfo) => {
  if (!deviceInfo.browserName || deviceInfo.browserName === 'Unknown') {
    return 'Unknown Browser';
  }
  return `${deviceInfo.browserName} ${deviceInfo.browserVersion}`;
};

/**
 * Get formatted OS info (e.g., "Windows 10")
 * @param {Object} deviceInfo - Device information object
 * @returns {string} Formatted OS info
 */
const getFormattedOSInfo = (deviceInfo) => {
  if (!deviceInfo.osName || deviceInfo.osName === 'Unknown') {
    return 'Unknown OS';
  }
  return deviceInfo.osVersion 
    ? `${deviceInfo.osName} ${deviceInfo.osVersion}` 
    : deviceInfo.osName;
};

module.exports = {
  generateDeviceId,
  createFingerprint,
  extractDeviceInfo,
  getFormattedBrowserVersion,
  getFormattedOSInfo
};
