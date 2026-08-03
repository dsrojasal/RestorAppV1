'use client';

import { useEffect, useState } from 'react';

export default function DashboardPage() {
  const [userName, setUserName] = useState('Admin');

  useEffect(() => {
    const cookies = document.cookie.split(';');
    for (const cookie of cookies) {
      const [name, value] = cookie.trim().split('=');
      if (name === 'user' && value) {
        try {
          const u = JSON.parse(decodeURIComponent(value));
          setUserName(u.name || 'Admin');
        } catch {}
      }
    }
  }, []);

  return (
    <>
      <div className="animate-in">
        <h2 className="page-title">Bienvenido, {userName}</h2>
        <p className="page-subtitle">Aquí está lo que sucede hoy en RestorApp.</p>
      </div>
      <div className="grid-cards animate-in animate-in-delay-1">
        <a className="card-nav" href="/dashboard/usuarios">
          <span className="material-symbols-outlined">group</span>
          <h3>Usuarios</h3>
        </a>
        <a className="card-nav" href="/dashboard/mesas">
          <span className="material-symbols-outlined">table_restaurant</span>
          <h3>Mesas</h3>
        </a>
        <a className="card-nav" href="/dashboard/cocina">
          <span className="material-symbols-outlined">soup_kitchen</span>
          <h3>Cocina</h3>
        </a>
        <a className="card-nav" href="/dashboard/inventario">
          <span className="material-symbols-outlined">inventory_2</span>
          <h3>Inventario</h3>
        </a>
        <a className="card-nav" href="/dashboard/proveedores">
          <span className="material-symbols-outlined">local_shipping</span>
          <h3>Proveedores</h3>
        </a>
        <a className="card-nav" href="/dashboard/facturacion">
          <span className="material-symbols-outlined">receipt</span>
          <h3>Facturación</h3>
        </a>
        <a className="card-nav" href="/dashboard/reportes">
          <span className="material-symbols-outlined">bar_chart</span>
          <h3>Reportes</h3>
        </a>
        <a className="card-nav" href="/dashboard/configuracion">
          <span className="material-symbols-outlined">settings</span>
          <h3>Configuración</h3>
        </a>
      </div>
      <div className="pt-8 pb-3 animate-in animate-in-delay-2">
        <h3 className="text-xl font-bold leading-tight tracking-tight">Resumen del Día</h3>
      </div>
      <div className="flex flex-col gap-4">
        <div className="card-data animate-in animate-in-delay-2">
          <p className="card-data-title">Ventas del día</p>
          <p className="card-data-value">$1,250</p>
          <div className="flex items-center gap-2 mt-1">
            <span className="material-symbols-outlined text-[#2ECC71] text-lg">trending_up</span>
            <p className="text-[#2ECC71] text-sm font-medium">+15% vs ayer</p>
          </div>
          <div className="bar-chart mt-4">
            {[80, 20, 60, 90, 40, 75, 55].map((h, i) => (
              <div key={i} className="bar-chart-item" style={{ height: `${h}%`, opacity: 0.3 }} />
            ))}
          </div>
        </div>
        <div className="card-data animate-in animate-in-delay-3">
          <p className="card-data-title">Pedidos en proceso</p>
          <p className="card-data-value">12 Pedidos</p>
          <div className="flex gap-4 pt-3">
            <div className="flex-1">
              <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>En preparación</p>
              <p className="text-lg font-bold">8</p>
            </div>
            <div className="flex-1">
              <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>Listos</p>
              <p className="text-lg font-bold">4</p>
            </div>
          </div>
        </div>
        <div className="card-data animate-in animate-in-delay-3">
          <div className="flex items-center justify-between mb-3">
            <p className="card-data-title" style={{ marginBottom: 0 }}>Insumos por agotarse</p>
            <span className="material-symbols-outlined text-[#F1C40F] text-2xl">warning</span>
          </div>
          <div className="mb-3">
            <div className="flex justify-between items-baseline mb-1">
              <p className="font-medium text-sm">Tomates</p>
              <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>2kg restantes</p>
            </div>
            <div className="progress-bar">
              <div className="progress-bar-fill warning" style={{ width: '20%' }} />
            </div>
          </div>
          <div>
            <div className="flex justify-between items-baseline mb-1">
              <p className="font-medium text-sm">Harina</p>
              <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>1 saco restante</p>
            </div>
            <div className="progress-bar">
              <div className="progress-bar-fill danger" style={{ width: '10%' }} />
            </div>
          </div>
        </div>
        <div className="card-data animate-in animate-in-delay-4">
          <p className="card-data-title" style={{ marginBottom: 12 }}>Últimos movimientos</p>
          <div className="activity-item">
            <div className="activity-icon danger">
              <span className="material-symbols-outlined" style={{ fontSize: 18 }}>receipt</span>
            </div>
            <div className="activity-text">
              <p>Usuario X creó factura #123</p>
              <p>Hace 2 minutos</p>
            </div>
          </div>
          <div className="activity-item">
            <div className="activity-icon primary">
              <span className="material-symbols-outlined" style={{ fontSize: 18 }}>payments</span>
            </div>
            <div className="activity-text">
              <p>Mesa 5 cerró pedido</p>
              <p>Hace 5 minutos</p>
            </div>
          </div>
          <div className="activity-item">
            <div className="activity-icon warning">
              <span className="material-symbols-outlined" style={{ fontSize: 18 }}>person_add</span>
            </div>
            <div className="activity-text">
              <p>Nuevo usuario &apos;Cajero 2&apos; registrado</p>
              <p>Hace 15 minutos</p>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
