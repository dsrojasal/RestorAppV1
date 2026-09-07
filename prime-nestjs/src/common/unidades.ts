import Decimal from 'decimal.js';

export type FamiliaUnidad = 'masa' | 'volumen' | 'discreta';

export const LIBRA_GRAMOS = new Decimal('453.6');
export const FACTOR_GRUPO = new Decimal('1000');

interface UnidadDef {
  sigla: string;
  familia: FamiliaUnidad;
  factorMinimo: Decimal;
}

const UNIDADES: Record<string, UnidadDef> = {
  kg: { sigla: 'kg', familia: 'masa', factorMinimo: new Decimal('1000') },
  g: { sigla: 'g', familia: 'masa', factorMinimo: new Decimal('1') },
  lb: { sigla: 'lb', familia: 'masa', factorMinimo: LIBRA_GRAMOS },
  lt: { sigla: 'lt', familia: 'volumen', factorMinimo: new Decimal('1000') },
  ml: { sigla: 'ml', familia: 'volumen', factorMinimo: new Decimal('1') },
  und: { sigla: 'und', familia: 'discreta', factorMinimo: new Decimal('1') },
  paquete: { sigla: 'paquete', familia: 'discreta', factorMinimo: new Decimal('1') },
  saco: { sigla: 'saco', familia: 'discreta', factorMinimo: new Decimal('1') },
  docena: { sigla: 'docena', familia: 'discreta', factorMinimo: new Decimal('1') },
};

export function esUnidad(unidad: string | null | undefined): boolean {
  return !!unidad && Object.prototype.hasOwnProperty.call(UNIDADES, unidad);
}

export function familiaUnidad(unidad: string | null | undefined): FamiliaUnidad | null {
  if (!unidad) return null;
  return UNIDADES[unidad]?.familia ?? null;
}

export function esDiscreta(unidad: string | null | undefined): boolean {
  return familiaUnidad(unidad) === 'discreta';
}

export function convertir(valor: Decimal.Value, de: string, a: string): Decimal {
  if (de === a) return new Decimal(valor);
  const defA = UNIDADES[a];
  if (!defA) throw new Error(`Unidad desconocida: ${a}`);
  const enMinimo = new Decimal(valor).times(UNIDADES[de]?.factorMinimo ?? 1);
  return enMinimo.div(defA.factorMinimo);
}

export function aDecimal(valor: Decimal.Value | null | undefined): Decimal {
  if (valor == null) return new Decimal(0);
  if (valor instanceof Decimal) return valor;
  if (typeof valor === 'number') return new Decimal(valor.toString());
  return new Decimal(String(valor));
}

function fmtES(valor: Decimal): string {
  const s = valor.toDecimalPlaces(2, Decimal.ROUND_HALF_UP).toFixed(2);
  const [ent, dec] = s.split('.');
  const entForm = ent.replace(/\B(?=(\d{3})+(?!\d))/g, '.');
  const decT = dec.replace(/0+$/, '');
  return decT ? `${entForm},${decT}` : entForm;
}

function formatearEnUnidad(enUnidad: Decimal, unidad: string): string {
  if (unidad === 'g' || unidad === 'ml') {
    const r = enUnidad.toDecimalPlaces(3, Decimal.ROUND_HALF_UP);
    return `${r.isInteger() ? r.toFixed(0) : fmtES(r)} ${unidad}`;
  }
  if (unidad === 'kg' || unidad === 'lt') {
    if (enUnidad.eq(0)) return `0 ${unidad}`;
    const enMinimo = enUnidad.times(FACTOR_GRUPO);
    if (enUnidad.lt(1) && enMinimo.isInteger()) {
      return `${enMinimo.toFixed(0)} ${unidad === 'kg' ? 'g' : 'ml'}`;
    }
    return `${fmtES(enUnidad)} ${unidad}`;
  }
  if (unidad === 'lb') return `${fmtES(enUnidad)} lb`;
  return `${fmtES(enUnidad)} ${unidad}`;
}

export function formatearCantidad(valor: Decimal.Value, base: string, preferida?: string | null): string {
  const dec = aDecimal(valor);
  const familia = familiaUnidad(base);
  if (familia === 'discreta') return `${dec.isInteger() ? dec.toFixed(0) : fmtES(dec)} ${base}`;
  const unidad = escogerUnidad(base, preferida);
  const enUnidad = convertir(dec, base, unidad);
  return formatearEnUnidad(enUnidad, unidad);
}

export function escogerUnidad(base: string, preferida?: string | null): string {
  if (preferida && esUnidad(preferida) && noDiscreta(preferida) && familiaUnidad(preferida) === familiaUnidad(base)) {
    return preferida;
  }
  return base;
}

function noDiscreta(unidad: string): boolean {
  return familiaUnidad(unidad) !== 'discreta';
}