import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource, In } from 'typeorm';
import { Factura, EstadoPago } from './entities/factura.entity';
import { PagoFactura } from './entities/pago-factura.entity';
import { Pedido, PedidoEstado } from 'src/pedidos/entities/pedido.entity';
import { DetallePedido, DetallePedidoEstado } from 'src/detalle-pedido/entities/detalle-pedido.entity';
import { Mesa, MesaEstado } from 'src/mesas/entities/mesa.entity';
import { TipoPago } from 'src/tipo-pago/entities/tipo-pago.entity';
import { Role } from 'src/common/enums/role.enum';
import { TurnosService } from 'src/turnos/turnos.service';
import { CreateFacturaDto } from './dto/create-factura.dto';
import { UpdateFacturaDto } from './dto/update-factura.dto';
import { PagarFacturaDto } from './dto/pagar-factura.dto';
import { calcularTotales, normalizarPagos } from './utils/cobro';
import { Pagina, PaginacionQueryDto } from 'src/common/dto/paginacion-query.dto';
import { construirPagina, normalizarPaginacion } from 'src/common/paginacion';

const RELACIONES = [
  'pedido',
  'pedido.mesa',
  'pedido.usuario',
  'pedido.detalles',
  'pedido.detalles.producto',
  'tipoPago',
  'creadoPor',
  'cobradoPor',
  'anuladoPor',
  'autorizadoSinTurnoPor',
  'pagos',
  'pagos.tipoPago',
];

@Injectable()
export class FacturasService {
  constructor(
    @InjectRepository(Factura) private readonly repo: Repository<Factura>,
    private readonly dataSource: DataSource,
    private readonly turnos: TurnosService,
  ) {}

  create(dto: CreateFacturaDto): Promise<Factura> {
    return this.repo.save(this.repo.create(dto));
  }

  async findAll(query?: PaginacionQueryDto): Promise<Factura[] | Pagina<Factura>> {
    const paginacion = normalizarPaginacion(query);
    if (!paginacion.paginado) {
      return this.repo.find({ relations: RELACIONES, order: { id: 'DESC' } });
    }
    const [data, total] = await this.repo.findAndCount({
      relations: RELACIONES,
      order: { id: 'DESC' },
      skip: paginacion.skip,
      take: paginacion.limit,
    });
    return construirPagina(data, total, paginacion.page, paginacion.limit);
  }

  findOne(id: number): Promise<Factura | null> {
    return this.repo.findOne({ where: { id }, relations: RELACIONES });
  }

  async update(id: number, dto: UpdateFacturaDto): Promise<Factura> {
    const entity = await this.repo.findOneBy({ id });
    if (!entity) throw new NotFoundException(`Factura #${id} no encontrada`);
    Object.assign(entity, dto);
    return this.repo.save(entity);
  }

  async pagar(id: number, dto: PagarFacturaDto, cobradoPorId?: number, cobradoPorRol?: string): Promise<Factura> {
    return this.dataSource.transaction(async (manager) => {
      // Bloqueo pesimista: si dos cajas intentan cobrar la misma factura a la
      // vez, la segunda espera y recibe "ya fue cobrada" en lugar de duplicar.
      const factura = await manager.findOne(Factura, {
        where: { id },
        lock: { mode: 'pessimistic_write' },
      });
      if (!factura) throw new NotFoundException(`Factura #${id} no encontrada`);
      if (factura.estadoPago === EstadoPago.PAGADO) {
        throw new BadRequestException('Esta factura ya fue cobrada');
      }
      if (factura.estadoPago === EstadoPago.ANULADO) {
        throw new BadRequestException('Esta factura está anulada');
      }

      // Regla de caja: se valida ANTES de tocar pedido, líneas o mesa.
      const esAdmin = cobradoPorRol === Role.ADMIN;
      const turno = await this.turnos.turnoAbiertoParaCobro(manager);
      this.turnos.validarCobro(turno, esAdmin, dto.overrideSinCaja, dto.motivoSinTurno);
      const turnoId = turno?.id ?? null;

      // Desglose de la cuenta (subtotal + IVA + propina).
      const base = Number(factura.subtotal) > 0 ? Number(factura.subtotal) : Number(factura.total);
      const totales = calcularTotales(base, dto.ivaPorcentaje, dto.propinaPorcentaje, dto.propinaMonto);
      const pagos = normalizarPagos(dto.pagos, dto.tipoPagoId, totales.total);

      const idsTipo = [...new Set(pagos.map((p) => p.tipoPagoId))];
      const tipos = await manager.find(TipoPago, { where: { id: In(idsTipo) } });
      if (tipos.length !== idsTipo.length) {
        throw new NotFoundException('Uno de los métodos de pago no existe');
      }

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
        tipoPagoId: pagos[0].tipoPagoId,
      });
      await manager.update(Mesa, pedido.mesaId, { estado: MesaEstado.LIBRE });

      const cobradoSinTurno = !turno && esAdmin && !!dto.overrideSinCaja;

      factura.subtotal = totales.subtotal;
      factura.ivaPorcentaje = totales.ivaPorcentaje;
      factura.iva = totales.iva;
      factura.propinaPorcentaje = totales.propinaPorcentaje;
      factura.propina = totales.propina;
      factura.total = totales.total;
      factura.estadoPago = EstadoPago.PAGADO;
      factura.tipoPagoId = pagos[0].tipoPagoId;
      factura.cobradoPorId = cobradoPorId ?? null;
      factura.cobradoPorRol = cobradoPorRol ?? null;
      factura.fechaCobro = new Date();
      factura.turnoId = turnoId;
      factura.cobradoSinTurno = cobradoSinTurno;
      factura.autorizadoSinTurnoPorId = cobradoSinTurno ? (cobradoPorId ?? null) : null;
      factura.motivoSinTurno = cobradoSinTurno ? (dto.motivoSinTurno ?? '').trim() : null;

      const guardada = await manager.save(Factura, factura);

      // Reemplaza los pagos de la factura (por si venía de un intento previo).
      await manager.delete(PagoFactura, { facturaId: guardada.id });
      await manager.save(
        PagoFactura,
        pagos.map((p) =>
          manager.create(PagoFactura, {
            facturaId: guardada.id,
            tipoPagoId: p.tipoPagoId,
            monto: p.monto,
            fecha: new Date(),
            cobradoPorId: cobradoPorId ?? null,
            cobradoPorRol: cobradoPorRol ?? null,
          }),
        ),
      );

      const completa = await manager.findOne(Factura, {
        where: { id: guardada.id },
        relations: ['pagos', 'pagos.tipoPago', 'cobradoPor', 'tipoPago', 'pedido', 'pedido.mesa'],
      });
      return completa ?? guardada;
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
