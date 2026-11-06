import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, EntityManager, In, Repository } from 'typeorm';
import Decimal from 'decimal.js';
import { aDecimal } from 'src/common/unidades';
import { instanteDelDia, parseDia } from 'src/common/fechas';
import { Role } from 'src/common/enums/role.enum';
import { Factura, EstadoPago } from 'src/facturas/entities/factura.entity';
import { PagoFactura } from 'src/facturas/entities/pago-factura.entity';
import { Pedido, PedidoEstado } from 'src/pedidos/entities/pedido.entity';
import { Usuario } from 'src/usuarios/entities/usuario.entity';
import {
  Turno,
  EstadoTurno,
  ResumenPagoTurno,
  ResumenMeseroTurno,
} from './entities/turno.entity';
import { TurnoUsuario, RolTurno } from './entities/turno-usuario.entity';
import { MovimientoCaja, TipoMovimientoCaja } from './entities/movimiento-caja.entity';
import {
  AbrirTurnoDto,
  AgregarPersonalTurnoDto,
  CerrarTurnoDto,
  HistorialTurnoQueryDto,
  MovimientoCajaDto,
} from './dto/turno.dto';

const LOCK_APERTURA = 918273645;

const ESTADOS_PEDIDO_ABIERTO = [
  PedidoEstado.PENDIENTE,
  PedidoEstado.EN_PREPARACION,
  PedidoEstado.LISTO,
];

const RELACIONES: string[] = [
  'abiertoPor',
  'cerradoPor',
  'personal',
  'personal.usuario',
  'personal.usuario.rol',
];

interface ResumenCalculado {
  totalVentas: number;
  ventasEfectivo: number;
  totalEntradas: number;
  totalSalidas: number;
  totalIva: number;
  totalPropina: number;
  cantidadFacturas: number;
  resumenPagos: ResumenPagoTurno[];
  resumenMeseros: ResumenMeseroTurno[];
}

function dinero(valor: Decimal): number {
  return Number(valor.toDecimalPlaces(2, Decimal.ROUND_HALF_UP).toFixed(2));
}

function numero(valor: unknown): number {
  return Number(valor ?? 0);
}

function esConflictoUnico(error: unknown): boolean {
  const e = error as { code?: string; driverError?: { code?: string } };
  return e?.code === '23505' || e?.driverError?.code === '23505';
}

function esEfectivo(nombre: string): boolean {
  return nombre
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') === 'efectivo';
}

@Injectable()
export class TurnosService {
  constructor(
    @InjectRepository(Turno) private readonly turnos: Repository<Turno>,
    @InjectRepository(MovimientoCaja) private readonly movimientosRepo: Repository<MovimientoCaja>,
    private readonly dataSource: DataSource,
  ) {}

  /* ------------------------------------------------------------------ */
  /* Cálculos                                                            */
  /* ------------------------------------------------------------------ */

