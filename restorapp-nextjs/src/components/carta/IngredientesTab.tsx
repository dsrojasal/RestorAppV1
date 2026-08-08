'use client';

import { useState, useEffect, useRef } from 'react';
import ModalSheet from '@/components/ModalSheet';
import ContextMenu, { ContextMenuRef } from '@/components/ContextMenu';
import { getAuthHeaders, handleApiError } from '@/lib/api';

interface Ingrediente {
  id: number;
  nombre: string;
  stock: number;
  stockMinimo: number;
  unidad: string;
}

const UNIDADES = ['kg', 'g', 'und', 'ml', 'lt', 'paquete', 'saco'];

export default function IngredientesTab() {
  const [ingredientes, setIngredientes] = useState<Ingrediente[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Ingrediente | null>(null);
  const menuRef = useRef<ContextMenuRef>(null);

  const load = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/backend/ingredientes', { headers: getAuthHeaders() });
      if (res.status === 401) {
        window.location.href = '/login';
        return;
      }
      if (!res.ok) {
        alert('Error al cargar los ingredientes');
        return;
      }
      const data = await res.json();
      setIngredientes(Array.isArray(data) ? data : []);
    } catch {
      alert('Error de conexión');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const filtered = ingredientes.filter((i) => !search || i.nombre.toLowerCase().includes(search.toLowerCase()));

  function openCreate() {
    setEditing(null);
    setModalOpen(true);
  }

  function openEdit(i: Ingrediente) {
    setEditing(i);
    setModalOpen(true);
  }

  async function guardar(e: React.FormEvent) {
    e.preventDefault();
    const nombre = (document.getElementById('i-nombre') as HTMLInputElement).value.trim();
    const stockMinimo = parseInt((document.getElementById('i-stock-min') as HTMLInputElement).value || '0', 10) || 0;
    const unidad = (document.getElementById('i-unidad') as HTMLSelectElement).value;
    if (!nombre || !unidad) return;

    const body: Record<string, unknown> = { nombre, stockMinimo, unidad };
    if (!editing) {
      const stock = parseInt((document.getElementById('i-stock') as HTMLInputElement).value || '0', 10) || 0;
      body.stock = stock;
    }

    try {
      let res: Response;
      if (editing) {
        res = await fetch(`/api/backend/ingredientes/${editing.id}`, {
          method: 'PATCH',
          headers: getAuthHeaders(),
          body: JSON.stringify(body),
        });
      } else {
        res = await fetch('/api/backend/ingredientes', {
          method: 'POST',
          headers: getAuthHeaders(),
          body: JSON.stringify(body),
        });
      }
      if (!res.ok) {
        const err = await handleApiError(res);
        alert(err.message || 'No se pudo guardar el ingrediente');
        return;
      }
      setModalOpen(false);
      load();
    } catch {
      alert('Error de conexión');
    }
  }

  async function eliminar(i: Ingrediente) {
    if (!confirm(`¿Eliminar el ingrediente "${i.nombre}"?`)) return;
    try {
      const res = await fetch(`/api/backend/ingredientes/${i.id}`, {
        method: 'DELETE',
        headers: getAuthHeaders(),
      });
      if (!res.ok) {
        const err = await handleApiError(res);
        alert(err.message || 'No se puede eliminar (¿está en uso?)');
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
          <p className="stat-label">Ingredientes</p>
          <div className="stat-value">
            <span>{ingredientes.length}</span>
            <span className="material-symbols-outlined" style={{ color: 'var(--primary)', fontVariationSettings: "'FILL' 1" }}>inventory_2</span>
          </div>
        </div>
        <div className="stat-card">
          <p className="stat-label">En stock bajo</p>
          <div className="stat-value orange">
            <span>{ingredientes.filter((i) => i.stock === 0 || (i.stockMinimo > 0 && i.stock <= i.stockMinimo)).length}</span>
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
            placeholder="Buscar ingrediente..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
      </div>

      <p className="list-label">Ingredientes para recetas</p>

      {loading ? (
        <p style={{ color: 'var(--text-muted)', padding: '24px 0', textAlign: 'center' }}>Cargando...</p>
      ) : filtered.length === 0 ? (
        <div className="card-data" style={{ textAlign: 'center', padding: '40px 24px' }}>
          <span className="material-symbols-outlined" style={{ fontSize: 48, color: 'var(--text-muted)' }}>egg_alt</span>
          <p style={{ color: 'var(--text-muted)' }}>Sin ingredientes. Crea el primero con el botón +.</p>
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {filtered.map((i) => {
            const bajo = i.stock === 0 || (i.stockMinimo > 0 && i.stock <= i.stockMinimo);
            return (
              <div key={i.id} className="user-card">
                <div className="user-avatar">
                  <span className="material-symbols-outlined">egg_alt</span>
                </div>
                <div className="user-info">
                  <span className="user-name">{i.nombre}</span>
                  <p className="user-email">{i.unidad}</p>
                  <div className="user-meta" style={{ display: 'flex', flexWrap: 'wrap', gap: 10 }}>
                    <span className="status-text" style={{ color: 'var(--text-muted)' }}>Stock: <b>{i.stock}</b> {i.unidad}{i.stockMinimo > 0 ? ` · mín ${i.stockMinimo}` : ''}</span>
                    {bajo && (
                      <span className="role-badge chef" style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                        <span className="material-symbols-outlined" style={{ fontSize: 13 }}>warning</span> Stock bajo
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

      <button className="fab" title="Agregar ingrediente" onClick={openCreate}>
        <span className="material-symbols-outlined">add</span>
      </button>

      <ModalSheet isOpen={modalOpen} onClose={() => setModalOpen(false)} title={editing ? 'Editar Ingrediente' : 'Nuevo Ingrediente'}>
        <form onSubmit={guardar}>
          <div className="form-field">
            <label htmlFor="i-nombre">Nombre</label>
            <input id="i-nombre" placeholder="Ej. Carne de res, Tomate, Harina" type="text" defaultValue={editing?.nombre || ''} required />
          </div>
          <div className="form-row">
            <div className="form-field">
              <label htmlFor="i-stock">{editing ? 'Stock' : 'Stock inicial'}</label>
              {editing ? (
                <>
                  <input id="i-stock" type="text" defaultValue={editing.stock ?? 0} readOnly style={{ background: 'var(--bg)', color: 'var(--text-secondary)' }} />
                  <p style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 4 }}>Se gestiona desde Inventario (Registrar Entrada).</p>
                </>
              ) : (
                <input id="i-stock" placeholder="Ej. 100" type="number" min="0" defaultValue={0} />
              )}
            </div>
            <div className="form-field">
              <label htmlFor="i-stock-min">Stock mínimo (alerta)</label>
              <input id="i-stock-min" placeholder="Ej. 20" type="number" min="0" defaultValue={editing?.stockMinimo ?? 0} />
            </div>
          </div>
          <div className="form-field">
            <label htmlFor="i-unidad">Unidad de medida</label>
            <select id="i-unidad" defaultValue={editing?.unidad || 'und'}>
              {UNIDADES.map((u) => (
                <option key={u} value={u}>{u}</option>
              ))}
            </select>
          </div>
          <div className="modal-actions">
            <button className="btn-cancel" type="button" onClick={() => setModalOpen(false)}>Cancelar</button>
            <button className="btn-primary" type="submit">{editing ? 'Guardar Cambios' : 'Guardar Ingrediente'}</button>
          </div>
        </form>
      </ModalSheet>

      <ContextMenu
        ref={menuRef}
        items={(id) => {
          const i = ingredientes.find((x) => x.id === id);
          if (!i) return [];
          return [
            { icon: 'edit', label: 'Editar', onClick: () => openEdit(i) },
            { icon: 'delete', label: 'Eliminar', danger: true, onClick: () => eliminar(i) },
          ];
        }}
      />
    </>
  );
}