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
const validateRequest = require("../../middlewares/validateRequest");
const { adminCreateUserSchema, updateProfileSchema, userIdParamSchema } = require("../../utils/validationSchemas");



router.post("/", authGuard, adminGuard, validateRequest(adminCreateUserSchema, 'body'), createUser);

// Get all users 
router.get("/", authGuard, adminGuard, getUsers);

// Get a user by ID
router.get("/:id", authGuard, adminGuard, validateRequest(userIdParamSchema, 'params'), getOneUser);

// Update a user by ID

router.put("/:id", authGuard, adminGuard, validateRequest(userIdParamSchema, 'params'), validateRequest(updateProfileSchema, 'body'), updateOne);

// Delete a user by ID

router.delete("/:id", authGuard, adminGuard, validateRequest(userIdParamSchema, 'params'), deleteOne);

module.exports = router;

