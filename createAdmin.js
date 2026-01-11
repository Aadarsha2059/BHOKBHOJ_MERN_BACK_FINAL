const mongoose = require('mongoose');
const bcrypt = require('bcrypt');
const User = require('./models/User');
require('dotenv').config();

const createAdminUser = async () => {
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/bhokbhoj');
    console.log('Connected to MongoDB');

    // Check if admin user already exists
    const existingAdmin = await User.findOne({ username: 'admin_aadarsha' });
    
    if (existingAdmin) {
      // ✅ FIX: Ensure existing admin has role='admin'
      if (existingAdmin.role !== 'admin') {
        existingAdmin.role = 'admin';
        await existingAdmin.save();
        console.log('✅ Admin user role updated to "admin"!');
      } else {
        console.log('✅ Admin user already exists with role="admin"!');
      }
    } else {
      // Create admin user with role='admin'
      const hashedPassword = await bcrypt.hash('admin_password', 10);
      
      const adminUser = new User({
        fullname: 'Aadarsha Babu Dhakal',
        username: 'admin_aadarsha',
        email: 'admin@bhokbhoj.com',
        password: hashedPassword,
        phone: 1234567890,
        address: 'Kathmandu, Nepal',
        role: 'admin'  // ✅ FIX: Set role to 'admin' in database
      });

      await adminUser.save();
      console.log('✅ Admin user created successfully with role="admin"!');
    }

    console.log('Admin credentials:');
    console.log('Username: admin_aadarsha');
    console.log('Password: admin_password');
    console.log('Role: admin (set in database)');

    mongoose.connection.close();
    console.log('Database connection closed');
    
  } catch (error) {
    console.error('❌ Error creating admin user:', error);
    process.exit(1);
  }
};

// Run the script
createAdminUser(); 