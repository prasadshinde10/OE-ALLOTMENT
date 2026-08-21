import mongoose from 'mongoose';
import dotenv from 'dotenv';
import User from '../models/User';
import { env } from '../config/env';

dotenv.config();

const seedAdmin = async () => {
  try {
    await mongoose.connect(env.MONGO_URI as string);
    console.log('Connected to MongoDB');

    const adminEmail = env.ADMIN_EMAIL || 'admin@mit.asia';
    const existingAdmin = await User.findOne({ email: adminEmail });

    if (!existingAdmin) {
      const admin = new User({
        name: 'Super Admin',
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

    await mongoose.disconnect();
    console.log('Disconnected from MongoDB');
    process.exit(0);
  } catch (error) {
    console.error('Seeding error:', error);
    process.exit(1);
  }
};

seedAdmin();
