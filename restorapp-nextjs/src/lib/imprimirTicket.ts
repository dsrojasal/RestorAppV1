import QRCode from 'qrcode';

export interface TicketItem {
  nombre: string;
  cantidad: number;
  precio?: number | null; // precio unitario (opcional)
  observacion?: string | null;
}

export interface TicketData {
  numero: number | string;
  estado: 'pendiente' | 'pagado' | 'anulado';
  fecha: string | Date;
  pedidoId?: number | string;
  mesa?: string | number | null;
  mesero?: string | null;
  cajero?: string | null;
  items: TicketItem[];
  total: number;
  metodoPago?: string | null;
}

const NOMBRE_NEGOCIO = 'RestorApp';
const SUBTITULO = 'Management Hub';
const PIE = '¡Gracias por su visita!';

const money = (n: number) => '$' + Math.round(n).toLocaleString('es-CO');

const esc = (s: unknown) =>
  String(s ?? '').replace(/[&<>"']/g, (c) =>
    ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]!)
  );

/* ---------- Importe en letras (pesos) ---------- */
const UNI = ['', 'UN', 'DOS', 'TRES', 'CUATRO', 'CINCO', 'SEIS', 'SIETE', 'OCHO', 'NUEVE', 'DIEZ', 'ONCE', 'DOCE', 'TRECE', 'CATORCE', 'QUINCE', 'DIECISÉIS', 'DIECISIETE', 'DIECIOCHO', 'DIECINUEVE', 'VEINTE', 'VEINTIÚN', 'VEINTIDÓS', 'VEINTITRÉS', 'VEINTICUATRO', 'VEINTICINCO', 'VEINTISÉIS', 'VEINTISIETE', 'VEINTIOCHO', 'VEINTINUEVE'];
const DEC = ['', '', '', 'TREINTA', 'CUARENTA', 'CINCUENTA', 'SESENTA', 'SETENTA', 'OCHENTA', 'NOVENTA'];
const CEN = ['', 'CIENTO', 'DOSCIENTOS', 'TRESCIENTOS', 'CUATROCIENTOS', 'QUINIENTOS', 'SEISCIENTOS', 'SETECIENTOS', 'OCHOCIENTOS', 'NOVECIENTOS'];

function menorMil(n: number): string {
  if (n === 100) return 'CIEN';
  const c = Math.floor(n / 100);
  const r = n % 100;
  let out = CEN[c];
  if (r > 0) {
    if (out) out += ' ';
    if (r < 30) out += UNI[r];
    else {
      const d = Math.floor(r / 10);
      const u = r % 10;
      out += DEC[d] + (u ? ' Y ' + UNI[u] : '');
    }
  }
  return out;
}

export function numeroALetras(valor: number): string {
  const n = Math.round(valor);
  if (n === 0) return 'CERO PESOS';
  const millones = Math.floor(n / 1_000_000);
  const miles = Math.floor((n % 1_000_000) / 1000);
  const resto = n % 1000;
  const partes: string[] = [];
  if (millones) partes.push(millones === 1 ? 'UN MILLÓN' : `${menorMil(millones)} MILLONES`);
  if (miles) partes.push(miles === 1 ? 'MIL' : `${menorMil(miles)} MIL`);
  if (resto) partes.push(menorMil(resto));
  const sufijo = n >= 1_000_000 && n % 1_000_000 === 0 ? ' DE PESOS' : n === 1 ? ' PESO' : ' PESOS';
  return partes.join(' ') + sufijo;
}

/* ---------- Logo ---------- */
const LOGO_SVG = `
<svg width="48" height="48" viewBox="0 0 48 48" xmlns="http://www.w3.org/2000/svg">
  <circle cx="24" cy="24" r="24" fill="#000"/>
  <g transform="translate(9.6 9.6) scale(1.2)" fill="#fff">
    <path d="M8.1 13.34l2.83-2.83L3.91 3.5c-1.56 1.56-1.56 4.09 0 5.66l4.19 4.18zm6.78-1.81c1.53.71 3.68.21 5.27-1.38 1.91-1.91 2.28-4.65.81-6.12-1.46-1.46-4.2-1.1-6.12.81-1.59 1.59-2.09 3.74-1.38 5.27L3.7 19.87l1.41 1.41L12 14.41l6.88 6.88 1.41-1.41L13.41 13l1.47-1.47z"/>
  </g>
</svg>`;

