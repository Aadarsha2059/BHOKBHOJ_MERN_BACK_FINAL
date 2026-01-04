require('dotenv').config();
const nodemailer = require('nodemailer');

async function fixEmailAuth() {
    console.log('\n🔧 Gmail Authentication Troubleshooter\n');
    console.log('═══════════════════════════════════════════════════════════\n');
    
    // Test credentials
    const testEmail = 'dhakalaadarsha2026@gmail.com';
    const testPasswords = [
        'rrwsoxkkkghmuvmb',  // No spaces
        'rrws oxkk kghm uvmb', // With spaces (will be cleaned)
        'rrws-oxkk-kghm-uvmb', // With dashes (will be cleaned)
    ];
    
    const recipientEmail = 'dhakalaadarshababu20590226@gmail.com';
    
    console.log('📧 Testing Email Configuration:');
    console.log('   Sender (FROM):', testEmail);
    console.log('   Recipient (TO):', recipientEmail);
    console.log('   App Password formats to test:', testPasswords.length);
    console.log('');

    // Test each password format
    for (let i = 0; i < testPasswords.length; i++) {
        const password = testPasswords[i].replace(/\s|-/g, ''); // Remove spaces and dashes
        console.log(`\n🧪 Test ${i + 1}: Trying App Password format "${testPasswords[i]}"`);
        console.log(`   Cleaned password: ${password.substring(0, 4)}****${password.substring(password.length - 4)}`);
        
        try {
            // Try port 465 (SSL) first
            const transporter = nodemailer.createTransport({
                service: "gmail",
                host: "smtp.gmail.com",
                port: 465,
                secure: true,
                auth: {
                    user: testEmail,
                    pass: password
                },
                connectionTimeout: 10000,
                greetingTimeout: 10000,
                socketTimeout: 10000,
                tls: {
                    rejectUnauthorized: false
                }
            });

            console.log('   📧 Verifying SMTP connection...');
            await transporter.verify();
            console.log('   ✅ SMTP connection verified!');
            
            // Try sending test email
            console.log('   📧 Sending test email...');
            const mailOptions = {
                from: `"BHOKBHOJ Test" <${testEmail}>`,
                to: recipientEmail,
                subject: "Gmail Auth Test - BHOKBHOJ",
                text: `This is a test email to verify Gmail authentication.

If you receive this, your email configuration is working!

Time: ${new Date().toISOString()}`
            };

            const info = await transporter.sendMail(mailOptions);
            console.log('   ✅ Test email sent successfully!');
            console.log('   📨 Message ID:', info.messageId);
            console.log('   📬 Response:', info.response);
            console.log('\n🎉 SUCCESS! Authentication is working!');
            console.log('\n═══════════════════════════════════════════════════════════');
            console.log('✅ WORKING CONFIGURATION:');
            console.log('═══════════════════════════════════════════════════════════');
            console.log(`EMAIL_USER=${testEmail}`);
            console.log(`EMAIL_PASS=${password}`);
            console.log('\n💡 Next Steps:');
            console.log('   1. Update your Backend/.env file with the above credentials');
            console.log('   2. Restart your backend server');
            console.log('   3. Try logging in - OTP will be sent to:', recipientEmail);
            console.log('═══════════════════════════════════════════════════════════\n');
            return;

        } catch (error) {
            if (error.code === 'EAUTH' || error.responseCode === 535) {
                console.log('   ❌ Authentication failed with this password format');
                if (i === testPasswords.length - 1) {
                    // Last attempt failed
                    console.log('\n═══════════════════════════════════════════════════════════');
                    console.log('❌ ALL PASSWORD FORMATS FAILED');
                    console.log('═══════════════════════════════════════════════════════════');
                    console.log('\n🔧 TROUBLESHOOTING STEPS:');
                    console.log('\n1. ✅ Verify 2-Step Verification is Enabled:');
                    console.log('   → Go to: https://myaccount.google.com/security');
                    console.log('   → Under "Signing in to Google"');
                    console.log('   → Make sure "2-Step Verification" is ON');
                    console.log('   → App Passwords REQUIRE 2-Step Verification');
                    
                    console.log('\n2. ✅ Generate a NEW App Password:');
                    console.log('   → Go to: https://myaccount.google.com/apppasswords');
                    console.log('   → Select "Mail" as the app');
                    console.log('   → Select "Other (Custom name)" as device');
                    console.log('   → Enter name: "BHOKBHOJ Backend"');
                    console.log('   → Click "Generate"');
                    console.log('   → Copy the 16-character password');
                    console.log('   → Remove ALL spaces when using it');
                    
                    console.log('\n3. ✅ Verify App Password Format:');
                    console.log('   → Should be exactly 16 characters');
                    console.log('   → No spaces, no dashes');
                    console.log('   → Example: "abcd efgh ijkl mnop" → "abcdefghijklmnop"');
                    
                    console.log('\n4. ✅ Wait a Few Minutes:');
                    console.log('   → After generating App Password, wait 2-3 minutes');
                    console.log('   → Google needs time to activate it');
                    
                    console.log('\n5. ✅ Check Account Security:');
                    console.log('   → Make sure account is not locked');
                    console.log('   → Check for any security alerts');
                    console.log('   → Verify account recovery options');
                    
                    console.log('\n6. ✅ Alternative: Use OAuth2 (Advanced):');
                    console.log('   → More secure but requires more setup');
                    console.log('   → Can use OAuth2 tokens instead of App Password');
                    
                    console.log('\n═══════════════════════════════════════════════════════════');
                    console.log('📝 UPDATE YOUR .env FILE:');
                    console.log('═══════════════════════════════════════════════════════════');
                    console.log('Once you have the correct App Password:');
                    console.log('\nOpen: Backend/.env');
                    console.log('Update:');
                    console.log(`EMAIL_USER=${testEmail}`);
                    console.log('EMAIL_PASS=your-16-character-app-password-no-spaces');
                    console.log('\nThen run this script again to test.\n');
                }
            } else if (error.code === 'ECONNECTION' || error.code === 'ETIMEDOUT') {
                console.log('   ⚠️  Connection timeout - trying next format...');
            } else {
                console.log('   ❌ Error:', error.message);
            }
        }
    }
}

fixEmailAuth();

