import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { TipoPago } from './entities/tipo-pago.entity';
import { TipoPagoService } from './tipo-pago.service';
import { TipoPagoController } from './tipo-pago.controller';

@Module({
  imports: [TypeOrmModule.forFeature([TipoPago])],
  controllers: [TipoPagoController],
  providers: [TipoPagoService],
  exports: [TipoPagoService],
})
export class TipoPagoModule {}