  private async calcularResumen(manager: EntityManager, turnoId: number): Promise<ResumenCalculado> {
    // Desglose por método de pago desde los pagos reales (pago mixto).
    const filas = await manager
      .createQueryBuilder(PagoFactura, 'p')
      .innerJoin('p.factura', 'f')
      .leftJoin('p.tipoPago', 'tp')
      .select('p.tipoPagoId', 'tipoPagoId')
      .addSelect("COALESCE(tp.nombre, 'Sin método')", 'nombre')
      .addSelect('COUNT(DISTINCT f.id)', 'cuentas')
      .addSelect('SUM(p.monto)', 'total')
      .where('f.turnoId = :turnoId', { turnoId })
      .andWhere('f.estadoPago = :estado', { estado: EstadoPago.PAGADO })
      .groupBy('p.tipoPagoId')
      .addGroupBy('tp.nombre')
      .orderBy('SUM(p.monto)', 'DESC')
      .getRawMany<{ tipoPagoId: number | null; nombre: string; cuentas: string; total: string }>();

    let ventasEfectivo = new Decimal(0);
    const resumenPagos: ResumenPagoTurno[] = [];

    for (const fila of filas) {
      const total = aDecimal(fila.total);
      const nombre = (fila.nombre || 'Sin método').trim();
      if (esEfectivo(nombre)) ventasEfectivo = ventasEfectivo.add(total);

      resumenPagos.push({
        tipoPagoId: fila.tipoPagoId != null ? Number(fila.tipoPagoId) : null,
        nombre,
        total: dinero(total),
        cuentas: Number(fila.cuentas),
      });
    }

    const totales = await manager
      .createQueryBuilder(Factura, 'f')
      .select('COALESCE(SUM(f.total), 0)', 'totalVentas')
      .addSelect('COALESCE(SUM(f.iva), 0)', 'totalIva')
      .addSelect('COALESCE(SUM(f.propina), 0)', 'totalPropina')
      .addSelect('COUNT(1)', 'cantidad')
      .where('f.turnoId = :turnoId', { turnoId })
      .andWhere('f.estadoPago = :estado', { estado: EstadoPago.PAGADO })
      .getRawOne<{ totalVentas: string; totalIva: string; totalPropina: string; cantidad: string }>();

    const movimientos = await manager
      .createQueryBuilder(MovimientoCaja, 'm')
      .select('m.tipo', 'tipo')
      .addSelect('SUM(m.monto)', 'total')
      .where('m.turnoId = :turnoId', { turnoId })
      .groupBy('m.tipo')
      .getRawMany<{ tipo: TipoMovimientoCaja; total: string }>();

    let totalEntradas = new Decimal(0);
    let totalSalidas = new Decimal(0);
    for (const mov of movimientos) {
      if (mov.tipo === TipoMovimientoCaja.ENTRADA) totalEntradas = totalEntradas.add(aDecimal(mov.total));
      if (mov.tipo === TipoMovimientoCaja.SALIDA) totalSalidas = totalSalidas.add(aDecimal(mov.total));
    }

    const meseros = await manager
      .createQueryBuilder(Factura, 'f')
      .leftJoin('f.cobradoPor', 'u')
      .select('f.cobradoPorId', 'usuarioId')
      .addSelect("COALESCE(u.name, 'Sin asignar')", 'nombre')
      .addSelect('f.cobradoPorRol', 'rol')
      .addSelect('COUNT(1)', 'cuentas')
      .addSelect('SUM(f.total)', 'total')
      .where('f.turnoId = :turnoId', { turnoId })
      .andWhere('f.estadoPago = :estado', { estado: EstadoPago.PAGADO })
      .groupBy('f.cobradoPorId')
      .addGroupBy('u.name')
      .addGroupBy('f.cobradoPorRol')
      .orderBy('SUM(f.total)', 'DESC')
      .getRawMany<{ usuarioId: number | null; nombre: string; rol: string | null; cuentas: string; total: string }>();

    return {
      totalVentas: dinero(aDecimal(totales?.totalVentas)),
      ventasEfectivo: dinero(ventasEfectivo),
      totalEntradas: dinero(totalEntradas),
      totalSalidas: dinero(totalSalidas),
      totalIva: dinero(aDecimal(totales?.totalIva)),
      totalPropina: dinero(aDecimal(totales?.totalPropina)),
      cantidadFacturas: Number(totales?.cantidad ?? 0),
      resumenPagos,
      resumenMeseros: meseros.map((m) => ({
        usuarioId: m.usuarioId != null ? Number(m.usuarioId) : null,
        nombre: (m.nombre || 'Sin asignar').trim(),
        rol: m.rol,
        total: dinero(aDecimal(m.total)),
        cuentas: Number(m.cuentas),
      })),
    };
  }

  private async contarPedidosAbiertos(manager: EntityManager): Promise<number> {
    return manager.count(Pedido, { where: { estado: In(ESTADOS_PEDIDO_ABIERTO) } });
  }

