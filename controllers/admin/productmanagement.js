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
        const { page = 1, limit, search = "" } = req.query;
        
        console.log('🔍 Get Products Request:', {
            page,
            limit,
            search,
            userId: req.user?._id,
            timestamp: new Date().toISOString()
        });

        let filter = {};
        if (search) {
            filter.$or = [
                { name: { $regex: search, $options: 'i' } },
                { type: { $regex: search, $options: 'i' } }
            ];
        }

        // ✅ PERFORMANCE OPTIMIZED: Use lean() and parallel queries
        // For admin view, if no limit is specified, return all products (or use a high limit)
        const queryLimit = limit ? Number(limit) : 1000; // Default to 1000 for admin view
        const skip = limit ? (Number(page) - 1) * queryLimit : 0;

        console.log('📦 Fetching products with filter:', filter);
        
        // ✅ PERFORMANCE OPTIMIZED: Use lean() and parallel queries
        // Removed sellerId populate - not needed for admin list view (improves performance)
        const [products, total] = await Promise.all([
            Product.find(filter)
                .populate("categoryId", "name filepath")
                .populate("restaurantId", "name location filepath")
                .select('name price categoryId restaurantId type filepath description isAvailable createdAt updatedAt')
                .skip(skip)
                .limit(queryLimit)
                .sort({ createdAt: -1 })
                .lean(), // ✅ Use lean() for read-only queries (much faster)
            Product.countDocuments(filter)
        ]);

        console.log('✅ Products found:', products.length, 'out of', total);

        // Transform products with full image URLs
        const baseUrl = `${req.protocol}://${req.get('host')}`;
        const transformedProducts = products.map(product => transformProductData(product, baseUrl));

        console.log('✅ Sending products response');

        return res.status(200).json({
            success: true,
            message: "Products fetched successfully",
            data: transformedProducts,
            pagination: {
                total,
                page: Number(page),
                limit: queryLimit,
                totalPages: limit ? Math.ceil(total / queryLimit) : 1
            }
        });
    } catch (err) {
        console.error("❌ Get Products Error:", err);
        console.error("Error stack:", err.stack);
        return res.status(500).json({
            success: false,
            message: err.message || "Server error",
            error: process.env.NODE_ENV === 'development' ? err.message : undefined
        });
    }
};

exports.getOneProduct = async (req, res) => {
    try {
        const productId = req.params.id;
        
        console.log('🔍 Get One Product Request:', {
            productId: productId,
            userId: req.user?._id,
            timestamp: new Date().toISOString()
        });
        
        // Validate product ID format
        if (!productId) {
            console.log('❌ Missing product ID');
            return res.status(400).json({ success: false, message: "Product ID is required" });
        }
        
        if (!productId.match(/^[0-9a-fA-F]{24}$/)) {
            console.log('❌ Invalid product ID format:', productId);
            return res.status(400).json({ success: false, message: "Invalid product ID format" });
        }
        
        // ✅ PERFORMANCE OPTIMIZED: Use lean() for read-only query
        console.log('📦 Fetching product from database...');
        const product = await Product.findById(productId)
            .populate("categoryId", "name filepath")
            .populate("restaurantId", "name location filepath")
            .lean(); // ✅ Use lean() for faster read-only queries
        
        if (!product) {
            console.log('❌ Product not found:', productId);
            return res.status(404).json({ success: false, message: "Product not found" });
        }

        console.log('✅ Product found:', product.name);
        
        // Transform product with full image URLs
        const baseUrl = `${req.protocol}://${req.get('host')}`;
        const transformedProduct = transformProductData(product, baseUrl);

        console.log('✅ Sending product response');
        res.status(200).json({ success: true, data: transformedProduct });
    } catch (err) {
        console.error("❌ Get One Product Error:", err);
        console.error("Error stack:", err.stack);
        res.status(500).json({ 
            success: false, 
            message: err.message || "Server error",
            error: process.env.NODE_ENV === 'development' ? err.message : undefined
        });
    }
};

exports.updateProduct = async (req, res) => {
    try {
        const productId = req.params.id;
        
        // Validate product exists first
        const existingProduct = await Product.findById(productId);
        if (!existingProduct) {
            return res.status(404).json({ success: false, message: "Product not found" });
        }
        
        // Build update data with all fields
        const updateData = {
            name: req.body.name?.trim(),
            price: req.body.price,
            categoryId: req.body.categoryId,
            type: req.body.type?.trim()?.toLowerCase(),
            restaurantId: req.body.restaurantId,
        };
        
        // Add optional fields if provided
        if (req.body.description !== undefined) {
            updateData.description = req.body.description?.trim() || '';
        }
        if (req.body.isAvailable !== undefined) {
            updateData.isAvailable = req.body.isAvailable === true || req.body.isAvailable === 'true';
        }
        
        // Handle image upload
        if (req.file) {
            updateData.filepath = req.file.filename;
        }
        
        // Validate required fields
        if (!updateData.name || !updateData.price || !updateData.categoryId || !updateData.type || !updateData.restaurantId) {
            return res.status(400).json({ 
                success: false, 
                message: "Missing required fields: name, price, categoryId, type, restaurantId" 
            });
        }
        
        // Validate price
        const numericPrice = Number(updateData.price);
        if (isNaN(numericPrice) || numericPrice <= 0) {
            return res.status(400).json({ 
                success: false, 
                message: "Price must be a positive number" 
            });
        }
        updateData.price = numericPrice;
        
        // Validate type
        if (!['indian', 'nepali'].includes(updateData.type)) {
            return res.status(400).json({ 
                success: false, 
                message: "Type must be 'Indian' or 'Nepali'" 
            });
        }
        
        // ✅ PERFORMANCE OPTIMIZED: Use lean() and minimal populate for faster response
        const updatedProduct = await Product.findByIdAndUpdate(
            productId, 
            updateData, 
            { new: true, runValidators: true }
        )
            .populate("categoryId", "name filepath")
            .populate("restaurantId", "name location filepath")
            .lean();
            
        if (!updatedProduct) {
            return res.status(404).json({ success: false, message: "Product not found" });
        }
        
        // Transform product with full image URLs
        const baseUrl = `${req.protocol}://${req.get('host')}`;
        const transformedProduct = transformProductData(updatedProduct, baseUrl);
        
        res.status(200).json({ success: true, data: transformedProduct, message: "Product updated successfully" });
    } catch (err) {
        console.error("Update Product Error:", err);
        console.error("Error stack:", err.stack);
        res.status(500).json({ 
            success: false, 
            message: err.message || "Server error",
            error: process.env.NODE_ENV === 'development' ? err.message : undefined
        });
    }
};

exports.deleteProduct = async (req, res) => {
    try {
        const productId = req.params.id;
        
        // Validate product exists
        const product = await Product.findById(productId);
        if (!product) {
            return res.status(404).json({ success: false, message: "Product not found" });
        }
        
        // ✅ PERFORMANCE: Use deleteOne for faster deletion
        await Product.deleteOne({ _id: productId });
        
        res.status(200).json({ success: true, message: "Product deleted successfully" });
    } catch (err) {
        console.error("Delete Product Error:", err);
        console.error("Error stack:", err.stack);
        res.status(500).json({ 
            success: false, 
            message: err.message || "Server error",
            error: process.env.NODE_ENV === 'development' ? err.message : undefined
        });
    }
};
