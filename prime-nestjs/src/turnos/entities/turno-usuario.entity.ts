import { Column, Entity, Index, JoinColumn, ManyToOne, PrimaryGeneratedColumn, Unique } from 'typeorm';
import { Usuario } from 'src/usuarios/entities/usuario.entity';
import { Turno } from './turno.entity';

export enum RolTurno {
  MESERO = 'mesero',
  CAJERO = 'cajero',
  COCINERO = 'cocinero',
}

/**
 * Asignación operativa de un usuario a un turno. Un mismo usuario puede
 * tener varios roles en el mismo turno (por ejemplo Mesero y Cajero).
 */
@Entity()
@Unique(['turnoId', 'usuarioId', 'rolTurno'])
@Index('IDX_TURNO_USUARIO_TURNO', ['turnoId'])
@Index('IDX_TURNO_USUARIO_USUARIO', ['usuarioId'])
export class TurnoUsuario {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  turnoId: number;

  @ManyToOne(() => Turno, (t) => t.personal, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'turnoId' })
  turno: Turno;

  @Column()
  usuarioId: number;

  @ManyToOne(() => Usuario)
  @JoinColumn({ name: 'usuarioId' })
  usuario: Usuario;

  @Column({ type: 'enum', enum: RolTurno })
  rolTurno: RolTurno;
}
