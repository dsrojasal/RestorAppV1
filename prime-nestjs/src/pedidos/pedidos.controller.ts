import { Controller, Get, Post, Body, Patch, Param, Delete, ParseIntPipe, UseGuards, Query } from '@nestjs/common';
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
  agregarLinea(@Param('id', ParseIntPipe) id: number, @Body() dto: CreateLineaPedidoDto) {
    return this.service.agregarLinea(id, dto);
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
  entregarLinea(@Param('id', ParseIntPipe) id: number, @Param('lineaId', ParseIntPipe) lineaId: number) {
    return this.service.entregarLinea(id, lineaId);
  }

  @Patch(':id/lineas/:lineaId')
  @UseGuards(RolesGuard)
  @Roles(Role.ADMIN, Role.MESERO, Role.CAJERO)
  editarLinea(@Param('id', ParseIntPipe) id: number, @Param('lineaId', ParseIntPipe) lineaId: number, @Body() dto: UpdateLineaPedidoDto) {
    return this.service.editarLinea(id, lineaId, dto);
  }

  @Post(':id/cobrar')
  @UseGuards(RolesGuard)
  @Roles(Role.ADMIN, Role.MESERO, Role.CAJERO)
  cobrar(@Param('id', ParseIntPipe) id: number, @Body() dto: CobrarPedidoDto) {
    return this.service.cobrar(id, dto);
  }

  @Patch(':id/transferir')
  @UseGuards(RolesGuard)
  @Roles(Role.ADMIN, Role.MESERO, Role.CAJERO)
  transferir(@Param('id', ParseIntPipe) id: number, @Body() dto: TransferirPedidoDto) {
    return this.service.transferir(id, dto);
  }

  @Delete(':id/lineas/:lineaId')
  @UseGuards(RolesGuard)
  @Roles(Role.ADMIN, Role.MESERO, Role.CAJERO)
  eliminarLinea(@Param('id', ParseIntPipe) id: number, @Param('lineaId', ParseIntPipe) lineaId: number) {
    return this.service.eliminarLinea(id, lineaId);
  }

  @Patch(':id')
  @UseGuards(RolesGuard)
  @Roles(Role.ADMIN, Role.MESERO, Role.CAJERO)
  update(@Param('id', ParseIntPipe) id: number, @Body() dto: UpdatePedidoDto) {
    return this.service.update(id, dto);
  }

  @Delete(':id')
  @UseGuards(RolesGuard)
  @Roles(Role.ADMIN, Role.MESERO, Role.CAJERO)
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.service.remove(id);
  }
}
