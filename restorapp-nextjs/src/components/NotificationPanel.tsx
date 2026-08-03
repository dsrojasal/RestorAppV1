'use client';

interface NotificationPanelProps {
  isOpen: boolean;
  onClose: () => void;
}

const NOTIFICATIONS = [
  { icon: 'receipt', iconClass: 'danger', text: 'Nuevo pedido #8945 - Mesa 3', time: 'Hace 2 minutos' },
  { icon: 'inventory_2', iconClass: 'warning', text: 'Inventario bajo: Tomates (2kg restantes)', time: 'Hace 10 minutos' },
  { icon: 'payments', iconClass: 'primary', text: 'Factura #8920 generada', time: 'Hace 15 minutos' },
  { icon: 'group', iconClass: 'primary', text: 'Nuevo mesero registrado', time: 'Hace 1 hora' },
  { icon: 'local_shipping', iconClass: 'warning', text: 'Proveedor: Pedido de insumos pendiente', time: 'Hace 2 horas' },
];

export default function NotificationPanel({ isOpen, onClose }: NotificationPanelProps) {
  return (
    <>
      <div className={`notif-overlay ${isOpen ? 'active' : ''}`} onClick={onClose} />
      <div className={`notif-panel ${isOpen ? 'open' : ''}`}>
        <div className="notif-header">
          <h3>Notificaciones</h3>
          <button className="notif-close" onClick={onClose}>
            <span className="material-symbols-outlined">close</span>
          </button>
        </div>
        <div className="notif-body">
          {NOTIFICATIONS.map((n, i) => (
            <div key={i} className="notif-item">
              <div className={`activity-icon ${n.iconClass}`}>
                <span className="material-symbols-outlined" style={{ fontSize: 18 }}>{n.icon}</span>
              </div>
              <div className="activity-text" style={{ flex: 1 }}>
                <p>{n.text}</p>
                <p>{n.time}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </>
  );
}
