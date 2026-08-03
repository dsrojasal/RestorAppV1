import { IsNotEmpty, IsNumber, IsOptional, IsEnum } from 'class-validator';
import { OCEstado } from '../entities/orden-compra.entity';

export class CreateOrdenCompraDto {
  @IsNotEmpty()
  @IsNumber()
  proveedorId: number;

  @IsOptional()
  @IsEnum(OCEstado)
  estado?: OCEstado;
}
