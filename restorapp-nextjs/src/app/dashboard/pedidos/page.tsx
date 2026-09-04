'use client';

import { useState, useEffect, useCallback } from 'react';
import ModalSheet from '@/components/ModalSheet';
import { getAuthHeaders, handleApiError } from '@/lib/api';

interface Mesa { id: number; numero: number; capacidad: number; estado: string; }

interface Producto { id: number; nombre: string; precio: number; tipo: string; stock: number; isActive: boolean; }

interface DetallePedido {
  id: number; productoId: number; cantidad: number; precioUnitario: number; subtotal: number;
  estado: 'pendiente' | 'en_preparacion' | 'listo' | 'entregado' | 'cancelado';
  observacion: string | null; updatedAt: string;
  producto: { id: number; nombre: string; precio: number; tipo: string };
}

interface Pedido {
  id: number; mesaId: number; usuarioId: number; estado: string; total: number;
  observaciones: string | null; createdAt: string; tipoPagoId: number | null;
  detalles: DetallePedido[];
  mesa: { id: number; numero: number; estado: string };
  usuario: { id: number; name: string; email: string };
}

interface Factura { id: number; pedidoId: number; total: number; estadoPago: string; tipoPago?: { id: number; nombre: string } | null; }

interface Me { id: number; name: string; rolId: number; }

interface TipoPago { id: number; nombre: string; }

const LINE_STATE: Record<string, { label: string; color: string }> = {
  pendiente: { label: 'Pendiente', color: '#F39C12' },
  en_preparacion: { label: 'En preparación', color: '#3498DB' },
  listo: { label: 'Listo', color: '#2ECC71' },
  entregado: { label: 'Entregado', color: '#95A5A6' },
  cancelado: { label: 'Cancelado', color: '#E74C3C' },
};

const MESA_COLOR: Record<string, string> = {
  libre: '#2ECC71', ocupada: '#F1C40F', reservada: '#E74C3C', mantenimiento: '#3498DB',
};

const TIPO_LABEL: Record<string, string> = { plato: 'Platos', bebida: 'Bebidas', postre: 'Postres', otro: 'Otros' };

const fmt = (n: number | string) => '$' + Number(n).toLocaleString('es-CO', { maximumFractionDigits: 0 });

function pedidoGeneralStatus(p: Pedido): { label: string; color: string; bg: string } {
  const activos = p.detalles.filter(d => d.estado !== 'cancelado');
  if (activos.some(d => d.estado === 'pendiente' || d.estado === 'en_preparacion'))
    return { label: 'En cocina', color: '#B45309', bg: '#FEF3C7' };
  if (activos.some(d => d.estado === 'listo'))
    return { label: 'Listo para servir', color: '#065F46', bg: '#D1FAE5' };
  if (activos.length > 0 && activos.every(d => d.estado === 'entregado'))
    return { label: 'Entregado', color: '#374151', bg: '#F3F4F6' };
  return { label: 'Sin ítems', color: '#6B7280', bg: '#F9FAFB' };
}

function minsTranscurridos(fecha: string): number {
  return Math.max(0, Math.floor((Date.now() - new Date(fecha).getTime()) / 60000));
}

