import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ProductoIngrediente } from './entities/producto-ingrediente.entity';
import { CreateProductoIngredienteDto } from './dto/create-producto-ingrediente.dto';
import { UpdateProductoIngredienteDto } from './dto/update-producto-ingrediente.dto';
import { Producto, TipoProducto } from 'src/productos/entities/producto.entity';

@Injectable()
export class ProductoIngredienteService {
  constructor(
    @InjectRepository(ProductoIngrediente) private readonly repo: Repository<ProductoIngrediente>,
    @InjectRepository(Producto) private readonly productRepo: Repository<Producto>,
  ) {}

  async create(dto: CreateProductoIngredienteDto): Promise<ProductoIngrediente> {
    const producto = await this.productRepo.findOne({ where: { id: dto.productoId } });
    if (!producto) throw new NotFoundException(`Producto #${dto.productoId} no encontrado`);
    if (producto.tipo !== TipoProducto.PLATO) {
      throw new BadRequestException('Solo los platos manejan recetas; bebidas y contables controlan su propio stock');
    }
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
