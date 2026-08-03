'use client';

import { useState, useEffect, useRef } from 'react';
import ModalSheet from '@/components/ModalSheet';

const ROLE_LABELS: Record<number, string> = { 1: 'Administrador', 2: 'Mesero', 3: 'Cocinero', 4: 'Cajero' };
const ROLE_BADGES: Record<number, string> = { 1: 'admin', 2: 'waiter', 3: 'chef', 4: 'cajero' };

interface Usuario {
  id: number;
  name: string;
  email: string;
  rolId: number;
  isActive: boolean;
  createdAt?: string;
  rol?: { nombre: string };
}

export default function UsuariosPage() {
  const [users, setUsers] = useState<Usuario[]>([]);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<Usuario | null>(null);
  const [filter, setFilter] = useState('');
  const [menuOpen, setMenuOpen] = useState<number | null>(null);
  const [menuPos, setMenuPos] = useState({ top: 0, left: 0 });
  const [currentUserEmail, setCurrentUserEmail] = useState('');
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => { cargarUsuarios(); }, []);

  useEffect(() => {
    const cookies = document.cookie.split(';');
    for (const c of cookies) {
      const [name, value] = c.trim().split('=');
      if (name === 'user' && value) {
        try { setCurrentUserEmail(JSON.parse(decodeURIComponent(value)).email || ''); } catch {}
      }
    }
  }, []);

  function getCurrentUserEmail(): string {
    const cookies = document.cookie.split(';');
    for (const c of cookies) {
      const [name, value] = c.trim().split('=');
      if (name === 'user' && value) {
        try { return JSON.parse(decodeURIComponent(value)).email || ''; } catch {}
      }
    }
    return '';
  }

  function authHeaders(): HeadersInit {
    const cookies = document.cookie.split(';');
    for (const c of cookies) {
      const [name, value] = c.trim().split('=');
      if (name === 'token' && value) {
        return { Authorization: `Bearer ${decodeURIComponent(value)}`, 'Content-Type': 'application/json' };
      }
    }
    return { 'Content-Type': 'application/json' };
  }

  async function cargarUsuarios() {
    try {
      const res = await fetch('/api/backend/usuarios', { headers: authHeaders() });
      if (res.status === 401) {
        document.cookie = 'token=; Max-Age=0; Path=/; SameSite=lax';
        document.cookie = 'user=; Max-Age=0; Path=/; SameSite=lax';
        window.location.href = '/login';
        return;
      }
      if (res.ok) {
        const data: Usuario[] = await res.json();
        const email = getCurrentUserEmail().toLowerCase();
        data.sort((a, b) => {
          if (a.email.toLowerCase() === email) return -1;
          if (b.email.toLowerCase() === email) return 1;
          return 0;
        });
        setUsers(data);
      }
    } catch {}
  }

  const filtered = users.filter(u =>
    u.name.toLowerCase().includes(filter.toLowerCase()) ||
    u.email.toLowerCase().includes(filter.toLowerCase())
  );

  const total = users.length;
  const activos = users.filter(u => u.isActive).length;

  function openCreate() {
    setEditingUser(null);
    setModalOpen(true);
    setMenuOpen(null);
  }

  function openEdit(u: Usuario) {
    setEditingUser(u);
    setModalOpen(true);
    setMenuOpen(null);
  }

  function openMenu(e: React.MouseEvent, userId: number) {
    e.stopPropagation();
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
    setMenuPos({ top: rect.bottom + 4, left: Math.min(rect.right - 180, window.innerWidth - 188) });
    setMenuOpen(menuOpen === userId ? null : userId);
  }

  async function toggleStatus(userId: number) {
    try {
      await fetch(`/api/backend/usuarios/${userId}/toggle-active`, { method: 'PATCH', headers: authHeaders() });
      cargarUsuarios();
    } catch {}
    setMenuOpen(null);
  }

  async function eliminarUsuario(userId: number, name: string) {
    if (!confirm(`Eliminar a ${name}?`)) return;
    try {
      await fetch(`/api/backend/usuarios/${userId}`, { method: 'DELETE', headers: authHeaders() });
      cargarUsuarios();
    } catch {}
    setMenuOpen(null);
  }

  async function guardarUsuario(e: React.FormEvent) {
    e.preventDefault();
    const nombre = (document.getElementById('nombre') as HTMLInputElement).value.trim();
    const correo = (document.getElementById('correo') as HTMLInputElement).value.trim();
    const usuario = (document.getElementById('usuario') as HTMLInputElement).value.trim();
    const contrasena = (document.getElementById('contrasena') as HTMLInputElement).value;
    const rol = (document.getElementById('rol') as HTMLSelectElement).value;
    const editId = (document.getElementById('editId') as HTMLInputElement).value;

    const email = correo || (usuario.includes('@') ? usuario : `${usuario}@restorapp.com`);

    if (!nombre || !usuario) return;

    const body: Record<string, unknown> = { name: nombre, email, rolId: parseInt(rol) };

    try {
      if (editId) {
        if (contrasena) Object.assign(body, { password: contrasena });
        const res = await fetch(`/api/backend/usuarios/${editId}`, {
          method: 'PATCH',
          headers: authHeaders(),
          body: JSON.stringify(body),
        });
        if (!res.ok) { const err = await res.json(); alert(err.message || 'Error al actualizar'); return; }
      } else {
        if (!contrasena) { alert('La contrasena es obligatoria'); return; }
        Object.assign(body, { password: contrasena });
        const res = await fetch('/api/backend/usuarios', {
          method: 'POST',
          headers: authHeaders(),
          body: JSON.stringify(body),
        });
        if (!res.ok) { const err = await res.json(); alert(err.message || 'Error al crear'); return; }
      }
      setModalOpen(false);
      cargarUsuarios();
    } catch {
      alert('Error de conexion');
    }
  }

  return (
    <>
      <div className="animate-in">
        <h2 className="page-title">Gestión de Usuarios</h2>
        <p className="page-subtitle">Administración de empleados y roles del sistema.</p>
      </div>

      <div className="stats-grid animate-in animate-in-delay-1">
        <div className="stat-card">
          <p className="stat-label">Total Usuarios</p>
          <div className="stat-value">
            <span>{total}</span>
            <span className="material-symbols-outlined" style={{ color: 'var(--primary)', fontVariationSettings: "'FILL' 1" }}>group</span>
          </div>
        </div>
        <div className="stat-card">
          <p className="stat-label">Activos</p>
          <div className="stat-value green">
            <span>{activos}</span>
            <span className="status-dot online" />
          </div>
        </div>
      </div>

      <div className="animate-in animate-in-delay-1">
        <div className="search-wrap">
          <div style={{
            flex: 1, display: 'flex', alignItems: 'center', background: 'var(--bg-card)',
            border: '1.5px solid var(--border)', borderRadius: 'var(--radius-lg)',
            padding: '0 16px', transition: 'all var(--transition)'
          }}>
            <span className="material-symbols-outlined" style={{ color: 'var(--text-muted)', fontSize: 20, marginRight: 12, flexShrink: 0 }}>search</span>
            <input
              className="search-input"
              style={{ flex: 1, border: 'none', outline: 'none', padding: '14px 0', fontSize: 14, color: 'var(--text)', background: 'transparent', fontFamily: 'inherit' }}
              placeholder="Buscar personal..."
              value={filter}
              onChange={e => setFilter(e.target.value)}
              onFocus={e => { e.target.parentElement!.style.borderColor = 'var(--primary)'; e.target.parentElement!.style.boxShadow = '0 0 0 3px var(--primary-bg)'; }}
              onBlur={e => { e.target.parentElement!.style.borderColor = 'var(--border)'; e.target.parentElement!.style.boxShadow = 'none'; }}
            />
          </div>
          <button className="btn-filter" title="Filtrar">
            <span className="material-symbols-outlined">filter_list</span>
          </button>
        </div>
      </div>

      <div className="animate-in animate-in-delay-2">
        <p className="list-label">Personal Registrado</p>
      </div>

      <div className="flex flex-col gap-3 animate-in animate-in-delay-2">
        {filtered.map(u => {
          const badgeClass = ROLE_BADGES[u.rolId] || 'admin';
          const roleLabel = ROLE_LABELS[u.rolId] || 'Desconocido';
          return (
            <div key={u.id} className={`user-card ${u.isActive ? '' : 'offline'}`}>
              <div className="user-avatar">
                <span className="material-symbols-outlined">account_circle</span>
              </div>
              <div className="user-info">
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <span className="user-name">{u.name}</span>
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                      <span className={`role-badge ${badgeClass}`}>{roleLabel}</span>
                      {u.email === currentUserEmail && <span className="you-dot">● Tú</span>}
                    </span>
                  </div>
                <p className="user-email">{u.email}</p>
                <div className="user-meta">
                  <span className={`status-dot ${u.isActive ? 'online' : 'offline'}`} />
                  <span className="status-text" style={{ color: u.isActive ? 'var(--success)' : 'var(--text-muted)' }}>
                    {u.isActive ? 'Activo' : 'Inactivo'}
                  </span>
                </div>
              </div>
              <div className="user-action" style={{ position: 'relative' }} onClick={(e) => openMenu(e, u.id)}>
                <span className="material-symbols-outlined">more_vert</span>
              </div>
            </div>
          );
        })}
      </div>

      {menuOpen !== null &&
        (() => {
          const menuUser = users.find(x => x.id === menuOpen);
          const isSelf = menuUser?.email === currentUserEmail;
          return (
            <>
              <div className="context-backdrop" onClick={() => setMenuOpen(null)} />
              <div ref={menuRef} className="context-menu open" style={{ position: 'fixed', top: menuPos.top, left: menuPos.left, zIndex: 1200 }}>
                <button className="context-item" onClick={() => { const u = users.find(x => x.id === menuOpen); if (u) openEdit(u); }}>
                  <span className="material-symbols-outlined">edit</span> Editar
                </button>
                {!isSelf && (
                  <button className="context-item" onClick={() => toggleStatus(menuOpen)}>
                    <span className="material-symbols-outlined">sync_alt</span> Cambiar estado
                  </button>
                )}
                <div className="context-divider" />
                {!isSelf && (
                  <button className="context-item danger" onClick={() => { const u = users.find(x => x.id === menuOpen); if (u) eliminarUsuario(u.id, u.name); }}>
                    <span className="material-symbols-outlined">delete</span> Eliminar
                  </button>
                )}
              </div>
            </>
          );
        })()}

      <button className="fab" title="Agregar nuevo" onClick={openCreate}>
        <span className="material-symbols-outlined">add</span>
      </button>

      <ModalSheet isOpen={modalOpen} onClose={() => setModalOpen(false)} title={editingUser ? 'Editar Usuario' : 'Crear Nuevo Usuario'}>
        <form onSubmit={guardarUsuario}>
          <input type="hidden" id="editId" value={editingUser?.id || ''} />
          <div className="form-field">
            <label htmlFor="nombre">Nombre</label>
            <input id="nombre" placeholder="Ej. Juan Perez" type="text" defaultValue={editingUser?.name || ''} required />
          </div>
          <div className="form-field">
            <label htmlFor="correo">Correo</label>
            <input id="correo" placeholder="ejemplo@correo.com" type="email" defaultValue={editingUser?.email || ''} />
          </div>
          <div className="form-row">
            <div className="form-field">
              <label htmlFor="usuario">Usuario</label>
              <input id="usuario" placeholder="jperez" type="text" required />
            </div>
            <div className="form-field">
              <label htmlFor="contrasena">Contrasena</label>
              <input id="contrasena" placeholder={editingUser ? 'Dejar vacio para no cambiar' : '********'} type="password" required={!editingUser} />
            </div>
          </div>
          <div className="form-field">
            <label htmlFor="rol">Rol</label>
            <select id="rol" defaultValue={editingUser?.rolId || 2}>
              <option value="1">Administrador</option>
              <option value="2">Mesero</option>
              <option value="3">Cocinero</option>
              <option value="4">Cajero</option>
            </select>
          </div>
          <div className="modal-actions">
            <button className="btn-cancel" type="button" onClick={() => setModalOpen(false)}>Cancelar</button>
            <button className="btn-primary" type="submit">{editingUser ? 'Guardar Cambios' : 'Guardar Usuario'}</button>
          </div>
        </form>
      </ModalSheet>
    </>
  );
}
