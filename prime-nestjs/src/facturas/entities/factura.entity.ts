import { Column, Entity, PrimaryGeneratedColumn, ManyToOne, JoinColumn, CreateDateColumn } from 'typeorm';
import { Pedido } from 'src/pedidos/entities/pedido.entity';
import { TipoPago } from 'src/tipo-pago/entities/tipo-pago.entity';

export enum EstadoPago {
  PENDIENTE = 'pendiente',
  PAGADO = 'pagado',
  ANULADO = 'anulado',
}

@Entity()
export class Factura {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ unique: true })
  pedidoId: number;

  @ManyToOne(() => Pedido)
  @JoinColumn({ name: 'pedidoId' })
  pedido: Pedido;

  @Column({ type: 'decimal', precision: 10, scale: 2 })
  total: number;

  @Column({ type: 'enum', enum: EstadoPago, default: EstadoPago.PENDIENTE })
  estadoPago: EstadoPago;

  @Column({ nullable: true })
  tipoPagoId: number;

  @ManyToOne(() => TipoPago)
  @JoinColumn({ name: 'tipoPagoId' })
  tipoPago: TipoPago;

  @CreateDateColumn()
  fechaEmision: Date;
}
