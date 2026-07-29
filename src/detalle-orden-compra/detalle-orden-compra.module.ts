import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { DetalleOrdenCompra } from './entities/detalle-orden-compra.entity';
import { DetalleOrdenCompraService } from './detalle-orden-compra.service';
import { DetalleOrdenCompraController } from './detalle-orden-compra.controller';

@Module({
  imports: [TypeOrmModule.forFeature([DetalleOrdenCompra])],
  controllers: [DetalleOrdenCompraController],
  providers: [DetalleOrdenCompraService],
  exports: [DetalleOrdenCompraService],
})
export class DetalleOrdenCompraModule {}
