import mongoose from 'mongoose';
import dotenv from 'dotenv';
import User from '../models/User';
import { env } from '../config/env';

dotenv.config();

const seedAdmin = async () => {
  try {
    await mongoose.connect(env.MONGO_URI as string);
    console.log('Connected to MongoDB');

    const adminEmail = (env.ADMIN_EMAIL || 'admin@mit.asia').toLowerCase();
    const adminPassword = env.ADMIN_PASSWORD;
    const existingAdmin = await User.findOne({ email: adminEmail });

    if (!existingAdmin) {
      if (!adminPassword) {
        console.error('❌ Error: ADMIN_PASSWORD environment variable is required to create OE Admin.');
        process.exit(1);
      }
      const admin = new User({
        name: 'OE Admin',
        email: adminEmail,
        password: adminPassword,
        role: 'admin'
      });
      await admin.save();
      console.log('Admin user created:', adminEmail);
    } else {
      console.log('Admin user already exists:', adminEmail);
    }

    // Seed Second Admin (FY Club Admin)
    const admin2Email = (env.ADMIN2_EMAIL || 'admin2@mit.asia').toLowerCase();
    const admin2Password = env.ADMIN2_PASSWORD;
    const existingAdmin2 = await User.findOne({ email: admin2Email });

    if (!existingAdmin2) {
      if (!admin2Password) {
        console.error('❌ Error: ADMIN2_PASSWORD environment variable is required to create FY Club Admin.');
        process.exit(1);
      }
      const admin2 = new User({
        name: 'First Year Club Admin',
        email: admin2Email,
        password: admin2Password,
        role: 'FY_ADMIN'
      });
      await admin2.save();
      console.log('Admin 2 (FY Club Admin) user created:', admin2Email);
    } else {
      if (existingAdmin2.role !== 'FY_ADMIN') {
        existingAdmin2.role = 'FY_ADMIN';
        await existingAdmin2.save();
      }
      console.log('Admin 2 user verified:', admin2Email);
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
