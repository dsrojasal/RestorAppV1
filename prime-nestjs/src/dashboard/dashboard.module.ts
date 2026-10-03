import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { DashboardController } from './dashboard.controller';
import { DashboardService } from './dashboard.service';
import { Factura } from 'src/facturas/entities/factura.entity';
import { Pedido } from 'src/pedidos/entities/pedido.entity';
import { Ingrediente } from 'src/ingredientes/entities/ingrediente.entity';
import { Usuario } from 'src/usuarios/entities/usuario.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Factura, Pedido, Ingrediente, Usuario])],
  controllers: [DashboardController],
  providers: [DashboardService],
})
export class DashboardModule {}
