import mongoose from 'mongoose';
import { env } from './env';

const MAX_RETRIES = 5;
const RETRY_DELAY_MS = 5000;

// Helper to delay execution using Promises
const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

export const connectDB = async (): Promise<void> => {
  let retries = 0;

  while (retries < MAX_RETRIES) {
    try {
      await mongoose.connect(env.MONGO_URI);
      console.log('✅ MongoDB connected successfully');
      return; // Exit loop on successful connection
    } catch (error) {
      retries += 1;
      console.error(`❌ MongoDB connection error (Attempt ${retries}/${MAX_RETRIES}):`, error);

      if (retries < MAX_RETRIES) {
        console.log(`Retrying connection in ${RETRY_DELAY_MS / 1000} seconds...`);
        await sleep(RETRY_DELAY_MS);
      } else {
        console.error('❌ Max retries reached. Exiting process...');
        process.exit(1);
      }
    }
  }
};

// Global Mongoose Event Listeners
mongoose.connection.on('disconnected', () => {
  console.warn('⚠️ MongoDB disconnected');
});

mongoose.connection.on('error', (err) => {
  console.error('❌ MongoDB error:', err);
});