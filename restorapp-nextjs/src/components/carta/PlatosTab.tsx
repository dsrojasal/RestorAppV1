'use client';

import { useState, useEffect, useRef } from 'react';
import ModalSheet from '@/components/ModalSheet';
import ContextMenu, { ContextMenuRef } from '@/components/ContextMenu';
import { getAuthHeaders, handleApiError } from '@/lib/api';

interface Categoria {
  id: number;
  nombre: string;
  isActive: boolean;
}

interface Producto {
  id: number;
  nombre: string;
  precio: number;
  tipo: string;
  stock: number;
  stockMinimo: number;
  isActive: boolean;
  categoriaId: number;
  categoria?: { id: number; nombre: string };
}

const TIPO_LABELS: Record<string, string> = {
  plato: 'Plato',
  bebida: 'Bebida',
  postre: 'Postre',
  otro: 'Otro',
};

const TIPO_CLASS: Record<string, string> = {
  plato: 'admin',
  bebida: 'waiter',
  postre: 'chef',
  otro: 'cajero',
};

const TIPOS_QUE_SE_PREPARAN = ['plato'];

function requiereReceta(tipo: string): boolean {
  return TIPOS_QUE_SE_PREPARAN.includes(tipo);
}

export default function PlatosTab() {
  const [productos, setProductos] = useState<Producto[]>([]);
  const [categorias, setCategorias] = useState<Categoria[]>([]);
  const [recetaCount, setRecetaCount] = useState<Record<number, number>>({});
  const [search, setSearch] = useState('');
  const [catFilter, setCatFilter] = useState(0);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Producto | null>(null);
  const [tipoSel, setTipoSel] = useState<string>('plato');
  const [error, setError] = useState('');
  const menuRef = useRef<ContextMenuRef>(null);

  const load = async () => {
    try {
      setLoading(true);
      const [resP, resC, resR] = await Promise.all([
        fetch('/api/backend/productos', { headers: getAuthHeaders() }),
        fetch('/api/backend/categorias', { headers: getAuthHeaders() }),
        fetch('/api/backend/producto-ingrediente', { headers: getAuthHeaders() }),
      ]);
      if (resP.status === 401) {
        window.location.href = '/login';
        return;
      }
      if (!resP.ok || !resC.ok || !resR.ok) {
        alert('Error al cargar los datos de la carta');
        return;
      }
      const [datosP, datosC, datosR] = await Promise.all([resP.json(), resC.json(), resR.json()]);
      setProductos(Array.isArray(datosP) ? datosP : []);
      setCategorias(Array.isArray(datosC) ? datosC.filter((c) => c.isActive !== false) : []);
      const counts: Record<number, number> = {};
      if (Array.isArray(datosR)) {
        for (const r of datosR) {
          counts[r.productoId] = (counts[r.productoId] || 0) + 1;
        }
      }
      setRecetaCount(counts);
    } catch {
      alert('Error de conexión');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const filtered = productos.filter((p) => {
    const q = search.toLowerCase();
    const matchQ = !q || p.nombre.toLowerCase().includes(q);
    const matchC = !catFilter || p.categoriaId === catFilter;
    return matchQ && matchC;
  });

  const total = productos.length;
  const activos = productos.filter((p) => p.isActive).length;
  const bajos = productos.filter(
    (p) => !requiereReceta(p.tipo) && (p.stock === 0 || (p.stockMinimo > 0 && p.stock <= p.stockMinimo)),
  ).length;

  function openCreate() {
    setEditing(null);
    setTipoSel('plato');
    setError('');
    setModalOpen(true);
  }

  function openEdit(p: Producto) {
    setEditing(p);
    setTipoSel(p.tipo || 'plato');
    setError('');
    setModalOpen(true);
  }

  async function guardar(e: React.FormEvent) {
    e.preventDefault();
    const nombre = (document.getElementById('p-nombre') as HTMLInputElement).value.trim();
    const precio = parseFloat((document.getElementById('p-precio') as HTMLInputElement).value);
    const tipo = tipoSel;
    const categoriaId = parseInt((document.getElementById('p-categoria') as HTMLSelectElement).value, 10);

    if (!nombre) return;
    if (Number.isNaN(precio) || precio < 0) {
      alert('El precio debe ser un número mayor o igual a 0');
      return;
    }
    if (!categoriaId) {
      alert('Selecciona una categoría');
      return;
    }

    const body: Record<string, unknown> = { nombre, precio, tipo, categoriaId };
    const stockMinInput = document.getElementById('p-stock-min') as HTMLInputElement | null;
    const stockMinVal = stockMinInput ? parseInt(stockMinInput.value || '0', 10) || 0 : editing?.stockMinimo ?? 0;
    if (editing) {
      body.stockMinimo = stockMinVal;
    } else if (requiereReceta(tipo)) {
      body.stock = 0;
      body.stockMinimo = 0;
    } else {
      const stock = parseInt((document.getElementById('p-stock') as HTMLInputElement).value || '0', 10) || 0;
      body.stock = stock;
      body.stockMinimo = stockMinVal;
    }

    try {
      let res: Response;
      if (editing) {
        res = await fetch(`/api/backend/productos/${editing.id}`, {
          method: 'PATCH',
          headers: getAuthHeaders(),
          body: JSON.stringify(body),
        });
      } else {
        res = await fetch('/api/backend/productos', {
          method: 'POST',
          headers: getAuthHeaders(),
          body: JSON.stringify(body),
        });
      }
      if (!res.ok) {
        const err = await handleApiError(res);
        alert(err.message || 'No se pudo guardar el producto');
        return;
      }
      setModalOpen(false);
      load();
    } catch {
      alert('Error de conexión');
    }
  }

  async function cambiarEstado(p: Producto) {
    if (!confirm(`${p.isActive ? 'Desactivar' : 'Activar'} "${p.nombre}"?`)) return;
    try {
      const res = await fetch(`/api/backend/productos/${p.id}`, {
        method: 'PATCH',
        headers: getAuthHeaders(),
        body: JSON.stringify({ isActive: !p.isActive }),
      });
      if (!res.ok) {
        const err = await handleApiError(res);
        alert(err.message || 'Error al cambiar el estado');
        return;
      }
      load();
    } catch {
      alert('Error de conexión');
    }
  }

  async function eliminar(p: Producto) {
    if (!confirm(`¿Eliminar "${p.nombre}"? Esta acción no se puede deshacer.`)) return;
    try {
      const res = await fetch(`/api/backend/productos/${p.id}`, {
        method: 'DELETE',
        headers: getAuthHeaders(),
      });
      if (!res.ok) {
        const err = await handleApiError(res);
        alert(err.message || 'No se puede eliminar el producto');
        return;
      }
      load();
    } catch {
      alert('Error de conexión');
    }
  }

  return (
    <>
      <div className="stats-grid">
        <div className="stat-card">
          <p className="stat-label">Productos en la carta</p>
          <div className="stat-value">
            <span>{total}</span>
            <span className="material-symbols-outlined" style={{ color: 'var(--primary)', fontVariationSettings: "'FILL' 1" }}>menu_book</span>
          </div>
        </div>
        <div className="stat-card">
          <p className="stat-label">Activos</p>
          <div className="stat-value green">
            <span>{activos}</span>
            <span className="status-dot online" />
          </div>
        </div>
        <div className="stat-card">
          <p className="stat-label">En stock bajo</p>
          <div className="stat-value orange">
            <span>{bajos}</span>
            <span className="material-symbols-outlined" style={{ color: '#F1C40F', fontVariationSettings: "'FILL' 1" }}>warning</span>
          </div>
        </div>
      </div>

      <div className="search-wrap">
        <div style={{
          flex: 1, display: 'flex', alignItems: 'center', background: 'var(--bg-card)',
          border: '1.5px solid var(--border)', borderRadius: 'var(--radius-lg)',
          padding: '0 16px', transition: 'all var(--transition)',
        }}>
          <span className="material-symbols-outlined" style={{ color: 'var(--text-muted)', fontSize: 20, marginRight: 12, flexShrink: 0 }}>search</span>
          <input
            className="search-input"
            style={{ flex: 1, border: 'none', outline: 'none', padding: '14px 0', fontSize: 14, color: 'var(--text)', background: 'transparent', fontFamily: 'inherit' }}
            placeholder="Buscar plato o bebida..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <select
          value={catFilter}
          onChange={(e) => setCatFilter(parseInt(e.target.value, 10) || 0)}
          style={{
            background: 'var(--bg-card)', border: '1.5px solid var(--border)', borderRadius: 'var(--radius-lg)',
            padding: '12px 14px', fontSize: 14, color: 'var(--text)', outline: 'none', fontFamily: 'inherit', cursor: 'pointer',
          }}
        >
          <option value={0}>Todas las categorías</option>
          {categorias.map((c) => (
            <option key={c.id} value={c.id}>{c.nombre}</option>
          ))}
        </select>
      </div>

      <p className="list-label">Carta del Restaurante</p>

      {loading ? (
        <p style={{ color: 'var(--text-muted)', padding: '24px 0', textAlign: 'center' }}>Cargando...</p>
      ) : filtered.length === 0 ? (
        <div className="card-data" style={{ textAlign: 'center', padding: '40px 24px' }}>
          <span className="material-symbols-outlined" style={{ fontSize: 48, color: 'var(--text-muted)' }}>restaurant_menu</span>
          <p style={{ color: 'var(--text-muted)' }}>No hay productos que coincidan.</p>
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {filtered.map((p) => {
            const esPreparado = requiereReceta(p.tipo);
            const bajo = !esPreparado && (p.stock === 0 || (p.stockMinimo > 0 && p.stock <= p.stockMinimo));
            const tipos = (p.tipo + '').toLowerCase();
            return (
              <div key={p.id} className={`user-card ${p.isActive ? '' : 'offline'}`}>
                <div className="user-avatar">
                  <span className="material-symbols-outlined">{p.tipo === 'bebida' ? 'local_bar' : p.tipo === 'postre' ? 'icecream' : 'lunch_dining'}</span>
                </div>
                <div className="user-info">
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <span className="user-name">{p.nombre}</span>
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, flexWrap: 'wrap', justifyContent: 'flex-end' }}>
                      <span className={`role-badge ${TIPO_CLASS[tipos] || 'admin'}`}>{TIPO_LABELS[p.tipo] || 'Otro'}</span>
                      {p.categoria && <span className="role-badge cajero">{p.categoria.nombre}</span>}
                    </span>
                  </div>
                  <p className="user-email">${Number(p.precio).toFixed(2)}</p>
                  <div className="user-meta" style={{ display: 'flex', flexWrap: 'wrap', gap: 10 }}>
                    <span className="status-text" style={{ color: p.isActive ? 'var(--success)' : 'var(--text-muted)' }}>
                      <span className={`status-dot ${p.isActive ? 'online' : 'offline'}`} /> {p.isActive ? 'Disponible' : 'Agotado'}
                    </span>
                    {esPreparado ? (
                      <span className="role-badge waiter" style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                        <span className="material-symbols-outlined" style={{ fontSize: 13 }}>restaurant</span> Se prepara con receta
                      </span>
                    ) : (
                      <span className="status-text" style={{ color: 'var(--text-muted)' }}>Stock: <b>{p.stock}</b>{p.stockMinimo > 0 ? ` (mín ${p.stockMinimo})` : ''}</span>
                    )}
                    {bajo && (
                      <span className="role-badge chef" style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                        <span className="material-symbols-outlined" style={{ fontSize: 13 }}>warning</span> Stock bajo
                      </span>
                    )}
                    {recetaCount[p.id] ? (
                      <span className="role-badge waiter" style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                        <span className="material-symbols-outlined" style={{ fontSize: 13 }}>egg_alt</span> Receta ({recetaCount[p.id]})
                      </span>
                    ) : null}
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

      <button className="fab" title="Agregar producto" onClick={openCreate}>
        <span className="material-symbols-outlined">add</span>
      </button>

      <ModalSheet isOpen={modalOpen} onClose={() => setModalOpen(false)} title={editing ? 'Editar Producto' : 'Nuevo Producto'}>
        <form onSubmit={guardar}>
          {error && <p style={{ color: '#BA1A1A', fontSize: 13, marginBottom: 12 }}>{error}</p>}
          <div className="form-field">
            <label htmlFor="p-nombre">Nombre</label>
            <input id="p-nombre" placeholder="Ej. Lomo Saltado, Coca-Cola 1L, Helado" type="text" defaultValue={editing?.nombre || ''} required />
          </div>
          <div className="form-row">
            <div className="form-field">
              <label htmlFor="p-precio">Precio ($)</label>
              <input id="p-precio" placeholder="Ej. 25000" type="number" min="0" step="0.01" defaultValue={editing?.precio ?? ''} required />
            </div>
            <div className="form-field">
              <label htmlFor="p-tipo">Tipo</label>
              <select id="p-tipo" value={tipoSel} onChange={(e) => setTipoSel(e.target.value)}>
                <option value="plato">Plato</option>
                <option value="bebida">Bebida (gaseosa, jugo, Coca-Cola)</option>
                <option value="postre">Postre / Helado</option>
                <option value="otro">Otro</option>
              </select>
            </div>
          </div>
          <div className="form-field">
            <label htmlFor="p-categoria">Categoría</label>
            <select id="p-categoria" defaultValue={editing?.categoriaId ?? ''} required>
              <option value="" disabled>Selecciona una categoría</option>
              {categorias.map((c) => (
                <option key={c.id} value={c.id}>{c.nombre}</option>
              ))}
            </select>
          </div>
          {requiereReceta(tipoSel) ? (
            <div className="form-field" style={{ background: 'var(--primary-bg)', borderRadius: 'var(--radius)', padding: '12px 14px' }}>
              <p style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, color: 'var(--primary-dark)', fontWeight: 600 }}>
                <span className="material-symbols-outlined" style={{ fontSize: 18 }}>restaurant</span>
                Los platos se preparan y no manejan stock; controla su disponibilidad asignando receta (pestaña Recetas)
              </p>
            </div>
          ) : editing ? (
            <div className="form-row">
              <div className="form-field">
                <label htmlFor="p-stock">Stock (ej. 12 unidades)</label>
                <input id="p-stock" type="text" defaultValue={editing.stock ?? 0} readOnly style={{ background: 'var(--bg)', color: 'var(--text-secondary)' }} />
                <p style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 4 }}>Se gestiona desde Inventario (Registrar Entrada). Para cambiar el stock inicial, crea el producto de nuevo.</p>
              </div>
              <div className="form-field">
                <label htmlFor="p-stock-min">Stock mínimo (alerta)</label>
                <input id="p-stock-min" placeholder="Ej. 5" type="number" min="0" defaultValue={editing?.stockMinimo ?? 0} />
              </div>
            </div>
          ) : (
            <div className="form-row">
              <div className="form-field">
                <label htmlFor="p-stock">Stock inicial</label>
                <input id="p-stock" placeholder="Ej. 12" type="number" min="0" defaultValue={0} />
              </div>
              <div className="form-field">
                <label htmlFor="p-stock-min">Stock mínimo (alerta)</label>
                <input id="p-stock-min" placeholder="Ej. 5" type="number" min="0" defaultValue={0} />
              </div>
            </div>
          )}
          <div className="modal-actions">
            <button className="btn-cancel" type="button" onClick={() => setModalOpen(false)}>Cancelar</button>
            <button className="btn-primary" type="submit">{editing ? 'Guardar Cambios' : 'Guardar Producto'}</button>
          </div>
        </form>
      </ModalSheet>

      <ContextMenu
        ref={menuRef}
        items={(id) => {
          const p = productos.find((x) => x.id === id);
          if (!p) return [];
          return [
            { icon: 'edit', label: 'Editar', onClick: () => openEdit(p) },
            { icon: 'sync_alt', label: p.isActive ? 'Desactivar' : 'Activar', onClick: () => cambiarEstado(p) },
            { icon: 'delete', label: 'Eliminar', danger: true, onClick: () => eliminar(p) },
          ];
        }}
      />
    </>
  );
}