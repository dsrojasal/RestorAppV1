'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { getAuthHeaders } from '@/lib/api';
import {
  csvNumero,
  descargarCSV,
  fmtDia,
  fmtFecha,
  fmtNumero,
  fmtPesos,
  hoyIso,
  mesActual,
  primerDiaMesIso,
  ultimoDiaMes,
} from '@/lib/reportes';

type Modo = 'dia' | 'rango' | 'periodo' | 'chef';

interface Config {
  title: string;
  subtitle: string;
  icon: string;
  modo: Modo;
  endpoint?: string;
  codigo: string;
}

const CONFIGS: Record<string, Config> = {
  'ventas-dia': { title: 'Reporte de Ventas Diarias', subtitle: 'Ventas del día actual', icon: 'monitoring', modo: 'dia', endpoint: 'ventas-dia', codigo: 'VDIA' },
  'ventas-rango': {
    title: 'Reporte de Ventas por Rango de Fechas',
    subtitle: 'Ventas para un rango personalizado',
    icon: 'date_range',
    modo: 'rango',
    endpoint: 'ventas-rango',
    codigo: 'VRAN',
  },
  'productos-vendidos': {
    title: 'Reporte de Productos Más Vendidos',
    subtitle: 'Rendimiento por producto',
    icon: 'trending_up',
    modo: 'periodo',
    endpoint: 'productos-vendidos',
    codigo: 'PROD',
  },
  'consumo-insumos': {
    title: 'Reporte de Consumo de Insumos',
    subtitle: 'Uso de ingredientes y stock',
    icon: 'inventory_2',
    modo: 'periodo',
    endpoint: 'consumo-insumos',
    codigo: 'INSU',
  },
  'reporte-mesero': {
    title: 'Reporte de Ventas por Mesero',
    subtitle: 'Rendimiento por mesero',
    icon: 'person_pin',
    modo: 'periodo',
    endpoint: 'por-mesero',
    codigo: 'MESE',
  },
  'pedidos-chef': {
    title: 'Reporte de Pedidos por Chef',
    subtitle: 'Productividad por chef',
    icon: 'soup_kitchen',
    modo: 'chef',
    codigo: 'CHEF',
  },
};

const NOMBRE_MES = (mes: string): string => {
  const [year, month] = mes.split('-').map(Number);
  if (!year || !month) return mes;
  const texto = new Date(Date.UTC(year, month - 1, 1, 12)).toLocaleDateString('es-CO', {
    month: 'long',
    year: 'numeric',
    timeZone: 'UTC',
  });
  return texto.charAt(0).toUpperCase() + texto.slice(1);
};

function Metrica({ icon, label, value, detalle }: { icon: string; label: string; value: string; detalle?: string }) {
  return (
    <div className="metric-card">
      <div className="metric-icon">
        <span className="material-symbols-outlined">{icon}</span>
      </div>
      <div>
        <p className="metric-label">{label}</p>
        <p className="metric-value">{value}</p>
        {detalle ? <p style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>{detalle}</p> : null}
      </div>
    </div>
  );
}

function Ranking({ items }: { items: { nombre: string; cantidad: number; valor: string }[] }) {
  if (items.length === 0) {
    return <p style={{ color: 'var(--text-muted)', fontSize: 13 }}>No hay datos para el periodo seleccionado.</p>;
  }
  const max = Math.max(1, ...items.map((i) => i.cantidad));
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      {items.map((item, idx) => (
        <div key={`${item.nombre}-${idx}`}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 4, gap: 12 }}>
            <span style={{ fontSize: 13, fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {idx + 1}. {item.nombre}
            </span>
            <span style={{ fontSize: 12, color: 'var(--text-secondary)', whiteSpace: 'nowrap' }}>{item.valor}</span>
          </div>
          <div className="progress-bar">
            <div
              className="progress-bar-fill"
              style={{ width: `${Math.max(4, (item.cantidad / max) * 100)}%`, background: 'var(--primary)' }}
            />
          </div>
        </div>
      ))}
    </div>
  );
}

