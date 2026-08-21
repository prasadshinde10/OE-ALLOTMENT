'use client';

import { useEffect, useState } from 'react';
import { useSocket } from './useSocket';
import { SeatCount } from '../types';

export function useSeatCounts(year?: number | string) {
  const { socket, isConnected } = useSocket(year);
  const [seatCounts, setSeatCounts] = useState<SeatCount[]>([]);

  useEffect(() => {
    if (!socket) return;

    const handleSeatUpdate = (data: SeatCount[]) => {
      setSeatCounts(data);
    };

    const handleSeatChanged = (update: SeatCount) => {
      setSeatCounts((prev) => {
        const idx = prev.findIndex((s) => s.electiveId === update.electiveId);
        if (idx >= 0) {
          const newArray = [...prev];
          newArray[idx] = update;
          return newArray;
        }
        return [...prev, update];
      });
    };

    socket.on('seat-update', handleSeatUpdate);
    socket.on('seat-changed', handleSeatChanged);

    return () => {
      socket.off('seat-update', handleSeatUpdate);
      socket.off('seat-changed', handleSeatChanged);
    };
  }, [socket]);

  return { seatCounts, isConnected };
}
