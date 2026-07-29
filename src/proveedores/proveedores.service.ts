import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Proveedor } from './entities/proveedor.entity';

@Injectable()
export class ProveedoresService {
  constructor(@InjectRepository(Proveedor) private readonly repo: Repository<Proveedor>) {}

  create(dto: Partial<Proveedor>): Promise<Proveedor> {
    return this.repo.save(dto);
  }

  findAll(): Promise<Proveedor[]> {
    return this.repo.find();
  }

  findOne(id: number): Promise<Proveedor | null> {
    return this.repo.findOneBy({ id });
  }

  async update(id: number, dto: Partial<Proveedor>): Promise<Proveedor> {
    const entity = await this.findOne(id);
    if (!entity) throw new NotFoundException(`Proveedor #${id} no encontrado`);
    Object.assign(entity, dto);
    return this.repo.save(entity);
  }

  async remove(id: number): Promise<void> {
    await this.repo.delete(id);
  }
}
