import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { TurnosController } from './turnos.controller';
import { TurnosService } from './turnos.service';
import { Turno } from './entities/turno.entity';
import { TurnoUsuario } from './entities/turno-usuario.entity';
import { MovimientoCaja } from './entities/movimiento-caja.entity';
import { Usuario } from 'src/usuarios/entities/usuario.entity';
import { Factura } from 'src/facturas/entities/factura.entity';
import { PagoFactura } from 'src/facturas/entities/pago-factura.entity';
import { Pedido } from 'src/pedidos/entities/pedido.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Turno, TurnoUsuario, MovimientoCaja, Usuario, Factura, PagoFactura, Pedido])],
  controllers: [TurnosController],
  providers: [TurnosService],
  exports: [TurnosService],
})
export class TurnosModule {}
