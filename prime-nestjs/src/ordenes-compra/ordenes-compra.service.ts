import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { OrdenCompra } from './entities/orden-compra.entity';
import { CreateOrdenCompraDto } from './dto/create-orden-compra.dto';
import { UpdateOrdenCompraDto } from './dto/update-orden-compra.dto';

@Injectable()
export class OrdenesCompraService {
  constructor(@InjectRepository(OrdenCompra) private readonly repo: Repository<OrdenCompra>) {}

  create(dto: CreateOrdenCompraDto): Promise<OrdenCompra> {
    return this.repo.save(this.repo.create(dto));
  }

  findAll(): Promise<OrdenCompra[]> {
    return this.repo.find({ relations: ['proveedor'] });
  }

  findOne(id: number): Promise<OrdenCompra | null> {
    return this.repo.findOne({ where: { id }, relations: ['proveedor'] });
  }

  async update(id: number, dto: UpdateOrdenCompraDto): Promise<OrdenCompra> {
    const entity = await this.findOne(id);
    if (!entity) throw new NotFoundException(`OrdenCompra #${id} no encontrada`);
    Object.assign(entity, dto);
    return this.repo.save(entity);
  }

  async remove(id: number): Promise<void> {
    await this.repo.delete(id);
  }
}
