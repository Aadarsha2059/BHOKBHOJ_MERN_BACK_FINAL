const express = require("express");
const router = express.Router();
const orderController = require("../../controllers/admin/ordermanagement");
const { authGuard, adminGuard } = require("../../middlewares/authGuard");

// POST /api/admin/order - Create a new order
router.post("/", authGuard, adminGuard, orderController.createOrder);

// GET /api/admin/order - Get all orders (with optional pagination and search)
router.get("/", authGuard, adminGuard, orderController.getOrders);

// GET /api/admin/order/:id - Get one order by ID
router.get('/:id', authGuard, adminGuard, orderController.getOrderById);

// PUT /api/admin/order/:id/accept - Accept an order
router.put('/:id/accept', authGuard, adminGuard, orderController.acceptOrder);

// PUT /api/admin/order/:id/reject - Reject an order
router.put('/:id/reject', authGuard, adminGuard, orderController.rejectOrder);

module.exports = router;
