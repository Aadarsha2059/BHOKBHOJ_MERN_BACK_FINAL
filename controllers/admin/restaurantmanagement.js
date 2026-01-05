const Restaurant = require("../../models/Restaurant");
const { transformRestaurantData } = require("../../utils/imageUtils");

exports.createRestaurant = async (req, res) => {
    const { name, location, contact, } = req.body;
    
    console.log('Create Restaurant Request Body:', req.body);
    console.log('Create Restaurant File:', req.file);
    
    if (!name || !location || !contact) {
        return res.status(403).json({
            success: false,
            message: "Missing required fields",
        });
    }

    try {
        const filepath = req.file?.filename || null;
        
        console.log('File path to be saved:', filepath);

        const restaurant = new Restaurant({
            name,
            location,
            contact,
            filepath,
        });

        console.log('Restaurant object to save:', restaurant);

        await restaurant.save();
        
        console.log('Restaurant saved successfully:', restaurant);

        return res.status(200).json({
            success: true,
            data: restaurant,
            message: "Restaurant created successfully",
        });
    } catch (err) {
        console.error("Create Restaurant Error:", err);
        return res.status(500).json({
            success: false,
            message: "Server error",
        });
    }
};

exports.getRestaurants = async (req, res) => {
    try {
        const { page = 1, limit = 10, search = "" } = req.query;
        const skip = (page - 1) * limit;

        console.log('Get Restaurants Request:', { page, limit, search });

        let filter = {};
        if (search) {
            filter.$or = [
                { name: { $regex: search, $options: 'i' } },
                { location: { $regex: search, $options: 'i' } }
            ];
        }

        // ✅ PERFORMANCE OPTIMIZED: Use lean() and parallel queries
        const [restaurants, total] = await Promise.all([
            Restaurant.find(filter)
                .select('name location contact filepath createdAt updatedAt')
                .skip(skip)
                .limit(Number(limit))
                .sort({ createdAt: -1 })
                .lean(), // ✅ Use lean() for read-only queries (much faster)
            Restaurant.countDocuments(filter)
        ]);

        // Transform restaurants with full image URLs
        const baseUrl = `${req.protocol}://${req.get('host')}`;
        const transformedRestaurants = restaurants.map(restaurant => {
            const transformed = transformRestaurantData(restaurant, baseUrl);
            console.log('Transformed restaurant:', {
                id: transformed._id,
                name: transformed.name,
                filepath: transformed.filepath,
                image: transformed.image
            });
            return transformed;
        });

        console.log('Found restaurants:', restaurants.length);
        console.log('Sample restaurant data:', restaurants[0]);
        console.log('Sample transformed restaurant:', transformedRestaurants[0]);

        return res.status(200).json({
            success: true,
            message: "Restaurants fetched successfully",
            data: transformedRestaurants,
            pagination: {
                total,
                page: Number(page),
                limit: Number(limit),
                totalPages: Math.ceil(total / limit)
            }
        });
    } catch (err) {
        console.error("Get Restaurants Error:", err);
        return res.status(500).json({
            success: false,
            message: "Server error"
        });
    }
};

exports.updateRestaurant = async (req, res) => {
    try {
        const { id } = req.params;
        const { name, location, contact } = req.body;
        const filepath = req.file?.filename;

        if (!name || !location || !contact) {
            return res.status(400).json({
                success: false,
                message: "Missing required fields",
            });
        }

        const updateData = {
            name: name.trim(),
            location: location.trim(),
            contact: contact.trim(),
        };

        if (filepath) {
            updateData.filepath = filepath;
        }

        // ✅ PERFORMANCE OPTIMIZED: Use lean() for faster response
        const restaurant = await Restaurant.findByIdAndUpdate(
            id,
            updateData,
            { new: true, runValidators: true }
        ).lean();

        if (!restaurant) {
            return res.status(404).json({
                success: false,
                message: "Restaurant not found",
            });
        }

        // Transform restaurant with full image URL
        const baseUrl = `${req.protocol}://${req.get('host')}`;
        const transformedRestaurant = transformRestaurantData(restaurant, baseUrl);

        return res.status(200).json({
            success: true,
            data: transformedRestaurant,
            message: "Restaurant updated successfully",
        });
    } catch (err) {
        console.error("Update Restaurant Error:", err);
        return res.status(500).json({
            success: false,
            message: "Server error",
        });
    }
};

exports.deleteRestaurant = async (req, res) => {
    try {
        const { id } = req.params;

        const restaurant = await Restaurant.findByIdAndDelete(id);

        if (!restaurant) {
            return res.status(404).json({
                success: false,
                message: "Restaurant not found",
            });
        }

        return res.status(200).json({
            success: true,
            message: "Restaurant deleted successfully",
        });
    } catch (err) {
        console.error("Delete Restaurant Error:", err);
        return res.status(500).json({
            success: false,
            message: "Server error",
        });
    }
};

exports.getRestaurantById = async (req, res) => {
    try {
        const { id } = req.params;

        // ✅ PERFORMANCE OPTIMIZED: Use lean() for read-only query
        const restaurant = await Restaurant.findById(id).lean();

        if (!restaurant) {
            return res.status(404).json({
                success: false,
                message: "Restaurant not found",
            });
        }

        // Transform restaurant with full image URL
        const baseUrl = `${req.protocol}://${req.get('host')}`;
        const transformedRestaurant = transformRestaurantData(restaurant, baseUrl);

        return res.status(200).json({
            success: true,
            data: transformedRestaurant,
            message: "Restaurant fetched successfully",
        });
    } catch (err) {
        console.error("Get Restaurant by ID Error:", err);
        return res.status(500).json({
            success: false,
            message: "Server error",
        });
    }
};

exports.getOneRestaurant = async (req, res) => {
    try {
        // ✅ PERFORMANCE OPTIMIZED: Use lean() for read-only query
        const restaurant = await Restaurant.findById(req.params.id).lean();
        if (!restaurant) {
            return res.status(404).json({
                success: false,
                message: "Restaurant not found"
            });
        }

        // Transform restaurant with full image URL
        const baseUrl = `${req.protocol}://${req.get('host')}`;
        const transformedRestaurant = transformRestaurantData(restaurant, baseUrl);

        return res.status(200).json({
            success: true,
            message: "Restaurant fetched successfully",
            data: transformedRestaurant
        });
    } catch (err) {
        console.error("Get Restaurant Error:", err);
        return res.status(500).json({
            success: false,
            message: "Server error"
        });
    }
};
