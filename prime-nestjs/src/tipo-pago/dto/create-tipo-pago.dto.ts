import { IsNotEmpty, IsString, MaxLength } from 'class-validator';

export class CreateTipoPagoDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(80)
  nombre: string;
}
