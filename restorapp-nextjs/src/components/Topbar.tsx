'use client';

interface TopbarProps {
  onMenuClick: () => void;
  onNotifClick: () => void;
  onProfileClick: () => void;
  userName: string;
  userRol: string;
  notifCount?: number;
}

export default function Topbar({
  onMenuClick,
  onNotifClick,
  onProfileClick,
  userName,
  userRol,
  notifCount = 0,
}: TopbarProps) {
  return (
    <header className="topbar" id="topbar">
      <button className="topbar-hamburger" id="menuToggle" aria-label="Abrir menú" onClick={onMenuClick}>
        <span className="material-symbols-outlined">menu</span>
      </button>
      <div className="topbar-brand">
        <div className="topbar-brand-icon">
          <span className="material-symbols-outlined">restaurant_menu</span>
        </div>
        <h1>RestorApp</h1>
      </div>
      <div style={{ flex: 1 }} />
      <div className="topbar-right">
        <button className="topbar-btn" id="notifBtn" title="Notificaciones" onClick={onNotifClick}>
          <span className="material-symbols-outlined">notifications</span>
          {notifCount > 0 && <span className="badge" />}
        </button>
        <button className="topbar-btn" title="Ayuda">
          <span className="material-symbols-outlined">help</span>
        </button>
        <div className="topbar-profile" onClick={onProfileClick}>
          <div className="topbar-avatar">
            <span className="material-symbols-outlined">account_circle</span>
          </div>
          <div className="topbar-profile-info">
            <p>{userName}</p>
            <p>{userRol}</p>
          </div>
        </div>
      </div>
    </header>
  );
}
