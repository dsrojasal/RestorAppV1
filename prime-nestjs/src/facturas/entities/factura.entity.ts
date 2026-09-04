import { Column, Entity, PrimaryGeneratedColumn, ManyToOne, JoinColumn, CreateDateColumn, Index } from 'typeorm';
import { Pedido } from 'src/pedidos/entities/pedido.entity';
import { TipoPago } from 'src/tipo-pago/entities/tipo-pago.entity';
import { Usuario } from 'src/usuarios/entities/usuario.entity';

export enum EstadoPago {
  PENDIENTE = 'pendiente',
  PAGADO = 'pagado',
  ANULADO = 'anulado',
}

@Entity()
@Index('IDX_FACTURA_COBRO', ['cobradoPorId', 'fechaCobro'])
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

  @Column({ type: 'int', nullable: true })
  creadoPorId: number | null;

  @ManyToOne(() => Usuario, { nullable: true })
  @JoinColumn({ name: 'creadoPorId' })
  creadoPor: Usuario;

  @Column({ type: 'int', nullable: true })
  cobradoPorId: number | null;

  @ManyToOne(() => Usuario, { nullable: true })
  @JoinColumn({ name: 'cobradoPorId' })
  cobradoPor: Usuario;

  @Column({ type: 'varchar', length: 50, nullable: true })
  cobradoPorRol: string | null;

  @Column({ type: 'timestamp', nullable: true })
  fechaCobro: Date | null;

  @Column({ type: 'int', nullable: true })
  anuladoPorId: number | null;

  @ManyToOne(() => Usuario, { nullable: true })
  @JoinColumn({ name: 'anuladoPorId' })
  anuladoPor: Usuario;

  @Column({ type: 'varchar', length: 300, nullable: true })
  motivoAnulacion: string | null;

  @CreateDateColumn()
  fechaEmision: Date;
}
