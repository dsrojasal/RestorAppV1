'use client';

import { useParams, useRouter } from 'next/navigation';

const REPORTS_DATA: Record<string, {
  title: string;
  metric: string;
  metricValue: string;
  orders: string;
  ticketAvg: string;
  tableTitle: string;
  transactions: { id: string; table: string; total: string }[];
  chartData: number[];
}> = {
  'ventas-dia': {
    title: 'Reporte de Ventas Diarias',
    metric: 'Total Ventas',
    metricValue: '$4,250.00',
    orders: '142',
    ticketAvg: '$29.92',
    tableTitle: 'Detalle de Transacciones',
    transactions: [
      { id: '#8942', table: 'Mesa 04', total: '$84.50' },
      { id: '#8941', table: 'Mesa 12', total: '$126.20' },
      { id: '#8940', table: 'Mesa 08', total: '$45.00' },
      { id: '#8939', table: 'Llevar', total: '$32.10' },
    ],
    chartData: [20, 35, 55, 85, 100, 75, 45, 25],
  },
  'ventas-rango': {
    title: 'Reporte de Ventas por Rango de Fechas',
    metric: 'Total Ventas',
    metricValue: '$12,840.00',
    orders: '386',
    ticketAvg: '$33.26',
    tableTitle: 'Detalle de Transacciones',
    transactions: [
      { id: '#9102', table: 'Mesa 03', total: '$95.00' },
      { id: '#9101', table: 'Mesa 07', total: '$152.30' },
      { id: '#9100', table: 'Mesa 11', total: '$67.50' },
      { id: '#9099', table: 'Llevar', total: '$28.90' },
    ],
    chartData: [30, 45, 60, 90, 110, 85, 50, 35],
  },
  'productos-vendidos': {
    title: 'Reporte de Productos Más Vendidos',
    metric: 'Productos Vendidos',
    metricValue: '1,284',
    orders: '386',
    ticketAvg: '3.3 prod.',
    tableTitle: 'Top Productos',
    transactions: [
      { id: '001', table: 'Hamburguesa Clásica', total: '156 und' },
      { id: '002', table: 'Pizza Margherita', total: '98 und' },
      { id: '003', table: 'Papas Fritas', total: '212 und' },
      { id: '004', table: 'Bebidas', total: '287 und' },
    ],
    chartData: [100, 65, 80, 45, 70, 55, 90, 40],
  },
  'consumo-insumos': {
    title: 'Reporte de Consumo de Insumos',
    metric: 'Insumos Consumidos',
    metricValue: '48 und',
    orders: '386',
    ticketAvg: '8.2 kg',
    tableTitle: 'Detalle de Insumos',
    transactions: [
      { id: 'T-01', table: 'Tomate', total: '12 kg' },
      { id: 'T-02', table: 'Harina', total: '8 sacos' },
      { id: 'T-03', table: 'Queso', total: '15 kg' },
      { id: 'T-04', table: 'Carne', total: '22 kg' },
    ],
    chartData: [40, 60, 25, 80, 50, 70, 35, 45],
  },
  'reporte-mesero': {
    title: 'Reporte de Ventas por Mesero',
    metric: 'Total Ventas',
    metricValue: '$5,320.00',
    orders: '142',
    ticketAvg: '$37.46',
    tableTitle: 'Rendimiento por Mesero',
    transactions: [
      { id: 'M-01', table: 'Carlos M.', total: '$1,850.00' },
      { id: 'M-02', table: 'Ana G.', total: '$2,100.00' },
      { id: 'M-03', table: 'Luis R.', total: '$1,370.00' },
    ],
    chartData: [65, 80, 45, 70, 55, 90, 60, 50],
  },
  'pedidos-chef': {
    title: 'Reporte de Pedidos por Chef',
    metric: 'Pedidos Atendidos',
    metricValue: '386',
    orders: '386',
    ticketAvg: '4.2 min',
    tableTitle: 'Productividad por Chef',
    transactions: [
      { id: 'C-01', table: 'Chef Juan', total: '142 ped.' },
      { id: 'C-02', table: 'Chef María', total: '128 ped.' },
      { id: 'C-03', table: 'Chef Pedro', total: '116 ped.' },
    ],
    chartData: [90, 75, 60, 85, 50, 80, 70, 95],
  },
};

