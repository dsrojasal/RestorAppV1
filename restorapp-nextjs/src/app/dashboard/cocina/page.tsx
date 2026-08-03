'use client';

import { useState } from 'react';

interface Pedido {
  id: number; mesa: string; time: string; status: string; waiter: string;
  note: string; items: { name: string; qty: number; icon: string }[];
}

const PEDIDOS: Pedido[] = [
  { id: 1, mesa: 'Mesa 7', time: '12:25 pm', status: 'pendiente', waiter: 'Juan P.', note: 'Sin cebolla en una de las hamburguesas.', items: [{ name: 'Hamburguesa Clásica', qty: 2, icon: 'lunch_dining' }, { name: 'Refresco de Cola', qty: 1, icon: 'local_bar' }] },
  { id: 2, mesa: 'Mesa 12', time: '12:23 pm', status: 'preparacion', waiter: 'Sofía M.', note: 'Carne término medio.', items: [{ name: 'Lomo Saltado', qty: 1, icon: 'lunch_dining' }, { name: 'Limonada', qty: 1, icon: 'local_bar' }] },
  { id: 3, mesa: 'Mesa 5', time: '12:45 pm', status: 'pendiente', waiter: 'Ana G.', note: '', items: [{ name: 'Hamburguesa Clásica', qty: 2, icon: 'lunch_dining' }, { name: 'Papas Fritas', qty: 1, icon: 'set_meal' }, { name: 'Refresco', qty: 2, icon: 'local_bar' }] },
  { id: 4, mesa: 'Mesa 3', time: '12:21 pm', status: 'listo', waiter: 'Ana G.', note: 'Sin observaciones.', items: [{ name: 'Pizza Margarita', qty: 1, icon: 'lunch_dining' }, { name: 'Ensalada César', qty: 1, icon: 'set_meal' }] },
  { id: 5, mesa: 'Mesa 8', time: '12:35 pm', status: 'listo', waiter: 'Carlos P.', note: 'Pizza bien cocida.', items: [{ name: 'Pizza Margarita', qty: 1, icon: 'lunch_dining' }, { name: 'Refresco de Cola', qty: 2, icon: 'local_bar' }] },
  { id: 6, mesa: 'Terraza 1', time: '12:30 pm', status: 'preparacion', waiter: 'Lucía T.', note: '', items: [{ name: 'Tacos al Pastor', qty: 3, icon: 'lunch_dining' }, { name: 'Agua Fresca', qty: 1, icon: 'local_bar' }] },
];

const HISTORIAL = [
  { id: 101, mesa: 'Mesa 5', items: '2x Hamburguesa Clásica, 1x Ensalada César', time: '13:45' },
  { id: 102, mesa: 'Para llevar', items: '1x Pizza Margarita, 2x Refresco', time: '13:21' },
  { id: 103, mesa: 'Mesa 2', items: '1x Sopa de Tomate, 1x Pasta Carbonara', time: '12:55' },
  { id: 104, mesa: 'Terraza 1', items: '3x Tacos al Pastor, 1x Agua Fresca', time: '12:10' },
  { id: 105, mesa: 'Mesa 8', items: '1x Pizza Margarita, 2x Refresco', time: '11:48' },
];

