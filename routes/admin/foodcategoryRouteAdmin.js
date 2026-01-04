const express = require('express');
const router = express.Router();

const categoryController = require('../../controllers/admin/foodcategorymanagement');
const upload = require("../../middlewares/fileupload")
const { authGuard, adminGuard } = require("../../middlewares/authGuard");

// ✅ SECURED: All routes require authentication + admin role
router.post('/', 
    authGuard,
    adminGuard,
    upload.single("image"),
    categoryController.createCategory);
router.get('/', authGuard, adminGuard, categoryController.getAllCategories);
router.get('/debug', authGuard, adminGuard, categoryController.debugCategories); 
router.get('/:id', authGuard, adminGuard, categoryController.getCategoryById);

router.put('/:id', 
    authGuard,
    adminGuard,
    upload.single("image"),
    categoryController.updateCategory);
router.delete('/:id', authGuard, adminGuard, categoryController.deleteCategory);

module.exports = router;