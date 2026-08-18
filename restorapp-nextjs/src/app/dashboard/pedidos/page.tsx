'use client';

import { useState, useEffect } from 'react';
import ModalSheet from '@/components/ModalSheet';
import { getAuthHeaders, handleApiError } from '@/lib/api';

interface Mesa {
  id: number;
  numero: number;
  capacidad: number;
  estado: string;
}

interface Producto {
  id: number;
  nombre: string;
  precio: number;
  tipo: string;
  stock: number;
  isActive: boolean;
}

interface DetallePedido {
  id: number;
  productoId: number;
  cantidad: number;
  precioUnitario: number;
  subtotal: number;
  estado: 'pendiente' | 'en_preparacion' | 'listo' | 'cancelado';
  observacion: string | null;
  producto: { id: number; nombre: string; precio: number; tipo: string };
}

interface Pedido {
  id: number;
  mesaId: number;
  usuarioId: number;
  estado: string;
  total: number;
  observaciones: string | null;
  createdAt: string;
  detalles: DetallePedido[];
  mesa: { id: number; numero: number; estado: string };
}

interface Me {
  id: number;
  name: string;
  rolId: number;
}

const LINE_STATE: Record<string, { label: string; color: string }> = {
  pendiente: { label: 'Pendiente', color: '#F39C12' },
  en_preparacion: { label: 'En preparación', color: '#3498DB' },
  listo: { label: 'Listo', color: '#2ECC71' },
  cancelado: { label: 'Cancelado', color: '#E74C3C' },
};

const MESA_COLOR: Record<string, string> = {
  libre: '#2ECC71',
  ocupada: '#F1C40F',
  reservada: '#E74C3C',
  mantenimiento: '#3498DB',
};

const TIPO_LABEL: Record<string, string> = { plato: 'Platos', bebida: 'Bebidas', postre: 'Postres', otro: 'Otros' };

const fmt = (n: number | string) => '$' + Number(n).toLocaleString('es-CO', { maximumFractionDigits: 0 });

