import { OnGatewayInit, WebSocketGateway, WebSocketServer } from '@nestjs/websockets';
import { JwtService } from '@nestjs/jwt';
import { OnEvent } from '@nestjs/event-emitter';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Server, Socket } from 'socket.io';
import { parse } from 'cookie';
import { Usuario } from 'src/usuarios/entities/usuario.entity';
import type { Notificacion } from 'src/notificaciones/entities/notificacion.entity';
import { RealtimeEvents, RealtimeEvent } from './realtime.events';

const wsOrigins = (process.env.ALLOWED_ORIGINS || 'http://localhost:3000')
  .split(',')
  .map((o) => o.trim())
  .filter(Boolean);
if (!wsOrigins.includes('http://localhost:3001')) {
  wsOrigins.push('http://localhost:3001');
}

const DEBOUNCE_MS = 250;

@WebSocketGateway({
  cors: { origin: wsOrigins, credentials: true },
  transports: ['websocket'],
})
export class RealtimeGateway implements OnGatewayInit {
  @WebSocketServer()
  server!: Server;

  private readonly timers = new Map<string, NodeJS.Timeout>();

  constructor(
    private readonly jwtService: JwtService,
    @InjectRepository(Usuario) private readonly usuarioRepo: Repository<Usuario>,
  ) {}

  afterInit(server: Server): void {
    server.use(async (socket, next) => {
      // El token viaja en la cookie httpOnly (withCredentials en el cliente), nunca en JS.
      const cookies = parse(socket.handshake.headers.cookie || '');
      const token = cookies.token;

      if (!token) {
        next(new Error('Token no proporcionado'));
        return;
      }
      try {
        const payload = this.jwtService.verify<{ sub: number; email: string; exp: number }>(token);
        const usuario = await this.usuarioRepo.findOne({ where: { id: payload.sub }, relations: ['rol'] });
        const rolNombre = usuario?.rol?.nombre;
        if (!usuario || !rolNombre) {
          next(new Error('Usuario sin rol'));
          return;
        }
        socket.data.user = { id: payload.sub, email: payload.email, rol: rolNombre };
        socket.join('rol:' + rolNombre);
        socket.join('user:' + payload.sub);

        const ttlMs = typeof payload.exp === 'number' ? payload.exp * 1000 - Date.now() : 0;
        if (ttlMs > 0) {
          const timer = setTimeout(() => socket.disconnect(true), ttlMs);
          socket.once('disconnect', () => clearTimeout(timer));
        } else {
          socket.disconnect(true);
        }
        next();
      } catch {
        next(new Error('Token inválido o expirado'));
      }
    });
  }

  @OnEvent(RealtimeEvents.notificacionNueva)
  onNotificacionNueva(notificacion: Notificacion): void {
    const rooms: string[] = [];
    if (notificacion.paraAdministrador) rooms.push('rol:Administrador');
    if (notificacion.paraMesero) rooms.push('rol:Mesero');
    if (notificacion.paraChef) rooms.push('rol:Chef');
    if (notificacion.paraCajero) rooms.push('rol:Cajero');
    if (notificacion.usuarioId != null) rooms.push('user:' + notificacion.usuarioId);
    if (rooms.length === 0) return;

    const sockets = new Set<Socket>();
    for (const room of rooms) {
      const members = this.server.sockets.adapter.rooms.get(room);
      if (!members) continue;
      for (const sid of members) {
        const s = this.server.sockets.sockets.get(sid);
        if (s) sockets.add(s);
      }
    }

    const actorId = notificacion.creadoPorId;
    for (const s of sockets) {
      if (actorId != null && s.data.user?.id === actorId) continue;
      s.emit(RealtimeEvents.notificacionNueva, {
        id: notificacion.id,
        tipo: notificacion.tipo,
        mensaje: notificacion.mensaje,
        icono: notificacion.icono,
        clase: notificacion.clase,
        refId: notificacion.refId,
        createdAt: notificacion.createdAt,
        leida: false,
      });
    }
  }

  @OnEvent(RealtimeEvents.pedidosChanged)
  onPedidosChanged(): void {
    this.broadcast(RealtimeEvents.pedidosChanged);
  }

  @OnEvent(RealtimeEvents.mesasChanged)
  onMesasChanged(): void {
    this.broadcast(RealtimeEvents.mesasChanged);
  }

  @OnEvent(RealtimeEvents.facturasChanged)
  onFacturasChanged(): void {
    this.broadcast(RealtimeEvents.facturasChanged);
  }

  private broadcast(event: RealtimeEvent): void {
    if (this.timers.has(event)) return;
    this.timers.set(
      event,
      setTimeout(() => {
        this.timers.delete(event);
        this.server.emit(event);
      }, DEBOUNCE_MS),
    );
  }
}
