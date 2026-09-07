import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, EntityManager, In, Repository } from 'typeorm';
import { ProductoIngrediente } from 'src/producto-ingrediente/entities/producto-ingrediente.entity';
import { Ingrediente } from 'src/ingredientes/entities/ingrediente.entity';
import { Producto, TipoProducto } from 'src/productos/entities/producto.entity';
import { MovimientoInventario, TipoMovimientoInventario } from './entities/movimiento-inventario.entity';
import { SetRecetaDto } from './dto/set-receta.dto';

export interface Necesidad {
  tipo: 'ingrediente' | 'producto';
  id: number;
  cantidad: number;
}

export interface RecursoReq {
  tipo: 'ingrediente' | 'producto';
  id: number;
  total: number;
  items: { cantidad: number; lineaId: number }[];
}

export interface DisponibilidadItem {
  productoId: number;
  nombre: string;
  tipo: TipoProducto;
  disponible: number | null;
  motivo: string | null;
  tieneReceta: boolean;
}

export interface StockBajoItem {
  refId: string;
  nombre: string;
  stock: number;
  stockMinimo: number;
  unidad: string;
}

export interface MovimientoDto {
  id: number;
  tipo: string;
  cantidad: number;
  pedidoId: number | null;
  pedidoLineaId: number | null;
  recurso: string;
  unidad: string;
  createdAt: string;
}

const EPSILON = 0.000001;

@Injectable()
export class RecetasService {
  constructor(
    @InjectRepository(ProductoIngrediente) private readonly piRepo: Repository<ProductoIngrediente>,
    @InjectRepository(MovimientoInventario) private readonly movRepo: Repository<MovimientoInventario>,
    @InjectRepository(Ingrediente) private readonly ingRepo: Repository<Ingrediente>,
    @InjectRepository(Producto) private readonly prodRepo: Repository<Producto>,
    private readonly dataSource: DataSource,
  ) {}

  private redondear(v: number): number {
    return Math.round((v + Number.EPSILON) * 1000) / 1000;
  }

  async getReceta(productoId: number) {
    const producto = await this.prodRepo.findOne({ where: { id: productoId } });
    if (!producto) throw new NotFoundException(`Producto #${productoId} no encontrado`);
    const insumos = await this.piRepo.find({ where: { productoId }, relations: ['ingrediente'], order: { id: 'ASC' } });
    return {
      productoId,
      producto: producto.nombre,
      tipo: producto.tipo,
      insumos: insumos.map((e) => ({
        ingredienteId: e.ingredienteId,
        nombre: e.ingrediente.nombre,
        unidad: e.ingrediente.unidad,
        cantidad: Number(e.cantidad),
      })),
    };
  }

  async setReceta(productoId: number, dto: SetRecetaDto): Promise<void> {
    await this.dataSource.transaction(async (manager) => {
      const producto = await manager.findOne(Producto, { where: { id: productoId }, lock: { mode: 'pessimistic_write' } });
      if (!producto) throw new NotFoundException(`Producto #${productoId} no encontrado`);
      if (producto.tipo !== TipoProducto.PLATO) {
        throw new BadRequestException('Solo los platos manejan recetas; usa contables para controlar este producto');
      }

      const ids = dto.insumos.map((i) => i.ingredienteId);
      const duplicados = ids.filter((v, idx) => ids.indexOf(v) !== idx);
      if (duplicados.length > 0) throw new BadRequestException('Hay insumos duplicados en la receta');

      const ingredientes = await manager.find(Ingrediente, { where: { id: In(ids) } });
      if (ingredientes.length !== ids.length) throw new NotFoundException('Uno o más insumos no existen');

      await manager.delete(ProductoIngrediente, { productoId });
      for (const insumo of dto.insumos) {
        await manager.save(
          manager.create(ProductoIngrediente, {
            productoId,
            ingredienteId: insumo.ingredienteId,
            cantidad: insumo.cantidad,
          }),
        );
      }
    });
  }

  async deleteReceta(productoId: number): Promise<void> {
    const producto = await this.prodRepo.findOne({ where: { id: productoId } });
    if (!producto) throw new NotFoundException(`Producto #${productoId} no encontrado`);
    await this.piRepo.delete({ productoId });
  }

