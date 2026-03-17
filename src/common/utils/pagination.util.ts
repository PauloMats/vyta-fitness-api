import type { PaginationQueryDto } from '../dto/pagination-query.dto';

export interface PaginationMeta {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export interface PaginatedResult<T> {
  items: T[];
  meta: PaginationMeta;
}

export function buildPagination(query: PaginationQueryDto, total: number) {
  return {
    skip: (query.page - 1) * query.limit,
    take: query.limit,
    meta: {
      page: query.page,
      limit: query.limit,
      total,
      totalPages: total === 0 ? 0 : Math.ceil(total / query.limit),
    },
  };
}

export function paginated<T>(items: T[], meta: PaginationMeta): PaginatedResult<T> {
  return { items, meta };
}
