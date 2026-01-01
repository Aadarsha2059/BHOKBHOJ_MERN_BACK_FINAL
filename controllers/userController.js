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
    console.error('Registration error:', err);
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

    const passwordCheck = await bcrypt.compare(password, user.password);
    if (!passwordCheck) {
      return res.status(403).json({ success: false, message: "Invalid credentials" });
    }

    // For admin users, skip OTP and login directly
    if (user.role === 'admin') {
      const payload = {
        _id: user._id,
        username: user.username,
        email: user.email,
        role: user.role
      };

      const token = jwt.sign(payload, process.env.SECRET || 'your-secret-key', { expiresIn: "24h" });

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
      subject: "Your Login OTP - BHOKBHOJ",
      html: `
        <div style="font-family: 'Segoe UI', Arial, sans-serif; max-width: 600px; margin: 0 auto; background: linear-gradient(135deg, #f0fdf4 0%, #ecfdf5 100%); padding: 40px 20px; border-radius: 16px;">
          <div style="text-align: center; margin-bottom: 30px;">
            <h1 style="color: #14b8a6; font-size: 32px; margin: 0; text-shadow: 2px 2px 4px rgba(0,0,0,0.1);">🍽️ BHOKBHOJ</h1>
            <p style="color: #0f766e; font-size: 14px; margin: 5px 0 0 0;">Delicious Food, Delivered Fresh</p>
          </div>
          
          <div style="background: white; padding: 30px; border-radius: 12px; box-shadow: 0 4px 12px rgba(0,0,0,0.1);">
            <h2 style="color: #0f766e; font-size: 24px; margin-top: 0;">🔐 Your Login OTP</h2>
            <p style="color: #374151; font-size: 16px; line-height: 1.6;">Hello <strong>${user.fullname}</strong>,</p>
            <p style="color: #374151; font-size: 16px; line-height: 1.6;">
              You requested to login to your BHOKBHOJ account. Please use the OTP below to complete your login:
            </p>
            
            <div style="text-align: center; margin: 35px 0;">
              <div style="background: linear-gradient(135deg, #14b8a6 0%, #0d9488 100%); 
                          color: white; 
                          padding: 20px 40px; 
                          border-radius: 12px; 
                          font-size: 36px;
                          font-weight: bold;
                          letter-spacing: 8px;
                          display: inline-block;
                          box-shadow: 0 4px 12px rgba(20, 184, 166, 0.4);">
                ${otp}
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

    transporter.sendMail(mailOptions, (err, info) => {
      if (err) {
        console.error('Email error:', err);
      } else {
        console.log('OTP email sent:', info.response);
      }
    });

    // Return success with userId (don't send token yet)
    return res.status(200).json({
      success: true,
      message: "OTP sent to your email",
      requireOTP: true,
      userId: user._id,
      email: user.email.replace(/(.{2})(.*)(@.*)/, '$1***$3') // Masked email
    });
  } catch (err) {
    console.error('Login error:', err);
    return res.status(500).json({ success: false, message: "Server error" });
  }
};

// Verify OTP and complete login (Step 2)
exports.verifyOTP = async (req, res) => {
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
    await user.save();

    const payload = {
      _id: user._id,
      username: user.username,
    };

    const token = jwt.sign(payload, process.env.SECRET, { expiresIn: "7d" });

    return res.status(200).json({
      success: true,
      message: "Login successful",
      user: user,
      token: token,
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

    return res.json({ success: true, message: "User updated", user: updatedUser });
  } catch (error) {
    console.error('Update user error:', error);
    return res.status(500).json({ success: false, message: "Server error" });
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