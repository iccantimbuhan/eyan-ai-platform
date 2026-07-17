import type { Request, Response, NextFunction } from "express";
import { ApiError } from "../errors/api-error.js";
import { ApiResponse } from "../utils/api-response.js";

export function errorHandler(
  err: Error,
  _req: Request,
  res: Response,
  _next: NextFunction
) {
  console.error(err);

  if (err instanceof ApiError) {
    return ApiResponse.error(res, err.message, err.statusCode);
  }

  return ApiResponse.error(
    res,
    "Internal Server Error",
    500
  );
}