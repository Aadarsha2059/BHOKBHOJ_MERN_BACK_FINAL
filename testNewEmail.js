require('dotenv').config();
const nodemailer = require('nodemailer');

async function testNewEmail() {
    console.log('\n🧪 Testing New Gmail Account Configuration...\n');
    
    // New credentials
    const NEW_EMAIL_USER = 'dhakalaadarsha2026@gmail.com';
    const NEW_EMAIL_PASS = 'rrwsoxkkkghmuvmb'; // App Password without spaces
    const RECIPIENT_EMAIL = 'dhakalaadarshababu20590226@gmail.com'; // User's email
    
    console.log('📧 Sender (FROM):', NEW_EMAIL_USER);
    console.log('📧 Recipient (TO):', RECIPIENT_EMAIL);
    console.log('🔐 App Password:', '***configured***');
    console.log('');

    try {
        // Create transporter with new credentials
        const transporter = nodemailer.createTransport({
            service: "gmail",
            host: "smtp.gmail.com",
            port: 465,
            secure: true,
            auth: {
                user: NEW_EMAIL_USER,
                pass: NEW_EMAIL_PASS
            },
            connectionTimeout: 15000,
            greetingTimeout: 15000,
            socketTimeout: 15000,
            tls: {
                rejectUnauthorized: false
            }
        });

        // Step 1: Verify connection
        console.log('📧 Step 1: Verifying SMTP connection...');
        await transporter.verify();
        console.log('✅ SMTP connection verified!\n');

        // Step 2: Send test OTP email to user's email
        console.log('📧 Step 2: Sending test OTP email to user...');
        const testOTP = '123456';
        
        const mailOptions = {
            from: `"BHOKBHOJ" <${NEW_EMAIL_USER}>`,
            to: RECIPIENT_EMAIL, // Send to user's registered email
            subject: "Test Login OTP - BHOKBHOJ",
            text: `🍽️ BHOKBHOJ - Your Login OTP

Hello,

You requested to login to your BHOKBHOJ account. Please use the OTP below to complete your login:

${testOTP}

⏰ Important: This OTP will expire in 10 minutes for security reasons.

If you didn't request this login, please ignore this email and ensure your account is secure.

Best regards,
The BHOKBHOJ Team 🍴

© ${new Date().getFullYear()} BHOKBHOJ. All rights reserved.
This is an automated email. Please do not reply to this message.`,
            html: `
                <div style="font-family: 'Segoe UI', Arial, sans-serif; max-width: 600px; margin: 0 auto; background: linear-gradient(135deg, #f0fdf4 0%, #ecfdf5 100%); padding: 40px 20px; border-radius: 16px;">
                    <div style="text-align: center; margin-bottom: 30px;">
                        <h1 style="color: #14b8a6; font-size: 32px; margin: 0; text-shadow: 2px 2px 4px rgba(0,0,0,0.1);">🍽️ BHOKBHOJ</h1>
                        <p style="color: #0f766e; font-size: 14px; margin: 5px 0 0 0;">Delicious Food, Delivered Fresh</p>
                    </div>
                    <div style="background: white; padding: 30px; border-radius: 12px; box-shadow: 0 4px 12px rgba(0,0,0,0.1);">
                        <h2 style="color: #0f766e; font-size: 24px; margin-top: 0;">🔐 Your Login OTP</h2>
                        <p style="color: #374151; font-size: 16px; line-height: 1.6;">Hello,</p>
                        <p style="color: #374151; font-size: 16px; line-height: 1.6;">
                            You requested to login to your BHOKBHOJ account. Please use the OTP below to complete your login:
                        </p>
                        <div style="text-align: center; margin: 35px 0;">
                            <div style="background: linear-gradient(135deg, #14b8a6 0%, #0d9488 100%); color: white; padding: 20px 40px; border-radius: 12px; font-size: 36px; font-weight: bold; letter-spacing: 8px; display: inline-block; box-shadow: 0 4px 12px rgba(20, 184, 166, 0.4);">
                                ${testOTP}
                            </div>
                        </div>
                        <div style="background: #fef3c7; border-left: 4px solid #f59e0b; padding: 15px; border-radius: 8px; margin: 25px 0;">
                            <p style="color: #92400e; margin: 0; font-size: 14px;">
                                ⏰ <strong>Important:</strong> This OTP will expire in 10 minutes for security reasons.
                            </p>
                        </div>
                        <p style="color: #6b7280; font-size: 14px; line-height: 1.6; margin-top: 25px;">
                            If you didn't request this login, please ignore this email and ensure your account is secure.
                        </p>
                        <div style="border-top: 2px solid #e5e7eb; margin-top: 30px; padding-top: 20px;">
                            <p style="color: #374151; font-size: 14px; margin: 0;">
                                Best regards,<br>
                                <strong style="color: #14b8a6;">The BHOKBHOJ Team</strong> 🍴
                            </p>
                        </div>
                    </div>
                    <div style="text-align: center; margin-top: 20px;">
                        <p style="color: #6b7280; font-size: 12px; margin: 5px 0;">
                            © ${new Date().getFullYear()} BHOKBHOJ. All rights reserved.
                        </p>
                        <p style="color: #9ca3af; font-size: 11px; margin: 5px 0;">
                            This is an automated email. Please do not reply to this message.
                        </p>
                    </div>
                </div>
            `
        };

        const info = await transporter.sendMail(mailOptions);
        console.log('✅ Test email sent successfully!');
        console.log('📨 Message ID:', info.messageId);
        console.log('📬 Response:', info.response);
        console.log('📬 Accepted:', info.accepted);
        console.log('📬 Rejected:', info.rejected);
        console.log('\n🎉 SUCCESS! Email configuration is working!');
        console.log(`📧 Check your inbox: ${RECIPIENT_EMAIL}`);
        console.log('\n💡 Next Steps:');
        console.log('   1. Update your Backend/.env file with these credentials:');
        console.log(`      EMAIL_USER=${NEW_EMAIL_USER}`);
        console.log(`      EMAIL_PASS=${NEW_EMAIL_PASS}`);
        console.log('   2. Restart your backend server');
        console.log('   3. Try logging in - OTP will be sent to your registered email!\n');

    } catch (error) {
        console.error('\n❌ Email test failed!');
        console.error('Error Code:', error.code);
        console.error('Error Message:', error.message);
        console.error('Error Response:', error.response);
        
        if (error.code === 'EAUTH' || error.responseCode === 535) {
            console.error('\n🔐 AUTHENTICATION ERROR:');
            console.error('   - Check if the App Password is correct');
            console.error('   - Make sure you removed spaces from the App Password');
            console.error('   - App Password should be: rrwsoxkkkghmuvmb (no spaces)');
            console.error('   - Verify 2-Step Verification is enabled');
        } else if (error.code === 'EENVELOPE' && error.response && error.response.includes('Daily user sending limit exceeded')) {
            console.error('\n⚠️  GMAIL DAILY LIMIT:');
            console.error('   - This new account also hit the daily limit');
            console.error('   - Wait 24 hours or use another account');
        } else {
            console.error('\n📧 ERROR DETAILS:');
            console.error('   Full error:', JSON.stringify(error, null, 2));
        }
    }
}

testNewEmail();

