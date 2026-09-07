import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Notificacion } from './entities/notificacion.entity';
import { NotificacionLeida } from './entities/notificacion-leida.entity';
import { NotificacionesService } from './notificaciones.service';
import { NotificacionesController } from './notificaciones.controller';
import { Usuario } from 'src/usuarios/entities/usuario.entity';
import { Ingrediente } from 'src/ingredientes/entities/ingrediente.entity';
import { Producto } from 'src/productos/entities/producto.entity';
import { DetallePedido } from 'src/detalle-pedido/entities/detalle-pedido.entity';
import { Pedido } from 'src/pedidos/entities/pedido.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Notificacion, NotificacionLeida, Usuario, Ingrediente, Producto, DetallePedido, Pedido])],
  controllers: [NotificacionesController],
  providers: [NotificacionesService],
  exports: [NotificacionesService],
})
export class NotificacionesModule {}
