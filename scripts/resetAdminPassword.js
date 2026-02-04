/**
 * ✅ RESET ADMIN PASSWORD SCRIPT
 * Manually resets the admin_aadarsha user password to admin_password
 * 
 * Usage: node Backend/scripts/resetAdminPassword.js
 * 
 * This script:
 * 1. Connects to MongoDB
 * 2. Finds admin_aadarsha user
 * 3. Resets password to admin_password
 * 4. Ensures role is 'admin'
 * 5. Resets login attempts and account lockout
 * 6. Verifies the admin can be found
 */

require('dotenv').config();
const mongoose = require('mongoose');
const bcrypt = require('bcrypt');
const User = require('../models/User');

const CONNECTION_STRING = process.env.MONGODB_URI || 'mongodb://localhost:27017/bhokbhoj';

const resetAdminPassword = async () => {
  try {
    console.log('🔐 Connecting to MongoDB...');
    await mongoose.connect(CONNECTION_STRING);
    console.log('✅ Connected to MongoDB\n');

    const ADMIN_USERNAME = 'admin_aadarsha';
    const ADMIN_PASSWORD = 'admin_password';
    const ADMIN_EMAIL = 'dhakalaadarshababu20590226@gmail.com';

    // Find admin user
    let adminUser = await User.findOne({ 
      $or: [
        { username: ADMIN_USERNAME },
        { email: ADMIN_EMAIL }
      ]
    });

    if (!adminUser) {
      console.log('❌ Admin user not found. Creating new admin user...');
      
      // Create new admin user
      const hashedPassword = await bcrypt.hash(ADMIN_PASSWORD, 10);
      
      adminUser = new User({
        username: ADMIN_USERNAME,
        email: ADMIN_EMAIL,
        password: hashedPassword,
        fullname: 'Admin Aadarsha',
        phone: 9800000000,
        address: 'Kathmandu, Nepal',
        role: 'admin',
        isEmailVerified: true,
        loginAttempts: 0,
        accountLockedUntil: undefined
      });

      await adminUser.save();
      console.log('✅ Admin user created successfully!\n');
    } else {
      console.log('📋 Admin user found. Resetting password and credentials...');
      
      // Reset password
      const hashedPassword = await bcrypt.hash(ADMIN_PASSWORD, 10);
      
      // Update all admin fields
      adminUser.password = hashedPassword;
      adminUser.role = 'admin';
      adminUser.username = ADMIN_USERNAME;
      adminUser.email = ADMIN_EMAIL;
      adminUser.fullname = 'Admin Aadarsha';
      adminUser.phone = 9800000000;
      adminUser.address = 'Kathmandu, Nepal';
      
      // Reset login attempts and account lockout
      adminUser.loginAttempts = 0;
      adminUser.accountLockedUntil = undefined;
      adminUser.isEmailVerified = true;
      
      await adminUser.save();
      console.log('✅ Admin user password and credentials reset successfully!\n');
    }

    // Verify admin can be found and login works
    const verifyAdmin = await User.findOne({ username: ADMIN_USERNAME, role: 'admin' });
    if (verifyAdmin) {
      // Test password
      const passwordTest = await bcrypt.compare(ADMIN_PASSWORD, verifyAdmin.password);
      if (passwordTest) {
        console.log('✅ Verification: Admin user exists with correct role and password');
        console.log('✅ Password verification test: PASSED');
      } else {
        console.log('❌ Verification: Password test FAILED');
      }
    } else {
      console.log('❌ Verification failed: Admin user not found or role incorrect');
    }

    console.log('\n📋 Admin Login Credentials:');
    console.log('   Username: admin_aadarsha');
    console.log('   Password: admin_password');
    console.log('   Email: dhakalaadarshababu20590226@gmail.com');
    console.log('   Role: admin');
    console.log('   Login Attempts: 0');
    console.log('   Account Locked: No\n');

    mongoose.connection.close();
    console.log('✅ Database connection closed');
    process.exit(0);
  } catch (error) {
    console.error('❌ Error resetting admin password:', error.message);
    console.error('Stack:', error.stack);
    mongoose.connection.close();
    process.exit(1);
  }
};

// Run the script
resetAdminPassword();
