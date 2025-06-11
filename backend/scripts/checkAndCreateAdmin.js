const mongoose = require('mongoose');
const Admin = require('../models/Admin');
const dotenv = require('dotenv');

dotenv.config();

const checkAndCreateAdmin = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected to MongoDB');

    const adminData = {
      username: 'admin',
      email: 'admin@skillswap.com',
      password: 'admin123',
      role: 'admin'
    };

    // Check if admin exists
    const existingAdmin = await Admin.findOne({
      $or: [
        { email: adminData.email },
        { username: adminData.username }
      ]
    });

    if (existingAdmin) {
      console.log('Admin user already exists:');
      console.log('Username:', existingAdmin.username);
      console.log('Email:', existingAdmin.email);
      process.exit(0);
    }

    // Create new admin
    const admin = new Admin(adminData);
    await admin.save();
    console.log('Admin user created successfully:');
    console.log('Username:', admin.username);
    console.log('Email:', admin.email);
    process.exit(0);
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
};

checkAndCreateAdmin(); 