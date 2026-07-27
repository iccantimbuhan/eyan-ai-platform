import type { Request, Response, NextFunction } from "express";
import { ApiError } from "../errors/api-error.js";
import { ApiResponse } from "../utils/api-response.js";

export function errorHandler(
  err: Error,
  req: Request,
  res: Response,
  _next: NextFunction
) {
  console.error("========== ERROR ==========");
  console.error(err);
  console.error("===========================");

  console.error("[api] Error", {
    method: req.method,
    path: req.originalUrl,
    message: err.message,
    stack: err.stack,
  });

  if (err instanceof ApiError) {
    return ApiResponse.error(res, err.message, err.statusCode);
  }

  return ApiResponse.error(res, "Internal Server Error", 500);
}
