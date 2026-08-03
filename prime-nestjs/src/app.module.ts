import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { ScheduleModule } from '@nestjs/schedule';
import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler';
import { AuthModule } from './auth/auth.module';
import { RolModule } from './rol/rol.module';
import { UsuariosModule } from './usuarios/usuarios.module';
import { TipoPagoModule } from './tipo-pago/tipo-pago.module';
import { CategoriasModule } from './categorias/categorias.module';
import { ProductosModule } from './productos/productos.module';
import { IngredientesModule } from './ingredientes/ingredientes.module';
import { MesasModule } from './mesas/mesas.module';
import { ProveedoresModule } from './proveedores/proveedores.module';
import { PedidosModule } from './pedidos/pedidos.module';
import { DetallePedidoModule } from './detalle-pedido/detalle-pedido.module';
import { FacturasModule } from './facturas/facturas.module';
import { OrdenesCompraModule } from './ordenes-compra/ordenes-compra.module';
import { DetalleOrdenCompraModule } from './detalle-orden-compra/detalle-orden-compra.module';
import { ProductoIngredienteModule } from './producto-ingrediente/producto-ingrediente.module';
import { ReservasModule } from './reservas/reservas.module';
import { SeedModule } from './seed/seed.module';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule, ConfigService } from '@nestjs/config';
import configuration from './config';
import { JwtAuthGuard } from './auth/strategy/jwt-auth.guard';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      load: [configuration],
    }),
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: (configService: ConfigService) => {
        const dbConfig = configService.get('database');
        if (!dbConfig) {
          throw new Error('Database configuration is missing');
        }
        return dbConfig;
      },
      inject: [ConfigService],
    }),
    ScheduleModule.forRoot(),
    ThrottlerModule.forRoot([{ ttl: 60000, limit: 100 }]),
    AuthModule,
    RolModule,
    UsuariosModule,
    TipoPagoModule,
    CategoriasModule,
    ProductosModule,
    IngredientesModule,
    MesasModule,
    ProveedoresModule,
    PedidosModule,
    DetallePedidoModule,
    FacturasModule,
    OrdenesCompraModule,
    DetalleOrdenCompraModule,
    ProductoIngredienteModule,
    ReservasModule,
    SeedModule,
  ],
  controllers: [AppController],
  providers: [
    AppService,
    { provide: APP_GUARD, useClass: JwtAuthGuard },
    { provide: APP_GUARD, useClass: ThrottlerGuard },
  ],
})
export class AppModule {}
