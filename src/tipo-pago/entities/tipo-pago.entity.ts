import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm';

@Entity()
export class TipoPago {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ unique: true, length: 80 })
  nombre: string;
}
