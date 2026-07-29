import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { DetalleOrdenCompra } from './entities/detalle-orden-compra.entity';
import { CreateDetalleOrdenCompraDto } from './dto/create-detalle-orden-compra.dto';
import { UpdateDetalleOrdenCompraDto } from './dto/update-detalle-orden-compra.dto';

@Injectable()
export class DetalleOrdenCompraService {
  constructor(@InjectRepository(DetalleOrdenCompra) private readonly repo: Repository<DetalleOrdenCompra>) {}

  create(dto: CreateDetalleOrdenCompraDto): Promise<DetalleOrdenCompra> {
    const subtotal = Number((dto.cantidad ?? 1) * (dto.precioUnitario ?? 0));
    return this.repo.save(this.repo.create({ ...dto, subtotal }));
  }

  findAll(): Promise<DetalleOrdenCompra[]> {
    return this.repo.find({ relations: ['ordenCompra', 'ingrediente'] });
  }

  findOne(id: number): Promise<DetalleOrdenCompra | null> {
    return this.repo.findOne({ where: { id }, relations: ['ordenCompra', 'ingrediente'] });
  }

  findByOrdenCompra(ordenCompraId: number): Promise<DetalleOrdenCompra[]> {
    return this.repo.find({ where: { ordenCompraId }, relations: ['ingrediente'] });
  }

  async update(id: number, dto: UpdateDetalleOrdenCompraDto): Promise<DetalleOrdenCompra> {
    const entity = await this.findOne(id);
    if (!entity) throw new NotFoundException(`DetalleOrdenCompra #${id} no encontrado`);
    const updated = { ...entity, ...dto } as DetalleOrdenCompra;
    updated.subtotal = Number((updated.cantidad ?? 1) * (updated.precioUnitario ?? 0));
    Object.assign(entity, updated);
    return this.repo.save(entity);
  }

  async remove(id: number): Promise<void> {
    await this.repo.delete(id);
  }
}
