import { PartialType, OmitType } from '@nestjs/mapped-types';
import { IsOptional, IsString, MinLength, MaxLength } from 'class-validator';
import { CreateUsuarioDto } from './create-usuario.dto';

export class UpdateUsuarioDto extends PartialType(OmitType(CreateUsuarioDto, ['password'] as const)) {
  @IsOptional()
  @IsString()
  @MinLength(8)
  @MaxLength(72)
  password?: string;
}