  async disponibilidad(): Promise<DisponibilidadItem[]> {
    const [productos, insumos, ingredientes] = await Promise.all([
      this.prodRepo.find({ order: { nombre: 'ASC' } }),
      this.piRepo.find({ relations: ['ingrediente'] }),
      this.ingRepo.find(),
    ]);

    const ingMap = new Map(ingredientes.map((i) => [i.id, i]));
    const insumosPorProducto = new Map<number, ProductoIngrediente[]>();
    for (const pi of insumos) {
      const lista = insumosPorProducto.get(pi.productoId) ?? [];
      lista.push(pi);
      insumosPorProducto.set(pi.productoId, lista);
    }

    const result: DisponibilidadItem[] = [];
    for (const p of productos) {
      if (p.tipo === TipoProducto.PLATO) {
        const lista = insumosPorProducto.get(p.id);
        if (!lista || lista.length === 0) {
          result.push({ productoId: p.id, nombre: p.nombre, tipo: p.tipo, disponible: null, motivo: null, tieneReceta: false });
          continue;
        }
        let minimo = Number.MAX_SAFE_INTEGER;
        let motivo: string | null = null;
        for (const pi of lista) {
          const ing = ingMap.get(pi.ingredienteId);
          const req = Number(pi.cantidad);
          const disp = ing ? this.redondear(Number(ing.stock) - Number(ing.stockReservado)) : 0;
          const unidadesPosibles = req > 0 ? Math.floor(disp / req) : Number.MAX_SAFE_INTEGER;
          if (unidadesPosibles < minimo) {
            minimo = unidadesPosibles;
            motivo = `Sin ${ing?.nombre ?? 'insumo'} (${disp}${ing?.unidad ?? ''})`;
          }
        }
        result.push({
          productoId: p.id,
          nombre: p.nombre,
          tipo: p.tipo,
          disponible: minimo === Number.MAX_SAFE_INTEGER ? Number.MAX_SAFE_INTEGER : minimo,
          motivo: minimo <= 0 ? motivo : null,
          tieneReceta: true,
        });
      } else {
        const disp = this.redondear(Number(p.stock) - Number(p.stockReservado));
        result.push({
          productoId: p.id,
          nombre: p.nombre,
          tipo: p.tipo,
          disponible: Math.max(0, Math.floor(disp)),
          motivo: disp <= 0 ? `Agotado (${disp} disponibles)` : null,
          tieneReceta: false,
        });
      }
    }
    return result;
  }

  async listarMovimientos(limite = 200): Promise<MovimientoDto[]> {
    const rows = await this.movRepo
      .createQueryBuilder('m')
      .leftJoin(Ingrediente, 'i', 'i.id = m.ingredienteId')
      .leftJoin(Producto, 'p', 'p.id = m.productoId')
      .select('m.id', 'id')
      .addSelect('m.tipo', 'tipo')
      .addSelect('m.cantidad', 'cantidad')
      .addSelect('m.pedidoId', 'pedidoId')
      .addSelect('m.pedidoLineaId', 'pedidoLineaId')
      .addSelect('coalesce(i.nombre, p.nombre)', 'recurso')
      .addSelect('i.unidad', 'unidad')
      .addSelect('m.createdAt', 'createdAt')
      .orderBy('m.id', 'DESC')
      .limit(limite)
      .getRawMany<Record<string, unknown>>();

    return rows.map((r) => ({
      id: Number(r.id),
      tipo: String(r.tipo),
      cantidad: Number(r.cantidad),
      pedidoId: r.pedidoId == null ? null : Number(r.pedidoId),
      pedidoLineaId: r.pedidoLineaId == null ? null : Number(r.pedidoLineaId),
      recurso: String(r.recurso ?? ''),
      unidad: r.unidad == null ? 'uds' : String(r.unidad),
      createdAt: new Date(r.createdAt as string).toISOString(),
    }));
  }

  private async necesidadesDeLinea(manager: EntityManager, producto: Producto, cantidad: number): Promise<Necesidad[]> {
    if (producto.tipo === TipoProducto.PLATO) {
      const insumos = await manager.find(ProductoIngrediente, { where: { productoId: producto.id } });
      if (insumos.length === 0) return [];
      return insumos.map((i) => ({
        tipo: 'ingrediente',
        id: i.ingredienteId,
        cantidad: this.redondear(Number(i.cantidad) * cantidad),
      }));
    }
    return [{ tipo: 'producto', id: producto.id, cantidad }];
  }