  private async movimientosDe(manager: EntityManager, turnoId: number) {
    const filas = await manager.find(MovimientoCaja, {
      where: { turnoId },
      relations: ['usuario'],
      order: { fecha: 'ASC' },
    });
    return filas.map((m) => ({
      id: m.id,
      tipo: m.tipo,
      monto: dinero(aDecimal(m.monto)),
      motivo: m.motivo,
      reversoDeId: m.reversoDeId,
      fecha: m.fecha,
      usuario: m.usuario ? { id: m.usuario.id, name: m.usuario.name } : null,
    }));
  }

  private serializar(turno: Turno, resumen?: ResumenCalculado, movimientos?: unknown[]) {
    const personal = (turno.personal ?? [])
      .map((tu) => ({
        id: tu.id,
        usuarioId: tu.usuarioId,
        rolTurno: tu.rolTurno,
        usuario: tu.usuario
          ? {
              id: tu.usuario.id,
              name: tu.usuario.name,
              email: tu.usuario.email,
              rolId: tu.usuario.rolId,
              rol: tu.usuario.rol?.nombre ?? null,
            }
          : null,
      }))
      .sort((a, b) => {
        const rol = a.rolTurno.localeCompare(b.rolTurno);
        if (rol !== 0) return rol;
        return (a.usuario?.name ?? '').localeCompare(b.usuario?.name ?? '');
      });

    const ventasEfectivo = resumen ? resumen.ventasEfectivo : dinero(aDecimal(turno.ventasEfectivo));
    const totalEntradas = resumen ? resumen.totalEntradas : dinero(aDecimal(turno.totalEntradas));
    const totalSalidas = resumen ? resumen.totalSalidas : dinero(aDecimal(turno.totalSalidas));
    const inicial = aDecimal(turno.montoInicial);

    const esperado = turno.estado === EstadoTurno.ABIERTO
      ? dinero(
          inicial
            .add(aDecimal(ventasEfectivo))
            .add(aDecimal(totalEntradas))
            .minus(aDecimal(totalSalidas)),
        )
      : turno.montoEsperado != null
        ? dinero(aDecimal(turno.montoEsperado))
        : null;

    return {
      id: turno.id,
      estado: turno.estado,
      montoInicial: dinero(inicial),
      montoEsperado: esperado,
      montoContado: turno.montoContado != null ? dinero(aDecimal(turno.montoContado)) : null,
      diferencia: turno.diferencia != null ? dinero(aDecimal(turno.diferencia)) : null,
      motivoDiferencia: turno.motivoDiferencia,
      totalVentas: resumen ? resumen.totalVentas : dinero(aDecimal(turno.totalVentas)),
      ventasEfectivo,
      totalEntradas,
      totalSalidas,
      totalIva: resumen ? resumen.totalIva : dinero(aDecimal(turno.totalIva)),
      totalPropina: resumen ? resumen.totalPropina : dinero(aDecimal(turno.totalPropina)),
      cantidadFacturas: resumen ? resumen.cantidadFacturas : turno.cantidadFacturas,
      resumenPagos: resumen ? resumen.resumenPagos : turno.resumenPagos ?? [],
      resumenMeseros: resumen ? resumen.resumenMeseros : turno.resumenMeseros ?? [],
      notas: turno.notas,
      fechaApertura: turno.fechaApertura,
      fechaCierre: turno.fechaCierre,
      abiertoPor: turno.abiertoPor
        ? { id: turno.abiertoPor.id, name: turno.abiertoPor.name }
        : null,
      cerradoPor: turno.cerradoPor
        ? { id: turno.cerradoPor.id, name: turno.cerradoPor.name }
        : null,
      personal,
      movimientos: movimientos ?? [],
    };
  }

  private async buscarCompleto(manager: EntityManager, id: number): Promise<Turno> {
    const turno = await manager.findOne(Turno, { where: { id }, relations: RELACIONES });
    if (!turno) throw new NotFoundException(`Turno #${id} no encontrado`);
    return turno;
  }

