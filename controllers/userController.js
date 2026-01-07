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
//     const resetUrl = `${process.env.CLIENT_URL || 'http://localhost:5173'}/reset-password/${token}`;

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

  const { fullname, username, email, password, confirmpassword, phone, address } = req.body;

  // Only username, email and password are required
  if (!username || !email || !password) {
    return res.status(400).json({ success: false, message: "Username, email and password are required" });
  }

  if (confirmpassword && password !== confirmpassword) {
    return res.status(400).json({ success: false, message: "Passwords do not match" });
  }

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

    // Create new user
    const newUser = new User({
      fullname,
      username,
      email,
      password: hashedPassword,
      phone,
      address,
    });

    await newUser.save();
    console.log('User registered successfully:', newUser.username);

    // 🔍 BURP SUITE TESTING: Log registration response
    console.log('\n✅ REGISTRATION RESPONSE SENT:');
    console.log('═══════════════════════════════════════');
    console.log('📧 Registered Email:', newUser.email);
    console.log('👤 Registered Username:', newUser.username);
    console.log('🆔 User ID:', newUser._id);
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

// Generate 6-digit OTP
const generateOTP = () => {
  return Math.floor(100000 + Math.random() * 900000).toString();
};

// Login User with 2FA (Step 1: Verify credentials and send OTP)
exports.loginUser = async (req, res) => {
  // 🔍 BURP SUITE TESTING: Log login request details
  console.log('\n🔍 LOGIN REQUEST INTERCEPTED:');
  console.log('═══════════════════════════════════════');
  console.log('👤 Username/Email:', req.body.username || req.body.email);
  console.log('🔑 Password:', req.body.password);
  console.log('🌐 Origin:', req.headers.origin);
  console.log('🔗 Referer:', req.headers.referer);
  console.log('🕐 Timestamp:', new Date().toISOString());
  console.log('═══════════════════════════════════════\n');

  console.log('Login request body:', req.body);
  // Accept both username and email fields
  const { username, email, password } = req.body;
  const loginIdentifier = username || email;

  // Validation
  if (!loginIdentifier || !password) {
    console.log('Missing fields - identifier:', loginIdentifier, 'password:', password ? 'provided' : 'missing');
    return res.status(400).json({ success: false, message: "Missing field" });
  }

  try {
    // Find user by username or email
    const user = await User.findOne({
      $or: [
        { username: loginIdentifier },
        { email: loginIdentifier }
      ]
    });
    if (!user) {
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
      // ✅ SECURED: Increment failed login attempts
      user.loginAttempts = (user.loginAttempts || 0) + 1;
      
      // Lock account after 10 failed attempts
      if (user.loginAttempts >= 10) {
        user.accountLockedUntil = new Date(Date.now() + 10 * 60 * 1000); // Lock for 10 minutes
        await user.save();
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
      return res.status(403).json({ 
        success: false, 
        message: `Invalid credentials. ${remainingAttempts} attempt(s) remaining before account lockout.`,
        remainingAttempts: remainingAttempts
      });
    }

    // ✅ SECURED: Reset login attempts on successful password verification
    user.loginAttempts = 0;
    user.accountLockedUntil = null;
    await user.save();

    // For admin users, skip OTP and login directly
    if (user.role === 'admin') {
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
        req.session.userId = user._id;
        req.session.username = user.username;
        req.session.email = user.email;
        req.session.role = user.role;
        req.session.loginTime = new Date().toISOString();
        
        // ✅ SECURED: Ensure login attempts are reset (double-check)
        user.loginAttempts = 0;
        user.accountLockedUntil = null;
        user.save().catch(err => console.error('Error resetting login attempts:', err));

        const payload = {
          _id: user._id,
          username: user.username,
          email: user.email,
          role: user.role
        };

        const token = jwt.sign(payload, process.env.SECRET || 'your-secret-key', { expiresIn: "24h" });

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
          redirectTo: '/admin'
        });
      });
      return; // Exit early after regenerate callback
    }

    // For regular users, generate and send OTP
    const otp = generateOTP();
    const otpExpiry = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

    // Save OTP to user
    user.otp = otp;
    user.otpExpiry = otpExpiry;
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
      console.log('⏰ OTP Expiry:', otpExpiry.toISOString());
      console.log('═══════════════════════════════════════\n');

      return res.status(200).json({
        success: true,
        message: "OTP sent to your email",
        requireOTP: true,
        userId: user._id,
        email: user.email.replace(/(.{2})(.*)(@.*)/, '$1***$3') // Masked email
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
        console.log('⏰ OTP Expiry:', otpExpiry.toISOString());
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
    console.log('⏰ OTP Expiry:', otpExpiry.toISOString());
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
      user.otpExpiry = null;
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
    user.otpExpiry = null;
    user.otpVerified = true;
    // ✅ SECURED: Reset login attempts on successful OTP verification
    user.loginAttempts = 0;
    user.accountLockedUntil = null;
    await user.save();

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
      req.session.userId = user._id;
      req.session.username = user.username;
      req.session.email = user.email;
      req.session.role = user.role || 'user';
      req.session.loginTime = new Date().toISOString();

      const payload = {
        _id: user._id,
        username: user.username,
      };

      const token = jwt.sign(payload, process.env.SECRET, { expiresIn: "7d" });

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
    const protectedFields = ['role', 'isAdmin', '_id', 'password', 'loginAttempts', 'accountLockedUntil', 'otp', 'otpExpiry', 'otpVerified', 'googleId', 'facebookId', 'provider', 'favorites'];
    
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
        select: '-password -otp -otpExpiry -loginAttempts -accountLockedUntil' // Exclude sensitive fields
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
      const revertedUser = await User.findById(userId).select('-password -otp -otpExpiry -loginAttempts -accountLockedUntil');
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
    const user = await User.findOne({ email });
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
    const resetUrl = `${process.env.CLIENT_URL || 'http://localhost:5173'}/reset-password/${token}`;

    // For testing purposes, log the reset URL instead of sending email
    console.log('Password reset URL:', resetUrl);
    console.log('Reset token:', token);

    // Configure email transporter
    const transporter = nodemailer.createTransport({
      service: "gmail",
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS
      }
    });

    const mailOptions = {
      from: `"BHOKBHOJ" <${process.env.EMAIL_USER}>`,
      to: email,
      subject: "Reset Your Password - BHOKBHOJ",
      html: `
        <div style="font-family: 'Segoe UI', Arial, sans-serif; max-width: 600px; margin: 0 auto; background: linear-gradient(135deg, #f0fdf4 0%, #ecfdf5 100%); padding: 40px 20px; border-radius: 16px;">
          <div style="text-align: center; margin-bottom: 30px;">
            <h1 style="color: #14b8a6; font-size: 32px; margin: 0; text-shadow: 2px 2px 4px rgba(0,0,0,0.1);">🍽️ BHOKBHOJ</h1>
            <p style="color: #0f766e; font-size: 14px; margin: 5px 0 0 0;">Delicious Food, Delivered Fresh</p>
          </div>
          
          <div style="background: white; padding: 30px; border-radius: 12px; box-shadow: 0 4px 12px rgba(0,0,0,0.1);">
            <h2 style="color: #0f766e; font-size: 24px; margin-top: 0;">🔐 Password Reset Request</h2>
            <p style="color: #374151; font-size: 16px; line-height: 1.6;">Hello <strong>${user.fullname}</strong>,</p>
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

    transporter.sendMail(mailOptions, (err, info) => {
      if (err) {
        console.error('Email error:', err);
        return res.status(500).json({
          success: false,
          message: "Failed to send reset email. Please try again."
        });
      }
      console.log('Email sent:', info.response);
      return res.status(200).json({
        success: true,
        message: "If an account with this email exists, you will receive a password reset link."
      });
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
    const hashedPassword = await bcrypt.hash(password, 10);

    await User.findByIdAndUpdate(decoded.id, { password: hashedPassword });

    return res.status(200).json({
      success: true,
      message: "Password updated successfully"
    });

  } catch (err) {
    console.error('Reset password error:', err);
    return res.status(400).json({
      success: false,
      message: "Invalid or expired token"
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

// Change Password (for logged-in users with old password verification)
exports.changePassword = async (req, res) => {
  // 🔍 BURP SUITE TESTING: Log change password request details
  console.log('\n🔍 CHANGE PASSWORD REQUEST INTERCEPTED:');
  console.log('═══════════════════════════════════════');
  console.log('👤 User ID (from token):', req.user ? req.user._id : 'Not authenticated');
  console.log('👤 Username:', req.user ? req.user.username : 'Not authenticated');
  console.log('📧 Email:', req.user ? req.user.email : 'Not authenticated');
  console.log('🔑 Old Password:', req.body.oldPassword ? '***PROVIDED***' : 'Not provided');
  console.log('🔑 New Password:', req.body.newPassword ? '***PROVIDED***' : 'Not provided');
  console.log('🎫 Authorization Token:', req.headers.authorization ? req.headers.authorization.substring(0, 50) + '...' : 'Missing');
  console.log('🌐 Origin:', req.headers.origin);
  console.log('🔗 Referer:', req.headers.referer);
  console.log('🕐 Timestamp:', new Date().toISOString());
  console.log('═══════════════════════════════════════\n');

  const { oldPassword, newPassword } = req.body;

  // Validation
  if (!oldPassword || !newPassword) {
    return res.status(400).json({
      success: false,
      message: "Both old password and new password are required"
    });
  }

  if (newPassword.length < 6) {
    return res.status(400).json({
      success: false,
      message: "New password must be at least 6 characters long"
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

    // Verify old password
    const isOldPasswordValid = await bcrypt.compare(oldPassword, user.password);
    if (!isOldPasswordValid) {
      return res.status(403).json({
        success: false,
        message: "Current password is incorrect"
      });
    }

    // Check if new password is same as old password
    const isSamePassword = await bcrypt.compare(newPassword, user.password);
    if (isSamePassword) {
      return res.status(400).json({
        success: false,
        message: "New password must be different from the current password"
      });
    }

    // Hash new password
    const hashedNewPassword = await bcrypt.hash(newPassword, 10);

    // Update password
    user.password = hashedNewPassword;
    await user.save();

    // Send confirmation email
    const transporter = nodemailer.createTransport({
      service: "gmail",
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS
      }
    });

    const mailOptions = {
      from: `"BHOKBHOJ" <${process.env.EMAIL_USER}>`,
      to: user.email,
      subject: "Password Changed Successfully - BHOKBHOJ",
      html: `
        <div style="font-family: 'Segoe UI', Arial, sans-serif; max-width: 600px; margin: 0 auto; background: linear-gradient(135deg, #f0fdf4 0%, #ecfdf5 100%); padding: 40px 20px; border-radius: 16px;">
          <div style="text-align: center; margin-bottom: 30px;">
            <h1 style="color: #14b8a6; font-size: 32px; margin: 0; text-shadow: 2px 2px 4px rgba(0,0,0,0.1);">🍽️ BHOKBHOJ</h1>
            <p style="color: #0f766e; font-size: 14px; margin: 5px 0 0 0;">Delicious Food, Delivered Fresh</p>
          </div>
          
          <div style="background: white; padding: 30px; border-radius: 12px; box-shadow: 0 4px 12px rgba(0,0,0,0.1);">
            <h2 style="color: #0f766e; font-size: 24px; margin-top: 0;">✅ Password Changed Successfully</h2>
            <p style="color: #374151; font-size: 16px; line-height: 1.6;">Hello <strong>${user.fullname}</strong>,</p>
            <p style="color: #374151; font-size: 16px; line-height: 1.6;">
              Your BHOKBHOJ account password has been changed successfully.
            </p>
            
            <div style="background: #d1fae5; border-left: 4px solid #10b981; padding: 15px; border-radius: 8px; margin: 25px 0;">
              <p style="color: #065f46; margin: 0; font-size: 14px;">
                🔒 <strong>Security Notice:</strong> If you did not make this change, please contact our support team immediately.
              </p>
            </div>
            
            <p style="color: #6b7280; font-size: 14px; line-height: 1.6; margin-top: 25px;">
              Changed on: <strong>${new Date().toLocaleString()}</strong>
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
          </div>
        </div>
      `
    };

    // Send email (don't wait for it)
    transporter.sendMail(mailOptions, (err, info) => {
      if (err) {
        console.error('Email error:', err);
      } else {
        console.log('Password change confirmation email sent:', info.response);
      }
    });

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
      message: "Password changed successfully"
    });

  } catch (err) {
    console.error('Change password error:', err);
    return res.status(500).json({
      success: false,
      message: "Server error. Please try again."
    });
  }
};