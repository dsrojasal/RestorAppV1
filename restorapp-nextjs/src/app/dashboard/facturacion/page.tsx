'use client';

import { useState, useEffect, useCallback } from 'react';
import ModalSheet from '@/components/ModalSheet';
import LiveIndicator from '@/components/LiveIndicator';
import CobroForm, { CobroPayload } from '@/components/CobroForm';
import { useLiveData } from '@/lib/useLiveData';
import TicketModal from '@/components/TicketModal';
import type { TicketData } from '@/lib/imprimirTicket';
import { getAuthHeaders } from '@/lib/api';

interface Linea { id: number; cantidad: number; nombre?: string; observacion?: string; precioUnitario?: number | string | null; producto?: { nombre: string } | null; }
interface PedidoInFactura { id: number; total: number; mesa?: { numero: number } | null; usuario?: { name: string } | null; detalles?: Linea[] | null; }
interface PagoFactura { id: number; tipoPagoId: number; monto: number; tipoPago?: { id: number; nombre: string } | null; }
interface Factura {
  id: number; pedidoId: number; total: number; subtotal?: number; iva?: number; ivaPorcentaje?: number | null;
  propina?: number; propinaPorcentaje?: number | null; estadoPago: string; fechaEmision: string;
  tipoPago?: { id: number; nombre: string } | null; pedido?: PedidoInFactura | null;
  creadoPor?: { name: string } | null; cobradoPor?: { name: string } | null; cobradoPorRol?: string | null;
  fechaCobro?: string | null; anuladoPor?: { name: string } | null; motivoAnulacion?: string | null;
  cobradoSinTurno?: boolean; motivoSinTurno?: string | null; autorizadoSinTurnoPor?: { name: string } | null;
  pagos?: PagoFactura[] | null;
}
interface TipoPago { id: number; nombre: string; }

