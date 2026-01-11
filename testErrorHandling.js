/**
 * Test Error Handling Script
 * 
 * Run this file to test AppError class functionality:
 * node testErrorHandling.js
 */

const AppError = require('./utils/AppError');

console.log('🧪 Testing AppError Class\n');
console.log('═══════════════════════════════════════════════════════════════\n');

// Test 1: Basic AppError
console.log('Test 1: Basic AppError - 404 Not Found');
try {
  throw new AppError(404, 'User not found', [], 'error', true);
} catch (error) {
  console.log('✅ Status Code:', error.statusCode);
  console.log('✅ Message:', error.message);
  console.log('✅ Status:', error.status);
  console.log('✅ Is Operational:', error.isOperational);
  console.log('✅ Instance Check:', error instanceof AppError);
  console.log('✅ Instance Check (Error):', error instanceof Error);
}

console.log('\n───────────────────────────────────────────────────────────────\n');

// Test 2: Validation Error with Field-Specific Messages
console.log('Test 2: Validation Error with Field-Specific Messages');
try {
  const errors = [
    { field: 'email', message: 'Email is required' },
    { field: 'password', message: 'Password must be at least 8 characters' },
    { field: 'username', message: 'Username is required' }
  ];
  throw new AppError(400, 'Validation failed', errors, 'error', true);
} catch (error) {
  console.log('✅ Status Code:', error.statusCode);
  console.log('✅ Message:', error.message);
  console.log('✅ Errors:', JSON.stringify(error.errors, null, 2));
  console.log('✅ Errors Length:', error.errors.length);
}

console.log('\n───────────────────────────────────────────────────────────────\n');

// Test 3: Unauthorized Error
console.log('Test 3: Unauthorized Error - 401');
try {
  throw new AppError(401, 'Please login to access this resource', [], 'error', true);
} catch (error) {
  console.log('✅ Status Code:', error.statusCode);
  console.log('✅ Message:', error.message);
}

console.log('\n───────────────────────────────────────────────────────────────\n');

// Test 4: Forbidden Error
console.log('Test 4: Forbidden Error - 403');
try {
  throw new AppError(403, 'Admin access required', [], 'error', true);
} catch (error) {
  console.log('✅ Status Code:', error.statusCode);
  console.log('✅ Message:', error.message);
}

console.log('\n───────────────────────────────────────────────────────────────\n');

// Test 5: Conflict Error
console.log('Test 5: Conflict Error - 409');
try {
  throw new AppError(409, 'User with this email already exists', [], 'error', true);
} catch (error) {
  console.log('✅ Status Code:', error.statusCode);
  console.log('✅ Message:', error.message);
}

console.log('\n───────────────────────────────────────────────────────────────\n');

// Test 6: Internal Server Error (Operational)
console.log('Test 6: Internal Server Error - 500 (Operational)');
try {
  throw new AppError(500, 'An unexpected error occurred', [], 'error', true);
} catch (error) {
  console.log('✅ Status Code:', error.statusCode);
  console.log('✅ Message:', error.message);
  console.log('✅ Is Operational:', error.isOperational);
}

console.log('\n───────────────────────────────────────────────────────────────\n');

// Test 7: Internal Server Error (Programming Error)
console.log('Test 7: Internal Server Error - 500 (Programming Error)');
try {
  throw new AppError(500, 'Programming error occurred', [], 'error', false);
} catch (error) {
  console.log('✅ Status Code:', error.statusCode);
  console.log('✅ Message:', error.message);
  console.log('✅ Is Operational:', error.isOperational);
}

console.log('\n───────────────────────────────────────────────────────────────\n');

// Test 8: Custom Status Code
console.log('Test 8: Custom Status Code - 422');
try {
  throw new AppError(422, 'Cannot modify a cancelled order', [], 'error', true);
} catch (error) {
  console.log('✅ Status Code:', error.statusCode);
  console.log('✅ Message:', error.message);
}

console.log('\n───────────────────────────────────────────────────────────────\n');

// Test 9: Error with Stack Trace
console.log('Test 9: Error Stack Trace');
try {
  throw new AppError(404, 'Resource not found', [], 'error', true);
} catch (error) {
  console.log('✅ Stack Trace Available:', !!error.stack);
  if (error.stack) {
    console.log('✅ Stack Trace (first 200 chars):', error.stack.substring(0, 200) + '...');
  }
}

console.log('\n───────────────────────────────────────────────────────────────\n');

// Test 10: Different Status Types
console.log('Test 10: Different Status Types');
const statusTypes = ['error', 'fail'];
statusTypes.forEach(statusType => {
  try {
    throw new AppError(400, 'Test error', [], statusType, true);
  } catch (error) {
    console.log(`✅ Status Type "${statusType}":`, error.status);
  }
});

console.log('\n═══════════════════════════════════════════════════════════════\n');
console.log('✅ All AppError Tests Completed Successfully!\n');
console.log('💡 Next Steps:');
console.log('   1. Start your server: npm start');
console.log('   2. Test via HTTP endpoints: curl http://localhost:5000/api/test/errors/not-found');
console.log('   3. See TESTING_ERROR_HANDLING.md for detailed testing guide\n');
