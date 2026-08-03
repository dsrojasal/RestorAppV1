import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Mesa } from './entities/mesa.entity';
import { CreateMesaDto } from './dto/create-mesa.dto';
import { UpdateMesaDto } from './dto/update-mesa.dto';

@Injectable()
export class MesasService {
  constructor(@InjectRepository(Mesa) private readonly repo: Repository<Mesa>) {}

  async create(dto: CreateMesaDto): Promise<Mesa> {
    const exists = await this.repo.findOneBy({ numero: dto.numero });
    if (exists) throw new ConflictException(`Ya existe una mesa con numero ${dto.numero}`);
    return this.repo.save(this.repo.create(dto));
  }

  findAll(): Promise<Mesa[]> {
    return this.repo.find({ order: { numero: 'ASC' } });
  }

  findOne(id: number): Promise<Mesa | null> {
    return this.repo.findOneBy({ id });
  }

  async update(id: number, dto: UpdateMesaDto): Promise<Mesa> {
    const mesa = await this.findOne(id);
    if (!mesa) throw new NotFoundException(`Mesa #${id} no encontrada`);
    Object.assign(mesa, dto);
    return this.repo.save(mesa);
  }

  async remove(id: number): Promise<void> {
    const mesa = await this.findOne(id);
    if (!mesa) throw new NotFoundException(`Mesa #${id} no encontrada`);
    await this.repo.delete(id);
  }
}
