import { Column, CreateDateColumn, Entity, PrimaryGeneratedColumn } from 'typeorm';

export enum TipoNotificacion {
  PEDIDO = 'pedido',
  PEDIDO_LISTO = 'pedido_listo',
  FACTURA = 'factura',
  INVENTARIO = 'inventario',
  MESERO = 'mesero',
  PROVEEDOR = 'proveedor',
}

@Entity('notificaciones')
export class Notificacion {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ length: 30 })
  tipo: TipoNotificacion;

  @Column({ length: 300 })
  mensaje: string;

  @Column({ length: 50 })
  icono: string;

  @Column({ length: 20 })
  clase: string;

  @Column({ type: 'varchar', length: 50, nullable: true })
  refId: string | null;

  @Column({ type: 'int', nullable: true })
  creadoPorId: number | null;

  @Column({ type: 'int', nullable: true })
  usuarioId: number | null;

  @Column({ default: false })
  paraAdministrador: boolean;

  @Column({ default: false })
  paraMesero: boolean;

  @Column({ default: false })
  paraChef: boolean;

  @Column({ default: false })
  paraCajero: boolean;

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt: Date;
}
