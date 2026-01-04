const Category = require('../../models/foodCategory');
const { transformCategoryData } = require("../../utils/imageUtils");

// Create a new category
exports.createCategory = async (req, res) => {
    try {
        const filename = req.file?.path
        console.log('Creating category with filepath:', filename);

        // Enforce image upload
        if (!filename) {
            return res.status(400).json({
                success: false,
                message: "Image is required for category."
            });
        }

        const category = new Category({ name: req.body.name, filepath: filename });
        await category.save();
        console.log('Category created successfully:', category);
        
        return res.status(201).json({
            success: true,
            message: "Created",
            data: category
        });
    } catch (err) {
        console.error('Error creating category:', err);
        return res.status(500).json({ success: false, message: "Server Error" });
    }
};

exports.getAllCategories = async (req, res) => {
    try {
        // ✅ PERFORMANCE OPTIMIZED: Use lean() for read-only queries
        const categories = await Category.find()
            .select('name filepath createdAt updatedAt')
            .lean()
            .sort({ name: 1 });
        console.log('Retrieved categories:', categories.map(cat => ({ name: cat.name, filepath: cat.filepath })));
        return res.json({ success: true, data: categories, message: "All category" });
    } catch (err) {
        console.error('Error getting categories:', err);
        return res.status(500).json({ success: false, message: "Server Error" });
    }
};

// Get single category by ID
exports.getCategoryById = async (req, res) => {
    try {
        const category = await Category.findById(req.params.id);
        if (!category) return res.status(404).json({ success: false, message: 'Category not found' });
        console.log('Retrieved single category:', { name: category.name, filepath: category.filepath });
        return res.json({ success: true, data: category, message: "One category" });
    } catch (err) {
        console.error('Error getting category by ID:', err);
        return res.status(500).json({ success: false, message: "Server Error" });
    }
};

// Update a category
exports.updateCategory = async (req, res) => {
    try {
        const filename = req.file?.path
        console.log('Updating category with filepath:', filename);
        
        // Fetch the existing category
        const existingCategory = await Category.findById(req.params.id);
        if (!existingCategory) return res.status(404).json({ success: false, message: 'Category not found' });

        // Enforce image presence: either a new image is uploaded, or the category already has an image
        if (!filename && !existingCategory.filepath) {
            return res.status(400).json({
                success: false,
                message: "Image is required for category."
            });
        }

        const data = {
            name: req.body.name
        }
        if (filename) {
            data.filepath = filename
        }
        const category = await Category.findByIdAndUpdate(
            req.params.id,
            data,
            { new: true }
        );
        if (!category) return res.status(404).json({ success: false, message: 'Category not found' });
        console.log('Category updated successfully:', category);
        return res.json({ success: true, data: category, message: "Updated" });
    } catch (err) {
        console.error('Error updating category:', err);
        return res.status(500).json({ error: "Server Error" });
    }
};

// Delete a category
exports.deleteCategory = async (req, res) => {
    try {
        const result = await Category.findByIdAndDelete(req.params.id);
        if (!result) return res.status(404).json({ success: false, message: 'Category not found' });
        console.log('Category deleted successfully:', result);
        return res.json({ success: true, message: 'Category deleted' });
    } catch (err) {
        console.error('Error deleting category:', err);
        return res.status(500).json({ success: false, message: "Server Error" });
    }
};

// Test endpoint to debug category images
exports.debugCategories = async (req, res) => {
    try {
        const categories = await Category.find();
        const debugInfo = categories.map(cat => ({
            id: cat._id,
            name: cat.name,
            filepath: cat.filepath,
            hasFilepath: !!cat.filepath,
            expectedUrl: cat.filepath ? `http://localhost:5050/uploads/${cat.filepath.replace('uploads/', '')}` : null
        }));
        
        console.log('=== DEBUG CATEGORIES ===');
        console.log(JSON.stringify(debugInfo, null, 2));
        
        return res.json({ 
            success: true, 
            message: "Debug info", 
            data: debugInfo,
            totalCategories: categories.length
        });
    } catch (err) {
        console.error('Error in debug categories:', err);
        return res.status(500).json({ success: false, message: "Server Error" });
    }
};

exports.getCategories = async (req, res) => {
    try {
        // ✅ PERFORMANCE OPTIMIZED: Use lean() for read-only queries
        const categories = await Category.find()
            .select('name filepath createdAt updatedAt')
            .sort({ name: 1 })
            .lean();

        // Transform categories with full image URLs
        const baseUrl = `${req.protocol}://${req.get('host')}`;
        const transformedCategories = categories.map(category => transformCategoryData(category, baseUrl));

        return res.status(200).json({
            success: true,
            message: "Categories fetched successfully",
            data: transformedCategories
        });
    } catch (err) {
        console.error("Get Categories Error:", err);
        return res.status(500).json({
            success: false,
            message: "Server error"
        });
    }
};

exports.getOneCategory = async (req, res) => {
    try {
        const category = await Category.findById(req.params.id);
        if (!category) {
            return res.status(404).json({
                success: false,
                message: "Category not found"
            });
        }

        // Transform category with full image URL
        const baseUrl = `${req.protocol}://${req.get('host')}`;
        const transformedCategory = transformCategoryData(category, baseUrl);

        return res.status(200).json({
            success: true,
            message: "Category fetched successfully",
            data: transformedCategory
        });
    } catch (err) {
        console.error("Get Category Error:", err);
        return res.status(500).json({
            success: false,
            message: "Server error"
        });
    }
};