import { IsEmail, IsNotEmpty, IsOptional, IsString, MaxLength } from 'class-validator';

export class CreateProveedorDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(150)
  nombre: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  contacto?: string;

  @IsOptional()
  @IsEmail()
  @MaxLength(150)
  email?: string;
}
