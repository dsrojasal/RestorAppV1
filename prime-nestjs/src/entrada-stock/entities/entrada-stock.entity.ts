import { Column, Entity, PrimaryGeneratedColumn, ManyToOne, JoinColumn, CreateDateColumn } from 'typeorm';
import { Producto } from 'src/productos/entities/producto.entity';
import { Ingrediente } from 'src/ingredientes/entities/ingrediente.entity';
import { Usuario } from 'src/usuarios/entities/usuario.entity';
import { decimalTransformer } from 'src/common/decimal.transformer';

@Entity()
export class EntradaStock {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ nullable: true })
  productoId: number | null;

  @ManyToOne(() => Producto)
  @JoinColumn({ name: 'productoId' })
  producto: Producto;

  @Column({ nullable: true })
  ingredienteId: number | null;

  @ManyToOne(() => Ingrediente)
  @JoinColumn({ name: 'ingredienteId' })
  ingrediente: Ingrediente;

  @Column({ type: 'decimal', precision: 14, scale: 3, transformer: decimalTransformer })
  stockAntes: number;

  @Column({ type: 'decimal', precision: 14, scale: 3, transformer: decimalTransformer })
  cantidad: number;

  @Column({ type: 'decimal', precision: 14, scale: 3, transformer: decimalTransformer })
  stockDespues: number;

  @Column()
  usuarioId: number;

  @ManyToOne(() => Usuario)
  @JoinColumn({ name: 'usuarioId' })
  usuario: Usuario;

  @CreateDateColumn({ type: 'timestamptz' })
  fecha: Date;
}
