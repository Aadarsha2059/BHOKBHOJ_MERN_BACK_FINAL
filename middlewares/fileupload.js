const multer = require("multer")
const { v4: uuidv4 } = require("uuid")
const path = require("path")
const fs = require("fs")
const { FOOD_PRODUCT_CONFIG, getUploadConfig, validateFile } = require("../config/fileUploadConfig")

// Path traversal prevention: Sanitize filename
const sanitizeFilename = (filename) => {
    return filename
        .replace(/\.\./g, '')           // Remove .. sequences
        .replace(/[\/\\]/g, '')          // Remove path separators
        .replace(/[^a-zA-Z0-9._-]/g, '_') // Replace unsafe characters
        .substring(0, 255)               // Limit length
}

// ✅ File Upload Security: Strict file type validation using configuration
// Only allows specific image formats (jpg, jpeg, png) with size limits and MIME type checking
const getSafeExtension = (originalname, mimetype, uploadType = 'foodProduct') => {
    // Get configuration for upload type
    const config = getUploadConfig(uploadType)
    const allowedExts = config.allowedExtensions || ['jpg', 'jpeg', 'png']
    
    // Extract extension from filename
    let ext = originalname.split(".").pop()?.toLowerCase() || ''
    
    // Remove path traversal sequences and sanitize
    ext = ext.replace(/\.\./g, '').replace(/[\/\\]/g, '').replace(/[^a-z0-9]/g, '')
    
    // ✅ STRICT MIME TYPE CHECKING: Map only allowed MIME types to extensions
    const mimeToExt = {
        'image/jpeg': 'jpg',
        'image/jpg': 'jpg',
        'image/png': 'png'
    }
    
    // ✅ VALIDATION: Check both extension and MIME type match
    if (allowedExts.includes(ext)) {
        // Verify MIME type matches extension
        if (mimetype && config.allowedMimeTypes.includes(mimetype)) {
            const expectedExt = mimeToExt[mimetype]
            // jpeg and jpg are both valid for image/jpeg
            if (expectedExt === 'jpg' && (ext === 'jpg' || ext === 'jpeg')) {
                return 'jpg'
            }
            if (expectedExt === ext) {
                return ext
            }
        }
        // If MIME type doesn't match, reject
        if (mimetype && !config.allowedMimeTypes.includes(mimetype)) {
            return null // Invalid MIME type
        }
        return ext
    }
    
    // Fallback to MIME type mapping (only if valid)
    if (mimetype && config.allowedMimeTypes.includes(mimetype) && mimeToExt[mimetype]) {
        return mimeToExt[mimetype]
    }
    
    // Reject invalid files
    return null
}

const storage = multer.diskStorage({
    // Path traversal prevention: Use absolute path
    destination: (req, file, cb) => {
        const uploadPath = path.join(__dirname, '../uploads')
        // Ensure uploads directory exists
        if (!fs.existsSync(uploadPath)) {
            fs.mkdirSync(uploadPath, { recursive: true })
        }
        cb(null, uploadPath)
    },
    // Path traversal prevention: Sanitize filename and extension
    filename: (req, file, cb) => {
        const ext = getSafeExtension(file.originalname, file.mimetype)
        const sanitizedFieldname = sanitizeFilename(file.fieldname || 'file')
        const filename = `${sanitizedFieldname}-${uuidv4()}.${ext}`
        cb(null, filename)
    }
})

// ✅ File Upload Security: Strict file type validation with MIME type checking using configuration
const fileFilter = (req, file, cb) => {
    // Determine upload type from route or default to 'foodProduct'
    const uploadType = req.uploadType || 'foodProduct'
    const config = getUploadConfig(uploadType)
    
    // ✅ MIME TYPE CHECKING: Verify MIME type is in allowed list from configuration
    if (config.allowedMimeTypes.includes(file.mimetype)) {
        // ✅ EXTENSION VALIDATION: Verify file extension matches MIME type
        const ext = getSafeExtension(file.originalname, file.mimetype, uploadType)
        if (ext && config.allowedExtensions.includes(ext)) {
            // ✅ FILE SIZE CHECKING: Verify file size is within limit
            if (file.size > config.maxFileSize) {
                const maxSizeMB = config.maxFileSize / (1024 * 1024)
                return cb(new Error(`File size exceeds the maximum limit of ${maxSizeMB}MB`), false)
            }
            cb(null, true)
        } else {
            cb(new Error(`Invalid file extension. Only ${config.allowedExtensions.join(', ')} are allowed.`), false)
        }
    } else {
        cb(new Error(`Invalid file type. Only ${config.allowedMimeTypes.join(', ')} are allowed.`), false)
    }
}

// ✅ File Upload Security: Size limits and strict validation using configuration
const upload = multer({
    storage,
    limits: { 
        fileSize: FOOD_PRODUCT_CONFIG.maxFileSize, // Use configuration for max file size
        files: 1 // Only allow single file upload
    },
    fileFilter
})

// Custom middleware to normalize file paths
const normalizeFilePath = (req, res, next) => {
    if (req.file) {
        // Convert Windows backslashes to forward slashes for consistency
        req.file.path = req.file.path.replace(/\\/g, '/');
        console.log('Normalized file path:', req.file.path);
    }
    next();
};

module.exports = {
    single: (fieldName) => [
        upload.single(fieldName),
        normalizeFilePath
    ],
    array: (fieldName, maxCount) => [
        upload.array(fieldName, maxCount),
        normalizeFilePath
    ],
    fields: (fieldsArray) => [
        upload.fields(fieldsArray),
        normalizeFilePath
    ]
}