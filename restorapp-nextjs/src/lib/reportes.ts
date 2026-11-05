export interface TransaccionReporte {
  id: number;
  mesa: string;
  total: number;
  fecha: string;
}

export interface ReporteVentasDia {
  fecha: string;
  total: number;
  cuentas: number;
  ticketPromedio: number | null;
  porHora: number[];
  transacciones: TransaccionReporte[];
}

export interface ReporteVentasRango {
  desde: string;
  hasta: string;
  total: number;
  cuentas: number;
  ticketPromedio: number | null;
  porDia: { fecha: string; total: number; cuentas: number }[];
  transacciones: TransaccionReporte[];
}

export interface ReporteProductos {
  totalUnidades: number;
  totalVendido: number;
  productos: { productoId: number; nombre: string; cantidad: number; total: number }[];
}

export interface ReporteConsumo {
  insumos: { ingredienteId: number; nombre: string; cantidad: number; unidad: string; cantidadTexto: string }[];
}

export interface ReporteMesero {
  totalGeneral: number;
  meseros: {
    usuarioId: number | null;
    nombre: string;
    rol: string;
    cuentas: number;
    total: number;
    ticketPromedio: number | null;
  }[];
}

export function fmtPesos(valor: number | null | undefined): string {
  return `$${Number(valor || 0).toLocaleString('es-CO', { maximumFractionDigits: 0 })}`;
}

export function fmtNumero(valor: number | null | undefined, decimales = 0): string {
  return Number(valor || 0).toLocaleString('es-CO', { maximumFractionDigits: decimales });
}

export function fmtFecha(iso: string): string {
  const fecha = new Date(iso);
  if (isNaN(fecha.getTime())) return '—';
  return fecha.toLocaleString('es-CO', {
    day: '2-digit',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
    timeZone: 'America/Bogota',
  });
}

export function fmtDia(iso: string): string {
  const [year, month, day] = iso.split('-').map(Number);
  if (!year || !month || !day) return iso;
  return new Date(Date.UTC(year, month - 1, day, 12)).toLocaleDateString('es-CO', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    timeZone: 'UTC',
  });
}

/** Fecha de hoy en formato YYYY-MM-DD (zona Colombia). */
export function hoyIso(): string {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/Bogota',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(new Date());
}

export function primerDiaMesIso(): string {
  return `${hoyIso().slice(0, 8)}01`;
}

export function mesActual(): string {
  return hoyIso().slice(0, 7);
}

/** Último día del mes en formato YYYY-MM-DD. */
export function ultimoDiaMes(mes: string): string {
  const [year, month] = mes.split('-').map(Number);
  if (!year || !month) return `${mes}-01`;
  const ultimo = new Date(Date.UTC(year, month, 0)).getUTCDate();
  return `${mes}-${String(ultimo).padStart(2, '0')}`;
}

/** Número con coma decimal para que Excel en español lo lea como número. */
export function csvNumero(valor: number | null | undefined, decimales = 0): string {
  return Number(valor || 0).toFixed(decimales).replace('.', ',');
}

function escaparCsv(valor: string | number | null | undefined): string {
  const texto = valor == null ? '' : String(valor);
  return /[";\n\r]/.test(texto) ? `"${texto.replace(/"/g, '""')}"` : texto;
}

/** Descarga una matriz de filas como CSV compatible con Excel (separador ; y BOM UTF-8). */
export function descargarCSV(nombre: string, filas: (string | number | null | undefined)[][]): void {
  const contenido = '\uFEFF' + filas.map((fila) => fila.map(escaparCsv).join(';')).join('\r\n');
  const blob = new Blob([contenido], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const enlace = document.createElement('a');
  enlace.href = url;
  enlace.download = nombre;
  document.body.appendChild(enlace);
  enlace.click();
  document.body.removeChild(enlace);
  URL.revokeObjectURL(url);
}
