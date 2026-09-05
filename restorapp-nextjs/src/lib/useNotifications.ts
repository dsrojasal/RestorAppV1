'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { getSocket } from './socket';

export interface NotifItem {
  id: number;
  tipo: string;
  mensaje: string;
  icono: string;
  clase: string;
  refId: string | null;
  createdAt: string;
  leida: boolean;
}

export function useNotifications() {
  const [items, setItems] = useState<NotifItem[]>([]);
  const [unread, setUnread] = useState(0);
  const refreshRef = useRef<() => Promise<void>>(async () => {});

  const refresh = useCallback(async () => {
    try {
      const res = await fetch('/api/backend/notificaciones', {
        headers: { 'Content-Type': 'application/json' },
      });
      if (!res.ok) return;
      const data: unknown = await res.json();
      if (Array.isArray(data)) {
        setItems(data as NotifItem[]);
        setUnread((data as NotifItem[]).filter((n) => !n.leida).length);
      }
    } catch {
      /* sin red: se ignora, reintenta en la próxima conexión */
    }
  }, []);

  refreshRef.current = refresh;

  useEffect(() => {
    refresh();
    const socket = getSocket();
    const onNueva = (n: NotifItem) => {
      setItems((prev) => [n, ...prev].slice(0, 50));
      setUnread((u) => u + 1);
    };
    const onReconexion = () => refreshRef.current();
    socket.on('notificacion.nueva', onNueva);
    socket.on('connect', onReconexion);
    socket.on('reconnect', onReconexion);
    return () => {
      socket.off('notificacion.nueva', onNueva);
      socket.off('connect', onReconexion);
      socket.off('reconnect', onReconexion);
    };
  }, [refresh]);

  const marcarLeida = useCallback(async (id: number) => {
    setItems((prev) => prev.map((n) => (n.id === id ? { ...n, leida: true } : n)));
    setUnread((u) => Math.max(0, u - 1));
    try {
      await fetch(`/api/backend/notificaciones/${id}/leer`, { method: 'POST' });
    } catch {
      /* optimista: el backend ordena por leida = false en el próximo refetch */
    }
  }, []);

  const marcarTodas = useCallback(async () => {
    setUnread(0);
    setItems((prev) => prev.map((n) => ({ ...n, leida: true })));
    try {
      await fetch('/api/backend/notificaciones/leer-todas', { method: 'POST' });
    } catch {
      /* optimista */
    }
  }, []);

  return { items, unread, refresh, marcarLeida, marcarTodas };
}