'use client';

import { useState, useEffect, useCallback } from 'react';
import ModalSheet from '@/components/ModalSheet';
import LiveIndicator from '@/components/LiveIndicator';
import { useLiveData } from '@/lib/useLiveData';
import { getAuthHeaders, handleApiError } from '@/lib/api';

interface Mesa { id: number; numero: number; capacidad: number; estado: string; }

interface Producto { id: number; nombre: string; precio: number; tipo: string; stock: number; isActive: boolean; }

interface DisponibilidadItem {
  productoId: number;
  nombre: string;
  tipo: string;
  disponible: number | null;
  motivo: string | null;
  tieneReceta: boolean;
}

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
  facturas: Factura[];
}

interface Factura { id: number; pedidoId: number; total: number; estadoPago: string; tipoPago?: { id: number; nombre: string } | null; cobradoPor?: { name: string } | null; cobradoPorRol?: string | null; fechaCobro?: string | null; }

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

const ESTADO_LABEL: Record<string, string> = {
  libre: 'Libre', ocupada: 'Ocupada', reservada: 'Reservada', mantenimiento: 'Mantenimiento',
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

function estadoCobro(p: Pedido): 'pagado' | 'en_caja' | 'activo' {
  const facturas = p.facturas || [];
  if (facturas.some(f => f.estadoPago === 'pagado')) return 'pagado';
  if (facturas.some(f => f.estadoPago === 'pendiente')) return 'en_caja';
  return 'activo';
}

function fmtHora(fecha: string): string {
  return new Date(fecha).toLocaleString('es-CO', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit', timeZone: 'America/Bogota' });
}

export default function PedidosPage() {
  const [mesas, setMesas] = useState<Mesa[]>([]);
  const [productos, setProductos] = useState<Producto[]>([]);
  const [disponibilidad, setDisponibilidad] = useState<DisponibilidadItem[]>([]);
  const [pedidos, setPedidos] = useState<Pedido[]>([]);
  const [me, setMe] = useState<Me | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedMesaId, setSelectedMesaId] = useState<number | null>(null);
  const [busy, setBusy] = useState(false);

  // Modales
  const [addOpen, setAddOpen] = useState(false);
  const [addTarget, setAddTarget] = useState<{ type: 'create'; mesaId: number } | { type: 'add'; pedidoId: number } | null>(null);
  const [cart, setCart] = useState<Record<number, number>>({});
  const [notas, setNotas] = useState<Record<number, string>>({});
  const [notaEditing, setNotaEditing] = useState<number | null>(null);
  const [notaDraft, setNotaDraft] = useState('');
  const [search, setSearch] = useState('');
  const [tipoFilter, setTipoFilter] = useState('todos');
  const [confirmTarget, setConfirmTarget] = useState<{
    type: 'create' | 'add';
    mesaId?: number;
    pedidoId?: number;
    lineas: { productoId: number; cantidad: number; observacion?: string }[];
    total: number;
  } | null>(null);

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
  const [showHistorial, setShowHistorial] = useState(false);

  const load = useCallback(async () => {
    try {
      setLoading(true);
      const headers = getAuthHeaders();
      const [mesasRes, prodsRes, pedidosRes, meRes, dispoRes] = await Promise.all([
        fetch('/api/backend/mesas', { headers }),
        fetch('/api/backend/productos', { headers }),
        fetch('/api/backend/pedidos', { headers }),
        fetch('/api/backend/usuarios/me', { headers }),
        fetch('/api/backend/recetas/disponibilidad', { headers }),
      ]);
      if (mesasRes.status === 401 || pedidosRes.status === 401) { window.location.href = '/login'; return; }
      if (!mesasRes.ok || !prodsRes.ok || !pedidosRes.ok) { alert('Error al cargar los datos'); return; }
      const [mesasData, prodsData, pedidosData, meData, dispoData] = await Promise.all([
        mesasRes.json(), prodsRes.json(), pedidosRes.json(), meRes.json(), dispoRes.ok ? dispoRes.json() : [],
      ]);
      setMesas(Array.isArray(mesasData) ? mesasData : []);
      setProductos(Array.isArray(prodsData) ? prodsData.filter((p: Producto) => p.isActive) : []);
      setDisponibilidad(Array.isArray(dispoData) ? dispoData : []);
      setPedidos(Array.isArray(pedidosData) ? pedidosData : []);
      if (meData?.id) setMe({ id: meData.id, name: meData.name, rolId: meData.rolId });
      if (!selectedMesaId && Array.isArray(mesasData) && mesasData.length > 0) {
        const primeraLibre = mesasData.find((m: { estado: string }) => m.estado === 'libre');
        setSelectedMesaId(primeraLibre ? primeraLibre.id : mesasData[0].id);
      }
    } catch { /* noop */ } finally { setLoading(false); }
  }, [selectedMesaId]);

  useEffect(() => { load(); }, [load]);
  const live = useLiveData(['pedidos.changed', 'mesas.changed'], load);

  const loadTipoPagos = useCallback(async () => {
    try {
      const res = await fetch('/api/backend/tipo-pago', { headers: getAuthHeaders() });
      if (res.ok) setTipoPagos(await res.json());
    } catch { /* noop */ }
  }, []);

  useEffect(() => { if (addOpen || cobrarTarget || editTarget || transferTarget) loadTipoPagos(); }, [addOpen, cobrarTarget, editTarget, transferTarget, loadTipoPagos]);

  const selectedMesa = mesas.find(m => m.id === selectedMesaId) || null;
  const mesaPedidos = pedidos.filter(p => p.mesaId === selectedMesaId && p.estado !== 'cancelado')
    .sort((a, b) => b.id - a.id);
  const pedidosActivos = mesaPedidos.filter(p => estadoCobro(p) !== 'pagado');
  const pedidosPagados = mesaPedidos.filter(p => estadoCobro(p) === 'pagado');
  const mesaDisponible = selectedMesa ? selectedMesa.estado === 'libre' : false;
  const canCreate = !!me && [1, 2, 4].includes(me.rolId);
  const canChangeState = !!me && [1, 2, 3, 4].includes(me.rolId);
  const esMio = (p: Pedido) => !!me && (me.rolId === 1 || p.usuarioId === me.id);
  const filteredProductos = productos.filter(p => {
    const q = search.trim().toLowerCase();
    if (q && !p.nombre.toLowerCase().includes(q)) return false;
    if (tipoFilter !== 'todos' && p.tipo !== tipoFilter) return false;
    return true;
  });
  const cartTotal = Object.entries(cart).reduce((acc, [id, qty]) => acc + (productos.find(x => x.id === Number(id))?.precio || 0) * qty, 0);
  const dispoMap = new Map(disponibilidad.map(d => [d.productoId, d.disponible]));
  const editDisp = editTarget ? dispoMap.get(editTarget.linea.producto?.id) : undefined;
  const editLimite = editDisp == null ? Number.MAX_SAFE_INTEGER : Math.max(0, Math.floor(editDisp));
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
    const lineas = Object.entries(cart).map(([productoId, cantidad]) => {
      const id = Number(productoId);
      const obs = notas[id]?.trim();
      const linea: { productoId: number; cantidad: number; observacion?: string } = { productoId: id, cantidad };
      if (obs) linea.observacion = obs;
      return linea;
    });
    if (lineas.length === 0) { alert('Agrega al menos un producto'); return; }
    setAddOpen(false);
    setConfirmTarget({
      type: addTarget.type,
      mesaId: addTarget.type === 'create' ? addTarget.mesaId : undefined,
      pedidoId: addTarget.type === 'add' ? addTarget.pedidoId : undefined,
      lineas,
      total: cartTotal,
    });
  }

  async function confirmPedidoFinal() {
    if (!confirmTarget) return;
    setBusy(true);
    let ok = false;
    if (confirmTarget.type === 'create') {
      const result = await api('POST', '/api/backend/pedidos', {
        mesaId: confirmTarget.mesaId,
        usuarioId: me!.id,
        lineas: confirmTarget.lineas,
      });
      ok = !!result;
    } else {
      ok = true;
      for (const l of confirmTarget.lineas) {
        const r = await api('POST', `/api/backend/pedidos/${confirmTarget.pedidoId}/lineas`, l);
        if (r === null) { ok = false; break; }
      }
    }
    setBusy(false);
    if (ok) {
      setConfirmTarget(null);
      setAddOpen(false);
      setAddTarget(null);
      setCart({});
      setNotas({});
      setNotaEditing(null);
      await load();
    }
  }

  function abrirNota(id: number) {
    setNotaEditing(id);
    setNotaDraft(notas[id] || '');
  }

  function guardarNota(id: number) {
    const v = notaDraft.trim();
    if (v) setNotas(prev => ({ ...prev, [id]: v }));
    else setNotas(prev => { const c = { ...prev }; delete c[id]; return c; });
    setNotaEditing(null);
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
          <LiveIndicator connected={live} />
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
              {mesas.map(m => {
                const disponible = m.estado === 'libre';
                const bloqueada = m.estado === 'reservada' || m.estado === 'mantenimiento';
                return (
                  <button key={m.id} onClick={() => { setSelectedMesaId(m.id); setShowHistorial(false); }} className="mesa-chip"
                    title={disponible ? `Mesa ${m.numero}` : bloqueada ? `Mesa ${m.numero} (${ESTADO_LABEL[m.estado] || m.estado}) — sin pedidos` : `Mesa ${m.numero} (Ocupada)`}
                    style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 16px', borderRadius: 'var(--radius-lg)',
                      border: `1.5px solid ${selectedMesaId === m.id ? 'var(--primary)' : 'var(--border)'}`,
                      background: selectedMesaId === m.id ? `${MESA_COLOR[m.estado] || '#95A5A6'}1A` : 'var(--bg-card)',
                      cursor: 'pointer', fontWeight: 600, fontSize: 14, color: 'var(--text)',
                      opacity: bloqueada ? 0.55 : 1,
                      transition: 'all var(--transition)', whiteSpace: 'nowrap' }}>
                    <span style={{ width: 10, height: 10, borderRadius: '50%', background: MESA_COLOR[m.estado] || '#95A5A6', flexShrink: 0 }} />
                    Mesa {m.numero}
                    <span style={{ fontSize: 11, color: 'var(--text-muted)', fontWeight: 500 }}>{ESTADO_LABEL[m.estado] || m.estado}</span>
                    {bloqueada && <span className="material-symbols-outlined" style={{ fontSize: 13, color: 'var(--text-muted)' }}>lock</span>}
                  </button>
                );
              })}
            </div>
          </div>

          {!selectedMesa ? (
            <div className="card-data animate-in" style={{ textAlign: 'center', padding: '60px 24px' }}>
              <p style={{ color: 'var(--text-muted)' }}>Selecciona una mesa para ver sus pedidos.</p>
            </div>
          ) : pedidosActivos.length === 0 ? (
            <div className="card-data animate-in animate-in-delay-2" style={{ textAlign: 'center', padding: '60px 24px' }}>
              <span className="material-symbols-outlined" style={{ fontSize: 56, color: mesaDisponible ? 'var(--text-muted)' : '#E74C3C', marginBottom: 12 }}>
                {mesaDisponible ? 'receipt_long' : 'lock'}
              </span>
              {mesaDisponible ? (
                <>
                  <h3 style={{ fontSize: 18, fontWeight: 700, color: 'var(--text)', marginBottom: 8 }}>Mesa {selectedMesa.numero} sin pedido</h3>
                  <p style={{ color: 'var(--text-muted)', maxWidth: 380, margin: '0 auto', marginBottom: 20 }}>
                    {canCreate ? 'Crea el primer pedido para empezar a registrar ítems.' : 'No hay pedidos en esta mesa.'}
                  </p>
                  {canCreate && (
                    <button className="btn-primary" onClick={() => { setCart({}); setNotas({}); setNotaEditing(null); setSearch(''); setTipoFilter('todos'); setConfirmTarget(null); setAddTarget({ type: 'create', mesaId: selectedMesaId! }); setAddOpen(true); }}>
                      <span className="material-symbols-outlined" style={{ fontSize: 18 }}>add</span> Crear Pedido
                    </button>
                  )}
                </>
              ) : (
                <>
                  <h3 style={{ fontSize: 18, fontWeight: 700, color: 'var(--text)', marginBottom: 8 }}>
                    Mesa {selectedMesa.numero} — {ESTADO_LABEL[selectedMesa.estado] || selectedMesa.estado}
                  </h3>
                  <p style={{ color: 'var(--text-muted)', maxWidth: 380, margin: '0 auto' }}>
                    Esta mesa no está disponible para tomar pedidos.
                  </p>
                </>
              )}
            </div>
          ) : (
            <div className="animate-in animate-in-delay-2" style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              {pedidosActivos.map(p => {
                const st = pedidoGeneralStatus(p);
                const cobro = estadoCobro(p);
                const enCaja = cobro === 'en_caja';
                const cobrable = !enCaja && p.detalles.some(d => d.estado === 'entregado' || d.estado === 'listo');
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
{canCreate && esMio(p) && (
                      <button style={{ display: 'flex', alignItems: 'center', gap: 8, width: '100%', padding: '10px 12px', border: 'none', background: 'none', cursor: enCaja ? 'not-allowed' : 'pointer', fontSize: 14, color: enCaja ? 'var(--text-muted)' : 'var(--text)', borderRadius: 'var(--radius)', textAlign: 'left' }}
                        disabled={enCaja}
                        onClick={() => { setTransferTarget(p); setTransferMesaId(null); setMenuTarget(null); }}>
                        <span className="material-symbols-outlined" style={{ fontSize: 18 }}>swap_horiz</span> Transferir mesa
                      </button>
                    )}
                        <button style={{ display: 'flex', alignItems: 'center', gap: 8, width: '100%', padding: '10px 12px', border: 'none', background: 'none', cursor: 'not-allowed', fontSize: 14, color: 'var(--text-muted)', borderRadius: 'var(--radius)', textAlign: 'left' }} disabled>
                          <span className="material-symbols-outlined" style={{ fontSize: 18 }}>call_split</span> Dividir cuenta <span style={{ fontSize: 11, marginLeft: 'auto', opacity: 0.6 }}>Próximamente</span>
                        </button>
{canCreate && esMio(p) && (
                      <button style={{ display: 'flex', alignItems: 'center', gap: 8, width: '100%', padding: '10px 12px', border: 'none', background: 'none', cursor: enCaja ? 'not-allowed' : 'pointer', fontSize: 14, color: enCaja ? 'var(--text-muted)' : '#E74C3C', borderRadius: 'var(--radius)', textAlign: 'left' }}
                        disabled={enCaja}
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
                            {d.estado === 'listo' && canChangeState && esMio(p) && (
                              <button className="user-action" title="Marcar entregado" onClick={() => entregarLinea(p.id, d.id)}>
                                <span className="material-symbols-outlined" style={{ fontSize: 18, color: '#2ECC71' }}>check_circle</span>
                              </button>
                            )}
                            {(d.estado === 'pendiente' || d.estado === 'en_preparacion' || d.estado === 'listo') && canCreate && esMio(p) && (
                              <button className="user-action" title="Editar" onClick={() => openEdit(p.id, d)}>
                                <span className="material-symbols-outlined" style={{ fontSize: 18, color: '#8B5CF6' }}>edit</span>
                              </button>
                            )}
                            {d.estado === 'pendiente' && canCreate && esMio(p) && (
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
                      {canCreate && esMio(p) && (
                        <button className="btn-primary" style={{ flex: 1, minWidth: 160, background: '#3498DB', opacity: enCaja ? 0.5 : 1 }}
                          disabled={enCaja}
                          onClick={() => { setCart({}); setNotas({}); setNotaEditing(null); setSearch(''); setTipoFilter('todos'); setConfirmTarget(null); setAddTarget({ type: 'add', pedidoId: p.id }); setAddOpen(true); }}>
                          <span className="material-symbols-outlined" style={{ fontSize: 18 }}>add</span> Agregar ítem
                        </button>
                      )}
                      {canCreate && (esMio(p) || me?.rolId === 4) && (
                        <button className="btn-primary" style={{ flex: 1, minWidth: 160, opacity: cobrable ? 1 : 0.5 }}
                          disabled={!cobrable || enCaja || busy}
                          onClick={() => { setCobrarTarget(p); setCobrarModo(null); setSelectedTipoPago(null); }}>
                          <span className="material-symbols-outlined" style={{ fontSize: 18 }}>payments</span> Cobrar / Cerrar mesa
                        </button>
                      )}
                      {canCreate && !esMio(p) && me?.rolId !== 1 && (
                        <p style={{ fontSize: 12, color: '#B45309', background: '#FEF3C7', padding: '6px 10px', borderRadius: 'var(--radius)', marginTop: 8, fontWeight: 600 }}>
                          🔒 Pedido de otro mesero — solo lectura hasta que se cierre.
                        </p>
                      )}
                    </div>
                    {enCaja && <p style={{ fontSize: 12, color: '#B45309', background: '#FEF3C7', padding: '6px 10px', borderRadius: 'var(--radius)', marginTop: 8, fontWeight: 600 }}>⏳ En espera de cobro en caja</p>}
                  </div>
                );
              })}
            </div>
          )}

          {selectedMesa && pedidosPagados.length > 0 && (
            <div className="card-data" style={{ background: 'var(--bg)', border: '1px dashed var(--border)' }}>
              <button onClick={() => setShowHistorial(h => !h)} style={{ display: 'flex', alignItems: 'center', gap: 8, width: '100%', border: 'none', background: 'none', cursor: 'pointer', padding: '8px 4px', color: 'var(--text)', fontWeight: 600, fontSize: 14 }}>
                <span className="material-symbols-outlined" style={{ fontSize: 18 }}>receipt_long</span>
                Historial — pedidos cobrados ({pedidosPagados.length})
                <span className="material-symbols-outlined" style={{ fontSize: 18, marginLeft: 'auto', transition: 'transform 0.2s', transform: showHistorial ? 'rotate(90deg)' : 'none' }}>chevron_right</span>
              </button>
              {showHistorial && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 14, marginTop: 12 }}>
                  {pedidosPagados.map(p => {
                    const factura = (p.facturas || []).find(f => f.estadoPago === 'pagado');
                    const metodo = factura?.tipoPago?.nombre
                      || (p.tipoPagoId === 1 ? 'Efectivo' : p.tipoPagoId === 2 ? 'Tarjeta débito' : p.tipoPagoId === 3 ? 'Tarjeta crédito' : p.tipoPagoId === 4 ? 'Transferencia' : '');
                    return (
                      <div key={p.id} style={{ paddingTop: 12, borderTop: '1px solid var(--border)' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6 }}>
                          <span className="font-semibold text-sm" style={{ color: 'var(--text)' }}>Pedido #{p.id} · Mesa {p.mesa?.numero}</span>
                          <span style={{ padding: '2px 10px', borderRadius: 999, fontSize: 11, fontWeight: 700, background: '#D1FAE5', color: '#065F46' }}>Cobrado{metodo ? ` · ${metodo}` : ''}</span>
                          <span style={{ marginLeft: 'auto', color: 'var(--text-muted)', fontSize: 12 }}>{fmtHora(p.createdAt)}</span>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                          <span className="text-xs" style={{ color: 'var(--text-muted)' }}>
                            {p.detalles?.map(d => `${d.producto?.nombre} x${d.cantidad}`).join(', ') || `${p.detalles?.length || 0} ítems`}
                          </span>
                          <span className="text-xs" style={{ color: 'var(--text-muted)', marginLeft: 4 }}>
                            {factura?.cobradoPor ? ` · Cobró: ${factura.cobradoPor.name}${factura.cobradoPorRol ? ` (${factura.cobradoPorRol})` : ''}` : ''}
                          </span>
                          <span className="text-sm font-bold" style={{ marginLeft: 'auto', color: 'var(--primary)' }}>{fmt(p.total)}</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
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
            const disp = dispoMap.get(p.id);
            const limite = disp == null ? Number.MAX_SAFE_INTEGER : Math.max(0, Math.floor(disp));
            const agotado = limite <= 0;
            const addOne = () => {
              if (qty >= limite) {
                alert(agotado ? `${p.nombre} agotado` : `Solo quedan ${limite} de ${p.nombre}`);
                return;
              }
              addQty(p.id, 1);
            };
            return (
              <div key={p.id} className="order-item-row" style={{ padding: '10px 0', gap: 10, flexDirection: 'column', alignItems: 'stretch', opacity: agotado ? 0.5 : 1 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div className="font-semibold text-sm" style={{ color: agotado ? 'var(--text-muted)' : 'var(--text)' }}>{p.nombre}</div>
                    <div className="text-xs" style={{ color: 'var(--text-muted)' }}>{fmt(p.precio)}</div>
                    {disp != null && (
                      <div className="text-xs" style={{ color: agotado ? '#E74C3C' : '#B45309', fontWeight: 600, marginTop: 2 }}>
                        {agotado ? 'Agotado' : `Quedan ${limite}`}
                      </div>
                    )}
                    {notas[p.id] && notaEditing !== p.id && (
                      <div className="text-xs" style={{ color: 'var(--primary)', marginTop: 2, fontWeight: 600 }}>📝 {notas[p.id]}</div>
                    )}
                  </div>
                  <button className="user-action" title={notas[p.id] ? 'Editar nota del producto' : 'Agregar nota al producto'}
                    onClick={() => { if (qty === 0 && limite > 0) addQty(p.id, 1); abrirNota(p.id); }}>
                    <span className="material-symbols-outlined" style={{ fontSize: 18, color: notas[p.id] ? 'var(--primary)' : 'var(--text-muted)' }}>edit</span>
                  </button>
                  {qty === 0 ? (
                    <button className="btn-primary" onClick={addOne} disabled={agotado} style={{ padding: '6px 14px', fontSize: 13, opacity: agotado ? 0.5 : 1 }}>
                      <span className="material-symbols-outlined" style={{ fontSize: 16 }}>add</span> Agregar
                    </button>
                  ) : (
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <button className="user-action" onClick={() => addQty(p.id, -1)}><span className="material-symbols-outlined" style={{ fontSize: 20, color: '#E74C3C' }}>remove</span></button>
                      <span className="font-bold" style={{ minWidth: 18, textAlign: 'center' }}>{qty}</span>
                      <button className="user-action" title={qty >= limite && disp != null ? `Solo quedan ${limite}` : ''} onClick={addOne}><span className="material-symbols-outlined" style={{ fontSize: 20, color: 'var(--primary)' }}>add</span></button>
                    </div>
                  )}
                </div>
                {notaEditing === p.id && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <input autoFocus value={notaDraft} onChange={e => setNotaDraft(e.target.value)}
                      placeholder="Ej: sin cebolla, término medio..."
                      onKeyDown={e => { if (e.key === 'Enter') guardarNota(p.id); if (e.key === 'Escape') setNotaEditing(null); }}
                      style={{ flex: 1, padding: '8px 12px', background: 'var(--bg)', border: '1.5px solid var(--border)', borderRadius: 'var(--radius)', fontSize: 13, color: 'var(--text)', outline: 'none' }} />
                    <button className="user-action" title="Guardar nota" onClick={() => guardarNota(p.id)}>
                      <span className="material-symbols-outlined" style={{ fontSize: 20, color: 'var(--primary)' }}>check</span>
                    </button>
                    <button className="user-action" title="Cancelar" onClick={() => setNotaEditing(null)}>
                      <span className="material-symbols-outlined" style={{ fontSize: 20, color: '#E74C3C' }}>close</span>
                    </button>
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

      {/* Modal: Confirmar orden */}
      <ModalSheet isOpen={!!confirmTarget} onClose={() => { setConfirmTarget(null); setAddOpen(true); }} title={confirmTarget?.type === 'create' ? 'Confirmar orden' : 'Confirmar ítems'}>
        {confirmTarget && (
          <div>
            <p style={{ fontSize: 14, color: 'var(--text-muted)', marginBottom: 14 }}>
              {confirmTarget.type === 'create'
                ? `Mesa ${mesas.find(m => m.id === confirmTarget.mesaId)?.numero ?? confirmTarget.mesaId} · ${confirmTarget.lineas.length} producto${confirmTarget.lineas.length === 1 ? '' : 's'}`
                : `Pedido #${confirmTarget.pedidoId} · ${confirmTarget.lineas.length} ítem${confirmTarget.lineas.length === 1 ? '' : 's'}`}
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
              {confirmTarget.lineas.map(l => {
                const p = productos.find(x => x.id === l.productoId);
                return (
                  <div key={l.productoId} className="order-item-row" style={{ padding: '8px 0' }}>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div className="font-semibold text-sm" style={{ color: 'var(--text)' }}>
                        {l.cantidad} × {p?.nombre || `Producto #${l.productoId}`}
                      </div>
                      {l.observacion && <div className="text-xs" style={{ color: 'var(--primary)', fontWeight: 600, marginTop: 2 }}>📝 {l.observacion}</div>}
                    </div>
                    <span className="text-sm font-bold" style={{ color: 'var(--text)', whiteSpace: 'nowrap' }}>{fmt((p?.precio || 0) * l.cantidad)}</span>
                  </div>
                );
              })}
            </div>
            <div className="order-total-row" style={{ marginTop: 10 }}>
              <span className="font-semibold text-sm" style={{ color: 'var(--text)' }}>Total</span>
              <span className="font-bold" style={{ color: 'var(--primary)', fontSize: 16 }}>{fmt(confirmTarget.total)}</span>
            </div>
            <div className="modal-actions" style={{ marginTop: 16 }}>
              <button className="btn-cancel" onClick={() => { setConfirmTarget(null); setAddOpen(true); }}>Editar</button>
              <button className="btn-primary" disabled={busy} onClick={confirmPedidoFinal}>
                {busy ? 'Guardando...' : confirmTarget.type === 'create' ? 'Confirmar pedido' : 'Confirmar ítems'}
              </button>
            </div>
          </div>
        )}
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
                <button className="user-action" title={editCantidad >= editLimite && editDisp != null ? `Solo quedan ${editLimite}` : ''}
                  onClick={() => { if (editCantidad < editLimite) setEditCantidad(editCantidad + 1); }}>
                  <span className="material-symbols-outlined" style={{ fontSize: 20, color: 'var(--primary)' }}>add</span>
                </button>
              </div>
              {editDisp != null && (
                <p style={{ fontSize: 12, color: editLimite <= 0 ? '#E74C3C' : '#B45309', fontWeight: 600, marginTop: 6 }}>
                  {editLimite <= 0 ? 'Agotado — solo puedes bajar la cantidad' : `Disponible para servir: ${editLimite}`}
                </p>
              )}
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