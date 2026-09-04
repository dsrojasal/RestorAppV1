import { IsNotEmpty, IsNumber } from 'class-validator';

export class PagarFacturaDto {
  @IsNotEmpty()
  @IsNumber()
  tipoPagoId: number;
}
