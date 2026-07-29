import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Reserva } from './entities/reserva.entity';
import { CreateReservaDto } from './dto/create-reserva.dto';
import { UpdateReservaDto } from './dto/update-reserva.dto';

@Injectable()
export class ReservasService {
  constructor(@InjectRepository(Reserva) private readonly repo: Repository<Reserva>) {}

  create(dto: CreateReservaDto): Promise<Reserva> {
    return this.repo.save(this.repo.create(dto));
  }

  findAll(): Promise<Reserva[]> {
    return this.repo.find({ relations: ['mesa', 'usuario'] });
  }

  findOne(id: number): Promise<Reserva | null> {
    return this.repo.findOne({ where: { id }, relations: ['mesa', 'usuario'] });
  }

  async update(id: number, dto: UpdateReservaDto): Promise<Reserva> {
    const entity = await this.findOne(id);
    if (!entity) throw new NotFoundException(`Reserva #${id} no encontrada`);
    Object.assign(entity, dto);
    return this.repo.save(entity);
  }

  async remove(id: number): Promise<void> {
    await this.repo.delete(id);
  }
}
