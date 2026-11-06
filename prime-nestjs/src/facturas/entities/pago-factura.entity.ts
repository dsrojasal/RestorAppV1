import { Column, CreateDateColumn, Entity, Index, JoinColumn, ManyToOne, PrimaryGeneratedColumn } from 'typeorm';
import { TipoPago } from 'src/tipo-pago/entities/tipo-pago.entity';
import { Usuario } from 'src/usuarios/entities/usuario.entity';
import { Factura } from './factura.entity';

/**
 * Una factura puede pagarse con varios métodos (efectivo + tarjeta, etc.).
 * El arqueo de caja se calcula desde estos registros, no desde la factura,
 * porque solo la parte en efectivo entra al cajón.
 */
@Entity()
@Index('IDX_PAGO_FACTURA_FACTURA', ['facturaId'])
@Index('IDX_PAGO_FACTURA_TIPO', ['tipoPagoId'])
export class PagoFactura {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  facturaId: number;

  @ManyToOne(() => Factura, (f) => f.pagos, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'facturaId' })
  factura: Factura;

  @Column()
  tipoPagoId: number;

  @ManyToOne(() => TipoPago)
  @JoinColumn({ name: 'tipoPagoId' })
  tipoPago: TipoPago;

  @Column({ type: 'decimal', precision: 12, scale: 2 })
  monto: number;

  @Column({ type: 'timestamptz' })
  fecha: Date;

  @Column({ type: 'int', nullable: true })
  cobradoPorId: number | null;

  @ManyToOne(() => Usuario, { nullable: true })
  @JoinColumn({ name: 'cobradoPorId' })
  cobradoPor: Usuario | null;

  @Column({ type: 'varchar', length: 50, nullable: true })
  cobradoPorRol: string | null;

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt: Date;
}
