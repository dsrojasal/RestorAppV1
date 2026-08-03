'use client';

export default function ProveedoresPage() {
  return (
    <>
      <div className="animate-in">
        <h2 className="page-title">Proveedores</h2>
        <p className="page-subtitle">Gestión de proveedores y órdenes de compra.</p>
      </div>
      <div className="card-data animate-in animate-in-delay-1" style={{ textAlign: 'center', padding: '60px 24px' }}>
        <span className="material-symbols-outlined" style={{ fontSize: 64, color: 'var(--primary)', marginBottom: 16 }}>local_shipping</span>
        <h3 style={{ fontSize: 20, fontWeight: 700, color: 'var(--text)', marginBottom: 8 }}>Próximamente</h3>
        <p style={{ color: 'var(--text-muted)', maxWidth: 400, margin: '0 auto' }}>Esta sección estará disponible pronto. Estamos trabajando en ella para brindarte la mejor experiencia.</p>
      </div>
    </>
  );
}
