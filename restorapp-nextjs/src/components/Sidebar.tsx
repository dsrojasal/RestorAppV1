'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

const NAV_ITEMS = [
  { label: 'Dashboard', icon: 'dashboard', href: '/dashboard', id: 'dashboard' },
  { label: 'Carta', icon: 'menu_book', href: '/dashboard/carta', id: 'menu' },
  { label: 'Mesas', icon: 'table_restaurant', href: '/dashboard/mesas', id: 'tables' },
  { label: 'Cocina', icon: 'soup_kitchen', href: '/dashboard/cocina', id: 'kitchen' },
  { label: 'Inventario', icon: 'inventory_2', href: '/dashboard/inventario', id: 'inventory' },
  { label: 'Pedidos', icon: 'receipt_long', href: '/dashboard/pedidos', id: 'orders' },
  { label: 'Usuarios', icon: 'group', href: '/dashboard/usuarios', id: 'users' },
  { label: 'Proveedores', icon: 'local_shipping', href: '/dashboard/proveedores', id: 'suppliers' },
  { label: 'Facturación', icon: 'receipt', href: '/dashboard/facturacion', id: 'billing' },
  { label: 'Reportes', icon: 'bar_chart', href: '/dashboard/reportes', id: 'reports' },
  { label: 'Configuración', icon: 'settings', href: '/dashboard/configuracion', id: 'settings' },
];

const ROLE_ACCESS: Record<number, string[]> = {
  1: ['dashboard', 'menu', 'tables', 'kitchen', 'inventory', 'orders', 'users', 'suppliers', 'billing', 'reports', 'settings'],
  2: ['dashboard', 'tables', 'orders'],
  3: ['kitchen'],
  4: ['dashboard', 'billing', 'reports'],
};

interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
  userRoleId?: number;
  onLogout: () => void;
}

export default function Sidebar({ isOpen, onClose, userRoleId = 1, onLogout }: SidebarProps) {
  const pathname = usePathname();

  const currentId = (() => {
    const path = pathname.replace('/dashboard', '') || '/';
    const map: Record<string, string> = {
      '/': 'dashboard',
      '/carta': 'menu',
      '/mesas': 'tables',
      '/cocina': 'kitchen',
      '/inventario': 'inventory',
      '/pedidos': 'orders',
      '/usuarios': 'users',
      '/proveedores': 'suppliers',
      '/facturacion': 'billing',
      '/reportes': 'reports',
      '/configuracion': 'settings',
      '/reportePDF': 'reports',
    };
    return map[path] || 'dashboard';
  })();

  const allowedIds = ROLE_ACCESS[userRoleId] || ROLE_ACCESS[1];
  const visibleItems = NAV_ITEMS.filter(item => allowedIds.includes(item.id));

  return (
    <>
      <div
        className={`sidebar-overlay ${isOpen ? 'active' : ''}`}
        onClick={onClose}
      />
      <aside className={`sidebar ${isOpen ? 'open' : ''}`}>
        <div className="sidebar-header">
          <div className="sidebar-logo-icon">
            <span className="material-symbols-outlined">restaurant_menu</span>
          </div>
          <div className="sidebar-brand">
            <h1>RestorApp</h1>
            <p>Management Hub</p>
          </div>
        </div>
        <nav className="sidebar-nav">
          {visibleItems.map((item) => (
            <Link
              key={item.id}
              href={item.href}
              className={item.id === currentId ? 'active' : ''}
              data-nav={item.id}
              onClick={onClose}
            >
              <span className="material-symbols-outlined">{item.icon}</span>
              <span>{item.label}</span>
            </Link>
          ))}
        </nav>
        <div className="sidebar-footer">
          <button onClick={onLogout}>
            <span className="material-symbols-outlined">logout</span>
            Cerrar Sesión
          </button>
        </div>
      </aside>
    </>
  );
}
