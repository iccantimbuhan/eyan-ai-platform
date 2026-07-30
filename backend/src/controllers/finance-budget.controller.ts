import type { Request, Response } from "express";

import { FinanceBudgetService } from "../services/finance-budget.service.js";
import { ApiResponse } from "../utils/api-response.js";

const financeBudgetService = new FinanceBudgetService();

export class FinanceBudgetController {
  static async get(req: Request, res: Response) {
    const budget = await financeBudgetService.getOrCreateForPeriod(
      req.query.period?.toString()
    );

    return ApiResponse.success(res, budget, 200, "Budget retrieved successfully.");
  }

  static async set(req: Request, res: Response) {
    const budget = await financeBudgetService.setBudget(req.body, req.user.id);

    return ApiResponse.success(res, budget, 200, "Budget updated successfully.");
  }
}
