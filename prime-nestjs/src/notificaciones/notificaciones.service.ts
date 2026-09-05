import 'dotenv/config';
import { Injectable, NotFoundException } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { Notificacion, TipoNotificacion } from './entities/notificacion.entity';
import { NotificacionLeida } from './entities/notificacion-leida.entity';
import { RealtimeEvents } from 'src/realtime/realtime.events';
import { Usuario } from 'src/usuarios/entities/usuario.entity';
import { Ingrediente } from 'src/ingredientes/entities/ingrediente.entity';
import { Producto, TipoProducto } from 'src/productos/entities/producto.entity';
import { Role } from 'src/common/enums/role.enum';

const INVENTORY_CRON = process.env.NOTIF_INVENTORY_CRON || '*/5 * * * *';

const ROL_COLUMN: Record<string, string> = {
  Administrador: 'n.paraAdministrador = TRUE',
  Mesero: 'n.paraMesero = TRUE',
  Chef: 'n.paraChef = TRUE',
  Cajero: 'n.paraCajero = TRUE',
};

export interface CrearNotificacionParams {
  tipo: TipoNotificacion;
  mensaje: string;
  icono: string;
  clase: string;
  roles?: Role[];
  usuarioId?: number;
  creadoPorId?: number;
  refId?: string;
}

export interface NotificacionDto {
  id: number;
  tipo: string;
  mensaje: string;
  icono: string;
  clase: string;
  refId: string | null;
  createdAt: string;
  leida: boolean;
}

@Injectable()
export class NotificacionesService {
  constructor(
    @InjectRepository(Notificacion) private readonly repo: Repository<Notificacion>,
    @InjectRepository(NotificacionLeida) private readonly leidaRepo: Repository<NotificacionLeida>,
    @InjectRepository(Usuario) private readonly usuarioRepo: Repository<Usuario>,
    @InjectRepository(Ingrediente) private readonly ingredienteRepo: Repository<Ingrediente>,
    @InjectRepository(Producto) private readonly productoRepo: Repository<Producto>,
    private readonly emitter: EventEmitter2,
  ) {}

  async crear(p: CrearNotificacionParams): Promise<Notificacion> {
    const notif = this.repo.create({
      tipo: p.tipo,
      mensaje: p.mensaje,
      icono: p.icono,
      clase: p.clase,
      refId: p.refId ?? null,
      creadoPorId: p.creadoPorId ?? null,
      usuarioId: p.usuarioId ?? null,
      paraAdministrador: p.roles?.includes(Role.ADMIN) ?? false,
      paraMesero: p.roles?.includes(Role.MESERO) ?? false,
      paraChef: p.roles?.includes(Role.CHEF) ?? false,
      paraCajero: p.roles?.includes(Role.CAJERO) ?? false,
    });
    const saved = await this.repo.save(notif);
    this.emitter.emit(RealtimeEvents.notificacionNueva, saved);
    return saved;
  }

  async listar(usuarioId: number, rolNombre?: string): Promise<NotificacionDto[]> {
    const rol = rolNombre ?? (await this.resolverRol(usuarioId));
    const { entities, raw } = await this.repo
      .createQueryBuilder('n')
      .leftJoin(NotificacionLeida, 'nl', 'nl.notificacionId = n.id AND nl.usuarioId = :uid', { uid: usuarioId })
      .where(this.visibleWhere(rol, usuarioId))
      .orderBy('n.createdAt', 'DESC')
      .addSelect('CASE WHEN nl.notificacionId IS NOT NULL THEN TRUE ELSE FALSE END', 'leida_flag')
      .limit(50)
      .getRawAndEntities();
    const leidaById = new Map<number, boolean>();
    for (const r of raw) {
      const v = (r as Record<string, unknown>).leida_flag;
      const id = Number((r as Record<string, unknown>).n_id);
      if (!Number.isNaN(id)) {
        leidaById.set(id, v === true || v === 1 || v === 'true');
      }
    }
    return entities.map((n) => this.toDto(n, leidaById.get(n.id) ?? false));
  }

