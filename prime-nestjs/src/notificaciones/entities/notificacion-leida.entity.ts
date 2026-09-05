import { CreateDateColumn, Entity, PrimaryColumn } from 'typeorm';

@Entity('notificacion_leida')
export class NotificacionLeida {
  @PrimaryColumn({ type: 'int' })
  notificacionId: number;

  @PrimaryColumn({ type: 'int' })
  usuarioId: number;

  @CreateDateColumn({ type: 'timestamptz' })
  leidaAt: Date;
}
