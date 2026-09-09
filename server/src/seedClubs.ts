import mongoose from 'mongoose';
import dotenv from 'dotenv';
import { seedFirstYearClubs } from './scripts/seedClubs';
import { env } from './config/env';

dotenv.config();

if (require.main === module) {
  (async () => {
    try {
      if (mongoose.connection.readyState === 0) {
        await mongoose.connect(env.MONGO_URI as string);
        console.log('✅ Connected to MongoDB');
      }
      await seedFirstYearClubs();
      process.exit(0);
    } catch (err) {
      console.error('❌ Failed seeding clubs:', err);
      process.exit(1);
    }
  })();
}

export { seedFirstYearClubs };
