import { Controller, Get, Post, Body, Patch, Param, Delete, ParseIntPipe, UseGuards, Req } from '@nestjs/common';
import { Request } from 'express';
import { FacturasService } from './facturas.service';
import { CreateFacturaDto } from './dto/create-factura.dto';
import { UpdateFacturaDto } from './dto/update-factura.dto';
import { PagarFacturaDto } from './dto/pagar-factura.dto';
import { AnularFacturaDto } from './dto/anular-factura.dto';
import { RolesGuard } from 'src/auth/strategy/roles.guard';
import { Roles } from 'src/custom.decorator';
import { Role } from 'src/common/enums/role.enum';

interface AuthedRequest extends Request {
  user?: { id: number; rol?: { nombre: string } };
}

@Controller('facturas')
export class FacturasController {
  constructor(private readonly service: FacturasService) {}

  @Post()
  create(@Body() dto: CreateFacturaDto) {
    return this.service.create(dto);
  }

  @Get()
  findAll() {
    return this.service.findAll();
  }

  @Get(':id')
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.service.findOne(id);
  }

  @Patch(':id')
  update(@Param('id', ParseIntPipe) id: number, @Body() dto: UpdateFacturaDto) {
    return this.service.update(id, dto);
  }

  @Post(':id/pagar')
  @UseGuards(RolesGuard)
  @Roles(Role.ADMIN, Role.CAJERO)
  pagador(@Param('id', ParseIntPipe) id: number, @Body() dto: PagarFacturaDto, @Req() req: AuthedRequest) {
    return this.service.pagar(id, dto, req.user?.id, req.user?.rol?.nombre);
  }

  @Post(':id/anular')
  @UseGuards(RolesGuard)
  @Roles(Role.ADMIN, Role.CAJERO)
  anular(@Param('id', ParseIntPipe) id: number, @Body() dto: AnularFacturaDto, @Req() req: AuthedRequest) {
    return this.service.anular(id, req.user?.id, dto?.motivo);
  }

  @Delete(':id')
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.service.remove(id);
  }
}
