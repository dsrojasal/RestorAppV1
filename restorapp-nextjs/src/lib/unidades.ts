export type Familia = 'masa' | 'volumen' | 'discreta';

const FAMILIAS: Record<string, Familia> = {
  kg: 'masa',
  g: 'masa',
  lb: 'masa',
  lt: 'volumen',
  ml: 'volumen',
  und: 'discreta',
  paquete: 'discreta',
  saco: 'discreta',
  docena: 'discreta',
};

export const UNIDADES_LIST = ['kg', 'g', 'lb', 'und', 'ml', 'lt', 'paquete', 'saco', 'docena'];
export const LIBRA_GRAMOS = 453.6;

export function familiaDe(unidad: string): Familia {
  return FAMILIAS[unidad] ?? 'discreta';
}

export function esDiscreta(unidad: string): boolean {
  return familiaDe(unidad) === 'discreta';
}

export function familiaCompatible(a: string, b: string): boolean {
  return !esDiscreta(a) && !esDiscreta(b) && familiaDe(a) === familiaDe(b);
}

const ALIASES: Record<string, string> = {
  kg: 'kg',
  kilo: 'kg',
  kilos: 'kg',
  g: 'g',
  gr: 'g',
  gramo: 'g',
  gramos: 'g',
  lb: 'lb',
  libra: 'lb',
  libras: 'lb',
  lt: 'lt',
  litro: 'lt',
  litros: 'lt',
  l: 'lt',
  ml: 'ml',
  mililitro: 'ml',
  mililitros: 'ml',
  und: 'und',
  unidad: 'und',
  unidades: 'und',
  paquete: 'paquete',
  saco: 'saco',
  docena: 'docena',
};

function factorMinimo(unidad: string): number {
  switch (familiaDe(unidad)) {
    case 'masa':
      return unidad === 'kg' ? 1000 : unidad === 'lb' ? LIBRA_GRAMOS : 1;
    case 'volumen':
      return unidad === 'lt' ? 1000 : 1;
    default:
      return 1;
  }
}

function normalizarSigla(palabra: string): string | null {
  return ALIASES[palabra] ?? null;
}

function redondear3(v: number): number {
  return Math.round((v + Number.EPSILON) * 1000) / 1000;
}

const NOMBRE_FAMILIA: Record<string, string> = {
  masa: 'masa',
  volumen: 'volumen',
};

export interface ParseoResult {
  ok: boolean;
  valorBase?: number;
  unidad?: string;
  error?: string;
}

export function parsearValor(texto: string, baseUnidad: string): ParseoResult {
  const t = (texto ?? '').trim();
  if (!t) return { ok: false, error: 'Ingresa una cantidad' };
  const match = t.match(/^([+\-]?\d+(?:[.,]\d+)?)\s*([a-zA-ZáéíóúüñÁÉÍÓÚÜÑ]*)$/);
  if (!match) return { ok: false, error: 'Formato inválido (ej. 500 g, 10 lb o solo 5)' };
  const n = parseFloat(match[1].replace(',', '.'));
  if (!Number.isFinite(n)) return { ok: false, error: 'Cantidad inválida' };
  const palabra = match[2].toLowerCase();

  if (!palabra) return { ok: true, valorBase: redondear3(n), unidad: baseUnidad };

  const sigla = normalizarSigla(palabra);
  if (!sigla) return { ok: false, error: `Unidad "${palabra}" no reconocida` };

  if (sigla === baseUnidad) return { ok: true, valorBase: redondear3(n), unidad: sigla };
  if (esDiscreta(baseUnidad) || esDiscreta(sigla)) {
    return {
      ok: false,
      error: `Este insumo usa la unidad discreta "${baseUnidad}" y no admite conversiones. Escribe solo el número en ${baseUnidad}.`,
    };
  }
  if (familiaDe(sigla) !== familiaDe(baseUnidad)) {
    return {
      ok: false,
      error: `"${sigla}" es de ${NOMBRE_FAMILIA[familiaDe(sigla)]} y el insumo usa ${NOMBRE_FAMILIA[familiaDe(baseUnidad)]} (${baseUnidad}). No se puede mezclar g con ml.`,
    };
  }
  const enMinimo = n * factorMinimo(sigla);
  return { ok: true, valorBase: redondear3(enMinimo / factorMinimo(baseUnidad)), unidad: sigla };
}

export function fmtNumero(v: number): string {
  const n = Number(v);
  if (!Number.isFinite(n)) return String(v);
  return n.toLocaleString('es-CO', { maximumFractionDigits: 2 });
}

export function fmtCant(v: number, base: string): string {
  const n = Number(v);
  if (esDiscreta(base)) return `${fmtNumero(n)} ${base}`;
  switch (base) {
    case 'kg': {
      const g = Math.round((n + Number.EPSILON) * 1000);
      if (g < 1000) return `${g} g`;
      return `${fmtNumero(n)} kg`;
    }
    case 'lt': {
      const ml = Math.round((n + Number.EPSILON) * 1000);
      if (ml < 1000) return `${ml} ml`;
      return `${fmtNumero(n)} lt`;
    }
    case 'g':
    case 'ml': {
      const vg = Math.round(n);
      if (vg >= 1000) return `${fmtNumero(vg / 1000)} ${base === 'g' ? 'kg' : 'lt'}`;
      return `${vg} ${base}`;
    }
    case 'lb':
      return `${fmtNumero(n)} lb`;
    default:
      return `${fmtNumero(n)} ${base}`;
  }
}

export function fmtCantCon(v: number, base: string, preferida?: string | null): string {
  const n = Number(v);
  if (!preferida || preferida === base || !familiaCompatible(preferida, base)) return fmtCant(n, base);
  const enPreferida = (n * factorMinimo(base)) / factorMinimo(preferida);
  return fmtCant(enPreferida, preferida);
}

export function fmtCOP(v: number): string {
  const n = Number(v);
  if (!Number.isFinite(n)) return '—';
  return `$${n.toLocaleString('es-CO', { maximumFractionDigits: 0 })}`;
}