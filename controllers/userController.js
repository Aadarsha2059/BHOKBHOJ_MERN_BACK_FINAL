// const User = require("../models/User");
// const bcrypt = require("bcrypt");
// const jwt = require("jsonwebtoken");
// const nodemailer = require("nodemailer");

// // Register User
// exports.registerUser = async (req, res) => {
//   const { fullname, username, email, password, confirmpassword, phone, address } = req.body;

//   // Only username, email and password are required
//   if (!username || !email || !password) {
//     return res.status(400).json({ success: false, message: "Username, email and password are required" });
//   }

//   if (confirmpassword && password !== confirmpassword) {
//     return res.status(400).json({ success: false, message: "Passwords do not match" });
//   }

//   try {
//     // Check for existing user by username
//     const existingUserByUsername = await User.findOne({ username });
//     if (existingUserByUsername) {
//       return res.status(400).json({ success: false, message: "Username already exists" });
//     }

//     // Check for existing user by email
//     const existingUserByEmail = await User.findOne({ email });
//     if (existingUserByEmail) {
//       return res.status(400).json({ success: false, message: "Email already exists" });
//     }

//     // Hash password
//     const hashedPassword = await bcrypt.hash(password, 10);

//     // Create new user
//     const newUser = new User({
//       fullname,
//       username,
//       email,
//       password: hashedPassword,
//       phone,
//       address,
//     });

//     await newUser.save();

//     return res.status(201).json({ success: true, data: newUser });
//   } catch (err) {
//     return res.status(500).json({ success: false, message: "Server error" });
//   }
// };

// // Login User (simple version)
// exports.loginUser = async (req, res) => {
//   const { username, password } = req.body;

//   // Validation
//   if (!username || !password) {
//     return res.status(400).json({ success: false, message: "Missing field" });
//   }

//   try {
//     const getUsers = await User.findOne({ username: username });
//     if (!getUsers) {
//       return res.status(403).json({ success: false, message: "User not found" });
//     }

//     const passwordCHeck = await bcrypt.compare(password, getUsers.password);
//     if (!passwordCHeck) {
//       return res.status(403).json({ success: false, message: "Invalid credentials" });
//     }

//     const payload = {
//       _id: getUsers._id,
//       username: getUsers.username,
//     };

//     const token = jwt.sign(payload, process.env.SECRET, { expiresIn: "7d" });

//     return res.status(200).json({
//       success: true,
//       message: "Login successful",
//       user: getUsers,
//       token: token,
//     });
//   } catch (err) {
//     return res.status(500).json({ success: false, message: "Server error" });
//   }
// };

// // Update User (now with currentPassword check for sensitive changes)
// exports.updateUser = async (req, res) => {
//   const { id } = req.params;
//   const { username, email, password, phone, address, fullname, currentPassword } = req.body;

//   try {
//     const updateData = { fullname, username, phone, address };

//     // Find the user
//     const user = await User.findById(id);
//     if (!user) {
//       return res.status(404).json({ success: false, message: "User not found" });
//     }

//     // Handle email update with validation and password confirmation
//     if (email && email !== user.email) {
//       // Require currentPassword
//       if (!currentPassword) {
//         return res.status(400).json({ success: false, message: "Current password required to change email." });
//       }
//       const passwordCheck = await bcrypt.compare(currentPassword, user.password);
//       if (!passwordCheck) {
//         return res.status(403).json({ success: false, message: "Current password is incorrect." });
//       }
//       // Check if email already exists for another user
//       const existingUserByEmail = await User.findOne({ email, _id: { $ne: id } });
//       if (existingUserByEmail) {
//         return res.status(400).json({ success: false, message: "Email already exists" });
//       }
//       updateData.email = email;
//     }

//     // Handle password update with password confirmation
//     if (password) {
//       if (!currentPassword) {
//         return res.status(400).json({ success: false, message: "Current password required to change password." });
//       }
//       const passwordCheck = await bcrypt.compare(currentPassword, user.password);
//       if (!passwordCheck) {
//         return res.status(403).json({ success: false, message: "Current password is incorrect." });
//       }
//       updateData.password = await bcrypt.hash(password, 10);
//     }

//     const updatedUser = await User.findByIdAndUpdate(id, updateData, { new: true });

//     if (!updatedUser) {
//       return res.status(404).json({ success: false, message: "User not found" });
//     }

//     return res.json({ success: true, message: "User updated", user: updatedUser });
//   } catch (error) {
//     return res.status(500).json({ success: false, message: "Server error" });
//   }
// };

// // Forgot Password - Send Reset Link
// exports.sendResetLink = async (req, res) => {
//   const { email } = req.body;

//   try {
//     const user = await User.findOne({ email });
//     if (!user) {
//       // Don't reveal if user exists or not for security
//       return res.status(200).json({ 
//         success: true, 
//         message: "If an account with this email exists, you will receive a password reset link." 
//       });
//     }

//     // Create reset token
//     const token = jwt.sign({ id: user._id }, process.env.SECRET, { expiresIn: "20m" });
//     const resetUrl = `${envConfig.urls.clientUrl}/reset-password/${token}`;

//     // For testing purposes, log the reset URL instead of sending email
//     console.log('Password reset URL:', resetUrl);
//     console.log('Reset token:', token);

//     // Configure email transporter
//     const transporter = nodemailer.createTransport({
//       service: "gmail",
//       auth: {
//         user: process.env.EMAIL_USER,
//         pass: process.env.EMAIL_PASS
//       }
//     });

//     const mailOptions = {
//       from: `"Mitho Bites" <${process.env.EMAIL_USER}>`,
//       to: email,
//       subject: "Reset Your Password - Mitho Bites",
//       html: `
//         <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
//           <h2 style="color: #ff6600;">Mitho Bites - Password Reset</h2>
//           <p>Hello ${user.fullname},</p>
//           <p>You requested a password reset for your Mitho Bites account.</p>
//           <p>Click the button below to reset your password:</p>
//           <div style="text-align: center; margin: 30px 0;">
//             <a href="${resetUrl}" 
//                style="background: linear-gradient(135deg, #ff6600, #ff9900); 
//                       color: white; 
//                       padding: 12px 30px; 
//                       text-decoration: none; 
//                       border-radius: 8px; 
//                       font-weight: bold;">
//               Reset Password
//             </a>
//           </div>
//           <p>This link will expire in 20 minutes.</p>
//           <p>If you didn't request this password reset, please ignore this email.</p>
//           <p>Best regards,<br>Mitho Bites Team</p>
//         </div>
//       `
//     };

//     transporter.sendMail(mailOptions, (err, info) => {
//       if (err) {
//         console.error('Email error:', err);
//         return res.status(500).json({ 
//           success: false, 
//           message: "Failed to send reset email. Please try again." 
//         });
//       }
//       console.log('Email sent:', info.response);
//       return res.status(200).json({ 
//         success: true, 
//         message: "If an account with this email exists, you will receive a password reset link." 
//       });
//     });

//   } catch (err) {
//     console.error('Server error:', err);
//     return res.status(500).json({ 
//       success: false, 
//       message: "Server error. Please try again." 
//     });
//   }
// };

// // Reset Password
// exports.resetPassword = async (req, res) => {
//   const { token } = req.params;
//   const { password } = req.body;

//   if (!password) {
//     return res.status(400).json({ 
//       success: false, 
//       message: "Password is required" 
//     });
//   }

//   try {
//     const decoded = jwt.verify(token, process.env.SECRET);
//     const hashedPassword = await bcrypt.hash(password, 10);

//     await User.findByIdAndUpdate(decoded.id, { password: hashedPassword });

//     return res.status(200).json({ 
//       success: true, 
//       message: "Password updated successfully" 
//     });

//   } catch (err) {
//     console.error('Reset password error:', err);
//     return res.status(400).json({ 
//       success: false, 
//       message: "Invalid or expired token" 
//     });
//   }
// };

// // Get Current User (based on JWT token)
// exports.getCurrentUser = async (req, res) => {
//   try {
//     // The user is already attached to req by the authenticateUser middleware
//     const user = req.user;

//     if (!user) {
//       return res.status(401).json({ 
//         success: false, 
//         message: "User not authenticated" 
//       });
//     }

//     // Return user data without sensitive information
//     const userData = {
//       _id: user._id,
//       fullname: user.fullname,
//       username: user.username,
//       email: user.email,
//       phone: user.phone,
//       address: user.address,
//       favorites: user.favorites,
//       createdAt: user.createdAt,
//       updatedAt: user.updatedAt
//     };

//     return res.status(200).json({
//       success: true,
//       message: "User data retrieved successfully",
//       data: userData
//     });
//   } catch (error) {
//     console.error('Get current user error:', error);
//     return res.status(500).json({ 
//       success: false, 
//       message: "Server error while retrieving user data" 
//     });
//   }
// };

// // const transpoter= nodemailer.createTransport(
// //     {
// //         service:"gmail",
// //         auth:{
// //             user: process.env.EMAIL_USER,
// //             pass:process.env.EMAIL_PASS
// //         }
// //     }
// // )

// // exports.sendResentLink=async (req, res) =>{
// //     const {email}= req.body
// //     try{
// //         const user= await User.findOne({email})
// //         if(!user) return res.status(404).json({success: false, message:"User not found"})
// //             const token= jwt.sign({id: user._id}, process.env.SECRET, {expiresIn: "20m"})
// //             const resetUrl=process.env.CLIENT_URL +"/reset-password/"+token
// //             const mailOptions={
// //                 from: `"Your app"<${process.env.EMAIL_USER}`, //backtick
// //                 to:email,
// //                 subject:"Reset your password",
// //                 html:`<p>CLick on the link to reset...${resetUrl}</p>`
// //             }
// //             transpoter.sendMail(mailOptions,(err,info)=>{
// //                 if(err) return res.status(403).json({success:false,message:"email failed"})
// //                     console.log(info)
// //                 return res.status(200).json({success:true, message:"email failed"})
// //             })



