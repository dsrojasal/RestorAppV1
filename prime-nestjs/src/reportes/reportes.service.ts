import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import Decimal from 'decimal.js';
import { Factura, EstadoPago } from 'src/facturas/entities/factura.entity';
import { Ingrediente } from 'src/ingredientes/entities/ingrediente.entity';
import { MovimientoInventario, TipoMovimientoInventario } from 'src/recetas/entities/movimiento-inventario.entity';
import { aDecimal, formatearCantidad } from 'src/common/unidades';
import { diaIso, instanteDelDia, parseDia, partesZona } from 'src/common/fechas';

function money(valor: Decimal): number {
  return Number(valor.toDecimalPlaces(2, Decimal.ROUND_HALF_UP).toFixed(2));
}

export interface TransaccionReporte {
  id: number;
  mesa: string;
  total: number;
  fecha: string;
}

@Injectable()
export class ReportesService {
  constructor(
    @InjectRepository(Factura) private readonly facturaRepo: Repository<Factura>,
    @InjectRepository(MovimientoInventario) private readonly movimientoRepo: Repository<MovimientoInventario>,
  ) {}

  private rango(desde?: string | null, hasta?: string | null): { inicio?: Date; fin?: Date } {
    const d = parseDia(desde);
    const h = parseDia(hasta);
    return {
      inicio: d ? instanteDelDia(d.year, d.month, d.day, 0, 0) : undefined,
      fin: h ? instanteDelDia(h.year, h.month, h.day + 1, 0, 0) : undefined,
    };
  }

  private async facturasPagadas(inicio?: Date, fin?: Date): Promise<Factura[]> {
    const qb = this.facturaRepo
      .createQueryBuilder('f')
      .leftJoinAndSelect('f.pedido', 'pedido')
      .leftJoinAndSelect('pedido.mesa', 'mesa')
      .leftJoinAndSelect('f.cobradoPor', 'cobradoPor')
      .where('f.estadoPago = :estado', { estado: EstadoPago.PAGADO })
      .andWhere('f.fechaCobro IS NOT NULL');

    if (inicio) qb.andWhere('f.fechaCobro >= :inicio', { inicio });
    if (fin) qb.andWhere('f.fechaCobro < :fin', { fin });

    return qb.orderBy('f.fechaCobro', 'ASC').getMany();
  }

  private transaccion(f: Factura): TransaccionReporte {
    const numeroMesa = f.pedido?.mesa?.numero ?? f.pedido?.mesaId;
    return {
      id: f.id,
      mesa: numeroMesa != null ? `Mesa ${numeroMesa}` : '—',
      total: money(aDecimal(f.total)),
      fecha: f.fechaCobro ? new Date(f.fechaCobro).toISOString() : new Date(f.fechaEmision).toISOString(),
    };
  }

  async ventasDia() {
    const ahora = new Date();
    const p = partesZona(ahora);
    const inicio = instanteDelDia(p.year, p.month, p.day, 0, 0);
    const fin = instanteDelDia(p.year, p.month, p.day + 1, 0, 0);
    const facturas = await this.facturasPagadas(inicio, fin);

    const porHora = Array.from({ length: 24 }, () => new Decimal(0));
    let total = new Decimal(0);
    for (const f of facturas) {
      if (!f.fechaCobro) continue;
      const hora = partesZona(new Date(f.fechaCobro)).hour;
      const valor = aDecimal(f.total);
      total = total.add(valor);
      porHora[hora] = porHora[hora].add(valor);
    }

    return {
      fecha: diaIso(ahora),
      total: money(total),
      cuentas: facturas.length,
      ticketPromedio: facturas.length > 0 ? money(total.div(facturas.length)) : null,
      porHora: porHora.map((v) => money(v)),
      transacciones: facturas.map((f) => this.transaccion(f)).reverse(),
    };
  }

  async ventasRango(desde?: string | null, hasta?: string | null) {
    const ahora = new Date();
    const hoy = partesZona(ahora);
    const d = parseDia(desde) ?? { year: hoy.year, month: hoy.month, day: 1 };
    const h = parseDia(hasta) ?? { year: hoy.year, month: hoy.month, day: hoy.day };
    const inicio = instanteDelDia(d.year, d.month, d.day, 0, 0);
    const fin = instanteDelDia(h.year, h.month, h.day + 1, 0, 0);

    const facturas = await this.facturasPagadas(inicio, fin);

    let total = new Decimal(0);
    const porDiaMapa = new Map<string, { total: Decimal; cuentas: number }>();
    for (const f of facturas) {
      if (!f.fechaCobro) continue;
      const clave = diaIso(new Date(f.fechaCobro));
      const valor = aDecimal(f.total);
      total = total.add(valor);
      const actual = porDiaMapa.get(clave) ?? { total: new Decimal(0), cuentas: 0 };
      actual.total = actual.total.add(valor);
      actual.cuentas += 1;
      porDiaMapa.set(clave, actual);
    }

    const porDia: { fecha: string; total: number; cuentas: number }[] = [];
    let cursor = inicio;
    for (let i = 0; cursor.getTime() < fin.getTime() && i < 400; i++) {
      const clave = diaIso(cursor);
      const valor = porDiaMapa.get(clave);
      porDia.push({ fecha: clave, total: money(valor?.total ?? new Decimal(0)), cuentas: valor?.cuentas ?? 0 });
      cursor = new Date(cursor.getTime() + 24 * 60 * 60 * 1000);
    }

    return {
      desde: diaIso(inicio),
      hasta: diaIso(new Date(fin.getTime() - 1)),
      total: money(total),
      cuentas: facturas.length,
      ticketPromedio: facturas.length > 0 ? money(total.div(facturas.length)) : null,
      porDia,
      transacciones: facturas.map((f) => this.transaccion(f)).reverse(),
    };
  }

