export class EventEmitter2 {
  emit(event: string, payload?: unknown): unknown {
    return { event, payload };
  }
  emitAsync(event: string, payload?: unknown): Promise<unknown[]> {
    return Promise.resolve([{ event, payload }]);
  }
}

export const EventEmitterModule = {
  forRoot: () => ({ global: true, module: EventEmitter2 }),
};
