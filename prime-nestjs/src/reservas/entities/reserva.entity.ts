import { Column, Entity, PrimaryGeneratedColumn, ManyToOne, JoinColumn, CreateDateColumn } from 'typeorm';
import { Mesa } from 'src/mesas/entities/mesa.entity';
import { Usuario } from 'src/usuarios/entities/usuario.entity';

export enum ReservaEstado {
  PENDIENTE = 'pendiente',
  CONFIRMADA = 'confirmada',
  CANCELADA = 'cancelada',
  COMPLETADA = 'completada',
}

@Entity()
export class Reserva {
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

  @Column({ length: 150 })
  nombreCliente: string;

  @Column({ type: 'date' })
  fecha: string;

  @Column({ type: 'time' })
  horaInicio: string;

  @Column({ type: 'time' })
  horaFin: string;

  @Column()
  numPersonas: number;

  @Column({ type: 'enum', enum: ReservaEstado, default: ReservaEstado.PENDIENTE })
  estado: ReservaEstado;

  @Column({ nullable: true, length: 300 })
  observaciones: string;

  @CreateDateColumn()
  createdAt: Date;
}
