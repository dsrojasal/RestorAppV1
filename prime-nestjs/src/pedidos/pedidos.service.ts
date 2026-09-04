import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource, In, EntityManager } from 'typeorm';
import { Pedido, PedidoEstado } from './entities/pedido.entity';
import { DetallePedido, DetallePedidoEstado } from 'src/detalle-pedido/entities/detalle-pedido.entity';
import { Producto } from 'src/productos/entities/producto.entity';
import { Mesa, MesaEstado } from 'src/mesas/entities/mesa.entity';
import { Factura, EstadoPago } from 'src/facturas/entities/factura.entity';
import { TipoPago } from 'src/tipo-pago/entities/tipo-pago.entity';
import { CreatePedidoDto } from './dto/create-pedido.dto';
import { UpdatePedidoDto } from './dto/update-pedido.dto';
import { CreateLineaPedidoDto } from './dto/create-linea-pedido.dto';
import { UpdateLineaPedidoDto } from './dto/update-linea-pedido.dto';
import { CobrarPedidoDto } from './dto/cobrar-pedido.dto';
import { TransferirPedidoDto } from './dto/transferir-pedido.dto';

@Injectable()
export class PedidosService {
  constructor(
    @InjectRepository(Pedido) private readonly repo: Repository<Pedido>,
    private readonly dataSource: DataSource,
  ) {}

  async create(dto: CreatePedidoDto): Promise<Pedido> {
    return this.dataSource.transaction(async (manager) => {
      const mesa = await manager.findOne(Mesa, { where: { id: dto.mesaId } });
      if (!mesa) throw new NotFoundException(`Mesa #${dto.mesaId} no encontrada`);
      if (mesa.estado !== MesaEstado.LIBRE) throw new BadRequestException(`La mesa ${mesa.numero} no está disponible`);

      const pedido = manager.create(Pedido, {
        mesaId: dto.mesaId,
        usuarioId: dto.usuarioId,
        estado: PedidoEstado.PENDIENTE,
        total: 0,
        observaciones: dto.observaciones,
      });
      const saved = await manager.save(Pedido, pedido);

      const lineas = dto.lineas || [];
      if (lineas.length > 0) {
        await this.agregarLineas(manager, saved.id, lineas);
      }

      await manager.update(Mesa, mesa.id, { estado: MesaEstado.OCUPADA });
      await this.recalcularTotal(manager, saved.id);

      return this.findOneWithManager(manager, saved.id);
    });
  }

  async agregarLinea(pedidoId: number, dto: CreateLineaPedidoDto): Promise<Pedido> {
    return this.dataSource.transaction(async (manager) => {
      const pedido = await manager.findOne(Pedido, { where: { id: pedidoId } });
      if (!pedido) throw new NotFoundException(`Pedido #${pedidoId} no encontrado`);
      await this.validarEditable(manager, pedidoId);
      await this.agregarLineas(manager, pedidoId, [dto]);
      await this.recalcularTotal(manager, pedidoId);
      await this.actualizarEstadoDerivado(manager, pedidoId);
      return this.findOneWithManager(manager, pedidoId);
    });
  }

  async cambiarEstadoLinea(pedidoId: number, lineaId: number, estado: DetallePedidoEstado): Promise<DetallePedido> {
    return this.dataSource.transaction(async (manager) => {
      const linea = await manager.findOne(DetallePedido, { where: { id: lineaId, pedidoId } });
      if (!linea) throw new NotFoundException(`Línea #${lineaId} del pedido #${pedidoId} no encontrada`);

      const transiciones: Record<DetallePedidoEstado, DetallePedidoEstado[]> = {
        [DetallePedidoEstado.PENDIENTE]: [DetallePedidoEstado.EN_PREPARACION, DetallePedidoEstado.CANCELADO],
        [DetallePedidoEstado.EN_PREPARACION]: [DetallePedidoEstado.LISTO],
        [DetallePedidoEstado.LISTO]: [],
        [DetallePedidoEstado.ENTREGADO]: [],
        [DetallePedidoEstado.CANCELADO]: [],
      };

      const permitidos = transiciones[linea.estado] || [];
      if (!permitidos.includes(estado)) {
        throw new BadRequestException(`No se puede pasar la línea de "${linea.estado}" a "${estado}"`);
      }

      linea.estado = estado;
      await manager.save(DetallePedido, linea);
      await this.actualizarEstadoDerivado(manager, pedidoId);
      return linea;
    });
  }

