import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Producto, TipoProducto } from './entities/producto.entity';
import { CreateProductoDto } from './dto/create-producto.dto';
import { UpdateProductoDto } from './dto/update-producto.dto';

@Injectable()
export class ProductosService {
  constructor(@InjectRepository(Producto) private readonly repo: Repository<Producto>) {}

  private removerStockPlato(dto: { tipo?: TipoProducto; stock?: number; stockMinimo?: number }): void {
    if (dto.tipo === TipoProducto.PLATO) {
      dto.stock = 0;
      dto.stockMinimo = 0;
    }
  }

  create(dto: CreateProductoDto): Promise<Producto> {
    this.removerStockPlato(dto);
    return this.repo.save(this.repo.create(dto));
  }

  findAll(): Promise<Producto[]> {
    return this.repo.find({ relations: ['categoria'] });
  }

  findOne(id: number): Promise<Producto | null> {
    return this.repo.findOne({ where: { id }, relations: ['categoria'] });
  }

  async update(id: number, dto: UpdateProductoDto): Promise<Producto> {
    const producto = await this.findOne(id);
    if (!producto) throw new NotFoundException(`Producto #${id} no encontrado`);
    Object.assign(producto, dto);
    this.removerStockPlato(producto);
    return this.repo.save(producto);
  }

  async remove(id: number): Promise<void> {
    await this.repo.delete(id);
  }
}
