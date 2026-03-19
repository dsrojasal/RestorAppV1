import { IsEnum, IsOptional, IsString, MaxLength, IsBoolean } from 'class-validator';
import { Role } from '../enums/role.enum';

export class UpdateUserDto {
  @IsOptional()
  @IsString()
  @MaxLength(100)
  name?: string;

  @IsOptional()
  @IsEnum(Role)
  roles?: Role;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
