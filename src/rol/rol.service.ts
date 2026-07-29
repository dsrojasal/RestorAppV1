import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Rol } from './entities/rol.entity';
import { CreateRolDto } from './dto/create-rol.dto';
import { UpdateRolDto } from './dto/update-rol.dto';

@Injectable()
export class RolService {
  constructor(@InjectRepository(Rol) private readonly rolRepository: Repository<Rol>) {}

  create(dto: CreateRolDto): Promise<Rol> {
    return this.rolRepository.save(dto);
  }

  findAll(): Promise<Rol[]> {
    return this.rolRepository.find();
  }

  findOne(id: number): Promise<Rol | null> {
    return this.rolRepository.findOneBy({ id });
  }

  findByNombre(nombre: string): Promise<Rol | null> {
    return this.rolRepository.findOneBy({ nombre });
  }

  async update(id: number, dto: UpdateRolDto): Promise<Rol> {
    const rol = await this.findOne(id);
    if (!rol) throw new NotFoundException(`Rol #${id} no encontrado`);
    Object.assign(rol, dto);
    return this.rolRepository.save(rol);
  }

  async remove(id: number): Promise<void> {
    const rol = await this.findOne(id);
    if (!rol) throw new NotFoundException(`Rol #${id} no encontrado`);
    await this.rolRepository.delete(id);
  }
}
