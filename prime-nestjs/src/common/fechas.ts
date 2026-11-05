export const ZONA_HORARIA = 'America/Bogota';

export interface PartesZona {
  year: number;
  month: number;
  day: number;
  hour: number;
  minute: number;
  second: number;
}

/** Descompone una fecha según la zona horaria de Colombia. */
export function partesZona(fecha: Date): PartesZona {
  const partes = new Intl.DateTimeFormat('en-CA', {
    timeZone: ZONA_HORARIA,
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

/**
 * Devuelve el instante UTC que corresponde a una hora local de Colombia,
 * partiendo de una fecha de referencia.
 */
export function instanteZona(fecha: Date, hora: number, minuto: number, dias: number): Date {
  const p = partesZona(fecha);
  const desfase = Date.UTC(p.year, p.month - 1, p.day, p.hour, p.minute, p.second) - fecha.getTime();
  return new Date(Date.UTC(p.year, p.month - 1, p.day + dias, hora, minuto, 0) - desfase);
}

/** Construye el instante UTC de una fecha calendario (año, mes, día) en hora Colombia. */
export function instanteDelDia(year: number, month: number, day: number, hora = 0, minuto = 0): Date {
  const referencia = new Date(Date.UTC(year, month - 1, day, 12, 0, 0));
  const p = partesZona(referencia);
  const desfase = Date.UTC(p.year, p.month - 1, p.day, p.hour, p.minute, p.second) - referencia.getTime();
  return new Date(Date.UTC(year, month - 1, day, hora, minuto, 0) - desfase);
}

/** Interpreta una fecha en formato YYYY-MM-DD. Devuelve null si no es válida. */
export function parseDia(valor?: string | null): { year: number; month: number; day: number } | null {
  if (!valor) return null;
  const coincidencia = /^(\d{4})-(\d{2})-(\d{2})$/.exec(valor.trim());
  if (!coincidencia) return null;
  const year = Number(coincidencia[1]);
  const month = Number(coincidencia[2]);
  const day = Number(coincidencia[3]);
  if (month < 1 || month > 12 || day < 1 || day > 31) return null;
  return { year, month, day };
}

/** Formatea una fecha como YYYY-MM-DD según la zona Colombia. */
export function diaIso(fecha: Date): string {
  const p = partesZona(fecha);
  const mm = String(p.month).padStart(2, '0');
  const dd = String(p.day).padStart(2, '0');
  return `${p.year}-${mm}-${dd}`;
}
