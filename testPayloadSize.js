/**
 * Test Script for Request Payload Size Limit (10kb)
 * This script tests the express.json({ limit: '10kb' }) implementation
 */

const http = require('http');

const API_BASE_URL = 'http://localhost:5050';

// Helper function to make POST requests
function makeRequest(path, payload, expectedStatus = 200) {
    return new Promise((resolve, reject) => {
        const payloadString = JSON.stringify(payload);
        const payloadSize = Buffer.byteLength(payloadString, 'utf8');
        const payloadSizeKB = (payloadSize / 1024).toFixed(2);

        const options = {
            hostname: 'localhost',
            port: 5050,
            path: path,
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Content-Length': payloadSize
            }
        };

        console.log(`\n📦 Testing payload: ${payloadSize} bytes (${payloadSizeKB}kb)`);

        const req = http.request(options, (res) => {
            let data = '';

            res.on('data', (chunk) => {
                data += chunk;
            });

            res.on('end', () => {
                const result = {
                    status: res.statusCode,
                    statusText: res.statusMessage,
                    headers: res.headers,
                    body: data
                };

                try {
                    result.body = JSON.parse(data);
                } catch (e) {
                    // Body is not JSON, keep as string
                }

                resolve(result);
            });
        });

        req.on('error', (error) => {
            reject(error);
        });

        req.write(payloadString);
        req.end();
    });
}

// Test functions
async function testSmallPayload() {
    console.log('\n═══════════════════════════════════════════════════');
    console.log('TEST 1: Small Payload (~200 bytes)');
    console.log('Expected: ✅ Should be accepted (200 OK)');
    console.log('═══════════════════════════════════════════════════');

    const payload = {
        username: 'testuser',
        email: 'test@example.com',
        password: 'password123',
        data: 'Small test payload'
    };

    try {
        const result = await makeRequest('/api/test/payload-size', payload, 200);
        
        if (result.status === 200) {
            console.log('✅ SUCCESS: Small payload was accepted');
            console.log('   Status:', result.status);
            console.log('   Payload Info:', result.body.payloadInfo);
        } else {
            console.log('❌ UNEXPECTED: Small payload was rejected');
            console.log('   Status:', result.status);
            console.log('   Body:', result.body);
        }
    } catch (error) {
        console.log('❌ ERROR:', error.message);
    }
}

async function testMediumPayload() {
    console.log('\n═══════════════════════════════════════════════════');
    console.log('TEST 2: Medium Payload (~5kb)');
    console.log('Expected: ✅ Should be accepted (200 OK)');
    console.log('═══════════════════════════════════════════════════');

    const payload = {
        username: 'testuser',
        email: 'test@example.com',
        data: 'x'.repeat(5000) // ~5kb
    };

    try {
        const result = await makeRequest('/api/test/payload-size', payload, 200);
        
        if (result.status === 200) {
            console.log('✅ SUCCESS: Medium payload was accepted');
            console.log('   Status:', result.status);
            console.log('   Payload Info:', result.body.payloadInfo);
        } else {
            console.log('❌ UNEXPECTED: Medium payload was rejected');
            console.log('   Status:', result.status);
            console.log('   Body:', result.body);
        }
    } catch (error) {
        console.log('❌ ERROR:', error.message);
    }
}

async function testLargePayload() {
    console.log('\n═══════════════════════════════════════════════════');
    console.log('TEST 3: Large Payload (~15kb)');
    console.log('Expected: ❌ Should be rejected (413 Payload Too Large)');
    console.log('═══════════════════════════════════════════════════');

    const payload = {
        username: 'testuser',
        email: 'test@example.com',
        data: 'x'.repeat(15000) // ~15kb (exceeds 10kb limit)
    };

    try {
        const result = await makeRequest('/api/test/payload-size', payload, 413);
        
        if (result.status === 413 || result.status === 400) {
            console.log('✅ SUCCESS: Large payload was correctly rejected');
            console.log('   Status:', result.status, result.statusText);
            console.log('   Message:', typeof result.body === 'string' ? result.body : result.body.message || 'Payload too large');
        } else {
            console.log('❌ FAILURE: Large payload was accepted but should have been rejected');
            console.log('   Status:', result.status);
            console.log('   Body:', result.body);
        }
    } catch (error) {
        if (error.code === 'ECONNRESET' || error.message.includes('413')) {
            console.log('✅ SUCCESS: Large payload was correctly rejected (connection reset)');
            console.log('   Error:', error.message);
        } else {
            console.log('❌ UNEXPECTED ERROR:', error.message);
        }
    }
}

async function testExactLimit() {
    console.log('\n═══════════════════════════════════════════════════');
    console.log('TEST 4: Exact Limit Payload (~10kb)');
    console.log('Expected: ⚠️ Should be accepted (200 OK) or rejected (413) depending on exact size');
    console.log('═══════════════════════════════════════════════════');

    const payload = {
        username: 'testuser',
        email: 'test@example.com',
        data: 'x'.repeat(10000) // ~10kb (at the limit)
    };

    try {
        const result = await makeRequest('/api/test/payload-size', payload);
        
        if (result.status === 200) {
            console.log('✅ SUCCESS: Payload at limit was accepted');
            console.log('   Status:', result.status);
            console.log('   Payload Info:', result.body.payloadInfo);
        } else if (result.status === 413 || result.status === 400) {
            console.log('⚠️ NOTE: Payload at limit was rejected (may be slightly over due to JSON overhead)');
            console.log('   Status:', result.status);
            console.log('   This is acceptable - JSON stringification adds overhead');
        } else {
            console.log('❌ UNEXPECTED: Unexpected status code');
            console.log('   Status:', result.status);
            console.log('   Body:', result.body);
        }
    } catch (error) {
        console.log('❌ ERROR:', error.message);
    }
}

// Run all tests
async function runAllTests() {
    console.log('═══════════════════════════════════════════════════════════════');
    console.log('🧪 REQUEST PAYLOAD SIZE LIMIT TEST');
    console.log('═══════════════════════════════════════════════════════════════');
    console.log('Limit: 10kb (10,240 bytes)');
    console.log('Implementation: app.use(express.json({ limit: \'10kb\' }))');
    console.log('═══════════════════════════════════════════════════════════════');

    await testSmallPayload();
    await testMediumPayload();
    await testLargePayload();
    await testExactLimit();

    console.log('\n═══════════════════════════════════════════════════════════════');
    console.log('✅ All tests completed!');
    console.log('═══════════════════════════════════════════════════════════════\n');
}

// Check if server is running
http.get(`${API_BASE_URL}/api/health`, (res) => {
    if (res.statusCode === 200) {
        console.log('✅ Server is running');
        runAllTests();
    } else {
        console.log('❌ Server returned unexpected status:', res.statusCode);
        process.exit(1);
    }
}).on('error', (error) => {
    console.error('❌ Cannot connect to server. Make sure the server is running on', API_BASE_URL);
    console.error('   Error:', error.message);
    console.error('\n💡 Start the server with: npm start (or node server.js)');
    process.exit(1);
});