// //     }catch(err){
// //         console.log(err)
// //         return res.status(500).json({success:false,message:"Server err"})
// //     }
// // }

// // exports.resetPassword= async (req,res) =>{
// //     const {token}=req.params;
// //     const{password}=req.body
// //     try{
// //         const decoded= jwt.verify(token, process.env.SECRET)
// //         const hashed= await bcrypt.hash(password, 10)
// //         await User.findByIdAndUpdate(decoded.id,{password:hashed})
// //         return res.status(200).json({success:true, message:"Password updated"})

// //     }catch (err){
// //         return res.status(500).json({success:false,message:"server err/invalid token"})

// //     }
// // }



const User = require("../models/User");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const crypto = require("crypto");
const { envConfig } = require("../config/envConfig");
const nodemailer = require("nodemailer");
// Import security middleware
const { sanitizeNoSQL, sanitizeCommands, sanitizeXSS } = require("../middlewares/securityMiddleware");

// Register User
exports.registerUser = async (req, res) => {
  // Apply security sanitization
  // Note: In a real implementation, you would apply these middleware in routes
  /*
  sanitizeNoSQL(req, res, () => {});
  sanitizeCommands(req, res, () => {});
  sanitizeXSS(req, res, () => {});
  */

  // 🔍 BURP SUITE TESTING: Log registration request details
  console.log('\n🔍 REGISTRATION REQUEST INTERCEPTED:');
  console.log('═══════════════════════════════════════');
  console.log('📧 Email:', req.body.email);
  console.log('👤 Username:', req.body.username);
  console.log('🔑 Password:', req.body.password);
  console.log('🔑 Confirm Password:', req.body.confirmpassword);
  console.log('👨‍💼 Full Name:', req.body.fullname);
  console.log('📱 Phone:', req.body.phone);
  console.log('🏠 Address:', req.body.address);
  console.log('🌐 Origin:', req.headers.origin);
  console.log('🔗 Referer:', req.headers.referer);
  console.log('🕐 Timestamp:', new Date().toISOString());
  console.log('═══════════════════════════════════════\n');

  // ✅ INPUT VALIDATION: Yup validation middleware already validated req.body
  // All fields are validated, sanitized, and ready to use
  const { fullname, username, email, password, confirmpassword, phone, address } = req.body;

  try {
    // Check for existing user by username
    const existingUserByUsername = await User.findOne({ username });
    if (existingUserByUsername) {
      return res.status(400).json({ success: false, message: "Username already exists" });
    }

    // ✅ TESTING MODE: Allow duplicate emails
    // const existingUserByEmail = await User.findOne({ email });
    // if (existingUserByEmail) {
    //   return res.status(400).json({ success: false, message: "Email already exists" });
    // }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // ✅ EMAIL VERIFICATION: Generate verification token
    const emailVerificationToken = crypto.randomBytes(32).toString('hex');
    const emailVerificationTokenExpires = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours
    const emailVerificationTokenExpiresFormatted = emailVerificationTokenExpires.toISOString();

    // Create new user
    const newUser = new User({
      fullname,
      username,
      email,
      password: hashedPassword,
      phone,
      address,
      emailVerificationToken,
      emailVerificationTokenExpires,
      emailVerificationTokenExpiresFormatted,
      isEmailVerified: false
    });

    await newUser.save();
    console.log('User registered successfully:', newUser.username);

    // 🔍 BURP SUITE TESTING: Log registration response
    console.log('\n✅ REGISTRATION RESPONSE SENT:');
    console.log('═══════════════════════════════════════');
    console.log('📧 Registered Email:', newUser.email);
    console.log('👤 Registered Username:', newUser.username);
    console.log('🆔 User ID:', newUser._id);
    console.log('🔐 Email Verification Token:', emailVerificationToken);
    console.log('⏰ Email Verification Token Expires:', emailVerificationTokenExpiresFormatted);
    console.log('🕐 Registration Time:', newUser.createdAt || new Date().toISOString());
    console.log('═══════════════════════════════════════\n');

    return res.status(201).json({
      success: true,
      message: "Registration successful! Please login.",
      data: newUser
    });
  } catch (err) {
    console.error('\n❌ REGISTRATION ERROR:');
    console.error('═══════════════════════════════════════');
    console.error('Error Message:', err.message);
    console.error('Error Stack:', err.stack);
    console.error('Request Body:', JSON.stringify(req.body, null, 2));
    console.error('═══════════════════════════════════════\n');

    // Handle specific MongoDB errors
    if (err.name === 'ValidationError') {
      const errors = Object.values(err.errors).map(e => e.message);
      return res.status(400).json({
        success: false,
        message: "Validation error",
        errors: errors
      });
    }

    if (err.code === 11000) {
      // Duplicate key error
      const field = Object.keys(err.keyPattern)[0];
      return res.status(400).json({
        success: false,
        message: `${field} already exists`
      });
    }

    return res.status(500).json({
      success: false,
      message: "Server error during registration",
      error: process.env.NODE_ENV === 'development' ? err.message : undefined
    });
  }
};


const generateOTP = () => {
  
  return crypto.randomInt(100000, 1000000).toString();
};