export default function ReporteDetallePage() {
  const params = useParams();
  const router = useRouter();
  const id = (params?.id as string) || 'ventas-dia';
  const config = CONFIGS[id] ?? CONFIGS['ventas-dia'];

  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [desde, setDesde] = useState(primerDiaMesIso());
  const [hasta, setHasta] = useState(hoyIso());
  const [periodo, setPeriodo] = useState<'mes' | 'historico'>('mes');
  const [mes, setMes] = useState(mesActual());
  const csvHecho = useRef(false);

  const query = useMemo(() => {
    if (config.modo === 'rango') {
      return `?desde=${encodeURIComponent(desde)}&hasta=${encodeURIComponent(hasta)}`;
    }
    if (config.modo === 'periodo') {
      if (periodo === 'mes' && mes) {
        return `?desde=${mes}-01&hasta=${ultimoDiaMes(mes)}`;
      }
      return '';
    }
    return '';
  }, [config.modo, desde, hasta, periodo, mes]);

  const cargar = useCallback(async () => {
    if (config.modo === 'chef') {
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/backend/reportes/${config.endpoint}${query}`, { headers: getAuthHeaders() });
      if (res.status === 401) {
        window.location.href = '/login';
        return;
      }
      if (!res.ok) throw new Error('No se pudo cargar el reporte');
      setData(await res.json());
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error al cargar el reporte');
    } finally {
      setLoading(false);
    }
  }, [config.modo, config.endpoint, query]);

  useEffect(() => {
    if (config.modo === 'chef') {
      setData(null);
      setLoading(false);
      return;
    }
    cargar();
  }, [cargar, config.modo]);

  const filasCSV = useCallback((): (string | number | null | undefined)[][] => {
    if (!data) return [];
    switch (id) {
      case 'ventas-dia':
      case 'ventas-rango':
        return [
          ['Factura', 'Mesa', 'Total', 'Fecha'],
          ...(data.transacciones ?? []).map((t: any) => [t.id, t.mesa, csvNumero(t.total), fmtFecha(t.fecha)]),
        ];
      case 'productos-vendidos':
        return [
          ['Producto', 'Cantidad', 'Total'],
          ...(data.productos ?? []).map((p: any) => [p.nombre, csvNumero(p.cantidad, 2), csvNumero(p.total)]),
        ];
      case 'consumo-insumos':
        return [
          ['Insumo', 'Cantidad'],
          ...(data.insumos ?? []).map((i: any) => [i.nombre, i.cantidadTexto]),
        ];
      case 'reporte-mesero':
        return [
          ['Usuario', 'Rol', 'Cuentas', 'Total', 'Ticket promedio'],
          ...(data.meseros ?? []).map((m: any) => [
            m.nombre,
            m.rol,
            m.cuentas,
            csvNumero(m.total),
            m.ticketPromedio != null ? csvNumero(m.ticketPromedio) : '',
          ]),
        ];
      default:
        return [];
    }
  }, [data, id]);

  const exportarCSV = useCallback(() => {
    const filas = filasCSV();
    if (filas.length <= 1) return;
    descargarCSV(`reporte-${id}-${hoyIso()}.csv`, filas);
  }, [filasCSV, id]);

  useEffect(() => {
    if (!data || csvHecho.current) return;
    if (typeof window === 'undefined' || !window.location.search.includes('csv=1')) return;
    csvHecho.current = true;
    const timer = window.setTimeout(() => exportarCSV(), 250);
    return () => window.clearTimeout(timer);
  }, [data, exportarCSV]);

  const etiquetaPeriodo = useMemo(() => {
    if (config.modo === 'dia') {
      return data?.fecha ? fmtDia(data.fecha) : fmtDia(hoyIso());
    }
    if (config.modo === 'rango') {
      return data?.desde && data?.hasta ? `${fmtDia(data.desde)} – ${fmtDia(data.hasta)}` : `${fmtDia(desde)} – ${fmtDia(hasta)}`;
    }
    if (config.modo === 'periodo') {
      return periodo === 'mes' ? NOMBRE_MES(mes) : 'Histórico completo';
    }
    return '';
  }, [config.modo, data, desde, hasta, periodo, mes]);

  const metricas = useMemo(() => {
    if (!data) return [] as { icon: string; label: string; value: string; detalle?: string }[];
    if (id === 'ventas-dia' || id === 'ventas-rango') {
      return [
        { icon: 'payments', label: 'Total ventas', value: fmtPesos(data.total), detalle: 'Facturas pagadas' },
        { icon: 'receipt_long', label: 'Cuentas', value: fmtNumero(data.cuentas), detalle: 'Facturas cobradas' },
        {
          icon: 'local_atm',
          label: 'Ticket promedio',
          value: data.ticketPromedio != null ? fmtPesos(data.ticketPromedio) : '—',
          detalle: 'Por cuenta',
        },
      ];
    }
    if (id === 'productos-vendidos') {
      return [
        { icon: 'sell', label: 'Total vendido', value: fmtPesos(data.totalVendido), detalle: 'Ingresos por productos' },
        { icon: 'inventory', label: 'Unidades vendidas', value: fmtNumero(data.totalUnidades, 2), detalle: 'Suma de cantidades' },
        { icon: 'category', label: 'Productos', value: fmtNumero(data.productos?.length ?? 0), detalle: 'Con al menos una venta' },
      ];
    }
    if (id === 'consumo-insumos') {
      const top = data.insumos?.[0];
      return [
        { icon: 'inventory_2', label: 'Insumos con consumo', value: fmtNumero(data.insumos?.length ?? 0), detalle: 'En el periodo' },
        { icon: 'local_fire_department', label: 'Más consumido', value: top?.nombre ?? '—', detalle: top?.cantidadTexto ?? '' },
      ];
    }
    if (id === 'reporte-mesero') {
      const cuentas = (data.meseros ?? []).reduce((acc: number, m: any) => acc + Number(m.cuentas || 0), 0);
      const ticket = cuentas > 0 ? Number(data.totalGeneral) / cuentas : null;
      return [
        { icon: 'payments', label: 'Total general', value: fmtPesos(data.totalGeneral), detalle: 'Ventas cobradas' },
        { icon: 'receipt_long', label: 'Cuentas', value: fmtNumero(cuentas), detalle: 'Facturas cobradas' },
        {
          icon: 'local_atm',
          label: 'Ticket promedio',
          value: ticket != null ? fmtPesos(ticket) : '—',
          detalle: 'Por cuenta',
        },
      ];
    }
    return [];
  }, [data, id]);

  const maxHora = useMemo(() => Math.max(1, ...(data?.porHora ?? [0])), [data]);
  const maxDia = useMemo(() => Math.max(1, ...(data?.porDia ?? [{ total: 0 }]).map((d: any) => d.total)), [data]);
  const columnasBarras = useMemo(() => {
    const total = id === 'ventas-dia' ? (data?.porHora?.length ?? 24) : (data?.porDia?.length ?? 1);
    return `repeat(${Math.max(1, total)}, minmax(0, 1fr))`;
  }, [data, id]);

  return (
    <>
      <div className="no-print" style={{ marginBottom: 16 }}>
        <button className="btn-outline" style={{ padding: '8px 14px', fontSize: 13 }} onClick={() => router.push('/dashboard/reportes')}>
          <span className="material-symbols-outlined" style={{ fontSize: 18, marginRight: 6 }}>arrow_back</span>
          Volver a reportes
        </button>
      </div>

      {config.modo === 'chef' ? (
        <div className="card-data animate-in" style={{ textAlign: 'center', padding: '48px 24px' }}>
          <span className="material-symbols-outlined" style={{ fontSize: 48, color: 'var(--warning)' }}>construction</span>
          <h3 style={{ fontSize: 18, fontWeight: 700, marginTop: 12 }}>Reporte por chef — Próximamente</h3>
          <p style={{ color: 'var(--text-secondary)', fontSize: 14, maxWidth: 520, margin: '8px auto 0' }}>
            Para generar este reporte se necesita registrar qué chef preparó cada ítem. Actualmente el sistema guarda
            el estado de cada línea, pero no el chef que la atendió.
          </p>
        </div>
      ) : (
        <div className="report-preview">
          <div className="report-card">
            <div className="report-header">
              <div className="report-logo">
                <span className="material-symbols-outlined">{config.icon}</span>
              </div>
              <h2 className="report-title">RestorApp</h2>
              <p className="report-subtitle">{config.title}</p>
              <p className="report-date">{etiquetaPeriodo}</p>
            </div>

            <div className="no-print" style={{ marginBottom: 20 }}>
              {config.modo === 'rango' && (
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10, alignItems: 'flex-end' }}>
                  <label style={{ fontSize: 12, color: 'var(--text-secondary)', display: 'flex', flexDirection: 'column', gap: 4 }}>
                    Desde
                    <input
                      type="date"
                      value={desde}
                      max={hasta}
                      onChange={(e) => setDesde(e.target.value)}
                      style={{ border: '1px solid var(--border)', borderRadius: 8, padding: '8px 10px', background: 'var(--bg-card)', color: 'var(--text)' }}
                    />
                  </label>
                  <label style={{ fontSize: 12, color: 'var(--text-secondary)', display: 'flex', flexDirection: 'column', gap: 4 }}>
                    Hasta
                    <input
                      type="date"
                      value={hasta}
                      min={desde}
                      max={hoyIso()}
                      onChange={(e) => setHasta(e.target.value)}
                      style={{ border: '1px solid var(--border)', borderRadius: 8, padding: '8px 10px', background: 'var(--bg-card)', color: 'var(--text)' }}
                    />
                  </label>
                </div>
              )}

              {config.modo === 'periodo' && (
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10, alignItems: 'center' }}>
                  <div style={{ display: 'inline-flex', background: 'var(--bg)', borderRadius: 50, padding: 4 }}>
                    <button
                      onClick={() => setPeriodo('mes')}
                      style={{
                        padding: '6px 14px',
                        borderRadius: 50,
                        fontSize: 12,
                        fontWeight: 700,
                        background: periodo === 'mes' ? 'var(--primary)' : 'transparent',
                        color: periodo === 'mes' ? '#fff' : 'var(--text-secondary)',
                      }}
                    >
                      Por mes
                    </button>
                    <button
                      onClick={() => setPeriodo('historico')}
                      style={{
                        padding: '6px 14px',
                        borderRadius: 50,
                        fontSize: 12,
                        fontWeight: 700,
                        background: periodo === 'historico' ? 'var(--primary)' : 'transparent',
                        color: periodo === 'historico' ? '#fff' : 'var(--text-secondary)',
                      }}
                    >
                      Histórico
                    </button>
                  </div>
                  {periodo === 'mes' && (
                    <input
                      type="month"
                      value={mes}
                      max={mesActual()}
                      onChange={(e) => setMes(e.target.value)}
                      style={{ border: '1px solid var(--border)', borderRadius: 8, padding: '8px 10px', background: 'var(--bg-card)', color: 'var(--text)' }}
                    />
                  )}
                </div>
              )}
            </div>

            {loading && (
              <div style={{ textAlign: 'center', padding: '32px 0' }}>
                <span className="material-symbols-outlined" style={{ fontSize: 36, color: 'var(--text-muted)' }}>sync</span>
                <p style={{ color: 'var(--text-muted)', marginTop: 8 }}>Cargando reporte...</p>
              </div>
            )}

            {error && !loading && (
              <div style={{ textAlign: 'center', padding: '24px 0' }}>
                <p style={{ color: 'var(--danger)', fontWeight: 600 }}>{error}</p>
                <button className="btn-outline" style={{ marginTop: 10, padding: '6px 12px', fontSize: 12 }} onClick={cargar}>
                  Reintentar
                </button>
              </div>
            )}

            {data && !loading && (
              <>
                <div className="metric-grid print-block">
                  {metricas.map((m) => (
                    <Metrica key={m.label} icon={m.icon} label={m.label} value={m.value} detalle={m.detalle} />
                  ))}
                </div>

                {(id === 'ventas-dia' || id === 'ventas-rango') && (
                  <div style={{ marginTop: 24 }} className="print-block">
                    <h3 style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-secondary)', marginBottom: 12 }}>
                      {id === 'ventas-dia' ? 'Distribución por hora' : 'Ventas por día'}
                    </h3>
                    <div style={{ background: 'var(--bg)', borderRadius: 'var(--radius)', padding: '16px 12px 8px' }}>
                      <div className="bar-chart" style={{ height: 120, gridTemplateColumns: columnasBarras, gap: 4 }}>
                        {id === 'ventas-dia'
                          ? (data.porHora ?? []).map((valor: number, i: number) => (
                              <div
                                key={i}
                                className="bar-chart-item"
                                title={`${i}:00 — ${fmtPesos(valor)}`}
                                style={{ height: `${Math.max(3, (valor / maxHora) * 100)}%`, opacity: 0.35 + (valor / maxHora) * 0.65 }}
                              />
                            ))
                          : (data.porDia ?? []).map((dia: any, i: number) => (
                              <div
                                key={i}
                                className="bar-chart-item"
                                title={`${fmtDia(dia.fecha)} — ${fmtPesos(dia.total)}`}
                                style={{ height: `${Math.max(3, (dia.total / maxDia) * 100)}%`, opacity: 0.35 + (dia.total / maxDia) * 0.65 }}
                              />
                            ))}
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 8, padding: '0 2px' }}>
                        {id === 'ventas-dia'
                          ? [0, 6, 12, 18].map((h) => (
                              <span key={h} style={{ fontSize: 10, color: 'var(--text-muted)', fontWeight: 600 }}>
                                {String(h).padStart(2, '0')}:00
                              </span>
                            ))
                          : (() => {
                              const dias = data.porDia ?? [];
                              const paso = Math.max(1, Math.ceil(dias.length / 6));
                              return dias
                                .filter((_: any, i: number) => i % paso === 0)
                                .map((dia: any) => (
                                  <span key={dia.fecha} style={{ fontSize: 10, color: 'var(--text-muted)', fontWeight: 600 }}>
                                    {fmtDia(dia.fecha).replace(/ de /g, ' ')}
                                  </span>
                                ));
                            })()}
                      </div>
                    </div>
                  </div>
                )}

                {(id === 'productos-vendidos' || id === 'consumo-insumos' || id === 'reporte-mesero') && (
                  <div style={{ marginTop: 24 }} className="print-block">
                    <h3 style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-secondary)', marginBottom: 12 }}>
                      {id === 'productos-vendidos' ? 'Ranking de productos' : id === 'consumo-insumos' ? 'Ranking de insumos' : 'Ranking por mesero'}
                    </h3>
                    {id === 'productos-vendidos' && (
                      <Ranking
                        items={(data.productos ?? []).slice(0, 10).map((p: any) => ({
                          nombre: p.nombre,
                          cantidad: p.cantidad,
                          valor: `${fmtNumero(p.cantidad, 2)} und · ${fmtPesos(p.total)}`,
                        }))}
                      />
                    )}
                    {id === 'consumo-insumos' && (
                      <Ranking
                        items={(data.insumos ?? []).slice(0, 10).map((i: any) => ({
                          nombre: i.nombre,
                          cantidad: i.cantidad,
                          valor: i.cantidadTexto,
                        }))}
                      />
                    )}
                    {id === 'reporte-mesero' && (
                      <Ranking
                        items={(data.meseros ?? []).slice(0, 10).map((m: any) => ({
                          nombre: m.nombre,
                          cantidad: m.total,
                          valor: `${fmtPesos(m.total)} · ${m.cuentas} cuentas`,
                        }))}
                      />
                    )}
                  </div>
                )}

                <div style={{ marginTop: 24 }} className="print-section">
                  <h3 style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-secondary)', marginBottom: 12 }}>
                    {id === 'productos-vendidos'
                      ? 'Detalle de productos'
                      : id === 'consumo-insumos'
                        ? 'Detalle de insumos'
                        : id === 'reporte-mesero'
                          ? 'Detalle por mesero'
                          : 'Detalle de transacciones'}
                  </h3>
                  <div className="table-wrap">
                    {id === 'ventas-dia' || id === 'ventas-rango' ? (
                      <table>
                        <thead>
                          <tr>
                            <th>Factura</th>
                            <th>Mesa</th>
                            <th>Fecha</th>
                            <th style={{ textAlign: 'right' }}>Total</th>
                          </tr>
                        </thead>
                        <tbody>
                          {(data.transacciones ?? []).length === 0 ? (
                            <tr>
                              <td colSpan={4} style={{ color: 'var(--text-muted)' }}>No hay ventas registradas para este periodo.</td>
                            </tr>
                          ) : (
                            (data.transacciones ?? []).map((t: any) => (
                              <tr key={t.id}>
                                <td style={{ color: 'var(--text-secondary)' }}>#{t.id}</td>
                                <td>{t.mesa}</td>
                                <td style={{ color: 'var(--text-secondary)' }}>{fmtFecha(t.fecha)}</td>
                                <td style={{ textAlign: 'right', fontWeight: 700, color: 'var(--primary-dark)' }}>{fmtPesos(t.total)}</td>
                              </tr>
                            ))
                          )}
                        </tbody>
                      </table>
                    ) : id === 'productos-vendidos' ? (
                      <table>
                        <thead>
                          <tr>
                            <th>#</th>
                            <th>Producto</th>
                            <th style={{ textAlign: 'right' }}>Cantidad</th>
                            <th style={{ textAlign: 'right' }}>Total</th>
                          </tr>
                        </thead>
                        <tbody>
                          {(data.productos ?? []).length === 0 ? (
                            <tr>
                              <td colSpan={4} style={{ color: 'var(--text-muted)' }}>No hay productos vendidos en este periodo.</td>
                            </tr>
                          ) : (
                            (data.productos ?? []).map((p: any, i: number) => (
                              <tr key={p.productoId}>
                                <td style={{ color: 'var(--text-secondary)' }}>{i + 1}</td>
                                <td>{p.nombre}</td>
                                <td style={{ textAlign: 'right' }}>{fmtNumero(p.cantidad, 2)}</td>
                                <td style={{ textAlign: 'right', fontWeight: 700, color: 'var(--primary-dark)' }}>{fmtPesos(p.total)}</td>
                              </tr>
                            ))
                          )}
                        </tbody>
                      </table>
                    ) : id === 'consumo-insumos' ? (
                      <table>
                        <thead>
                          <tr>
                            <th>#</th>
                            <th>Insumo</th>
                            <th style={{ textAlign: 'right' }}>Cantidad consumida</th>
                          </tr>
                        </thead>
                        <tbody>
                          {(data.insumos ?? []).length === 0 ? (
                            <tr>
                              <td colSpan={3} style={{ color: 'var(--text-muted)' }}>No hay consumo de insumos en este periodo.</td>
                            </tr>
                          ) : (
                            (data.insumos ?? []).map((i: any, idx: number) => (
                              <tr key={i.ingredienteId}>
                                <td style={{ color: 'var(--text-secondary)' }}>{idx + 1}</td>
                                <td>{i.nombre}</td>
                                <td style={{ textAlign: 'right', fontWeight: 700, color: 'var(--primary-dark)' }}>{i.cantidadTexto}</td>
                              </tr>
                            ))
                          )}
                        </tbody>
                      </table>
                    ) : (
                      <table>
                        <thead>
                          <tr>
                            <th>Usuario</th>
                            <th>Rol</th>
                            <th style={{ textAlign: 'right' }}>Cuentas</th>
                            <th style={{ textAlign: 'right' }}>Total</th>
                            <th style={{ textAlign: 'right' }}>Ticket prom.</th>
                          </tr>
                        </thead>
                        <tbody>
                          {(data.meseros ?? []).length === 0 ? (
                            <tr>
                              <td colSpan={5} style={{ color: 'var(--text-muted)' }}>No hay ventas por mesero en este periodo.</td>
                            </tr>
                          ) : (
                            (data.meseros ?? []).map((m: any, idx: number) => (
                              <tr key={`${m.usuarioId ?? 'sin'}-${idx}`}>
                                <td>{m.nombre}</td>
                                <td style={{ color: 'var(--text-secondary)' }}>{m.rol}</td>
                                <td style={{ textAlign: 'right' }}>{m.cuentas}</td>
                                <td style={{ textAlign: 'right', fontWeight: 700, color: 'var(--primary-dark)' }}>{fmtPesos(m.total)}</td>
                                <td style={{ textAlign: 'right' }}>{m.ticketPromedio != null ? fmtPesos(m.ticketPromedio) : '—'}</td>
                              </tr>
                            ))
                          )}
                        </tbody>
                      </table>
                    )}
                  </div>
                </div>

                <div style={{ marginTop: 24, paddingTop: 20, borderTop: '1px solid var(--border)', textAlign: 'center' }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, color: 'var(--text-muted)', marginBottom: 4 }}>
                    <span className="material-symbols-outlined" style={{ fontSize: 14 }}>info</span>
                    <p style={{ fontSize: 11 }}>Generado automáticamente por RestorApp</p>
                  </div>
                  <p style={{ fontSize: 10, color: 'var(--text-muted)' }}>
                    {config.codigo}-{hoyIso().replace(/-/g, '')}-001 · {etiquetaPeriodo}
                  </p>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {config.modo !== 'chef' && (
        <div className="pdf-bar no-print">
          <div className="pdf-bar-inner">
            <button className="btn-primary" onClick={() => window.print()} disabled={!data}>
              <span className="material-symbols-outlined" style={{ fontVariationSettings: "'FILL' 1" }}>download</span>
              Descargar PDF
            </button>
            <button className="btn-outline" onClick={exportarCSV} disabled={!data} title="Descargar Excel (CSV)" style={{ width: 'auto', padding: '12px 16px' }}>
              <span className="material-symbols-outlined" style={{ marginRight: 6 }}>summarize</span>
              Excel
            </button>
          </div>
        </div>
      )}

      <style>{`
        @media (min-width: 768px) {
          .report-preview { max-width: 700px; }
        }
        @media print {
          @page { size: A4 portrait; margin: 12mm; }
          html, body { background: #fff !important; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
          .report-preview { max-width: 100% !important; margin: 0 !important; }
          .report-card {
            padding: 0 !important; border: none !important; box-shadow: none !important;
            border-radius: 0 !important; background: #fff !important;
          }
          .report-header { padding-bottom: 14px !important; margin-bottom: 16px !important; }
          .table-wrap { overflow: visible !important; border: none !important; border-radius: 0 !important; }
          .table-wrap table { font-size: 10.5px !important; }
          .table-wrap th { padding: 6px 8px !important; background: #f4f6f5 !important; }
          .table-wrap td { padding: 6px 8px !important; }
          .table-wrap tr:hover td { background: transparent !important; }
          thead { display: table-header-group; }
          tr { break-inside: avoid; page-break-inside: avoid; }
          .print-block { break-inside: avoid; page-break-inside: avoid; }
          .print-section h3 { break-after: avoid; page-break-after: avoid; }
          .metric-grid { grid-template-columns: repeat(3, 1fr) !important; gap: 8px !important; }
          .metric-card { padding: 10px 12px !important; background: #f4f6f5 !important; }
          .metric-value { font-size: 16px !important; }
          .animate-in { animation: none !important; }
        }
      `}</style>
    </>
  );
}