  async entregarLinea(pedidoId: number, lineaId: number): Promise<Pedido> {
    return this.dataSource.transaction(async (manager) => {
      const pedido = await manager.findOne(Pedido, { where: { id: pedidoId } });
      if (!pedido) throw new NotFoundException(`Pedido #${pedidoId} no encontrado`);
      await this.validarEditable(manager, pedidoId);
      const linea = await manager.findOne(DetallePedido, { where: { id: lineaId, pedidoId } });
      if (!linea) throw new NotFoundException(`Línea #${lineaId} del pedido #${pedidoId} no encontrada`);
      if (linea.estado !== DetallePedidoEstado.LISTO) {
        throw new BadRequestException('Solo se pueden entregar ítems que estén listos');
      }
      linea.estado = DetallePedidoEstado.ENTREGADO;
      await manager.save(DetallePedido, linea);
      await this.actualizarEstadoDerivado(manager, pedidoId);
      return this.findOneWithManager(manager, pedidoId);
    });
  }

  async editarLinea(pedidoId: number, lineaId: number, dto: UpdateLineaPedidoDto): Promise<Pedido> {
    return this.dataSource.transaction(async (manager) => {
      const pedido = await manager.findOne(Pedido, { where: { id: pedidoId } });
      if (!pedido) throw new NotFoundException(`Pedido #${pedidoId} no encontrado`);
      await this.validarEditable(manager, pedidoId);
      const linea = await manager.findOne(DetallePedido, { where: { id: lineaId, pedidoId } });
      if (!linea) throw new NotFoundException(`Línea #${lineaId} del pedido #${pedidoId} no encontrada`);
      if (linea.estado === DetallePedidoEstado.ENTREGADO || linea.estado === DetallePedidoEstado.CANCELADO) {
        throw new BadRequestException('No se puede editar un ítem entregado o cancelado');
      }
      if (dto.cantidad !== undefined) {
        if (dto.cantidad < 1) throw new BadRequestException('La cantidad debe ser al menos 1');
        linea.cantidad = dto.cantidad;
        linea.subtotal = Number((Number(linea.cantidad) * Number(linea.precioUnitario)).toFixed(2));
      }
      if (dto.observacion !== undefined) {
        linea.observacion = dto.observacion ?? null;
      }
      await manager.save(DetallePedido, linea);
      await this.recalcularTotal(manager, pedidoId);
      return this.findOneWithManager(manager, pedidoId);
    });
  }

