import mongoose from 'mongoose';
import dotenv from 'dotenv';
import User from '../models/User';
import { env } from '../config/env';

dotenv.config();

const seedAdmin = async () => {
  try {
    await mongoose.connect(env.MONGO_URI as string);
    console.log('Connected to MongoDB');

    const adminEmail = process.env.ADMIN_EMAIL || 'admin@mit.asia';
    const existingAdmin = await User.findOne({ email: adminEmail });

    if (!existingAdmin) {
      const admin = new User({
        name: 'OE Admin',
        email: adminEmail,
        password: 'admin123',
        role: 'admin'
      });
      await admin.save();
      console.log('Admin user created:');
      console.log('Email:', adminEmail);
      console.log('Password: admin123');
    } else {
      console.log('Admin user already exists.');
    }

    // Seed Second Admin (FY Club Admin)
    const admin2Email = process.env.ADMIN2_EMAIL || 'admin2@mit.asia';
    const existingAdmin2 = await User.findOne({ email: admin2Email.toLowerCase() });

    if (!existingAdmin2) {
      const admin2 = new User({
        name: 'First Year Club Admin',
        email: admin2Email.toLowerCase(),
        password: 'admin123',
        role: 'FY_ADMIN'
      });
      await admin2.save();
      console.log('Admin 2 (FY Club Admin) user created:');
      console.log('Email:', admin2Email);
      console.log('Password: admin123');
      console.log('Role: FY_ADMIN');
    } else {
      existingAdmin2.role = 'FY_ADMIN';
      existingAdmin2.password = 'admin123';
      await existingAdmin2.save();
      console.log('Admin 2 user verified/updated (role: FY_ADMIN).');
    }

    await mongoose.disconnect();
    console.log('Disconnected from MongoDB');
    process.exit(0);
  } catch (error) {
    console.error('Seeding error:', error);
    process.exit(1);
  }
};

seedAdmin();
