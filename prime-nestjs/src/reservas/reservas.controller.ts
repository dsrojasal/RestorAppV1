import { Controller, Get, Post, Body, Patch, Param, Delete, ParseIntPipe, UseGuards } from '@nestjs/common';
import { ReservasService } from './reservas.service';
import { CreateReservaDto } from './dto/create-reserva.dto';
import { UpdateReservaDto } from './dto/update-reserva.dto';
import { RolesGuard } from 'src/auth/strategy/roles.guard';
import { Roles } from 'src/custom.decorator';
import { Role } from 'src/common/enums/role.enum';

@Controller('reservas')
@UseGuards(RolesGuard)
export class ReservasController {
  constructor(private readonly service: ReservasService) {}

  @Post()
  @Roles(Role.ADMIN, Role.MESERO, Role.CAJERO)
  create(@Body() dto: CreateReservaDto) {
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
  @Roles(Role.ADMIN, Role.MESERO, Role.CAJERO)
  update(@Param('id', ParseIntPipe) id: number, @Body() dto: UpdateReservaDto) {
    return this.service.update(id, dto);
  }

  @Delete(':id')
  @Roles(Role.ADMIN, Role.MESERO, Role.CAJERO)
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.service.remove(id);
  }
}