  async cobrar(pedidoId: number, dto: CobrarPedidoDto): Promise<{ factura: Factura; pedido: Pedido }> {
    return this.dataSource.transaction(async (manager) => {
      const pedido = await manager.findOne(Pedido, { where: { id: pedidoId } });
      if (!pedido) throw new NotFoundException(`Pedido #${pedidoId} no encontrado`);

      const lineas = await manager.find(DetallePedido, { where: { pedidoId } });
      const activas = lineas.filter((l) => l.estado !== DetallePedidoEstado.CANCELADO);
      if (activas.length === 0) throw new BadRequestException('El pedido no tiene ítems para cobrar');
      const porEntregar = activas.filter((l) => l.estado !== DetallePedidoEstado.LISTO && l.estado !== DetallePedidoEstado.ENTREGADO);
      if (porEntregar.length > 0) {
        throw new BadRequestException('Hay ítems pendientes o en preparación; no se puede cobrar todavía');
      }

      let factura = await manager.findOne(Factura, { where: { pedidoId } });
      if (factura && factura.estadoPago === EstadoPago.PAGADO) {
        throw new BadRequestException('Este pedido ya fue cobrado');
      }

      for (const l of activas) {
        if (l.estado !== DetallePedidoEstado.ENTREGADO) {
          l.estado = DetallePedidoEstado.ENTREGADO;
          await manager.save(DetallePedido, l);
        }
      }

      if (dto.modo === 'propio') {
        if (!dto.tipoPagoId) throw new BadRequestException('Debe seleccionar un método de pago');
        const tipo = await manager.findOne(TipoPago, { where: { id: dto.tipoPagoId } });
        if (!tipo) throw new NotFoundException('Método de pago no encontrado');

        await manager.update(Pedido, pedidoId, {
          estado: PedidoEstado.ENTREGADO,
          tipoPagoId: dto.tipoPagoId,
        });

        if (factura) {
          factura.estadoPago = EstadoPago.PAGADO;
          factura.tipoPagoId = dto.tipoPagoId;
          factura = await manager.save(Factura, factura);
        } else {
          factura = await manager.save(
            Factura,
            manager.create(Factura, {
              pedidoId,
              total: Number(pedido.total),
              estadoPago: EstadoPago.PAGADO,
              tipoPagoId: dto.tipoPagoId,
            }),
          );
        }
        await manager.update(Mesa, pedido.mesaId, { estado: MesaEstado.LIBRE });
      } else {
        await manager.update(Pedido, pedidoId, { estado: PedidoEstado.ENTREGADO });
        if (!factura) {
          factura = await manager.save(
            Factura,
            manager.create(Factura, {
              pedidoId,
              total: Number(pedido.total),
              estadoPago: EstadoPago.PENDIENTE,
            }),
          );
        }
      }

      const pedidoFinal = await this.findOneWithManager(manager, pedidoId);
      return { factura, pedido: pedidoFinal };
    });
  }

  async transferir(pedidoId: number, dto: TransferirPedidoDto): Promise<Pedido> {
    return this.dataSource.transaction(async (manager) => {
      const pedido = await manager.findOne(Pedido, { where: { id: pedidoId } });
      if (!pedido) throw new NotFoundException(`Pedido #${pedidoId} no encontrado`);
      if (pedido.estado === PedidoEstado.CANCELADO) {
        throw new BadRequestException('No se puede transferir un pedido cancelado');
      }
      await this.validarEditable(manager, pedidoId);

      const nueva = await manager.findOne(Mesa, { where: { id: dto.mesaId } });
      if (!nueva) throw new NotFoundException(`Mesa #${dto.mesaId} no encontrada`);
      if (nueva.id !== pedido.mesaId && nueva.estado !== MesaEstado.LIBRE) {
        throw new BadRequestException('La mesa destino no está libre');
      }

      await manager.update(Mesa, pedido.mesaId, { estado: MesaEstado.LIBRE });
      await manager.update(Mesa, dto.mesaId, { estado: MesaEstado.OCUPADA });
      await manager.update(Pedido, pedidoId, { mesaId: dto.mesaId });

      return this.findOneWithManager(manager, pedidoId);
    });
  }

  async eliminarLinea(pedidoId: number, lineaId: number): Promise<Pedido> {
    return this.dataSource.transaction(async (manager) => {
      const linea = await manager.findOne(DetallePedido, { where: { id: lineaId, pedidoId } });
      if (!linea) throw new NotFoundException(`Línea #${lineaId} del pedido #${pedidoId} no encontrada`);
      await this.validarEditable(manager, pedidoId);
      if (linea.estado !== DetallePedidoEstado.PENDIENTE) {
        throw new BadRequestException('Solo se pueden quitar ítems en estado pendiente');
      }
      await manager.delete(DetallePedido, lineaId);
      await this.recalcularTotal(manager, pedidoId);
      await this.actualizarEstadoDerivado(manager, pedidoId);
      return this.findOneWithManager(manager, pedidoId);
    });
  }

  findAll(mesaId?: number): Promise<Pedido[]> {
    return this.repo.find({
      where: mesaId ? { mesaId } : {},
      relations: ['mesa', 'usuario', 'detalles', 'detalles.producto'],
      order: { id: 'DESC' },
    });
  }

  findOne(id: number): Promise<Pedido | null> {
    return this.repo.findOne({
      where: { id },
      relations: ['mesa', 'usuario', 'detalles', 'detalles.producto'],
    });
  }