function fmtHora(fecha: string): string {
  return new Date(fecha).toLocaleString('es-ES', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' });
}

export default function PedidosPage() {
  const [mesas, setMesas] = useState<Mesa[]>([]);
  const [productos, setProductos] = useState<Producto[]>([]);
  const [pedidos, setPedidos] = useState<Pedido[]>([]);
  const [me, setMe] = useState<Me | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedMesaId, setSelectedMesaId] = useState<number | null>(null);
  const [busy, setBusy] = useState(false);

  // Modales
  const [addOpen, setAddOpen] = useState(false);
  const [addTarget, setAddTarget] = useState<{ type: 'create'; mesaId: number } | { type: 'add'; pedidoId: number } | null>(null);
  const [cart, setCart] = useState<Record<number, number>>({});
  const [search, setSearch] = useState('');
  const [tipoFilter, setTipoFilter] = useState('todos');

  const [cobrarTarget, setCobrarTarget] = useState<Pedido | null>(null);
  const [cobrarModo, setCobrarModo] = useState<'caja' | 'propio' | null>(null);
  const [tipoPagos, setTipoPagos] = useState<TipoPago[]>([]);
  const [selectedTipoPago, setSelectedTipoPago] = useState<number | null>(null);

  const [editTarget, setEditTarget] = useState<{ pedidoId: number; linea: DetallePedido } | null>(null);
  const [editCantidad, setEditCantidad] = useState(1);
  const [editObs, setEditObs] = useState('');

  const [transferTarget, setTransferTarget] = useState<Pedido | null>(null);
  const [transferMesaId, setTransferMesaId] = useState<number | null>(null);

  const [menuTarget, setMenuTarget] = useState<Pedido | null>(null);
  const [confirmDeletePedido, setConfirmDeletePedido] = useState<Pedido | null>(null);

  const load = useCallback(async () => {
    try {
      setLoading(true);
      const headers = getAuthHeaders();
      const [mesasRes, prodsRes, pedidosRes, meRes] = await Promise.all([
        fetch('/api/backend/mesas', { headers }),
        fetch('/api/backend/productos', { headers }),
        fetch('/api/backend/pedidos', { headers }),
        fetch('/api/backend/usuarios/me', { headers }),
      ]);
      if (mesasRes.status === 401 || pedidosRes.status === 401) { window.location.href = '/login'; return; }
      if (!mesasRes.ok || !prodsRes.ok || !pedidosRes.ok) { alert('Error al cargar los datos'); return; }
      const [mesasData, prodsData, pedidosData, meData] = await Promise.all([
        mesasRes.json(), prodsRes.json(), pedidosRes.json(), meRes.json(),
      ]);
      setMesas(Array.isArray(mesasData) ? mesasData : []);
      setProductos(Array.isArray(prodsData) ? prodsData.filter((p: Producto) => p.isActive) : []);
      setPedidos(Array.isArray(pedidosData) ? pedidosData : []);
      if (meData?.id) setMe({ id: meData.id, name: meData.name, rolId: meData.rolId });
      if (!selectedMesaId && Array.isArray(mesasData) && mesasData.length > 0) setSelectedMesaId(mesasData[0].id);
    } catch { /* noop */ } finally { setLoading(false); }
  }, [selectedMesaId]);

  useEffect(() => { load(); }, [load]);
  useEffect(() => { const t = setInterval(load, 10000); return () => clearInterval(t); }, [load]);

  const loadTipoPagos = useCallback(async () => {
    try {
      const res = await fetch('/api/backend/tipo-pago', { headers: getAuthHeaders() });
      if (res.ok) setTipoPagos(await res.json());
    } catch { /* noop */ }
  }, []);

  useEffect(() => { if (addOpen || cobrarTarget || editTarget || transferTarget) loadTipoPagos(); }, [addOpen, cobrarTarget, editTarget, transferTarget, loadTipoPagos]);

  const selectedMesa = mesas.find(m => m.id === selectedMesaId) || null;
  const mesaPedidos = pedidos.filter(p => p.mesaId === selectedMesaId && p.estado !== 'cancelado');
  const canCreate = !!me && [1, 2, 4].includes(me.rolId);
  const canChangeState = !!me && [1, 2, 3, 4].includes(me.rolId);
  const filteredProductos = productos.filter(p => {
    const q = search.trim().toLowerCase();
    if (q && !p.nombre.toLowerCase().includes(q)) return false;
    if (tipoFilter !== 'todos' && p.tipo !== tipoFilter) return false;
    return true;
  });
  const cartTotal = Object.entries(cart).reduce((acc, [id, qty]) => acc + (productos.find(x => x.id === Number(id))?.precio || 0) * qty, 0);
  const addQty = (id: number, delta: number) => setCart(prev => { const n = (prev[id] || 0) + delta; const c = { ...prev }; if (n <= 0) delete c[id]; else c[id] = n; return c; });

  async function api(method: string, url: string, body?: object) {
    const res = await fetch(url, { method, headers: getAuthHeaders(), body: body ? JSON.stringify(body) : undefined });
    if (res.status === 401) { window.location.href = '/login'; return null; }
    if (!res.ok) { const err = await handleApiError(res); alert(err.message || 'Error'); return null; }
    if (res.status === 204) return null;
    const text = await res.text();
    return text ? JSON.parse(text) : null;
  }

  async function confirmPedido() {
    if (!addTarget) return;
    const lineas = Object.entries(cart).map(([productoId, cantidad]) => ({ productoId: Number(productoId), cantidad }));
    if (lineas.length === 0) { alert('Agrega al menos un producto'); return; }
    setBusy(true);
    const url = addTarget.type === 'create' ? '/api/backend/pedidos' : `/api/backend/pedidos/${addTarget.pedidoId}/lineas`;
    const body = addTarget.type === 'create' ? { mesaId: addTarget.mesaId, usuarioId: me!.id, lineas } : lineas[0];
    const result = await api('POST', url, body);
    setBusy(false);
    if (result) { setAddOpen(false); setAddTarget(null); await load(); }
  }

  async function entregarLinea(pedidoId: number, lineaId: number) {
    if (!confirm('¿Marcar como entregado?')) return;
    const result = await api('POST', `/api/backend/pedidos/${pedidoId}/lineas/${lineaId}/entregar`);
    if (result) await load();
  }

  async function removeLine(pedidoId: number, lineaId: number, nombre: string) {
    if (!confirm(`¿Quitar ${nombre} del pedido?`)) return;
    const result = await api('DELETE', `/api/backend/pedidos/${pedidoId}/lineas/${lineaId}`);
    if (result) await load();
  }

  async function confirmEdit() {
    if (!editTarget) return;
    setBusy(true);
    const result = await api('PATCH', `/api/backend/pedidos/${editTarget.pedidoId}/lineas/${editTarget.linea.id}`, {
      cantidad: editCantidad,
      observacion: editObs || null,
    });
    setBusy(false);
    if (result) { setEditTarget(null); await load(); }
  }

  async function confirmCobrar() {
    if (!cobrarTarget || !cobrarModo) return;
    setBusy(true);
    const body: { modo: string; tipoPagoId?: number } = { modo: cobrarModo };
    if (cobrarModo === 'propio') body.tipoPagoId = selectedTipoPago!;
    const result = await api('POST', `/api/backend/pedidos/${cobrarTarget.id}/cobrar`, body);
    setBusy(false);
    if (result) {
      alert(cobrarModo === 'caja' ? 'Pedido enviado a caja' : 'Cobro registrado');
      setCobrarTarget(null); setCobrarModo(null); setSelectedTipoPago(null); await load();
    }
  }

  async function confirmTransfer() {
    if (!transferTarget || !transferMesaId) return;
    setBusy(true);
    const result = await api('PATCH', `/api/backend/pedidos/${transferTarget.id}/transferir`, { mesaId: transferMesaId });
    setBusy(false);
    if (result) { setTransferTarget(null); setTransferMesaId(null); setSelectedMesaId(transferMesaId); await load(); }
  }

  async function doDeletePedido() {
    if (!confirmDeletePedido) return;
    setBusy(true);
    const result = await api('DELETE', `/api/backend/pedidos/${confirmDeletePedido.id}`);
    setBusy(false);
    if (result !== null || result === null) { setConfirmDeletePedido(null); await load(); }
  }

  function openEdit(pedidoId: number, linea: DetallePedido) {
    setEditTarget({ pedidoId, linea });
    setEditCantidad(linea.cantidad);
    setEditObs(linea.observacion || '');
  }

  const totalOcupadas = mesas.filter(m => m.estado === 'ocupada').length;

  return (
    <>
      <div className="animate-in">
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <h2 className="page-title" style={{ marginBottom: 0 }}>Pedidos</h2>
          {me && <span style={{ fontSize: 13, color: 'var(--text-muted)', fontWeight: 500, marginLeft: 8 }}>Atendiendo: {me.name}</span>}
        </div>
        <p className="page-subtitle">Registra y gestiona los pedidos de cada mesa en tiempo real.</p>
      </div>

      <div className="stats-grid animate-in animate-in-delay-1">
        <div className="stat-card">
          <p className="stat-label">Pedidos Activos</p>
          <div className="stat-value">
            <span>{pedidos.filter(p => p.estado !== 'cancelado').length}</span>
            <span className="material-symbols-outlined" style={{ color: 'var(--primary)', fontVariationSettings: "'FILL' 1" }}>receipt_long</span>
          </div>
        </div>
        <div className="stat-card">
          <p className="stat-label">Mesas Ocupadas</p>
          <div className="stat-value">
            <span>{totalOcupadas}</span>
            <span className="material-symbols-outlined" style={{ color: '#F1C40F', fontVariationSettings: "'FILL' 1" }}>table_restaurant</span>
          </div>
        </div>
      </div>

      {loading ? (
        <div className="card-data animate-in" style={{ textAlign: 'center', padding: '60px 24px' }}>
          <span className="material-symbols-outlined" style={{ fontSize: 48, color: 'var(--text-muted)', marginBottom: 12 }}>sync</span>
          <p style={{ color: 'var(--text-muted)' }}>Cargando pedidos...</p>
        </div>
      ) : (
        <>
          <div className="animate-in animate-in-delay-1" style={{ marginBottom: 16, overflowX: 'auto', paddingBottom: 4 }}>
            <div style={{ display: 'flex', gap: 8, width: 'max-content' }}>
              {mesas.map(m => (
                <button key={m.id} onClick={() => setSelectedMesaId(m.id)} className="mesa-chip"
                  style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 16px', borderRadius: 'var(--radius-lg)',
                    border: `1.5px solid ${selectedMesaId === m.id ? 'var(--primary)' : 'var(--border)'}`,
                    background: selectedMesaId === m.id ? 'rgba(46,204,113,0.1)' : 'var(--bg-card)',
                    cursor: 'pointer', fontWeight: 600, fontSize: 14, color: 'var(--text)',
                    transition: 'all var(--transition)', whiteSpace: 'nowrap' }}>
                  <span style={{ width: 10, height: 10, borderRadius: '50%', background: MESA_COLOR[m.estado] || '#95A5A6', flexShrink: 0 }} />
                  Mesa {m.numero}
                </button>
              ))}
            </div>
          </div>

          {!selectedMesa ? (
            <div className="card-data animate-in" style={{ textAlign: 'center', padding: '60px 24px' }}>
              <p style={{ color: 'var(--text-muted)' }}>Selecciona una mesa para ver sus pedidos.</p>
            </div>
          ) : mesaPedidos.length === 0 ? (
            <div className="card-data animate-in animate-in-delay-2" style={{ textAlign: 'center', padding: '60px 24px' }}>
              <span className="material-symbols-outlined" style={{ fontSize: 56, color: 'var(--text-muted)', marginBottom: 12 }}>receipt_long</span>
              <h3 style={{ fontSize: 18, fontWeight: 700, color: 'var(--text)', marginBottom: 8 }}>Mesa {selectedMesa.numero} sin pedido</h3>
              <p style={{ color: 'var(--text-muted)', maxWidth: 380, margin: '0 auto', marginBottom: 20 }}>
                {canCreate ? 'Crea el primer pedido para empezar a registrar ítems.' : 'No hay pedidos en esta mesa.'}
              </p>
              {canCreate && (
                <button className="btn-primary" onClick={() => { setCart({}); setSearch(''); setTipoFilter('todos'); setAddTarget({ type: 'create', mesaId: selectedMesaId! }); setAddOpen(true); }}>
                  <span className="material-symbols-outlined" style={{ fontSize: 18 }}>add</span> Crear Pedido
                </button>
              )}
            </div>
          ) : (
            <div className="animate-in animate-in-delay-2" style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              {mesaPedidos.map(p => {
                const st = pedidoGeneralStatus(p);
                return (
                  <div key={p.id} className="card-data" style={{ position: 'relative' }}>
                    {/* Header */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
                      <h3 style={{ fontSize: 16, fontWeight: 700, color: 'var(--text)', margin: 0 }}>Pedido #{p.id} · Mesa {p.mesa?.numero}</h3>
                      <span style={{ padding: '3px 10px', borderRadius: 999, fontSize: 12, fontWeight: 700, background: st.bg, color: st.color }}>{st.label}</span>
                      <span style={{ marginLeft: 'auto', color: 'var(--text-muted)', fontSize: 12 }}>{fmtHora(p.createdAt)}</span>
                      <button className="user-action" onClick={() => setMenuTarget(menuTarget?.id === p.id ? null : p)} title="Opciones">
                        <span className="material-symbols-outlined">more_vert</span>
                      </button>
                    </div>
                    {p.usuario?.name && <p style={{ fontSize: 12, color: 'var(--text-muted)', margin: '0 0 10px' }}>Atendido por: <strong>{p.usuario.name}</strong></p>}

                    {/* ⋮ Dropdown menu */}
                    {menuTarget?.id === p.id && (
                      <div style={{ position: 'absolute', top: 48, right: 12, background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', padding: 6, zIndex: 20, minWidth: 180, boxShadow: 'var(--shadow-lg)' }}>
                        {canCreate && (
                          <button style={{ display: 'flex', alignItems: 'center', gap: 8, width: '100%', padding: '10px 12px', border: 'none', background: 'none', cursor: 'pointer', fontSize: 14, color: 'var(--text)', borderRadius: 'var(--radius)', textAlign: 'left' }}
                            onClick={() => { setTransferTarget(p); setTransferMesaId(null); setMenuTarget(null); }}>
                            <span className="material-symbols-outlined" style={{ fontSize: 18 }}>swap_horiz</span> Transferir mesa
                          </button>
                        )}
                        <button style={{ display: 'flex', alignItems: 'center', gap: 8, width: '100%', padding: '10px 12px', border: 'none', background: 'none', cursor: 'not-allowed', fontSize: 14, color: 'var(--text-muted)', borderRadius: 'var(--radius)', textAlign: 'left' }} disabled>
                          <span className="material-symbols-outlined" style={{ fontSize: 18 }}>call_split</span> Dividir cuenta <span style={{ fontSize: 11, marginLeft: 'auto', opacity: 0.6 }}>Próximamente</span>
                        </button>
                        {canCreate && (
                          <button style={{ display: 'flex', alignItems: 'center', gap: 8, width: '100%', padding: '10px 12px', border: 'none', background: 'none', cursor: 'pointer', fontSize: 14, color: '#E74C3C', borderRadius: 'var(--radius)', textAlign: 'left' }}
                            onClick={() => { setConfirmDeletePedido(p); setMenuTarget(null); }}>
                            <span className="material-symbols-outlined" style={{ fontSize: 18 }}>delete</span> Eliminar pedido
                          </button>
                        )}
                      </div>
                    )}

                    {/* Ítems */}
                    {p.detalles?.map(d => {
                      const stL = LINE_STATE[d.estado] || LINE_STATE.pendiente;
                      const urgent = d.estado === 'listo' && minsTranscurridos(d.updatedAt) >= 5;
                      return (
                        <div key={d.id} className="order-item-row" style={{ gap: 10, opacity: d.estado === 'entregado' || d.estado === 'cancelado' ? 0.5 : 1 }}>
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <div className="font-semibold text-sm" style={{ color: 'var(--text)', display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                              <span>{d.producto?.nombre}</span>
                              <span className="text-xs" style={{ color: stL.color, border: `1px solid ${stL.color}55`, background: `${stL.color}1a`, padding: '2px 8px', borderRadius: 999, fontSize: 11 }}>{stL.label}</span>
                              {urgent && <span style={{ fontSize: 11, color: '#DC2626', fontWeight: 700, background: '#FEE2E2', padding: '2px 8px', borderRadius: 999 }}>Listo hace {minsTranscurridos(d.updatedAt)} min</span>}
                            </div>
                            {d.observacion && <div className="text-xs" style={{ color: 'var(--text-muted)', marginTop: 2 }}>Obs: {d.observacion}</div>}
                          </div>
                          <div style={{ textAlign: 'right', color: 'var(--text)', fontSize: 13, whiteSpace: 'nowrap' }}>
                            <div className="text-xs" style={{ color: 'var(--text-muted)' }}>{d.cantidad} × {fmt(d.precioUnitario)}</div>
                            <div className="font-semibold">{fmt(d.subtotal)}</div>
                          </div>
                          <div style={{ display: 'flex', gap: 2 }}>
                            {d.estado === 'listo' && canChangeState && (
                              <button className="user-action" title="Marcar entregado" onClick={() => entregarLinea(p.id, d.id)}>
                                <span className="material-symbols-outlined" style={{ fontSize: 18, color: '#2ECC71' }}>check_circle</span>
                              </button>
                            )}
                            {(d.estado === 'pendiente' || d.estado === 'en_preparacion' || d.estado === 'listo') && canCreate && (
                              <button className="user-action" title="Editar" onClick={() => openEdit(p.id, d)}>
                                <span className="material-symbols-outlined" style={{ fontSize: 18, color: '#8B5CF6' }}>edit</span>
                              </button>
                            )}
                            {d.estado === 'pendiente' && canCreate && (
                              <button className="user-action" title="Eliminar ítem" onClick={() => removeLine(p.id, d.id, d.producto?.nombre)}>
                                <span className="material-symbols-outlined" style={{ fontSize: 18, color: '#E74C3C' }}>delete</span>
                              </button>
                            )}
                          </div>
                        </div>
                      );
                    })}

                    {/* Footer */}
                    <div className="order-total-row" style={{ marginTop: 10 }}>
                      <span className="font-semibold text-sm" style={{ color: 'var(--text)' }}>Total cuenta</span>
                      <span className="font-bold" style={{ color: 'var(--primary)', fontSize: 16 }}>{fmt(p.total)}</span>
                    </div>
                    <div className="mt-4" style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                      {canCreate && (
                        <button className="btn-primary" style={{ flex: 1, minWidth: 160, background: '#3498DB' }}
                          onClick={() => { setCart({}); setSearch(''); setTipoFilter('todos'); setAddTarget({ type: 'add', pedidoId: p.id }); setAddOpen(true); }}>
                          <span className="material-symbols-outlined" style={{ fontSize: 18 }}>add</span> Agregar ítem
                        </button>
                      )}
                      {canCreate && (() => {
                        const cobrable = p.detalles.some(d => d.estado === 'entregado' || d.estado === 'listo');
                        const bloqueado = !!p.tipoPagoId; // tiene factura PENDIENTE/PAGADA asociada
                        return (
                          <button className="btn-primary" style={{ flex: 1, minWidth: 160, opacity: cobrable && !bloqueado ? 1 : 0.5 }}
                            disabled={!cobrable || bloqueado || busy}
                            onClick={() => { setCobrarTarget(p); setCobrarModo(null); setSelectedTipoPago(null); }}>
                            <span className="material-symbols-outlined" style={{ fontSize: 18 }}>payments</span> Cobrar / Cerrar mesa
                          </button>
                        );
                      })()}
                    </div>
                    {p.tipoPagoId && <p style={{ fontSize: 12, color: '#B45309', background: '#FEF3C7', padding: '6px 10px', borderRadius: 'var(--radius)', marginTop: 8, fontWeight: 600 }}>⏳ En espera de cobro en caja</p>}
                  </div>
                );
              })}
            </div>
          )}
        </>
      )}

      {/* Modal: Agregar producto */}
      <ModalSheet isOpen={addOpen} onClose={() => setAddOpen(false)} title={addTarget?.type === 'create' ? 'Nuevo Pedido' : 'Agregar ítem'}>
        <div className="segment-control" style={{ marginBottom: 12 }}>
          {['todos', 'plato', 'bebida', 'postre'].map(t => (
            <button key={t} onClick={() => setTipoFilter(t)} className="seg-btn"
              style={{ flex: 1, padding: '8px 0', borderRadius: 'var(--radius)', border: 'none', background: tipoFilter === t ? 'var(--bg-card)' : 'transparent',
                color: tipoFilter === t ? 'var(--primary)' : 'var(--text-muted)', fontWeight: 600, fontSize: 13, cursor: 'pointer', boxShadow: tipoFilter === t ? 'var(--shadow)' : 'none' }}>
              {TIPO_LABEL[t]}
            </button>
          ))}
        </div>
        <div className="form-field" style={{ marginBottom: 12 }}>
          <input placeholder="Buscar producto..." value={search} onChange={e => setSearch(e.target.value)}
            style={{ width: '100%', padding: '12px 14px', background: 'var(--bg)', border: '1.5px solid var(--border)', borderRadius: 'var(--radius)', fontSize: 14, color: 'var(--text)', outline: 'none' }} />
        </div>
        <div style={{ maxHeight: 340, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 8 }}>
          {filteredProductos.length === 0 ? (
            <p className="text-sm" style={{ color: 'var(--text-muted)', textAlign: 'center', padding: '20px 0' }}>Sin productos disponibles.</p>
          ) : filteredProductos.map(p => {
            const qty = cart[p.id] || 0;
            return (
              <div key={p.id} className="order-item-row" style={{ padding: '10px 0', gap: 10 }}>
                <div style={{ flex: 1 }}>
                  <div className="font-semibold text-sm" style={{ color: 'var(--text)' }}>{p.nombre}</div>
                  <div className="text-xs" style={{ color: 'var(--text-muted)' }}>{fmt(p.precio)}</div>
                </div>
                {qty === 0 ? (
                  <button className="btn-primary" onClick={() => addQty(p.id, 1)} style={{ padding: '6px 14px', fontSize: 13 }}>
                    <span className="material-symbols-outlined" style={{ fontSize: 16 }}>add</span> Agregar
                  </button>
                ) : (
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <button className="user-action" onClick={() => addQty(p.id, -1)}><span className="material-symbols-outlined" style={{ fontSize: 20, color: '#E74C3C' }}>remove</span></button>
                    <span className="font-bold" style={{ minWidth: 18, textAlign: 'center' }}>{qty}</span>
                    <button className="user-action" onClick={() => addQty(p.id, 1)}><span className="material-symbols-outlined" style={{ fontSize: 20, color: 'var(--primary)' }}>add</span></button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
        <div className="order-total-row" style={{ marginTop: 12 }}>
          <span className="font-semibold text-sm" style={{ color: 'var(--text)' }}>Total</span>
          <span className="font-bold" style={{ color: 'var(--primary)', fontSize: 16 }}>{fmt(cartTotal)}</span>
        </div>
        <div className="modal-actions" style={{ marginTop: 16 }}>
          <button className="btn-cancel" onClick={() => setAddOpen(false)}>Cancelar</button>
          <button className="btn-primary" disabled={busy} onClick={confirmPedido}>{busy ? 'Guardando...' : 'Guardar Pedido'}</button>
        </div>
      </ModalSheet>

      {/* Modal: Cobrar */}
      <ModalSheet isOpen={!!cobrarTarget} onClose={() => { setCobrarTarget(null); setCobrarModo(null); }} title="Cobrar / Cerrar mesa">
        {cobrarTarget && (
          <div>
            <p style={{ fontSize: 14, color: 'var(--text-muted)', marginBottom: 16 }}>Pedido #{cobrarTarget.id} · Total: <strong style={{ color: 'var(--text)' }}>{fmt(cobrarTarget.total)}</strong></p>
            <div style={{ display: 'flex', gap: 12, marginBottom: 16 }}>
              <button onClick={() => { setCobrarModo('caja'); setSelectedTipoPago(null); }}
                style={{ flex: 1, padding: '20px 12px', border: `2px solid ${cobrarModo === 'caja' ? '#3498DB' : 'var(--border)'}`, borderRadius: 'var(--radius-lg)', background: cobrarModo === 'caja' ? '#EFF6FF' : 'var(--bg-card)', cursor: 'pointer', textAlign: 'center' }}>
                <span className="material-symbols-outlined" style={{ fontSize: 32, color: '#3498DB', marginBottom: 8, display: 'block' }}>storefront</span>
                <div style={{ fontWeight: 700, fontSize: 14, color: 'var(--text)' }}>Enviar a caja</div>
                <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 4 }}>La cajera hará el cobro</div>
              </button>
              <button onClick={() => { setCobrarModo('propio'); }}
                style={{ flex: 1, padding: '20px 12px', border: `2px solid ${cobrarModo === 'propio' ? 'var(--primary)' : 'var(--border)'}`, borderRadius: 'var(--radius-lg)', background: cobrarModo === 'propio' ? '#F0FDF4' : 'var(--bg-card)', cursor: 'pointer', textAlign: 'center' }}>
                <span className="material-symbols-outlined" style={{ fontSize: 32, color: 'var(--primary)', marginBottom: 8, display: 'block' }}>payments</span>
                <div style={{ fontWeight: 700, fontSize: 14, color: 'var(--text)' }}>Cobrar tú mismo</div>
                <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 4 }}>Selecciona método de pago</div>
              </button>
            </div>
            {cobrarModo === 'propio' && (
              <div style={{ marginBottom: 16 }}>
                <label style={{ fontSize: 13, fontWeight: 600, color: 'var(--text)', display: 'block', marginBottom: 8 }}>Método de pago</label>
                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                  {tipoPagos.map(tp => (
                    <button key={tp.id} onClick={() => setSelectedTipoPago(tp.id)}
                      style={{ padding: '10px 16px', border: `1.5px solid ${selectedTipoPago === tp.id ? 'var(--primary)' : 'var(--border)'}`, borderRadius: 'var(--radius)',
                        background: selectedTipoPago === tp.id ? 'rgba(46,204,113,0.1)' : 'var(--bg-card)', cursor: 'pointer', fontWeight: 600, fontSize: 13, color: 'var(--text)', transition: 'all var(--transition)' }}>
                      {tp.nombre}
                    </button>
                  ))}
                </div>
              </div>
            )}
            <div className="modal-actions">
              <button className="btn-cancel" onClick={() => { setCobrarTarget(null); setCobrarModo(null); }}>Cancelar</button>
              <button className="btn-primary" disabled={busy || !cobrarModo || (cobrarModo === 'propio' && !selectedTipoPago)} onClick={confirmCobrar}>
                {busy ? 'Procesando...' : cobrarModo === 'caja' ? 'Enviar a caja' : 'Confirmar cobro'}
              </button>
            </div>
          </div>
        )}
      </ModalSheet>

      {/* Modal: Editar ítem */}
      <ModalSheet isOpen={!!editTarget} onClose={() => setEditTarget(null)} title="Editar ítem">
        {editTarget && (
          <div>
            <p style={{ fontSize: 14, fontWeight: 600, color: 'var(--text)', marginBottom: 12 }}>{editTarget.linea.producto?.nombre}</p>
            <div className="form-field" style={{ marginBottom: 12 }}>
              <label style={{ fontSize: 13, fontWeight: 600, color: 'var(--text)', display: 'block', marginBottom: 6 }}>Cantidad</label>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <button className="user-action" onClick={() => setEditCantidad(Math.max(1, editCantidad - 1))}><span className="material-symbols-outlined" style={{ fontSize: 20, color: '#E74C3C' }}>remove</span></button>
                <span className="font-bold" style={{ fontSize: 18, minWidth: 30, textAlign: 'center' }}>{editCantidad}</span>
                <button className="user-action" onClick={() => setEditCantidad(editCantidad + 1)}><span className="material-symbols-outlined" style={{ fontSize: 20, color: 'var(--primary)' }}>add</span></button>
              </div>
            </div>
            <div className="form-field" style={{ marginBottom: 16 }}>
              <label style={{ fontSize: 13, fontWeight: 600, color: 'var(--text)', display: 'block', marginBottom: 6 }}>Observación</label>
              <input value={editObs} onChange={e => setEditObs(e.target.value)} placeholder="Ej: sin cebolla, término medio..."
                style={{ width: '100%', padding: '12px 14px', background: 'var(--bg)', border: '1.5px solid var(--border)', borderRadius: 'var(--radius)', fontSize: 14, color: 'var(--text)', outline: 'none' }} />
            </div>
            <div className="modal-actions">
              <button className="btn-cancel" onClick={() => setEditTarget(null)}>Cancelar</button>
              <button className="btn-primary" disabled={busy} onClick={confirmEdit}>{busy ? 'Guardando...' : 'Guardar cambios'}</button>
            </div>
          </div>
        )}
      </ModalSheet>

      {/* Modal: Transferir mesa */}
      <ModalSheet isOpen={!!transferTarget} onClose={() => setTransferTarget(null)} title="Transferir mesa">
        {transferTarget && (
          <div>
            <p style={{ fontSize: 14, color: 'var(--text-muted)', marginBottom: 12 }}>Pedido #{transferTarget.id} · Mesa actual: <strong>{transferTarget.mesa?.numero}</strong></p>
            <label style={{ fontSize: 13, fontWeight: 600, color: 'var(--text)', display: 'block', marginBottom: 8 }}>Selecciona mesa destino</label>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(100px, 1fr))', gap: 8, marginBottom: 16 }}>
              {mesas.filter(m => m.id !== transferTarget.mesaId && m.estado === 'libre').map(m => (
                <button key={m.id} onClick={() => setTransferMesaId(m.id)}
                  style={{ padding: '12px', border: `1.5px solid ${transferMesaId === m.id ? 'var(--primary)' : 'var(--border)'}`, borderRadius: 'var(--radius)',
                    background: transferMesaId === m.id ? 'rgba(46,204,113,0.1)' : 'var(--bg-card)', cursor: 'pointer', fontWeight: 700, fontSize: 14, color: 'var(--text)', transition: 'all var(--transition)' }}>
                  Mesa {m.numero}
                </button>
              ))}
              {mesas.filter(m => m.id !== transferTarget.mesaId && m.estado === 'libre').length === 0 && (
                <p style={{ gridColumn: '1/-1', textAlign: 'center', color: 'var(--text-muted)', fontSize: 14, padding: '12px 0' }}>No hay mesas libres disponibles.</p>
              )}
            </div>
            <div className="modal-actions">
              <button className="btn-cancel" onClick={() => setTransferTarget(null)}>Cancelar</button>
              <button className="btn-primary" disabled={busy || !transferMesaId} onClick={confirmTransfer}>{busy ? 'Transfiriendo...' : 'Transferir'}</button>
            </div>
          </div>
        )}
      </ModalSheet>

      {/* Modal: Confirmar eliminar pedido */}
      <ModalSheet isOpen={!!confirmDeletePedido} onClose={() => setConfirmDeletePedido(null)} title="Eliminar pedido">
        {confirmDeletePedido && (
          <div>
            <p style={{ fontSize: 14, color: 'var(--text)', marginBottom: 8 }}>¿Eliminar el Pedido #{confirmDeletePedido.id}?</p>
            <p style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 16 }}>Esta acción no se puede deshacer. La mesa se liberará.</p>
            <div className="modal-actions">
              <button className="btn-cancel" onClick={() => setConfirmDeletePedido(null)}>Cancelar</button>
              <button className="btn-primary" style={{ background: '#E74C3C' }} disabled={busy} onClick={doDeletePedido}>
                {busy ? 'Eliminando...' : 'Eliminar pedido'}
              </button>
            </div>
          </div>
        )}
      </ModalSheet>
    </>
  );
}