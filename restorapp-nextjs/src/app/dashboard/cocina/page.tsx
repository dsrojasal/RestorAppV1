'use client';

import { useState, useEffect, useCallback } from 'react';
import LiveIndicator from '@/components/LiveIndicator';
import { useLiveData } from '@/lib/useLiveData';
import { getAuthHeaders } from '@/lib/api';

interface Producto {
  id: number;
  nombre: string;
  precio: number;
  tipo: string;
}

interface DetallePedido {
  id: number;
  productoId: number;
  cantidad: number;
  precioUnitario: number;
  subtotal: number;
  estado: 'pendiente' | 'en_preparacion' | 'listo' | 'cancelado';
  observacion: string | null;
  producto: Producto;
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
  usuario: { id: number; name: string; email: string };
}

function tiempoTranscurrido(fecha: string): string {
  const diff = Date.now() - new Date(fecha).getTime();
  const mins = Math.max(0, Math.floor(diff / 60000));
  if (mins < 1) return 'Ahora';
  if (mins < 60) return `${mins} min`;
  const hrs = Math.floor(mins / 60);
  const minsResto = mins % 60;
  return `${hrs}h ${minsResto}m`;
}

function pedidoEstado(d: Pedido): 'pendiente' | 'preparacion' | 'listo' | 'cancelado' {
  if (d.detalles.some(l => l.estado === 'pendiente')) return 'pendiente';
  if (d.detalles.some(l => l.estado === 'en_preparacion')) return 'preparacion';
  if (d.detalles.every(l => l.estado === 'listo' || l.estado === 'cancelado')) return 'listo';
  return 'cancelado';
}

