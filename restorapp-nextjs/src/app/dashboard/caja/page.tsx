'use client';

import { Fragment, useCallback, useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import ModalSheet from '@/components/ModalSheet';
import MoneyInput from '@/components/MoneyInput';
import { getAuthHeaders } from '@/lib/api';
import { fmtDia, fmtFecha, hoyIso, primerDiaMesIso } from '@/lib/reportes';
import { formatMonto, montoParaInput, parseMonto } from '@/lib/montos';

type RolTurno = 'mesero' | 'cajero' | 'cocinero';
type EstadoTurno = 'abierto' | 'cerrado';

type TurnoMovimiento = {
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
  estado: EstadoTurno;
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
  movimientos: TurnoMovimiento[];
  pedidosAbiertos?: number;
};

type UltimoCierre = {
  id: number;
  fechaCierre: string | null;
  montoContado: number | null;
  montoEsperado: number | null;
  diferencia: number | null;
  motivoDiferencia: string | null;
  totalVentas: number;
  cerradoPor: { id: number; name: string } | null;
};

type Paginado = { data: Turno[]; total: number; page: number; limit: number; totalPages: number };

type CobroSinTurno = {
  id: number;
  pedidoId: number;
  mesa: number | null;
  total: number;
  fechaCobro: string | null;
  cobradoPor: { id: number; name: string } | null;
  autorizadoPor: { id: number; name: string } | null;
  motivo: string | null;
  tipoPago: string | null;
  pagos: { tipoPagoId: number; nombre: string; monto: number }[];
};

type EstadoCaja = {
  abierta: boolean;
  turnoId: number | null;
  abiertoPor?: { id: number; name: string };
  fechaApertura?: string;
  montoInicial?: number;
};

type Usuario = { id: number; name: string; email: string; rolId: number; isActive: boolean };

const money = formatMonto;

const ROLES: { id: RolTurno; label: string; icon: string }[] = [
  { id: 'mesero', label: 'Mesero', icon: 'room_service' },
  { id: 'cajero', label: 'Cajero', icon: 'point_of_sale' },
  { id: 'cocinero', label: 'Cocinero', icon: 'soup_kitchen' },
];

const ROLES_LABEL: Record<RolTurno, string> = { mesero: 'Mesero', cajero: 'Cajero', cocinero: 'Cocinero' };
const ROL_GLOBAL: Record<number, string> = { 1: 'Administrador', 2: 'Mesero', 3: 'Chef', 4: 'Cajero' };

function addDaysIso(iso: string, dias: number): string {
  const [y, m, d] = iso.split('-').map(Number);
  const dt = new Date(Date.UTC(y, (m || 1) - 1, (d || 1) + dias, 12));
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${dt.getUTCFullYear()}-${pad(dt.getUTCMonth() + 1)}-${pad(dt.getUTCDate())}`;
}

function MotivoObligatorio({ motivo, setMotivo }: { motivo: string; setMotivo: (v: string) => void }) {
  const ok = motivo.trim().length >= 10;
  return (
    <div className="form-field">
      <label>Motivo de la diferencia (obligatorio, mínimo 10 caracteres)</label>
      <textarea
        value={motivo}
        onChange={(e) => setMotivo(e.target.value)}
        maxLength={300}
        rows={2}
        placeholder="Ej.: faltan monedas, sobró por devolución…"
        style={{
          width: '100%',
          padding: '10px 12px',
          background: 'var(--bg)',
          border: '1.5px solid var(--border)',
          borderRadius: 'var(--radius)',
          color: 'var(--text)',
          fontSize: 13,
          resize: 'vertical',
          fontFamily: 'inherit',
        }}
      />
      <p style={{ fontSize: 11, color: ok ? 'var(--success)' : 'var(--text-muted)', marginTop: 4 }}>
        {motivo.trim().length}/300 caracteres
      </p>
    </div>
  );
}

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

export default function CajaPage() {
  const router = useRouter();

  const [turno, setTurno] = useState<Turno | null>(null);
  const [estado, setEstado] = useState<EstadoCaja | null>(null);
  const [ultimoCierre, setUltimoCierre] = useState<UltimoCierre | null>(null);
  const [historial, setHistorial] = useState<Paginado | null>(null);
  const [cobrosSinTurno, setSinCaja] = useState<CobroSinTurno[]>([]);
  const [usuarios, setUsuarios] = useState<Usuario[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [sinAcceso, setSinAcceso] = useState(false);
  const [perfil, setPerfil] = useState<{ rolId: number } | null>(null);

  // Filtros del historial: por defecto, el mes actual (como el reporte de ventas por rango).
  const [filtros, setFiltros] = useState({ desde: primerDiaMesIso(), hasta: hoyIso(), page: 1 });

  // Apertura de caja
  const [montoInicial, setMontoInicial] = useState('');
  const [busqueda, setBusqueda] = useState('');
  const [seleccion, setSeleccion] = useState<Record<number, RolTurno[]>>({});
  const [abriendo, setAbriendo] = useState(false);

  // Agregar personal a un turno abierto
  const [nuevoUsuario, setNuevoUsuario] = useState('');
  const [nuevoRoles, setNuevoRoles] = useState<RolTurno[]>([]);
  const [agregando, setAgregando] = useState(false);

  // Modal de movimientos
  const [movOpen, setMovOpen] = useState(false);
  const [movTipo, setMovTipo] = useState<'entrada' | 'salida'>('entrada');
  const [movMonto, setMovMonto] = useState('');
  const [movMotivo, setMovMotivo] = useState('');
  const [movReversoDe, setMovReversoDe] = useState<number | null>(null);
  const [movOriginal, setMovOriginal] = useState<{ id: number; monto: number; tipo: 'entrada' | 'salida' } | null>(null);
  const [movBusy, setMovBusy] = useState(false);

  // Modal de cierre
  const [cerrarOpen, setCerrarOpen] = useState(false);
  const [contado, setContado] = useState('');
  const [motivoDiferencia, setMotivoDiferencia] = useState('');
  const [notas, setNotas] = useState('');
  const [cerrando, setCerrando] = useState(false);

  // Detalle del historial
  const [detalleId, setDetalleId] = useState<number | null>(null);
  const [detalle, setDetalle] = useState<Turno | null>(null);
  const [detalleLoading, setDetalleLoading] = useState(false);

  const esAdmin = perfil?.rolId === 1;

  const api = useCallback(async (method: string, url: string, body?: any) => {
    const res = await fetch(url, {
      method,
      headers: getAuthHeaders(),
      body: body ? JSON.stringify(body) : undefined,
    });
    if (res.status === 401) {
      window.location.href = '/login';
      return null;
    }
    const text = await res.text();
    const data = text ? JSON.parse(text) : null;
    if (!res.ok) throw new Error((data as any)?.message || `Error ${res.status}`);
    return data;
  }, []);

  const cargarActual = useCallback(async () => {
    const res = await fetch('/api/backend/turnos/actual', { headers: getAuthHeaders() });
    if (res.status === 401) {
      window.location.href = '/login';
      return;
    }
    if (res.status === 403) {
      setSinAcceso(true);
      setTurno(null);
      return;
    }
    if (!res.ok) throw new Error('No se pudo cargar el turno');
    setSinAcceso(false);
    const text = await res.text();
    setTurno(text ? JSON.parse(text) : null);
  }, []);

  const cargarEstado = useCallback(async () => {
    try {
      const res = await fetch('/api/backend/turnos/estado', { headers: getAuthHeaders() });
      if (res.ok) setEstado(await res.json());
    } catch {
      /* noop */
    }
  }, []);

  const cargarUltimo = useCallback(async () => {
    try {
      const res = await fetch('/api/backend/turnos/ultimo-cierre', { headers: getAuthHeaders() });
      if (res.status === 403 || !res.ok) return;
      const text = await res.text();
      if (text) setUltimoCierre(JSON.parse(text));
    } catch {
      /* noop */
    }
  }, []);

  const cargarUsuarios = useCallback(async () => {
    if (!esAdmin) return;
    try {
      const r = await api('GET', '/api/backend/usuarios');
      if (r) setUsuarios(r);
    } catch {
      /* noop */
    }
  }, [esAdmin, api]);

  const cargarCobrosSinTurno = useCallback(async () => {
    if (!esAdmin) return;
    try {
      const r = await api('GET', '/api/backend/turnos/cobros-sin-turno');
      if (r) setSinCaja(r);
    } catch {
      /* noop */
    }
  }, [esAdmin, api]);

  const cargarHistorial = useCallback(async () => {
    if (!esAdmin) return;
    try {
      const p = new URLSearchParams();
      p.set('page', String(filtros.page));
      p.set('limit', '10');
      if (filtros.desde) p.set('desde', filtros.desde);
      if (filtros.hasta) p.set('hasta', filtros.hasta);
      const r = await api('GET', `/api/backend/turnos?${p.toString()}`);
      if (r) setHistorial(r);
    } catch (e) {
      if (!(e instanceof Error && e.message.includes('403'))) {
        setError(e instanceof Error ? e.message : 'Error al cargar el historial');
      }
    }
  }, [esAdmin, filtros, api]);

  const cargarPerfil = useCallback(async () => {
    try {
      const res = await fetch('/api/backend/usuarios/me', { headers: getAuthHeaders() });
      if (res.ok) setPerfil(await res.json());
    } catch {
      /* noop */
    }
  }, []);

  useEffect(() => {
    (async () => {
      setLoading(true);
      setError(null);
      await cargarPerfil();
      await cargarUltimo();
      await cargarEstado();
      await cargarActual();
      setLoading(false);
    })();
  }, [cargarPerfil, cargarUltimo, cargarEstado, cargarActual]);

  useEffect(() => {
    if (perfil && esAdmin) {
      cargarUsuarios();
      cargarCobrosSinTurno();
    }
  }, [perfil, esAdmin, cargarUsuarios, cargarCobrosSinTurno]);

  useEffect(() => {
    if (esAdmin) cargarHistorial();
  }, [esAdmin, cargarHistorial]);

  const asignados = useMemo(() => Object.values(seleccion).reduce((a, b) => a + b.length, 0), [seleccion]);

  const usuariosFiltrados = useMemo(() => {
    const t = busqueda.trim().toLowerCase();
    return usuarios
      .filter((u) => u.isActive)
      .filter((u) => !t || u.name.toLowerCase().includes(t) || u.email.toLowerCase().includes(t))
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [usuarios, busqueda]);

  const esperado = turno?.montoEsperado ?? 0;
  const contadoNum = parseMonto(contado);
  const contadoValido = contadoNum != null && contadoNum >= 0;
  const diferencia =
    contadoNum != null ? Math.round((contadoNum - esperado) * 100) / 100 : null;
  const motivoObligatorio = diferencia != null && diferencia !== 0;
  const cierreValido = contadoValido && (!motivoObligatorio || motivoDiferencia.trim().length >= 10);

  const reversosValidos = useMemo(() => {
    // Un movimiento cuenta como revertido solo si existe un movimiento contrario
    // y por el mismo monto. Así una "reversión" mal registrada no oculta el original.
    const movimientos = turno?.movimientos ?? [];
    const porId = new Map(movimientos.map((m) => [m.id, m]));
    const mapa = new Map<number, TurnoMovimiento>();
    for (const m of movimientos) {
      if (m.reversoDeId == null) continue;
      const original = porId.get(m.reversoDeId);
      if (!original) continue;
      const contrario = m.tipo !== original.tipo;
      const mismoMonto = Math.abs(m.monto - original.monto) < 0.005;
      if (contrario && mismoMonto) mapa.set(original.id, m);
    }
    return mapa;
  }, [turno]);

  const movMontoNum = parseMonto(movMonto);
  const salidaExcedida =
    !movOriginal &&
    movTipo === 'salida' &&
    movMontoNum != null &&
    movMontoNum > esperado + 0.004;

  function alternarSeleccion(uid: number, rol: RolTurno) {
    setSeleccion((prev) => {
      const actuales = prev[uid] ?? [];
      const siguientes = actuales.includes(rol) ? actuales.filter((r) => r !== rol) : [...actuales, rol];
      const copia = { ...prev };
      if (siguientes.length > 0) copia[uid] = siguientes;
      else delete copia[uid];
      return copia;
    });
  }

  function quitarSeleccion(uid: number) {
    setSeleccion((prev) => {
      const copia = { ...prev };
      delete copia[uid];
      return copia;
    });
  }

  async function abrirCaja() {
    setError(null);
    const m = montoInicial.trim() === '' ? 0 : parseMonto(montoInicial);
    if (m == null || m < 0) {
      setError('Ingresa un monto inicial válido (ej. 10.000 o 10000)');
      return;
    }
    const personal = Object.entries(seleccion).map(([uid, roles]) => ({ usuarioId: Number(uid), roles }));
    setAbriendo(true);
    try {
      const data = await api('POST', '/api/backend/turnos/abrir', { montoInicial: m, personal });
      if (data) {
        setTurno(data);
        setMontoInicial('');
        setSeleccion({});
        setBusqueda('');
        setUltimoCierre(null);
        await cargarHistorial();
        await cargarEstado();
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'No se pudo abrir la caja');
    } finally {
      setAbriendo(false);
    }
  }

  async function agregarPersonal() {
    if (!turno || !nuevoUsuario || nuevoRoles.length === 0) return;
    setError(null);
    setAgregando(true);
    try {
      const data = await api('POST', `/api/backend/turnos/${turno.id}/personal`, {
        usuarioId: Number(nuevoUsuario),
        roles: nuevoRoles,
      });
      if (data) {
        setTurno(data);
        setNuevoUsuario('');
        setNuevoRoles([]);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'No se pudo agregar el personal');
    } finally {
      setAgregando(false);
    }
  }

  async function quitarRol(usuarioId: number, rol: RolTurno) {
    if (!turno) return;
    setError(null);
    try {
      const data = await api('DELETE', `/api/backend/turnos/${turno.id}/personal/${usuarioId}/${rol}`);
      if (data) setTurno(data);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'No se pudo quitar el rol');
    }
  }

  async function cerrarCaja() {
    if (!turno) return;
    setError(null);
    if (!cierreValido) {
      setError(
        motivoObligatorio
          ? 'Debes registrar el motivo de la diferencia (mínimo 10 caracteres)'
          : 'Ingresa el efectivo contado',
      );
      return;
    }
    setCerrando(true);
    try {
      const body: any = { montoContado: contadoNum, notas: notas.trim() || undefined };
      if (motivoObligatorio) body.motivoDiferencia = motivoDiferencia.trim();
      const data = await api('POST', `/api/backend/turnos/${turno.id}/cerrar`, body);
      if (data) {
        setUltimoCierre(data);
        setTurno(null);
        setCerrarOpen(false);
        await cargarHistorial();
        await cargarEstado();
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'No se pudo cerrar la caja');
    } finally {
      setCerrando(false);
    }
  }

  async function agregarMovimiento() {
    if (!turno) return;
    setError(null);
    const m = parseMonto(movMonto);
    if (m == null || m <= 0) {
      setError('El monto debe ser mayor a cero');
      return;
    }
    if (movMotivo.trim().length < 5) {
      setError('El motivo es obligatorio (mínimo 5 caracteres)');
      return;
    }
    if (salidaExcedida) {
      setError(
        `No puedes retirar ${money(m)}: en caja solo hay ${money(esperado)} disponible. Registra primero una entrada de efectivo.`,
      );
      return;
    }
    setMovBusy(true);
    try {
      await api('POST', `/api/backend/turnos/${turno.id}/movimientos`, {
        tipo: movTipo,
        monto: m,
        motivo: movMotivo.trim(),
        ...(movReversoDe ? { reversoDeId: movReversoDe } : {}),
      });
      cerrarMovModal();
      const fresh = await api('GET', '/api/backend/turnos/actual');
      if (fresh) setTurno(fresh);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'No se pudo registrar el movimiento');
    } finally {
      setMovBusy(false);
    }
  }

  async function cargarDetalle(id: number) {
    if (detalleId === id) {
      setDetalleId(null);
      setDetalle(null);
      return;
    }
    setDetalleId(id);
    setDetalle(null);
    setDetalleLoading(true);
    try {
      const data = await api('GET', `/api/backend/turnos/${id}`);
      if (data) setDetalle(data);
    } catch {
      /* noop */
    } finally {
      setDetalleLoading(false);
    }
  }

  function abrirCierre() {
    setContado(montoParaInput(esperado));
    setNotas('');
    setMotivoDiferencia('');
    setCerrarOpen(true);
  }

  function cerrarMovModal() {
    setMovOpen(false);
    setMovMonto('');
    setMovMotivo('');
    setMovReversoDe(null);
    setMovOriginal(null);
  }

  function abrirMovimientoNuevo() {
    setMovTipo('entrada');
    setMovMonto('');
    setMovMotivo('');
    setMovReversoDe(null);
    setMovOriginal(null);
    setError(null);
    setMovOpen(true);
  }

  function abrirMovimientoReverse(mov: TurnoMovimiento) {
    // La reversión es automática: tipo contrario y mismo monto del original.
    setMovTipo(mov.tipo === 'entrada' ? 'salida' : 'entrada');
    setMovMonto(montoParaInput(mov.monto));
    setMovMotivo(`Reversión del movimiento #${mov.id}`);
    setMovReversoDe(mov.id);
    setMovOriginal({ id: mov.id, monto: mov.monto, tipo: mov.tipo });
    setError(null);
    setMovOpen(true);
  }

  function abrirReporte(id: number) {
    router.push(`/dashboard/caja/cierre/${id}`);
  }

  const hoy = hoyIso();
  const rangoActivo = (desde: string, hasta: string) => filtros.desde === desde && filtros.hasta === hasta;
  const etiquetaRango =
    filtros.desde && filtros.hasta
      ? `Del ${fmtDia(filtros.desde)} al ${fmtDia(filtros.hasta)}`
      : filtros.desde
        ? `Desde ${fmtDia(filtros.desde)}`
        : filtros.hasta
          ? `Hasta ${fmtDia(filtros.hasta)}`
          : 'Todos los turnos';

  function aplicarRango(desde: string, hasta: string) {
    setFiltros((f) => ({ ...f, desde, hasta, page: 1 }));
  }

  if (loading) {
    return (
      <div style={{ textAlign: 'center', padding: '64px 0' }}>
        <span className="material-symbols-outlined" style={{ fontSize: 36, color: 'var(--text-muted)' }}>
          sync
        </span>
        <p style={{ color: 'var(--text-muted)', marginTop: 8 }}>Cargando caja…</p>
      </div>
    );
  }

  const cerrados = historial?.data ?? [];
  const personasPorRol = (rol: RolTurno) => turno?.personal.filter((p) => p.rolTurno === rol) ?? [];

  return (
    <>
      <div className="animate-in">
        <h2 className="page-title" style={{ marginBottom: 0 }}>Caja</h2>
        <p className="page-subtitle">Apertura, cierre, personal y movimientos de efectivo por turno.</p>
      </div>

      {error && (
        <div className="card-data animate-in" style={{ borderColor: 'var(--danger)', marginBottom: 16 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span className="material-symbols-outlined" style={{ color: 'var(--danger)', fontSize: 20 }}>error</span>
            <p style={{ color: 'var(--danger)', fontSize: 13, fontWeight: 600, margin: 0 }}>{error}</p>
          </div>
        </div>
      )}

      {sinAcceso && (
        <div className="card-data animate-in" style={{ marginBottom: 16, borderColor: 'var(--warning)' }}>
          <p style={{ color: 'var(--warning)', fontSize: 13, fontWeight: 600, margin: 0 }}>
            No tienes acceso a la caja en este turno. Pídele al administrador que te asigne al turno.
          </p>
        </div>
      )}

      {/* Estado de la caja */}
      <div className="card-data animate-in animate-in-delay-1" style={{ marginBottom: 16 }}>
        <div className="caja-status-row">
          <span className="status-dot" style={{ background: turno ? 'var(--success)' : 'var(--danger)' }} />
          <h3 className="caja-status-title">{turno ? `Turno #${turno.id} abierto` : 'Caja cerrada'}</h3>
          <span className={`caja-badge ${turno ? 'abierta' : 'cerrada'}`}>
            <span className="material-symbols-outlined">{turno ? 'lock_open' : 'lock'}</span>
            {turno ? 'Operando' : 'Sin turno'}
          </span>
          {estado && (
            <span className="caja-status-meta">
              {estado.abierta && estado.fechaApertura
                ? `Abierta el ${fmtFecha(estado.fechaApertura)}`
                : 'No hay caja abierta'}
            </span>
          )}
          {esAdmin && turno && (
            <div style={{ marginLeft: 'auto' }}>
              <button className="btn-primary" style={{ padding: '10px 18px', fontSize: 13 }} onClick={abrirCierre}>
                <span className="material-symbols-outlined" style={{ fontSize: 18 }}>lock</span>
                Cerrar caja
              </button>
            </div>
          )}
        </div>
        {turno?.pedidosAbiertos != null && turno.pedidosAbiertos > 0 && (
          <div className="caja-alert" style={{ marginTop: 12 }}>
            Hay {turno.pedidosAbiertos} pedido(s) abierto(s) que no quedarán incluidos en este turno.
          </div>
        )}
      </div>

      {turno ? (
        <>
          <div className="metric-grid caja-metrics" style={{ marginBottom: 16 }}>
            <Metrica icon="account_balance_wallet" label="Efectivo esperado" value={money(turno.montoEsperado)} detalle="Inicial + efectivo + entradas − salidas" />
            <Metrica icon="payments" label="Ventas totales" value={money(turno.totalVentas)} detalle={`${turno.cantidadFacturas} factura(s)`} />
            <Metrica icon="attach_money" label="Ventas en efectivo" value={money(turno.ventasEfectivo)} detalle="Base de efectivo" />
            <Metrica icon="savings" label="Monto inicial" value={money(turno.montoInicial)} detalle="Apertura del turno" />
            <Metrica icon="add_circle" label="Entradas" value={money(turno.totalEntradas)} detalle="Movimientos de entrada" />
            <Metrica icon="remove_circle" label="Salidas" value={money(turno.totalSalidas)} detalle="Movimientos de salida" />
            <Metrica icon="percent" label="IVA del turno" value={money(turno.totalIva)} detalle="Acumulado" />
            <Metrica icon="volunteer_activism" label="Propina" value={money(turno.totalPropina)} detalle="Acumulado" />
          </div>

          <div className="caja-grid-2" style={{ marginBottom: 16 }}>
            <div className="card-data animate-in animate-in-delay-1">
              <h4 className="card-data-title" style={{ marginBottom: 10 }}>Ventas por método de pago</h4>
              {turno.resumenPagos.length === 0 ? (
                <p style={{ color: 'var(--text-muted)', fontSize: 12, margin: 0 }}>Sin cobros en este turno.</p>
              ) : (
                <div className="table-wrap caja-table-wrap">
                  <table className="caja-table">
                    <thead>
                      <tr>
                        <th>Método</th>
                        <th className="caja-num">Cuentas</th>
                        <th className="caja-num">Total</th>
                      </tr>
                    </thead>
                    <tbody>
                      {turno.resumenPagos.map((p, i) => (
                        <tr key={i}>
                          <td>{p.nombre}</td>
                          <td className="caja-num" style={{ color: 'var(--text-secondary)' }}>{p.cuentas}</td>
                          <td className="caja-num" style={{ fontWeight: 700 }}>{money(p.total)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            <div className="card-data animate-in animate-in-delay-1">
              <h4 className="card-data-title" style={{ marginBottom: 10 }}>Ventas por mesero</h4>
              {turno.resumenMeseros.length === 0 ? (
                <p style={{ color: 'var(--text-muted)', fontSize: 12, margin: 0 }}>Sin cobros por mesero.</p>
              ) : (
                <div className="table-wrap caja-table-wrap">
                  <table className="caja-table">
                    <thead>
                      <tr>
                        <th>Mesero</th>
                        <th>Rol</th>
                        <th className="caja-num">Cuentas</th>
                        <th className="caja-num">Total</th>
                      </tr>
                    </thead>
                    <tbody>
                      {turno.resumenMeseros.map((m, i) => (
                        <tr key={i}>
                          <td>{m.nombre}</td>
                          <td style={{ color: 'var(--text-secondary)' }}>{m.rol ?? '—'}</td>
                          <td className="caja-num" style={{ color: 'var(--text-secondary)' }}>{m.cuentas}</td>
                          <td className="caja-num" style={{ fontWeight: 700 }}>{money(m.total)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>

          {/* Movimientos */}
          <div className="card-data animate-in animate-in-delay-2" style={{ marginBottom: 16 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 10, flexWrap: 'wrap', marginBottom: 12 }}>
              <div>
                <h4 className="card-data-title" style={{ marginBottom: 2 }}>Movimientos de efectivo</h4>
                <p style={{ fontSize: 12, color: 'var(--text-muted)', margin: 0 }}>
                  Entradas y salidas del cajón. Las correcciones se hacen con un movimiento inverso.
                </p>
              </div>
              <button className="btn-primary" style={{ padding: '9px 14px', fontSize: 12 }} onClick={abrirMovimientoNuevo}>
                <span className="material-symbols-outlined" style={{ fontSize: 17 }}>add</span>
                Registrar movimiento
              </button>
            </div>

            {turno.movimientos.length === 0 ? (
              <p style={{ color: 'var(--text-muted)', fontSize: 12, margin: 0 }}>Sin movimientos registrados en este turno.</p>
            ) : (
              <div className="table-wrap caja-table-wrap">
                <table className="caja-table">
                  <thead>
                    <tr>
                      <th>Fecha</th>
                      <th>Tipo</th>
                      <th>Motivo</th>
                      <th className="caja-num">Monto</th>
                      <th style={{ textAlign: 'right' }}>Acción</th>
                    </tr>
                  </thead>
                  <tbody>
                    {turno.movimientos.map((m) => {
                      const revertido = reversosValidos.has(m.id);
                      return (
                        <tr key={m.id}>
                          <td style={{ color: 'var(--text-secondary)', whiteSpace: 'nowrap' }}>{fmtFecha(m.fecha)}</td>
                          <td>
                            <span
                              style={{
                                display: 'inline-block',
                                padding: '3px 9px',
                                borderRadius: 999,
                                fontSize: 11,
                                fontWeight: 700,
                                background: m.tipo === 'entrada' ? '#D1FAE5' : '#FEE2E2',
                                color: m.tipo === 'entrada' ? '#065F46' : '#991B1B',
                              }}
                            >
                              {m.tipo === 'entrada' ? 'Entrada' : 'Salida'}
                            </span>
                          </td>
                          <td>
                            {m.motivo}
                            {m.reversoDeId ? (
                              <span style={{ marginLeft: 6, fontSize: 10, color: 'var(--text-muted)' }}>
                                (reversión de #{m.reversoDeId})
                              </span>
                            ) : null}
                          </td>
                          <td className="caja-num" style={{ fontWeight: 700 }}>{money(m.monto)}</td>
                          <td style={{ textAlign: 'right' }}>
                            {revertido ? (
                              <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>revertido</span>
                            ) : (
                              <button className="caja-btn-sm" onClick={() => abrirMovimientoReverse(m)}>Revertir</button>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Personal del turno */}
          {esAdmin && (
            <div className="card-data animate-in animate-in-delay-2" style={{ marginBottom: 16 }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10, flexWrap: 'wrap', marginBottom: 10 }}>
                <div>
                  <h4 className="card-data-title" style={{ marginBottom: 2 }}>Personal del turno</h4>
                  <p style={{ fontSize: 12, color: 'var(--text-muted)', margin: 0 }}>
                    Un usuario puede tener varios roles en el mismo turno.
                  </p>
                </div>
                <span className="caja-badge abierta">{turno.personal.length} asignación(es)</span>
              </div>

              <div className="caja-person-grid">
                {ROLES.map((r) => {
                  const personas = personasPorRol(r.id);
                  return (
                    <div key={r.id} className="caja-person-col">
                      <div className="caja-person-col-head">
                        <span className="material-symbols-outlined">{r.icon}</span>
                        <b>{r.label}</b>
                        <span className="caja-count">{personas.length}</span>
                      </div>
                      {personas.length === 0 ? (
                        <p className="caja-empty">Sin asignar</p>
                      ) : (
                        personas.map((p) => (
                          <div key={p.id} className="caja-person-row">
                            <span className="caja-person-name" title={p.usuario?.name ?? `#${p.usuarioId}`}>
                              {p.usuario?.name ?? `#${p.usuarioId}`}
                            </span>
                            <button
                              type="button"
                              className="caja-icon-btn"
                              onClick={() => quitarRol(p.usuarioId, p.rolTurno)}
                              aria-label={`Quitar rol ${r.label} a ${p.usuario?.name ?? p.usuarioId}`}
                              title={`Quitar rol ${r.label}`}
                            >
                              <span className="material-symbols-outlined">close</span>
                            </button>
                          </div>
                        ))
                      )}
                    </div>
                  );
                })}
              </div>

              <div className="caja-add-row">
                <select value={nuevoUsuario} onChange={(e) => setNuevoUsuario(e.target.value)} aria-label="Usuario a agregar">
                  <option value="">Agregar usuario…</option>
                  {usuarios
                    .filter((u) => u.isActive)
                    .map((u) => (
                      <option key={u.id} value={u.id}>
                        {u.name} — {ROL_GLOBAL[u.rolId] ?? 'Usuario'}
                      </option>
                    ))}
                </select>
                <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
                  {ROLES.map((r) => (
                    <button
                      key={r.id}
                      type="button"
                      className={`caja-role-chip ${nuevoRoles.includes(r.id) ? 'active' : ''}`}
                      onClick={() =>
                        setNuevoRoles((p) => (p.includes(r.id) ? p.filter((x) => x !== r.id) : [...p, r.id]))
                      }
                    >
                      {r.label}
                    </button>
                  ))}
                </div>
                <button
                  className="btn-primary"
                  style={{ padding: '10px 16px', fontSize: 13 }}
                  disabled={agregando || !nuevoUsuario || nuevoRoles.length === 0}
                  onClick={agregarPersonal}
                >
                  {agregando ? 'Agregando…' : 'Agregar'}
                </button>
              </div>
            </div>
          )}

          {/* Cobros sin caja */}
          {esAdmin && cobrosSinTurno.length > 0 && (
            <div className="card-data animate-in animate-in-delay-2" style={{ marginBottom: 16, borderColor: 'var(--warning)' }}>
              <h4 className="card-data-title" style={{ color: 'var(--warning)', marginBottom: 4 }}>
                Cobros sin caja ({cobrosSinTurno.length})
              </h4>
              <p style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 10 }}>
                Cobros autorizados por el administrador sin un turno abierto.
              </p>
              <div className="table-wrap caja-table-wrap">
                <table className="caja-table">
                  <thead>
                    <tr>
                      <th>Factura</th>
                      <th className="caja-num">Total</th>
                      <th>Autorizó</th>
                      <th>Motivo</th>
                      <th>Fecha de cobro</th>
                    </tr>
                  </thead>
                  <tbody>
                    {cobrosSinTurno.slice(0, 10).map((c) => (
                      <tr key={c.id}>
                        <td>#{c.id}</td>
                        <td className="caja-num">{money(c.total)}</td>
                        <td>{c.autorizadoPor?.name ?? '—'}</td>
                        <td style={{ color: 'var(--text-muted)', fontSize: 11 }}>{c.motivo ?? '—'}</td>
                        <td style={{ color: 'var(--text-secondary)', fontSize: 11, whiteSpace: 'nowrap' }}>
                          {c.fechaCobro ? fmtFecha(c.fechaCobro) : '—'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </>
      ) : esAdmin ? (
        /* ───────────────────────── Apertura de caja ───────────────────────── */
        <div className="caja-apertura">
          <section className="card-data caja-panel animate-in animate-in-delay-1">
            <div className="caja-panel-head">
              <span className="caja-step">1</span>
              <div>
                <h3 className="caja-panel-title">Efectivo inicial</h3>
                <p className="caja-panel-sub">Escribe cuánto dinero hay en el cajón al comenzar el turno.</p>
              </div>
            </div>

            <div>
              <label className="caja-field-label" htmlFor="monto-inicial">Monto en efectivo</label>
              <div style={{ marginTop: 6 }}>
                <MoneyInput value={montoInicial} onChange={setMontoInicial} placeholder="0" large id="monto-inicial" />
              </div>
              <p className="caja-panel-sub" style={{ marginTop: 8 }}>
                Puedes escribir <b>10.000</b>, <b>10000</b> o <b>10.000,50</b>. El sistema lo normaliza solo.
              </p>
              {ultimoCierre && ultimoCierre.montoContado != null && (
                <button
                  type="button"
                  className="caja-btn-sm"
                  style={{ marginTop: 8 }}
                  onClick={() => setMontoInicial(montoParaInput(ultimoCierre.montoContado))}
                >
                  Usar efectivo del cierre anterior ({money(ultimoCierre.montoContado)})
                </button>
              )}
            </div>

            <div style={{ borderTop: '1px solid var(--border-light)', paddingTop: 12 }}>
              <div className="caja-summary-list">
                <div className="caja-summary-item"><span>Personal asignado</span><b>{Object.keys(seleccion).length} persona(s)</b></div>
                <div className="caja-summary-item"><span>Roles marcados</span><b>{asignados}</b></div>
                <div className="caja-summary-item"><span>Fecha de apertura</span><b>{fmtFecha(new Date().toISOString())}</b></div>
              </div>
            </div>
          </section>

          <section className="card-data caja-panel animate-in animate-in-delay-1">
            <div className="caja-panel-head">
              <span className="caja-step">2</span>
              <div>
                <h3 className="caja-panel-title">Personal del turno</h3>
                <p className="caja-panel-sub">Busca a cada persona y marca los roles con los que trabajará hoy.</p>
              </div>
            </div>

            <div className="caja-search">
              <span className="material-symbols-outlined">search</span>
              <input
                value={busqueda}
                onChange={(e) => setBusqueda(e.target.value)}
                placeholder="Buscar por nombre o correo…"
                aria-label="Buscar usuario"
              />
              {busqueda && (
                <button type="button" className="caja-icon-btn" onClick={() => setBusqueda('')} aria-label="Limpiar búsqueda">
                  <span className="material-symbols-outlined">close</span>
                </button>
              )}
            </div>

            {asignados > 0 && (
              <div className="caja-selected">
                {Object.entries(seleccion).map(([uid, roles]) => {
                  const u = usuarios.find((x) => x.id === Number(uid));
                  return (
                    <span key={uid} className="caja-selected-chip">
                      {u?.name ?? `#${uid}`} <em>{roles.map((r) => ROLES_LABEL[r]).join(' · ')}</em>
                      <button type="button" onClick={() => quitarSeleccion(Number(uid))} aria-label="Quitar selección">
                        <span className="material-symbols-outlined">close</span>
                      </button>
                    </span>
                  );
                })}
              </div>
            )}

            <div className="caja-user-list">
              {usuariosFiltrados.length === 0 ? (
                <p style={{ fontSize: 13, color: 'var(--text-muted)', padding: '18px 14px', margin: 0 }}>
                  No se encontraron usuarios activos.
                </p>
              ) : (
                usuariosFiltrados.map((u) => (
                  <div key={u.id} className="caja-user-row">
                    <div className="caja-user-info">
                      <p className="caja-user-name">{u.name}</p>
                      <p className="caja-user-meta">{u.email} · {ROL_GLOBAL[u.rolId] ?? 'Usuario'}</p>
                    </div>
                    <div className="caja-role-chips">
                      {ROLES.map((r) => {
                        const activo = (seleccion[u.id] ?? []).includes(r.id);
                        return (
                          <button
                            key={r.id}
                            type="button"
                            className={`caja-role-chip ${activo ? 'active' : ''}`}
                            onClick={() => alternarSeleccion(u.id, r.id)}
                            aria-pressed={activo}
                          >
                            {activo ? '✓ ' : ''}{r.label}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                ))
              )}
            </div>
          </section>

          <div className="caja-cta-row" style={{ gridColumn: '1 / -1' }}>
            <span style={{ marginRight: 'auto', fontSize: 12, color: 'var(--text-muted)' }}>
              {asignados === 0
                ? 'Puedes abrir la caja sin personal y agregarlo después.'
                : `${Object.keys(seleccion).length} persona(s) con ${asignados} rol(es) asignado(s).`}
            </span>
            <button
              className="btn-primary"
              style={{ padding: '12px 22px', fontSize: 14 }}
              onClick={abrirCaja}
              disabled={abriendo}
            >
              <span className="material-symbols-outlined" style={{ fontSize: 19 }}>lock_open</span>
              {abriendo ? 'Abriendo…' : 'Abrir caja'}
            </button>
          </div>
        </div>
      ) : (
        <div className="card-data animate-in animate-in-delay-1" style={{ textAlign: 'center', padding: '40px 24px' }}>
          <span className="material-symbols-outlined" style={{ fontSize: 48, color: 'var(--text-muted)', marginBottom: 12 }}>lock</span>
          <h3 style={{ fontSize: 18, fontWeight: 700, marginBottom: 8 }}>Caja cerrada</h3>
          <p style={{ color: 'var(--text-muted)', margin: 0 }}>Espera a que el administrador abra la caja.</p>
        </div>
      )}

      {/* Último cierre */}
      {ultimoCierre && !turno && (
        <div className="card-data animate-in animate-in-delay-1" style={{ marginBottom: 16, borderColor: 'var(--primary)', marginTop: 16 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap', alignItems: 'center', marginBottom: 12 }}>
            <div>
              <p className="card-data-title" style={{ marginBottom: 2 }}>Último cierre</p>
              <h3 style={{ fontSize: 18, fontWeight: 800, margin: 0 }}>Turno #{ultimoCierre.id}</h3>
              <p style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 4 }}>
                Cerrado {ultimoCierre.fechaCierre ? fmtFecha(ultimoCierre.fechaCierre) : '—'} por {ultimoCierre.cerradoPor?.name ?? '—'}
              </p>
            </div>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              <button className="btn-outline" style={{ padding: '9px 14px', fontSize: 13 }} onClick={() => abrirReporte(ultimoCierre.id)}>
                <span className="material-symbols-outlined" style={{ fontSize: 18 }}>receipt_long</span>
                Ver reporte
              </button>
              <button className="btn-outline" style={{ padding: '9px 14px', fontSize: 13 }} onClick={() => setUltimoCierre(null)}>
                Ocultar
              </button>
            </div>
          </div>
          <div className="metric-grid caja-metrics">
            <Metrica icon="account_balance_wallet" label="Esperado" value={money(ultimoCierre.montoEsperado)} />
            <Metrica icon="savings" label="Contado" value={money(ultimoCierre.montoContado)} />
            <Metrica
              icon="compare_arrows"
              label="Diferencia"
              value={money(ultimoCierre.diferencia)}
              detalle={ultimoCierre.diferencia === 0 ? 'Cuadra' : (ultimoCierre.diferencia ?? 0) < 0 ? 'Faltante' : 'Sobrante'}
            />
            <Metrica icon="payments" label="Ventas" value={money(ultimoCierre.totalVentas)} />
          </div>
        </div>
      )}

      {/* Historial */}
      {esAdmin && (
        <div className="card-data animate-in animate-in-delay-2" style={{ marginTop: 16 }}>
          <h4 style={{ fontSize: 15, fontWeight: 800, marginBottom: 2 }}>Historial de turnos</h4>
          <p style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 12 }}>
            {etiquetaRango} · {historial?.total ?? 0} turno(s)
          </p>

          <div className="caja-filters" style={{ marginBottom: 10 }}>
            <label className="caja-field">
              <span className="caja-field-label">Desde</span>
              <input
                type="date"
                className="caja-input"
                value={filtros.desde}
                max={filtros.hasta && filtros.hasta < hoy ? filtros.hasta : hoy}
                onChange={(e) => setFiltros((f) => ({ ...f, desde: e.target.value, page: 1 }))}
              />
            </label>
            <label className="caja-field">
              <span className="caja-field-label">Hasta</span>
              <input
                type="date"
                className="caja-input"
                value={filtros.hasta}
                min={filtros.desde || undefined}
                max={hoy}
                onChange={(e) => setFiltros((f) => ({ ...f, hasta: e.target.value, page: 1 }))}
              />
            </label>
            <button className="btn-primary" style={{ padding: '9px 16px', fontSize: 13 }} onClick={cargarHistorial}>
              <span className="material-symbols-outlined" style={{ fontSize: 17 }}>filter_alt</span>
              Filtrar
            </button>
          </div>

          <div className="caja-quick" style={{ marginBottom: 14 }}>
            <button className={`caja-pill ${rangoActivo(hoy, hoy) ? 'active' : ''}`} onClick={() => aplicarRango(hoy, hoy)}>Hoy</button>
            <button
              className={`caja-pill ${rangoActivo(addDaysIso(hoy, -6), hoy) ? 'active' : ''}`}
              onClick={() => aplicarRango(addDaysIso(hoy, -6), hoy)}
            >
              Últimos 7 días
            </button>
            <button
              className={`caja-pill ${rangoActivo(`${hoy.slice(0, 8)}01`, hoy) ? 'active' : ''}`}
              onClick={() => aplicarRango(`${hoy.slice(0, 8)}01`, hoy)}
            >
              Este mes
            </button>
            <button className={`caja-pill ${rangoActivo('', '') ? 'active' : ''}`} onClick={() => aplicarRango('', '')}>
              Todo
            </button>
          </div>

          <div className="table-wrap caja-table-wrap">
            <table className="caja-table">
              <thead>
                <tr>
                  <th>Turno</th>
                  <th>Apertura / Cierre</th>
                  <th>Abrió / Cerró</th>
                  <th className="caja-num">Ventas</th>
                  <th className="caja-num">Esperado</th>
                  <th className="caja-num">Contado</th>
                  <th className="caja-num">Diferencia</th>
                  <th style={{ textAlign: 'right' }}>Acciones</th>
                </tr>
              </thead>
              <tbody>
                {cerrados.length === 0 ? (
                  <tr>
                    <td colSpan={8} style={{ color: 'var(--text-muted)', padding: '18px 10px' }}>
                      No hay turnos para los filtros seleccionados.
                    </td>
                  </tr>
                ) : (
                  cerrados.map((t) => {
                    const abierto = detalleId === t.id;
                    return (
                      <Fragment key={t.id}>
                        <tr style={{ cursor: 'pointer' }} onClick={() => cargarDetalle(t.id)}>
                          <td style={{ fontWeight: 700 }}>
                            #{t.id}{' '}
                            <span style={{ fontSize: 10, fontWeight: 600, color: t.estado === 'abierto' ? 'var(--success)' : 'var(--text-muted)' }}>
                              ({t.estado})
                            </span>
                          </td>
                          <td style={{ color: 'var(--text-secondary)', fontSize: 11, whiteSpace: 'nowrap' }}>
                            {fmtFecha(t.fechaApertura)}<br />{t.fechaCierre ? fmtFecha(t.fechaCierre) : '—'}
                          </td>
                          <td style={{ fontSize: 11 }}>
                            {t.abiertoPor?.name ?? '—'}<br />{t.cerradoPor?.name ?? '—'}
                          </td>
                          <td className="caja-num">{money(t.totalVentas)}</td>
                          <td className="caja-num">{money(t.montoEsperado)}</td>
                          <td className="caja-num">{money(t.montoContado)}</td>
                          <td className="caja-num">
                            {t.diferencia != null ? (
                              <span
                                style={{
                                  color: t.diferencia < 0 ? 'var(--danger)' : t.diferencia > 0 ? 'var(--success)' : 'var(--text-muted)',
                                  fontWeight: 700,
                                }}
                              >
                                {money(t.diferencia)}
                              </span>
                            ) : '—'}
                          </td>
                          <td onClick={(e) => e.stopPropagation()} style={{ textAlign: 'right' }}>
                            <button className={`caja-btn-sm ${abierto ? 'solid' : ''}`} onClick={() => cargarDetalle(t.id)}>
                              {abierto ? 'Ocultar' : 'Detalle'}
                            </button>
                          </td>
                        </tr>
                        {abierto && (
                          <tr>
                            <td colSpan={8} style={{ padding: '4px 10px 12px', background: 'transparent' }}>
                              {detalleLoading ? (
                                <div className="caja-detail"><p style={{ fontSize: 12, color: 'var(--text-muted)', margin: 0 }}>Cargando detalle…</p></div>
                              ) : detalle && detalle.id === t.id ? (
                                <div className="caja-detail">
                                  {detalle.motivoDiferencia && (
                                    <p className="caja-detail-note" style={{ color: 'var(--warning)', fontWeight: 600 }}>
                                      Motivo de la diferencia: {detalle.motivoDiferencia}
                                    </p>
                                  )}
                                  <div className="caja-detail-grid">
                                    <div className="caja-detail-kpi"><span>Facturas</span><b>{detalle.cantidadFacturas}</b></div>
                                    <div className="caja-detail-kpi"><span>IVA</span><b>{money(detalle.totalIva)}</b></div>
                                    <div className="caja-detail-kpi"><span>Propina</span><b>{money(detalle.totalPropina)}</b></div>
                                    <div className="caja-detail-kpi"><span>Entradas</span><b style={{ color: 'var(--success)' }}>{money(detalle.totalEntradas)}</b></div>
                                    <div className="caja-detail-kpi"><span>Salidas</span><b style={{ color: 'var(--danger)' }}>{money(detalle.totalSalidas)}</b></div>
                                  </div>

                                  <div className="caja-grid-2" style={{ gap: 12, marginBottom: 10 }}>
                                    <div>
                                      <p className="caja-field-label" style={{ marginBottom: 4 }}>Métodos de pago</p>
                                      {detalle.resumenPagos.length === 0 ? (
                                        <p className="caja-detail-note">Sin cobros.</p>
                                      ) : (
                                        <ul style={{ margin: 0, paddingLeft: 16, fontSize: 11, color: 'var(--text-secondary)' }}>
                                          {detalle.resumenPagos.map((p, i) => (
                                            <li key={i}>{p.nombre}: {money(p.total)} ({p.cuentas})</li>
                                          ))}
                                        </ul>
                                      )}
                                    </div>
                                    <div>
                                      <p className="caja-field-label" style={{ marginBottom: 4 }}>Meseros</p>
                                      {detalle.resumenMeseros.length === 0 ? (
                                        <p className="caja-detail-note">Sin cobros por mesero.</p>
                                      ) : (
                                        <ul style={{ margin: 0, paddingLeft: 16, fontSize: 11, color: 'var(--text-secondary)' }}>
                                          {detalle.resumenMeseros.map((m, i) => (
                                            <li key={i}>{m.nombre}: {money(m.total)} ({m.cuentas})</li>
                                          ))}
                                        </ul>
                                      )}
                                    </div>
                                  </div>

                                  <p className="caja-field-label" style={{ marginBottom: 4 }}>
                                    Movimientos ({detalle.movimientos.length})
                                  </p>
                                  {detalle.movimientos.length === 0 ? (
                                    <p className="caja-detail-note">Sin movimientos registrados.</p>
                                  ) : (
                                    <ul style={{ margin: 0, paddingLeft: 16, fontSize: 11, color: 'var(--text-secondary)' }}>
                                      {detalle.movimientos.map((m) => (
                                        <li key={m.id}>
                                          {fmtFecha(m.fecha)} — {m.tipo === 'entrada' ? 'Entrada' : 'Salida'} {money(m.monto)} — {m.motivo}
                                          {m.usuario ? ` (${m.usuario.name})` : ''}
                                          {m.reversoDeId ? ` [reversión de #${m.reversoDeId}]` : ''}
                                        </li>
                                      ))}
                                    </ul>
                                  )}

                                  <div className="caja-detail-actions">
                                    <button className="caja-btn-sm solid" onClick={() => abrirReporte(detalle.id)}>
                                      <span className="material-symbols-outlined" style={{ fontSize: 15, verticalAlign: 'middle', marginRight: 4 }}>
                                        print
                                      </span>
                                      Ver reporte completo
                                    </button>
                                  </div>
                                </div>
                              ) : (
                                <div className="caja-detail">
                                  <p style={{ fontSize: 12, color: 'var(--text-muted)', margin: 0 }}>Sin detalle.</p>
                                </div>
                              )}
                            </td>
                          </tr>
                        )}
                      </Fragment>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          {historial && historial.totalPages > 1 && (
            <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 8, marginTop: 14 }}>
              <button
                className="caja-btn-sm"
                onClick={() => setFiltros((f) => ({ ...f, page: Math.max(1, f.page - 1) }))}
                disabled={filtros.page <= 1}
              >
                Anterior
              </button>
              <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                Página {filtros.page} de {historial.totalPages}
              </span>
              <button
                className="caja-btn-sm"
                onClick={() => setFiltros((f) => ({ ...f, page: Math.min(historial.totalPages, f.page + 1) }))}
                disabled={filtros.page >= historial.totalPages}
              >
                Siguiente
              </button>
            </div>
          )}
        </div>
      )}

      {/* Modal: movimiento */}
      <ModalSheet isOpen={movOpen} onClose={cerrarMovModal} title={movReversoDe ? 'Revertir movimiento' : 'Registrar movimiento de efectivo'}>
        {movOriginal ? (
          <>
            <div className="caja-alert" style={{ marginBottom: 14 }}>
              Vas a revertir el movimiento <b>#{movOriginal.id}</b> (
              {movOriginal.tipo === 'entrada' ? 'entrada' : 'salida'} de <b>{money(movOriginal.monto)}</b>). Se
              registrará automáticamente una <b>{movTipo === 'entrada' ? 'entrada' : 'salida'}</b> por el mismo monto.
              El original quedará marcado como <b>revertido</b> y su efecto en caja se cancela.
            </div>
            <div className="caja-reverse-box">
              <div>
                <span>Tipo de la reversión</span>
                <b>{movTipo === 'entrada' ? 'Entrada de efectivo' : 'Salida de efectivo'}</b>
              </div>
              <div>
                <span>Monto</span>
                <b>{money(movOriginal.monto)}</b>
              </div>
            </div>
          </>
        ) : (
          <>
            <div className="form-field">
              <label>Tipo</label>
              <select value={movTipo} onChange={(e) => setMovTipo(e.target.value as 'entrada' | 'salida')}>
                <option value="entrada">Entrada de efectivo</option>
                <option value="salida">Salida de efectivo</option>
              </select>
            </div>
            <div className="form-field">
              <label>Monto</label>
              <MoneyInput value={movMonto} onChange={setMovMonto} placeholder="0" autoFocus />
              {movTipo === 'salida' && (
                <p className={`caja-money-hint ${salidaExcedida ? 'invalid' : ''}`}>
                  {salidaExcedida
                    ? `Solo hay ${money(esperado)} disponible en caja. Registra primero una entrada de efectivo.`
                    : <>Disponible en caja: <b>{money(esperado)}</b></>}
                </p>
              )}
            </div>
          </>
        )}
        <div className="form-field">
          <label>Motivo (mínimo 5 caracteres)</label>
          <input
            value={movMotivo}
            onChange={(e) => setMovMotivo(e.target.value)}
            maxLength={200}
            placeholder="Pago a proveedor, retiro, fondo…"
          />
        </div>
        <div className="modal-actions">
          <button className="btn-cancel" onClick={cerrarMovModal} disabled={movBusy}>Cancelar</button>
          <button
            className="btn-primary"
            onClick={agregarMovimiento}
            disabled={movBusy || movMonto.trim() === '' || movMotivo.trim().length < 5 || salidaExcedida}
          >
            {movBusy ? 'Registrando…' : movOriginal ? 'Confirmar reversión' : 'Registrar'}
          </button>
        </div>
      </ModalSheet>

      {/* Modal: cierre */}
      <ModalSheet isOpen={cerrarOpen} onClose={() => { if (!cerrando) setCerrarOpen(false); }} title="Cerrar caja">
        {turno && (
          <>
            <div style={{ background: 'var(--bg)', borderRadius: 'var(--radius)', padding: 14, marginBottom: 16 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, marginBottom: 6 }}>
                <span style={{ color: 'var(--text-secondary)' }}>Monto inicial</span><b>{money(turno.montoInicial)}</b>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, marginBottom: 6 }}>
                <span style={{ color: 'var(--text-secondary)' }}>Ventas en efectivo</span><b>{money(turno.ventasEfectivo)}</b>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, marginBottom: 6 }}>
                <span style={{ color: 'var(--text-secondary)' }}>Entradas</span><b style={{ color: 'var(--success)' }}>{money(turno.totalEntradas)}</b>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, marginBottom: 6 }}>
                <span style={{ color: 'var(--text-secondary)' }}>Salidas</span><b style={{ color: 'var(--danger)' }}>{money(turno.totalSalidas)}</b>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 14, fontWeight: 800, borderTop: '1px solid var(--border)', paddingTop: 8 }}>
                <span>Efectivo esperado</span><span style={{ color: 'var(--primary)' }}>{money(esperado)}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, color: 'var(--text-muted)', marginTop: 8 }}>
                <span>Ventas totales ({turno.cantidadFacturas} facturas)</span><span>{money(turno.totalVentas)}</span>
              </div>
            </div>

            {turno.pedidosAbiertos != null && turno.pedidosAbiertos > 0 && (
              <div className="caja-alert" style={{ marginBottom: 12 }}>
                Hay {turno.pedidosAbiertos} pedido(s) abierto(s) que no quedarán incluidos en este turno.
              </div>
            )}

            <div className="form-field">
              <label>Efectivo contado</label>
              <MoneyInput value={contado} onChange={setContado} placeholder="0" />
            </div>

            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                padding: '10px 12px',
                background: 'var(--bg)',
                borderRadius: 'var(--radius)',
                marginBottom: 16,
              }}
            >
              <span style={{ fontSize: 13, fontWeight: 600 }}>Diferencia:</span>
              <span
                style={{
                  fontSize: 15,
                  fontWeight: 800,
                  color: diferencia == null ? 'var(--text-muted)' : diferencia < 0 ? 'var(--danger)' : diferencia > 0 ? 'var(--success)' : 'var(--text-muted)',
                }}
              >
                {diferencia != null
                  ? `${diferencia < 0 ? 'Faltante' : diferencia > 0 ? 'Sobrante' : 'Cuadra'} · ${money(diferencia)}`
                  : '—'}
              </span>
            </div>

            {motivoObligatorio && <MotivoObligatorio motivo={motivoDiferencia} setMotivo={setMotivoDiferencia} />}

            <div className="form-field">
              <label>Notas (opcional)</label>
              <input value={notas} onChange={(e) => setNotas(e.target.value)} maxLength={300} placeholder="Observaciones del turno" />
            </div>

            <div className="modal-actions">
              <button className="btn-cancel" onClick={() => setCerrarOpen(false)} disabled={cerrando}>Cancelar</button>
              <button className="btn-primary" onClick={cerrarCaja} disabled={cerrando || !cierreValido}>
                {cerrando ? 'Cerrando…' : 'Confirmar cierre'}
              </button>
            </div>
          </>
        )}
      </ModalSheet>
    </>
  );
}
