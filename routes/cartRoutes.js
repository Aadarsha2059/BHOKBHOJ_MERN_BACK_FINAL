const express = require("express");
const router = express.Router();
const cartController = require("../controllers/cartController");
const { authenticateUser } = require("../middlewares/authorizedUser");
const { optionalAuthGuard } = require("../middlewares/authGuard");
const { sanitizeNoSQL, sanitizeCommands, sanitizeXSS } = require("../middlewares/securityMiddleware");
const securityValidation = require("../middlewares/securityValidation");
const validateRequest = require("../middlewares/validateRequest");
const { addToCartSchema, updateCartItemSchema, productIdParamSchema } = require("../utils/validationSchemas");

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
// ✅ INPUT VALIDATION: Yup schema validates product ID and quantity
router.post("/add", optionalAuthGuard, securityValidation, sanitizeNoSQL, sanitizeCommands, sanitizeXSS, validateRequest(addToCartSchema, 'body'), cartController.addToCart);

// Update cart item quantity (optional auth)
// ✅ SECURITY: securityValidation detects malicious payloads and price manipulation
// ✅ INPUT VALIDATION: Yup schema validates quantity
router.put("/update", optionalAuthGuard, securityValidation, sanitizeNoSQL, sanitizeCommands, sanitizeXSS, validateRequest(updateCartItemSchema, 'body'), cartController.updateCartItem);

// Remove item from cart (optional auth)
// ✅ INPUT VALIDATION: Yup schema validates product ID parameter
router.delete("/remove/:productId", optionalAuthGuard, validateRequest(productIdParamSchema, 'params'), cartController.removeFromCart);

// Clear cart (optional auth)
router.delete("/clear", optionalAuthGuard, cartController.clearCart);

module.exports = router; 