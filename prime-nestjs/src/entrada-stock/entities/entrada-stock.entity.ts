import { Column, Entity, PrimaryGeneratedColumn, ManyToOne, JoinColumn, CreateDateColumn } from 'typeorm';
import { Producto } from 'src/productos/entities/producto.entity';
import { Ingrediente } from 'src/ingredientes/entities/ingrediente.entity';
import { Usuario } from 'src/usuarios/entities/usuario.entity';

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

  @Column()
  stockAntes: number;

  @Column()
  cantidad: number;

  @Column()
  stockDespues: number;

  @Column()
  usuarioId: number;

  @ManyToOne(() => Usuario)
  @JoinColumn({ name: 'usuarioId' })
  usuario: Usuario;

  @CreateDateColumn({ type: 'timestamptz' })
  fecha: Date;
}
