const express = require("express");
const router = express.Router();
const {
  createUser,
  getOneUser,
  deleteOne,
  getUsers,
  updateOne,
} = require("../../controllers/admin/usermanagement");

const { authGuard, adminGuard } = require("../../middlewares/authGuard");
const validateUser = require("../../middlewares/validateUser");

// ✅ SECURED: All routes require authentication + admin role
// Create a new user
router.post("/", authGuard, adminGuard, validateUser, createUser);

// Get all users (protected route, admin only)
router.get("/", authGuard, adminGuard, getUsers);

// Get a single user by ID
router.get("/:id", authGuard, adminGuard, getOneUser);

// Update a user by ID
router.put("/:id", authGuard, adminGuard, validateUser, updateOne);

// Delete a user by ID
router.delete("/:id", authGuard, adminGuard, deleteOne);

module.exports = router;

