import { Column, Entity, PrimaryGeneratedColumn, ManyToOne, JoinColumn, CreateDateColumn, UpdateDateColumn, BeforeInsert } from 'typeorm';
import { hashSync } from 'bcryptjs';
import { Exclude } from 'class-transformer';
import { Rol } from 'src/rol/entities/rol.entity';

@Entity()
export class Usuario {
  @BeforeInsert()
  hashPassword() {
    this.password = hashSync(this.password, 10);
  }
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ length: 100 })
  name: string;

  @Column({ unique: true, length: 150 })
  email: string;

  @Column({ length: 255 })
  @Exclude()
  password: string;

  @Column({ default: true })
  isActive: boolean;

  @Column()
  rolId: number;

  @ManyToOne(() => Rol)
  @JoinColumn({ name: 'rolId' })
  rol: Rol;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
