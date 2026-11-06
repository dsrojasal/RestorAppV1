import { Column, CreateDateColumn, Entity, Index, JoinColumn, ManyToOne, OneToMany, PrimaryGeneratedColumn } from 'typeorm';
import { Usuario } from 'src/usuarios/entities/usuario.entity';
import { TurnoUsuario } from './turno-usuario.entity';
import { MovimientoCaja } from './movimiento-caja.entity';

export enum EstadoTurno {
  ABIERTO = 'abierto',
  CERRADO = 'cerrado',
}

export interface ResumenPagoTurno {
  tipoPagoId: number | null;
  nombre: string;
  total: number;
  cuentas: number;
}

export interface ResumenMeseroTurno {
  usuarioId: number | null;
  nombre: string;
  rol: string | null;
  total: number;
  cuentas: number;
}

/**
 * Un turno de caja. Solo puede existir uno abierto a la vez; el índice
 * único parcial lo garantiza también a nivel de base de datos.
 */
@Entity()
@Index('UQ_TURNO_ABIERTO', ['estado'], { unique: true, where: '"estado" = \'abierto\'' })
@Index('IDX_TURNO_APERTURA', ['fechaApertura'])
export class Turno {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'enum', enum: EstadoTurno, default: EstadoTurno.ABIERTO })
  estado: EstadoTurno;

  @Column({ type: 'decimal', precision: 12, scale: 2, default: 0 })
  montoInicial: number;

  /** Efectivo que debería haber en caja al cerrar (inicial + ventas en efectivo). */
  @Column({ type: 'decimal', precision: 12, scale: 2, nullable: true })
  montoEsperado: number | null;

  @Column({ type: 'decimal', precision: 12, scale: 2, nullable: true })
  montoContado: number | null;

  @Column({ type: 'decimal', precision: 12, scale: 2, nullable: true })
  diferencia: number | null;

  @Column({ type: 'decimal', precision: 12, scale: 2, default: 0 })
  totalVentas: number;

  @Column({ type: 'decimal', precision: 12, scale: 2, default: 0 })
  ventasEfectivo: number;

  @Column({ type: 'decimal', precision: 12, scale: 2, default: 0 })
  totalEntradas: number;

  @Column({ type: 'decimal', precision: 12, scale: 2, default: 0 })
  totalSalidas: number;

  @Column({ type: 'decimal', precision: 12, scale: 2, default: 0 })
  totalIva: number;

  @Column({ type: 'decimal', precision: 12, scale: 2, default: 0 })
  totalPropina: number;

  @Column({ type: 'int', default: 0 })
  cantidadFacturas: number;

  /** Foto del desglose por método de pago al momento del cierre. */
  @Column({ type: 'jsonb', nullable: true })
  resumenPagos: ResumenPagoTurno[] | null;

  /** Foto de las ventas por mesero al momento del cierre. */
  @Column({ type: 'jsonb', nullable: true })
  resumenMeseros: ResumenMeseroTurno[] | null;

  /** Obligatorio cuando el arqueo no cuadra. */
  @Column({ type: 'varchar', length: 300, nullable: true })
  motivoDiferencia: string | null;

  @Column({ type: 'int' })
  abiertoPorId: number;

  @ManyToOne(() => Usuario)
  @JoinColumn({ name: 'abiertoPorId' })
  abiertoPor: Usuario;

  @Column({ type: 'int', nullable: true })
  cerradoPorId: number | null;

  @ManyToOne(() => Usuario, { nullable: true })
  @JoinColumn({ name: 'cerradoPorId' })
  cerradoPor: Usuario | null;

  @Column({ type: 'varchar', length: 300, nullable: true })
  notas: string | null;

  @CreateDateColumn({ type: 'timestamptz' })
  fechaApertura: Date;

  @Column({ type: 'timestamptz', nullable: true })
  fechaCierre: Date | null;

  @OneToMany(() => TurnoUsuario, (tu) => tu.turno, { cascade: true })
  personal: TurnoUsuario[];

  @OneToMany(() => MovimientoCaja, (m) => m.turno)
  movimientos: MovimientoCaja[];
}
