import type { Request, Response } from "express";
import { HealthService } from "../services/health.service.js";
import { ApiResponse } from "../utils/api-response.js";

export class HealthController {
  static getHealth(_req: Request, res: Response) {
    const health = HealthService.getStatus();

    return ApiResponse.success(res, health);
  }
}