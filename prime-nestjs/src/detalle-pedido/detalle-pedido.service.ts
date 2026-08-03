import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { DetallePedido } from './entities/detalle-pedido.entity';
import { CreateDetallePedidoDto } from './dto/create-detalle-pedido.dto';
import { UpdateDetallePedidoDto } from './dto/update-detalle-pedido.dto';

@Injectable()
export class DetallePedidoService {
  constructor(@InjectRepository(DetallePedido) private readonly repo: Repository<DetallePedido>) {}

  create(dto: CreateDetallePedidoDto): Promise<DetallePedido> {
    const subtotal = Number((dto.cantidad ?? 1) * dto.precioUnitario);
    return this.repo.save(this.repo.create({ ...dto, subtotal }));
  }

  findAll(): Promise<DetallePedido[]> {
    return this.repo.find({ relations: ['pedido', 'producto'] });
  }

  findOne(id: number): Promise<DetallePedido | null> {
    return this.repo.findOne({ where: { id }, relations: ['pedido', 'producto'] });
  }

  findByPedido(pedidoId: number): Promise<DetallePedido[]> {
    return this.repo.find({ where: { pedidoId }, relations: ['producto'] });
  }

  async update(id: number, dto: UpdateDetallePedidoDto): Promise<DetallePedido> {
    const entity = await this.findOne(id);
    if (!entity) throw new NotFoundException(`DetallePedido #${id} no encontrado`);
    const updated = { ...entity, ...dto } as DetallePedido;
    updated.subtotal = Number((updated.cantidad ?? 1) * updated.precioUnitario);
    Object.assign(entity, updated);
    return this.repo.save(entity);
  }

  async remove(id: number): Promise<void> {
    await this.repo.delete(id);
  }
}
