import { IsOptional, IsString, MaxLength } from 'class-validator';

export class AnularFacturaDto {
  @IsOptional()
  @IsString()
  @MaxLength(300)
  motivo?: string;
}
