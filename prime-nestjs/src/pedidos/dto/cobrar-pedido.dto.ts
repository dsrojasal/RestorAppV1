import { IsIn, IsNotEmpty, IsNumber, IsOptional } from 'class-validator';

export class CobrarPedidoDto {
  @IsIn(['caja', 'propio'])
  @IsNotEmpty()
  modo: 'caja' | 'propio';

  @IsOptional()
  @IsNumber()
  tipoPagoId?: number;
}
