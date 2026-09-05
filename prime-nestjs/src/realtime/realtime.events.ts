export const RealtimeEvents = {
  pedidosChanged: 'pedidos.changed',
  mesasChanged: 'mesas.changed',
  facturasChanged: 'facturas.changed',
} as const;

export type RealtimeEvent = (typeof RealtimeEvents)[keyof typeof RealtimeEvents];
