import type { Request, Response } from "express";

import { FinanceAutomationService } from "../services/finance-automation.service.js";
import { ApiResponse } from "../utils/api-response.js";

const financeAutomationService = new FinanceAutomationService();

export class FinanceAutomationController {
  static async createExpense(req: Request, res: Response) {
    const result = await financeAutomationService.createExpense(req.body);

    return ApiResponse.success(
      res,
      result,
      200,
      result.replayed
        ? "Expense already recorded for this workflow execution."
        : "Expense recorded successfully."
    );
  }

  static async getCategories(req: Request, res: Response) {
    const categories = await financeAutomationService.getCategories();

    return ApiResponse.success(res, categories, 200, "Categories retrieved successfully.");
  }

  static async getDashboard(req: Request, res: Response) {
    const dashboard = await financeAutomationService.getDashboard(req.query.period?.toString());

    return ApiResponse.success(res, dashboard, 200, "Dashboard retrieved successfully.");
  }
}
