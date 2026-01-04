const express = require("express");
const router = express.Router();
const feedbackController = require("../../controllers/admin/feedbackmanagement");
const { authGuard, adminGuard } = require("../../middlewares/authGuard");

// ✅ SECURED: All routes require authentication + admin role
// POST /api/admin/feedback - Create a new feedback
router.post("/", authGuard, adminGuard, feedbackController.createFeedback);

// GET /api/admin/feedback - Get all feedbacks (with optional pagination and search)
router.get("/", authGuard, adminGuard, feedbackController.getFeedbacks);

// GET /api/admin/feedback/:id - Get one feedback by ID
router.get("/:id", authGuard, adminGuard, feedbackController.getOneFeedback);

// PUT /api/admin/feedback/:id - Update feedback
router.put("/:id", authGuard, adminGuard, feedbackController.updateFeedback);

// DELETE /api/admin/feedback/:id - Delete feedback
router.delete("/:id", authGuard, adminGuard, feedbackController.deleteFeedback);

module.exports = router; 