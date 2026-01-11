const Device = require('../models/Device');
const { extractDeviceInfo, generateDeviceId, getFormattedBrowserVersion, getFormattedOSInfo } = require('../utils/deviceFingerprint');

/**
 * Device Tracking Service
 * Manages device tracking for user authentication
 */

/**
 * Track or update device on successful login
 * @param {Object} user - User document
 * @param {Object} req - Express request object
 * @returns {Promise<Object>} Device document
 */
const trackDevice = async (user, req) => {
  try {
    // Extract device information from request
    const deviceInfo = extractDeviceInfo(req);
    const deviceId = generateDeviceId();
    const fingerprint = deviceInfo.fingerprint;

    // Check if device with same fingerprint exists for this user
    let device = await Device.findOne({
      userId: user._id,
      fingerprint: fingerprint,
      isActive: true
    });

    if (device) {
      // Update existing device
      device.lastActiveAt = new Date();
      device.ipAddress = deviceInfo.ipAddress;
      device.userAgent = deviceInfo.userAgent;
      device.loginAttempts = 0; // Reset on successful login
      await device.save();

      console.log('\n📱 DEVICE TRACKING: Updated existing device');
      console.log('═══════════════════════════════════════');
      console.log('👤 User ID:', user._id);
      console.log('📱 Device ID:', device.deviceId);
      console.log('🌐 Browser:', getFormattedBrowserVersion(deviceInfo));
      console.log('💻 OS:', getFormattedOSInfo(deviceInfo));
      console.log('📍 IP:', deviceInfo.ipAddress);
      console.log('⏰ Last Active:', device.lastActiveAt.toISOString());
      console.log('═══════════════════════════════════════\n');

      return device;
    }

    // Check active device count
    const activeDeviceCount = await Device.countDocuments({
      userId: user._id,
      isActive: true
    });

    const maxDevices = user.maxDevices || 3;

    // If max devices reached, deactivate oldest device
    if (activeDeviceCount >= maxDevices) {
      const oldestDevice = await Device.findOne({
        userId: user._id,
        isActive: true
      }).sort({ lastActiveAt: 1 });

      if (oldestDevice) {
        oldestDevice.isActive = false;
        oldestDevice.lastActiveAt = new Date();
        await oldestDevice.save();

        console.log('\n📱 DEVICE TRACKING: Deactivated oldest device (max devices limit reached)');
        console.log('═══════════════════════════════════════');
        console.log('👤 User ID:', user._id);
        console.log('📱 Old Device ID:', oldestDevice.deviceId);
        console.log('📊 Active Devices:', activeDeviceCount);
        console.log('📊 Max Devices:', maxDevices);
        console.log('═══════════════════════════════════════\n');
      }
    }

    // Create new device
    device = new Device({
      userId: user._id,
      deviceId: deviceId,
      browserName: deviceInfo.browserName,
      browserVersion: deviceInfo.browserVersion,
      osName: deviceInfo.osName,
      osVersion: deviceInfo.osVersion,
      deviceType: deviceInfo.deviceType,
      userAgent: deviceInfo.userAgent,
      ipAddress: deviceInfo.ipAddress,
      fingerprint: fingerprint,
      isActive: true,
      lastActiveAt: new Date(),
      firstSeenAt: new Date(),
      loginAttempts: 0
    });

    await device.save();

    console.log('\n📱 DEVICE TRACKING: New device registered');
    console.log('═══════════════════════════════════════');
    console.log('👤 User ID:', user._id);
    console.log('📱 Device ID:', device.deviceId);
    console.log('🌐 Browser:', getFormattedBrowserVersion(deviceInfo));
    console.log('💻 OS:', getFormattedOSInfo(deviceInfo));
    console.log('📍 IP:', deviceInfo.ipAddress);
    console.log('📊 Active Devices:', activeDeviceCount + 1);
    console.log('📊 Max Devices:', maxDevices);
    console.log('⏰ First Seen:', device.firstSeenAt.toISOString());
    console.log('═══════════════════════════════════════\n');

    return device;
  } catch (error) {
    console.error('\n❌ DEVICE TRACKING ERROR:');
    console.error('═══════════════════════════════════════');
    console.error('Error:', error.message);
    console.error('Stack:', error.stack);
    console.error('═══════════════════════════════════════\n');
    // Don't throw error - device tracking shouldn't break login
    return null;
  }
};

/**
 * Get all devices for a user
 * @param {Object} userId - User ID
 * @param {Boolean} activeOnly - Only return active devices
 * @returns {Promise<Array>} Array of device documents
 */
const getUserDevices = async (userId, activeOnly = false) => {
  try {
    const query = { userId };
    if (activeOnly) {
      query.isActive = true;
    }

    const devices = await Device.find(query)
      .sort({ lastActiveAt: -1 })
      .lean();

    return devices.map(device => ({
      _id: device._id,
      deviceId: device.deviceId,
      browserInfo: `${device.browserName} ${device.browserVersion}`,
      osInfo: device.osVersion ? `${device.osName} ${device.osVersion}` : device.osName,
      deviceType: device.deviceType,
      ipAddress: device.ipAddress,
      isActive: device.isActive,
      lastActiveAt: device.lastActiveAt,
      firstSeenAt: device.firstSeenAt,
      loginAttempts: device.loginAttempts,
      isTrusted: device.isTrusted,
      userAgent: device.userAgent
    }));
  } catch (error) {
    console.error('Error getting user devices:', error);
    throw error;
  }
};

/**
 * Deactivate a device
 * @param {Object} userId - User ID
 * @param {String} deviceId - Device ID
 * @returns {Promise<Boolean>} Success status
 */
const deactivateDevice = async (userId, deviceId) => {
  try {
    const device = await Device.findOne({
      userId,
      deviceId,
      isActive: true
    });

    if (!device) {
      return false;
    }

    device.isActive = false;
    device.lastActiveAt = new Date();
    await device.save();

    return true;
  } catch (error) {
    console.error('Error deactivating device:', error);
    throw error;
  }
};

/**
 * Mark device as trusted
 * @param {Object} userId - User ID
 * @param {String} deviceId - Device ID
 * @returns {Promise<Boolean>} Success status
 */
const trustDevice = async (userId, deviceId) => {
  try {
    const device = await Device.findOne({
      userId,
      deviceId
    });

    if (!device) {
      return false;
    }

    device.isTrusted = true;
    await device.save();

    return true;
  } catch (error) {
    console.error('Error trusting device:', error);
    throw error;
  }
};

module.exports = {
  trackDevice,
  getUserDevices,
  deactivateDevice,
  trustDevice
};
