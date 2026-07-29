import { Column, Entity, PrimaryGeneratedColumn, ManyToOne, JoinColumn, CreateDateColumn } from 'typeorm';
import { Proveedor } from 'src/proveedores/entities/proveedor.entity';

export enum OCEstado {
  BORRADOR = 'borrador',
  ENVIADA = 'enviada',
  RECIBIDA = 'recibida',
  CANCELADA = 'cancelada',
}

@Entity()
export class OrdenCompra {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  proveedorId: number;

  @ManyToOne(() => Proveedor)
  @JoinColumn({ name: 'proveedorId' })
  proveedor: Proveedor;

  @CreateDateColumn()
  fecha: Date;

  @Column({ type: 'enum', enum: OCEstado, default: OCEstado.BORRADOR })
  estado: OCEstado;
}
