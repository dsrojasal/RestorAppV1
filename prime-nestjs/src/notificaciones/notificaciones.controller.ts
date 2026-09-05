import { Controller, Get, Param, ParseIntPipe, Post, Req } from '@nestjs/common';
import { Request } from 'express';
import { Usuario } from 'src/usuarios/entities/usuario.entity';
import { NotificacionesService } from './notificaciones.service';

interface AuthedRequest extends Request {
  user?: Usuario;
}

@Controller('notificaciones')
export class NotificacionesController {
  constructor(private readonly service: NotificacionesService) {}

  @Get()
  listar(@Req() req: AuthedRequest) {
    return this.service.listar(req.user!.id, req.user!.rol?.nombre);
  }

  @Post(':id/leer')
  async marcarLeida(@Param('id', ParseIntPipe) id: number, @Req() req: AuthedRequest) {
    await this.service.marcarLeida(id, req.user!.id);
    return { ok: true };
  }

  @Post('leer-todas')
  async marcarTodas(@Req() req: AuthedRequest) {
    await this.service.marcarTodasLeidas(req.user!.id, req.user!.rol?.nombre);
    return { ok: true };
  }
}
