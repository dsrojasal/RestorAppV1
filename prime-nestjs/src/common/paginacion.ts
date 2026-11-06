import { Pagina, PaginacionQueryDto } from './dto/paginacion-query.dto';

export const LIMITE_POR_DEFECTO = 50;

export interface PaginacionNormalizada {
  page: number;
  limit: number;
  skip: number;
  paginado: boolean;
}

export function normalizarPaginacion(query?: PaginacionQueryDto): PaginacionNormalizada {
  const paginado = query?.page !== undefined || query?.limit !== undefined;
  const page = Math.max(1, query?.page ?? 1);
  const limit = Math.min(200, Math.max(1, query?.limit ?? LIMITE_POR_DEFECTO));
  return { page, limit, skip: (page - 1) * limit, paginado };
}

export function construirPagina<T>(data: T[], total: number, page: number, limit: number): Pagina<T> {
  return {
    data,
    total,
    page,
    limit,
    pages: Math.max(1, Math.ceil(total / limit)),
  };
}
