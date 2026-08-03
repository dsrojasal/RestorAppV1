import { Column, Entity, PrimaryGeneratedColumn, ManyToOne, JoinColumn, CreateDateColumn, UpdateDateColumn } from 'typeorm';
import { Mesa } from 'src/mesas/entities/mesa.entity';
import { Usuario } from 'src/usuarios/entities/usuario.entity';
import { TipoPago } from 'src/tipo-pago/entities/tipo-pago.entity';

export enum PedidoEstado {
  PENDIENTE = 'pendiente',
  EN_PREPARACION = 'en_preparacion',
  LISTO = 'listo',
  ENTREGADO = 'entregado',
  CANCELADO = 'cancelado',
}

@Entity()
export class Pedido {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  mesaId: number;

  @ManyToOne(() => Mesa)
  @JoinColumn({ name: 'mesaId' })
  mesa: Mesa;

  @Column()
  usuarioId: number;

  @ManyToOne(() => Usuario)
  @JoinColumn({ name: 'usuarioId' })
  usuario: Usuario;

  @Column({ nullable: true })
  tipoPagoId: number;

  @ManyToOne(() => TipoPago)
  @JoinColumn({ name: 'tipoPagoId' })
  tipoPago: TipoPago;

  @Column({ type: 'enum', enum: PedidoEstado, default: PedidoEstado.PENDIENTE })
  estado: PedidoEstado;

  @Column({ type: 'decimal', precision: 10, scale: 2, default: 0.0 })
  total: number;

  @Column({ nullable: true, length: 500 })
  observaciones: string;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