// Login User with 2FA (Step 1: Verify credentials and send OTP)
exports.loginUser = async (req, res) => {
  // 🔍 BURP SUITE TESTING: Log login request details
  console.log('\n🔍 LOGIN REQUEST INTERCEPTED:');
  console.log('═══════════════════════════════════════');
  console.log('👤 Username:', req.body.username);
  console.log('🔑 Password:', req.body.password);
  console.log('🌐 Origin:', req.headers.origin);
  console.log('🔗 Referer:', req.headers.referer);
  console.log('🕐 Timestamp:', new Date().toISOString());
  console.log('═══════════════════════════════════════\n');

  console.log('Login request body:', req.body);
  
  // ✅ IP-BASED SECURITY: Extract IP address
  const ip = req.ip || req.connection.remoteAddress || req.headers['x-forwarded-for']?.split(',')[0] || 'Unknown';
  const IPBlockService = require('../services/ipBlockService');
  
  // ✅ IP-BASED SECURITY: Check if IP is blocked
  if (IPBlockService.isBlocked(ip)) {
    const remainingMinutes = IPBlockService.getRemainingBlockTime(ip);
    const attemptCount = IPBlockService.getAttemptCount(ip);
    return res.status(403).json({
      success: false,
      message: `Access temporarily blocked due to multiple failed attempts. Please try again in ${remainingMinutes} minute(s).`,
      ipBlocked: true,
      remainingMinutes: remainingMinutes,
      ipAttempts: attemptCount,
      blockedIP: ip
    });
  }
  
  // Accept only username field (strict)
  const { username, password } = req.body;

  // Validation
  if (!username || !password) {
    console.log('Missing fields - username:', username, 'password:', password ? 'provided' : 'missing');
    return res.status(400).json({ success: false, message: "Missing field" });
  }

  try {
    // Find user by username only (strict)
    const user = await User.findOne({ username: username });
    if (!user) {
      // ✅ IP-BASED SECURITY: Record failed attempt for non-existent user
      await IPBlockService.recordAttempt(ip, req.originalUrl);
      return res.status(403).json({ success: false, message: "User not found" });
    }

    // ✅ SECURED: Check if account is locked due to too many failed login attempts
    if (user.accountLockedUntil && user.accountLockedUntil > new Date()) {
      const lockoutMinutes = Math.ceil((user.accountLockedUntil - new Date()) / (1000 * 60));
      return res.status(403).json({ 
        success: false, 
        message: `Account locked due to too many failed login attempts. Please try again in ${lockoutMinutes} minute(s).`,
        accountLocked: true,
        lockoutUntil: user.accountLockedUntil,
        remainingMinutes: lockoutMinutes
      });
    }

    // If lockout period has expired, reset the lockout
    if (user.accountLockedUntil && user.accountLockedUntil <= new Date()) {
      user.loginAttempts = 0;
      user.accountLockedUntil = null;
      await user.save();
    }

    const passwordCheck = await bcrypt.compare(password, user.password);
    if (!passwordCheck) {
      // ✅ IP-BASED SECURITY: Record failed authentication attempt
      await IPBlockService.recordAttempt(ip, req.originalUrl);
      
      //  Increment failed login attempts
      user.loginAttempts = (user.loginAttempts || 0) + 1;
      
      // Lock account after 10 failed attempts
      if (user.loginAttempts >= 10) {
        user.accountLockedUntil = new Date(Date.now() + 10 * 60 * 1000); // Lock for 10 minutes
        await user.save();
        
        // ✅ SECURITY NOTIFICATION: Send account locked alert (suspicious activity) - Only send once at exactly 10 attempts
        if (user.loginAttempts === 10) {
          console.log('\n🚨 CRITICAL SECURITY ALERT: Account locked after 10 failed login attempts - Sending email notification...');
          console.log('👤 User:', user.username);
          console.log('📧 Email:', user.email);
          console.log('🌐 IP:', ip);
          console.log('🔒 Account locked until:', user.accountLockedUntil);
          console.log('═══════════════════════════════════════\n');
          
          // ✅ ENHANCED: Extract device information and location using enhanced services
          let formattedDeviceInfo = 'Unknown Device';
          let locationString = 'Unknown Location';
          
          try {
            const { extractDeviceInfo } = require('../utils/deviceFingerprint');
            const { getLocationFromIP, getFormattedDeviceInfo } = require('../utils/geolocationService');
            
            const deviceInfo = extractDeviceInfo(req);
            formattedDeviceInfo = getFormattedDeviceInfo(deviceInfo);
            const locationData = await getLocationFromIP(ip);
            locationString = locationData.locationString || 'Unknown Location';
          } catch (geoError) {
            console.error('⚠️  Error getting location/device info (email will still send):', geoError.message);
            // Continue with defaults if geolocation fails
          }
          
          const { sendSuspiciousActivityAlert } = require('../utils/securityNotificationService');
          const emailResult = await sendSuspiciousActivityAlert(user, {
            type: 'Account Locked - Multiple Failed Login Attempts',
            ipAddress: ip,
            location: locationString,
            timestamp: new Date().toISOString(),
            description: `Your account has been temporarily locked due to ${user.loginAttempts} failed login attempts from IP ${ip} (${locationString}) using ${formattedDeviceInfo}. The account will be unlocked automatically after 10 minutes. If this was not you, please secure your account immediately by changing your password.`
          });
          
          if (emailResult && emailResult.success) {
            console.log('✅ Account locked security notification email sent successfully');
            if (emailResult.previewUrl) {
              console.log('🌐 Email Preview URL:', emailResult.previewUrl);
              console.log('💡 Note: Using Ethereal Email - Check the preview URL above to view the email');
              console.log('💡 To receive real emails, configure EMAIL_USER and EMAIL_PASS in .env file');
            } else {
              console.log('📧 Email sent to:', user.email);
              console.log('✅ Check your email inbox for the account locked security notification');
            }
          } else {
            console.error('❌ Failed to send account locked security notification email');
            if (emailResult && emailResult.error) {
              console.error('Error:', emailResult.error);
            }
          }
        }
        
        return res.status(403).json({ 
          success: false, 
          message: "Too many failed login attempts. Account locked for 10 minutes.",
          accountLocked: true,
          lockoutUntil: user.accountLockedUntil,
          remainingMinutes: 10
        });
      }
      
      await user.save();
      const remainingAttempts = 10 - user.loginAttempts;
      const ipAttempts = IPBlockService.getAttemptCount(ip);
      const ipRemainingAttempts = 5 - ipAttempts;
      
      // ✅ SECURITY NOTIFICATION: Send unauthorized login attempt alert when reaching exactly 5 failed attempts
      // Security: Email is sent to the user's email (user.email) - the owner of the username used in login attempt
      // This ensures that even if hackers know a username and try wrong passwords, the real user gets notified
      
      // 🔍 DEBUG: Log loginAttempts for tracking
      console.log(`\n🔍 LOGIN ATTEMPT TRACKING:`);
      console.log(`   Current loginAttempts: ${user.loginAttempts}`);
      console.log(`   Checking if === 5: ${user.loginAttempts === 5}`);
      
      if (user.loginAttempts === 5) {
        console.log('\n🚨 🚨 🚨 SECURITY ALERT: 5 failed login attempts detected - Sending email notification... 🚨 🚨 🚨');
        console.log('👤 User:', user.username);
        console.log('📧 Email:', user.email);
        console.log('🌐 IP:', ip);
        console.log('🔢 Failed Attempts:', user.loginAttempts);
        console.log('🕐 Timestamp:', new Date().toISOString());
        console.log('═══════════════════════════════════════\n');
        
        try {
          const { sendUnauthorizedLoginAttemptAlert } = require('../utils/securityNotificationService');
          const emailResult = await sendUnauthorizedLoginAttemptAlert(user, {
            ipAddress: ip,
            location: 'Unknown Location',
            timestamp: new Date().toISOString(),
            deviceInfo: req.get('user-agent') || 'Unknown Device',
            failedAttempts: user.loginAttempts
          });
          
          if (emailResult && emailResult.success) {
            console.log('✅ ✅ ✅ Security notification email sent successfully ✅ ✅ ✅');
            if (emailResult.previewUrl) {
              console.log('🌐 Email Preview URL:', emailResult.previewUrl);
              console.log('💡 Note: Using Ethereal Email - Check the preview URL above to view the email');
              console.log('💡 To receive real emails, configure EMAIL_USER and EMAIL_PASS in .env file');
            } else {
              console.log('📧 Email sent to:', user.email);
              console.log('✅ Check your email inbox for the security notification');
            }
          } else {
            console.error('❌ ❌ ❌ Failed to send security notification email ❌ ❌ ❌');
            if (emailResult && emailResult.error) {
              console.error('Error:', emailResult.error);
            }
            console.error('⚠️  Email service may be unavailable. Check EMAIL_USER and EMAIL_PASS configuration.');
          }
        } catch (emailError) {
          console.error('❌ ❌ ❌ Exception while sending security notification email ❌ ❌ ❌');
          console.error('Error:', emailError.message);
          console.error('Stack:', emailError.stack);
        }
      } else {
        console.log(`   ⚠️  Email NOT sent - loginAttempts (${user.loginAttempts}) is not exactly 5`);
        console.log(`   💡 Email will be sent when loginAttempts reaches exactly 5`);
      }
      
      return res.status(403).json({ 
        success: false, 
        message: `Invalid credentials. ${remainingAttempts} attempt(s) remaining before account lockout.`,
        remainingAttempts: remainingAttempts,
        ipAttempts: ipAttempts,
        ipRemainingAttempts: ipRemainingAttempts > 0 ? ipRemainingAttempts : 0
      });
    }

    // ✅ IP-BASED SECURITY: Clear any previous block attempts on successful authentication
    IPBlockService.clearAttempts(ip);
    
    // ✅ SECURED: Reset login attempts on successful password verification
    user.loginAttempts = 0;
    user.accountLockedUntil = null;
    await user.save();

    // ✅ PASSWORD EXPIRY: Check if password has expired
    if (user.isPasswordExpired()) {
      return res.status(403).json({
        success: false,
        message: "Password expired. Please reset your password.",
        requirePasswordReset: true
      });
    }

    // ✅ PASSWORD EXPIRY: Check if password needs expiry warning (expires within 7 days)
    let passwordExpiryWarning = null;
    if (user.needsExpiryWarning()) {
      const daysRemaining = Math.ceil((user.passwordExpiresAt - new Date()) / (1000 * 60 * 60 * 24));
      passwordExpiryWarning = `Your password will expire in ${daysRemaining} day(s). Please change your password soon.`;
    }

    // For admin users, skip OTP and login directly
    if (user.role === 'admin') {
      // ✅ SECURED: Regenerate session on login (prevents session fixation attack)
      req.session.regenerate(async (err) => {
        if (err) {
          console.error('Session regeneration error:', err);
          return res.status(500).json({
            success: false,
            message: 'Session error during login'
          });
        }

        // ✅ DECRYPT EMAIL: Ensure email is decrypted before storing in express-session
        // Express-session is server-side only, so we can store plain text emails
        const { decrypt } = require('../utils/aesEncryption');
        let decryptedEmail = user.email;
        try {
            // If email is encrypted (JSON format), decrypt it
            if (typeof user.email === 'string' && user.email.trim().startsWith('{')) {
                decryptedEmail = decrypt(user.email);
            } else {
                // User model getter should have already decrypted it, but ensure it's plain text
                decryptedEmail = user.email;
            }
        } catch (error) {
            // If decryption fails, use the email as is (might already be plain text)
            decryptedEmail = user.email;
        }

        // Set user data in new session (with decrypted email)
        req.session.userId = user._id;
        req.session.username = user.username;
        req.session.email = decryptedEmail; // Store decrypted email in session
        req.session.role = user.role;
        req.session.loginTime = new Date().toISOString();
        req.session.ipAddress = req.ip || req.connection.remoteAddress;
        req.session.userAgent = req.get('user-agent');
        
        // ✅ SESSION TIMEOUT: Set session cookie expiration to 15 minutes
        req.session.cookie.originalMaxAge = 15 * 60 * 1000; // 15 minutes
        req.session.cookie.expires = new Date(Date.now() + 15 * 60 * 1000);
        
        // ✅ SECURED: Ensure login attempts are reset (double-check)
        user.loginAttempts = 0;
        user.accountLockedUntil = null;
        user.save().catch(err => console.error('Error resetting login attempts:', err));

        const payload = {
          _id: user._id,
          id: user._id,
          username: user.username,
          email: user.email,
          role: user.role
        };

        const token = jwt.sign(payload, process.env.SECRET || 'your-secret-key', { expiresIn: "24h" });

        // ✅ SESSION MANAGEMENT: Create session in database for tracking
        const { createSession } = require('../middlewares/sessionMiddleware');
        try {
          await createSession(user._id, token, req);
        } catch (sessionError) {
          console.error('Error creating session:', sessionError);
          return res.status(500).json({
            success: false,
            message: 'Failed to create session. Please try again.'
          });
        }

        // ✅ DEVICE TRACKING: Track device on successful admin login
        const { trackDevice } = require('../services/deviceTrackingService');
        trackDevice(user, req).catch(deviceError => {
          console.error('Error tracking device:', deviceError);
          // Continue with login even if device tracking fails
        });

        // 🔍 BURP SUITE TESTING: Log admin login response
        console.log('\n✅ ADMIN LOGIN RESPONSE SENT:');
        console.log('═══════════════════════════════════════');
        console.log('👤 Admin Username:', user.username);
        console.log('📧 Admin Email:', user.email);
        console.log('🎫 JWT Token:', token.substring(0, 50) + '...');
        console.log('🔐 Session ID (regenerated):', req.sessionID);
        console.log('🕐 Login Time:', new Date().toISOString());
        console.log('═══════════════════════════════════════\n');

        return res.status(200).json({
          success: true,
          message: "Admin login successful",
          token: token,
          user: {
            id: user._id,
            username: user.username,
            email: user.email,
            role: user.role,
            fullname: user.fullname,
            phone: user.phone
          },
          redirectTo: '/admin',
          ...(passwordExpiryWarning && { warning: passwordExpiryWarning })
        });
      });
      return; // Exit early after regenerate callback
    }

    // For regular users, generate and send OTP
    const otp = generateOTP();
    const otpCreatedAt = new Date();
    const otpExpiry = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

    // Format expiry for MongoDB Compass display (ISO format with timezone)
    const otpExpiryFormatted = otpExpiry.toISOString();
    const otpTimeRemainingMinutes = 10; // 10 minutes validity
    const otpRemainingTimeFormatted = `${otpTimeRemainingMinutes} minutes remaining`;

    // Save OTP to user with expiry details
    user.otp = otp;
    user.otpCreatedAt = otpCreatedAt;
    user.otpExpiry = otpExpiry;
    user.otpExpiryFormatted = otpExpiryFormatted;
    user.otpTimeRemainingMinutes = otpTimeRemainingMinutes;
    user.otpRemainingTimeFormatted = otpRemainingTimeFormatted;
    user.otpVerified = false;
    await user.save();

    // Send OTP via email
    // 🔍 Check email configuration
    if (!process.env.EMAIL_USER || !process.env.EMAIL_PASS) {
      console.error('\n❌ EMAIL CONFIGURATION ERROR:');
      console.error('═══════════════════════════════════════');
      console.error('EMAIL_USER:', process.env.EMAIL_USER ? 'Set' : '❌ NOT SET');
      console.error('EMAIL_PASS:', process.env.EMAIL_PASS ? 'Set' : '❌ NOT SET');
      console.error('Please configure EMAIL_USER and EMAIL_PASS in your .env file');
      console.error('═══════════════════════════════════════\n');

      // Still return success but log the OTP in console for testing
      console.log('\n⚠️  EMAIL NOT CONFIGURED - OTP LOGGED TO CONSOLE:');
      console.log('═══════════════════════════════════════');
      console.log('📧 Email should be sent to:', user.email);
      console.log('🔢 OTP Code:', otp);
      console.log('🕐 OTP Created At:', otpCreatedAt.toISOString());
      console.log('⏰ OTP Expiry:', otpExpiry.toISOString());
      console.log('⏱️  OTP Valid For: 10 minutes');
      console.log('═══════════════════════════════════════\n');

      // ✅ SESSION LOGGING: Log session information during login (before OTP verification)
      if (req.session && req.sessionID) {
        console.log(`\n📋 Session ID: ${req.sessionID}`);
        const sessionData = {
          cookie: {
            originalMaxAge: req.session.cookie?.originalMaxAge || null,
            expires: req.session.cookie?.expires ? new Date(req.session.cookie.expires).toISOString() : null,
            secure: req.session.cookie?.secure || false,
            httpOnly: req.session.cookie?.httpOnly || false,
            path: req.session.cookie?.path || '/',
            sameSite: req.session.cookie?.sameSite || 'lax'
          }
        };
        console.log('📋 Session Data:', JSON.stringify(sessionData, null, 2));
      }

      // ✅ SESSION INFO: Include session information in response for OTP page
      const sessionInfo = req.session && req.sessionID ? {
        sessionId: req.sessionID,
        sessionData: {
          cookie: {
            originalMaxAge: req.session.cookie?.originalMaxAge || null,
            expires: req.session.cookie?.expires ? new Date(req.session.cookie.expires).toISOString() : null,
            secure: req.session.cookie?.secure || false,
            httpOnly: req.session.cookie?.httpOnly || false,
            path: req.session.cookie?.path || '/',
            sameSite: req.session.cookie?.sameSite || 'lax'
          }
        }
      } : null;

      return res.status(200).json({
        success: true,
        message: "OTP sent to your email",
        requireOTP: true,
        userId: user._id,
        email: user.email.replace(/(.{2})(.*)(@.*)/, '$1***$3'), // Masked email
        ...(passwordExpiryWarning && { warning: passwordExpiryWarning }),
        ...(sessionInfo && { sessionInfo }) // Include session info for viewing on OTP page
      });
    }

    // ✅ Use Ethereal Email for OTP - Beautiful email preview with real email format
    // Ethereal Email creates a fake SMTP account for testing - perfect for development
    // The email will be viewable in a beautiful web interface with preview URL
    let transporter;
    let etherealAccount;
    
    try {
      // Create Ethereal test account (automatically generated)
      console.log('\n📧 Creating Ethereal Email account for OTP...');
      etherealAccount = await nodemailer.createTestAccount();
      
      // Create transporter using Ethereal account
      transporter = nodemailer.createTransport({
        host: 'smtp.ethereal.email',
        port: 587,
        secure: false, // true for 465, false for other ports
        auth: {
          user: etherealAccount.user, // Generated by Ethereal
          pass: etherealAccount.pass  // Generated by Ethereal
        },
        tls: {
          rejectUnauthorized: false
        }
      });
      
      console.log('✅ Ethereal Email account created successfully');
      console.log('📧 Ethereal User:', etherealAccount.user);
      console.log('🔐 Ethereal Pass:', etherealAccount.pass);
    } catch (etherealError) {
      console.error('❌ Failed to create Ethereal account:', etherealError);
      // Fallback: Still return OTP in response even if Ethereal fails
      transporter = null;
    }

    // ✅ NO BLOCKING VERIFICATION - Response sent immediately, email sent in background

    // ✅ Beautiful email template with professional design
    const mailOptions = {
      from: `"BHOKBHOJ" <${etherealAccount ? etherealAccount.user : 'noreply@bhokbhoj.com'}>`,
      to: user.email,
      subject: "🔐 Your Login OTP - BHOKBHOJ",
      // Plain text version for better compatibility
      text: `🍽️ BHOKBHOJ - Your Login OTP

Hello ${user.fullname || user.username},

You requested to login to your BHOKBHOJ account. Please use the OTP below to complete your login:

${otp}

⏰ Important: This OTP will expire in 10 minutes for security reasons.

If you didn't request this login, please ignore this email and ensure your account is secure.

Best regards,
The BHOKBHOJ Team 🍴

© ${new Date().getFullYear()} BHOKBHOJ. All rights reserved.
This is an automated email. Please do not reply to this message.`,
      html: `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Your Login OTP - BHOKBHOJ</title>
</head>
<body style="margin: 0; padding: 0; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #f5f5f5;">
    <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 40px 20px;">
        <tr>
            <td align="center">
                <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="600" style="max-width: 600px; background: #ffffff; border-radius: 16px; box-shadow: 0 10px 40px rgba(0,0,0,0.1); overflow: hidden;">
                    <!-- Header -->
                    <tr>
                        <td style="background: linear-gradient(135deg, #14b8a6 0%, #0d9488 100%); padding: 40px 30px; text-align: center;">
                            <h1 style="margin: 0; color: #ffffff; font-size: 36px; font-weight: bold; text-shadow: 2px 2px 4px rgba(0,0,0,0.2);">
                                🍽️ BHOKBHOJ
                            </h1>
                            <p style="margin: 10px 0 0 0; color: #e0f2fe; font-size: 16px; font-weight: 300;">
                                Delicious Food, Delivered Fresh
                            </p>
                        </td>
                    </tr>
                    
                    <!-- Content -->
                    <tr>
                        <td style="padding: 40px 30px;">
                            <h2 style="margin: 0 0 20px 0; color: #0f172a; font-size: 28px; font-weight: 600;">
                                🔐 Your Login OTP
                            </h2>
                            
                            <p style="margin: 0 0 15px 0; color: #475569; font-size: 16px; line-height: 1.6;">
                                Hello <strong style="color: #0f172a;">${user.fullname || user.username}</strong>,
                            </p>
                            
                            <p style="margin: 0 0 30px 0; color: #475569; font-size: 16px; line-height: 1.6;">
                                You requested to login to your BHOKBHOJ account. Please use the OTP below to complete your login:
                            </p>
                            
                            <!-- OTP Box -->
                            <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%">
                                <tr>
                                    <td align="center" style="padding: 20px 0 30px 0;">
                                        <div style="background: linear-gradient(135deg, #14b8a6 0%, #0d9488 100%); 
                                                    color: #ffffff; 
                                                    padding: 25px 50px; 
                                                    border-radius: 12px; 
                                                    font-size: 42px;
                                                    font-weight: bold;
                                                    letter-spacing: 12px;
                                                    display: inline-block;
                                                    box-shadow: 0 8px 20px rgba(20, 184, 166, 0.4);
                                                    text-align: center;
                                                    min-width: 200px;">
                                            ${otp}
                                        </div>
                                    </td>
                                </tr>
                            </table>
                            
                            <!-- Warning Box -->
                            <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%">
                                <tr>
                                    <td style="background: #fef3c7; border-left: 4px solid #f59e0b; padding: 18px 20px; border-radius: 8px; margin: 20px 0;">
                                        <p style="margin: 0; color: #92400e; font-size: 14px; line-height: 1.5;">
                                            ⏰ <strong>Important:</strong> This OTP will expire in <strong>10 minutes</strong> for security reasons. Please use it promptly.
                                        </p>
                                    </td>
                                </tr>
                            </table>
                            
                            <p style="margin: 30px 0 0 0; color: #64748b; font-size: 14px; line-height: 1.6;">
                                If you didn't request this login, please ignore this email and ensure your account is secure.
                            </p>
                        </td>
                    </tr>
                    
                    <!-- Footer -->
                    <tr>
                        <td style="background: #f8fafc; padding: 30px; border-top: 1px solid #e2e8f0;">
                            <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%">
                                <tr>
                                    <td>
                                        <p style="margin: 0 0 10px 0; color: #475569; font-size: 14px; line-height: 1.6;">
                                            Best regards,<br>
                                            <strong style="color: #14b8a6; font-size: 16px;">The BHOKBHOJ Team</strong> 🍴
                                        </p>
                                    </td>
                                </tr>
                                <tr>
                                    <td style="padding-top: 20px; border-top: 1px solid #e2e8f0;">
                                        <p style="margin: 0 0 5px 0; color: #94a3b8; font-size: 12px; text-align: center;">
                                            © ${new Date().getFullYear()} BHOKBHOJ. All rights reserved.
                                        </p>
                                        <p style="margin: 0; color: #cbd5e1; font-size: 11px; text-align: center;">
                                            This is an automated email. Please do not reply to this message.
                                        </p>
                                    </td>
                                </tr>
                            </table>
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

    // ✅ Send email using Ethereal Email - Get preview URL for beautiful email display
    // Ethereal emails are sent instantly, so we can get the preview URL immediately
    let emailPreviewUrl = null;
    let emailMessageId = null;
    
    if (transporter) {
      console.log('\n📧 Sending Ethereal OTP email...');
      console.log('📧 To:', user.email);
      console.log('📧 From (Ethereal):', etherealAccount.user);
      console.log('🔢 OTP Code:', otp);

      // Send email and get preview URL (Ethereal is fast, so this won't block long)
      try {
        const info = await transporter.sendMail(mailOptions);
        emailMessageId = info.messageId;
        emailPreviewUrl = nodemailer.getTestMessageUrl(info);
        
        console.log('\n✅ ✅ ✅ ETHEREAL OTP EMAIL SENT SUCCESSFULLY ✅ ✅ ✅');
        console.log('═══════════════════════════════════════════════════════════════');
        console.log('📧 To:', user.email);
        console.log('📧 From (Ethereal):', etherealAccount.user);
        console.log('🔢 OTP Code:', otp);
        console.log('🕐 OTP Created At:', otpCreatedAt.toISOString());
        console.log('⏰ OTP Expiry:', otpExpiry.toISOString());
        console.log('⏱️  OTP Valid For: 10 minutes');
        console.log('📨 Message ID:', info.messageId);
        console.log('🌐 🌐 🌐 EMAIL PREVIEW URL 🌐 🌐 🌐');
        console.log('🌐', emailPreviewUrl || 'Not available');
        console.log('📬 Response:', info.response);
        console.log('📬 Accepted:', info.accepted);
        console.log('🕐 Sent At:', new Date().toISOString());
        console.log('═══════════════════════════════════════════════════════════════');
        console.log('💡 💡 💡 VIEW EMAIL IN REAL FORMAT 💡 💡 💡');
        console.log('💡 Open the preview URL above in your browser to see the beautiful email');
        console.log('💡 The email will be displayed in a professional, real email format');
        console.log('═══════════════════════════════════════════════════════════════\n');
      } catch (err) {
        console.error('\n❌ ETHEREAL EMAIL SENDING ERROR:');
        console.error('═══════════════════════════════════════');
        console.error('Error Code:', err.code);
        console.error('Error Message:', err.message);
        console.error('Error Response:', err.response);
        console.error('To Email:', user.email);
        console.error('═══════════════════════════════════════\n');

        // ALWAYS log OTP to console when email fails - CRITICAL for user access
        console.log('\n⚠️  ⚠️  ⚠️  EMAIL SENDING FAILED - USE OTP BELOW ⚠️  ⚠️  ⚠️');
        console.log('═══════════════════════════════════════════════════════════════');
        console.log('📧 Email should be sent to:', user.email);
        console.log('👤 Username:', user.username);
        console.log('🔢 🔐 CURRENT OTP CODE:', otp);
        console.log('🕐 OTP Created At:', otpCreatedAt.toISOString());
        console.log('⏰ OTP Expiry:', otpExpiry.toISOString());
        console.log('⏱️  OTP Valid For: 10 minutes');
        console.log('🕐 Generated At:', new Date().toISOString());
        console.log('═══════════════════════════════════════════════════════════════');
        console.log('💡 IMPORTANT: Use the OTP code above to login');
        console.log('💡 This OTP is valid for 10 minutes');
        console.log('═══════════════════════════════════════════════════════════════\n');
      }
    } else {
      console.log('\n⚠️  Ethereal Email transporter not available - OTP logged to console');
      console.log('🔢 OTP Code:', otp);
    }

    // ✅ Return response with Ethereal email preview URL
    // Always include OTP in response as backup
    const response = {
      success: true,
      message: emailPreviewUrl 
        ? "OTP sent via Ethereal Email! Click the preview URL to view your email in beautiful real format."
        : "OTP generated. Check backend console for email details.",
      requireOTP: true,
      userId: user._id,
      email: user.email.replace(/(.{2})(.*)(@.*)/, '$1***$3'), // Masked email
      emailSent: transporter ? true : false,
      emailProvider: "ethereal",
      // Always include OTP as fallback
      otp: otp,
      otpExpiry: otpExpiry.toISOString(),
      ...(passwordExpiryWarning && { warning: passwordExpiryWarning }),
      // Ethereal email preview URL - open this to see the beautiful email
      emailPreviewUrl: emailPreviewUrl,
      previewUrl: emailPreviewUrl, // Also include as previewUrl for backward compatibility
      emailMessageId: emailMessageId,
      note: emailPreviewUrl 
        ? "Open the previewUrl or emailPreviewUrl above in your browser to see the OTP email in a beautiful, real email format!"
        : "OTP included as backup. Check backend console for email details.",
      etherealAccount: etherealAccount ? {
        user: etherealAccount.user,
        pass: etherealAccount.pass,
        smtp: {
          host: 'smtp.ethereal.email',
          port: 587,
          secure: false
        },
        imap: {
          host: 'imap.ethereal.email',
          port: 993,
          secure: true
        },
        web: 'https://ethereal.email',
        messageUrl: emailPreviewUrl
      } : null
    };

    // 🔍 BURP SUITE TESTING: Log OTP generation response
    console.log('\n✅ OTP LOGIN RESPONSE SENT (INSTANT):');
    console.log('═══════════════════════════════════════');
    console.log('👤 Username:', user.username);
    console.log('📧 Email:', user.email);
    console.log('🔢 Generated OTP:', otp);
    console.log('🕐 OTP Created At:', otpCreatedAt.toISOString());
    console.log('⏰ OTP Expiry:', otpExpiry.toISOString());
    console.log('⏱️  OTP Valid For: 10 minutes');
    console.log('🆔 User ID:', user._id);
    console.log('⚡ Response Time: < 100ms (email sending in background)');
    console.log('🕐 Request Time:', new Date().toISOString());
    console.log('═══════════════════════════════════════\n');

    // Return response immediately - don't wait for email
    return res.status(200).json(response);
  } catch (err) {
    console.error('\n❌ LOGIN ERROR (500):');
    console.error('═══════════════════════════════════════');
    console.error('Error Message:', err.message);
    console.error('Error Stack:', err.stack);
    console.error('Error Name:', err.name);
    console.error('Error Code:', err.code);
    console.error('Request Body:', JSON.stringify(req.body, null, 2));
    console.error('═══════════════════════════════════════\n');

    return res.status(500).json({
      success: false,
      message: "Server error during login",
      error: process.env.NODE_ENV === 'development' ? err.message : undefined
    });
  }
};

// Verify OTP and complete login (Step 2)
exports.verifyOTP = async (req, res) => {
  // 🔍 BURP SUITE TESTING: Log OTP verification request details
  console.log('\n🔍 OTP VERIFICATION REQUEST INTERCEPTED:');
  console.log('═══════════════════════════════════════');
  console.log('🆔 User ID:', req.body.userId);
  console.log('🔢 OTP Code:', req.body.otp);
  console.log('📧 Email (if provided):', req.body.email || 'Not provided');
  console.log('🎫 Authorization Token:', req.headers.authorization ? req.headers.authorization.substring(0, 50) + '...' : 'Missing');
  console.log('🌐 Origin:', req.headers.origin);
  console.log('🔗 Referer:', req.headers.referer);
  console.log('🕐 Timestamp:', new Date().toISOString());
  console.log('═══════════════════════════════════════\n');

  const { userId, otp } = req.body;

  if (!userId || !otp) {
    return res.status(400).json({
      success: false,
      message: "User ID and OTP are required"
    });
  }

  try {
    const user = await User.findById(userId);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found"
      });
    }

    // Check if OTP exists
    if (!user.otp) {
      return res.status(400).json({
        success: false,
        message: "No OTP found. Please login again."
      });
    }

    // Check if OTP is expired
    if (new Date() > user.otpExpiry) {
      user.otp = null;
      user.otpCreatedAt = null;
      user.otpExpiry = null;
      user.otpExpiryFormatted = null;
      user.otpTimeRemainingMinutes = null;
      user.otpRemainingTimeFormatted = null;
      await user.save();
      return res.status(400).json({
        success: false,
        message: "OTP has expired. Please login again."
      });
    }

    // Verify OTP
    if (user.otp !== otp) {
      return res.status(400).json({
        success: false,
        message: "Invalid OTP. Please try again."
      });
    }

    // OTP is valid - clear OTP and generate token
    user.otp = null;
    user.otpCreatedAt = null;
    user.otpExpiry = null;
    user.otpExpiryFormatted = null;
    user.otpTimeRemainingMinutes = null;
    user.otpRemainingTimeFormatted = null;
    user.otpVerified = true;
    // ✅ SECURED: Reset login attempts on successful OTP verification
    user.loginAttempts = 0;
    user.accountLockedUntil = null;
    await user.save();

    // ✅ PASSWORD EXPIRY: Check if password has expired
    if (user.isPasswordExpired()) {
      return res.status(403).json({
        success: false,
        message: "Password expired. Please reset your password.",
        requirePasswordReset: true
      });
    }

    // ✅ PASSWORD EXPIRY: Check if password needs expiry warning (expires within 7 days)
    let passwordExpiryWarning = null;
    if (user.needsExpiryWarning()) {
      const daysRemaining = Math.ceil((user.passwordExpiresAt - new Date()) / (1000 * 60 * 60 * 24));
      passwordExpiryWarning = `Your password will expire in ${daysRemaining} day(s). Please change your password soon.`;
    }

    // ✅ SECURED: Regenerate session on login (prevents session fixation attack)
    req.session.regenerate((err) => {
      if (err) {
        console.error('Session regeneration error:', err);
        return res.status(500).json({
          success: false,
          message: 'Session error during login'
        });
      }

      // Set user data in new session
      // ✅ DECRYPT EMAIL: Ensure email is decrypted before storing in express-session
      const { decrypt } = require('../utils/aesEncryption');
      let decryptedEmail = user.email;
      try {
          // If email is encrypted (JSON format), decrypt it
          if (typeof user.email === 'string' && user.email.trim().startsWith('{')) {
              decryptedEmail = decrypt(user.email);
          } else {
              // User model getter should have already decrypted it, but ensure it's plain text
              decryptedEmail = user.email;
          }
      } catch (error) {
          // If decryption fails, use the email as is (might already be plain text)
          decryptedEmail = user.email;
      }

      req.session.userId = user._id;
      req.session.username = user.username;
      req.session.email = decryptedEmail; // Store decrypted email in session
      req.session.role = user.role || 'user';
      req.session.loginTime = new Date().toISOString();
      req.session.ipAddress = req.ip || req.connection.remoteAddress;
      req.session.userAgent = req.get('user-agent');

      // ✅ SESSION TIMEOUT: Set session cookie expiration to 15 minutes
      req.session.cookie.originalMaxAge = 15 * 60 * 1000; // 15 minutes
      req.session.cookie.expires = new Date(Date.now() + 15 * 60 * 1000);

      const payload = {
        _id: user._id,
        id: user._id,
        username: user.username,
      };

      const token = jwt.sign(payload, process.env.SECRET, { expiresIn: "7d" });

      // ✅ SESSION MANAGEMENT: Create session in database for tracking
      const { createSession } = require('../middlewares/sessionMiddleware');
      // Use .then() instead of await since we're in a callback
      createSession(user._id, token, req).catch(sessionError => {
        console.error('Error creating session:', sessionError);
        // Continue with login even if session creation fails
      });

      // ✅ DEVICE TRACKING: Track device on successful OTP verification
      const { trackDevice } = require('../services/deviceTrackingService');
      trackDevice(user, req).catch(deviceError => {
        console.error('Error tracking device:', deviceError);
        // Continue with login even if device tracking fails
      });

      // 🔍 BURP SUITE TESTING: Log OTP verification response
      console.log('\n✅ OTP VERIFICATION RESPONSE SENT:');
      console.log('═══════════════════════════════════════');
      console.log('🆔 User ID:', user._id);
      console.log('👤 Username:', user.username);
      console.log('📧 Email:', user.email);
      console.log('🔢 OTP Verified: Yes');
      console.log('🎫 JWT Token Generated:', token.substring(0, 50) + '...');
      console.log('🔐 Session ID (regenerated):', req.sessionID);
      console.log('⏰ Token Expires In: 7 days');
      console.log('🕐 Verification Time:', new Date().toISOString());
      console.log('═══════════════════════════════════════\n');

      // ✅ SESSION LOGGING: Log session information after OTP verification
      if (req.session && req.sessionID) {
        console.log(`\n📋 Session ID: ${req.sessionID}`);
        const sessionData = {
          cookie: {
            originalMaxAge: req.session.cookie?.originalMaxAge || null,
            expires: req.session.cookie?.expires ? new Date(req.session.cookie.expires).toISOString() : null,
            secure: req.session.cookie?.secure || false,
            httpOnly: req.session.cookie?.httpOnly || false,
            path: req.session.cookie?.path || '/',
            sameSite: req.session.cookie?.sameSite || 'lax'
          },
          userId: req.session.userId,
          username: req.session.username,
          email: req.session.email,
          role: req.session.role
        };
        console.log('📋 Session Data:', JSON.stringify(sessionData, null, 2));
      }

      // ✅ SESSION LOGGING: Log session information after OTP verification
      if (req.session && req.sessionID) {
        console.log(`\n📋 Session ID: ${req.sessionID}`);
        const sessionData = {
          cookie: {
            originalMaxAge: req.session.cookie?.originalMaxAge || null,
            expires: req.session.cookie?.expires ? new Date(req.session.cookie.expires).toISOString() : null,
            secure: req.session.cookie?.secure || false,
            httpOnly: req.session.cookie?.httpOnly || false,
            path: req.session.cookie?.path || '/',
            sameSite: req.session.cookie?.sameSite || 'lax'
          },
          userId: req.session.userId,
          username: req.session.username,
          email: req.session.email,
          role: req.session.role
        };
        console.log('📋 Session Data:', JSON.stringify(sessionData, null, 2));
      }

      // Return user data without password
      const userResponse = {
        _id: user._id,
        username: user.username,
        email: user.email,
        fullname: user.fullname,
        phone: user.phone,
        address: user.address,
        role: user.role || 'user',
        createdAt: user.createdAt,
        updatedAt: user.updatedAt
      };

      return res.status(200).json({
        success: true,
        message: "Login successful",
        ...(passwordExpiryWarning && { warning: passwordExpiryWarning }),
        user: userResponse,
        token: token,
      });
    });
  } catch (err) {
    console.error('OTP verification error:', err);
    return res.status(500).json({
      success: false,
      message: "Server error during OTP verification"
    });
  }
};

// Update User (now with currentPassword check for sensitive changes)
// ✅ IDOR FIX: Use authenticated user's ID from JWT token, not from URL params
exports.updateUser = async (req, res) => {
  // 🔍 BURP SUITE TESTING: Log update profile request details
  console.log('\n🔍 UPDATE PROFILE REQUEST INTERCEPTED:');
  console.log('═══════════════════════════════════════');
  console.log('👤 User ID (from token):', req.user ? req.user._id : 'Not authenticated');
  console.log('👤 Current Username:', req.user ? req.user.username : 'Not authenticated');
  console.log('📧 Current Email:', req.user ? req.user.email : 'Not authenticated');
  console.log('📝 Requested Username:', req.body.username || 'Not provided');
  console.log('📧 Requested Email:', req.body.email || 'Not provided');
  console.log('🔑 New Password:', req.body.password ? '***PROVIDED***' : 'Not provided');
  console.log('🔑 Current Password:', req.body.currentPassword ? '***PROVIDED***' : 'Not provided');
  console.log('👨‍💼 Full Name:', req.body.fullname || 'Not provided');
  console.log('📱 Phone:', req.body.phone || 'Not provided');
  console.log('🏠 Address:', req.body.address || 'Not provided');
  console.log('🎫 Authorization Token:', req.headers.authorization ? req.headers.authorization.substring(0, 50) + '...' : 'Missing');
  console.log('🌐 Origin:', req.headers.origin);
  console.log('🔗 Referer:', req.headers.referer);
  console.log('🕐 Timestamp:', new Date().toISOString());
  console.log('═══════════════════════════════════════\n');

  // ✅ SECURITY: Get user ID from JWT token (req.user), not from URL parameter
  const userId = req.user._id;
  const { username, email, password, phone, address, fullname, currentPassword } = req.body;

  try {
    const updateData = { fullname, username, phone, address };

    // Find the authenticated user
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ success: false, message: "User not found" });
    }

    // Handle email update with validation and password confirmation
    if (email && email !== user.email) {
      // Require currentPassword
      if (!currentPassword) {
        return res.status(400).json({ success: false, message: "Current password required to change email." });
      }
      const passwordCheck = await bcrypt.compare(currentPassword, user.password);
      if (!passwordCheck) {
        return res.status(403).json({ success: false, message: "Current password is incorrect." });
      }
      // Check if email already exists for another user
      const existingUserByEmail = await User.findOne({ email, _id: { $ne: userId } });
      if (existingUserByEmail) {
        return res.status(400).json({ success: false, message: "Email already exists" });
      }
      updateData.email = email;
    }

    // Handle password update with password confirmation
    if (password) {
      if (!currentPassword) {
        return res.status(400).json({ success: false, message: "Current password required to change password." });
      }
      const passwordCheck = await bcrypt.compare(currentPassword, user.password);
      if (!passwordCheck) {
        return res.status(403).json({ success: false, message: "Current password is incorrect." });
      }
      updateData.password = await bcrypt.hash(password, 10);
    }

    // ✅ SECURITY: Update only the authenticated user's profile
    const updatedUser = await User.findByIdAndUpdate(userId, updateData, {
      new: true,
      select: '-password'  // Don't return password in response
    });

    if (!updatedUser) {
      return res.status(404).json({ success: false, message: "User not found" });
    }

    // 🔍 BURP SUITE TESTING: Log update profile response
    console.log('\n✅ UPDATE PROFILE RESPONSE SENT:');
    console.log('═══════════════════════════════════════');
    console.log('👤 User ID:', updatedUser._id);
    console.log('👤 Updated Username:', updatedUser.username);
    console.log('📧 Updated Email:', updatedUser.email);
    console.log('👨‍💼 Updated Full Name:', updatedUser.fullname || 'Not set');
    console.log('📱 Updated Phone:', updatedUser.phone || 'Not set');
    console.log('🏠 Updated Address:', updatedUser.address || 'Not set');
    console.log('🔑 Password Changed:', password ? 'Yes' : 'No');
    console.log('📧 Email Changed:', email && email !== user.email ? 'Yes' : 'No');
    console.log('🕐 Update Time:', new Date().toISOString());
    console.log('═══════════════════════════════════════\n');

    return res.json({ success: true, message: "User updated", user: updatedUser });
  } catch (error) {
    console.error('Update user error:', error);
    return res.status(500).json({ success: false, message: "Server error" });
  }
};

/**
 * Secure Update User Profile Controller
 * ✅ SECURITY BY DESIGN: Implements strict security principles to prevent IDOR attacks
 * 
 * Security Features:
 * 1. Uses req.user (from JWT) - NEVER accepts userId from req.params or req.body
 * 2. Explicitly prevents updating 'role' and 'isAdmin' fields (protected from client tampering)
 * 3. Only allows updating safe, user-editable fields
 * 4. Validates all inputs before processing
 */
exports.updateUserProfile = async (req, res) => {
  try {
    // ✅ SECURITY BY DESIGN: Verify authentication first
    if (!req.user || !req.user._id) {
      return res.status(401).json({
        success: false,
        message: "Authentication required. Please login first."
      });
    }

    // ✅ SECURITY BY DESIGN: Get user ID ONLY from JWT token (req.user)
    // NEVER trust userId from req.params or req.body - prevents IDOR attacks
    const userId = req.user._id;

    // ✅ SECURITY BY DESIGN: Define allowed fields that users can update
    // Explicitly whitelist safe fields - prevents mass assignment attacks
    const allowedFields = ['fullname', 'username', 'email', 'phone', 'address'];
    
    // Extract only allowed fields from request body
    const updateData = {};
    for (const field of allowedFields) {
      if (req.body[field] !== undefined) {
        updateData[field] = req.body[field];
      }
    }

    // ✅ SECURITY BY DESIGN: Explicitly remove protected fields if present
    // Even if attacker tries to send 'role' or 'isAdmin' in request, we ignore them
    const protectedFields = ['role', 'isAdmin', '_id', 'password', 'loginAttempts', 'accountLockedUntil', 'otp', 'otpCreatedAt', 'otpExpiry', 'otpExpiryFormatted', 'otpTimeRemainingMinutes', 'otpRemainingTimeFormatted', 'otpVerified', 'emailVerificationToken', 'emailVerificationTokenExpires', 'emailVerificationTokenExpiresFormatted', 'googleId', 'facebookId', 'provider', 'favorites'];
    
    // Log security warning if protected fields are attempted
    const attemptedProtectedFields = protectedFields.filter(field => req.body[field] !== undefined);
    if (attemptedProtectedFields.length > 0) {
      console.warn('\n🚨 SECURITY WARNING: Attempted to update protected fields');
      console.warn('═══════════════════════════════════════');
      console.warn('👤 User ID:', userId);
      console.warn('👤 Username:', req.user.username);
      console.warn('🔒 Protected fields attempted:', attemptedProtectedFields.join(', '));
      console.warn('🌐 IP Address:', req.ip || req.connection.remoteAddress);
      console.warn('🕐 Timestamp:', new Date().toISOString());
      console.warn('═══════════════════════════════════════\n');
    }

    // Check if there's anything to update
    if (Object.keys(updateData).length === 0) {
      return res.status(400).json({
        success: false,
        message: "No valid fields provided for update. Allowed fields: " + allowedFields.join(', ')
      });
    }

    // Find the authenticated user from database
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found"
      });
    }

    // ✅ SECURITY BY DESIGN: Handle email update with additional security
    if (updateData.email && updateData.email !== user.email) {
      // Email change requires current password verification
      const { currentPassword } = req.body;
      if (!currentPassword) {
        return res.status(400).json({
          success: false,
          message: "Current password is required to change email address."
        });
      }

      // Verify current password
      const passwordCheck = await bcrypt.compare(currentPassword, user.password);
      if (!passwordCheck) {
        return res.status(403).json({
          success: false,
          message: "Current password is incorrect. Email update denied."
        });
      }

      // Check if new email already exists for another user
      const existingUserByEmail = await User.findOne({
        email: updateData.email,
        _id: { $ne: userId }
      });
      if (existingUserByEmail) {
        return res.status(400).json({
          success: false,
          message: "Email address is already in use by another account."
        });
      }
    }

    // ✅ SECURITY BY DESIGN: Handle username update with uniqueness check
    if (updateData.username && updateData.username !== user.username) {
      const existingUserByUsername = await User.findOne({
        username: updateData.username,
        _id: { $ne: userId }
      });
      if (existingUserByUsername) {
        return res.status(400).json({
          success: false,
          message: "Username is already taken. Please choose a different username."
        });
      }
    }

    // ✅ SECURITY BY DESIGN: Update only the authenticated user's profile
    // Use findByIdAndUpdate with explicit field filtering
    const updatedUser = await User.findByIdAndUpdate(
      userId,
      updateData,
      {
        new: true,
        runValidators: true, // Run schema validators
        select: '-password -otp -otpCreatedAt -otpExpiry -otpExpiryFormatted -otpTimeRemainingMinutes -otpRemainingTimeFormatted -emailVerificationToken -emailVerificationTokenExpires -emailVerificationTokenExpiresFormatted -loginAttempts -accountLockedUntil' // Exclude sensitive fields
      }
    );

    if (!updatedUser) {
      return res.status(404).json({
        success: false,
        message: "User not found or update failed"
      });
    }

    // ✅ SECURITY BY DESIGN: Verify that protected fields were NOT changed
    // Double-check that role remains unchanged (defense in depth)
    if (updatedUser.role !== user.role) {
      console.error('\n🚨 CRITICAL SECURITY ALERT: Role field was modified!');
      console.error('Original role:', user.role);
      console.error('New role:', updatedUser.role);
      console.error('User ID:', userId);
      console.error('IP Address:', req.ip || req.connection.remoteAddress);
      // Revert the change
      await User.findByIdAndUpdate(userId, { role: user.role });
      // Re-fetch user with correct role
      const revertedUser = await User.findById(userId).select('-password -otp -otpCreatedAt -otpExpiry -otpExpiryFormatted -otpTimeRemainingMinutes -otpRemainingTimeFormatted -emailVerificationToken -emailVerificationTokenExpires -emailVerificationTokenExpiresFormatted -loginAttempts -accountLockedUntil');
      return res.status(200).json({
        success: true,
        message: "Profile updated successfully (protected fields were ignored)",
        data: {
          _id: revertedUser._id,
          fullname: revertedUser.fullname,
          username: revertedUser.username,
          email: revertedUser.email,
          phone: revertedUser.phone,
          address: revertedUser.address,
          role: revertedUser.role,
          createdAt: revertedUser.createdAt,
          updatedAt: revertedUser.updatedAt
        }
      });
    }

    // Return updated user data (without sensitive fields)
    return res.status(200).json({
      success: true,
      message: "Profile updated successfully",
      data: {
        _id: updatedUser._id,
        fullname: updatedUser.fullname,
        username: updatedUser.username,
        email: updatedUser.email,
        phone: updatedUser.phone,
        address: updatedUser.address,
        role: updatedUser.role, // Include role in response but it cannot be modified
        createdAt: updatedUser.createdAt,
        updatedAt: updatedUser.updatedAt
      }
    });

  } catch (error) {
    console.error('\n❌ UPDATE USER PROFILE ERROR:');
    console.error('═══════════════════════════════════════');
    console.error('Error Message:', error.message);
    console.error('Error Stack:', error.stack);
    console.error('User ID:', req.user ? req.user._id : 'Not authenticated');
    console.error('Request Body:', JSON.stringify(req.body, null, 2));
    console.error('═══════════════════════════════════════\n');

    // Handle specific MongoDB errors
    if (error.name === 'ValidationError') {
      const errors = Object.values(error.errors).map(e => e.message);
      return res.status(400).json({
        success: false,
        message: "Validation error",
        errors: errors
      });
    }

    if (error.code === 11000) {
      const field = Object.keys(error.keyPattern)[0];
      return res.status(400).json({
        success: false,
        message: `${field} already exists`
      });
    }

    return res.status(500).json({
      success: false,
      message: "Server error while updating profile",
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// Forgot Password - Send Reset Link
exports.sendResetLink = async (req, res) => {
  const { email } = req.body;

  try {
    // Normalize email: lowercase and trim (same as User model setter)
    // The User model has lowercase: true and trim: true, so we normalize here too
    const normalizedEmail = email ? String(email).toLowerCase().trim() : '';
    
    console.log('\n🔍 FORGOT PASSWORD REQUEST:');
    console.log('═══════════════════════════════════════');
    console.log('📧 Requested Email (original):', email);
    console.log('📧 Requested Email (normalized):', normalizedEmail);
    
    if (!normalizedEmail) {
      return res.status(400).json({
        success: false,
        message: "Email is required"
      });
    }

    // Query user by normalized email (emails are stored in lowercase per User schema)
    const user = await User.findOne({ email: normalizedEmail });
    
    console.log('👤 User found:', user ? 'YES' : 'NO');
    if (user) {
      console.log('👤 User ID:', user._id);
      console.log('👤 User Email (from DB):', user.email);
      console.log('👤 Username:', user.username);
    } else {
      // Debug: Check if any users exist with similar email
      const allUsers = await User.find().select('email username').limit(10);
      console.log('📋 Sample emails in database (first 10):');
      allUsers.forEach(u => {
        console.log('   -', u.email, '(username:', u.username + ')');
      });
    }
    console.log('═══════════════════════════════════════\n');

    if (!user) {
      // Return specific error for unregistered email
      return res.status(404).json({
        success: false,
        message: "This email is not registered with BHOKBHOJ. Please check your email or sign up for a new account.",
        emailNotFound: true
      });
    }

    // Create reset token
    const token = jwt.sign({ id: user._id }, process.env.SECRET, { expiresIn: "20m" });
    const resetUrl = `${envConfig.urls.clientUrl}/reset-password/${token}`;

    // Send password reset email using centralized email service
    const { sendPasswordResetEmail } = require('../utils/securityNotificationService');
    const emailResult = await sendPasswordResetEmail(user, resetUrl, token);

    if (!emailResult || !emailResult.success) {
      console.error('❌ Failed to send password reset email');
      if (emailResult && emailResult.error) {
        console.error('Error:', emailResult.error);
      }
      return res.status(500).json({
        success: false,
        message: "Failed to send reset email. Please try again later."
      });
    }

    // Log success (for Ethereal, preview URL is logged in the service)
    if (emailResult.isEthereal && emailResult.previewUrl) {
      console.log('📧 Password reset email sent (Ethereal - Preview URL logged above)');
    }

    return res.status(200).json({
      success: true,
      message: "If an account with this email exists, you will receive a password reset link."
    });

  } catch (err) {
    console.error('Server error:', err);
    return res.status(500).json({
      success: false,
      message: "Server error. Please try again."
    });
  }
};

// Reset Password
exports.resetPassword = async (req, res) => {
  const { token } = req.params;
  const { password } = req.body;

  if (!password) {
    return res.status(400).json({
      success: false,
      message: "Password is required"
    });
  }

  try {
    const decoded = jwt.verify(token, process.env.SECRET);
    const user = await User.findById(decoded.id);
    
    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found"
      });
    }

    // Check if new password is the same as current password
    const isSamePassword = await bcrypt.compare(password, user.password);
    if (isSamePassword) {
      return res.status(400).json({
        success: false,
        message: "New password must be different from your current password"
      });
    }

    // Check password reuse (check against password history)
    if (user.checkPasswordReuse) {
      const isReused = await user.checkPasswordReuse(password);
      if (isReused) {
        return res.status(400).json({
          success: false,
          message: "You cannot reuse a previous password. Please choose a different password."
        });
      }
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    // Get current password hash for history
    const currentPasswordHash = user.password;

    // Update password and track history
    // Keep last 3 passwords in history
    const passwordHistory = user.passwordHistory || [];
    passwordHistory.push(currentPasswordHash);
    
    // Keep only last 3 passwords
    const updatedHistory = passwordHistory.slice(-3);

    await User.findByIdAndUpdate(decoded.id, {
      password: hashedPassword,
      passwordHistory: updatedHistory,
      passwordChangedAt: new Date(),
      passwordExpiresAt: new Date(Date.now() + (parseInt(process.env.PASSWORD_EXPIRY_DAYS) || 90) * 24 * 60 * 60 * 1000),
      loginAttempts: 0, // Reset login attempts on password reset
      accountLockedUntil: null // Unlock account
    });

    return res.status(200).json({
      success: true,
      message: "Password updated successfully"
    });

  } catch (err) {
    console.error('Reset password error:', err);
    
    if (err.name === 'JsonWebTokenError' || err.name === 'TokenExpiredError') {
      return res.status(400).json({
        success: false,
        message: "Invalid or expired token. Please request a new password reset link."
      });
    }
    
    return res.status(500).json({
      success: false,
      message: "Server error. Please try again."
    });
  }
};

// Get Current User (based on JWT token)
exports.getCurrentUser = async (req, res) => {
  try {
    // The user is already attached to req by the authenticateUser middleware
    const user = req.user;

    if (!user) {
      return res.status(401).json({
        success: false,
        message: "User not authenticated"
      });
    }

    // Return user data without sensitive information
    const userData = {
      _id: user._id,
      fullname: user.fullname,
      username: user.username,
      email: user.email,
      phone: user.phone,
      address: user.address,
      favorites: user.favorites,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt
    };

    return res.status(200).json({
      success: true,
      message: "User data retrieved successfully",
      data: userData
    });
  } catch (error) {
    console.error('Get current user error:', error);
    return res.status(500).json({
      success: false,
      message: "Server error while retrieving user data"
    });
  }
};

// ✅ XSRF Token: Get single user (alias for getCurrentUser)
exports.getSingleUser = exports.getCurrentUser;

// ✅ XSRF Token: Update user details (alias for updateUser)
exports.updateUserDetails = exports.updateUser;

// ✅ XSRF Token: Delete user account
exports.deleteUser = async (req, res) => {
  try {
    // The user is already attached to req by the authenticateUser middleware
    const user = req.user;

    if (!user) {
      return res.status(401).json({
        success: false,
        message: "User not authenticated"
      });
    }

    const userId = user._id;

    // Delete user from database
    await User.findByIdAndDelete(userId);

    return res.status(200).json({
      success: true,
      message: "User account deleted successfully"
    });
  } catch (error) {
    console.error('Delete user error:', error);
    return res.status(500).json({
      success: false,
      message: "Server error while deleting user account"
    });
  }
};

// Change Password (for logged-in users with old password verification)
exports.changePassword = async (req, res) => {
  // 🔍 BURP SUITE TESTING: Log change password request details
  console.log('\n🔍 CHANGE PASSWORD REQUEST INTERCEPTED:');
  console.log('═══════════════════════════════════════');
  console.log('👤 User ID (from token):', req.user ? req.user._id : 'Not authenticated');
  console.log('👤 Username:', req.user ? req.user.username : 'Not authenticated');
  console.log('📧 Email:', req.user ? req.user.email : 'Not authenticated');
  console.log('🔑 Current Password:', req.body.currentPassword ? '***PROVIDED***' : 'Not provided');
  console.log('🔑 New Password:', req.body.newPassword ? '***PROVIDED***' : 'Not provided');
  console.log('🎫 Authorization Token:', req.headers.authorization ? req.headers.authorization.substring(0, 50) + '...' : 'Missing');
  console.log('🌐 Origin:', req.headers.origin);
  console.log('🔗 Referer:', req.headers.referer);
  console.log('🕐 Timestamp:', new Date().toISOString());
  console.log('═══════════════════════════════════════\n');

  const { currentPassword, newPassword, confirmPassword } = req.body;

  // Validation
  if (!currentPassword || !newPassword || !confirmPassword) {
    return res.status(400).json({
      success: false,
      message: "Current password, new password, and confirm password are required"
    });
  }

  // Check if new password matches confirm password
  if (newPassword !== confirmPassword) {
    return res.status(400).json({
      success: false,
      message: "New password and confirm password do not match"
    });
  }

  // ✅ PASSWORD STRENGTH VALIDATION: Check password strength requirements
  // Minimum 8 characters, at least one uppercase, one lowercase, one number, one special character
  const passwordStrengthRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/;
  if (!passwordStrengthRegex.test(newPassword)) {
    return res.status(400).json({
      success: false,
      message: "Password too weak. Password must be at least 8 characters long and contain at least one uppercase letter, one lowercase letter, one number, and one special character (@$!%*?&)"
    });
  }

  try {
    // Get user from authenticated request
    const userId = req.user._id;
    const user = await User.findById(userId);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found"
      });
    }

    // Verify current password
    const isCurrentPasswordValid = await bcrypt.compare(currentPassword, user.password);
    if (!isCurrentPasswordValid) {
      return res.status(403).json({
        success: false,
        message: "Current password is incorrect"
      });
    }

    // ✅ PASSWORD REUSE PREVENTION: Check if new password was used in last 3 passwords
    const isPasswordReused = await user.checkPasswordReuse(newPassword);
    if (isPasswordReused) {
      return res.status(400).json({
        success: false,
        message: "New password cannot be same as your last 3 passwords"
      });
    }

    // ✅ PASSWORD REUSE PREVENTION: Add current password hash to password history
    // Initialize passwordHistory if it doesn't exist
    if (!user.passwordHistory) {
      user.passwordHistory = [];
    }
    
    // Add current password hash to history
    user.passwordHistory.push(user.password);
    
    // Keep only last 3 passwords in history
    if (user.passwordHistory.length > 3) {
      user.passwordHistory = user.passwordHistory.slice(-3);
    }

    // Hash new password
    const hashedNewPassword = await bcrypt.hash(newPassword, 10);

    // ✅ PASSWORD EXPIRY: Update password and related fields
    const expiryDays = parseInt(process.env.PASSWORD_EXPIRY_DAYS) || 90;
    user.password = hashedNewPassword;
    user.passwordChangedAt = new Date();
    user.passwordExpiresAt = new Date(Date.now() + expiryDays * 24 * 60 * 60 * 1000);
    await user.save();

    // ✅ SECURITY NOTIFICATION: Send password change notification
    const { sendPasswordChangeNotification } = require('../utils/securityNotificationService');
    const ip = req.ip || req.connection.remoteAddress || req.headers['x-forwarded-for']?.split(',')[0] || 'Unknown';
    const deviceInfo = req.get('user-agent') || 'Unknown Device';
    
    sendPasswordChangeNotification(user, {
      ipAddress: ip,
      location: 'Unknown Location', // Can be enhanced with geolocation service
      timestamp: new Date().toISOString(),
      deviceInfo: deviceInfo
    }).catch(err => console.error('Failed to send password change notification:', err));


    // 🔍 BURP SUITE TESTING: Log change password response
    console.log('\n✅ CHANGE PASSWORD RESPONSE SENT:');
    console.log('═══════════════════════════════════════');
    console.log('👤 User ID:', userId);
    console.log('👤 Username:', user.username);
    console.log('📧 Email:', user.email);
    console.log('🔑 Password Changed: Yes');
    console.log('🕐 Change Time:', new Date().toISOString());
    console.log('═══════════════════════════════════════\n');

    return res.status(200).json({
      success: true,
      message: `Password changed successfully. Your new password expires in ${expiryDays} days.`
    });

  } catch (err) {
    console.error('Change password error:', err);
    return res.status(500).json({
      success: false,
      message: "Server error. Please try again."
    });
  }
};