import { Test } from '@nestjs/testing';
import { JwtService } from '@nestjs/jwt';
import { UnauthorizedException } from '@nestjs/common';
import { hashSync } from 'bcryptjs';
import { AuthService } from './auth.service';
import { LoggerService } from 'src/logger/logger.service';
import { UsuariosService } from 'src/usuarios/usuarios.service';
import { RolService } from 'src/rol/rol.service';

describe('AuthService', () => {
  let service: AuthService;

  const usuarios = { findOne: jest.fn() };
  const roles = { findByNombre: jest.fn() };
  const jwt = { sign: jest.fn(() => 'token-firmado') };

  beforeEach(async () => {
    jest.clearAllMocks();
    const moduleRef = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: LoggerService, useValue: {} },
        { provide: JwtService, useValue: jwt },
        { provide: UsuariosService, useValue: usuarios },
        { provide: RolService, useValue: roles },
      ],
    }).compile();
    service = moduleRef.get(AuthService);
  });

  it('bloquea la cuenta tras varios intentos fallidos', async () => {
    usuarios.findOne.mockResolvedValue({
      id: 1,
      email: 'admin@restorapp.co',
      password: hashSync('ClaveCorrecta1', 4),
      isActive: true,
    });

    for (let i = 0; i < 8; i += 1) {
      await expect(service.login({ email: 'admin@restorapp.co', password: 'mala' })).rejects.toThrow(UnauthorizedException);
    }

    await expect(service.login({ email: 'admin@restorapp.co', password: 'mala' })).rejects.toThrow('Demasiados intentos fallidos');
  });

  it('permite iniciar sesión con la contraseña correcta', async () => {
    usuarios.findOne.mockResolvedValue({
      id: 1,
      email: 'admin@restorapp.co',
      password: hashSync('ClaveCorrecta1', 4),
      isActive: true,
    });

    const result = await service.login({ email: 'admin@restorapp.co', password: 'ClaveCorrecta1' });
    expect(result.access_token).toBe('token-firmado');
    expect(jwt.sign).toHaveBeenCalledWith({ sub: 1, email: 'admin@restorapp.co' });
  });

  it('rechaza una cuenta desactivada aunque la contraseña sea correcta', async () => {
    usuarios.findOne.mockResolvedValue({
      id: 1,
      email: 'admin@restorapp.co',
      password: hashSync('ClaveCorrecta1', 4),
      isActive: false,
    });

    await expect(service.login({ email: 'admin@restorapp.co', password: 'ClaveCorrecta1' })).rejects.toThrow('Account is disabled');
  });
});
