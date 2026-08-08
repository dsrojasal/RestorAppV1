'use client';

import { useState, useEffect, useRef } from 'react';
import ModalSheet from '@/components/ModalSheet';
import ContextMenu, { ContextMenuRef } from '@/components/ContextMenu';
import { getAuthHeaders, handleApiError } from '@/lib/api';

interface Producto {
  id: number;
  nombre: string;
  tipo: string;
  stock: number;
  stockMinimo: number;
  isActive: boolean;
}

interface Ingrediente {
  id: number;
  nombre: string;
  stock: number;
  stockMinimo: number;
  unidad: string;
}

interface EntradaStock {
  id: number;
  stockAntes: number;
  cantidad: number;
  stockDespues: number;
  fecha: string;
  producto?: { id: number; nombre: string } | null;
  ingrediente?: { id: number; nombre: string } | null;
  usuario?: { id: number; name: string } | null;
}

type Target = { tipo: 'producto' | 'ingrediente'; id: number; nombre: string; stock: number };

const TABS = [
  { id: 'insumos', label: 'Insumos' },
  { id: 'contables', label: 'Contables' },
  { id: 'entradas', label: 'Entradas' },
];

export default function InventarioPage() {
  const [productos, setProductos] = useState<Producto[]>([]);
  const [ingredientes, setIngredientes] = useState<Ingrediente[]>([]);
  const [entradas, setEntradas] = useState<EntradaStock[]>([]);
  const [tab, setTab] = useState('insumos');
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [entradaTarget, setEntradaTarget] = useState<Target | null>(null);
  const [error, setError] = useState('');
  const menuRef = useRef<ContextMenuRef>(null);

  const load = async () => {
    try {
      setLoading(true);
      const [resP, resI] = await Promise.all([
        fetch('/api/backend/productos', { headers: getAuthHeaders() }),
        fetch('/api/backend/ingredientes', { headers: getAuthHeaders() }),
      ]);
      if (resP.status === 401 || resI.status === 401) {
        window.location.href = '/login';
        return;
      }
      if (!resP.ok || !resI.ok) {
        alert('Error al cargar el inventario');
        return;
      }
      const [datosP, datosI] = await Promise.all([resP.json(), resI.json()]);
      setProductos(Array.isArray(datosP) ? datosP : []);
      setIngredientes(Array.isArray(datosI) ? datosI : []);
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
  const esBajo = (stock: number, stockMinimo: number) => stock === 0 || (stockMinimo > 0 && stock <= stockMinimo);
  const enStockBajo = [...ingredientes.filter((i) => esBajo(i.stock, i.stockMinimo)), ...contables.filter((p) => esBajo(p.stock, p.stockMinimo))].length;

  const query = search.toLowerCase();
  const filteredIns = ingredientes.filter((i) => !query || i.nombre.toLowerCase().includes(query));
  const filteredCont = contables.filter((p) => !query || p.nombre.toLowerCase().includes(query));
  const filteredEnt = entradas.filter(
    (e) => !query || (e.producto?.nombre || e.ingrediente?.nombre || '').toLowerCase().includes(query),
  );

  function openEntrada(t: Target) {
    setEntradaTarget(t);
    setError('');
  }

  async function registrarEntrada(e: React.FormEvent) {
    e.preventDefault();
    if (!entradaTarget) return;
    const cantidad = parseInt((document.getElementById('entrada-cantidad') as HTMLInputElement).value || '0', 10) || 0;
    if (cantidad <= 0) {
      alert('La cantidad debe ser mayor a 0');
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
    return d.toLocaleString('es-ES', { year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' });
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
                          <span className="status-text" style={{ color: 'var(--text-muted)' }}>Stock: <b>{i.stock}</b> {unidades}{i.stockMinimo > 0 ? ` · mín ${i.stockMinimo}` : ''}</span>
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
                          <span className="status-text" style={{ color: 'var(--text-muted)' }}>Stock: <b>{p.stock}</b> und{p.stockMinimo > 0 ? ` · mín ${p.stockMinimo}` : ''}</span>
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
                    {filteredEnt.map((e) => (
                      <tr key={e.id}>
                        <td style={{ color: 'var(--text-secondary)', whiteSpace: 'nowrap' }}>{formatFecha(e.fecha)}</td>
                        <td>{e.producto?.nombre || e.ingrediente?.nombre || '-'}</td>
                        <td style={{ textAlign: 'right', color: 'var(--text-secondary)' }}>{e.stockAntes}</td>
                        <td style={{ textAlign: 'right', fontWeight: 700, color: 'var(--success)' }}>+{e.cantidad}</td>
                        <td style={{ textAlign: 'right', fontWeight: 700, color: 'var(--primary-dark)' }}>{e.stockDespues}</td>
                        <td style={{ color: 'var(--text-secondary)' }}>{e.usuario?.name || '-'}</td>
                      </tr>
                    ))}
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
            <input type="text" value={entradaTarget ? `${entradaTarget.stock} und (en vivo)` : ''} readOnly style={{ background: 'var(--bg)', color: 'var(--text-secondary)' }} />
          </div>
          <div className="form-field">
            <label htmlFor="entrada-cantidad">Cantidad que llegó</label>
            <input id="entrada-cantidad" placeholder="Ej. 40" type="number" min="1" step="1" autoFocus required />
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