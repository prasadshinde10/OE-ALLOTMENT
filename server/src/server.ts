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
import User from './models/User';
import { setupSocket } from './socket';

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

// Make Socket.io accessible in routes
app.set('io', io);

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/electives', electiveRoutes);
app.use('/api/allocation', allocationRoutes);
app.use('/api/students', studentRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/export', exportRoutes);

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

    await verifyMailer();

    server.listen(PORT, () => {
      console.log(`🚀 Server running on port ${PORT}`);
      console.log(`📡 Socket.io ready`);
      console.log(`🌐 Client URL: ${env.CLIENT_URL}`);
    });
  } catch (error) {
    console.error('❌ Failed to start server:', error);
    process.exit(1);
  }
}

start();

