import type { Response } from "express";

export interface PaginationMeta {
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
}

export class ApiResponse {
  static success(
    res: Response,
    data: unknown,
    status = 200,
    message?: string
  ) {
    return res.status(status).json({
      success: true,
      ...(message ? { message } : {}),
      data,
    });
  }

  static paginated(
    res: Response,
    data: unknown,
    meta: PaginationMeta,
    status = 200,
    message?: string
  ) {
    return res.status(status).json({
      success: true,
      ...(message ? { message } : {}),
      data,
      meta,
    });
  }

  static error(
    res: Response,
    message: string,
    status = 500
  ) {
    return res.status(status).json({
      success: false,
      error: message,
    });
  }
}