  /* ------------------------------------------------------------------ */
  /* Acceso / roles                                                      */
  /* ------------------------------------------------------------------ */

  async verificarAccesoCaja(userId?: number, rolNombre?: string): Promise<void> {
    if (!userId) throw new ForbiddenException('No hay usuario autenticado');
    if (rolNombre === Role.ADMIN || rolNombre === Role.CAJERO) return;

    const turno = await this.turnos.findOne({ where: { estado: EstadoTurno.ABIERTO } });
    if (!turno) throw new ForbiddenException('No tienes acceso a la caja');

    const asignacion = await this.dataSource.manager.findOne(TurnoUsuario, {
      where: { turnoId: turno.id, usuarioId: userId, rolTurno: RolTurno.CAJERO },
    });
    if (!asignacion) throw new ForbiddenException('No tienes acceso a la caja en este turno');
  }

  async estado() {
    const turno = await this.turnos.findOne({
      where: { estado: EstadoTurno.ABIERTO },
      relations: ['abiertoPor'],
    });
    if (!turno) return { abierta: false, turnoId: null };
    return {
      abierta: true,
      turnoId: turno.id,
      abiertoPor: turno.abiertoPor ? { id: turno.abiertoPor.id, name: turno.abiertoPor.name } : null,
      fechaApertura: turno.fechaApertura,
      montoInicial: dinero(aDecimal(turno.montoInicial)),
    };
  }

  async miTurno(userId?: number, rolNombre?: string) {
    const esAdmin = rolNombre === Role.ADMIN;
    const turno = await this.turnos.findOne({ where: { estado: EstadoTurno.ABIERTO } });
    if (!turno) {
      return { cajaAbierta: false, turnoId: null, esAdmin, rolGlobal: rolNombre ?? null, roles: [] as RolTurno[] };
    }
    if (!userId) {
      return { cajaAbierta: true, turnoId: turno.id, esAdmin, rolGlobal: rolNombre ?? null, roles: [] as RolTurno[] };
    }
    const filas = await this.dataSource.manager.find(TurnoUsuario, {
      where: { turnoId: turno.id, usuarioId: userId },
    });
    return {
      cajaAbierta: true,
      turnoId: turno.id,
      esAdmin,
      rolGlobal: rolNombre ?? null,
      roles: filas.map((f) => f.rolTurno),
    };
  }

  /* ------------------------------------------------------------------ */
  /* Consultas                                                           */
  /* ------------------------------------------------------------------ */

  async actual() {
    const turno = await this.turnos.findOne({
      where: { estado: EstadoTurno.ABIERTO },
      relations: RELACIONES,
    });
    if (!turno) return null;

    const manager = this.dataSource.manager;
    const resumen = await this.calcularResumen(manager, turno.id);
    const pedidosAbiertos = await this.contarPedidosAbiertos(manager);
    const movimientos = await this.movimientosDe(manager, turno.id);
    return { ...this.serializar(turno, resumen, movimientos), pedidosAbiertos };
  }

  async historial(query: HistorialTurnoQueryDto = {}) {
    const page = Math.max(1, Number(query.page) || 1);
    const limit = Math.min(50, Math.max(1, Number(query.limit) || 10));

    const qb = this.dataSource
      .getRepository(Turno)
      .createQueryBuilder('t')
      .leftJoinAndSelect('t.abiertoPor', 'abiertoPor')
      .leftJoinAndSelect('t.cerradoPor', 'cerradoPor')
      .leftJoinAndSelect('t.personal', 'personal')
      .leftJoinAndSelect('personal.usuario', 'personalUsuario')
      .leftJoinAndSelect('personalUsuario.rol', 'personalRol')
      .orderBy('t.fechaApertura', 'DESC')
      .skip((page - 1) * limit)
      .take(limit);

    if (query.estado === EstadoTurno.ABIERTO || query.estado === EstadoTurno.CERRADO) {
      qb.andWhere('t.estado = :estado', { estado: query.estado });
    }

    const desde = parseDia(query.desde);
    if (desde) {
      qb.andWhere('t.fechaApertura >= :desde', {
        desde: instanteDelDia(desde.year, desde.month, desde.day, 0, 0),
      });
    }

    const hasta = parseDia(query.hasta);
    if (hasta) {
      qb.andWhere('t.fechaApertura < :hasta', {
        hasta: instanteDelDia(hasta.year, hasta.month, hasta.day + 1, 0, 0),
      });
    }

    const [turnos, total] = await qb.getManyAndCount();

    const data = await Promise.all(
      turnos.map(async (turno) => {
        if (turno.estado === EstadoTurno.ABIERTO) {
          const resumen = await this.calcularResumen(this.dataSource.manager, turno.id);
          return this.serializar(turno, resumen);
        }
        return this.serializar(turno);
      }),
    );

    return {
      data,
      total,
      page,
      limit,
      totalPages: Math.max(1, Math.ceil(total / limit)),
    };
  }

