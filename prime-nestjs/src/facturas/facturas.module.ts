import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Factura } from './entities/factura.entity';
import { FacturasService } from './facturas.service';
import { FacturasController } from './facturas.controller';
import { Pedido } from 'src/pedidos/entities/pedido.entity';
import { DetallePedido } from 'src/detalle-pedido/entities/detalle-pedido.entity';
import { Mesa } from 'src/mesas/entities/mesa.entity';
import { TipoPago } from 'src/tipo-pago/entities/tipo-pago.entity';
import { Usuario } from 'src/usuarios/entities/usuario.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Factura, Pedido, DetallePedido, Mesa, TipoPago, Usuario])],
  controllers: [FacturasController],
  providers: [FacturasService],
  exports: [FacturasService],
})
export class FacturasModule {}
