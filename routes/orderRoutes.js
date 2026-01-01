const express = require("express");
const router = express.Router();
const orderController = require("../controllers/orderController");
const { authenticateUser } = require("../middlewares/authorizedUser");
const { isAdmin } = require("../middlewares/roleMiddleware");

// All order routes require authentication
router.use(authenticateUser);

// Get purchase trend for the last 7 days
router.get('/trend', orderController.getPurchaseTrend);

// Create order from cart
router.post("/", orderController.createOrder);

// Get user's orders
router.get("/", orderController.getUserOrders);

// Get single order (✅ Already protected - checks userId)
router.get("/:id", orderController.getOrderById);

// Cancel order (✅ Already protected - checks userId)
router.put("/:id/cancel", orderController.cancelOrder);

// Update payment status (✅ IDOR FIX: Admin only)
router.put("/:id/payment", isAdmin, orderController.updatePaymentStatus);

// Mark order as received (✅ Already protected - checks userId)
router.put("/:id/received", orderController.markOrderReceived);

module.exports = router; 