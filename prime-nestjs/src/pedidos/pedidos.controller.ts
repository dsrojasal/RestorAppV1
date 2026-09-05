import { Controller, Get, Post, Body, Patch, Param, Delete, ParseIntPipe, UseGuards, Query, Req } from '@nestjs/common';
import { Request } from 'express';
import { PedidosService } from './pedidos.service';
import { CreatePedidoDto } from './dto/create-pedido.dto';
import { UpdatePedidoDto } from './dto/update-pedido.dto';
import { CreateLineaPedidoDto } from './dto/create-linea-pedido.dto';
import { UpdateLineaPedidoDto } from './dto/update-linea-pedido.dto';
import { CobrarPedidoDto } from './dto/cobrar-pedido.dto';
import { TransferirPedidoDto } from './dto/transferir-pedido.dto';
import { RolesGuard } from 'src/auth/strategy/roles.guard';
import { Roles } from 'src/custom.decorator';
import { Role } from 'src/common/enums/role.enum';
import { DetallePedidoEstado } from 'src/detalle-pedido/entities/detalle-pedido.entity';

interface AuthedRequest extends Request {
  user?: { id: number; rol?: { nombre: string } };
}

@Controller('pedidos')
export class PedidosController {
  constructor(private readonly service: PedidosService) {}

  @Post()
  @UseGuards(RolesGuard)
  @Roles(Role.ADMIN, Role.MESERO, Role.CAJERO)
  create(@Body() dto: CreatePedidoDto) {
    return this.service.create(dto);
  }

  @Get()
  findAll(@Query('mesaId') mesaId?: string) {
    return this.service.findAll(mesaId ? parseInt(mesaId, 10) : undefined);
  }

  @Get(':id')
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.service.findOne(id);
  }

  @Post(':id/lineas')
  @UseGuards(RolesGuard)
  @Roles(Role.ADMIN, Role.MESERO, Role.CAJERO)
  agregarLinea(@Param('id', ParseIntPipe) id: number, @Body() dto: CreateLineaPedidoDto, @Req() req: AuthedRequest) {
    return this.service.agregarLinea(id, dto, req.user?.id, req.user?.rol?.nombre);
  }

  @Patch(':id/lineas/:lineaId/estado')
  @UseGuards(RolesGuard)
  @Roles(Role.ADMIN, Role.CHEF)
  cambiarEstadoLinea(
    @Param('id', ParseIntPipe) id: number,
    @Param('lineaId', ParseIntPipe) lineaId: number,
    @Body('estado') estado: DetallePedidoEstado,
  ) {
    return this.service.cambiarEstadoLinea(id, lineaId, estado);
  }

  @Post(':id/lineas/:lineaId/entregar')
  @UseGuards(RolesGuard)
  @Roles(Role.ADMIN, Role.MESERO, Role.CAJERO)
  entregarLinea(@Param('id', ParseIntPipe) id: number, @Param('lineaId', ParseIntPipe) lineaId: number, @Req() req: AuthedRequest) {
    return this.service.entregarLinea(id, lineaId, req.user?.id, req.user?.rol?.nombre);
  }

  @Patch(':id/lineas/:lineaId')
  @UseGuards(RolesGuard)
  @Roles(Role.ADMIN, Role.MESERO, Role.CAJERO)
  editarLinea(@Param('id', ParseIntPipe) id: number, @Param('lineaId', ParseIntPipe) lineaId: number, @Body() dto: UpdateLineaPedidoDto, @Req() req: AuthedRequest) {
    return this.service.editarLinea(id, lineaId, dto, req.user?.id, req.user?.rol?.nombre);
  }

  @Post(':id/cobrar')
  @UseGuards(RolesGuard)
  @Roles(Role.ADMIN, Role.MESERO, Role.CAJERO)
  cobrar(@Param('id', ParseIntPipe) id: number, @Body() dto: CobrarPedidoDto, @Req() req: AuthedRequest) {
    return this.service.cobrar(id, dto, req.user?.id, req.user?.rol?.nombre);
  }

  @Patch(':id/transferir')
  @UseGuards(RolesGuard)
  @Roles(Role.ADMIN, Role.MESERO, Role.CAJERO)
  transferir(@Param('id', ParseIntPipe) id: number, @Body() dto: TransferirPedidoDto, @Req() req: AuthedRequest) {
    return this.service.transferir(id, dto, req.user?.id, req.user?.rol?.nombre);
  }

  @Delete(':id/lineas/:lineaId')
  @UseGuards(RolesGuard)
  @Roles(Role.ADMIN, Role.MESERO, Role.CAJERO)
  eliminarLinea(@Param('id', ParseIntPipe) id: number, @Param('lineaId', ParseIntPipe) lineaId: number, @Req() req: AuthedRequest) {
    return this.service.eliminarLinea(id, lineaId, req.user?.id, req.user?.rol?.nombre);
  }

  @Patch(':id')
  @UseGuards(RolesGuard)
  @Roles(Role.ADMIN, Role.MESERO, Role.CAJERO)
  update(@Param('id', ParseIntPipe) id: number, @Body() dto: UpdatePedidoDto, @Req() req: AuthedRequest) {
    return this.service.update(id, dto, req.user?.id, req.user?.rol?.nombre);
  }

  @Delete(':id')
  @UseGuards(RolesGuard)
  @Roles(Role.ADMIN, Role.MESERO, Role.CAJERO)
  remove(@Param('id', ParseIntPipe) id: number, @Req() req: AuthedRequest) {
    return this.service.remove(id, req.user?.id, req.user?.rol?.nombre);
  }
}
