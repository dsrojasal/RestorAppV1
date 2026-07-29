import { IsNotEmpty, IsNumber, IsString, IsOptional, Min } from 'class-validator';

export class CreateDetallePedidoDto {
  @IsNotEmpty()
  @IsNumber()
  pedidoId: number;

  @IsNotEmpty()
  @IsNumber()
  productoId: number;

  @IsOptional()
  @IsNumber()
  @Min(1)
  cantidad?: number;

  @IsNotEmpty()
  @IsNumber()
  @Min(0)
  precioUnitario: number;

  @IsOptional()
  @IsString()
  observacion?: string;
}
