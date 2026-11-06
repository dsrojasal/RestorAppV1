'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Sidebar from '@/components/Sidebar';
import Topbar from '@/components/Topbar';
import NotificationPanel from '@/components/NotificationPanel';
import ProfileCard from '@/components/ProfileCard';
import { useNotifications } from '@/lib/useNotifications';

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
  const [cajaAbierta, setCajaAbierta] = useState<boolean | null>(null);
  const [turnoRoles, setTurnoRoles] = useState<string[]>([]);
  const router = useRouter();
  const { items, unread, marcarLeida, marcarTodas } = useNotifications();

  const cargarCaja = useCallback(async () => {
    try {
      const [estadoRes, miTurnoRes] = await Promise.all([
        fetch('/api/backend/turnos/estado', { headers: { 'Content-Type': 'application/json' } }),
        fetch('/api/backend/turnos/mi-turno', { headers: { 'Content-Type': 'application/json' } }),
      ]);
      if (estadoRes.ok) {
        const estado = await estadoRes.json();
        setCajaAbierta(!!estado?.abierta);
      }
      if (miTurnoRes.ok) {
        const miTurno = await miTurnoRes.json();
        setTurnoRoles(Array.isArray(miTurno?.roles) ? miTurno.roles : []);
      }
    } catch {
      /* el indicador se mantiene con el último estado conocido */
    }
  }, []);

  useEffect(() => {
    cargarCaja();
    const intervalo = setInterval(cargarCaja, 30000);
    const alVolver = () => {
      if (document.visibilityState === 'visible') cargarCaja();
    };
    window.addEventListener('focus', cargarCaja);
    document.addEventListener('visibilitychange', alVolver);
    return () => {
      clearInterval(intervalo);
      window.removeEventListener('focus', cargarCaja);
      document.removeEventListener('visibilitychange', alVolver);
    };
  }, [cargarCaja]);

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
      <Sidebar
        isOpen={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
        userRoleId={user.rolId}
        turnoRoles={turnoRoles}
        cajaAbierta={cajaAbierta}
        onLogout={handleLogout}
      />
      <Topbar
        onMenuClick={() => setSidebarOpen(true)}
        onNotifClick={() => setNotifOpen(!notifOpen)}
        onProfileClick={() => setProfileOpen(!profileOpen)}
        userName={user.name}
        userRol={user.rol}
        notifCount={unread}
      />
      <NotificationPanel
        isOpen={notifOpen}
        onClose={() => setNotifOpen(false)}
        items={items}
        unread={unread}
        onMarcarLeida={marcarLeida}
        onMarcarTodas={marcarTodas}
      />
      <ProfileCard isOpen={profileOpen} onClose={() => setProfileOpen(false)} user={user} onLogout={handleLogout} />
      <main className="main-content">
        <div className="main-content-inner">
          {children}
        </div>
      </main>
    </div>
  );
}
