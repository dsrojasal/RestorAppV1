export const RealtimeEvents = {
  pedidosChanged: 'pedidos.changed',
  mesasChanged: 'mesas.changed',
  facturasChanged: 'facturas.changed',
  notificacionNueva: 'notificacion.nueva',
} as const;

export type RealtimeEvent = (typeof RealtimeEvents)[keyof typeof RealtimeEvents];
