import { Test } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { FacturasService } from './facturas.service';
import { Factura, EstadoPago } from './entities/factura.entity';
import { Pedido, PedidoEstado } from 'src/pedidos/entities/pedido.entity';
import { DetallePedido, DetallePedidoEstado } from 'src/detalle-pedido/entities/detalle-pedido.entity';
import { Mesa, MesaEstado } from 'src/mesas/entities/mesa.entity';
import { TipoPago } from 'src/tipo-pago/entities/tipo-pago.entity';

function mockTransaction(manager: any) {
  return jest.fn((cb: (m: any) => any) => cb(manager));
}

describe('FacturasService', () => {
  let service: FacturasService;

  const repo = { find: jest.fn(), findOne: jest.fn(), findOneBy: jest.fn(), save: jest.fn(), create: jest.fn(), delete: jest.fn() };
  const dataSource = { transaction: jest.fn() };

  beforeEach(async () => {
    jest.clearAllMocks();
    const moduleRef = await Test.createTestingModule({
      providers: [
        FacturasService,
        { provide: getRepositoryToken(Factura), useValue: repo },
        { provide: DataSource, useValue: dataSource },
      ],
    }).compile();
    service = moduleRef.get(FacturasService);
  });

  it('pagar cobra la factura, cierra las líneas y libera la mesa', async () => {
    const manager = {
      findOne: jest.fn(async (Entity: any) => {
        if (Entity === Factura)
          return { id: 1, pedidoId: 10, total: 100, estadoPago: EstadoPago.PENDIENTE };
        if (Entity === TipoPago) return { id: 3, nombre: 'Tarjeta crédito' };
        if (Entity === Pedido) return { id: 10, mesaId: 2 };
        return null;
      }),
      find: jest.fn(async () => [
        { id: 1, estado: DetallePedidoEstado.PENDIENTE },
        { id: 2, estado: DetallePedidoEstado.LISTO },
        { id: 3, estado: DetallePedidoEstado.CANCELADO },
      ]),
      save: jest.fn(async (...a: any[]) => (a.length > 1 ? a[1] : a[0])),
      update: jest.fn(),
    };
    (service as any).dataSource.transaction.mockImplementation(mockTransaction(manager));

    const result = await service.pagar(1, { tipoPagoId: 3 });

    expect(result.estadoPago).toBe(EstadoPago.PAGADO);
    expect(result.tipoPagoId).toBe(3);
    expect(manager.save).toHaveBeenCalledWith(DetallePedido, expect.objectContaining({ estado: DetallePedidoEstado.ENTREGADO }));
    expect(manager.update).toHaveBeenCalledWith(Pedido, 10, {
      estado: PedidoEstado.ENTREGADO,
      tipoPagoId: 3,
    });
    expect(manager.update).toHaveBeenCalledWith(Mesa, 2, { estado: MesaEstado.LIBRE });
  });

  it('pagar rechaza una factura ya pagada (doble cobro)', async () => {
    const manager = {
      findOne: jest.fn(async (Entity: any) => {
        if (Entity === Factura) return { id: 1, pedidoId: 10, estadoPago: EstadoPago.PAGADO };
        return null;
      }),
      find: jest.fn(async () => []),
      save: jest.fn(async (...a: any[]) => (a.length > 1 ? a[1] : a[0])),
      update: jest.fn(),
    };
    (service as any).dataSource.transaction.mockImplementation(mockTransaction(manager));

    await expect(service.pagar(1, { tipoPagoId: 3 })).rejects.toThrow('Esta factura ya fue cobrada');
  });

  it('pagar rechaza una factura anulada', async () => {
    const manager = {
      findOne: jest.fn(async (Entity: any) => {
        if (Entity === Factura) return { id: 1, pedidoId: 10, estadoPago: EstadoPago.ANULADO };
        return null;
      }),
      find: jest.fn(async () => []),
      save: jest.fn(async (...a: any[]) => (a.length > 1 ? a[1] : a[0])),
      update: jest.fn(),
    };
    (service as any).dataSource.transaction.mockImplementation(mockTransaction(manager));

    await expect(service.pagar(1, { tipoPagoId: 3 })).rejects.toThrow('Esta factura está anulada');
  });

  it('pagar exige un método de pago válido', async () => {
    const manager = {
      findOne: jest.fn(async (Entity: any) => {
        if (Entity === Factura) return { id: 1, pedidoId: 10, estadoPago: EstadoPago.PENDIENTE };
        if (Entity === TipoPago) return null;
        return null;
      }),
      find: jest.fn(async () => []),
      save: jest.fn(async (...a: any[]) => (a.length > 1 ? a[1] : a[0])),
      update: jest.fn(),
    };
    (service as any).dataSource.transaction.mockImplementation(mockTransaction(manager));

    await expect(service.pagar(1, { tipoPagoId: 99 })).rejects.toThrow(NotFoundException);
  });

  it('anular marca la factura como anulada', async () => {
    const manager = {
      findOne: jest.fn(async (Entity: any) => {
        if (Entity === Factura) return { id: 1, pedidoId: 10, estadoPago: EstadoPago.PENDIENTE };
        return null;
      }),
      save: jest.fn(async (...a: any[]) => (a.length > 1 ? a[1] : a[0])),
    };
    (service as any).dataSource.transaction.mockImplementation(mockTransaction(manager));

    const result = await service.anular(1);
    expect(result.estadoPago).toBe(EstadoPago.ANULADO);
  });

  it('anular rechaza una factura ya pagada', async () => {
    const manager = {
      findOne: jest.fn(async (Entity: any) => {
        if (Entity === Factura) return { id: 1, pedidoId: 10, estadoPago: EstadoPago.PAGADO };
        return null;
      }),
      save: jest.fn(async (...a: any[]) => (a.length > 1 ? a[1] : a[0])),
    };
    (service as any).dataSource.transaction.mockImplementation(mockTransaction(manager));

    await expect(service.anular(1)).rejects.toThrow('No se puede anular una factura ya cobrada');
  });
});