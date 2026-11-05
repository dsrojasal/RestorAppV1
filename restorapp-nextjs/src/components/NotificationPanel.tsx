'use client';

import { useEffect } from 'react';
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

function NotifRow({
  n,
  onMarcarLeida,
}: {
  n: NotifItem;
  onMarcarLeida: (id: number) => void;
}) {
  return (
    <li className="notif-li">
      <button
        type="button"
        className={`notif-item ${n.leida ? '' : 'unread'}`}
        onClick={() => !n.leida && onMarcarLeida(n.id)}
      >
        <span className={`notif-icon ${n.clase ?? ''}`} aria-hidden="true">
          <span className="material-symbols-outlined">{n.icono}</span>
        </span>

        <span className="notif-content">
          <span className="notif-message">{n.mensaje}</span>
          <span className="notif-time">{tiempoRelativo(n.createdAt)}</span>
        </span>

        <span className="notif-dot-slot">
          {!n.leida && <span className="notif-dot" aria-label="No leída" />}
        </span>
      </button>
    </li>
  );
}

export default function NotificationPanel({
  isOpen,
  onClose,
  items,
  unread,
  onMarcarLeida,
  onMarcarTodas,
}: NotificationPanelProps) {
  useEffect(() => {
    if (!isOpen) return;
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [isOpen, onClose]);

  const nuevas = items.filter((n) => !n.leida);
  const anteriores = items.filter((n) => n.leida);

  return (
    <>
      <div
        className={`notif-overlay ${isOpen ? 'active' : ''}`}
        onClick={onClose}
        aria-hidden="true"
      />
      <aside
        className={`notif-panel ${isOpen ? 'open' : ''}`}
        role="dialog"
        aria-modal="true"
        aria-label="Notificaciones"
        aria-hidden={!isOpen}
      >
        <header className="notif-header">
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
        </header>

        <div className="notif-body">
          {items.length === 0 ? (
            <div className="notif-empty">
              <span className="material-symbols-outlined">notifications_off</span>
              <p>No tienes notificaciones</p>
              <small>Cuando haya novedades, aparecerán aquí.</small>
            </div>
          ) : (
            <>
              {nuevas.length > 0 && (
                <section>
                  <h4 className="notif-section">Nuevas</h4>
                  <ul className="notif-list">
                    {nuevas.map((n) => (
                      <NotifRow key={n.id} n={n} onMarcarLeida={onMarcarLeida} />
                    ))}
                  </ul>
                </section>
              )}
              {anteriores.length > 0 && (
                <section>
                  <h4 className="notif-section">Anteriores</h4>
                  <ul className="notif-list">
                    {anteriores.map((n) => (
                      <NotifRow key={n.id} n={n} onMarcarLeida={onMarcarLeida} />
                    ))}
                  </ul>
                </section>
              )}
            </>
          )}
        </div>
      </aside>
    </>
  );
}