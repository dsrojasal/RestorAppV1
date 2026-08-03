'use client';

import { useState } from 'react';
import ModalSheet from '@/components/ModalSheet';

const STATUS: Record<string, { label: string; color: string; dot: string }> = {
  libre: { label: 'Libre', color: '#2ECC71', dot: '#2ECC71' },
  proceso: { label: 'Pedido en proceso', color: '#F1C40F', dot: '#F1C40F' },
  cocina: { label: 'Esperando cocina', color: '#E74C3C', dot: '#E74C3C' },
  entregado: { label: 'Pedido entregado', color: '#3498DB', dot: '#3498DB' },
};

interface Mesa {
  id: number; name: string; desc: string; status: string; waiter: string;
  order: { item: string; price: string }[] | null;
}

const MOCK_MESAS: Mesa[] = [
  { id: 1, name: 'Mesa 1', desc: 'Mesa principal cerca al escenario', status: 'libre', waiter: '', order: null },
  { id: 2, name: 'Mesa 2', desc: 'Mesa para 4 personas', status: 'proceso', waiter: 'Carlos Pérez', order: [{ item: '2x Hamburguesa Clásica', price: '$18.00' }, { item: '1x Papas Fritas', price: '$4.50' }, { item: '2x Refresco', price: '$5.00' }] },
  { id: 3, name: 'Mesa 3', desc: '', status: 'entregado', waiter: 'María García', order: [{ item: '1x Ensalada César', price: '$8.50' }, { item: '1x Sopa del Día', price: '$6.00' }] },
  { id: 4, name: 'Mesa 4', desc: 'Mesa para 2 personas, junto a la ventana', status: 'libre', waiter: '', order: null },
  { id: 5, name: 'Mesa 5', desc: '', status: 'cocina', waiter: 'Carlos Pérez', order: [{ item: '2x Hamburguesa Clásica', price: '$18.00' }, { item: '1x Papas Fritas', price: '$4.50' }, { item: '1x Refresco', price: '$2.50' }] },
  { id: 6, name: 'Mesa 6', desc: 'Mesa redonda, capacidad 6', status: 'proceso', waiter: 'Lucía Torres', order: [{ item: '1x Pizza Margarita', price: '$10.00' }, { item: '2x Refresco de Cola', price: '$5.00' }] },
  { id: 7, name: 'Terraza 1', desc: 'Zona exterior, sombra', status: 'entregado', waiter: 'María García', order: [{ item: '3x Tacos al Pastor', price: '$12.00' }, { item: '1x Agua Fresca', price: '$2.00' }] },
  { id: 8, name: 'Terraza 2', desc: 'Zona exterior, vista al jardín', status: 'libre', waiter: '', order: null },
];

