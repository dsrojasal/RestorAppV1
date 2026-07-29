import { IsNotEmpty, IsNumber, IsOptional, IsEnum, Min } from 'class-validator';
import { EstadoPago } from '../entities/factura.entity';

export class CreateFacturaDto {
  @IsNotEmpty()
  @IsNumber()
  pedidoId: number;

  @IsNotEmpty()
  @IsNumber()
  @Min(0)
  total: number;

  @IsOptional()
  @IsEnum(EstadoPago)
  estadoPago?: EstadoPago;
}
