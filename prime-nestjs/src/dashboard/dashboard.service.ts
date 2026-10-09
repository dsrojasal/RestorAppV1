import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import Decimal from 'decimal.js';
import { Factura, EstadoPago } from 'src/facturas/entities/factura.entity';
import { Pedido, PedidoEstado } from 'src/pedidos/entities/pedido.entity';
import { Ingrediente } from 'src/ingredientes/entities/ingrediente.entity';
import { Usuario } from 'src/usuarios/entities/usuario.entity';
import { Mesa, MesaEstado } from 'src/mesas/entities/mesa.entity';
import { Producto } from 'src/productos/entities/producto.entity';
import { aDecimal, formatearCantidad } from 'src/common/unidades';

const ZONA = 'America/Bogota';

const ESTADOS_ACTIVOS = [PedidoEstado.PENDIENTE, PedidoEstado.EN_PREPARACION, PedidoEstado.LISTO];

export interface MovimientoResumen {
  tipo: 'factura' | 'pedido' | 'usuario';
  titulo: string;
  fecha: string;
}

export interface InsumoPorAgotarse {
  id: number;
  nombre: string;
  restante: string;
  porcentaje: number;
  nivel: 'warning' | 'danger';
}

export interface ResumenDashboard {
  generadoEn: string;
  ventas: {
    hoy: number;
    ayer: number;
    variacionPorcentaje: number | null;
    porHora: number[];
    porHoraAyer: number[];
    cuentasPorHoraHoy: number[];
    horaActual: number;
    minutoActual: number;
    diaEnCurso: boolean;
    ayerCerro: number;
    ventasAyerHastaMismaHora: number;
    proyeccionHoy: number | null;
    cuentasHoy: number;
    cuentasAyerHastaMismaHora: number;
    ticketPromedioHoy: number | null;
    ticketPromedioAyerHastaMismaHora: number | null;
  };
  mesasOcupadas: number;
  pedidos: {
    enProceso: number;
    enPreparacion: number;
    listos: number;
  };
  insumosPorAgotarse: InsumoPorAgotarse[];
  contablesPorAgotarse: InsumoPorAgotarse[];
  ultimosMovimientos: MovimientoResumen[];
}

interface PartesZona {
  year: number;
  month: number;
  day: number;
  hour: number;
  minute: number;
  second: number;
}

function partesZona(fecha: Date): PartesZona {
  const partes = new Intl.DateTimeFormat('en-CA', {
    timeZone: ZONA,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  }).formatToParts(fecha);

  const acc: Partial<PartesZona> = {};
  for (const parte of partes) {
    if (parte.type === 'literal') continue;
    acc[parte.type as keyof PartesZona] = Number(parte.value);
  }
  return { ...(acc as PartesZona), hour: (acc.hour ?? 0) % 24 };
}

function instanteZona(fecha: Date, hora: number, minuto: number, dias: number): Date {
  const p = partesZona(fecha);
  const desfase = Date.UTC(p.year, p.month - 1, p.day, p.hour, p.minute, p.second) - fecha.getTime();
  return new Date(Date.UTC(p.year, p.month - 1, p.day + dias, hora, minuto, 0) - desfase);
}

function money(valor: Decimal): number {
  return Number(valor.toDecimalPlaces(2, Decimal.ROUND_HALF_UP).toFixed(2));
}

@Injectable()
export class DashboardService {
  constructor(
    @InjectRepository(Factura) private readonly facturaRepo: Repository<Factura>,
    @InjectRepository(Pedido) private readonly pedidoRepo: Repository<Pedido>,
    @InjectRepository(Ingrediente) private readonly ingredienteRepo: Repository<Ingrediente>,
    @InjectRepository(Usuario) private readonly usuarioRepo: Repository<Usuario>,
    @InjectRepository(Mesa) private readonly mesaRepo: Repository<Mesa>,
    @InjectRepository(Producto) private readonly productoRepo: Repository<Producto>,
  ) {}

  async resumen(): Promise<ResumenDashboard> {
    const inicioAyer = instanteZona(new Date(), 0, 0, -1);
    const inicioHoy = instanteZona(new Date(), 0, 0, 0);
    const inicioManana = instanteZona(new Date(), 0, 0, 1);

    const [ventas, mesasOcupadas, pedidos, insumosPorAgotarse, contablesPorAgotarse, ultimosMovimientos] = await Promise.all([
      this.ventas(inicioAyer, inicioHoy, inicioManana),
      this.mesasOcupadas(),
      this.pedidos(),
      this.insumosPorAgotarse(),
      this.contablesPorAgotarse(),
      this.movimientos(),
    ]);

    return {
      generadoEn: new Date().toISOString(),
      ventas,
      mesasOcupadas,
      pedidos,
      insumosPorAgotarse,
      contablesPorAgotarse,
      ultimosMovimientos,
    };
  }

