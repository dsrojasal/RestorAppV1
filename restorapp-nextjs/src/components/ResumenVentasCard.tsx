'use client';

import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';

export interface VentasResumenDia {
  hoy: number;
  ayer: number;
  variacionPorcentaje: number | null;
  porHora: number[];
  porHoraAyer: number[];
  cuentasPorHoraHoy: number[];
  horaActual: number;
  minutoActual: number;
  diaEnCurso: boolean;
  ayerCerro: number;
  ventasAyerHastaMismaHora: number;
  proyeccionHoy: number | null;
  cuentasHoy: number;
  cuentasAyerHastaMismaHora: number;
  ticketPromedioHoy: number | null;
  ticketPromedioAyerHastaMismaHora: number | null;
}

const HORAS = Array.from({ length: 24 }, (_, i) => i);

function fmtPesos(n: number): string {
  return `$${Number(n || 0).toLocaleString('es-CO', { maximumFractionDigits: 0 })}`;
}

function fmtPct(n: number): string {
  return `${Math.abs(n).toLocaleString('es-CO', { maximumFractionDigits: 1 })}%`;
}

function fmtPctSigno(n: number): string {
  return `${n >= 0 ? '+' : '−'}${fmtPct(n)}`;
}

function fmtPesosSigno(n: number): string {
  return `${n >= 0 ? '+' : '−'}${fmtPesos(Math.abs(n))}`;
}

function fmtHora(h: number): string {
  return `${h % 12 || 12} ${h < 12 ? 'am' : 'pm'}`;
}

function fmtHoraCorta(h: number): string {
  return `${h % 12 || 12}${h < 12 ? 'a' : 'p'}`;
}

function variacion(actual: number, referencia: number): number | null {
  if (!referencia) return null;
  return ((actual - referencia) / referencia) * 100;
}

