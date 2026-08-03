import { IsNotEmpty, IsNumber, IsOptional, Min } from 'class-validator';

export class CreateProductoIngredienteDto {
  @IsNotEmpty()
  @IsNumber()
  productoId: number;

  @IsNotEmpty()
  @IsNumber()
  ingredienteId: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  cantidad?: number;
}
