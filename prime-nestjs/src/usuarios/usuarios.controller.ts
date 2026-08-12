import { Controller, Get, Post, Body, Patch, Param, Delete, ParseIntPipe, UseGuards, Req } from '@nestjs/common';
import { Request } from 'express';
import { UsuariosService } from './usuarios.service';
import { CreateUsuarioDto } from './dto/create-usuario.dto';
import { UpdateUsuarioDto } from './dto/update-usuario.dto';
import { RolesGuard } from 'src/auth/strategy/roles.guard';
import { Roles } from 'src/custom.decorator';
import { Role } from 'src/common/enums/role.enum';

interface AuthedRequest extends Request {
  user?: { id: number; name: string; email: string; rolId: number; isActive: boolean; createdAt: Date; rol?: { nombre: string } };
}

@Controller('usuarios')
export class UsuariosController {
  constructor(private readonly usuariosService: UsuariosService) {}

  @Get('me')
  me(@Req() req: AuthedRequest) {
    const user = req.user;
    if (!user) return null;
    return {
      id: user.id,
      name: user.name,
      email: user.email,
      rolId: user.rolId,
      rol: user.rol?.nombre || '',
      isActive: user.isActive,
      createdAt: user.createdAt,
    };
  }

  @Post()
  @UseGuards(RolesGuard)
  @Roles(Role.ADMIN)
  create(@Body() dto: CreateUsuarioDto) {
    return this.usuariosService.create(dto);
  }

  @Get()
  findAll() {
    return this.usuariosService.findAll();
  }

  @Get('email/:email')
  findByEmail(@Param('email') email: string) {
    return this.usuariosService.findOne(email);
  }

  @Get(':id')
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.usuariosService.findById(id);
  }

  @Patch(':id')
  @UseGuards(RolesGuard)
  @Roles(Role.ADMIN)
  update(@Param('id', ParseIntPipe) id: number, @Body() dto: UpdateUsuarioDto) {
    return this.usuariosService.update(id, dto);
  }

  @Delete(':id')
  @UseGuards(RolesGuard)
  @Roles(Role.ADMIN)
  remove(@Param('id', ParseIntPipe) id: number, @Req() req: AuthedRequest) {
    return this.usuariosService.remove(id, req.user?.id);
  }

  @Patch(':id/toggle-active')
  @UseGuards(RolesGuard)
  @Roles(Role.ADMIN)
  toggleActive(@Param('id', ParseIntPipe) id: number, @Req() req: AuthedRequest) {
    return this.usuariosService.toggleActive(id, req.user?.id);
  }
}
