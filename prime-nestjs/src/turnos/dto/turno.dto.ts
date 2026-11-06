import { Type } from 'class-transformer';
import {
  ArrayUnique,
  IsArray,
  IsEnum,
  IsIn,
  IsInt,
  IsNumber,
  IsOptional,
  IsPositive,
  IsString,
  Max,
  MaxLength,
  Min,
  MinLength,
  ValidateNested,
} from 'class-validator';
import { RolTurno } from '../entities/turno-usuario.entity';
import { EstadoTurno } from '../entities/turno.entity';
import { TipoMovimientoCaja } from '../entities/movimiento-caja.entity';

const MONTO_MAXIMO = 999999999.99;

export class PersonalTurnoDto {
  @IsInt()
  @Min(1)
  usuarioId: number;

  @IsArray()
  @ArrayUnique()
  @IsEnum(RolTurno, { each: true })
  roles: RolTurno[];
}

export class AbrirTurnoDto {
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  @Max(MONTO_MAXIMO)
  montoInicial: number;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => PersonalTurnoDto)
  personal: PersonalTurnoDto[];
}

export class AgregarPersonalTurnoDto {
  @IsInt()
  @Min(1)
  usuarioId: number;

  @IsArray()
  @ArrayUnique()
  @IsEnum(RolTurno, { each: true })
  roles: RolTurno[];
}

export class CerrarTurnoDto {
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  @Max(MONTO_MAXIMO)
  montoContado: number;

  @IsOptional()
  @IsString()
  @MaxLength(300)
  motivoDiferencia?: string;

  @IsOptional()
  @IsString()
  @MaxLength(300)
  notas?: string;
}

export class MovimientoCajaDto {
  @IsEnum(TipoMovimientoCaja)
  tipo: TipoMovimientoCaja;

  @IsNumber({ maxDecimalPlaces: 2 })
  @IsPositive()
  @Max(MONTO_MAXIMO)
  monto: number;

  @IsString()
  @MinLength(5)
  @MaxLength(200)
  motivo: string;

  @IsOptional()
  @IsInt()
  @Min(1)
  reversoDeId?: number;
}

export class HistorialTurnoQueryDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(50)
  limit?: number;

  @IsOptional()
  @IsString()
  desde?: string;

  @IsOptional()
  @IsString()
  hasta?: string;

  @IsOptional()
  @IsIn([EstadoTurno.ABIERTO, EstadoTurno.CERRADO])
  estado?: EstadoTurno;
}
