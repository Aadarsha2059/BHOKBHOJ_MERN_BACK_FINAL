/**
 * HTTPS Server Configuration for BHOKBHOJ
 * Implements SSL/TLS encryption for secure communication
 */

require("dotenv").config();
const https = require('https');
const http = require('http');
const fs = require('fs');
const path = require('path');
const app = require("./index");

const PORT = process.env.PORT || 5051;
const HTTP_REDIRECT_PORT = process.env.HTTP_REDIRECT_PORT || 5050;
const HTTPS_PORT = process.env.HTTPS_PORT || 5443;
let MONGODB_URI = process.env.MONGODB_URI || "mongodb://localhost:27017/bhokbhoj";

// Fallback for local dev if Docker hostname 'mongo' is not found
if (MONGODB_URI.includes('mongo') && !process.env.USE_DOCKER_MONGO) {
  MONGODB_URI = "mongodb://localhost:27017/bhokbhoj";
}

// Set default environment variables if not provided
process.env.MONGODB_URI = MONGODB_URI;
process.env.SECRET = process.env.SECRET || "your-secret-key-here";

// SSL Certificate paths
const sslKeyPath = path.join(__dirname, 'ssl', 'key.pem');
const sslCertPath = path.join(__dirname, 'ssl', 'cert.pem');

// Check if SSL certificates exist
const sslExists = fs.existsSync(sslKeyPath) && fs.existsSync(sslCertPath);

if (sslExists) {
    // HTTPS Server Configuration with TLS Next (TLS 1.3 preferred, TLS 1.2 fallback)
    const httpsOptions = {
        key: fs.readFileSync(sslKeyPath),
        cert: fs.readFileSync(sslCertPath),
        // TLS Next Configuration: Prefer TLS 1.3, allow TLS 1.2 as fallback
        minVersion: 'TLSv1.2', // Minimum TLS 1.2 (secure baseline)
        maxVersion: 'TLSv1.3', // Maximum TLS 1.3 (latest and most secure)
        // TLS 1.3 cipher suites are automatically selected by Node.js
        // For TLS 1.2 fallback, specify strong cipher suites only
        ciphers: [
            // TLS 1.2 cipher suites (strong only - for fallback compatibility)
            'ECDHE-RSA-AES256-GCM-SHA384',
            'ECDHE-RSA-AES128-GCM-SHA256',
            'ECDHE-RSA-AES256-SHA384',
            'ECDHE-RSA-AES128-SHA256',
            'DHE-RSA-AES256-GCM-SHA384',
            'DHE-RSA-AES128-GCM-SHA256'
        ].join(':'),
        // Additional security options
        honorCipherOrder: true, // Use server cipher order preference
        // Enable session resumption for better performance
        sessionTimeout: 300,
        // Disable insecure older protocols (SSLv2, SSLv3, TLS 1.0, TLS 1.1)
        // Allow TLS 1.2 and TLS 1.3 only
        secureOptions: require('crypto').constants.SSL_OP_NO_SSLv2 |
                       require('crypto').constants.SSL_OP_NO_SSLv3 |
                       require('crypto').constants.SSL_OP_NO_TLSv1 |
                       require('crypto').constants.SSL_OP_NO_TLSv1_1 |
                       // Enable Perfect Forward Secrecy
                       require('crypto').constants.SSL_OP_CIPHER_SERVER_PREFERENCE |
                       // Prefer ECDHE for key exchange
                       require('crypto').constants.SSL_OP_PRIORITIZE_CHACHA
    };

    // Create HTTPS server
    const httpsServer = https.createServer(httpsOptions, app);

    httpsServer.listen(HTTPS_PORT, '0.0.0.0', () => {
        console.log('\n🔐 ═══════════════════════════════════════════════════════');
        console.log('   BHOKBHOJ SECURE SERVER (HTTPS) STARTED');
        console.log('   ═══════════════════════════════════════════════════════');
        console.log(`   🚀 HTTPS Server: https://localhost:${HTTPS_PORT}`);
        console.log(`   📊 MongoDB URI: ${MONGODB_URI}`);
        console.log(`   🔒 SSL/TLS: ENABLED`);
        console.log(`   🛡️  Encryption: TLS Next (1.3 preferred, 1.2 fallback)`);
        console.log(`   🔐 Cipher Suites: TLS 1.3 (AES-256-GCM, ChaCha20-Poly1305) + TLS 1.2 (ECDHE-AES-GCM)`);
        console.log(`   🔒 Minimum TLS: 1.2 | Maximum TLS: 1.3`);
        console.log('   ═══════════════════════════════════════════════════════');
        console.log('\n   📝 API Endpoints (HTTPS):');
        console.log(`   • Registration: https://localhost:${HTTPS_PORT}/api/auth/register`);
        console.log(`   • Login: https://localhost:${HTTPS_PORT}/api/auth/login`);
        console.log(`   • Verify OTP: https://localhost:${HTTPS_PORT}/api/auth/verify-otp`);
        console.log('   ═══════════════════════════════════════════════════════\n');
    }).on('error', (err) => {
        console.error('❌ HTTPS Server failed to start:', err.message);
        if (err.code === 'EADDRINUSE') {
            console.error(`Port ${HTTPS_PORT} is already in use.`);
        }
    });

    // Optional: Create HTTP server that redirects to HTTPS
    const httpServer = http.createServer((req, res) => {
        res.writeHead(301, { 
            "Location": `https://${req.headers.host.split(':')[0]}:${HTTPS_PORT}${req.url}` 
        });
        res.end();
    });

    httpServer.listen(HTTP_REDIRECT_PORT, '0.0.0.0', () => {
        console.log(`   ↪️  HTTP Redirect: http://localhost:${HTTP_REDIRECT_PORT} → https://localhost:${HTTPS_PORT}`);
    }).on('error', (err) => {
        if (err.code === 'EADDRINUSE') {
            console.log(`   ⚠️  HTTP redirect port ${HTTP_REDIRECT_PORT} already in use (skipping redirect server)`);
        }
    });

} else {
    // Fallback to HTTP if SSL certificates don't exist
    console.log('\n⚠️  ═══════════════════════════════════════════════════════');
    console.log('   WARNING: SSL certificates not found!');
    console.log('   ═══════════════════════════════════════════════════════');
    console.log('   Running in HTTP mode (NOT SECURE)');
    console.log('   To enable HTTPS, generate SSL certificates:');
    console.log('   npm run generate-ssl');
    console.log('   ═══════════════════════════════════════════════════════\n');

    app.listen(PORT, '0.0.0.0', () => {
        console.log(`🚀 HTTP Server running on port ${PORT}`);
        console.log(`📊 MongoDB URI: ${MONGODB_URI}`);
        console.log(`📝 Registration: http://localhost:${PORT}/api/auth/register`);
        console.log(`🔐 Login: http://localhost:${PORT}/api/auth/login`);
    }).on('error', (err) => {
        console.error('❌ Server failed to start:', err.message);
        if (err.code === 'EADDRINUSE') {
            console.error(`Port ${PORT} is already in use.`);
        }
    });
}
