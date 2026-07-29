import { IsNotEmpty, IsString, MaxLength } from 'class-validator';

export class CreateRolDto {
  @IsNotEmpty()
  @IsString()
  @MaxLength(50)
  nombre: string;

  @IsString()
  @MaxLength(200)
  descripcion?: string;
}