  async productosVendidos(desde?: string | null, hasta?: string | null) {
    const { inicio, fin } = this.rango(desde, hasta);
    const qb = this.facturaRepo
      .createQueryBuilder('f')
      .innerJoin('f.pedido', 'p')
      .innerJoin('p.detalles', 'd')
      .innerJoin('d.producto', 'prod')
      .select('prod.id', 'productoId')
      .addSelect('prod.nombre', 'nombre')
      .addSelect('SUM(d.cantidad)', 'cantidad')
      .addSelect('SUM(d.subtotal)', 'total')
      .where('f.estadoPago = :estado', { estado: EstadoPago.PAGADO })
      .andWhere('f.fechaCobro IS NOT NULL');

    if (inicio) qb.andWhere('f.fechaCobro >= :inicio', { inicio });
    if (fin) qb.andWhere('f.fechaCobro < :fin', { fin });

    const filas = await qb
      .groupBy('prod.id')
      .addGroupBy('prod.nombre')
      .orderBy('SUM(d.cantidad)', 'DESC')
      .getRawMany<{ productoId: number; nombre: string; cantidad: string; total: string }>();

    let totalUnidades = new Decimal(0);
    let totalVendido = new Decimal(0);
    const productos = filas.map((f) => {
      const cantidad = aDecimal(f.cantidad);
      const total = aDecimal(f.total);
      totalUnidades = totalUnidades.add(cantidad);
      totalVendido = totalVendido.add(total);
      return {
        productoId: Number(f.productoId),
        nombre: f.nombre,
        cantidad: Number(cantidad.toDecimalPlaces(2, Decimal.ROUND_HALF_UP).toFixed(2)),
        total: money(total),
      };
    });

    return {
      totalUnidades: Number(totalUnidades.toDecimalPlaces(2, Decimal.ROUND_HALF_UP).toFixed(2)),
      totalVendido: money(totalVendido),
      productos,
    };
  }

  async consumoInsumos(desde?: string | null, hasta?: string | null) {
    const { inicio, fin } = this.rango(desde, hasta);
    const qb = this.movimientoRepo
      .createQueryBuilder('m')
      .innerJoin(Ingrediente, 'i', 'i.id = m.ingredienteId')
      .select('m.ingredienteId', 'ingredienteId')
      .addSelect('i.nombre', 'nombre')
      .addSelect('i.unidad', 'unidad')
      .addSelect('SUM(m.cantidad)', 'cantidad')
      .where('m.tipo = :tipo', { tipo: TipoMovimientoInventario.CONSUMO })
      .andWhere('m.ingredienteId IS NOT NULL');

    if (inicio) qb.andWhere('m.createdAt >= :inicio', { inicio });
    if (fin) qb.andWhere('m.createdAt < :fin', { fin });

    const filas = await qb
      .groupBy('m.ingredienteId')
      .addGroupBy('i.nombre')
      .addGroupBy('i.unidad')
      .orderBy('SUM(m.cantidad)', 'DESC')
      .getRawMany<{ ingredienteId: number; nombre: string; unidad: string; cantidad: string }>();

    return {
      insumos: filas.map((f) => {
        const cantidad = aDecimal(f.cantidad).abs();
        const unidad = f.unidad || 'und';
        return {
          ingredienteId: Number(f.ingredienteId),
          nombre: f.nombre,
          cantidad: Number(cantidad.toDecimalPlaces(3, Decimal.ROUND_HALF_UP).toFixed(3)),
          unidad,
          cantidadTexto: formatearCantidad(cantidad, unidad),
        };
      }),
    };
  }

  async porMesero(desde?: string | null, hasta?: string | null) {
    const { inicio, fin } = this.rango(desde, hasta);
    const qb = this.facturaRepo
      .createQueryBuilder('f')
      .leftJoin('f.cobradoPor', 'u')
      .select('f.cobradoPorId', 'usuarioId')
      .addSelect("COALESCE(u.name, 'Sin asignar')", 'nombre')
      .addSelect("COALESCE(MAX(f.cobradoPorRol), '—')", 'rol')
      .addSelect('COUNT(1)', 'cuentas')
      .addSelect('SUM(f.total)', 'total')
      .where('f.estadoPago = :estado', { estado: EstadoPago.PAGADO })
      .andWhere('f.fechaCobro IS NOT NULL');

    if (inicio) qb.andWhere('f.fechaCobro >= :inicio', { inicio });
    if (fin) qb.andWhere('f.fechaCobro < :fin', { fin });

    const filas = await qb
      .groupBy('f.cobradoPorId')
      .addGroupBy('u.name')
      .orderBy('SUM(f.total)', 'DESC')
      .getRawMany<{ usuarioId: number | null; nombre: string; rol: string; cuentas: string; total: string }>();

    let totalGeneral = new Decimal(0);
    const meseros = filas.map((f) => {
      const cuentas = Number(f.cuentas);
      const total = aDecimal(f.total);
      totalGeneral = totalGeneral.add(total);
      return {
        usuarioId: f.usuarioId != null ? Number(f.usuarioId) : null,
        nombre: f.nombre,
        rol: f.rol,
        cuentas,
        total: money(total),
        ticketPromedio: cuentas > 0 ? money(total.div(cuentas)) : null,
      };
    });

    return { totalGeneral: money(totalGeneral), meseros };
  }
}
