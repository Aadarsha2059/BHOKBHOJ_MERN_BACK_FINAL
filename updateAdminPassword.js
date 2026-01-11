require('dotenv').config();
const mongoose = require('mongoose');
const bcrypt = require('bcrypt');
const User = require('./models/User');

async function updateAdminPassword() {
    try {
        await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/bhokbhoj');
        console.log('Connected to MongoDB\n');

        // Find admin user
        const adminUser = await User.findOne({ 
            $or: [
                { username: 'admin_aadarsha' },
                { email: 'dhakalaadarshababu20590226@gmail.com' }
            ]
        });

        if (!adminUser) {
            console.log('❌ Admin user not found. Creating new admin user...');
            
            // Create admin user
            const hashedPassword = await bcrypt.hash('admin_password', 10);
            const newAdmin = new User({
                username: 'admin_aadarsha',
                email: 'dhakalaadarshababu20590226@gmail.com',
                password: hashedPassword,
                phone: 9800000000,
                role: 'admin',
                fullname: 'Admin Aadarsha',
                address: 'Kathmandu, Nepal'
            });
            
            await newAdmin.save();
            console.log('✅ Admin user created successfully!');
        } else {
            // Update password and ensure role is admin
            const hashedPassword = await bcrypt.hash('admin_password', 10);
            adminUser.password = hashedPassword;
            adminUser.role = 'admin';
            adminUser.username = 'admin_aadarsha';
            adminUser.email = 'dhakalaadarshababu20590226@gmail.com';
            
            await adminUser.save();
            console.log('✅ Admin user updated successfully!');
        }

        console.log('\n📋 Admin Credentials:');
        console.log('   Username: admin_aadarsha');
        console.log('   Password: admin_password');
        console.log('   Email: dhakalaadarshababu20590226@gmail.com');
        console.log('   Role: admin\n');

        mongoose.connection.close();
        console.log('Database connection closed');
        process.exit(0);
    } catch (error) {
        console.error('❌ Error:', error.message);
        process.exit(1);
    }
}

updateAdminPassword();