export default function CocinaPage() {
  const [pedidos, setPedidos] = useState<Pedido[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentFilter, setCurrentFilter] = useState<string>('todos');
  const [detailPedido, setDetailPedido] = useState<Pedido | null>(null);
  const [historialOpen, setHistorialOpen] = useState(false);
  const [abiertos, setAbiertos] = useState<Record<number, boolean>>({});

  const fetchPedidos = useCallback(async () => {
    try {
      const headers = getAuthHeaders();
      const res = await fetch('/api/backend/pedidos', { headers });
      if (res.status === 401) {
        window.location.href = '/login';
        return;
      }
      if (res.ok) {
        const data = await res.json();
        setPedidos(Array.isArray(data) ? data : []);
      }
    } catch {
      // Silenciar errores de red en polling
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchPedidos(); }, [fetchPedidos]);
  const live = useLiveData(['pedidos.changed'], fetchPedidos);

  const pedidosActivos = pedidos.filter(p => {
    const total = p.detalles.length;
    if (total === 0) return false;
    const activos = p.detalles.filter(l => l.estado !== 'cancelado').length;
    return activos > 0;
  });

  const filtrados = currentFilter === 'todos'
    ? pedidosActivos
    : pedidosActivos.filter(p => pedidoEstado(p) === currentFilter);

  const historial = pedidos.filter(p =>
    p.detalles.length > 0 && p.detalles.every(l => l.estado === 'listo' || l.estado === 'cancelado')
  );

  async function cambiarEstado(pedidoId: number, lineaId: number, estado: string) {
    try {
      const headers = getAuthHeaders();
      const res = await fetch(`/api/backend/pedidos/${pedidoId}/lineas/${lineaId}/estado`, {
        method: 'PATCH',
        headers,
        body: JSON.stringify({ estado }),
      });
      if (res.status === 401) {
        window.location.href = '/login';
        return;
      }
      if (!res.ok) {
        const err = await res.json().catch(() => ({ message: 'Error al cambiar estado' }));
        alert(err.message || 'Error al cambiar estado');
        return;
      }
      await fetchPedidos();
    } catch {
      alert('Error de conexión');
    }
  }

  return (
    <>
      <div className="animate-in">
        <h2 className="page-title">Pedidos en Cocina</h2>
        <p className="page-subtitle">Visualiza y gestiona los pedidos entrantes.</p>
      </div>

      <div className="cocina-header-info animate-in animate-in-delay-1">
        <p className="cocina-welcome">Bienvenido, Chef</p>
        <LiveIndicator connected={live} />
        <button className="btn-historial" onClick={() => setHistorialOpen(true)}>
          <span className="material-symbols-outlined" style={{ fontSize: 18 }}>history</span>
          Historial
        </button>
      </div>

      <div className="segment-control animate-in animate-in-delay-1">
        {(['todos', 'pendiente', 'preparacion', 'listo'] as const).map(f => (
          <div
            key={f}
            className={`segment-option ${currentFilter === f ? 'active' : ''}`}
            onClick={() => setCurrentFilter(f)}
          >
            {f === 'todos' ? 'Todos' : f === 'pendiente' ? 'Pendientes' : f === 'preparacion' ? 'En preparación' : 'Listos'}
          </div>
        ))}
      </div>

      {loading ? (
        <div className="kc-empty animate-in animate-in-delay-2">
          <div className="material-symbols-outlined">sync</div>
          <p>Cargando pedidos...</p>
        </div>
      ) : (
        <div className="kitchen-list animate-in animate-in-delay-2">
          {filtrados.length === 0 ? (
            <div className="kc-empty">
              <div className="material-symbols-outlined">
                {currentFilter === 'listo' ? 'check_circle' : 'soup_kitchen'}
              </div>
              <p>
                {currentFilter === 'pendiente'
                  ? 'No hay pedidos pendientes.'
                  : currentFilter === 'preparacion'
                  ? 'No hay pedidos en preparación.'
                  : currentFilter === 'listo'
                  ? 'No hay pedidos listos.'
                  : 'No hay pedidos activos.'}
              </p>
            </div>
          ) : (
            filtrados.map(p => {
              const estadoP = pedidoEstado(p);
              const pendientes = p.detalles.filter(l => l.estado === 'pendiente');
              const preparando = p.detalles.filter(l => l.estado === 'en_preparacion');
              const badgeLabel = estadoP === 'pendiente' ? 'Pendiente' : estadoP === 'preparacion' ? 'En preparación' : 'Listo';
              const badgeIcon = estadoP === 'pendiente' ? 'hourglass_top' : estadoP === 'preparacion' ? 'soup_kitchen' : 'check';
              return (
                <div key={p.id} className={`kc-card ${estadoP === 'listo' ? 'listo' : ''}`} onClick={() => setDetailPedido(p)}>
                  <div className="kc-card-header">
                    <span className="kc-card-mesa-time">
                      Mesa {p.mesa?.numero} • {tiempoTranscurrido(p.createdAt)}
                    </span>
                    <span className={`kc-badge ${estadoP}`}>
                      <span className="material-symbols-outlined" style={{ fontSize: 14 }}>{badgeIcon}</span>
                      {badgeLabel}
                    </span>
                  </div>
                  <div className="kc-divider" />
                  <div className="kc-waiter">Mesero: {p.usuario?.name}</div>
                  <div className="kc-items">
                    {p.detalles.map(l => (
                      <div key={l.id} className="kc-item">
                        • {l.producto?.nombre} x{l.cantidad}
                        {l.estado === 'en_preparacion' && (
                          <span style={{ marginLeft: 6, fontSize: 11, color: '#3498DB', fontWeight: 700 }}>[preparando]</span>
                        )}
                        {l.estado === 'listo' && (
                          <span style={{ marginLeft: 6, fontSize: 11, color: '#2ECC71', fontWeight: 700 }}>[listo]</span>
                        )}
                        {l.estado === 'cancelado' && (
                          <span style={{ marginLeft: 6, fontSize: 11, color: '#E74C3C', fontWeight: 700 }}>[cancelado]</span>
                        )}
                        {(l.estado === 'pendiente' || l.estado === 'en_preparacion') && (
                          <button
                            title="Cancelar ítem (libera la reserva de inventario)"
                            onClick={(e) => {
                              e.stopPropagation();
                              if (confirm(`¿Cancelar ${l.producto?.nombre} del pedido?`)) cambiarEstado(p.id, l.id, 'cancelado');
                            }}
                            style={{ marginLeft: 8, border: 'none', background: 'none', cursor: 'pointer', color: '#E74C3C', display: 'inline-flex', alignItems: 'center', padding: 2, verticalAlign: 'middle' }}
                          >
                            <span className="material-symbols-outlined" style={{ fontSize: 16 }}>close</span>
                          </button>
                        )}
                        {l.observacion && (
                          <div className="kc-item-note">
                            <span className="material-symbols-outlined">edit_note</span>
                            {l.observacion}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                  {(pendientes.length > 0 || preparando.length > 0) && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginTop: 12 }}>
                      {pendientes.length > 0 && (
                        <div style={{ display: 'flex', gap: 8 }}>
                          <div
                            className="kc-btn"
                            style={{ background: '#FEF3C7', color: '#B45309', cursor: 'pointer', marginTop: 0, flex: 1 }}
                            onClick={(e) => { e.stopPropagation(); cambiarEstado(p.id, pendientes[0].id, 'en_preparacion'); }}
                          >
                            <span className="material-symbols-outlined" style={{ fontSize: 18 }}>skillet</span>
                            Iniciar: {pendientes[0].producto?.nombre} x{pendientes[0].cantidad}
                          </div>
                          {pendientes.length > 1 && (
                            <button
                              title={abiertos[p.id] ? 'Ocultar ítems' : `Ver ${pendientes.length - 1 + (preparando.length > 1 ? preparando.length - 1 : 0)} ítems más`}
                              onClick={(e) => { e.stopPropagation(); setAbiertos(prev => ({ ...prev, [p.id]: !prev[p.id] })); }}
                              style={{ minWidth: 44, padding: '0 12px', borderRadius: 'var(--radius)', border: '1.5px solid #FDE68A', background: '#FFFBEB', color: '#B45309', fontSize: 20, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                            >
                              <span className="material-symbols-outlined" style={{ fontSize: 22 }}>{abiertos[p.id] ? 'expand_less' : 'expand_more'}</span>
                            </button>
                          )}
                        </div>
                      )}
                      {abiertos[p.id] && pendientes.slice(1).map(l => (
                        <div
                          key={`btn-${l.id}`}
                          className="kc-btn"
                          style={{ background: '#FEF3C7', color: '#B45309', cursor: 'pointer', marginTop: 0 }}
                          onClick={(e) => { e.stopPropagation(); cambiarEstado(p.id, l.id, 'en_preparacion'); }}
                        >
                          <span className="material-symbols-outlined" style={{ fontSize: 18 }}>skillet</span>
                          Iniciar: {l.producto?.nombre} x{l.cantidad}
                        </div>
                      ))}
                      {preparando.length > 0 && (
                        <div style={{ display: 'flex', gap: 8 }}>
                          <div
                            className="kc-btn"
                            style={{ background: '#DBEAFE', color: '#1D4ED8', cursor: 'pointer', marginTop: 0, flex: 1 }}
                            onClick={(e) => { e.stopPropagation(); cambiarEstado(p.id, preparando[0].id, 'listo'); }}
                          >
                            <span className="material-symbols-outlined" style={{ fontSize: 18 }}>check_circle</span>
                            Listo: {preparando[0].producto?.nombre} x{preparando[0].cantidad}
                          </div>
                          {preparando.length > 1 && (
                            <button
                              title={abiertos[p.id] ? 'Ocultar ítems' : 'Ver ítems'}
                              onClick={(e) => { e.stopPropagation(); setAbiertos(prev => ({ ...prev, [p.id]: !prev[p.id] })); }}
                              style={{ minWidth: 44, padding: '0 12px', borderRadius: 'var(--radius)', border: '1.5px solid #BFDBFE', background: '#EFF6FF', color: '#1D4ED8', fontSize: 20, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                            >
                              <span className="material-symbols-outlined" style={{ fontSize: 22 }}>{abiertos[p.id] ? 'expand_less' : 'expand_more'}</span>
                            </button>
                          )}
                        </div>
                      )}
                      {abiertos[p.id] && preparando.slice(1).map(l => (
                        <div
                          key={`btn-${l.id}`}
                          className="kc-btn"
                          style={{ background: '#DBEAFE', color: '#1D4ED8', cursor: 'pointer', marginTop: 0 }}
                          onClick={(e) => { e.stopPropagation(); cambiarEstado(p.id, l.id, 'listo'); }}
                        >
                          <span className="material-symbols-outlined" style={{ fontSize: 18 }}>check_circle</span>
                          Listo: {l.producto?.nombre} x{l.cantidad}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>
      )}

      {/* Detail bottom sheet */}
      <div className={`modal-overlay ${detailPedido ? 'open' : ''}`} onClick={() => setDetailPedido(null)} />
      <div className={`modal-sheet ${detailPedido ? 'open' : ''}`}>
        <div className="modal-handle" />
        <div className="modal-header">
          <h2>Detalle del Pedido</h2>
          <button className="modal-close" onClick={() => setDetailPedido(null)}>
            <span className="material-symbols-outlined">close</span>
          </button>
        </div>
        <div className="modal-body">
          {detailPedido && (
            <>
              <div className="detail-info-grid">
                <div className="detail-info-item">
                  <div className="detail-info-label"># de mesa</div>
                  <div className="detail-info-value">Mesa {detailPedido.mesa?.numero}</div>
                </div>
                <div className="detail-info-item">
                  <div className="detail-info-label">Tiempo del pedido</div>
                  <div className="detail-info-value">Hace {tiempoTranscurrido(detailPedido.createdAt)}</div>
                </div>
              </div>
              <h4 className="text-base font-bold mb-2 mt-2" style={{ color: 'var(--text)' }}>Productos y cantidades</h4>
              <div style={{ border: '1px solid var(--border-light)', borderRadius: 'var(--radius)', padding: '0 12px', marginBottom: 16 }}>
                {detailPedido.detalles.map(l => {
                  const icon = l.producto?.tipo === 'plato' ? 'lunch_dining' : l.producto?.tipo === 'bebida' ? 'local_bar' : 'set_meal';
                  const stColor = l.estado === 'pendiente' ? '#F39C12' : l.estado === 'en_preparacion' ? '#3498DB' : l.estado === 'listo' ? '#2ECC71' : '#E74C3C';
                  const stLabel = l.estado === 'pendiente' ? 'Pendiente' : l.estado === 'en_preparacion' ? 'En preparación' : l.estado === 'listo' ? 'Listo' : 'Cancelado';
                  return (
                    <div key={l.id} className="detail-product-row">
                      <div className="detail-product-icon">
                        <span className="material-symbols-outlined">{icon}</span>
                      </div>
                      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 2 }}>
                        <span style={{ fontSize: 14, fontWeight: 500, color: 'var(--text)' }}>{l.producto?.nombre}</span>
                        {l.observacion && (
                          <span style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 12, fontStyle: 'italic', color: '#92400e' }}>
                            <span className="material-symbols-outlined" style={{ fontSize: 14 }}>edit_note</span>
                            {l.observacion}
                          </span>
                        )}
                      </div>
                      <span style={{ fontSize: 11, color: stColor, fontWeight: 700 }}>{stLabel}</span>
                      <span className="detail-product-qty">x{l.cantidad}</span>
                    </div>
                  );
                })}
              </div>
              {detailPedido.observaciones && (
                <>
                  <h4 className="text-base font-bold mb-2" style={{ color: 'var(--text)' }}>Observaciones del mesero</h4>
                  <div className="detail-note-box">
                    <span className="material-symbols-outlined">sticky_note_2</span>
                    <span>{detailPedido.observaciones}</span>
                  </div>
                </>
              )}
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
                <div className="historial-stat-label">Pedidos completados</div>
                <div className="historial-stat-value">{historial.length}</div>
              </div>
            </div>
          </div>
          <h4 className="text-base font-bold mb-2" style={{ color: 'var(--text)' }}>Pedidos del día</h4>
          <div className="historial-list">
            {historial.length === 0 ? (
              <p style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '20px 0', fontSize: 14 }}>
                No hay pedidos completados aún.
              </p>
            ) : (
              historial.map(h => (
                <div key={h.id} className="historial-item">
                  <div className="historial-item-icon">
                    <span className="material-symbols-outlined">check_circle</span>
                  </div>
                  <div className="historial-item-info">
                    <div className="historial-item-title">Pedido #{h.id} - Mesa {h.mesa?.numero}</div>
                    <div className="historial-item-desc">
                      {h.detalles.map(l => `${l.cantidad}x ${l.producto?.nombre}`).join(', ')}
                    </div>
                  </div>
                  <div className="historial-item-time">
                    {h.createdAt ? new Date(h.createdAt).toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit', timeZone: 'America/Bogota' }) : ''}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </>
  );
}
