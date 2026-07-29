import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ProductoIngrediente } from './entities/producto-ingrediente.entity';
import { ProductoIngredienteService } from './producto-ingrediente.service';
import { ProductoIngredienteController } from './producto-ingrediente.controller';

@Module({
  imports: [TypeOrmModule.forFeature([ProductoIngrediente])],
  controllers: [ProductoIngredienteController],
  providers: [ProductoIngredienteService],
  exports: [ProductoIngredienteService],
})
export class ProductoIngredienteModule {}
