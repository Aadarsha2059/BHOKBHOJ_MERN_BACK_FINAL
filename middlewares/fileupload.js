const multer = require("multer")
const { v4: uuidv4 } = require("uuid")
const path = require("path")
const fs = require("fs")

// Path traversal prevention: Sanitize filename
const sanitizeFilename = (filename) => {
    return filename
        .replace(/\.\./g, '')           // Remove .. sequences
        .replace(/[\/\\]/g, '')          // Remove path separators
        .replace(/[^a-zA-Z0-9._-]/g, '_') // Replace unsafe characters
        .substring(0, 255)               // Limit length
}

// Path traversal prevention: Sanitize and validate extension
const getSafeExtension = (originalname, mimetype) => {
    // Allowed image extensions
    const allowedExts = ['jpg', 'jpeg', 'png', 'gif', 'webp']
    
    // Extract extension from filename
    let ext = originalname.split(".").pop()?.toLowerCase() || ''
    
    // Remove path traversal sequences and sanitize
    ext = ext.replace(/\.\./g, '').replace(/[\/\\]/g, '').replace(/[^a-z0-9]/g, '')
    
    // Map MIME types to extensions for additional validation
    const mimeToExt = {
        'image/jpeg': 'jpg',
        'image/png': 'png',
        'image/gif': 'gif',
        'image/webp': 'webp'
    }
    
    // Validate extension against allowed list
    if (allowedExts.includes(ext)) {
        return ext
    }
    
    // Fallback to MIME type mapping
    if (mimetype && mimeToExt[mimetype]) {
        return mimeToExt[mimetype]
    }
    
    // Default to jpg if extension is invalid
    return 'jpg'
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

const fileFilter = (req, file, cb) => {
    if (file.mimetype.startsWith("image")) cb(null, true)
    else cb(new Error("Only image allowed"), false)
}

const upload = multer({
    storage,
    limits: { fileSize: 5 * 1024 * 1024 },
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