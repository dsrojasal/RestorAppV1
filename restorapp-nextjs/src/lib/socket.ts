import { io, Socket } from 'socket.io-client';

/**
 * URL configurada para el backend. Solo se usan su protocolo y su puerto:
 * el host se toma del navegador en tiempo de ejecución.
 *
 * - Si `NEXT_PUBLIC_SOCKET_SAME_ORIGIN=true` o la URL está vacía, se usa el
 *   mismo origen (recomendado detrás de Nginx/Caddy).
 * - Si hay URL, se conserva el protocolo/puerto pero se usa el host de la
 *   página. Así la cookie de sesión (que pertenece al host donde se abrió la
 *   app) también viaja al backend cuando el sistema se instala en otra
 *   máquina o cambia la IP del servidor.
 */
const URL_CONFIGURADA = process.env.NEXT_PUBLIC_API_URL || '';
const MISMO_ORIGEN = process.env.NEXT_PUBLIC_SOCKET_SAME_ORIGIN === 'true';

function resolverBase(): string {
  if (MISMO_ORIGEN || !URL_CONFIGURADA) return '/';
  if (typeof window === 'undefined') return URL_CONFIGURADA;

  try {
    const url = new URL(URL_CONFIGURADA);
    const puerto = url.port || (url.protocol === 'https:' ? '' : '3000');
    return `${url.protocol}//${window.location.hostname}${puerto ? `:${puerto}` : ''}`;
  } catch {
    return `http://${window.location.hostname}:3000`;
  }
}

let socket: Socket | null = null;

export function getSocket(): Socket {
  if (socket) return socket;
  socket = io(resolverBase(), {
    transports: ['websocket'],
    withCredentials: true,
    reconnectionDelay: 1000,
    reconnectionDelayMax: 5000,
  });
  return socket;
}