const TITULO: Record<TicketData['estado'], string> = {
  pendiente: 'PRE-CUENTA',
  pagado: 'TICKET DE VENTA',
  anulado: 'FACTURA ANULADA',
};

/* ---------- HTML del ticket ---------- */
export function construirTicketHTML(
  d: TicketData,
  opts: { qr?: string; preview?: boolean } = {}
): string {
  const fecha = new Date(d.fecha);
  const tz = { timeZone: 'America/Bogota' } as const;
  const fechaTxt = fecha.toLocaleDateString('es-CO', { day: '2-digit', month: '2-digit', year: 'numeric', ...tz });
  const horaTxt = fecha.toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit', hour12: true, ...tz });

  const conPrecios = d.items.length > 0 && d.items.every((i) => i.precio != null);

  const filas = d.items
    .map((i) =>
      conPrecios
        ? `<tr><td colspan="3" class="desc">${esc(i.nombre)}</td></tr>
           <tr>
             <td class="cant center">${i.cantidad}</td>
             <td class="right">${money(i.precio!)}</td>
             <td class="right">${money(i.cantidad * i.precio!)}</td>
           </tr>
           ${i.observacion ? `<tr><td></td><td colspan="2" class="small">* ${esc(i.observacion)}</td></tr>` : ''}`
        : `<tr>
             <td class="cant center">${i.cantidad}</td>
             <td>${esc(i.nombre)}${i.observacion ? `<div class="small">* ${esc(i.observacion)}</div>` : ''}</td>
           </tr>`
    )
    .join('');

  const cabecera = conPrecios
    ? '<tr><td class="cant center">CANT</td><td class="right">PRECIO</td><td class="right">TOTAL</td></tr>'
    : '<tr><td class="cant center">CANT</td><td>DESCRIPCIÓN</td></tr>';

  const fila = (label: string, valor: string) =>
    `<div class="row"><span>${label}</span><span>${valor}</span></div>`;

  const estilosPreview = opts.preview
    ? `
  html { background: #e5e5e5; }
  body { background: #fff; margin: 16px auto; box-shadow: 0 2px 12px rgba(0,0,0,.25); }
  .toolbar { display: flex; justify-content: center; gap: 8px; padding: 12px; font-family: sans-serif; }
  .toolbar button { padding: 10px 20px; border: 0; border-radius: 8px; background: #16a34a; color: #fff; font-weight: 700; cursor: pointer; }
  @media print { html { background: #fff; } body { margin: 0 auto; box-shadow: none; } .toolbar { display: none !important; } }`
    : '';

  return `<!doctype html>
<html>
<head>
<meta charset="utf-8" />
<title>Factura #${esc(d.numero)}</title>
<style>
  @page { size: 80mm auto; margin: 0; }
  * { box-sizing: border-box; }
  body { width: 76mm; margin: 0 auto; padding: 4mm 3mm; font-family: "Courier New", Courier, monospace; font-size: 12px; color: #000; background: #fff; }
  .center { text-align: center; } .right { text-align: right; } .bold { font-weight: bold; }
  .logo { display: flex; justify-content: center; margin-bottom: 4px; }
  .sep { border-top: 1px dashed #000; margin: 6px 0; }
  .row { display: flex; justify-content: space-between; gap: 8px; padding: 1px 0; }
  .big { font-size: 15px; font-weight: bold; }
  table { width: 100%; border-collapse: collapse; }
  thead td { font-weight: bold; border-bottom: 1px solid #000; padding-bottom: 2px; }
  td { padding: 2px 0; vertical-align: top; }
  .desc { padding-top: 5px; } .cant { width: 18%; } .small { font-size: 11px; }
  .qr { text-align: center; margin-top: 8px; }
  .qr img { width: 38mm; height: 38mm; }
  .toolbar { display: none; }${estilosPreview}
</style>
</head>
<body>
  ${opts.preview ? '<div class="toolbar"><button onclick="window.print()">🖨️ Imprimir</button></div>' : ''}
  <div class="logo">${LOGO_SVG}</div>
  <div class="center bold" style="font-size:15px">${esc(NOMBRE_NEGOCIO)}</div>
  <div class="center small">${esc(SUBTITULO)}</div>

  <div class="center bold" style="margin-top:6px">${TITULO[d.estado]}</div>
  <div class="center">Factura N° ${esc(d.numero)}</div>

  <div class="sep"></div>
  ${fila('Fecha:', `${fechaTxt} ${horaTxt}`)}
  ${d.pedidoId ? fila('Pedido:', `#${esc(d.pedidoId)}`) : ''}
  ${d.mesa ? fila('Mesa:', esc(d.mesa)) : ''}
  ${d.mesero ? fila('Mesero:', esc(d.mesero)) : ''}
  ${d.cajero ? fila('Cajero:', esc(d.cajero)) : ''}

  <div class="sep"></div>
  <table>
    <thead>${cabecera}</thead>
    <tbody>${filas}</tbody>
  </table>

  <div class="sep"></div>
  <div class="row big"><span>TOTAL:</span><span>${money(d.total)}</span></div>

  <div class="bold" style="margin-top:6px">IMPORTE EN LETRAS:</div>
  <div class="small">${numeroALetras(d.total)}</div>

  ${
    d.estado === 'pagado' && d.metodoPago
      ? `<div class="sep"></div>${fila('FORMA DE PAGO:', esc(d.metodoPago))}`
      : ''
  }
  ${
    d.estado === 'pendiente'
      ? `<div class="sep"></div><div class="center small">Este documento no es un comprobante de pago.</div>`
      : ''
  }

  ${opts.qr ? `<div class="qr"><img src="${opts.qr}" /></div>` : ''}

  <div class="sep"></div>
  <div class="center">${esc(PIE)}</div>
  <div class="center small" style="margin-top:4px">Comprobante interno, sin validez como factura electrónica.</div>
</body>
</html>`;
}

/* ---------- QR ---------- */
export async function generarQR(d: TicketData): Promise<string> {
  const contenido = `RestorApp|Factura ${d.numero}|${Math.round(d.total)}|${new Date(d.fecha).toISOString()}`;
  try {
    return await QRCode.toDataURL(contenido, { margin: 1, width: 160 });
  } catch {
    return '';
  }
}

/* ---------- Imprimir directo (sin vista previa) ---------- */
export async function imprimirTicket(data: TicketData) {
  const qr = await generarQR(data);
  const iframe = document.createElement('iframe');
  iframe.style.cssText = 'position:fixed;right:0;bottom:0;width:0;height:0;border:0;';
  document.body.appendChild(iframe);

  const doc = iframe.contentWindow!.document;
  doc.open();
  doc.write(construirTicketHTML(data, { qr }));
  doc.close();

  setTimeout(() => {
    iframe.contentWindow!.focus();
    iframe.contentWindow!.print();
    setTimeout(() => iframe.remove(), 1000);
  }, 250);
}

/* ---------- Ver en otra pestaña, a tamaño real, con botón Imprimir ---------- */
export async function verTicket(data: TicketData) {
  // Se abre ANTES del await para que el navegador no bloquee la pestaña
  const win = window.open('', '_blank');
  if (!win) {
    alert('Permite las ventanas emergentes para ver el ticket.');
    return;
  }
  const qr = await generarQR(data);
  win.document.open();
  win.document.write(construirTicketHTML(data, { qr, preview: true }));
  win.document.close();
}