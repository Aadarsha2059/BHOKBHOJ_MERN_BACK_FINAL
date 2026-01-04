require('dotenv').config();
const nodemailer = require('nodemailer');

async function testEmail() {
    try {
        console.log('Testing email configuration...\n');
        console.log('EMAIL_USER:', process.env.EMAIL_USER);
        console.log('EMAIL_PASS:', process.env.EMAIL_PASS ? '***configured***' : 'NOT SET');
        console.log('');

        // Create transporter with same configuration as login
        const transporter = nodemailer.createTransport({
            service: "gmail",
            host: "smtp.gmail.com",
            port: 587,
            secure: false, // true for 465, false for other ports
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

        // Verify connection
        console.log('Verifying SMTP connection...');
        await transporter.verify();
        console.log('✅ SMTP connection verified!\n');

        // Send test email
        console.log('Sending test OTP email...');
        const testOTP = '123456';
        
        const mailOptions = {
            from: `"BHOKBHOJ" <${process.env.EMAIL_USER}>`,
            to: process.env.EMAIL_USER, // Send to yourself
            subject: 'Test OTP - BHOKBHOJ',
            html: `
                <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
                    <h2 style="color: #14b8a6;">🔐 Test OTP Email</h2>
                    <p>This is a test email from BHOKBHOJ backend.</p>
                    <div style="background: #14b8a6; color: white; padding: 20px; border-radius: 8px; text-align: center; font-size: 32px; font-weight: bold; letter-spacing: 8px;">
                        ${testOTP}
                    </div>
                    <p style="margin-top: 20px; color: #666;">If you received this email, your email configuration is working correctly!</p>
                </div>
            `
        };

        const info = await transporter.sendMail(mailOptions);
        console.log('✅ Email sent successfully!');
        console.log('Message ID:', info.messageId);
        console.log('Response:', info.response);
        console.log('\n📧 Check your inbox:', process.env.EMAIL_USER);

    } catch (error) {
        console.error('❌ Email test failed!');
        console.error('Error:', error.message);
        
        if (error.code === 'EAUTH') {
            console.error('\n⚠️  Authentication failed!');
            console.error('Please check:');
            console.error('1. EMAIL_USER is correct');
            console.error('2. EMAIL_PASS is a valid App Password (not your Gmail password)');
            console.error('3. 2-Step Verification is enabled on your Google account');
            console.error('4. Generate a new App Password at: https://myaccount.google.com/apppasswords');
        }
    }
}

testEmail();
