'use client';

import { useEffect, useState } from 'react';
import { useSocket } from './useSocket';
import { SeatCount } from '../types';

export function useSeatCounts() {
  const { socket, isConnected } = useSocket();
  const [seatCounts, setSeatCounts] = useState<SeatCount[]>([]);

  useEffect(() => {
    if (!socket) return;

    socket.on('seat-update', (data: SeatCount[]) => {
      setSeatCounts(data);
    });

    socket.on('seat-changed', (update: SeatCount) => {
      setSeatCounts((prev) => {
        const idx = prev.findIndex((s) => s.electiveId === update.electiveId);
        if (idx >= 0) {
          const newArray = [...prev];
          newArray[idx] = update;
          return newArray;
        }
        return [...prev, update];
      });
    });

    return () => {
      socket.off('seat-update');
      socket.off('seat-changed');
    };
  }, [socket]);

  return { seatCounts, isConnected };
}
