import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ProductoIngrediente } from './entities/producto-ingrediente.entity';
import { CreateProductoIngredienteDto } from './dto/create-producto-ingrediente.dto';
import { UpdateProductoIngredienteDto } from './dto/update-producto-ingrediente.dto';

@Injectable()
export class ProductoIngredienteService {
  constructor(@InjectRepository(ProductoIngrediente) private readonly repo: Repository<ProductoIngrediente>) {}

  create(dto: CreateProductoIngredienteDto): Promise<ProductoIngrediente> {
    return this.repo.save(this.repo.create(dto));
  }

  findAll(): Promise<ProductoIngrediente[]> {
    return this.repo.find({ relations: ['producto', 'ingrediente'] });
  }

  findOne(id: number): Promise<ProductoIngrediente | null> {
    return this.repo.findOne({ where: { id }, relations: ['producto', 'ingrediente'] });
  }

  findByProducto(productoId: number): Promise<ProductoIngrediente[]> {
    return this.repo.find({ where: { productoId }, relations: ['ingrediente'] });
  }

  async update(id: number, dto: UpdateProductoIngredienteDto): Promise<ProductoIngrediente> {
    const entity = await this.findOne(id);
    if (!entity) throw new NotFoundException(`ProductoIngrediente #${id} no encontrado`);
    Object.assign(entity, dto);
    return this.repo.save(entity);
  }

  async remove(id: number): Promise<void> {
    await this.repo.delete(id);
  }
}
