import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Pedido } from './entities/pedido.entity';
import { CreatePedidoDto } from './dto/create-pedido.dto';
import { UpdatePedidoDto } from './dto/update-pedido.dto';

@Injectable()
export class PedidosService {
  constructor(@InjectRepository(Pedido) private readonly repo: Repository<Pedido>) {}

  create(dto: CreatePedidoDto): Promise<Pedido> {
    return this.repo.save(this.repo.create(dto));
  }

  findAll(): Promise<Pedido[]> {
    return this.repo.find({ relations: ['mesa', 'usuario', 'tipoPago'] });
  }

  findOne(id: number): Promise<Pedido | null> {
    return this.repo.findOne({ where: { id }, relations: ['mesa', 'usuario', 'tipoPago'] });
  }

  async update(id: number, dto: UpdatePedidoDto): Promise<Pedido> {
    const entity = await this.findOne(id);
    if (!entity) throw new NotFoundException(`Pedido #${id} no encontrado`);
    Object.assign(entity, dto);
    return this.repo.save(entity);
  }

  async remove(id: number): Promise<void> {
    await this.repo.delete(id);
  }
}
