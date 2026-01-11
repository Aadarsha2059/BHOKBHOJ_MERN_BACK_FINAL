/**
 * Security Notification Email Service
 * Sends email alerts for security events:
 * - Suspicious activities (failed logins, account locked)
 * - Password changes
 * - Unauthorized login attempts
 */

const nodemailer = require('nodemailer');
const { validateEmailConfig, getAppPasswordInstructions } = require('./emailConfigValidator');
const { envConfig } = require('../config/envConfig');

/**
 * Create email transporter (using Ethereal for development or Gmail for production)
 */
const getTransporter = async () => {
  try {
    // Check if Gmail credentials are configured
    if (process.env.EMAIL_USER && process.env.EMAIL_PASS) {
      // ✅ Validate email configuration (App Password format, email format)
      const validation = validateEmailConfig();
      
      if (!validation.valid) {
        console.error('\n❌ ❌ ❌ EMAIL CONFIGURATION ERROR ❌ ❌ ❌');
        console.error('═══════════════════════════════════════════════════════════════');
        console.error('📧 EMAIL_USER:', validation.emailUser);
        console.error('🔐 EMAIL_PASS:', validation.emailPass);
        console.error('\n🚨 Validation Errors:');
        validation.errors.forEach((error, index) => {
          console.error(`   ${index + 1}. ${error}`);
        });
        console.error('\n💡 Suggestions:');
        validation.suggestions.forEach((suggestion, index) => {
          console.error(`   ${index + 1}. ${suggestion}`);
        });
        console.error('═══════════════════════════════════════════════════════════════');
        console.error(getAppPasswordInstructions());
        console.error('⚠️  Falling back to Ethereal Email for testing');
        console.error('═══════════════════════════════════════════════════════════════\n');
        
        // Fall back to Ethereal with default config
        const etherealAccount = await nodemailer.createTestAccount();
        return {
          transporter: nodemailer.createTransport({
            host: 'smtp.ethereal.email',
            port: envConfig.email.port,
            secure: envConfig.email.secure,
            auth: {
              user: etherealAccount.user,
              pass: etherealAccount.pass
            },
            tls: {
              rejectUnauthorized: false
            }
          }),
          isEthereal: true,
          etherealAccount
        };
      }
      
      // Use validated and cleaned credentials
      const emailUser = validation.emailUser;
      const emailPass = validation.emailPass;
      
      console.log('📧 Using Gmail SMTP for sending emails');
      console.log('📧 From:', emailUser);
      console.log('🔐 App Password: Validated (16 characters)');
      
      // Use Gmail for production with validated credentials and centralized config
      const transporter = nodemailer.createTransport({
        service: "gmail",
        host: envConfig.email.host,
        port: envConfig.email.port,
        secure: envConfig.email.secure,
        auth: {
          user: emailUser,
          pass: emailPass // Use cleaned password (spaces removed)
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
      
      // Verify Gmail connection
      try {
        await transporter.verify();
        console.log('✅ Gmail SMTP connection verified successfully');
        console.log('✅ App Password authentication successful');
      } catch (verifyError) {
        console.error('\n❌ ❌ ❌ GMAIL SMTP VERIFICATION FAILED ❌ ❌ ❌');
        console.error('═══════════════════════════════════════════════════════════════');
        console.error('Error Code:', verifyError.code);
        console.error('Error Message:', verifyError.message);
        
        if (verifyError.code === 'EAUTH' || verifyError.responseCode === 535) {
          console.error('\n🔐 AUTHENTICATION FAILED:');
          console.error('   Your Gmail App Password is incorrect or expired.');
          console.error('\n💡 Solutions:');
          console.error('   1. Verify EMAIL_USER is your full Gmail address');
          console.error('   2. Generate a NEW App Password at: https://myaccount.google.com/apppasswords');
          console.error('   3. Make sure 2-Step Verification is enabled');
          console.error('   4. Copy the 16-character password WITHOUT spaces');
          console.error('   5. Update EMAIL_PASS in .env file');
          console.error('   6. Restart backend server');
        } else if (verifyError.code === 'ECONNECTION' || verifyError.code === 'ETIMEDOUT') {
          console.error('\n🌐 CONNECTION FAILED:');
          console.error('   Cannot connect to Gmail SMTP server.');
          console.error('   Check your internet connection and firewall settings.');
        }
        
        console.error('\n⚠️  Falling back to Ethereal Email for testing');
        console.error('═══════════════════════════════════════════════════════════════\n');
        
        // Fall back to Ethereal if Gmail verification fails
        const etherealAccount = await nodemailer.createTestAccount();
        return {
          transporter: nodemailer.createTransport({
            host: 'smtp.ethereal.email',
            port: envConfig.email.port,
            secure: envConfig.email.secure,
            auth: {
              user: etherealAccount.user,
              pass: etherealAccount.pass
            },
            tls: {
              rejectUnauthorized: false
            }
          }),
          isEthereal: true,
          etherealAccount
        };
      }
      
      return {
        transporter,
        isEthereal: false,
        etherealAccount: null
      };
    }

    // Use Ethereal Email for development/testing (when Gmail not configured)
    console.log('⚠️  EMAIL_USER or EMAIL_PASS not configured');
    console.log('📧 Using Ethereal Email for testing (emails will only have preview URLs)');
    console.log('💡 To receive real emails, configure EMAIL_USER and EMAIL_PASS in .env file');
    
    const etherealAccount = await nodemailer.createTestAccount();
    return {
      transporter: nodemailer.createTransport({
        host: 'smtp.ethereal.email',
        port: envConfig.email.port,
        secure: envConfig.email.secure,
        auth: {
          user: etherealAccount.user,
          pass: etherealAccount.pass
        },
        tls: {
          rejectUnauthorized: false
        }
      }),
      isEthereal: true,
      etherealAccount
    };
  } catch (error) {
    console.error('❌ Error creating email transporter:', error);
    console.error('Error details:', error.message);
    return null;
  }
};

/**
 * Send security notification email for suspicious activity
 */
const sendSuspiciousActivityAlert = async (user, activityDetails) => {
  try {
    console.log('\n📧 Preparing to send suspicious activity alert...');
    console.log('👤 User:', user.username || 'Unknown');
    console.log('📧 To:', user.email);
    
    const emailConfig = await getTransporter();
    if (!emailConfig) {
      console.error('❌ Email transporter not available for security notification');
      console.error('⚠️  Please check your email configuration (EMAIL_USER and EMAIL_PASS)');
      return { success: false, error: 'Email transporter not available' };
    }

    const { transporter, isEthereal, etherealAccount } = emailConfig;
    
    if (isEthereal) {
      console.log('📧 Using Ethereal Email - Preview URL will be generated');
    } else {
      console.log('📧 Using Gmail - Email will be sent to:', user.email);
    }
    
    const activityType = activityDetails.type || 'Unknown Activity';
    const ipAddress = activityDetails.ipAddress || 'Unknown';
    const location = activityDetails.location || 'Unknown Location';
    const timestamp = activityDetails.timestamp || new Date().toISOString();
    const description = activityDetails.description || 'A suspicious activity was detected on your account.';

    const mailOptions = {
      from: `"BHOKBHOJ Security" <${isEthereal ? (etherealAccount?.user || envConfig.email.from) : (envConfig.email.user || envConfig.email.from)}>`,
      to: user.email,
      subject: `🚨 Security Alert: Suspicious Activity Detected - BHOKBHOJ`,
      text: `Security Alert - Suspicious Activity Detected

Hello ${user.fullname || user.username},

We detected suspicious activity on your BHOKBHOJ account:

Activity Type: ${activityType}
IP Address: ${ipAddress}
Location: ${location}
Time: ${timestamp}

${description}

If this was you, no action is required. However, if you didn't perform this activity, please secure your account immediately by changing your password.

Best regards,
BHOKBHOJ Security Team 🍴`,
      html: `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Security Alert - BHOKBHOJ</title>
</head>
<body style="margin: 0; padding: 0; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #f5f5f5;">
    <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="background: linear-gradient(135deg, #dc2626 0%, #991b1b 100%); padding: 40px 20px;">
        <tr>
            <td align="center">
                <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="600" style="max-width: 600px; background: #ffffff; border-radius: 16px; box-shadow: 0 10px 40px rgba(0,0,0,0.1); overflow: hidden;">
                    <!-- Header -->
                    <tr>
                        <td style="background: linear-gradient(135deg, #dc2626 0%, #991b1b 100%); padding: 40px 30px; text-align: center;">
                            <h1 style="margin: 0; color: #ffffff; font-size: 36px; font-weight: bold; text-shadow: 2px 2px 4px rgba(0,0,0,0.2);">
                                🚨 Security Alert
                            </h1>
                            <p style="margin: 10px 0 0 0; color: #fecaca; font-size: 16px; font-weight: 300;">
                                Suspicious Activity Detected
                            </p>
                        </td>
                    </tr>
                    
                    <!-- Content -->
                    <tr>
                        <td style="padding: 40px 30px;">
                            <h2 style="margin: 0 0 20px 0; color: #0f172a; font-size: 28px; font-weight: 600;">
                                Suspicious Activity Detected
                            </h2>
                            
                            <p style="margin: 0 0 15px 0; color: #475569; font-size: 16px; line-height: 1.6;">
                                Hello <strong style="color: #0f172a;">${user.fullname || user.username}</strong>,
                            </p>
                            
                            <p style="margin: 0 0 30px 0; color: #475569; font-size: 16px; line-height: 1.6;">
                                We detected suspicious activity on your BHOKBHOJ account. Please review the details below:
                            </p>
                            
                            <!-- Activity Details Box -->
                            <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%">
                                <tr>
                                    <td style="background: #fef2f2; border-left: 4px solid #dc2626; padding: 20px; border-radius: 8px; margin: 20px 0;">
                                        <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%">
                                            <tr>
                                                <td style="padding: 5px 0;">
                                                    <strong style="color: #991b1b;">Activity Type:</strong>
                                                    <span style="color: #475569; margin-left: 10px;">${activityType}</span>
                                                </td>
                                            </tr>
                                            <tr>
                                                <td style="padding: 5px 0;">
                                                    <strong style="color: #991b1b;">IP Address:</strong>
                                                    <span style="color: #475569; margin-left: 10px;">${ipAddress}</span>
                                                </td>
                                            </tr>
                                            <tr>
                                                <td style="padding: 5px 0;">
                                                    <strong style="color: #991b1b;">Location:</strong>
                                                    <span style="color: #475569; margin-left: 10px;">${location}</span>
                                                </td>
                                            </tr>
                                            <tr>
                                                <td style="padding: 5px 0;">
                                                    <strong style="color: #991b1b;">Time:</strong>
                                                    <span style="color: #475569; margin-left: 10px;">${timestamp}</span>
                                                </td>
                                            </tr>
                                        </table>
                                    </td>
                                </tr>
                            </table>
                            
                            <p style="margin: 20px 0; color: #64748b; font-size: 14px; line-height: 1.6;">
                                ${description}
                            </p>
                            
                            <!-- Warning Box -->
                            <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%">
                                <tr>
                                    <td style="background: #fef3c7; border-left: 4px solid #f59e0b; padding: 18px 20px; border-radius: 8px; margin: 20px 0;">
                                        <p style="margin: 0; color: #92400e; font-size: 14px; line-height: 1.5;">
                                            ⚠️ <strong>Important:</strong> If this was not you, please secure your account immediately by changing your password.
                                        </p>
                                    </td>
                                </tr>
                            </table>
                            
                            <p style="margin: 30px 0 0 0; color: #64748b; font-size: 14px; line-height: 1.6;">
                                If this activity was authorized by you, no action is required. This email is for your information only.
                            </p>
                        </td>
                    </tr>
                    
                    <!-- Footer -->
                    <tr>
                        <td style="background: #f8fafc; padding: 30px; border-top: 1px solid #e2e8f0;">
                            <p style="margin: 0 0 10px 0; color: #475569; font-size: 14px; line-height: 1.6;">
                                Best regards,<br>
                                <strong style="color: #dc2626; font-size: 16px;">BHOKBHOJ Security Team</strong> 🍴
                            </p>
                            <p style="margin: 20px 0 5px 0; color: #94a3b8; font-size: 12px; text-align: center;">
                                © ${new Date().getFullYear()} BHOKBHOJ. All rights reserved.
                            </p>
                            <p style="margin: 0; color: #cbd5e1; font-size: 11px; text-align: center;">
                                This is an automated security notification. Please do not reply to this message.
                            </p>
                        </td>
                    </tr>
                </table>
            </td>
        </tr>
    </table>
</body>
</html>
      `
    };

    console.log('📤 Sending email...');
    const info = await transporter.sendMail(mailOptions);
    const previewUrl = isEthereal ? nodemailer.getTestMessageUrl(info) : null;

    console.log('\n✅ ✅ ✅ SUSPICIOUS ACTIVITY ALERT EMAIL SENT ✅ ✅ ✅');
    console.log('═══════════════════════════════════════════════════════════════');
    console.log('📧 Type: Suspicious Activity Alert');
    console.log('📧 To:', user.email);
    console.log('👤 User:', user.username || 'Unknown');
    console.log('🚨 Activity Type:', activityType);
    console.log('🌐 IP Address:', ipAddress);
    console.log('📍 Location:', location);
    console.log('🕐 Timestamp:', timestamp);
    
    if (isEthereal) {
      if (previewUrl) {
        console.log('\n🌐 🌐 🌐 EMAIL PREVIEW URL (ETHEREAL) 🌐 🌐 🌐');
        console.log('🌐', previewUrl);
        console.log('💡 Open this URL in your browser to view the email');
        console.log('💡 Note: Ethereal emails are for testing only - they do not send real emails');
        console.log('💡 To receive real emails, configure EMAIL_USER and EMAIL_PASS in .env file');
      } else {
        console.log('⚠️  Preview URL not available (Ethereal Email limitation)');
      }
    } else {
      console.log('\n📬 Email sent via Gmail SMTP');
      console.log('📬 Message ID:', info.messageId);
      console.log('📬 Response:', info.response);
      console.log('✅ Check your inbox:', user.email);
      console.log('💡 If email not received, check spam/junk folder');
    }
    
    console.log('═══════════════════════════════════════════════════════════════\n');

    return { success: true, messageId: info.messageId, previewUrl, isEthereal };
  } catch (error) {
    console.error('\n❌ ❌ ❌ SUSPICIOUS ACTIVITY ALERT EMAIL ERROR ❌ ❌ ❌');
    console.error('═══════════════════════════════════════════════════════════════');
    console.error('Error Type:', error.name);
    console.error('Error Message:', error.message);
    console.error('Error Code:', error.code);
    if (error.response) {
      console.error('Error Response:', error.response);
    }
    console.error('To Email:', user.email);
    console.error('User:', user.username || 'Unknown');
    console.error('Activity Type:', activityDetails?.type || 'Unknown');
    
    // Check for Gmail daily sending limit
    if (error.code === 'EENVELOPE' && error.message && error.message.includes('Daily user sending limit exceeded')) {
      console.error('\n📧 GMAIL DAILY SENDING LIMIT EXCEEDED:');
      console.error('   ⚠️  You have reached Gmail\'s daily sending limit (500 emails/day).');
      console.error('   ✅ Your App Password is CORRECT and authentication is working!');
      console.error('   ❌ Gmail is blocking emails due to daily limit.\n');
      console.error('   💡 Solutions:');
      console.error('      1. Wait 24 hours for the limit to reset');
      console.error('      2. Use a different Gmail account');
      console.error('      3. For production, use SendGrid/Mailgun/AWS SES\n');
    } else {
      console.error('\n💡 Troubleshooting:');
      console.error('   1. Check if EMAIL_USER and EMAIL_PASS are set in .env file');
      console.error('   2. Verify Gmail App Password is correct (not regular password)');
      console.error('   3. Check Gmail "Less secure app access" or enable 2FA with App Password');
      console.error('   4. Ensure internet connection is available');
    }
    console.error('═══════════════════════════════════════════════════════════════\n');
    return { success: false, error: error.message, errorCode: error.code };
  }
};

/**
 * Send security notification email for password change
 */
const sendPasswordChangeNotification = async (user, changeDetails) => {
  try {
    const emailConfig = await getTransporter();
    if (!emailConfig) {
      console.error('❌ Email transporter not available for password change notification');
      return null;
    }

    const { transporter, isEthereal, etherealAccount } = emailConfig;
    const ipAddress = changeDetails.ipAddress || 'Unknown';
    const location = changeDetails.location || 'Unknown Location';
    const timestamp = changeDetails.timestamp || new Date().toISOString();
    const deviceInfo = changeDetails.deviceInfo || 'Unknown Device';

    const mailOptions = {
      from: `"BHOKBHOJ Security" <${isEthereal ? (etherealAccount?.user || envConfig.email.from) : (envConfig.email.user || envConfig.email.from)}>`,
      to: user.email,
      subject: `🔐 Password Changed Successfully - BHOKBHOJ`,
      text: `Password Changed - Security Notification

Hello ${user.fullname || user.username},

Your BHOKBHOJ account password was successfully changed.

Change Details:
- Time: ${timestamp}
- IP Address: ${ipAddress}
- Location: ${location}
- Device: ${deviceInfo}

If you did not make this change, please contact our support team immediately and secure your account.

Best regards,
BHOKBHOJ Security Team 🍴`,
      html: `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Password Changed - BHOKBHOJ</title>
</head>
<body style="margin: 0; padding: 0; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #f5f5f5;">
    <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="background: linear-gradient(135deg, #14b8a6 0%, #0d9488 100%); padding: 40px 20px;">
        <tr>
            <td align="center">
                <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="600" style="max-width: 600px; background: #ffffff; border-radius: 16px; box-shadow: 0 10px 40px rgba(0,0,0,0.1); overflow: hidden;">
                    <!-- Header -->
                    <tr>
                        <td style="background: linear-gradient(135deg, #14b8a6 0%, #0d9488 100%); padding: 40px 30px; text-align: center;">
                            <h1 style="margin: 0; color: #ffffff; font-size: 36px; font-weight: bold; text-shadow: 2px 2px 4px rgba(0,0,0,0.2);">
                                🔐 Password Changed
                            </h1>
                            <p style="margin: 10px 0 0 0; color: #e0f2fe; font-size: 16px; font-weight: 300;">
                                Security Notification
                            </p>
                        </td>
                    </tr>
                    
                    <!-- Content -->
                    <tr>
                        <td style="padding: 40px 30px;">
                            <h2 style="margin: 0 0 20px 0; color: #0f172a; font-size: 28px; font-weight: 600;">
                                Password Changed Successfully
                            </h2>
                            
                            <p style="margin: 0 0 15px 0; color: #475569; font-size: 16px; line-height: 1.6;">
                                Hello <strong style="color: #0f172a;">${user.fullname || user.username}</strong>,
                            </p>
                            
                            <p style="margin: 0 0 30px 0; color: #475569; font-size: 16px; line-height: 1.6;">
                                Your BHOKBHOJ account password was successfully changed. Here are the details:
                            </p>
                            
                            <!-- Change Details Box -->
                            <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%">
                                <tr>
                                    <td style="background: #f0fdfa; border-left: 4px solid #14b8a6; padding: 20px; border-radius: 8px; margin: 20px 0;">
                                        <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%">
                                            <tr>
                                                <td style="padding: 5px 0;">
                                                    <strong style="color: #0d9488;">Time:</strong>
                                                    <span style="color: #475569; margin-left: 10px;">${timestamp}</span>
                                                </td>
                                            </tr>
                                            <tr>
                                                <td style="padding: 5px 0;">
                                                    <strong style="color: #0d9488;">IP Address:</strong>
                                                    <span style="color: #475569; margin-left: 10px;">${ipAddress}</span>
                                                </td>
                                            </tr>
                                            <tr>
                                                <td style="padding: 5px 0;">
                                                    <strong style="color: #0d9488;">Location:</strong>
                                                    <span style="color: #475569; margin-left: 10px;">${location}</span>
                                                </td>
                                            </tr>
                                            <tr>
                                                <td style="padding: 5px 0;">
                                                    <strong style="color: #0d9488;">Device:</strong>
                                                    <span style="color: #475569; margin-left: 10px;">${deviceInfo}</span>
                                                </td>
                                            </tr>
                                        </table>
                                    </td>
                                </tr>
                            </table>
                            
                            <!-- Warning Box -->
                            <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%">
                                <tr>
                                    <td style="background: #fef3c7; border-left: 4px solid #f59e0b; padding: 18px 20px; border-radius: 8px; margin: 20px 0;">
                                        <p style="margin: 0; color: #92400e; font-size: 14px; line-height: 1.5;">
                                            ⚠️ <strong>Important:</strong> If you did not make this change, please contact our support team immediately and secure your account.
                                        </p>
                                    </td>
                                </tr>
                            </table>
                            
                            <p style="margin: 30px 0 0 0; color: #64748b; font-size: 14px; line-height: 1.6;">
                                This is a security notification. If this was you, no action is required.
                            </p>
                        </td>
                    </tr>
                    
                    <!-- Footer -->
                    <tr>
                        <td style="background: #f8fafc; padding: 30px; border-top: 1px solid #e2e8f0;">
                            <p style="margin: 0 0 10px 0; color: #475569; font-size: 14px; line-height: 1.6;">
                                Best regards,<br>
                                <strong style="color: #14b8a6; font-size: 16px;">BHOKBHOJ Security Team</strong> 🍴
                            </p>
                            <p style="margin: 20px 0 5px 0; color: #94a3b8; font-size: 12px; text-align: center;">
                                © ${new Date().getFullYear()} BHOKBHOJ. All rights reserved.
                            </p>
                            <p style="margin: 0; color: #cbd5e1; font-size: 11px; text-align: center;">
                                This is an automated security notification. Please do not reply to this message.
                            </p>
                        </td>
                    </tr>
                </table>
            </td>
        </tr>
    </table>
</body>
</html>
      `
    };

    const info = await transporter.sendMail(mailOptions);
    const previewUrl = isEthereal ? nodemailer.getTestMessageUrl(info) : null;

    console.log('\n✅ ✅ ✅ PASSWORD CHANGE NOTIFICATION EMAIL SENT ✅ ✅ ✅');
    console.log('═══════════════════════════════════════════════════════════════');
    console.log('📧 Type: Password Change Notification');
    console.log('📧 To:', user.email);
    console.log('👤 User:', user.username);
    console.log('🌐 IP:', ipAddress);
    if (previewUrl) {
      console.log('🌐 Preview URL:', previewUrl);
    }
    console.log('═══════════════════════════════════════════════════════════════\n');

    return { success: true, messageId: info.messageId, previewUrl };
  } catch (error) {
    console.error('\n❌ PASSWORD CHANGE NOTIFICATION EMAIL ERROR:');
    console.error('═══════════════════════════════════════');
    console.error('Error Code:', error.code);
    console.error('Error Message:', error.message);
    console.error('To:', user.email);
    
    // Check for Gmail daily sending limit
    if (error.code === 'EENVELOPE' && error.message && error.message.includes('Daily user sending limit exceeded')) {
      console.error('\n📧 GMAIL DAILY SENDING LIMIT EXCEEDED:');
      console.error('   ⚠️  You have reached Gmail\'s daily sending limit (500 emails/day).');
      console.error('   ✅ Your App Password is CORRECT and authentication is working!');
      console.error('   ❌ Gmail is blocking emails due to daily limit.\n');
      console.error('   💡 Solutions:');
      console.error('      1. Wait 24 hours for the limit to reset');
      console.error('      2. Use a different Gmail account');
      console.error('      3. For production, use SendGrid/Mailgun/AWS SES\n');
    }
    
    console.error('═══════════════════════════════════════\n');
    return { success: false, error: error.message, errorCode: error.code };
  }
};

/**
 * Send security notification email for unauthorized login attempt
 */
const sendUnauthorizedLoginAttemptAlert = async (user, attemptDetails) => {
  try {
    console.log('\n📧 Preparing to send unauthorized login attempt alert...');
    console.log('👤 User:', user.username || 'Unknown');
    console.log('📧 To:', user.email);
    
    const emailConfig = await getTransporter();
    if (!emailConfig) {
      console.error('❌ Email transporter not available for unauthorized login notification');
      console.error('⚠️  Please check your email configuration (EMAIL_USER and EMAIL_PASS)');
      return { success: false, error: 'Email transporter not available' };
    }

    const { transporter, isEthereal, etherealAccount } = emailConfig;
    
    if (isEthereal) {
      console.log('📧 Using Ethereal Email - Preview URL will be generated');
    } else {
      console.log('📧 Using Gmail - Email will be sent to:', user.email);
    }
    const ipAddress = attemptDetails.ipAddress || 'Unknown';
    const location = attemptDetails.location || 'Unknown Location';
    const timestamp = attemptDetails.timestamp || new Date().toISOString();
    const deviceInfo = attemptDetails.deviceInfo || 'Unknown Device';
    const failedAttempts = attemptDetails.failedAttempts || 0;

    const mailOptions = {
      from: `"BHOKBHOJ Security" <${isEthereal ? (etherealAccount?.user || envConfig.email.from) : (envConfig.email.user || envConfig.email.from)}>`,
      to: user.email,
      subject: `🚨 Unauthorized Login Attempt Detected - BHOKBHOJ`,
      text: `Unauthorized Login Attempt - Security Alert

Hello ${user.fullname || user.username},

We detected an unauthorized login attempt on your BHOKBHOJ account.

Attempt Details:
- Time: ${timestamp}
- IP Address: ${ipAddress}
- Location: ${location}
- Device: ${deviceInfo}
- Failed Attempts: ${failedAttempts}

If this was you and you're having trouble logging in, please use the "Forgot Password" feature to reset your password.

If this was NOT you, please secure your account immediately by changing your password.

Best regards,
BHOKBHOJ Security Team 🍴`,
      html: `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Unauthorized Login Attempt - BHOKBHOJ</title>
</head>
<body style="margin: 0; padding: 0; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #f5f5f5;">
    <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="background: linear-gradient(135deg, #dc2626 0%, #991b1b 100%); padding: 40px 20px;">
        <tr>
            <td align="center">
                <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="600" style="max-width: 600px; background: #ffffff; border-radius: 16px; box-shadow: 0 10px 40px rgba(0,0,0,0.1); overflow: hidden;">
                    <!-- Header -->
                    <tr>
                        <td style="background: linear-gradient(135deg, #dc2626 0%, #991b1b 100%); padding: 40px 30px; text-align: center;">
                            <h1 style="margin: 0; color: #ffffff; font-size: 36px; font-weight: bold; text-shadow: 2px 2px 4px rgba(0,0,0,0.2);">
                                🚨 Unauthorized Login Attempt
                            </h1>
                            <p style="margin: 10px 0 0 0; color: #fecaca; font-size: 16px; font-weight: 300;">
                                Security Alert
                            </p>
                        </td>
                    </tr>
                    
                    <!-- Content -->
                    <tr>
                        <td style="padding: 40px 30px;">
                            <h2 style="margin: 0 0 20px 0; color: #0f172a; font-size: 28px; font-weight: 600;">
                                Unauthorized Login Attempt Detected
                            </h2>
                            
                            <p style="margin: 0 0 15px 0; color: #475569; font-size: 16px; line-height: 1.6;">
                                Hello <strong style="color: #0f172a;">${user.fullname || user.username}</strong>,
                            </p>
                            
                            <p style="margin: 0 0 30px 0; color: #475569; font-size: 16px; line-height: 1.6;">
                                We detected an unauthorized login attempt on your BHOKBHOJ account. Please review the details below:
                            </p>
                            
                            <!-- Attempt Details Box -->
                            <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%">
                                <tr>
                                    <td style="background: #fef2f2; border-left: 4px solid #dc2626; padding: 20px; border-radius: 8px; margin: 20px 0;">
                                        <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%">
                                            <tr>
                                                <td style="padding: 5px 0;">
                                                    <strong style="color: #991b1b;">Time:</strong>
                                                    <span style="color: #475569; margin-left: 10px;">${timestamp}</span>
                                                </td>
                                            </tr>
                                            <tr>
                                                <td style="padding: 5px 0;">
                                                    <strong style="color: #991b1b;">IP Address:</strong>
                                                    <span style="color: #475569; margin-left: 10px;">${ipAddress}</span>
                                                </td>
                                            </tr>
                                            <tr>
                                                <td style="padding: 5px 0;">
                                                    <strong style="color: #991b1b;">Location:</strong>
                                                    <span style="color: #475569; margin-left: 10px;">${location}</span>
                                                </td>
                                            </tr>
                                            <tr>
                                                <td style="padding: 5px 0;">
                                                    <strong style="color: #991b1b;">Device:</strong>
                                                    <span style="color: #475569; margin-left: 10px;">${deviceInfo}</span>
                                                </td>
                                            </tr>
                                            <tr>
                                                <td style="padding: 5px 0;">
                                                    <strong style="color: #991b1b;">Failed Attempts:</strong>
                                                    <span style="color: #475569; margin-left: 10px;">${failedAttempts}</span>
                                                </td>
                                            </tr>
                                        </table>
                                    </td>
                                </tr>
                            </table>
                            
                            <!-- Warning Box -->
                            <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%">
                                <tr>
                                    <td style="background: #fef3c7; border-left: 4px solid #f59e0b; padding: 18px 20px; border-radius: 8px; margin: 20px 0;">
                                        <p style="margin: 0; color: #92400e; font-size: 14px; line-height: 1.5;">
                                            ⚠️ <strong>Important:</strong> If this was NOT you, please secure your account immediately by changing your password. If this was you and you're having trouble logging in, please use the "Forgot Password" feature.
                                        </p>
                                    </td>
                                </tr>
                            </table>
                            
                            <p style="margin: 30px 0 0 0; color: #64748b; font-size: 14px; line-height: 1.6;">
                                This is a security notification. If the login attempt was authorized by you, no action is required.
                            </p>
                        </td>
                    </tr>
                    
                    <!-- Footer -->
                    <tr>
                        <td style="background: #f8fafc; padding: 30px; border-top: 1px solid #e2e8f0;">
                            <p style="margin: 0 0 10px 0; color: #475569; font-size: 14px; line-height: 1.6;">
                                Best regards,<br>
                                <strong style="color: #dc2626; font-size: 16px;">BHOKBHOJ Security Team</strong> 🍴
                            </p>
                            <p style="margin: 20px 0 5px 0; color: #94a3b8; font-size: 12px; text-align: center;">
                                © ${new Date().getFullYear()} BHOKBHOJ. All rights reserved.
                            </p>
                            <p style="margin: 0; color: #cbd5e1; font-size: 11px; text-align: center;">
                                This is an automated security notification. Please do not reply to this message.
                            </p>
                        </td>
                    </tr>
                </table>
            </td>
        </tr>
    </table>
</body>
</html>
      `
    };

    console.log('📤 Sending email...');
    const info = await transporter.sendMail(mailOptions);
    const previewUrl = isEthereal ? nodemailer.getTestMessageUrl(info) : null;

    console.log('\n✅ ✅ ✅ UNAUTHORIZED LOGIN ATTEMPT ALERT EMAIL SENT ✅ ✅ ✅');
    console.log('═══════════════════════════════════════════════════════════════');
    console.log('📧 Type: Unauthorized Login Attempt Alert');
    console.log('📧 To:', user.email);
    console.log('👤 User:', user.username || 'Unknown');
    console.log('🌐 IP Address:', ipAddress);
    console.log('📍 Location:', location);
    console.log('📱 Device:', deviceInfo);
    console.log('❌ Failed Attempts:', failedAttempts);
    console.log('🕐 Timestamp:', timestamp);
    
    if (isEthereal) {
      if (previewUrl) {
        console.log('\n🌐 🌐 🌐 EMAIL PREVIEW URL (ETHEREAL) 🌐 🌐 🌐');
        console.log('🌐', previewUrl);
        console.log('💡 Open this URL in your browser to view the email');
        console.log('💡 Note: Ethereal emails are for testing only - they do not send real emails');
        console.log('💡 To receive real emails, configure EMAIL_USER and EMAIL_PASS in .env file');
      } else {
        console.log('⚠️  Preview URL not available (Ethereal Email limitation)');
      }
    } else {
      console.log('\n📬 Email sent via Gmail SMTP');
      console.log('📬 Message ID:', info.messageId);
      console.log('📬 Response:', info.response);
      console.log('✅ Check your inbox:', user.email);
      console.log('💡 If email not received, check spam/junk folder');
    }
    
    console.log('═══════════════════════════════════════════════════════════════\n');

    return { success: true, messageId: info.messageId, previewUrl, isEthereal };
  } catch (error) {
    console.error('\n❌ ❌ ❌ UNAUTHORIZED LOGIN ATTEMPT ALERT EMAIL ERROR ❌ ❌ ❌');
    console.error('═══════════════════════════════════════════════════════════════');
    console.error('Error Type:', error.name);
    console.error('Error Message:', error.message);
    console.error('Error Code:', error.code);
    if (error.response) {
      console.error('Error Response:', error.response);
    }
    console.error('To Email:', user.email);
    console.error('User:', user.username || 'Unknown');
    
    // Check for Gmail daily sending limit
    if (error.code === 'EENVELOPE' && error.message && error.message.includes('Daily user sending limit exceeded')) {
      console.error('\n📧 GMAIL DAILY SENDING LIMIT EXCEEDED:');
      console.error('   ⚠️  You have reached Gmail\'s daily sending limit (500 emails/day).');
      console.error('   ✅ Your App Password is CORRECT and authentication is working!');
      console.error('   ❌ Gmail is blocking emails due to daily limit.\n');
      console.error('   💡 Solutions:');
      console.error('      1. Wait 24 hours for the limit to reset');
      console.error('      2. Use a different Gmail account');
      console.error('      3. For production, use SendGrid/Mailgun/AWS SES\n');
    } else {
      console.error('\n💡 Troubleshooting:');
      console.error('   1. Check if EMAIL_USER and EMAIL_PASS are set in .env file');
      console.error('   2. Verify Gmail App Password is correct (not regular password)');
      console.error('   3. Check Gmail "Less secure app access" or enable 2FA with App Password');
      console.error('   4. Ensure internet connection is available');
    }
    console.error('═══════════════════════════════════════════════════════════════\n');
    return { success: false, error: error.message, errorCode: error.code };
  }
};

/**
 * Send password reset email
 */
const sendPasswordResetEmail = async (user, resetUrl, resetToken) => {
  try {
    console.log('\n📧 Preparing to send password reset email...');
    console.log('👤 User:', user.username || 'Unknown');
    console.log('📧 To:', user.email);
    
    const emailConfig = await getTransporter();
    if (!emailConfig) {
      console.error('❌ Email transporter not available for password reset');
      console.error('⚠️  Please check your email configuration (EMAIL_USER and EMAIL_PASS)');
      return { success: false, error: 'Email transporter not available' };
    }

    const { transporter, isEthereal, etherealAccount } = emailConfig;
    
    if (isEthereal) {
      console.log('📧 Using Ethereal Email - Preview URL will be generated');
    } else {
      console.log('📧 Using Gmail - Email will be sent to:', user.email);
    }

    const mailOptions = {
      from: `"BHOKBHOJ" <${envConfig.email.from}>`,
      to: user.email,
      subject: "Reset Your Password - BHOKBHOJ",
      html: `
        <div style="font-family: 'Segoe UI', Arial, sans-serif; max-width: 600px; margin: 0 auto; background: linear-gradient(135deg, #f0fdf4 0%, #ecfdf5 100%); padding: 40px 20px; border-radius: 16px;">
          <div style="text-align: center; margin-bottom: 30px;">
            <h1 style="color: #14b8a6; font-size: 32px; margin: 0; text-shadow: 2px 2px 4px rgba(0,0,0,0.1);">🍽️ BHOKBHOJ</h1>
            <p style="color: #0f766e; font-size: 14px; margin: 5px 0 0 0;">Delicious Food, Delivered Fresh</p>
          </div>
          
          <div style="background: white; padding: 30px; border-radius: 12px; box-shadow: 0 4px 12px rgba(0,0,0,0.1);">
            <h2 style="color: #0f766e; font-size: 24px; margin-top: 0;">🔐 Password Reset Request</h2>
            <p style="color: #374151; font-size: 16px; line-height: 1.6;">Hello <strong>${user.fullname || user.username}</strong>,</p>
            <p style="color: #374151; font-size: 16px; line-height: 1.6;">
              We received a request to reset the password for your BHOKBHOJ account. 
              Click the button below to create a new password:
            </p>
            
            <div style="text-align: center; margin: 35px 0;">
              <a href="${resetUrl}" 
                 style="background: linear-gradient(135deg, #14b8a6 0%, #0d9488 100%); 
                        color: white; 
                        padding: 14px 40px; 
                        text-decoration: none; 
                        border-radius: 10px; 
                        font-weight: bold;
                        font-size: 16px;
                        display: inline-block;
                        box-shadow: 0 4px 12px rgba(20, 184, 166, 0.4);">
                🔑 Reset My Password
              </a>
            </div>
            
            <div style="background: #fef3c7; border-left: 4px solid #f59e0b; padding: 15px; border-radius: 8px; margin: 25px 0;">
              <p style="color: #92400e; margin: 0; font-size: 14px;">
                ⏰ <strong>Important:</strong> This link will expire in 20 minutes for security reasons.
              </p>
            </div>
            
            <p style="color: #6b7280; font-size: 14px; line-height: 1.6; margin-top: 25px;">
              If you didn't request this password reset, please ignore this email. Your password will remain unchanged.
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

    console.log('📤 Sending password reset email...');
    const info = await transporter.sendMail(mailOptions);
    const previewUrl = isEthereal ? nodemailer.getTestMessageUrl(info) : null;

    console.log('\n✅ ✅ ✅ PASSWORD RESET EMAIL SENT ✅ ✅ ✅');
    console.log('═══════════════════════════════════════════════════════════════');
    console.log('📧 Type: Password Reset');
    console.log('📧 To:', user.email);
    console.log('👤 User:', user.username || 'Unknown');
    
    if (isEthereal) {
      if (previewUrl) {
        console.log('\n🌐 🌐 🌐 EMAIL PREVIEW URL (ETHEREAL) 🌐 🌐 🌐');
        console.log('🌐', previewUrl);
        console.log('💡 Open this URL in your browser to view the email');
        console.log('💡 Note: Ethereal emails are for testing only - they do not send real emails');
        console.log('💡 To receive real emails, configure EMAIL_USER and EMAIL_PASS in .env file');
      } else {
        console.log('⚠️  Preview URL not available (Ethereal Email limitation)');
      }
    } else {
      console.log('\n📬 Email sent via Gmail SMTP');
      console.log('📬 Message ID:', info.messageId);
      console.log('📬 Response:', info.response);
      console.log('✅ Check your inbox:', user.email);
      console.log('💡 If email not received, check spam/junk folder');
    }
    
    console.log('═══════════════════════════════════════════════════════════════\n');

    return { success: true, messageId: info.messageId, previewUrl, isEthereal };
  } catch (error) {
    console.error('\n❌ ❌ ❌ PASSWORD RESET EMAIL ERROR ❌ ❌ ❌');
    console.error('═══════════════════════════════════════════════════════════════');
    console.error('Error Type:', error.name);
    console.error('Error Message:', error.message);
    console.error('Error Code:', error.code);
    if (error.response) {
      console.error('Error Response:', error.response);
    }
    console.error('To Email:', user.email);
    console.error('User:', user.username || 'Unknown');
    
    // Check for Gmail daily sending limit
    if (error.code === 'EENVELOPE' && error.message && error.message.includes('Daily user sending limit exceeded')) {
      console.error('\n📧 GMAIL DAILY SENDING LIMIT EXCEEDED:');
      console.error('   ⚠️  You have reached Gmail\'s daily sending limit (500 emails/day).');
      console.error('   ✅ Your App Password is CORRECT and authentication is working!');
      console.error('   ❌ Gmail is blocking emails due to daily limit.\n');
      console.error('   💡 Solutions:');
      console.error('      1. Wait 24 hours for the limit to reset');
      console.error('      2. Use a different Gmail account');
      console.error('      3. For production, use SendGrid/Mailgun/AWS SES\n');
    } else {
      console.error('\n💡 Troubleshooting:');
      console.error('   1. Check if EMAIL_USER and EMAIL_PASS are set in .env file');
      console.error('   2. Verify Gmail App Password is correct (not regular password)');
      console.error('   3. Check Gmail "Less secure app access" or enable 2FA with App Password');
      console.error('   4. Ensure internet connection is available');
    }
    console.error('═══════════════════════════════════════════════════════════════\n');
    return { success: false, error: error.message, errorCode: error.code };
  }
};

module.exports = {
  sendSuspiciousActivityAlert,
  sendPasswordChangeNotification,
  sendUnauthorizedLoginAttemptAlert,
  sendPasswordResetEmail
};
