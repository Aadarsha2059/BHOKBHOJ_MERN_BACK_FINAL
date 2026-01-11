/**
 * Test Gmail App Password Configuration
 * Validates and tests your Gmail App Password setup
 */

require('dotenv').config();
const { validateEmailConfig, getAppPasswordInstructions } = require('./utils/emailConfigValidator');
const nodemailer = require('nodemailer');

async function testAppPassword() {
  console.log('\n🔍 Testing Gmail App Password Configuration...\n');
  console.log('═══════════════════════════════════════════════════════════════\n');

  // Step 1: Validate configuration
  console.log('📋 Step 1: Validating Email Configuration...\n');
  const validation = validateEmailConfig();

  if (!validation.valid) {
    console.error('❌ Configuration Validation Failed!\n');
    console.error('Errors:');
    validation.errors.forEach((error, index) => {
      console.error(`   ${index + 1}. ${error}`);
    });
    console.error('\nSuggestions:');
    validation.suggestions.forEach((suggestion, index) => {
      console.error(`   ${index + 1}. ${suggestion}`);
    });
    console.error('\n' + getAppPasswordInstructions());
    return;
  }

  console.log('✅ Configuration Valid!');
  console.log('   📧 EMAIL_USER:', validation.emailUser);
  console.log('   🔐 EMAIL_PASS: Validated (16 characters, no spaces)\n');

  // Step 2: Test SMTP connection
  console.log('📋 Step 2: Testing Gmail SMTP Connection...\n');
  
  const transporter = nodemailer.createTransport({
    service: "gmail",
    host: "smtp.gmail.com",
    port: 587,
    secure: false,
    auth: {
      user: validation.emailUser,
      pass: validation.emailPass
    },
    connectionTimeout: 30000,
    greetingTimeout: 30000,
    socketTimeout: 30000,
    tls: {
      rejectUnauthorized: false
    }
  });

  try {
    await transporter.verify();
    console.log('✅ Gmail SMTP Connection: SUCCESS\n');
  } catch (error) {
    console.error('❌ Gmail SMTP Connection: FAILED\n');
    console.error('Error Code:', error.code);
    console.error('Error Message:', error.message);
    
    if (error.code === 'EAUTH' || error.responseCode === 535) {
      console.error('\n🔐 AUTHENTICATION ERROR:');
      console.error('   Your App Password is incorrect or expired.\n');
      console.error('💡 Fix Steps:');
      console.error('   1. Go to: https://myaccount.google.com/apppasswords');
      console.error('   2. Generate a NEW App Password');
      console.error('   3. Copy the 16-character password (remove spaces)');
      console.error('   4. Update EMAIL_PASS in .env file');
      console.error('   5. Run this test again\n');
    }
    return;
  }

  // Step 3: Send test email
  console.log('📋 Step 3: Sending Test Email...\n');
  
  const testOTP = Math.floor(100000 + Math.random() * 900000).toString();
  
  const mailOptions = {
    from: `"BHOKBHOJ Test" <${validation.emailUser}>`,
    to: validation.emailUser,
    subject: '✅ Gmail App Password Test - BHOKBHOJ',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <h2 style="color: #14b8a6;">✅ Gmail App Password Test Successful!</h2>
        <p>Your Gmail App Password configuration is working correctly.</p>
        <p>Test OTP: <strong style="font-size: 24px; color: #14b8a6;">${testOTP}</strong></p>
        <p>If you received this email, your security notification emails will work properly.</p>
      </div>
    `
  };

  try {
    const info = await transporter.sendMail(mailOptions);
    console.log('✅ Test Email Sent Successfully!\n');
    console.log('═══════════════════════════════════════════════════════════════');
    console.log('📨 Message ID:', info.messageId);
    console.log('📬 Response:', info.response);
    console.log('📧 Sent to:', validation.emailUser);
    console.log('🔢 Test OTP:', testOTP);
    console.log('═══════════════════════════════════════════════════════════════\n');
    console.log('✅ ✅ ✅ ALL TESTS PASSED ✅ ✅ ✅\n');
    console.log('📧 Check your inbox:', validation.emailUser);
    console.log('   (Also check spam folder if not in inbox)');
    console.log('\n💡 Your Gmail App Password is configured correctly!');
    console.log('   Security notification emails will now be sent to your email address.\n');
  } catch (error) {
    console.error('❌ Test Email Failed!\n');
    console.error('Error Code:', error.code);
    console.error('Error Message:', error.message);
    
    if (error.code === 'EAUTH') {
      console.error('\n🔐 AUTHENTICATION ERROR:');
      console.error('   App Password authentication failed.');
      console.error('   Please generate a new App Password.\n');
    } else if (error.code === 'EENVELOPE') {
      if (error.message && error.message.includes('Daily user sending limit exceeded')) {
        console.error('\n📧 GMAIL DAILY SENDING LIMIT EXCEEDED:');
        console.error('   ⚠️  You have reached Gmail\'s daily sending limit (500 emails/day).');
        console.error('\n   ✅ GOOD NEWS: Your App Password is CORRECT!');
        console.error('   ✅ Authentication is working perfectly!');
        console.error('   ❌ But Gmail is blocking because daily limit reached.\n');
        console.error('   💡 Solutions:');
        console.error('      1. Wait 24 hours for the limit to reset');
        console.error('      2. Use a different Gmail account for testing');
        console.error('      3. For production, consider using:');
        console.error('         - SendGrid (100 emails/day free)');
        console.error('         - Mailgun (5,000 emails/month free)');
        console.error('         - AWS SES (62,000 emails/month free)');
        console.error('         - Google Workspace (higher limits)\n');
        console.error('   📚 More info: https://support.google.com/a/answer/166852\n');
      } else {
        console.error('\n📧 ENVELOPE ERROR:');
        console.error('   Invalid email address or other envelope issue.\n');
      }
    } else {
      console.error('\n📧 UNKNOWN ERROR:');
      console.error('   Error details:', error.message);
    }
  }
}

// Run the test
testAppPassword().catch(console.error);
