import { Column, Entity, PrimaryGeneratedColumn, ManyToOne, JoinColumn, CreateDateColumn, Index, OneToMany } from 'typeorm';
import { Pedido } from 'src/pedidos/entities/pedido.entity';
import { TipoPago } from 'src/tipo-pago/entities/tipo-pago.entity';
import { Usuario } from 'src/usuarios/entities/usuario.entity';
import { Turno } from 'src/turnos/entities/turno.entity';
import { PagoFactura } from './pago-factura.entity';

export enum EstadoPago {
  PENDIENTE = 'pendiente',
  PAGADO = 'pagado',
  ANULADO = 'anulado',
}

@Entity()
@Index('IDX_FACTURA_COBRO', ['cobradoPorId', 'fechaCobro'])
@Index('IDX_FACTURA_TURNO', ['turnoId'])
export class Factura {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ unique: true })
  pedidoId: number;

  @ManyToOne(() => Pedido)
  @JoinColumn({ name: 'pedidoId' })
  pedido: Pedido;

  /** Suma de las líneas del pedido, sin impuestos ni propina. */
  @Column({ type: 'decimal', precision: 12, scale: 2, default: 0 })
  subtotal: number;

  @Column({ type: 'decimal', precision: 5, scale: 2, nullable: true })
  ivaPorcentaje: number | null;

  @Column({ type: 'decimal', precision: 12, scale: 2, default: 0 })
  iva: number;

  @Column({ type: 'decimal', precision: 5, scale: 2, nullable: true })
  propinaPorcentaje: number | null;

  @Column({ type: 'decimal', precision: 12, scale: 2, default: 0 })
  propina: number;

  /** Total pagado por el cliente: subtotal + IVA + propina. */
  @Column({ type: 'decimal', precision: 12, scale: 2 })
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

  @Column({ type: 'timestamptz', nullable: true })
  fechaCobro: Date | null;

  @Column({ type: 'int', nullable: true })
  turnoId: number | null;

  @ManyToOne(() => Turno, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'turnoId' })
  turno: Turno | null;

  /** Cobro autorizado por un administrador sin caja abierta (emergencia). */
  @Column({ type: 'boolean', default: false })
  cobradoSinTurno: boolean;

  @Column({ type: 'int', nullable: true })
  autorizadoSinTurnoPorId: number | null;

  @ManyToOne(() => Usuario, { nullable: true })
  @JoinColumn({ name: 'autorizadoSinTurnoPorId' })
  autorizadoSinTurnoPor: Usuario | null;

  @Column({ type: 'varchar', length: 300, nullable: true })
  motivoSinTurno: string | null;

  @OneToMany(() => PagoFactura, (p) => p.factura, { cascade: true })
  pagos: PagoFactura[];

  @Column({ type: 'int', nullable: true })
  anuladoPorId: number | null;

  @ManyToOne(() => Usuario, { nullable: true })
  @JoinColumn({ name: 'anuladoPorId' })
  anuladoPor: Usuario;

  @Column({ type: 'varchar', length: 300, nullable: true })
  motivoAnulacion: string | null;

  @CreateDateColumn({ type: 'timestamptz' })
  fechaEmision: Date;
}
