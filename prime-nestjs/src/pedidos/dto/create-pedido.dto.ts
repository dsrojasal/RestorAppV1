import { IsNotEmpty, IsNumber, IsString, IsOptional, IsEnum, Min } from 'class-validator';
import { PedidoEstado } from '../entities/pedido.entity';

export class CreatePedidoDto {
  @IsNotEmpty()
  @IsNumber()
  mesaId: number;

  @IsNotEmpty()
  @IsNumber()
  usuarioId: number;

  @IsOptional()
  @IsNumber()
  tipoPagoId?: number;

  @IsOptional()
  @IsEnum(PedidoEstado)
  estado?: PedidoEstado;

  @IsOptional()
  @IsNumber()
  @Min(0)
  total?: number;

  @IsOptional()
  @IsString()
  observaciones?: string;
}
