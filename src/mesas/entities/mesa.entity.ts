import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm';

export enum MesaEstado {
  LIBRE = 'libre',
  OCUPADA = 'ocupada',
  RESERVADA = 'reservada',
}

@Entity()
export class Mesa {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ unique: true })
  numero: number;

  @Column()
  capacidad: number;

  @Column({
    type: 'enum',
    enum: MesaEstado,
    default: MesaEstado.LIBRE,
  })
  estado: MesaEstado;

  @Column({ nullable: true })
  descripcion: string;
}
