import { ConflictException, Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { compareSync } from 'bcryptjs';
import { CreateUsuarioDto } from 'src/usuarios/dto/create-usuario.dto';
import { LoginDTO } from './dto/login.dto';
import { LoggerService } from 'src/logger/logger.service';
import { UsuariosService } from 'src/usuarios/usuarios.service';
import { RolService } from 'src/rol/rol.service';
import { Role } from 'src/common/enums/role.enum';

@Injectable()
export class AuthService {
  constructor(
    private readonly logger: LoggerService,
    private jwtService: JwtService,
    private usuariosService: UsuariosService,
    private rolService: RolService,
  ) {}

  async login(dto: LoginDTO): Promise<{ email: string; access_token: string }> {
    const user = await this.usuariosService.findOne(dto.email);
    if (!user) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const isValid = compareSync(dto.password, user.password);
    if (!isValid) {
      throw new UnauthorizedException('Invalid credentials');
    }

    if (!user.isActive) {
      throw new UnauthorizedException('Account is disabled');
    }

    return {
      email: dto.email,
      access_token: this.jwtService.sign({
        sub: user.id,
        email: dto.email,
      }),
    };
  }

  async register(dto: CreateUsuarioDto): Promise<{ msg: string }> {
    const rol = await this.rolService.findByNombre(Role.MESERO);
    dto.rolId ??= rol?.id;

    try {
      await this.usuariosService.create(dto);
    } catch (error) {
      const isUniqueViolation =
        (error as Record<string, unknown>)?.code === '23505' || (error instanceof Error && error.message?.includes('duplicate key'));
      if (isUniqueViolation) {
        throw new ConflictException('User already exists');
      }
      throw error;
    }

    return { msg: 'User created with success' };
  }
}
