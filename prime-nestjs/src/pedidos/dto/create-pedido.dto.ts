import { IsNotEmpty, IsNumber, IsString, IsOptional, IsArray, ValidateNested, Min } from 'class-validator';
import { Type } from 'class-transformer';
import { CreateLineaPedidoDto } from './create-linea-pedido.dto';

export class CreatePedidoDto {
  @IsNotEmpty()
  @IsNumber()
  mesaId: number;

  @IsNotEmpty()
  @IsNumber()
  usuarioId: number;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateLineaPedidoDto)
  lineas?: CreateLineaPedidoDto[];

  @IsOptional()
  @IsString()
  observaciones?: string;
}
