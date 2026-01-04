const express = require("express");
const router = express.Router();
const orderController = require("../controllers/orderController");
const { authenticateUser } = require("../middlewares/authorizedUser");
const { isAdmin } = require("../middlewares/roleMiddleware");
const { sanitizeNoSQL, sanitizeCommands, sanitizeXSS } = require("../middlewares/securityMiddleware");
const securityValidation = require("../middlewares/securityValidation");

// All order routes require authentication
router.use(authenticateUser);

// Get purchase trend for the last 7 days
// ✅ SECURITY: Validate query parameters for reflected XSS
router.get('/trend', securityValidation, sanitizeNoSQL, sanitizeCommands, sanitizeXSS, orderController.getPurchaseTrend);

// Create order from cart
// ✅ SECURITY: securityValidation detects malicious payloads in delivery instructions, payment method, etc.
router.post("/", securityValidation, sanitizeNoSQL, sanitizeCommands, sanitizeXSS, orderController.createOrder);

// Get user's orders
// ✅ SECURITY: Validate query parameters (page, limit, status) for reflected XSS
router.get("/", securityValidation, sanitizeNoSQL, sanitizeCommands, sanitizeXSS, orderController.getUserOrders);

// Get single order (✅ Already protected - checks userId)
// ✅ SECURITY: Validate URL parameter for reflected XSS
router.get("/:id", securityValidation, sanitizeNoSQL, sanitizeCommands, sanitizeXSS, orderController.getOrderById);

// Cancel order (✅ Already protected - checks userId)
router.put("/:id/cancel", orderController.cancelOrder);

// Update payment status (✅ IDOR FIX: Admin only)
router.put("/:id/payment", isAdmin, orderController.updatePaymentStatus);

// Mark order as received (✅ Already protected - checks userId)
router.put("/:id/received", orderController.markOrderReceived);

module.exports = router; 