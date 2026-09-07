import { Body, Controller, Delete, Get, Param, ParseIntPipe, Put, UseGuards } from '@nestjs/common';
import { RecetasService } from './recetas.service';
import { SetRecetaDto } from './dto/set-receta.dto';
import { RolesGuard } from 'src/auth/strategy/roles.guard';
import { Roles } from 'src/custom.decorator';
import { Role } from 'src/common/enums/role.enum';

@Controller('recetas')
export class RecetasController {
  constructor(private readonly service: RecetasService) {}

  @Get('disponibilidad')
  disponibilidad() {
    return this.service.disponibilidad();
  }

  @Get('movimientos')
  movimientos() {
    return this.service.listarMovimientos();
  }

  @Get(':productoId')
  findOne(@Param('productoId', ParseIntPipe) productoId: number) {
    return this.service.getReceta(productoId);
  }

  @Put(':productoId')
  @UseGuards(RolesGuard)
  @Roles(Role.ADMIN)
  set(@Param('productoId', ParseIntPipe) productoId: number, @Body() dto: SetRecetaDto) {
    return this.service.setReceta(productoId, dto);
  }

  @Delete(':productoId')
  @UseGuards(RolesGuard)
  @Roles(Role.ADMIN)
  remove(@Param('productoId', ParseIntPipe) productoId: number) {
    return this.service.deleteReceta(productoId);
  }
}