  private async mesasOcupadas(): Promise<number> {
    return this.mesaRepo.count({ where: { estado: MesaEstado.OCUPADA } });
  }

  private async ventas(inicioAyer: Date, inicioHoy: Date, inicioManana: Date) {
    const filas = await this.facturaRepo
      .createQueryBuilder('f')
      .select('f.total', 'total')
      .addSelect('f.fechaCobro', 'fechaCobro')
      .where('f.estadoPago = :estado', { estado: EstadoPago.PAGADO })
      .andWhere('f.fechaCobro >= :desde', { desde: inicioAyer })
      .andWhere('f.fechaCobro < :hasta', { hasta: inicioManana })
      .getRawMany<{ total: string; fechaCobro: Date }>();

    const porHora = Array.from({ length: 24 }, () => new Decimal(0));
    const porHoraAyer = Array.from({ length: 24 }, () => new Decimal(0));
    const cuentasPorHoraHoy = Array.from({ length: 24 }, () => 0);
    const cuentasPorHoraAyer = Array.from({ length: 24 }, () => 0);
    let hoy = new Decimal(0);
    let ayer = new Decimal(0);
    let cuentasHoy = 0;

    for (const fila of filas) {
      if (!fila.fechaCobro) continue;
      const fecha = new Date(fila.fechaCobro);
      const total = aDecimal(fila.total);
      const hora = partesZona(fecha).hour;
      if (fecha.getTime() >= inicioHoy.getTime()) {
        hoy = hoy.add(total);
        cuentasHoy += 1;
        porHora[hora] = porHora[hora].add(total);
        cuentasPorHoraHoy[hora] += 1;
      } else {
        ayer = ayer.add(total);
        porHoraAyer[hora] = porHoraAyer[hora].add(total);
        cuentasPorHoraAyer[hora] += 1;
      }
    }

    const ahora = partesZona(new Date());
    const horaActual = ahora.hour;

    let ventasAyerHastaMismaHora = new Decimal(0);
    let cuentasAyerHastaMismaHora = 0;
    for (let h = 0; h <= horaActual; h++) {
      ventasAyerHastaMismaHora = ventasAyerHastaMismaHora.add(porHoraAyer[h]);
      cuentasAyerHastaMismaHora += cuentasPorHoraAyer[h];
    }

    const variacion = ayer.gt(0) ? Number(hoy.minus(ayer).div(ayer).times(100).toDecimalPlaces(1, Decimal.ROUND_HALF_UP).toFixed(1)) : null;

    const ticketPromedioHoy = cuentasHoy > 0 ? money(hoy.div(cuentasHoy)) : null;
    const ticketPromedioAyer = cuentasAyerHastaMismaHora > 0 ? money(ventasAyerHastaMismaHora.div(cuentasAyerHastaMismaHora)) : null;

    const proyeccionHoy =
      ventasAyerHastaMismaHora.gt(0) && hoy.gt(0) ? money(hoy.div(ventasAyerHastaMismaHora).times(ayer)) : null;

    return {
      hoy: money(hoy),
      ayer: money(ayer),
      variacionPorcentaje: variacion,
      porHora: porHora.map((v) => money(v)),
      porHoraAyer: porHoraAyer.map((v) => money(v)),
      cuentasPorHoraHoy,
      horaActual,
      minutoActual: ahora.minute,
      diaEnCurso: hoy.gt(0),
      ayerCerro: money(ayer),
      ventasAyerHastaMismaHora: money(ventasAyerHastaMismaHora),
      proyeccionHoy,
      cuentasHoy,
      cuentasAyerHastaMismaHora,
      ticketPromedioHoy,
      ticketPromedioAyerHastaMismaHora: ticketPromedioAyer,
    };
  }

