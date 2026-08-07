import type { Request, Response } from "express";

import { salesAggregationService } from "../services/sales-aggregation.service.js";
import { ApiResponse } from "../utils/api-response.js";

function getParam(req: Request, paramName: string): string {
  const value = req.params[paramName];
  return Array.isArray(value) ? value[0] : value;
}

export class SalesAggregationController {
  static async getWeekly(req: Request, res: Response) {
    const summary = await salesAggregationService.getWeeklySummary(
      getParam(req, "branchId"),
      String(req.query.startDate),
      String(req.query.endDate)
    );

    return ApiResponse.success(res, summary, 200, "Weekly sales summary retrieved successfully.");
  }

  static async getComparison(req: Request, res: Response) {
    const comparison = await salesAggregationService.getComparison(
      getParam(req, "branchId"),
      String(req.query.currentStartDate),
      String(req.query.currentEndDate),
      String(req.query.previousStartDate),
      String(req.query.previousEndDate)
    );

    return ApiResponse.success(res, comparison, 200, "Sales comparison retrieved successfully.");
  }
}