export default function MesasPage() {
  const [detailId, setDetailId] = useState<number | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [editMesa, setEditMesa] = useState<Mesa | null>(null);

  const total = MOCK_MESAS.length;
  const disponibles = MOCK_MESAS.filter(m => m.status === 'libre').length;

  const detailMesa = detailId ? MOCK_MESAS.find(m => m.id === detailId) : null;
  const s = detailMesa ? STATUS[detailMesa.status] : null;

  function closeDetail() { setDetailId(null); }

  return (
    <>
      <div className="animate-in">
        <h2 className="page-title">Gestión de Mesas</h2>
        <p className="page-subtitle">Administra las mesas del restaurante y visualiza sus pedidos.</p>
      </div>

      <div className="stats-grid animate-in animate-in-delay-1">
        <div className="stat-card">
          <p className="stat-label">Total Mesas</p>
          <div className="stat-value">
            <span>{total}</span>
            <span className="material-symbols-outlined" style={{ color: 'var(--primary)', fontVariationSettings: "'FILL' 1" }}>table_restaurant</span>
          </div>
        </div>
        <div className="stat-card">
          <p className="stat-label">Disponibles</p>
          <div className="stat-value green">
            <span>{disponibles}</span>
            <span className="status-dot online" />
          </div>
        </div>
      </div>

      <div className="legend-bar animate-in animate-in-delay-1">
        <div className="legend-item"><div className="legend-dot" style={{ background: '#2ECC71' }} /> Libre</div>
        <div className="legend-item"><div className="legend-dot" style={{ background: '#F1C40F' }} /> Pedido en proceso</div>
        <div className="legend-item"><div className="legend-dot" style={{ background: '#E74C3C' }} /> Esperando cocina</div>
        <div className="legend-item"><div className="legend-dot" style={{ background: '#3498DB' }} /> Pedido entregado</div>
      </div>

      <div className="tables-grid animate-in animate-in-delay-2">
        {MOCK_MESAS.map(m => {
          const st = STATUS[m.status];
          const hasOrder = m.order && m.order.length > 0;
          return (
            <div key={m.id} className="table-card" onClick={() => setDetailId(m.id)}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <div className="status-dot-big" style={{ background: st.dot }} />
                {hasOrder && <div className="order-badge" style={{ background: st.dot }}>{m.order!.length}</div>}
              </div>
              <div className="table-name">{m.name}</div>
              {m.desc && <div className="table-desc">{m.desc}</div>}
              <div className="table-status" style={{ color: st.dot }}>{st.label}</div>
              {m.waiter && <div className="text-xs" style={{ color: 'var(--text-muted)' }}>{m.waiter}</div>}
            </div>
          );
        })}
      </div>

      <button className="fab" title="Agregar nuevo" onClick={() => { setEditMesa(null); setModalOpen(true); }}>
        <span className="material-symbols-outlined">add</span>
      </button>

      {/* Detail sheet */}
      <div className={`modal-overlay ${detailMesa ? 'open' : ''}`} onClick={closeDetail} />
      <div className={`modal-sheet ${detailMesa ? 'open' : ''}`}>
        <div className="modal-handle" />
        <div className="modal-header">
          <h2>{detailMesa?.name || 'Mesa'}</h2>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <button className="bs-edit-btn" onClick={() => { if (detailMesa) setEditMesa(detailMesa); setModalOpen(true); }}>
              <span className="material-symbols-outlined" style={{ fontSize: 16 }}>edit</span> Editar
            </button>
            <button className="modal-close" onClick={closeDetail}>
              <span className="material-symbols-outlined">close</span>
            </button>
          </div>
        </div>
        <div className="modal-body">
          {detailMesa && s && (
            <div className="bottom-sheet-order">
              <div className="flex items-center gap-3 mb-3">
                <div style={{ width: 16, height: 16, borderRadius: '50%', background: s.dot, flexShrink: 0 }} />
                <span className="font-semibold text-sm" style={{ color: s.dot }}>{s.label}</span>
                <span className="text-sm ml-auto" style={{ color: 'var(--text-muted)' }}>{detailMesa.waiter ? 'Mesero: ' + detailMesa.waiter : ''}</span>
              </div>
              {detailMesa.desc && <p className="text-sm mb-3" style={{ color: 'var(--text-muted)' }}>{detailMesa.desc}</p>}
              <div>
                <h4 className="text-base font-bold mb-2" style={{ color: 'var(--text)' }}>Pedido actual</h4>
                <div className="border rounded-xl p-4" style={{ borderColor: 'var(--border)' }}>
                  {detailMesa.order && detailMesa.order.length > 0 ? (
                    <>
                      {detailMesa.order.map((o, i) => (
                        <div key={i} className="order-item-row">
                          <span className="text-sm font-medium" style={{ color: 'var(--text)' }}>{o.item}</span>
                          <span className="text-sm" style={{ color: 'var(--text-secondary)' }}>{o.price}</span>
                        </div>
                      ))}
                      <div className="order-total-row">
                        <span style={{ color: 'var(--text)' }}>Total</span>
                        <span style={{ color: 'var(--text)' }}>
                          ${detailMesa.order.reduce((acc, o) => acc + (parseFloat(o.price.replace('$', '')) || 0), 0).toFixed(2)}
                        </span>
                      </div>
                    </>
                  ) : (
                    <p className="text-sm" style={{ color: 'var(--text-muted)' }}>No hay pedido activo.</p>
                  )}
                </div>
              </div>
              <div className="mt-4 space-y-2">
                <div className="bs-action-btn disabled">
                  <span className="material-symbols-outlined">search</span> Ver pedido
                </div>
                <div className="bs-action-btn disabled">
                  <span className="material-symbols-outlined">edit</span> Editar pedido
                </div>
                <div className="bs-action-btn disabled">
                  <span className="material-symbols-outlined">send</span> Enviar a cocina
                </div>
                <div className="bs-action-btn disabled">
                  <span className="material-symbols-outlined">check_circle</span> Cerrar pedido
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Create / Edit mesa modal */}
      <ModalSheet isOpen={modalOpen} onClose={() => setModalOpen(false)} title={editMesa ? 'Editar Mesa' : 'Crear Nueva Mesa'}>
        <form onSubmit={(e) => e.preventDefault()}>
          <input type="hidden" id="editMesaId" value={editMesa?.id || ''} />
          <div className="form-field">
            <label htmlFor="mesaNombre">Nombre de la mesa</label>
            <input id="mesaNombre" placeholder="Ej. Mesa 9, Terraza 3, VIP 1" type="text" defaultValue={editMesa?.name || ''} required />
          </div>
          <div className="form-field">
            <label htmlFor="mesaDesc">Descripción</label>
            <textarea id="mesaDesc" placeholder="Ej. Mesa cerca de la ventana, capacidad 6 personas" rows={3} style={{ width: '100%', padding: '12px 14px', background: 'var(--bg)', border: '1.5px solid var(--border)', borderRadius: 'var(--radius)', fontSize: 14, color: 'var(--text)', outline: 'none', transition: 'all var(--transition)', fontFamily: 'inherit', resize: 'vertical' }} defaultValue={editMesa?.desc || ''} />
          </div>
          <div className="modal-actions">
            <button className="btn-cancel" type="button" onClick={() => setModalOpen(false)}>Cancelar</button>
            <button className="btn-primary" type="submit">{editMesa ? 'Guardar Cambios' : 'Guardar Mesa'}</button>
          </div>
        </form>
      </ModalSheet>
    </>
  );
}
