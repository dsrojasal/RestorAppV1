import { Controller, Get, Post, Body, Patch, Param, Delete, ParseIntPipe, UseGuards } from '@nestjs/common';
import { DetallePedidoService } from './detalle-pedido.service';
import { CreateDetallePedidoDto } from './dto/create-detalle-pedido.dto';
import { UpdateDetallePedidoDto } from './dto/update-detalle-pedido.dto';
import { RolesGuard } from 'src/auth/strategy/roles.guard';
import { Roles } from 'src/custom.decorator';
import { Role } from 'src/common/enums/role.enum';

/**
 * CRUD de bajo nivel sobre líneas de pedido. No lo usa la aplicación; se
 * mantiene solo para administración porque no aplica las reglas de negocio
 * (dueño del pedido, totales, stock ni facturación). El flujo normal debe
 * pasar por /pedidos/:id/lineas.
 */
@Controller('detalle-pedido')
@UseGuards(RolesGuard)
export class DetallePedidoController {
  constructor(private readonly service: DetallePedidoService) {}

  @Post()
  @Roles(Role.ADMIN)
  create(@Body() dto: CreateDetallePedidoDto) {
    return this.service.create(dto);
  }

  @Get()
  findAll() {
    return this.service.findAll();
  }

  @Get('por-pedido/:pedidoId')
  findByPedido(@Param('pedidoId', ParseIntPipe) pedidoId: number) {
    return this.service.findByPedido(pedidoId);
  }

  @Get(':id')
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.service.findOne(id);
  }

  @Patch(':id')
  @Roles(Role.ADMIN)
  update(@Param('id', ParseIntPipe) id: number, @Body() dto: UpdateDetallePedidoDto) {
    return this.service.update(id, dto);
  }

  @Delete(':id')
  @Roles(Role.ADMIN)
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.service.remove(id);
  }
}
