import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { EntradaStock } from './entities/entrada-stock.entity';
import { EntradaStockService } from './entrada-stock.service';
import { EntradaStockController } from './entrada-stock.controller';
import { MovimientoInventario } from 'src/recetas/entities/movimiento-inventario.entity';

@Module({
  imports: [TypeOrmModule.forFeature([EntradaStock, MovimientoInventario])],
  controllers: [EntradaStockController],
  providers: [EntradaStockService],
  exports: [EntradaStockService],
})
export class EntradaStockModule {}