  async marcarLeida(notificacionId: number, usuarioId: number): Promise<void> {
    const existe = await this.repo.findOne({ where: { id: notificacionId } });
    if (!existe) throw new NotFoundException('Notificación no encontrada');
    await this.leidaRepo.createQueryBuilder().insert().into(NotificacionLeida).values({ notificacionId, usuarioId }).orIgnore().execute();
  }

  async marcarTodasLeidas(usuarioId: number, rolNombre?: string): Promise<void> {
    const ids = await this.idsVisibles(usuarioId, rolNombre);
    if (ids.length === 0) return;
    await this.leidaRepo
      .createQueryBuilder()
      .insert()
      .into(NotificacionLeida)
      .values(ids.map((notificacionId) => ({ notificacionId, usuarioId })))
      .orIgnore()
      .execute();
  }

  @Cron(INVENTORY_CRON)
  async cronInventarioBajo(): Promise<void> {
    const ingredientes = await this.ingredienteRepo.find();
    const productos = await this.productoRepo.find();

    const items: { refId: string; nombre: string; stock: number; stockMinimo: number; unidad: string }[] = [];
    for (const i of ingredientes) {
      items.push({ refId: `i:${i.id}`, nombre: i.nombre, stock: Number(i.stock) || 0, stockMinimo: Number(i.stockMinimo) || 0, unidad: i.unidad });
    }
    for (const p of productos) {
      if (p.tipo === TipoProducto.PLATO) continue;
      items.push({ refId: `p:${p.id}`, nombre: p.nombre, stock: Number(p.stock) || 0, stockMinimo: Number(p.stockMinimo) || 0, unidad: 'uds' });
    }

    for (const item of items) {
      const bajo = item.stockMinimo > 0 && item.stock <= item.stockMinimo;
      const pendientes = await this.repo.count({ where: { tipo: TipoNotificacion.INVENTARIO, refId: item.refId } });
      if (bajo) {
        if (pendientes === 0) {
          await this.crear({
            tipo: TipoNotificacion.INVENTARIO,
            mensaje: `Inventario bajo: ${item.nombre} (${item.stock}${item.unidad} restantes)`,
            icono: 'inventory_2',
            clase: 'warning',
            roles: [Role.ADMIN, Role.CHEF],
            refId: item.refId,
          });
        }
      } else if (pendientes > 0) {
        await this.repo.delete({ tipo: TipoNotificacion.INVENTARIO, refId: item.refId });
      }
    }
  }

  private visibleWhere(rol: string, uid: number): string {
    const rolCond = ROL_COLUMN[rol] ?? 'FALSE';
    return `(${rolCond} OR n.usuarioId = :uid) AND (n.creadoPorId IS NULL OR n.creadoPorId <> :uid)`;
  }

  private async idsVisibles(usuarioId: number, rolNombre?: string): Promise<number[]> {
    const rol = rolNombre ?? (await this.resolverRol(usuarioId));
    const rows = await this.repo
      .createQueryBuilder('n')
      .select('n.id', 'id')
      .where(this.visibleWhere(rol, usuarioId), { uid: usuarioId })
      .getRawMany<{ id: number }>();
    return rows.map((r) => Number(r.id));
  }

  private async resolverRol(usuarioId: number): Promise<string> {
    const usuario = await this.usuarioRepo.findOne({ where: { id: usuarioId }, relations: ['rol'] });
    return usuario?.rol?.nombre ?? '';
  }

  private toDto(n: Notificacion, leida: boolean): NotificacionDto {
    return {
      id: n.id,
      tipo: n.tipo,
      mensaje: n.mensaje,
      icono: n.icono,
      clase: n.clase,
      refId: n.refId,
      createdAt: n.createdAt.toISOString(),
      leida,
    };
  }
}
