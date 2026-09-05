'use client';

import { useEffect, useRef, useState } from 'react';
import { getSocket } from './socket';

export function useLiveData(events: string[], refresh: () => void, pollMs = 60000): boolean {
  const refreshRef = useRef(refresh);
  refreshRef.current = refresh;
  const eventsKey = events.join('|');
  const [connected, setConnected] = useState(() => getSocket().connected);

  useEffect(() => {
    const socket = getSocket();
    const updateConnected = () => setConnected(socket.connected);
    updateConnected();
    socket.on('connect', updateConnected);
    socket.on('disconnect', updateConnected);

    const handleEvent = () => refreshRef.current();
    events.forEach((e) => socket.on(e, handleEvent));
    socket.on('reconnect', handleEvent);

    const poll = pollMs > 0 ? setInterval(() => refreshRef.current(), pollMs) : null;

    return () => {
      socket.off('connect', updateConnected);
      socket.off('disconnect', updateConnected);
      events.forEach((e) => socket.off(e, handleEvent));
      socket.off('reconnect', handleEvent);
      if (poll) clearInterval(poll);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [eventsKey, pollMs]);

  return connected;
}