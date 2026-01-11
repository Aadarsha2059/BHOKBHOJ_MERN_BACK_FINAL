const { getUserDevices, deactivateDevice, trustDevice } = require('../services/deviceTrackingService');
const Device = require('../models/Device');

/**
 * Get all devices for authenticated user
 */
exports.getMyDevices = async (req, res) => {
  try {
    const userId = req.user._id || req.user.id;
    const activeOnly = req.query.activeOnly === 'true';

    const devices = await getUserDevices(userId, activeOnly);

    return res.status(200).json({
      success: true,
      message: 'Devices retrieved successfully',
      data: devices,
      count: devices.length
    });
  } catch (error) {
    console.error('Error getting devices:', error);
    return res.status(500).json({
      success: false,
      message: 'Error retrieving devices',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

/**
 * Get device by ID
 */
exports.getDeviceById = async (req, res) => {
  try {
    const userId = req.user._id || req.user.id;
    const { deviceId } = req.params;

    const device = await Device.findOne({
      userId,
      deviceId
    }).lean();

    if (!device) {
      return res.status(404).json({
        success: false,
        message: 'Device not found'
      });
    }

    return res.status(200).json({
      success: true,
      message: 'Device retrieved successfully',
      data: {
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
        userAgent: device.userAgent,
        fingerprint: device.fingerprint
      }
    });
  } catch (error) {
    console.error('Error getting device:', error);
    return res.status(500).json({
      success: false,
      message: 'Error retrieving device',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

/**
 * Deactivate a device
 */
exports.deactivateDevice = async (req, res) => {
  try {
    const userId = req.user._id || req.user.id;
    const { deviceId } = req.params;

    const success = await deactivateDevice(userId, deviceId);

    if (!success) {
      return res.status(404).json({
        success: false,
        message: 'Device not found or already inactive'
      });
    }

    return res.status(200).json({
      success: true,
      message: 'Device deactivated successfully'
    });
  } catch (error) {
    console.error('Error deactivating device:', error);
    return res.status(500).json({
      success: false,
      message: 'Error deactivating device',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

/**
 * Mark device as trusted
 */
exports.trustDevice = async (req, res) => {
  try {
    const userId = req.user._id || req.user.id;
    const { deviceId } = req.params;

    const success = await trustDevice(userId, deviceId);

    if (!success) {
      return res.status(404).json({
        success: false,
        message: 'Device not found'
      });
    }

    return res.status(200).json({
      success: true,
      message: 'Device marked as trusted'
    });
  } catch (error) {
    console.error('Error trusting device:', error);
    return res.status(500).json({
      success: false,
      message: 'Error trusting device',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};