export default function PedidosPage() {
  const [mesas, setMesas] = useState<Mesa[]>([]);
  const [productos, setProductos] = useState<Producto[]>([]);
  const [pedidos, setPedidos] = useState<Pedido[]>([]);
  const [me, setMe] = useState<Me | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedMesaId, setSelectedMesaId] = useState<number | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [addTarget, setAddTarget] = useState<{ type: 'create'; mesaId: number } | { type: 'add'; pedidoId: number } | null>(null);
  const [cart, setCart] = useState<Record<number, number>>({});
  const [search, setSearch] = useState('');
  const [tipoFilter, setTipoFilter] = useState('todos');
  const [busy, setBusy] = useState(false);

  const load = async () => {
    try {
      setLoading(true);
      const headers = getAuthHeaders();
      const [mesasRes, prodsRes, pedidosRes, meRes] = await Promise.all([
        fetch('/api/backend/mesas', { headers }),
        fetch('/api/backend/productos', { headers }),
        fetch('/api/backend/pedidos', { headers }),
        fetch('/api/backend/usuarios/me', { headers }),
      ]);
      if (mesasRes.status === 401) {
        window.location.href = '/login';
        return;
      }
      if (!mesasRes.ok || !prodsRes.ok || !pedidosRes.ok) {
        alert('Error al cargar los datos');
        return;
      }
      const [mesasData, prodsData, pedidosData, meData] = await Promise.all([
        mesasRes.json(),
        prodsRes.json(),
        pedidosRes.json(),
        meRes.json(),
      ]);
      setMesas(Array.isArray(mesasData) ? mesasData : []);
      setProductos(Array.isArray(prodsData) ? prodsData.filter((p: Producto) => p.isActive) : []);
      setPedidos(Array.isArray(pedidosData) ? pedidosData : []);
      setMe(meData && meData.id ? { id: meData.id, name: meData.name, rolId: meData.rolId } : null);
      if (!selectedMesaId && Array.isArray(mesasData) && mesasData.length > 0) {
        setSelectedMesaId(mesasData[0].id);
      }
    } catch {
      alert('Error de conexión');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const selectedMesa = mesas.find((m) => m.id === selectedMesaId) || null;
  const mesaPedidos = pedidos.filter((p) => p.mesaId === selectedMesaId && p.estado !== 'cancelado');

  const canCreate = !!me && [1, 2, 4].includes(me.rolId);
  const canChangeState = !!me && [1, 3].includes(me.rolId);

  function openCreate() {
    setCart({});
    setSearch('');
    setTipoFilter('todos');
    setAddTarget({ type: 'create', mesaId: selectedMesaId! });
    setModalOpen(true);
  }

  function openAdd(pedidoId: number) {
    setCart({});
    setSearch('');
    setTipoFilter('todos');
    setAddTarget({ type: 'add', pedidoId });
    setModalOpen(true);
  }

  const filteredProductos = productos.filter((p) => {
    const q = search.trim().toLowerCase();
    if (q && !p.nombre.toLowerCase().includes(q)) return false;
    if (tipoFilter !== 'todos' && p.tipo !== tipoFilter) return false;
    return true;
  });

  const cartTotal = Object.entries(cart).reduce((acc, [id, qty]) => {
    const p = productos.find((x) => x.id === Number(id));
    return acc + (p ? p.precio * qty : 0);
  }, 0);

  function addQty(id: number, delta: number) {
    setCart((prev) => {
      const cur = prev[id] || 0;
      const next = cur + delta;
      const copy = { ...prev };
      if (next <= 0) delete copy[id];
      else copy[id] = next;
      return copy;
    });
  }

  async function confirmPedido() {
    if (!addTarget) return;
    const lineas = Object.entries(cart).map(([productoId, cantidad]) => ({ productoId: Number(productoId), cantidad }));
    if (lineas.length === 0) {
      alert('Agrega al menos un producto');
      return;
    }
    setBusy(true);
    try {
      const url =
        addTarget.type === 'create'
          ? '/api/backend/pedidos'
          : `/api/backend/pedidos/${addTarget.pedidoId}/lineas`;
      const body =
        addTarget.type === 'create'
          ? { mesaId: addTarget.mesaId, usuarioId: me!.id, lineas }
          : lineas[0];
      const res = await fetch(url, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify(body),
      });
      if (res.status === 401) {
        window.location.href = '/login';
        return;
      }
      if (!res.ok) {
        const err = await handleApiError(res);
        alert(err.message || 'Error al guardar el pedido');
        return;
      }
      setModalOpen(false);
      setAddTarget(null);
      await load();
    } catch {
      alert('Error de conexión');
    } finally {
      setBusy(false);
    }
  }

  async function changeLineState(pedidoId: number, lineaId: number, estado: string) {
    if (!confirm(`¿Marcar la línea como "${estado}"?`)) return;
    try {
      const res = await fetch(`/api/backend/pedidos/${pedidoId}/lineas/${lineaId}/estado`, {
        method: 'PATCH',
        headers: getAuthHeaders(),
        body: JSON.stringify({ estado }),
      });
      if (res.status === 401) {
        window.location.href = '/login';
        return;
      }
      if (!res.ok) {
        const err = await handleApiError(res);
        alert(err.message || 'Error al cambiar el estado');
        return;
      }
      await load();
    } catch {
      alert('Error de conexión');
    }
  }

  async function removeLine(pedidoId: number, lineaId: number) {
    if (!confirm('¿Quitar este ítem del pedido?')) return;
    try {
      const res = await fetch(`/api/backend/pedidos/${pedidoId}/lineas/${lineaId}`, {
        method: 'DELETE',
        headers: getAuthHeaders(),
      });
      if (res.status === 401) {
        window.location.href = '/login';
        return;
      }
      if (!res.ok) {
        const err = await handleApiError(res);
        alert(err.message || 'Error al quitar el ítem');
        return;
      }
      await load();
    } catch {
      alert('Error de conexión');
    }
  }

  async function removePedido(id: number) {
    if (!confirm('¿Eliminar este pedido? Se liberará la mesa.')) return;
    try {
      const res = await fetch(`/api/backend/pedidos/${id}`, {
        method: 'DELETE',
        headers: getAuthHeaders(),
      });
      if (res.status === 401) {
        window.location.href = '/login';
        return;
      }
      if (!res.ok) {
        const err = await handleApiError(res);
        alert(err.message || 'Error al eliminar el pedido');
        return;
      }
      await load();
    } catch {
      alert('Error de conexión');
    }
  }

  const totalOcupadas = mesas.filter((m) => m.estado === 'ocupada').length;

  return (
    <>
      <div className="animate-in">
        <h2 className="page-title">Pedidos</h2>
        <p className="page-subtitle">Registra y gestiona los pedidos de cada mesa en tiempo real.</p>
      </div>

      <div className="stats-grid animate-in animate-in-delay-1">
        <div className="stat-card">
          <p className="stat-label">Pedidos Activos</p>
          <div className="stat-value">
            <span>{pedidos.filter((p) => p.estado !== 'cancelado').length}</span>
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
              {mesas.map((m) => (
                <button
                  key={m.id}
                  onClick={() => setSelectedMesaId(m.id)}
                  className="mesa-chip"
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 8,
                    padding: '10px 16px',
                    borderRadius: 'var(--radius-lg)',
                    border: `1.5px solid ${selectedMesaId === m.id ? 'var(--primary)' : 'var(--border)'}`,
                    background: selectedMesaId === m.id ? 'rgba(46,204,113,0.1)' : 'var(--bg-card)',
                    cursor: 'pointer',
                    fontWeight: 600,
                    fontSize: 14,
                    color: 'var(--text)',
                    transition: 'all var(--transition)',
                    whiteSpace: 'nowrap',
                  }}
                >
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
                Esta mesa está {selectedMesa.estado === 'libre' ? 'libre' : 'sin pedido activo'}.
                {canCreate ? ' Crea el primer pedido para empezar a registrar ítems.' : ''}
              </p>
              {canCreate && (
                <button className="btn-primary" onClick={openCreate}>
                  <span className="material-symbols-outlined" style={{ fontSize: 18 }}>add</span> Crear Pedido
                </button>
              )}
            </div>
          ) : (
            <div className="animate-in animate-in-delay-2" style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              {mesaPedidos.map((p) => (
                <div key={p.id} className="card-data">
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
                    <h3 style={{ fontSize: 16, fontWeight: 700, color: 'var(--text)' }}>Pedido #{p.id}</h3>
                    <span className="table-status" style={{ color: 'var(--primary)', fontSize: 13 }}>
                      Mesa {p.mesa?.numero}
                    </span>
                    <span style={{ marginLeft: 'auto', color: 'var(--text-muted)', fontSize: 12 }}>
                      {p.createdAt ? new Date(p.createdAt).toLocaleString('es-ES', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' }) : ''}
                    </span>
                  </div>
                  {p.observaciones && (
                    <p className="text-sm mb-3" style={{ color: 'var(--text-muted)' }}>Obs: {p.observaciones}</p>
                  )}
                  <div>
                    {p.detalles?.length ? (
                      p.detalles.map((d) => {
                        const st = LINE_STATE[d.estado] || LINE_STATE.pendiente;
                        return (
                          <div key={d.id} className="order-item-row" style={{ gap: 10 }}>
                            <div style={{ flex: 1, minWidth: 0 }}>
                              <div className="font-semibold text-sm" style={{ color: 'var(--text)', display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                                <span>{d.producto?.nombre}</span>
                                <span className="text-xs" style={{ color: st.color, border: `1px solid ${st.color}55`, background: `${st.color}1a`, padding: '2px 8px', borderRadius: 999 }}>{st.label}</span>
                              </div>
                              {d.observacion && <div className="text-xs" style={{ color: 'var(--text-muted)' }}>{d.observacion}</div>}
                            </div>
                            <div style={{ textAlign: 'right', color: 'var(--text)', fontSize: 13, whiteSpace: 'nowrap' }}>
                              <div className="text-xs" style={{ color: 'var(--text-muted)' }}>{d.cantidad} × {fmt(d.precioUnitario)}</div>
                              <div className="font-semibold">{fmt(d.subtotal)}</div>
                            </div>
                            <div style={{ display: 'flex', gap: 4 }}>
                              {d.estado === 'pendiente' && canChangeState && (
                                <button className="user-action" title="Enviar a cocina" onClick={() => changeLineState(p.id, d.id, 'en_preparacion')}>
                                  <span className="material-symbols-outlined" style={{ fontSize: 18, color: '#3498DB' }}>chef_hat</span>
                                </button>
                              )}
                              {d.estado === 'pendiente' && canCreate && (
                                <button className="user-action" title="Quitar ítem" onClick={() => removeLine(p.id, d.id)}>
                                  <span className="material-symbols-outlined" style={{ fontSize: 18, color: '#E74C3C' }}>remove_circle</span>
                                </button>
                              )}
                              {d.estado === 'pendiente' && canChangeState && (
                                <button className="user-action" title="Cancelar línea" onClick={() => changeLineState(p.id, d.id, 'cancelado')}>
                                  <span className="material-symbols-outlined" style={{ fontSize: 18, color: '#E74C3C' }}>close</span>
                                </button>
                              )}
                              {d.estado === 'en_preparacion' && canChangeState && (
                                <button className="user-action" title="Marcar listo" onClick={() => changeLineState(p.id, d.id, 'listo')}>
                                  <span className="material-symbols-outlined" style={{ fontSize: 18, color: '#2ECC71' }}>check_circle</span>
                                </button>
                              )}
                            </div>
                          </div>
                        );
                      })
                    ) : (
                      <p className="text-sm" style={{ color: 'var(--text-muted)' }}>Sin ítems.</p>
                    )}
                  </div>
                  <div className="order-total-row" style={{ marginTop: 10 }}>
                    <span className="font-semibold text-sm" style={{ color: 'var(--text)' }}>Total cuenta</span>
                    <span className="font-bold" style={{ color: 'var(--primary)', fontSize: 16 }}>{fmt(p.total)}</span>
                  </div>
                  <div className="mt-4" style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                    {canCreate && (
                      <button className="btn-primary" style={{ flex: 1, minWidth: 160 }} onClick={() => openAdd(p.id)}>
                        <span className="material-symbols-outlined" style={{ fontSize: 18 }}>add</span> Agregar ítem
                      </button>
                    )}
                    {canCreate && (
                      <button className="btn-cancel" style={{ flex: 1, minWidth: 160 }} onClick={() => removePedido(p.id)}>
                        <span className="material-symbols-outlined" style={{ fontSize: 18 }}>delete</span> Eliminar pedido
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </>
      )}

      <ModalSheet
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        title={addTarget?.type === 'create' ? 'Nuevo Pedido' : 'Agregar ítem'}
      >
        <div>
          <div className="segment-control">
            {['todos', 'plato', 'bebida', 'postre'].map((t) => (
              <button
                key={t}
                onClick={() => setTipoFilter(t)}
                className="seg-btn"
                style={{
                  flex: 1,
                  padding: '8px 0',
                  borderRadius: 'var(--radius)',
                  border: 'none',
                  background: tipoFilter === t ? 'var(--bg-card)' : 'transparent',
                  color: tipoFilter === t ? 'var(--primary)' : 'var(--text-muted)',
                  fontWeight: 600,
                  fontSize: 13,
                  cursor: 'pointer',
                  transition: 'all var(--transition)',
                  boxShadow: tipoFilter === t ? 'var(--shadow)' : 'none',
                }}
              >
                {TIPO_LABEL[t]}
              </button>
            ))}
          </div>
          <div className="form-field" style={{ marginBottom: 12 }}>
            <input
              placeholder="Buscar producto..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              style={{ width: '100%', padding: '12px 14px', background: 'var(--bg)', border: '1.5px solid var(--border)', borderRadius: 'var(--radius)', fontSize: 14, color: 'var(--text)', outline: 'none', transition: 'all var(--transition)' }}
            />
          </div>

          <div style={{ maxHeight: 340, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 8, paddingRight: 2 }}>
            {filteredProductos.length === 0 ? (
              <p className="text-sm" style={{ color: 'var(--text-muted)', textAlign: 'center', padding: '20px 0' }}>Sin productos disponibles.</p>
            ) : (
              filteredProductos.map((p) => {
                const qty = cart[p.id] || 0;
                return (
                  <div key={p.id} className="order-item-row" style={{ padding: '10px 0', gap: 10 }}>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div className="font-semibold text-sm" style={{ color: 'var(--text)' }}>{p.nombre}</div>
                      <div className="text-xs" style={{ color: 'var(--text-muted)' }}>{fmt(p.precio)}{p.stock <= 0 ? ' · Sin stock' : ''}</div>
                    </div>
                    {qty === 0 ? (
                      <button className="btn-primary" onClick={() => addQty(p.id, 1)} style={{ padding: '6px 14px', fontSize: 13 }}>
                        <span className="material-symbols-outlined" style={{ fontSize: 16 }}>add</span> Agregar
                      </button>
                    ) : (
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <button className="user-action" onClick={() => addQty(p.id, -1)}>
                          <span className="material-symbols-outlined" style={{ fontSize: 20, color: '#E74C3C' }}>remove</span>
                        </button>
                        <span className="font-bold" style={{ color: 'var(--text)', minWidth: 18, textAlign: 'center' }}>{qty}</span>
                        <button className="user-action" onClick={() => addQty(p.id, 1)}>
                          <span className="material-symbols-outlined" style={{ fontSize: 20, color: 'var(--primary)' }}>add</span>
                        </button>
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>

          <div className="order-total-row" style={{ marginTop: 12 }}>
            <span className="font-semibold text-sm" style={{ color: 'var(--text)' }}>Total</span>
            <span className="font-bold" style={{ color: 'var(--primary)', fontSize: 16 }}>{fmt(cartTotal)}</span>
          </div>
          <div className="modal-actions" style={{ marginTop: 16 }}>
            <button className="btn-cancel" type="button" onClick={() => setModalOpen(false)}>Cancelar</button>
            <button className="btn-primary" type="button" disabled={busy} onClick={confirmPedido}>
              {busy ? 'Guardando...' : 'Guardar Pedido'}
            </button>
          </div>
        </div>
      </ModalSheet>
    </>
  );
}
