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
            console.warn('⚠️  Decrypt: Data missing required fields (encrypted, iv, authTag)');
            return encryptedData;
        }

        const secretKey = getSecretKey();
        
        // ✅ VERIFY: Check if encryption key is available
        const encryptionKey = process.env.ENCRYPTION_KEY || process.env.SECRET;
        if (!encryptionKey) {
            console.error('❌ Decrypt: ENCRYPTION_KEY or SECRET not found in environment variables');
            console.error('❌ Cannot decrypt email - encryption key missing!');
            throw new Error('Encryption key not found in environment variables');
        }

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
        // ✅ ENHANCED ERROR LOGGING: Log decryption errors for debugging
        console.error('\n❌ ❌ ❌ EMAIL DECRYPTION ERROR ❌ ❌ ❌');
        console.error('═══════════════════════════════════════════════════════════════');
        console.error('Error Type:', error.name);
        console.error('Error Message:', error.message);
        console.error('Error Code:', error.code);
        console.error('Encrypted Data Preview:', typeof encryptedData === 'string' ? encryptedData.substring(0, 100) + '...' : encryptedData);
        console.error('ENCRYPTION_KEY set:', !!process.env.ENCRYPTION_KEY);
        console.error('SECRET set:', !!process.env.SECRET);
        console.error('ENABLE_FIELD_ENCRYPTION:', process.env.ENABLE_FIELD_ENCRYPTION || 'not set');
        console.error('═══════════════════════════════════════════════════════════════\n');
        
        // Re-throw the error so caller can handle it
        throw error;
    }
};

module.exports = {
    encrypt,
    decrypt,
    algorithm
};

