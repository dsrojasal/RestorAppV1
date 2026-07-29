import { Column, Entity, PrimaryGeneratedColumn, ManyToOne, JoinColumn } from 'typeorm';
import { Categoria } from 'src/categorias/entities/categoria.entity';

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

  @Column({ type: 'decimal', precision: 10, scale: 2 })
  precio: number;

  @Column({ type: 'enum', enum: TipoProducto })
  tipo: TipoProducto;

  @Column({ default: 0 })
  stock: number;

  @Column({ default: 0 })
  stockMinimo: number;

  @Column({ default: true })
  isActive: boolean;

  @Column()
  categoriaId: number;

  @ManyToOne(() => Categoria)
  @JoinColumn({ name: 'categoriaId' })
  categoria: Categoria;
}
