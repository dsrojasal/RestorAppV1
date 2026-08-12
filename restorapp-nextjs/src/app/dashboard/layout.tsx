'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Sidebar from '@/components/Sidebar';
import Topbar from '@/components/Topbar';
import NotificationPanel from '@/components/NotificationPanel';
import ProfileCard from '@/components/ProfileCard';

interface UserData {
  name: string;
  email: string;
  rol: string;
  rolId: number;
  createdAt: string;
}

const ROLE_MAP: Record<number, string> = { 1: 'Administrador', 2: 'Mesero', 3: 'Chef', 4: 'Cajero' };

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [notifOpen, setNotifOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const [user, setUser] = useState<UserData>({ name: 'Usuario', email: '', rol: 'Administrador', rolId: 1, createdAt: '' });
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch('/api/backend/usuarios/me', {
          headers: { 'Content-Type': 'application/json' },
        });
        if (res.ok) {
          const u = await res.json();
          setUser({
            name: u.name || 'Usuario',
            email: u.email || '',
            rol: ROLE_MAP[u.rolId] || u.rol || 'Administrador',
            rolId: u.rolId || 1,
            createdAt: u.createdAt || '',
          });
        } else if (res.status === 401) {
          await fetch('/api/auth/logout', { method: 'POST' }).catch(() => {});
          router.replace('/login?expired=1');
        }
      } catch {
        router.replace('/login');
      } finally {
        setLoading(false);
      }
    })();
  }, [router]);

  const handleLogout = useCallback(async () => {
    try {
      await fetch('/api/auth/logout', { method: 'POST' });
    } catch {}
    router.push('/login');
  }, [router]);

  return (
    <div id="app-container">
      <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} userRoleId={user.rolId} onLogout={handleLogout} />
      <Topbar
        onMenuClick={() => setSidebarOpen(true)}
        onNotifClick={() => setNotifOpen(!notifOpen)}
        onProfileClick={() => setProfileOpen(!profileOpen)}
        userName={user.name}
        userRol={user.rol}
      />
      <NotificationPanel isOpen={notifOpen} onClose={() => setNotifOpen(false)} />
      <ProfileCard isOpen={profileOpen} onClose={() => setProfileOpen(false)} user={user} onLogout={handleLogout} />
      <main className="main-content">
        <div className="main-content-inner">
          {children}
        </div>
      </main>
    </div>
  );
}
