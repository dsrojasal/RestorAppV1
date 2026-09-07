import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ProductoIngrediente } from 'src/producto-ingrediente/entities/producto-ingrediente.entity';
import { Ingrediente } from 'src/ingredientes/entities/ingrediente.entity';
import { Producto } from 'src/productos/entities/producto.entity';
import { MovimientoInventario } from './entities/movimiento-inventario.entity';
import { RecetasService } from './recetas.service';
import { RecetasController } from './recetas.controller';

@Module({
  imports: [TypeOrmModule.forFeature([ProductoIngrediente, MovimientoInventario, Ingrediente, Producto])],
  controllers: [RecetasController],
  providers: [RecetasService],
  exports: [RecetasService],
})
export class RecetasModule {}
