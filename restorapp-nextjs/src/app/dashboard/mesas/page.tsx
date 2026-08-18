'use client';

import { useState, useEffect, useRef } from 'react';
import ModalSheet from '@/components/ModalSheet';
import ContextMenu, { ContextMenuRef } from '@/components/ContextMenu';
import { getAuthHeaders, handleApiError } from '@/lib/api';

interface Mesa {
  id: number;
  numero: number;
  capacidad: number;
  estado: string;
  descripcion: string;
}

const STATUS: Record<string, { label: string; color: string; dot: string }> = {
  libre: { label: 'Libre', color: '#2ECC71', dot: '#2ECC71' },
  ocupada: { label: 'Ocupada', color: '#F1C40F', dot: '#F1C40F' },
  reservada: { label: 'Reservada', color: '#E74C3C', dot: '#E74C3C' },
  mantenimiento: { label: 'Mantenimiento', color: '#3498DB', dot: '#3498DB' },
};

export default function MesasPage() {
  const [mesas, setMesas] = useState<Mesa[]>([]);
  const [loading, setLoading] = useState(true);
  const [detailId, setDetailId] = useState<number | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [editMesa, setEditMesa] = useState<Mesa | null>(null);
  const [estadoSel, setEstadoSel] = useState('libre');
  const menuRef = useRef<ContextMenuRef>(null);

  const load = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/backend/mesas', { headers: getAuthHeaders() });
      if (res.status === 401) {
        window.location.href = '/login';
        return;
      }
      if (!res.ok) {
        alert('Error al cargar las mesas');
        return;
      }
      const data = await res.json();
      setMesas(Array.isArray(data) ? data : []);
    } catch {
      alert('Error de conexión');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const total = mesas.length;
  const disponibles = mesas.filter((m) => m.estado === 'libre').length;

  const detailMesa = detailId ? mesas.find((m) => m.id === detailId) : null;
  const s = detailMesa ? STATUS[detailMesa.estado] || STATUS.libre : null;

  function closeDetail() { setDetailId(null); }

  async function saveMesa(e: React.FormEvent) {
    e.preventDefault();
    const numero = Number((document.getElementById('mesaNumero') as HTMLInputElement).value);
    const capacidad = Number((document.getElementById('mesaCapacidad') as HTMLInputElement).value);
    const descripcion = (document.getElementById('mesaDesc') as HTMLTextAreaElement).value;

    if (!numero || !capacidad) {
      alert('El número y la capacidad son obligatorios');
      return;
    }

    const payload = { numero, capacidad, descripcion, estado: estadoSel };
    const url = editMesa ? `/api/backend/mesas/${editMesa.id}` : '/api/backend/mesas';
    const method = editMesa ? 'PATCH' : 'POST';

    try {
      const res = await fetch(url, {
        method,
        headers: getAuthHeaders(),
        body: JSON.stringify(payload),
      });
      if (res.status === 401) {
        window.location.href = '/login';
        return;
      }
      if (!res.ok) {
        const err = await handleApiError(res);
        alert(err.message || 'Error al guardar la mesa');
        return;
      }
      setModalOpen(false);
      load();
    } catch {
      alert('Error de conexión');
    }
  }

  async function eliminarMesa(id: number) {
    if (!confirm('¿Seguro que deseas eliminar esta mesa?')) return;
    try {
      const res = await fetch(`/api/backend/mesas/${id}`, { method: 'DELETE', headers: getAuthHeaders() });
      if (res.status === 401) {
        window.location.href = '/login';
        return;
      }
      if (!res.ok) {
        const err = await handleApiError(res);
        alert(err.message || 'Error al eliminar la mesa');
        return;
      }
      if (detailId === id) setDetailId(null);
      load();
    } catch {
      alert('Error de conexión');
    }
  }

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
        <div className="legend-item"><div className="legend-dot" style={{ background: '#F1C40F' }} /> Ocupada</div>
        <div className="legend-item"><div className="legend-dot" style={{ background: '#E74C3C' }} /> Reservada</div>
        <div className="legend-item"><div className="legend-dot" style={{ background: '#3498DB' }} /> Mantenimiento</div>
      </div>

      {loading ? (
        <div className="card-data animate-in" style={{ textAlign: 'center', padding: '60px 24px' }}>
          <span className="material-symbols-outlined" style={{ fontSize: 48, color: 'var(--text-muted)', marginBottom: 12 }}>sync</span>
          <p style={{ color: 'var(--text-muted)' }}>Cargando mesas...</p>
        </div>
      ) : mesas.length === 0 ? (
        <div className="card-data animate-in" style={{ textAlign: 'center', padding: '60px 24px' }}>
          <span className="material-symbols-outlined" style={{ fontSize: 56, color: 'var(--text-muted)', marginBottom: 12 }}>table_restaurant</span>
          <h3 style={{ fontSize: 18, fontWeight: 700, color: 'var(--text)', marginBottom: 8 }}>No hay mesas</h3>
          <p style={{ color: 'var(--text-muted)', maxWidth: 380, margin: '0 auto' }}>Pulsa el botón + para crear la primera mesa del restaurante.</p>
        </div>
      ) : (
        <div className="tables-grid animate-in animate-in-delay-2">
          {mesas.map((m) => {
            const st = STATUS[m.estado] || STATUS.libre;
            return (
              <div key={m.id} className="table-card" onClick={() => setDetailId(m.id)}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <div className="status-dot-big" style={{ background: st.dot }} />
                  <button
                    className="user-action"
                    title="Opciones"
                    onClick={(e) => menuRef.current?.open(e, m.id)}
                    style={{ marginLeft: 'auto' }}
                  >
                    <span className="material-symbols-outlined">more_vert</span>
                  </button>
                </div>
                <div className="table-name">Mesa {m.numero}</div>
                {m.descripcion && <div className="table-desc">{m.descripcion}</div>}
                <div className="table-status" style={{ color: st.dot }}>{st.label}</div>
                <div className="text-xs" style={{ color: 'var(--text-muted)' }}>Capacidad: {m.capacidad}</div>
              </div>
            );
          })}
        </div>
      )}

      <button className="fab" title="Agregar nuevo" onClick={() => { setEditMesa(null); setEstadoSel('libre'); setModalOpen(true); }}>
        <span className="material-symbols-outlined">add</span>
      </button>

      <ContextMenu
        ref={menuRef}
        items={(id) => [
          {
            icon: 'edit',
            label: 'Editar',
            onClick: () => {
              const mesa = mesas.find((m) => m.id === id);
              if (mesa) { setEditMesa(mesa); setEstadoSel(mesa.estado || 'libre'); setModalOpen(true); }
            },
          },
          { icon: 'delete', label: 'Eliminar', danger: true, onClick: () => eliminarMesa(id) },
        ]}
      />

      {/* Detail sheet */}
      <div className={`modal-overlay ${detailMesa ? 'open' : ''}`} onClick={closeDetail} />
      <div className={`modal-sheet ${detailMesa ? 'open' : ''}`}>
        <div className="modal-handle" />
        <div className="modal-header">
          <h2>{detailMesa ? `Mesa ${detailMesa.numero}` : 'Mesa'}</h2>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <button className="bs-edit-btn" onClick={() => { if (detailMesa) { setEditMesa(detailMesa); setEstadoSel(detailMesa.estado || 'libre'); setModalOpen(true); } }}>
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
                <span className="text-sm ml-auto" style={{ color: 'var(--text-muted)' }}>Capacidad: {detailMesa.capacidad}</span>
              </div>
              {detailMesa.descripcion && <p className="text-sm mb-3" style={{ color: 'var(--text-muted)' }}>{detailMesa.descripcion}</p>}
              <div>
                <h4 className="text-base font-bold mb-2" style={{ color: 'var(--text)' }}>Pedido actual</h4>
                <div className="border rounded-xl p-4" style={{ borderColor: 'var(--border)' }}>
                  <p className="text-sm" style={{ color: 'var(--text-muted)' }}>No hay pedido activo.</p>
                </div>
              </div>
              <div className="mt-4 space-y-2">
                <div className="bs-action-btn disabled">
                  <span className="material-symbols-outlined">search</span> Ver pedido
                </div>
                <div className="bs-action-btn disabled">
                  <span className="material-symbols-outlined">send</span> Enviar a cocina
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Create / Edit mesa modal */}
      <ModalSheet isOpen={modalOpen} onClose={() => setModalOpen(false)} title={editMesa ? 'Editar Mesa' : 'Crear Nueva Mesa'}>
        <form onSubmit={saveMesa}>
          <div className="form-row">
            <div className="form-field">
              <label htmlFor="mesaNumero">Número de mesa</label>
              <input id="mesaNumero" placeholder="Ej. 9" type="number" min={1} defaultValue={editMesa?.numero || ''} required />
            </div>
            <div className="form-field">
              <label htmlFor="mesaCapacidad">Capacidad (personas)</label>
              <input id="mesaCapacidad" placeholder="Ej. 4" type="number" min={1} defaultValue={editMesa?.capacidad || ''} required />
            </div>
          </div>
          <div className="form-field">
            <label htmlFor="mesaEstado">Estado</label>
            <select id="mesaEstado" value={estadoSel} onChange={(e) => setEstadoSel(e.target.value)}>
              <option value="libre">Libre</option>
              <option value="ocupada">Ocupada</option>
              <option value="reservada">Reservada</option>
              <option value="mantenimiento">Mantenimiento</option>
            </select>
          </div>
          <div className="form-field">
            <label htmlFor="mesaDesc">Descripción</label>
            <textarea id="mesaDesc" placeholder="Ej. Mesa cerca de la ventana, capacidad 6 personas" rows={3} style={{ width: '100%', padding: '12px 14px', background: 'var(--bg)', border: '1.5px solid var(--border)', borderRadius: 'var(--radius)', fontSize: 14, color: 'var(--text)', outline: 'none', transition: 'all var(--transition)', fontFamily: 'inherit', resize: 'vertical' }} defaultValue={editMesa?.descripcion || ''} />
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