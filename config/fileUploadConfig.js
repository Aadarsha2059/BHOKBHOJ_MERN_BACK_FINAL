/**
 * File Upload Configuration
 * Centralized configuration for file upload validation
 * Defines allowed MIME types and file size limits for food product images
 */

// Default upload configurations
const DEFAULT_CONFIG = {
    images: {
        allowedMimeTypes: ['image/jpeg', 'image/png'],
        maxFileSize: 5 * 1024 * 1024, // 5MB
    }
};

// ✅ Food Product specific configuration
const FOOD_PRODUCT_CONFIG = {
    allowedMimeTypes: ['image/jpeg', 'image/jpg', 'image/png'],
    maxFileSize: 5 * 1024 * 1024, // 5MB
    allowedExtensions: ['jpg', 'jpeg', 'png'],
    category: 'images'
};

/**
 * Get configuration for food product uploads
 * @param {string} type - Upload type (default: 'foodProduct')
 * @returns {Object} Configuration object with allowedMimeTypes, maxFileSize, etc.
 */
const getUploadConfig = (type = 'foodProduct') => {
    if (type === 'foodProduct') {
        return FOOD_PRODUCT_CONFIG;
    }
    return DEFAULT_CONFIG.images; // Default to images config
};

/**
 * Validate file against food product configuration
 * @param {File} file - File object to validate
 * @param {string} type - Upload type (default: 'foodProduct')
 * @returns {Object} { valid: boolean, error: string|null }
 */
const validateFile = (file, type = 'foodProduct') => {
    const config = getUploadConfig(type);
    
    // Check file size
    if (file.size > config.maxFileSize) {
        const maxSizeMB = config.maxFileSize / (1024 * 1024);
        return {
            valid: false,
            error: `File size exceeds the maximum limit of ${maxSizeMB}MB`
        };
    }
    
    // Check MIME type
    if (!config.allowedMimeTypes.includes(file.type)) {
        return {
            valid: false,
            error: `Invalid file type. Only ${config.allowedMimeTypes.join(', ')} are allowed`
        };
    }
    
    // Check file extension if provided
    if (config.allowedExtensions) {
        const fileExtension = file.name.split('.').pop().toLowerCase();
        if (!config.allowedExtensions.includes(fileExtension)) {
            return {
                valid: false,
                error: `Invalid file extension. Only ${config.allowedExtensions.join(', ')} are allowed`
            };
        }
    }
    
    return { valid: true, error: null };
};

module.exports = {
    DEFAULT_CONFIG,
    FOOD_PRODUCT_CONFIG,
    getUploadConfig,
    validateFile
};