export default function ResumenVentasCard({ ventas, mesasOcupadas }: { ventas: VentasResumenDia; mesasOcupadas: number }) {
  const [hover, setHover] = useState<number | null>(null);
  const barrasRef = useRef<HTMLDivElement>(null);
  const [ancho, setAncho] = useState(0);
  const [alto, setAlto] = useState(130);

  const hoy = ventas.porHora ?? [];
  const ayer = ventas.porHoraAyer ?? [];
  const cuentasPorHora = ventas.cuentasPorHoraHoy ?? [];
  const horaActual = ventas.horaActual ?? 0;

  const totalHoy = ventas.hoy ?? 0;
  const ayerHastaAhora = ventas.ventasAyerHastaMismaHora ?? 0;

  const maxValor = Math.max(1, ...hoy, ...ayer) * 1.12;
  const pico = hoy.indexOf(Math.max(...hoy));

  const usarMedida = useCallback(() => {
    const el = barrasRef.current;
    if (!el) return;
    setAncho(el.clientWidth);
    setAlto(el.clientHeight);
  }, []);

  useLayoutEffect(usarMedida, [usarMedida]);

useEffect(() => {
    window.addEventListener('resize', usarMedida);
    return () => window.removeEventListener('resize', usarMedida);
  }, [usarMedida]);

  const deltaPct = variacion(totalHoy, ayerHastaAhora);
  const deltaPesos = totalHoy - ayerHastaAhora;
  const ticketsVar = variacion(ventas.ticketPromedioHoy ?? 0, ventas.ticketPromedioAyerHastaMismaHora ?? 0);
  const cuentasVar = variacion(ventas.cuentasHoy ?? 0, ventas.cuentasAyerHastaMismaHora ?? 0);
  const hoverVar = hover === null ? null : variacion(hoy[hover] ?? 0, ayer[hover] ?? 0);

  const puntosAyer = (() => {
    if (!ancho || !ayer.length) return '';
    const paso = ancho / 24;
    return ayer
      .map((v, i) => `${(paso * i + paso / 2).toFixed(2)},${(alto - (v / maxValor) * alto).toFixed(2)}`)
      .join(' ');
  })();

  return (
    <div className="card-data animate-in animate-in-delay-2 rd-card">
      <div className="rd-top">
        <span>Ventas del día</span>
        <span className="rd-live">
          <i />
          {ventas.diaEnCurso ? 'En curso' : 'Cerrado'} · {String(horaActual).padStart(2, '0')}:{String(ventas.minutoActual ?? 0).padStart(2, '0')}
        </span>
      </div>

      <div className="rd-big">{fmtPesos(totalHoy)}</div>

      <div className={`rd-delta ${deltaPct === null ? 'is-flat' : deltaPct >= 0 ? 'is-up' : 'is-down'}`}>
        {deltaPct === null ? (
          <>
            <span className="material-symbols-outlined">trending_flat</span>
            <span>Sin datos de ayer</span>
          </>
        ) : (
          <>
            <span className="material-symbols-outlined">{deltaPct >= 0 ? 'trending_up' : 'trending_down'}</span>
            <b>{fmtPctSigno(deltaPct)}</b>
            <span className="rd-delta-sub">
              vs ayer a esta hora ({fmtPesos(ayerHastaAhora)}) · {fmtPesosSigno(deltaPesos)}
            </span>
          </>
        )}
      </div>

      <div className="rd-sub">
        Ayer cerró en <b>{fmtPesos(ventas.ayerCerro ?? 0)}</b>
        {ventas.proyeccionHoy !== null && ventas.proyeccionHoy > 0 && (
          <>
            {' · '}Proyección de hoy: <b>~{fmtPesos(ventas.proyeccionHoy)}</b>
          </>
        )}
      </div>

      <div className="rd-chart">
        <div className="rd-bars" ref={barrasRef}>
          {HORAS.map((h) => {
            const valor = hoy[h] ?? 0;
            const futuro = h > horaActual;
            const altura = (valor / maxValor) * 100;
            return (
              <div
                key={h}
                tabIndex={0}
                className={`rd-col${h === horaActual ? ' is-now' : futuro ? ' is-future' : ' is-past'}${hover === h ? ' is-hover' : ''}`}
                onMouseEnter={() => setHover(h)}
                onMouseLeave={() => setHover(null)}
                onFocus={() => setHover(h)}
                onBlur={() => setHover(null)}
                aria-label={`${fmtHora(h)}: ${fmtPesos(valor)}`}
              >
                <div className="rd-bar" style={{ height: futuro ? undefined : `${Math.max(altura, valor > 0 ? 2 : 0)}%` }} />
                {!futuro && h === pico && valor > 0 && <span className="rd-peak">{fmtPesos(valor)}</span>}
              </div>
            );
          })}
        </div>

        {puntosAyer && (
          <svg className="rd-overlay" viewBox={`0 0 ${ancho} ${alto}`} preserveAspectRatio="none" aria-hidden="true">
            <polyline
              points={puntosAyer}
              fill="none"
              stroke="var(--text-secondary)"
              strokeWidth={2}
              strokeDasharray="4 4"
              strokeLinejoin="round"
              vectorEffect="non-scaling-stroke"
            />
          </svg>
        )}

        <div className="rd-axis">
          {HORAS.map((h) => (
            <span key={h}>{h % 4 === 0 ? fmtHoraCorta(h) : ''}</span>
          ))}
        </div>
      </div>

      <div className="rd-legend">
        <span>
          <i style={{ background: 'var(--primary-light)' }} />
          Horas pasadas
        </span>
        <span>
          <i style={{ background: 'var(--danger)' }} />
          Hora actual
        </span>
        <span>
          <i className="rd-legend-line" />
          Ayer
        </span>
      </div>

      <div className="rd-kpis">
        <div className="rd-kpi">
          <small>Cuentas</small>
          <b>{ventas.cuentasHoy ?? 0}</b>
          {cuentasVar !== null && <em className={cuentasVar >= 0 ? 'is-up' : 'is-down'}>{fmtPctSigno(cuentasVar)}</em>}
        </div>
        <div className="rd-kpi">
          <small>Ticket promedio</small>
          <b>{ventas.ticketPromedioHoy !== null ? fmtPesos(ventas.ticketPromedioHoy) : '—'}</b>
          {ticketsVar !== null && <em className={ticketsVar >= 0 ? 'is-up' : 'is-down'}>{fmtPctSigno(ticketsVar)}</em>}
        </div>
        <div className="rd-kpi">
          <small>Mesas abiertas</small>
          <b>{mesasOcupadas}</b>
        </div>
      </div>

      {hover !== null && (
        <div className="rd-tip" role="tooltip">
          <h4>
            {fmtHora(hover)} – {fmtHora(hover + 1)}
            {hover === horaActual ? ' (en curso)' : ''}
          </h4>
          {hover > horaActual ? (
            <>
              <div className="rd-tip-row">
                <span>Ayer, misma hora</span>
                <span>{fmtPesos(ayer[hover] ?? 0)}</span>
              </div>
              <hr />
              <div className="rd-tip-row">
                <span>Aún no ocurre</span>
                <span />
              </div>
            </>
          ) : (
            <>
              <div className="rd-tip-row">
                <span>Ventas</span>
                <b>{fmtPesos(hoy[hover] ?? 0)}</b>
              </div>
              <div className="rd-tip-row">
                <span>Ayer, misma hora</span>
                <span>
                  {fmtPesos(ayer[hover] ?? 0)} {hoverVar !== null && <em className={hoverVar >= 0 ? 'is-up' : 'is-down'}>{fmtPctSigno(hoverVar)}</em>}
                </span>
              </div>
              <hr />
              <div className="rd-tip-row">
                <span>Cuentas cerradas</span>
                <span>{cuentasPorHora[hover] ?? 0}</span>
              </div>
              <div className="rd-tip-row">
                <span>Ticket promedio</span>
                <span>
                  {fmtPesos((cuentasPorHora[hover] ?? 0) > 0 ? Math.round((hoy[hover] ?? 0) / (cuentasPorHora[hover] ?? 1) / 100) * 100 : 0)}
                </span>
              </div>
              <div className="rd-tip-row">
                <span>% del día</span>
                <span>{totalHoy > 0 ? `${Math.round(((hoy[hover] ?? 0) / totalHoy) * 100)}%` : '0%'}</span>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}