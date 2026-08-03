import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Factura } from './entities/factura.entity';
import { CreateFacturaDto } from './dto/create-factura.dto';
import { UpdateFacturaDto } from './dto/update-factura.dto';

@Injectable()
export class FacturasService {
  constructor(@InjectRepository(Factura) private readonly repo: Repository<Factura>) {}

  create(dto: CreateFacturaDto): Promise<Factura> {
    return this.repo.save(this.repo.create(dto));
  }

  findAll(): Promise<Factura[]> {
    return this.repo.find({ relations: ['pedido'] });
  }

  findOne(id: number): Promise<Factura | null> {
    return this.repo.findOne({ where: { id }, relations: ['pedido'] });
  }

  async update(id: number, dto: UpdateFacturaDto): Promise<Factura> {
    const entity = await this.findOne(id);
    if (!entity) throw new NotFoundException(`Factura #${id} no encontrada`);
    Object.assign(entity, dto);
    return this.repo.save(entity);
  }

  async remove(id: number): Promise<void> {
    await this.repo.delete(id);
  }
}
