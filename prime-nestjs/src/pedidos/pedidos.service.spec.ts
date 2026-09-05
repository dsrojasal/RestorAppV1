import { Test } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import { BadRequestException } from '@nestjs/common';
import { PedidosService } from './pedidos.service';
import { Pedido, PedidoEstado } from './entities/pedido.entity';
import { DetallePedido, DetallePedidoEstado } from 'src/detalle-pedido/entities/detalle-pedido.entity';
import { Mesa, MesaEstado } from 'src/mesas/entities/mesa.entity';
import { Factura, EstadoPago } from 'src/facturas/entities/factura.entity';
import { TipoPago } from 'src/tipo-pago/entities/tipo-pago.entity';

function mockTransaction(manager: any) {
  return jest.fn((cb: (m: any) => any) => cb(manager));
}

describe('PedidosService', () => {
  let service: PedidosService;

  const repo = { find: jest.fn(), findOne: jest.fn(), save: jest.fn(), create: jest.fn() };
  const dataSource = { transaction: jest.fn() };

  beforeEach(async () => {
    jest.clearAllMocks();
    const moduleRef = await Test.createTestingModule({
      providers: [
        PedidosService,
        { provide: getRepositoryToken(Pedido), useValue: repo },
        { provide: DataSource, useValue: dataSource },
      ],
    }).compile();
    service = moduleRef.get(PedidosService);
  });

  it('cobrar en modo caja crea factura pendiente y deja el pedido entregado', async () => {
    const manager = {
      findOne: jest.fn(async (Entity: any) => {
        if (Entity === Pedido) return { id: 1, mesaId: 2, total: 100, estado: PedidoEstado.LISTO, usuarioId: 14 };
        if (Entity === Factura) return null;
        return null;
      }),
      find: jest.fn(async () => [
        { id: 1, estado: DetallePedidoEstado.LISTO },
        { id: 2, estado: DetallePedidoEstado.ENTREGADO },
      ]),
      save: jest.fn(async (...a: any[]) => (a.length > 1 ? a[1] : a[0])),
      create: jest.fn((_Entity: any, o: any) => o),
      update: jest.fn(),
      delete: jest.fn(),
    };
    (service as any).dataSource.transaction.mockImplementation(mockTransaction(manager));

    const result = await service.cobrar(1, { modo: 'caja' }, 14, 'Mesero');
    expect(result.factura.estadoPago).toBe(EstadoPago.PENDIENTE);
    expect(result.factura.total).toBe(100);
    expect(result.factura.creadoPorId).toBe(14);
    expect(result.factura.id).toBeUndefined(); // creada por manager.create/save
    expect(manager.save).toHaveBeenCalledWith(
      DetallePedido,
      expect.objectContaining({ estado: DetallePedidoEstado.ENTREGADO }),
    );
    expect(manager.update).toHaveBeenCalledWith(Pedido, 1, { estado: PedidoEstado.ENTREGADO });
  });

  it('cobrar rechaza si hay líneas pendientes o en preparación', async () => {
    const manager = {
      findOne: jest.fn(async (Entity: any) => {
        if (Entity === Pedido) return { id: 1, mesaId: 2, total: 100 };
        if (Entity === Factura) return null;
        return null;
      }),
      find: jest.fn(async () => [{ id: 1, estado: DetallePedidoEstado.PENDIENTE }]),
      save: jest.fn(async (...a: any[]) => (a.length > 1 ? a[1] : a[0])),
      create: jest.fn((_e: any, o: any) => o),
      update: jest.fn(),
      delete: jest.fn(),
    };
    (service as any).dataSource.transaction.mockImplementation(mockTransaction(manager));

    await expect(service.cobrar(1, { modo: 'caja' })).rejects.toThrow(BadRequestException);
  });

  it('cobrar rechaza cuando ya existe factura pagada (doble cobro)', async () => {
    const manager = {
      findOne: jest.fn(async (Entity: any) => {
        if (Entity === Pedido) return { id: 1, mesaId: 2, total: 100, estado: PedidoEstado.ENTREGADO };
        if (Entity === Factura) return { id: 9, estadoPago: EstadoPago.PAGADO };
        return null;
      }),
      find: jest.fn(async () => [{ id: 1, estado: DetallePedidoEstado.ENTREGADO }]),
      save: jest.fn(async (...a: any[]) => (a.length > 1 ? a[1] : a[0])),
      create: jest.fn((_e: any, o: any) => o),
      update: jest.fn(),
      delete: jest.fn(),
    };
    (service as any).dataSource.transaction.mockImplementation(mockTransaction(manager));

    await expect(service.cobrar(1, { modo: 'caja' })).rejects.toThrow('Este pedido ya fue cobrado');
  });

  it('cobrar modo propio exige tipo de pago y libera la mesa', async () => {
    const manager = {
      findOne: jest.fn(async (Entity: any) => {
        if (Entity === Pedido) return { id: 1, mesaId: 2, total: 100, estado: PedidoEstado.ENTREGADO, usuarioId: 14 };
        if (Entity === Factura) return null;
        if (Entity === TipoPago) return { id: 3, nombre: 'Tarjeta crédito' };
        return null;
      }),
      find: jest.fn(async () => [{ id: 1, estado: DetallePedidoEstado.ENTREGADO }]),
      save: jest.fn(async (...a: any[]) => (a.length > 1 ? a[1] : a[0])),
      create: jest.fn((_e: any, o: any) => o),
      update: jest.fn(),
      delete: jest.fn(),
    };
    (service as any).dataSource.transaction.mockImplementation(mockTransaction(manager));

    const result = await service.cobrar(1, { modo: 'propio', tipoPagoId: 3 }, 14, 'Mesero');
    expect(result.factura.estadoPago).toBe(EstadoPago.PAGADO);
    expect(result.factura.tipoPagoId).toBe(3);
    expect(result.factura.creadoPorId).toBe(14);
    expect(result.factura.cobradoPorId).toBe(14);
    expect(result.factura.cobradoPorRol).toBe('Mesero');
    expect(result.factura.fechaCobro).toBeInstanceOf(Date);
    expect(manager.update).toHaveBeenCalledWith(Mesa, 2, { estado: MesaEstado.LIBRE });
  });

  it('entregarLinea solo permite estado listo', async () => {
    const manager = {
      findOne: jest.fn(async (Entity: any) => {
        if (Entity === Pedido) return { id: 1, mesaId: 2 };
        if (Entity === DetallePedido) return { id: 5, pedidoId: 1, estado: DetallePedidoEstado.PENDIENTE };
        return null;
      }),
      find: jest.fn(async () => []),
      save: jest.fn(async (...a: any[]) => (a.length > 1 ? a[1] : a[0])),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    };
    (service as any).dataSource.transaction.mockImplementation(mockTransaction(manager));

    await expect(service.entregarLinea(1, 5)).rejects.toThrow('Solo se pueden entregar ítems que estén listos');
  });

  it('transferir exige que la mesa destino esté libre', async () => {
    const manager = {
      findOne: jest.fn(async (Entity: any, opts: any) => {
        if (Entity === Pedido) return { id: 1, mesaId: 2, estado: PedidoEstado.PENDIENTE };
        if (Entity === Mesa && opts.where.id === 7) return { id: 7, estado: MesaEstado.OCUPADA };
        return null;
      }),
      find: jest.fn(async () => []),
      save: jest.fn(async (...a: any[]) => (a.length > 1 ? a[1] : a[0])),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    };
    (service as any).dataSource.transaction.mockImplementation(mockTransaction(manager));

    await expect(service.transferir(1, { mesaId: 7 })).rejects.toThrow('La mesa destino no está libre');
  });
});