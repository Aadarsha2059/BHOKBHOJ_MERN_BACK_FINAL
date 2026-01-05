const express = require("express");
const router = express.Router();
const cartController = require("../controllers/cartController");
const { authenticateUser } = require("../middlewares/authorizedUser");
const { optionalAuthGuard } = require("../middlewares/authGuard");
const { sanitizeNoSQL, sanitizeCommands, sanitizeXSS } = require("../middlewares/securityMiddleware");
const securityValidation = require("../middlewares/securityValidation");

// ✅ Use optional auth - allows guest users
// router.use(authenticateUser);

// Test authentication
router.get("/test", optionalAuthGuard, cartController.testAuth);

// Get user's cart (optional auth for guest users)
router.get("/", optionalAuthGuard, cartController.getCart);

// POST endpoint for cart details (Burp Suite testing - shows all details in request/response)
router.post("/details", optionalAuthGuard, securityValidation, sanitizeNoSQL, sanitizeCommands, sanitizeXSS, cartController.getCartDetails);

// Add item to cart (optional auth for guest users)
// ✅ SECURITY: securityValidation detects malicious payloads (XSS, SQL injection, etc.)
router.post("/add", optionalAuthGuard, securityValidation, sanitizeNoSQL, sanitizeCommands, sanitizeXSS, cartController.addToCart);

// Update cart item quantity (optional auth)
// ✅ SECURITY: securityValidation detects malicious payloads and price manipulation
router.put("/update", optionalAuthGuard, securityValidation, sanitizeNoSQL, sanitizeCommands, sanitizeXSS, cartController.updateCartItem);

// Remove item from cart (optional auth)
router.delete("/remove/:productId", optionalAuthGuard, cartController.removeFromCart);

// Clear cart (optional auth)
router.delete("/clear", optionalAuthGuard, cartController.clearCart);

module.exports = router; 