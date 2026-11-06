import { Type } from 'class-transformer';
import { IsInt, IsNumber, Min } from 'class-validator';

export class PagoItemDto {
  @IsInt()
  @Min(1)
  tipoPagoId: number;

  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0.01)
  monto: number;
}

export function pagosArrayType() {
  return Type(() => PagoItemDto);
}
