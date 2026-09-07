'use client';

import { useState, useEffect, useRef } from 'react';
import ModalSheet from '@/components/ModalSheet';
import ContextMenu, { ContextMenuRef } from '@/components/ContextMenu';
import { getAuthHeaders, handleApiError } from '@/lib/api';
import { fmtCant, fmtCantCon, parsearValor } from '@/lib/unidades';

interface Producto {
  id: number;
  nombre: string;
  tipo: string;
  stock: number;
  stockMinimo: number;
  stockMinimoUnidad?: string | null;
  isActive: boolean;
}

interface Ingrediente {
  id: number;
  nombre: string;
  stock: number;
  stockMinimo: number;
  stockMinimoUnidad?: string | null;
  unidad: string;
}

interface EntradaStock {
  id: number;
  stockAntes: number;
  cantidad: number;
  stockDespues: number;
  fecha: string;
  productoId?: number | null;
  ingredienteId?: number | null;
  producto?: { id: number; nombre: string } | null;
  ingrediente?: { id: number; nombre: string } | null;
  usuario?: { id: number; name: string } | null;
}

interface DisponibilidadItem {
  productoId: number;
  nombre: string;
  tipo: string;
  disponible: number | null;
  motivo: string | null;
  tieneReceta: boolean;
}

interface RecetaInsumo {
  ingredienteId: number;
  nombre: string;
  unidad: string;
  cantidad: number;
}

interface RecetaDetail {
  productoId: number;
  producto: string;
  tipo: string;
  insumos: RecetaInsumo[];
}

type Target = { tipo: 'producto' | 'ingrediente'; id: number; nombre: string; stock: number };

const TABS = [
  { id: 'insumos', label: 'Insumos' },
  { id: 'contables', label: 'Contables' },
  { id: 'recetas', label: 'Recetas' },
  { id: 'entradas', label: 'Entradas' },
];

