/**
 * Utilidades de dinero para RestorApp (locale Colombia).
 *
 * El problema que resuelven: el navegador y `Number()` interpretan `10.000`
 * como 10 (punto decimal), cuando en Colombia ese punto es separador de miles.
 * `parseMonto` normaliza texto libre y devuelve el número real.
 */

const round2 = (n: number) => Math.round((n + Number.EPSILON) * 100) / 100;

/**
 * Convierte un monto escrito por el usuario a número.
 *
 * Acepta, entre otros:
 *   10.000      -> 10000
 *   10.000,50   -> 10000.5
 *   10000,50    -> 10000.5
 *   10,00       -> 10
 *   3.000       -> 3000
 *   1.234.567   -> 1234567
 *   10.5        -> 10.5
 *
 * Devuelve `null` si el texto no representa un número válido.
 */
export function parseMonto(raw: string | number | null | undefined): number | null {
  if (raw == null) return null;
  if (typeof raw === 'number') return Number.isFinite(raw) ? round2(raw) : null;

  let s = String(raw).trim().replace(/\s/g, '').replace(/\$/g, '');
  if (!s) return null;

  let signo = 1;
  if (s.startsWith('-')) {
    signo = -1;
    s = s.slice(1);
  } else if (s.startsWith('+')) {
    s = s.slice(1);
  }

  if (!/^[\d.,]+$/.test(s)) return null;

  const tieneComa = s.includes(',');
  const tienePunto = s.includes('.');

  if (tieneComa && tienePunto) {
    // El último separador es el decimal.
    if (s.lastIndexOf(',') > s.lastIndexOf('.')) {
      s = s.replace(/\./g, '').replace(',', '.');
    } else {
      s = s.replace(/,/g, '');
    }
  } else if (tieneComa) {
    const partes = s.split(',');
    s = partes.length > 2 ? s.replace(/,/g, '') : s.replace(',', '.');
  } else if (tienePunto) {
    const partes = s.split('.');
    if (partes.length > 2) {
      // 1.234.567 -> separador de miles
      s = s.replace(/\./g, '');
    } else {
      const [entero, decimales] = partes;
      // Un único punto seguido de exactamente 3 dígitos se interpreta como miles.
      s = decimales.length === 3 ? entero + decimales : s;
    }
  }

  const n = Number(s) * signo;
  if (!Number.isFinite(n)) return null;
  return round2(n);
}

/**
 * Formatea un número como pesos colombianos.
 *  10000    -> "$10.000"
 *  10000.5  -> "$10.000,50"
 *  -3000    -> "-$3.000"
 *
 * Solo muestra centavos cuando el valor los tiene, para que las tablas
 * y los indicadores queden limpios sin perder precisión.
 */
export function formatMonto(valor: number | string | null | undefined): string {
  const n = typeof valor === 'number' ? valor : Number(valor ?? 0);
  const seguro = Number.isFinite(n) ? round2(n) : 0;
  const negativo = seguro < 0;
  const abs = Math.abs(seguro);
  const conCentavos = Math.abs(abs - Math.round(abs)) > 0.004;
  const texto = abs.toLocaleString('es-CO', {
    minimumFractionDigits: conCentavos ? 2 : 0,
    maximumFractionDigits: conCentavos ? 2 : 0,
  });
  return `${negativo ? '-' : ''}$${texto}`;
}

/** Formatea un monto para precargarlo en un input: 10000 -> "10.000". */
export function montoParaInput(valor: number | null | undefined): string {
  if (valor == null || !Number.isFinite(valor)) return '';
  return Number(valor).toLocaleString('es-CO', { maximumFractionDigits: 2 });
}
