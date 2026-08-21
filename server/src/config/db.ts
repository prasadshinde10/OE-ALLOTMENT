import mongoose from 'mongoose';
import { env } from './env';

const MAX_RETRIES = 5;
let retries = 0;

export const connectDB = async (): Promise<void> => {
  try {
    await mongoose.connect(env.MONGO_URI);
    console.log('✅ MongoDB connected successfully');
  } catch (error) {
    console.error('❌ MongoDB connection error:', error);
    if (retries < MAX_RETRIES) {
      retries += 1;
      console.log(`Retrying connection... (${retries}/${MAX_RETRIES})`);
      setTimeout(connectDB, 5000);
    } else {
      console.error('❌ Max retries reached. Exiting...');
      process.exit(1);
    }
  }
};

mongoose.connection.on('disconnected', () => {
  console.warn('⚠️ MongoDB disconnected');
});

mongoose.connection.on('error', (err) => {
  console.error('❌ MongoDB error:', err);
});
