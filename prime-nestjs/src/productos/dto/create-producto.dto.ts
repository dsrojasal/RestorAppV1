import { IsNotEmpty, IsString, IsNumber, IsEnum, IsOptional, Min } from 'class-validator';
import { TipoProducto } from '../entities/producto.entity';

export class CreateProductoDto {
  @IsNotEmpty()
  @IsString()
  nombre: string;

  @IsNotEmpty()
  @IsNumber()
  @Min(0)
  precio: number;

  @IsNotEmpty()
  @IsEnum(TipoProducto)
  tipo: TipoProducto;

  @IsOptional()
  @IsNumber()
  @Min(0)
  stock?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  stockMinimo?: number;

  @IsNotEmpty()
  @IsNumber()
  categoriaId: number;
}
