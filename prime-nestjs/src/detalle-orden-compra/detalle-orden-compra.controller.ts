import { Controller, Get, Post, Body, Patch, Param, Delete, ParseIntPipe, UseGuards } from '@nestjs/common';
import { DetalleOrdenCompraService } from './detalle-orden-compra.service';
import { CreateDetalleOrdenCompraDto } from './dto/create-detalle-orden-compra.dto';
import { UpdateDetalleOrdenCompraDto } from './dto/update-detalle-orden-compra.dto';
import { RolesGuard } from 'src/auth/strategy/roles.guard';
import { Roles } from 'src/custom.decorator';
import { Role } from 'src/common/enums/role.enum';

@Controller('detalle-orden-compra')
@UseGuards(RolesGuard)
export class DetalleOrdenCompraController {
  constructor(private readonly service: DetalleOrdenCompraService) {}

  @Post()
  @Roles(Role.ADMIN)
  create(@Body() dto: CreateDetalleOrdenCompraDto) {
    return this.service.create(dto);
  }

  @Get()
  findAll() {
    return this.service.findAll();
  }

  @Get('por-oc/:ordenCompraId')
  findByOrdenCompra(@Param('ordenCompraId', ParseIntPipe) ordenCompraId: number) {
    return this.service.findByOrdenCompra(ordenCompraId);
  }

  @Get(':id')
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.service.findOne(id);
  }

  @Patch(':id')
  @Roles(Role.ADMIN)
  update(@Param('id', ParseIntPipe) id: number, @Body() dto: UpdateDetalleOrdenCompraDto) {
    return this.service.update(id, dto);
  }

  @Delete(':id')
  @Roles(Role.ADMIN)
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.service.remove(id);
  }
}
