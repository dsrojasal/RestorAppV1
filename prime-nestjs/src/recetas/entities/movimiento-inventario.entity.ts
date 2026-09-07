import { Column, Entity, PrimaryGeneratedColumn, CreateDateColumn } from 'typeorm';

export enum TipoMovimientoInventario {
  RESERVA = 'reserva',
  LIBERACION = 'liberacion',
  CONSUMO = 'consumo',
  REABASTECIMIENTO = 'reabastecimiento',
  AJUSTE_MANUAL = 'ajuste_manual',
}

@Entity()
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

  @Column({ type: 'decimal', precision: 14, scale: 3 })
  cantidad: number;

  @Column({ type: 'bigint', nullable: true })
  usuarioId: number | null;

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt: Date;
}
