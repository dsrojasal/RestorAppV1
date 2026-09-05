import { OnGatewayInit, WebSocketGateway, WebSocketServer } from '@nestjs/websockets';
import { JwtService } from '@nestjs/jwt';
import { OnEvent } from '@nestjs/event-emitter';
import { Server } from 'socket.io';
import * as cookie from 'cookie';
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

  constructor(private readonly jwtService: JwtService) {}

  afterInit(server: Server): void {
    server.use((socket, next) => {
      const cookies = cookie.parse(socket.handshake.headers.cookie || '');
      const token = cookies.token;

      if (!token) {
        next(new Error('Token no proporcionado'));
        return;
      }
      try {
        const payload = this.jwtService.verify<{ sub: number; email: string; exp: number }>(token);
        socket.data.user = { id: payload.sub, email: payload.email };
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
