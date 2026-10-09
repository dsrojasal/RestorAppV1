'use client';

import { useCallback, useEffect, useState } from 'react';
import { getAuthHeaders } from '@/lib/api';
import ResumenVentasCard from '@/components/ResumenVentasCard';

interface MovimientoResumen {
  tipo: 'factura' | 'pedido' | 'usuario';
  titulo: string;
  fecha: string;
}

interface InsumoPorAgotarse {
  id: number;
  nombre: string;
  restante: string;
  porcentaje: number;
  nivel: 'warning' | 'danger';
}

interface ResumenDashboard {
  generadoEn: string;
  ventas: {
    hoy: number;
    ayer: number;
    variacionPorcentaje: number | null;
    porHora: number[];
    porHoraAyer: number[];
    cuentasPorHoraHoy: number[];
    horaActual: number;
    minutoActual: number;
    diaEnCurso: boolean;
    ayerCerro: number;
    ventasAyerHastaMismaHora: number;
    proyeccionHoy: number | null;
    cuentasHoy: number;
    cuentasAyerHastaMismaHora: number;
    ticketPromedioHoy: number | null;
    ticketPromedioAyerHastaMismaHora: number | null;
  };
  mesasOcupadas: number;
  pedidos: {
    enProceso: number;
    enPreparacion: number;
    listos: number;
  };
  insumosPorAgotarse: InsumoPorAgotarse[];
  contablesPorAgotarse: InsumoPorAgotarse[];
  ultimosMovimientos: MovimientoResumen[];
}