  private async necesidadesParaLineas(
    manager: EntityManager,
    lineas: { lineaId: number; productoId: number; cantidad: number }[],
  ): Promise<RecursoReq[]> {
    const ing = new Map<number, RecursoReq>();
    const prod = new Map<number, RecursoReq>();
    const push = (map: Map<number, RecursoReq>, tipo: 'ingrediente' | 'producto', id: number, cantidad: number, lineaId: number) => {
      const req = map.get(id) ?? { tipo, id, total: 0, items: [] };
      req.total = this.redondear(req.total + cantidad);
      req.items.push({ cantidad, lineaId });
      map.set(id, req);
    };

    for (const linea of lineas) {
      const producto = await manager.findOne(Producto, { where: { id: linea.productoId } });
      if (!producto) throw new NotFoundException(`Producto #${linea.productoId} no encontrado`);
      const needs = await this.necesidadesDeLinea(manager, producto, linea.cantidad);
      for (const n of needs) {
        if (n.tipo === 'ingrediente') push(ing, 'ingrediente', n.id, n.cantidad, linea.lineaId);
        else push(prod, 'producto', n.id, n.cantidad, linea.lineaId);
      }
    }
    return [...ing.values(), ...prod.values()];
  }

  async validarYReservar(manager: EntityManager, lineas: { lineaId: number; productoId: number; cantidad: number }[]): Promise<void> {
    const recursos = await this.necesidadesParaLineas(manager, lineas);
    if (recursos.length === 0) return;

    const bloqueados = await this.bloquearRecursos(manager, recursos);
    const faltantes: string[] = [];
    for (const r of recursos) {
      const disp = this.redondear(Number(bloqueados.get(this.clave(r))?.stock ?? 0) - Number(bloqueados.get(this.clave(r))?.stockReservado ?? 0));
      if (disp < r.total) {
        const nombre = this.nombreDe(bloqueados, r);
        const unidad = this.unidadDe(bloqueados, r);
        faltantes.push(`${nombre}: se necesitan ${r.total}${unidad} y hay ${disp}${unidad} disponibles`);
      }
    }
    if (faltantes.length > 0) {
      throw new BadRequestException(`Stock insuficiente para el pedido: ${faltantes.join('; ')}`);
    }

    for (const r of recursos) {
      const entidad = bloqueados.get(this.clave(r));
      if (!entidad) continue;
      entidad.stockReservado = this.redondear(Number(entidad.stockReservado) + r.total);
      await manager.save(entidad);
      for (const item of r.items) {
        await manager.save(
          manager.create(MovimientoInventario, {
            tipo: TipoMovimientoInventario.RESERVA,
            cantidad: item.cantidad,
            ingredienteId: r.tipo === 'ingrediente' ? r.id : null,
            productoId: r.tipo === 'producto' ? r.id : null,
            pedidoLineaId: item.lineaId || null,
          }),
        );
      }
    }
  }

  async liberarReserva(manager: EntityManager, linea: { lineaId: number; productoId: number; cantidad: number }): Promise<void> {
    const recursos = await this.necesidadesParaLineas(manager, [linea]);
    if (recursos.length === 0) return;
    const bloqueados = await this.bloquearRecursos(manager, recursos);

    for (const r of recursos) {
      const entidad = bloqueados.get(this.clave(r));
      if (!entidad) continue;
      const reservado = Number(entidad.stockReservado);
      const liberar = reservado < r.total ? reservado : r.total;
      if (liberar <= 0) continue;
      entidad.stockReservado = this.redondear(reservado - liberar);
      await manager.save(entidad);
      let restante = liberar;
      for (const item of r.items) {
        const cantidad = Math.min(item.cantidad, restante);
        restante -= cantidad;
        if (cantidad <= 0) continue;
        await manager.save(
          manager.create(MovimientoInventario, {
            tipo: TipoMovimientoInventario.LIBERACION,
            cantidad: -cantidad,
            ingredienteId: r.tipo === 'ingrediente' ? r.id : null,
            productoId: r.tipo === 'producto' ? r.id : null,
            pedidoLineaId: item.lineaId || null,
          }),
        );
      }
    }
  }

