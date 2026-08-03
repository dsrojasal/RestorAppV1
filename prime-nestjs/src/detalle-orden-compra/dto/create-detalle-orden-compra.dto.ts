import { IsNotEmpty, IsNumber, IsOptional, Min } from 'class-validator';

export class CreateDetalleOrdenCompraDto {
  @IsNotEmpty()
  @IsNumber()
  ordenCompraId: number;

  @IsNotEmpty()
  @IsNumber()
  ingredienteId: number;

  @IsOptional()
  @IsNumber()
  @Min(1)
  cantidad?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  precioUnitario?: number;
}
