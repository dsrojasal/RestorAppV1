'use client';

import { useEffect, useMemo, useState } from 'react';
import MoneyInput from '@/components/MoneyInput';
import { formatMonto, montoParaInput, parseMonto } from '@/lib/montos';

export interface TipoPagoOpcion {
  id: number;
  nombre: string;
}

export interface PagoLineaPayload {
  tipoPagoId: number;
  monto: number;
}

export interface CobroPayload {
  pagos: PagoLineaPayload[];
  ivaPorcentaje: number;
  propinaPorcentaje?: number;
  propinaMonto?: number;
  overrideSinCaja?: boolean;
  motivoSinTurno?: string;
}

interface CobroFormProps {
  subtotal: number;
  tipoPagos: TipoPagoOpcion[];
  cajaAbierta: boolean | null;
  esAdmin: boolean;
  busy: boolean;
  submitLabel?: string;
  onCancel: () => void;
  onSubmit: (payload: CobroPayload) => Promise<void> | void;
}

interface FilaPago {
  tipoPagoId: number | null;
  monto: string;
}

const round2 = (n: number) => Math.round((n + Number.EPSILON) * 100) / 100;

function num(valor: string): number {
  // Acepta 10.000, 10000 y 10.000,50 sin confundir miles con decimales.
  return parseMonto(valor) ?? 0;
}

const money = (n: number) =>
  '$' + Number(n).toLocaleString('es-CO', { minimumFractionDigits: 0, maximumFractionDigits: 2 });

const BILLETES = [20000, 50000, 100000];

/**
 * Calculadora visual de efectivo recibido y vuelto.
 * No guarda nada: solo ayuda al cajero a confirmar cuánto devolver.
 */
function PanelEfectivo({
  monto,
  recibido,
  setRecibido,
}: {
  monto: number;
  recibido: string;
  setRecibido: (v: string) => void;
}) {
  const recibidoNum = parseMonto(recibido);
  const vacio = recibido.trim() === '';
  const invalido = !vacio && recibidoNum == null;
  const vuelto = recibidoNum != null ? round2(recibidoNum - monto) : null;
  const falta = vuelto != null && vuelto < -0.004;
  const presets = BILLETES.filter((v) => v >= monto);

  return (
    <div className="cobro-recibido">
      <div className="cobro-recibido-head">
        <label>Efectivo recibido</label>
        <div className="cobro-presets">
          <button
            type="button"
            className="cobro-chip small"
            onClick={() => setRecibido(montoParaInput(monto))}
          >
            Exacto
          </button>
          {presets.map((v) => (
            <button
              key={v}
              type="button"
              className="cobro-chip small"
              onClick={() => setRecibido(montoParaInput(v))}
            >
              {money(v)}
            </button>
          ))}
        </div>
      </div>
      <MoneyInput
        value={recibido}
        onChange={setRecibido}
        placeholder="¿Con cuánto paga?"
        showHint={false}
        ariaLabel="Efectivo recibido"
      />
      {invalido ? (
        <div className="cobro-vuelto falta">
          <span>Monto no válido. Escribe por ejemplo 50.000 o 50000.</span>
        </div>
      ) : !vacio && vuelto != null ? (
        <div className={`cobro-vuelto ${falta ? 'falta' : ''}`}>
          <span>{falta ? 'Falta' : 'Vuelto'}</span>
          <b>{money(Math.abs(vuelto))}</b>
        </div>
      ) : null}
    </div>
  );
}