export default function InventarioPage() {
  const [productos, setProductos] = useState<Producto[]>([]);
  const [ingredientes, setIngredientes] = useState<Ingrediente[]>([]);
  const [entradas, setEntradas] = useState<EntradaStock[]>([]);
  const [disponibilidad, setDisponibilidad] = useState<DisponibilidadItem[]>([]);
  const [me, setMe] = useState<{ id: number; rolId: number } | null>(null);
  const [tab, setTab] = useState('insumos');
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [entradaTarget, setEntradaTarget] = useState<Target | null>(null);
  const [recetaDetail, setRecetaDetail] = useState<RecetaDetail | null>(null);
  const [recetaDraft, setRecetaDraft] = useState<Omit<RecetaInsumo, 'nombre' | 'unidad'>[]>([]);
  const [error, setError] = useState('');
  const menuRef = useRef<ContextMenuRef>(null);

  const load = async () => {
    try {
      setLoading(true);
      const [resP, resI, resD, resMe] = await Promise.all([
        fetch('/api/backend/productos', { headers: getAuthHeaders() }),
        fetch('/api/backend/ingredientes', { headers: getAuthHeaders() }),
        fetch('/api/backend/recetas/disponibilidad', { headers: getAuthHeaders() }),
        fetch('/api/backend/usuarios/me', { headers: getAuthHeaders() }),
      ]);
      if (resP.status === 401 || resI.status === 401) {
        window.location.href = '/login';
        return;
      }
      if (!resP.ok || !resI.ok) {
        alert('Error al cargar el inventario');
        return;
      }
      const [datosP, datosI, datosD, datosMe] = await Promise.all([resP.json(), resI.json(), resD.json(), resMe.json()]);
      setProductos(Array.isArray(datosP) ? datosP : []);
      setIngredientes(Array.isArray(datosI) ? datosI : []);
      setDisponibilidad(Array.isArray(datosD) ? datosD : []);
      if (datosMe?.id) setMe({ id: datosMe.id, rolId: datosMe.rolId });
    } catch {
      alert('Error de conexión');
    } finally {
      setLoading(false);
    }
  };

  const loadEntradas = async () => {
    try {
      const res = await fetch('/api/backend/entradas-stock', { headers: getAuthHeaders() });
      if (res.status === 401) {
        window.location.href = '/login';
        return;
      }
      if (!res.ok) {
        alert('Error al cargar las entradas');
        return;
      }
      const data = await res.json();
      setEntradas(Array.isArray(data) ? data : []);
    } catch {
      alert('Error de conexión');
    }
  };

  useEffect(() => {
    load();
  }, []);

  useEffect(() => {
    if (tab === 'entradas') loadEntradas();
  }, [tab]);

  const contables = productos.filter((p) => p.tipo !== 'plato');
  const platos = productos.filter((p) => p.tipo === 'plato');
  const esBajo = (stock: number, stockMinimo: number) => stock === 0 || (stockMinimo > 0 && stock <= stockMinimo);
  const enStockBajo = [...ingredientes.filter((i) => esBajo(i.stock, i.stockMinimo)), ...contables.filter((p) => esBajo(p.stock, p.stockMinimo))].length;
  const unidadDeTarget = (t: Target): string =>
    t.tipo === 'ingrediente' ? ingredientes.find((x) => x.id === t.id)?.unidad ?? 'und' : 'und';

  const query = search.toLowerCase();
  const filteredIns = ingredientes.filter((i) => !query || i.nombre.toLowerCase().includes(query));
  const filteredCont = contables.filter((p) => !query || p.nombre.toLowerCase().includes(query));
  const filteredRec = platos.filter((p) => !query || p.nombre.toLowerCase().includes(query));
  const filteredEnt = entradas.filter(
    (e) => !query || (e.producto?.nombre || e.ingrediente?.nombre || '').toLowerCase().includes(query),
  );

  const esAdmin = !!me && me.rolId === 1;

  function openEntrada(t: Target) {
    setEntradaTarget(t);
    setError('');
  }

  async function openReceta(productoId: number) {
    try {
      const res = await fetch(`/api/backend/recetas/${productoId}`, { headers: getAuthHeaders() });
      if (!res.ok) {
        const err = await handleApiError(res);
        alert(err.message || 'No se pudo cargar la receta');
        return;
      }
      const data: RecetaDetail = await res.json();
      setRecetaDetail(data);
      setRecetaDraft(data.insumos.map((i) => ({ ingredienteId: i.ingredienteId, cantidad: i.cantidad })));
      setError('');
    } catch {
      alert('Error de conexión');
    }
  }

  async function saveReceta() {
    if (!recetaDetail) return;
    const insumos = recetaDraft
      .filter((i) => i.ingredienteId > 0 && Number(i.cantidad) > 0)
      .map((i) => ({ ingredienteId: i.ingredienteId, cantidad: Number(i.cantidad) }));
    if (insumos.length === 0) {
      alert('Agrega al menos un insumo con cantidad mayor a 0');
      return;
    }
    try {
      const res = await fetch(`/api/backend/recetas/${recetaDetail.productoId}`, {
        method: 'PUT',
        headers: getAuthHeaders(),
        body: JSON.stringify({ insumos }),
      });
      if (!res.ok) {
        const err = await handleApiError(res);
        alert(err.message || 'No se pudo guardar la receta');
        return;
      }
      setRecetaDetail(null);
      await load();
    } catch {
      alert('Error de conexión');
    }
  }

  async function deleteReceta() {
    if (!recetaDetail) return;
    if (!confirm(`¿Eliminar la receta de ${recetaDetail.producto}?`)) return;
    try {
      const res = await fetch(`/api/backend/recetas/${recetaDetail.productoId}`, {
        method: 'DELETE',
        headers: getAuthHeaders(),
      });
      if (!res.ok) {
        const err = await handleApiError(res);
        alert(err.message || 'No se pudo eliminar la receta');
        return;
      }
      setRecetaDetail(null);
      await load();
    } catch {
      alert('Error de conexión');
    }
  }

  async function registrarEntrada(e: React.FormEvent) {
    e.preventDefault();
    if (!entradaTarget) return;
    setError('');
    const base = unidadDeTarget(entradaTarget);
    const parseo = parsearValor((document.getElementById('entrada-cantidad') as HTMLInputElement).value, base);
    if (!parseo.ok) {
      setError(`Cantidad: ${parseo.error}`);
      return;
    }
    const cantidad = parseo.valorBase ?? 0;
    if (cantidad <= 0) {
      setError('La cantidad debe ser mayor a 0');
      return;
    }
    const body =
      entradaTarget.tipo === 'producto'
        ? { productoId: entradaTarget.id, cantidad }
        : { ingredienteId: entradaTarget.id, cantidad };

    try {
      const res = await fetch('/api/backend/entradas-stock', {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify(body),
      });
      if (!res.ok) {
        const err = await handleApiError(res);
        alert(err.message || 'No se pudo registrar la entrada');
        return;
      }
      setEntradaTarget(null);
      load();
      if (tab === 'entradas') loadEntradas();
    } catch {
      alert('Error de conexión');
    }
  }

  const formatFecha = (iso: string) => {
    if (!iso) return '';
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return iso;
    return d.toLocaleString('es-CO', { year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', timeZone: 'America/Bogota' });
  };

  return (
    <>
      <div className="animate-in">
        <h2 className="page-title">Inventario</h2>
        <p className="page-subtitle">Control de insumos y productos disponibles.</p>
      </div>

      <div className="stats-grid animate-in animate-in-delay-1">
        <div className="stat-card">
          <p className="stat-label">Insumos</p>
          <div className="stat-value">
            <span>{ingredientes.length}</span>
            <span className="material-symbols-outlined" style={{ color: 'var(--primary)', fontVariationSettings: "'FILL' 1" }}>egg_alt</span>
          </div>
        </div>
        <div className="stat-card">
          <p className="stat-label">Contables</p>
          <div className="stat-value green">
            <span>{contables.length}</span>
            <span className="material-symbols-outlined" style={{ color: 'var(--primary)', fontVariationSettings: "'FILL' 1" }}>inventory_2</span>
          </div>
        </div>
        <div className="stat-card">
          <p className="stat-label">En stock bajo</p>
          <div className="stat-value orange">
            <span>{enStockBajo}</span>
            <span className="material-symbols-outlined" style={{ color: '#F1C40F', fontVariationSettings: "'FILL' 1" }}>warning</span>
          </div>
        </div>
      </div>

      <div className="segment-control animate-in animate-in-delay-1">
        {TABS.map((t) => (
          <div
            key={t.id}
            className={`segment-option ${tab === t.id ? 'active' : ''}`}
            onClick={() => setTab(t.id)}
          >
            {t.label}
          </div>
        ))}
      </div>

      <div className="search-wrap animate-in animate-in-delay-2">
        <div style={{
          flex: 1, display: 'flex', alignItems: 'center', background: 'var(--bg-card)',
          border: '1.5px solid var(--border)', borderRadius: 'var(--radius-lg)',
          padding: '0 16px', transition: 'all var(--transition)',
        }}>
          <span className="material-symbols-outlined" style={{ color: 'var(--text-muted)', fontSize: 20, marginRight: 12, flexShrink: 0 }}>search</span>
          <input
            className="search-input"
            style={{ flex: 1, border: 'none', outline: 'none', padding: '14px 0', fontSize: 14, color: 'var(--text)', background: 'transparent', fontFamily: 'inherit' }}
            placeholder={tab === 'entradas' ? 'Buscar en el historial...' : 'Buscar por nombre...'}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
      </div>

      <div className="animate-in animate-in-delay-2">
        {loading ? (
          <p style={{ color: 'var(--text-muted)', padding: '24px 0', textAlign: 'center' }}>Cargando...</p>
        ) : tab === 'insumos' ? (
          <>
            <p className="list-label">Ingredientes e insumos</p>
            {filteredIns.length === 0 ? (
              <div className="card-data" style={{ textAlign: 'center', padding: '40px 24px' }}>
                <span className="material-symbols-outlined" style={{ fontSize: 48, color: 'var(--text-muted)' }}>egg_alt</span>
                <p style={{ color: 'var(--text-muted)' }}>Sin insumos registrados.</p>
              </div>
            ) : (
              <div className="flex flex-col gap-3">
                {filteredIns.map((i) => {
                  const bajo = esBajo(i.stock, i.stockMinimo);
                  const unidades = i.unidad || 'und';
                  return (
                    <div key={i.id} className="user-card">
                      <div className="user-avatar">
                        <span className="material-symbols-outlined">egg_alt</span>
                      </div>
                      <div className="user-info">
                        <span className="user-name">{i.nombre}</span>
                        <p className="user-email">{unidades}</p>
                        <div className="user-meta" style={{ display: 'flex', flexWrap: 'wrap', gap: 10 }}>
                          <span className="status-text" style={{ color: 'var(--text-muted)' }}>
                            Stock: <b>{fmtCant(i.stock, unidades)}</b>
                            {i.stockMinimo > 0 ? ` · mín ${fmtCantCon(i.stockMinimo, unidades, i.stockMinimoUnidad)}` : ''}
                          </span>
                          {bajo ? (
                            <span className="role-badge chef" style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                              <span className="material-symbols-outlined" style={{ fontSize: 13 }}>warning</span> Stock bajo
                            </span>
                          ) : (
                            <span className="role-badge admin" style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                              <span className="material-symbols-outlined" style={{ fontSize: 13 }}>check</span> OK
                            </span>
                          )}
                        </div>
                      </div>
                      <div className="user-action" style={{ position: 'relative' }} onClick={(e) => menuRef.current?.open(e, i.id)}>
                        <span className="material-symbols-outlined">more_vert</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </>
        ) : tab === 'contables' ? (
          <>
            <p className="list-label">Productos contables (se compran hechos)</p>
            {filteredCont.length === 0 ? (
              <div className="card-data" style={{ textAlign: 'center', padding: '40px 24px' }}>
                <span className="material-symbols-outlined" style={{ fontSize: 48, color: 'var(--text-muted)' }}>inventory_2</span>
                <p style={{ color: 'var(--text-muted)' }}>No hay productos contables. Crea desde Carta un tipo Bebida, Postre u Otro.</p>
              </div>
            ) : (
              <div className="flex flex-col gap-3">
                {filteredCont.map((p) => {
                  const bajo = esBajo(p.stock, p.stockMinimo);
                  return (
                    <div key={p.id} className="user-card">
                      <div className="user-avatar">
                        <span className="material-symbols-outlined">{p.tipo === 'bebida' ? 'local_bar' : p.tipo === 'postre' ? 'icecream' : 'inventory_2'}</span>
                      </div>
                      <div className="user-info">
                        <span className="user-name">{p.nombre}</span>
                        <p className="user-email">{p.tipo === 'bebida' ? 'Bebida' : p.tipo === 'postre' ? 'Postre / Helado' : 'Otro'}</p>
                        <div className="user-meta" style={{ display: 'flex', flexWrap: 'wrap', gap: 10 }}>
                          <span className="status-text" style={{ color: 'var(--text-muted)' }}>
                            Stock: <b>{fmtCant(p.stock, 'und')}</b>
                            {p.stockMinimo > 0 ? ` · mín ${fmtCantCon(p.stockMinimo, 'und', p.stockMinimoUnidad)}` : ''}
                          </span>
                          {bajo ? (
                            <span className="role-badge chef" style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                              <span className="material-symbols-outlined" style={{ fontSize: 13 }}>warning</span> Stock bajo
                            </span>
                          ) : (
                            <span className="role-badge admin" style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                              <span className="material-symbols-outlined" style={{ fontSize: 13 }}>check</span> OK
                            </span>
                          )}
                        </div>
                      </div>
                      <div className="user-action" style={{ position: 'relative' }} onClick={(e) => menuRef.current?.open(e, p.id)}>
                        <span className="material-symbols-outlined">more_vert</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </>
        ) : tab === 'recetas' ? (
          <>
            <p className="list-label">Platos y sus recetas</p>
            {filteredRec.length === 0 ? (
              <div className="card-data" style={{ textAlign: 'center', padding: '40px 24px' }}>
                <span className="material-symbols-outlined" style={{ fontSize: 48, color: 'var(--text-muted)' }}>lunch_dining</span>
                <p style={{ color: 'var(--text-muted)' }}>No hay platos registrados.</p>
              </div>
            ) : (
              <div className="flex flex-col gap-3">
                {filteredRec.map((p) => {
                  const disp = disponibilidad.find((d) => d.productoId === p.id);
                  const sinLimite = disp?.tieneReceta === false || disp?.disponible == null;
                  const agotado = !sinLimite && (disp?.disponible ?? 0) <= 0;
                  return (
                    <div key={p.id} className="user-card">
                      <div className="user-avatar">
                        <span className="material-symbols-outlined">lunch_dining</span>
                      </div>
                      <div className="user-info">
                        <span className="user-name">{p.nombre}</span>
                        <p className="user-email">{disp?.tieneReceta ? 'Plato con receta' : 'Plato · Sin receta (venta libre)'}</p>
                        <div className="user-meta" style={{ display: 'flex', flexWrap: 'wrap', gap: 10 }}>
                          {sinLimite ? (
                            <span className="role-badge admin" style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                              <span className="material-symbols-outlined" style={{ fontSize: 13 }}>all_inclusive</span> Sin límite
                            </span>
                          ) : agotado ? (
                            <span className="role-badge chef" style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                              <span className="material-symbols-outlined" style={{ fontSize: 13 }}>warning</span> Agotado
                            </span>
                          ) : (
                            <span className="role-badge admin" style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                              <span className="material-symbols-outlined" style={{ fontSize: 13 }}>check</span> Disponible: {disp?.disponible}
                            </span>
                          )}
                          {!sinLimite && disp?.motivo && (
                            <span className="status-text" style={{ color: 'var(--text-muted)', fontSize: 12 }}>{disp.motivo}</span>
                          )}
                        </div>
                      </div>
                      <button className="user-action" title="Ver / editar receta" onClick={() => openReceta(p.id)}>
                        <span className="material-symbols-outlined">{esAdmin ? 'menu_book' : 'visibility'}</span>
                      </button>
                    </div>
                  );
                })}
              </div>
            )}
          </>
        ) : (
          <>
            <p className="list-label">Historial de entradas de stock</p>
            {filteredEnt.length === 0 ? (
              <div className="card-data" style={{ textAlign: 'center', padding: '40px 24px' }}>
                <span className="material-symbols-outlined" style={{ fontSize: 48, color: 'var(--text-muted)' }}>history</span>
                <p style={{ color: 'var(--text-muted)' }}>Sin entradas registradas. Usa el menú ⋮ de un insumo o contable para registrar una.</p>
              </div>
            ) : (
              <div className="table-wrap">
                <table>
                  <thead>
                    <tr>
                      <th>Fecha</th>
                      <th>Ítem</th>
                      <th style={{ textAlign: 'right' }}>Antes</th>
                      <th style={{ textAlign: 'right' }}>Cantidad</th>
                      <th style={{ textAlign: 'right' }}>Después</th>
                      <th>Quién</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredEnt.map((e) => {
                      const unidadE =
                        e.ingredienteId != null
                          ? ingredientes.find((x) => x.id === e.ingredienteId)?.unidad ?? 'und'
                          : 'und';
                      return (
                        <tr key={e.id}>
                          <td style={{ color: 'var(--text-secondary)', whiteSpace: 'nowrap' }}>{formatFecha(e.fecha)}</td>
                          <td>{e.producto?.nombre || e.ingrediente?.nombre || '-'}</td>
                          <td style={{ textAlign: 'right', color: 'var(--text-secondary)' }}>{fmtCant(e.stockAntes, unidadE)}</td>
                          <td style={{ textAlign: 'right', fontWeight: 700, color: 'var(--success)' }}>+{fmtCant(e.cantidad, unidadE)}</td>
                          <td style={{ textAlign: 'right', fontWeight: 700, color: 'var(--primary-dark)' }}>{fmtCant(e.stockDespues, unidadE)}</td>
                          <td style={{ color: 'var(--text-secondary)' }}>{e.usuario?.name || '-'}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </>
        )}
      </div>

      <ModalSheet
        isOpen={entradaTarget !== null}
        onClose={() => setEntradaTarget(null)}
        title="Registrar entrada de stock"
      >
        <form onSubmit={registrarEntrada}>
          {error && <p style={{ color: '#BA1A1A', fontSize: 13, marginBottom: 12 }}>{error}</p>}
          <div className="form-field">
            <label>Ítem</label>
            <input type="text" value={entradaTarget?.nombre || ''} readOnly style={{ background: 'var(--bg)', color: 'var(--text-secondary)' }} />
          </div>
          <div className="form-field">
            <label>Stock actual</label>
            <input
              type="text"
              value={entradaTarget ? `${fmtCant(entradaTarget.stock, unidadDeTarget(entradaTarget))} (en vivo)` : ''}
              readOnly
              style={{ background: 'var(--bg)', color: 'var(--text-secondary)' }}
            />
          </div>
          <div className="form-field">
            <label htmlFor="entrada-cantidad">Cantidad que llegó</label>
            <input id="entrada-cantidad" placeholder={`Ej. 5 (${entradaTarget ? unidadDeTarget(entradaTarget) : 'und'}) — también 500 g o 0.5`} type="text" autoFocus required />
          </div>
          <p style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 12 }}>
            El sistema calcula y guarda la fecha, el stock anterior y el stock resultante automáticamente.
          </p>
          <div className="modal-actions">
            <button className="btn-cancel" type="button" onClick={() => setEntradaTarget(null)}>Cancelar</button>
            <button className="btn-primary" type="submit">Registrar Entrada</button>
          </div>
        </form>
      </ModalSheet>

      <ModalSheet
        isOpen={recetaDetail !== null}
        onClose={() => setRecetaDetail(null)}
        title={recetaDetail ? `Receta: ${recetaDetail.producto}` : 'Receta'}
      >
        {recetaDetail && (
          <div>
            {esAdmin ? (
              <>
                <p style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 12 }}>
                  Define cuánto de cada insumo consume este plato. Con receta se descuenta del inventario al estar listo.
                </p>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 12 }}>
                  {recetaDraft.map((item, idx) => (
                    <div key={idx} style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                      <select
                        value={item.ingredienteId}
                        onChange={(e) => {
                          const draft = [...recetaDraft];
                          draft[idx] = { ...draft[idx], ingredienteId: Number(e.target.value) };
                          setRecetaDraft(draft);
                        }}
                        style={{ flex: 1, padding: '10px 12px', background: 'var(--bg)', border: '1.5px solid var(--border)', borderRadius: 'var(--radius)', fontSize: 13, color: 'var(--text)', outline: 'none' }}
                      >
                        <option value={0}>Selecciona insumo...</option>
                        {ingredientes.map((ing) => (
                          <option key={ing.id} value={ing.id}>{ing.nombre} ({ing.unidad})</option>
                        ))}
                      </select>
                      <input
                        type="number"
                        step="0.001"
                        min="0.001"
                        value={item.cantidad}
                        onChange={(e) => {
                          const draft = [...recetaDraft];
                          draft[idx] = { ...draft[idx], cantidad: Number(e.target.value) };
                          setRecetaDraft(draft);
                        }}
                        placeholder="Cantidad"
                        style={{ width: 90, padding: '10px 12px', background: 'var(--bg)', border: '1.5px solid var(--border)', borderRadius: 'var(--radius)', fontSize: 13, color: 'var(--text)', outline: 'none' }}
                      />
                      <button className="user-action" title="Quitar insumo" onClick={() => setRecetaDraft((prev) => prev.filter((_, i) => i !== idx))}>
                        <span className="material-symbols-outlined" style={{ fontSize: 18, color: '#E74C3C' }}>close</span>
                      </button>
                    </div>
                  ))}
                </div>
                <button
                  onClick={() => setRecetaDraft((prev) => [...prev, { ingredienteId: 0, cantidad: 0 }])}
                  style={{ display: 'flex', alignItems: 'center', gap: 6, border: 'none', background: 'none', cursor: 'pointer', color: 'var(--primary)', fontWeight: 700, fontSize: 13, marginBottom: 12 }}
                >
                  <span className="material-symbols-outlined" style={{ fontSize: 18 }}>add</span> Agregar insumo
                </button>
                <div className="modal-actions" style={{ marginTop: 8 }}>
                  <button className="btn-cancel" onClick={() => setRecetaDetail(null)}>Cancelar</button>
                  <button className="btn-primary" onClick={saveReceta}>Guardar receta</button>
                </div>
                <button onClick={deleteReceta} style={{ display: 'flex', alignItems: 'center', gap: 6, border: 'none', background: 'none', cursor: 'pointer', color: '#E74C3C', fontWeight: 700, fontSize: 13, width: '100%', justifyContent: 'center', marginTop: 16 }}>
                  <span className="material-symbols-outlined" style={{ fontSize: 18 }}>delete</span> Eliminar receta (venta libre)
                </button>
              </>
            ) : (
              <>
                <p style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 12 }}>
                  Insumos que consume este plato al estar listo:
                </p>
                {recetaDetail.insumos.length === 0 ? (
                  <p style={{ fontSize: 13, color: 'var(--text-muted)', textAlign: 'center', padding: '12px 0' }}>
                    Sin receta definida — se vende sin límite.
                  </p>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 4, marginBottom: 12 }}>
                    {recetaDetail.insumos.map((i, idx) => (
                      <div key={idx} className="order-item-row" style={{ padding: '8px 0' }}>
                        <span style={{ flex: 1, fontSize: 14, color: 'var(--text)' }}>{i.nombre}</span>
                        <span className="font-bold" style={{ color: 'var(--primary)', fontSize: 14, whiteSpace: 'nowrap' }}>
                          {fmtCant(i.cantidad, i.unidad)}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
                <div className="modal-actions" style={{ marginTop: 8 }}>
                  <button className="btn-primary" onClick={() => setRecetaDetail(null)}>Cerrar</button>
                </div>
              </>
            )}
          </div>
        )}
      </ModalSheet>

      <ContextMenu
        ref={menuRef}
        items={(id) => {
          const p = contables.find((x) => x.id === id);
          const i = ingredientes.find((x) => x.id === id);
          const target: Target | null = p
            ? { tipo: 'producto', id: p.id, nombre: p.nombre, stock: p.stock }
            : i
              ? { tipo: 'ingrediente', id: i.id, nombre: i.nombre, stock: i.stock }
              : null;
          if (!target) return [];
          return [
            { icon: 'add_circle', label: 'Registrar Entrada', onClick: () => openEntrada(target) },
          ];
        }}
      />
    </>
  );
}