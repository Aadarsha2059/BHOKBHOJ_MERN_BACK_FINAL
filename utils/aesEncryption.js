const crypto = require('crypto');

const algorithm = 'aes-256-gcm';
const IV_LENGTH = 16;
const AUTH_TAG_LENGTH = 16;

const getSecretKey = () => {
    const key = process.env.ENCRYPTION_KEY || process.env.SECRET || 'default-encryption-key-change-in-production';
    return crypto.scryptSync(key, 'salt', 32);
};

const encrypt = (text) => {
    if (!text || text === null || text === undefined) {
        return null;
    }

    const textString = String(text);
    const secretKey = getSecretKey();
    const iv = crypto.randomBytes(IV_LENGTH);
    
    const cipher = crypto.createCipheriv(algorithm, secretKey, iv);
    
    let encrypted = cipher.update(textString, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    
    const authTag = cipher.getAuthTag();
    
    const encryptedData = {
        encrypted: encrypted,
        iv: iv.toString('hex'),
        authTag: authTag.toString('hex')
    };
    
    return JSON.stringify(encryptedData);
};

const decrypt = (encryptedData) => {
    if (!encryptedData || encryptedData === null || encryptedData === undefined) {
        return null;
    }

    try {
        let data;
        if (typeof encryptedData === 'string') {
            // Check if it's already plain text (not JSON format)
            // Encrypted data should be JSON with structure: {"encrypted":"...","iv":"...","authTag":"..."}
            if (!encryptedData.trim().startsWith('{')) {
                // It's plain text, not encrypted - return as is
                return encryptedData;
            }
            data = JSON.parse(encryptedData);
        } else {
            data = encryptedData;
        }

        // Handle both 'authTag' (camelCase) and 'authtag' (lowercase)
        const authTag = data.authTag || data.authtag;
        
        if (!data.encrypted || !data.iv || !authTag) {
            // Not in encrypted format - return as is
            return encryptedData;
        }

        const secretKey = getSecretKey();
        const decipher = crypto.createDecipheriv(
            algorithm,
            secretKey,
            Buffer.from(data.iv, 'hex')
        );

        decipher.setAuthTag(Buffer.from(authTag, 'hex'));

        let decrypted = decipher.update(data.encrypted, 'hex', 'utf8');
        decrypted += decipher.final('utf8');

        return decrypted;
    } catch (error) {
        // Silently return original data if decryption fails (likely plain text)
        // Only log if encryption is actually enabled to avoid noise
        if (process.env.ENABLE_FIELD_ENCRYPTION === 'true') {
            // Only log in development to help debug encryption issues
            if (process.env.NODE_ENV === 'development') {
                console.warn('Decryption warning: Data appears to be plain text, not encrypted:', error.message);
            }
        }
        return encryptedData;
    }
};

module.exports = {
    encrypt,
    decrypt,
    algorithm
};

