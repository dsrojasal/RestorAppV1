const RANGOS_PRIVADOS = [/^10\.\d{1,3}\.\d{1,3}\.\d{1,3}$/, /^192\.168\.\d{1,3}\.\d{1,3}$/, /^172\.(1[6-9]|2\d|3[01])\.\d{1,3}\.\d{1,3}$/];

/**
 * Hosts que se consideran de la red local: localhost y rangos privados.
 * Así el sistema sigue funcionando si el router cambia la IP del servidor,
 * sin tener que editar ALLOWED_ORIGINS en cada equipo.
 */
function esHostLocal(hostname: string): boolean {
  return hostname === 'localhost' || hostname === '127.0.0.1' || hostname === '::1' || RANGOS_PRIVADOS.some((rango) => rango.test(hostname));
}

/** Compatible con el `origin` de Nest/CORS y con el de Socket.io. */
export type ValidadorOrigen = (origin: string | undefined, callback: (error: Error | null, allow?: boolean) => void) => void;

/**
 * Crea el validador de orígenes para CORS y para el gateway de Socket.io.
 *
 * Reglas:
 *  - Sin cabecera Origin (peticiones del servidor, curl, apps nativas): se permite.
 *  - Origen exacto listado en ALLOWED_ORIGINS: se permite.
 *  - Cualquier puerto de localhost o de una IP privada: se permite.
 *  - Cualquier otro origen (internet): se rechaza.
 *
 * No se devuelve un error para los rechazos: se responde "no permitido" y el
 * navegador bloquea la petición, sin generar un 500 en el servidor.
 */
export function crearValidadorOrigenes(permitidos: string[] = []): ValidadorOrigen {
  const lista = permitidos.map((origen) => origen.trim()).filter(Boolean);

  return (origin, callback): void => {
    if (!origin || lista.includes(origin)) {
      callback(null, true);
      return;
    }

    try {
      const { protocol, hostname } = new URL(origin);
      const protocoloValido = protocol === 'http:' || protocol === 'https:';
      callback(null, protocoloValido && esHostLocal(hostname));
    } catch {
      callback(null, false);
    }
  };
}
