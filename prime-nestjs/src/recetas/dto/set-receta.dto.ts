import { Type } from 'class-transformer';
import { ArrayNotEmpty, IsArray, IsNotEmpty, IsNumber, Min, ValidateNested } from 'class-validator';

export class SetRecetaInsumoDto {
  @IsNotEmpty()
  @IsNumber()
  ingredienteId: number;

  @IsNumber()
  @Min(0.001)
  cantidad: number;
}

export class SetRecetaDto {
  @IsArray()
  @ArrayNotEmpty()
  @ValidateNested({ each: true })
  @Type(() => SetRecetaInsumoDto)
  insumos: SetRecetaInsumoDto[];
}
