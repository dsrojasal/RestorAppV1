import { PartialType } from '@nestjs/mapped-types';
import { CreatePedidoDto } from './create-pedido.dto';
import { PedidoEstado } from '../entities/pedido.entity';
import { IsEnum, IsOptional } from 'class-validator';

export class UpdatePedidoDto extends PartialType(CreatePedidoDto) {
  @IsOptional()
  @IsEnum(PedidoEstado)
  estado?: PedidoEstado;
}
