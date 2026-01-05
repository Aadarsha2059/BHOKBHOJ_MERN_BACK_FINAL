/**
 * Utility functions for image URL construction
 */

/**
 * Constructs a full image URL from a filename
 * @param {string} filename - The image filename
 * @param {string} baseUrl - The base URL (e.g., http://localhost:5000)
 * @returns {string|null} - Full image URL or null if no filename
 */
const constructImageUrl = (filename, baseUrl) => {
    if (!filename) return null;
    
    // Remove 'uploads/' prefix if it exists to avoid double prefixing
    const cleanFilename = filename.replace(/^uploads\//, '');
    return `${baseUrl}/uploads/${cleanFilename}`;
};

/**
 * Transforms product data to include full image URLs and populated data
 * @param {Object} product - The product object from database
 * @param {string} baseUrl - The base URL
 * @returns {Object} - Transformed product with full URLs
 */
const transformProductData = (product, baseUrl) => {
    const prod = product.toObject ? product.toObject() : product;
    
    return {
        _id: prod._id,
        name: prod.name,
        type: prod.type,
        price: prod.price,
        description: prod.description,
        image: constructImageUrl(prod.filepath, baseUrl),
        isAvailable: prod.isAvailable,
        categoryId: prod.categoryId?._id?.toString() || prod.categoryId,
        categoryName: prod.categoryId?.name || null,
        categoryImage: constructImageUrl(prod.categoryId?.filepath, baseUrl),
        restaurantId: prod.restaurantId?._id?.toString() || prod.restaurantId,
        restaurantName: prod.restaurantId?.name || null,
        restaurantImage: constructImageUrl(prod.restaurantId?.filepath, baseUrl),
        restaurantLocation: prod.restaurantId?.location || null,
        restaurantContact: prod.restaurantId?.contact || null,
        sellerId: prod.sellerId?._id?.toString() || prod.sellerId,
        sellerName: prod.sellerId ? `${prod.sellerId.firstName || ''} ${prod.sellerId.lastName || ''}`.trim() : null,
        createdAt: prod.createdAt,
        updatedAt: prod.updatedAt
    };
};

/**
 * Transforms category data to include full image URL
 * @param {Object} category - The category object from database
 * @param {string} baseUrl - The base URL
 * @returns {Object} - Transformed category with full image URL
 */
const transformCategoryData = (category, baseUrl) => {
    const cat = category.toObject ? category.toObject() : category;
    
    // Construct image URL from filepath
    const imageUrl = constructImageUrl(cat.filepath, baseUrl);
    
    return {
        _id: cat._id,
        name: cat.name,
        filepath: cat.filepath || null,
        image: imageUrl, // Always set image field (even if null)
        // Include all other fields
        ...cat,
        image: imageUrl // Override image field after spread to ensure it's always set correctly
    };
};

/**
 * Transforms restaurant data to include full image URL and all fields
 * @param {Object} restaurant - The restaurant object from database
 * @param {string} baseUrl - The base URL
 * @returns {Object} - Transformed restaurant with full image URL and all fields
 */
const transformRestaurantData = (restaurant, baseUrl) => {
    const rest = restaurant.toObject ? restaurant.toObject() : restaurant;
    
    // Construct image URL from filepath
    const imageUrl = constructImageUrl(rest.filepath, baseUrl);
    
    return {
        _id: rest._id,
        name: rest.name || 'Unknown Restaurant',
        location: rest.location || 'Location not specified',
        contact: rest.contact || 'Contact not available',
        description: rest.description || 'No description available',
        rating: rest.rating || 4.5,
        status: rest.status || 'Open',
        filepath: rest.filepath || null,
        image: imageUrl, // Always set image field (even if null)
        // Include all other fields, but ensure image is not overwritten
        ...rest,
        image: imageUrl // Override image field after spread to ensure it's always set correctly
    };
};

module.exports = {
    constructImageUrl,
    transformProductData,
    transformCategoryData,
    transformRestaurantData
}; 