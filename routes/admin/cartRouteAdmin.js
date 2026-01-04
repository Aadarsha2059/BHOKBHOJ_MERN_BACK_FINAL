const express = require("express");
const router = express.Router();
const cartController = require("../../controllers/admin/cartmanagement");
const { authGuard, adminGuard } = require("../../middlewares/authGuard");

// ✅ SECURED: All routes require authentication + admin role
// POST /api/admin/cart - Create a new cart item
router.post("/", authGuard, adminGuard, cartController.createCart);

// GET /api/admin/cart - Get all cart items (with optional pagination and search)
router.get("/", authGuard, adminGuard, cartController.getCarts);

// GET /api/admin/cart/:id - Get one cart item by ID
router.get("/:id", authGuard, adminGuard, cartController.getOneCart);

// PUT /api/admin/cart/:id - Update cart item
router.put("/:id", authGuard, adminGuard, cartController.updateCart);

// DELETE /api/admin/cart/:id - Delete cart item
router.delete("/:id", authGuard, adminGuard, cartController.deleteCart);

module.exports = router; 