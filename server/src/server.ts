import dotenv from 'dotenv';
dotenv.config();

import express, { Request, Response, NextFunction } from 'express';
import http from 'http';
import { Server } from 'socket.io';
import cors from 'cors';

import { env } from './config/env';
import { connectDB } from './config/db';
import { verifyMailer } from './config/mailer';
import authRoutes from './routes/authRoutes';
import electiveRoutes from './routes/electiveRoutes';
import allocationRoutes from './routes/allocationRoutes';
import studentRoutes from './routes/studentRoutes';
import adminRoutes from './routes/adminRoutes';
import exportRoutes from './routes/exportRoutes';
import testRoutes from './routes/testRoutes';
import choiceRoutes from './routes/choiceRoutes';
import clubRoutes from './routes/clubRoutes';
import clubAllocationRoutes from './routes/clubAllocationRoutes';
import fyAdminRoutes from './routes/fyAdminRoutes';
import fyBranchRoutes from './routes/fyBranchRoutes';
import User from './models/User';
import { setupSocket } from './socket';
import { initializeAllocationEngine, drainAndShutdown } from './services/allocationEngine';

const app = express();
app.set('trust proxy', 1);
const server = http.createServer(app);
const allowedOrigins = env.CLIENT_URL.split(',').map((url) => url.trim().replace(/\/$/, ''));

const corsOriginHandler = (origin: string | undefined, callback: (err: Error | null, allow?: boolean) => void) => {
  // Allow requests with no origin (e.g. mobile apps, curl, server-to-server)
  if (!origin) return callback(null, true);
  
  const cleanOrigin = origin.replace(/\/$/, '');
  // Match exact allowed origins, wildcard, onrender.com subdomains, or localhost in dev
  if (
    allowedOrigins.includes(cleanOrigin) ||
    allowedOrigins.includes('*') ||
    cleanOrigin.endsWith('.onrender.com') ||
    cleanOrigin.includes('localhost')
  ) {
    return callback(null, true);
  }
  return callback(null, true);
};

const io = new Server(server, {
  cors: {
    origin: corsOriginHandler,
    methods: ['GET', 'POST', 'PUT', 'DELETE'],
    credentials: true,
  },
  transports: ['websocket', 'polling'],
});

// Middleware
app.use(cors({ origin: corsOriginHandler, credentials: true }));
app.use(express.json({ limit: '10mb' }));

// Session & Passport (required for Microsoft SSO OAuth flow)
import session from 'express-session';
import passport from 'passport';
// Import microsoftAuthController to trigger Passport strategy registration
import './controllers/microsoftAuthController';

app.use(
  session({
    secret: env.JWT_SECRET,
    resave: false,
    saveUninitialized: false,
    cookie: { secure: env.NODE_ENV === 'production' },
  })
);
app.use(passport.initialize());
app.use(passport.session());

// Make Socket.io accessible in routes
app.set('io', io);

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/electives', electiveRoutes);
app.use('/api/allocation', allocationRoutes);
app.use('/api/students', studentRoutes);
app.use('/api/student', studentRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/export', exportRoutes);
app.use('/api/test', testRoutes);
app.use('/api/choices', choiceRoutes);
app.use('/api/clubs', clubRoutes);
app.use('/api/club-allocation', clubAllocationRoutes);
app.use('/api/fy-admin', fyAdminRoutes);
app.use('/api/fy-branches', fyBranchRoutes);

// Public aliases for branches & departments
import { getBranches } from './controllers/adminController';
app.get('/api/branches', getBranches);
app.get('/api/departments', getBranches);

// Health check
app.get('/api/health', (_req: Request, res: Response) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Socket.io setup
setupSocket(io);

// Global error handler
app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
  console.error('Unhandled error:', err);
  res.status(err.status || 500).json({
    success: false,
    message: env.NODE_ENV === 'production' ? 'Internal Server Error' : err.message,
  });
});

// Start server
const PORT = env.PORT;

