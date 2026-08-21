import { Server, Socket } from 'socket.io';
import jwt from 'jsonwebtoken';
import { env } from '../config/env';

export function setupSocket(io: Server) {
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

    socket.on('disconnect', () => {
      console.log(`Socket disconnected: ${socket.id}`);
    });
  });
}

export function broadcastSeatUpdate(io: Server, year: number, electiveData: any) {
  io.to(`year-${year}`).emit('seat-changed', electiveData);
}
