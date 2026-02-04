/**
 * ✅ SECURE ADMIN CREATION SCRIPT
 * Standalone script to create/update the default admin user
 * 
 * Usage: node Backend/scripts/createDefaultAdmin.js
 * 
 * This script securely creates or updates the admin_aadarsha user
 * with username: admin_aadarsha
 * password: admin_password
 * role: admin
 */

require('dotenv').config();
const mongoose = require('mongoose');
const bcrypt = require('bcrypt');
const User = require('../models/User');

const CONNECTION_STRING = process.env.MONGODB_URI || 'mongodb://localhost:27017/bhokbhoj';

const createDefaultAdmin = async () => {
  try {
    console.log('🔐 Connecting to MongoDB...');
    await mongoose.connect(CONNECTION_STRING);
    console.log('✅ Connected to MongoDB\n');

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
      console.log('📋 Admin user found. Updating credentials...');
      
      // ✅ SECURE: Hash password before storing
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
      adminUser.isEmailVerified = true;
      
      await adminUser.save();
      
      console.log('✅ Admin user updated successfully!\n');
      console.log('📋 Admin Credentials:');
      console.log('   Username: admin_aadarsha');
      console.log('   Password: admin_password');
      console.log('   Email: dhakalaadarshababu20590226@gmail.com');
      console.log('   Role: admin\n');
    } else {
      console.log('📋 Creating new admin user...');
      
      // ✅ SECURE: Hash password before storing
      const hashedPassword = await bcrypt.hash(ADMIN_PASSWORD, 10);
      
      adminUser = new User({
        username: ADMIN_USERNAME,
        email: ADMIN_EMAIL,
        password: hashedPassword,
        fullname: ADMIN_FULLNAME,
        phone: ADMIN_PHONE,
        address: ADMIN_ADDRESS,
        role: 'admin',
        isEmailVerified: true,
        loginAttempts: 0,
        accountLockedUntil: undefined
      });

      await adminUser.save();
      
      console.log('✅ Admin user created successfully!\n');
      console.log('📋 Admin Credentials:');
      console.log('   Username: admin_aadarsha');
      console.log('   Password: admin_password');
      console.log('   Email: dhakalaadarshababu20590226@gmail.com');
      console.log('   Role: admin\n');
    }

    // Verify admin can be found
    const verifyAdmin = await User.findOne({ username: ADMIN_USERNAME, role: 'admin' });
    if (verifyAdmin) {
      console.log('✅ Verification: Admin user exists with correct role');
    } else {
      console.log('❌ Verification failed: Admin user not found or role incorrect');
    }

    mongoose.connection.close();
    console.log('✅ Database connection closed');
    process.exit(0);
  } catch (error) {
    console.error('❌ Error creating admin user:', error.message);
    console.error('Stack:', error.stack);
    mongoose.connection.close();
    process.exit(1);
  }
};

// Run the script
createDefaultAdmin();
