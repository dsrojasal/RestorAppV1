import { IsNumber, IsOptional, Min } from 'class-validator';

export class CreateEntradaStockDto {
  @IsOptional()
  @IsNumber()
  productoId?: number;

  @IsOptional()
  @IsNumber()
  ingredienteId?: number;

  @IsNumber()
  @Min(0.001)
  cantidad: number;
}
