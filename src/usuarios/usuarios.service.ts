import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { hashSync } from 'bcryptjs';
import { Usuario } from './entities/usuario.entity';
import { CreateUsuarioDto } from './dto/create-usuario.dto';
import { UpdateUsuarioDto } from './dto/update-usuario.dto';

@Injectable()
export class UsuariosService {
  constructor(@InjectRepository(Usuario) private readonly usuariosRepository: Repository<Usuario>) {}

  async create(dto: CreateUsuarioDto): Promise<Usuario> {
    const usuario = this.usuariosRepository.create(dto);
    return this.usuariosRepository.save(usuario);
  }

  async findAll(): Promise<Usuario[]> {
    return this.usuariosRepository.find({
      relations: ['rol'],
      select: ['id', 'name', 'email', 'isActive', 'rolId', 'createdAt'],
    });
  }

  findOne(email: string): Promise<Usuario | null> {
    return this.usuariosRepository.findOne({
      where: { email },
      relations: ['rol'],
    });
  }

  findById(id: number): Promise<Usuario | null> {
    return this.usuariosRepository.findOne({
      where: { id },
      relations: ['rol'],
    });
  }

  async remove(id: number, currentUserId?: number): Promise<void> {
    if (id === currentUserId) {
      throw new BadRequestException('No puedes eliminar tu propia cuenta');
    }
    await this.usuariosRepository.delete(id);
  }

  async update(id: number, dto: UpdateUsuarioDto): Promise<Usuario> {
    const usuario = await this.findById(id);
    if (!usuario) throw new NotFoundException(`Usuario #${id} no encontrado`);
    if (dto.password) {
      dto.password = hashSync(dto.password, 10);
    }
    Object.assign(usuario, dto);
    return this.usuariosRepository.save(usuario);
  }

  async toggleActive(id: number, currentUserId?: number): Promise<Usuario> {
    if (id === currentUserId) {
      throw new BadRequestException('No puedes desactivar tu propia cuenta');
    }
    const usuario = await this.findById(id);
    if (!usuario) throw new NotFoundException(`Usuario #${id} no encontrado`);
    usuario.isActive = !usuario.isActive;
    return this.usuariosRepository.save(usuario);
  }
}
