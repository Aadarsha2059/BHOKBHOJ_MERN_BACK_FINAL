/**
 * ✅ TEST SCRIPT: Unauthorized Login Attempt Alert
 * 
 * This script simulates 5 failed login attempts to trigger the security alert email
 * 
 * Usage:
 *   node Backend/tests/test-unauthorized-login-alert-scenario.js <username>
 * 
 * Example:
 *   node Backend/tests/test-unauthorized-login-alert-scenario.js testuser
 * 
 * What this script does:
 * 1. Resets the user's login attempts to 0
 * 2. Makes 5 failed login attempts with wrong password
 * 3. On the 5th attempt, the system should send an email alert
 * 4. Shows you the email preview URL (if using Ethereal) or confirms email sent (if using Gmail)
 */

require('dotenv').config();
const axios = require('axios');
const readline = require('readline');

const API_URL = process.env.API_BASE_URL || 'http://localhost:5050/api';

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

function question(query) {
  return new Promise(resolve => rl.question(query, resolve));
}

async function resetUserLoginAttempts(username) {
  try {
    // This would require an admin endpoint or direct database access
    // For testing, we'll just note that attempts need to be reset
    console.log(`\n📋 Note: Make sure the user "${username}" has loginAttempts = 0`);
    console.log('   You can reset this in MongoDB Compass or wait for the lockout to expire.\n');
  } catch (error) {
    console.error('Error resetting login attempts:', error.message);
  }
}

async function attemptLogin(username, password, attemptNumber) {
  try {
    console.log(`\n🔐 Attempt ${attemptNumber}: Trying to login with wrong password...`);
    
    const response = await axios.post(`${API_URL}/auth/login`, {
      username: username,
      password: password
    }, {
      validateStatus: () => true // Don't throw on any status code
    });

    if (response.status === 403) {
      const data = response.data;
      
      if (data.accountLocked) {
        console.log(`   ❌ Account locked: ${data.message}`);
        return { locked: true, attempts: 10 };
      }
      
      if (data.remainingAttempts !== undefined) {
        console.log(`   ❌ Login failed: ${data.message}`);
        console.log(`   ⚠️  Remaining attempts: ${data.remainingAttempts}`);
        
        if (attemptNumber === 5) {
          console.log(`\n   🚨 🚨 🚨 5TH FAILED ATTEMPT - EMAIL ALERT SHOULD BE SENT! 🚨 🚨 🚨`);
          console.log(`   📧 Check your email inbox (or spam folder) for the security alert`);
          console.log(`   📧 Email should be sent to the email address registered for: ${username}`);
        }
        
        return { failed: true, attempts: 10 - data.remainingAttempts };
      }
      
      console.log(`   ❌ Login failed: ${data.message || 'Unknown error'}`);
      return { failed: true };
    } else if (response.status === 200) {
      console.log(`   ✅ Login successful (unexpected - wrong password was used)`);
      return { success: true };
    } else {
      console.log(`   ⚠️  Unexpected response: ${response.status}`);
      return { unexpected: true };
    }
  } catch (error) {
    if (error.response) {
      console.log(`   ❌ Error: ${error.response.data?.message || error.message}`);
      return { error: true };
    } else {
      console.log(`   ❌ Network error: ${error.message}`);
      return { networkError: true };
    }
  }
}

async function main() {
  console.log('\n🧪 TEST: Unauthorized Login Attempt Alert (5 Failed Attempts)');
  console.log('═══════════════════════════════════════════════════════════════');
  console.log('This script will simulate 5 failed login attempts');
  console.log('On the 5th attempt, an email alert should be sent\n');

  // Get username from command line or prompt
  const args = process.argv.slice(2);
  let username = args[0];

  if (!username) {
    username = await question('Enter username to test: ');
  }

  if (!username) {
    console.error('❌ Username is required');
    process.exit(1);
  }

  console.log(`\n📋 Testing with username: ${username}`);
  console.log('📋 Make sure this user exists in the database');
  console.log('📋 The email alert will be sent to the email registered for this username\n');

  // Confirm before proceeding
  const confirm = await question('Continue? (yes/no): ');
  if (confirm.toLowerCase() !== 'yes' && confirm.toLowerCase() !== 'y') {
    console.log('Test cancelled');
    rl.close();
    process.exit(0);
  }

  // Reset login attempts (note to user)
  await resetUserLoginAttempts(username);

  // Wait a moment
  await new Promise(resolve => setTimeout(resolve, 1000));

  // Make 5 failed login attempts
  console.log('\n🔐 Starting failed login attempts...\n');
  
  for (let i = 1; i <= 5; i++) {
    const result = await attemptLogin(username, 'wrong_password_' + i, i);
    
    if (result.locked) {
      console.log('\n⚠️  Account was locked before reaching 5 attempts');
      console.log('   The account may have had previous failed attempts');
      console.log('   Wait 10 minutes for the lockout to expire, or reset in MongoDB\n');
      break;
    }
    
    // Wait 1 second between attempts
    if (i < 5) {
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
  }

  console.log('\n═══════════════════════════════════════════════════════════════');
  console.log('✅ Test completed!');
  console.log('\n📧 CHECK YOUR EMAIL:');
  console.log('   1. Check your inbox for the security alert email');
  console.log('   2. Check your spam/junk folder if not in inbox');
  console.log('   3. The email should be from "BHOKBHOJ Security"');
  console.log('   4. Subject: "🚨 Unauthorized Login Attempt Detected - BHOKBHOJ"');
  console.log('\n💡 If using Ethereal Email (no EMAIL_USER/EMAIL_PASS configured):');
  console.log('   - Check the server console logs for the email preview URL');
  console.log('   - Copy and paste that URL in your browser to view the email');
  console.log('\n💡 To receive real emails:');
  console.log('   - Configure EMAIL_USER and EMAIL_PASS in your .env file');
  console.log('   - Use a Gmail App Password (not your regular password)');
  console.log('═══════════════════════════════════════════════════════════════\n');

  rl.close();
}

main().catch(error => {
  console.error('\n❌ Test failed:', error.message);
  console.error('Stack:', error.stack);
  rl.close();
  process.exit(1);
});
