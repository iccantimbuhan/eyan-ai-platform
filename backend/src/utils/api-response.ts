import type { Response } from "express";

export class ApiResponse {
  static success(res: Response, data: unknown, status = 200) {
    return res.status(status).json({
      success: true,
      data,
    });
  }

  static error(
    res: Response,
    message: string,
    status = 500,
  ) {
    return res.status(status).json({
      success: false,
      error: message,
    });
  }
}