import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Ingrediente } from './entities/ingrediente.entity';
import { CreateIngredienteDto } from './dto/create-ingrediente.dto';
import { UpdateIngredienteDto } from './dto/update-ingrediente.dto';

@Injectable()
export class IngredientesService {
  constructor(@InjectRepository(Ingrediente) private readonly repo: Repository<Ingrediente>) {}

  create(dto: CreateIngredienteDto): Promise<Ingrediente> {
    return this.repo.save(this.repo.create(dto));
  }

  findAll(): Promise<Ingrediente[]> {
    return this.repo.find();
  }

  findOne(id: number): Promise<Ingrediente | null> {
    return this.repo.findOneBy({ id });
  }

  async update(id: number, dto: UpdateIngredienteDto): Promise<Ingrediente> {
    const entity = await this.findOne(id);
    if (!entity) throw new NotFoundException(`Ingrediente #${id} no encontrado`);
    Object.assign(entity, dto);
    return this.repo.save(entity);
  }

  async remove(id: number): Promise<void> {
    await this.repo.delete(id);
  }
}
