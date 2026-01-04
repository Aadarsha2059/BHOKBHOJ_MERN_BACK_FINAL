require('dotenv').config();
const nodemailer = require('nodemailer');

async function testEmailConfig() {
    console.log('\n🔍 Testing Email Configuration...\n');
    console.log('EMAIL_USER:', process.env.EMAIL_USER || 'NOT SET');
    console.log('EMAIL_PASS:', process.env.EMAIL_PASS ? '***configured***' : 'NOT SET');
    console.log('');

    if (!process.env.EMAIL_USER || !process.env.EMAIL_PASS) {
        console.error('❌ ERROR: EMAIL_USER or EMAIL_PASS not set in .env file');
        console.error('Please add these to your Backend/.env file:');
        console.error('EMAIL_USER="your-email@gmail.com"');
        console.error('EMAIL_PASS="your-app-password"');
        return;
    }

    // Create transporter with same config as login
    const transporter = nodemailer.createTransport({
        service: "gmail",
        host: "smtp.gmail.com",
        port: 587,
        secure: false,
        auth: {
            user: process.env.EMAIL_USER,
            pass: process.env.EMAIL_PASS
        },
        connectionTimeout: 30000,
        greetingTimeout: 30000,
        socketTimeout: 30000,
        pool: true,
        maxConnections: 1,
        maxMessages: 3,
        tls: {
            rejectUnauthorized: false
        }
    });

    try {
        // Step 1: Verify connection
        console.log('📧 Step 1: Verifying SMTP connection...');
        await transporter.verify();
        console.log('✅ SMTP connection verified successfully!\n');

        // Step 2: Send test email
        console.log('📧 Step 2: Sending test OTP email...');
        const testOTP = Math.floor(100000 + Math.random() * 900000).toString();
        
        const mailOptions = {
            from: `"BHOKBHOJ" <${process.env.EMAIL_USER}>`,
            to: process.env.EMAIL_USER, // Send to yourself
            subject: 'Test OTP - BHOKBHOJ Email Configuration',
            html: `
                <div style="font-family: 'Segoe UI', Arial, sans-serif; max-width: 600px; margin: 0 auto; background: linear-gradient(135deg, #f0fdf4 0%, #ecfdf5 100%); padding: 40px 20px; border-radius: 16px;">
                    <div style="text-align: center; margin-bottom: 30px;">
                        <h1 style="color: #14b8a6; font-size: 32px; margin: 0;">🍽️ BHOKBHOJ</h1>
                        <p style="color: #0f766e; font-size: 14px; margin: 5px 0 0 0;">Email Configuration Test</p>
                    </div>
                    
                    <div style="background: white; padding: 30px; border-radius: 12px; box-shadow: 0 4px 12px rgba(0,0,0,0.1);">
                        <h2 style="color: #0f766e; font-size: 24px; margin-top: 0;">✅ Email Configuration Working!</h2>
                        <p style="color: #374151; font-size: 16px; line-height: 1.6;">
                            Your email configuration is working correctly! This is a test OTP:
                        </p>
                        
                        <div style="text-align: center; margin: 35px 0;">
                            <div style="background: linear-gradient(135deg, #14b8a6 0%, #0d9488 100%); 
                                        color: white; 
                                        padding: 20px 40px; 
                                        border-radius: 12px; 
                                        font-size: 36px;
                                        font-weight: bold;
                                        letter-spacing: 8px;
                                        display: inline-block;">
                                ${testOTP}
                            </div>
                        </div>
                        
                        <p style="color: #6b7280; font-size: 14px; line-height: 1.6;">
                            If you received this email, your OTP emails will be sent successfully!
                        </p>
                    </div>
                </div>
            `
        };

        const info = await transporter.sendMail(mailOptions);
        
        console.log('✅ Email sent successfully!');
        console.log('═══════════════════════════════════════');
        console.log('📨 Message ID:', info.messageId);
        console.log('📬 Response:', info.response);
        console.log('📧 Sent to:', process.env.EMAIL_USER);
        console.log('🔢 Test OTP:', testOTP);
        console.log('═══════════════════════════════════════\n');
        console.log('✅ SUCCESS: Your email configuration is working!');
        console.log('📧 Check your inbox:', process.env.EMAIL_USER);
        console.log('   (Also check spam folder if not in inbox)\n');

    } catch (error) {
        console.error('\n❌ Email test failed!');
        console.error('═══════════════════════════════════════');
        console.error('Error Code:', error.code);
        console.error('Error Message:', error.message);
        console.error('Error Response:', error.response);
        console.error('═══════════════════════════════════════\n');
        
        if (error.code === 'EAUTH' || error.responseCode === 535) {
            console.error('🔐 AUTHENTICATION ERROR:');
            console.error('   Your EMAIL_USER or EMAIL_PASS is incorrect.');
            console.error('   Solutions:');
            console.error('   1. Make sure EMAIL_USER is your full Gmail address');
            console.error('   2. Make sure EMAIL_PASS is a Gmail App Password (not your regular password)');
            console.error('   3. Enable 2-Step Verification on your Google account');
            console.error('   4. Generate a new App Password at: https://myaccount.google.com/apppasswords');
            console.error('   5. Make sure there are no quotes around the values in .env file');
            console.error('   6. Restart your backend server after changing .env\n');
        } else if (error.code === 'ECONNECTION' || error.code === 'ETIMEDOUT') {
            console.error('🌐 CONNECTION ERROR:');
            console.error('   Cannot connect to Gmail SMTP server.');
            console.error('   Solutions:');
            console.error('   1. Check your internet connection');
            console.error('   2. Check if firewall is blocking port 587');
            console.error('   3. Try again in a few moments\n');
        } else if (error.code === 'EENVELOPE') {
            if (error.response && error.response.includes('Daily user sending limit exceeded')) {
                console.error('📧 GMAIL DAILY SENDING LIMIT EXCEEDED:');
                console.error('   You have reached Gmail\'s daily limit of 500 emails per day.');
                console.error('   Solutions:');
                console.error('   1. Wait 24 hours for the limit to reset');
                console.error('   2. Use a different Gmail account');
                console.error('   3. Use Google Workspace (higher limits)');
                console.error('   4. For production, use SendGrid/Mailgun/AWS SES');
                console.error('   More info: https://support.google.com/a/answer/166852\n');
            } else {
                console.error('📧 ENVELOPE ERROR:');
                console.error('   Invalid email address.');
                console.error('   Make sure EMAIL_USER is a valid Gmail address\n');
            }
        } else {
            console.error('📧 UNKNOWN ERROR:');
            console.error('   Full error details:', JSON.stringify(error, null, 2));
        }
    }
}

testEmailConfig();