export default function CocinaPage() {
  const [currentFilter, setCurrentFilter] = useState('todos');
  const [detailId, setDetailId] = useState<number | null>(null);
  const [historialOpen, setHistorialOpen] = useState(false);

  const filtered = currentFilter === 'todos' ? PEDIDOS : PEDIDOS.filter(p => p.status === currentFilter);
  const detailPedido = detailId ? PEDIDOS.find(p => p.id === detailId) : null;

  return (
    <>
      <div className="animate-in">
        <h2 className="page-title">Pedidos en Cocina</h2>
        <p className="page-subtitle">Visualiza y gestiona los pedidos entrantes.</p>
      </div>

      <div className="cocina-header-info animate-in animate-in-delay-1">
        <p className="cocina-welcome">Bienvenido, Chef</p>
        <button className="btn-historial" onClick={() => setHistorialOpen(true)}>
          <span className="material-symbols-outlined" style={{ fontSize: 18 }}>history</span>
          Historial
        </button>
      </div>

      <div className="segment-control animate-in animate-in-delay-1">
        {['todos', 'pendiente', 'preparacion', 'listo'].map(f => (
          <div
            key={f}
            className={`segment-option ${currentFilter === f ? 'active' : ''}`}
            onClick={() => setCurrentFilter(f)}
          >
            {f === 'todos' ? 'Todos' : f === 'pendiente' ? 'Pendientes' : f === 'preparacion' ? 'En preparación' : 'Listos'}
          </div>
        ))}
      </div>

      <div className="kitchen-list animate-in animate-in-delay-2">
        {filtered.length === 0 ? (
          <div className="kc-empty">
            <div className="material-symbols-outlined">{currentFilter === 'listo' ? 'check_circle' : 'soup_kitchen'}</div>
            <p>No hay pedidos {currentFilter === 'pendiente' ? 'pendientes' : currentFilter === 'preparacion' ? 'en preparación' : currentFilter === 'listo' ? 'listos' : 'activos'}.</p>
          </div>
        ) : (
          filtered.map(p => {
            const badgeClass = p.status;
            const badgeLabel = p.status === 'pendiente' ? 'Pendiente' : p.status === 'preparacion' ? 'En preparación' : 'Listo';
            const badgeIcon = p.status === 'pendiente' ? 'hourglass_top' : p.status === 'preparacion' ? 'soup_kitchen' : 'check';
            const noteHtml = p.note ? `<div class="kc-note"><span class="material-symbols-outlined">edit_note</span>${p.note}</div>` : '';
            return (
              <div key={p.id} className={`kc-card ${p.status === 'listo' ? 'listo' : ''}`} onClick={() => setDetailId(p.id)}>
                <div className="kc-card-header">
                  <span className="kc-card-mesa-time">{p.mesa} • {p.time}</span>
                  <span className={`kc-badge ${badgeClass}`}>
                    <span className="material-symbols-outlined" style={{ fontSize: 14 }}>{badgeIcon}</span>
                    {badgeLabel}
                  </span>
                </div>
                <div className="kc-divider" />
                <div className="kc-waiter">Mesero: {p.waiter}</div>
                <div className="kc-items">
                  {p.items.map((i, idx) => <div key={idx} className="kc-item">• {i.name} x{i.qty}</div>)}
                </div>
                {p.note && (
                  <div className="kc-note">
                    <span className="material-symbols-outlined">edit_note</span>{p.note}
                  </div>
                )}
                <div className="kc-btn disabled">
                  <span className="material-symbols-outlined" style={{ fontSize: 18 }}>
                    {p.status === 'pendiente' ? 'skillet' : p.status === 'preparacion' ? 'check_circle' : 'notifications_active'}
                  </span>
                  {p.status === 'pendiente' ? 'Iniciar preparación' : p.status === 'preparacion' ? 'Marcar como listo' : 'Notificado'}
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Detail bottom sheet */}
      <div className={`modal-overlay ${detailPedido ? 'open' : ''}`} onClick={() => setDetailId(null)} />
      <div className={`modal-sheet ${detailPedido ? 'open' : ''}`}>
        <div className="modal-handle" />
        <div className="modal-header">
          <h2>Detalle del Pedido</h2>
          <button className="modal-close" onClick={() => setDetailId(null)}>
            <span className="material-symbols-outlined">close</span>
          </button>
        </div>
        <div className="modal-body">
          {detailPedido && (
            <>
              <div className="detail-info-grid">
                <div className="detail-info-item">
                  <div className="detail-info-label"># de mesa</div>
                  <div className="detail-info-value">{detailPedido.mesa}</div>
                </div>
                <div className="detail-info-item">
                  <div className="detail-info-label">Tiempo del pedido</div>
                  <div className="detail-info-value">Hace {detailPedido.time}</div>
                </div>
              </div>
              <h4 className="text-base font-bold mb-2 mt-2" style={{ color: 'var(--text)' }}>Productos y cantidades</h4>
              <div style={{ border: '1px solid var(--border-light)', borderRadius: 'var(--radius)', padding: '0 12px', marginBottom: 16 }}>
                {detailPedido.items.map((i, idx) => (
                  <div key={idx} className="detail-product-row">
                    <div className="detail-product-icon">
                      <span className="material-symbols-outlined">{i.icon}</span>
                    </div>
                    <span style={{ flex: 1, fontSize: 14, fontWeight: 500, color: 'var(--text)' }}>{i.name}</span>
                    <span className="detail-product-qty">x{i.qty}</span>
                  </div>
                ))}
              </div>
              <h4 className="text-base font-bold mb-2" style={{ color: 'var(--text)' }}>Observaciones del mesero</h4>
              <div className="detail-note-box">
                <span className="material-symbols-outlined">sticky_note_2</span>
                <span>{detailPedido.note || 'Sin observaciones.'}</span>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Historial modal */}
      <div className={`modal-overlay ${historialOpen ? 'open' : ''}`} onClick={() => setHistorialOpen(false)} />
      <div className={`modal-sheet ${historialOpen ? 'open' : ''}`}>
        <div className="modal-handle" />
        <div className="modal-header">
          <h2>Historial de Pedidos</h2>
          <button className="modal-close" onClick={() => setHistorialOpen(false)}>
            <span className="material-symbols-outlined">close</span>
          </button>
        </div>
        <div className="modal-body">
          <div className="historial-stats">
            <div className="historial-stat-card">
              <div className="historial-stat-icon">
                <span className="material-symbols-outlined">timer</span>
              </div>
              <div>
                <div className="historial-stat-label">Tiempo promedio</div>
                <div className="historial-stat-value">15 min 30 seg</div>
              </div>
            </div>
          </div>
          <div className="segment-control" style={{ marginBottom: 12 }}>
            <div className="segment-option active">Pedidos del día</div>
            <div className="segment-option">Historial completo</div>
          </div>
          <h4 className="text-base font-bold mb-2" style={{ color: 'var(--text)' }}>Pedidos del día</h4>
          <div className="historial-list">
            {HISTORIAL.map(h => (
              <div key={h.id} className="historial-item">
                <div className="historial-item-icon">
                  <span className="material-symbols-outlined">check_circle</span>
                </div>
                <div className="historial-item-info">
                  <div className="historial-item-title">Pedido #{h.id} - {h.mesa}</div>
                  <div className="historial-item-desc">{h.items}</div>
                </div>
                <div className="historial-item-time">{h.time}</div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </>
  );
}
