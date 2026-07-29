import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm';

@Entity()
export class Proveedor {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ length: 150 })
  nombre: string;

  @Column({ nullable: true, length: 100 })
  contacto: string;

  @Column({ nullable: true, length: 150 })
  email: string;
}
