export interface PaginationOptions {
  page?: number;
  pageSize?: number;
}

export interface PaginationResult {
  page: number;
  pageSize: number;
  skip: number;
  take: number;
}

export function paginate(
  options: PaginationOptions
): PaginationResult {
  const page = Math.max(1, Number(options.page) || 1);
  const pageSize = Math.min(
    100,
    Math.max(1, Number(options.pageSize) || 10)
  );

  return {
    page,
    pageSize,
    skip: (page - 1) * pageSize,
    take: pageSize,
  };
}
