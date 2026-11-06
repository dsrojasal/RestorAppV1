'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { getAuthHeaders } from '@/lib/api';
import { fmtFecha } from '@/lib/reportes';
import { formatMonto as money } from '@/lib/montos';

type RolTurno = 'mesero' | 'cajero' | 'cocinero';

type Movimiento = {
  id: number;
  tipo: 'entrada' | 'salida';
  monto: number;
  motivo: string;
  reversoDeId: number | null;
  fecha: string;
  usuario: { id: number; name: string } | null;
};

type Turno = {
  id: number;
  estado: string;
  montoInicial: number;
  montoEsperado: number | null;
  montoContado: number | null;
  diferencia: number | null;
  motivoDiferencia: string | null;
  totalVentas: number;
  ventasEfectivo: number;
  totalEntradas: number;
  totalSalidas: number;
  totalIva: number;
  totalPropina: number;
  cantidadFacturas: number;
  resumenPagos: { tipoPagoId: number | null; nombre: string; total: number; cuentas: number }[];
  resumenMeseros: { usuarioId: number | null; nombre: string; rol: string | null; total: number; cuentas: number }[];
  notas: string | null;
  fechaApertura: string;
  fechaCierre: string | null;
  abiertoPor: { id: number; name: string } | null;
  cerradoPor: { id: number; name: string } | null;
  personal: {
    id: number;
    usuarioId: number;
    rolTurno: RolTurno;
    usuario: { id: number; name: string; email: string; rolId: number; rol: string | null } | null;
  }[];
  movimientos: Movimiento[];
};

const th: React.CSSProperties = {
  textAlign: 'left',
  padding: '8px 10px',
  fontSize: 10,
  fontWeight: 800,
  color: 'var(--text-muted)',
  textTransform: 'uppercase',
  letterSpacing: '.04em',
  borderBottom: '1px solid var(--border)',
  whiteSpace: 'nowrap',
};
const td: React.CSSProperties = {
  padding: '7px 10px',
  fontSize: 11.5,
  borderBottom: '1px solid var(--border-light)',
  color: 'var(--text)',
};
const tdNum: React.CSSProperties = { ...td, textAlign: 'right', whiteSpace: 'nowrap', fontWeight: 600 };

