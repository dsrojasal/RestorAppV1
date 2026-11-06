import { Column, CreateDateColumn, Entity, Index, JoinColumn, ManyToOne, PrimaryGeneratedColumn } from 'typeorm';
import { Turno } from './turno.entity';
import { Usuario } from 'src/usuarios/entities/usuario.entity';

export enum TipoMovimientoCaja {
  ENTRADA = 'entrada',
  SALIDA = 'salida',
}

/**
 * Movimiento de efectivo dentro de un turno (pago a proveedor, retiro,
 * fondo adicional, devolución, etc.). No se edita ni se borra: una
 * corrección se registra con un movimiento inverso y su motivo.
 */
@Entity()
@Index('IDX_MOVIMIENTO_CAJA_TURNO', ['turnoId', 'fecha'])
export class MovimientoCaja {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  turnoId: number;

  @ManyToOne(() => Turno, (t) => t.movimientos, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'turnoId' })
  turno: Turno;

  @Column({ type: 'enum', enum: TipoMovimientoCaja })
  tipo: TipoMovimientoCaja;

  @Column({ type: 'decimal', precision: 12, scale: 2 })
  monto: number;

  @Column({ type: 'varchar', length: 200 })
  motivo: string;

  @Column({ type: 'int' })
  usuarioId: number;

  @ManyToOne(() => Usuario)
  @JoinColumn({ name: 'usuarioId' })
  usuario: Usuario;

  @Column({ type: 'int', nullable: true })
  reversoDeId: number | null;

  @ManyToOne(() => MovimientoCaja, { nullable: true })
  @JoinColumn({ name: 'reversoDeId' })
  reversoDe: MovimientoCaja | null;

  @CreateDateColumn({ type: 'timestamptz' })
  fecha: Date;
}
