import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm';
import { decimalTransformer } from 'src/common/decimal.transformer';

@Entity()
export class Ingrediente {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ unique: true, length: 150 })
  nombre: string;

  @Column({ type: 'decimal', precision: 14, scale: 3, default: 0, transformer: decimalTransformer })
  stock: number;

  @Column({ type: 'decimal', precision: 14, scale: 3, default: 0, transformer: decimalTransformer })
  stockReservado: number;

  @Column({ type: 'decimal', precision: 14, scale: 3, default: 0, transformer: decimalTransformer })
  stockMinimo: number;

  @Column({ type: 'varchar', length: 50, nullable: true })
  stockMinimoUnidad: string | null;

  @Column({ length: 50 })
  unidad: string;
}
