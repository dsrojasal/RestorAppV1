import { Column, Entity, PrimaryGeneratedColumn, CreateDateColumn, Index } from 'typeorm';
import { decimalTransformer } from 'src/common/decimal.transformer';

export enum TipoMovimientoInventario {
  RESERVA = 'reserva',
  LIBERACION = 'liberacion',
  CONSUMO = 'consumo',
  REABASTECIMIENTO = 'reabastecimiento',
  AJUSTE_MANUAL = 'ajuste_manual',
}

@Entity()
@Index('IDX_MOV_INVENTARIO_PEDIDO', ['pedidoId'])
@Index('IDX_MOV_INVENTARIO_INGREDIENTE', ['ingredienteId'])
@Index('IDX_MOV_INVENTARIO_FECHA', ['createdAt'])
export class MovimientoInventario {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'bigint', nullable: true })
  pedidoId: number | null;

  @Column({ type: 'bigint', nullable: true })
  pedidoLineaId: number | null;

  @Column({ type: 'bigint', nullable: true })
  ingredienteId: number | null;

  @Column({ type: 'bigint', nullable: true })
  productoId: number | null;

  @Column({ type: 'enum', enum: TipoMovimientoInventario })
  tipo: TipoMovimientoInventario;

  @Column({ type: 'decimal', precision: 14, scale: 3, transformer: decimalTransformer })
  cantidad: number;

  @Column({ type: 'bigint', nullable: true })
  usuarioId: number | null;

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt: Date;
}
