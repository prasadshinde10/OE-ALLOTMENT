'use client';

import { useEffect, useState } from 'react';
import { getSocket, disconnectSocket } from '../lib/socket';
import { Socket } from 'socket.io-client';

export function useSocket(year?: number | string) {
  const [socket, setSocket] = useState<Socket | null>(null);
  const [isConnected, setIsConnected] = useState(false);

  useEffect(() => {
    const s = getSocket();
    setSocket(s);

    const onConnect = () => {
      setIsConnected(true);
      if (year) {
        s.emit('join-year', Number(year));
      }
    };

    const onDisconnect = () => setIsConnected(false);

    s.on('connect', onConnect);
    s.on('disconnect', onDisconnect);

    s.connect();

    if (s.connected && year) {
      s.emit('join-year', Number(year));
    }

    return () => {
      s.off('connect', onConnect);
      s.off('disconnect', onDisconnect);
      disconnectSocket();
    };
  }, [year]);

  return { socket, isConnected };
}
