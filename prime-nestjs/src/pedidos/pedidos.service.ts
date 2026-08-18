import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource, In, EntityManager } from 'typeorm';
import { Pedido, PedidoEstado } from './entities/pedido.entity';
import { DetallePedido, DetallePedidoEstado } from 'src/detalle-pedido/entities/detalle-pedido.entity';
import { Producto } from 'src/productos/entities/producto.entity';
import { Mesa, MesaEstado } from 'src/mesas/entities/mesa.entity';
import { CreatePedidoDto } from './dto/create-pedido.dto';
import { UpdatePedidoDto } from './dto/update-pedido.dto';
import { CreateLineaPedidoDto } from './dto/create-linea-pedido.dto';

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

      return manager.findOne(Pedido, { where: { id: saved.id }, relations: ['mesa', 'usuario', 'detalles', 'detalles.producto'] }) as Promise<Pedido>;
    });
  }

  async agregarLinea(pedidoId: number, dto: CreateLineaPedidoDto): Promise<Pedido> {
    return this.dataSource.transaction(async (manager) => {
      const pedido = await manager.findOne(Pedido, { where: { id: pedidoId } });
      if (!pedido) throw new NotFoundException(`Pedido #${pedidoId} no encontrado`);
      await this.agregarLineas(manager, pedidoId, [dto]);
      await this.recalcularTotal(manager, pedidoId);
      return manager.findOne(Pedido, { where: { id: pedidoId }, relations: ['mesa', 'usuario', 'detalles', 'detalles.producto'] }) as Promise<Pedido>;
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
        [DetallePedidoEstado.CANCELADO]: [],
      };

      const permitidos = transiciones[linea.estado] || [];
      if (!permitidos.includes(estado)) {
        throw new BadRequestException(`No se puede pasar la línea de "${linea.estado}" a "${estado}"`);
      }

      linea.estado = estado;
      await manager.save(DetallePedido, linea);
      return linea;
    });
  }

  async eliminarLinea(pedidoId: number, lineaId: number): Promise<Pedido> {
    return this.dataSource.transaction(async (manager) => {
      const linea = await manager.findOne(DetallePedido, { where: { id: lineaId, pedidoId } });
      if (!linea) throw new NotFoundException(`Línea #${lineaId} del pedido #${pedidoId} no encontrada`);
      if (linea.estado !== DetallePedidoEstado.PENDIENTE) {
        throw new BadRequestException('Solo se pueden quitar ítems en estado pendiente');
      }
      await manager.delete(DetallePedido, lineaId);
      await this.recalcularTotal(manager, pedidoId);
      return manager.findOne(Pedido, { where: { id: pedidoId }, relations: ['mesa', 'usuario', 'detalles', 'detalles.producto'] }) as Promise<Pedido>;
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
        await manager.delete(DetallePedido, { pedidoId: id });
        await this.agregarLineas(manager, id, dto.lineas!);
        await this.recalcularTotal(manager, id);
      });
    }
    return this.findOne(id) as Promise<Pedido>;
  }

  async remove(id: number): Promise<void> {
    const pedido = await this.findOne(id);
    if (!pedido) throw new NotFoundException(`Pedido #${id} no encontrado`);
    await this.dataSource.transaction(async (manager) => {
      await manager.delete(DetallePedido, { pedidoId: id });
      await manager.delete(Pedido, id);
      await manager.update(Mesa, pedido.mesaId, { estado: MesaEstado.LIBRE });
    });
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
    const total = detalles
      .filter((d) => d.estado !== DetallePedidoEstado.CANCELADO)
      .reduce((acc, d) => acc + Number(d.subtotal), 0);
    await manager.update(Pedido, pedidoId, { total: Number(total.toFixed(2)) });
  }
}
