'use client';

import { useEffect, useState } from 'react';
import { getSocket, disconnectSocket } from '../lib/socket';
import { ClubSeatCount } from '../types';
import { Socket } from 'socket.io-client';

export function useClubSeatCounts() {
  const [socket, setSocket] = useState<Socket | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [seatCounts, setSeatCounts] = useState<ClubSeatCount[]>([]);

  useEffect(() => {
    const s = getSocket();
    setSocket(s);

    const onConnect = () => {
      setIsConnected(true);
      s.emit('join-club-year', 1);
    };

    const onDisconnect = () => setIsConnected(false);

    s.on('connect', onConnect);
    s.on('disconnect', onDisconnect);

    s.connect();

    if (s.connected) {
      s.emit('join-club-year', 1);
    }

    const handleSeatChanged = (update: any) => {
      setSeatCounts((prev) => {
        const idx = prev.findIndex(
          (c) => (c.clubId || c._id) === (update.clubId || update._id)
        );
        if (idx >= 0) {
          const updated = [...prev];
          updated[idx] = { ...updated[idx], ...update };
          return updated;
        }
        return [...prev, update];
      });
    };

    s.on('club-seat-changed', handleSeatChanged);

    return () => {
      s.off('connect', onConnect);
      s.off('disconnect', onDisconnect);
      s.off('club-seat-changed', handleSeatChanged);
      disconnectSocket();
    };
  }, []);

  return { seatCounts, setSeatCounts, isConnected, socket };
}
