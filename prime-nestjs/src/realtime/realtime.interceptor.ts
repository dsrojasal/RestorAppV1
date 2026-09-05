import { CallHandler, ExecutionContext, Injectable, NestInterceptor } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { Observable, tap } from 'rxjs';
import { RealtimeEvents } from './realtime.events';

@Injectable()
export class RealtimeInterceptor implements NestInterceptor {
  constructor(private readonly emitter: EventEmitter2) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    return next.handle().pipe(
      tap(() => {
        const req = context.switchToHttp().getRequest<{ method?: string; path?: string }>();
        const method = (req.method || 'GET').toUpperCase();
        if (method === 'GET' || method === 'HEAD' || method === 'OPTIONS') return;
        const path = req.path || '';
        if (path.startsWith('/pedidos')) {
          this.emitter.emit(RealtimeEvents.pedidosChanged);
          this.emitter.emit(RealtimeEvents.mesasChanged);
        } else if (path.startsWith('/detalle-pedido')) {
          this.emitter.emit(RealtimeEvents.pedidosChanged);
        } else if (path.startsWith('/facturas')) {
          this.emitter.emit(RealtimeEvents.facturasChanged);
          this.emitter.emit(RealtimeEvents.mesasChanged);
        } else if (path.startsWith('/mesas')) {
          this.emitter.emit(RealtimeEvents.mesasChanged);
        }
      }),
    );
  }
}
