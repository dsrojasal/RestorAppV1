import { IsNotEmpty, IsNumber, IsString, IsOptional, IsEnum, Min } from 'class-validator';
import { ReservaEstado } from '../entities/reserva.entity';

export class CreateReservaDto {
  @IsNotEmpty()
  @IsNumber()
  mesaId: number;

  @IsNotEmpty()
  @IsNumber()
  usuarioId: number;

  @IsNotEmpty()
  @IsString()
  nombreCliente: string;

  @IsNotEmpty()
  @IsString()
  fecha: string;

  @IsNotEmpty()
  @IsString()
  horaInicio: string;

  @IsNotEmpty()
  @IsString()
  horaFin: string;

  @IsNotEmpty()
  @IsNumber()
  @Min(1)
  numPersonas: number;

  @IsOptional()
  @IsEnum(ReservaEstado)
  estado?: ReservaEstado;

  @IsOptional()
  @IsString()
  observaciones?: string;
}
