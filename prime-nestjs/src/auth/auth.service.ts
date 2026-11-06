import { ConflictException, HttpException, HttpStatus, Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { compareSync } from 'bcryptjs';
import { CreateUsuarioDto } from 'src/usuarios/dto/create-usuario.dto';
import { LoginDTO } from './dto/login.dto';
import { LoggerService } from 'src/logger/logger.service';
import { UsuariosService } from 'src/usuarios/usuarios.service';
import { RolService } from 'src/rol/rol.service';
import { Role } from 'src/common/enums/role.enum';

const MAX_INTENTOS = 8;
const BLOQUEO_MS = 5 * 60 * 1000;

/**
 * Bloqueo temporal por cuenta tras varios intentos fallidos. Es en memoria
 * (suficiente para una sola instancia); si algún día hay varias instancias,
 * este estado debe moverse a Redis.
 */
@Injectable()
export class AuthService {
  private readonly intentos = new Map<string, { fallos: number; bloqueadoHasta: number }>();

  constructor(
    private readonly logger: LoggerService,
    private jwtService: JwtService,
    private usuariosService: UsuariosService,
    private rolService: RolService,
  ) {}

  private estaBloqueado(email: string): boolean {
    const estado = this.intentos.get(email);
    return !!estado && estado.bloqueadoHasta > Date.now();
  }

  private registrarFallo(email: string): void {
    const estado = this.intentos.get(email) ?? { fallos: 0, bloqueadoHasta: 0 };
    estado.fallos += 1;
    if (estado.fallos >= MAX_INTENTOS) {
      estado.bloqueadoHasta = Date.now() + BLOQUEO_MS;
      estado.fallos = 0;
    }
    this.intentos.set(email, estado);
    if (this.intentos.size > 1000) {
      const primero = this.intentos.keys().next().value;
      if (primero) this.intentos.delete(primero);
    }
  }

  async login(dto: LoginDTO): Promise<{ email: string; access_token: string }> {
    if (this.estaBloqueado(dto.email)) {
      throw new HttpException('Demasiados intentos fallidos. Espera unos minutos e intenta de nuevo.', HttpStatus.TOO_MANY_REQUESTS);
    }

    const user = await this.usuariosService.findOne(dto.email);
    if (!user) {
      this.registrarFallo(dto.email);
      throw new UnauthorizedException('Invalid credentials');
    }

    const isValid = compareSync(dto.password, user.password);
    if (!isValid) {
      this.registrarFallo(dto.email);
      throw new UnauthorizedException('Invalid credentials');
    }

    if (!user.isActive) {
      throw new UnauthorizedException('Account is disabled');
    }

    this.intentos.delete(dto.email);

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
        throw new ConflictException('Ese correo ya está registrado. Usa otro correo.');
      }
      throw error;
    }

    return { msg: 'Usuario creado correctamente.' };
  }
}
