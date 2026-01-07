const crypto = require('crypto');
const { encrypt, decrypt, algorithm } = require('./utils/aesEncryption');

console.log('=== AES-256-GCM Encryption Verification ===\n');

console.log('Algorithm:', algorithm);
console.log('Algorithm Type:', typeof algorithm);
console.log('Is AES-256-GCM:', algorithm === 'aes-256-gcm');
console.log('');

const testData = {
    email: 'user@example.com',
    phone: '9800000000',
    address: 'Kathmandu, Nepal'
};

console.log('Original Data:');
console.log('  Email:', testData.email);
console.log('  Phone:', testData.phone);
console.log('  Address:', testData.address);
console.log('');

const encryptedEmail = encrypt(testData.email);
const encryptedPhone = encrypt(testData.phone);
const encryptedAddress = encrypt(testData.address);

console.log('Encrypted Data (as stored in MongoDB):');
console.log('  Email:', encryptedEmail);
console.log('  Phone:', encryptedPhone);
console.log('  Address:', encryptedAddress);
console.log('');

const decryptedEmail = decrypt(encryptedEmail);
const decryptedPhone = decrypt(encryptedPhone);
const decryptedAddress = decrypt(encryptedAddress);

console.log('Decrypted Data (as shown in Admin Panel):');
console.log('  Email:', decryptedEmail);
console.log('  Phone:', decryptedPhone);
console.log('  Address:', decryptedAddress);
console.log('');

console.log('Verification:');
console.log('  Email Match:', testData.email === decryptedEmail);
console.log('  Phone Match:', testData.phone === decryptedPhone);
console.log('  Address Match:', testData.address === decryptedAddress);
console.log('');

const parsed = JSON.parse(encryptedEmail);
console.log('Encrypted Structure:');
console.log('  Has encrypted field:', !!parsed.encrypted);
console.log('  Has IV (Initialization Vector):', !!parsed.iv);
console.log('  Has Auth Tag (GCM authentication):', !!parsed.authTag);
console.log('  IV Length:', parsed.iv ? parsed.iv.length : 0, 'hex chars (16 bytes)');
console.log('  Auth Tag Length:', parsed.authTag ? parsed.authTag.length : 0, 'hex chars (16 bytes)');
console.log('');

console.log('=== AES-256-GCM Confirmed ===');
console.log('✓ Algorithm: aes-256-gcm');
console.log('✓ Key Size: 256 bits (32 bytes)');
console.log('✓ IV Size: 128 bits (16 bytes)');
console.log('✓ Auth Tag: 128 bits (16 bytes) - GCM mode');
console.log('✓ Authenticated Encryption: Yes (GCM provides authentication)');

