require("dotenv").config()

// Wrap app require in try-catch to catch initialization errors
let app;
try {
    app = require("./index")
} catch (error) {
    console.error('❌ Failed to load app:', error.message);
    console.error('Stack trace:', error.stack);
    process.exit(1);
}

const PORT = process.env.PORT || 5050 // Port 5050 for frontend compatibility
let MONGODB_URI = process.env.MONGODB_URI || "mongodb://localhost:27017/bhokbhoj";
// Fallback for local dev if Docker hostname 'mongo' is not found
if (MONGODB_URI.includes('mongo') && !process.env.USE_DOCKER_MONGO) {
  MONGODB_URI = "mongodb://localhost:27017/bhokbhoj";
}

// Set default environment variables if not provided
process.env.MONGODB_URI = MONGODB_URI
process.env.SECRET = process.env.SECRET || "your-secret-key-here"

// Add unhandled error handlers
process.on('uncaughtException', (error) => {
    console.error('❌ Uncaught Exception:', error.message);
    console.error('Stack:', error.stack);
    process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
    console.error('❌ Unhandled Rejection at:', promise);
    console.error('Reason:', reason);
    process.exit(1);
});

app.listen(
    PORT,
    '0.0.0.0',
    () =>{
        console.log(`🚀 Server running on port ${PORT}`)
        console.log(`📊 MongoDB URI: ${MONGODB_URI}`)
        
        console.log(`📝 Registration: http://localhost:${PORT}/api/auth/register`)
        console.log(`🔐 Login: http://localhost:${PORT}/api/auth/login`)
    }
).on('error', (err) => {
    console.error('❌ Server failed to start:', err.message);
    if (err.code === 'EADDRINUSE') {
        console.error(`Port ${PORT} is already in use. Please stop other servers or use a different port.`);
    }
    process.exit(1);
});