export default function ReportePDFPage() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;
  const data = REPORTS_DATA[id] || REPORTS_DATA['ventas-dia'];

  const now = new Date();
  const dateStr = now.toLocaleDateString('es-ES', { year: 'numeric', month: 'long', day: 'numeric' });
  const code = id.replace(/[^a-z]/g, '').toUpperCase().slice(0, 4);
  const dateCode = now.toISOString().slice(0, 10).replace(/-/g, '');
  const reportId = `RS-${dateCode}-${code}-001`;

  const maxVal = Math.max(...data.chartData);

  return (
    <>
      <div className="report-preview">
        <div className="report-card" style={{ animation: 'fadeIn 0.4s ease-out forwards' }}>
          <div className="report-header">
            <div className="report-logo">
              <span className="material-symbols-outlined">restaurant_menu</span>
            </div>
            <h2 className="report-title">RestorApp</h2>
            <p className="report-subtitle">{data.title}</p>
            <p className="report-date">Fecha: {dateStr}</p>
          </div>

          <div className="metric-grid" style={{ animation: 'fadeIn 0.4s ease-out forwards' }}>
            <div className="metric-card">
              <div className="metric-icon">
                <span className="material-symbols-outlined">payments</span>
              </div>
              <div>
                <p className="metric-label">{data.metric}</p>
                <p className="metric-value">{data.metricValue}</p>
              </div>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <div className="metric-card" style={{ flexDirection: 'column', alignItems: 'flex-start' }}>
                <p className="metric-label">Pedidos</p>
                <p className="metric-value" style={{ fontSize: 20 }}>{data.orders}</p>
              </div>
              <div className="metric-card" style={{ flexDirection: 'column', alignItems: 'flex-start' }}>
                <p className="metric-label">Ticket Prom.</p>
                <p className="metric-value" style={{ fontSize: 20 }}>{data.ticketAvg}</p>
              </div>
            </div>
          </div>

          <div style={{ marginTop: 24, animation: 'fadeIn 0.4s ease-out forwards' }}>
            <h3 style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-secondary)', marginBottom: 12 }}>Distribución por Hora</h3>
            <div style={{ background: 'var(--bg)', borderRadius: 'var(--radius)', padding: '16px 12px 8px' }}>
              <div className="bar-chart" style={{ height: 100 }}>
                {data.chartData.map((val, i) => {
                  const h = Math.max(8, (val / maxVal) * 100);
                  const opacity = 0.2 + (val / maxVal) * 0.8;
                  return <div key={i} className="bar-chart-item" style={{ height: `${h}%`, opacity }} />;
                })}
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 8, padding: '0 2px' }}>
                <span style={{ fontSize: 10, color: 'var(--text-muted)', fontWeight: 600 }}>08:00</span>
                <span style={{ fontSize: 10, color: 'var(--text-muted)', fontWeight: 600 }}>12:00</span>
                <span style={{ fontSize: 10, color: 'var(--text-muted)', fontWeight: 600 }}>16:00</span>
                <span style={{ fontSize: 10, color: 'var(--text-muted)', fontWeight: 600 }}>20:00</span>
                <span style={{ fontSize: 10, color: 'var(--text-muted)', fontWeight: 600 }}>23:00</span>
              </div>
            </div>
          </div>

          <div style={{ marginTop: 24, animation: 'fadeIn 0.4s ease-out forwards' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
              <h3 style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-secondary)' }}>{data.tableTitle}</h3>
              <span style={{ fontSize: 10, background: 'var(--primary-bg)', color: 'var(--primary-dark)', padding: '4px 10px', borderRadius: 50, fontWeight: 700 }}>TOP 5</span>
            </div>
            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>ID</th>
                    <th>Mesa</th>
                    <th style={{ textAlign: 'right' }}>Total</th>
                  </tr>
                </thead>
                <tbody>
                  {data.transactions.map((t, i) => (
                    <tr key={i}>
                      <td style={{ color: 'var(--text-secondary)' }}>{t.id}</td>
                      <td>{t.table}</td>
                      <td style={{ textAlign: 'right', fontWeight: 700, color: 'var(--primary-dark)' }}>{t.total}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <button className="btn-outline" style={{ width: '100%', justifyContent: 'center', marginTop: 12 }} onClick={() => alert('Mostrando todas las transacciones...')}>
              Ver todas las transacciones
            </button>
          </div>

          <div style={{ marginTop: 24, paddingTop: 20, borderTop: '1px solid var(--border)', textAlign: 'center', animation: 'fadeIn 0.4s ease-out forwards' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, color: 'var(--text-muted)', marginBottom: 4 }}>
              <span className="material-symbols-outlined" style={{ fontSize: 14 }}>info</span>
              <p style={{ fontSize: 11 }}>Generado automáticamente por RestorApp</p>
            </div>
            <p style={{ fontSize: 10, color: 'var(--text-muted)' }}>ID de Reporte: {reportId}</p>
            <div style={{ marginTop: 16, width: 120, height: 40, borderBottom: '1.5px solid var(--border)', marginLeft: 'auto', marginRight: 'auto', display: 'flex', alignItems: 'end', justifyContent: 'center', paddingBottom: 4 }}>
              <span style={{ fontSize: 11, color: 'var(--text-muted)', fontStyle: 'italic' }}>Firma Gerencia</span>
            </div>
          </div>
        </div>

        <div style={{ marginTop: 16, display: 'flex', justifyContent: 'center', paddingBottom: 80, animation: 'fadeIn 0.4s ease-out forwards' }}>
          <div style={{ background: 'var(--primary-bg)', color: 'var(--primary-dark)', padding: '8px 20px', borderRadius: 50, display: 'flex', alignItems: 'center', gap: 8 }}>
            <span className="material-symbols-outlined" style={{ fontSize: 18 }}>verified</span>
            <span style={{ fontSize: 12, fontWeight: 600 }}>Documento verificado digitalmente</span>
          </div>
        </div>
      </div>

      <div className="pdf-bar no-print">
        <div className="pdf-bar-inner">
          <button className="btn-primary" onClick={() => window.print()}>
            <span className="material-symbols-outlined" style={{ fontVariationSettings: "'FILL' 1" }}>download</span>
            Descargar PDF
          </button>
          <button className="btn-outline" onClick={() => window.print()} title="Imprimir">
            <span className="material-symbols-outlined">print</span>
          </button>
        </div>
      </div>

      <style>{`
        @keyframes fadeIn { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
        @media print {
          .sidebar, .sidebar-overlay, .topbar, .fab, .pdf-bar, .no-print { display: none !important; }
          .main-content { margin-left: 0 !important; padding-top: 0 !important; }
          .report-card { box-shadow: none; border: none; }
          body { background: #fff; }
        }
      `}</style>
    </>
  );
}
