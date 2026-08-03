import { Column, Entity, PrimaryGeneratedColumn, ManyToOne, JoinColumn, CreateDateColumn } from 'typeorm';
import { Pedido } from 'src/pedidos/entities/pedido.entity';

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

  @CreateDateColumn()
  fechaEmision: Date;
}