export default function CobroForm({
  subtotal,
  tipoPagos,
  cajaAbierta,
  esAdmin,
  busy,
  submitLabel = 'Confirmar cobro',
  onCancel,
  onSubmit,
}: CobroFormProps) {
  const base = round2(Number(subtotal) || 0);

  const [ivaActivo, setIvaActivo] = useState(false);
  const [ivaPct, setIvaPct] = useState('19');

  const [propinaActivo, setPropinaActivo] = useState(false);
  const [propinaModo, setPropinaModo] = useState<'porcentaje' | 'monto'>('porcentaje');
  const [propinaPct, setPropinaPct] = useState('10');
  const [propinaMonto, setPropinaMonto] = useState('');

  const [mixto, setMixto] = useState(false);
  const [single, setSingle] = useState<number | null>(null);
  const [filas, setFilas] = useState<FilaPago[]>([{ tipoPagoId: null, monto: '' }]);
  const [recibidoSingle, setRecibidoSingle] = useState('');
  const [recibidoMixto, setRecibidoMixto] = useState('');

  const [override, setOverride] = useState(false);
  const [motivo, setMotivo] = useState('');
  const [error, setError] = useState<string | null>(null);

  const iva = ivaActivo ? round2((base * num(ivaPct)) / 100) : 0;
  const propina = propinaActivo
    ? propinaModo === 'monto'
      ? round2(num(propinaMonto))
      : round2((base * num(propinaPct)) / 100)
    : 0;
  const total = round2(base + iva + propina);

  // El efectivo recibido es solo una ayuda visual: no se guarda ni afecta la caja.
  const esEfectivo = (id: number | null) =>
    id != null &&
    (tipoPagos.find((tp) => tp.id === id)?.nombre ?? '').toLowerCase().includes('efectivo');

  const efectivoSingle = !mixto && esEfectivo(single);
  const sumaEfectivo = round2(
    filas.filter((f) => esEfectivo(f.tipoPagoId)).reduce((acc, f) => acc + num(f.monto), 0),
  );

  useEffect(() => {
    if (!single && tipoPagos.length > 0) setSingle(tipoPagos[0].id);
  }, [tipoPagos, single]);

  const sumaFilas = useMemo(
    () => round2(filas.reduce((acc, f) => acc + num(f.monto), 0)),
    [filas],
  );
  const restante = round2(total - sumaFilas);

  const cajaBloqueada = cajaAbierta === false;
  const overrideListo = !cajaBloqueada || (esAdmin && override && motivo.trim().length >= 10);

  const metodosListos = mixto
    ? filas.length > 0 &&
      filas.every((f) => f.tipoPagoId != null && num(f.monto) > 0) &&
      Math.abs(restante) < 0.01
    : single != null;

  // Si la propina es por monto fijo, el texto debe ser un monto válido.
  const propinaValida =
    !propinaActivo || propinaModo === 'porcentaje' || propinaMonto.trim() === '' || parseMonto(propinaMonto) != null;

  // Si escribieron "efectivo recibido", debe alcanzar para cubrir el monto en efectivo.
  const recibidoSingleNum = parseMonto(recibidoSingle);
  const recibidoSingleValido =
    recibidoSingle.trim() === '' || (recibidoSingleNum != null && recibidoSingleNum >= total - 0.004);
  const recibidoMixtoNum = parseMonto(recibidoMixto);
  const recibidoMixtoValido =
    sumaEfectivo <= 0 ||
    recibidoMixto.trim() === '' ||
    (recibidoMixtoNum != null && recibidoMixtoNum >= sumaEfectivo - 0.004);
  const recibidoValido = mixto
    ? recibidoMixtoValido
    : !efectivoSingle || recibidoSingleValido;

  const puedeEnviar = !busy && metodosListos && overrideListo && propinaValida && recibidoValido;

  function elegirMetodo(id: number) {
    if (id !== single) setRecibidoSingle('');
    setSingle(id);
  }

  function activarMixto() {
    const siguiente = !mixto;
    setMixto(siguiente);
    setRecibidoMixto('');
    if (siguiente) {
      setFilas([
        {
          tipoPagoId: single ?? tipoPagos[0]?.id ?? null,
          monto: total > 0 ? montoParaInput(total) : '',
        },
      ]);
    }
  }

  function actualizarFila(index: number, cambios: Partial<FilaPago>) {
    setFilas((prev) => prev.map((f, i) => (i === index ? { ...f, ...cambios } : f)));
  }

  function agregarFila() {
    setFilas((prev) => [
      ...prev,
      {
        tipoPagoId: tipoPagos[0]?.id ?? null,
        monto: restante > 0 ? montoParaInput(restante) : '',
      },
    ]);
  }

  function quitarFila(index: number) {
    setFilas((prev) => (prev.length === 1 ? prev : prev.filter((_, i) => i !== index)));
  }

  async function enviar() {
    setError(null);
    if (!overrideListo) {
      setError('Debes registrar el motivo de la autorización (mínimo 10 caracteres).');
      return;
    }

    let pagos: PagoLineaPayload[];
    if (mixto) {
      if (Math.abs(restante) >= 0.01) {
        setError('Los pagos deben sumar exactamente el total de la cuenta.');
        return;
      }
      pagos = filas.map((f) => ({ tipoPagoId: f.tipoPagoId!, monto: round2(num(f.monto)) }));
    } else {
      if (single == null) {
        setError('Selecciona un método de pago.');
        return;
      }
      pagos = [{ tipoPagoId: single, monto: total }];
    }

    const payload: CobroPayload = {
      pagos,
      ivaPorcentaje: ivaActivo ? num(ivaPct) : 0,
      propinaPorcentaje: propinaActivo && propinaModo === 'porcentaje' ? num(propinaPct) : 0,
      ...(propinaActivo && propinaModo === 'monto' ? { propinaMonto: round2(num(propinaMonto)) } : {}),
      ...(cajaBloqueada && esAdmin && override
        ? { overrideSinCaja: true, motivoSinTurno: motivo.trim() }
        : {}),
    };

    try {
      await onSubmit(payload);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'No se pudo completar el cobro');
    }
  }

  return (
    <div>
      {cajaAbierta === false && (
        <div
          style={{
            background: 'var(--warning-bg)',
            color: 'var(--warning)',
            border: '1px solid rgba(180, 83, 9, 0.25)',
            borderRadius: 'var(--radius)',
            padding: '12px 14px',
            marginBottom: 16,
          }}
        >
          <div style={{ display: 'flex', gap: 8, alignItems: 'flex-start' }}>
            <span className="material-symbols-outlined" style={{ fontSize: 20 }}>lock</span>
            <div>
              <p style={{ fontSize: 13, fontWeight: 700, margin: 0 }}>No hay caja abierta</p>
              <p style={{ fontSize: 12, margin: '4px 0 0', lineHeight: 1.4 }}>
                Pídele al administrador que abra el turno para poder cobrar.
              </p>
            </div>
          </div>

          {esAdmin && (
            <div style={{ marginTop: 12, borderTop: '1px solid rgba(180, 83, 9, 0.2)', paddingTop: 10 }}>
              <label style={{ display: 'flex', gap: 8, alignItems: 'center', fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>
                <input type="checkbox" checked={override} onChange={(e) => setOverride(e.target.checked)} />
                Autorizar cobro sin caja (queda marcado para revisión)
              </label>
              {override && (
                <textarea
                  value={motivo}
                  onChange={(e) => setMotivo(e.target.value)}
                  maxLength={300}
                  rows={2}
                  placeholder="Motivo de la autorización (mínimo 10 caracteres)"
                  style={{
                    width: '100%',
                    marginTop: 8,
                    padding: '10px 12px',
                    borderRadius: 'var(--radius)',
                    border: '1.5px solid rgba(180, 83, 9, 0.35)',
                    background: 'var(--bg-card)',
                    color: 'var(--text)',
                    fontSize: 13,
                    resize: 'vertical',
                  }}
                />
              )}
            </div>
          )}
        </div>
      )}

      {cajaAbierta === true && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 14, fontSize: 12, color: 'var(--success)', fontWeight: 600 }}>
          <span className="status-dot online" />
          Caja abierta
        </div>
      )}

      <div style={{ background: 'var(--bg)', borderRadius: 'var(--radius)', padding: 14, marginBottom: 16 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, marginBottom: 6 }}>
          <span style={{ color: 'var(--text-secondary)' }}>Subtotal</span>
          <b>{money(base)}</b>
        </div>
        {ivaActivo && (
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, marginBottom: 6 }}>
            <span style={{ color: 'var(--text-secondary)' }}>IVA ({num(ivaPct)}%)</span>
            <b>{money(iva)}</b>
          </div>
        )}
        {propinaActivo && (
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, marginBottom: 6 }}>
            <span style={{ color: 'var(--text-secondary)' }}>
              Propina {propinaModo === 'porcentaje' ? `(${num(propinaPct)}%)` : ''}
            </span>
            <b>{money(propina)}</b>
          </div>
        )}
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            fontSize: 16,
            paddingTop: 8,
            borderTop: '1px solid var(--border)',
          }}
        >
          <span style={{ fontWeight: 800 }}>Total a cobrar</span>
          <b style={{ color: 'var(--primary-dark)' }}>{money(total)}</b>
        </div>
      </div>

      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center', marginBottom: 16 }}>
        <button
          type="button"
          className={`cobro-chip ${ivaActivo ? 'active' : ''}`}
          onClick={() => setIvaActivo((v) => !v)}
        >
          <span className="material-symbols-outlined" style={{ fontSize: 16 }}>percent</span>
          {ivaActivo ? 'IVA activo' : 'Agregar IVA'}
        </button>
        {ivaActivo && (
          <label className="cobro-inline-field">
            <span>%</span>
            <input
              type="number"
              min={0}
              max={100}
              step="0.01"
              value={ivaPct}
              onChange={(e) => setIvaPct(e.target.value)}
            />
          </label>
        )}

        <button
          type="button"
          className={`cobro-chip ${propinaActivo ? 'active' : ''}`}
          onClick={() => setPropinaActivo((v) => !v)}
        >
          <span className="material-symbols-outlined" style={{ fontSize: 16 }}>volunteer_activism</span>
          {propinaActivo ? 'Propina activa' : 'Agregar propina'}
        </button>
        {propinaActivo && (
          <>
            <div style={{ display: 'flex', gap: 4 }}>
              {[5, 10, 15].map((p) => (
                <button
                  key={p}
                  type="button"
                  className={`cobro-chip small ${propinaModo === 'porcentaje' && num(propinaPct) === p ? 'active' : ''}`}
                  onClick={() => {
                    setPropinaModo('porcentaje');
                    setPropinaPct(String(p));
                  }}
                >
                  {p}%
                </button>
              ))}
            </div>
            <label className="cobro-inline-field sm">
              <span>{propinaModo === 'porcentaje' ? '%' : '$'}</span>
              <input
                type={propinaModo === 'porcentaje' ? 'number' : 'text'}
                inputMode="decimal"
                min={0}
                step="0.01"
                title="Puedes escribir 10.000 o 10000; el sistema normaliza el monto."
                value={propinaModo === 'porcentaje' ? propinaPct : propinaMonto}
                onChange={(e) =>
                  propinaModo === 'porcentaje' ? setPropinaPct(e.target.value) : setPropinaMonto(e.target.value)
                }
              />
            </label>
            <button
              type="button"
              className={`cobro-chip small ${propinaModo === 'monto' ? 'active' : ''}`}
              onClick={() => setPropinaModo((m) => (m === 'porcentaje' ? 'monto' : 'porcentaje'))}
            >
              {propinaModo === 'monto' ? 'Monto fijo' : 'Usar monto fijo'}
            </button>
            {propinaModo === 'monto' && propinaMonto.trim() !== '' && (
              <p className="caja-money-hint" style={{ flexBasis: '100%', margin: 0 }}>
                {parseMonto(propinaMonto) == null ? (
                  'Monto no válido. Escribe solo números (puedes usar punto de miles o coma decimal).'
                ) : (
                  <>Se registrará: <b>{formatMonto(parseMonto(propinaMonto) as number)}</b></>
                )}
              </p>
            )}
          </>
        )}
      </div>

      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, marginBottom: 8 }}>
        <label style={{ fontSize: 13, fontWeight: 700, color: 'var(--text)' }}>Forma de pago</label>
        <button
          type="button"
          className={`cobro-chip small ${mixto ? 'active' : ''}`}
          onClick={activarMixto}
        >
          {mixto ? 'Pago mixto activo' : 'Pago mixto'}
        </button>
      </div>

      {!mixto ? (
        <>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 16 }}>
            {tipoPagos.map((tp) => (
              <button
                key={tp.id}
                type="button"
                onClick={() => elegirMetodo(tp.id)}
                style={{
                  padding: '10px 16px',
                  border: `1.5px solid ${single === tp.id ? 'var(--primary)' : 'var(--border)'}`,
                  borderRadius: 'var(--radius)',
                  background: single === tp.id ? 'rgba(46,204,113,0.1)' : 'var(--bg-card)',
                  cursor: 'pointer',
                  fontWeight: 600,
                  fontSize: 13,
                  color: 'var(--text)',
                  transition: 'all var(--transition)',
                }}
              >
                {tp.nombre}
              </button>
            ))}
          </div>
          {efectivoSingle && (
            <PanelEfectivo
              monto={total}
              recibido={recibidoSingle}
              setRecibido={setRecibidoSingle}
            />
          )}
        </>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 12 }}>
          {filas.map((fila, index) => (
            <div key={index} style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
              <select
                value={fila.tipoPagoId ?? ''}
                onChange={(e) => actualizarFila(index, { tipoPagoId: e.target.value ? Number(e.target.value) : null })}
                style={{
                  flex: '1 1 140px',
                  padding: '10px 12px',
                  background: 'var(--bg)',
                  border: '1.5px solid var(--border)',
                  borderRadius: 'var(--radius)',
                  color: 'var(--text)',
                  fontSize: 13,
                }}
              >
                <option value="">Método</option>
                {tipoPagos.map((tp) => (
                  <option key={tp.id} value={tp.id}>{tp.nombre}</option>
                ))}
              </select>
              <div style={{ width: 150, flex: '0 0 150px' }}>
                <MoneyInput
                  compact
                  value={fila.monto}
                  onChange={(v) => actualizarFila(index, { monto: v })}
                  placeholder="Monto"
                />
              </div>
              <button
                type="button"
                onClick={() => quitarFila(index)}
                disabled={filas.length === 1}
                style={{
                  width: 36,
                  height: 36,
                  borderRadius: '50%',
                  background: 'var(--danger-bg)',
                  color: 'var(--danger)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  opacity: filas.length === 1 ? 0.4 : 1,
                }}
                aria-label="Quitar pago"
              >
                <span className="material-symbols-outlined" style={{ fontSize: 18 }}>close</span>
              </button>
            </div>
          ))}

          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8, flexWrap: 'wrap' }}>
            <button type="button" className="cobro-chip small" onClick={agregarFila}>
              <span className="material-symbols-outlined" style={{ fontSize: 16 }}>add</span>
              Agregar pago
            </button>
            <span
              style={{
                fontSize: 12,
                fontWeight: 700,
                color: Math.abs(restante) < 0.01 ? 'var(--success)' : 'var(--danger)',
              }}
            >
              {Math.abs(restante) < 0.01
                ? 'Pagos completos'
                : restante > 0
                  ? `Falta ${money(restante)}`
                  : `Sobra ${money(Math.abs(restante))}`}
            </span>
          </div>

          {sumaEfectivo > 0 && (
            <PanelEfectivo
              monto={sumaEfectivo}
              recibido={recibidoMixto}
              setRecibido={setRecibidoMixto}
            />
          )}
        </div>
      )}

      {error && (
        <p style={{ fontSize: 12, color: 'var(--danger)', fontWeight: 600, marginBottom: 12 }}>{error}</p>
      )}

      <div className="modal-actions">
        <button className="btn-cancel" type="button" onClick={onCancel} disabled={busy}>
          Cancelar
        </button>
        <button className="btn-primary" type="button" onClick={enviar} disabled={!puedeEnviar}>
          {busy ? 'Procesando...' : submitLabel}
        </button>
      </div>

      <style>{`
        .cobro-chip {
          display: inline-flex; align-items: center; gap: 6px;
          padding: 8px 12px; border-radius: 50px; font-size: 12px; font-weight: 700;
          border: 1px solid var(--border); background: var(--bg-card); color: var(--text-secondary);
          cursor: pointer; transition: all var(--transition); white-space: nowrap;
        }
        .cobro-chip:hover { border-color: var(--primary); color: var(--primary); }
        .cobro-chip.active { background: var(--primary); border-color: var(--primary); color: #fff; }
        .cobro-chip.small { padding: 6px 10px; font-size: 11px; }
        .cobro-inline-field {
          display: inline-flex; align-items: center; gap: 6px; box-sizing: border-box;
          height: 36px; padding: 0 12px;
          border: 1px solid var(--border); border-radius: 50px;
          background: var(--bg-card); font-size: 12px; font-weight: 700; color: var(--text-secondary);
        }
        .cobro-inline-field.sm { height: 31px; padding: 0 10px; }
        .cobro-inline-field input {
          width: 54px; min-width: 0; height: 20px; padding: 0; line-height: 20px;
          border: 0; background: transparent; color: var(--text);
          font-size: 13px; font-weight: 700; outline: none;
        }
        .cobro-recibido {
          background: var(--bg); border: 1px solid var(--border);
          border-radius: var(--radius); padding: 12px 14px; margin-bottom: 16px;
        }
        .cobro-recibido-head {
          display: flex; align-items: center; justify-content: space-between;
          gap: 8px; flex-wrap: wrap; margin-bottom: 8px;
        }
        .cobro-recibido-head > label {
          font-size: 12px; font-weight: 700; color: var(--text-secondary);
        }
        .cobro-presets { display: flex; gap: 6px; flex-wrap: wrap; }
        .cobro-recibido .caja-money-field { background: var(--bg-card); }
        .cobro-recibido .caja-money-field input { font-size: 18px; }
        .cobro-vuelto {
          display: flex; align-items: center; justify-content: space-between; gap: 8px;
          margin-top: 8px; padding: 10px 12px; border-radius: var(--radius);
          background: var(--primary-bg); color: var(--primary-dark);
          font-size: 13px; font-weight: 700;
        }
        .cobro-vuelto b { font-size: 18px; font-weight: 800; }
        .cobro-vuelto.falta { background: var(--danger-bg); color: var(--danger); }
        .cobro-vuelto.falta b { color: var(--danger); }
      `}</style>
    </div>
  );
}
