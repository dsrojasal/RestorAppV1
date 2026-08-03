'use client';

import { useRouter } from 'next/navigation';

const REPORTS = [
  { id: 'ventas-dia', icon: 'monitoring', label: 'Ventas del día', desc: 'Resumen de ventas del día actual.' },
  { id: 'ventas-rango', icon: 'date_range', label: 'Ventas por rango de fechas', desc: 'Ventas para un rango de fechas personalizado.' },
  { id: 'productos-vendidos', icon: 'trending_up', label: 'Productos más vendidos', desc: 'Listado de los productos con mayor rendimiento.' },
  { id: 'consumo-insumos', icon: 'inventory_2', label: 'Consumo de insumos', desc: 'Reporte de uso de ingredientes y stock.' },
  { id: 'reporte-mesero', icon: 'person_pin', label: 'Reporte por mesero', desc: 'Rendimiento y ventas de cada mesero.' },
  { id: 'pedidos-chef', icon: 'soup_kitchen', label: 'Pedidos atendidos por chef', desc: 'Productividad y tiempos por cada chef.' },
];

export default function ReportesPage() {
  const router = useRouter();

  function openReport(id: string) {
    router.push(`/dashboard/reportes/${id}`);
  }

  return (
    <>
      <div className="animate-in">
        <h2 className="page-title">Reportes</h2>
        <p className="page-subtitle">Selecciona un reporte para ver o descargar.</p>
      </div>
      <div className="flex flex-col gap-3 animate-in animate-in-delay-1">
        {REPORTS.map(r => (
          <div key={r.id} className="report-item" onClick={() => openReport(r.id)}>
            <div className="report-icon">
              <span className="material-symbols-outlined">{r.icon}</span>
            </div>
            <div className="report-info">
              <h4>{r.label}</h4>
              <p>{r.desc}</p>
            </div>
            <div className="report-actions">
              <button className="btn-icon btn-pdf" onClick={(e) => { e.stopPropagation(); openReport(r.id); }}>
                <span className="material-symbols-outlined">picture_as_pdf</span>
                <span>PDF</span>
              </button>
              <button className="btn-icon btn-excel" onClick={(e) => { e.stopPropagation(); alert('Descargando Excel...'); }}>
                <span className="material-symbols-outlined">summarize</span>
                <span>Excel</span>
              </button>
            </div>
          </div>
        ))}
      </div>
    </>
  );
}
