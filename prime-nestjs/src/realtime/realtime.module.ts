import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuthModule } from 'src/auth/auth.module';
import { Usuario } from 'src/usuarios/entities/usuario.entity';
import { Rol } from 'src/rol/entities/rol.entity';
import { RealtimeGateway } from './realtime.gateway';

@Module({
  imports: [AuthModule, TypeOrmModule.forFeature([Usuario, Rol])],
  providers: [RealtimeGateway],
})
export class RealtimeModule {}
