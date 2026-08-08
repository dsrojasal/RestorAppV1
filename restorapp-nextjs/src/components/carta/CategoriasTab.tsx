'use client';

import { useState, useEffect, useRef } from 'react';
import ModalSheet from '@/components/ModalSheet';
import ContextMenu, { ContextMenuRef } from '@/components/ContextMenu';
import { getAuthHeaders, handleApiError } from '@/lib/api';

interface Categoria {
  id: number;
  nombre: string;
  descripcion?: string;
  isActive: boolean;
}

export default function CategoriasTab() {
  const [categorias, setCategorias] = useState<Categoria[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Categoria | null>(null);
  const menuRef = useRef<ContextMenuRef>(null);

  const load = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/backend/categorias', { headers: getAuthHeaders() });
      if (res.status === 401) {
        window.location.href = '/login';
        return;
      }
      if (!res.ok) {
        alert('Error al cargar las categorías');
        return;
      }
      const data = await res.json();
      setCategorias(Array.isArray(data) ? data : []);
    } catch {
      alert('Error de conexión');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const filtered = categorias.filter((c) => !search || c.nombre.toLowerCase().includes(search.toLowerCase()));

  function openCreate() {
    setEditing(null);
    setModalOpen(true);
  }

  function openEdit(c: Categoria) {
    setEditing(c);
    setModalOpen(true);
  }

  async function guardar(e: React.FormEvent) {
    e.preventDefault();
    const nombre = (document.getElementById('c-nombre') as HTMLInputElement).value.trim();
    const descripcion = (document.getElementById('c-desc') as HTMLInputElement).value.trim();
    if (!nombre) return;

    const body: Record<string, unknown> = { nombre };
    if (descripcion) body.descripcion = descripcion;

    try {
      let res: Response;
      if (editing) {
        res = await fetch(`/api/backend/categorias/${editing.id}`, {
          method: 'PATCH',
          headers: getAuthHeaders(),
          body: JSON.stringify(body),
        });
      } else {
        res = await fetch('/api/backend/categorias', {
          method: 'POST',
          headers: getAuthHeaders(),
          body: JSON.stringify(body),
        });
      }
      if (!res.ok) {
        const err = await handleApiError(res);
        alert(err.message || 'No se pudo guardar la categoría');
        return;
      }
      setModalOpen(false);
      load();
    } catch {
      alert('Error de conexión');
    }
  }

  async function cambiarEstado(c: Categoria) {
    try {
      const res = await fetch(`/api/backend/categorias/${c.id}`, {
        method: 'PATCH',
        headers: getAuthHeaders(),
        body: JSON.stringify({ isActive: !c.isActive }),
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

  async function eliminar(c: Categoria) {
    if (!confirm(`¿Eliminar la categoría "${c.nombre}"?`)) return;
    try {
      const res = await fetch(`/api/backend/categorias/${c.id}`, {
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
          <p className="stat-label">Categorías</p>
          <div className="stat-value">
            <span>{categorias.length}</span>
            <span className="material-symbols-outlined" style={{ color: 'var(--primary)', fontVariationSettings: "'FILL' 1" }}>category</span>
          </div>
        </div>
        <div className="stat-card">
          <p className="stat-label">Activas</p>
          <div className="stat-value green">
            <span>{categorias.filter((c) => c.isActive).length}</span>
            <span className="status-dot online" />
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
            placeholder="Buscar categoría..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
      </div>

      <p className="list-label">Categorías de la carta</p>

      {loading ? (
        <p style={{ color: 'var(--text-muted)', padding: '24px 0', textAlign: 'center' }}>Cargando...</p>
      ) : filtered.length === 0 ? (
        <div className="card-data" style={{ textAlign: 'center', padding: '40px 24px' }}>
          <span className="material-symbols-outlined" style={{ fontSize: 48, color: 'var(--text-muted)' }}>category</span>
          <p style={{ color: 'var(--text-muted)' }}>Sin categorías. Crea la primera con el botón +.</p>
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {filtered.map((c) => (
            <div key={c.id} className={`user-card ${c.isActive ? '' : 'offline'}`}>
              <div className="user-avatar">
                <span className="material-symbols-outlined">category</span>
              </div>
              <div className="user-info">
                <span className="user-name">{c.nombre}</span>
                <p className="user-email">{c.descripcion || 'Sin descripción'}</p>
                <div className="user-meta">
                  <span className={`status-dot ${c.isActive ? 'online' : 'offline'}`} />
                  <span className="status-text" style={{ color: c.isActive ? 'var(--success)' : 'var(--text-muted)' }}>
                    {c.isActive ? 'Activa' : 'Inactiva'}
                  </span>
                </div>
              </div>
<div className="user-action" style={{ position: 'relative' }} onClick={(e) => menuRef.current?.open(e, c.id)}>
                  <span className="material-symbols-outlined">more_vert</span>
                </div>
            </div>
          ))}
        </div>
      )}

      <button className="fab" title="Agregar categoría" onClick={openCreate}>
        <span className="material-symbols-outlined">add</span>
      </button>

      <ModalSheet isOpen={modalOpen} onClose={() => setModalOpen(false)} title={editing ? 'Editar Categoría' : 'Nueva Categoría'}>
        <form onSubmit={guardar}>
          <div className="form-field">
            <label htmlFor="c-nombre">Nombre</label>
            <input id="c-nombre" placeholder="Ej. Bebidas, Entradas, Fuertes, Postres" type="text" defaultValue={editing?.nombre || ''} required />
          </div>
          <div className="form-field">
            <label htmlFor="c-desc">Descripción</label>
            <input id="c-desc" placeholder="Opciónal..." type="text" defaultValue={editing?.descripcion || ''} />
          </div>
          <div className="modal-actions">
            <button className="btn-cancel" type="button" onClick={() => setModalOpen(false)}>Cancelar</button>
            <button className="btn-primary" type="submit">{editing ? 'Guardar Cambios' : 'Guardar Categoría'}</button>
          </div>
        </form>
      </ModalSheet>

      <ContextMenu
        ref={menuRef}
        items={(id) => {
          const c = categorias.find((x) => x.id === id);
          if (!c) return [];
          return [
            { icon: 'edit', label: 'Editar', onClick: () => openEdit(c) },
            { icon: 'sync_alt', label: c.isActive ? 'Desactivar' : 'Activar', onClick: () => cambiarEstado(c) },
            { icon: 'delete', label: 'Eliminar', danger: true, onClick: () => eliminar(c) },
          ];
        }}
      />
    </>
  );
}