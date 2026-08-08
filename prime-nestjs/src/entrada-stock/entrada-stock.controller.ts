import { Controller, Get, Post, Body, Query, ParseIntPipe, UseGuards, Req } from '@nestjs/common';
import { Request } from 'express';
import { EntradaStockService } from './entrada-stock.service';
import { CreateEntradaStockDto } from './dto/create-entrada-stock.dto';
import { RolesGuard } from 'src/auth/strategy/roles.guard';
import { Roles } from 'src/custom.decorator';
import { Role } from 'src/common/enums/role.enum';

interface AuthedRequest extends Request {
  user?: { id: number };
}

@Controller('entradas-stock')
export class EntradaStockController {
  constructor(private readonly service: EntradaStockService) {}

  @Post()
  @UseGuards(RolesGuard)
  @Roles(Role.ADMIN)
  crear(@Body() dto: CreateEntradaStockDto, @Req() req: AuthedRequest) {
    return this.service.registrar(dto, req.user?.id ?? 0);
  }

  @Get()
  getHistorial(
    @Query('productoId', new ParseIntPipe({ optional: true })) productoId?: number,
    @Query('ingredienteId', new ParseIntPipe({ optional: true })) ingredienteId?: number,
    @Query('desde') desde?: string,
    @Query('hasta') hasta?: string,
  ) {
    return this.service.getHistorial({
      productoId,
      ingredienteId,
      desde: desde ? new Date(desde) : undefined,
      hasta: hasta ? new Date(hasta) : undefined,
    });
  }
}
