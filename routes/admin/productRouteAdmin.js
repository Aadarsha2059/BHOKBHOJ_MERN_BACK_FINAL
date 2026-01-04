const express=require("express")
const router=express.Router()
const productController=require("../../controllers/admin/productmanagement")
const upload=require("../../middlewares/fileupload")
const { authGuard, adminGuard } = require("../../middlewares/authGuard");

// ✅ SECURED: All routes require authentication + admin role
router.post(
    '/',
    authGuard,
    adminGuard,
    upload.single("image"),
    productController.createProduct
);
router.get(
    "/",
    authGuard,
    adminGuard,
    productController.getProducts
)
router.get('/:id', authGuard, adminGuard, productController.getOneProduct);
router.put('/:id', authGuard, adminGuard, upload.single('image'), productController.updateProduct);
router.delete('/:id', authGuard, adminGuard, productController.deleteProduct);

module.exports=router