  async detalle(id: number) {
    const manager = this.dataSource.manager;
    const turno = await this.buscarCompleto(manager, id);
    const movimientos = await this.movimientosDe(manager, id);

    if (turno.estado === EstadoTurno.ABIERTO) {
      const resumen = await this.calcularResumen(manager, id);
      return this.serializar(turno, resumen, movimientos);
    }

    return this.serializar(turno, undefined, movimientos);
  }

  async ultimoCierre() {
    const turno = await this.turnos.findOne({
      where: { estado: EstadoTurno.CERRADO },
      relations: ['cerradoPor'],
      order: { fechaCierre: 'DESC' },
    });
    if (!turno) return null;
    return {
      id: turno.id,
      fechaCierre: turno.fechaCierre,
      montoContado: turno.montoContado != null ? dinero(aDecimal(turno.montoContado)) : null,
      montoEsperado: turno.montoEsperado != null ? dinero(aDecimal(turno.montoEsperado)) : null,
      diferencia: turno.diferencia != null ? dinero(aDecimal(turno.diferencia)) : null,
      motivoDiferencia: turno.motivoDiferencia,
      totalVentas: dinero(aDecimal(turno.totalVentas)),
      cerradoPor: turno.cerradoPor ? { id: turno.cerradoPor.id, name: turno.cerradoPor.name } : null,
    };
  }

  async movimientos(turnoId: number) {
    const turno = await this.turnos.findOne({ where: { id: turnoId } });
    if (!turno) throw new NotFoundException(`Turno #${turnoId} no encontrado`);
    return this.movimientosDe(this.dataSource.manager, turnoId);
  }

  async cobrosSinTurno() {
    const filas = await this.dataSource.manager.find(Factura, {
      where: { cobradoSinTurno: true },
      relations: ['pedido', 'pedido.mesa', 'cobradoPor', 'autorizadoSinTurnoPor', 'tipoPago', 'pagos', 'pagos.tipoPago'],
      order: { fechaCobro: 'DESC' },
      take: 100,
    });
    return filas.map((f) => ({
      id: f.id,
      pedidoId: f.pedidoId,
      mesa: f.pedido?.mesa?.numero ?? null,
      total: dinero(aDecimal(f.total)),
      fechaCobro: f.fechaCobro,
      cobradoPor: f.cobradoPor ? { id: f.cobradoPor.id, name: f.cobradoPor.name } : null,
      autorizadoPor: f.autorizadoSinTurnoPor
        ? { id: f.autorizadoSinTurnoPor.id, name: f.autorizadoSinTurnoPor.name }
        : null,
      motivo: f.motivoSinTurno,
      tipoPago: f.tipoPago?.nombre ?? null,
      pagos: (f.pagos ?? []).map((p) => ({
        tipoPagoId: p.tipoPagoId,
        nombre: p.tipoPago?.nombre ?? 'Sin método',
        monto: dinero(aDecimal(p.monto)),
      })),
    }));
  }

