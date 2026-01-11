const express = require('express');
const router = express.Router();
const deviceController = require('../controllers/deviceController');
const { authenticateUser } = require('../middlewares/authorizedUser');

/**
 * Device Management Routes
 * All routes require authentication
 */

// Get all devices for authenticated user
router.get('/', authenticateUser, deviceController.getMyDevices);

// Get device by ID
router.get('/:deviceId', authenticateUser, deviceController.getDeviceById);

// Deactivate a device
router.post('/:deviceId/deactivate', authenticateUser, deviceController.deactivateDevice);

// Mark device as trusted
router.post('/:deviceId/trust', authenticateUser, deviceController.trustDevice);

module.exports = router;
