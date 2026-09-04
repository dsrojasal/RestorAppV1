import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Pedido } from './entities/pedido.entity';
import { PedidosService } from './pedidos.service';
import { PedidosController } from './pedidos.controller';
import { DetallePedido } from 'src/detalle-pedido/entities/detalle-pedido.entity';
import { Producto } from 'src/productos/entities/producto.entity';
import { Mesa } from 'src/mesas/entities/mesa.entity';
import { Factura } from 'src/facturas/entities/factura.entity';
import { TipoPago } from 'src/tipo-pago/entities/tipo-pago.entity';
import { Usuario } from 'src/usuarios/entities/usuario.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Pedido, DetallePedido, Producto, Mesa, Factura, TipoPago, Usuario])],
  controllers: [PedidosController],
  providers: [PedidosService],
  exports: [PedidosService],
})
export class PedidosModule {}
