import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm';

@Entity()
export class Rol {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ unique: true, length: 50 })
  nombre: string;

  @Column({ nullable: true, length: 200 })
  descripcion: string;
}
