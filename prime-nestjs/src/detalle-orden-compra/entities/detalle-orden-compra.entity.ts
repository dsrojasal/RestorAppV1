import { Column, Entity, PrimaryGeneratedColumn, ManyToOne, JoinColumn } from 'typeorm';
import { OrdenCompra } from 'src/ordenes-compra/entities/orden-compra.entity';
import { Ingrediente } from 'src/ingredientes/entities/ingrediente.entity';

@Entity()
export class DetalleOrdenCompra {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  ordenCompraId: number;

  @ManyToOne(() => OrdenCompra)
  @JoinColumn({ name: 'ordenCompraId' })
  ordenCompra: OrdenCompra;

  @Column()
  ingredienteId: number;

  @ManyToOne(() => Ingrediente)
  @JoinColumn({ name: 'ingredienteId' })
  ingrediente: Ingrediente;

  @Column({ default: 1 })
  cantidad: number;

  @Column({ type: 'decimal', precision: 10, scale: 2, default: 0.0 })
  precioUnitario: number;

  @Column({ type: 'decimal', precision: 10, scale: 2 })
  subtotal: number;
}
