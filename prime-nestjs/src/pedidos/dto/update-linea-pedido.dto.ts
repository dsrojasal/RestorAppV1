import { IsNumber, IsOptional, IsString, Min, MaxLength } from 'class-validator';

export class UpdateLineaPedidoDto {
  @IsOptional()
  @IsNumber()
  @Min(1)
  cantidad?: number;

  @IsOptional()
  @IsString()
  @MaxLength(300)
  observacion?: string;
}
