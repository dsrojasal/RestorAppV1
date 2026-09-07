import { Injectable, NotFoundException, BadRequestException, ForbiddenException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource, In, EntityManager } from 'typeorm';
import { Pedido, PedidoEstado } from './entities/pedido.entity';
import { DetallePedido, DetallePedidoEstado } from 'src/detalle-pedido/entities/detalle-pedido.entity';
import { Producto } from 'src/productos/entities/producto.entity';
import { Mesa, MesaEstado } from 'src/mesas/entities/mesa.entity';
import { Factura, EstadoPago } from 'src/facturas/entities/factura.entity';
import { TipoPago } from 'src/tipo-pago/entities/tipo-pago.entity';
import { Role } from 'src/common/enums/role.enum';
import { CreatePedidoDto } from './dto/create-pedido.dto';
import { UpdatePedidoDto } from './dto/update-pedido.dto';
import { CreateLineaPedidoDto } from './dto/create-linea-pedido.dto';
import { UpdateLineaPedidoDto } from './dto/update-linea-pedido.dto';
import { CobrarPedidoDto } from './dto/cobrar-pedido.dto';
import { TransferirPedidoDto } from './dto/transferir-pedido.dto';
import { NotificacionesService } from 'src/notificaciones/notificaciones.service';
import { TipoNotificacion } from 'src/notificaciones/entities/notificacion.entity';
import { RecetasService } from 'src/recetas/recetas.service';

@Injectable()
export class PedidosService {
  constructor(
    @InjectRepository(Pedido) private readonly repo: Repository<Pedido>,
    private readonly dataSource: DataSource,
    private readonly notificaciones?: NotificacionesService,
    private readonly recetas?: RecetasService,
  ) {}

  async create(dto: CreatePedidoDto): Promise<Pedido> {
    const pedido = await this.dataSource.transaction(async (manager) => {
      const result = await manager
        .createQueryBuilder()
        .update(Mesa)
        .set({ estado: MesaEstado.OCUPADA })
        .where('id = :id AND estado = :libre', { id: dto.mesaId, libre: MesaEstado.LIBRE })
        .execute();

      if (!result.affected || result.affected === 0) {
        const mesa = await manager.findOne(Mesa, { where: { id: dto.mesaId } });
        if (!mesa) throw new NotFoundException(`Mesa #${dto.mesaId} no encontrada`);
        throw new BadRequestException(`La mesa ${mesa.numero} ya está ocupada o no disponible; está siendo atendida por otro mesero`);
      }

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

      await this.recalcularTotal(manager, saved.id);

      return this.findOneWithManager(manager, saved.id);
    });

    const numeroMesa = (pedido.mesa as Mesa | undefined)?.numero ?? pedido.mesaId;
    this.notificaciones?.crear({
      tipo: TipoNotificacion.PEDIDO,
      mensaje: `Nuevo pedido #${pedido.id} - Mesa ${numeroMesa}`,
      icono: 'receipt',
      clase: 'danger',
      roles: [Role.ADMIN, Role.MESERO, Role.CHEF],
      creadoPorId: pedido.usuarioId ?? undefined,
      refId: `pedido:${pedido.id}`,
    });
    return pedido;
  }

  async agregarLinea(pedidoId: number, dto: CreateLineaPedidoDto, userId?: number, userRol?: string): Promise<Pedido> {
    return this.dataSource.transaction(async (manager) => {
      const pedido = await manager.findOne(Pedido, { where: { id: pedidoId } });
      if (!pedido) throw new NotFoundException(`Pedido #${pedidoId} no encontrado`);
      this.validarDueño(pedido, userId, userRol);
      await this.validarEditable(manager, pedidoId);
      await this.agregarLineas(manager, pedidoId, [dto]);
      await this.recalcularTotal(manager, pedidoId);
      await this.actualizarEstadoDerivado(manager, pedidoId);
      return this.findOneWithManager(manager, pedidoId);
    });
  }

