const express = require("express");
const router = express.Router();
const restaurantController = require("../../controllers/admin/restaurantmanagement");
const upload = require("../../middlewares/fileupload");
const { authGuard, adminGuard } = require("../../middlewares/authGuard");

// ✅ SECURED: All routes require authentication + admin role
// Create a new restaurant (with optional image upload)
router.post(
    '/',
    authGuard,
    adminGuard,
    upload.single("image"), // Handles file upload from field named "image"
    restaurantController.createRestaurant
);

// Get all restaurants (with pagination and search support)
router.get(
    '/',
    authGuard,
    adminGuard,
    restaurantController.getRestaurants
);

// Get restaurant by ID
router.get(
    '/:id',
    authGuard,
    adminGuard,
    restaurantController.getRestaurantById
);

// Update restaurant (with optional image upload)
router.put(
    '/:id',
    authGuard,
    adminGuard,
    upload.single("image"),
    restaurantController.updateRestaurant
);

// Delete restaurant
router.delete(
    '/:id',
    authGuard,
    adminGuard,
    restaurantController.deleteRestaurant
);

module.exports = router;
