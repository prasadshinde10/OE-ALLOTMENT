import { Server, Socket } from 'socket.io';
import jwt from 'jsonwebtoken';
import { env } from '../config/env';

let ioInstance: Server | null = null;

export function setupSocket(io: Server) {
  ioInstance = io;
  io.use((socket: Socket, next) => {
    const token = socket.handshake.auth?.token;
    if (!token) return next(new Error('Authentication error'));
    try {
      const decoded = jwt.verify(token, env.JWT_SECRET);
      (socket as any).user = decoded;
      next();
    } catch (err) {
      next(new Error('Authentication error'));
    }
  });

  io.on('connection', (socket: Socket) => {
    const user = (socket as any).user;
    console.log(`Socket connected: ${socket.id} (User: ${user.email})`);

    socket.on('join-year', (year: number) => {
      socket.join(`year-${year}`);
      console.log(`Socket ${socket.id} joined year-${year}`);
    });

    socket.on('join-club-year', (year: number) => {
      socket.join(`club-year-${year}`);
      console.log(`Socket ${socket.id} joined club-year-${year}`);
    });

    socket.on('disconnect', () => {
      console.log(`Socket disconnected: ${socket.id}`);
    });
  });
}

export function broadcastSeatUpdate(ioOrYear: any, yearOrData?: any, dataMaybe?: any) {
  if (dataMaybe) {
    ioOrYear.to(`year-${yearOrData}`).emit('seat-changed', dataMaybe);
  } else if (ioInstance) {
    ioInstance.to(`year-${ioOrYear}`).emit('seat-changed', yearOrData);
  }
}

export function broadcastClubSeatUpdate(ioOrData: any, clubDataMaybe?: any) {
  const io = clubDataMaybe ? ioOrData : ioInstance;
  const data = clubDataMaybe ? clubDataMaybe : ioOrData;
  if (io) {
    io.to('club-year-1').emit('club-seat-changed', data);
  }
}