  async liberarLote(manager: EntityManager, lineas: { lineaId: number; productoId: number; cantidad: number }[]): Promise<void> {
    if (lineas.length === 0) return;
    const recursos = await this.necesidadesParaLineas(manager, lineas);
    if (recursos.length === 0) return;
    const bloqueados = await this.bloquearRecursos(manager, recursos);

    for (const r of recursos) {
      const entidad = bloqueados.get(this.clave(r));
      if (!entidad) continue;
      const reservado = Number(entidad.stockReservado);
      const liberar = reservado < r.total ? reservado : r.total;
      if (liberar <= 0) continue;
      entidad.stockReservado = this.redondear(reservado - liberar);
      await manager.save(entidad);
      let restante = liberar;
      for (const item of r.items) {
        const cantidad = Math.min(item.cantidad, restante);
        restante -= cantidad;
        if (cantidad <= 0) continue;
        await manager.save(
          manager.create(MovimientoInventario, {
            tipo: TipoMovimientoInventario.LIBERACION,
            cantidad: -cantidad,
            ingredienteId: r.tipo === 'ingrediente' ? r.id : null,
            productoId: r.tipo === 'producto' ? r.id : null,
            pedidoLineaId: item.lineaId || null,
          }),
        );
      }
    }
  }

  async ajustarReserva(
    manager: EntityManager,
    linea: { lineaId: number; productoId: number; cantidadAnterior: number; cantidadNueva: number },
  ): Promise<void> {
    const producto = await manager.findOne(Producto, { where: { id: linea.productoId } });
    if (!producto) throw new NotFoundException(`Producto #${linea.productoId} no encontrado`);

    const [antes, despues] = await Promise.all([
      this.necesidadesDeLinea(manager, producto, linea.cantidadAnterior),
      this.necesidadesDeLinea(manager, producto, linea.cantidadNueva),
    ]);
    const deltaPorClave = new Map<string, number>();
    for (const n of antes) {
      deltaPorClave.set(this.claveNecesidad(n), (deltaPorClave.get(this.claveNecesidad(n)) ?? 0) - n.cantidad);
    }
    for (const n of despues) {
      deltaPorClave.set(this.claveNecesidad(n), (deltaPorClave.get(this.claveNecesidad(n)) ?? 0) + n.cantidad);
    }

    const deltas: RecursoReq[] = [];
    for (const [clave, cantidad] of deltaPorClave) {
      if (Math.abs(cantidad) < EPSILON) continue;
      const tipo = clave.startsWith('i:') ? 'ingrediente' : 'producto';
      deltas.push({ tipo, id: Number(clave.slice(2)), total: cantidad, items: [{ cantidad, lineaId: linea.lineaId }] });
    }
    if (deltas.length === 0) return;

    const soloReales = deltas.filter((d) => d.total !== 0);
    const bloqueados = await this.bloquearRecursos(manager, soloReales);

    for (const r of soloReales) {
      const entidad = bloqueados.get(this.clave(r));
      if (!entidad) continue;
      if (r.total > 0) {
        const disp = this.redondear(Number(entidad.stock) - Number(entidad.stockReservado));
        const nombre = this.nombreDe(bloqueados, r);
        const unidad = this.unidadDe(bloqueados, r);
        if (disp < r.total) {
          throw new BadRequestException(`Stock insuficiente de ${nombre}: se necesitan ${r.total}${unidad} y hay ${disp}${unidad} disponibles`);
        }
      }
      const reservado = Number(entidad.stockReservado);
      entidad.stockReservado = r.total > 0 ? this.redondear(reservado + r.total) : this.redondear(Math.max(0, reservado + r.total));
      await manager.save(entidad);
      for (const item of r.items) {
        await manager.save(
          manager.create(MovimientoInventario, {
            tipo: item.cantidad > 0 ? TipoMovimientoInventario.RESERVA : TipoMovimientoInventario.LIBERACION,
            cantidad: item.cantidad,
            ingredienteId: r.tipo === 'ingrediente' ? r.id : null,
            productoId: r.tipo === 'producto' ? r.id : null,
            pedidoLineaId: linea.lineaId || null,
          }),
        );
      }
    }
  }

