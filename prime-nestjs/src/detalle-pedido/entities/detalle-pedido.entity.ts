import { Column, Entity, PrimaryGeneratedColumn, ManyToOne, JoinColumn } from 'typeorm';
import { Pedido } from 'src/pedidos/entities/pedido.entity';
import { Producto } from 'src/productos/entities/producto.entity';

export enum DetallePedidoEstado {
  PENDIENTE = 'pendiente',
  EN_PREPARACION = 'en_preparacion',
  LISTO = 'listo',
  CANCELADO = 'cancelado',
}

@Entity()
export class DetallePedido {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  pedidoId: number;

  @ManyToOne(() => Pedido)
  @JoinColumn({ name: 'pedidoId' })
  pedido: Pedido;

  @Column()
  productoId: number;

  @ManyToOne(() => Producto)
  @JoinColumn({ name: 'productoId' })
  producto: Producto;

  @Column({ default: 1 })
  cantidad: number;

  @Column({ type: 'decimal', precision: 10, scale: 2 })
  precioUnitario: number;

  @Column({ type: 'decimal', precision: 10, scale: 2 })
  subtotal: number;

  @Column({ type: 'enum', enum: DetallePedidoEstado, default: DetallePedidoEstado.PENDIENTE })
  estado: DetallePedidoEstado;

  @Column({ nullable: true, length: 300 })
  observacion: string;
}