export default function CierrePrintPage() {
  const params = useParams();
  const router = useRouter();
  const id = (params?.id as string) || '';
  const [turno, setTurno] = useState<Turno | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    (async () => {
      setLoading(true);
      setError(null);
      try {
        const res = await fetch(`/api/backend/turnos/${id}`, { headers: getAuthHeaders() });
        if (res.status === 401) {
          window.location.href = '/login';
          return;
        }
        if (res.status === 403) {
          setError('No tienes acceso a este reporte.');
          return;
        }
        if (!res.ok) {
          const t = await res.text();
          throw new Error(t || 'No se pudo cargar el turno');
        }
        const text = await res.text();
        if (active) setTurno(text ? JSON.parse(text) : null);
      } catch (e) {
        if (active) setError(e instanceof Error ? e.message : 'Error al cargar el reporte');
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => {
      active = false;
    };
  }, [id]);

  useEffect(() => {
    if (!turno) return;
    const previo = document.title;
    document.title = `Cierre-caja-turno-${turno.id}`;
    return () => {
      document.title = previo;
    };
  }, [turno]);

  return (
    <div className="report-preview report-wide">
      {/* Barra superior: solo título; la navegación queda en la barra inferior */}
      <div className="report-toolbar no-print">
        <div>
          <h1 className="report-toolbar-title">Reporte de cierre de caja</h1>
          <p className="report-toolbar-sub">Turno #{id || '—'} · Documento imprimible</p>
        </div>
      </div>

      <div className="report-card">
        {loading ? (
          <p style={{ textAlign: 'center', color: 'var(--text-muted)' }}>Cargando reporte…</p>
        ) : (
          <>
            {error && (
              <div className="caja-alert danger" style={{ marginBottom: 12 }}>
                {error}
              </div>
            )}

            {!error && turno && (
              <div className="print-section">
                <div className="report-header">
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10, marginBottom: 8 }}>
                    <span className="material-symbols-outlined" style={{ fontSize: 32, color: 'var(--primary)' }}>point_of_sale</span>
                    <h1 style={{ fontSize: 22, fontWeight: 900, margin: 0, color: 'var(--text)' }}>RestorApp</h1>
                  </div>
                  <h2 style={{ fontSize: 14, fontWeight: 800, margin: '0 0 4px', color: 'var(--text-secondary)', letterSpacing: '.08em' }}>
                    REPORTE DE CIERRE DE CAJA
                  </h2>
                  <p style={{ fontSize: 12, color: 'var(--text-muted)', margin: 0 }}>
                    Turno #{turno.id} · {turno.estado === 'abierto' ? 'ABIERTO (borrador)' : 'CERRADO'}
                  </p>
                </div>

                {/* Identificación */}
                <div className="report-block">
                  <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                    <tbody>
                      <tr>
                        <td style={{ ...td, fontWeight: 700, width: '16%' }}>Abrió</td>
                        <td style={td}>{turno.abiertoPor?.name ?? '—'}</td>
                        <td style={{ ...td, fontWeight: 700, width: '16%' }}>Cerró</td>
                        <td style={td}>{turno.cerradoPor?.name ?? '—'}</td>
                      </tr>
                      <tr>
                        <td style={{ ...td, fontWeight: 700 }}>Apertura</td>
                        <td style={td}>{fmtFecha(turno.fechaApertura)}</td>
                        <td style={{ ...td, fontWeight: 700 }}>Cierre</td>
                        <td style={td}>{turno.fechaCierre ? fmtFecha(turno.fechaCierre) : 'en curso'}</td>
                      </tr>
                    </tbody>
                  </table>
                  {turno.notas && (
                    <p style={{ marginTop: 6, fontSize: 11.5, color: 'var(--text-muted)', fontStyle: 'italic' }}>
                      Notas: {turno.notas}
                    </p>
                  )}
                </div>

                {/* Arqueo */}
                <div className="report-block">
                  <h3>1. Arqueo de efectivo</h3>
                  <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                    <tbody>
                      <tr><td style={td}>Monto inicial</td><td style={tdNum}>{money(turno.montoInicial)}</td></tr>
                      <tr><td style={td}>Ventas en efectivo</td><td style={tdNum}>{money(turno.ventasEfectivo)}</td></tr>
                      <tr><td style={td}>Entradas de efectivo</td><td style={{ ...tdNum, color: '#065F46' }}>{money(turno.totalEntradas)}</td></tr>
                      <tr><td style={td}>Salidas de efectivo</td><td style={{ ...tdNum, color: '#991B1B' }}>-{money(turno.totalSalidas)}</td></tr>
                      <tr>
                        <td style={{ ...td, fontWeight: 800, borderTop: '1.5px solid var(--border)' }}>Efectivo esperado</td>
                        <td style={{ ...tdNum, fontWeight: 800, borderTop: '1.5px solid var(--border)' }}>{money(turno.montoEsperado)}</td>
                      </tr>
                      <tr>
                        <td style={{ ...td, fontWeight: 800 }}>Efectivo contado</td>
                        <td style={{ ...tdNum, fontWeight: 800 }}>{money(turno.montoContado)}</td>
                      </tr>
                      <tr>
                        <td
                          style={{
                            ...td,
                            fontWeight: 800,
                            color: (turno.diferencia ?? 0) !== 0 ? 'var(--danger)' : 'var(--success)',
                          }}
                        >
                          Diferencia ({(turno.diferencia ?? 0) < 0 ? 'Faltante' : (turno.diferencia ?? 0) > 0 ? 'Sobrante' : 'Cuadra'})
                        </td>
                        <td
                          style={{
                            ...tdNum,
                            fontWeight: 800,
                            color: (turno.diferencia ?? 0) !== 0 ? 'var(--danger)' : 'var(--success)',
                          }}
                        >
                          {money(turno.diferencia)}
                        </td>
                      </tr>
                    </tbody>
                  </table>
                  {turno.motivoDiferencia && (
                    <p style={{ fontSize: 11, color: 'var(--warning)', marginTop: 4 }}>Motivo: {turno.motivoDiferencia}</p>
                  )}
                </div>

                {/* Ventas */}
                <div className="report-block">
                  <h3>2. Ventas del turno</h3>
                  <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                    <tbody>
                      <tr><td style={td}>Facturas cobradas</td><td style={tdNum}>{turno.cantidadFacturas}</td></tr>
                      <tr><td style={td}>Ventas totales</td><td style={tdNum}>{money(turno.totalVentas)}</td></tr>
                      <tr><td style={td}>IVA acumulado</td><td style={tdNum}>{money(turno.totalIva)}</td></tr>
                      <tr><td style={td}>Propina acumulada</td><td style={tdNum}>{money(turno.totalPropina)}</td></tr>
                    </tbody>
                  </table>
                </div>

                {/* Métodos de pago */}
                <div className="report-block">
                  <h3>3. Ventas por método de pago</h3>
                  {turno.resumenPagos.length === 0 ? (
                    <p style={{ fontSize: 11, color: 'var(--text-muted)' }}>Sin cobros en este turno.</p>
                  ) : (
                    <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                      <thead>
                        <tr>
                          <th style={th}>Método</th>
                          <th style={{ ...th, textAlign: 'right' }}>Cuentas</th>
                          <th style={{ ...th, textAlign: 'right' }}>Total</th>
                        </tr>
                      </thead>
                      <tbody>
                        {turno.resumenPagos.map((p, i) => (
                          <tr key={i}>
                            <td style={td}>{p.nombre}</td>
                            <td style={tdNum}>{p.cuentas}</td>
                            <td style={tdNum}>{money(p.total)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  )}
                </div>

                {/* Meseros */}
                <div className="report-block">
                  <h3>4. Ventas por mesero</h3>
                  {turno.resumenMeseros.length === 0 ? (
                    <p style={{ fontSize: 11, color: 'var(--text-muted)' }}>Sin cobros por mesero.</p>
                  ) : (
                    <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                      <thead>
                        <tr>
                          <th style={th}>Mesero</th>
                          <th style={th}>Rol</th>
                          <th style={{ ...th, textAlign: 'right' }}>Cuentas</th>
                          <th style={{ ...th, textAlign: 'right' }}>Total</th>
                        </tr>
                      </thead>
                      <tbody>
                        {turno.resumenMeseros.map((m, i) => (
                          <tr key={i}>
                            <td style={td}>{m.nombre}</td>
                            <td style={{ ...td, color: 'var(--text-muted)' }}>{m.rol ?? '—'}</td>
                            <td style={tdNum}>{m.cuentas}</td>
                            <td style={tdNum}>{money(m.total)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  )}
                </div>

                {/* Movimientos */}
                <div className="report-block">
                  <h3>5. Movimientos de efectivo</h3>
                  {turno.movimientos.length === 0 ? (
                    <p style={{ fontSize: 11, color: 'var(--text-muted)' }}>Sin movimientos registrados en este turno.</p>
                  ) : (
                    <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                      <thead>
                        <tr>
                          <th style={th}>Fecha</th>
                          <th style={th}>Tipo</th>
                          <th style={th}>Motivo</th>
                          <th style={{ ...th, textAlign: 'right' }}>Monto</th>
                          <th style={th}>Usuario</th>
                        </tr>
                      </thead>
                      <tbody>
                        {turno.movimientos.map((m) => (
                          <tr key={m.id}>
                            <td style={{ ...td, whiteSpace: 'nowrap' }}>{fmtFecha(m.fecha)}</td>
                            <td style={td}>{m.tipo === 'entrada' ? 'Entrada' : 'Salida'}{m.reversoDeId ? ' (rev.)' : ''}</td>
                            <td style={td}>{m.motivo}</td>
                            <td style={tdNum}>{money(m.monto)}</td>
                            <td style={td}>{m.usuario?.name ?? '—'}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  )}
                </div>

                {/* Personal */}
                <div className="report-block">
                  <h3>6. Personal del turno</h3>
                  {turno.personal.length === 0 ? (
                    <p style={{ fontSize: 11, color: 'var(--text-muted)' }}>Sin personal asignado.</p>
                  ) : (
                    <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                      <thead>
                        <tr>
                          <th style={th}>Usuario</th>
                          <th style={th}>Rol de turno</th>
                        </tr>
                      </thead>
                      <tbody>
                        {turno.personal.map((p) => (
                          <tr key={p.id}>
                            <td style={td}>
                              {p.usuario?.name ?? `#${p.usuarioId}`}
                              {p.usuario?.email ? (
                                <span style={{ color: 'var(--text-muted)', fontSize: 10 }}> · {p.usuario.email}</span>
                              ) : null}
                            </td>
                            <td style={td}>{p.rolTurno}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  )}
                </div>

                {/* Firmas */}
                <div className="report-block" style={{ marginTop: 26, paddingTop: 18, borderTop: '1px solid var(--border)' }}>
                  <h3>Firmas</h3>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16 }}>
                    {['Cajero/a del turno', 'Administrador que cierra', 'Testigo / revisor'].map((lbl) => (
                      <div key={lbl} style={{ textAlign: 'center' }}>
                        <div style={{ height: 40, borderBottom: '1px solid var(--text)', marginBottom: 6 }} />
                        <p style={{ fontSize: 10, color: 'var(--text-muted)', margin: 0 }}>{lbl}</p>
                        <p style={{ fontSize: 10, color: 'var(--text-muted)', margin: '2px 0' }}>Nombre y firma</p>
                      </div>
                    ))}
                  </div>
                </div>

                <p style={{ marginTop: 20, textAlign: 'center', fontSize: 10, color: 'var(--text-muted)' }}>
                  Generado automáticamente por RestorApp · Turno #{turno.id} ·{' '}
                  {new Date().toLocaleString('es-CO', { timeZone: 'America/Bogota' })}
                </p>
              </div>
            )}
          </>
        )}
      </div>

      {/* Barra inferior de acciones, con botones claros y etiquetados */}
      <div className="pdf-bar no-print">
        <div className="pdf-bar-inner" style={{ maxWidth: 880 }}>
          <button className="btn-primary" onClick={() => window.print()} disabled={!turno || !!error}>
            <span className="material-symbols-outlined" style={{ fontVariationSettings: "'FILL' 1" }}>print</span>
            Imprimir / Guardar PDF
          </button>
          <button
            className="btn-outline"
            onClick={() => router.push('/dashboard/caja')}
            title="Volver a caja"
            style={{ width: 'auto', padding: '12px 18px', flexShrink: 0 }}
          >
            <span className="material-symbols-outlined">arrow_back</span>
            Volver a caja
          </button>
        </div>
      </div>
    </div>
  );
}
