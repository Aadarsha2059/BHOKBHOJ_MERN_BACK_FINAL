const validateUser = (req, res, next) => {
  const { fullname, username, email, password, confirmpassword, phone, address } = req.body;

  // 🔍 Log validation attempt for debugging
  if (process.env.NODE_ENV !== 'production') {
    console.log('\n🔍 VALIDATION MIDDLEWARE - Registration Request:');
    console.log('Fullname:', fullname || 'Not provided');
    console.log('Username:', username || 'Not provided');
    console.log('Email:', email || 'Not provided');
    console.log('Password:', password ? '***provided***' : 'Not provided');
    console.log('Confirm Password:', confirmpassword ? '***provided***' : 'Not provided');
    console.log('Phone:', phone || 'Not provided');
    console.log('Address:', address || 'Not provided');
  }

  // ✅ REQUIRED FIELDS: Only username, email, and password are required
  if (!username || !email || !password) {
    const missingFields = [];
    if (!username) missingFields.push('username');
    if (!email) missingFields.push('email');
    if (!password) missingFields.push('password');
    
    console.error('❌ Validation failed - Missing required fields:', missingFields);
    return res.status(400).json({ 
      success: false, 
      message: `Missing required fields: ${missingFields.join(', ')}` 
    });
  }

  // Validate username (min 3 characters)
  if (typeof username !== "string" || username.trim().length < 3) {
    return res.status(400).json({ 
      success: false, 
      message: "Username must be at least 3 characters long." 
    });
  }

  // Validate email format
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (typeof email !== "string" || !emailRegex.test(email.trim())) {
    return res.status(400).json({ 
      success: false, 
      message: "Please provide a valid email address." 
    });
  }

  // Validate password length (min 6 characters)
  if (typeof password !== "string" || password.length < 6) {
    return res.status(400).json({ 
      success: false, 
      message: "Password must be at least 6 characters long." 
    });
  }

  // ✅ OPTIONAL FIELDS: Validate only if provided
  
  // Validate fullname if provided (min 3 characters)
  if (fullname !== undefined && fullname !== null && fullname !== '') {
    if (typeof fullname !== "string" || fullname.trim().length < 3) {
      return res.status(400).json({ 
        success: false, 
        message: "Full name must be at least 3 characters long." 
      });
    }
  }

  // Confirm password check (if provided)
  if (confirmpassword !== undefined && confirmpassword !== null && confirmpassword !== '') {
    if (password !== confirmpassword) {
      return res.status(400).json({ 
        success: false, 
        message: "Password and Confirm Password do not match." 
      });
    }
  }

  // Validate phone number if provided (flexible format - allow various formats)
  if (phone !== undefined && phone !== null && phone !== '') {
    // Remove spaces, dashes, and parentheses for validation
    const cleanPhone = phone.toString().replace(/[\s\-\(\)]/g, '');
    // Allow 10-15 digits (international format support)
    const phoneRegex = /^\d{10,15}$/;
    if (!phoneRegex.test(cleanPhone)) {
      return res.status(400).json({ 
        success: false, 
        message: "Phone number must be 10-15 digits." 
      });
    }
  }

  // Validate address if provided (non-empty string)
  if (address !== undefined && address !== null && address !== '') {
    if (typeof address !== "string" || address.trim().length === 0) {
      return res.status(400).json({ 
        success: false, 
        message: "Address must be a valid string." 
      });
    }
  }

  // All validations passed
  next();
};

module.exports = validateUser;
