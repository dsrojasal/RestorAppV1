import { IsEnum, IsInt, IsNotEmpty, IsOptional, IsString, MaxLength, Min } from 'class-validator';
import { MesaEstado } from '../entities/mesa.entity';

export class CreateMesaDto {
  @IsNotEmpty()
  @IsInt()
  @Min(1)
  numero: number;

  @IsNotEmpty()
  @IsInt()
  @Min(1)
  capacidad: number;

  @IsOptional()
  @IsEnum(MesaEstado)
  estado?: MesaEstado;

  @IsOptional()
  @IsString()
  @MaxLength(255)
  descripcion?: string;
}