  async update(id: number, dto: UpdatePedidoDto): Promise<Pedido> {
    const entity = await this.findOne(id);
    if (!entity) throw new NotFoundException(`Pedido #${id} no encontrado`);
    Object.assign(entity, dto);
    if (dto.lineas && dto.lineas.length > 0) {
      await this.dataSource.transaction(async (manager) => {
        await this.validarEditable(manager, id);
        await manager.delete(DetallePedido, { pedidoId: id });
        await this.agregarLineas(manager, id, dto.lineas!);
        await this.recalcularTotal(manager, id);
        await this.actualizarEstadoDerivado(manager, id);
      });
    }
    return this.findOne(id) as Promise<Pedido>;
  }

  async remove(id: number): Promise<void> {
    const pedido = await this.findOne(id);
    if (!pedido) throw new NotFoundException(`Pedido #${id} no encontrado`);
    await this.dataSource.transaction(async (manager) => {
      const factura = await manager.findOne(Factura, { where: { pedidoId: id } });
      if (factura && factura.estadoPago !== EstadoPago.ANULADO) {
        throw new BadRequestException('El pedido tiene una factura asociada; debe anularse primero para poder eliminarlo');
      }
      await manager.delete(DetallePedido, { pedidoId: id });
      await manager.delete(Pedido, id);
      await manager.update(Mesa, pedido.mesaId, { estado: MesaEstado.LIBRE });
    });
  }

  private async validarEditable(manager: EntityManager, pedidoId: number) {
    const factura = await manager.findOne(Factura, { where: { pedidoId } });
    if (factura && factura.estadoPago !== EstadoPago.ANULADO) {
      throw new BadRequestException('El pedido está en espera de cobro en caja; no se puede modificar');
    }
  }

  private async actualizarEstadoDerivado(manager: EntityManager, pedidoId: number) {
    const lineas = await manager.find(DetallePedido, { where: { pedidoId } });
    const activas = lineas.filter((l) => l.estado !== DetallePedidoEstado.CANCELADO);
    if (activas.length === 0) return;
    let estado: PedidoEstado;
    if (activas.some((l) => l.estado === DetallePedidoEstado.PENDIENTE || l.estado === DetallePedidoEstado.EN_PREPARACION)) {
      estado = PedidoEstado.PENDIENTE;
    } else if (activas.some((l) => l.estado === DetallePedidoEstado.LISTO)) {
      estado = PedidoEstado.LISTO;
    } else {
      estado = PedidoEstado.ENTREGADO;
    }
    await manager.update(Pedido, pedidoId, { estado });
  }

  private async agregarLineas(manager: EntityManager, pedidoId: number, lineas: CreateLineaPedidoDto[]) {
    const productoIds = lineas.map((l) => l.productoId);
    const productos = await manager.find(Producto, { where: { id: In(productoIds) } });
    const map = new Map(productos.map((p) => [p.id, p]));

    for (const linea of lineas) {
      const producto = map.get(linea.productoId);
      if (!producto) throw new NotFoundException(`Producto #${linea.productoId} no encontrado`);
      const cantidad = linea.cantidad ?? 1;
      const precioUnitario = Number(producto.precio);
      const subtotal = Number((cantidad * precioUnitario).toFixed(2));
      const detalle = manager.create(DetallePedido, {
        pedidoId,
        productoId: producto.id,
        cantidad,
        precioUnitario,
        subtotal,
        estado: DetallePedidoEstado.PENDIENTE,
        observacion: linea.observacion,
      });
      await manager.save(DetallePedido, detalle);
    }
  }

  private async recalcularTotal(manager: EntityManager, pedidoId: number) {
    const detalles = await manager.find(DetallePedido, { where: { pedidoId } });
    const total = detalles.filter((d) => d.estado !== DetallePedidoEstado.CANCELADO).reduce((acc, d) => acc + Number(d.subtotal), 0);
    await manager.update(Pedido, pedidoId, { total: Number(total.toFixed(2)) });
  }

  private async findOneWithManager(manager: EntityManager, pedidoId: number): Promise<Pedido> {
    return manager.findOne(Pedido, {
      where: { id: pedidoId },
      relations: ['mesa', 'usuario', 'detalles', 'detalles.producto'],
    }) as Promise<Pedido>;
  }
}
