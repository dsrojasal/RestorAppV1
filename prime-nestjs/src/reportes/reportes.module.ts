import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ReportesController } from './reportes.controller';
import { ReportesService } from './reportes.service';
import { Factura } from 'src/facturas/entities/factura.entity';
import { Ingrediente } from 'src/ingredientes/entities/ingrediente.entity';
import { MovimientoInventario } from 'src/recetas/entities/movimiento-inventario.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Factura, Ingrediente, MovimientoInventario])],
  controllers: [ReportesController],
  providers: [ReportesService],
})
export class ReportesModule {}
