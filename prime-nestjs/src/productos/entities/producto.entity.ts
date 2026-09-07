import { Column, Entity, PrimaryGeneratedColumn, ManyToOne, JoinColumn } from 'typeorm';
import { Categoria } from 'src/categorias/entities/categoria.entity';
import { decimalTransformer } from 'src/common/decimal.transformer';

export enum TipoProducto {
  PLATO = 'plato',
  BEBIDA = 'bebida',
  POSTRE = 'postre',
  OTRO = 'otro',
}

@Entity()
export class Producto {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ length: 150 })
  nombre: string;

  @Column({ type: 'decimal', precision: 10, scale: 2, transformer: decimalTransformer })
  precio: number;

  @Column({ type: 'enum', enum: TipoProducto })
  tipo: TipoProducto;

  @Column({ type: 'decimal', precision: 14, scale: 3, default: 0, transformer: decimalTransformer })
  stock: number;

  @Column({ type: 'decimal', precision: 14, scale: 3, default: 0, transformer: decimalTransformer })
  stockReservado: number;

  @Column({ type: 'decimal', precision: 14, scale: 3, default: 0, transformer: decimalTransformer })
  stockMinimo: number;

  @Column({ type: 'varchar', length: 50, nullable: true })
  stockMinimoUnidad: string | null;

  @Column({ default: true })
  isActive: boolean;

  @Column()
  categoriaId: number;

  @ManyToOne(() => Categoria)
  @JoinColumn({ name: 'categoriaId' })
  categoria: Categoria;
}
