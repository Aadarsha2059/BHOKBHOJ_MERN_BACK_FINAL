require('dotenv').config();
const mongoose = require('mongoose');
const bcrypt = require('bcrypt');
const User = require('./models/User');

async function testAdminLogin() {
    try {
        await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/bhokbhoj');
        console.log('Connected to MongoDB\n');

        // Find admin user
        const adminUser = await User.findOne({ username: 'admin_aadarsha' });

        if (!adminUser) {
            console.log('❌ Admin user not found!');
            process.exit(1);
        }

        console.log('✅ Admin user found:');
        console.log('   Username:', adminUser.username);
        console.log('   Email:', adminUser.email);
        console.log('   Role:', adminUser.role);
        console.log('   Has password:', !!adminUser.password);
        console.log('');

        // Test password
        const passwordMatch = await bcrypt.compare('admin_password', adminUser.password);
        console.log('Password test:');
        console.log('   Input: admin_password');
        console.log('   Match:', passwordMatch ? '✅ CORRECT' : '❌ INCORRECT');
        console.log('');

        if (passwordMatch) {
            console.log('✅ Admin login should work!');
            console.log('   Username: admin_aadarsha');
            console.log('   Password: admin_password');
        } else {
            console.log('❌ Password mismatch! Updating password...');
            const hashedPassword = await bcrypt.hash('admin_password', 10);
            adminUser.password = hashedPassword;
            await adminUser.save();
            console.log('✅ Password updated!');
        }

        mongoose.connection.close();
        process.exit(0);
    } catch (error) {
        console.error('❌ Error:', error.message);
        process.exit(1);
    }
}

testAdminLogin();