  private async pedidos(): Promise<{ enProceso: number; enPreparacion: number; listos: number }> {
    const filas = await this.pedidoRepo
      .createQueryBuilder('p')
      .select('p.estado', 'estado')
      .addSelect('COUNT(1)', 'total')
      .where('p.estado IN (:...estados)', { estados: ESTADOS_ACTIVOS })
      .groupBy('p.estado')
      .getRawMany<{ estado: PedidoEstado; total: string }>();

    let enProceso = 0;
    let enPreparacion = 0;
    let listos = 0;
    for (const fila of filas) {
      const total = Number(fila.total);
      enProceso += total;
      if (fila.estado === PedidoEstado.EN_PREPARACION) enPreparacion = total;
      if (fila.estado === PedidoEstado.LISTO) listos = total;
    }
    return { enProceso, enPreparacion, listos };
  }

  private async insumosPorAgotarse(): Promise<InsumoPorAgotarse[]> {
    const candidatos = (await this.ingredienteRepo.find())
      .map((i) => {
        const minimo = aDecimal(i.stockMinimo);
        const disponible = aDecimal(i.stock).minus(aDecimal(i.stockReservado));
        return { ingrediente: i, minimo, disponible, proporcion: minimo.gt(0) ? disponible.div(minimo) : null };
      })
      .filter((c) => c.minimo.gt(0) && c.disponible.lte(c.minimo) && c.proporcion !== null)
      .sort((a, b) => (a.proporcion as Decimal).comparedTo(b.proporcion as Decimal));

    return candidatos.slice(0, 5).map((c) => {
      const proporcion = (c.proporcion as Decimal).times(100);
      return {
        id: c.ingrediente.id,
        nombre: c.ingrediente.nombre,
        restante: formatearCantidad(c.disponible, c.ingrediente.unidad, c.ingrediente.stockMinimoUnidad),
        porcentaje: Number(proporcion.toDecimalPlaces(1, Decimal.ROUND_HALF_UP).toFixed(1)),
        nivel: proporcion.lte(10) ? ('danger' as const) : ('warning' as const),
      };
    });
  }

  private async contablesPorAgotarse(): Promise<InsumoPorAgotarse[]> {
    const candidatos = (await this.productoRepo.find())
      .map((p) => {
        const minimo = aDecimal(p.stockMinimo);
        const disponible = aDecimal(p.stock).minus(aDecimal(p.stockReservado));
        return { producto: p, minimo, disponible, proporcion: minimo.gt(0) ? disponible.div(minimo) : null };
      })
      .filter((c) => c.minimo.gt(0) && c.disponible.lte(c.minimo) && c.proporcion !== null)
      .sort((a, b) => (a.proporcion as Decimal).comparedTo(b.proporcion as Decimal));

    return candidatos.slice(0, 5).map((c) => {
      const proporcion = (c.proporcion as Decimal).times(100);
      return {
        id: c.producto.id,
        nombre: c.producto.nombre,
        restante: formatearCantidad(c.disponible, 'und'),
        porcentaje: Number(proporcion.toDecimalPlaces(1, Decimal.ROUND_HALF_UP).toFixed(1)),
        nivel: proporcion.lte(10) ? ('danger' as const) : ('warning' as const),
      };
    });
  }

  private async movimientos(): Promise<MovimientoResumen[]> {
    const [facturas, pedidos, usuarios] = await Promise.all([
      this.facturaRepo.find({ order: { fechaEmision: 'DESC' }, take: 4, relations: ['creadoPor', 'pedido', 'pedido.mesa'] }),
      this.pedidoRepo.find({ where: { estado: PedidoEstado.ENTREGADO }, order: { updatedAt: 'DESC' }, take: 4, relations: ['mesa'] }),
      this.usuarioRepo.find({ order: { createdAt: 'DESC' }, take: 4 }),
    ]);

    const items: MovimientoResumen[] = [
      ...facturas.map((f) => ({
        tipo: 'factura' as const,
        titulo: `${f.creadoPor?.name ?? 'Sistema'} creó factura #${f.id}`,
        fecha: f.fechaEmision.toISOString(),
      })),
      ...pedidos.map((p) => ({
        tipo: 'pedido' as const,
        titulo: `Mesa ${p.mesa?.numero ?? '—'} cerró pedido #${p.id}`,
        fecha: p.updatedAt.toISOString(),
      })),
      ...usuarios.map((u) => ({
        tipo: 'usuario' as const,
        titulo: `Nuevo usuario '${u.name}' registrado`,
        fecha: u.createdAt.toISOString(),
      })),
    ];

    return items.sort((a, b) => new Date(b.fecha).getTime() - new Date(a.fecha).getTime()).slice(0, 6);
  }
}