  /* ------------------------------------------------------------------ */
  /* Cobro: caja abierta u override del administrador                    */
  /* ------------------------------------------------------------------ */

  async turnoAbiertoParaCobro(manager: EntityManager): Promise<Turno | null> {
    return manager.findOne(Turno, {
      where: { estado: EstadoTurno.ABIERTO },
      lock: { mode: 'pessimistic_read' },
    });
  }

  validarCobro(
    turno: Turno | null,
    esAdmin: boolean,
    overrideSinCaja?: boolean,
    motivoSinTurno?: string,
  ): void {
    if (turno) return;

    if (esAdmin && overrideSinCaja) {
      const motivo = (motivoSinTurno ?? '').trim();
      if (motivo.length < 10) {
        throw new BadRequestException(
          'Para cobrar sin caja abierta debes registrar el motivo (mínimo 10 caracteres)',
        );
      }
      return;
    }

    throw new ConflictException({
      statusCode: 409,
      code: 'CAJA_CERRADA',
      error: 'Caja cerrada',
      message: 'No hay caja abierta. Pídele al administrador que abra el turno.',
    });
  }

  /* ------------------------------------------------------------------ */
  /* Apertura / personal                                                 */
  /* ------------------------------------------------------------------ */

  async abrir(adminId: number, dto: AbrirTurnoDto) {
    try {
      await this.dataSource.transaction(async (manager) => {
        // Serializa la apertura: dos administradores no pueden crear dos turnos.
        await manager.query('SELECT pg_advisory_xact_lock($1)', [LOCK_APERTURA]);

        const abierto = await manager.findOne(Turno, { where: { estado: EstadoTurno.ABIERTO } });
        if (abierto) {
          throw new ConflictException(`Ya hay una caja abierta (turno #${abierto.id})`);
        }

        const rolesPorUsuario = new Map<number, Set<RolTurno>>();
        for (const item of dto.personal ?? []) {
          const roles = rolesPorUsuario.get(item.usuarioId) ?? new Set<RolTurno>();
          for (const rol of item.roles) roles.add(rol);
          rolesPorUsuario.set(item.usuarioId, roles);
        }

        const ids = [...rolesPorUsuario.keys()];
        if (ids.length > 0) {
          const usuarios = await manager.find(Usuario, { where: { id: In(ids) } });
          const encontrados = new Set(usuarios.map((u) => u.id));

          const faltante = ids.find((id) => !encontrados.has(id));
          if (faltante != null) {
            throw new NotFoundException(`Usuario #${faltante} no encontrado`);
          }

          const inactivo = usuarios.find((u) => !u.isActive);
          if (inactivo) {
            throw new BadRequestException(`El usuario ${inactivo.name} está inactivo y no puede asignarse al turno`);
          }
        }

        const turno = await manager.save(
          Turno,
          manager.create(Turno, {
            montoInicial: dto.montoInicial,
            abiertoPorId: adminId,
            estado: EstadoTurno.ABIERTO,
          }),
        );

        const asignaciones = ids.flatMap((usuarioId) =>
          [...(rolesPorUsuario.get(usuarioId) ?? [])].map((rolTurno) =>
            manager.create(TurnoUsuario, { turnoId: turno.id, usuarioId, rolTurno }),
          ),
        );

        if (asignaciones.length > 0) {
          await manager.save(TurnoUsuario, asignaciones);
        }
      });
    } catch (error) {
      if (esConflictoUnico(error)) {
        throw new ConflictException('Ya hay una caja abierta');
      }
      throw error;
    }

    return this.actual();
  }

