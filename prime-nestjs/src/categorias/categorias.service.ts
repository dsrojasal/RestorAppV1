import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Categoria } from './entities/categoria.entity';

@Injectable()
export class CategoriasService {
  constructor(@InjectRepository(Categoria) private readonly repo: Repository<Categoria>) {}

  create(dto: Partial<Categoria>): Promise<Categoria> {
    return this.repo.save(dto);
  }

  findAll(): Promise<Categoria[]> {
    return this.repo.find();
  }

  findOne(id: number): Promise<Categoria | null> {
    return this.repo.findOneBy({ id });
  }

  async update(id: number, dto: Partial<Categoria>): Promise<Categoria> {
    const categoria = await this.findOne(id);
    if (!categoria) throw new NotFoundException(`Categoria #${id} no encontrada`);
    Object.assign(categoria, dto);
    return this.repo.save(categoria);
  }

  async remove(id: number): Promise<void> {
    await this.repo.delete(id);
  }
}
