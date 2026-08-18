import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Pedido } from './entities/pedido.entity';
import { PedidosService } from './pedidos.service';
import { PedidosController } from './pedidos.controller';
import { DetallePedido } from 'src/detalle-pedido/entities/detalle-pedido.entity';
import { Producto } from 'src/productos/entities/producto.entity';
import { Mesa } from 'src/mesas/entities/mesa.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Pedido, DetallePedido, Producto, Mesa])],
  controllers: [PedidosController],
  providers: [PedidosService],
  exports: [PedidosService],
})
export class PedidosModule {}
