const express = require("express");
const router = express.Router();
const foodController = require("../controllers/foodController");
const { authenticateUser } = require("../middlewares/authorizedUser");
const { sanitizeNoSQL, sanitizeCommands, sanitizeXSS } = require("../middlewares/securityMiddleware");
const securityValidation = require("../middlewares/securityValidation");

// Public routes (no authentication required)
// ✅ SECURITY: Validate query parameters and URL params for reflected XSS
router.get("/products", securityValidation, sanitizeNoSQL, sanitizeCommands, sanitizeXSS, foodController.getAllProducts);
router.get("/products/:id", securityValidation, sanitizeNoSQL, sanitizeCommands, sanitizeXSS, foodController.getProductById);
router.get("/categories", securityValidation, sanitizeNoSQL, sanitizeCommands, sanitizeXSS, foodController.getAllCategories);
router.get("/categories/:id", securityValidation, sanitizeNoSQL, sanitizeCommands, sanitizeXSS, foodController.getCategoryById);

// Protected routes (authentication required)
router.post("/products/:id/review", authenticateUser, foodController.addProductReview);
router.post("/products/:id/favorite", authenticateUser, foodController.toggleFavorite);
router.get("/favorites", authenticateUser, foodController.getUserFavorites);

module.exports = router; 