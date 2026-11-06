import { Controller, Get, Post, Body, Param, ParseIntPipe, UseGuards } from '@nestjs/common';
import { TipoPagoService } from './tipo-pago.service';
import { CreateTipoPagoDto } from './dto/create-tipo-pago.dto';
import { RolesGuard } from 'src/auth/strategy/roles.guard';
import { Roles } from 'src/custom.decorator';
import { Role } from 'src/common/enums/role.enum';

@Controller('tipo-pago')
@UseGuards(RolesGuard)
export class TipoPagoController {
  constructor(private readonly service: TipoPagoService) {}

  @Post()
  @Roles(Role.ADMIN)
  create(@Body() dto: CreateTipoPagoDto) {
    return this.service.create(dto.nombre);
  }

  @Get()
  findAll() {
    return this.service.findAll();
  }

  @Get(':id')
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.service.findOne(id);
  }
}
