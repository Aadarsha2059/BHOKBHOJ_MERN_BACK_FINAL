/**
 * Rate Limiting Test Script
 * Tests IP-based rate limiting implementation
 * 
 * Usage: node test-rate-limit.js
 */

const http = require('http');

// Configuration
const BASE_URL = 'http://localhost:5050';
const MAX_REQUESTS = 6; // Should match your rate limit max
const TEST_ENDPOINT = '/api/categories'; // Valid endpoint for testing

// Test function
function makeRequest(endpoint, requestNumber) {
    return new Promise((resolve, reject) => {
        const options = {
            hostname: 'localhost',
            port: 5050,
            path: endpoint,
            method: 'GET',
            headers: {
                'Content-Type': 'application/json'
            }
        };

        const startTime = Date.now();
        const req = http.request(options, (res) => {
            let data = '';

            res.on('data', (chunk) => {
                data += chunk;
            });

            res.on('end', () => {
                const endTime = Date.now();
                const responseTime = endTime - startTime;

                // Check rate limit headers
                const rateLimitLimit = res.headers['ratelimit-limit'];
                const rateLimitRemaining = res.headers['ratelimit-remaining'];
                const rateLimitReset = res.headers['ratelimit-reset'];

                resolve({
                    requestNumber,
                    statusCode: res.statusCode,
                    headers: {
                        rateLimitLimit,
                        rateLimitRemaining,
                        rateLimitReset
                    },
                    responseTime,
                    data: data.substring(0, 200) // First 200 chars only
                });
            });
        });

        req.on('error', (error) => {
            reject({ requestNumber, error: error.message });
        });

        req.end();
    });
}

// Run test
async function runTest() {
    console.log('🧪 Rate Limiting Test Starting...\n');
    console.log('═══════════════════════════════════════════════════════════');
    console.log(`📡 Base URL: ${BASE_URL}`);
    console.log(`🎯 Test Endpoint: ${TEST_ENDPOINT}`);
    console.log(`🔢 Max Requests (Rate Limit): ${MAX_REQUESTS}`);
    console.log('═══════════════════════════════════════════════════════════\n');

    // Make requests sequentially (wait for each response before sending next)
    const results = [];
    
    for (let i = 1; i <= MAX_REQUESTS + 2; i++) { // Make 2 extra requests to test limit
        try {
            console.log(`📤 Request #${i}...`);
            const result = await makeRequest(TEST_ENDPOINT, i);
            results.push(result);
            
            // Display result
            console.log(`   ✅ Status: ${result.statusCode}`);
            console.log(`   📊 RateLimit-Limit: ${result.headers.rateLimitLimit || 'N/A'}`);
            console.log(`   📊 RateLimit-Remaining: ${result.headers.rateLimitRemaining || 'N/A'}`);
            console.log(`   ⏱️  Response Time: ${result.responseTime}ms`);
            
            if (result.statusCode === 429) {
                console.log(`   🚫 RATE LIMITED! Response: ${result.data.substring(0, 100)}`);
            } else {
                console.log(`   ✅ Success`);
            }
            console.log('');
            
            // Small delay between requests
            await new Promise(resolve => setTimeout(resolve, 100));
        } catch (error) {
            console.error(`   ❌ Request #${i} failed:`, error);
            results.push({ requestNumber: i, error });
        }
    }

    // Summary
    console.log('\n═══════════════════════════════════════════════════════════');
    console.log('📊 TEST SUMMARY');
    console.log('═══════════════════════════════════════════════════════════\n');
    
    const successful = results.filter(r => r.statusCode === 200 || r.statusCode === 304).length;
    const rateLimited = results.filter(r => r.statusCode === 429).length;
    const errors = results.filter(r => r.error).length;
    
    console.log(`✅ Successful requests (200/304): ${successful}`);
    console.log(`🚫 Rate limited requests (429): ${rateLimited}`);
    console.log(`❌ Errors: ${errors}`);
    console.log(`📈 Total requests: ${results.length}\n`);

    // Check if rate limiting is working
    if (rateLimited > 0) {
        console.log('✅ RATE LIMITING IS WORKING CORRECTLY!');
        console.log(`   The last ${rateLimited} request(s) were blocked with 429 status.\n`);
    } else if (successful <= MAX_REQUESTS) {
        console.log('⚠️  Rate limiting might not be working or endpoint is excluded.');
        console.log(`   Expected ${MAX_REQUESTS} successful requests, got ${successful}.\n`);
    } else {
        console.log('❌ RATE LIMITING NOT WORKING!');
        console.log(`   Expected max ${MAX_REQUESTS} successful requests, but got ${successful}.\n`);
    }

    // Show rate limit headers from first request
    const firstRequest = results[0];
    if (firstRequest && firstRequest.headers) {
        console.log('📋 Rate Limit Headers (from first request):');
        console.log(`   RateLimit-Limit: ${firstRequest.headers.rateLimitLimit || 'Not set'}`);
        console.log(`   RateLimit-Remaining: ${firstRequest.headers.rateLimitRemaining || 'Not set'}`);
        console.log(`   RateLimit-Reset: ${firstRequest.headers.rateLimitReset || 'Not set'}\n`);
    }
}

// Run the test
runTest().catch(console.error);