  async cambiarEstadoLinea(pedidoId: number, lineaId: number, estado: DetallePedidoEstado, userId?: number): Promise<DetallePedido> {
    return this.dataSource.transaction(async (manager) => {
      const linea = await manager.findOne(DetallePedido, { where: { id: lineaId, pedidoId } });
      if (!linea) throw new NotFoundException(`Línea #${lineaId} del pedido #${pedidoId} no encontrada`);

      const transiciones: Record<DetallePedidoEstado, DetallePedidoEstado[]> = {
        [DetallePedidoEstado.PENDIENTE]: [DetallePedidoEstado.EN_PREPARACION, DetallePedidoEstado.CANCELADO],
        [DetallePedidoEstado.EN_PREPARACION]: [DetallePedidoEstado.LISTO, DetallePedidoEstado.CANCELADO],
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

      if (estado === DetallePedidoEstado.LISTO) {
        await this.marcarListo(manager, linea);
      } else if (estado === DetallePedidoEstado.CANCELADO) {
        await this.recetas?.liberarReserva(manager, this.itemLinea(linea));
      }
      await this.actualizarEstadoDerivado(manager, pedidoId);

      if (estado === DetallePedidoEstado.LISTO) {
        const pedido = await manager.findOne(Pedido, { where: { id: pedidoId }, relations: ['mesa'] });
        const numeroMesa = pedido?.mesa?.numero ?? pedidoId;
        if (pedido) {
          this.notificaciones?.crear({
            tipo: TipoNotificacion.PEDIDO_LISTO,
            mensaje: `Pedido #${pedidoId} · Mesa ${numeroMesa}: ítems listos para entregar`,
            icono: 'receipt',
            clase: 'danger',
            roles: [Role.ADMIN],
            usuarioId: pedido.usuarioId ?? undefined,
            creadoPorId: userId,
            refId: `pedido:${pedidoId}`,
          });
        }
      }
      return linea;
    });
  }

  private async marcarListo(manager: EntityManager, linea: DetallePedido): Promise<void> {
    const bajos = (await this.recetas?.consumir(manager, this.itemLinea(linea))) ?? [];
    if (bajos.length > 0) {
      this.notificaciones?.notificarStockBajo?.(bajos);
    }
  }

  async entregarLinea(pedidoId: number, lineaId: number, userId?: number, userRol?: string): Promise<Pedido> {
    return this.dataSource.transaction(async (manager) => {
      const pedido = await manager.findOne(Pedido, { where: { id: pedidoId } });
      if (!pedido) throw new NotFoundException(`Pedido #${pedidoId} no encontrado`);
      this.validarDueño(pedido, userId, userRol);
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

  async editarLinea(pedidoId: number, lineaId: number, dto: UpdateLineaPedidoDto, userId?: number, userRol?: string): Promise<Pedido> {
    return this.dataSource.transaction(async (manager) => {
      const pedido = await manager.findOne(Pedido, { where: { id: pedidoId } });
      if (!pedido) throw new NotFoundException(`Pedido #${pedidoId} no encontrado`);
      this.validarDueño(pedido, userId, userRol);
      await this.validarEditable(manager, pedidoId);
      const linea = await manager.findOne(DetallePedido, { where: { id: lineaId, pedidoId } });
      if (!linea) throw new NotFoundException(`Línea #${lineaId} del pedido #${pedidoId} no encontrada`);
      if (linea.estado === DetallePedidoEstado.ENTREGADO || linea.estado === DetallePedidoEstado.CANCELADO) {
        throw new BadRequestException('No se puede editar un ítem entregado o cancelado');
      }
      if (dto.cantidad !== undefined) {
        if (dto.cantidad < 1) throw new BadRequestException('La cantidad debe ser al menos 1');
        const cantidadAnterior = Number(linea.cantidad);
        linea.cantidad = dto.cantidad;
        linea.subtotal = Number((Number(linea.cantidad) * Number(linea.precioUnitario)).toFixed(2));
        if (dto.cantidad !== cantidadAnterior) {
          await this.recetas?.ajustarReserva(manager, {
            lineaId,
            productoId: linea.productoId,
            cantidadAnterior,
            cantidadNueva: dto.cantidad,
          });
        }
      }
      if (dto.observacion !== undefined) {
        linea.observacion = dto.observacion ?? null;
      }
      await manager.save(DetallePedido, linea);
      await this.recalcularTotal(manager, pedidoId);
      return this.findOneWithManager(manager, pedidoId);
    });
  }

  async cobrar(pedidoId: number, dto: CobrarPedidoDto, userId?: number, userRol?: string): Promise<{ factura: Factura; pedido: Pedido }> {
    const resultado = await this.dataSource.transaction(async (manager) => {
      const pedido = await manager.findOne(Pedido, { where: { id: pedidoId } });
      if (!pedido) throw new NotFoundException(`Pedido #${pedidoId} no encontrado`);
      this.validarDueño(pedido, userId, userRol, true);

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
          factura.creadoPorId = userId ?? factura.creadoPorId;
          factura.cobradoPorId = userId ?? null;
          factura.cobradoPorRol = userRol ?? null;
          factura.fechaCobro = new Date();
          factura = await manager.save(Factura, factura);
        } else {
          factura = await manager.save(
            Factura,
            manager.create(Factura, {
              pedidoId,
              total: Number(pedido.total),
              estadoPago: EstadoPago.PAGADO,
              tipoPagoId: dto.tipoPagoId,
              creadoPorId: userId ?? null,
              cobradoPorId: userId ?? null,
              cobradoPorRol: userRol ?? null,
              fechaCobro: new Date(),
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
              creadoPorId: userId ?? null,
            }),
          );
        }
      }

      const pedidoFinal = await this.findOneWithManager(manager, pedidoId);
      return { factura, pedido: pedidoFinal };
    });

    this.notificaciones?.crear({
      tipo: TipoNotificacion.FACTURA,
      mensaje: `Factura #${resultado.factura.id} generada`,
      icono: 'payments',
      clase: 'primary',
      roles: [Role.ADMIN, Role.CAJERO],
      creadoPorId: userId,
      refId: `factura:${resultado.factura.id}`,
    });
    return resultado;
  }

  async transferir(pedidoId: number, dto: TransferirPedidoDto, userId?: number, userRol?: string): Promise<Pedido> {
    return this.dataSource.transaction(async (manager) => {
      const pedido = await manager.findOne(Pedido, { where: { id: pedidoId } });
      if (!pedido) throw new NotFoundException(`Pedido #${pedidoId} no encontrado`);
      this.validarDueño(pedido, userId, userRol);
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

  async eliminarLinea(pedidoId: number, lineaId: number, userId?: number, userRol?: string): Promise<Pedido> {
    return this.dataSource.transaction(async (manager) => {
      const pedido = await manager.findOne(Pedido, { where: { id: pedidoId } });
      if (!pedido) throw new NotFoundException(`Pedido #${pedidoId} no encontrado`);
      this.validarDueño(pedido, userId, userRol);
      const linea = await manager.findOne(DetallePedido, { where: { id: lineaId, pedidoId } });
      if (!linea) throw new NotFoundException(`Línea #${lineaId} del pedido #${pedidoId} no encontrada`);
      await this.validarEditable(manager, pedidoId);
      if (linea.estado !== DetallePedidoEstado.PENDIENTE) {
        throw new BadRequestException('Solo se pueden quitar ítems en estado pendiente');
      }
      await this.recetas?.liberarReserva(manager, this.itemLinea(linea));
      await manager.delete(DetallePedido, lineaId);
      await this.recalcularTotal(manager, pedidoId);
      await this.actualizarEstadoDerivado(manager, pedidoId);
      return this.findOneWithManager(manager, pedidoId);
    });
  }

  findAll(mesaId?: number): Promise<Pedido[]> {
    return this.repo.find({
      where: mesaId ? { mesaId } : {},
      relations: ['mesa', 'usuario', 'detalles', 'detalles.producto', 'facturas', 'facturas.creadoPor', 'facturas.cobradoPor', 'facturas.anuladoPor'],
      order: { id: 'DESC' },
    });
  }

  findOne(id: number): Promise<Pedido | null> {
    return this.repo.findOne({
      where: { id },
      relations: ['mesa', 'usuario', 'detalles', 'detalles.producto', 'facturas', 'facturas.creadoPor', 'facturas.cobradoPor', 'facturas.anuladoPor'],
    });
  }

  async update(id: number, dto: UpdatePedidoDto, userId?: number, userRol?: string): Promise<Pedido> {
    const entity = await this.findOne(id);
    if (!entity) throw new NotFoundException(`Pedido #${id} no encontrado`);
    this.validarDueño(entity, userId, userRol);

    const { lineas, ...rest } = dto;
    await this.dataSource.transaction(async (manager) => {
      if (lineas && lineas.length > 0) {
        await this.validarEditable(manager, id);
        const actuales = await manager.find(DetallePedido, { where: { pedidoId: id } });
        await this.liberarLineasPendientes(manager, actuales);
        await manager.delete(DetallePedido, { pedidoId: id });
        await this.agregarLineas(manager, id, lineas);
        await this.recalcularTotal(manager, id);
        await this.actualizarEstadoDerivado(manager, id);
      }
      if (Object.keys(rest).length > 0) {
        if (rest.estado === PedidoEstado.CANCELADO && entity.estado !== PedidoEstado.CANCELADO) {
          const actuales = await manager.find(DetallePedido, { where: { pedidoId: id } });
          await this.liberarLineasPendientes(manager, actuales);
        }
        await manager.update(Pedido, id, { ...rest });
      }
    });
    return this.findOne(id) as Promise<Pedido>;
  }

  private async liberarLineasPendientes(manager: EntityManager, lineas: DetallePedido[]): Promise<void> {
    const aLiberar = lineas.filter((l) => l.estado === DetallePedidoEstado.PENDIENTE || l.estado === DetallePedidoEstado.EN_PREPARACION);
    if (aLiberar.length === 0) return;
    await this.recetas?.liberarLote(
      manager,
      aLiberar.map((l) => this.itemLinea(l)),
    );
  }

  async remove(id: number, userId?: number, userRol?: string): Promise<void> {
    const pedido = await this.findOne(id);
    if (!pedido) throw new NotFoundException(`Pedido #${id} no encontrado`);
    this.validarDueño(pedido, userId, userRol);
    await this.dataSource.transaction(async (manager) => {
      const factura = await manager.findOne(Factura, { where: { pedidoId: id } });
      if (factura && factura.estadoPago !== EstadoPago.ANULADO) {
        throw new BadRequestException('El pedido tiene una factura asociada; debe anularse primero para poder eliminarlo');
      }
      if (factura) {
        await manager.delete(Factura, { pedidoId: id });
      }
      const lineasActuales = await manager.find(DetallePedido, { where: { pedidoId: id } });
      await this.liberarLineasPendientes(manager, lineasActuales);
      await manager.delete(DetallePedido, { pedidoId: id });
      await manager.delete(Pedido, id);
      await manager.update(Mesa, pedido.mesaId, { estado: MesaEstado.LIBRE });
    });
  }

  private validarDueño(pedido: Pedido, userId?: number, userRol?: string, permitirCajero = false) {
    if (!userId) return;
    if (userRol === Role.ADMIN) return;
    if (permitirCajero && userRol === Role.CAJERO) return;
    if (pedido.usuarioId !== userId) {
      throw new ForbiddenException('Este pedido lo está atendiendo otro mesero; no puedes modificarlo');
    }
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

    const creadas: DetallePedido[] = [];
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
      creadas.push(await manager.save(DetallePedido, detalle));
    }

    await this.recetas?.validarYReservar(
      manager,
      creadas.map((d) => this.itemLinea(d)),
    );
  }

  private itemLinea(d: DetallePedido): { lineaId: number; productoId: number; cantidad: number } {
    return { lineaId: d.id, productoId: d.productoId, cantidad: Number(d.cantidad) };
  }

  private async recalcularTotal(manager: EntityManager, pedidoId: number) {
    const detalles = await manager.find(DetallePedido, { where: { pedidoId } });
    const total = detalles.filter((d) => d.estado !== DetallePedidoEstado.CANCELADO).reduce((acc, d) => acc + Number(d.subtotal), 0);
    await manager.update(Pedido, pedidoId, { total: Number(total.toFixed(2)) });
  }

  private async findOneWithManager(manager: EntityManager, pedidoId: number): Promise<Pedido> {
    return manager.findOne(Pedido, {
      where: { id: pedidoId },
      relations: ['mesa', 'usuario', 'detalles', 'detalles.producto', 'facturas', 'facturas.creadoPor', 'facturas.cobradoPor', 'facturas.anuladoPor'],
    }) as Promise<Pedido>;
  }
}