  async consumir(manager: EntityManager, linea: { lineaId: number; productoId: number; cantidad: number }): Promise<StockBajoItem[]> {
    const producto = await manager.findOne(Producto, { where: { id: linea.productoId } });
    if (!producto) return [];
    const recursos = await this.necesidadesParaLineas(manager, [{ lineaId: linea.lineaId, productoId: linea.productoId, cantidad: linea.cantidad }]);
    if (recursos.length === 0) return [];
    const bloqueados = await this.bloquearRecursos(manager, recursos);

    const faltantes: string[] = [];
    for (const r of recursos) {
      const entidad = bloqueados.get(this.clave(r));
      const fisico = Number(entidad?.stock ?? 0);
      if (fisico + EPSILON < r.total) {
        const nombre = this.nombreDe(bloqueados, r);
        const unidad = this.unidadDe(bloqueados, r);
        faltantes.push(`${nombre} (tienes ${fisico}${unidad} y se necesitan ${r.total}${unidad})`);
      }
    }
    if (faltantes.length > 0) {
      throw new BadRequestException(
        `No se pudo completar el plato "${producto.nombre}": falta ${faltantes.join(', ')}. Repón inventario o cancela la línea.`,
      );
    }

    const bajos: StockBajoItem[] = [];
    for (const r of recursos) {
      const entidad = bloqueados.get(this.clave(r));
      if (!entidad) continue;
      entidad.stock = this.redondear(Number(entidad.stock) - r.total);
      entidad.stockReservado = this.redondear(Math.max(0, Number(entidad.stockReservado) - r.total));
      await manager.save(entidad);

      for (const item of r.items) {
        await manager.save(
          manager.create(MovimientoInventario, {
            tipo: TipoMovimientoInventario.CONSUMO,
            cantidad: -item.cantidad,
            ingredienteId: r.tipo === 'ingrediente' ? r.id : null,
            productoId: r.tipo === 'producto' ? r.id : null,
            pedidoLineaId: item.lineaId || null,
          }),
        );
      }

      const stockFinal = Number(entidad.stock);
      const stockMinimo = Number((entidad as Ingrediente).stockMinimo ?? (entidad as Producto).stockMinimo ?? 0);
      if (stockMinimo > 0 && stockFinal <= stockMinimo) {
        bajos.push({
          refId: r.tipo === 'ingrediente' ? `i:${r.id}` : `p:${r.id}`,
          nombre: this.nombreDe(bloqueados, r) || '',
          stock: stockFinal,
          stockMinimo,
          unidad: this.unidadDe(bloqueados, r),
        });
      }
    }
    return bajos;
  }

  private clave(r: { tipo: 'ingrediente' | 'producto'; id: number }): string {
    return r.tipo === 'ingrediente' ? `i:${r.id}` : `p:${r.id}`;
  }

  private claveNecesidad(n: Necesidad): string {
    return n.tipo === 'ingrediente' ? `i:${n.id}` : `p:${n.id}`;
  }

  private async bloquearRecursos(manager: EntityManager, recursos: RecursoReq[]): Promise<Map<string, Ingrediente | Producto>> {
    const ingIds = recursos
      .filter((r) => r.tipo === 'ingrediente')
      .map((r) => r.id)
      .sort((a, b) => a - b);
    const prodIds = recursos
      .filter((r) => r.tipo === 'producto')
      .map((r) => r.id)
      .sort((a, b) => a - b);

    const result = new Map<string, Ingrediente | Producto>();
    for (const id of ingIds) {
      const entidad = await manager.findOne(Ingrediente, { where: { id }, lock: { mode: 'pessimistic_write' } });
      if (!entidad) throw new NotFoundException(`Ingrediente #${id} no encontrado`);
      result.set(`i:${id}`, entidad);
    }
    for (const id of prodIds) {
      const entidad = await manager.findOne(Producto, { where: { id }, lock: { mode: 'pessimistic_write' } });
      if (!entidad) throw new NotFoundException(`Producto #${id} no encontrado`);
      result.set(`p:${id}`, entidad);
    }
    return result;
  }

  private nombreDe(bloqueados: Map<string, Ingrediente | Producto>, r: RecursoReq): string {
    const e = bloqueados.get(this.clave(r));
    if (!e) return '';
    if (r.tipo === 'ingrediente') return (e as Ingrediente).nombre;
    return (e as Producto).nombre;
  }

  private unidadDe(bloqueados: Map<string, Ingrediente | Producto>, r: RecursoReq): string {
    const e = bloqueados.get(this.clave(r));
    if (!e) return '';
    if (r.tipo === 'ingrediente') return (e as Ingrediente).unidad;
    return 'uds';
  }
}
