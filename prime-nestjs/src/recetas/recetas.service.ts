import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, EntityManager, In, Repository } from 'typeorm';
import Decimal from 'decimal.js';
import { ProductoIngrediente } from 'src/producto-ingrediente/entities/producto-ingrediente.entity';
import { Ingrediente } from 'src/ingredientes/entities/ingrediente.entity';
import { Producto, TipoProducto } from 'src/productos/entities/producto.entity';
import { MovimientoInventario, TipoMovimientoInventario } from './entities/movimiento-inventario.entity';
import { SetRecetaDto } from './dto/set-receta.dto';
import { aDecimal, formatearCantidad } from 'src/common/unidades';

export interface Necesidad {
  tipo: 'ingrediente' | 'producto';
  id: number;
  cantidad: Decimal;
}

export interface RecursoReq {
  tipo: 'ingrediente' | 'producto';
  id: number;
  total: Decimal;
  items: { cantidad: Decimal; lineaId: number }[];
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
  unidadMinimo: string | null;
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

const EPSILON = new Decimal('0.000001');

@Injectable()
export class RecetasService {
  constructor(
    @InjectRepository(ProductoIngrediente) private readonly piRepo: Repository<ProductoIngrediente>,
    @InjectRepository(MovimientoInventario) private readonly movRepo: Repository<MovimientoInventario>,
    @InjectRepository(Ingrediente) private readonly ingRepo: Repository<Ingrediente>,
    @InjectRepository(Producto) private readonly prodRepo: Repository<Producto>,
    private readonly dataSource: DataSource,
  ) {}

