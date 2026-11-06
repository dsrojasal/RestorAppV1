import { Type } from 'class-transformer';
import { IsArray, IsBoolean, IsIn, IsNotEmpty, IsNumber, IsOptional, IsString, Max, MaxLength, Min, ValidateNested } from 'class-validator';
import { PagoItemDto } from 'src/facturas/dto/pago-item.dto';

export class CobrarPedidoDto {
  @IsIn(['caja', 'propio'])
  @IsNotEmpty()
  modo: 'caja' | 'propio';

  /** Forma de pago única (compatibilidad con el flujo anterior). */
  @IsOptional()
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

  /** Solo Administrador: cobrar aunque no haya caja abierta. */
  @IsOptional()
  @IsBoolean()
  overrideSinCaja?: boolean;

  @IsOptional()
  @IsString()
  @MaxLength(300)
  motivoSinTurno?: string;
}