  async agregarPersonal(turnoId: number, dto: AgregarPersonalTurnoDto) {
    await this.dataSource.transaction(async (manager) => {
      const turno = await manager.findOne(Turno, { where: { id: turnoId }, lock: { mode: 'pessimistic_write' } });
      if (!turno) throw new NotFoundException(`Turno #${turnoId} no encontrado`);
      if (turno.estado !== EstadoTurno.ABIERTO) {
        throw new ConflictException('El turno ya está cerrado; no se puede modificar el personal');
      }

      const usuario = await manager.findOne(Usuario, { where: { id: dto.usuarioId } });
      if (!usuario) throw new NotFoundException(`Usuario #${dto.usuarioId} no encontrado`);
      if (!usuario.isActive) {
        throw new BadRequestException(`El usuario ${usuario.name} está inactivo y no puede asignarse al turno`);
      }

      const filas = dto.roles.map((rolTurno) =>
        manager.create(TurnoUsuario, { turnoId, usuarioId: dto.usuarioId, rolTurno }),
      );

      if (filas.length > 0) {
        await manager
          .createQueryBuilder()
          .insert()
          .into(TurnoUsuario)
          .values(filas)
          .orIgnore()
          .execute();
      }
    });

    return this.actual();
  }

  async quitarPersonal(turnoId: number, usuarioId: number, rolTurno: RolTurno) {
    await this.dataSource.transaction(async (manager) => {
      const turno = await manager.findOne(Turno, { where: { id: turnoId }, lock: { mode: 'pessimistic_write' } });
      if (!turno) throw new NotFoundException(`Turno #${turnoId} no encontrado`);
      if (turno.estado !== EstadoTurno.ABIERTO) {
        throw new ConflictException('El turno ya está cerrado; no se puede modificar el personal');
      }

      const resultado = await manager.delete(TurnoUsuario, { turnoId, usuarioId, rolTurno });
      if (!resultado.affected) {
        throw new NotFoundException('El usuario no tiene ese rol asignado en este turno');
      }
    });

    return this.actual();
  }

  /* ------------------------------------------------------------------ */
  /* Movimientos de efectivo                                             */
  /* ------------------------------------------------------------------ */

  async agregarMovimiento(turnoId: number, dto: MovimientoCajaDto, usuarioId: number) {
    const movimiento = await this.dataSource.transaction(async (manager) => {
      const turno = await manager.findOne(Turno, {
        where: { id: turnoId },
        lock: { mode: 'pessimistic_write' },
      });
      if (!turno) throw new NotFoundException(`Turno #${turnoId} no encontrado`);
      if (turno.estado !== EstadoTurno.ABIERTO) {
        throw new ConflictException('El turno ya está cerrado; no se pueden registrar movimientos');
      }

      const motivo = (dto.motivo ?? '').trim();
      if (motivo.length < 5) {
        throw new BadRequestException('El motivo del movimiento es obligatorio (mínimo 5 caracteres)');
      }

      if (dto.reversoDeId != null) {
        const original = await manager.findOne(MovimientoCaja, {
          where: { id: dto.reversoDeId, turnoId },
        });
        if (!original) {
          throw new NotFoundException('El movimiento que intentas reversar no existe en este turno');
        }

        // Una reversión siempre es del tipo contrario y por el mismo monto.
        if (original.tipo === dto.tipo) {
          throw new BadRequestException(
            'La reversión debe ser del tipo contrario al movimiento original (una entrada se revierte con una salida y viceversa)',
          );
        }
        if (!aDecimal(original.monto).equals(aDecimal(dto.monto))) {
          throw new BadRequestException(
            `La reversión debe ser por el mismo monto del movimiento original (${dinero(aDecimal(original.monto))})`,
          );
        }

        // Evita revertir dos veces el mismo movimiento (solo cuentan reversiones válidas).
        const reversionesPrevias = await manager.find(MovimientoCaja, {
          where: { turnoId, reversoDeId: dto.reversoDeId },
        });
        const yaRevertido = reversionesPrevias.some(
          (r) =>
            r.tipo !== original.tipo && aDecimal(r.monto).equals(aDecimal(original.monto)),
        );
        if (yaRevertido) {
          throw new ConflictException('Este movimiento ya fue revertido');
        }
      } else if (dto.tipo === TipoMovimientoCaja.SALIDA) {
        // No permitir que el efectivo esperado quede negativo por una salida normal.
        const resumen = await this.calcularResumen(manager, turnoId);
        const disponible = aDecimal(turno.montoInicial)
          .add(aDecimal(resumen.ventasEfectivo))
          .add(aDecimal(resumen.totalEntradas))
          .minus(aDecimal(resumen.totalSalidas));

        if (aDecimal(dto.monto).greaterThan(disponible)) {
          throw new BadRequestException(
            `No hay suficiente efectivo en caja: disponible ${dinero(disponible)} y la salida es ${dinero(aDecimal(dto.monto))}. Registra primero una entrada de efectivo.`,
          );
        }
      }

      return manager.save(
        MovimientoCaja,
        manager.create(MovimientoCaja, {
          turnoId,
          tipo: dto.tipo,
          monto: dto.monto,
          motivo,
          usuarioId,
          reversoDeId: dto.reversoDeId ?? null,
        }),
      );
    });

    const conUsuario = await this.movimientosRepo.findOne({
      where: { id: movimiento.id },
      relations: ['usuario'],
    });

    return {
      id: conUsuario!.id,
      tipo: conUsuario!.tipo,
      monto: dinero(aDecimal(conUsuario!.monto)),
      motivo: conUsuario!.motivo,
      reversoDeId: conUsuario!.reversoDeId,
      fecha: conUsuario!.fecha,
      usuario: conUsuario!.usuario
        ? { id: conUsuario!.usuario.id, name: conUsuario!.usuario.name }
        : null,
    };
  }

