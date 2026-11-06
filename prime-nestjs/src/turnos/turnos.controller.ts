import { Body, Controller, Delete, Get, Param, ParseEnumPipe, ParseIntPipe, Post, Query, Req, UseGuards } from '@nestjs/common';
import { Request } from 'express';
import { RolesGuard } from 'src/auth/strategy/roles.guard';
import { Roles } from 'src/custom.decorator';
import { Role } from 'src/common/enums/role.enum';
import { TurnosService } from './turnos.service';
import { AbrirTurnoDto, AgregarPersonalTurnoDto, CerrarTurnoDto, HistorialTurnoQueryDto, MovimientoCajaDto } from './dto/turno.dto';
import { RolTurno } from './entities/turno-usuario.entity';

interface AuthedRequest extends Request {
  user?: { id: number; rol?: { nombre: string } };
}

@Controller('turnos')
@UseGuards(RolesGuard)
export class TurnosController {
  constructor(private readonly service: TurnosService) {}

  /** Indicador público para cualquier usuario autenticado. */
  @Get('estado')
  estado() {
    return this.service.estado();
  }

  /** Roles operativos del usuario en el turno abierto. */
  @Get('mi-turno')
  miTurno(@Req() req: AuthedRequest) {
    return this.service.miTurno(req.user?.id, req.user?.rol?.nombre);
  }

  @Get('actual')
  async actual(@Req() req: AuthedRequest) {
    await this.service.verificarAccesoCaja(req.user?.id, req.user?.rol?.nombre);
    return this.service.actual();
  }

  @Get('ultimo-cierre')
  async ultimoCierre(@Req() req: AuthedRequest) {
    await this.service.verificarAccesoCaja(req.user?.id, req.user?.rol?.nombre);
    return this.service.ultimoCierre();
  }

  @Get('cobros-sin-turno')
  @Roles(Role.ADMIN)
  cobrosSinTurno() {
    return this.service.cobrosSinTurno();
  }

  @Get()
  @Roles(Role.ADMIN)
  historial(@Query() query: HistorialTurnoQueryDto) {
    return this.service.historial(query);
  }

  @Get(':id/movimientos')
  async movimientos(@Param('id', ParseIntPipe) id: number, @Req() req: AuthedRequest) {
    await this.service.verificarAccesoCaja(req.user?.id, req.user?.rol?.nombre);
    return this.service.movimientos(id);
  }

  @Get(':id')
  async detalle(@Param('id', ParseIntPipe) id: number, @Req() req: AuthedRequest) {
    await this.service.verificarAccesoCaja(req.user?.id, req.user?.rol?.nombre);
    return this.service.detalle(id);
  }

  @Post('abrir')
  @Roles(Role.ADMIN)
  abrir(@Body() dto: AbrirTurnoDto, @Req() req: AuthedRequest) {
    return this.service.abrir(req.user?.id ?? 0, dto);
  }

  @Post(':id/personal')
  @Roles(Role.ADMIN)
  agregarPersonal(@Param('id', ParseIntPipe) id: number, @Body() dto: AgregarPersonalTurnoDto) {
    return this.service.agregarPersonal(id, dto);
  }

  @Delete(':id/personal/:usuarioId/:rolTurno')
  @Roles(Role.ADMIN)
  quitarPersonal(
    @Param('id', ParseIntPipe) id: number,
    @Param('usuarioId', ParseIntPipe) usuarioId: number,
    @Param('rolTurno', new ParseEnumPipe(RolTurno)) rolTurno: RolTurno,
  ) {
    return this.service.quitarPersonal(id, usuarioId, rolTurno);
  }

  @Post(':id/movimientos')
  async agregarMovimiento(@Param('id', ParseIntPipe) id: number, @Body() dto: MovimientoCajaDto, @Req() req: AuthedRequest) {
    await this.service.verificarAccesoCaja(req.user?.id, req.user?.rol?.nombre);
    return this.service.agregarMovimiento(id, dto, req.user?.id ?? 0);
  }

  @Post(':id/cerrar')
  @Roles(Role.ADMIN)
  cerrar(@Param('id', ParseIntPipe) id: number, @Body() dto: CerrarTurnoDto, @Req() req: AuthedRequest) {
    return this.service.cerrar(id, req.user?.id ?? 0, dto);
  }
}
