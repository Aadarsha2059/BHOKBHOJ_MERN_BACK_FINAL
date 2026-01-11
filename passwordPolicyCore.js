/**
 * PASSWORD REUSE PREVENTION & EXPIRY POLICY - CORE IMPLEMENTATION
 * Clean code snippet for documentation
 */

// ============================================
// 1. USER SCHEMA - Password History & Expiry Fields
// ============================================
const UserSchema = new mongoose.Schema({
  password: { type: String, required: true },
  
  // Store last 3 hashed passwords
  passwordHistory: { type: [String], default: [] },
  
  // Track when password was changed
  passwordChangedAt: { type: Date, default: Date.now },
  
  // Password expires 90 days from now (default)
  passwordExpiresAt: {
    type: Date,
    default: function() {
      const days = parseInt(process.env.PASSWORD_EXPIRY_DAYS) || 90;
      return new Date(Date.now() + days * 24 * 60 * 60 * 1000);
    }
  }
});

// Method: Check if password was reused (last 3)
UserSchema.methods.checkPasswordReuse = async function(newPassword) {
  if (!this.passwordHistory?.length) return false;
  for (const oldHash of this.passwordHistory) {
    if (await bcrypt.compare(newPassword, oldHash)) return true;
  }
  return false;
};

// Method: Check if password expired
UserSchema.methods.isPasswordExpired = function() {
  return this.passwordExpiresAt && this.passwordExpiresAt < new Date();
};

// Method: Check if password needs warning (expires in 7 days)
UserSchema.methods.needsExpiryWarning = function() {
  if (!this.passwordExpiresAt) return false;
  const sevenDays = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
  return this.passwordExpiresAt <= sevenDays && this.passwordExpiresAt > new Date();
};

// ============================================
// 2. CHANGE PASSWORD - Controller Logic
// ============================================
exports.changePassword = async (req, res) => {
  const { currentPassword, newPassword, confirmPassword } = req.body;
  const user = await User.findById(req.user._id);
  
  // Validate current password
  if (!await bcrypt.compare(currentPassword, user.password)) {
    return res.status(403).json({ success: false, message: "Current password incorrect" });
  }
  
  // Validate password match
  if (newPassword !== confirmPassword) {
    return res.status(400).json({ success: false, message: "Passwords don't match" });
  }
  
  // Validate password strength (8+ chars, uppercase, lowercase, number, special)
  if (!/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/.test(newPassword)) {
    return res.status(400).json({ success: false, message: "Password too weak" });
  }
  
  // Check password reuse (last 3)
  if (await user.checkPasswordReuse(newPassword)) {
    return res.status(400).json({ success: false, message: "Cannot reuse last 3 passwords" });
  }
  
  // Add current password to history (keep last 3)
  user.passwordHistory = [...(user.passwordHistory || []), user.password].slice(-3);
  
  // Update password and expiry
  const expiryDays = parseInt(process.env.PASSWORD_EXPIRY_DAYS) || 90;
  user.password = await bcrypt.hash(newPassword, 10);
  user.passwordChangedAt = new Date();
  user.passwordExpiresAt = new Date(Date.now() + expiryDays * 24 * 60 * 60 * 1000);
  await user.save();
  
  return res.status(200).json({
    success: true,
    message: `Password changed. Expires in ${expiryDays} days.`
  });
};

// ============================================
// 3. LOGIN - Password Expiry Check
// ============================================
exports.loginUser = async (req, res) => {
  const { username, password } = req.body;
  const user = await User.findOne({ username });
  
  // Verify password
  if (!await bcrypt.compare(password, user.password)) {
    return res.status(403).json({ success: false, message: "Invalid credentials" });
  }
  
  // Check if password expired
  if (user.isPasswordExpired()) {
    return res.status(403).json({
      success: false,
      message: "Password expired. Please reset.",
      requirePasswordReset: true
    });
  }
  
  // Check if password needs warning (expires in 7 days)
  let warning = null;
  if (user.needsExpiryWarning()) {
    const days = Math.ceil((user.passwordExpiresAt - new Date()) / (1000 * 60 * 60 * 24));
    warning = `Password expires in ${days} day(s). Please change soon.`;
  }
  
  const token = jwt.sign({ id: user._id }, process.env.SECRET, { expiresIn: "7d" });
  
  return res.status(200).json({
    success: true,
    token,
    user: { id: user._id, username: user.username },
    ...(warning && { warning })
  });
};

// ============================================
// 4. ENVIRONMENT VARIABLE
// ============================================
// PASSWORD_EXPIRY_DAYS=90