  private redondear(v: Decimal.Value): Decimal {
    return new Decimal(v).toDecimalPlaces(3, Decimal.ROUND_HALF_UP);
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
        cantidad: e.cantidad,
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
            cantidad: this.redondear(insumo.cantidad).toNumber(),
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
          const req = aDecimal(pi.cantidad);
          const stock = ing ? aDecimal(ing.stock) : new Decimal(0);
          const reservado = ing ? aDecimal(ing.stockReservado) : new Decimal(0);
          const disp = this.redondear(stock.minus(reservado));
          const unidadesPosibles = req.gt(0) ? disp.div(req).floor().toNumber() : Number.MAX_SAFE_INTEGER;
          if (unidadesPosibles < minimo) {
            minimo = unidadesPosibles;
            const unidad = ing?.unidad ?? '';
            const dispTxt = formatearCantidad(disp, unidad);
            motivo = `Sin ${ing?.nombre ?? 'insumo'} (${dispTxt})`;
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
        const disp = this.redondear(aDecimal(p.stock).minus(aDecimal(p.stockReservado)));
        const txt = formatearCantidad(disp, 'und');
        result.push({
          productoId: p.id,
          nombre: p.nombre,
          tipo: p.tipo,
          disponible: disp.lte(0) ? 0 : disp.floor().toNumber(),
          motivo: disp.lte(0) ? `Agotado (${txt} disponibles)` : null,
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

  private async necesidadesDeLinea(manager: EntityManager, producto: Producto, cantidad: number | Decimal): Promise<Necesidad[]> {
    const qty = aDecimal(cantidad);
    if (producto.tipo === TipoProducto.PLATO) {
      const insumos = await manager.find(ProductoIngrediente, { where: { productoId: producto.id } });
      if (insumos.length === 0) return [];
      return insumos.map((i) => ({
        tipo: 'ingrediente',
        id: i.ingredienteId,
        cantidad: this.redondear(aDecimal(i.cantidad).mul(qty)),
      }));
    }
    return [{ tipo: 'producto', id: producto.id, cantidad: this.redondear(qty) }];
  }

  private async necesidadesParaLineas(
    manager: EntityManager,
    lineas: { lineaId: number; productoId: number; cantidad: number }[],
  ): Promise<RecursoReq[]> {
    const ing = new Map<number, RecursoReq>();
    const prod = new Map<number, RecursoReq>();
    const push = (
      map: Map<number, RecursoReq>,
      tipo: 'ingrediente' | 'producto',
      id: number,
      cantidad: Decimal,
      lineaId: number,
    ) => {
      const req = map.get(id) ?? { tipo, id, total: new Decimal(0), items: [] };
      req.total = this.redondear(req.total.add(cantidad));
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
      const entidad = bloqueados.get(this.clave(r));
      const stock = aDecimal(entidad?.stock);
      const reservado = aDecimal(entidad?.stockReservado);
      const disp = this.redondear(stock.minus(reservado));
      if (disp.lt(r.total)) {
        const nombre = this.nombreDe(bloqueados, r);
        const unidad = this.unidadDe(bloqueados, r);
        faltantes.push(
          `${nombre}: se necesitan ${formatearCantidad(r.total, unidad)} y hay ${formatearCantidad(disp, unidad)} disponibles`,
        );
      }
    }
    if (faltantes.length > 0) {
      throw new BadRequestException(`Stock insuficiente para el pedido: ${faltantes.join('; ')}`);
    }

    for (const r of recursos) {
      const entidad = bloqueados.get(this.clave(r));
      if (!entidad) continue;
      entidad.stockReservado = this.redondear(aDecimal(entidad.stockReservado).add(r.total)).toNumber();
      await manager.save(entidad);
      for (const item of r.items) {
        await manager.save(
          manager.create(MovimientoInventario, {
            tipo: TipoMovimientoInventario.RESERVA,
            cantidad: this.redondear(item.cantidad).toNumber(),
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
      const reservado = aDecimal(entidad.stockReservado);
      const liberar = reservado.lt(r.total) ? reservado : r.total;
      if (liberar.lte(0)) continue;
      entidad.stockReservado = this.redondear(reservado.sub(liberar)).toNumber();
      await manager.save(entidad);
      let restante = liberar;
      for (const item of r.items) {
        const cantidad = item.cantidad.lt(restante) ? item.cantidad : restante;
        restante = restante.sub(cantidad);
        if (cantidad.lte(0)) continue;
        await manager.save(
          manager.create(MovimientoInventario, {
            tipo: TipoMovimientoInventario.LIBERACION,
            cantidad: this.redondear(cantidad.neg()).toNumber(),
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
      const reservado = aDecimal(entidad.stockReservado);
      const liberar = reservado.lt(r.total) ? reservado : r.total;
      if (liberar.lte(0)) continue;
      entidad.stockReservado = this.redondear(reservado.sub(liberar)).toNumber();
      await manager.save(entidad);
      let restante = liberar;
      for (const item of r.items) {
        const cantidad = item.cantidad.lt(restante) ? item.cantidad : restante;
        restante = restante.sub(cantidad);
        if (cantidad.lte(0)) continue;
        await manager.save(
          manager.create(MovimientoInventario, {
            tipo: TipoMovimientoInventario.LIBERACION,
            cantidad: this.redondear(cantidad.neg()).toNumber(),
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
    const deltaPorClave = new Map<string, Decimal>();
    for (const n of antes) {
      deltaPorClave.set(this.claveNecesidad(n), (deltaPorClave.get(this.claveNecesidad(n)) ?? new Decimal(0)).sub(n.cantidad));
    }
    for (const n of despues) {
      deltaPorClave.set(this.claveNecesidad(n), (deltaPorClave.get(this.claveNecesidad(n)) ?? new Decimal(0)).add(n.cantidad));
    }

    const deltas: RecursoReq[] = [];
    for (const [clave, cantidad] of deltaPorClave) {
      if (cantidad.abs().lt(EPSILON)) continue;
      const tipo = clave.startsWith('i:') ? 'ingrediente' : 'producto';
      deltas.push({ tipo, id: Number(clave.slice(2)), total: cantidad, items: [{ cantidad, lineaId: linea.lineaId }] });
    }
    if (deltas.length === 0) return;

    const soloReales = deltas.filter((d) => !d.total.eq(0));
    if (soloReales.length === 0) return;
    const bloqueados = await this.bloquearRecursos(manager, soloReales);

    for (const r of soloReales) {
      const entidad = bloqueados.get(this.clave(r));
      if (!entidad) continue;
      if (r.total.gt(0)) {
        const disp = this.redondear(aDecimal(entidad.stock).minus(aDecimal(entidad.stockReservado)));
        const nombre = this.nombreDe(bloqueados, r);
        const unidad = this.unidadDe(bloqueados, r);
        if (disp.lt(r.total)) {
          throw new BadRequestException(
            `Stock insuficiente de ${nombre}: se necesitan ${formatearCantidad(r.total, unidad)} y hay ${formatearCantidad(disp, unidad)} disponibles`,
          );
        }
      }
      const reservado = aDecimal(entidad.stockReservado);
      entidad.stockReservado = this.redondear(Decimal.max(reservado.add(r.total), 0)).toNumber();
      await manager.save(entidad);
      for (const item of r.items) {
        await manager.save(
          manager.create(MovimientoInventario, {
            tipo: item.cantidad.gt(0) ? TipoMovimientoInventario.RESERVA : TipoMovimientoInventario.LIBERACION,
            cantidad: this.redondear(item.cantidad).toNumber(),
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
      const fisico = aDecimal(entidad?.stock);
      if (fisico.plus(EPSILON).lt(r.total)) {
        const nombre = this.nombreDe(bloqueados, r);
        const unidad = this.unidadDe(bloqueados, r);
        faltantes.push(`${nombre} (tienes ${formatearCantidad(fisico, unidad)} y se necesitan ${formatearCantidad(r.total, unidad)})`);
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
      entidad.stock = this.redondear(aDecimal(entidad.stock).sub(r.total)).toNumber();
      entidad.stockReservado = this.redondear(Decimal.max(aDecimal(entidad.stockReservado).sub(r.total), 0)).toNumber();
      await manager.save(entidad);

      for (const item of r.items) {
        await manager.save(
          manager.create(MovimientoInventario, {
            tipo: TipoMovimientoInventario.CONSUMO,
            cantidad: this.redondear(item.cantidad.neg()).toNumber(),
            ingredienteId: r.tipo === 'ingrediente' ? r.id : null,
            productoId: r.tipo === 'producto' ? r.id : null,
            pedidoLineaId: item.lineaId || null,
          }),
        );
      }

      const stockFinal = aDecimal(entidad.stock);
      const stockMinimo = aDecimal((entidad as Ingrediente).stockMinimo ?? (entidad as Producto).stockMinimo ?? 0);
      if (stockMinimo.gt(0) && stockFinal.lte(stockMinimo)) {
        const unidad = this.unidadDe(bloqueados, r);
        bajos.push({
          refId: r.tipo === 'ingrediente' ? `i:${r.id}` : `p:${r.id}`,
          nombre: this.nombreDe(bloqueados, r) || '',
          stock: stockFinal.toNumber(),
          stockMinimo: stockMinimo.toNumber(),
          unidad,
          unidadMinimo:
            r.tipo === 'ingrediente'
              ? ((entidad as Ingrediente).stockMinimoUnidad ?? null)
              : ((entidad as Producto).stockMinimoUnidad ?? null),
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
    return 'und';
  }
}