'use client';

export default function ConfiguracionPage() {
  return (
    <>
      <div className="animate-in">
        <h2 className="page-title">Configuración</h2>
        <p className="page-subtitle">Ajustes del sistema y preferencias.</p>
      </div>
      <div className="card-data animate-in animate-in-delay-1" style={{ textAlign: 'center', padding: '60px 24px' }}>
        <span className="material-symbols-outlined" style={{ fontSize: 64, color: 'var(--primary)', marginBottom: 16 }}>settings</span>
        <h3 style={{ fontSize: 20, fontWeight: 700, color: 'var(--text)', marginBottom: 8 }}>Próximamente</h3>
        <p style={{ color: 'var(--text-muted)', maxWidth: 400, margin: '0 auto' }}>Esta sección estará disponible pronto. Estamos trabajando en ella para brindarte la mejor experiencia.</p>
      </div>
    </>
  );
}
