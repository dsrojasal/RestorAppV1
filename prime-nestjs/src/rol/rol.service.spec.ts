import { Test } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { BadRequestException } from '@nestjs/common';
import { RolService } from './rol.service';
import { Rol } from './entities/rol.entity';

describe('RolService', () => {
  let service: RolService;

  const repo = {
    find: jest.fn(),
    findOneBy: jest.fn(),
    save: jest.fn(async (r: Rol) => r),
    delete: jest.fn(),
  };

  beforeEach(async () => {
    jest.clearAllMocks();
    const moduleRef = await Test.createTestingModule({
      providers: [RolService, { provide: getRepositoryToken(Rol), useValue: repo }],
    }).compile();
    service = moduleRef.get(RolService);
  });

  it('no permite renombrar un rol del sistema', async () => {
    repo.findOneBy.mockResolvedValue({ id: 1, nombre: 'Administrador', descripcion: 'Acceso total' });

    await expect(service.update(1, { nombre: 'Dueño' })).rejects.toThrow(BadRequestException);
    expect(repo.save).not.toHaveBeenCalled();
  });

  it('no permite eliminar un rol del sistema', async () => {
    repo.findOneBy.mockResolvedValue({ id: 1, nombre: 'Administrador', descripcion: 'Acceso total' });

    await expect(service.remove(1)).rejects.toThrow(BadRequestException);
    expect(repo.delete).not.toHaveBeenCalled();
  });

  it('sí permite editar la descripción de un rol del sistema', async () => {
    repo.findOneBy.mockResolvedValue({ id: 1, nombre: 'Administrador', descripcion: 'Acceso total' });

    const result = await service.update(1, { descripcion: 'Control total del sistema' });
    expect(result.descripcion).toBe('Control total del sistema');
    expect(result.nombre).toBe('Administrador');
  });

  it('permite renombrar un rol personalizado', async () => {
    repo.findOneBy.mockResolvedValue({ id: 9, nombre: 'Supervisor', descripcion: 'Temporal' });

    const result = await service.update(9, { nombre: 'Encargado' });
    expect(result.nombre).toBe('Encargado');
  });
});
