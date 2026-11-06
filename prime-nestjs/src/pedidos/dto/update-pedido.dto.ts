import { OmitType, PartialType } from '@nestjs/mapped-types';
import { CreatePedidoDto } from './create-pedido.dto';
import { PedidoEstado } from '../entities/pedido.entity';
import { IsEnum, IsOptional } from 'class-validator';

/**
 * La mesa y el dueño no se cambian por este endpoint: la mesa se mueve con
 * PATCH /pedidos/:id/transferir (que libera la anterior y valida la nueva) y
 * el dueño se toma siempre del token.
 */
export class UpdatePedidoDto extends PartialType(OmitType(CreatePedidoDto, ['mesaId'] as const)) {
  @IsOptional()
  @IsEnum(PedidoEstado)
  estado?: PedidoEstado;
}
