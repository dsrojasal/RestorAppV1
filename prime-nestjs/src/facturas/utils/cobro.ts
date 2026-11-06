import Decimal from 'decimal.js';
import { BadRequestException } from '@nestjs/common';
import { aDecimal } from 'src/common/unidades';

export interface TotalesCobro {
  subtotal: number;
  ivaPorcentaje: number | null;
  iva: number;
  propinaPorcentaje: number | null;
  propina: number;
  total: number;
}

export interface PagoNormalizado {
  tipoPagoId: number;
  monto: number;
}

function dinero(valor: Decimal): number {
  return Number(valor.toDecimalPlaces(2, Decimal.ROUND_HALF_UP).toFixed(2));
}

function porcentaje(valor?: number | null): Decimal {
  if (valor == null || !Number.isFinite(Number(valor))) return new Decimal(0);
  const n = new Decimal(String(valor));
  if (n.lt(0)) return new Decimal(0);
  if (n.gt(100)) return new Decimal(100);
  return n;
}

/**
 * Calcula el desglose de una cuenta:
 * - IVA sobre el subtotal
 * - propina sobre el subtotal (nunca sobre el IVA)
 * - total = subtotal + IVA + propina
 */
export function calcularTotales(
  base: number | string | Decimal,
  ivaPorcentaje?: number | null,
  propinaPorcentaje?: number | null,
  propinaMonto?: number | null,
): TotalesCobro {
  const subtotal = aDecimal(base);
  if (subtotal.lt(0)) throw new BadRequestException('El subtotal no puede ser negativo');

  const pctIva = porcentaje(ivaPorcentaje);
  const iva = subtotal.mul(pctIva).div(100);

  const montoPropina = propinaMonto != null ? aDecimal(propinaMonto) : null;
  if (montoPropina != null && montoPropina.lt(0)) {
    throw new BadRequestException('La propina no puede ser negativa');
  }

  const pctPropina = porcentaje(propinaPorcentaje);
  const propina = montoPropina != null && montoPropina.gt(0)
    ? montoPropina
    : subtotal.mul(pctPropina).div(100);

  const total = subtotal.add(iva).add(propina);

  return {
    subtotal: dinero(subtotal),
    ivaPorcentaje: ivaPorcentaje != null ? dinero(pctIva) : null,
    iva: dinero(iva),
    propinaPorcentaje: montoPropina != null && montoPropina.gt(0)
      ? null
      : propinaPorcentaje != null
        ? dinero(pctPropina)
        : null,
    propina: dinero(propina),
    total: dinero(total),
  };
}

/**
 * Normaliza los pagos. Acepta el flujo viejo de un solo método o el flujo
 * nuevo de pago mixto. Exige que la suma coincida con el total cobrado.
 */
export function normalizarPagos(
  pagos: Array<{ tipoPagoId: number; monto: number }> | undefined,
  tipoPagoId: number | undefined,
  total: number,
): PagoNormalizado[] {
  const lista = (pagos ?? [])
    .filter((p) => p && Number.isFinite(Number(p.monto)))
    .map((p) => ({ tipoPagoId: Number(p.tipoPagoId), monto: dinero(aDecimal(p.monto)) }));

  const normalizados = lista.length > 0
    ? lista
    : tipoPagoId != null
      ? [{ tipoPagoId: Number(tipoPagoId), monto: dinero(aDecimal(total)) }]
      : [];

  if (normalizados.length === 0) {
    throw new BadRequestException('Debe seleccionar al menos un método de pago');
  }

  const invalido = normalizados.find((p) => !Number.isInteger(p.tipoPagoId) || p.tipoPagoId < 1 || p.monto <= 0);
  if (invalido) {
    throw new BadRequestException('Cada pago debe tener un método válido y un monto mayor a cero');
  }

  const suma = normalizados.reduce((acc, p) => acc.add(aDecimal(p.monto)), new Decimal(0));
  const esperado = aDecimal(total);
  if (suma.minus(esperado).abs().gt(new Decimal('0.01'))) {
    throw new BadRequestException(
      `Los pagos suman ${suma.toFixed(2)} y el total de la cuenta es ${esperado.toFixed(2)}`,
    );
  }

  // Ajuste de centavos para que la suma sea exactamente el total.
  const diferencia = esperado.minus(suma);
  if (!diferencia.isZero() && normalizados.length > 0) {
    normalizados[0].monto = dinero(aDecimal(normalizados[0].monto).add(diferencia));
  }

  return normalizados;
}
