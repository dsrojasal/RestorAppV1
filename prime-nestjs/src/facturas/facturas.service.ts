import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { Factura, EstadoPago } from './entities/factura.entity';
import { Pedido, PedidoEstado } from 'src/pedidos/entities/pedido.entity';
import { DetallePedido, DetallePedidoEstado } from 'src/detalle-pedido/entities/detalle-pedido.entity';
import { Mesa, MesaEstado } from 'src/mesas/entities/mesa.entity';
import { TipoPago } from 'src/tipo-pago/entities/tipo-pago.entity';
import { CreateFacturaDto } from './dto/create-factura.dto';
import { UpdateFacturaDto } from './dto/update-factura.dto';
import { PagarFacturaDto } from './dto/pagar-factura.dto';

@Injectable()
export class FacturasService {
  constructor(
    @InjectRepository(Factura) private readonly repo: Repository<Factura>,
    private readonly dataSource: DataSource,
  ) {}

  create(dto: CreateFacturaDto): Promise<Factura> {
    return this.repo.save(this.repo.create(dto));
  }

  findAll(): Promise<Factura[]> {
    return this.repo.find({
      relations: [
        'pedido',
        'pedido.mesa',
        'pedido.usuario',
        'pedido.detalles',
        'pedido.detalles.producto',
        'tipoPago',
        'creadoPor',
        'cobradoPor',
        'anuladoPor',
      ],
      order: { id: 'DESC' },
    });
  }

  findOne(id: number): Promise<Factura | null> {
    return this.repo.findOne({
      where: { id },
      relations: [
        'pedido',
        'pedido.mesa',
        'pedido.usuario',
        'pedido.detalles',
        'pedido.detalles.producto',
        'tipoPago',
        'creadoPor',
        'cobradoPor',
        'anuladoPor',
      ],
    });
  }

  async update(id: number, dto: UpdateFacturaDto): Promise<Factura> {
    const entity = await this.repo.findOneBy({ id });
    if (!entity) throw new NotFoundException(`Factura #${id} no encontrada`);
    Object.assign(entity, dto);
    return this.repo.save(entity);
  }

  async pagar(id: number, dto: PagarFacturaDto, cobradoPorId?: number, cobradoPorRol?: string): Promise<Factura> {
    return this.dataSource.transaction(async (manager) => {
      const factura = await manager.findOne(Factura, { where: { id } });
      if (!factura) throw new NotFoundException(`Factura #${id} no encontrada`);
      if (factura.estadoPago === EstadoPago.PAGADO) {
        throw new BadRequestException('Esta factura ya fue cobrada');
      }
      if (factura.estadoPago === EstadoPago.ANULADO) {
        throw new BadRequestException('Esta factura está anulada');
      }

      const tipo = await manager.findOne(TipoPago, { where: { id: dto.tipoPagoId } });
      if (!tipo) throw new NotFoundException('Método de pago no encontrado');

      const pedido = await manager.findOne(Pedido, { where: { id: factura.pedidoId } });
      if (!pedido) throw new NotFoundException(`Pedido #${factura.pedidoId} no encontrado`);

      const lineas = await manager.find(DetallePedido, { where: { pedidoId: factura.pedidoId } });
      for (const l of lineas) {
        if (l.estado !== DetallePedidoEstado.CANCELADO && l.estado !== DetallePedidoEstado.ENTREGADO) {
          l.estado = DetallePedidoEstado.ENTREGADO;
          await manager.save(DetallePedido, l);
        }
      }

      await manager.update(Pedido, factura.pedidoId, {
        estado: PedidoEstado.ENTREGADO,
        tipoPagoId: dto.tipoPagoId,
      });
      await manager.update(Mesa, pedido.mesaId, { estado: MesaEstado.LIBRE });

      factura.estadoPago = EstadoPago.PAGADO;
      factura.tipoPagoId = dto.tipoPagoId;
      factura.cobradoPorId = cobradoPorId ?? null;
      factura.cobradoPorRol = cobradoPorRol ?? null;
      factura.fechaCobro = new Date();
      return manager.save(Factura, factura);
    });
  }

  async anular(id: number, anuladoPorId?: number, motivoAnulacion?: string): Promise<Factura> {
    return this.dataSource.transaction(async (manager) => {
      const factura = await manager.findOne(Factura, { where: { id } });
      if (!factura) throw new NotFoundException(`Factura #${id} no encontrada`);
      if (factura.estadoPago === EstadoPago.PAGADO) {
        throw new BadRequestException('No se puede anular una factura ya cobrada');
      }
      if (factura.estadoPago === EstadoPago.ANULADO) {
        throw new BadRequestException('Esta factura ya está anulada');
      }
      factura.estadoPago = EstadoPago.ANULADO;
      factura.anuladoPorId = anuladoPorId ?? null;
      factura.motivoAnulacion = motivoAnulacion ?? null;
      return manager.save(Factura, factura);
    });
  }

  async remove(id: number): Promise<void> {
    await this.repo.delete(id);
  }
}
