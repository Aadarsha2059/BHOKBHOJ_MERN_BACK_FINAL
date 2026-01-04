require('dotenv').config();
const nodemailer = require('nodemailer');
const fs = require('fs');
const path = require('path');

async function testEmailFromEnv() {
    console.log('\n🔧 Testing Email Configuration from .env File\n');
    console.log('═══════════════════════════════════════════════════════════\n');
    
    // Check if .env file exists
    const envPath = path.join(__dirname, '.env');
    if (!fs.existsSync(envPath)) {
        console.error('❌ ERROR: .env file not found at:', envPath);
        console.error('💡 Create a .env file in the Backend folder with:');
        console.error('   EMAIL_USER=your-email@gmail.com');
        console.error('   EMAIL_PASS=your-app-password\n');
        return;
    }

    const emailUser = process.env.EMAIL_USER;
    const emailPass = process.env.EMAIL_PASS;
    const recipientEmail = 'dhakalaadarshababu20590226@gmail.com';

    console.log('📧 Current Configuration:');
    console.log('   EMAIL_USER:', emailUser || '❌ NOT SET');
    console.log('   EMAIL_PASS:', emailPass ? '***configured***' : '❌ NOT SET');
    console.log('   Recipient:', recipientEmail);
    console.log('');

    if (!emailUser || !emailPass) {
        console.error('❌ ERROR: EMAIL_USER or EMAIL_PASS is not set in .env file');
        console.error('\n📝 Please update Backend/.env file:');
        console.error('   EMAIL_USER=dhakalaadarsha2026@gmail.com');
        console.error('   EMAIL_PASS=your-16-character-app-password-no-spaces\n');
        return;
    }

    // Clean password (remove spaces, dashes, etc.)
    const cleanPassword = emailPass.replace(/\s|-/g, '');
    
    if (cleanPassword.length !== 16) {
        console.warn('⚠️  WARNING: App Password should be 16 characters');
        console.warn(`   Current length: ${cleanPassword.length} characters`);
        console.warn('   Make sure you removed all spaces from the App Password\n');
    }

    console.log('🧪 Testing authentication...\n');

    try {
        // Try port 465 (SSL) - most reliable
        const transporter = nodemailer.createTransport({
            service: "gmail",
            host: "smtp.gmail.com",
            port: 465,
            secure: true,
            auth: {
                user: emailUser,
                pass: cleanPassword
            },
            connectionTimeout: 15000,
            greetingTimeout: 15000,
            socketTimeout: 15000,
            tls: {
                rejectUnauthorized: false
            }
        });

        console.log('📧 Step 1: Verifying SMTP connection...');
        await transporter.verify();
        console.log('✅ SMTP connection verified!\n');

        console.log('📧 Step 2: Sending test email to:', recipientEmail);
        const mailOptions = {
            from: `"BHOKBHOJ" <${emailUser}>`,
            to: recipientEmail,
            subject: "✅ Gmail Auth Test - BHOKBHOJ",
            text: `This is a test email to verify Gmail authentication is working.

If you receive this email, your email configuration is correct!

Time: ${new Date().toISOString()}

Your OTP emails will now work in the login system.`,
            html: `
                <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
                    <h2 style="color: #14b8a6;">✅ Gmail Authentication Test</h2>
                    <p>This is a test email to verify Gmail authentication is working.</p>
                    <p><strong>If you receive this email, your email configuration is correct!</strong></p>
                    <p>Time: ${new Date().toISOString()}</p>
                    <p style="margin-top: 20px; color: #14b8a6; font-weight: bold;">
                        Your OTP emails will now work in the login system! 🎉
                    </p>
                </div>
            `
        };

        const info = await transporter.sendMail(mailOptions);
        console.log('✅ Test email sent successfully!');
        console.log('📨 Message ID:', info.messageId);
        console.log('📬 Response:', info.response);
        console.log('\n🎉 SUCCESS! Email configuration is working!');
        console.log(`📧 Check your inbox: ${recipientEmail}`);
        console.log('\n💡 Next Steps:');
        console.log('   1. Restart your backend server');
        console.log('   2. Try logging in');
        console.log('   3. OTP will be sent to:', recipientEmail);
        console.log('\n═══════════════════════════════════════════════════════════\n');

    } catch (error) {
        console.error('❌ Email test failed!\n');
        console.error('Error Code:', error.code);
        console.error('Error Message:', error.message);
        
        if (error.code === 'EAUTH' || error.responseCode === 535) {
            console.error('\n═══════════════════════════════════════════════════════════');
            console.error('🔐 AUTHENTICATION ERROR - FIX INSTRUCTIONS');
            console.error('═══════════════════════════════════════════════════════════\n');
            
            console.error('The App Password is not working. Follow these steps:\n');
            
            console.error('STEP 1: Enable 2-Step Verification');
            console.error('   → Go to: https://myaccount.google.com/security');
            console.error('   → Click on "2-Step Verification"');
            console.error('   → Follow the setup process');
            console.error('   → ⚠️  App Passwords REQUIRE 2-Step Verification\n');
            
            console.error('STEP 2: Generate a NEW App Password');
            console.error('   → Go to: https://myaccount.google.com/apppasswords');
            console.error('   → Select "Mail" from the dropdown');
            console.error('   → Select "Other (Custom name)" as device');
            console.error('   → Enter: "BHOKBHOJ Backend"');
            console.error('   → Click "Generate"');
            console.error('   → Copy the 16-character password (shown as 4 groups)');
            console.error('   → Example: "abcd efgh ijkl mnop"\n');
            
            console.error('STEP 3: Update .env File');
            console.error('   → Open: Backend/.env');
            console.error('   → Update EMAIL_PASS with the NEW App Password');
            console.error('   → Remove ALL spaces');
            console.error('   → Example: EMAIL_PASS=abcdefghijklmnop');
            console.error('   → Save the file\n');
            
            console.error('STEP 4: Wait 2-3 Minutes');
            console.error('   → Google needs time to activate the App Password');
            console.error('   → Wait 2-3 minutes after generating\n');
            
            console.error('STEP 5: Test Again');
            console.error('   → Run: node Backend/testEmailFromEnv.js');
            console.error('   → If successful, restart your backend server\n');
            
            console.error('═══════════════════════════════════════════════════════════\n');
            
        } else if (error.code === 'ECONNECTION' || error.code === 'ETIMEDOUT') {
            console.error('🌐 CONNECTION ERROR:');
            console.error('   - Check your internet connection');
            console.error('   - Gmail SMTP might be blocked by firewall\n');
        } else {
            console.error('📧 ERROR DETAILS:');
            console.error('   Full error:', JSON.stringify(error, null, 2));
        }
    }
}

testEmailFromEnv();

