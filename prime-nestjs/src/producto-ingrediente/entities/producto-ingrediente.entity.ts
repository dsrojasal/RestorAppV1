import { Column, Entity, PrimaryGeneratedColumn, ManyToOne, JoinColumn, Unique } from 'typeorm';
import { Producto } from 'src/productos/entities/producto.entity';
import { Ingrediente } from 'src/ingredientes/entities/ingrediente.entity';

@Entity()
@Unique(['productoId', 'ingredienteId'])
export class ProductoIngrediente {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  productoId: number;

  @ManyToOne(() => Producto)
  @JoinColumn({ name: 'productoId' })
  producto: Producto;

  @Column()
  ingredienteId: number;

  @ManyToOne(() => Ingrediente)
  @JoinColumn({ name: 'ingredienteId' })
  ingrediente: Ingrediente;

  @Column({ type: 'decimal', precision: 10, scale: 3, default: 1 })
  cantidad: number;
}
