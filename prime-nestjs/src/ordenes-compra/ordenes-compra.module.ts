import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { OrdenCompra } from './entities/orden-compra.entity';
import { OrdenesCompraService } from './ordenes-compra.service';
import { OrdenesCompraController } from './ordenes-compra.controller';

@Module({
  imports: [TypeOrmModule.forFeature([OrdenCompra])],
  controllers: [OrdenesCompraController],
  providers: [OrdenesCompraService],
  exports: [OrdenesCompraService],
})
export class OrdenesCompraModule {}
