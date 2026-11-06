'use client';

import { formatMonto, parseMonto } from '@/lib/montos';

interface MoneyInputProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  large?: boolean;
  compact?: boolean;
  autoFocus?: boolean;
  id?: string;
  required?: boolean;
  disabled?: boolean;
  ariaLabel?: string;
  /** Muestra la confirmación "Se registrará". Útil desactivarlo cuando el monto no se guarda (ej. efectivo recibido). */
  showHint?: boolean;
}

/**
 * Campo de dinero reutilizable.
 *
 * Acepta 10.000, 10000 o 10.000,50 y muestra en vivo el valor que se
 * registrará, para que el usuario confirme antes de guardar.
 */
export default function MoneyInput({
  value,
  onChange,
  placeholder = '0',
  large = false,
  compact = false,
  autoFocus = false,
  id,
  required = false,
  disabled = false,
  ariaLabel = 'Monto en pesos',
  showHint = true,
}: MoneyInputProps) {
  const parsed = parseMonto(value);
  const vacio = value.trim() === '';
  const invalido = !vacio && parsed == null;

  return (
    <div>
      <div
        className={`caja-money-field ${large ? 'lg' : ''} ${compact ? 'sm' : ''} ${invalido ? 'invalid' : ''}`}
      >
        <span>$</span>
        <input
          type="text"
          inputMode="decimal"
          id={id}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          autoFocus={autoFocus}
          autoComplete="off"
          spellCheck={false}
          required={required}
          disabled={disabled}
          aria-label={ariaLabel}
        />
      </div>
      {showHint && !vacio && (
        <p className={`caja-money-hint ${invalido ? 'invalid' : ''}`}>
          {invalido ? (
            'Monto no válido. Escribe solo números (puedes usar punto de miles o coma decimal).'
          ) : (
            <>
              Se registrará: <b>{formatMonto(parsed as number)}</b>
            </>
          )}
        </p>
      )}
    </div>
  );
}
