import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm';

@Entity()
export class Categoria {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ unique: true, length: 100 })
  nombre: string;

  @Column({ nullable: true, length: 300 })
  descripcion: string;

  @Column({ default: true })
  isActive: boolean;
}
