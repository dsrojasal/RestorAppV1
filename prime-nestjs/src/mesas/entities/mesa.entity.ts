import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm';

export enum MesaEstado {
  LIBRE = 'libre',
  OCUPADA = 'ocupada',
  RESERVADA = 'reservada',
  MANTENIMIENTO = 'mantenimiento',
}

@Entity()
export class Mesa {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ unique: true })
  numero: number;

  @Column()
  capacidad: number;

  @Column({ type: 'enum', enum: MesaEstado, default: MesaEstado.LIBRE })
  estado: MesaEstado;

  @Column({ nullable: true, length: 200 })
  descripcion: string;
}