async function start() {
  try {
    await connectDB();
    console.log('✅ Connected to MongoDB');

    // ── Initialize in-memory FCFS allocation engine ────────────────────────
    // Must run after DB connects and before server starts listening.
    // Hydrates clubSeatCache + clubMetaCache and starts the 500ms flush interval.
    await initializeAllocationEngine();

    // Ensure default super admin exists
    try {
      const adminEmail = process.env.ADMIN_EMAIL || 'admin@mit.asia';
      const existingAdmin = await User.findOne({ email: adminEmail.toLowerCase() });
      if (!existingAdmin) {
        const defaultAdmin = new User({
          name: 'Super Admin',
          email: adminEmail.toLowerCase(),
          password: 'admin123',
          role: 'admin',
        });
        await defaultAdmin.save();
        console.log(`👑 Default admin created: ${adminEmail} (password: admin123)`);
      }
    } catch (adminErr) {
      console.warn('⚠️ Could not verify default admin:', adminErr);
    }

    // Ensure Admin 2 (First-Year Club Admin) exists with role FY_ADMIN
    try {
      const admin2Email = process.env.ADMIN2_EMAIL || 'admin2@mit.asia';
      const existingAdmin2 = await User.findOne({ email: admin2Email.toLowerCase() });
      if (!existingAdmin2) {
        const defaultAdmin2 = new User({
          name: 'First Year Club Admin',
          email: admin2Email.toLowerCase(),
          password: 'admin123',
          role: 'FY_ADMIN',
        });
        await defaultAdmin2.save();
        console.log(`👑 Default Admin 2 created: ${admin2Email} (password: admin123, role: FY_ADMIN)`);
      } else {
        existingAdmin2.role = 'FY_ADMIN';
        existingAdmin2.password = 'admin123';
        await existingAdmin2.save();
        console.log(`👑 Admin 2 verified & updated: ${admin2Email} (password: admin123, role: FY_ADMIN)`);
      }
    } catch (admin2Err) {
      console.warn('⚠️ Could not verify Admin 2:', admin2Err);
    }

    // Ensure default First-Year Branches exist if none are configured
    try {
      const Branch = (await import('./models/Branch')).default;
      const fyBranchCount = await Branch.countDocuments({ year: 1 });
      if (fyBranchCount === 0) {
        const defaultFYBranches = [
          'FY-CSE',
          'FY-CSD',
          'FY-AI&DS',
          'FY-MECH',
        ];
        for (const bName of defaultFYBranches) {
          await Branch.create({ name: bName, year: 1 });
        }
        console.log('🌿 Default First-Year branches initialized (FY-CSE, FY-CSD, FY-AI&DS, FY-MECH)');
      }
    } catch (branchErr) {
      console.warn('⚠️ Could not initialize default FY branches:', branchErr);
    }

    // Seed default First-Year Clubs (Co-Curricular & Extra-Curricular)
    try {
      const { seedFirstYearClubs } = await import('./scripts/seedClubs');
      await seedFirstYearClubs();
    } catch (seedErr) {
      console.warn('⚠️ Could not seed First-Year clubs:', seedErr);
    }

    await verifyMailer();

    server.listen(PORT, () => {
      console.log(`🚀 Server running on port ${PORT}`);
      console.log(`📡 Socket.io ready`);
      console.log(`🌐 Client URL: ${env.CLIENT_URL}`);
      console.log(`⚡ High-Throughput Stress Testing Route ready: POST /api/test/stress-db`);
    });
  } catch (error) {
    console.error('❌ Failed to start server:', error);
    process.exit(1);
  }
}

start();

// ── Graceful Shutdown ──────────────────────────────────────────────────────────
// Drain any buffered writes before the process exits so no allocations are lost.
const gracefulShutdown = async (signal: string) => {
  console.log(`\n⚠️  ${signal} received — draining write buffer before exit…`);
  await drainAndShutdown();
  process.exit(0);
};
process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT',  () => gracefulShutdown('SIGINT'));
