import { Controller, Get, Post, Body, Patch, Param, Delete, ParseIntPipe, UseGuards } from '@nestjs/common';
import { ProveedoresService } from './proveedores.service';
import { CreateProveedorDto } from './dto/create-proveedor.dto';
import { UpdateProveedorDto } from './dto/update-proveedor.dto';
import { RolesGuard } from 'src/auth/strategy/roles.guard';
import { Roles } from 'src/custom.decorator';
import { Role } from 'src/common/enums/role.enum';

@Controller('proveedores')
@UseGuards(RolesGuard)
export class ProveedoresController {
  constructor(private readonly service: ProveedoresService) {}

  @Post()
  @Roles(Role.ADMIN)
  create(@Body() dto: CreateProveedorDto) {
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
  @Roles(Role.ADMIN)
  update(@Param('id', ParseIntPipe) id: number, @Body() dto: UpdateProveedorDto) {
    return this.service.update(id, dto);
  }

  @Delete(':id')
  @Roles(Role.ADMIN)
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.service.remove(id);
  }
}
