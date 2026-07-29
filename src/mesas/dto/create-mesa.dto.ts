import { IsNotEmpty, IsNumber, IsString, IsOptional, IsEnum, Min } from 'class-validator';
import { MesaEstado } from '../entities/mesa.entity';

export class CreateMesaDto {
  @IsNotEmpty()
  @IsNumber()
  @Min(1)
  numero: number;

  @IsNotEmpty()
  @IsNumber()
  @Min(1)
  capacidad: number;

  @IsOptional()
  @IsEnum(MesaEstado)
  estado?: MesaEstado;

  @IsOptional()
  @IsString()
  descripcion?: string;
}
