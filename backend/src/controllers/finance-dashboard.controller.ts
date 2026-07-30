import type { Request, Response } from "express";

import { FinanceDashboardService } from "../services/finance-dashboard.service.js";
import { ApiResponse } from "../utils/api-response.js";

const financeDashboardService = new FinanceDashboardService();

export class FinanceDashboardController {
  static async get(req: Request, res: Response) {
    const dashboard = await financeDashboardService.getDashboard(
      req.query.period?.toString()
    );

    return ApiResponse.success(res, dashboard, 200, "Dashboard retrieved successfully.");
  }
}
