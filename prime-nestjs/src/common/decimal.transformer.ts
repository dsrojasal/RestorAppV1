import { ValueTransformer } from 'typeorm';

export class DecimalTransformer implements ValueTransformer {
  to(value: number | string | null | undefined): number | string | null | undefined {
    if (value == null) return value;
    return value;
  }

  from(value: number | string | null | undefined): number | null | undefined {
    if (value == null) return value;
    return typeof value === 'number' ? value : Number(value);
  }
}

export const decimalTransformer = new DecimalTransformer();