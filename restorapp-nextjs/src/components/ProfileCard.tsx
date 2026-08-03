'use client';

interface ProfileCardProps {
  isOpen: boolean;
  onClose: () => void;
  user: { name: string; email: string; rol: string; rolId: number; createdAt: string };
  onLogout: () => void;
}

export default function ProfileCard({ isOpen, onClose, user, onLogout }: ProfileCardProps) {
  return (
    <>
      <div className={`profile-card-overlay ${isOpen ? 'active' : ''}`} onClick={onClose} />
      <div className={`profile-card ${isOpen ? 'open' : ''}`}>
        <div className="profile-card-header">
          <span className="material-symbols-outlined">account_circle</span>
          <h3>{user.name}</h3>
          <p>{user.rol}</p>
        </div>
        <div className="profile-card-body">
          <div className="profile-row">
            <span className="material-symbols-outlined">mail</span>
            <div><p>Correo</p><p>{user.email || '—'}</p></div>
          </div>
          <div className="profile-row">
            <span className="material-symbols-outlined">badge</span>
            <div><p>Rol</p><p>{user.rol}</p></div>
          </div>
          <div className="profile-row">
            <span className="material-symbols-outlined">calendar_today</span>
            <div><p>Fecha de creacion</p><p>{user.createdAt ? new Date(user.createdAt).toLocaleDateString('es-CO') : '—'}</p></div>
          </div>
        </div>
        <button className="profile-logout" onClick={onLogout}>
          <span className="material-symbols-outlined">logout</span>
          Cerrar Sesion
        </button>
      </div>
    </>
  );
}
