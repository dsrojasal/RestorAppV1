import { IsNotEmpty, IsString, IsNumber, IsOptional, Min } from 'class-validator';

export class CreateIngredienteDto {
  @IsNotEmpty()
  @IsString()
  nombre: string;

  @IsOptional()
  @IsNumber()
  @Min(0)
  stock?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  stockMinimo?: number;

  @IsOptional()
  @IsString()
  stockMinimoUnidad?: string;

  @IsNotEmpty()
  @IsString()
  unidad: string;
}