function tiempoRelativo(fechaIso: string): string {
  const fecha = new Date(fechaIso);
  if (isNaN(fecha.getTime())) return 'Hace un momento';
  const segundos = Math.floor((Date.now() - fecha.getTime()) / 1000);
  if (segundos < 60) return `Hace ${segundos} segundo${segundos !== 1 ? 's' : ''}`;
  const minutos = Math.floor(segundos / 60);
  if (minutos < 60) return `Hace ${minutos} minuto${minutos !== 1 ? 's' : ''}`;
  const horas = Math.floor(minutos / 60);
  if (horas < 24) return `Hace ${horas} hora${horas !== 1 ? 's' : ''}`;
  const dias = Math.floor(horas / 24);
  if (dias < 7) return `Hace ${dias} día${dias !== 1 ? 's' : ''}`;
  return fecha.toLocaleString('es-CO', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit', timeZone: 'America/Bogota' });
}

export default function DashboardPage() {
  const [userName, setUserName] = useState('Admin');
  const [resumen, setResumen] = useState<ResumenDashboard | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const cargar = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await fetch('/api/backend/dashboard/resumen', { headers: getAuthHeaders() });
      if (res.status === 401) {
        window.location.href = '/login';
        return;
      }
      if (!res.ok) throw new Error('Error al cargar el resumen');
      const data = await res.json();
      setResumen(data);
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'No se pudo cargar el resumen';
      setError(msg);
    } finally {
      setLoading(false);
    }
  }, []);

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
    cargar();
  }, [cargar]);

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
         {loading && (
           <div className="card-data animate-in animate-in-delay-2" style={{ textAlign: 'center', padding: '40px 24px' }}>
             <span className="material-symbols-outlined" style={{ fontSize: 40, color: 'var(--text-muted)' }}>sync</span>
             <p style={{ color: 'var(--text-muted)', marginTop: 8 }}>Cargando resumen...</p>
           </div>
         )}
         {error && !loading && (
           <div className="card-data animate-in animate-in-delay-2" style={{ padding: '24px 20px', borderColor: 'var(--danger)' }}>
             <p style={{ color: 'var(--danger)', fontWeight: 600, marginBottom: 8 }}>{error}</p>
             <button className="btn-outline" style={{ padding: '6px 12px', fontSize: 12 }} onClick={cargar}>
               Reintentar
             </button>
           </div>
         )}
         {resumen && !loading && (
           <>
<ResumenVentasCard ventas={resumen.ventas} mesasOcupadas={resumen.mesasOcupadas} />
             <div className="card-data animate-in animate-in-delay-3">
               <p className="card-data-title">Pedidos en proceso</p>
               <p className="card-data-value">{resumen.pedidos.enProceso} Pedido{resumen.pedidos.enProceso !== 1 ? 's' : ''}</p>
               <div className="flex gap-4 pt-3">
                 <div className="flex-1">
                   <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>En preparación</p>
                   <p className="text-lg font-bold">{resumen.pedidos.enPreparacion}</p>
                 </div>
                 <div className="flex-1">
                   <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>Listos</p>
                   <p className="text-lg font-bold">{resumen.pedidos.listos}</p>
                 </div>
               </div>
             </div>
             <div className="card-data animate-in animate-in-delay-3">
               <div className="flex items-center justify-between mb-3">
                 <p className="card-data-title" style={{ marginBottom: 0 }}>Insumos por agotarse</p>
                 <span className="material-symbols-outlined text-[#F1C40F] text-2xl">warning</span>
               </div>
               {resumen.insumosPorAgotarse.length === 0 ? (
                 <p style={{ color: 'var(--text-muted)', fontSize: 13 }}>No hay insumos por debajo del stock mínimo.</p>
               ) : (
                 resumen.insumosPorAgotarse.map((i) => (
                   <div key={i.id} className="mb-3 last:mb-0">
                     <div className="flex justify-between items-baseline mb-1">
                       <p className="font-medium text-sm">{i.nombre}</p>
                       <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>{i.restante} restantes</p>
                     </div>
                     <div className="progress-bar">
                       <div className={`progress-bar-fill ${i.nivel}`} style={{ width: `${Math.max(5, Math.min(100, i.porcentaje))}%` }} />
                     </div>
                   </div>
                 ))
               )}
             </div>
             <div className="card-data animate-in animate-in-delay-3">
                <div className="flex items-center justify-between mb-3">
                  <p className="card-data-title" style={{ marginBottom: 0 }}>Contables por agotarse</p>
                  <span className="material-symbols-outlined text-[#F1C40F] text-2xl">warning</span>
                </div>
                {resumen.contablesPorAgotarse.length === 0 ? (
                  <p style={{ color: 'var(--text-muted)', fontSize: 13 }}>No hay contables por debajo del stock mínimo.</p>
                ) : (
                  resumen.contablesPorAgotarse.map((i) => (
                    <div key={i.id} className="mb-3 last:mb-0">
                      <div className="flex justify-between items-baseline mb-1">
                        <p className="font-medium text-sm">{i.nombre}</p>
                        <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>{i.restante} restantes</p>
                      </div>
                      <div className="progress-bar">
                        <div className={`progress-bar-fill ${i.nivel}`} style={{ width: `${Math.max(5, Math.min(100, i.porcentaje))}%` }} />
                      </div>
                    </div>
                  ))
                )}
              </div>
              <div className="card-data animate-in animate-in-delay-4">
               <p className="card-data-title" style={{ marginBottom: 12 }}>Últimos movimientos</p>
               {resumen.ultimosMovimientos.length === 0 ? (
                 <p style={{ color: 'var(--text-muted)', fontSize: 13 }}>No hay movimientos recientes.</p>
               ) : (
                 resumen.ultimosMovimientos.map((m, idx) => (
                   <div key={`${m.tipo}-${idx}`} className="activity-item">
                     <div className={`activity-icon ${m.tipo === 'factura' ? 'danger' : m.tipo === 'pedido' ? 'primary' : 'warning'}`}>
                       <span className="material-symbols-outlined" style={{ fontSize: 18 }}>{m.tipo === 'factura' ? 'receipt' : m.tipo === 'pedido' ? 'payments' : 'person_add'}</span>
                     </div>
                     <div className="activity-text">
                       <p>{m.titulo}</p>
                       <p>{tiempoRelativo(m.fecha)}</p>
                     </div>
                   </div>
                 ))
               )}
             </div>
           </>
         )}
       </div>
    </>
  );
}
