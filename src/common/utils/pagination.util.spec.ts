import { buildPagination, paginated } from './pagination.util';

describe('pagination utils', () => {
  it('builds skip/take and meta correctly', () => {
    const result = buildPagination({ page: 3, limit: 10 }, 42);

    expect(result.skip).toBe(20);
    expect(result.take).toBe(10);
    expect(result.meta).toEqual({
      page: 3,
      limit: 10,
      total: 42,
      totalPages: 5,
    });
  });

  it('returns zero total pages when there is no data', () => {
    const result = buildPagination({ page: 1, limit: 20 }, 0);

    expect(result.meta.totalPages).toBe(0);
  });

  it('wraps a paginated payload', () => {
    const meta = { page: 1, limit: 5, total: 2, totalPages: 1 };
    expect(paginated(['a', 'b'], meta)).toEqual({
      items: ['a', 'b'],
      meta,
    });
  });
});
