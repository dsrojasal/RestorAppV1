import { IsNotEmpty, IsNumber, IsOptional, IsString, Min } from 'class-validator';

export class CreateLineaPedidoDto {
  @IsNotEmpty()
  @IsNumber()
  productoId: number;

  @IsOptional()
  @IsNumber()
  @Min(1)
  cantidad?: number;

  @IsOptional()
  @IsString()
  observacion?: string;
}
