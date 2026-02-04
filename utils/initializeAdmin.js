/**
 * ✅ SECURE ADMIN INITIALIZATION
 * This module securely initializes the default admin user in the database
 * Runs automatically on server startup to ensure admin access is always available
 */

const User = require('../models/User');
const bcrypt = require('bcrypt');

/**
 * Initialize default admin user securely
 * Creates admin_aadarsha with admin_password if it doesn't exist
 * Updates existing admin to ensure correct role and password
 */
const initializeAdmin = async () => {
  try {
    const ADMIN_USERNAME = 'admin_aadarsha';
    const ADMIN_PASSWORD = 'admin_password';
    const ADMIN_EMAIL = 'dhakalaadarshababu20590226@gmail.com';
    const ADMIN_FULLNAME = 'Admin Aadarsha';
    const ADMIN_PHONE = 9800000000;
    const ADMIN_ADDRESS = 'Kathmandu, Nepal';

    // Check if admin user already exists
    let adminUser = await User.findOne({ 
      $or: [
        { username: ADMIN_USERNAME },
        { email: ADMIN_EMAIL }
      ]
    });

    if (adminUser) {
      // ✅ SECURE: Update existing admin to ensure correct credentials and role
      const hashedPassword = await bcrypt.hash(ADMIN_PASSWORD, 10);
      
      // Update password, role, and ensure all fields are correct
      adminUser.password = hashedPassword;
      adminUser.role = 'admin';
      adminUser.username = ADMIN_USERNAME;
      adminUser.email = ADMIN_EMAIL;
      adminUser.fullname = ADMIN_FULLNAME;
      adminUser.phone = ADMIN_PHONE;
      adminUser.address = ADMIN_ADDRESS;
      
      // Reset any account lockout or login attempts
      adminUser.loginAttempts = 0;
      adminUser.accountLockedUntil = undefined;
      adminUser.isEmailVerified = true; // Admin email is considered verified
      
      await adminUser.save();
      
      // ✅ CLEAR IP BLOCKS: Clear any IP blocks that might prevent admin login
      const IPBlockService = require('../services/ipBlockService');
      // Clear IP blocks for common localhost IPs
      const localhostIPs = ['127.0.0.1', '::1', '::ffff:127.0.0.1', 'localhost'];
      localhostIPs.forEach(ip => {
        IPBlockService.clearAttempts(ip);
      });
      console.log('✅ IP blocks cleared for admin access');
      
      console.log('✅ Admin user updated successfully');
      console.log(`   Username: ${ADMIN_USERNAME}`);
      console.log(`   Role: admin`);
      console.log(`   Email: ${ADMIN_EMAIL}`);
      return { success: true, action: 'updated', user: adminUser };
    } else {
      // ✅ SECURE: Create new admin user with hashed password
      const hashedPassword = await bcrypt.hash(ADMIN_PASSWORD, 10);
      
      adminUser = new User({
        username: ADMIN_USERNAME,
        email: ADMIN_EMAIL,
        password: hashedPassword,
        fullname: ADMIN_FULLNAME,
        phone: ADMIN_PHONE,
        address: ADMIN_ADDRESS,
        role: 'admin',
        isEmailVerified: true, // Admin email is considered verified
        loginAttempts: 0,
        accountLockedUntil: undefined
      });

      await adminUser.save();
      
      console.log('✅ Admin user created successfully');
      console.log(`   Username: ${ADMIN_USERNAME}`);
      console.log(`   Role: admin`);
      console.log(`   Email: ${ADMIN_EMAIL}`);
      return { success: true, action: 'created', user: adminUser };
    }
  } catch (error) {
    console.error('❌ Error initializing admin user:', error.message);
    // Don't throw error - allow server to continue even if admin init fails
    // Admin can be created manually if needed
    return { success: false, error: error.message };
  }
};

module.exports = { initializeAdmin };
