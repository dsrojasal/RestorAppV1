import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm';

@Entity()
export class Ingrediente {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ unique: true, length: 150 })
  nombre: string;

  @Column({ default: 0 })
  stock: number;

  @Column({ default: 0 })
  stockMinimo: number;

  @Column({ length: 50 })
  unidad: string;
}
