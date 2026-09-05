'use client';

import { tiempoRelativo } from '@/lib/tiempo';
import type { NotifItem } from '@/lib/useNotifications';

interface NotificationPanelProps {
  isOpen: boolean;
  onClose: () => void;
  items: NotifItem[];
  unread: number;
  onMarcarLeida: (id: number) => void;
  onMarcarTodas: () => void;
}

export default function NotificationPanel({
  isOpen,
  onClose,
  items,
  unread,
  onMarcarLeida,
  onMarcarTodas,
}: NotificationPanelProps) {
  return (
    <>
      <div className={`notif-overlay ${isOpen ? 'active' : ''}`} onClick={onClose} />
      <div className={`notif-panel ${isOpen ? 'open' : ''}`}>
        <div className="notif-header">
          <h3>Notificaciones</h3>
          <div className="notif-header-actions">
            {unread > 0 && (
              <button className="notif-mark-all" onClick={onMarcarTodas}>
                Marcar todas como leídas
              </button>
            )}
            <button className="notif-close" onClick={onClose} aria-label="Cerrar">
              <span className="material-symbols-outlined">close</span>
            </button>
          </div>
        </div>
        <div className="notif-body">
          {items.length === 0 && (
            <div className="notif-empty">
              <span className="material-symbols-outlined">notifications_off</span>
              <p>No tienes notificaciones</p>
            </div>
          )}
          {items.map((n) => (
            <div
              key={n.id}
              className={`notif-item ${n.leida ? '' : 'unread'}`}
              onClick={() => !n.leida && onMarcarLeida(n.id)}
            >
              <div className={`activity-icon ${n.clase}`}>
                <span className="material-symbols-outlined" style={{ fontSize: 18 }}>
                  {n.icono}
                </span>
              </div>
              <div className="activity-text" style={{ flex: 1 }}>
                <p>{n.mensaje}</p>
                <p>{tiempoRelativo(n.createdAt)}</p>
              </div>
              {!n.leida && <span className="notif-dot" />}
            </div>
          ))}
        </div>
      </div>
    </>
  );
}