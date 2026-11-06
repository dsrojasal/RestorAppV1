import { Type } from 'class-transformer';
import { IsInt, IsOptional, Max, Min } from 'class-validator';

/**
 * Paginación opcional y compatible hacia atrás: si el cliente no envía
 * `page` ni `limit`, los listados siguen devolviendo un arreglo como antes.
 */
export class PaginacionQueryDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(200)
  limit?: number;
}

export interface Pagina<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
  pages: number;
}
