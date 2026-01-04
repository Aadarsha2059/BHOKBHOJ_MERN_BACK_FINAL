require('dotenv').config();
const nodemailer = require('nodemailer');

async function testEmailLogin() {
    try {
        console.log('\n🧪 Testing Email Configuration for Login OTP...\n');
        console.log('EMAIL_USER:', process.env.EMAIL_USER);
        console.log('EMAIL_PASS:', process.env.EMAIL_PASS ? '***configured***' : '❌ NOT SET');
        console.log('');

        if (!process.env.EMAIL_USER || !process.env.EMAIL_PASS) {
            console.error('❌ ERROR: EMAIL_USER or EMAIL_PASS is not set in .env file');
            console.error('Please add them to your Backend/.env file:');
            console.error('EMAIL_USER=your-email@gmail.com');
            console.error('EMAIL_PASS=your-app-password');
            return;
        }

        // Create transporter with same configuration as login
        const transporter = nodemailer.createTransport({
            service: "gmail",
            host: "smtp.gmail.com",
            port: 587,
            secure: false,
            auth: {
                user: process.env.EMAIL_USER,
                pass: process.env.EMAIL_PASS
            },
            connectionTimeout: 5000,
            greetingTimeout: 5000,
            socketTimeout: 5000,
            pool: true,
            maxConnections: 1,
            maxMessages: 3,
            tls: {
                rejectUnauthorized: false
            }
        });

        // Test verification
        console.log('📧 Step 1: Verifying SMTP connection...');
        try {
            await Promise.race([
                transporter.verify(),
                new Promise((_, reject) => setTimeout(() => reject(new Error('Verification timeout')), 5000))
            ]);
            console.log('✅ SMTP connection verified!\n');
        } catch (verifyError) {
            console.error('❌ SMTP verification failed!');
            console.error('Error:', verifyError.message);
            console.error('Code:', verifyError.code);
            
            if (verifyError.code === 'EAUTH' || verifyError.message.includes('Invalid login')) {
                console.error('\n🔐 AUTHENTICATION ERROR:');
                console.error('   - Your EMAIL_PASS (App Password) is incorrect');
                console.error('   - Make sure you\'re using a Gmail App Password, not your regular password');
                console.error('   - Generate App Password: https://myaccount.google.com/apppasswords');
                console.error('   - Enable 2-Step Verification first if not already enabled');
            } else if (verifyError.code === 'ECONNECTION' || verifyError.code === 'ETIMEDOUT') {
                console.error('\n🌐 CONNECTION ERROR:');
                console.error('   - Check your internet connection');
                console.error('   - Gmail SMTP might be blocked by firewall/antivirus');
                console.error('   - Try disabling VPN if you\'re using one');
            }
            return;
        }

        // Test sending email
        console.log('📧 Step 2: Sending test OTP email...');
        const testOTP = '123456';
        const testEmail = process.env.EMAIL_USER; // Send to yourself for testing
        
        const mailOptions = {
            from: `"BHOKBHOJ" <${process.env.EMAIL_USER}>`,
            to: testEmail,
            subject: "Test Login OTP - BHOKBHOJ",
            html: `
                <div style="font-family: 'Segoe UI', Arial, sans-serif; max-width: 600px; margin: 0 auto; background: linear-gradient(135deg, #f0fdf4 0%, #ecfdf5 100%); padding: 40px 20px; border-radius: 16px;">
                    <div style="text-align: center; margin-bottom: 30px;">
                        <h1 style="color: #14b8a6; font-size: 32px; margin: 0;">🍽️ BHOKBHOJ</h1>
                        <p style="color: #0f766e; font-size: 14px;">Delicious Food, Delivered Fresh</p>
                    </div>
                    <div style="background: white; padding: 30px; border-radius: 12px;">
                        <h2 style="color: #0f766e;">🔐 Test Login OTP</h2>
                        <p>This is a test email to verify your email configuration.</p>
                        <div style="text-align: center; margin: 35px 0;">
                            <div style="background: linear-gradient(135deg, #14b8a6 0%, #0d9488 100%); color: white; padding: 20px 40px; border-radius: 12px; font-size: 36px; font-weight: bold; letter-spacing: 8px; display: inline-block;">
                                ${testOTP}
                            </div>
                        </div>
                        <p style="color: #666;">If you received this email, your email configuration is working correctly!</p>
                    </div>
                </div>
            `
        };

        const info = await transporter.sendMail(mailOptions);
        console.log('✅ Test email sent successfully!');
        console.log('📨 Message ID:', info.messageId);
        console.log('📬 Response:', info.response);
        console.log('📬 Accepted:', info.accepted);
        console.log('\n📧 Check your inbox:', testEmail);
        console.log('💡 If you received the email, your configuration is correct!');

    } catch (error) {
        console.error('\n❌ Email test failed!');
        console.error('Error Code:', error.code);
        console.error('Error Message:', error.message);
        console.error('Error Response:', error.response);
        
        if (error.code === 'EAUTH' || error.responseCode === 535) {
            console.error('\n🔐 AUTHENTICATION ERROR:');
            console.error('   - Your EMAIL_PASS (App Password) is incorrect or expired');
            console.error('   - Generate a new App Password: https://myaccount.google.com/apppasswords');
            console.error('   - Make sure 2-Step Verification is enabled');
        } else if (error.code === 'ECONNECTION' || error.code === 'ETIMEDOUT') {
            console.error('\n🌐 CONNECTION ERROR:');
            console.error('   - Check your internet connection');
            console.error('   - Gmail SMTP might be blocked');
        } else if (error.code === 'EENVELOPE') {
            console.error('\n📧 ENVELOPE ERROR:');
            console.error('   - Invalid email address');
        } else {
            console.error('\n📧 UNKNOWN ERROR:');
            console.error('   Full error:', JSON.stringify(error, null, 2));
        }
    }
}

testEmailLogin();

