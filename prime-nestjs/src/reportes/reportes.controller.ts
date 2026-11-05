import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { RolesGuard } from 'src/auth/strategy/roles.guard';
import { Roles } from 'src/custom.decorator';
import { Role } from 'src/common/enums/role.enum';
import { ReportesService } from './reportes.service';

@Controller('reportes')
@UseGuards(RolesGuard)
@Roles(Role.ADMIN, Role.MESERO, Role.CAJERO)
export class ReportesController {
  constructor(private readonly service: ReportesService) {}

  @Get('ventas-dia')
  ventasDia() {
    return this.service.ventasDia();
  }

  @Get('ventas-rango')
  ventasRango(@Query('desde') desde?: string, @Query('hasta') hasta?: string) {
    return this.service.ventasRango(desde, hasta);
  }

  @Get('productos-vendidos')
  productosVendidos(@Query('desde') desde?: string, @Query('hasta') hasta?: string) {
    return this.service.productosVendidos(desde, hasta);
  }

  @Get('consumo-insumos')
  consumoInsumos(@Query('desde') desde?: string, @Query('hasta') hasta?: string) {
    return this.service.consumoInsumos(desde, hasta);
  }

  @Get('por-mesero')
  porMesero(@Query('desde') desde?: string, @Query('hasta') hasta?: string) {
    return this.service.porMesero(desde, hasta);
  }
}