  /* ------------------------------------------------------------------ */
  /* Cierre                                                              */
  /* ------------------------------------------------------------------ */

  async cerrar(turnoId: number, adminId: number, dto: CerrarTurnoDto) {
    const cerrado = await this.dataSource.transaction(async (manager) => {
      const turno = await manager.findOne(Turno, {
        where: { id: turnoId },
        lock: { mode: 'pessimistic_write' },
      });
      if (!turno) throw new NotFoundException(`Turno #${turnoId} no encontrado`);
      if (turno.estado === EstadoTurno.CERRADO) {
        throw new ConflictException('Este turno ya fue cerrado');
      }

      const resumen = await this.calcularResumen(manager, turnoId);
      const esperado = aDecimal(turno.montoInicial)
        .add(aDecimal(resumen.ventasEfectivo))
        .add(aDecimal(resumen.totalEntradas))
        .minus(aDecimal(resumen.totalSalidas));
      const contado = aDecimal(dto.montoContado);
      const diferencia = contado.minus(esperado);

      const motivoDiferencia = (dto.motivoDiferencia ?? '').trim();
      if (!diferencia.isZero() && motivoDiferencia.length < 10) {
        throw new BadRequestException(
          'El arqueo no cuadra: debes registrar el motivo de la diferencia (mínimo 10 caracteres)',
        );
      }

      turno.estado = EstadoTurno.CERRADO;
      turno.montoEsperado = dinero(esperado);
      turno.montoContado = dinero(contado);
      turno.diferencia = dinero(diferencia);
      turno.motivoDiferencia = diferencia.isZero() ? null : motivoDiferencia;
      turno.totalVentas = resumen.totalVentas;
      turno.ventasEfectivo = resumen.ventasEfectivo;
      turno.totalEntradas = resumen.totalEntradas;
      turno.totalSalidas = resumen.totalSalidas;
      turno.totalIva = resumen.totalIva;
      turno.totalPropina = resumen.totalPropina;
      turno.cantidadFacturas = resumen.cantidadFacturas;
      turno.resumenPagos = resumen.resumenPagos;
      turno.resumenMeseros = resumen.resumenMeseros;
      turno.cerradoPorId = adminId;
      turno.fechaCierre = new Date();
      turno.notas = dto.notas?.trim() ? dto.notas.trim() : null;

      await manager.save(Turno, turno);
      const completo = await this.buscarCompleto(manager, turnoId);
      return this.serializar(completo);
    });

    return cerrado;
  }
}
