'use client';

import { useState, useEffect } from 'react';
import ModalSheet from '@/components/ModalSheet';
import { getAuthHeaders, handleApiError } from '@/lib/api';

interface Ingrediente {
  id: number;
  nombre: string;
  unidad: string;
  stock: number;
}

interface Producto {
  id: number;
  nombre: string;
  tipo: string;
}

interface Receta {
  id: number;
  productoId: number;
  ingredienteId: number;
  cantidad: number;
  ingrediente?: { id: number; nombre: string; unidad: string; stock: number };
}

export default function RecetasTab() {
  const [productos, setProductos] = useState<Producto[]>([]);
  const [ingredientes, setIngredientes] = useState<Ingrediente[]>([]);
  const [recetas, setRecetas] = useState<Receta[]>([]);
  const [selected, setSelected] = useState<number>(0);
  const [loading, setLoading] = useState(true);
  const [addOpen, setAddOpen] = useState(false);
  const [error, setError] = useState('');

  const load = async () => {
    try {
      setLoading(true);
      const [resP, resI, resR] = await Promise.all([
        fetch('/api/backend/productos', { headers: getAuthHeaders() }),
        fetch('/api/backend/ingredientes', { headers: getAuthHeaders() }),
        fetch('/api/backend/producto-ingrediente', { headers: getAuthHeaders() }),
      ]);
      if (resP.status === 401) {
        window.location.href = '/login';
        return;
      }
      if (!resP.ok || !resI.ok || !resR.ok) {
        alert('Error al cargar los datos de recetas');
        return;
      }
      const [dP, dI, dR] = await Promise.all([resP.json(), resI.json(), resR.json()]);
      const listP: Producto[] = Array.isArray(dP) ? dP.filter((p) => p.isActive !== false) : [];
      const listI: Ingrediente[] = Array.isArray(dI) ? dI : [];
      const listR: Receta[] = Array.isArray(dR) ? dR : [];
      setProductos(listP);
      setIngredientes(listI);
      setRecetas(listR);
      setSelected((prev) => {
        if (prev && listP.some((p) => p.id === prev)) return prev;
        return listP.length ? listP[0].id : 0;
      });
    } catch {
      alert('Error de conexión');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const recetaActual = recetas.filter((r) => r.productoId === selected);
  const usadoIds = new Set(recetaActual.map((r) => r.ingredienteId));
  const disponibles = ingredientes.filter((i) => !usadoIds.has(i.id));

  const fmtCant = (v: number | string) => {
    const n = typeof v === 'string' ? parseFloat(v) : v;
    return isNaN(n) ? '0' : String(n);
  };

  async function agregar(e: React.FormEvent) {
    e.preventDefault();
    const ingredienteId = parseInt((document.getElementById('r-ingrediente') as HTMLSelectElement).value, 10);
    const cantidad = parseFloat((document.getElementById('r-cantidad') as HTMLInputElement).value || '0') || 0;
    if (!ingredienteId) {
      alert('Selecciona un ingrediente');
      return;
    }
    if (cantidad <= 0) {
      alert('La cantidad debe ser mayor a 0');
      return;
    }
    try {
      const res = await fetch('/api/backend/producto-ingrediente', {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({ productoId: selected, ingredienteId, cantidad }),
      });
      if (!res.ok) {
        const err = await handleApiError(res);
        setError(err.message || 'No se pudo agregar');
        return;
      }
      setError('');
      setAddOpen(false);
      await load();
    } catch {
      alert('Error de conexión');
    }
  }

  async function quitar(r: Receta) {
    if (!confirm(`¿Quitar "${r.ingrediente?.nombre}" de la receta?`)) return;
    try {
      const res = await fetch(`/api/backend/producto-ingrediente/${r.id}`, {
        method: 'DELETE',
        headers: getAuthHeaders(),
      });
      if (!res.ok) {
        const err = await handleApiError(res);
        alert(err.message || 'No se pudo quitar');
        return;
      }
      await load();
    } catch {
      alert('Error de conexión');
    }
  }

  const prodActual = productos.find((p) => p.id === selected);

  return (
    <>
      <div className="cocina-header-info">
        <p className="cocina-welcome" style={{ marginBottom: 0 }}>
          Las recetas son <b>opcionales</b>: solo los platos con receta descuentan inventario al prepararse.
        </p>
      </div>

      <div className="form-field" style={{ maxWidth: 420 }}>
        <label>Selecciona un producto de la carta</label>
        <select value={selected} onChange={(e) => setSelected(parseInt(e.target.value, 10) || 0)}>
          <option value={0} disabled>Selecciona un producto</option>
          {productos.map((p) => {
            const has = recetas.some((r) => r.productoId === p.id);
            return <option key={p.id} value={p.id}>{p.nombre}{has ? ' · con receta' : ''}</option>;
          })}
        </select>
      </div>

      {loading ? (
        <p style={{ color: 'var(--text-muted)', padding: '24px 0', textAlign: 'center' }}>Cargando...</p>
      ) : !prodActual ? (
        <div className="card-data" style={{ textAlign: 'center', padding: '40px 24px' }}>
          <span className="material-symbols-outlined" style={{ fontSize: 48, color: 'var(--text-muted)' }}>egg_alt</span>
          <p style={{ color: 'var(--text-muted)' }}>Primero crea productos en la pestaña Platos.</p>
        </div>
      ) : (
        <>
          <div className="card-data" style={{ padding: '20px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
              <p className="card-data-title" style={{ marginBottom: 0 }}>Receta de: {prodActual.nombre}</p>
              <button className="btn-primary" type="button" onClick={() => { setError(''); setAddOpen(true); }}>
                <span className="material-symbols-outlined" style={{ fontSize: 16, marginRight: 4 }}>add</span> Agregar ingrediente
              </button>
            </div>

            {recetaActual.length === 0 ? (
              <p style={{ color: 'var(--text-muted)', textAlign: 'center', padding: '20px 0' }}>
                Este producto no tiene receta. Puede venderlo <b>sin descontar inventario</b> o agregar ingredientes con el botón.
              </p>
            ) : (
              <div>
                {recetaActual.map((r) => (
                  <div key={r.id} className="order-item-row" style={{ padding: '12px 0', borderBottom: '1px solid var(--border-light)' }}>
                    <span style={{ flex: 1, display: 'flex', alignItems: 'center', gap: 10 }}>
                      <span className="material-symbols-outlined" style={{ color: 'var(--text-muted)', fontSize: 18 }}>egg_alt</span>
                      <span className="text-sm font-medium">{r.ingrediente?.nombre || `Ingrediente #${r.ingredienteId}`}</span>
                    </span>
                    <span className="text-sm" style={{ color: 'var(--text-secondary)' }}>
                      {fmtCant(r.cantidad)} {r.ingrediente?.unidad || ''}
                    </span>
                    <button title="Quitar" onClick={() => quitar(r)} style={{ cursor: 'pointer', border: 'none', background: 'transparent', marginLeft: 8 }}>
                      <span className="material-symbols-outlined" style={{ fontSize: 18, color: 'var(--danger, #BA1A1A)' }}>remove_circle</span>
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          <p style={{ color: 'var(--text-muted)', fontSize: 12, marginTop: 12 }}>
            El administrador puede dejar recetas vacías: eso significa que el producto no consume inventario (ej. gaseosas o helados).
          </p>
        </>
      )}

      <ModalSheet isOpen={addOpen} onClose={() => setAddOpen(false)} title={`Agregar ingrediente a "${prodActual?.nombre || ''}"`}>
        <form onSubmit={agregar}>
          {error && <p style={{ color: '#BA1A1A', fontSize: 13, marginBottom: 12 }}>{error}</p>}
          <div className="form-field">
            <label htmlFor="r-ingrediente">Ingrediente</label>
            <select id="r-ingrediente" defaultValue="">
              <option value="" disabled>Selecciona un ingrediente</option>
              {disponibles.map((i) => (
                <option key={i.id} value={i.id}>{i.nombre} ({i.unidad})</option>
              ))}
            </select>
            {disponibles.length === 0 && <p style={{ color: 'var(--text-muted)', fontSize: 12, marginTop: 6 }}>Todos los ingredientes ya están asignados o no hay ingredientes creados.</p>}
          </div>
          <div className="form-field">
            <label htmlFor="r-cantidad">Cantidad por plato</label>
            <input id="r-cantidad" placeholder="Ej. 0.2 para 200 gr, 1 para una unidad" type="number" min="0" step="0.001" defaultValue="1" required />
          </div>
          <div className="modal-actions">
            <button className="btn-cancel" type="button" onClick={() => setAddOpen(false)}>Cancelar</button>
            <button className="btn-primary" type="submit" disabled={disponibles.length === 0}>Agregar</button>
          </div>
        </form>
      </ModalSheet>
    </>
  );
}