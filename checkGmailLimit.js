require('dotenv').config();
const nodemailer = require('nodemailer');

async function checkGmailLimit() {
    console.log('\n🔍 Checking Gmail Sending Limit Status...\n');
    console.log('EMAIL_USER:', process.env.EMAIL_USER);
    console.log('');

    if (!process.env.EMAIL_USER || !process.env.EMAIL_PASS) {
        console.error('❌ ERROR: EMAIL_USER or EMAIL_PASS is not set in .env file');
        return;
    }

    // Try both ports to see which works
    const configs = [
        { port: 465, secure: true, name: 'Port 465 (SSL)' },
        { port: 587, secure: false, name: 'Port 587 (TLS)' }
    ];

    for (const config of configs) {
        console.log(`\n📧 Testing ${config.name}...`);
        
        try {
            const transporter = nodemailer.createTransport({
                service: "gmail",
                host: "smtp.gmail.com",
                port: config.port,
                secure: config.secure,
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

            // Test verification
            await transporter.verify();
            console.log(`✅ ${config.name} - Connection verified!`);

            // Try sending a test email
            const testEmail = {
                from: `"BHOKBHOJ Test" <${process.env.EMAIL_USER}>`,
                to: process.env.EMAIL_USER,
                subject: "Gmail Limit Test - BHOKBHOJ",
                text: `This is a test email to check if Gmail daily limit has reset.

If you receive this email, your Gmail account can send emails again!

Time: ${new Date().toISOString()}`
            };

            const info = await transporter.sendMail(testEmail);
            console.log(`✅ ${config.name} - Test email sent successfully!`);
            console.log(`📨 Message ID: ${info.messageId}`);
            console.log(`📬 Response: ${info.response}`);
            console.log(`\n✅ SUCCESS! Your Gmail account can send emails.`);
            console.log(`💡 You can now use the login feature - OTP emails will work!\n`);
            return;

        } catch (error) {
            if (error.code === 'EENVELOPE' && error.response && error.response.includes('Daily user sending limit exceeded')) {
                console.log(`❌ ${config.name} - Gmail daily limit still exceeded`);
                console.log(`⏰ The limit resets 24 hours after you first hit it`);
                console.log(`💡 Please wait for the limit to reset, or use a different Gmail account\n`);
            } else if (error.code === 'EAUTH') {
                console.log(`❌ ${config.name} - Authentication failed`);
                console.log(`💡 Check your EMAIL_PASS (App Password) in .env file\n`);
            } else {
                console.log(`❌ ${config.name} - Error: ${error.message}\n`);
            }
        }
    }

    console.log('\n⚠️  Gmail daily sending limit is still active.');
    console.log('📧 Solutions:');
    console.log('   1. Wait 24 hours for the limit to reset');
    console.log('   2. Use a different Gmail account with App Password');
    console.log('   3. Use the OTP code from the login API response (already included)\n');
}

checkGmailLimit();

