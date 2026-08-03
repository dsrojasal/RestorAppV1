import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Rol } from 'src/rol/entities/rol.entity';
import { TipoPago } from 'src/tipo-pago/entities/tipo-pago.entity';
import { SeedService } from './seed.service';

@Module({
  imports: [TypeOrmModule.forFeature([Rol, TipoPago])],
  providers: [SeedService],
})
export class SeedModule {}