const fmt = (n: number | string) => '$' + Number(n).toLocaleString('es-CO', { maximumFractionDigits: 0 });
const minsSince = (ts: string) => Math.max(0, Math.floor((Date.now() - new Date(ts).getTime()) / 60000));
const fmtTime = (ts: string) => new Date(ts).toLocaleString('es-CO', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit', timeZone: 'America/Bogota' });

const STATUS_MAP: Record<string, { label: string; color: string; bg: string }> = {
  pendiente: { label: 'En espera de cobro', color: '#B45309', bg: '#FEF3C7' },
  pagado: { label: 'Pagado', color: '#065F46', bg: '#D1FAE5' },
  anulado: { label: 'Anulado', color: '#6B7280', bg: '#F3F4F6' },
};

export default function FacturacionPage() {
  const [facturas, setFacturas] = useState<Factura[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<'pendientes' | 'pagadas' | 'anuladas'>('pendientes');
  const [pagarTarget, setPagarTarget] = useState<Factura | null>(null);
  const [tipoPagos, setTipoPagos] = useState<TipoPago[]>([]);
  const [busy, setBusy] = useState(false);
  const [ticket, setTicket] = useState<TicketData | null>(null);
  const [cajaAbierta, setCajaAbierta] = useState<boolean | null>(null);
  const [esAdmin, setEsAdmin] = useState(false);

  const load = useCallback(async () => {
    try {
      setLoading(true);
      const headers = getAuthHeaders();
      const [facRes, tpRes, meRes] = await Promise.all([
        fetch('/api/backend/facturas', { headers }),
        fetch('/api/backend/tipo-pago', { headers }),
        fetch('/api/backend/usuarios/me', { headers }),
      ]);
      if (facRes.status === 401) { window.location.href = '/login'; return; }
      if (facRes.ok) setFacturas(await facRes.json());
      if (tpRes.ok) setTipoPagos(await tpRes.json());
      if (meRes.ok) {
        const me = await meRes.json();
        setEsAdmin(me?.rolId === 1);
      }
    } catch { /* noop */ } finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);
  const live = useLiveData(['pedidos.changed', 'facturas.changed'], load);

  const pendientes = facturas.filter(f => f.estadoPago === 'pendiente');
  const pagadas = facturas.filter(f => f.estadoPago === 'pagado');
  const anuladas = facturas.filter(f => f.estadoPago === 'anulado');

  async function api(method: string, url: string, body?: object) {
    const res = await fetch(url, { method, headers: getAuthHeaders(), body: body ? JSON.stringify(body) : undefined });
    if (res.status === 401) { window.location.href = '/login'; return null; }
    if (!res.ok) { const err = await res.json().catch(() => ({ message: 'Error' })); alert(err.message || 'Error'); return null; }
    const text = await res.text();
    return text ? JSON.parse(text) : null;
  }

  async function abrirCobro(f: Factura) {
    setPagarTarget(f);
    setCajaAbierta(null);
    try {
      const res = await fetch('/api/backend/turnos/estado', { headers: getAuthHeaders() });
      if (res.ok) {
        const data = await res.json();
        setCajaAbierta(!!data?.abierta);
      }
    } catch {
      setCajaAbierta(null);
    }
  }

  function armarTicket(f: Factura, extra: Partial<TicketData> = {}): TicketData {
    return {
      numero: f.id,
      estado: f.estadoPago as 'pendiente' | 'pagado' | 'anulado',
      fecha: f.fechaCobro ?? f.fechaEmision,
      pedidoId: f.pedidoId,
      mesa: f.pedido?.mesa?.numero,
      mesero: f.pedido?.usuario?.name,
      cajero: f.cobradoPor?.name,
      items: (f.pedido?.detalles ?? []).map((d) => ({
        nombre: d.producto?.nombre || d.nombre || 'Producto',
        cantidad: d.cantidad,
        precio: d.precioUnitario != null ? Number(d.precioUnitario) : null,
        observacion: d.observacion,
      })),
      subtotal: f.subtotal != null ? Number(f.subtotal) : Number(f.total),
      iva: f.iva != null ? Number(f.iva) : 0,
      ivaPorcentaje: f.ivaPorcentaje != null ? Number(f.ivaPorcentaje) : null,
      propina: f.propina != null ? Number(f.propina) : 0,
      propinaPorcentaje: f.propinaPorcentaje != null ? Number(f.propinaPorcentaje) : null,
      total: Number(f.total),
      metodoPago: f.tipoPago?.nombre,
      metodosPago: (f.pagos ?? []).map((p) => p.tipoPago?.nombre || 'Método').filter(Boolean),
      ...extra,
    };
  }

  async function confirmarPago(payload: CobroPayload) {
    if (!pagarTarget) return;
    setBusy(true);
    try {
      const res = await fetch(`/api/backend/facturas/${pagarTarget.id}/pagar`, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify(payload),
      });
      if (res.status === 401) { window.location.href = '/login'; return; }
      const text = await res.text();
      const data = text ? JSON.parse(text) : null;
      if (!res.ok) {
        throw new Error(data?.message || 'No se pudo cobrar la factura');
      }

      setPagarTarget(null);
      await load();
      if (data) setTicket(armarTicket(data, { estado: 'pagado', fecha: new Date() }));
    } finally {
      setBusy(false);
    }
  }

  async function anular(factura: Factura) {
    if (!confirm(`¿Anular la factura #${factura.id}? El pedido volverá a ser editable.`)) return;
    const motivo = window.prompt('Motivo de la anulación (opcional):', '');
    if (motivo === null) return;
    const result = await api('POST', `/api/backend/facturas/${factura.id}/anular`, motivo.trim() ? { motivo: motivo.trim() } : {});
    if (result) await load();
  }

  function imprimir(f: Factura) {
    setTicket(armarTicket(f));
  }

  const list = tab === 'pendientes' ? pendientes : tab === 'pagadas' ? pagadas : anuladas;

  return (
    <>
      <div className="animate-in">
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <h2 className="page-title" style={{ marginBottom: 0 }}>Facturación</h2>
          <LiveIndicator connected={live} />
        </div>
        <p className="page-subtitle">Cobra los pedidos enviados por los meseros (caja centralizada).</p>
      </div>

      <div className="segment-control animate-in animate-in-delay-1" style={{ marginBottom: 16 }}>
        <div className={`segment-option ${tab === 'pendientes' ? 'active' : ''}`} onClick={() => setTab('pendientes')}>
          En espera de cobro ({pendientes.length})
        </div>
        <div className={`segment-option ${tab === 'pagadas' ? 'active' : ''}`} onClick={() => setTab('pagadas')}>
          Pagadas ({pagadas.length})
        </div>
        <div className={`segment-option ${tab === 'anuladas' ? 'active' : ''}`} onClick={() => setTab('anuladas')}>
          Anuladas ({anuladas.length})
        </div>
      </div>

      {loading ? (
        <div className="card-data animate-in" style={{ textAlign: 'center', padding: '60px 24px' }}>
          <span className="material-symbols-outlined" style={{ fontSize: 48, color: 'var(--text-muted)', marginBottom: 12 }}>sync</span>
          <p style={{ color: 'var(--text-muted)' }}>Cargando facturas...</p>
        </div>
      ) : list.length === 0 ? (
        <div className="card-data animate-in animate-in-delay-2" style={{ textAlign: 'center', padding: '60px 24px' }}>
          <span className="material-symbols-outlined" style={{ fontSize: 56, color: 'var(--text-muted)', marginBottom: 12 }}>
            {tab === 'pendientes' ? 'receipt_long' : tab === 'pagadas' ? 'verified' : 'block'}
          </span>
          <h3 style={{ fontSize: 18, fontWeight: 700, color: 'var(--text)', marginBottom: 8 }}>
            {tab === 'pendientes' ? 'Sin pedidos en espera' : tab === 'pagadas' ? 'Sin cobros registrados' : 'Sin anulaciones'}
          </h3>
          <p style={{ color: 'var(--text-muted)', maxWidth: 400, margin: '0 auto' }}>
            {tab === 'pendientes' ? 'Cuando un mesero envíe un pedido a caja, aparecerá aquí para que lo cobres.' : tab === 'pagadas' ? 'Los cobros completados aparecerán aquí.' : 'Las facturas anuladas se registran aquí para auditoría.'}
          </p>
        </div>
      ) : (
        <div className="animate-in animate-in-delay-2" style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {list.map(f => {
            const st = STATUS_MAP[f.estadoPago] || STATUS_MAP.pendiente;
            const metodos = (f.pagos ?? []).map((p) => p.tipoPago?.nombre).filter(Boolean);
            return (
              <div key={f.id} className="card-data">
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8, flexWrap: 'wrap' }}>
                  <h3 style={{ fontSize: 16, fontWeight: 700, color: 'var(--text)', margin: 0 }}>Factura #{f.id}</h3>
                  <span style={{ padding: '3px 10px', borderRadius: 999, fontSize: 12, fontWeight: 700, background: st.bg, color: st.color }}>{st.label}</span>
                  {f.cobradoSinTurno && (
                    <span style={{ padding: '3px 10px', borderRadius: 999, fontSize: 11, fontWeight: 700, background: 'var(--warning-bg)', color: 'var(--warning)' }}>
                      Cobro sin caja
                    </span>
                  )}
                  <span style={{ marginLeft: 'auto', color: 'var(--text-muted)', fontSize: 12 }}>
                    {f.fechaEmision ? new Date(f.fechaEmision).toLocaleString('es-CO', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit', timeZone: 'America/Bogota' }) : ''}
                  </span>
                </div>
                <p style={{ fontSize: 13, color: 'var(--text-muted)', margin: '0 0 10px' }}>
                  Pedido #{f.pedidoId} · Mesa {f.pedido?.mesa?.numero ?? '—'} · Mesero: {f.pedido?.usuario?.name ?? '—'}
                  {metodos.length > 0 ? ` · ${metodos.join(' + ')}` : f.tipoPago ? ` · ${f.tipoPago.nombre}` : ''}
                </p>
                {f.estadoPago === 'pendiente' && (
                  <p style={{ fontSize: 12, fontWeight: 600, color: '#B45309', margin: '0 0 10px' }}>
                    ⏳ En espera de cobro — lleva {minsSince(f.fechaEmision)} min
                  </p>
                )}
                {f.estadoPago !== 'pendiente' && (
                  <p style={{ fontSize: 12, color: 'var(--text-muted)', margin: '0 0 10px' }}>
                    Enviada por: {f.creadoPor?.name ?? '—'}
                    {f.estadoPago === 'pagado' && (
                      <> · Cobrada por: <strong style={{ color: 'var(--text)' }}>{f.cobradoPor?.name ?? '—'}</strong>{f.cobradoPorRol ? ` (${f.cobradoPorRol})` : ''} · {f.fechaCobro ? fmtTime(f.fechaCobro) : ''}</>
                    )}
                    {f.estadoPago === 'anulado' && (
                      <> · Anulada por: {f.anuladoPor?.name ?? '—'}{f.motivoAnulacion ? ` · Motivo: ${f.motivoAnulacion}` : ''}</>
                    )}
                  </p>
                )}
                {f.cobradoSinTurno && (
                  <p style={{ fontSize: 12, color: 'var(--warning)', margin: '0 0 10px' }}>
                    Autorizado sin caja por {f.autorizadoSinTurnoPor?.name ?? '—'}{f.motivoSinTurno ? ` · ${f.motivoSinTurno}` : ''}
                  </p>
                )}
                <div style={{ marginBottom: 10 }}>
                  {f.pedido?.detalles?.map(d => (
                    <div key={d.id} className="order-item-row" style={{ padding: '4px 0', gap: 8 }}>
                      <div style={{ flex: 1, fontSize: 13, color: 'var(--text)' }}>
                        {d.producto?.nombre || d.nombre} <span className="text-xs" style={{ color: 'var(--text-muted)' }}>x{d.cantidad}</span>
                      </div>
                      {d.observacion && <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>{d.observacion}</span>}
                    </div>
                  ))}
                </div>
                {Number(f.iva) > 0 || Number(f.propina) > 0 ? (
                  <div style={{ display: 'flex', gap: 14, flexWrap: 'wrap', fontSize: 12, color: 'var(--text-muted)', padding: '8px 0', borderTop: '1px solid var(--border-light)' }}>
                    <span>Subtotal: <b style={{ color: 'var(--text-secondary)' }}>{fmt(f.subtotal ?? f.total)}</b></span>
                    {Number(f.iva) > 0 && <span>IVA{f.ivaPorcentaje != null ? ` (${f.ivaPorcentaje}%)` : ''}: <b style={{ color: 'var(--text-secondary)' }}>{fmt(f.iva!)}</b></span>}
                    {Number(f.propina) > 0 && <span>Propina{f.propinaPorcentaje != null ? ` (${f.propinaPorcentaje}%)` : ''}: <b style={{ color: 'var(--text-secondary)' }}>{fmt(f.propina!)}</b></span>}
                  </div>
                ) : null}
                <div className="order-total-row" style={{ marginTop: 8 }}>
                  <span className="font-semibold text-sm" style={{ color: 'var(--text)' }}>Total</span>
                  <span className="font-bold" style={{ color: 'var(--primary)', fontSize: 16 }}>{fmt(f.total)}</span>
                </div>
                <div className="mt-4" style={{ display: 'flex', gap: 8 }}>
                  {f.estadoPago === 'pendiente' && (
                    <>
                      <button className="btn-primary" style={{ flex: 1 }} onClick={() => abrirCobro(f)}>
                        <span className="material-symbols-outlined" style={{ fontSize: 18 }}>payments</span> Cobrar
                      </button>
                      <button className="btn-cancel" onClick={() => imprimir(f)} title="Imprimir pre-cuenta" aria-label="Imprimir pre-cuenta">
                        <span className="material-symbols-outlined" style={{ fontSize: 18, verticalAlign: 'middle' }}>print</span>
                      </button>
                      <button className="btn-cancel" style={{ flex: 0.4 }} onClick={() => anular(f)}>Anular</button>
                    </>
                  )}
                  {f.estadoPago === 'pagado' && (
                    <button className="btn-primary" onClick={() => imprimir(f)}>
                      <span className="material-symbols-outlined" style={{ fontSize: 18 }}>print</span> Imprimir ticket
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      <ModalSheet
        isOpen={!!pagarTarget}
        onClose={() => { if (!busy) setPagarTarget(null); }}
        title="Cobrar factura"
      >
        {pagarTarget && (
          <div>
            <p style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 14 }}>
              Factura #{pagarTarget.id} · Mesa {pagarTarget.pedido?.mesa?.numero ?? '—'} · Pedido #{pagarTarget.pedidoId}
            </p>
            <CobroForm
              subtotal={Number(pagarTarget.subtotal ?? pagarTarget.total)}
              tipoPagos={tipoPagos}
              cajaAbierta={cajaAbierta}
              esAdmin={esAdmin}
              busy={busy}
              onCancel={() => setPagarTarget(null)}
              onSubmit={confirmarPago}
            />
          </div>
        )}
      </ModalSheet>

      <TicketModal data={ticket} onClose={() => setTicket(null)} />
    </>
  );
}
