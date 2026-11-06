import { Type } from 'class-transformer';
import { IsArray, IsBoolean, IsNotEmpty, IsNumber, IsOptional, IsString, Max, MaxLength, Min, ValidateNested } from 'class-validator';
import { PagoItemDto } from './pago-item.dto';

export class PagarFacturaDto {
  /** Forma de pago única (compatibilidad). */
  @IsOptional()
  @IsNotEmpty()
  @IsNumber()
  tipoPagoId?: number;

  /** Pago mixto: una o varias líneas que deben sumar el total. */
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => PagoItemDto)
  pagos?: PagoItemDto[];

  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  @Max(100)
  ivaPorcentaje?: number;

  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  @Max(100)
  propinaPorcentaje?: number;

  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  propinaMonto?: number;

  @IsOptional()
  @IsBoolean()
  overrideSinCaja?: boolean;

  @IsOptional()
  @IsString()
  @MaxLength(300)
  motivoSinTurno?: string;
}
