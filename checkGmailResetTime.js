require('dotenv').config();
const nodemailer = require('nodemailer');

async function checkGmailResetTime() {
    console.log('\n🕐 Checking Gmail Daily Limit Reset Time...\n');
    console.log('EMAIL_USER:', process.env.EMAIL_USER);
    console.log('');

    if (!process.env.EMAIL_USER || !process.env.EMAIL_PASS) {
        console.error('❌ ERROR: EMAIL_USER or EMAIL_PASS is not set in .env file');
        return;
    }

    const transporter = nodemailer.createTransport({
        service: "gmail",
        host: "smtp.gmail.com",
        port: 465,
        secure: true,
        auth: {
            user: process.env.EMAIL_USER,
            pass: process.env.EMAIL_PASS
        },
        connectionTimeout: 10000,
        greetingTimeout: 10000,
        socketTimeout: 10000,
        tls: {
            rejectUnauthorized: false
        }
    });

    try {
        // Try to send a test email
        console.log('📧 Attempting to send test email...\n');
        
        const testEmail = {
            from: `"BHOKBHOJ Test" <${process.env.EMAIL_USER}>`,
            to: process.env.EMAIL_USER,
            subject: "Gmail Limit Check - BHOKBHOJ",
            text: `This is a test email to check Gmail sending limit.

Time: ${new Date().toISOString()}`
        };

        const info = await transporter.sendMail(testEmail);
        console.log('✅ SUCCESS! Gmail daily limit has RESET!');
        console.log('📨 Message ID:', info.messageId);
        console.log('📬 Response:', info.response);
        console.log('\n🎉 Your Gmail account can now send emails!');
        console.log('💡 OTP emails will work in your login system now!\n');
        
    } catch (error) {
        if (error.code === 'EENVELOPE' && error.response && error.response.includes('Daily user sending limit exceeded')) {
            console.log('❌ Gmail daily sending limit is still ACTIVE\n');
            console.log('═══════════════════════════════════════════════════════════');
            console.log('📅 GMAIL DAILY LIMIT INFORMATION:');
            console.log('═══════════════════════════════════════════════════════════');
            console.log('');
            console.log('⏰ Reset Time: 24 hours after you FIRST hit the limit');
            console.log('   (This is a rolling 24-hour window, not a fixed time)');
            console.log('');
            console.log('📊 Limit Details:');
            console.log('   • Maximum: 500 emails per day');
            console.log('   • Reset: Rolling 24-hour window');
            console.log('   • Example: If you hit limit at 2:00 PM today,');
            console.log('             it resets at 2:00 PM tomorrow');
            console.log('');
            console.log('💡 How to Check:');
            console.log('   1. Run this script periodically: node checkGmailResetTime.js');
            console.log('   2. When it shows "SUCCESS!", the limit has reset');
            console.log('   3. Or try logging in - if email arrives, limit is reset');
            console.log('');
            console.log('🔧 Alternative Solutions:');
            console.log('   1. Use a different Gmail account with App Password');
            console.log('   2. Use the OTP from login API response (already included)');
            console.log('   3. Wait for the 24-hour window to pass');
            console.log('');
            console.log('📧 Current Status:');
            console.log('   ⚠️  Limit is ACTIVE - emails will fail');
            console.log('   ✅ OTP is included in login response (you can still login)');
            console.log('   ⏰ Keep checking - limit will reset automatically');
            console.log('');
            console.log('═══════════════════════════════════════════════════════════\n');
        } else if (error.code === 'EAUTH') {
            console.log('❌ Authentication failed');
            console.log('💡 Check your EMAIL_PASS (App Password) in .env file\n');
        } else {
            console.log('❌ Error:', error.message);
            console.log('Code:', error.code);
        }
    }
}

checkGmailResetTime();

