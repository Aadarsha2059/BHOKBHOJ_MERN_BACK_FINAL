const Product = require("../../models/Product");
const mongoose = require('mongoose');
const { transformProductData } = require("../../utils/imageUtils");

exports.createProduct = async (req, res) => {
    console.log("Create Product Request Body:", req.body);
    console.log("Create Product File:", req.file);
    
    const { name, price, categoryId, type, restaurantId } = req.body;

    if (!name || !price || !categoryId || !type || !restaurantId) {
        console.log("Missing required fields:", { name, price, categoryId, type, restaurantId });
        return res.status(400).json({
            success: false,
            message: "Missing required fields: name, price, categoryId, type, restaurantId",
        });
    }

    if (!req.file) {
        console.log("No file uploaded");
        return res.status(400).json({
            success: false,
            message: "Product image is required",
        });
    }

    try {
        const filepath = req.file.filename; // Get the uploaded file name
        console.log("File path:", filepath);
        
        // Validate price
        const numericPrice = Number(price);
        if (isNaN(numericPrice) || numericPrice <= 0) {
            return res.status(400).json({
                success: false,
                message: "Price must be a positive number",
            });
        }

        // Normalize type to lowercase for consistency
        const normalizedType = type.toLowerCase();
        if (!['indian', 'nepali'].includes(normalizedType)) {
            return res.status(400).json({
                success: false,
                message: "Type must be one of: indian, nepali",
            });
        }

        console.log("Creating product with data:", {
            name: name.trim(),
            price: numericPrice,
            categoryId,
            type: normalizedType,
            restaurantId,
            filepath,
            description: `${name} - Delicious ${type} food`,
        });

        const product = new Product({
            name: name.trim(),
            price: numericPrice,
            categoryId: new mongoose.Types.ObjectId(categoryId),
            type: normalizedType,
            restaurantId: new mongoose.Types.ObjectId(restaurantId),
            filepath,
            description: `${name} - Delicious ${type} food`
        });

        console.log("Product object created, saving to database...");
        await product.save();
        console.log("Product saved successfully");

        // Populate category and restaurant details for response
        await product.populate("categoryId", "name");
        await product.populate("restaurantId", "name location");
        console.log("Product populated with category and restaurant");

        return res.status(201).json({
            success: true,
            data: product,
            message: "Product created successfully",
        });
    } catch (err) {
        console.error("Create Product Error:", err);
        console.error("Error stack:", err.stack);
        
        // Handle specific MongoDB errors
        if (err.name === 'ValidationError') {
            const errors = Object.values(err.errors).map(e => e.message);
            console.log("Validation errors:", errors);
            return res.status(400).json({
                success: false,
                message: "Validation error",
                errors: errors
            });
        }
        
        if (err.code === 11000) {
            return res.status(400).json({
                success: false,
                message: "Product with this name already exists",
            });
        }

        return res.status(500).json({
            success: false,
            message: "Server error",
            error: process.env.NODE_ENV === 'development' ? err.message : undefined
        });
    }
};

exports.getProducts = async (req, res) => {
    try {
        const { page = 1, limit = 10, search = "" } = req.query;
        const skip = (page - 1) * limit;

        let filter = {};
        if (search) {
            filter.$or = [
                { name: { $regex: search, $options: 'i' } },
                { type: { $regex: search, $options: 'i' } }
            ];
        }

        // ✅ PERFORMANCE OPTIMIZED: Use lean() and parallel queries
        const [products, total] = await Promise.all([
            Product.find(filter)
                .populate("categoryId", "name filepath")
                .populate("restaurantId", "name location filepath")
                .populate("sellerId", "firstName email")
                .select('name price categoryId restaurantId type filepath description createdAt updatedAt')
                .skip(skip)
                .limit(Number(limit))
                .sort({ createdAt: -1 })
                .lean(), // ✅ Use lean() for read-only queries (much faster)
            Product.countDocuments(filter)
        ]);

        // Transform products with full image URLs
        const baseUrl = `${req.protocol}://${req.get('host')}`;
        const transformedProducts = products.map(product => transformProductData(product, baseUrl));

        return res.status(200).json({
            success: true,
            message: "Products fetched",
            data: transformedProducts,
            pagination: {
                total,
                page: Number(page),
                limit: Number(limit),
                totalPages: Math.ceil(total / limit)
            }
        });
    } catch (err) {
        console.error("Get Products Error:", err);
        return res.status(500).json({
            success: false,
            message: "Server error"
        });
    }
};

exports.getOneProduct = async (req, res) => {
    try {
        // ✅ PERFORMANCE OPTIMIZED: Use lean() for read-only query
        const product = await Product.findById(req.params.id)
            .populate("categoryId", "name filepath")
            .populate("restaurantId", "name location filepath")
            .lean(); // ✅ Use lean() for faster read-only queries
        
        if (!product) {
            return res.status(404).json({ success: false, message: "Product not found" });
        }

        // Transform product with full image URLs
        const baseUrl = `${req.protocol}://${req.get('host')}`;
        const transformedProduct = transformProductData(product, baseUrl);

        res.status(200).json({ success: true, data: transformedProduct });
    } catch (err) {
        res.status(500).json({ success: false, message: "Server error" });
    }
};

exports.updateProduct = async (req, res) => {
    try {
        const updateData = {
            name: req.body.name,
            price: req.body.price,
            categoryId: req.body.categoryId,
            type: req.body.type,
            restaurantId: req.body.restaurantId,
        };
        if (req.file) {
            updateData.filepath = req.file.filename;
        }
        const updatedProduct = await Product.findByIdAndUpdate(req.params.id, updateData, { new: true });
        if (!updatedProduct) {
            return res.status(404).json({ success: false, message: "Product not found" });
        }
        res.status(200).json({ success: true, data: updatedProduct, message: "Product updated successfully" });
    } catch (err) {
        res.status(500).json({ success: false, message: "Server error" });
    }
};

exports.deleteProduct = async (req, res) => {
    try {
        const deletedProduct = await Product.findByIdAndDelete(req.params.id);
        if (!deletedProduct) {
            return res.status(404).json({ success: false, message: "Product not found" });
        }
        res.status(200).json({ success: true, message: "Product deleted" });
    } catch (err) {
        res.status(500).json({ success: false, message: "Server error" });
    }
};
