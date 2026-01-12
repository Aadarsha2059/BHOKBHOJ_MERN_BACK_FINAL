/**
 * Test Script for Unauthorized Login Attempt Alert (5 Failed Attempts)
 * 
 * This script tests the email alert functionality when a user fails login 5 times.
 * 
 * Test Scenario:
 * 1. Reset user's loginAttempts to 0
 * 2. Attempt login with wrong password 5 times
 * 3. Verify email is sent on the 5th attempt
 * 4. Check console logs for email sending confirmation
 * 
 * Usage:
 * node Backend/tests/test-unauthorized-login-alert.js <username>
 */

const axios = require('axios');
const mongoose = require('mongoose');
require('dotenv').config({ path: './Backend/.env' });

// Import User model
const User = require('../models/User');

const API_URL = process.env.API_URL || 'http://localhost:5050';
const TEST_USERNAME = process.argv[2] || 'Aadarsha33'; // Default test username

console.log('\n🧪 TEST: Unauthorized Login Attempt Alert (5 Failed Attempts)');
console.log('═══════════════════════════════════════════════════════════════');
console.log('📋 Test Configuration:');
console.log('   API URL:', API_URL);
console.log('   Test Username:', TEST_USERNAME);
console.log('═══════════════════════════════════════════════════════════════\n');

async function connectDB() {
  try {
    const mongoURI = process.env.MONGO_URI || 'mongodb://localhost:27017/bhokbhoj';
    await mongoose.connect(mongoURI);
    console.log('✅ Connected to MongoDB');
  } catch (error) {
    console.error('❌ MongoDB connection error:', error.message);
    process.exit(1);
  }
}

async function resetUserLoginAttempts(username) {
  try {
    const user = await User.findOne({ username });
    if (!user) {
      console.error(`❌ User '${username}' not found in database`);
      process.exit(1);
    }
    
    console.log(`\n📊 Current User Status:`);
    console.log(`   Username: ${user.username}`);
    console.log(`   Email: ${user.email}`);
    console.log(`   Current loginAttempts: ${user.loginAttempts || 0}`);
    console.log(`   Account Locked: ${user.accountLockedUntil ? 'YES (until ' + user.accountLockedUntil + ')' : 'NO'}`);
    
    // Reset login attempts
    user.loginAttempts = 0;
    user.accountLockedUntil = null;
    await user.save();
    
    console.log(`\n✅ Reset loginAttempts to 0 for user '${username}'`);
    return user;
  } catch (error) {
    console.error('❌ Error resetting login attempts:', error.message);
    process.exit(1);
  }
}

async function attemptLogin(username, password, attemptNumber) {
  try {
    console.log(`\n🔐 Attempt ${attemptNumber}: Trying to login with wrong password...`);
    
    const response = await axios.post(`${API_URL}/api/users/login`, {
      username: username,
      password: password // Wrong password
    }, {
      validateStatus: () => true // Accept any status code
    });
    
    // Check user's current loginAttempts from database
    const user = await User.findOne({ username });
    const currentAttempts = user.loginAttempts || 0;
    
    console.log(`   Response Status: ${response.status}`);
    console.log(`   Response Message: ${response.data.message || 'N/A'}`);
    console.log(`   Current loginAttempts in DB: ${currentAttempts}`);
    
    if (currentAttempts === 5) {
      console.log(`\n🚨 🚨 🚨 5 FAILED ATTEMPTS DETECTED! 🚨 🚨 🚨`);
      console.log(`   Email should be sent NOW!`);
      console.log(`   Check the server console logs for email sending confirmation.`);
      console.log(`   Check your email inbox: ${user.email}`);
    }
    
    return {
      status: response.status,
      message: response.data.message,
      loginAttempts: currentAttempts,
      remainingAttempts: response.data.remainingAttempts,
      accountLocked: response.data.accountLocked
    };
  } catch (error) {
    console.error(`❌ Error during login attempt ${attemptNumber}:`, error.message);
    if (error.response) {
      console.error(`   Response Status: ${error.response.status}`);
      console.error(`   Response Data:`, error.response.data);
    }
    return null;
  }
}

async function verifyEmailSent(username) {
  try {
    const user = await User.findOne({ username });
    console.log(`\n📧 Email Verification:`);
    console.log(`   User Email: ${user.email}`);
    console.log(`   ⚠️  Please check your email inbox for the security alert.`);
    console.log(`   ⚠️  If using Ethereal Email, check server console for preview URL.`);
  } catch (error) {
    console.error('❌ Error verifying email:', error.message);
  }
}

async function runTest() {
  try {
    // Connect to database
    await connectDB();
    
    // Step 1: Reset user's loginAttempts
    console.log('\n📝 Step 1: Resetting user loginAttempts...');
    const user = await resetUserLoginAttempts(TEST_USERNAME);
    
    // Wait a moment
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    // Step 2: Attempt login with wrong password 5 times
    console.log('\n📝 Step 2: Attempting login with wrong password 5 times...');
    console.log('   (This will trigger the email alert on the 5th attempt)');
    
    const wrongPassword = 'wrongpassword123';
    const results = [];
    
    for (let i = 1; i <= 5; i++) {
      const result = await attemptLogin(TEST_USERNAME, wrongPassword, i);
      results.push(result);
      
      // Wait 1 second between attempts
      if (i < 5) {
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    }
    
    // Step 3: Verify results
    console.log('\n📝 Step 3: Test Results Summary');
    console.log('═══════════════════════════════════════════════════════════════');
    
    results.forEach((result, index) => {
      if (result) {
        console.log(`\n   Attempt ${index + 1}:`);
        console.log(`      Status: ${result.status}`);
        console.log(`      Login Attempts: ${result.loginAttempts}`);
        console.log(`      Remaining Attempts: ${result.remainingAttempts || 'N/A'}`);
        
        if (result.loginAttempts === 5) {
          console.log(`      ✅ EMAIL ALERT TRIGGERED!`);
        }
      }
    });
    
    // Step 4: Final verification
    console.log('\n📝 Step 4: Final User Status');
    const finalUser = await User.findOne({ username: TEST_USERNAME });
    console.log(`   Final loginAttempts: ${finalUser.loginAttempts}`);
    console.log(`   Account Locked: ${finalUser.accountLockedUntil ? 'YES' : 'NO'}`);
    
    // Verify email
    await verifyEmailSent(TEST_USERNAME);
    
    console.log('\n✅ Test completed!');
    console.log('\n📋 Next Steps:');
    console.log('   1. Check server console logs for email sending confirmation');
    console.log('   2. Check your email inbox:', user.email);
    console.log('   3. If using Ethereal Email, look for preview URL in server logs');
    console.log('   4. Verify email contains: Time, IP Address, Location, Device, Failed Attempts');
    
  } catch (error) {
    console.error('\n❌ Test failed with error:', error.message);
    console.error(error.stack);
  } finally {
    await mongoose.connection.close();
    console.log('\n👋 Database connection closed');
    process.exit(0);
  }
}

// Run the test
runTest();
