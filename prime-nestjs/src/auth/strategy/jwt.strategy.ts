import { ExtractJwt, Strategy } from 'passport-jwt';
import { PassportStrategy } from '@nestjs/passport';
import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Request } from 'express';
import { Usuario } from 'src/usuarios/entities/usuario.entity';
import { UsuariosService } from 'src/usuarios/usuarios.service';

interface JwtPayload {
  sub: number;
  email: string;
}

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(
    private usuariosService: UsuariosService,
    private configService: ConfigService,
  ) {
    const publicKey = configService.get<string>('keys.publicKey');
    if (!publicKey) {
      throw new Error('JWT public key is not configured');
    }
    super({
      jwtFromRequest: ExtractJwt.fromExtractors([
        ExtractJwt.fromAuthHeaderAsBearerToken(),
        (req: Request) => {
          const raw = req?.headers?.cookie;
          if (!raw) return null;
          const match = raw.split(';').map((c) => c.trim()).find((c) => c.startsWith('token='));
          return match ? decodeURIComponent(match.slice('token='.length)) : null;
        },
      ]),
      ignoreExpiration: false,
      secretOrKey: publicKey,
      algorithms: ['RS256'],
    });
  }

  async validate(payload: JwtPayload): Promise<Usuario> {
    const user = await this.usuariosService.findById(payload.sub);

    if (!user) {
      throw new UnauthorizedException('Invalid token');
    }

    if (!user.isActive) {
      throw new UnauthorizedException('Account is disabled');
    }

    return user;
  }
}
