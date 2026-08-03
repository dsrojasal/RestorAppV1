import { Controller, Get, Post, Body, Param, ParseIntPipe } from '@nestjs/common';
import { TipoPagoService } from './tipo-pago.service';

@Controller('tipo-pago')
export class TipoPagoController {
  constructor(private readonly service: TipoPagoService) {}

  @Post()
  create(@Body('nombre') nombre: string) {
    return this.service.create(nombre);
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
